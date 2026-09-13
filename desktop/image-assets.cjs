const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp" };
const failure = (message) => Object.assign(new Error(message), { assetError: true });
const resultError = (error) => ({ ok: false, message: error.assetError ? error.message : "Não foi possível acessar a imagem no projeto." });

async function readImage(file) {
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) throw failure("Formato não aceito. Use JPG, PNG ou WebP.");
  const handle = await fs.open(file, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 12 || stat.size > MAX_BYTES) throw failure("Imagem inválida ou maior que 20 MB.");
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!read.bytesRead) throw failure("A imagem mudou durante a leitura.");
      offset += read.bytesRead;
    }
    const matches = type === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : type === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!matches) throw failure("O conteúdo do arquivo não corresponde ao formato da imagem.");
    return { bytes, type, previewUrl: `data:image/${type};base64,${bytes.toString("base64")}` };
  } finally { await handle.close(); }
}

// Resolve each component before creating children; never follow project asset links/junctions.
async function assetPath(root, segments, createDirectories = false) {
  let target = root;
  for (let index = 0; index < segments.length; index++) {
    target = path.join(target, segments[index]);
    if (createDirectories) {
      try { await fs.mkdir(target); } catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    if (await fs.realpath(target) !== target || (await fs.lstat(target)).isSymbolicLink()) throw failure("Links de arquivos não são permitidos para imagens.");
  }
  return target;
}

function createImageAssetService({ dialog, validateProject, createId = randomUUID }) {
  const projects = new WeakMap();
  const pending = new WeakSet();
  async function context(event, root) {
    const project = projects.get(event.sender);
    if (typeof root !== "string" || !project || path.resolve(root) !== project.path) throw failure("O projeto ativo mudou. Reabra o conteúdo.");
    if (!(await validateProject(root)).ok) throw failure("Projeto inválido para carregar imagens.");
    return { project, root: await fs.realpath(root) };
  }
  return {
    forgetProject(event) { projects.delete(event.sender); },
    rememberProject(event, result) {
      if (result.ok && result.directory?.path) projects.set(event.sender, { path: path.resolve(result.directory.path) });
      return result;
    },
    async selectProjectImage(event, root) {
      if (pending.has(event.sender)) return { ok: false, message: "Seleção de imagem em andamento." };
      pending.add(event.sender);
      try {
        const active = await context(event, root);
        const selection = await dialog.showOpenDialog({ title: "Carregar imagem", properties: ["openFile", "dontAddToRecent"],
          filters: [{ name: "Imagens", extensions: ["jpg", "jpeg", "png", "webp"] }, { name: "Todos os arquivos", extensions: ["*"] }] });
        if (selection.canceled || !selection.filePaths.length) return { ok: false, cancelled: true };
        const image = await readImage(selection.filePaths[0]);
        if (projects.get(event.sender) !== active.project) throw failure("O projeto ativo mudou. Reabra o conteúdo.");
        const folder = await assetPath(active.root, ["public", "assets", "images"], true);
        for (let attempt = 0; attempt < 3; attempt++) {
          const id = createId();
          if (!/^[a-f0-9-]{36}$/.test(id)) throw failure("Nome de imagem inválido.");
          const name = `image-${id}.${image.type === "jpeg" ? "jpg" : image.type}`;
          if (projects.get(event.sender) !== active.project) throw failure("O projeto ativo mudou. Reabra o conteúdo.");
          try {
            // Copies are additive: Save owns JSON; Discard never deletes possibly shared assets.
            await fs.writeFile(path.join(folder, name), image.bytes, { flag: "wx" });
            return { ok: true, path: `assets/images/${name}`, previewUrl: image.previewUrl };
          } catch (error) { if (error.code !== "EEXIST") throw error; }
        }
        throw failure("Não foi possível criar um nome exclusivo para a imagem.");
      } catch (error) { return resultError(error); }
      finally { pending.delete(event.sender); }
    },
    async readProjectImage(event, root, publicPath) {
      try {
        const active = await context(event, root);
        if (typeof publicPath !== "string") throw failure("Imagem indisponível.");
        if (/^https?:\/\//i.test(publicPath)) {
          const url = new URL(publicPath);
          if (url.username || url.password) throw failure("Endereço de imagem inválido.");
          return { ok: true, previewUrl: url.href };
        }
        const relative = decodeURIComponent(publicPath).replaceAll("\\", "/").replace(/^\//, "");
        const segments = relative.split("/");
        if (!relative.startsWith("assets/images/") || segments.some((part) => !part || part === "." || part === ".." || /[:\u0000-\u001f]/.test(part))) throw failure("Caminho de imagem inválido.");
        const file = await assetPath(active.root, ["public", ...segments]);
        const image = await readImage(file);
        return { ok: true, previewUrl: image.previewUrl };
      } catch (error) { return resultError(error); }
    },
  };
}

module.exports = { createImageAssetService };

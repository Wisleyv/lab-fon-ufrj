const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { isSourceFile } = require("./source-manifest.cjs");

// Only copied raster images are filtered. SVGs, imported source assets and other
// public files remain intact; SVG references are inspected as well.
function mediaPath(value) {
  const relative = value.replace(/^public\//, "");
  return /^assets\/images\/.+\.(?:png|jpe?g|webp|gif|avif|ico)$/i.test(relative) &&
    !relative.split("/").some(part => !part || part === "." || part === "..") ? relative : null;
}

async function inspectMediaReferences(root, availableMedia = []) {
  const catalog = new Map();
  const texts = [];
  const uncertain = new Set();
  const inputs = [];
  const markers = new Set();
  for (const file of availableMedia) {
    const relative = mediaPath(file.relativePath || file.path || "");
    if (relative) catalog.set(relative, file.size ?? file.bytes ?? 0);
  }
  async function walk(directory, prefix) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const relative = `${prefix}/${entry.name}`;
      const local = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { uncertain.add("Há referências ou arquivos vinculados que exigem avaliação."); continue; }
      if (entry.isDirectory()) { await walk(local, relative); continue; }
      if (!entry.isFile()) continue;
      const image = mediaPath(relative);
      if (image) { catalog.set(image, (await fs.stat(local)).size); continue; }
      if (!(isSourceFile(relative) && /\.(?:json|js|css|html|svg)$/i.test(relative))) continue;
      await read(local, relative);
    }
  }
  async function read(local, relative) {
    const text = await fs.readFile(local, "utf8");
    inputs.push([relative, createHash("sha256").update(text).digest("hex")]);
    markers.add(relative);
    if (/\.json$/i.test(relative)) {
      try {
        const visit = value => {
          if (typeof value === "string") texts.push(value);
          else if (value && typeof value === "object") Object.values(value).forEach(visit);
        };
        visit(JSON.parse(text));
      } catch { uncertain.add("Há conteúdo que não pôde ser interpretado."); }
    } else {
      texts.push(text);
      // Computed paths cannot establish a complete list. Never guess in this case.
      for (const match of text.matchAll(/["'`]\/?(?:labfonac\/)?assets\/images(?:\/[^"'`]*)?["'`]/g)) {
        const literal = match[0].slice(1, -1);
        if (literal.includes("${") || !/\.(?:png|jpe?g|webp|gif|avif|ico|svg)(?:[?#].*)?$/i.test(literal))
          uncertain.add("Há caminhos de imagens calculados pelo código.");
      }
    }
  }
  for (const directory of ["content", "src", "public/assets", "scripts"]) await walk(path.join(root, directory), directory);
  for (const relative of ["index.html", "vite.config.js"]) {
    try { await read(path.join(root, relative), relative); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (!["content/page.json", "content/site.json", "src/js/main.js", "index.html"].every(value => markers.has(value)))
    uncertain.add("A inspeção não encontrou todo o conteúdo e código necessários.");
  const corpus = texts.join("\n");
  const used = new Set();
  // A basename match also preserves relative CSS/HTML paths and shared images.
  for (const relative of catalog.keys()) {
    const name = path.posix.basename(relative);
    if (corpus.includes(name) || corpus.includes(encodeURI(name))) used.add(relative);
  }
  // A reference to an absent local image may indicate an incomplete project.
  for (const text of texts) {
    for (const match of text.matchAll(/assets\/images\/[^\s"'`<>()[\]{}]+\.(?:png|jpe?g|webp|gif|avif|ico)(?:[?#][^\s"'`<>]*)?/gi)) {
      let relative;
      try { relative = decodeURI(match[0].split(/[?#]/)[0]); }
      catch { uncertain.add("Há um caminho de imagem inválido."); continue; }
      if (!catalog.has(relative)) uncertain.add("Há imagens referenciadas ausentes no inventário.");
    }
  }
  const certain = uncertain.size === 0;
  const files = [...catalog].sort(([a], [b]) => a.localeCompare(b)).map(([relative, bytes]) => ({ path: relative, bytes }));
  const required = files.filter(file => !certain || used.has(file.path));
  const unused = certain ? files.filter(file => !used.has(file.path)) : [];
  return { version: 1, certain, reasons: [...uncertain], required, unused,
    unusedBytes: unused.reduce((sum, file) => sum + file.bytes, 0),
    revision: createHash("sha256").update(JSON.stringify([inputs.sort(), files])).digest("hex") };
}

function selectReferencedMedia(files, audit) {
  if (!audit.certain) return files;
  const unused = new Set(audit.unused.map(file => file.path));
  return files.filter(file => !unused.has(mediaPath(file.relativePath || file.path || "")));
}

module.exports = { mediaPath, inspectMediaReferences, selectReferencedMedia };

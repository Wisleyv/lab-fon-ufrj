const fs = require("node:fs/promises");
const path = require("node:path");
const { isDeepStrictEqual } = require("node:util");

const datasets = {
  site: "content/site.json",
  extensao: "content/extensao.json",
  equipe: "content/equipe",
  linhasPesquisa: "content/linhas",
  parcerias: "content/parcerias",
};
const locks = new Set();

async function datasetPath(root, key) {
  if (!Object.hasOwn(datasets, key)) throw new Error("Conteúdo não autorizado.");
  const realRoot = await fs.realpath(root);
  const target = path.join(realRoot, datasets[key]);
  const realTarget = await fs.realpath(target);
  if (realTarget !== target) throw new Error("Links de arquivos não são permitidos.");
  return target;
}

async function readContentDataset(_event, root, key) {
  const target = await datasetPath(root, key);
  const files = target.endsWith(".json") ? [path.basename(target)]
    : (await fs.readdir(target)).filter((name) => name.endsWith(".json")).sort();
  const parent = target.endsWith(".json") ? path.dirname(target) : target;
  const records = [];
  for (const name of files) {
    const file = path.join(parent, name);
    if ((await fs.lstat(file)).isSymbolicLink()) throw new Error("Link não permitido.");
    records.push({ name, value: JSON.parse(await fs.readFile(file, "utf8")) });
  }
  return records;
}

async function saveContentRecord(_event, root, key, name, expected, value) {
  const target = await datasetPath(root, key);
  const singleton = target.endsWith(".json");
  if (!/^[a-zA-Z0-9_-]+\.json$/.test(name) || (singleton && name !== path.basename(target))) {
    throw new Error("Nome de arquivo não permitido.");
  }
  if (singleton && value === null) throw new Error("Este conteúdo não pode ser removido.");
  if (value !== null && (!value || Array.isArray(value) || typeof value !== "object")) {
    throw new Error("Registro inválido.");
  }
  const file = singleton ? target : path.join(target, name);
  if (locks.has(file)) throw new Error("Salvamento em andamento.");
  locks.add(file);
  let previous = null;
  let changed = false;
  let deletionRecorded = false;
  const deletionFile = path.join(path.resolve(root), ".labfon-deletions", key, name);
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    try {
      if ((await fs.lstat(file)).isSymbolicLink()) throw new Error("Link não permitido.");
      previous = await fs.readFile(file, "utf8");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const current = previous === null ? null : JSON.parse(previous);
    if (!isDeepStrictEqual(current, expected)) throw new Error("O arquivo mudou. Reabra o conteúdo antes de salvar.");
    if (value === null) {
      if (previous === null) throw new Error("Registro ausente.");
      await fs.mkdir(path.dirname(deletionFile), { recursive: true });
      await fs.writeFile(deletionFile, previous, { flag: "wx" });
      deletionRecorded = true;
      await fs.rename(file, temporary);
    } else {
      await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
      await fs.rename(temporary, file);
    }
    changed = true;
    const verified = value === null ? null : JSON.parse(await fs.readFile(file, "utf8"));
    if (!isDeepStrictEqual(value, verified)) throw new Error("Falha na verificação do conteúdo salvo.");
    if (value === null) await fs.unlink(temporary);
    else await fs.rm(deletionFile, { force: true });
    return { ok: true, value: verified };
  } catch (error) {
    if (changed) {
      if (previous === null) await fs.unlink(file);
      else {
        await fs.writeFile(temporary, previous);
        await fs.rename(temporary, file);
      }
    }
    if (deletionRecorded) await fs.rm(deletionFile, { force: true });
    throw error;
  } finally {
    await fs.rm(temporary, { force: true });
    locks.delete(file);
  }
}

async function readContentDeletions(root) {
  const records = [];
  for (const key of ["equipe", "linhasPesquisa", "parcerias"]) {
    const folder = path.join(root, ".labfon-deletions", key);
    let entries;
    try { entries = await fs.readdir(folder, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || !/^[a-zA-Z0-9_-]+\.json$/.test(entry.name)) throw new Error("Registro de remoção inválido.");
      const ledgerPath = path.join(folder, entry.name);
      records.push({ ledgerPath, relativePath: `${datasets[key]}/${entry.name}`, value: JSON.parse(await fs.readFile(ledgerPath, "utf8")) });
    }
  }
  return records;
}

module.exports = { readContentDataset, saveContentRecord, readContentDeletions };

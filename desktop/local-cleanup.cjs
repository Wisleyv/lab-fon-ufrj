const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = value => /^(?:public|dist)\/assets\/images\/.+\.(?:png|jpe?g|webp|gif|avif|ico)$/i.test(value) &&
  !/[\\:\r\n]/.test(value) && value.split("/").every(part => part && part !== "." && part !== ".." && !part.startsWith("."));

function createLocalCleanup(root, storage) {
  root = path.resolve(root);
  const backup = id => {
    if (!/^[a-f0-9]{64}$/.test(id || "")) throw new Error("Invalid cleanup identifier");
    return path.join(storage, id);
  };
  async function target(relative) {
    if (!safe(relative)) throw new Error("Unsafe local cleanup path");
    const local = path.join(root, ...relative.split("/"));
    // Reject linked parents as well as linked files before copying/deleting.
    let current = root;
    for (const segment of relative.split("/")) {
      current = path.join(current, segment);
      try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error("Linked cleanup path"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    if (path.resolve(await fs.realpath(root)) !== root) throw new Error("Linked project root");
    return local;
  }
  const check = (bytes, file) => {
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error("Local cleanup evidence changed");
  };
  async function verify(id) {
    const folder = backup(id);
    const record = JSON.parse(await fs.readFile(path.join(folder, "manifest.json"), "utf8"));
    if (record.id !== id || record.root !== root || !Array.isArray(record.files)) throw new Error("Wrong local cleanup backup");
    for (const file of record.files) {
      await target(file.path);
      check(await fs.readFile(path.join(folder, "files", ...file.path.split("/"))), file);
    }
    return record;
  }
  return {
    async prepare(files, id) {
      const folder = backup(id);
      // Never overwrite a backup from an earlier attempt with the same review.
      try { await fs.access(path.join(folder, "manifest.json")); return await verify(id); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      for (const file of files) {
        const local = await target(file.path);
        const bytes = await fs.readFile(local); check(bytes, file);
        const copy = path.join(folder, "files", ...file.path.split("/"));
        await fs.mkdir(path.dirname(copy), { recursive: true });
        await fs.writeFile(copy, bytes);
      }
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(path.join(folder, "manifest.json"), JSON.stringify({ id, root, files }));
      return verify(id);
    },
    verify,
    async validateCurrent(id, restoring = false) {
      const record = await verify(id);
      for (const file of record.files) {
        try { check(await fs.readFile(await target(file.path)), file); }
        catch (error) { if (!(restoring && error.code === "ENOENT")) throw error; }
      }
    },
    async remove(id) {
      const record = await verify(id);
      for (const file of record.files) {
        const local = await target(file.path);
        check(await fs.readFile(local), file);
        await fs.unlink(local);
      }
    },
    async restore(id) {
      await this.validateCurrent(id, true);
      const record = await verify(id);
      for (const file of record.files) {
        const local = await target(file.path);
        await fs.mkdir(path.dirname(local), { recursive: true });
        // Existing matching files are untouched. Refuse to overwrite newer files.
        try { await fs.writeFile(local, await fs.readFile(path.join(backup(id), "files", ...file.path.split("/"))), { flag: "wx" }); }
        catch (error) { if (error.code !== "EEXIST") throw error; check(await fs.readFile(local), file); }
        check(await fs.readFile(local), file);
      }
    },
  };
}
module.exports = { createLocalCleanup };

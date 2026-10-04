const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function createRemoteChecksum(client) {
  let enabled = false;
  try {
    const features = await client.features();
    if (/(?:^|;)SHA-256\*?(?:;|$)/i.test(features.get("HASH") || "")) {
      enabled = (await client.send("OPTS HASH SHA-256")).code === 200;
    }
  } catch { /* Unsupported checksums: verify by downloading. */ }
  return async (remotePath, size) => {
    if (!enabled || !Number.isSafeInteger(size) || size < 0 || /[\r\n]/.test(remotePath)) return null;
    try {
      const response = await client.send(`HASH ${remotePath}`);
      const match = /^213 SHA-256 (?:(\d+)-(\d+) )?([a-f0-9]{64}) (.+)$/i.exec(response.message.trim());
      if (response.code !== 213 || !match || match[4] !== remotePath ||
          (match[1] !== undefined && (Number(match[1]) !== 0 || Number(match[2]) !== size - 1))) return null;
      return match[3].toLowerCase();
    } catch { return null; }
  };
}

async function createAssetReuse(client, activeRoot) {
  let realRoot;
  try { realRoot = await fs.realpath(activeRoot); } catch { return async () => false; }
  const checksum = await createRemoteChecksum(client);

  return async (file, destination) => {
    if (!/^(?:public\/assets|src\/assets\/images)\//.test(file.relativePath)
      || !Number.isSafeInteger(file.size) || file.size <= 0 || /[\r\n]/.test(file.remotePath)) return false;
    try {
      const source = path.join(activeRoot, ...file.relativePath.split("/"));
      const realSource = await fs.realpath(source);
      const relative = path.relative(realRoot, realSource);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
      const stat = await fs.lstat(source);
      if (!stat.isFile() || stat.size !== file.size) return false;
      const expected = await checksum(file.remotePath, file.size);
      if (!expected) return false;
      if (await sha256(source) !== expected) return false;
      await fs.copyFile(source, destination);
      if (await sha256(destination) !== expected) {
        await fs.rm(destination, { force: true });
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };
}

module.exports = { createAssetReuse, createRemoteChecksum };

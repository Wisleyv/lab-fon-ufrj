const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createReadStream } = require("node:fs");

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function createAssetReuse(client, activeRoot) {
  let enabled = false;
  let realRoot;
  try {
    realRoot = await fs.realpath(activeRoot);
    const features = await client.features();
    if (/(?:^|;)SHA-256\*?(?:;|$)/i.test(features.get("HASH") || "")) {
      enabled = (await client.send("OPTS HASH SHA-256")).code === 200;
    }
  } catch { /* Unsupported checksums or missing cache: download normally. */ }

  return async (file, destination) => {
    if (!enabled || !/^(?:public\/assets|src\/assets\/images)\//.test(file.relativePath)
      || !Number.isSafeInteger(file.size) || file.size <= 0 || /[\r\n]/.test(file.remotePath)) return false;
    try {
      const source = path.join(activeRoot, ...file.relativePath.split("/"));
      const realSource = await fs.realpath(source);
      const relative = path.relative(realRoot, realSource);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
      const stat = await fs.lstat(source);
      if (!stat.isFile() || stat.size !== file.size) return false;
      const response = await client.send(`HASH ${file.remotePath}`);
      // Accept only a full-file SHA-256, with an exact echoed path and byte range.
      const match = /^213 SHA-256 (?:(\d+)-(\d+) )?([a-f0-9]{64}) (.+)$/i.exec(response.message.trim());
      if (response.code !== 213 || !match || match[4] !== file.remotePath
        || (match[1] !== undefined && (Number(match[1]) !== 0 || Number(match[2]) !== file.size - 1))) return false;
      const expected = match[3].toLowerCase();
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

module.exports = { createAssetReuse };

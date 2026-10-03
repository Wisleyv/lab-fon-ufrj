const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { Writable } = require("node:stream");

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const destinationKey = profile => sha(JSON.stringify([profile.host, profile.port, profile.username, profile.secure]));
const roots = { source: "/source", public: "/" };
function safePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes(":") || value.startsWith("/") ||
      value.split("/").some(part => !part || part === "." || part === "..")) throw new Error("Unsafe recovery path");
  return value;
}
function remotePath(domain, file) {
  safePath(file);
  if (!roots[domain] || file === ".ftpquota" || (domain === "public" && file.split("/")[0] === "source") ||
      (domain === "source" && [".htaccess", ".ftpquota"].includes(file))) throw new Error("Protected recovery target");
  return path.posix.join(roots[domain], file);
}
async function remoteBytes(client, target) {
  const chunks = [];
  await client.downloadTo(new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } }), target);
  return Buffer.concat(chunks);
}
async function remoteInventory(client, domain) {
  const files = new Map();
  async function walk(directory, prefix = "") {
    for (const entry of await client.list(directory)) {
      safePath(entry.name);
      if (entry.name.includes("/")) throw new Error("Invalid remote name");
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!prefix && (entry.name === ".ftpquota" || (domain === "public" && entry.name === "source") ||
          (domain === "source" && entry.name === ".htaccess"))) continue;
      if (entry.isSymbolicLink) throw new Error("Remote symbolic links need manual review");
      if (entry.isDirectory) await walk(path.posix.join(directory, entry.name), relative);
      else if (entry.isFile) files.set(relative, entry);
      else throw new Error("Unsupported remote entry type");
    }
  }
  await walk(roots[domain]);
  return files;
}

function createRecoveryStore(baseDirectory, { keepSuccessful = 5 } = {}) {
  const base = path.resolve(baseDirectory);
  function transactionPath(id) {
    if (!/^\d{8}T\d{9}Z-[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid recovery transaction");
    return path.join(base, id);
  }
  async function save(transaction) {
    const directory = transactionPath(transaction.id);
    await fs.mkdir(directory, { recursive: true });
    const temporary = path.join(directory, "transaction.tmp");
    await fs.writeFile(temporary, `${JSON.stringify(transaction, null, 2)}\n`, "utf8");
    await fs.rename(temporary, path.join(directory, "transaction.json"));
  }
  async function load(id) {
    const transaction = JSON.parse(await fs.readFile(path.join(transactionPath(id), "transaction.json"), "utf8"));
    if (transaction.id !== id || transaction.version !== 1 || !transaction.snapshots) throw new Error("Invalid recovery metadata");
    return transaction;
  }
  async function list(profile) {
    await fs.mkdir(base, { recursive: true });
    const transactions = [];
    for (const entry of await fs.readdir(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      try {
        const transaction = await load(entry.name);
        if (!profile || transaction.destinationKey === destinationKey(profile)) transactions.push(transaction);
      } catch { /* Damaged records stay on disk and are never pruned. */ }
    }
    return transactions.sort((a, b) => b.id.localeCompare(a.id));
  }
  async function verify(id, domain) {
    const transaction = await load(id);
    const snapshot = transaction.snapshots[domain];
    if (!snapshot || !snapshot.verifiedAt || snapshot.root !== roots[domain]) throw new Error("Backup is incomplete");
    const seen = new Set();
    for (const file of snapshot.files) {
      remotePath(domain, file.path);
      if (seen.has(file.path)) throw new Error("Duplicate backup path");
      seen.add(file.path);
      for (const evidence of [file.before, file.after]) {
        if (evidence && (!Number.isSafeInteger(evidence.bytes) || evidence.bytes < 0 || !/^[a-f0-9]{64}$/.test(evidence.sha256))) throw new Error("Invalid checksum evidence");
      }
      if (file.before) {
        const local = path.join(transactionPath(id), domain, "files", file.path);
        const stat = await fs.lstat(local);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Invalid backup file");
        const bytes = await fs.readFile(local);
        if (bytes.length !== file.before.bytes || sha(bytes) !== file.before.sha256) throw new Error("Backup checksum mismatch");
      }
    }
    return transaction;
  }
  async function fingerprint(files) {
    const evidence = [];
    for (const file of [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
      evidence.push([safePath(file.relativePath), sha(await fs.readFile(file.localPath))]);
    }
    return sha(JSON.stringify(evidence));
  }
  async function prepare(client, domain, profile, files, revision, { forceNew = false } = {}) {
    const history = await list(profile);
    const sourceTransaction = domain === "public" ? history.find(transaction =>
      transaction.revision === revision && transaction.snapshots.source?.status === "success") : null;
    const previous = !forceNew && sourceTransaction && !sourceTransaction.snapshots.public ? sourceTransaction : null;
    const transaction = previous || {
      version: 1,
      id: `${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID()}`,
      createdAt: new Date().toISOString(),
      destinationKey: destinationKey(profile), revision, snapshots: {},
      sourceTransactionId: sourceTransaction?.id || null,
    };
    const last = history.find(item => item.snapshots[domain]?.verifiedAt && !item.restoreOf && !item.snapshots[domain].resolvedAt);
    const anchor = last && ["mutating", "possibly_partial"].includes(last.snapshots[domain].status)
      ? last.snapshots[domain].recoveryTargetId || last.id : transaction.id;
    const snapshot = { root: roots[domain], status: "capturing", recoveryTargetId: anchor,
      files: [], startedAt: new Date().toISOString() };
    transaction.snapshots[domain] = snapshot;
    await save(transaction);
    try {
      const inventory = await remoteInventory(client, domain);
      const seen = new Set();
      for (const file of [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
        const relative = safePath(file.relativePath);
        remotePath(domain, relative);
        if (seen.has(relative)) throw new Error("Duplicate mutation path");
        seen.add(relative);
        const afterBytes = file.localPath ? await fs.readFile(file.localPath) : null;
        const record = { path: relative, before: null, after: afterBytes === null ? null : { bytes: afterBytes.length, sha256: sha(afterBytes) } };
        if (inventory.has(relative)) {
          const bytes = await remoteBytes(client, remotePath(domain, relative));
          const size = inventory.get(relative).size;
          if (typeof size === "number" && size !== bytes.length) throw new Error("Remote size changed during backup");
          const local = path.join(transactionPath(transaction.id), domain, "files", relative);
          await fs.mkdir(path.dirname(local), { recursive: true });
          await fs.writeFile(local, bytes);
          record.before = { bytes: bytes.length, sha256: sha(bytes) };
        }
        snapshot.files.push(record);
      }
      snapshot.verifiedAt = new Date().toISOString();
      snapshot.status = "verified";
      await save(transaction);
      await verify(transaction.id, domain);
      return transaction;
    } catch (error) {
      snapshot.status = "backup_failed";
      snapshot.verifiedAt = null;
      await save(transaction);
      throw error;
    }
  }
  async function mark(transaction, domain, status) {
    transaction.snapshots[domain].status = status;
    transaction.snapshots[domain].updatedAt = new Date().toISOString();
    await save(transaction);
  }
  async function verifyRemote(client, transaction, domain) {
    const inventory = await remoteInventory(client, domain);
    for (const file of transaction.snapshots[domain].files) {
      if (file.after === null) {
        if (inventory.has(file.path)) throw new Error("Remote deletion verification failed");
      } else {
        if (!inventory.has(file.path)) throw new Error("Remote file verification failed");
        const bytes = await remoteBytes(client, remotePath(domain, file.path));
        if (bytes.length !== file.after.bytes || sha(bytes) !== file.after.sha256) throw new Error("Remote checksum verification failed");
      }
    }
  }
  async function prune() {
    const transactions = await list();
    const referenced = new Set(transactions.flatMap(transaction => [transaction.sourceTransactionId,
      transaction.restoreOf?.transactionId,
      ...Object.values(transaction.snapshots).map(snapshot => snapshot.recoveryTargetId)].filter(id => id && id !== transaction.id)));
    const successful = transactions.filter(transaction => Object.values(transaction.snapshots).length &&
      Object.values(transaction.snapshots).every(snapshot => snapshot.status === "success"));
    for (const transaction of successful.slice(keepSuccessful)) {
      if (referenced.has(transaction.id)) continue;
      const target = path.resolve(transactionPath(transaction.id));
      if (!target.startsWith(`${base}${path.sep}`)) throw new Error("Invalid retention target");
      await fs.rm(target, { recursive: true, force: true });
    }
  }
  function summary(transaction, domain) {
    return { transactionId: transaction.id, domain, status: transaction.snapshots[domain].status,
      backupPath: transactionPath(transaction.id), verifiedAt: transaction.snapshots[domain].verifiedAt,
      retryRequiresValidation: true };
  }
  async function restore(client, id, domain, profile) {
    let original = await verify(id, domain);
    if (original.destinationKey !== destinationKey(profile)) throw new Error("Backup belongs to another connection");
    const targetId = original.snapshots[domain].recoveryTargetId || id;
    if (targetId !== id) {
      original = await verify(targetId, domain);
      if (original.destinationKey !== destinationKey(profile)) throw new Error("Backup belongs to another connection");
      id = targetId;
    }
    const chain = (await list(profile)).filter(transaction => transaction.id === id ||
      (!transaction.restoreOf && transaction.snapshots[domain]?.verifiedAt &&
        transaction.snapshots[domain].recoveryTargetId === id)).sort((a, b) =>
          a.snapshots[domain].startedAt.localeCompare(b.snapshots[domain].startedAt));
    const baseline = new Map();
    for (const transaction of chain) {
      await verify(transaction.id, domain);
      for (const file of transaction.snapshots[domain].files) if (!baseline.has(file.path)) baseline.set(file.path, {
        relativePath: file.path,
        localPath: file.before ? path.join(transactionPath(transaction.id), domain, "files", file.path) : null,
      });
    }
    const files = [...baseline.values()];
    // Preserve the current state before an explicitly requested restoration.
    const undo = await prepare(client, domain, profile, files, `restore:${id}`, { forceNew: true });
    undo.restoreOf = { transactionId: id, domain };
    await save(undo);
    try {
      await mark(undo, domain, "mutating");
      const inventory = await remoteInventory(client, domain);
      const ordered = [...files].sort((a, b) => (a.relativePath === "index.html") - (b.relativePath === "index.html") || a.relativePath.localeCompare(b.relativePath));
      for (const file of ordered) {
        const target = remotePath(domain, file.relativePath);
        if (file.localPath) {
          await client.ensureDir(path.posix.dirname(target));
          await client.uploadFrom(file.localPath, target);
        } else if (inventory.has(file.relativePath)) await client.remove(target);
      }
      await verifyRemote(client, undo, domain);
      await mark(undo, domain, "success");
      for (const transaction of chain) {
        transaction.snapshots[domain].resolvedAt = new Date().toISOString();
        await save(transaction);
      }
      const retentionPending = await prune().then(() => false, () => true);
      return { ...summary(undo, domain), retentionPending };
    } catch (error) {
      await mark(undo, domain, "possibly_partial");
      error.recovery = summary(undo, domain);
      throw error;
    }
  }
  return { list, verify, fingerprint, prepare, mark, verifyRemote, prune, summary, restore };
}

module.exports = { createRecoveryStore, destinationKey };

const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

// Like retrieval, each client runs sequentially. Drain in-flight work before rejecting:
// recovery must never start while another worker is still writing to the server.
async function runTransferWorkers(items, clients, operation) {
  let cursor = 0, failure;
  await Promise.all([...new Set(clients)].slice(0, 2).map(async client => {
    while (!failure && cursor < items.length) {
      const item = items[cursor++];
      try { await operation(item, client); }
      catch (error) { failure ||= error; }
    }
  }));
  if (failure) throw failure;
}

async function openTransferClients(primary, profile, password, factory) {
  const extra = factory();
  if (extra === primary) return [primary];
  try {
    await extra.access({ host: profile.host, port: profile.port, user: profile.username,
      password, secure: profile.secure });
    return [primary, extra];
  } catch {
    extra.close();
    // A server may limit simultaneous sessions. The authenticated primary remains usable.
    return [primary];
  }
}

function createTransferProgress(clients, onProgress = () => {}, now = () => Date.now()) {
  const started = now();
  const totals = { transferredBytes: 0, downloadedBytes: 0, uploadedBytes: 0, skippedFiles: 0 };
  const counters = new Map();
  let activity = "comparison", totalFiles = 0, completedFiles = 0, currentFile = "", lastMovement = started;
  let stageStarted = started, stageBytes = 0;
  const emit = () => {
    const elapsedMs = now() - stageStarted;
    const stalled = now() - lastMovement >= 15000;
    // A closed renderer must not interrupt backup/mutation/recovery bookkeeping.
    try {
      onProgress({ activity, totalFiles, completedFiles, currentFile, ...totals,
        elapsedMs: now() - started, stalled,
        bytesPerSecond: !stalled && elapsedMs >= 3000 ? Math.round(stageBytes * 1000 / elapsedMs) : null });
    } catch { /* Progress is observational, never a transfer gate. */ }
  };
  const transferred = (bytes, type) => {
    if (bytes <= 0) return;
    totals.transferredBytes += bytes;
    totals[type === "upload" ? "uploadedBytes" : "downloadedBytes"] += bytes;
    stageBytes += bytes; lastMovement = now();
  };
  for (const client of clients) {
    if (typeof client.trackProgress !== "function") continue;
    counters.set(client, 0);
    client.trackProgress(info => {
      const bytes = Number(info.bytesOverall) || 0;
      transferred(Math.max(0, bytes - counters.get(client)), info.type);
      counters.set(client, bytes);
    });
  }
  const timer = setInterval(emit, 1000);
  timer.unref();
  return {
    begin(value, count) { activity = value; totalFiles = count; completedFiles = 0;
      currentFile = ""; stageStarted = now(); stageBytes = 0; lastMovement = now(); emit(); },
    file(value) { currentFile = value; emit(); },
    transferred(client, bytes, type = "download") { if (!counters.has(client)) transferred(bytes, type); },
    done(skipped = false) { completedFiles++; if (skipped) totals.skippedFiles++;
      lastMovement = now(); emit(); },
    metrics() { return { ...totals, elapsedMs: now() - started, connections: clients.length }; },
    stop() { clearInterval(timer); for (const client of counters.keys()) client.trackProgress(undefined); },
  };
}

function matching(record) {
  return record.before && record.after && record.before.bytes === record.after.bytes &&
    record.before.sha256 === record.after.sha256;
}

async function uploadProtectedFiles(files, snapshot, clients, root, progress) {
  if (!snapshot.verifiedAt) throw new Error("Backup is incomplete");
  const records = new Map(snapshot.files.map(record => [record.path, record]));
  const pending = [];
  progress?.begin("comparison", files.length);
  for (const file of files) {
    const relative = file.relativePath || file.remotePath;
    const record = records.get(relative);
    if (!record?.after) throw new Error("Upload lacks verified recovery evidence");
    const bytes = await fs.readFile(file.localPath);
    if (bytes.length !== record.after.bytes || createHash("sha256").update(bytes).digest("hex") !== record.after.sha256) {
      throw new Error("Local file changed after backup");
    }
    if (!matching(record)) pending.push(file);
    progress?.file(relative); progress?.done(Boolean(matching(record)));
    if (matching(record)) file.status = "unchanged";
  }
  const directories = [...new Set(pending.map(file => path.posix.dirname(
    path.posix.join(root, file.relativePath || file.remotePath))))].filter(dir => dir !== root);
  progress?.begin("directories", directories.length);
  for (const directory of directories) {
    progress?.file(directory);
    await clients[0].ensureDir(directory);
    progress?.done();
  }
  const upload = async (file, client) => {
    const relative = file.relativePath || file.remotePath;
    progress?.file(relative);
    await client.uploadFrom(file.localPath, path.posix.join(root, relative));
    progress?.transferred(client, records.get(relative).after.bytes, "upload");
    file.status = "uploaded"; progress?.done();
  };
  progress?.begin("upload", pending.length);
  await runTransferWorkers(pending.filter(file => (file.relativePath || file.remotePath) !== "index.html"), clients, upload);
  // Join every asset worker before publishing the public entry point.
  for (const file of pending.filter(file => (file.relativePath || file.remotePath) === "index.html")) await upload(file, clients[0]);
  return { uploadedFiles: pending.length, unchangedFiles: files.length - pending.length,
    preparedDirectories: directories.length };
}

function formatTransferProgress(progress) {
  const labels = { protection: "Protegendo arquivos", comparison: "Comparando arquivos",
    directories: "Preparando pastas", upload: "Enviando arquivos", verification: "Verificando arquivos" };
  const transferred = (progress.transferredBytes / 1048576).toFixed(1);
  const rate = progress.bytesPerSecond ? ` · ${(progress.bytesPerSecond / 1024).toFixed(0)} KB/s` : "";
  const skipped = progress.skippedFiles ? ` · ${progress.skippedFiles} sem reenvio` : "";
  const file = progress.currentFile ? ` · ${progress.currentFile}` : "";
  const stalled = progress.stalled ? " · Sem progresso há pelo menos 15 s; aguardando resposta." : "";
  return `${labels[progress.activity] || "Atualizando site"}: ${progress.completedFiles}/${progress.totalFiles}` +
    ` · ${transferred} MB transferidos · ${Math.floor(progress.elapsedMs / 1000)} s${rate}${skipped}${file}${stalled}`;
}

module.exports = { runTransferWorkers, openTransferClients, createTransferProgress, uploadProtectedFiles, formatTransferProgress };

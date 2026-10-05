const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { Writable } = require("node:stream");
const { isSourceFile } = require("./source-manifest.cjs");
const { mediaPath } = require("./media-references.cjs");
const { createTransferProgress } = require("./remote-transfer.cjs");

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const digest = value => hash(JSON.stringify(value));
const safe = value => typeof value === "string" && value && !/[\\:\r\n]/.test(value) &&
  !value.startsWith("/") && value.split("/").every(part => part && part !== "." && part !== "..");
const protectedPath = value => value.split("/").some(part => part.startsWith("."));
const sourceObsolete = value => value === "editor.html" || value === "src/css/editor.css" ||
  /^src\/js\/editor\/.+\.js$/.test(value) ||
  ["scripts/editor-smoke-ftp.cjs", "scripts/clean_publication_data.py", "scripts/fix-encoding.js", "public/data.json"].includes(value);
const publicEditor = value => value === "editor.html" || /^(?:assets\/editor\.[A-Za-z0-9_-]+\.css|js\/editor\.[A-Za-z0-9_-]+\.js)$/.test(value);
const publicChunk = value => /^(?:assets\/index\.[A-Za-z0-9_-]+\.css|js\/(?:index|site-content)\.[A-Za-z0-9_-]+\.js)$/.test(value);
let cleanupActive = false;

async function fileEvidence(files) {
  const result = [];
  for (const file of files) {
    if (!safe(file.relativePath)) throw new Error("Unsafe evidence path");
    if (protectedPath(file.relativePath)) continue;
    const bytes = await fs.readFile(file.localPath);
    result.push({ path: file.relativePath, bytes: bytes.length, sha256: hash(bytes) });
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

async function scanLocal(root) {
  const files = [];
  async function walk(directory, prefix = "") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!safe(relativePath)) throw new Error("Unsafe inventory path");
      const local = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(local, relativePath);
      else if (entry.isFile()) {
        const bytes = await fs.readFile(local);
        files.push({ path: relativePath, bytes: bytes.length, sha256: hash(bytes), type: "file" });
      } else files.push({ path: relativePath, type: "uncertain" });
    }
  }
  await walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function scanRemote(client, onProgress = () => {}) {
  const files = [];
  let downloadedBytes = 0;
  async function walk(directory, prefix = "") {
    for (const entry of await client.list(directory)) {
      if (!safe(entry.name) || entry.name.includes("/")) throw new Error("Unsafe FTP inventory entry");
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink || (!entry.isDirectory && !entry.isFile)) files.push({ path: relativePath, type: "uncertain" });
      else if (entry.isDirectory) {
        if (protectedPath(relativePath)) files.push({ path: relativePath, type: "protected-directory" });
        else await walk(path.posix.join(directory, entry.name), relativePath);
      } else if (protectedPath(relativePath)) files.push({ path: relativePath, type: "protected-file" });
      else {
        const chunks = [];
        onProgress({ phase: "review", file: relativePath, completedFiles: files.length, downloadedBytes });
        await client.downloadTo(new Writable({ write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk)); downloadedBytes += chunk.length;
          onProgress({ phase: "review", file: relativePath, completedFiles: files.length, downloadedBytes }); callback();
        } }), `/${relativePath}`);
        const bytes = Buffer.concat(chunks);
        files.push({ path: relativePath, bytes: bytes.length, sha256: hash(bytes), type: "file",
          ...(/\.(?:html?|css|[cm]?js|json|svg|xml|php)$/i.test(relativePath) ? { imageText: bytes.toString("utf8") } : {}) });
      }
    }
  }
  await walk("/");
  const names = [...new Set(files.filter(file => mediaPath(file.path.replace(/^source\//, ""))).map(file => path.posix.basename(file.path)))];
  const programNames = [...new Set(files.filter(file => sourceObsolete(file.path.replace(/^source\//, "")) || publicEditor(file.path) || publicChunk(file.path)).map(file => path.posix.basename(file.path)))];
  for (const file of files) {
    if (file.imageText === undefined) continue;
    file.imageReferences = names.filter(name => file.imageText.includes(name) || file.imageText.includes(encodeURI(name)));
    file.programReferences = programNames.filter(name => file.imageText.includes(name));
    file.dynamicImages = /["'`]\/?(?:labfonac\/)?assets\/images\/?["'`]|assets\/images\/[^"'`]*\$\{/.test(file.imageText);
    delete file.imageText;
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function createCleanupManifest(inventory, { sourceFiles, publicFiles, connectionKey, mediaAudit, localFiles = [] }) {
  if (!Array.isArray(sourceFiles) || !sourceFiles.length || !Array.isArray(publicFiles) || !publicFiles.length) throw new Error("Validated source and public evidence required");
  const seen = new Set();
  for (const file of inventory) {
    if (!safe(file.path) || seen.has(file.path)) throw new Error("Unsafe or duplicate inventory path");
    seen.add(file.path);
  }
  const remote = new Map(inventory.map(file => [file.path, file]));
  const matches = (files, prefix) => files.every(file => {
    const current = remote.get(`${prefix}${file.path}`);
    return current?.type === "file" && current.sha256 === file.sha256 && current.bytes === file.bytes;
  });
  const sourceCurrent = matches(sourceFiles, "source/");
  const publicCurrent = matches(publicFiles, "");
  const publicPaths = new Set(publicFiles.map(file => file.path));
  const activePaths = new Set([...publicPaths, ...sourceFiles.map(file => `source/${file.path}`)]);
  const foreign = inventory.filter(file => !activePaths.has(file.path) &&
    !sourceObsolete(file.path.replace(/^source\//, "")) && !publicEditor(file.path) && !publicChunk(file.path));
  // Follow dependencies of other pages, including an older CSS/JS bundle that
  // would otherwise look obsolete. Its image dependencies must also survive.
  const programReferences = new Set(foreign.flatMap(file => file.programReferences || []));
  const foreignPaths = new Set(foreign.map(file => file.path));
  for (let changed = true; changed;) {
    changed = false;
    for (const file of inventory) {
      if (activePaths.has(file.path) || foreignPaths.has(file.path) || !programReferences.has(path.posix.basename(file.path))) continue;
      foreign.push(file); foreignPaths.add(file.path); changed = true;
      for (const reference of file.programReferences || []) programReferences.add(reference);
    }
  }
  const foreignNames = new Set(foreign.flatMap(file => file.imageReferences || []));
  const foreignDynamic = foreign.some(file => file.dynamicImages);
  const proposed = [];
  const retained = [];
  const unused = new Set(mediaAudit?.certain ? mediaAudit.unused.map(file => file.path) : []);
  const mediaCandidates = [];
  for (const file of [...inventory].sort((a, b) => a.path.localeCompare(b.path))) {
    const domain = file.path.startsWith("source/") ? "source" : "public";
    const relative = domain === "source" ? file.path.slice(7) : file.path;
    let classification = "unknown-retained";
    let eligible = false;
    if (protectedPath(file.path)) classification = "hosting-metadata-retained";
    else if (file.type !== "file" || !/^[a-f0-9]{64}$/.test(file.sha256 || "") || !Number.isSafeInteger(file.bytes) || file.bytes < 0) classification = "uncertain-retained";
    else if (domain === "source" && isSourceFile(relative)) classification = "portable-source-retained";
    else if (domain === "public" && publicPaths.has(relative)) classification = "public-output-path-retained";
    else if ((domain === "source" && /(?:^|\/)assets\//.test(relative)) || /^assets\/images\//.test(relative)) classification = "asset-history-unproven-retained";
    else if (domain === "source" && sourceObsolete(relative)) {
      classification = sourceCurrent ? "obsolete-source-editor-or-utility" : "obsolete-source-deferred-until-guided-update";
      eligible = sourceCurrent;
    } else if (domain === "public" && publicEditor(relative)) {
      classification = publicCurrent ? "obsolete-public-editor" : "obsolete-public-editor-deferred-until-guided-update";
      eligible = publicCurrent;
    } else if (domain === "public" && publicChunk(relative)) {
      classification = publicCurrent ? "superseded-public-bundle" : "public-bundle-deferred-until-guided-update";
      eligible = publicCurrent;
    }
    const record = { ...file, domain, relativePath: relative, classification };
    if (eligible && programReferences.has(path.posix.basename(relative))) {
      eligible = false; record.classification = "referenced-by-other-page-retained";
    }
    if (!activePaths.has(file.path) && classification !== "hosting-metadata-retained" && classification !== "uncertain-retained" && unused.has(mediaPath(relative))) {
      const sourceImage = remote.get(`source/public/${mediaPath(relative)}`);
      const localImage = localFiles.find(item => item.path === `public/${mediaPath(relative)}`);
      const owned = domain === "source" || [sourceImage, localImage].some(item => item?.sha256 === file.sha256 && item.bytes === file.bytes);
      if (sourceCurrent && publicCurrent && owned && !foreignDynamic && !foreignNames.has(path.posix.basename(relative))) {
        record.classification = "image-without-project-reference";
        eligible = true;
        mediaCandidates.push(record);
      }
    }
    (eligible ? proposed : retained).push(record);
  }
  const payload = {
    version: 2, connectionKey, sourceRevision: digest(sourceFiles), publicRevision: digest(publicFiles),
    inventoryDigest: digest(inventory), sourceCurrent, publicCurrent,
    proposed, retained, mediaCandidates, mediaAudit: mediaAudit ? { certain: mediaAudit.certain, reasons: mediaAudit.reasons, revision: mediaAudit.revision } : null,
    proposedBytes: proposed.reduce((sum, file) => sum + file.bytes, 0),
    localCandidates: localFiles.filter(file => unused.has(mediaPath(file.path.replace(/^dist\//, ""))) &&
      !foreignDynamic && !foreignNames.has(path.posix.basename(file.path))),
    authorization: "none",
  };
  return { ...payload, id: digest(payload) };
}

function createRemoteCleanup({ recoveryStore, evidence, verifyCurrent, mutationGate = () => false,
  localRecovery, onPrepared = async () => {}, onProgress = () => {} }) {
  const plan = async (client, profile) => {
    const inventory = await scanRemote(client, onProgress);
    return createCleanupManifest(inventory, await evidence(profile, inventory));
  };
  return {
    plan,
    async execute(client, profile, manifest, approval) {
      if (!await mutationGate()) return { ok: false, code: "CLEANUP_PRODUCTION_GATE_PENDING" };
      if (cleanupActive) return { ok: false, code: "EDITOR_BUSY" };
      cleanupActive = true;
      const snapshots = [];
      let mutating = false;
      try {
        const fresh = await plan(client, profile);
        if (fresh.id !== manifest?.id || JSON.stringify(fresh) !== JSON.stringify(manifest)) throw new Error("Cleanup evidence changed; review a new manifest");
        const paths = fresh.proposed.map(file => file.path);
        if (!approval?.confirmed || !approval.previewAccepted || approval.manifestId !== fresh.id || JSON.stringify(approval.paths) !== JSON.stringify(paths)) throw new Error("Exact manifest and preview confirmation required");
        if (!fresh.sourceCurrent || !fresh.publicCurrent) throw new Error("Guided source/public update must be verified first");
        await verifyCurrent(profile);
        if (!paths.length && !fresh.localCandidates.length) return { ok: true, code: "CLEANUP_EMPTY", removed: 0 };
        if (fresh.localCandidates.length && !localRecovery) throw new Error("Local recovery required");
        onProgress({ phase: "backup" });
        if (localRecovery) await localRecovery.prepare(fresh.localCandidates, fresh.id);
        // Protect both domains before the first deletion, not one domain at a time.
        for (const domain of ["source", "public"]) {
          const files = fresh.proposed.filter(file => file.domain === domain);
          if (!files.length) continue;
          const transfer = createTransferProgress([client], details => onProgress({ ...details, phase: "backup" }));
          let transaction;
          try {
            transaction = await recoveryStore.prepare(client, domain, profile,
              files.map(file => ({ relativePath: file.relativePath, localPath: null })), `cleanup:${fresh.id}`, { forceNew: true, progress: transfer });
          } finally { transfer.stop(); }
          snapshots.push({ domain, transaction });
          for (const file of files) {
            const before = transaction.snapshots[domain].files.find(item => item.path === file.relativePath)?.before;
            if (!before || before.sha256 !== file.sha256 || before.bytes !== file.bytes) throw new Error("Cleanup backup differs from reviewed file");
          }
        }
        if ((await plan(client, profile)).id !== fresh.id) throw new Error("Remote files changed during backup");
        await verifyCurrent(profile);
        for (const snapshot of snapshots) await recoveryStore.verify(snapshot.transaction.id, snapshot.domain);
        if (localRecovery) await localRecovery.validateCurrent(fresh.id);
        await onPrepared({ manifest: fresh, recovery: snapshots.map(item => recoveryStore.summary(item.transaction, item.domain)) });
        for (const snapshot of snapshots) await recoveryStore.mark(snapshot.transaction, snapshot.domain, "mutating");
        mutating = true;
        for (const file of fresh.proposed) { onProgress({ phase: "removal", file: file.path }); await client.remove(`/${file.path}`); }
        if (localRecovery) await localRecovery.remove(fresh.id);
        for (const snapshot of snapshots) {
          await recoveryStore.verifyRemote(client, snapshot.transaction, snapshot.domain);
        }
        const after = await plan(client, profile);
        if (!after.sourceCurrent || !after.publicCurrent || after.proposed.length) throw new Error("Cleanup convergence verification failed");
        await verifyCurrent(profile);
        for (const snapshot of snapshots) await recoveryStore.mark(snapshot.transaction, snapshot.domain, "success");
        return { ok: true, code: "CLEANUP_SUCCEEDED", removed: paths.length, removedLocal: fresh.localCandidates.length, removedBytes: fresh.proposedBytes,
          retainedUnknown: after.retained.filter(file => file.classification === "unknown-retained").map(file => file.path),
          recovery: snapshots.map(item => recoveryStore.summary(item.transaction, item.domain)) };
      } catch (error) {
        for (const snapshot of snapshots) {
          try { await recoveryStore.mark(snapshot.transaction, snapshot.domain, mutating ? "possibly_partial" : "failed_before_mutation"); }
          catch { /* Preserve the original failure and the already verified recovery copies. */ }
        }
        return { ok: false, code: mutating ? "CLEANUP_POSSIBLY_PARTIAL" : "CLEANUP_BLOCKED", message: error.message,
          recovery: snapshots.map(item => recoveryStore.summary(item.transaction, item.domain)) };
      } finally { cleanupActive = false; }
    },
  };
}

module.exports = { scanLocal, scanRemote, fileEvidence, createCleanupManifest, createRemoteCleanup };

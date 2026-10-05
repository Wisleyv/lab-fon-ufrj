import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
const require = createRequire(import.meta.url);
const { scanLocal, fileEvidence, createCleanupManifest, createRemoteCleanup } = require("../../desktop/remote-cleanup.cjs");
const { createRecoveryStore, destinationKey } = require("../../desktop/recovery-store.cjs");
const native = require("../../desktop/main.cjs");
const profile = { host: "local-fixture", port: 21, username: "editor", secure: true };

async function fixture(callback) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-cleanup-"));
  const root = path.join(base, "remote");
  const initial = {
    "source/package.json": "source", "source/index.html": "site source", "source/.htaccess": "private", ".ftpquota": "quota", ".htaccess": "hosting",
    "index.html": "current", "data.json": "current data", "js/index.current.js": "current script",
    "source/editor.html": "old editor", "source/src/js/editor/bootstrap.js": "old editor source",
    "source/scripts/fix-encoding.js": "old dev tool", "editor.html": "old renderer",
    "js/editor.old.js": "old editor bundle", "assets/editor.old.css": "old editor styles",
    "js/index.old.js": "old site script", "js/site-content.old.js": "old site content", "assets/index.old.css": "old site styles",
    "assets/images/uncertain.png": "uncertain history", "source/public/assets/images/uncertain.png": "uncertain source history",
  };
  const local = remote => path.join(root, remote.replace(/^\/+/, ""));
  for (const [name, value] of Object.entries(initial)) {
    await fs.mkdir(path.dirname(local(name)), { recursive: true });
    await fs.writeFile(local(name), value);
  }
  const store = createRecoveryStore(path.join(base, "recovery"));
  const client = {
    list: vi.fn(async directory => Promise.all((await fs.readdir(local(directory), { withFileTypes: true })).map(async entry => ({
      name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory(), size: (await fs.stat(path.join(local(directory), entry.name))).size,
    })))),
    downloadTo: vi.fn(async (target, remote) => {
      const bytes = await fs.readFile(local(remote));
      if (typeof target === "string") await fs.writeFile(target, bytes);
      else target.end(bytes);
    }),
    remove: vi.fn(async remote => fs.unlink(local(remote))),
    ensureDir: vi.fn(async remote => fs.mkdir(local(remote), { recursive: true })),
    uploadFrom: vi.fn(async (source, remote) => fs.copyFile(source, local(remote))),
  };
  const expected = async names => fileEvidence(names.map(name => ({ relativePath: name, localPath: local(name.startsWith("source/") ? name : name) })));
  const sourceFiles = (await expected(["source/package.json", "source/index.html", "source/public/assets/images/uncertain.png"]))
    .map(file => ({ ...file, path: file.path.slice(7) }));
  const publicFiles = await expected(["index.html", "data.json", "js/index.current.js", "assets/images/uncertain.png"]);
  const evidence = async () => ({ sourceFiles, publicFiles, connectionKey: destinationKey(profile) });
  const verifyCurrent = vi.fn(async () => {});
  const service = (extra = {}) => createRemoteCleanup({ recoveryStore: store, evidence, verifyCurrent, mutationGate: () => true, ...extra });
  const approve = manifest => ({ confirmed: true, previewAccepted: true, manifestId: manifest.id, paths: manifest.proposed.map(file => file.path) });
  try { await callback({ root, local, initial, client, store, evidence, verifyCurrent, service, approve }); }
  finally { await fs.rm(base, { recursive: true, force: true }); }
}

describe("controlled remote cleanup", () => {
  it("preserves unused images referenced by another page on the server", async () => fixture(async ({ service, client, evidence, local }) => {
    await fs.writeFile(local("assets/images/uncertain.png"), "uncertain source history");
    await fs.writeFile(local("another-page.html"), '<link href="assets/index.older.css">');
    await fs.writeFile(local("assets/index.older.css"), 'body { background: url("images/uncertain.png"); }');
    const engine = service({ evidence: async () => ({ ...await evidence(),
      sourceFiles: (await evidence()).sourceFiles.filter(file => !file.path.endsWith("uncertain.png")),
      publicFiles: (await evidence()).publicFiles.filter(file => !file.path.endsWith("uncertain.png")),
      mediaAudit: { certain: true, reasons: [], revision: "fixture", unused: [{ path: "assets/images/uncertain.png" }] },
    }) });
    const manifest = await engine.plan(client, profile);
    expect(manifest.mediaCandidates).toEqual([]);
    expect(manifest.proposed.some(file => file.path.endsWith("uncertain.png"))).toBe(false);
    expect(manifest.proposed.some(file => file.path === "assets/index.older.css")).toBe(false);
    expect(manifest.retained.filter(file => file.path.endsWith("uncertain.png"))).toHaveLength(2);
  }));
  it("includes proven unused images in the confirmed list and protects them for recovery", async () => fixture(async ({ service, client, evidence, approve, local, store }) => {
    const engine = service({ evidence: async () => ({ ...await evidence(),
      sourceFiles: (await evidence()).sourceFiles.filter(file => !file.path.endsWith("uncertain.png")),
      publicFiles: (await evidence()).publicFiles.filter(file => !file.path.endsWith("uncertain.png")), mediaAudit: {
      certain: true, reasons: [], revision: "fixture", unused: [{ path: "assets/images/uncertain.png" }],
    } }) });
    const manifest = await engine.plan(client, profile);
    // The public image has different bytes from its source copy: preserve it.
    expect(manifest.mediaCandidates).toHaveLength(1);
    expect(manifest.proposed.some(file => file.path === "source/public/assets/images/uncertain.png")).toBe(true);
    const result = await engine.execute(client, profile, manifest, approve(manifest));
    expect(result.ok).toBe(true);
    await expect(fs.readFile(local("source/public/assets/images/uncertain.png"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await fs.readFile(local("assets/images/uncertain.png"), "utf8")).toBe("uncertain history");
    for (const backup of result.recovery) await store.restore(client, backup.transactionId, backup.domain, profile);
    expect(await fs.readFile(local("source/public/assets/images/uncertain.png"), "utf8")).toBe("uncertain source history");
  }));
  it("reviews without writes, backs up both domains, converges, and restores exact original bytes", async () => fixture(async ({ client, service, approve, store, initial, local }) => {
    const engine = service();
    const manifest = await engine.plan(client, profile);
    expect(manifest.proposed).toHaveLength(9);
    expect(manifest.authorization).toBe("none");
    expect(client.remove).not.toHaveBeenCalled();
    const result = await engine.execute(client, profile, manifest, approve(manifest));
    expect(result).toMatchObject({ ok: true, removed: 9, retainedUnknown: [] });
    expect((await engine.plan(client, profile)).proposed).toEqual([]);
    for (const name of [".ftpquota", ".htaccess", "source/.htaccess", "assets/images/uncertain.png", "source/public/assets/images/uncertain.png", "index.html"]) {
      expect(await fs.readFile(local(name), "utf8")).toBe(initial[name]);
    }
    for (const recovery of result.recovery) await store.restore(client, recovery.transactionId, recovery.domain, profile);
    for (const [name, bytes] of Object.entries(initial)) expect(await fs.readFile(local(name), "utf8")).toBe(bytes);
  }));

  it.each(["none", "missing preview", "wrong id", "wrong paths", "forged asset", "wrong connection", "changed file"])("rejects %s authorization/evidence before deletion", async mode => fixture(async ({ service, client, approve, local }) => {
    const engine = service(); const manifest = await engine.plan(client, profile);
    const approval = approve(manifest);
    if (mode === "none") approval.confirmed = false;
    if (mode === "missing preview") approval.previewAccepted = false;
    if (mode === "wrong id") approval.manifestId = "other";
    if (mode === "wrong paths") approval.paths.push("assets/images/uncertain.png");
    if (mode === "forged asset") manifest.proposed.push(manifest.retained.find(file => file.path === "assets/images/uncertain.png"));
    if (mode === "wrong connection") manifest.connectionKey = "other";
    if (mode === "changed file") await fs.writeFile(local("editor.html"), "changed!");
    expect((await engine.execute(client, profile, manifest, approval)).ok).toBe(false);
    expect(client.remove).not.toHaveBeenCalled();
  }));

  it("blocks live application execution before opening a connection, and defaults the engine gate to closed", async () => fixture(async ({ client, store, evidence, approve }) => {
    const engine = createRemoteCleanup({ recoveryStore: store, evidence });
    const manifest = await engine.plan(client, profile);
    client.list.mockClear(); client.downloadTo.mockClear();
    expect(await engine.execute(client, profile, manifest, approve(manifest))).toMatchObject({ code: "CLEANUP_PRODUCTION_GATE_PENDING" });
    expect(client.list).not.toHaveBeenCalled();
    expect(client.remove).not.toHaveBeenCalled();
    expect(await native.executeRemoteCleanup(null, "invalid", profile, "secret", manifest.id, approve(manifest))).toMatchObject({ code: "CLEANUP_BLOCKED" });
  }));

  it.each(["source", "public"])("defers obsolete files when the %s revision is not current", async domain => fixture(async ({ evidence, root }) => {
    const expected = await evidence(); expected[`${domain}Files`][0].sha256 = "0".repeat(64);
    const manifest = createCleanupManifest(await scanLocal(root), expected);
    expect(manifest[`${domain}Current`]).toBe(false);
    expect(manifest.proposed.some(file => file.domain === domain)).toBe(false);
    expect(manifest.retained.some(file => /deferred/.test(file.classification))).toBe(true);
  }));

  it("retains unknown and historical media without pretending full convergence", async () => fixture(async ({ local, service, client, approve }) => {
    await fs.writeFile(local("legacy-document.pdf"), "keep");
    const engine = service(); const manifest = await engine.plan(client, profile);
    const result = await engine.execute(client, profile, manifest, approve(manifest));
    expect(result).toMatchObject({ ok: true, retainedUnknown: ["legacy-document.pdf"] });
    expect(await fs.readFile(local("legacy-document.pdf"), "utf8")).toBe("keep");
  }));

  it.each(["public backup", "source verification", "capture changed file", "damaged backup"])("performs zero deletions for %s failure", async mode => fixture(async ({ store, service, client, approve, verifyCurrent, local }) => {
    const engine = service(); const manifest = await engine.plan(client, profile);
    if (mode === "source verification") verifyCurrent.mockRejectedValue(new Error("Guided receipt stale"));
    else {
      const prepare = store.prepare;
      store.prepare = async (...args) => {
        if (mode === "public backup" && args[1] === "public") throw new Error("Disk full");
        const result = await prepare(...args);
        if (mode === "capture changed file") await fs.writeFile(local("editor.html"), "changed during capture");
        if (mode === "damaged backup") {
          const first = result.snapshots[args[1]].files.find(file => file.before);
          await fs.writeFile(path.join(store.summary(result, args[1]).backupPath, args[1], "files", first.path), "damaged");
        }
        return result;
      };
    }
    expect((await engine.execute(client, profile, manifest, approve(manifest))).ok).toBe(false);
    expect(client.remove).not.toHaveBeenCalled();
  }));

  it("rejects overlapping cleanup executions", async () => fixture(async ({ service, client, approve, verifyCurrent }) => {
    const engine = service(); const manifest = await engine.plan(client, profile);
    let resume;
    verifyCurrent.mockImplementationOnce(() => new Promise(resolve => { resume = resolve; }));
    const first = engine.execute(client, profile, manifest, approve(manifest));
    await vi.waitFor(() => expect(resume).toBeTypeOf("function"));
    expect(await service().execute(client, profile, manifest, approve(manifest))).toMatchObject({ code: "EDITOR_BUSY" });
    resume();
    expect((await first).ok).toBe(true);
  }));

  it("does not claim success if FTP acknowledges deletion without removing the files", async () => fixture(async ({ service, client, approve, local }) => {
    const engine = service(); const manifest = await engine.plan(client, profile);
    client.remove.mockResolvedValue(undefined);
    expect(await engine.execute(client, profile, manifest, approve(manifest))).toMatchObject({ ok: false, code: "CLEANUP_POSSIBLY_PARTIAL" });
    expect(await fs.readFile(local("editor.html"), "utf8")).toBe("old renderer");
  }));

  it("keeps both snapshots recoverable after a partial deletion and interrupted restore", async () => fixture(async ({ service, client, approve, store, initial, local }) => {
    const engine = service(); const manifest = await engine.plan(client, profile);
    const remove = client.remove.getMockImplementation(); let count = 0;
    client.remove.mockImplementation(async remote => { if (++count === 3) throw new Error("Offline"); return remove(remote); });
    const result = await engine.execute(client, profile, manifest, approve(manifest));
    expect(result).toMatchObject({ ok: false, code: "CLEANUP_POSSIBLY_PARTIAL" });
    expect(result.recovery).toHaveLength(2);
    client.remove.mockImplementation(remove);
    const upload = client.uploadFrom.getMockImplementation();
    client.uploadFrom.mockRejectedValueOnce(new Error("Restore offline"));
    await expect(store.restore(client, result.recovery[0].transactionId, result.recovery[0].domain, profile)).rejects.toThrow("Restore offline");
    client.uploadFrom.mockImplementation(upload);
    for (const recovery of result.recovery) await store.restore(client, recovery.transactionId, recovery.domain, profile);
    for (const [name, bytes] of Object.entries(initial)) expect(await fs.readFile(local(name), "utf8")).toBe(bytes);
  }));
  it("reports partial failure with recovery copies even if updating the failure journal also fails", async () => fixture(async ({ service, client, approve, store }) => {
    const engine = service(), manifest = await engine.plan(client, profile);
    const mark = store.mark;
    store.mark = async (transaction, domain, status) => {
      if (status === "possibly_partial") throw new Error("Disk full while recording failure");
      return mark(transaction, domain, status);
    };
    client.remove.mockRejectedValue(new Error("FTP interrupted"));
    const result = await engine.execute(client, profile, manifest, approve(manifest));
    expect(result).toMatchObject({ ok: false, code: "CLEANUP_POSSIBLY_PARTIAL", message: "FTP interrupted" });
    expect(result.recovery).toHaveLength(2);
    for (const backup of result.recovery) expect((await store.verify(backup.transactionId, backup.domain)).id).toBe(backup.transactionId);
  }));

  it("rejects unsafe/duplicate paths and retains uncertain entry types", async () => fixture(async ({ root, evidence }) => {
    const inventory = await scanLocal(root); const expected = await evidence();
    for (const name of ["source/../editor.html", "editor.html\r\nDELE index.html", "C:/secret", "\\index.html"]) {
      expect(() => createCleanupManifest([...inventory, { path: name }], expected)).toThrow("Unsafe");
    }
    expect(() => createCleanupManifest([...inventory, inventory[0]], expected)).toThrow("duplicate");
    const plan = createCleanupManifest([...inventory.filter(file => file.path !== "editor.html"), { path: "editor.html", type: "uncertain" }], expected);
    expect(plan.proposed.some(file => file.path === "editor.html")).toBe(false);
  }));
});

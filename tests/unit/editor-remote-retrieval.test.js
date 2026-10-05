import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createNativeDesktopHost } from "../../src/js/editor/desktop-host.js";
import { createPublishController } from "../../src/js/editor/publish-service.js";
import { loadEditorSiteModel } from "../../src/js/editor/project-loader.js";
import { createProjectCompositionService } from "../../src/js/editor/composition-service.js";
import { removeSection } from "../../src/js/editor/composition-commands.js";

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");
const { readContentDataset, saveContentRecord } = require("../../desktop/content-store.cjs");
const repoRoot = process.cwd();

function createProfile(overrides = {}) {
  return {
    host: "localhost",
    port: 21,
    username: "editor",
    remoteSourcePath: "/source",
    remotePublishPath: "/",
    secure: true,
    passiveMode: true,
    hasPassword: true,
    ...overrides,
  };
}

function createFakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => value.toString("utf8"),
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function createRemoteLayout({ source = "valid" } = {}) {
  const remoteRoot = path.join(
    repoRoot,
    "tmp",
    `remote-layout-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fs.mkdir(path.join(remoteRoot, "assets"), { recursive: true });
  await fs.writeFile(path.join(remoteRoot, "index.html"), "<html></html>", "utf8");
  await writeJson(path.join(remoteRoot, "data.json"), { page: { sections: [] } });

  if (source !== "missing") {
    const sourceRoot = path.join(remoteRoot, "source");
    await fs.mkdir(sourceRoot, { recursive: true });
    if (source === "empty") {
      await fs.writeFile(path.join(sourceRoot, ".htaccess"), "Require all denied\n");
      return {
        remoteRoot,
        async cleanup() {
          await fs.rm(remoteRoot, { recursive: true, force: true });
        },
      };
    }
    await Promise.all(
      ["src", "scripts"].map((directory) =>
        fs.cp(path.join(repoRoot, directory), path.join(sourceRoot, directory), {
          recursive: true,
        }),
      ),
    );
    // The actual page code requires this public image even in the small fixture.
    await fs.mkdir(path.join(sourceRoot, "public/assets/images"), { recursive: true });
    for (const name of ["curriculo_lattes_150x61.png", "favicon_32x32.png", "apple-touch-icon.png"])
      await fs.writeFile(path.join(sourceRoot, "public/assets/images", name), "fixture image");
    await Promise.all(
      [
        "package.json",
        "package-lock.json",
        "index.html",
        "editor.html",
        "vite.config.js",
      ].map((fileName) =>
        fs.copyFile(path.join(repoRoot, fileName), path.join(sourceRoot, fileName)),
      ),
    );
    await writeJson(path.join(sourceRoot, "content", "page.json"), {
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "publicacoes", type: "publicacoes", enabled: true, order: 2 },
        { id: "extensao", type: "extension", enabled: false, order: 3 },
      ],
    });
    await writeJson(path.join(sourceRoot, "content", "site.json"), {
      hero: { title: "Hero remoto" },
      sobre: { title: "Sobre remoto", paragraphs: ["Texto remoto."] },
    });
    await writeJson(path.join(sourceRoot, "content", "equipe", "egressa.json"), {
      nome: "Pessoa Egressa",
      categoria: "egressos",
    });

    if (source === "incomplete") {
      await fs.rm(path.join(sourceRoot, "scripts", "build-data.js"), {
        force: true,
      });
    }
    if (source === "malformed") {
      await fs.writeFile(
        path.join(sourceRoot, "content", "page.json"),
        "{malformed",
        "utf8",
      );
    }
  }

  return {
    remoteRoot,
    async cleanup() {
      await fs.rm(remoteRoot, { recursive: true, force: true });
    },
  };
}

function createFilesystemFtpClient(remoteRoot, options = {}) {
  const calls = [];
  let progressCallback = null;
  let transferredBytes = 0;
  let activeDownloads = 0;
  let maxActiveDownloads = 0;
  const toLocal = (remotePath) =>
    path.join(remoteRoot, path.posix.normalize(remotePath).replace(/^\/+/, ""));

  async function reportTransferred(localPath) {
    if (!progressCallback) return;
    const entries = [];
    async function walk(currentPath) {
      const stat = await fs.stat(currentPath);
      if (stat.isFile()) {
        entries.push(stat.size);
        return;
      }
      for (const name of await fs.readdir(currentPath)) await walk(path.join(currentPath, name));
    }
    await walk(localPath);
    transferredBytes += entries.reduce((total, size) => total + size, 0);
    progressCallback({ bytesOverall: transferredBytes });
  }

  return {
    remoteRoot,
    calls,
    ftp: {},
    async features() {
      return new Map(options.hashes ? [["HASH", "SHA-256;SHA-1*"]] : []);
    },
    async send(command) {
      calls.push(["send", command]);
      if (command === "OPTS HASH SHA-256") return { code: 200, message: "200 SHA-256" };
      const remotePath = command.slice(5);
      if (options.badHash) return { code: 213, message: "213 SHA-1 uncertain" };
      const data = await fs.readFile(toLocal(remotePath));
      return { code: 213, message: `213 SHA-256 ${options.partialHash ? 1 : 0}-${data.length - 1} ${createHash("sha256").update(data).digest("hex")} ${options.wrongPath ? "/different.png" : remotePath}` };
    },
    get maxActiveDownloads() { return maxActiveDownloads; },
    async access(config) {
      calls.push(["access", config]);
    },
    async cd(remotePath) {
      calls.push(["cd", remotePath]);
      await fs.access(toLocal(remotePath));
    },
    async list(remotePath = "") {
      calls.push(["list", remotePath]);
      const entries = await fs.readdir(toLocal(remotePath || "/"), {
        withFileTypes: true,
      });
      return Promise.all(entries.map(async (entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: options.unknownSizes ? undefined : (await fs.stat(toLocal(path.posix.join(remotePath || "/", entry.name)))).size,
      })));
    },
    async downloadTo(localPath, remotePath) {
      calls.push(["downloadTo", remotePath]);
      if (typeof localPath !== "string") {
        localPath.end(await fs.readFile(toLocal(remotePath)));
        return;
      }
      activeDownloads += 1;
      maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads);
      if (options.sharedConcurrency) {
        options.sharedConcurrency.active += 1;
        options.sharedConcurrency.max = Math.max(
          options.sharedConcurrency.max,
          options.sharedConcurrency.active,
        );
      }
      try {
        if (options.failDownloadPath === remotePath) throw new Error("Simulated worker failure");
        if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.copyFile(toLocal(remotePath), localPath);
        await reportTransferred(localPath);
      } finally {
        activeDownloads -= 1;
        if (options.sharedConcurrency) options.sharedConcurrency.active -= 1;
      }
    },
    async downloadToDir(localPath, remotePath) {
      calls.push(["downloadToDir", remotePath]);
      await fs.cp(toLocal(remotePath), localPath, { recursive: true });
      await reportTransferred(localPath);
    },
    trackProgress(callback) {
      transferredBytes = 0;
      progressCallback = callback || null;
    },
    async ensureDir(remotePath) {
      calls.push(["ensureDir", remotePath]);
      await fs.mkdir(toLocal(remotePath), { recursive: true });
    },
    async uploadFrom(localPath, remotePath) {
      calls.push(["uploadFrom", remotePath]);
      await fs.mkdir(path.dirname(toLocal(remotePath)), { recursive: true });
      await fs.copyFile(localPath, toLocal(remotePath));
    },
    async remove(remotePath) {
      calls.push(["remove", remotePath]);
      await fs.unlink(toLocal(remotePath));
    },
    async size(remotePath) {
      return (await fs.stat(toLocal(remotePath))).size;
    },
    close() {
      calls.push(["close"]);
    },
  };
}

async function withNativeServices(client, callback, options = {}) {
  const userDataPath = path.join(
    repoRoot,
    "tmp",
    `retrieval-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fs.mkdir(userDataPath, { recursive: true });
  let clientCount = 0;
  const createdClients = [];
  nativeHandlers.configureAppServices({
    app: { getPath: () => userDataPath },
    safeStorage: createFakeSafeStorage(),
    createFtpClient: () => {
      const nextClient = clientCount % 2 === 0
        ? client
        : options.secondaryClient || createFilesystemFtpClient(client.remoteRoot);
      clientCount += 1;
      createdClients.push(nextClient);
      return nextClient;
    },
  });

  try {
    return await callback(userDataPath, createdClients);
  } finally {
    nativeHandlers.configureAppServices({
      app: null,
      safeStorage: null,
      createFtpClient: null,
    });
    await fs.rm(userDataPath, { recursive: true, force: true });
  }
}

describe("remote editable project retrieval", () => {
  it.each([false, true])("runs the native guided workflow with real builds and local FTP (public failure=%s)", async failPublication => {
    const layout = await createRemoteLayout();
    const primary = createFilesystemFtpClient(layout.remoteRoot);
    const secondary = createFilesystemFtpClient(layout.remoteRoot);
    let failOnce = failPublication;
    for (const client of [primary, secondary]) {
      const upload = client.uploadFrom.bind(client);
      client.uploadFrom = async (local, remote) => {
        if (failOnce && remote === "/index.html") { failOnce = false; throw new Error("Simulated publication interruption"); }
        return upload(local, remote);
      };
    }
    try {
      await withNativeServices(primary, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        expect(retrieved.ok).toBe(true);
        const root = retrieved.directory.path;
        const sitePath = path.join(root, "content/site.json");
        const site = JSON.parse(await fs.readFile(sitePath, "utf8"));
        site.hero.title = "Guided update";
        await writeJson(sitePath, site);
        const originalPublicData = await fs.readFile(path.join(layout.remoteRoot, "data.json"), "utf8");
        const stages = [];
        const result = await nativeHandlers.updateSite({ sender: { send: (_, value) => stages.push(value.stage) } }, root, createProfile(), "secret");
        expect(result.ok).toBe(!failPublication);
        expect(result.receipts.source).toBeTruthy();
        expect(JSON.parse(await fs.readFile(path.join(layout.remoteRoot, "source/content/site.json"), "utf8")).hero.title).toBe("Guided update");
        if (failPublication) {
          expect(stages).toContain("recovery");
          expect(await fs.readFile(path.join(layout.remoteRoot, "index.html"), "utf8")).toBe("<html></html>");
          expect(await fs.readFile(path.join(layout.remoteRoot, "data.json"), "utf8")).toBe(originalPublicData);
          const sourceUploads = [...primary.calls, ...secondary.calls].filter(([op, target]) => op === "uploadFrom" && target.startsWith("/source/"));
          expect((await nativeHandlers.updateSite(null, root, createProfile(), "secret")).ok).toBe(true);
          expect([...primary.calls, ...secondary.calls].filter(([op, target]) => op === "uploadFrom" && target.startsWith("/source/"))).toHaveLength(sourceUploads.length);
        }
        expect(JSON.parse(await fs.readFile(path.join(layout.remoteRoot, "data.json"), "utf8")).site.hero.title).toBe("Guided update");
        expect(await nativeHandlers.pathExists(null, root, "dist/editor.html")).toBe(false);
        expect((await nativeHandlers.updateSite(null, layout.remoteRoot, createProfile(), "secret")).ok).toBe(false);
      }, { secondaryClient: secondary });
    } finally { await layout.cleanup(); }
  }, 60000);

  it.each([false, true])("filters unused remote images conservatively (dynamic references=%s)", async dynamic => {
    const layout = await createRemoteLayout();
    const sourceRoot = path.join(layout.remoteRoot, "source");
    const orphan = "public/assets/images/old-unused.png";
    await fs.writeFile(path.join(sourceRoot, orphan), "obsolete photo");
    if (dynamic) await fs.appendFile(path.join(sourceRoot, "src/js/main.js"), '\nconst dynamicImage = "assets/images/" + name;');
    const primary = createFilesystemFtpClient(layout.remoteRoot, { hashes: true });
    const secondary = createFilesystemFtpClient(layout.remoteRoot);
    try {
      await withNativeServices(primary, async () => {
        const result = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        expect(result.ok).toBe(true);
        expect(result.metrics.excludedImages).toBe(dynamic ? 0 : 1);
        expect(await nativeHandlers.pathExists(null, result.directory.path, orphan)).toBe(dynamic);
        expect([...primary.calls, ...secondary.calls].filter(([op, target]) => op === "downloadTo" && target === `/source/${orphan}`)).toHaveLength(dynamic ? 1 : 0);
        primary.calls.length = 0; secondary.calls.length = 0;
        expect((await nativeHandlers.updateRemoteProjectSource(null, result.directory.path, createProfile(), "secret")).ok).toBe(true);
        if (!dynamic) expect([...primary.calls, ...secondary.calls].some(([, target]) => typeof target === "string" && target.includes("old-unused.png"))).toBe(false);
        expect(await fs.readFile(path.join(sourceRoot, orphan), "utf8")).toBe("obsolete photo");
      }, { secondaryClient: secondary });
    } finally { await layout.cleanup(); }
  });

  it("runs confirmed cleanup and coordinated recovery through native handlers without changing the page", async () => {
    const layout = await createRemoteLayout();
    const orphan = "assets/images/old-unused.png", bytes = "old unused photo";
    await fs.mkdir(path.join(layout.remoteRoot, "assets/images"), { recursive: true });
    await fs.writeFile(path.join(layout.remoteRoot, orphan), bytes);
    await fs.writeFile(path.join(layout.remoteRoot, "source/public", orphan), bytes);
    const client = createFilesystemFtpClient(layout.remoteRoot);
    let confirm = 0;
    nativeHandlers.configureAppServices({ dialog: { showMessageBox: async () => ({ response: confirm }) } });
    try {
      await withNativeServices(client, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        const root = retrieved.directory.path;
        await fs.writeFile(path.join(root, "public", orphan), bytes);
        expect((await nativeHandlers.updateSite(null, root, createProfile(), "secret")).ok).toBe(true);
        const before = await fs.readFile(path.join(layout.remoteRoot, "data.json"));
        expect((await nativeHandlers.previewGeneratedSite(null, root)).ok).toBe(true);
        const review = await nativeHandlers.reviewRemoteCleanup(null, root, createProfile(), "secret");
        expect(review.ok).toBe(true); expect(review.previewReady).toBe(true);
        expect(review.manifest.mediaCandidates).toHaveLength(2); expect(review.manifest.localCandidates).toHaveLength(2);
        const approval = { confirmed: true, previewAccepted: true, manifestId: review.manifest.id, paths: review.manifest.proposed.map(file => file.path) };
        expect((await nativeHandlers.executeRemoteCleanup(null, root, createProfile(), "secret", review.manifest.id, { ...approval, previewAccepted: false })).ok).toBe(false);
        expect((await nativeHandlers.executeRemoteCleanup(null, root, createProfile(), "secret", review.manifest.id, approval)).cancelled).toBe(true);
        expect(await fs.readFile(path.join(layout.remoteRoot, orphan), "utf8")).toBe(bytes);
        confirm = 1;
        const result = await nativeHandlers.executeRemoteCleanup(null, root, createProfile(), "secret", review.manifest.id, approval);
        expect(result).toMatchObject({ ok: true, removedLocal: 2 });
        await expect(fs.readFile(path.join(root, "public", orphan))).rejects.toMatchObject({ code: "ENOENT" });
        await expect(fs.readFile(path.join(layout.remoteRoot, orphan))).rejects.toMatchObject({ code: "ENOENT" });
        expect(await fs.readFile(path.join(layout.remoteRoot, "data.json"))).toEqual(before);
        expect((await nativeHandlers.restoreCleanup(null, root, createProfile(), "secret")).ok).toBe(true);
        for (const target of [path.join(root, "public", orphan), path.join(root, "dist", orphan), path.join(layout.remoteRoot, orphan), path.join(layout.remoteRoot, "source/public", orphan)])
          expect(await fs.readFile(target, "utf8")).toBe(bytes);
        expect(await fs.readFile(path.join(layout.remoteRoot, "data.json"))).toEqual(before);
      });
    } finally { await nativeHandlers.stopGeneratedPreviewServer(); nativeHandlers.configureAppServices({ dialog: null }); await layout.cleanup(); }
  }, 60000);

  it.each(["unchanged", "remote changed", "local changed", "unsupported", "malformed", "unknown sizes", "partial hash", "wrong path"])(
    "retrieves safely with a cached asset: %s", async mode => {
      const layout = await createRemoteLayout();
      const asset = "public/assets/images/cached.png";
      const remote = path.join(layout.remoteRoot, "source", asset);
      await fs.mkdir(path.dirname(remote), { recursive: true });
      await fs.writeFile(remote, "original");
      const sitePath = path.join(layout.remoteRoot, "source/content/site.json");
      const site = JSON.parse(await fs.readFile(sitePath, "utf8"));
      site.logo = "assets/images/cached.png";
      await writeJson(sitePath, site);
      const primary = createFilesystemFtpClient(layout.remoteRoot, {
        hashes: mode !== "unsupported", badHash: mode === "malformed", unknownSizes: mode === "unknown sizes",
        partialHash: mode === "partial hash", wrongPath: mode === "wrong path",
      });
      const secondary = createFilesystemFtpClient(layout.remoteRoot);
      try {
        await withNativeServices(primary, async () => {
          const first = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
          expect(first.ok).toBe(true);
          if (mode === "remote changed") await fs.writeFile(remote, "modified");
          if (mode === "local changed") await fs.writeFile(path.join(first.directory.path, asset), "tampered");
          primary.calls.length = 0;
          secondary.calls.length = 0;
          const events = [];
          const second = await nativeHandlers.retrieveRemoteProject({ sender: { send: (_, value) => events.push(value) } }, createProfile(), "secret");
          expect(second.ok).toBe(true);
          expect(await fs.readFile(path.join(second.directory.path, asset), "utf8")).toBe(mode === "remote changed" ? "modified" : "original");
          const downloads = [...primary.calls, ...secondary.calls].filter(([op, target]) => op === "downloadTo" && target === `/source/${asset}`);
          expect(downloads.length).toBe(mode === "unchanged" ? 0 : 1);
          // Count all eligible fixture assets, including the retained Editor branding image.
          const cachedAssets = (await nativeHandlers.listEditableProjectBundleFiles(second.directory.path))
            .filter(file => /^(?:public\/assets|src\/assets\/images)\//.test(file.relativePath)).length;
          expect(second.metrics.reusedFiles).toBe(mode === "unchanged" ? cachedAssets
            : ["remote changed", "local changed"].includes(mode) ? cachedAssets - 1 : 0);
          expect(second.metrics.reusedBytes + second.metrics.transferredBytes).toBe(second.metrics.totalBytes);
          expect(events.filter(e => e.phase === "download").at(-1).percent).toBe(100);
          expect(events.filter(e => e.phase === "download").at(-1).transferredBytes).toBe(second.metrics.transferredBytes);
          if (mode === "unknown sizes") expect(events.find(e => e.phase === "download").totalBytes).toBeNull();
          expect([...primary.calls, ...secondary.calls].some(([op]) => ["uploadFrom", "remove", "ensureDir"].includes(op))).toBe(false);
        }, { secondaryClient: secondary });
      } finally { await layout.cleanup(); }
    },
  );
  it("round-trips a portable website without Editor files through editing, build, preview and publication", async () => {
    const layout = await createRemoteLayout();
    const sourceRoot = path.join(layout.remoteRoot, "source");
    await fs.mkdir(path.join(sourceRoot, "public", "assets", "images"), { recursive: true });
    await fs.writeFile(path.join(sourceRoot, "public", "assets", "images", "retained.svg"), "<svg/>");
    await fs.rm(path.join(sourceRoot, "editor.html"));
    const primary = createFilesystemFtpClient(layout.remoteRoot);
    const secondary = createFilesystemFtpClient(layout.remoteRoot);
    try {
      await withNativeServices(primary, async () => {
        const expected = (await nativeHandlers.listEditableProjectBundleFiles(sourceRoot)).map(file => file.relativePath).sort();
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        expect(retrieved.ok).toBe(true);
        const root = retrieved.directory.path;
        const downloaded = [...primary.calls, ...secondary.calls]
          .filter(([name]) => name === "downloadTo").map(([, target]) => target.slice("/source/".length)).sort();
        expect(downloaded).toEqual(expected);
        expect(await nativeHandlers.validateLocalEditableProject(root)).toEqual({ ok: true });
        for (const excluded of ["editor.html", "src/js/editor", "src/css/editor.css", "scripts/editor-smoke-ftp.cjs"]) {
          expect(await nativeHandlers.pathExists(null, root, excluded)).toBe(false);
        }
        const record = (await readContentDataset(null, root, "equipe"))[0];
        await saveContentRecord(null, root, "equipe", record.name, record.value, { ...record.value, instituicao: "UFRJ" });
        const update = await nativeHandlers.updateRemoteProjectSource(null, root, createProfile(), "secret");
        expect(update.ok).toBe(true);
        const uploads = [...primary.calls, ...secondary.calls].filter(([name]) => name === "uploadFrom")
          .map(([, target]) => target.slice("/source/".length)).sort();
        expect(uploads).toEqual(["content/equipe/egressa.json"]);
        const recovery = JSON.parse(await fs.readFile(path.join(update.recovery.backupPath, "transaction.json"), "utf8"));
        expect(recovery.snapshots.source.files.map(file => file.path).sort()).toEqual(expected);
        // Supply fixture-local tooling; production retrieval prepares it through npm ci.
        await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
        await fs.symlink(path.join(repoRoot, "node_modules", "vite"), path.join(root, "node_modules", "vite"), "junction");
        const build = await nativeHandlers.runProjectBuild(null, root);
        expect(build.ok).toBe(true);
        expect(await nativeHandlers.pathExists(null, root, "dist/editor.html")).toBe(false);
        expect((await nativeHandlers.previewGeneratedSite(null, root)).ok).toBe(true);
        const publication = await nativeHandlers.publishGeneratedSite(null, root, createProfile(), "secret");
        expect(publication.ok).toBe(true);
        expect(publication.recovery.transactionId).toBe(update.recovery.transactionId);
        expect(await fs.readFile(path.join(layout.remoteRoot, "assets/images/retained.svg"), "utf8")).toBe("<svg/>");
      }, { secondaryClient: secondary });
    } finally {
      await nativeHandlers.stopGeneratedPreviewServer();
      await layout.cleanup();
    }
  }, 60000);

  it("forwards native progress and unsubscribes after retrieval", async () => {
    let progressListener = null;
    let unsubscribeCount = 0;
    const host = createNativeDesktopHost({
      onRemoteProjectRetrievalProgress(listener) {
        progressListener = listener;
        return () => { unsubscribeCount += 1; };
      },
      async retrieveRemoteProject() {
        progressListener({ phase: "download", transferredBytes: 2048 });
        return { ok: true };
      },
    });
    const progress = [];

    const result = await host.retrieveRemoteProject(createProfile(), "secret", (value) => progress.push(value));

    expect(result.ok).toBe(true);
    expect(progress).toEqual([{ phase: "download", transferredBytes: 2048 }]);
    expect(unsubscribeCount).toBe(1);
  });

  it("reports retrieval phases and non-sensitive timing totals", async () => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);
    const progress = [];
    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.retrieveRemoteProject(
          { sender: { send: (_channel, value) => progress.push(value) } },
          createProfile(),
          "secret",
        ),
      );

      expect(result.ok).toBe(true);
      expect(progress.map((item) => item.phase)).toEqual(expect.arrayContaining([
        "setup", "discovery", "download", "validation", "complete",
      ]));
      expect(result.metrics).toMatchObject({
        totalFiles: expect.any(Number),
        totalBytes: expect.any(Number),
        totalMs: expect.any(Number),
      });
      expect(result.metrics.totalFiles).toBeGreaterThan(0);
      expect(result.metrics.totalBytes).toBeGreaterThan(0);
      expect(progress).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ password: expect.anything() }),
      ]));
    } finally {
      await layout.cleanup();
    }
  });

  it("uses exactly two strict-TLS clients with independent sequential queues and aggregated progress", async () => {
    const layout = await createRemoteLayout();
    const sharedConcurrency = { active: 0, max: 0 };
    const primary = createFilesystemFtpClient(layout.remoteRoot, {
      delayMs: 2,
      sharedConcurrency,
    });
    const secondary = createFilesystemFtpClient(layout.remoteRoot, {
      delayMs: 2,
      sharedConcurrency,
    });
    const progress = [];
    try {
      const result = await withNativeServices(
        primary,
        (_userDataPath, createdClients) => nativeHandlers.retrieveRemoteProject(
          { sender: { send: (_channel, value) => progress.push(value) } },
          createProfile(),
          "secret",
        ).then((value) => ({ value, createdClients: [...createdClients] })),
        { secondaryClient: secondary },
      );

      expect(result.value.ok).toBe(true);
      expect(result.createdClients).toEqual([primary, secondary]);
      for (const client of result.createdClients) {
        expect(client.calls.filter(([name]) => name === "access")).toHaveLength(1);
        expect(client.calls.find(([name]) => name === "access")[1].secure).toBe(true);
        expect(client.calls.filter(([name]) => name === "downloadTo").length).toBeGreaterThan(0);
        expect(client.maxActiveDownloads).toBe(1);
      }
      expect(sharedConcurrency.max).toBe(2);
      const downloadUpdates = progress.filter((item) => item.phase === "download");
      expect(Math.max(...downloadUpdates.map((item) => item.transferredBytes || 0)))
        .toBe(result.value.metrics.totalBytes);
    } finally {
      await layout.cleanup();
    }
  });

  it("closes both workers and preserves the active copy when one queue fails", async () => {
    const layout = await createRemoteLayout();
    const primary = createFilesystemFtpClient(layout.remoteRoot, { delayMs: 2 });
    const secondary = createFilesystemFtpClient(layout.remoteRoot, {
      delayMs: 2,
      failDownloadPath: "/source/content/page.json",
    });
    try {
      await withNativeServices(primary, async (userDataPath) => {
        const activeWorkspace = path.join(userDataPath, "workspaces", "lab-fon", "current");
        await fs.mkdir(activeWorkspace, { recursive: true });
        await fs.writeFile(path.join(activeWorkspace, "sentinel.txt"), "keep", "utf8");

        const result = await nativeHandlers.retrieveRemoteProject(
          null,
          createProfile(),
          "secret",
        );

        expect(result.ok).toBe(false);
        expect(result.code).toBe("REMOTE_PROJECT_RETRIEVAL_FAILED");
        expect(primary.calls.at(-1)).toEqual(["close"]);
        expect(secondary.calls.at(-1)).toEqual(["close"]);
        await expect(fs.readFile(path.join(activeWorkspace, "sentinel.txt"), "utf8"))
          .resolves.toBe("keep");
      }, { secondaryClient: secondary });
    } finally {
      await layout.cleanup();
    }
  });

  it("maps FTPS profile settings into the basic-ftp access call", async () => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      await withNativeServices(client, () =>
        nativeHandlers.testFtpConnection(null, createProfile(), "secret"),
      );
      expect(client.calls[0][1]).toMatchObject({
        host: "localhost",
        port: 21,
        user: "editor",
        secure: true,
      });
    } finally {
      await layout.cleanup();
    }
  });

  it("does not accept published dist structure as an editable project", async () => {
    const layout = await createRemoteLayout({ source: "missing" });
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("REMOTE_PROJECT_NOT_INITIALIZED");
      expect(client.calls.map((call) => call[0])).not.toContain("ensureDir");
      expect(client.calls.map((call) => call[0])).not.toContain("uploadFrom");
    } finally {
      await layout.cleanup();
    }
  });

  it("retrieves the fixed remote source into an app workspace", async () => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      await withNativeServices(client, async () => {
        const result = await nativeHandlers.retrieveRemoteProject(
          null,
          createProfile(),
          "secret",
        );
        const host = createNativeDesktopHost({
          readTextFile: (_root, relativePath) =>
            nativeHandlers.readTextFile(null, result.directory.path, relativePath),
          readJsonFiles: (_root, relativePath) =>
            nativeHandlers.readJsonFiles(null, result.directory.path, relativePath),
          pathExists: (_root, relativePath) =>
            nativeHandlers.pathExists(null, result.directory.path, relativePath),
          writeTextFileAtomic: (_root, relativePath, content) =>
            nativeHandlers.writeTextFileAtomic(
              null,
              result.directory.path,
              relativePath,
              content,
            ),
        });
        const loaded = await loadEditorSiteModel(host, result.directory);
        const service = createProjectCompositionService({
          host,
          directory: result.directory,
        });
        const saveResult = await service.saveComposition(
          removeSection(loaded.model.page, "publicacoes"),
        );

        expect(result.ok).toBe(true);
        expect(result.directory.path).toContain(
          path.join("workspaces", "lab-fon", "current"),
        );
        expect(loaded.ok).toBe(true);
        expect(loaded.model.site.hero.title).toBe("Hero remoto");
        expect(saveResult.ok).toBe(true);
      });
    } finally {
      await layout.cleanup();
    }
  });

  it("rejects incomplete source bundles", async () => {
    const layout = await createRemoteLayout({ source: "incomplete" });
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("REMOTE_PROJECT_INCOMPLETE");
    } finally {
      await layout.cleanup();
    }
  });

  it("rejects malformed JSON after retrieval", async () => {
    const layout = await createRemoteLayout({ source: "malformed" });
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("REMOTE_PROJECT_MALFORMED");
    } finally {
      await layout.cleanup();
    }
  });

  it("does not replace a previous valid workspace after failed retrieval", async () => {
    const layout = await createRemoteLayout({ source: "incomplete" });
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      await withNativeServices(client, async (userDataPath) => {
        const activeWorkspace = path.join(
          userDataPath,
          "workspaces",
          "lab-fon",
          "current",
        );
        await fs.mkdir(activeWorkspace, { recursive: true });
        await fs.writeFile(path.join(activeWorkspace, "sentinel.txt"), "keep");

        const result = await nativeHandlers.retrieveRemoteProject(
          null,
          createProfile(),
          "secret",
        );

        expect(result.ok).toBe(false);
        await expect(
          fs.readFile(path.join(activeWorkspace, "sentinel.txt"), "utf8"),
        ).resolves.toBe("keep");
      });
    } finally {
      await layout.cleanup();
    }
  });

  it("initializes an empty protected source directory with the editable bundle", async () => {
    const layout = await createRemoteLayout({ source: "empty" });
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.initializeRemoteProjectSource(
          null,
          repoRoot,
          createProfile(),
          "secret",
        ),
      );

      expect(result.ok).toBe(true);
      expect(result.code).toBe("REMOTE_PROJECT_SOURCE_INITIALIZED");
      expect(client.calls.map((call) => call[0])).toContain("uploadFrom");
      await expect(
        fs.access(path.join(layout.remoteRoot, "source", "content", "page.json")),
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(layout.remoteRoot, "source", ".htaccess")),
      ).resolves.toBeUndefined();
    } finally {
      await layout.cleanup();
    }
  });

  it("does not initialize a source directory containing unexpected files", async () => {
    const layout = await createRemoteLayout({ source: "empty" });
    const client = createFilesystemFtpClient(layout.remoteRoot);
    await fs.writeFile(
      path.join(layout.remoteRoot, "source", "unexpected.txt"),
      "stop",
      "utf8",
    );

    try {
      const result = await withNativeServices(client, () =>
        nativeHandlers.initializeRemoteProjectSource(
          null,
          repoRoot,
          createProfile(),
          "secret",
        ),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("REMOTE_PROJECT_SOURCE_NOT_EMPTY");
      expect(client.calls.map((call) => call[0])).not.toContain("uploadFrom");
    } finally {
      await layout.cleanup();
    }
  });

  it("initializes only /source with the existing filtered bundle and strict TLS", async () => {
    const layout = await createRemoteLayout({ source: "empty" });
    const client = createFilesystemFtpClient(layout.remoteRoot);
    try {
      const result = await withNativeServices(client, () => nativeHandlers.initializeRemoteProjectSource(null, repoRoot, createProfile({ remoteSourcePath: "/source" }), "secret"));
      expect(result.code).toBe("REMOTE_PROJECT_SOURCE_INITIALIZED");
      const paths = client.calls.filter(([operation]) => operation === "uploadFrom").map(([, target]) => target);
      const bundle = await nativeHandlers.listEditableProjectBundleFiles(repoRoot);
      expect(paths.sort()).toEqual(bundle.map(file => `/source/${file.relativePath}`).sort());
      expect(paths.some(target => /\/(node_modules|\.git|dist|tests|release)\//.test(target))).toBe(false);
      expect(client.calls[0][1].secure).toBe(true);
      expect(client.calls[0][1].secureOptions).toBeUndefined();
      expect(client.ftp.verbose).toBe(false);
      expect(await fs.readFile(path.join(layout.remoteRoot, "source/.htaccess"), "utf8")).toBe("Require all denied\n");
      expect(await fs.readFile(path.join(layout.remoteRoot, "index.html"), "utf8")).toBe("<html></html>");
    } finally { await layout.cleanup(); }
  });

  it.each(["missing", "metadata directory", "invalid local"])("performs no write for %s initialization", async mode => {
    const layout = await createRemoteLayout({ source: mode === "missing" ? "missing" : "empty" });
    if (mode === "metadata directory") {
      await fs.mkdir(path.join(layout.remoteRoot, "source/.ftpquota"));
    }
    const client = createFilesystemFtpClient(layout.remoteRoot);
    try {
      const result = await withNativeServices(client, () => nativeHandlers.initializeRemoteProjectSource(null, mode === "invalid local" ? layout.remoteRoot : repoRoot, createProfile(), "secret"));
      expect(result.ok).toBe(false);
      expect(client.calls.some(([operation]) => ["uploadFrom", "ensureDir", "remove"].includes(operation))).toBe(false);
    } finally { await layout.cleanup(); }
  });

  it("reports a partial upload without rollback or automatic retry", async () => {
    const layout = await createRemoteLayout({ source: "empty" });
    const client = createFilesystemFtpClient(layout.remoteRoot);
    const upload = client.uploadFrom.bind(client); let count = 0;
    client.uploadFrom = async (...args) => {
      if (++count === 2) throw Object.assign(new Error("Connection lost"), { code: "ECONNRESET" });
      await upload(...args);
    };
    try {
      const result = await withNativeServices(client, () => nativeHandlers.initializeRemoteProjectSource(null, repoRoot, createProfile(), "secret"));
      expect(result).toMatchObject({ ok: false, remoteState: "possibly_partial" });
      expect(count).toBe(2);
      expect(client.calls.filter(([operation]) => operation === "uploadFrom")).toHaveLength(1);
      expect(client.calls.some(([operation]) => operation === "remove")).toBe(false);
    } finally { await layout.cleanup(); }
  });

  it.each([false, true])("synchronizes only explicit deletions and rejects changed remote records (conflict=%s)", async (conflict) => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);
    try {
      await withNativeServices(client, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        const original = { nome: "Pessoa Egressa", categoria: "egressos" };
        await saveContentRecord(null, retrieved.directory.path, "equipe", "egressa.json", original, null);
        const remoteFile = path.join(layout.remoteRoot, "source/content/equipe/egressa.json");
        if (conflict) await writeJson(remoteFile, { ...original, nome: "Alterado por outro editor" });
        const update = await nativeHandlers.updateRemoteProjectSource(null, retrieved.directory.path, createProfile(), "secret");
        expect(update.ok).toBe(!conflict);
        if (conflict) {
          expect(client.calls.some(([name]) => name === "uploadFrom" || name === "remove")).toBe(false);
          expect(await fs.readFile(remoteFile, "utf8")).toContain("Alterado por outro editor");
        } else {
          expect(client.calls.filter(([name]) => name === "remove")).toEqual([["remove", "/source/content/equipe/egressa.json"]]);
          const fresh = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
          expect(await nativeHandlers.pathExists(null, fresh.directory.path, "content/equipe/egressa.json")).toBe(false);
        }
        expect(await fs.readFile(path.join(layout.remoteRoot, "index.html"), "utf8")).toBe("<html></html>");
      });
    } finally { await layout.cleanup(); }
  });

  it("preserves static assets through source update and fresh retrieval", async () => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);
    try {
      await withNativeServices(client, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        const imagePath = path.join(retrieved.directory.path, "public/assets/images/logo.png");
        await fs.mkdir(path.dirname(imagePath), { recursive: true });
        await fs.writeFile(imagePath, Buffer.from([137, 80, 78, 71]));
        const sitePath = path.join(retrieved.directory.path, "content/site.json");
        const site = JSON.parse(await fs.readFile(sitePath, "utf8"));
        site.logo = "assets/images/logo.png";
        await writeJson(sitePath, site);
        await writeJson(path.join(retrieved.directory.path, "public/publication_references.json"), { references: [] });
        await fs.writeFile(path.join(retrieved.directory.path, "public/.htaccess"), "do not upload hosting configuration");
        const update = await nativeHandlers.updateRemoteProjectSource(null, retrieved.directory.path, createProfile(), "secret");
        expect(update.ok).toBe(true);
        const fresh = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        expect(await fs.readFile(path.join(fresh.directory.path, "public/assets/images/logo.png"))).toEqual(Buffer.from([137, 80, 78, 71]));
        expect(await nativeHandlers.pathExists(null, fresh.directory.path, "public/.htaccess")).toBe(false);
      });
    } finally { await layout.cleanup(); }
  });

  it("updates only the configured source directory during a source round trip", async () => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);

    try {
      await withNativeServices(client, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(
          null,
          createProfile(),
          "secret",
        );
        const sitePath = path.join(retrieved.directory.path, "content", "site.json");
        const site = JSON.parse(await fs.readFile(sitePath, "utf8"));
        site.hero.title = "Hero atualizado no workspace";
        await fs.writeFile(sitePath, `${JSON.stringify(site, null, 2)}\n`, "utf8");

        const update = await nativeHandlers.updateRemoteProjectSource(
          null,
          retrieved.directory.path,
          createProfile(),
          "secret",
        );
        const remoteSite = JSON.parse(
          await fs.readFile(
            path.join(layout.remoteRoot, "source", "content", "site.json"),
            "utf8",
          ),
        );

        expect(update.ok).toBe(true);
        expect(update.code).toBe("REMOTE_PROJECT_SOURCE_UPDATED");
        expect(remoteSite.hero.title).toBe("Hero atualizado no workspace");
        expect(client.calls.map((call) => call[0])).not.toContain("remove");
        expect(client.calls.map((call) => call[0])).not.toContain("delete");
        expect(client.calls.map((call) => call[0])).not.toContain("publishGeneratedSite");
      });
    } finally {
      await layout.cleanup();
    }
  });
});

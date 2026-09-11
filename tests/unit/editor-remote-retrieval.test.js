import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createNativeDesktopHost } from "../../src/js/editor/desktop-host.js";
import { createPublishController } from "../../src/js/editor/publish-service.js";
import { loadEditorSiteModel } from "../../src/js/editor/project-loader.js";
import { createProjectCompositionService } from "../../src/js/editor/composition-service.js";
import { removeSection } from "../../src/js/editor/composition-commands.js";

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");
const { saveContentRecord } = require("../../desktop/content-store.cjs");
const repoRoot = process.cwd();

function createProfile(overrides = {}) {
  return {
    host: "localhost",
    port: 21,
    username: "editor",
    remoteSourcePath: "/labfon-source",
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
    const sourceRoot = path.join(remoteRoot, "labfon-source");
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

function createFilesystemFtpClient(remoteRoot) {
  const calls = [];
  const toLocal = (remotePath) =>
    path.join(remoteRoot, path.posix.normalize(remotePath).replace(/^\/+/, ""));

  return {
    calls,
    ftp: {},
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
      return entries.map((entry) => ({ name: entry.name }));
    },
    async downloadTo(localPath, remotePath) {
      calls.push(["downloadTo", remotePath]);
      if (typeof localPath !== "string") {
        localPath.end(await fs.readFile(toLocal(remotePath)));
        return;
      }
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.copyFile(toLocal(remotePath), localPath);
    },
    async downloadToDir(localPath, remotePath) {
      calls.push(["downloadToDir", remotePath]);
      await fs.cp(toLocal(remotePath), localPath, { recursive: true });
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
    close() {
      calls.push(["close"]);
    },
  };
}

async function withNativeServices(client, callback) {
  const userDataPath = path.join(
    repoRoot,
    "tmp",
    `retrieval-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fs.mkdir(userDataPath, { recursive: true });
  nativeHandlers.configureAppServices({
    app: { getPath: () => userDataPath },
    safeStorage: createFakeSafeStorage(),
    createFtpClient: () => client,
  });

  try {
    return await callback(userDataPath);
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

  it("retrieves a valid configurable remote source into an app workspace", async () => {
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
        fs.access(path.join(layout.remoteRoot, "labfon-source", "content", "page.json")),
      ).resolves.toBeUndefined();
      await expect(
        fs.access(path.join(layout.remoteRoot, "labfon-source", ".htaccess")),
      ).resolves.toBeUndefined();
    } finally {
      await layout.cleanup();
    }
  });

  it("does not initialize a source directory containing unexpected files", async () => {
    const layout = await createRemoteLayout({ source: "empty" });
    const client = createFilesystemFtpClient(layout.remoteRoot);
    await fs.writeFile(
      path.join(layout.remoteRoot, "labfon-source", "unexpected.txt"),
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

  it.each([false, true])("synchronizes only explicit deletions and rejects changed remote records (conflict=%s)", async (conflict) => {
    const layout = await createRemoteLayout();
    const client = createFilesystemFtpClient(layout.remoteRoot);
    try {
      await withNativeServices(client, async () => {
        const retrieved = await nativeHandlers.retrieveRemoteProject(null, createProfile(), "secret");
        const original = { nome: "Pessoa Egressa", categoria: "egressos" };
        await saveContentRecord(null, retrieved.directory.path, "equipe", "egressa.json", original, null);
        const remoteFile = path.join(layout.remoteRoot, "labfon-source/content/equipe/egressa.json");
        if (conflict) await writeJson(remoteFile, { ...original, nome: "Alterado por outro editor" });
        const update = await nativeHandlers.updateRemoteProjectSource(null, retrieved.directory.path, createProfile(), "secret");
        expect(update.ok).toBe(!conflict);
        if (conflict) {
          expect(client.calls.some(([name]) => name === "uploadFrom" || name === "remove")).toBe(false);
          expect(await fs.readFile(remoteFile, "utf8")).toContain("Alterado por outro editor");
        } else {
          expect(client.calls.filter(([name]) => name === "remove")).toEqual([["remove", "/labfon-source/content/equipe/egressa.json"]]);
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
            path.join(layout.remoteRoot, "labfon-source", "content", "site.json"),
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

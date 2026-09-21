import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import { createPublishController } from "../../src/js/editor/publish-service.js";

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");
const repoRoot = process.cwd();

function createProfile(overrides = {}) {
  return {
    host: "localhost",
    port: 21,
    username: "editor",
    remoteSourcePath: "/source",
    remotePublishPath: "/",
    secure: false,
    passiveMode: true,
    hasPassword: true,
    ...overrides,
  };
}

function createState(overrides = {}) {
  return {
    openedProject: {
      status: "valid",
      path: "C:/lab-fon-ufrj",
    },
    compositionDirty: false,
    build: {
      status: "success",
    },
    publish: {
      status: "ready",
      profile: createProfile(),
    },
    ...overrides,
  };
}

async function createDisposableProject() {
  const tempRoot = path.join(
    repoRoot,
    "tmp",
    `labfon-publication-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  await fs.mkdir(tempRoot, { recursive: true });
  await Promise.all(
    ["src", "scripts", "public"].map((directory) =>
      fs.cp(path.join(repoRoot, directory), path.join(tempRoot, directory), {
        recursive: true,
      }),
    ),
  );
  await Promise.all(
    ["index.html", "editor.html", "vite.config.js"].map((fileName) =>
      fs.copyFile(path.join(repoRoot, fileName), path.join(tempRoot, fileName)),
    ),
  );
  await fs.writeFile(
    path.join(tempRoot, "package.json"),
    JSON.stringify(
      {
        type: "module",
        scripts: {
          prebuild: "node scripts/build-data.js",
          build: "vite build",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeDisposableContent(tempRoot);

  return {
    path: tempRoot,
    async cleanup() {
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeDisposableContent(rootPath) {
  await fs.rm(path.join(rootPath, "content"), { recursive: true, force: true });
  await writeJson(path.join(rootPath, "content", "site.json"), {
    hero: { title: "Lab-FON" },
    sobre: { title: "Sobre", paragraphs: ["Projeto descartável."] },
    footer: { sections: [], coordination: { lab: [], extensionProject: [] } },
  });
  await writeJson(path.join(rootPath, "content", "page.json"), {
    kind: "single-page",
    sections: [
      { id: "sobre", type: "sobre", enabled: true, order: 1 },
      {
        id: "publicacoes",
        type: "publicacoes",
        enabled: false,
        order: 2,
        navigation: { visible: true, label: "Publicações" },
      },
      {
        id: "extensao",
        type: "extension",
        enabled: true,
        order: 3,
        navigation: { visible: true, label: "Extensão" },
      },
    ],
  });
  await writeJson(path.join(rootPath, "content", "equipe", "egressa.json"), {
    nome: "Pessoa Egressa",
    categoria: "egressos",
  });
  await writeJson(path.join(rootPath, "content", "linhas", "linha.json"), {
    id: "linha",
    nome: "Prosódia",
    descricao: "Linha de pesquisa.",
    ordem: 1,
  });
  await writeJson(path.join(rootPath, "content", "parcerias", "capes.json"), {
    nome: "CAPES",
  });
  await writeJson(
    path.join(rootPath, "content", "publicacoes", "publicacao.json"),
    { title: "Publicação preservada", year: 2024 },
  );
  await writeJson(path.join(rootPath, "content", "extensao.json"), {
    projects: [
      {
        id: "provale-em-extensao",
        title: "PROVALE em Extensão",
        projectType: "Projeto de Extensão",
      },
    ],
  });
}

function createFakeSafeStorage() {
  return {
    isEncryptionAvailable() {
      return true;
    },
    encryptString(value) {
      return Buffer.from(value, "utf8");
    },
    decryptString(value) {
      return value.toString("utf8");
    },
  };
}

function createFilesystemFtpClient(remoteRoot, options = {}) {
  const calls = [];
  let uploadedCount = 0;

  async function toLocal(remotePath) {
    const normalized = path.posix.normalize(remotePath).replace(/^\/+/, "");
    return path.join(remoteRoot, normalized);
  }

  return {
    calls,
    ftp: {},
    async access() {
      calls.push(["access"]);
      if (options.failAccess) throw new Error(options.failAccess);
    },
    async cd(remotePath) {
      calls.push(["cd", remotePath]);
      if (options.failCd) throw new Error(options.failCd);
      await fs.mkdir(await toLocal(remotePath), { recursive: true });
    },
    async ensureDir(remotePath) {
      calls.push(["ensureDir", remotePath]);
      await fs.mkdir(await toLocal(remotePath), { recursive: true });
    },
    async uploadFrom(localPath, remotePath) {
      calls.push(["uploadFrom", remotePath]);
      uploadedCount += 1;
      if (options.failUploadAt === uploadedCount) {
        throw new Error("Simulated upload interruption");
      }
      const targetPath = await toLocal(remotePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(localPath, targetPath);
      if (options.corruptIndex && remotePath.endsWith("/index.html")) {
        await fs.writeFile(targetPath, "corrupt", "utf8");
      }
    },
    async size(remotePath) {
      calls.push(["size", remotePath]);
      if (options.failSize) throw new Error(options.failSize);
      const stats = await fs.stat(await toLocal(remotePath));
      return stats.size;
    },
    async list(remotePath = "/site") {
      calls.push(["list", remotePath]);
      const localPath = await toLocal(remotePath);
      const entries = await fs.readdir(localPath, { withFileTypes: true });
      return Promise.all(
        entries.map(async (entry) => ({
          name: entry.name,
          size: entry.isFile()
            ? (await fs.stat(path.join(localPath, entry.name))).size
            : 0,
        })),
      );
    },
    close() {
      calls.push(["close"]);
    },
  };
}

async function withNativePublicationClient(client, callback) {
  const userDataPath = path.join(
    repoRoot,
    "tmp",
    `labfon-publication-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

describe("editor safe FTP publication", () => {
  it("blocks stale builds before native publication starts", async () => {
    let called = false;
    const controller = createPublishController({
      host: createMemoryDesktopHost(
        {},
        {
          publishGeneratedSite: async () => {
            called = true;
          },
        },
      ),
      getState: () => createState({ build: { status: "idle" } }),
    });

    const result = await controller.publish(createProfile(), "secret");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("PUBLISH_BUILD_STALE");
    expect(called).toBe(false);
  });

  it("reports invalid local build without opening FTP mutation", async () => {
    await fs.mkdir(path.join(repoRoot, "tmp"), { recursive: true });
    const project = await fs.mkdtemp(path.join(repoRoot, "tmp", "bad-dist-"));
    await fs.writeFile(path.join(project, "package.json"), "{}", "utf8");
    const client = createFilesystemFtpClient(await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-")));

    try {
      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(null, project, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("PUBLISH_LOCAL_BUILD_INVALID");
      expect(client.calls).toEqual([]);
    } finally {
      await fs.rm(project, { recursive: true, force: true });
    }
  });

  it("publishes a disposable Publicações to Extensão build to a local FTP target", async () => {
    const project = await createDisposableProject();
    const remoteRoot = await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-"));
    const client = createFilesystemFtpClient(remoteRoot);

    try {
      const build = await nativeHandlers.runProjectBuild(null, project.path);
      expect(build.ok).toBe(true);

      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(
          null,
          project.path,
          createProfile(),
          "secret",
        ),
      );
      const remoteData = JSON.parse(
        await fs.readFile(path.join(remoteRoot, "data.json"), "utf8"),
      );
      const publicacoes = remoteData.page.sections.find(
        (section) => section.type === "publicacoes",
      );
      const extensao = remoteData.page.sections.find(
        (section) => section.type === "extension",
      );
      const uploadCalls = client.calls.filter((call) => call[0] === "uploadFrom");

      expect(result.ok).toBe(true);
      expect(result.manifest.fileCount).toBeGreaterThan(2);
      expect(result.manifest.uploadedCount).toBe(result.manifest.fileCount);
      expect(await fs.stat(path.join(remoteRoot, "index.html"))).toBeTruthy();
      expect(await fs.stat(path.join(remoteRoot, "data.json"))).toBeTruthy();
      expect(publicacoes.enabled).toBe(false);
      expect(extensao.enabled).toBe(true);
      expect(remoteData.extensao.projects[0].title).toBe("PROVALE em Extensão");
      expect(uploadCalls.at(-1)[1]).toBe("/index.html");
      expect(client.calls.at(-1)).toEqual(["close"]);
    } finally {
      await project.cleanup();
      await fs.rm(remoteRoot, { recursive: true, force: true });
    }
  }, 60000);

  it("reports authentication failure and closes FTP", async () => {
    const project = await createDisposableProject();
    const remoteRoot = await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-"));
    const client = createFilesystemFtpClient(remoteRoot, {
      failAccess: "530 Login incorrect",
    });

    try {
      await nativeHandlers.runProjectBuild(null, project.path);
      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(null, project.path, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.stage).toBe("failed_before_mutation");
      expect(client.calls.at(-1)).toEqual(["close"]);
    } finally {
      await project.cleanup();
      await fs.rm(remoteRoot, { recursive: true, force: true });
    }
  }, 60000);

  it("reports unavailable remote destination and closes FTP", async () => {
    const project = await createDisposableProject();
    const remoteRoot = await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-"));
    const client = createFilesystemFtpClient(remoteRoot, {
      failCd: "550 No such directory",
    });

    try {
      await nativeHandlers.runProjectBuild(null, project.path);
      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(null, project.path, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.stage).toBe("failed_before_mutation");
      expect(client.calls.at(-1)).toEqual(["close"]);
    } finally {
      await project.cleanup();
      await fs.rm(remoteRoot, { recursive: true, force: true });
    }
  }, 60000);

  it("reports transfer failure without reporting success", async () => {
    const project = await createDisposableProject();
    const remoteRoot = await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-"));
    const client = createFilesystemFtpClient(remoteRoot, { failUploadAt: 2 });

    try {
      await nativeHandlers.runProjectBuild(null, project.path);
      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(null, project.path, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("PUBLISH_TRANSFER_FAILED");
      expect(result.stage).toBe("failed_during_transfer");
      expect(result.manifest.uploadedCount).toBeGreaterThan(0);
      expect(client.calls.at(-1)).toEqual(["close"]);
    } finally {
      await project.cleanup();
      await fs.rm(remoteRoot, { recursive: true, force: true });
    }
  }, 60000);

  it("reports verification failure after transfer", async () => {
    const project = await createDisposableProject();
    const remoteRoot = await fs.mkdtemp(path.join(repoRoot, "tmp", "remote-"));
    const client = createFilesystemFtpClient(remoteRoot, { corruptIndex: true });

    try {
      await nativeHandlers.runProjectBuild(null, project.path);
      const result = await withNativePublicationClient(client, () =>
        nativeHandlers.publishGeneratedSite(null, project.path, createProfile(), "secret"),
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("PUBLISH_VERIFICATION_FAILED");
      expect(result.stage).toBe("failed_during_transfer");
      expect(client.calls.at(-1)).toEqual(["close"]);
    } finally {
      await project.cleanup();
      await fs.rm(remoteRoot, { recursive: true, force: true });
    }
  }, 60000);
});

import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import {
  createPublishController,
  validatePublishProfile,
} from "../../src/js/editor/publish-service.js";

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");

function createState(overrides = {}) {
  return {
    openedProject: {
      status: "valid",
      path: "C:/lab-fon-ufrj",
    },
    build: {
      status: "idle",
    },
    ...overrides,
  };
}

function createUnopenedState(overrides = {}) {
  return {
    openedProject: null,
    build: {
      status: "idle",
    },
    ...overrides,
  };
}

function createProfile(overrides = {}) {
  return {
    host: "ftp.example.edu",
    port: 21,
    username: "editor",
    remoteSourcePath: "/labfon-source",
    remotePublishPath: "/public_html/labfonac",
    secure: false,
    passiveMode: true,
    hasPassword: false,
    ...overrides,
  };
}

function createFakeSafeStorage() {
  return {
    isEncryptionAvailable() {
      return true;
    },
    encryptString(value) {
      return Buffer.from(value, "utf8").toString("base64");
    },
    decryptString(value) {
      return Buffer.from(value.toString(), "base64").toString("utf8");
    },
  };
}

function createFakeFtpClient({
  failAccess,
  failCd,
  failSecondCd,
  failList,
  entries = [],
} = {}) {
  const calls = [];
  let cdCount = 0;

  return {
    calls,
    ftp: {},
    async access(config) {
      calls.push(["access", config]);
      if (failAccess) throw new Error(failAccess);
    },
    async cd(remotePath) {
      cdCount += 1;
      calls.push(["cd", remotePath]);
      if (failCd) throw new Error(failCd);
      if (failSecondCd && cdCount === 2) throw new Error(failSecondCd);
    },
    async list() {
      calls.push(["list"]);
      if (failList) throw new Error(failList);
      return entries;
    },
    close() {
      calls.push(["close"]);
    },
  };
}

async function withNativeServices({ client } = {}, callback) {
  const userDataPath = await fs.mkdtemp(
    path.join(os.tmpdir(), "labfon-publish-"),
  );

  nativeHandlers.configureAppServices({
    app: {
      getPath() {
        return userDataPath;
      },
    },
    safeStorage: createFakeSafeStorage(),
    createFtpClient: () => client || createFakeFtpClient(),
  });

  try {
    return await callback(userDataPath);
  } finally {
    await fs.rm(userDataPath, { recursive: true, force: true });
    nativeHandlers.configureAppServices({
      app: null,
      safeStorage: null,
      createFtpClient: null,
    });
  }
}

describe("editor publish workflow", () => {
  it("validates publish profile fields", () => {
    const validation = validatePublishProfile(createProfile());

    expect(validation.valid).toBe(true);
    expect(validation.profile.remoteSourcePath).toBe("/labfon-source");
    expect(validation.profile.remotePublishPath).toBe("/public_html/labfonac");
  });

  it("accepts slash as publication path when source path is distinct", () => {
    const validation = validatePublishProfile(
      createProfile({ remotePublishPath: "/" }),
    );

    expect(validation.valid).toBe(true);
    expect(validation.profile.remotePublishPath).toBe("/");
  });

  it("requires source and publication paths to be distinct", () => {
    const validation = validatePublishProfile(
      createProfile({
        remoteSourcePath: "/",
        remotePublishPath: "/",
      }),
    );

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.map((item) => item.code)).toContain(
      "PUBLISH_REMOTE_PATHS_NOT_DISTINCT",
    );
  });

  it("reports missing host, username, and source path diagnostics", () => {
    const validation = validatePublishProfile({
      host: "",
      username: "",
      remoteSourcePath: "",
      remotePublishPath: "/",
    });

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.map((item) => item.code)).toEqual([
      "PUBLISH_HOST_MISSING",
      "PUBLISH_USERNAME_MISSING",
      "PUBLISH_REMOTE_SOURCE_PATH_MISSING",
    ]);
  });

  it("stores credentials outside project content and not in the profile JSON", async () => {
    await withNativeServices({}, async (userDataPath) => {
      const result = await nativeHandlers.savePublishProfile(
        null,
        createProfile(),
        "secret-password",
      );
      const profileText = await fs.readFile(
        path.join(userDataPath, "publish", "publish-profile.json"),
        "utf8",
      );

      expect(result.ok).toBe(true);
      expect(profileText).not.toContain("secret-password");
      expect(profileText).not.toContain("password");
      await expect(
        fs.access(path.join(process.cwd(), "content", "publish-profile.json")),
      ).rejects.toThrow();
    });
  });

  it("reports successful connection-test state through the controller", async () => {
    const host = createMemoryDesktopHost(
      {},
      {
        testFtpConnection: async () => ({
          ok: true,
          code: "FTP_READY",
          message: "Connection successful.",
          summary: {
            remotePublishPath: "/public_html/labfonac",
            remoteSourcePath: "/labfon-source",
            publishFileCount: 2,
            sourceFileCount: 1,
            indexHtmlPresent: true,
            sourceReady: true,
          },
        }),
      },
    );
    const controller = createPublishController({
      host,
      getState: () => createState(),
    });

    const result = await controller.testConnection(
      createProfile({ hasPassword: true }),
      "",
    );

    expect(result.ok).toBe(true);
    expect(result.summary.indexHtmlPresent).toBe(true);
  });

  it("allows read-only connection testing without an opened project", async () => {
    const host = createMemoryDesktopHost(
      {},
      {
        testFtpConnection: async () => ({
          ok: true,
          code: "FTP_READY",
          message: "Connection successful.",
          summary: {
            remotePath: "/public_html/labfonac",
            fileCount: 2,
            indexHtmlPresent: true,
          },
        }),
      },
    );
    const controller = createPublishController({
      host,
      getState: () => createUnopenedState(),
    });

    const result = await controller.testConnection(
      createProfile({ hasPassword: true }),
      "",
    );

    expect(result.ok).toBe(true);
  });

  it("still blocks publication without an opened valid project", async () => {
    let called = false;
    const host = createMemoryDesktopHost(
      {},
      {
        publishGeneratedSite: async () => {
          called = true;
        },
      },
    );
    const controller = createPublishController({
      host,
      getState: () => createUnopenedState(),
    });

    const result = await controller.publish(
      createProfile({ hasPassword: true }),
      "",
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("PUBLISH_PROJECT_INVALID");
    expect(called).toBe(false);
  });

  it("classifies authentication failure", async () => {
    const client = createFakeFtpClient({ failAccess: "530 Login incorrect" });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.testFtpConnection(null, createProfile(), "wrong"),
    );

    expect(result.code).toBe("FTP_AUTHENTICATION_FAILED");
    expect(client.calls.at(-1)).toEqual(["close"]);
  });

  it("classifies DNS resolution failure (ENOTFOUND) distinctly from TCP failure", () => {
    const dnsResult = nativeHandlers.classifyFtpError(
      new Error("getaddrinfo ENOTFOUND ftp.example.edu"),
    );
    expect(dnsResult.code).toBe("FTP_HOST_NOT_FOUND");

    const tcpResult = nativeHandlers.classifyFtpError(
      new Error("connect ECONNREFUSED 10.0.0.1:2100"),
    );
    expect(tcpResult.code).toBe("FTP_UNREACHABLE");
  });

  it("classifies TLS negotiation failures distinctly", () => {
    const result = nativeHandlers.classifyFtpError(
      new Error("TLS certificate negotiation failed"),
    );

    expect(result.code).toBe("FTP_TLS_FAILED");
  });

  it("classifies invalid remote destination", async () => {
    const client = createFakeFtpClient({ failCd: "550 No such directory" });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.testFtpConnection(null, createProfile(), "secret"),
    );

    expect(result.code).toBe("FTP_REMOTE_PATH_NOT_FOUND");
    expect(client.calls.at(-1)).toEqual(["close"]);
  });

  it("reports missing editable source as not initialized after publication root succeeds", async () => {
    const client = createFakeFtpClient({
      failSecondCd: "550 No such directory",
      entries: [{ name: "index.html" }],
    });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.testFtpConnection(null, createProfile(), "secret"),
    );

    expect(result.ok).toBe(true);
    expect(result.code).toBe("REMOTE_PROJECT_NOT_INITIALIZED");
    expect(result.summary.indexHtmlPresent).toBe(true);
    expect(result.summary.sourceReady).toBe(false);
    expect(client.calls.at(-1)).toEqual(["close"]);
  });

  it("returns a successful read-only remote directory listing summary", async () => {
    const client = createFakeFtpClient({
      entries: [{ name: "index.html" }, { name: "data.json" }],
    });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.testFtpConnection(null, createProfile(), "secret"),
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toEqual({
      remotePublishPath: "/public_html/labfonac",
      remoteSourcePath: "/labfon-source",
      publishFileCount: 2,
      sourceFileCount: 2,
      indexHtmlPresent: true,
      sourceReady: true,
    });
    expect(client.calls.map((call) => call[0])).toEqual([
      "access",
      "cd",
      "list",
      "cd",
      "list",
      "close",
    ]);
  });

  it("does not expose generic remote mutation APIs", () => {
    const host = createMemoryDesktopHost();

    expect(host.upload).toBeUndefined();
    expect(host.delete).toBeUndefined();
    expect(host.rename).toBeUndefined();
    expect(host.mkdir).toBeUndefined();
    expect(host.ftpCommand).toBeUndefined();
    expect(host.testFtpConnection).toEqual(expect.any(Function));
    expect(host.retrieveRemoteProject).toEqual(expect.any(Function));
    expect(host.publishGeneratedSite).toEqual(expect.any(Function));
  });

  it("connects without requiring remote source or publish paths", async () => {
    const client = createFakeFtpClient({});

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.connectFtp(
        null,
        { host: "ftp.example.edu", username: "editor", port: 21, secure: false },
        "secret",
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.code).toBe("FTP_CONNECTED");
    expect(client.calls.map((call) => call[0])).toEqual(["access", "close"]);
  });

  it("rejects connecting without host or username, independent of remote paths", async () => {
    const client = createFakeFtpClient({});

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.connectFtp(null, { host: "", username: "" }, "secret"),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("PUBLISH_PROFILE_INVALID");
    expect(client.calls).toEqual([]);
  });

  it("classifies connectFtp DNS failure as hostname resolution", async () => {
    const client = createFakeFtpClient({ failAccess: "getaddrinfo ENOTFOUND ftp.example.edu" });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.connectFtp(
        null,
        { host: "ftp.example.edu", username: "editor", port: 21, secure: false },
        "secret",
      ),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("FTP_HOST_NOT_FOUND");
    expect(client.calls.at(-1)).toEqual(["close"]);
  });

  it("lists a remote directory read-only without exposing mutation calls", async () => {
    const client = createFakeFtpClient({
      entries: [
        { name: "assets", isDirectory: true },
        { name: "index.html", isDirectory: false },
      ],
    });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.listRemoteDirectory(
        null,
        { host: "ftp.example.edu", username: "editor", port: 21, secure: false },
        "secret",
        "/",
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.entries).toEqual([
      { name: "assets", type: "directory", size: undefined },
      { name: "index.html", type: "file", size: undefined },
    ]);
    expect(client.calls.map((call) => call[0])).toEqual([
      "access",
      "cd",
      "list",
      "close",
    ]);
    expect(client.upload).toBeUndefined();
    expect(client.remove).toBeUndefined();
  });

  it("navigates into a selected remote subdirectory", async () => {
    const client = createFakeFtpClient({ entries: [] });

    await withNativeServices({ client }, () =>
      nativeHandlers.listRemoteDirectory(
        null,
        { host: "ftp.example.edu", username: "editor", port: 21, secure: false },
        "secret",
        "/labfon-source",
      ),
    );

    expect(client.calls).toContainEqual(["cd", "/labfon-source"]);
  });

  it("classifies missing remote directory during browsing distinctly", async () => {
    const client = createFakeFtpClient({ failCd: "550 No such directory" });

    const result = await withNativeServices({ client }, () =>
      nativeHandlers.listRemoteDirectory(
        null,
        { host: "ftp.example.edu", username: "editor", port: 21, secure: false },
        "secret",
        "/does-not-exist",
      ),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("FTP_REMOTE_PATH_NOT_FOUND");
  });

  it("allows connecting before assigning either remote path role", async () => {
    let receivedProfile = null;
    const controller = createPublishController({
      host: createMemoryDesktopHost(
        {},
        {
          connectFtp: async (profile) => {
            receivedProfile = profile;
            return { ok: true, code: "FTP_CONNECTED", message: "Conectado." };
          },
        },
      ),
      getState: () => createUnopenedState(),
    });

    const result = await controller.connect(
      { host: "ftp.example.edu", username: "editor", hasPassword: true },
      "secret",
    );

    expect(result.ok).toBe(true);
    expect(receivedProfile.remoteSourcePath).toBe("");
    expect(receivedProfile.remotePublishPath).toBe("/");
  });

  it("lists remote directories through the controller before paths are assigned", async () => {
    const controller = createPublishController({
      host: createMemoryDesktopHost(
        {},
        {
          listRemoteDirectory: async (_profile, _password, remotePath) => ({
            ok: true,
            path: remotePath,
            entries: [{ name: "labfon-source", type: "directory" }],
          }),
        },
      ),
      getState: () => createUnopenedState(),
    });

    const result = await controller.listDirectory(
      { host: "ftp.example.edu", username: "editor", hasPassword: true },
      "secret",
      "/",
    );

    expect(result.ok).toBe(true);
    expect(result.entries).toEqual([{ name: "labfon-source", type: "directory" }]);
  });

  it("connection errors do not affect editor project state", async () => {
    const state = createState();
    const controller = createPublishController({
      host: createMemoryDesktopHost(
        {},
        {
          testFtpConnection: async () => ({
            ok: false,
            code: "FTP_UNREACHABLE",
            message: "Não foi possível alcançar o servidor FTP.",
          }),
        },
      ),
      getState: () => state,
    });

    const result = await controller.testConnection(
      createProfile({ hasPassword: true }),
      "",
    );

    expect(result.ok).toBe(false);
    expect(state.openedProject.status).toBe("valid");
    expect(state.build.status).toBe("idle");
  });
});

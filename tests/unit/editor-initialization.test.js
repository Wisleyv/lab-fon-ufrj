import { describe, expect, it, vi } from "vitest";
import { createInitialEditorState } from "../../src/js/editor/state.js";
import { createPublishController, getSourceInitializationReadiness, getSourceUpdateReadiness, getPublicationReadiness, sanitizePublishProfile } from "../../src/js/editor/publish-service.js";
import { initEditorApp } from "../../src/js/editor/bootstrap.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import { createMemoryCompositionService } from "../../src/js/editor/composition-service.js";

const profile = sanitizePublishProfile({ host: "ftp.example.edu", port: 2100, username: "editor", secure: true, hasPassword: true, remoteSourcePath: "/source", remotePublishPath: "/" });
function eligibleState() {
  return { ...createInitialEditorState(), openedProject: { status: "valid", source: "local", path: "C:/candidate" },
    publish: { status: "configured", profile }, remote: { status: "connected", currentPath: "/source", entries: [], connectionProfile: profile, verifiedProfile: profile } };
}

describe("remote initialization readiness", () => {
  it.each([
    ["disconnected", state => { state.remote.status = "idle"; }],
    ["content dirty", state => { state.contentDirty = true; }],
    ["page dirty", state => { state.compositionDirty = true; }],
    ["busy", state => { state.publish.status = "publishing"; }],
    ["invalid project", state => { state.openedProject.status = "invalid"; }],
    ["remote project", state => { state.openedProject.source = "remote-ftp"; }],
    ["nonempty", state => { state.remote.entries = [{ name: "content", type: "directory" }]; }],
    ["metadata directory", state => { state.remote.entries = [{ name: ".htaccess", type: "directory" }]; }],
    ["unlisted source", state => { state.remote.verifiedProfile = null; }],
    ["wrong listing", state => { state.remote.currentPath = "/"; }],
    ["other connection", state => { state.remote.connectionProfile = { ...profile, host: "other.example.edu" }; }],
  ])("rejects %s", (_name, change) => {
    const state = eligibleState(); change(state);
    expect(getSourceInitializationReadiness(state, profile, "").ok).toBe(false);
  });

  it.each([{ secure: false }, { remoteSourcePath: "/other" }, { host: "" }, { username: "changed" }])("rejects unsafe or changed profile %j", override => {
    expect(getSourceInitializationReadiness(eligibleState(), { ...profile, ...override }, "").ok).toBe(false);
  });

  it("allows verified empty/protected source without allowing ordinary update or publication", () => {
    const state = eligibleState();
    state.remote.entries = [{ name: ".htaccess", type: "file" }, { name: ".ftpquota", type: "file" }];
    state.build.status = "success"; state.publish.status = "ready";
    expect(getSourceInitializationReadiness(state, profile, "").ok).toBe(true);
    expect(getSourceUpdateReadiness(state, profile, "").code).toBe("REMOTE_PROJECT_REQUIRED");
    expect(getPublicationReadiness(state).code).toBe("REMOTE_PROJECT_REQUIRED");
    state.openedProject.source = "remote-ftp";
    expect(getSourceInitializationReadiness(state, profile, "").ok).toBe(false);
    expect(getSourceUpdateReadiness(state, profile, "").ok).toBe(true);
    state.build.status = "idle";
    expect(getPublicationReadiness(state).code).toBe("PUBLISH_BUILD_STALE");
  });

  it("controller rechecks readiness, project identity and duplicate calls", async () => {
    let state = eligibleState(); let finish;
    const host = { initializeRemoteProjectSource: vi.fn(() => new Promise(resolve => { finish = resolve; })) };
    const controller = createPublishController({ host, getState: () => state });
    state.contentDirty = true;
    expect((await controller.initializeRemoteProjectSource(state.openedProject, profile, "")).ok).toBe(false);
    state.contentDirty = false;
    expect((await controller.initializeRemoteProjectSource({ path: "C:/other" }, profile, "")).ok).toBe(false);
    const pending = controller.initializeRemoteProjectSource(state.openedProject, profile, "");
    expect((await controller.initializeRemoteProjectSource(state.openedProject, profile, "")).code).toBe("EDITOR_BUSY");
    expect(host.initializeRemoteProjectSource).toHaveBeenCalledExactlyOnceWith(state.openedProject, profile, "");
    finish({ ok: true, code: "REMOTE_PROJECT_SOURCE_INITIALIZED" }); await pending;
  });
});

async function fixture() {
  document.body.innerHTML = '<div id="editor-root"></div>';
  const host = createMemoryDesktopHost({
    "package.json": "{}", "scripts/build-data.js": "", "content/site.json": "{}",
    "content/page.json": JSON.stringify({ kind: "single-page", sections: [{ id: "sobre", type: "sobre", enabled: true, order: 1 }] }),
  });
  host.loadPublishProfile = vi.fn(async () => ({ ok: true, profile }));
  host.connectFtp = vi.fn(async () => ({ ok: true }));
  host.listRemoteDirectory = vi.fn(async (_profile, _password, path) => ({ ok: true, path, entries: path === "/" ? [{ name: "source", type: "directory" }] : [] }));
  host.initializeRemoteProjectSource = vi.fn(async () => ({ ok: true, code: "REMOTE_PROJECT_SOURCE_INITIALIZED" }));
  host.retrieveRemoteProject = vi.fn(async () => ({ ok: true, directory: { path: "C:/fresh", name: "Fresh", provenance: { source: "remote-ftp" } } }));
  host.publishGeneratedSite = vi.fn();
  const app = initEditorApp({ desktopHost: host, compositionService: createMemoryCompositionService() });
  await app.ready;
  await vi.waitFor(() => expect(document.getElementById("editor-publish-host").value).toBe(profile.host));
  app.store.setState({ openedProject: eligibleState().openedProject });
  document.getElementById("editor-connect-ftp").click();
  await vi.waitFor(() => expect(app.store.getState().remote.status).toBe("connected"));
  const open = [...document.querySelectorAll("button")].find(button => button.textContent === "Abrir");
  open.click();
  await vi.waitFor(() => expect(app.store.getState().remote.currentPath).toBe("/source"));
  return { app, host, button: document.getElementById("editor-initialize-remote-source") };
}

describe("initialization UI", () => {
  it("shows explicit destination confirmation; cancellation writes nothing", async () => {
    const { app, host, button } = await fixture();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      expect(button.disabled).toBe(false); button.click();
      const text = confirm.mock.calls[0][0];
      for (const expected of ["C:/candidate", profile.host, "/source/", "projeto editável remoto", "Não publica"]) expect(text).toContain(expected);
      expect(host.initializeRemoteProjectSource).not.toHaveBeenCalled();
      expect(app.store.getState().remote.verifiedProfile).toEqual(profile);
    } finally { app.destroy(); confirm.mockRestore(); }
  });

  it("initializes once, retains local provenance and requires explicit fresh retrieval", async () => {
    const { app, host, button } = await fixture(); let finish;
    host.initializeRemoteProjectSource.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      button.click(); button.click();
      expect(button.disabled).toBe(true);
      expect(document.getElementById("editor-open-remote-project").disabled).toBe(true);
      expect(host.initializeRemoteProjectSource).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ path: "C:/candidate" }), profile, "");
      finish({ ok: true, code: "REMOTE_PROJECT_SOURCE_INITIALIZED" });
      await vi.waitFor(() => expect(app.store.getState().publish.status).toBe("configured"));
      expect(app.store.getState().openedProject.source).toBe("local");
      expect(app.store.getState().remote.verifiedProfile).toBeNull();
      expect(document.getElementById("editor-publish-status").textContent).toContain("Recuperação de /source/ pendente");
      expect(document.getElementById("editor-publish-site").disabled).toBe(true);
      expect(host.retrieveRemoteProject).not.toHaveBeenCalled();
      document.getElementById("editor-open-remote-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject.path).toBe("C:/fresh"));
      expect(app.store.getState().openedProject).toMatchObject({ source: "remote-ftp", status: "valid" });
      expect(document.getElementById("editor-update-remote-source").disabled).toBe(false);
      expect(document.getElementById("editor-publish-site").disabled).toBe(true);
      expect(button.parentElement.hidden).toBe(true);
      expect(host.publishGeneratedSite).not.toHaveBeenCalled();
    } finally { app.destroy(); confirm.mockRestore(); }
  });

  it.each(["failure", "throw", "malformed", "already initialized"])("settles %s without retry or false success", async outcome => {
    const { app, host, button } = await fixture();
    host.initializeRemoteProjectSource.mockImplementation(async () => {
      if (outcome === "throw") throw new Error("Unavailable");
      if (outcome === "malformed") return undefined;
      return { ok: outcome === "already initialized", code: "REMOTE_PROJECT_SOURCE_ALREADY_INITIALIZED", message: "Not initialized by this operation" };
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const original = app.store.getState().openedProject;
    try {
      button.click();
      await vi.waitFor(() => expect(app.store.getState().publish.status).toBe("failed"));
      expect(app.store.getState().openedProject).toBe(original);
      expect(app.store.getState().remote.verifiedProfile).toBeNull();
      expect(button.disabled).toBe(true);
      expect(document.getElementById("editor-publish-site").disabled).toBe(true);
      expect(document.getElementById("editor-publish-status").textContent).toContain("pode haver envio parcial");
      expect(host.initializeRemoteProjectSource).toHaveBeenCalledOnce();
      expect(host.publishGeneratedSite).not.toHaveBeenCalled();
    } finally { app.destroy(); confirm.mockRestore(); }
  });

  it("invalidates initialization after connection settings change", async () => {
    const { app, button } = await fixture();
    try {
      const input = document.getElementById("editor-publish-host");
      input.value = "other.example.edu"; input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(button.disabled).toBe(true);
      expect(app.store.getState().remote.status).toBe("idle");
    } finally { app.destroy(); }
  });
});

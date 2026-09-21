import { describe, expect, it, vi } from "vitest";
import {
  initEditorApp,
  startEditorApp,
} from "../../src/js/editor/bootstrap.js";
import { createMemoryCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost, createBrowserDesktopHost } from "../../src/js/editor/desktop-host.js";

const STORAGE_KEY = "labfon.editor.lastSource";

describe("manual acceptance operation regressions", () => {
  const profile = { host: "ftp.example.edu", port: 21, username: "editor", remoteSourcePath: "/source", remotePublishPath: "/", secure: true, hasPassword: true };

  it("does not enter remote operations for a local-only project, even with a saved ready profile", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const host = createMemoryDesktopHost();
    host.updateRemoteProjectSource = vi.fn();
    host.publishGeneratedSite = vi.fn();
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: host });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", source: "local", path: "C:/fixture" },
        publish: { status: "ready", profile }, build: { status: "success" } });
      for (const id of ["editor-update-remote-source", "editor-publish-site"]) {
        const button = document.getElementById(id);
        expect(button.disabled).toBe(true);
        expect(document.getElementById(`${id}-reason`).textContent).toContain("Projeto local");
        button.click();
      }
      expect(host.updateRemoteProjectSource).not.toHaveBeenCalled();
      expect(host.publishGeneratedSite).not.toHaveBeenCalled();
      expect(app.store.getState().publish.status).toBe("ready");
      expect(document.getElementById("editor-session-project").textContent).toBe("local aberto");
    } finally { app.destroy(); }
  });

  it.each(["success", "failure", "throw", "malformed"])("settles remote source-update state after %s without a build prerequisite", async (outcome) => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const host = createMemoryDesktopHost();
    host.updateRemoteProjectSource = vi.fn(async () => {
      if (outcome === "throw") throw new Error("Simulated failure");
      if (outcome === "malformed") return undefined;
      return { ok: outcome === "success", code: "FIXTURE_RESULT", message: "Fixture result" };
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: host });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", source: "remote-ftp", path: "C:/fixture" },
        publish: { status: "configured", profile }, build: { status: "idle" } });
      document.getElementById("editor-update-remote-source").click();
      expect(app.store.getState().publish.status).toBe("publishing");
      await vi.waitFor(() => expect(app.store.getState().publish.status).toBe(outcome === "success" ? "configured" : "failed"));
      expect(document.getElementById("editor-publish-status").textContent).not.toContain("Atualizando projeto remoto...");
      expect(document.getElementById("editor-update-remote-source").disabled).toBe(false);
      expect(host.updateRemoteProjectSource).toHaveBeenCalledOnce();
    } finally { app.destroy(); confirm.mockRestore(); }
  });
});

async function waitForCondition(predicate) {
  for (let index = 0; index < 20; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function createStorageMock() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

describe("saved local project opening", () => {
  async function fixture(source = { type: "local", path: "C:/saved" }, files = {}) {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const storage = createStorageMock();
    if (source) storage.setItem(STORAGE_KEY, JSON.stringify(source));
    const host = createMemoryDesktopHost({
      "package.json": "{}", "scripts/build-data.js": "",
      "content/site.json": "{}",
      "content/page.json": JSON.stringify({ kind: "single-page", sections: [{ id: "sobre", type: "sobre", enabled: true, order: 1 }] }),
      ...files,
    }, { directory: { path: "C:/browsed", name: "Browsed" } });
    const browse = host.openProjectDirectory.bind(host);
    host.openProjectDirectory = vi.fn(async (savedPath) => savedPath === undefined
      ? browse() : { ok: true, directory: { path: savedPath, name: "Saved" } });
    const read = vi.spyOn(host, "readJson");
    const app = initEditorApp({ storageRef: storage, desktopHost: host, compositionService: createMemoryCompositionService() });
    await app.ready;
    return { app, host, storage, read, button: document.getElementById("editor-open-saved-project") };
  }

  it("reopens the persisted local path through the canonical loader after closing, and retains browsing", async () => {
    const { app, host, storage, read, button } = await fixture();
    try {
      expect(button.parentElement.hidden).toBe(false);
      button.click();
      await vi.waitFor(() => expect(app.store.getState().projectOpening).toBe(false));
      expect(host.openProjectDirectory).toHaveBeenCalledExactlyOnceWith("C:/saved");
      expect(read).toHaveBeenCalledWith(expect.objectContaining({ path: "C:/saved" }), "content/page.json");
      expect(app.store.getState().openedProject).toMatchObject({ path: "C:/saved", status: "valid", source: "local" });
      document.getElementById("editor-close-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject).toBeNull());
      expect(app.store.getState().projectSource).toEqual(JSON.parse(storage.getItem(STORAGE_KEY)));
      expect(document.getElementById("editor-local-path").value).toBe("C:/saved");
      expect(button.disabled).toBe(false);
      button.click();
      await vi.waitFor(() => expect(app.store.getState().openedProject?.path).toBe("C:/saved"));
      document.getElementById("editor-open-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject?.path).toBe("C:/browsed"));
      expect(host.openProjectDirectory).toHaveBeenLastCalledWith(undefined);
      expect(app.store.getState().projectSource.path).toBe("C:/saved");
    } finally { app.destroy(); }
  });

  it.each([null, { type: "local", path: "" }, { type: "ftp", host: "ftp.example.org", remotePath: "/source" }])(
    "does not offer direct local opening for absent/empty/remote origins: %j", async (source) => {
      const { app, host, button } = await fixture(source);
      try {
        expect(button.disabled).toBe(true);
        expect(button.parentElement.hidden).toBe(true);
        button.click();
        expect(host.openProjectDirectory).not.toHaveBeenCalled();
        expect(document.getElementById("editor-open-project").disabled).toBe(false);
      } finally { app.destroy(); }
    },
  );

  it("makes a newly saved path available without implicitly opening it", async () => {
    const { app, host, button } = await fixture(null);
    try {
      document.getElementById("editor-local-path").value = "C:/new-saved";
      document.getElementById("editor-save-source").click();
      expect(button.disabled).toBe(false);
      expect(host.openProjectDirectory).not.toHaveBeenCalled();
      button.click();
      await vi.waitFor(() => expect(app.store.getState().openedProject?.path).toBe("C:/new-saved"));
    } finally { app.destroy(); }
  });

  it("keeps the last saved origin if persisting a replacement fails", async () => {
    const { app, storage } = await fixture();
    try {
      vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
      document.getElementById("editor-local-path").value = "C:/replacement";
      document.getElementById("editor-save-source").click();
      expect(document.getElementById("editor-source-error").textContent).toContain("Não foi possível salvar");
      expect(app.store.getState().projectSource.path).toBe("C:/saved");
      expect(JSON.parse(storage.getItem(STORAGE_KEY)).path).toBe("C:/saved");
    } finally { app.destroy(); }
  });

  it.each(["contentDirty", "compositionDirty", "contentSaving", "imageSelecting", "projectOpening"])(
    "preserves the current project while %s blocks both open actions", async (flag) => {
      const { app, host, button } = await fixture();
      try {
        const current = { path: "C:/current", status: "valid", source: "local" };
        app.store.setState({ openedProject: current, [flag]: true });
        button.click(); document.getElementById("editor-open-project").click();
        expect(button.disabled).toBe(true);
        expect(host.openProjectDirectory).not.toHaveBeenCalled();
        expect(app.store.getState().openedProject).toEqual(current);
        expect(app.store.getState()[flag]).toBe(true);
      } finally { app.destroy(); }
    },
  );

  it("reports inaccessible saved paths and leaves browsing and the current project available", async () => {
    const { app, host, button } = await fixture();
    try {
      const current = { path: "C:/current", status: "valid", source: "local" };
      app.store.setState({ openedProject: current });
      host.openProjectDirectory.mockResolvedValueOnce({ ok: false, message: "Caminho salvo indisponível. Use Escolher outro projeto." });
      button.click();
      await vi.waitFor(() => expect(app.store.getState().projectOpening).toBe(false));
      expect(document.getElementById("editor-source-error").textContent).toContain("Escolher outro projeto");
      expect(app.store.getState().openedProject).toEqual(current);
      expect(document.getElementById("editor-open-project").disabled).toBe(false);
    } finally { app.destroy(); }
  });

  it("rejects an invalid saved project using the existing page validation", async () => {
    const { app, button } = await fixture(undefined, { "content/page.json": "not json" });
    try {
      button.click();
      await vi.waitFor(() => expect(app.store.getState().projectOpening).toBe(false));
      expect(app.store.getState().openedProject.status).toBe("invalid");
      expect(app.store.getState().editorSiteModel).toBeNull();
      expect(app.store.getState().diagnostics.some((item) => item.code === "PROJECT_JSON_MALFORMED")).toBe(true);
      expect(document.getElementById("editor-source-error").textContent).toContain("não é válido");
    } finally { app.destroy(); }
  });

  it("does not substitute a browser picker when asked to open a saved filesystem path", async () => {
    const picker = vi.fn();
    const host = createBrowserDesktopHost({ showDirectoryPicker: picker });
    expect(await host.openProjectDirectory("C:/saved")).toMatchObject({ ok: false, code: "SAVED_PROJECT_DESKTOP_REQUIRED" });
    expect(picker).not.toHaveBeenCalled();
  });
});

describe("Editor Bootstrap (E1-H1)", () => {
  it("publishes a tested destination before entering the busy UI state", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    let finishPublication;
    const publishGeneratedSite = vi.fn(() => new Promise((resolve) => {
      finishPublication = resolve;
    }));
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createMemoryDesktopHost({}, { publishGeneratedSite }),
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      await app.ready;
      app.store.setState({
        openedProject: { status: "valid", path: "C:/project" },
        build: { status: "success" },
        compositionDirty: false,
        contentDirty: false,
        publish: { status: "ready", profile: {
          host: "ftp.example.edu", port: 21, username: "editor",
          remoteSourcePath: "/source", remotePublishPath: "/",
          secure: true, hasPassword: true,
        } },
      });
      const button = document.getElementById("editor-publish-site");
      expect(button.disabled).toBe(false);
      document.getElementById("editor-tab-publish").click();
      button.click();
      expect(publishGeneratedSite).toHaveBeenCalledTimes(1);
      expect(app.store.getState().publish.status).toBe("publishing");
      expect(button.disabled).toBe(true);
      button.click();
      expect(document.getElementById("editor-publish-site-reason").textContent).toContain("Aguarde");
      document.getElementById("editor-tab-connect").click();
      document.getElementById("editor-tab-publish").click();
      expect(document.getElementById("editor-publish-site")).toBe(button);
      expect(app.store.getState().publish.status).toBe("publishing");
      expect(publishGeneratedSite).toHaveBeenCalledTimes(1);
      finishPublication({ ok: true });
      await waitForCondition(() => app.store.getState().publish.status === "success");
      expect(app.store.getState().publish.status).toBe("success");
      expect(document.getElementById("editor-session-publication").textContent).toBe("publicada nesta sessão");
      expect(document.getElementById("editor-session-source").textContent).toBe("estado desconhecido");
    } finally {
      confirm.mockRestore();
      app.destroy();
    }
  });

  it("initializes editor shell with minimal navigation", () => {
    document.body.innerHTML = '<div id="editor-root"></div>';

    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
    });

    expect(document.querySelector(".editor-shell")).toBeTruthy();
    expect(document.querySelector(".editor-title").textContent).toBe("Editor Labfonac");
    const mark = document.querySelector(".editor-brand-mark");
    expect(mark.getAttribute("src")).toContain("assets/images/logo_300x130.png");
    expect(mark.alt).toBe("");
    expect(document.querySelectorAll(".editor-nav-btn").length).toBe(6);
    expect(document.getElementById("editor-project-status")?.textContent).toBe(
      "Nenhum projeto aberto.",
    );

    app.destroy();
  });

  it("keeps default publication feedback out of Conectar and preserves all six status concepts", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({ compositionService: createMemoryCompositionService() });
    try {
      await app.ready;
      const status = document.getElementById("editor-publish-status");
      expect(status.closest('[role="tabpanel"]').id).toBe("editor-tabpanel-publish");
      expect(document.getElementById("editor-publish-diagnostics").textContent).toBe("");
      expect([...document.querySelectorAll("#editor-session-status dt")].map((node) => node.textContent)).toEqual(["Servidor", "Projeto", "Alterações locais", "Projeto remoto", "Prévia", "Publicação"]);
      expect(document.querySelector(".editor-main").children).toHaveLength(6);
      const connect = document.getElementById("editor-tabpanel-connect");
      expect(connect.textContent).not.toContain("Nenhum problema encontrado na composição");
      expect(connect.textContent).not.toContain("Configure o destino de publicação");
      expect(connect.textContent).toContain("Dados de acesso ao servidor FTP.");
      expect(connect.textContent).not.toContain("às cegas");
      const reasons = [...connect.querySelectorAll(".editor-operation-reason:not([hidden])")];
      expect(reasons.filter((node) => node.textContent === "Informe o servidor FTP.")).toHaveLength(1);
      const testButton = document.getElementById("editor-test-ftp-connection");
      expect(document.getElementById(testButton.getAttribute("aria-describedby")).hidden).toBe(false);
      for (const tab of ["review", "publish"]) {
        const text = document.getElementById(`editor-tabpanel-${tab}`).textContent;
        expect(text).toContain("Labfonac");
        expect(text).not.toMatch(/Lab-FON|LabFonAc/);
      }
    } finally { app.destroy(); }
  });

  it("keeps connection errors in Conectar when inspecting another tab", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: createMemoryDesktopHost({}, { testFtpConnection: async () => ({ ok: false, code: "TEST_FAILURE", message: "Falha simulada de conexão." }) }) });
    try {
      await app.ready;
      document.getElementById("editor-publish-host").value = "ftp.example.edu";
      document.getElementById("editor-publish-username").value = "editor";
      const password = document.getElementById("editor-publish-password");
      password.value = "test-password";
      password.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("editor-test-ftp-connection").click();
      await vi.waitFor(() => expect(app.store.getState().publish.status).toBe("error"));
      const status = document.getElementById("editor-publish-status");
      const before = app.store.getState();
      document.getElementById("editor-tab-publish").click();
      expect(status.closest('[role="tabpanel"]').id).toBe("editor-tabpanel-connect");
      expect(status.textContent).toContain("Falha simulada");
      document.getElementById("editor-tab-connect").click();
      expect(status.closest('[role="tabpanel"]').hidden).toBe(false);
      expect(app.store.getState()).toBe(before);
    } finally { app.destroy(); }
  });

  it("keeps six accessible tabs available with roving focus and inert hidden panels", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({ compositionService: createMemoryCompositionService() });
    try {
      await app.ready;
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      expect(tabs.map((tab) => tab.textContent)).toEqual(["Conectar", "Projeto", "Conteúdo", "Página", "Revisar", "Publicar"]);
      const before = app.store.getState();
      for (const tab of tabs) {
        expect(tab.disabled).toBe(false);
        expect(tab.hidden).toBe(false);
        tab.click();
        expect(document.activeElement).toBe(tab);
        expect(tab.getAttribute("aria-selected")).toBe("true");
        expect(tabs.filter((item) => item.tabIndex === 0)).toEqual([tab]);
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
        expect(panel.hidden).toBe(false);
        for (const other of document.querySelectorAll('[role="tabpanel"]')) {
          expect(other.hidden).toBe(other !== panel);
          expect(other.hasAttribute("inert")).toBe(other !== panel);
        }
      }
      const key = (name) => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
      key("ArrowRight"); expect(document.activeElement).toBe(tabs[0]);
      key("ArrowLeft"); expect(document.activeElement).toBe(tabs[5]);
      key("Home"); expect(document.activeElement).toBe(tabs[0]);
      key("End"); expect(document.activeElement).toBe(tabs[5]);
      expect(app.store.getState()).toBe(before);
      expect(document.getElementById("editor-publish-site").disabled).toBe(true);
      expect(document.getElementById("editor-test-ftp-connection").disabled).toBe(true);
      expect(document.getElementById("editor-test-ftp-connection-reason").textContent).toContain("servidor FTP");
    } finally { app.destroy(); }
  });

  it("reports legacy path correction without exposing path controls", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const host = createMemoryDesktopHost({}, {
      loadPublishProfile: async () => ({
        ok: true,
        correctedPaths: true,
        message: "Os destinos remotos foram corrigidos para o projeto Labfonac.",
        profile: {
          host: "ftp.example.edu",
          port: 2100,
          username: "editor",
          remoteSourcePath: "/source",
          remotePublishPath: "/",
          secure: true,
          passiveMode: true,
          hasPassword: true,
        },
      }),
    });
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: host });
    try {
      await app.ready;
      await vi.waitFor(() => expect(app.store.getState().publish?.profile).toBeTruthy());
      expect(document.getElementById("editor-publish-status").textContent).toContain("corrigidos");
      expect(app.store.getState().publish.profile).toMatchObject({
        remoteSourcePath: "/source",
        remotePublishPath: "/",
      });
      expect(document.getElementById("editor-publish-remote-source-path")).toBeNull();
      expect(document.getElementById("editor-publish-remote-path")).toBeNull();
    } finally { app.destroy(); }
  });

  it("keeps local opening available offline only inside the advanced project disclosure", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const host = createMemoryDesktopHost({}, { cancelled: true });
    const open = vi.spyOn(host, "openProjectDirectory");
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: host });
    try {
      await app.ready;
      document.getElementById("editor-tab-project").click();
      const advanced = document.getElementById("editor-project-advanced");
      expect(advanced.open).toBe(false);
      expect(advanced.querySelector("summary").textContent).toBe("Opções avançadas");
      const button = document.getElementById("editor-open-project");
      expect(button.closest("details")).toBe(advanced);
      expect(document.getElementById("editor-open-remote-project").closest("details")).toBeNull();
      advanced.open = true;
      for (let i = 0; i < 3; i++) {
        document.getElementById("editor-tab-connect").click();
        document.getElementById("editor-tab-project").click();
      }
      expect(open).not.toHaveBeenCalled();
      button.click();
      await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));
      expect(document.getElementById("editor-open-project")).toBe(button);
    } finally { app.destroy(); }
  });

  it("preserves content/composition drafts and input nodes without saving on tab changes", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const person = { nome: "Original", instituicao: "UFRJ", categoria: "docentes" };
    const host = createMemoryDesktopHost();
    host.readContentDataset = vi.fn(async () => [{ name: "person.json", value: person }]);
    host.saveContentRecord = vi.fn();
    const service = createMemoryCompositionService({ kind: "single-page", sections: [
      { id: "sobre", type: "sobre", enabled: true, order: 1 },
      { id: "parcerias", type: "parcerias", enabled: true, order: 2 },
    ] });
    const save = vi.spyOn(service, "saveComposition");
    const app = initEditorApp({ compositionService: service, desktopHost: host });
    try {
      await app.ready;
      document.getElementById("editor-content-dataset").value = "equipe";
      app.store.setState({ openedProject: { path: "C:/project", status: "valid" }, editorSiteModel: {
        equipe: [person], linhasPesquisa: [], extensao: { projects: [] }, parcerias: [], publicacoes: [], page: app.store.getState().draftComposition,
      } });
      await vi.waitFor(() => expect(document.querySelector("#editor-content-form input")).not.toBeNull());
      document.getElementById("editor-tab-content").click();
      const input = document.querySelector("#editor-content-form input");
      input.value = "Rascunho"; input.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("editor-tab-page").click();
      const buttons = document.querySelectorAll("#editor-section-list .editor-section-item button");
      buttons[2].click();
      expect(app.store.getState().compositionDirty).toBe(true);
      const state = app.store.getState();
      const calls = host.readContentDataset.mock.calls.length;
      for (const tab of document.querySelectorAll('[role="tab"]')) tab.click();
      expect(app.store.getState()).toBe(state);
      expect(document.querySelector("#editor-content-form input")).toBe(input);
      expect(input.value).toBe("Rascunho");
      expect(state.contentDirty).toBe(true);
      expect(host.readContentDataset).toHaveBeenCalledTimes(calls);
      expect(host.saveContentRecord).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    } finally { app.destroy(); }
  });

  it("keeps remote-source update independent of build while enforcing unsaved-change guards", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const update = vi.fn(async () => ({ ok: true, message: "Atualizado" }));
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: createMemoryDesktopHost({}, { updateRemoteProjectSource: update }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      await app.ready;
      app.store.setState({ openedProject: { path: "C:/project", status: "valid" }, build: { status: "idle" }, compositionDirty: false, contentDirty: false,
        publish: { status: "configured", profile: { host: "ftp.example.edu", port: 21, username: "editor", remoteSourcePath: "/source", remotePublishPath: "/", secure: true, hasPassword: true } } });
      document.getElementById("editor-tab-publish").click();
      expect(update).not.toHaveBeenCalled();
      expect(document.getElementById("editor-publish-site").disabled).toBe(true);
      document.getElementById("editor-update-remote-source").click();
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => expect(app.store.getState().publish.status).not.toBe("publishing"));
      expect(document.getElementById("editor-session-source").textContent).toBe("atualizado nesta sessão");
      expect(document.getElementById("editor-publish-status").closest('[role="tabpanel"]').id).toBe("editor-tabpanel-publish");
      expect(document.getElementById("editor-session-publication").textContent).toBe("não realizada no contexto atual");
      expect(document.getElementById("editor-session-build").textContent).toBe("não gerada");
      app.store.setState({ contentDirty: true });
      expect(document.getElementById("editor-session-source").textContent).toBe("estado desconhecido");
      document.getElementById("editor-update-remote-source").click();
      expect(document.getElementById("editor-update-remote-source").disabled).toBe(true);
      expect(document.getElementById("editor-update-remote-source-reason").textContent).toContain("Salve");
      expect(update).toHaveBeenCalledTimes(1);
    } finally { confirm.mockRestore(); app.destroy(); }
  });

  it("shows build busy/failure outcomes across tabs and hides an outdated generated preview", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    let finish;
    const build = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: createMemoryDesktopHost({}, { runProjectBuild: build }) });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/project" } });
      const button = document.getElementById("editor-generate-site");
      button.click(); button.click();
      expect(build).toHaveBeenCalledTimes(1);
      expect(document.getElementById("editor-open-project").disabled).toBe(true);
      expect(document.getElementById("editor-session-build").textContent).toBe("gerando");
      finish({ ok: false, message: "Falha de geração simulada." });
      await vi.waitFor(() => expect(app.store.getState().build.status).toBe("failed"));
      for (const tab of document.querySelectorAll('[role="tab"]')) tab.click();
      expect(document.getElementById("editor-build-status").textContent).toContain("Falha de geração simulada");
      expect(button.disabled).toBe(false);
      app.store.setState({ build: { status: "success", previewUrl: "http://localhost/old" } });
      const frame = document.getElementById("editor-generated-site-preview");
      expect(frame.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-popups");
      expect(frame.hidden).toBe(false);
      app.store.setState({ contentDirty: true });
      expect(document.getElementById("editor-session-build").textContent).toBe("desatualizada");
      expect(frame.hidden).toBe(true);
      expect(frame.hasAttribute("src")).toBe(false);
      app.store.setState({ contentDirty: false });
      expect(document.getElementById("editor-preview-generated-site").disabled).toBe(true);
    } finally { app.destroy(); }
  });

  it("retains source failure across tabs and releases busy controls after a rejected operation", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const update = vi.fn(async () => { throw new Error("Transferência simulada falhou."); });
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: createMemoryDesktopHost({}, { updateRemoteProjectSource: update }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/project" }, publish: { status: "configured", profile: { host: "ftp.example.edu", port: 21, username: "editor", hasPassword: true, remoteSourcePath: "/source", remotePublishPath: "/" } } });
      const button = document.getElementById("editor-update-remote-source");
      button.click(); button.click();
      expect(update).toHaveBeenCalledTimes(1);
      await vi.waitFor(() => expect(app.store.getState().publish.status).toBe("failed"));
      for (const tab of document.querySelectorAll('[role="tab"]')) tab.click();
      expect(document.getElementById("editor-publish-status").textContent).toContain("Transferência simulada falhou");
      expect(document.getElementById("editor-session-source").textContent).toBe("estado desconhecido");
      expect(button.disabled).toBe(false);
    } finally { confirm.mockRestore(); app.destroy(); }
  });

  it("does not attach a late source-update success to a changed project", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    let finish;
    const update = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const app = initEditorApp({ compositionService: createMemoryCompositionService(), desktopHost: createMemoryDesktopHost({}, { updateRemoteProjectSource: update }) });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/project" }, publish: { status: "configured", profile: { host: "ftp.example.edu", port: 21, username: "editor", hasPassword: true, remoteSourcePath: "/source", remotePublishPath: "/" } } });
      document.getElementById("editor-update-remote-source").click();
      app.store.setState({ openedProject: { status: "valid", path: "C:/other-project" } });
      finish({ ok: true });
      await vi.waitFor(() => expect(app.store.getState().publish.status).not.toBe("publishing"));
      expect(app.store.getState().receipts.source).toBeNull();
      expect(document.getElementById("editor-session-source").textContent).toBe("estado desconhecido");
      expect(document.getElementById("editor-publish-status").textContent).toContain("contexto anterior");
    } finally { confirm.mockRestore(); app.destroy(); }
  });

  it("returns structured error when container is missing", () => {
    document.body.innerHTML = '<div id="other-root"></div>';

    const result = startEditorApp({ containerId: "editor-root" });

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("EDITOR_BOOTSTRAP_FAILED");
    expect(result.error.message).toContain("contêiner #editor-root");
  });

  it("persists selected local source", () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const storage = createStorageMock();
    const app = initEditorApp({
      storageRef: storage,
      compositionService: createMemoryCompositionService(),
    });

    const localPathInput = document.getElementById("editor-local-path");
    const saveButton = document.getElementById("editor-save-source");

    localPathInput.value = "C:/labfonac/dist";
    saveButton.click();

    expect(app.store.getState().projectSource).toEqual({
      type: "local",
      path: "C:/labfonac/dist",
    });

    const persisted = JSON.parse(storage.getItem(STORAGE_KEY));
    expect(persisted.type).toBe("local");
    expect(persisted.path).toBe("C:/labfonac/dist");

    app.destroy();
  });

  it("persists selected FTP source", () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const storage = createStorageMock();
    const app = initEditorApp({
      storageRef: storage,
      compositionService: createMemoryCompositionService(),
    });

    const ftpRadio = document.querySelector(
      'input[name="project-source-type"][value="ftp"]',
    );
    ftpRadio.checked = true;
    ftpRadio.dispatchEvent(new Event("change"));

    document.getElementById("editor-ftp-host").value = "ftp.ufrj.br";
    document.getElementById("editor-ftp-port").value = "21";
    document.getElementById("editor-ftp-username").value = "editor";
    document.getElementById("editor-ftp-remote-path").value = "/labfonac/dist";

    document.getElementById("editor-save-source").click();

    expect(app.store.getState().projectSource).toEqual({
      type: "ftp",
      host: "ftp.ufrj.br",
      port: 21,
      username: "editor",
      remotePath: "/labfonac/dist",
      passiveMode: true,
    });

    const persisted = JSON.parse(storage.getItem(STORAGE_KEY));
    expect(persisted.type).toBe("ftp");
    expect(persisted.host).toBe("ftp.ufrj.br");

    app.destroy();
  });

  it("cancel does not break the editor state", () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const storage = createStorageMock();
    const app = initEditorApp({
      storageRef: storage,
      compositionService: createMemoryCompositionService(),
      initialState: {
        appStatus: "sourceSelected",
        currentView: "home",
        projectSource: {
          type: "local",
          path: "C:/existing/dist",
        },
        projectSnapshotPath: null,
        diagnostics: [],
        lastError: null,
      },
    });

    const localPathInput = document.getElementById("editor-local-path");
    localPathInput.value = "C:/another/path";

    document.getElementById("editor-cancel-source").click();

    expect(localPathInput.value).toBe("C:/existing/dist");
    expect(app.store.getState().projectSource).toEqual({
      type: "local",
      path: "C:/existing/dist",
    });

    app.destroy();
  });

  it("opens a local source project and displays read-only content summaries", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const desktopHost = createMemoryDesktopHost(
      {
        "package.json": "{}",
        "scripts/build-data.js": "export {};",
        "content/page.json": JSON.stringify({
          kind: "single-page",
          sections: [
            { id: "sobre", type: "sobre", enabled: true, order: 1 },
            {
              id: "publicacoes",
              type: "publicacoes",
              enabled: true,
              order: 2,
            },
            { id: "extensao", type: "extension", enabled: false, order: 3 },
          ],
        }),
        "content/site.json": JSON.stringify({
          hero: { title: "Hero local" },
          sobre: { title: "Sobre local", paragraphs: ["Texto"] },
          footer: { sections: [{ title: "Rodapé local" }] },
        }),
        "content/equipe/egressa.json": JSON.stringify({
          nome: "Pessoa Egressa",
          categoria: "egressos",
        }),
        "content/linhas/linha.json": JSON.stringify({
          nome: "Linha",
          ordem: 1,
        }),
        "content/extensao.json": JSON.stringify({
          projects: [
            {
              title: "PROVALE em Extensão",
              projectType: "Projeto de Extensão",
            },
          ],
        }),
        "content/parcerias/parceria.json": JSON.stringify({ nome: "CAPES" }),
        "content/publicacoes/pub.json": JSON.stringify({
          title: "Publicação",
          year: 2024,
        }),
      },
      {
        directory: {
          name: "lab-fon-ufrj",
          path: "C:/lab-fon-ufrj",
        },
      },
    );
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost,
    });

    await app.ready;
    document.getElementById("editor-open-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    expect(app.store.getState().openedProject).toMatchObject({
      path: "C:/lab-fon-ufrj",
      status: "valid",
    });
    expect(document.getElementById("editor-project-status").textContent).toBe(
      "Projeto local aberto (válido): C:/lab-fon-ufrj",
    );
    expect(
      document.getElementById("editor-section-list").textContent,
    ).toContain("Publicações (habilitada)");
    expect(
      document.getElementById("editor-add-section-select").textContent,
    ).toContain("Extensão");
    expect(
      document.getElementById("editor-content-summary").textContent,
    ).toContain("Hero: Hero local");
    expect(
      document.getElementById("editor-content-summary").textContent,
    ).toContain("Egressos: presente");
    expect(
      document.getElementById("editor-content-summary").textContent,
    ).toContain("PROVALE: Projeto de Extensão");

    app.destroy();
  });

  it("allows read-only FTP connection testing before a project is opened", () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
    });

    const testButton = document.getElementById("editor-test-ftp-connection");
    const publishButton = document.getElementById("editor-publish-site");

    expect(testButton.disabled).toBe(true);
    expect(document.getElementById(testButton.getAttribute("aria-describedby")).textContent).toContain("servidor FTP");
    expect(testButton.title).toBe("");
    expect(publishButton.disabled).toBe(true);
    expect(document.getElementById("editor-publish-status").textContent).toBe(
      "Configure o destino de publicação.",
    );
    document.getElementById("editor-publish-host").value = "ftp.example.edu";
    document.getElementById("editor-publish-username").value = "editor";
    const password = document.getElementById("editor-publish-password");
    password.value = "test-password";
    password.dispatchEvent(new Event("input", { bubbles: true }));
    expect(testButton.disabled).toBe(false);
    expect(app.store.getState().openedProject).toBeNull();

    app.destroy();
  });

  it("opens a retrieved remote project through the existing project loader", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const progressMessages = [];
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createMemoryDesktopHost(
        {
          "package.json": "{}",
          "scripts/build-data.js": "export {};",
          "content/page.json": JSON.stringify({
            kind: "single-page",
            sections: [
              { id: "sobre", type: "sobre", enabled: true, order: 1 },
              { id: "publicacoes", type: "publicacoes", enabled: true, order: 2 },
            ],
          }),
          "content/site.json": JSON.stringify({
            hero: { title: "Hero remoto" },
            sobre: { title: "Sobre remoto", paragraphs: ["Texto"] },
          }),
        },
        {
          retrieveRemoteProject: async (_profile, _password, onProgress) => {
            await Promise.resolve();
            onProgress({ phase: "setup" });
            progressMessages.push(document.getElementById("editor-publish-status").textContent);
            onProgress({ phase: "discovery" });
            progressMessages.push(document.getElementById("editor-publish-status").textContent);
            onProgress({ phase: "download", transferredBytes: 1536 });
            progressMessages.push(document.getElementById("editor-publish-status").textContent);
            onProgress({ phase: "validation" });
            progressMessages.push(document.getElementById("editor-publish-status").textContent);
            return {
              ok: true,
              directory: {
                name: "Lab-FON remoto",
                path: "C:/app/workspaces/lab-fon/current",
              },
            };
          },
        },
      ),
    });

    await app.ready;
    document.getElementById("editor-publish-host").value = "ftp.example.edu";
    document.getElementById("editor-publish-username").value = "editor";
    document.getElementById("editor-publish-password").value = "secret";
    document.getElementById("editor-publish-password").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("editor-open-remote-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    expect(
      app.store.getState().openedProject,
      app.store.getState().publish?.message,
    ).not.toBeNull();
    expect(app.store.getState().openedProject.path).toBe(
      "C:/app/workspaces/lab-fon/current",
    );
    expect(progressMessages).toEqual([
      "Conectando...",
      "Localizando arquivos...",
      "Baixando projeto... 1.5 KB",
      "Verificando projeto...",
    ]);
    expect(app.store.getState().editorSiteModel.site.hero.title).toBe(
      "Hero remoto",
    );
    expect(document.getElementById("editor-publish-status").closest('[role="tabpanel"]').id).toBe("editor-tabpanel-project");

    app.destroy();
  });

  it("connects with fixed paths and keeps folder controls out of the Projeto tab", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const listedPaths = [];
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createMemoryDesktopHost(
        {},
        {
          connectFtp: async (profile) => {
            expect(profile.remoteSourcePath).toBe("/source");
            expect(profile.remotePublishPath).toBe("/");
            return { ok: true, code: "FTP_CONNECTED", message: "Conectado ao servidor." };
          },
          listRemoteDirectory: async (_profile, _password, remotePath) => {
            listedPaths.push(remotePath);
            return { ok: true, path: remotePath, entries: [{ name: "content", type: "directory" }] };
          },
        },
      ),
    });

    await app.ready;
    document.getElementById("editor-publish-host").value = "ftp.example.edu";
    document.getElementById("editor-publish-username").value = "editor";
    document.getElementById("editor-publish-password").value = "secret";
    document.getElementById("editor-publish-password").dispatchEvent(new Event("input", { bubbles: true }));

    document.getElementById("editor-connect-ftp").click();
    await waitForCondition(() => app.store.getState().remote?.status === "connected");

    expect(listedPaths).toEqual(["/source"]);
    expect(app.store.getState().remote.currentPath).toBe("/source");
    for (const id of [
      "editor-remote-browser",
      "editor-remote-up",
      "editor-remote-reload",
      "editor-remote-use-current-source",
      "editor-remote-use-current-publish",
      "editor-publish-remote-source-path",
      "editor-publish-remote-path",
    ]) expect(document.getElementById(id)).toBeNull();
    expect(document.getElementById("editor-tabpanel-project").textContent).not.toContain("Pasta:");
    expect(document.getElementById("editor-open-remote-project")).not.toBeNull();

    app.destroy();
  });
});

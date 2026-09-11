import { describe, expect, it, vi } from "vitest";
import {
  initEditorApp,
  startEditorApp,
} from "../../src/js/editor/bootstrap.js";
import { createMemoryCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";

const STORAGE_KEY = "labfon.editor.lastSource";

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
      button.click();
      expect(publishGeneratedSite).toHaveBeenCalledTimes(1);
      expect(app.store.getState().publish.status).toBe("publishing");
      expect(button.disabled).toBe(true);
      finishPublication({ ok: true });
      await waitForCondition(() => app.store.getState().publish.status === "success");
      expect(app.store.getState().publish.status).toBe("success");
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
    expect(document.querySelectorAll(".editor-nav-btn").length).toBe(6);
    expect(document.getElementById("editor-project-status")?.textContent).toBe(
      "Nenhum projeto aberto.",
    );

    app.destroy();
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
      "Projeto aberto (válido): C:/lab-fon-ufrj",
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

    expect(testButton.disabled).toBe(false);
    expect(testButton.title).toBe("");
    expect(publishButton.disabled).toBe(true);
    expect(document.getElementById("editor-publish-status").textContent).toBe(
      "Configure o destino de publicação.",
    );

    app.destroy();
  });

  it("opens a retrieved remote project through the existing project loader", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
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
          retrieveRemoteProject: async () => ({
            ok: true,
            directory: {
              name: "Lab-FON remoto",
              path: "C:/app/workspaces/lab-fon/current",
            },
          }),
        },
      ),
    });

    await app.ready;
    document.getElementById("editor-publish-host").value = "ftp.example.edu";
    document.getElementById("editor-publish-username").value = "editor";
    document.getElementById("editor-publish-password").value = "secret";
    document.getElementById("editor-publish-remote-source-path").value =
      "/labfon-source";
    document.getElementById("editor-publish-remote-path").value = "/";
    document.getElementById("editor-open-remote-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    expect(app.store.getState().openedProject.path).toBe(
      "C:/app/workspaces/lab-fon/current",
    );
    expect(app.store.getState().editorSiteModel.site.hero.title).toBe(
      "Hero remoto",
    );

    app.destroy();
  });

  it("connects to the FTP server without remote paths, browses folders, and assigns roles", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const listedPaths = [];
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createMemoryDesktopHost(
        {},
        {
          connectFtp: async (profile) => {
            expect(profile.remoteSourcePath).toBe("");
            return { ok: true, code: "FTP_CONNECTED", message: "Conectado ao servidor." };
          },
          listRemoteDirectory: async (_profile, _password, remotePath) => {
            listedPaths.push(remotePath);
            if (remotePath === "/") {
              return {
                ok: true,
                path: "/",
                entries: [
                  { name: "labfon-source", type: "directory" },
                  { name: "index.html", type: "file" },
                ],
              };
            }
            return { ok: true, path: remotePath, entries: [] };
          },
        },
      ),
    });

    await app.ready;
    document.getElementById("editor-publish-host").value = "ftp.example.edu";
    document.getElementById("editor-publish-username").value = "editor";
    document.getElementById("editor-publish-password").value = "secret";

    document.getElementById("editor-connect-ftp").click();
    await waitForCondition(() => app.store.getState().remote?.entries?.length > 0);

    expect(listedPaths).toContain("/");
    expect(document.getElementById("editor-remote-browser").classList.contains("is-hidden")).toBe(false);
    expect(document.getElementById("editor-remote-listing").textContent).toContain(
      "labfon-source",
    );

    const listingButtons = Array.from(
      document.getElementById("editor-remote-listing").querySelectorAll("button"),
    );
    const useAsSourceButton = listingButtons.find(
      (button) => button.textContent === "Usar como pasta do projeto editável",
    );
    useAsSourceButton.click();

    expect(document.getElementById("editor-publish-remote-source-path").value).toBe(
      "/labfon-source",
    );

    app.destroy();
  });
});

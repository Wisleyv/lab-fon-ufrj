import { describe, expect, it, vi } from "vitest";
import { initEditorApp } from "../../src/js/editor/bootstrap.js";
import { createMemoryCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";

const initialComposition = {
  kind: "single-page",
  sections: [
    { id: "sobre", type: "sobre", enabled: true, order: 1 },
    {
      id: "linhas-pesquisa",
      type: "linhas_pesquisa",
      enabled: true,
      order: 2,
    },
    { id: "parcerias", type: "parcerias", enabled: true, order: 3 },
  ],
};

const previewData = {
  site: {
    linhas_pesquisa: [
      {
        id: "linha",
        nome: "Prosódia",
        estudantes: 1,
        pesquisadores: 1,
        ordem: 1,
      },
    ],
    parcerias: [{ nome: "CAPES", sigla: "CAPES" }],
  },
  publications: {
    references: [],
  },
};

async function waitForCondition(predicate) {
  for (let index = 0; index < 20; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function createProjectHost() {
  return createMemoryDesktopHost(
    {
      "package.json": "{}",
      "scripts/build-data.js": "export {};",
      "content/page.json": JSON.stringify({
        kind: "single-page",
        sections: [
          { id: "sobre", type: "sobre", enabled: true, order: 1 },
          {
            id: "linhas-pesquisa",
            type: "linhas_pesquisa",
            enabled: true,
            order: 2,
          },
          { id: "pesquisadores", type: "equipe", enabled: true, order: 3 },
          {
            id: "publicacoes",
            type: "publicacoes",
            enabled: true,
            order: 4,
            navigation: { visible: true, label: "Publicações" },
          },
          {
            id: "extensao",
            type: "extension",
            enabled: false,
            order: 5,
            navigation: { visible: true, label: "Extensão" },
          },
          { id: "parcerias", type: "parcerias", enabled: true, order: 6 },
        ],
      }),
      "content/site.json": JSON.stringify({
        hero: { title: "Hero" },
        sobre: { title: "Sobre", paragraphs: ["Texto"] },
        footer: { sections: [] },
      }),
      "content/equipe/egressa.json": JSON.stringify({
        nome: "Pessoa Egressa",
        categoria: "egressos",
      }),
      "content/linhas/linha.json": JSON.stringify({
        id: "linha",
        nome: "Prosódia",
        descricao: "Descrição.",
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
      "content/parcerias/capes.json": JSON.stringify({
        nome: "CAPES",
        sigla: "CAPES",
      }),
      "content/publicacoes/pub.json": JSON.stringify({
        title: "Publicação",
        authors: ["Autora"],
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
}

function createFailingProjectHost(options) {
  return createMemoryDesktopHost(
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
      "content/site.json": JSON.stringify({}),
    },
    {
      directory: {
        name: "lab-fon-ufrj",
        path: "C:/lab-fon-ufrj",
      },
      ...options,
    },
  );
}

describe("Editor Composition UI", () => {
  it.each(["local", "remote-ftp"])("reports the local page-save destination for %s projects", async (source) => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({ compositionService: createMemoryCompositionService(initialComposition) });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:\\Temp\\labfonac-c2", source } });
      document.querySelector('[data-section-id="parcerias"] button').click();
      document.getElementById("editor-save-composition").click();
      await vi.waitFor(() => expect(app.store.getState().compositionDirty).toBe(false));
      expect(app.store.getState().compositionOutcome).toBe(
        `Página salva ${source === "local" ? "no projeto local" : "na cópia local do projeto remoto"}: C:\\Temp\\labfonac-c2. Nenhum envio por FTP.`);
      expect(app.store.getState().receipts.source).toBeNull();
      expect(app.store.getState().receipts.publication).toBeNull();
    } finally { app.destroy(); }
  });

  it.each([
    ["start", ["parcerias", "sobre", "linhas-pesquisa"]],
    ["after:sobre", ["sobre", "parcerias", "linhas-pesquisa"]],
    ["after:linhas-pesquisa", ["sobre", "linhas-pesquisa", "parcerias"]],
  ])("inserts at %s and reuses composition order in preview and navigation", async (position, expected) => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const page = { ...initialComposition, sections: initialComposition.sections.map((section) => ({
      ...section, enabled: section.type !== "parcerias", navigation: { visible: true },
    })).concat({ id: "extensao", type: "extension", enabled: false, order: 4 }) };
    const service = createMemoryCompositionService(page);
    const app = initEditorApp({ compositionService: service, previewData });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/memory-project" } });
      const select = document.getElementById("editor-add-section-position");
      expect([...select.options].map((option) => option.value)).toEqual(["", "start", "after:sobre", "after:linhas-pesquisa"]);
      select.value = position;
      document.getElementById("editor-add-section-select").value = "parcerias";
      document.getElementById("editor-add-section").click();
      const activeIds = () => app.store.getState().draftComposition.sections.filter((section) => section.enabled).map((section) => section.id);
      expect(activeIds()).toEqual(expected);
      document.getElementById("editor-preview-composition").click();
      await vi.waitFor(() => expect(document.querySelectorAll("#editor-composition-preview [data-page-section]")).toHaveLength(3));
      expect([...document.querySelectorAll("#editor-composition-preview [data-page-section]")].map((node) => node.id)).toEqual(expected);
      expect([...document.querySelectorAll("#editor-composition-preview #main-navigation > li > a")].map((node) => node.getAttribute("href"))).toEqual([...expected.map((id) => `#${id}`), "#contato"]);
      expect(document.querySelector("#editor-composition-preview #extensao")).toBeNull();
      document.getElementById("editor-save-composition").click();
      await vi.waitFor(() => expect(app.store.getState().compositionDirty).toBe(false));
      expect((await service.loadComposition()).sections.filter((section) => section.enabled).map((section) => section.id)).toEqual(expected);
    } finally { app.destroy(); }
  });

  it("reports a stale placement without changing draft or baseline", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({ compositionService: createMemoryCompositionService(initialComposition) });
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/memory-project" } });
      document.getElementById("editor-add-section-position").value = "after:parcerias";
      document.querySelector('[data-section-id="parcerias"] button:nth-child(3)').click();
      const before = app.store.getState();
      document.getElementById("editor-add-section-select").value = "parcerias";
      document.getElementById("editor-add-section").click();
      expect(app.store.getState().draftComposition).toBe(before.draftComposition);
      expect(app.store.getState().loadedComposition).toBe(before.loadedComposition);
      expect(app.store.getState().diagnostics[0].code).toBe("SECTION_INSERTION_INVALID");
    } finally { app.destroy(); }
  });

  it("loads current composition as separate saved and draft state", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(initialComposition),
    });

    await app.ready;

    expect(app.store.getState().savedComposition).toEqual(
      app.store.getState().draftComposition,
    );
    expect(
      app.store
        .getState()
        .savedComposition.sections.map((section) => section.type),
    ).toEqual(["sobre", "linhas_pesquisa", "parcerias"]);
    expect(app.store.getState().savedComposition.sections[0]).toMatchObject({
      id: "sobre",
      navigation: {
        label: "Sobre",
      },
      presentation: {
        variant: "default",
      },
    });
    expect(document.querySelectorAll(".editor-section-item")).toHaveLength(3);

    app.destroy();
  });

  it("moves, removes, restores, previews, and saves draft composition", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const compositionService =
      createMemoryCompositionService(initialComposition);
    const app = initEditorApp({
      compositionService,
      previewData,
    });

    await app.ready;
    app.store.setState({ openedProject: { status: "valid", path: "C:/memory-project" } });

    document
      .querySelector(
        '[data-section-id="parcerias"] .editor-section-actions button',
      )
      .click();

    expect(app.store.getState().draftComposition.sections[1].type).toBe(
      "parcerias",
    );
    expect(app.store.getState().savedComposition.sections[2].type).toBe(
      "parcerias",
    );
    expect(app.store.getState().compositionDirty).toBe(true);

    document
      .querySelector(
        '[data-section-id="parcerias"] .editor-section-actions button:nth-child(3)',
      )
      .click();

    expect(
      app.store
        .getState()
        .draftComposition.sections.find((section) => section.id === "parcerias")
        .enabled,
    ).toBe(false);

    const addSelect = document.getElementById("editor-add-section-select");
    addSelect.value = "parcerias";
    document.getElementById("editor-add-section").click();

    expect(
      app.store
        .getState()
        .draftComposition.sections.find((section) => section.id === "parcerias")
        .enabled,
    ).toBe(true);

    await document.getElementById("editor-preview-composition").click();
    const previewSections = () => Array.from(
      document.querySelectorAll(
        "#editor-composition-preview #main-content > [data-page-section]",
      ),
    ).map((section) => section.dataset.pageSection);

    await vi.waitFor(() => expect(previewSections()).toEqual(["sobre", "parcerias", "linhas_pesquisa"]));

    await document.getElementById("editor-save-composition").click();
    await Promise.resolve();

    expect(app.store.getState().compositionDirty).toBe(false);
    expect(compositionService.getSavedComposition().sections[1].type).toBe(
      "parcerias",
    );

    app.destroy();
  });

  it("keeps loaded and draft compositions separate for opened projects", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createProjectHost(),
    });

    await app.ready;
    document.getElementById("editor-open-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    const loadedComposition = app.store.getState().loadedComposition;
    const draftComposition = app.store.getState().draftComposition;

    expect(loadedComposition).toEqual(draftComposition);
    expect(loadedComposition).not.toBe(draftComposition);

    document
      .querySelector(
        '[data-section-id="publicacoes"] .editor-section-actions button:nth-child(3)',
      )
      .click();

    expect(
      app.store
        .getState()
        .draftComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(false);
    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(true);
    expect(app.store.getState().compositionDirty).toBe(true);

    document.getElementById("editor-discard-composition").click();

    expect(app.store.getState().draftComposition).toEqual(loadedComposition);
    expect(app.store.getState().compositionDirty).toBe(false);

    app.destroy();
  });

  it("previews Publicações disabled and Extensão enabled in draft only", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost: createProjectHost(),
    });

    await app.ready;
    document.getElementById("editor-open-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(true);
    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "extension",
        ).enabled,
    ).toBe(false);

    document
      .querySelector(
        '[data-section-id="publicacoes"] .editor-section-actions button:nth-child(3)',
      )
      .click();

    const addSelect = document.getElementById("editor-add-section-select");
    addSelect.value = "extension";
    document.getElementById("editor-add-section").click();

    await document.getElementById("editor-preview-composition").click();
    await waitForCondition(() =>
      document.querySelector(
        "#editor-composition-preview [data-page-section='extension']",
      ),
    );

    const preview = document.getElementById("editor-composition-preview");
    const previewSections = Array.from(
      preview.querySelectorAll("#main-content > [data-page-section]"),
    ).map((section) => section.dataset.pageSection);
    const navLinks = Array.from(
      preview.querySelectorAll("#main-navigation > li > a"),
    ).map((link) => link.textContent.trim());

    expect(previewSections).toContain("extension");
    expect(previewSections).not.toContain("publicacoes");
    expect(navLinks).toContain("Extensão");
    expect(navLinks).not.toContain("Publicações");
    expect(navLinks).not.toContain("PROVALE");
    expect(preview.textContent).toContain("PROVALE em Extensão");
    expect(preview.textContent).toContain("Projeto de Extensão");
    expect(app.store.getState().loadedComposition.sections).toEqual(
      app.store.getState().savedComposition.sections,
    );
    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(true);
    expect(app.store.getState().editorSiteModel.equipe[0].categoria).toBe(
      "egressos",
    );

    app.destroy();
  });

  it("saves a valid project draft and updates loaded/draft baselines", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const desktopHost = createProjectHost();
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost,
    });

    await app.ready;
    document.getElementById("editor-open-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    document
      .querySelector(
        '[data-section-id="publicacoes"] .editor-section-actions button:nth-child(3)',
      )
      .click();

    expect(app.store.getState().compositionDirty).toBe(true);
    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(true);

    document.getElementById("editor-save-composition").click();
    await waitForCondition(() => !app.store.getState().compositionDirty);

    expect(desktopHost.getWrites()).toHaveLength(1);
    expect(desktopHost.getWrites()[0].path).toBe("content/page.json");
    expect(
      app.store
        .getState()
        .loadedComposition.sections.find(
          (section) => section.type === "publicacoes",
        ).enabled,
    ).toBe(false);
    expect(app.store.getState().draftComposition).toEqual(
      app.store.getState().loadedComposition,
    );
    expect(app.store.getState().diagnostics).toEqual([]);

    app.destroy();
  });

  it("preserves draft and unsaved state when project save fails", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const desktopHost = createFailingProjectHost({ failWrite: true });
    const app = initEditorApp({
      compositionService: createMemoryCompositionService(),
      desktopHost,
    });

    await app.ready;
    document.getElementById("editor-open-project").click();
    await waitForCondition(() => app.store.getState().openedProject);

    const loadedBeforeSave = app.store.getState().loadedComposition;
    document
      .querySelector(
        '[data-section-id="publicacoes"] .editor-section-actions button:nth-child(3)',
      )
      .click();
    const draftBeforeSave = app.store.getState().draftComposition;

    document.getElementById("editor-save-composition").click();
    await waitForCondition(() => app.store.getState().diagnostics.length > 0);

    expect(app.store.getState().loadedComposition).toEqual(loadedBeforeSave);
    expect(app.store.getState().draftComposition).toEqual(draftBeforeSave);
    expect(app.store.getState().compositionDirty).toBe(true);
    expect(app.store.getState().diagnostics[0].code).toBe(
      "COMPOSITION_WRITE_FAILED",
    );

    app.destroy();
  });
});

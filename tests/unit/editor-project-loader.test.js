import { describe, expect, it } from "vitest";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import {
  loadEditorSiteModel,
  validateLabFonProject,
} from "../../src/js/editor/project-loader.js";

function createProjectFiles(overrides = {}) {
  return {
    "package.json": "{}",
    "scripts/build-data.js": "export {};",
    "content/page.json": JSON.stringify({
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "publicacoes", type: "publicacoes", enabled: true, order: 2 },
        { id: "extensao", type: "extension", enabled: false, order: 3 },
      ],
    }),
    "content/site.json": JSON.stringify({
      hero: { title: "Hero canônico" },
      sobre: { title: "Sobre canônico", paragraphs: ["A", "B"] },
      footer: { sections: [{ title: "Rodapé" }] },
    }),
    "content/equipe/egressa.json": JSON.stringify({
      nome: "Pessoa Egressa",
      categoria: "egressos",
    }),
    "content/linhas/prosodia.json": JSON.stringify({
      id: "prosodia",
      nome: "Prosódia",
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
    "content/parcerias/capes.json": JSON.stringify({ nome: "CAPES" }),
    "content/publicacoes/pub.json": JSON.stringify({
      title: "Publicação",
      year: 2024,
    }),
    ...overrides,
  };
}

const directory = {
  name: "lab-fon-ufrj",
  path: "C:/lab-fon-ufrj",
};

describe("editor project loader", () => {
  it("detects a valid Lab-FON source project", async () => {
    const host = createMemoryDesktopHost(createProjectFiles(), { directory });

    const validation = await validateLabFonProject(host, directory);

    expect(validation.status).toBe("valid");
    expect(validation.valid).toBe(true);
  });

  it("detects invalid projects with missing required content", async () => {
    const files = createProjectFiles();
    delete files["content/site.json"];
    const host = createMemoryDesktopHost(files, { directory });

    const validation = await validateLabFonProject(host, directory);

    expect(validation.status).toBe("invalid");
    expect(validation.diagnostics[0]).toMatchObject({
      code: "PROJECT_MARKER_MISSING",
      file: "content/site.json",
    });
  });

  it("reports malformed canonical JSON without loading generated data", async () => {
    const host = createMemoryDesktopHost(
      createProjectFiles({ "content/site.json": "{malformed" }),
      { directory },
    );

    const result = await loadEditorSiteModel(host, directory);

    expect(result.ok).toBe(false);
    expect(result.model).toBeNull();
    expect(result.diagnostics.at(-1)).toMatchObject({
      code: "PROJECT_JSON_MALFORMED",
      file: "content/site.json",
    });
  });

  it("loads canonical content into the editor-facing model", async () => {
    const host = createMemoryDesktopHost(createProjectFiles(), { directory });

    const result = await loadEditorSiteModel(host, directory);

    expect(result.ok).toBe(true);
    expect(result.model.page.sections.map((section) => section.type)).toEqual([
      "sobre",
      "publicacoes",
      "extension",
    ]);
    expect(result.model.site.hero.title).toBe("Hero canônico");
    expect(result.model.equipe[0].categoria).toBe("egressos");
    expect(result.model.linhasPesquisa[0].nome).toBe("Prosódia");
    expect(result.model.extensao.projects[0]).toMatchObject({
      title: "PROVALE em Extensão",
      projectType: "Projeto de Extensão",
    });
    expect(result.model.parcerias[0].nome).toBe("CAPES");
    expect(result.model.publicacoes[0].title).toBe("Publicação");
  });

  it("preserves enabled and disabled fixture states in the loaded model", async () => {
    const host = createMemoryDesktopHost(createProjectFiles(), { directory });

    const { model } = await loadEditorSiteModel(host, directory);

    expect(
      model.page.sections.find((section) => section.type === "publicacoes")
        .enabled,
    ).toBe(true);
    expect(
      model.page.sections.find((section) => section.type === "extension")
        .enabled,
    ).toBe(false);
    expect(model.equipe.some((member) => member.categoria === "egressos")).toBe(
      true,
    );
  });
});

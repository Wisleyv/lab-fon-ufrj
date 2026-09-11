import { describe, expect, it } from "vitest";
import {
  applyPageComposition,
  normalizePageComposition,
  validatePageComposition,
} from "../../src/js/page/composition.js";
import {
  createSectionRenderer,
  getSectionDefinition,
} from "../../src/js/page/section-registry.js";
import { renderPageNavigation } from "../../src/js/page/navigation.js";

const CURRENT_SECTION_TYPES = [
  "sobre",
  "linhas_pesquisa",
  "equipe",
  "publicacoes",
  "extension",
  "parcerias",
];

const CURRENT_ENABLED_SECTION_TYPES = [
  "sobre",
  "linhas_pesquisa",
  "equipe",
  "publicacoes",
  "parcerias",
];

function createMainWithSections(
  order = ["parcerias", "publicacoes", "equipe", "linhas_pesquisa", "sobre"],
) {
  const idsByType = {
    sobre: "sobre",
    linhas_pesquisa: "linhas-pesquisa",
    equipe: "pesquisadores",
    publicacoes: "trabalhos",
    parcerias: "parcerias",
  };

  document.body.innerHTML =
    '<main id="main-content"><section class="hero"></section></main>';
  const main = document.getElementById("main-content");

  order.forEach((type) => {
    const section = document.createElement("section");
    section.id = idsByType[type];
    section.dataset.pageSection = type;
    main.appendChild(section);
  });
}

describe("Page Composition", () => {
  it("keeps the current default single-page section support and enabled order", () => {
    const composition = normalizePageComposition();

    expect(composition.kind).toBe("single-page");
    expect(composition.sections.map((section) => section.type)).toEqual(
      CURRENT_SECTION_TYPES,
    );
    expect(
      composition.sections
        .filter((section) => section.enabled)
        .map((section) => section.type),
    ).toEqual(CURRENT_ENABLED_SECTION_TYPES);
    expect(
      composition.sections.find((section) => section.type === "extension"),
    ).toMatchObject({
      enabled: false,
      navigation: {
        visible: true,
        label: "Extensão",
        children: [],
      },
    });
  });

  it("applies page-composition order to existing section elements", () => {
    createMainWithSections();

    applyPageComposition(document, {
      kind: "single-page",
      sections: CURRENT_ENABLED_SECTION_TYPES.map((type, index) => ({
        id: type,
        type,
        enabled: true,
        order: index + 1,
      })),
    });

    const orderedManagedSections = Array.from(
      document.querySelectorAll("#main-content > [data-page-section]"),
    ).map((element) => element.dataset.pageSection);

    expect(orderedManagedSections).toEqual(CURRENT_ENABLED_SECTION_TYPES);
  });

  it("can disable a supported section without removing the element", () => {
    createMainWithSections(CURRENT_SECTION_TYPES);

    applyPageComposition(document, {
      kind: "single-page",
      sections: CURRENT_ENABLED_SECTION_TYPES.map((type, index) => ({
        id: type,
        type,
        enabled: type !== "publicacoes",
        order: index + 1,
      })),
    });

    const publicationsSection = document.getElementById("trabalhos");

    expect(publicationsSection.hidden).toBe(true);
    expect(publicationsSection.getAttribute("aria-hidden")).toBe("true");
  });

  it("derives navigation from enabled section metadata without a PROVALE item", () => {
    document.body.innerHTML = '<ul id="main-navigation"></ul>';
    const composition = normalizePageComposition();

    renderPageNavigation({ documentRef: document, composition });

    const links = Array.from(
      document.querySelectorAll("#main-navigation > li > a"),
    ).map((link) => link.textContent.trim());

    expect(links).toEqual(["Sobre ▾", "Equipe", "Publicações", "Contato"]);
    expect(links).not.toContain("PROVALE");
    expect(links).not.toContain("Extensão");
  });

  it("can derive Extensão navigation when the extension section is enabled", () => {
    document.body.innerHTML = '<ul id="main-navigation"></ul>';
    const composition = normalizePageComposition({
      kind: "single-page",
      sections: [
        {
          id: "publicacoes",
          type: "publicacoes",
          enabled: false,
          order: 1,
          navigation: { visible: true, label: "Publicações" },
        },
        {
          id: "extensao",
          type: "extension",
          enabled: true,
          order: 2,
          navigation: { visible: true, label: "Extensão" },
        },
      ],
    });

    renderPageNavigation({ documentRef: document, composition });

    const links = Array.from(
      document.querySelectorAll("#main-navigation > li > a"),
    ).map((link) => link.textContent.trim());

    expect(links).toEqual(["Extensão", "Contato"]);
    expect(links).not.toContain("PROVALE");
  });

  it("reports unknown section types without breaking normalization", () => {
    const validation = validatePageComposition({
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "x", type: "desconhecida", enabled: true, order: 2 },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics[0].code).toBe(
      "PAGE_SECTION_UNSUPPORTED_TYPE",
    );
    expect(
      validation.composition.sections.map((section) => section.type),
    ).toEqual(["sobre"]);
  });

  it("reports duplicate unique section types", () => {
    const validation = validatePageComposition({
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "sobre-2", type: "sobre", enabled: true, order: 2 },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics[0].code).toBe("PAGE_SECTION_DUPLICATE_TYPE");
  });
});

describe("Section Registry", () => {
  it("maps supported renderable sections to their existing containers", () => {
    expect(getSectionDefinition("equipe").containerId).toBe(
      "pesquisadores-container",
    );
    expect(getSectionDefinition("publicacoes").containerId).toBe(
      "publicacoes-content",
    );
    expect(getSectionDefinition("linhas_pesquisa").containerId).toBe(
      "linhas-pesquisa-content",
    );
    expect(getSectionDefinition("parcerias").containerId).toBe(
      "parcerias-content",
    );
    expect(getSectionDefinition("extension").containerId).toBe(
      "extensao-content",
    );
  });

  it("creates renderers through the registry without changing renderer classes", () => {
    expect(createSectionRenderer("equipe").constructor.name).toBe(
      "PesquisadoresSection",
    );
    expect(createSectionRenderer("publicacoes").constructor.name).toBe(
      "PublicacoesSection",
    );
    expect(createSectionRenderer("linhas_pesquisa").constructor.name).toBe(
      "LinhasPesquisaSection",
    );
    expect(createSectionRenderer("parcerias").constructor.name).toBe(
      "ParceriasSection",
    );
    expect(createSectionRenderer("extension").constructor.name).toBe(
      "ExtensaoSection",
    );
  });
});

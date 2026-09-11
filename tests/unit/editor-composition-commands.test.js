import { describe, expect, it } from "vitest";
import {
  addSection,
  compositionsEqual,
  getAvailableSectionTypes,
  moveSection,
  removeSection,
  restoreDraftComposition,
  validateDraftComposition,
} from "../../src/js/editor/composition-commands.js";

const composition = {
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
    { id: "publicacoes", type: "publicacoes", enabled: true, order: 4 },
    { id: "parcerias", type: "parcerias", enabled: true, order: 5 },
  ],
};

describe("Editor Composition Commands", () => {
  it("moves a section and makes order deterministic", () => {
    const moved = moveSection(composition, "parcerias", "up");

    expect(moved.sections.map((section) => section.type)).toEqual([
      "sobre",
      "linhas_pesquisa",
      "equipe",
      "parcerias",
      "publicacoes",
    ]);
    expect(moved.sections.map((section) => section.order)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("removes a section from the draft without deleting underlying content", () => {
    const siteData = {
      parcerias: [{ nome: "CAPES" }],
    };

    const draft = removeSection(composition, "parcerias");

    expect(
      draft.sections.find((section) => section.type === "parcerias"),
    ).toMatchObject({
      enabled: false,
    });
    expect(siteData.parcerias).toEqual([{ nome: "CAPES" }]);
  });

  it("adds a removed supported section back without duplicating it", () => {
    const removed = removeSection(composition, "parcerias");
    const restored = addSection(removed, "parcerias");

    expect(
      restored.sections.filter((section) => section.type === "parcerias"),
    ).toHaveLength(1);
    expect(
      restored.sections.find((section) => section.type === "parcerias").enabled,
    ).toBe(true);
  });

  it("lists only supported sections missing from the active draft", () => {
    const removed = removeSection(composition, "parcerias");

    expect(getAvailableSectionTypes(removed)).toContain("parcerias");
    expect(getAvailableSectionTypes(removed)).not.toContain("equipe");
  });

  it("validates invalid draft section types safely", () => {
    const validation = validateDraftComposition({
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "invalida", type: "invalida", enabled: true, order: 2 },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(validation.diagnostics[0].code).toBe(
      "PAGE_SECTION_UNSUPPORTED_TYPE",
    );
  });

  it("detects dirty draft state and restores from loaded composition", () => {
    const draft = removeSection(composition, "publicacoes");
    const restored = restoreDraftComposition(composition);

    expect(compositionsEqual(composition, draft)).toBe(false);
    expect(compositionsEqual(restored, composition)).toBe(true);
    expect(restored).not.toBe(composition);
  });

  it("rejects duplicate section types through draft validation", () => {
    const validation = validateDraftComposition({
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

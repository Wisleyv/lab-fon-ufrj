import { afterEach, describe, expect, it, vi } from "vitest";
import { JSONAdapter } from "../../src/js/adapters/JSONAdapter.js";
import { createDefaultPageComposition } from "../../src/js/page/default-composition.js";

describe("JSONAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads page composition data without changing the existing JSON contract", async () => {
    const page = createDefaultPageComposition();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        page,
        equipe: [],
        linhas_pesquisa: [],
        parcerias: [
          {
            nome: "CAPES",
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new JSONAdapter("./data.json", 1);
    const data = await adapter.fetch();

    expect(fetchMock).toHaveBeenCalledWith(
      "./data.json",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    expect(data.page.sections.map((section) => section.type)).toContain(
      "publicacoes",
    );
    expect(data.parcerias[0]).toEqual({
      nome: "CAPES",
      sigla: "",
      localizacao: "",
      tipo: "parceria",
      descricao: "",
      url: "",
    });
  });
});

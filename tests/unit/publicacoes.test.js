import { beforeEach, describe, expect, it } from "vitest";
import { PublicacoesSection } from "../../src/js/sections/publicacoes.js";

describe("PublicacoesSection", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="publicacoes-content"></div>';
  });

  it("should still render the current publications controls and cards", async () => {
    const section = new PublicacoesSection("publicacoes-content");

    await section.render([
      {
        id: "ref_001",
        type: "article-journal",
        language: "pt-BR",
        authors: [
          {
            type: "person",
            family_name: "Silva",
            given_name: "Carolina",
          },
        ],
        title: "Análise prosódica",
        container: {
          type: "journal",
          title: "Revista de Linguística",
        },
        access: {
          url: "https://example.com/publicacao",
        },
        imprint: {
          date: "2024",
        },
      },
    ]);

    expect(document.getElementById("pub-search")).toBeTruthy();
    expect(document.querySelector(".statistics-panel")?.textContent).toContain(
      "1",
    );
    expect(document.querySelector(".publication-card")?.textContent).toContain(
      "Análise prosódica",
    );
  });
});

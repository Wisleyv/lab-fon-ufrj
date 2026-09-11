import { beforeEach, describe, expect, it } from "vitest";
import { LinhasPesquisaSection } from "../../src/js/sections/linhas-pesquisa.js";

describe("LinhasPesquisaSection", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="linhas-pesquisa-content"></div>';
  });

  const renderResearchLines = async (linhas) => {
    const section = new LinhasPesquisaSection("linhas-pesquisa-content");
    await section.render(linhas);
    return document.getElementById("linhas-pesquisa-content");
  };

  it("renders research lines in configured order as accordion controls", async () => {
    const container = await renderResearchLines([
      {
        id: "prosodia",
        nome: "Prosódia",
        descricao: "Descrição de prosódia.",
        ordem: 2,
      },
      {
        id: "fonetica",
        nome: "Fonética Experimental",
        descricao: "Descrição de fonética.",
        ordem: 1,
      },
    ]);

    const triggers = Array.from(
      container.querySelectorAll(".research-line-trigger"),
    );

    expect(triggers).toHaveLength(2);
    expect(triggers.map((trigger) => trigger.textContent.trim())).toEqual([
      "Fonética Experimental",
      "Prosódia",
    ]);
    expect(triggers.every((trigger) => trigger.tagName === "BUTTON")).toBe(
      true,
    );
  });

  it("associates descriptions with controls and toggles expanded state", async () => {
    const container = await renderResearchLines([
      {
        id: "fonetica",
        nome: "Fonética Experimental",
        descricao: "Descrição de fonética.",
        ordem: 1,
      },
    ]);

    const trigger = container.querySelector(".research-line-trigger");
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls"),
    );

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    expect(panel.getAttribute("aria-labelledby")).toBe(trigger.id);
    expect(panel.textContent).toContain("Descrição de fonética.");

    trigger.click();

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);

    trigger.click();

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
  });

  it("supports keyboard activation", async () => {
    const container = await renderResearchLines([
      {
        id: "fonetica",
        nome: "Fonética Experimental",
        descricao: "Descrição de fonética.",
        ordem: 1,
      },
    ]);

    const trigger = container.querySelector(".research-line-trigger");
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls"),
    );

    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);

    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    );

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
  });

  it("does not render researcher or student counts", async () => {
    const container = await renderResearchLines([
      {
        id: "fonetica",
        nome: "Fonética Experimental",
        descricao: "Descrição de fonética.",
        ordem: 1,
        estudantes: 12,
        pesquisadores: 7,
      },
    ]);

    expect(container.querySelector(".research-line-stats")).toBeNull();
    expect(container.querySelector(".research-stat")).toBeNull();
    expect(container.textContent).not.toContain("Estudante");
    expect(container.textContent).not.toContain("Pesquisador");
  });

  it("fails gracefully for empty or malformed research-line data", async () => {
    const emptyContainer = await renderResearchLines([]);

    expect(emptyContainer.querySelector(".empty")).not.toBeNull();
    expect(emptyContainer.textContent).toContain(
      "Nenhuma linha de pesquisa cadastrada.",
    );

    const malformedContainer = await renderResearchLines([
      {
        id: "sem-nome",
        descricao: "Sem nome configurado.",
        ordem: 1,
      },
    ]);

    expect(
      malformedContainer.querySelectorAll(".research-line-trigger"),
    ).toHaveLength(0);
  });
});

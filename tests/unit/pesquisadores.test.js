/**
 * Unit Tests for PesquisadoresSection
 * Tests alphabetical sorting and rendering logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PesquisadoresSection } from "../../src/js/sections/pesquisadores.js";
import { EQUIPE_CATEGORIES } from "../../src/js/sections/equipe-categories.js";
import fs from "node:fs/promises";
import { TEAM_PLACEHOLDER_URL, resolveTeamPhoto } from "../../src/js/sections/team-photo.js";

describe("PesquisadoresSection", () => {
  it("uses one shared placeholder for empty photos and failed legacy images without rewriting references", () => {
    const renderer = new PesquisadoresSection("unused");
    for (const foto of [undefined, "", "   "]) {
      const card = renderer.createMemberCard({ nome: "Test", foto });
      expect(card.querySelector("img").getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
      expect(card.querySelector("img").alt).toBe("");
    }
    for (const foto of ["assets/images/avatar.webp", "/assets/images/custom.jpg", "https://example.org/photo.png"]) {
      expect(resolveTeamPhoto(foto)).toBe(foto);
      const member = { nome: "Test", foto };
      const img = renderer.createMemberCard(member).querySelector("img");
      img.dispatchEvent(new Event("error"));
      expect(img.getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
      expect(member.foto).toBe(foto);
      img.dispatchEvent(new Event("error"));
      expect(img.getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
    }
  });
  let section;
  let container;

  beforeEach(() => {
    document.body.innerHTML = "";

    // Create a container element for testing
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    section = new PesquisadoresSection("test-container");
  });

  describe("Alphabetical Sorting", () => {
    it("renders the canonical founder first without changing identity or other categories", async () => {
      const files = await fs.readdir("content/equipe");
      const people = await Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await fs.readFile(`content/equipe/${file}`, "utf8"))));
      const founder = JSON.parse(await fs.readFile("content/equipe/joao-antonio-de-moraes.json", "utf8"));
      expect(founder).toMatchObject({ nome: "João Moraes", categoria: "docentes", badge: "Fundador", priority: 0, foto: "assets/images/avatar.webp", lattes: "http://lattes.cnpq.br/3799132338763925" });
      await section.render(people);
      const names = [...container.querySelectorAll("#categoria-docentes-panel .membro-nome")].map((node) => node.textContent);
      expect(names[0]).toBe("João Moraes");
      expect(names.slice(1)).toEqual(people.filter((person) => person.categoria === "docentes" && person !== people.find((p) => p.nome === founder.nome)).map((p) => p.nome).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })));
      expect(container.querySelectorAll(".membro-card")).toHaveLength(people.length);
      expect(container.querySelectorAll("#categoria-egressos-panel .membro-card")).toHaveLength(people.filter((p) => p.categoria === "egressos").length);
      container.querySelector("#categoria-docentes-trigger").click();
      expect(container.querySelector("#categoria-docentes-panel").hidden).toBe(false);
      for (const mode of ["grid", "list", "card"]) {
        section.switchView(mode);
        expect(container.querySelector(".membro-badge").textContent).toBe("Fundador");
        expect(container.querySelector(".membro-badge").hasAttribute("aria-hidden")).toBe(false);
      }
    });

    it("merges legacy founders once, orders priority ties in Portuguese and ignores priority outside Docentes", async () => {
      const people = [
        { nome: "Zélia", categoria: "fundador" },
        { nome: "Álvaro", categoria: "docentes", priority: 0, badge: '<img src=x onerror="alert(1)">' },
        { nome: "Bruna", categoria: "docentes" },
        { nome: "Ana", categoria: "docentes", priority: "0" },
        { nome: "Zeca", categoria: "egressos", priority: 0 },
        { nome: "Alice", categoria: "egressos", priority: 999 },
      ];
      await section.render(people);
      expect(container.querySelector("#categoria-fundador-trigger")).toBeNull();
      expect([...container.querySelectorAll("#categoria-docentes-panel .membro-nome")].map((e) => e.textContent)).toEqual(["Álvaro", "Zélia", "Ana", "Bruna"]);
      expect([...container.querySelectorAll("#categoria-egressos-panel .membro-nome")].map((e) => e.textContent)).toEqual(["Alice", "Zeca"]);
      expect(container.querySelectorAll(".membro-card")).toHaveLength(6);
      expect(container.querySelector(".membro-badge img")).toBeNull();
      expect(container.querySelectorAll(".membro-badge")[1].textContent).toBe("Fundador");
      expect(people[0].categoria).toBe("fundador");
    });
    it("should sort members alphabetically within each category", async () => {
      const testData = [
        { nome: "Zé Silva", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Ana Costa", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Maria Santos", categoria: "docentes", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const cards = container.querySelectorAll(".membro-nome");
      const names = Array.from(cards).map((card) => card.textContent);

      expect(names).toEqual(["Ana Costa", "Maria Santos", "Zé Silva"]);
    });

    it("should handle Portuguese special characters correctly", async () => {
      const testData = [
        { nome: "Ângela Ferreira", categoria: "egressos", instituicao: "UFPB" },
        { nome: "Andrea Silva", categoria: "egressos", instituicao: "UFPB" },
        { nome: "Álvaro Costa", categoria: "egressos", instituicao: "UFPB" },
        { nome: "Ana Maria", categoria: "egressos", instituicao: "UFPB" },
      ];

      await section.render(testData);

      const cards = container.querySelectorAll(".membro-nome");
      const names = Array.from(cards).map((card) => card.textContent);

      // localeCompare with sensitivity: 'base' treats á/a/â as equal base
      expect(names).toEqual([
        "Álvaro Costa",
        "Ana Maria",
        "Andrea Silva",
        "Ângela Ferreira",
      ]);
    });

    it("should sort case-insensitively", async () => {
      const testData = [
        { nome: "joão PEREIRA", categoria: "graduacao", instituicao: "UFRJ" },
        { nome: "José Santos", categoria: "graduacao", instituicao: "UFRJ" },
        { nome: "JULIA Costa", categoria: "graduacao", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const cards = container.querySelectorAll(".membro-nome");
      const names = Array.from(cards).map((card) => card.textContent);

      expect(names).toEqual(["joão PEREIRA", "José Santos", "JULIA Costa"]);
    });

    it("should maintain separate alphabetical order per category", async () => {
      const testData = [
        { nome: "Zé Silva", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Ana Costa", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Pedro Lima", categoria: "pos_graduacao", instituicao: "UFPB" },
        {
          nome: "Bruno Alves",
          categoria: "pos_graduacao",
          instituicao: "UFPB",
        },
      ];

      await section.render(testData);

      const docentesTrigger = container.querySelector(
        "#categoria-docentes-trigger",
      );
      docentesTrigger.click();
      const docentesSection = document.getElementById(
        docentesTrigger.getAttribute("aria-controls"),
      );
      const docentesNames = Array.from(
        docentesSection.querySelectorAll(".membro-nome"),
      ).map((card) => card.textContent);

      const posGradTrigger = container.querySelector(
        "#categoria-pos_graduacao-trigger",
      );
      posGradTrigger.click();
      const posGradSection = document.getElementById(
        posGradTrigger.getAttribute("aria-controls"),
      );
      const posGradNames = Array.from(
        posGradSection.querySelectorAll(".membro-nome"),
      ).map((card) => card.textContent);

      expect(docentesNames).toEqual(["Ana Costa", "Zé Silva"]);
      expect(posGradNames).toEqual(["Bruno Alves", "Pedro Lima"]);
    });

    it("should handle members with missing names gracefully", async () => {
      const testData = [
        { nome: "Maria Silva", categoria: "egressos", instituicao: "UFRJ" },
        { nome: "", categoria: "egressos", instituicao: "UFRJ" },
        { nome: "Ana Costa", categoria: "egressos", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const cards = container.querySelectorAll(".membro-nome");
      expect(cards.length).toBe(3); // All cards should render
    });
  });

  describe("Data Integrity", () => {
    it("should not mutate the original data array", async () => {
      const testData = [
        { nome: "Zé Silva", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Ana Costa", categoria: "docentes", instituicao: "UFRJ" },
      ];

      const originalOrder = testData.map((m) => m.nome);

      await section.render(testData);

      const currentOrder = testData.map((m) => m.nome);
      expect(currentOrder).toEqual(originalOrder);
    });
  });

  describe("Current Section Behavior", () => {
    it("should still render the Egressos subsection", async () => {
      const testData = [
        { nome: "Pessoa Egressa", categoria: "egressos", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const egressosTrigger = container.querySelector(
        "#categoria-egressos-trigger",
      );
      expect(egressosTrigger?.textContent).toContain("Egressos");
      egressosTrigger.click();

      expect(container.querySelector(".membro-nome")?.textContent).toBe(
        "Pessoa Egressa",
      );
    });
  });

  describe("Category Accordion", () => {
    it("renders categories as accordion controls with associated panels", async () => {
      const testData = [
        { nome: "Docente Um", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Egressa Um", categoria: "egressos", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const triggers = container.querySelectorAll(".equipe-category-trigger");

      expect(triggers).toHaveLength(2);
      expect(triggers[0].tagName).toBe("BUTTON");
      expect(triggers[0].getAttribute("aria-expanded")).toBe("false");

      const panel = document.getElementById(
        triggers[0].getAttribute("aria-controls"),
      );
      expect(panel.hidden).toBe(true);
      expect(panel.getAttribute("aria-labelledby")).toBe(triggers[0].id);
    });

    it("toggles expanded state by click and keyboard activation", async () => {
      const testData = [
        { nome: "Docente Um", categoria: "docentes", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const trigger = container.querySelector(".equipe-category-trigger");
      const panel = document.getElementById(
        trigger.getAttribute("aria-controls"),
      );

      trigger.click();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(panel.hidden).toBe(false);

      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: " ", bubbles: true }),
      );
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(panel.hidden).toBe(true);

      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(panel.hidden).toBe(false);
    });

    it("keeps member information intact inside its category", async () => {
      const testData = [
        {
          nome: "Docente Um",
          categoria: "docentes",
          instituicao: "UFRJ",
          lattes: "https://lattes.cnpq.br/123",
          foto: "/foto.jpg",
        },
      ];

      await section.render(testData);

      const trigger = container.querySelector("#categoria-docentes-trigger");
      trigger.click();

      expect(container.querySelector(".membro-nome")?.textContent).toBe(
        "Docente Um",
      );
      expect(container.querySelector(".membro-instituicao")?.textContent).toBe(
        "UFRJ",
      );
      expect(
        container.querySelector(".membro-foto img")?.getAttribute("src"),
      ).toBe("/foto.jpg");
      expect(container.querySelector(".btn-lattes")?.getAttribute("href")).toBe(
        "https://lattes.cnpq.br/123",
      );
    });

    it("orders rendered categories by structured configuration", async () => {
      const testData = [
        { nome: "Graduanda Um", categoria: "graduacao", instituicao: "UFRJ" },
        { nome: "Docente Um", categoria: "docentes", instituicao: "UFRJ" },
        { nome: "Egressa Um", categoria: "egressos", instituicao: "UFRJ" },
      ];

      await section.render(testData);

      const renderedTitles = Array.from(
        container.querySelectorAll(".equipe-category-title-text"),
      ).map((title) => title.textContent);
      const configuredOrder = EQUIPE_CATEGORIES.filter((category) =>
        ["docentes", "egressos", "graduacao"].includes(category.id),
      )
        .sort((a, b) => a.order - b.order)
        .map((category) => category.title);

      expect(renderedTitles).toEqual(configuredOrder);
    });

    it("renders legacy or unknown categories safely", async () => {
      const testData = [
        {
          nome: "Pessoa Sem Grupo",
          categoria: "visitantes",
          instituicao: "UFRJ",
        },
      ];

      await section.render(testData);

      const trigger = container.querySelector(".equipe-category-trigger");
      expect(trigger.textContent).toContain("visitantes");

      trigger.click();
      expect(container.querySelector(".membro-nome")?.textContent).toBe(
        "Pessoa Sem Grupo",
      );
    });
  });
});

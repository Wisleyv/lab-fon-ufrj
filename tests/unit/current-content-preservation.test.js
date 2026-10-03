import fs from "fs";
import { describe, expect, it } from "vitest";
import { EQUIPE_CATEGORIES } from "../../src/js/sections/equipe-categories.js";

describe("Example Content Contracts", () => {
  it("keeps Publicações present but disabled in the release composition", () => {
    const page = JSON.parse(fs.readFileSync("examples/content/page.json", "utf8"));
    const publicacoes = page.sections.find(
      (section) => section.type === "publicacoes",
    );

    expect(publicacoes).toMatchObject({
      id: "publicacoes",
      enabled: false,
    });
  });

  it("keeps the Egressos category available using a synthetic member", () => {
    const files = fs.readdirSync("examples/content/equipe");
    const members = files
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        JSON.parse(fs.readFileSync(`examples/content/equipe/${file}`, "utf8")),
      );

    expect(EQUIPE_CATEGORIES.some((category) => category.id === "egressos")).toBe(true);
    expect(members.some((member) => member.categoria === "egressos")).toBe(true);
  });

  it("represents active PROVALE content within the Extensão model", () => {
    const page = JSON.parse(fs.readFileSync("examples/content/page.json", "utf8"));
    const extensao = JSON.parse(
      fs.readFileSync("examples/content/extensao.json", "utf8"),
    );

    expect(
      page.sections.find((section) => section.type === "extension"),
    ).toMatchObject({
      id: "extensao",
      enabled: true,
      navigation: {
        label: "Extensão",
      },
    });
    expect(
      page.sections.some((section) => section.type === "provale_extensao"),
    ).toBe(false);
    expect(extensao.projects[0].projectType).toBe("Projeto de Extensão");
    expect(extensao.projects[0].title).toBe("Projeto de Extensão de Exemplo");
    expect(extensao.projects[0].instagram).toEqual({
      enabled: true,
      source: "https://www.instagram.com/example/",
      provider: "instagram",
    });
  });
});

import fs from "fs";
import { describe, expect, it } from "vitest";

describe("Current Content Preservation", () => {
  it("keeps Publicações present but disabled in the release composition", () => {
    const page = JSON.parse(fs.readFileSync("content/page.json", "utf8"));
    const publicacoes = page.sections.find(
      (section) => section.type === "publicacoes",
    );

    expect(publicacoes).toMatchObject({
      id: "publicacoes",
      enabled: false,
    });
  });

  it("keeps Egressos present in the team content", () => {
    const files = fs.readdirSync("content/equipe");
    const members = files
      .filter((file) => file.endsWith(".json"))
      .map((file) =>
        JSON.parse(fs.readFileSync(`content/equipe/${file}`, "utf8")),
      );

    expect(members.some((member) => member.categoria === "egressos")).toBe(
      true,
    );
  });

  it("represents active PROVALE content within the Extensão model", () => {
    const page = JSON.parse(fs.readFileSync("content/page.json", "utf8"));
    const extensao = JSON.parse(
      fs.readFileSync("content/extensao.json", "utf8"),
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
    expect(extensao.projects[0].title).toBe("PROVALE em Extensão");
    expect(extensao.projects[0].instagram).toEqual({
      enabled: true,
      source: "https://www.instagram.com/provaleinterinstitucional/",
      provider: "instagram",
    });
  });
});

import fs from "fs";
import { describe, expect, it } from "vitest";

describe("Current Content Preservation", () => {
  it("keeps Publicações present in the canonical page composition", () => {
    const page = JSON.parse(fs.readFileSync("content/page.json", "utf8"));
    const publicacoes = page.sections.find(
      (section) => section.type === "publicacoes",
    );

    expect(publicacoes).toMatchObject({
      id: "publicacoes",
      enabled: true,
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

  it("represents PROVALE as content within the Extensão model", () => {
    const page = JSON.parse(fs.readFileSync("content/page.json", "utf8"));
    const extensao = JSON.parse(
      fs.readFileSync("content/extensao.json", "utf8"),
    );

    expect(
      page.sections.find((section) => section.type === "extension"),
    ).toMatchObject({
      id: "extensao",
      enabled: false,
      navigation: {
        label: "Extensão",
      },
    });
    expect(
      page.sections.some((section) => section.type === "provale_extensao"),
    ).toBe(false);
    expect(extensao.projects[0].projectType).toBe("Projeto de Extensão");
    expect(extensao.projects[0].title).toBe("PROVALE em Extensão");
  });
});

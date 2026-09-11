import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { consolidateData } from "../../scripts/build-data.js";

let tempRoot = null;

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function createTempContent() {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "labfon-build-data-"));
  const contentDir = path.join(tempRoot, "content");

  writeJson(path.join(contentDir, "equipe", "member.json"), {
    nome: "Pessoa Egressa",
    instituicao: "UFRJ",
    categoria: "egressos",
  });
  writeJson(path.join(contentDir, "linhas", "linha.json"), {
    id: "linha",
    nome: "Linha",
    ordem: 1,
  });
  writeJson(path.join(contentDir, "parcerias", "parceria.json"), {
    nome: "CAPES",
  });
  writeJson(path.join(contentDir, "publicacoes", "publicacao.json"), {
    title: "Publicação preservada",
    year: 2024,
  });
  writeJson(path.join(contentDir, "extensao.json"), {
    projects: [
      {
        id: "provale-em-extensao",
        title: "PROVALE em Extensão",
        minibio: "Projeto de extensão em teste.",
      },
    ],
  });
  writeJson(path.join(contentDir, "site.json"), {
    hero: {
      title: "Hero estruturado",
      description: "Texto do Hero vindo do conteúdo.",
    },
    sobre: {
      title: "Sobre estruturado",
      paragraphs: ["Primeiro parágrafo.", "Segundo parágrafo."],
    },
    footer: {
      sections: [
        {
          title: "Rodapé estruturado",
          lines: ["Linha institucional"],
        },
      ],
      coordination: {
        lab: [],
        extensionProject: [],
      },
    },
  });
  writeJson(path.join(contentDir, "page.json"), {
    kind: "single-page",
    sections: [
      {
        id: "parcerias",
        type: "parcerias",
        enabled: true,
        order: 1,
      },
      {
        id: "publicacoes",
        type: "publicacoes",
        enabled: true,
        order: 2,
      },
      {
        id: "pesquisadores",
        type: "equipe",
        enabled: true,
        order: 3,
      },
    ],
  });

  return {
    contentDir,
    outputFile: path.join(tempRoot, "public", "data.json"),
  };
}

describe("build-data", () => {
  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  it("loads canonical page composition from structured content", () => {
    const { contentDir, outputFile } = createTempContent();

    const data = consolidateData({ contentDir, outputFile });
    const written = JSON.parse(fs.readFileSync(outputFile, "utf8"));

    expect(data.page.sections.map((section) => section.type)).toEqual([
      "parcerias",
      "publicacoes",
      "equipe",
    ]);
    expect(written.page.sections[1]).toEqual({
      id: "publicacoes",
      type: "publicacoes",
      enabled: true,
      order: 2,
    });
    expect(written.equipe[0].categoria).toBe("egressos");
    expect(written.extensao.projects[0].title).toBe("PROVALE em Extensão");
    expect(written.site.hero.title).toBe("Hero estruturado");
    expect(written.site.sobre.paragraphs).toEqual([
      "Primeiro parágrafo.",
      "Segundo parágrafo.",
    ]);
    expect(written.site.footer.sections[0].title).toBe("Rodapé estruturado");
  });

  it("falls back to default page composition when structured content is missing", () => {
    const { contentDir, outputFile } = createTempContent();
    fs.rmSync(path.join(contentDir, "page.json"));

    const data = consolidateData({ contentDir, outputFile });

    expect(data.page.sections.map((section) => section.type)).toEqual([
      "sobre",
      "linhas_pesquisa",
      "equipe",
      "publicacoes",
      "extension",
      "parcerias",
    ]);
    expect(
      data.page.sections.find((section) => section.type === "extension"),
    ).toMatchObject({
      enabled: false,
      navigation: {
        visible: true,
        label: "Extensão",
      },
    });
  });
});

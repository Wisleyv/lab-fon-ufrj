import { beforeEach, describe, expect, it } from "vitest";
import { ExtensaoSection } from "../../src/js/sections/extensao.js";

describe("ExtensaoSection", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="extensao-content"></div>';
  });

  it("renders PROVALE as project content inside Extensão", async () => {
    const section = new ExtensaoSection("extensao-content");

    await section.render({
      projects: [
        {
          id: "provale-em-extensao",
          projectType: "Projeto de Extensão",
          title: "PROVALE em Extensão",
          minibio: "Minibio estruturada do projeto.",
          instagram: {
            enabled: true,
            source: "provale-source",
            provider: "mock-provider",
          },
        },
      ],
    });

    expect(
      document.querySelector(".extension-project-title")?.textContent,
    ).toBe("PROVALE em Extensão");
    expect(document.querySelector(".extension-project-type")?.textContent).toBe(
      "Projeto de Extensão",
    );
    expect(
      document.querySelector(".extension-project-minibio")?.textContent,
    ).toBe("Minibio estruturada do projeto.");
    expect(document.querySelector(".extension-instagram-feed")).toBeTruthy();
  });

  it("renders the minibio and feed region when Instagram is unconfigured", async () => {
    const section = new ExtensaoSection("extensao-content");

    await section.render({
      projects: [
        {
          id: "provale-em-extensao",
          title: "PROVALE em Extensão",
          minibio: "Minibio preservada sem feed.",
          instagram: {
            enabled: false,
            source: null,
            provider: null,
          },
        },
      ],
    });

    expect(
      document.querySelector(".extension-project-minibio")?.textContent,
    ).toBe("Minibio preservada sem feed.");
    expect(
      document.querySelector(".extension-feed-empty")?.textContent,
    ).toContain("não configurado");
  });
});

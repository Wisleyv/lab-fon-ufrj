import { beforeEach, describe, expect, it } from "vitest";
import { ExtensaoSection } from "../../src/js/sections/extensao.js";
import fs from "node:fs";
import { renderCompositionPreview } from "../../src/js/editor/composition-preview.js";

describe("ExtensaoSection", () => {
  it("uses the content width and confines the provider's readable minimum width to a local scroller", () => {
    const css = fs.readFileSync("src/css/main.css", "utf8");
    const rule = (selector) => css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    const wrapper = rule(".extension-instagram-embed");
    expect(wrapper).toContain("overflow-x: auto");
    expect(wrapper).toContain("overscroll-behavior-x: contain");
    expect(wrapper).toContain("width: 100%");
    expect(wrapper).toContain("min-width: 0");
    expect(wrapper).not.toContain("max-width:");
    const provider = rule(".extension-instagram-embed .instagram-media");
    expect(provider).toContain("min-width: 720px !important");
    expect(provider).toContain("width: 100% !important");
    expect(provider).toContain("max-width: 900px !important");
    expect(provider).toContain("margin: 0 auto !important");
    expect(rule(".extension-instagram-embed:focus-visible")).toContain("outline:");
    expect(rule(".extension-instagram-feed")).toContain("text-align: center");
  });

  it("names the public embed scroll area and makes it keyboard focusable without changing provider content", () => {
    const section = new ExtensaoSection("extensao-content", { allowInstagram: true });
    const feed = section.createInstagramFeed({ enabled: true, provider: "instagram", source: "https://www.instagram.com/provaleinterinstitucional/" }, "provale");
    const slot = feed.querySelector(".extension-instagram-embed");
    expect(slot.tabIndex).toBe(0);
    expect(slot.getAttribute("role")).toBe("group");
    expect(slot.getAttribute("aria-label")).toBe("Publicações do PROVALE no Instagram");
    expect(slot.querySelectorAll("blockquote.instagram-media")).toHaveLength(1);
    expect(feed.querySelector("a").href).toBe("https://www.instagram.com/provaleinterinstitucional/");
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="extensao-content"></div>';
  });

  it("preserves the supplied paragraph verbatim in a production-composition preview", async () => {
    const extension = JSON.parse(fs.readFileSync("content/extensao.json", "utf8"));
    const supplied = fs.readFileSync("docs/update_site_labfon.md", "utf8")
      .split(/\r?\n/).find((line) => line.startsWith("O projeto Prosódia, Variação e Ensino,"));
    expect(supplied).toBeTruthy();
    expect(extension.projects[0].minibio).toBe(supplied);
    const composition = JSON.parse(fs.readFileSync("content/page.json", "utf8"));
    composition.sections.forEach((section) => {
      section.enabled = section.type === "extension";
    });
    document.body.innerHTML = '<div id="preview"></div>';
    await renderCompositionPreview({ documentRef: document, container: document.querySelector("#preview"), composition, previewData: { site: { extensao: extension } } });
    expect(document.querySelector("#extensao .extension-project-minibio").textContent).toBe(supplied);
    expect(document.querySelector(".extension-project-type").textContent).toBe("Projeto de Extensão");
    expect(document.querySelector(".extension-empty-text")).toBeNull();
    expect([...document.querySelectorAll("nav a")].map((a) => a.textContent)).toEqual(["Extensão", "Contato"]);
  });

  it("does not execute presentation markup", async () => {
    await new ExtensaoSection("extensao-content").render({ projects: [{ id: "safe", title: "Projeto", minibio: '<img src=x onerror="alert(1)">Texto' }] });
    expect(document.querySelector(".extension-project-minibio img")).toBeNull();
    expect(document.querySelector(".extension-project-minibio").textContent).toContain("Texto");
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

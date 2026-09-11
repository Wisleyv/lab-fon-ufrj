import { beforeEach, describe, expect, it } from "vitest";
import { applySiteContent } from "../../src/js/site-content.js";

describe("site content binding", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <picture>
        <source data-site-logo-source>
        <img data-site-logo-image>
      </picture>
      <h1 data-site-header-title></h1>
      <p data-site-header-subtitle></p>
      <section class="hero">
        <h2 data-site-hero-title></h2>
        <p data-site-hero-description></p>
        <div data-site-hero-actions></div>
      </section>
      <section id="sobre">
        <h2 data-site-sobre-title></h2>
        <div data-site-sobre-content></div>
      </section>
      <footer>
        <div data-site-footer-content></div>
        <p data-site-footer-bottom></p>
      </footer>
    `;
  });

  it("sources Hero editable content from structured data", () => {
    applySiteContent(document, {
      hero: {
        title: "Título do Hero",
        description: "Texto de apoio do Hero.",
        actions: [
          { label: "Equipe", href: "#pesquisadores", style: "primary" },
          { label: "Contato", href: "#contato", style: "secondary" },
        ],
      },
    });

    expect(document.querySelector("[data-site-hero-title]").textContent).toBe(
      "Título do Hero",
    );
    expect(
      document.querySelector("[data-site-hero-description]").textContent,
    ).toBe("Texto de apoio do Hero.");

    const actions = document.querySelectorAll("[data-site-hero-actions] a");
    expect(actions).toHaveLength(2);
    expect(actions[0].textContent).toBe("Equipe");
    expect(actions[0].getAttribute("href")).toBe("#pesquisadores");
    expect(actions[0].className).toContain("btn-primary");
  });

  it("omits hero actions that point to hidden composition sections", () => {
    applySiteContent(
      document,
      {
        hero: {
          title: "Título do Hero",
          description: "Texto de apoio do Hero.",
          actions: [
            { label: "Equipe", href: "#pesquisadores", style: "primary" },
            { label: "Publicações", href: "#trabalhos", style: "secondary" },
            { label: "Contato", href: "#contato", style: "secondary" },
          ],
        },
      },
      {
        visibleSectionAnchors: new Set(["#pesquisadores", "#contato"]),
      },
    );

    const actions = Array.from(
      document.querySelectorAll("[data-site-hero-actions] a"),
    );

    expect(actions.map((action) => action.textContent)).toEqual([
      "Equipe",
      "Contato",
    ]);
    expect(actions.map((action) => action.getAttribute("href"))).toEqual([
      "#pesquisadores",
      "#contato",
    ]);
  });

  it("sources Sobre content from structured data and preserves paragraph order", () => {
    applySiteContent(document, {
      sobre: {
        title: "Sobre o Laboratório",
        paragraphs: [
          "Primeiro parágrafo.",
          "Segundo parágrafo.",
          { label: "Missão:", text: "Terceiro parágrafo." },
        ],
      },
    });

    const paragraphs = Array.from(
      document.querySelectorAll("[data-site-sobre-content] p"),
    );

    expect(document.querySelector("[data-site-sobre-title]").textContent).toBe(
      "Sobre o Laboratório",
    );
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "Primeiro parágrafo.",
      "Segundo parágrafo.",
      "Missão: Terceiro parágrafo.",
    ]);
    expect(paragraphs[2].querySelector("strong").textContent).toBe("Missão:");
  });

  it("sources footer institutional metadata from structured data", () => {
    applySiteContent(document, {
      footer: {
        sections: [
          {
            title: "Laboratório de Fonética Acústica UFRJ",
            lines: ["Faculdade de Letras - UFRJ", "Rio de Janeiro - RJ"],
          },
          {
            title: "Contato",
            contacts: [
              {
                label: "Email",
                href: "mailto:labfonac@posvernaculas.letras.ufrj.br",
                text: "labfonac@posvernaculas.letras.ufrj.br",
              },
            ],
          },
          {
            title: "Links Úteis",
            links: [{ label: "UFRJ", href: "https://ufrj.br" }],
          },
        ],
        institutionalCredits: [
          { label: "CNPq", name: "" },
          { label: "UFRJ", name: "Universidade Federal do Rio de Janeiro" },
        ],
        coordination: {
          lab: [],
          extensionProject: [],
        },
        bottomText: "© 2025 Laboratório de Fonética Acústica | UFRJ.",
      },
    });

    expect(document.querySelectorAll(".footer-section")).toHaveLength(3);
    expect(document.querySelector(".footer-section").textContent).toContain(
      "Faculdade de Letras - UFRJ",
    );
    expect(
      document.querySelector(".footer-section a")?.getAttribute("href"),
    ).toBe("mailto:labfonac@posvernaculas.letras.ufrj.br");
    expect(
      document.querySelector("[data-site-footer-bottom]").textContent,
    ).toBe("© 2025 Laboratório de Fonética Acústica | UFRJ.");
  });

  it("handles missing optional footer fields gracefully", () => {
    applySiteContent(document, {
      footer: {
        sections: [
          {
            title: "Créditos",
          },
        ],
      },
    });

    expect(document.querySelector(".footer-section h3").textContent).toBe(
      "Créditos",
    );
    expect(
      document.querySelector("[data-site-footer-bottom]").textContent,
    ).toBe("");
  });

  it("resolves logo sources and resolution variants below the deployment base", () => {
    applySiteContent(document, { header: { logo: { source: "/assets/logo.svg", fallback: "/assets/logo.png", srcset: "/assets/logo.png 1x, /assets/logo-2x.png 2x" } } }, { assetBase: "/labfonac/" });
    expect(document.querySelector("[data-site-logo-source]").getAttribute("srcset")).toBe("/labfonac/assets/logo.svg");
    expect(document.querySelector("[data-site-logo-image]").getAttribute("src")).toBe("/labfonac/assets/logo.png");
    expect(document.querySelector("[data-site-logo-image]").getAttribute("srcset")).toBe("/labfonac/assets/logo.png 1x, /labfonac/assets/logo-2x.png 2x");
  });

  it("sources header logo metadata from structured data", () => {
    applySiteContent(document, {
      header: {
        logo: {
          source: "/assets/images/logo.svg",
          fallback: "/assets/images/logo.png",
          srcset: "/assets/images/logo.png 1x",
          alt: "Logo institucional",
        },
        title: "Laboratório",
        subtitle: "UFRJ",
      },
    });

    expect(
      document.querySelector("[data-site-logo-source]").getAttribute("srcset"),
    ).toBe("/assets/images/logo.svg");
    expect(
      document.querySelector("[data-site-logo-image]").getAttribute("src"),
    ).toBe("/assets/images/logo.png");
    expect(
      document.querySelector("[data-site-logo-image]").getAttribute("alt"),
    ).toBe("Logo institucional");
    expect(document.querySelector("[data-site-header-title]").textContent).toBe(
      "Laboratório",
    );
  });
});

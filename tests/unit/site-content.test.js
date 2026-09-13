import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySiteContent } from "../../src/js/site-content.js";
import fs from "node:fs";

describe("site content binding", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 6, 1));
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

  it("binds canonical coordination as the fourth column and credits outside the columns", () => {
    const site = JSON.parse(fs.readFileSync("content/site.json", "utf8"));
    applySiteContent(document, site);
    const columns = document.querySelector("[data-site-footer-content]");
    expect(columns.children).toHaveLength(4);
    expect(columns.lastElementChild.classList.contains("footer-coordination")).toBe(true);
    expect([...columns.querySelectorAll(".footer-coordination-group")].map((group) => [...group.querySelectorAll("li")].map((li) => li.textContent))).toEqual([
      ["João Moraes", "Manuella Carnaval"],
      ["Carolina Gomes da Silva", "Manuella Carnaval", "Juliana Dias"],
    ]);
    expect([...document.querySelectorAll(".footer-credits li")].map((li) => li.textContent)).toEqual(["LabFonAc-UFRJ", "PPGLEV", "UFRJ"]);
    expect(document.querySelector("footer").textContent).not.toMatch(/CNPq|Conselho Nacional de Desenvolvimento/);
    expect(columns.contains(document.querySelector(".footer-credits"))).toBe(false);
    expect(document.querySelector("[data-site-footer-bottom]").textContent).toBe(site.footer.bottomText.replace("© ", "© 2025 "));
  });

  it.each([2025, 2026, 2031])("calculates the copyright range at render time in %i, including legacy literals", (year) => {
    vi.setSystemTime(new Date(year, 6, 1));
    const wording = "Laboratório de Fonética Acústica | UFRJ. Todos os direitos reservados.";
    for (const prefix of ["© ", "© 2025 ", "© 2026 ", "© 2025–2026 "]) {
      const site = { footer: { bottomText: prefix + wording } };
      applySiteContent(document, site);
      expect(document.querySelector("[data-site-footer-bottom]").textContent).toBe(`© ${year === 2025 ? "2025" : `2025–${year}`} ${wording}`);
      expect(site.footer.bottomText).toBe(prefix + wording);
    }
  });

  it("preserves custom bottom wording and renders safe linked or name-only legacy credits", () => {
    applySiteContent(document, { footer: { bottomText: "Arquivo 2020", institutionalCredits: [
      { label: "UFRJ", name: "Expanded name", href: "https://ufrj.br" },
      { name: "Legacy name" }, { label: "Unsafe", href: "javascript:alert(1)" },
    ] } });
    expect(document.querySelector("[data-site-footer-bottom]").textContent).toBe("Arquivo 2020");
    expect([...document.querySelectorAll(".footer-credits li")].map((li) => li.textContent)).toEqual(["UFRJ", "Legacy name", "Unsafe"]);
    expect(document.querySelector(".footer-credits a").getAttribute("href")).toBe("https://ufrj.br/");
    expect(document.querySelectorAll(".footer-credits a")).toHaveLength(1);
  });

  it("rebinds without duplicates and removes absent optional groups on older data", () => {
    const site = JSON.parse(fs.readFileSync("content/site.json", "utf8"));
    applySiteContent(document, site);
    applySiteContent(document, site);
    expect(document.querySelectorAll(".footer-coordination")).toHaveLength(1);
    expect(document.querySelectorAll(".footer-credits")).toHaveLength(1);
    delete site.footer.coordination;
    delete site.footer.institutionalCredits;
    applySiteContent(document, site);
    expect(document.querySelectorAll(".footer-section")).toHaveLength(3);
    expect(document.querySelector(".footer-coordination, .footer-credits, .has-coordination")).toBeNull();
  });

  it("skips empty or malformed optional values without empty headings", () => {
    for (const coordination of [undefined, null, {}, { lab: null, extensionProject: [null, {}, { name: " " }] }]) {
      applySiteContent(document, { footer: { sections: [], coordination, institutionalCredits: [null, {}, { label: " ", name: "" }] } });
      expect(document.querySelector("footer h3, footer h4, .footer-credits")).toBeNull();
    }
  });

  it("renders optional text safely while preserving existing contact and link filtering", () => {
    const unsafe = '<img src=x onerror="alert(1)">';
    applySiteContent(document, { footer: {
      sections: [{ title: "Links", links: [{ label: "Hidden", href: "#trabalhos" }, { label: "Unsafe", href: "javascript:alert(1)" }, { label: "Contato", href: "#contato" }] }],
      coordination: { lab: [{ name: unsafe, role: "Coordenação", institution: "UFRJ" }] },
      institutionalCredits: [{ label: unsafe, name: "Instituição" }],
    } }, { visibleSectionAnchors: new Set(["#contato"]) });
    expect(document.querySelector("footer img, footer script")).toBeNull();
    expect(document.querySelector(".footer-coordination li").textContent).toBe(`${unsafe} - Coordenação - UFRJ`);
    expect(document.querySelector("a[href='#trabalhos'], a[href^='javascript:']")).toBeNull();
    expect(document.querySelector("a[href='#contato']")).not.toBeNull();
    expect(document.querySelectorAll(".footer-coordination-group")).toHaveLength(1);
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

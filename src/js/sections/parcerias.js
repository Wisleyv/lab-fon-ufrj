/**
 * Parcerias Section Renderer
 * Renders institutional partnerships with clean typography
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";

export class ParceriasSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: "Carregando parcerias...",
      errorMessage: "Erro ao carregar parcerias.",
      emptyMessage: "Nenhuma parceria cadastrada.",
      ...options,
    });

    // Partnership type configuration for visual organization
    this.tipos = {
      universidade: { label: "Instituição de Ensino", order: 1 },
      "agencia-fomento": { label: "Agência de Fomento", order: 2 },
      internacional: { label: "Parceria Internacional", order: 3 },
    };
  }

  /**
   * Creates the HTML template for partnerships
   * @param {Array} parcerias - Array of partnership objects
   * @returns {DocumentFragment} Fragment containing all elements
   */
  template(parcerias) {
    if (!Array.isArray(parcerias)) {
      console.error("Expected array of parcerias");
      return document.createDocumentFragment();
    }

    const fragment = document.createDocumentFragment();

    // Create partnership cards
    parcerias.forEach((parceria) => {
      const card = this.createPartnerCard(parceria);
      fragment.appendChild(card);
    });

    return fragment;
  }

  /**
   * Creates a partnership card element
   * @param {Object} parceria - Partnership data
   * @returns {HTMLElement} Partnership card element
   */
  createPartnerCard(parceria) {
    const card = createElement("article", {
      className: "parceria-card",
      attributes: {
        "data-tipo": parceria.tipo || "parceria",
      },
    });

    // Institution name and acronym
    const header = createElement("div", { className: "parceria-header" });
    
    const nameWrapper = createElement("div", { className: "parceria-name-wrapper" });
    
    const name = createElement("h3", {
      className: "parceria-nome",
      textContent: HTMLSanitizer.sanitize(parceria.nome),
    });
    nameWrapper.appendChild(name);

    if (parceria.sigla) {
      const sigla = createElement("span", {
        className: "parceria-sigla",
        textContent: HTMLSanitizer.sanitize(parceria.sigla),
      });
      nameWrapper.appendChild(sigla);
    }

    header.appendChild(nameWrapper);

    // Location
    if (parceria.localizacao) {
      const localizacao = createElement("p", {
        className: "parceria-localizacao",
        innerHTML: `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${HTMLSanitizer.sanitize(parceria.localizacao)}`,
      });
      header.appendChild(localizacao);
    }

    card.appendChild(header);

    // Description
    if (parceria.descricao) {
      const descricao = createElement("p", {
        className: "parceria-descricao",
        textContent: HTMLSanitizer.sanitize(parceria.descricao),
      });
      card.appendChild(descricao);
    }

    // Link to institution website
    if (parceria.url) {
      const linkWrapper = createElement("div", { className: "parceria-link-wrapper" });
      const link = createElement("a", {
        className: "parceria-link",
        href: HTMLSanitizer.sanitizeURL(parceria.url),
        target: "_blank",
        rel: "noopener noreferrer",
        innerHTML: `Visitar website <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>`,
      });
      link.setAttribute("aria-label", `Visitar website de ${parceria.nome}`);
      linkWrapper.appendChild(link);
      card.appendChild(linkWrapper);
    }

    return card;
  }

  /**
   * Optional post-render hook for additional functionality
   */
  afterRender() {
    // Add live region announcement for screen readers
    const container = document.getElementById(this.containerId);
    if (container) {
      const count = container.querySelectorAll(".parceria-card").length;
      this.announce(`${count} ${count === 1 ? "parceria carregada" : "parcerias carregadas"}`);
    }
  }

  /**
   * Announce content changes to screen readers
   * @param {string} message - Message to announce
   */
  announce(message) {
    const liveRegion = document.getElementById("aria-live-region");
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
}

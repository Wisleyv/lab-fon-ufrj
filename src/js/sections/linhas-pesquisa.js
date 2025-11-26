/**
 * Linhas de Pesquisa Section Renderer
 * Renders research lines with icons, titles, descriptions, and statistics
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";

export class LinhasPesquisaSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: "Carregando linhas de pesquisa...",
      errorMessage: "Erro ao carregar linhas de pesquisa.",
      emptyMessage: "Nenhuma linha de pesquisa cadastrada.",
      ...options,
    });
  }

  /**
   * Creates the HTML template for research lines
   * @param {Array} linhas - Array of research line objects
   * @returns {DocumentFragment} Fragment containing all research line cards
   */
  template(linhas) {
    if (!Array.isArray(linhas)) {
      console.error("Expected array of linhas_pesquisa");
      return document.createDocumentFragment();
    }

    if (linhas.length === 0) {
      return this.createEmptyState();
    }

    const fragment = document.createDocumentFragment();

    // Sort research lines by ordem field
    const sortedLinhas = [...linhas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Create a card for each research line
    sortedLinhas.forEach((linha) => {
      const card = this.createResearchLineCard(linha);
      fragment.appendChild(card);
    });

    return fragment;
  }

  /**
   * Creates a single research line card
   * @param {Object} linha - Research line data object
   * @returns {HTMLElement} Research line card element
   */
  createResearchLineCard(linha) {
    // Validate required fields
    if (!linha.nome) {
      console.warn("Research line missing nome field:", linha);
      return createElement("div");
    }

    // Create card container
    const card = createElement("div", { className: "research-line" });

    // Create icon circle
    const iconContainer = createElement("div", { className: "research-line-icon" });
    const icon = createElement("i", {
      className: HTMLSanitizer.sanitize(linha.icon || "fa-solid fa-flask"),
      "aria-hidden": "true",
    });
    iconContainer.appendChild(icon);
    card.appendChild(iconContainer);

    // Create content area (title + description)
    const content = createElement("div", { className: "research-line-content" });

    // Title
    const header = createElement("div", { className: "research-line-header" });
    const title = createElement("h3", {
      className: "research-line-title",
    });
    title.textContent = HTMLSanitizer.sanitize(linha.nome);
    header.appendChild(title);
    content.appendChild(header);

    // Description (if available and not placeholder)
    if (linha.descricao && !linha.descricao.startsWith("[")) {
      const description = createElement("p", {
        className: "research-line-description",
      });
      description.textContent = HTMLSanitizer.sanitize(linha.descricao);
      content.appendChild(description);
    }

    card.appendChild(content);

    // Create stats area (students + researchers)
    const stats = createElement("div", { className: "research-line-stats" });

    // Students stat
    const studentStat = this.createStatElement(
      linha.estudantes || 0,
      linha.estudantes === 1 ? "Estudante" : "Estudantes"
    );
    stats.appendChild(studentStat);

    // Researchers stat
    const researcherStat = this.createStatElement(
      linha.pesquisadores || 0,
      linha.pesquisadores === 1 ? "Pesquisador" : "Pesquisadores"
    );
    stats.appendChild(researcherStat);

    card.appendChild(stats);

    return card;
  }

  /**
   * Creates a stat element (number + label)
   * @param {number} number - The statistic number
   * @param {string} label - The label for the statistic
   * @returns {HTMLElement} Stat element
   */
  createStatElement(number, label) {
    const stat = createElement("div", { className: "research-stat" });

    const numberEl = createElement("div", {
      className: "research-stat-number",
    });
    numberEl.textContent = number.toString();

    const labelEl = createElement("div", {
      className: "research-stat-label",
    });
    labelEl.textContent = label;

    stat.appendChild(numberEl);
    stat.appendChild(labelEl);

    return stat;
  }

  /**
   * Creates an empty state message
   * @returns {DocumentFragment} Fragment with empty state message
   */
  createEmptyState() {
    const fragment = document.createDocumentFragment();
    const emptyDiv = createElement("div", {
      className: "research-lines-empty",
    });
    emptyDiv.textContent = this.options.emptyMessage;
    fragment.appendChild(emptyDiv);
    return fragment;
  }

  /**
   * Optional: Hook called after rendering
   * Can be used for additional initialization or event binding
   */
  afterRender() {
    // Add any post-render logic here if needed
    console.log(`✅ Research lines rendered successfully`);
  }
}

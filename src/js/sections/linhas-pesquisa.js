/**
 * Linhas de Pesquisa Section Renderer
 * Renders research lines as an accessible accordion
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
   * @returns {DocumentFragment} Fragment containing all research line accordion items
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
    const sortedLinhas = [...linhas].sort(
      (a, b) => (a.ordem || 0) - (b.ordem || 0),
    );

    const accordion = createElement("div", {
      className: "research-lines-accordion",
    });

    sortedLinhas.forEach((linha, index) => {
      const item = this.createResearchLineAccordionItem(linha, index);
      accordion.appendChild(item);
    });

    fragment.appendChild(accordion);
    return fragment;
  }

  /**
   * Creates a single research line accordion item
   * @param {Object} linha - Research line data object
   * @param {number} index - Research line index in the rendered order
   * @returns {HTMLElement} Research line accordion item
   */
  createResearchLineAccordionItem(linha, index) {
    // Validate required fields
    if (!linha.nome) {
      console.warn("Research line missing nome field:", linha);
      return createElement("div");
    }

    const itemId = this.createItemId(linha, index);
    const triggerId = `${itemId}-trigger`;
    const panelId = `${itemId}-panel`;

    const item = createElement("article", { className: "research-line" });

    const heading = createElement("h3", { className: "research-line-heading" });
    const trigger = createElement("button", {
      id: triggerId,
      className: "research-line-trigger",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": panelId,
    });

    const iconContainer = createElement("span", {
      className: "research-line-icon",
    });
    const icon = createElement("i", {
      className: HTMLSanitizer.sanitize(linha.icon || "fa-solid fa-flask"),
      "aria-hidden": "true",
    });
    iconContainer.appendChild(icon);

    const title = createElement("span", { className: "research-line-title" });
    title.textContent = HTMLSanitizer.sanitize(linha.nome);

    const indicator = createElement("span", {
      className: "research-line-indicator",
      "aria-hidden": "true",
    });

    trigger.appendChild(iconContainer);
    trigger.appendChild(title);
    trigger.appendChild(indicator);
    heading.appendChild(trigger);

    const panel = createElement("div", {
      id: panelId,
      className: "research-line-panel",
      role: "region",
      "aria-labelledby": triggerId,
      hidden: true,
    });

    const description = createElement("p", {
      className: "research-line-description",
    });
    description.textContent = this.getResearchLineDescription(linha);
    panel.appendChild(description);

    item.appendChild(heading);
    item.appendChild(panel);

    return item;
  }

  /**
   * Creates a stable DOM id for an accordion item
   * @param {Object} linha - Research line data object
   * @param {number} index - Research line index
   * @returns {string} Stable element id
   */
  createItemId(linha, index) {
    const rawId = linha.id || linha.nome || `linha-${index + 1}`;
    const safeId = String(rawId)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return `research-line-${safeId || index + 1}`;
  }

  /**
   * Gets displayable description text for a research line
   * @param {Object} linha - Research line data object
   * @returns {string} Description text
   */
  getResearchLineDescription(linha) {
    if (!linha.descricao || linha.descricao.startsWith("[")) {
      return "Descrição da linha de pesquisa ainda não configurada.";
    }

    return HTMLSanitizer.sanitize(linha.descricao);
  }

  /**
   * Toggles a research line panel
   * @param {HTMLButtonElement} trigger - Accordion trigger
   */
  toggleResearchLine(trigger) {
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const isExpanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!isExpanded));
    panel.hidden = isExpanded;
  }

  /**
   * Handles keyboard behavior for accordion triggers
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTriggerKeydown(event) {
    const trigger = event.currentTarget;
    const triggers = Array.from(
      this.container.querySelectorAll(".research-line-trigger"),
    );
    const currentIndex = triggers.indexOf(trigger);

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.toggleResearchLine(trigger);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      triggers[(currentIndex + 1) % triggers.length]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      triggers[(currentIndex - 1 + triggers.length) % triggers.length]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      triggers[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      triggers[triggers.length - 1]?.focus();
    }
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
    this.container
      .querySelectorAll(".research-line-trigger")
      .forEach((trigger) => {
        trigger.addEventListener("click", () =>
          this.toggleResearchLine(trigger),
        );
        trigger.addEventListener("keydown", (event) =>
          this.handleTriggerKeydown(event),
        );
      });

    console.log(`✅ Research lines rendered successfully`);
  }
}

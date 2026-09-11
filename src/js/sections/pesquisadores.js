/**
 * Pesquisadores Section Renderer
 * Renders team members with category grouping and multiple view modes
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";
import {
  EQUIPE_CATEGORIES,
  getEquipeCategoryMap,
} from "./equipe-categories.js";

export class PesquisadoresSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: "Carregando equipe...",
      errorMessage: "Erro ao carregar equipe.",
      emptyMessage: "Nenhum membro cadastrado.",
      ...options,
    });

    // View mode state (grid, list, or card)
    this.viewMode = this.loadViewMode();

    this.categoryConfig = options.categoryConfig || EQUIPE_CATEGORIES;
    this.categories = getEquipeCategoryMap(this.categoryConfig);
  }

  /**
   * Load view mode from localStorage or default to 'grid'
   */
  loadViewMode() {
    return localStorage.getItem("team-view-mode") || "grid";
  }

  /**
   * Save view mode to localStorage
   */
  saveViewMode(mode) {
    localStorage.setItem("team-view-mode", mode);
    this.viewMode = mode;
  }

  /**
   * Creates the HTML template for team members
   * @param {Array} equipe - Array of team member objects
   * @returns {DocumentFragment} Fragment containing all elements
   */
  template(equipe) {
    if (!Array.isArray(equipe)) {
      console.error("Expected array of equipe");
      return document.createDocumentFragment();
    }

    const fragment = document.createDocumentFragment();

    // Create view mode toggle buttons and insert into header placeholder
    const viewTogglePlaceholder = document.getElementById(
      "view-toggle-placeholder",
    );
    if (viewTogglePlaceholder && viewTogglePlaceholder.children.length === 0) {
      const viewToggle = this.createViewToggle();
      viewTogglePlaceholder.appendChild(viewToggle);
    }

    // Group team members by category
    const grouped = this.groupByCategory(equipe);

    // Create sections for each category
    Object.entries(grouped)
      .sort(([catA], [catB]) => {
        const orderA = this.categories[catA]?.order || 999;
        const orderB = this.categories[catB]?.order || 999;
        return orderA - orderB;
      })
      .forEach(([categoria, members]) => {
        const section = this.createCategorySection(categoria, members);
        fragment.appendChild(section);
      });

    return fragment;
  }

  /**
   * Creates view mode toggle buttons
   */
  createViewToggle() {
    const toggleContainer = createElement("div", {
      className: "view-toggle",
      role: "toolbar",
      "aria-label": "Opções de visualização",
    });

    const modes = [
      { value: "grid", icon: "⊞", label: "Grade" },
      { value: "list", icon: "☰", label: "Lista" },
      { value: "card", icon: "▢", label: "Cartões" },
    ];

    modes.forEach((mode) => {
      const button = createElement("button", {
        className: `view-toggle-btn ${this.viewMode === mode.value ? "active" : ""}`,
        type: "button",
        "data-view": mode.value,
        "aria-label": `Visualizar como ${mode.label}`,
        "aria-pressed": this.viewMode === mode.value ? "true" : "false",
        title: mode.label,
      });

      // Create icon span element safely (avoid innerHTML for security)
      const iconSpan = createElement("span", { className: "icon" });
      iconSpan.textContent = mode.icon;
      button.appendChild(iconSpan);

      button.addEventListener("click", () => this.switchView(mode.value));

      toggleContainer.appendChild(button);
    });

    return toggleContainer;
  }

  /**
   * Switch view mode
   */
  switchView(mode) {
    this.saveViewMode(mode);

    // Update button states
    const buttons = document.querySelectorAll(".view-toggle-btn");
    buttons.forEach((btn) => {
      const isActive = btn.dataset.view === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    // Update ALL container classes (one per category)
    const equipeContainers =
      this.container.querySelectorAll(".equipe-container");
    equipeContainers.forEach((container) => {
      container.className = `equipe-container view-${mode}`;
    });
  }

  /**
   * Group team members by category
   */
  groupByCategory(equipe) {
    return equipe.reduce((acc, member) => {
      const cat = member.categoria || "outros";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(member);
      return acc;
    }, {});
  }

  /**
   * Creates a category section
   */
  createCategorySection(categoria, members) {
    const categoryId = this.createCategoryId(categoria);
    const triggerId = `${categoryId}-trigger`;
    const panelId = `${categoryId}-panel`;
    const section = createElement("section", {
      className: "equipe-category",
      "aria-labelledby": triggerId,
    });

    // Category header
    const categoryTitle = this.categories[categoria]?.title || categoria;
    const header = createElement("h3", {
      className: "categoria-title",
    });
    const trigger = createElement("button", {
      id: triggerId,
      className: "equipe-category-trigger",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": panelId,
    });
    const title = createElement("span", {
      className: "equipe-category-title-text",
    });
    title.textContent = categoryTitle;
    const count = createElement("span", {
      className: "equipe-category-count",
      "aria-label": `${members.length} ${members.length === 1 ? "membro" : "membros"}`,
    });
    count.textContent = String(members.length);
    const indicator = createElement("span", {
      className: "equipe-category-indicator",
      "aria-hidden": "true",
    });

    trigger.appendChild(title);
    trigger.appendChild(count);
    trigger.appendChild(indicator);
    header.appendChild(trigger);
    section.appendChild(header);

    const panel = createElement("div", {
      id: panelId,
      className: "equipe-category-panel",
      role: "region",
      "aria-labelledby": triggerId,
      hidden: true,
    });

    // Members container
    const container = createElement("div", {
      className: `equipe-container view-${this.viewMode}`,
    });

    // Sort members alphabetically by name (locale-aware for Portuguese)
    const sortedMembers = [...members].sort((a, b) => {
      const nameA = a.nome || "";
      const nameB = b.nome || "";
      return nameA.localeCompare(nameB, "pt-BR", { sensitivity: "base" });
    });

    sortedMembers.forEach((member) => {
      const card = this.createMemberCard(member);
      container.appendChild(card);
    });

    panel.appendChild(container);
    section.appendChild(panel);

    return section;
  }

  /**
   * Creates a stable DOM id for a category group
   */
  createCategoryId(categoria) {
    const safeId = String(categoria || "outros")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return `categoria-${safeId || "outros"}`;
  }

  /**
   * Toggles a category accordion panel
   */
  toggleCategory(trigger) {
    const panelId = trigger.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const isExpanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!isExpanded));
    panel.hidden = isExpanded;
  }

  /**
   * Handles keyboard behavior for category accordion controls
   */
  handleCategoryKeydown(event) {
    const trigger = event.currentTarget;
    const triggers = Array.from(
      this.container.querySelectorAll(".equipe-category-trigger"),
    );
    const currentIndex = triggers.indexOf(trigger);

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.toggleCategory(trigger);
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
   * Creates a single member card
   */
  createMemberCard(member) {
    const nome = HTMLSanitizer.sanitize(member.nome || "Nome não informado");
    const instituicao = HTMLSanitizer.sanitize(member.instituicao || "");
    const lattesUrl = HTMLSanitizer.sanitizeURL(member.lattes);
    const foto = member.foto || "/assets/images/placeholder-avatar.jpg";

    const card = createElement("article", {
      className: "membro-card",
      role: "article",
      "aria-label": `${nome} - ${instituicao}`,
    });

    // Photo
    const figure = createElement("figure", { className: "membro-foto" });
    const img = createElement("img", {
      src: foto,
      alt: `Foto de ${nome}`,
      loading: "lazy",
    });
    figure.appendChild(img);

    // Content
    const content = createElement("div", { className: "membro-content" });

    const h4 = createElement("h4", { className: "membro-nome" }, nome);
    const instSpan = createElement(
      "span",
      { className: "membro-instituicao" },
      instituicao,
    );

    content.appendChild(h4);
    content.appendChild(instSpan);

    // Lattes link
    if (lattesUrl) {
      const lattesLink = createElement("a", {
        href: lattesUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "btn btn-lattes",
        "aria-label": `Currículo Lattes de ${nome}`,
        title: "Acessar Currículo Lattes",
      });

      const lattesImg = createElement("img", {
        src: "/labfonac/assets/images/curriculo_lattes_150x61.png",
        alt: "Currículo Lattes",
        className: "btn-lattes-img",
      });

      lattesLink.appendChild(lattesImg);
      content.appendChild(lattesLink);
    }

    card.appendChild(figure);
    card.appendChild(content);

    return card;
  }

  /**
   * Hook called after rendering
   */
  afterRender() {
    this.container
      .querySelectorAll(".equipe-category-trigger")
      .forEach((trigger) => {
        trigger.addEventListener("click", () => this.toggleCategory(trigger));
        trigger.addEventListener("keydown", (event) =>
          this.handleCategoryKeydown(event),
        );
      });

    // Add entrance animations
    const cards = this.container.querySelectorAll(".membro-card");
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.05}s`;
      card.classList.add("fade-in");
    });

    // Announce to screen readers
    this.announceContent(cards.length);
  }

  /**
   * Announces content to screen readers
   * @param {number} count - Number of cards rendered
   */
  announceContent(count) {
    const message =
      count === 1
        ? "Um membro da equipe carregado"
        : `${count} membros da equipe carregados`;

    // Create live region if it doesn't exist
    let liveRegion = document.getElementById("aria-live-region");
    if (!liveRegion) {
      liveRegion = createElement("div", {
        id: "aria-live-region",
        className: "sr-only",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
      });
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = "";
    }, 1000);
  }
}

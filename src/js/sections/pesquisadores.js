/**
 * Pesquisadores Section Renderer
 * Renders team members with category grouping and multiple view modes
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";

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
    
    // Category configuration
    this.categories = {
      coordenacao: { title: "Coordenação", order: 1 },
      docentes: { title: "Docentes/Pesquisadores", order: 2 },
      pos_graduacao: { title: "Discentes de Pós-Graduação", order: 3 },
      graduacao: { title: "Discentes de Graduação", order: 4 },
      egressos: { title: "Egressos", order: 5 }
    };
  }

  /**
   * Load view mode from localStorage or default to 'grid'
   */
  loadViewMode() {
    return localStorage.getItem('team-view-mode') || 'grid';
  }

  /**
   * Save view mode to localStorage
   */
  saveViewMode(mode) {
    localStorage.setItem('team-view-mode', mode);
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
    const viewTogglePlaceholder = document.getElementById('view-toggle-placeholder');
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
      "aria-label": "Opções de visualização"
    });

    const modes = [
      { value: 'grid', icon: '⊞', label: 'Grade' },
      { value: 'list', icon: '☰', label: 'Lista' },
      { value: 'card', icon: '▢', label: 'Cartões' }
    ];

    modes.forEach(mode => {
      const button = createElement("button", {
        className: `view-toggle-btn ${this.viewMode === mode.value ? 'active' : ''}`,
        type: "button",
        "data-view": mode.value,
        "aria-label": `Visualizar como ${mode.label}`,
        "aria-pressed": this.viewMode === mode.value ? "true" : "false",
        title: mode.label
      });
      
      button.innerHTML = `<span class="icon">${mode.icon}</span>`;
      
      button.addEventListener('click', () => this.switchView(mode.value));
      
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
    const buttons = document.querySelectorAll('.view-toggle-btn');
    buttons.forEach(btn => {
      const isActive = btn.dataset.view === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Update ALL container classes (one per category)
    const equipeContainers = this.container.querySelectorAll('.equipe-container');
    equipeContainers.forEach(container => {
      container.className = `equipe-container view-${mode}`;
    });
  }

  /**
   * Group team members by category
   */
  groupByCategory(equipe) {
    return equipe.reduce((acc, member) => {
      const cat = member.categoria || 'outros';
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
    const section = createElement("section", {
      className: "equipe-category",
      "aria-labelledby": `categoria-${categoria}`
    });

    // Category header
    const categoryTitle = this.categories[categoria]?.title || categoria;
    const header = createElement("h3", {
      id: `categoria-${categoria}`,
      className: "categoria-title"
    }, categoryTitle);
    
    section.appendChild(header);

    // Members container
    const container = createElement("div", {
      className: `equipe-container view-${this.viewMode}`
    });

    // Sort members alphabetically by name (locale-aware for Portuguese)
    const sortedMembers = [...members].sort((a, b) => {
      const nameA = a.nome || "";
      const nameB = b.nome || "";
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });

    sortedMembers.forEach(member => {
      const card = this.createMemberCard(member);
      container.appendChild(card);
    });

    section.appendChild(container);

    return section;
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
      "aria-label": `${nome} - ${instituicao}`
    });

    // Photo
    const figure = createElement("figure", { className: "membro-foto" });
    const img = createElement("img", {
      src: foto,
      alt: `Foto de ${nome}`,
      loading: "lazy"
    });
    figure.appendChild(img);

    // Content
    const content = createElement("div", { className: "membro-content" });

    const h4 = createElement("h4", { className: "membro-nome" }, nome);
    const instSpan = createElement("span", { className: "membro-instituicao" }, instituicao);

    content.appendChild(h4);
    content.appendChild(instSpan);

    // Lattes link
    if (lattesUrl) {
      const lattesLink = createElement("a", {
        href: lattesUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "btn btn-lattes",
        "aria-label": `Currículo Lattes de ${nome}`
      }, "Currículo Lattes");
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

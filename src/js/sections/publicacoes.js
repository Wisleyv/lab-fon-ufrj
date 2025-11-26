/**
 * Publications Section Renderer
 * Renders publications with search, filtering, sorting, and view modes
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";
import {
  formatCitation,
  formatShortCitation,
  formatTypeLabel,
  formatAuthors,
  toPlainText,
  toBibTeX,
} from "../utils/citation-formatter.js";

export class PublicacoesSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: "Carregando publicações...",
      errorMessage: "Erro ao carregar publicações.",
      emptyMessage: "Nenhuma publicação cadastrada.",
      ...options,
    });

    // State management
    this.allPublications = [];
    this.filteredPublications = [];
    this.viewMode = this.loadViewMode();
    this.searchQuery = "";
    this.filters = {
      year: "all",
      type: "all",
      author: "all",
    };
    this.sortBy = "year-desc"; // year-desc, year-asc, author-asc, title-asc, type

    // Cache for unique values
    this.uniqueYears = [];
    this.uniqueTypes = [];
    this.uniqueAuthors = [];
  }

  /**
   * Load view mode from localStorage or default to 'detailed'
   */
  loadViewMode() {
    return localStorage.getItem("publications-view-mode") || "detailed";
  }

  /**
   * Save view mode to localStorage
   */
  saveViewMode(mode) {
    localStorage.setItem("publications-view-mode", mode);
    this.viewMode = mode;
  }

  /**
   * Creates the HTML template for publications
   * @param {Array} publications - Array of publication objects
   * @returns {DocumentFragment} Fragment containing all elements
   */
  template(publications) {
    if (!Array.isArray(publications)) {
      console.error("Expected array of publications");
      return document.createDocumentFragment();
    }

    // Store all publications and initialize filters
    this.allPublications = publications;
    this.extractUniqueValues();
    this.applyFiltersAndSort();

    const fragment = document.createDocumentFragment();

    // Create controls section
    const controls = this.createControlsSection();
    fragment.appendChild(controls);

    // Create statistics panel
    const stats = this.createStatisticsPanel();
    fragment.appendChild(stats);

    // Create publications container
    const container = this.createPublicationsContainer();
    fragment.appendChild(container);

    return fragment;
  }

  /**
   * Extracts unique values for filters
   */
  extractUniqueValues() {
    const years = new Set();
    const types = new Set();
    const authors = new Set();

    this.allPublications.forEach((pub) => {
      // Extract year
      const year = pub.imprint?.date || "sem data";
      years.add(String(year));

      // Extract type
      if (pub.type) types.add(pub.type);

      // Extract authors
      if (Array.isArray(pub.authors)) {
        pub.authors.forEach((author) => {
          if (author.family_name) {
            authors.add(author.family_name);
          }
        });
      }
    });

    this.uniqueYears = Array.from(years).sort((a, b) => {
      if (a === "sem data") return 1;
      if (b === "sem data") return -1;
      return Number(b) - Number(a);
    });

    this.uniqueTypes = Array.from(types).sort();
    this.uniqueAuthors = Array.from(authors).sort();
  }

  /**
   * Creates controls section (search, filters, sort, view toggle)
   */
  createControlsSection() {
    const section = createElement("div", { className: "publications-controls" });

    // Search and filter row
    const topRow = createElement("div", { className: "controls-row controls-top" });

    // Search bar
    const searchContainer = createElement("div", { className: "search-container" });
    const searchInput = createElement("input", {
      type: "search",
      id: "pub-search",
      className: "search-input",
      placeholder: "Buscar por título, autor, palavra-chave...",
      "aria-label": "Buscar publicações",
    });
    searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
    searchContainer.appendChild(searchInput);
    topRow.appendChild(searchContainer);

    // View toggle buttons
    const viewToggle = this.createViewToggle();
    topRow.appendChild(viewToggle);

    section.appendChild(topRow);

    // Filters and sort row
    const bottomRow = createElement("div", { className: "controls-row controls-bottom" });

    // Year filter
    const yearFilter = this.createFilterSelect(
      "pub-filter-year",
      "Ano",
      this.uniqueYears,
      (value) => this.handleFilterChange("year", value)
    );
    bottomRow.appendChild(yearFilter);

    // Type filter
    const typeFilter = this.createFilterSelect(
      "pub-filter-type",
      "Tipo",
      this.uniqueTypes.map((t) => ({ value: t, label: formatTypeLabel(t) })),
      (value) => this.handleFilterChange("type", value)
    );
    bottomRow.appendChild(typeFilter);

    // Author filter
    const authorFilter = this.createFilterSelect(
      "pub-filter-author",
      "Autor",
      this.uniqueAuthors,
      (value) => this.handleFilterChange("author", value)
    );
    bottomRow.appendChild(authorFilter);

    // Sort select
    const sortSelect = this.createSortSelect();
    bottomRow.appendChild(sortSelect);

    section.appendChild(bottomRow);

    // Active filters display
    const activeFilters = createElement("div", {
      id: "active-filters",
      className: "active-filters",
      "aria-live": "polite",
    });
    section.appendChild(activeFilters);

    return section;
  }

  /**
   * Creates a filter select element
   */
  createFilterSelect(id, label, options, onChange) {
    const container = createElement("div", { className: "filter-group" });

    const labelEl = createElement("label", { for: id, className: "filter-label" }, label);
    container.appendChild(labelEl);

    const select = createElement("select", {
      id,
      className: "filter-select",
      "aria-label": `Filtrar por ${label.toLowerCase()}`,
    });

    // Add "All" option
    const allOption = createElement("option", { value: "all" }, "Todos");
    select.appendChild(allOption);

    // Add options
    options.forEach((opt) => {
      const value = typeof opt === "object" ? opt.value : opt;
      const labelText = typeof opt === "object" ? opt.label : opt;
      const option = createElement("option", { value }, labelText);
      select.appendChild(option);
    });

    select.addEventListener("change", (e) => onChange(e.target.value));
    container.appendChild(select);

    return container;
  }

  /**
   * Creates sort select element
   */
  createSortSelect() {
    const container = createElement("div", { className: "filter-group" });

    const label = createElement("label", { for: "pub-sort", className: "filter-label" }, "Ordenar");
    container.appendChild(label);

    const select = createElement("select", {
      id: "pub-sort",
      className: "filter-select",
      "aria-label": "Ordenar publicações",
    });

    const options = [
      { value: "year-desc", label: "Ano (mais recente)" },
      { value: "year-asc", label: "Ano (mais antigo)" },
      { value: "author-asc", label: "Autor (A-Z)" },
      { value: "title-asc", label: "Título (A-Z)" },
      { value: "type", label: "Tipo" },
    ];

    options.forEach((opt) => {
      const option = createElement("option", { value: opt.value }, opt.label);
      select.appendChild(option);
    });

    select.value = this.sortBy;
    select.addEventListener("change", (e) => this.handleSortChange(e.target.value));
    container.appendChild(select);

    return container;
  }

  /**
   * Creates view toggle buttons
   */
  createViewToggle() {
    const toggle = createElement("div", {
      className: "view-toggle",
      role: "group",
      "aria-label": "Modo de visualização",
    });

    const compactBtn = createElement("button", {
      className: `view-toggle-btn ${this.viewMode === "compact" ? "active" : ""}`,
      "aria-label": "Visualização compacta",
      "aria-pressed": this.viewMode === "compact",
      title: "Visualização compacta",
      type: "button",
    });
    compactBtn.innerHTML = '<span class="icon">≡</span>';
    compactBtn.addEventListener("click", () => this.switchViewMode("compact"));

    const detailedBtn = createElement("button", {
      className: `view-toggle-btn ${this.viewMode === "detailed" ? "active" : ""}`,
      "aria-label": "Visualização detalhada",
      "aria-pressed": this.viewMode === "detailed",
      title: "Visualização detalhada",
      type: "button",
    });
    detailedBtn.innerHTML = '<span class="icon">▤</span>';
    detailedBtn.addEventListener("click", () => this.switchViewMode("detailed"));

    toggle.appendChild(compactBtn);
    toggle.appendChild(detailedBtn);

    return toggle;
  }

  /**
   * Creates statistics panel
   */
  createStatisticsPanel() {
    const panel = createElement("div", {
      id: "pub-statistics",
      className: "statistics-panel",
      "aria-live": "polite",
    });

    this.updateStatistics(panel);

    return panel;
  }

  /**
   * Updates statistics panel content
   */
  updateStatistics(panel = document.getElementById("pub-statistics")) {
    if (!panel) return;

    const total = this.filteredPublications.length;
    const totalAll = this.allPublications.length;

    let html = `<span class="stat-item">Exibindo <strong>${total}</strong>`;
    if (total !== totalAll) {
      html += ` de <strong>${totalAll}</strong>`;
    }
    html += ` publicaç${total === 1 ? "ão" : "ões"}</span>`;

    // Show breakdown by type if not filtered
    if (this.filters.type === "all" && total > 0) {
      const typeCount = {};
      this.filteredPublications.forEach((pub) => {
        const type = pub.type || "other";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      const breakdown = Object.entries(typeCount)
        .map(([type, count]) => `${formatTypeLabel(type)}: ${count}`)
        .join(" | ");

      html += `<span class="stat-breakdown">${breakdown}</span>`;
    }

    panel.innerHTML = html;
  }

  /**
   * Creates publications container
   */
  createPublicationsContainer() {
    const container = createElement("div", {
      id: "publications-container",
      className: `publications-container view-${this.viewMode}`,
    });

    this.renderPublications(container);

    return container;
  }

  /**
   * Renders publications into container
   */
  renderPublications(container = document.getElementById("publications-container")) {
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";
    container.className = `publications-container view-${this.viewMode}`;

    if (this.filteredPublications.length === 0) {
      const empty = this.createEmptyState();
      container.appendChild(empty);
      return;
    }

    // Render each publication
    this.filteredPublications.forEach((pub, index) => {
      const card = this.createPublicationCard(pub, index);
      container.appendChild(card);
    });
  }

  /**
   * Creates empty state message
   */
  createEmptyState() {
    const empty = createElement("div", { className: "empty-state" });

    const message = createElement("p", {}, "Nenhuma publicação encontrada com os filtros selecionados.");
    empty.appendChild(message);

    const resetBtn = createElement("button", {
      className: "btn btn-primary",
      type: "button",
    }, "Limpar filtros");
    resetBtn.addEventListener("click", () => this.resetFilters());
    empty.appendChild(resetBtn);

    return empty;
  }

  /**
   * Creates a single publication card
   */
  createPublicationCard(pub, index) {
    const card = createElement("article", {
      className: "publication-card",
      role: "article",
      "data-pub-id": pub.id,
      "data-index": index,
    });

    if (this.viewMode === "compact") {
      card.innerHTML = this.createCompactView(pub);
    } else {
      card.innerHTML = this.createDetailedView(pub);
    }

    // Add event listeners for actions
    this.attachCardListeners(card, pub);

    return card;
  }

  /**
   * Creates compact view HTML
   */
  createCompactView(pub) {
    const citation = formatShortCitation(pub);
    const type = formatTypeLabel(pub.type);
    const url = pub.access?.url ? HTMLSanitizer.sanitizeURL(pub.access.url) : null;

    let html = `
      <div class="pub-compact-content">
        <span class="pub-type-badge">${type}</span>
        <p class="pub-citation">${citation}</p>
      </div>
      <div class="pub-actions">
    `;

    if (url) {
      html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-icon" aria-label="Acessar publicação" title="Acessar publicação">🔗</a>`;
    }

    html += `
        <button class="btn-icon btn-copy" aria-label="Copiar citação" title="Copiar citação">📋</button>
      </div>
    `;

    return html;
  }

  /**
   * Creates detailed view HTML
   */
  createDetailedView(pub) {
    const citation = formatCitation(pub);
    const type = formatTypeLabel(pub.type);
    const url = pub.access?.url ? HTMLSanitizer.sanitizeURL(pub.access.url) : null;
    const subtitle = pub.subtitle ? HTMLSanitizer.sanitize(pub.subtitle) : null;

    let html = `
      <div class="pub-header">
        <span class="pub-type-badge">${type}</span>
        <div class="pub-actions">
    `;

    if (url) {
      html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" aria-label="Acessar publicação">Acessar</a>`;
    }

    html += `
          <button class="btn btn-sm btn-copy" aria-label="Copiar citação">Copiar citação</button>
          <button class="btn btn-sm btn-bibtex" aria-label="Exportar BibTeX">BibTeX</button>
        </div>
      </div>
      <div class="pub-content">
        <p class="pub-citation">${citation}</p>
    `;

    if (subtitle) {
      html += `<p class="pub-subtitle">${subtitle}</p>`;
    }

    html += `
      </div>
    `;

    return html;
  }

  /**
   * Attaches event listeners to card buttons
   */
  attachCardListeners(card, pub) {
    // Copy citation button
    const copyBtn = card.querySelector(".btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => this.copyCitation(pub));
    }

    // BibTeX export button
    const bibtexBtn = card.querySelector(".btn-bibtex");
    if (bibtexBtn) {
      bibtexBtn.addEventListener("click", () => this.exportBibTeX(pub));
    }
  }

  /**
   * Handles search input
   */
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.applyFiltersAndSort();
    this.renderPublications();
    this.updateStatistics();
    this.updateActiveFilters();
    this.announceResults();
  }

  /**
   * Handles filter change
   */
  handleFilterChange(filterType, value) {
    this.filters[filterType] = value;
    this.applyFiltersAndSort();
    this.renderPublications();
    this.updateStatistics();
    this.updateActiveFilters();
    this.announceResults();
  }

  /**
   * Handles sort change
   */
  handleSortChange(sortBy) {
    this.sortBy = sortBy;
    this.applyFiltersAndSort();
    this.renderPublications();
    this.announceResults();
  }

  /**
   * Switches view mode
   */
  switchViewMode(mode) {
    if (this.viewMode === mode) return;

    this.saveViewMode(mode);
    this.viewMode = mode;

    // Update button states
    const compactBtn = this.container.querySelector('.view-toggle-btn[aria-label*="compacta"]');
    const detailedBtn = this.container.querySelector('.view-toggle-btn[aria-label*="detalhada"]');

    if (compactBtn && detailedBtn) {
      compactBtn.classList.toggle("active", mode === "compact");
      compactBtn.setAttribute("aria-pressed", mode === "compact");
      detailedBtn.classList.toggle("active", mode === "detailed");
      detailedBtn.setAttribute("aria-pressed", mode === "detailed");
    }

    this.renderPublications();
    this.announceViewMode();
  }

  /**
   * Applies filters and sorting to publications
   */
  applyFiltersAndSort() {
    let filtered = [...this.allPublications];

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter((pub) => {
        const searchableText = [
          pub.title || "",
          formatAuthors(pub.authors),
          pub.container?.title || "",
          pub.subtitle || "",
        ].join(" ").toLowerCase();

        return searchableText.includes(this.searchQuery);
      });
    }

    // Apply year filter
    if (this.filters.year !== "all") {
      filtered = filtered.filter((pub) => {
        const year = String(pub.imprint?.date || "sem data");
        return year === this.filters.year;
      });
    }

    // Apply type filter
    if (this.filters.type !== "all") {
      filtered = filtered.filter((pub) => pub.type === this.filters.type);
    }

    // Apply author filter
    if (this.filters.author !== "all") {
      filtered = filtered.filter((pub) => {
        return pub.authors?.some((author) => author.family_name === this.filters.author);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case "year-desc":
          return (b.imprint?.date || 0) - (a.imprint?.date || 0);
        case "year-asc":
          return (a.imprint?.date || 0) - (b.imprint?.date || 0);
        case "author-asc": {
          const authorA = a.authors?.[0]?.family_name || "";
          const authorB = b.authors?.[0]?.family_name || "";
          return authorA.localeCompare(authorB, "pt-BR");
        }
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "", "pt-BR");
        case "type": {
          const typeA = formatTypeLabel(a.type);
          const typeB = formatTypeLabel(b.type);
          return typeA.localeCompare(typeB, "pt-BR");
        }
        default:
          return 0;
      }
    });

    this.filteredPublications = filtered;
  }

  /**
   * Updates active filters display
   */
  updateActiveFilters() {
    const container = document.getElementById("active-filters");
    if (!container) return;

    container.innerHTML = "";

    const activeFilters = [];

    if (this.searchQuery) {
      activeFilters.push({ type: "search", value: this.searchQuery });
    }
    if (this.filters.year !== "all") {
      activeFilters.push({ type: "year", label: "Ano", value: this.filters.year });
    }
    if (this.filters.type !== "all") {
      activeFilters.push({ type: "type", label: "Tipo", value: formatTypeLabel(this.filters.type) });
    }
    if (this.filters.author !== "all") {
      activeFilters.push({ type: "author", label: "Autor", value: this.filters.author });
    }

    if (activeFilters.length === 0) return;

    activeFilters.forEach((filter) => {
      const badge = createElement("span", { className: "filter-badge" });
      
      const text = filter.type === "search"
        ? `Busca: "${filter.value}"`
        : `${filter.label}: ${filter.value}`;
      
      badge.textContent = text;

      const removeBtn = createElement("button", {
        className: "filter-badge-remove",
        "aria-label": `Remover filtro ${text}`,
        type: "button",
      }, "×");

      removeBtn.addEventListener("click", () => {
        if (filter.type === "search") {
          document.getElementById("pub-search").value = "";
          this.handleSearch("");
        } else {
          document.getElementById(`pub-filter-${filter.type}`).value = "all";
          this.handleFilterChange(filter.type, "all");
        }
      });

      badge.appendChild(removeBtn);
      container.appendChild(badge);
    });
  }

  /**
   * Resets all filters
   */
  resetFilters() {
    this.searchQuery = "";
    this.filters = { year: "all", type: "all", author: "all" };

    // Reset UI controls
    const searchInput = document.getElementById("pub-search");
    if (searchInput) searchInput.value = "";

    ["year", "type", "author"].forEach((type) => {
      const select = document.getElementById(`pub-filter-${type}`);
      if (select) select.value = "all";
    });

    this.applyFiltersAndSort();
    this.renderPublications();
    this.updateStatistics();
    this.updateActiveFilters();
    this.announceResults();
  }

  /**
   * Copies citation to clipboard
   */
  async copyCitation(pub) {
    const citation = toPlainText(formatCitation(pub));

    try {
      await navigator.clipboard.writeText(citation);
      this.showNotification("Citação copiada!");
    } catch (err) {
      console.error("Failed to copy citation:", err);
      this.showNotification("Erro ao copiar citação", "error");
    }
  }

  /**
   * Exports publication as BibTeX
   */
  async exportBibTeX(pub) {
    const bibtex = toBibTeX(pub);

    try {
      await navigator.clipboard.writeText(bibtex);
      this.showNotification("BibTeX copiado!");
    } catch (err) {
      console.error("Failed to copy BibTeX:", err);
      this.showNotification("Erro ao copiar BibTeX", "error");
    }
  }

  /**
   * Shows temporary notification
   */
  showNotification(message, type = "success") {
    let notification = document.getElementById("pub-notification");

    if (!notification) {
      notification = createElement("div", {
        id: "pub-notification",
        className: "notification",
        role: "status",
        "aria-live": "polite",
      });
      document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.className = `notification notification-${type} show`;

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  /**
   * Announces results to screen readers
   */
  announceResults() {
    const count = this.filteredPublications.length;
    const message = count === 0
      ? "Nenhuma publicação encontrada"
      : count === 1
      ? "Uma publicação encontrada"
      : `${count} publicações encontradas`;

    this.announce(message);
  }

  /**
   * Announces view mode change
   */
  announceViewMode() {
    const message = this.viewMode === "compact"
      ? "Visualização compacta ativada"
      : "Visualização detalhada ativada";

    this.announce(message);
  }

  /**
   * Announces message to screen readers
   */
  announce(message) {
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

  /**
   * Hook called after rendering
   */
  afterRender() {
    // Add entrance animations
    const cards = this.container.querySelectorAll(".publication-card");
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.03}s`;
      card.classList.add("fade-in");
    });

    this.announceResults();
  }
}

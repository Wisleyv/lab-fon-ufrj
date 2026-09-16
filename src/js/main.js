/**
 * Main Application Entry Point
 * Walking Skeleton - Lab Fonética UFRJ
 */

import { JSONAdapter } from "./adapters/JSONAdapter.js";
import { applyPageComposition } from "./page/composition.js";
import { renderPageNavigation } from "./page/navigation.js";
import {
  createSectionRenderer,
  getSectionDefinition,
  SECTION_REGISTRY,
  isRenderableSection,
} from "./page/section-registry.js";
import { applySiteContent } from "./site-content.js";
import { initHeaderScroll } from "./header-scroll.js";

/**
 * Application configuration
 */
const config = {
  dataSource: "json",
  dataSources: {
    site: "./data.json", // Served from public/ folder via Vite
    publications: "./publication_references.json",
  },
};

/**
 * Application state
 */
const app = {
  data: null,
  dataSources: {},
  pageComposition: null,
  sections: {},
  isInitialized: false,
};

/**
 * Initialize the application
 */
async function init() {
  console.log("🚀 Initializing Lab Fonética UFRJ...");

  try {
    // Show loading state
    showGlobalLoading(true);

    // Fetch data
    const adapter = new JSONAdapter(config.dataSources.site);
    app.data = await adapter.fetch();
    app.dataSources.site = app.data;

    if (app.data.error) {
      throw new Error(app.data.message);
    }

    console.log("✅ Data loaded successfully:", app.data);

    // Apply data-driven page composition before rendering dynamic sections
    app.pageComposition = applyPageComposition(document, app.data.page);
    renderPageNavigation({
      documentRef: document,
      composition: app.pageComposition,
      registry: SECTION_REGISTRY,
    });
    applySiteContent(document, app.data.site, {
      assetBase: import.meta.env.BASE_URL,
      visibleSectionAnchors: getVisibleSectionAnchors(app.pageComposition),
    });

    // Initialize sections
    await initializeSections();

    // Render all sections
    await renderAllSections();

    // Initialize mobile menu
    initMobileMenu();

    // Initialize dropdown navigation
    initDropdownNav();

    // Initialize back-to-top button
    initBackToTop();
    initHeaderScroll();

    app.isInitialized = true;
    console.log("✅ Application initialized successfully");
  } catch (error) {
    console.error("❌ Initialization error:", error);
    showGlobalError(error);
  } finally {
    showGlobalLoading(false);
  }
}

function getVisibleSectionAnchors(composition) {
  const anchors = new Set(["#contato"]);

  composition.sections
    .filter((section) => section.enabled)
    .forEach((section) => {
      const definition = getSectionDefinition(section.type);
      const sectionId = definition?.sectionId || section.id;

      if (sectionId) {
        anchors.add(`#${sectionId}`);
      }
    });

  return anchors;
}

/**
 * Initialize all section renderers
 */
async function initializeSections() {
  app.sections = {};

  app.pageComposition.sections
    .filter((section) => section.enabled && isRenderableSection(section.type))
    .forEach((section) => {
      app.sections[section.id] = createSectionRenderer(section.type, SECTION_REGISTRY, { section, composition: app.pageComposition, allowInstagram: true });
    });

  console.log("✅ Sections initialized");
}

/**
 * Render all sections with their data
 */
async function renderAllSections() {
  const renderPromises = [];

  for (const section of app.pageComposition.sections) {
    if (!section.enabled || !isRenderableSection(section.type)) {
      continue;
    }

    const definition = getSectionDefinition(section.type);
    const sectionRenderer = app.sections[section.id];
    const sectionData = section.type === "custom" ? section : await getSectionData(definition);

    if (hasSectionData(sectionData)) {
      console.log(`📋 Rendering ${definition.label}...`);
      renderPromises.push(sectionRenderer.render(sectionData));
    }
  }

  await Promise.all(renderPromises);
  console.log("✅ All sections rendered");
}

function hasSectionData(sectionData) {
  if (Array.isArray(sectionData)) {
    return sectionData.length > 0;
  }

  return Boolean(sectionData && typeof sectionData === "object");
}

/**
 * Gets the data array used by a registered section.
 * @param {Object} sectionDefinition - Section registry entry
 * @returns {Promise<Array|null>} Section data
 */
async function getSectionData(sectionDefinition) {
  if (sectionDefinition.dataSource === "publications") {
    try {
      console.log("📋 Loading publications...");
      const pubAdapter = new JSONAdapter(config.dataSources.publications);
      const pubData = await pubAdapter.fetch();
      app.dataSources.publications = pubData;
      return pubData[sectionDefinition.dataKey] || null;
    } catch (error) {
      console.error("❌ Error loading publications:", error);
      return null;
    }
  }

  const dataSource = app.dataSources[sectionDefinition.dataSource] || app.data;
  return dataSource[sectionDefinition.dataKey] || null;
}

/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
  const menuToggle = document.querySelector(".nav-toggle");
  const navList = document.querySelector(".nav-list");

  if (!menuToggle || !navList) {
    console.warn("Mobile menu elements not found");
    return;
  }

  // Toggle menu on button click
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = navList.classList.toggle("active");
    menuToggle.classList.toggle("active");

    // Update ARIA attributes
    menuToggle.setAttribute("aria-expanded", isOpen);
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu" : "Abrir menu",
    );
    navList.setAttribute("aria-hidden", !isOpen);

    // Focus first link when opening
    if (isOpen) {
      const firstLink = navList.querySelector("a");
      firstLink?.focus();
    }
  });

  // Close menu when clicking navigation links (but not dropdown parent links)
  navList.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      // Don't close menu if this is a dropdown parent link
      const isDropdownParent =
        link.closest(".has-dropdown") &&
        link.getAttribute("aria-haspopup") === "true";

      // Only close menu for actual navigation links or submenu items
      if (!isDropdownParent) {
        navList.classList.remove("active");
        menuToggle.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menu");
        navList.setAttribute("aria-hidden", "true");
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".main-nav") &&
      navList.classList.contains("active")
    ) {
      navList.classList.remove("active");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
      navList.setAttribute("aria-hidden", "true");
    }
  });

  // Close menu on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navList.classList.contains("active")) {
      navList.classList.remove("active");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
      navList.setAttribute("aria-hidden", "true");
      menuToggle.focus();
    }
  });

  console.log("\u2705 Mobile menu initialized");
}

/**
 * Initialize dropdown navigation
 */
function initDropdownNav() {
  const dropdownItems = document.querySelectorAll(".has-dropdown");

  dropdownItems.forEach((item) => {
    const link = item.querySelector("a");
    const menu = item.querySelector(".dropdown-menu");

    if (!link || !menu) return;

    // Handle mobile click to toggle dropdown
    link.addEventListener("click", (e) => {
      // On mobile (when nav-toggle is visible), toggle dropdown
      const navToggle = document.querySelector(".nav-toggle");
      if (navToggle && window.getComputedStyle(navToggle).display !== "none") {
        e.preventDefault();
        e.stopPropagation();

        // Close other dropdowns
        dropdownItems.forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.classList.remove("active");
            otherItem
              .querySelector("a")
              ?.setAttribute("aria-expanded", "false");
          }
        });

        // Toggle current dropdown
        const isOpen = item.classList.toggle("active");
        link.setAttribute("aria-expanded", isOpen);
      }
    });

    // Handle keyboard navigation
    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const navToggle = document.querySelector(".nav-toggle");
        if (
          navToggle &&
          window.getComputedStyle(navToggle).display !== "none"
        ) {
          e.preventDefault();
          item.classList.toggle("active");
        }
      }
    });
  });

  console.log("\u2705 Dropdown navigation initialized");
}

/**
 * Initialize back-to-top button functionality
 */
function initBackToTop() {
  const backToTopButton = document.getElementById("back-to-top");

  if (!backToTopButton) {
    console.warn("Back-to-top button not found");
    return;
  }

  // Show/hide button based on scroll position
  const toggleButtonVisibility = () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add("visible");
    } else {
      backToTopButton.classList.remove("visible");
    }
  };

  // Scroll to top smoothly when clicked
  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Listen to scroll events with throttling for performance
  let scrollTimeout;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(() => {
        toggleButtonVisibility();
      });
    },
    { passive: true },
  );

  console.log("\u2705 Back-to-top button initialized");
}

/**
 * Shows/hides global loading indicator
 * @param {boolean} show - Whether to show loading
 */
function showGlobalLoading(show) {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.style.display = show ? "flex" : "none";
    loader.setAttribute("aria-hidden", !show);
  }
}

/**
 * Shows global error message
 * @param {Error} error - The error that occurred
 */
function showGlobalError(error) {
  const errorContainer = document.getElementById("global-error");
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>Erro ao Carregar</h2>
        <p>Não foi possível carregar o conteúdo do site.</p>
        <p><small>${error.message}</small></p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          Tentar Novamente
        </button>
      </div>
    `;
    errorContainer.style.display = "block";
  }
}

/**
 * Handle errors globally
 */
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

/**
 * Start application when DOM is ready
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for debugging
window.__APP__ = app;

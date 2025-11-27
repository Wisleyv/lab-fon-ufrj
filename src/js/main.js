/**
 * Main Application Entry Point
 * Walking Skeleton - Lab Fonética UFRJ
 */

import { JSONAdapter } from "./adapters/JSONAdapter.js";
import { PesquisadoresSection } from "./sections/pesquisadores.js";
import { PublicacoesSection } from "./sections/publicacoes.js";
import { LinhasPesquisaSection } from "./sections/linhas-pesquisa.js";
import { ParceriasSection } from "./sections/parcerias.js";

/**
 * Application configuration
 */
const config = {
  dataSource: "json",
  jsonUrl: "./data.json", // Served from public/ folder via Vite
  publicationsUrl: "./publication_references.json",
  sections: {
    pesquisadores: "pesquisadores-container",
    publicacoes: "publicacoes-content",
    linhas_pesquisa: "linhas-pesquisa-content",
    parcerias: "parcerias-content",
  },
};

/**
 * Application state
 */
const app = {
  data: null,
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
    const adapter = new JSONAdapter(config.jsonUrl);
    app.data = await adapter.fetch();

    if (app.data.error) {
      throw new Error(app.data.message);
    }

    console.log("✅ Data loaded successfully:", app.data);

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

    app.isInitialized = true;
    console.log("✅ Application initialized successfully");
  } catch (error) {
    console.error("❌ Initialization error:", error);
    showGlobalError(error);
  } finally {
    showGlobalLoading(false);
  }
}

/**
 * Initialize all section renderers
 */
async function initializeSections() {
  // Initialize Pesquisadores section
  app.sections.pesquisadores = new PesquisadoresSection(
    config.sections.pesquisadores,
    {
      loadingMessage: "Carregando equipe...",
      errorMessage: "Não foi possível carregar a equipe.",
      emptyMessage: "Nenhum membro da equipe cadastrado.",
    },
  );

  // Initialize Publicações section
  app.sections.publicacoes = new PublicacoesSection(
    config.sections.publicacoes,
    {
      loadingMessage: "Carregando publicações...",
      errorMessage: "Não foi possível carregar as publicações.",
      emptyMessage: "Nenhuma publicação cadastrada.",
    },
  );

  // Initialize Linhas de Pesquisa section
  app.sections.linhas_pesquisa = new LinhasPesquisaSection(
    config.sections.linhas_pesquisa,
    {
      loadingMessage: "Carregando linhas de pesquisa...",
      errorMessage: "Não foi possível carregar as linhas de pesquisa.",
      emptyMessage: "Nenhuma linha de pesquisa cadastrada.",
    },
  );

  // Initialize Parcerias section
  app.sections.parcerias = new ParceriasSection(
    config.sections.parcerias,
    {
      loadingMessage: "Carregando parcerias...",
      errorMessage: "Não foi possível carregar as parcerias.",
      emptyMessage: "Nenhuma parceria cadastrada.",
    },
  );

  console.log("✅ Sections initialized");
}

/**
 * Render all sections with their data
 */
async function renderAllSections() {
  const renderPromises = [];

  // Render linhas de pesquisa
  if (app.data.linhas_pesquisa && app.data.linhas_pesquisa.length > 0) {
    console.log("📋 Rendering linhas de pesquisa...");
    renderPromises.push(
      app.sections.linhas_pesquisa.render(app.data.linhas_pesquisa),
    );
  }

  // Render equipe (team members with all categories)
  if (app.data.equipe && app.data.equipe.length > 0) {
    console.log("📋 Rendering equipe...");
    renderPromises.push(
      app.sections.pesquisadores.render(app.data.equipe),
    );
  }

  // Render parcerias
  if (app.data.parcerias && app.data.parcerias.length > 0) {
    console.log("📋 Rendering parcerias...");
    renderPromises.push(
      app.sections.parcerias.render(app.data.parcerias),
    );
  }

  // Load and render publications
  try {
    console.log("📋 Loading publications...");
    const pubAdapter = new JSONAdapter(config.publicationsUrl);
    const pubData = await pubAdapter.fetch();
    
    if (pubData.references && pubData.references.length > 0) {
      console.log("📋 Rendering publications...");
      renderPromises.push(
        app.sections.publicacoes.render(pubData.references),
      );
    }
  } catch (error) {
    console.error("❌ Error loading publications:", error);
  }

  await Promise.all(renderPromises);
  console.log("✅ All sections rendered");
}

/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
  const menuToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');

  if (!menuToggle || !navList) {
    console.warn('Mobile menu elements not found');
    return;
  }

  // Toggle menu on button click
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navList.classList.toggle('active');
    menuToggle.classList.toggle('active');

    // Update ARIA attributes
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    navList.setAttribute('aria-hidden', !isOpen);

    // Focus first link when opening
    if (isOpen) {
      const firstLink = navList.querySelector('a');
      firstLink?.focus();
    }
  });

  // Close menu when clicking navigation links (but not dropdown parent links)
  navList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      // Don't close menu if this is a dropdown parent link
      const isDropdownParent = link.closest('.has-dropdown') && 
                               link.getAttribute('aria-haspopup') === 'true';
      
      // Only close menu for actual navigation links or submenu items
      if (!isDropdownParent) {
        navList.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menu');
        navList.setAttribute('aria-hidden', 'true');
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.main-nav') && navList.classList.contains('active')) {
      navList.classList.remove('active');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir menu');
      navList.setAttribute('aria-hidden', 'true');
    }
  });

  // Close menu on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('active')) {
      navList.classList.remove('active');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir menu');
      navList.setAttribute('aria-hidden', 'true');
      menuToggle.focus();
    }
  });

  console.log('\u2705 Mobile menu initialized');
}

/**
 * Initialize dropdown navigation
 */
function initDropdownNav() {
  const dropdownItems = document.querySelectorAll('.has-dropdown');

  dropdownItems.forEach(item => {
    const link = item.querySelector('a');
    const menu = item.querySelector('.dropdown-menu');

    if (!link || !menu) return;

    // Handle mobile click to toggle dropdown
    link.addEventListener('click', (e) => {
      // On mobile (when nav-toggle is visible), toggle dropdown
      const navToggle = document.querySelector('.nav-toggle');
      if (navToggle && window.getComputedStyle(navToggle).display !== 'none') {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other dropdowns
        dropdownItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            otherItem.querySelector('a')?.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current dropdown
        const isOpen = item.classList.toggle('active');
        link.setAttribute('aria-expanded', isOpen);
      }
    });

    // Handle keyboard navigation
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle && window.getComputedStyle(navToggle).display !== 'none') {
          e.preventDefault();
          item.classList.toggle('active');
        }
      }
    });
  });

  console.log('\u2705 Dropdown navigation initialized');
}

/**
 * Initialize back-to-top button functionality
 */
function initBackToTop() {
  const backToTopButton = document.getElementById('back-to-top');
  
  if (!backToTopButton) {
    console.warn('Back-to-top button not found');
    return;
  }

  // Show/hide button based on scroll position
  const toggleButtonVisibility = () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  };

  // Scroll to top smoothly when clicked
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Listen to scroll events with throttling for performance
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(() => {
      toggleButtonVisibility();
    });
  }, { passive: true });

  console.log('\u2705 Back-to-top button initialized');
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

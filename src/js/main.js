/**
 * Main Application Entry Point
 * Walking Skeleton - Lab Fonética UFRJ
 */

import { JSONAdapter } from "./adapters/JSONAdapter.js";
import { PesquisadoresSection } from "./sections/pesquisadores.js";

/**
 * Application configuration
 */
const config = {
  dataSource: "json",
  jsonUrl: "./data.json", // Served from public/ folder via Vite
  sections: {
    pesquisadores: "pesquisadores-container",
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

  console.log("✅ Sections initialized");
}

/**
 * Render all sections with their data
 */
async function renderAllSections() {
  const renderPromises = [];

  // Render equipe (team members with all categories)
  if (app.data.equipe && app.data.equipe.length > 0) {
    console.log("📋 Rendering equipe...");
    renderPromises.push(
      app.sections.pesquisadores.render(app.data.equipe),
    );
  }

  await Promise.all(renderPromises);
  console.log("✅ All sections rendered");
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

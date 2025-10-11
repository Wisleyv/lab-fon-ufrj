/**
 * Base Section Renderer
 * Abstract class for rendering page sections
 */

import { createElement } from '../utils/helpers.js';

export class SectionRenderer {
  /**
   * Creates a section renderer instance
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Renderer options
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = null;
    this.options = {
      loadingMessage: 'Carregando...',
      errorMessage: 'Erro ao carregar conteúdo.',
      emptyMessage: 'Nenhum conteúdo disponível.',
      ...options
    };
    this.isRendering = false;
  }

  /**
   * Initializes the renderer (finds container)
   * @returns {boolean} True if container found
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`Container #${this.containerId} not found`);
      return false;
    }
    return true;
  }

  /**
   * Renders data into the container
   * @param {*} data - Data to render
   * @returns {Promise<void>}
   */
  async render(data) {
    if (!this.init()) return;
    
    if (this.isRendering) {
      console.warn('Rendering already in progress');
      return;
    }

    this.isRendering = true;
    this.showLoading();

    try {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        this.showEmpty();
        return;
      }

      const content = await this.template(data);
      this.container.innerHTML = '';
      
      if (typeof content === 'string') {
        this.container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.container.appendChild(content);
      } else if (Array.isArray(content)) {
        content.forEach(element => {
          if (element instanceof HTMLElement) {
            this.container.appendChild(element);
          }
        });
      }

      this.afterRender();
    } catch (error) {
      console.error('Render error:', error);
      this.showError(error);
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Template method - must be implemented by subclass
   * @param {*} data - Data to render
   * @returns {string|HTMLElement|HTMLElement[]} Rendered content
   * @throws {Error} Must be implemented by subclass
   */
  template(data) {
    throw new Error('Method template() must be implemented by subclass');
  }

  /**
   * Hook called after rendering completes
   * Override to add event listeners, animations, etc.
   */
  afterRender() {
    // Override in subclass if needed
  }

  /**
   * Shows loading state
   */
  showLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="loading" role="status" aria-live="polite">
        <div class="loading-spinner"></div>
        <p>${this.options.loadingMessage}</p>
      </div>
    `;
  }

  /**
   * Shows error state
   * @param {Error} error - The error that occurred
   */
  showError(error) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="error" role="alert">
        <p>${this.options.errorMessage}</p>
        ${error.message ? `<small>${error.message}</small>` : ''}
      </div>
    `;
  }

  /**
   * Shows empty state
   */
  showEmpty() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="empty">
        <p>${this.options.emptyMessage}</p>
      </div>
    `;
  }

  /**
   * Clears the container
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Destroys the renderer (cleanup)
   */
  destroy() {
    this.clear();
    this.container = null;
    this.isRendering = false;
  }
}

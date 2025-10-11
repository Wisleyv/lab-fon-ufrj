/**
 * Pesquisadores Section Renderer
 * Renders researcher cards with their information
 */

import { SectionRenderer } from '../modules/renderer.js';
import { HTMLSanitizer } from '../utils/sanitizer.js';
import { createElement, truncate } from '../utils/helpers.js';

export class PesquisadoresSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: 'Carregando pesquisadores...',
      errorMessage: 'Erro ao carregar pesquisadores.',
      emptyMessage: 'Nenhum pesquisador cadastrado.',
      ...options
    });
  }

  /**
   * Creates the HTML template for researchers
   * @param {Array} pesquisadores - Array of researcher objects
   * @returns {HTMLElement[]} Array of card elements
   */
  template(pesquisadores) {
    if (!Array.isArray(pesquisadores)) {
      console.error('Expected array of pesquisadores');
      return [];
    }

    return pesquisadores.map(pessoa => this.createCard(pessoa));
  }

  /**
   * Creates a single researcher card
   * @param {Object} pessoa - Researcher data
   * @returns {HTMLElement} Card element
   */
  createCard(pessoa) {
    // Sanitize all text inputs
    const nome = HTMLSanitizer.sanitize(pessoa.nome || 'Nome não informado');
    const cargo = HTMLSanitizer.sanitize(pessoa.cargo || '');
    const email = pessoa.email || '';
    const bio = HTMLSanitizer.sanitize(pessoa.bio || '');
    const bioTruncated = truncate(bio, 150);
    
    // Sanitize URLs
    const lattesUrl = HTMLSanitizer.sanitizeURL(pessoa.lattes);
    const emailUrl = pessoa.email ? `mailto:${pessoa.email}` : null;
    const foto = pessoa.foto || 'assets/images/placeholder-avatar.jpg';

    // Create card structure
    const card = createElement('article', {
      className: 'pesquisador-card',
      role: 'article',
      'aria-label': `Pesquisador: ${nome}`
    });

    // Photo
    const figure = createElement('figure', { className: 'pesquisador-foto' });
    const img = createElement('img', {
      src: foto,
      alt: `Foto de ${nome}`,
      loading: 'lazy'
    });
    figure.appendChild(img);

    // Content
    const content = createElement('div', { className: 'pesquisador-content' });
    
    const header = createElement('header', { className: 'pesquisador-header' });
    const h3 = createElement('h3', { className: 'pesquisador-nome' }, nome);
    header.appendChild(h3);
    
    if (cargo) {
      const cargoSpan = createElement('span', { className: 'pesquisador-cargo' }, cargo);
      header.appendChild(cargoSpan);
    }

    const bioP = createElement('p', { className: 'pesquisador-bio' }, bioTruncated);

    // Links
    const links = createElement('div', { className: 'pesquisador-links' });
    
    if (lattesUrl) {
      const lattesLink = createElement('a', {
        href: lattesUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'btn btn-secondary',
        'aria-label': `Currículo Lattes de ${nome}`
      }, 'Currículo Lattes');
      links.appendChild(lattesLink);
    }

    if (emailUrl) {
      const emailLink = createElement('a', {
        href: emailUrl,
        className: 'btn btn-secondary',
        'aria-label': `Email de ${nome}`
      }, 'Email');
      links.appendChild(emailLink);
    }

    // Assemble card
    content.appendChild(header);
    content.appendChild(bioP);
    content.appendChild(links);

    card.appendChild(figure);
    card.appendChild(content);

    return card;
  }

  /**
   * Hook called after rendering
   * Can add animations, event listeners, etc.
   */
  afterRender() {
    // Add entrance animations
    const cards = this.container.querySelectorAll('.pesquisador-card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('fade-in');
    });

    // Announce to screen readers
    this.announceContent(cards.length);
  }

  /**
   * Announces content to screen readers
   * @param {number} count - Number of cards rendered
   */
  announceContent(count) {
    const message = count === 1 
      ? 'Um pesquisador carregado' 
      : `${count} pesquisadores carregados`;
    
    // Create live region if it doesn't exist
    let liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) {
      liveRegion = createElement('div', {
        id: 'aria-live-region',
        className: 'sr-only',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      });
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;
    setTimeout(() => { liveRegion.textContent = ''; }, 1000);
  }
}

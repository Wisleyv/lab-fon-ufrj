// Main JavaScript file for rendering content from data.json

// Module for fetching data
const DataFetcher = {
  async fetchData() {
    try {
      const response = await fetch('data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }
};

// Module for rendering header
const HeaderRenderer = {
  render(data) {
    const section = document.getElementById('header-section');
    if (!section || !data) return;

    section.innerHTML = `
      <div class="header-content">
        <h1>${data.title}</h1>
        <p class="subtitle">${data.subtitle}</p>
      </div>
    `;
  }
};

// Module for rendering about section
const AboutRenderer = {
  render(data) {
    const section = document.getElementById('about-section');
    if (!section || !data) return;

    section.innerHTML = `
      <div class="section-content">
        <h2>${data.title}</h2>
        <p>${data.content}</p>
      </div>
    `;
  }
};

// Module for rendering research section
const ResearchRenderer = {
  render(data) {
    const section = document.getElementById('research-section');
    if (!section || !data) return;

    const areasHTML = data.areas.map(area => `
      <div class="research-area">
        <h3>${area.name}</h3>
        <p>${area.description}</p>
      </div>
    `).join('');

    section.innerHTML = `
      <div class="section-content">
        <h2>${data.title}</h2>
        <div class="research-areas">
          ${areasHTML}
        </div>
      </div>
    `;
  }
};

// Module for rendering team section
const TeamRenderer = {
  render(data) {
    const section = document.getElementById('team-section');
    if (!section || !data) return;

    const membersHTML = data.members.map(member => `
      <div class="team-member">
        <h3>${member.name}</h3>
        <p class="role">${member.role}</p>
      </div>
    `).join('');

    section.innerHTML = `
      <div class="section-content">
        <h2>${data.title}</h2>
        <div class="team-members">
          ${membersHTML}
        </div>
      </div>
    `;
  }
};

// Module for rendering publications section
const PublicationsRenderer = {
  render(data) {
    const section = document.getElementById('publications-section');
    if (!section || !data) return;

    const publicationsHTML = data.items.map(pub => `
      <div class="publication">
        <h3>${pub.title}</h3>
        <p class="authors">${pub.authors}</p>
        <p class="meta">${pub.journal}, ${pub.year}</p>
      </div>
    `).join('');

    section.innerHTML = `
      <div class="section-content">
        <h2>${data.title}</h2>
        <div class="publications-list">
          ${publicationsHTML}
        </div>
      </div>
    `;
  }
};

// Module for rendering contact section
const ContactRenderer = {
  render(data) {
    const section = document.getElementById('contact-section');
    if (!section || !data) return;

    section.innerHTML = `
      <div class="section-content">
        <h2>${data.title}</h2>
        <div class="contact-info">
          <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          <p><strong>Telefone:</strong> ${data.phone}</p>
          <p><strong>Endereço:</strong> ${data.address}</p>
        </div>
      </div>
    `;
  }
};

// Module for rendering footer
const FooterRenderer = {
  render(data) {
    const section = document.getElementById('footer-section');
    if (!section || !data) return;

    const socialHTML = data.social.map(social => `
      <a href="${social.url}" class="social-link">${social.platform}</a>
    `).join(' | ');

    section.innerHTML = `
      <div class="footer-content">
        <p>${data.copyright}</p>
        <div class="social-links">
          ${socialHTML}
        </div>
      </div>
    `;
  }
};

// Main application module
const App = {
  async init() {
    const data = await DataFetcher.fetchData();
    
    if (!data) {
      console.error('Failed to load data');
      return;
    }

    // Render all sections
    HeaderRenderer.render(data.header);
    AboutRenderer.render(data.about);
    ResearchRenderer.render(data.research);
    TeamRenderer.render(data.team);
    PublicationsRenderer.render(data.publications);
    ContactRenderer.render(data.contact);
    FooterRenderer.render(data.footer);
  }
};

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

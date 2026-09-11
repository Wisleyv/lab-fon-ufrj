/**
 * Extensão Section Renderer
 * Renders laboratory extension projects, currently including PROVALE content.
 */

import { SectionRenderer } from "../modules/renderer.js";
import { HTMLSanitizer } from "../utils/sanitizer.js";
import { createElement } from "../utils/helpers.js";

export class ExtensaoSection extends SectionRenderer {
  constructor(containerId, options = {}) {
    super(containerId, {
      loadingMessage: "Carregando extensão...",
      errorMessage: "Erro ao carregar extensão.",
      emptyMessage: "Nenhuma atividade de extensão cadastrada.",
      ...options,
    });
  }

  template(extensionData) {
    const projects = Array.isArray(extensionData?.projects)
      ? extensionData.projects
      : [];

    if (projects.length === 0) {
      return this.createEmptyState();
    }

    const fragment = document.createDocumentFragment();

    projects.forEach((project) => {
      fragment.appendChild(this.createProject(project));
    });

    return fragment;
  }

  createProject(project) {
    const article = createElement("article", {
      className: "extension-project",
      "aria-labelledby": `extension-project-${project.id || "project"}`,
    });

    const title = createElement(
      "h3",
      {
        id: `extension-project-${project.id || "project"}`,
        className: "extension-project-title",
      },
      HTMLSanitizer.sanitize(project.title || "Projeto de Extensão"),
    );
    const projectType = createElement(
      "p",
      { className: "extension-project-type" },
      HTMLSanitizer.sanitize(project.projectType || "Projeto de Extensão"),
    );
    article.appendChild(projectType);
    article.appendChild(title);

    article.appendChild(this.createProjectBio(project));
    article.appendChild(this.createInstagramFeed(project.instagram));

    return article;
  }

  createProjectBio(project) {
    const bio = createElement("div", { className: "extension-project-bio" });

    if (project.image?.src) {
      const image = createElement("img", {
        className: "extension-project-image",
        src: HTMLSanitizer.sanitizeURL(project.image.src) || project.image.src,
        alt: HTMLSanitizer.sanitize(
          project.image.alt || `Imagem de ${project.title || "projeto"}`,
        ),
        loading: "lazy",
      });
      bio.appendChild(image);
    }

    if (project.minibio) {
      bio.appendChild(
        createElement(
          "p",
          { className: "extension-project-minibio" },
          HTMLSanitizer.sanitize(project.minibio),
        ),
      );
    } else {
      bio.appendChild(
        createElement(
          "p",
          { className: "extension-project-minibio extension-empty-text" },
          "Apresentação do projeto ainda não configurada.",
        ),
      );
    }

    if (project.complementaryText) {
      bio.appendChild(
        createElement(
          "p",
          { className: "extension-project-complementary" },
          HTMLSanitizer.sanitize(project.complementaryText),
        ),
      );
    }

    const coordination = this.createCoordination(project.coordination);
    if (coordination) bio.appendChild(coordination);

    const socialLinks = this.createSocialLinks(project.socialLinks);
    if (socialLinks) bio.appendChild(socialLinks);

    return bio;
  }

  createCoordination(coordination) {
    if (!Array.isArray(coordination) || coordination.length === 0) {
      return null;
    }

    const section = createElement("div", {
      className: "extension-project-coordination",
    });
    section.appendChild(createElement("h4", {}, "Coordenação"));

    const list = createElement("ul");
    coordination.forEach((person) => {
      list.appendChild(
        createElement(
          "li",
          {},
          HTMLSanitizer.sanitize(
            [person.name, person.role].filter(Boolean).join(" - "),
          ),
        ),
      );
    });
    section.appendChild(list);

    return section;
  }

  createSocialLinks(links) {
    if (!Array.isArray(links) || links.length === 0) {
      return null;
    }

    const list = createElement("ul", { className: "extension-social-links" });
    links.forEach((link) => {
      const safeUrl = HTMLSanitizer.sanitizeURL(link.url);
      if (!safeUrl) return;

      const item = createElement("li");
      item.appendChild(
        createElement(
          "a",
          {
            href: safeUrl,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          HTMLSanitizer.sanitize(link.label || link.platform || safeUrl),
        ),
      );
      list.appendChild(item);
    });

    return list.children.length > 0 ? list : null;
  }

  createInstagramFeed(instagram) {
    const region = createElement("section", {
      className: "extension-instagram-feed",
      "aria-labelledby": "extension-instagram-title",
    });

    region.appendChild(
      createElement("h4", { id: "extension-instagram-title" }, "Instagram"),
    );

    if (!instagram?.enabled || !instagram?.source) {
      region.appendChild(
        createElement(
          "p",
          { className: "extension-feed-empty" },
          "Feed do Instagram ainda não configurado.",
        ),
      );
      return region;
    }

    region.dataset.instagramSource = instagram.source;
    region.dataset.instagramProvider = instagram.provider || "unconfigured";
    region.appendChild(
      createElement(
        "p",
        { className: "extension-feed-empty" },
        "Feed do Instagram indisponível no momento.",
      ),
    );

    return region;
  }

  createEmptyState() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(
      createElement(
        "div",
        { className: "extension-empty" },
        this.options.emptyMessage,
      ),
    );
    return fragment;
  }
}

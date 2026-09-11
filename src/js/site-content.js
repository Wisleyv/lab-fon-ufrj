import { HTMLSanitizer } from "./utils/sanitizer.js";
import { createElement } from "./utils/helpers.js";

export function applySiteContent(documentRef, site = {}, options = {}) {
  applyHeaderContent(documentRef, site.header, options);
  applyHeroContent(documentRef, site.hero, options);
  applySobreContent(documentRef, site.sobre);
  applyFooterContent(documentRef, site.footer, options);
}

function setText(documentRef, selector, value) {
  const element = documentRef.querySelector(selector);
  if (!element || value === undefined || value === null) return;
  element.textContent = String(value);
}

function applyHeaderContent(documentRef, header = {}, options = {}) {
  setText(documentRef, "[data-site-header-title]", header.title);
  setText(documentRef, "[data-site-header-subtitle]", header.subtitle);

  const logo = header.logo || {};
  const source = documentRef.querySelector("[data-site-logo-source]");
  const image = documentRef.querySelector("[data-site-logo-image]");

  if (source && logo.source) {
    source.setAttribute("srcset", getLogoAssetURL(logo.source, options));
  }

  if (image) {
    if (logo.fallback) {
      image.setAttribute("src", getLogoAssetURL(logo.fallback, options));
    }

    if (logo.srcset) {
      image.setAttribute("srcset", logo.srcset.split(",").map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        return [getLogoAssetURL(url, options), ...descriptor].join(" ");
      }).join(", "));
    }

    if (logo.alt) {
      image.setAttribute("alt", logo.alt);
    }
  }
}

function getLogoAssetURL(url, options) {
  if (options.assetBase && /^\/?assets\//.test(url)) {
    return `${options.assetBase}${url.replace(/^\//, "")}`;
  }
  return getSafeURL(url);
}

function applyHeroContent(documentRef, hero = {}, options = {}) {
  setText(documentRef, "[data-site-hero-title]", hero.title);
  setText(documentRef, "[data-site-hero-description]", hero.description);

  const actionsContainer = documentRef.querySelector(
    "[data-site-hero-actions]",
  );
  if (!actionsContainer || !Array.isArray(hero.actions)) return;

  actionsContainer.innerHTML = "";
  hero.actions.forEach((action) => {
    if (!action?.label || !action?.href) return;
    if (!isVisibleSiteLink(action.href, options)) return;

    const style = action.style === "primary" ? "primary" : "secondary";
    const link = createElement("a", {
      href: getSafeURL(action.href),
      className: `btn btn-${style}`,
    });
    link.textContent = action.label;
    actionsContainer.appendChild(link);
  });
}

function applySobreContent(documentRef, sobre = {}) {
  setText(documentRef, "[data-site-sobre-title]", sobre.title);

  const content = documentRef.querySelector("[data-site-sobre-content]");
  if (!content || !Array.isArray(sobre.paragraphs)) return;

  content.innerHTML = "";
  sobre.paragraphs.forEach((paragraph) => {
    const paragraphElement = createElement("p");

    if (typeof paragraph === "string") {
      paragraphElement.textContent = paragraph;
    } else if (paragraph?.text) {
      if (paragraph.label) {
        const label = createElement("strong");
        label.textContent = paragraph.label;
        paragraphElement.appendChild(label);
        paragraphElement.appendChild(documentRef.createTextNode(" "));
      }
      paragraphElement.appendChild(documentRef.createTextNode(paragraph.text));
    } else {
      return;
    }

    content.appendChild(paragraphElement);
  });
}

function applyFooterContent(documentRef, footer = {}, options = {}) {
  const footerContent = documentRef.querySelector("[data-site-footer-content]");
  if (footerContent && Array.isArray(footer.sections)) {
    footerContent.innerHTML = "";
    footer.sections.forEach((section) => {
      const sectionElement = createFooterSection(documentRef, section, options);
      if (sectionElement) {
        footerContent.appendChild(sectionElement);
      }
    });
  }

  setText(documentRef, "[data-site-footer-bottom]", footer.bottomText);
}

function createFooterSection(documentRef, section, options = {}) {
  if (!section?.title) return null;

  const sectionElement = createElement("div", { className: "footer-section" });
  const title = createElement("h3");
  title.textContent = section.title;
  sectionElement.appendChild(title);

  if (Array.isArray(section.lines)) {
    const paragraph = createElement("p");
    section.lines.forEach((line, index) => {
      if (index > 0) {
        paragraph.appendChild(createElement("br"));
      }
      paragraph.appendChild(documentRef.createTextNode(line));
    });
    sectionElement.appendChild(paragraph);
  }

  if (Array.isArray(section.contacts)) {
    sectionElement.appendChild(
      createFooterContacts(documentRef, section.contacts),
    );
  }

  if (Array.isArray(section.links)) {
    const links = createFooterLinks(section.links, options);
    if (links.childElementCount > 0) {
      sectionElement.appendChild(links);
    }
  }

  return sectionElement;
}

function createFooterContacts(documentRef, contacts) {
  const paragraph = createElement("p");

  contacts.forEach((contact, index) => {
    if (!contact?.text) return;
    if (index > 0) {
      paragraph.appendChild(createElement("br"));
    }

    if (contact.label) {
      paragraph.appendChild(documentRef.createTextNode(`${contact.label}: `));
    }

    if (contact.href) {
      const link = createFooterLink(contact.text, contact.href);
      paragraph.appendChild(link);
    } else {
      paragraph.appendChild(documentRef.createTextNode(contact.text));
    }
  });

  return paragraph;
}

function createFooterLinks(links, options = {}) {
  const list = createElement("ul");

  links.forEach((linkData) => {
    if (!linkData?.label || !linkData?.href) return;
    if (!isVisibleSiteLink(linkData.href, options)) return;
    const item = createElement("li");
    item.appendChild(createFooterLink(linkData.label, linkData.href));
    list.appendChild(item);
  });

  return list;
}

function createFooterLink(label, href) {
  const link = createElement("a", {
    href: getSafeURL(href),
  });
  link.textContent = label;

  if (!href.startsWith("#") && !href.startsWith("mailto:")) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }

  return link;
}

function isVisibleSiteLink(href, options = {}) {
  if (!href?.startsWith("#")) return true;
  if (!options.visibleSectionAnchors) return true;

  return options.visibleSectionAnchors.has(href);
}

function getSafeURL(url) {
  if (!url || typeof url !== "string") return "";

  if (url.startsWith("#") || url.startsWith("/")) {
    return url;
  }

  return HTMLSanitizer.sanitizeURL(url) || "";
}

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

  if (!header.logo) return;
  const logo = header.logo;
  let source = documentRef.querySelector("[data-site-logo-source]");
  const image = documentRef.querySelector("[data-site-logo-image]");

  if (logo.source && image?.parentElement?.tagName === "PICTURE") {
    if (!source) {
      source = documentRef.createElement("source");
      source.setAttribute("data-site-logo-source", "");
      source.setAttribute("type", "image/svg+xml");
      image.before(source);
    }
    source.setAttribute("srcset", getLogoAssetURL(logo.source, options));
  } else source?.remove();

  if (image) {
    if (logo.fallback) {
      image.setAttribute("src", getLogoAssetURL(logo.fallback, options));
    } else image.removeAttribute("src");

    if (logo.srcset) {
      image.setAttribute("srcset", logo.srcset.split(",").map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        return [getLogoAssetURL(url, options), ...descriptor].join(" ");
      }).join(", "));
    } else image.removeAttribute("srcset");

    if (typeof logo.alt === "string") {
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

  if (footerContent) {
    footerContent.querySelector(".footer-coordination")?.remove();
    const coordination = createFooterCoordination(footer.coordination);
    if (coordination) footerContent.insertBefore(coordination, footerContent.querySelector(".footer-contact"));
    footerContent.classList.toggle("has-coordination", Boolean(coordination));

    const parent = footerContent.parentElement;
    parent?.querySelector("[data-site-footer-credits]")?.remove();
    const credits = createFooterCredits(footer.institutionalCredits);
    if (credits) footerContent.after(credits);
  }

  setText(documentRef, "[data-site-footer-bottom]", formatCopyright(footer.bottomText));
}

function formatCopyright(text) {
  if (typeof text !== "string" || !/^©\s+/.test(text)) return text;
  // Accept the former literal prefix without rewriting years inside editable wording.
  const wording = text.replace(/^©\s+(?:\d{4}(?:[–-]\d{4})?\s+)?/, "");
  const startYear = 1990;
  const currentYear = new Date().getFullYear();
  const period = currentYear > startYear ? `${startYear}–${currentYear}` : String(startYear);
  return `© ${period} ${wording}`;
}

function createFooterCoordination(coordination = {}) {
  const column = createElement("div", {
    className: "footer-section footer-coordination",
  });
  for (const [key, label] of [
    ["lab", "Coordenação do Laboratório"],
    ["extensionProject", "Coordenação do PROVALE em Extensão"],
  ]) {
    const people = Array.isArray(coordination?.[key])
      ? coordination[key].filter((person) => typeof person?.name === "string" && person.name.trim())
      : [];
    if (!people.length) continue;
    const group = createElement("div", { className: "footer-coordination-group" });
    group.appendChild(createElement("h4", {}, label));
    const list = createElement("ul");
    for (const person of people) {
      const item = createElement("li");
      item.textContent = [person.name, person.role, person.institution]
        .filter((value) => typeof value === "string" && value.trim()).join(" - ");
      list.appendChild(item);
    }
    group.appendChild(list);
    column.appendChild(group);
  }
  if (!column.childElementCount) return null;
  column.prepend(createElement("h3", {}, "Coordenação"));
  return column;
}

function createFooterCredits(credits) {
  if (!Array.isArray(credits)) return null;
  const list = createElement("ul", {
    className: "footer-credits",
    "data-site-footer-credits": "",
    "aria-label": "Créditos institucionais",
  });
  for (const credit of credits) {
    const parts = [credit?.label, credit?.name]
      .filter((value) => typeof value === "string" && value.trim());
    if (!parts.length) continue;
    const item = createElement("li");
    const label = parts[0];
    if (typeof credit.href === "string" && getSafeURL(credit.href)) item.appendChild(createFooterLink(label, credit.href));
    else item.textContent = label;
    list.appendChild(item);
  }
  return list.childElementCount ? list : null;
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
    sectionElement.classList.add("footer-contact");
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

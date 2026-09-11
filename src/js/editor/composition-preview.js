import { applyPageComposition } from "../page/composition.js";
import { renderPageNavigation } from "../page/navigation.js";
import {
  SECTION_REGISTRY,
  createSectionRenderer,
  getSectionDefinition,
  isRenderableSection,
} from "../page/section-registry.js";
import { createElement } from "../utils/helpers.js";
import { applySiteContent } from "../site-content.js";

function createPreviewSection(documentRef, definition) {
  const section = createElement("section", {
    id: definition.sectionId,
    className: "editor-preview-section",
    "data-page-section": definition.type,
  });

  const heading = createElement("h3", {}, definition.label);
  section.appendChild(heading);
  if (definition.type === "sobre") {
    heading.setAttribute("data-site-sobre-title", "");
    section.appendChild(createElement("div", { "data-site-sobre-content": "" }));
  }

  if (definition.type === "equipe") {
    section.appendChild(
      createElement("div", { id: "view-toggle-placeholder" }),
    );
  }

  if (definition.containerId) {
    section.appendChild(
      createElement("div", {
        id: definition.containerId,
        className: "editor-preview-section-content",
      }),
    );
  }

  return section;
}

function getPreviewData(definition, previewData) {
  if (previewData.editorSiteModel) {
    return getEditorModelPreviewData(definition, previewData.editorSiteModel);
  }

  if (definition.dataSource === "publications") {
    return previewData.publications?.[definition.dataKey] || [];
  }

  return previewData.site?.[definition.dataKey] || [];
}

function getEditorModelPreviewData(definition, model) {
  const dataByKey = {
    equipe: model.equipe,
    linhas_pesquisa: model.linhasPesquisa,
    extensao: model.extensao,
    parcerias: model.parcerias,
    publicacoes: model.publicacoes,
  };

  return dataByKey[definition.dataKey] || [];
}

export async function renderCompositionPreview({
  documentRef = document,
  container,
  composition,
  previewData = {},
  registry = SECTION_REGISTRY,
}) {
  if (!container) return null;

  container.innerHTML = "";
  const normalized = applyPageComposition(documentRef, composition, registry);

  const nav = createElement("nav", {
    className: "editor-preview-nav",
    "aria-label": "Navegação principal da prévia",
  });
  const navList = createElement("ul", { id: "main-navigation" });
  nav.appendChild(navList);
  container.appendChild(nav);

  const main = createElement("main", {
    id: "main-content",
    className: "editor-preview-main",
  });

  const previewSections = normalized.sections
    .filter((section) => section.enabled)
    .map((section) => getSectionDefinition(section.type, registry))
    .filter(Boolean);

  previewSections.forEach((definition) => {
    main.appendChild(createPreviewSection(documentRef, definition));
  });

  container.appendChild(main);
  if (previewData.editorSiteModel?.site) {
    const hero = createElement("section", { className: "editor-preview-section" });
    hero.append(
      createElement("h2", { "data-site-hero-title": "" }),
      createElement("p", { "data-site-hero-description": "" }),
      createElement("div", { "data-site-hero-actions": "" }),
    );
    main.prepend(hero);
    const footer = createElement("footer", { id: "contato" });
    footer.append(createElement("div", { "data-site-footer-content": "" }), createElement("p", { "data-site-footer-bottom": "" }));
    main.appendChild(footer);
    applySiteContent({ querySelector: (selector) => container.querySelector(selector), createTextNode: (text) => documentRef.createTextNode(text) }, previewData.editorSiteModel.site, {
      visibleSectionAnchors: new Set(["#contato", ...previewSections.map((definition) => `#${definition.sectionId}`)]),
    });
  }

  renderPageNavigation({
    documentRef,
    composition: normalized,
    registry,
  });
  const renderPromises = normalized.sections
    .filter((section) => section.enabled && isRenderableSection(section.type))
    .map((section) => {
      const definition = registry[section.type];
      const renderer = createSectionRenderer(section.type, registry);
      const data = getPreviewData(definition, previewData);
      return renderer.render(data);
    });

  await Promise.all(renderPromises);

  return normalized;
}

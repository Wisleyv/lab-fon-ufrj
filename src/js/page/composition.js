import { createDefaultPageComposition } from "./default-composition.js";
import { SECTION_REGISTRY, getSectionDefinition } from "./section-registry.js";

function hasSections(page) {
  return Array.isArray(page?.sections) && page.sections.length > 0;
}

function normalizeOrder(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createDiagnostic(code, message, section = null) {
  return {
    code,
    severity: "error",
    message,
    sectionId: section?.id || null,
    sectionType: section?.type || null,
  };
}

function normalizeSectionId(section, definition) {
  const id = section.id || definition.sectionId || section.type;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function normalizeSections(page, registry, diagnostics) {
  const source = hasSections(page) ? page : createDefaultPageComposition();
  const seenIds = new Set();
  const seenUniqueTypes = new Set();

  return source.sections
    .map((section, index) => {
      if (!section || typeof section !== "object") {
        diagnostics.push(
          createDiagnostic(
            "PAGE_SECTION_INVALID",
            "Uma seção da página está malformada.",
          ),
        );
        return null;
      }

      const definition = getSectionDefinition(section.type, registry);

      if (!definition) {
        diagnostics.push(
          createDiagnostic(
            "PAGE_SECTION_UNSUPPORTED_TYPE",
            "A composição contém uma seção de tipo não suportado.",
            section,
          ),
        );
        return null;
      }

      const id = normalizeSectionId(section, definition);

      if (!id) {
        diagnostics.push(
          createDiagnostic(
            "PAGE_SECTION_INVALID_ID",
            "Uma seção da página não possui identificador válido.",
            section,
          ),
        );
        return null;
      }

      if (seenIds.has(id)) {
        diagnostics.push(
          createDiagnostic(
            "PAGE_SECTION_DUPLICATE_ID",
            "A composição contém identificadores de seção repetidos.",
            section,
          ),
        );
        return null;
      }

      seenIds.add(id);

      if (definition.unique && seenUniqueTypes.has(section.type)) {
        diagnostics.push(
          createDiagnostic(
            "PAGE_SECTION_DUPLICATE_TYPE",
            "A composição contém mais de uma instância de uma seção única.",
            section,
          ),
        );
        return null;
      }

      if (definition.unique) {
        seenUniqueTypes.add(section.type);
      }

      return {
        id,
        type: section.type,
        enabled: section.enabled !== false,
        order: normalizeOrder(section.order, index + 1),
        navigation: {
          visible: section.navigation?.visible === true,
          label: section.navigation?.label || definition.label || section.type,
          children: Array.isArray(section.navigation?.children)
            ? section.navigation.children.map((child) => ({ ...child }))
            : [],
        },
        presentation: {
          variant: section.presentation?.variant || "default",
        },
        lifecycle: section.lifecycle ? { ...section.lifecycle } : undefined,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function validatePageComposition(page, registry = SECTION_REGISTRY) {
  const diagnostics = [];

  if (!hasSections(page)) {
    diagnostics.push(
      createDiagnostic(
        "PAGE_COMPOSITION_MISSING",
        "A composição da página não foi encontrada ou está vazia.",
      ),
    );
  }

  const normalized = {
    kind: page?.kind || "single-page",
    sections: normalizeSections(page, registry, diagnostics).map(
      (section, index) => ({
        ...section,
        order: index + 1,
      }),
    ),
  };

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    composition: normalized,
  };
}

export function normalizePageComposition(page, registry = SECTION_REGISTRY) {
  return validatePageComposition(page, registry).composition;
}

export function applyPageComposition(
  documentRef,
  page,
  registry = SECTION_REGISTRY,
) {
  const composition = normalizePageComposition(page, registry);
  const main = documentRef.getElementById("main-content");

  if (!main) {
    return composition;
  }

  const activeTypes = new Set(
    composition.sections
      .filter((section) => section.enabled)
      .map((section) => section.type),
  );

  Object.values(registry).forEach((definition) => {
    const element = documentRef.getElementById(definition.sectionId);
    if (!element) return;

    const isActive = activeTypes.has(definition.type);
    element.hidden = !isActive;
    element.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  const orderedSections = documentRef.createDocumentFragment();

  composition.sections.forEach((section) => {
    if (!section.enabled) return;

    const definition = getSectionDefinition(section.type, registry);
    const element = definition
      ? documentRef.getElementById(definition.sectionId)
      : null;

    if (element) {
      element.dataset.pageSection = section.type;
      orderedSections.appendChild(element);
    }
  });

  main.appendChild(orderedSections);

  return composition;
}

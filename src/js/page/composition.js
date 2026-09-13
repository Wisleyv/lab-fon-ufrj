import { createDefaultPageComposition } from "./default-composition.js";
import { SECTION_REGISTRY, getSectionDefinition } from "./section-registry.js";
import { hasOnlyKeys, validCustomSection, normalizeCustomSection } from "./custom-schema.js";
import { createCustomSectionElement } from "../sections/custom.js";

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
  const anchors = new Set(["top", "contato", ...Object.values(registry).map((definition) => definition.sectionId).filter(Boolean),
    ...source.sections.filter((section) => section?.type === "custom").map((section) => section.id)]);

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

      if (section.type === "custom") {
        if (page.schemaVersion !== 2 || !validCustomSection(section, anchors)) {
          diagnostics.push(createDiagnostic("PAGE_CUSTOM_INVALID", "A seção personalizada contém dados inválidos ou não suportados.", section));
          return null;
        }
        return normalizeCustomSection(section);
      }
      if (id.startsWith("custom-") ||
          !hasOnlyKeys(section, ["id", "type", "enabled", "order", "navigation", "presentation", "lifecycle"]) ||
          (section.navigation !== undefined && !hasOnlyKeys(section.navigation, ["visible", "label", "children"])) ||
          (section.presentation !== undefined && !hasOnlyKeys(section.presentation, ["variant"])) ||
          (section.lifecycle !== undefined && !hasOnlyKeys(section.lifecycle, ["status"])) ||
          (section.navigation?.children !== undefined && (!Array.isArray(section.navigation.children) ||
            section.navigation.children.some((child) => !hasOnlyKeys(child, ["label", "type", "targetId"]))))) {
        diagnostics.push(createDiagnostic("PAGE_SECTION_UNSUPPORTED_FIELD", "A seção contém campos não suportados.", section));
      }

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
  if (!hasOnlyKeys(page, ["schemaVersion", "kind", "sections"]) ||
      (page.schemaVersion !== undefined && page.schemaVersion !== 1 && page.schemaVersion !== 2) ||
      (page.kind !== undefined && page.kind !== "single-page")) {
    diagnostics.push(createDiagnostic("PAGE_SCHEMA_UNSUPPORTED", "A versão ou os campos da página não são suportados."));
  }
  if (page?.schemaVersion === 2 && Array.isArray(page.sections)) {
    const custom = page.sections.filter((section) => section?.type === "custom");
    if (page.sections.length > 100 || custom.length > 50 ||
        custom.reduce((count, section) => count + (section.content?.blocks?.length || 0), 0) > 500 ||
        new TextEncoder().encode(`${JSON.stringify(page, null, 2)}\n`).length > 1048576) {
      diagnostics.push(createDiagnostic("PAGE_LIMIT_EXCEEDED", "A página excede os limites de conteúdo."));
    }
  }

  if (!hasSections(page)) {
    diagnostics.push(
      createDiagnostic(
        "PAGE_COMPOSITION_MISSING",
        "A composição da página não foi encontrada ou está vazia.",
      ),
    );
  }

  const normalized = {
    ...(page?.schemaVersion !== undefined ? { schemaVersion: page.schemaVersion } : {}),
    kind: page?.kind || "single-page",
    sections: normalizeSections(page, registry, diagnostics).map(
      (section, index) => ({
        ...section,
        order: index + 1,
      }),
    ),
  };
  if (page?.schemaVersion === 2 && new TextEncoder().encode(`${JSON.stringify(normalized, null, 2)}\n`).length > 1048576 &&
      !diagnostics.some((item) => item.code === "PAGE_LIMIT_EXCEEDED")) {
    diagnostics.push(createDiagnostic("PAGE_LIMIT_EXCEEDED", "A página excede os limites de conteúdo."));
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    composition: normalized,
  };
}

export function normalizePageComposition(page, registry = SECTION_REGISTRY) {
  const result = validatePageComposition(page === undefined ? createDefaultPageComposition() : page, registry);
  if (!result.valid) {
    const error = new Error(result.diagnostics.map((item) => item.message).join(" "));
    error.diagnostics = result.diagnostics;
    throw error;
  }
  return result.composition;
}

export function applyPageComposition(
  documentRef,
  page,
  registry = SECTION_REGISTRY,
  root = documentRef,
) {
  const composition = normalizePageComposition(page, registry);
  const find = (id) => root.querySelector(`[id="${id}"]`);
  const main = find("main-content");

  if (!main) {
    return composition;
  }

  const activeTypes = new Set(
    composition.sections
      .filter((section) => section.enabled)
      .map((section) => section.type),
  );

  Object.values(registry).forEach((definition) => {
    const element = definition.sectionId ? find(definition.sectionId) : null;
    if (!element) return;

    const isActive = activeTypes.has(definition.type);
    element.hidden = !isActive;
    element.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  const orderedSections = documentRef.createDocumentFragment();
  main.querySelectorAll('[data-page-section="custom"]').forEach((element) => element.remove());

  composition.sections.forEach((section) => {
    if (!section.enabled) return;

    const definition = getSectionDefinition(section.type, registry);
    const element = section.type === "custom"
      ? createCustomSectionElement(documentRef, section)
      : definition ? find(definition.sectionId)
      : null;

    if (element) {
      element.dataset.pageSection = section.type;
      orderedSections.appendChild(element);
    }
  });

  main.appendChild(orderedSections);

  return composition;
}

import { createDefaultPageComposition } from "../page/default-composition.js";
import {
  normalizePageComposition,
  validatePageComposition,
} from "../page/composition.js";
import {
  SECTION_REGISTRY,
  getSectionDefinition,
} from "../page/section-registry.js";

function cloneComposition(composition) {
  return JSON.parse(JSON.stringify(composition));
}

function normalizeDraft(composition) {
  return normalizePageComposition(
    composition || createDefaultPageComposition(),
  );
}

function reindexSections(sections) {
  return sections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}

export function createDraftComposition(composition) {
  return cloneComposition(normalizeDraft(composition));
}

export function compositionsEqual(left, right) {
  return (
    JSON.stringify(normalizeDraft(left)) ===
    JSON.stringify(normalizeDraft(right))
  );
}

export function restoreDraftComposition(loadedComposition) {
  return createDraftComposition(loadedComposition);
}

export function moveSection(composition, sectionId, direction) {
  const draft = normalizeDraft(composition);
  const sections = [...draft.sections];
  const currentIndex = sections.findIndex(
    (section) => section.id === sectionId,
  );

  if (currentIndex === -1) return draft;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= sections.length) {
    return draft;
  }

  const [section] = sections.splice(currentIndex, 1);
  sections.splice(targetIndex, 0, section);

  return {
    ...draft,
    sections: reindexSections(sections),
  };
}

export function removeSection(composition, sectionId) {
  const draft = normalizeDraft(composition);

  return {
    ...draft,
    sections: draft.sections.map((section) =>
      section.id === sectionId ? { ...section, enabled: false } : section,
    ),
  };
}

export function addSection(
  composition,
  sectionType,
  registry = SECTION_REGISTRY,
) {
  const draft = normalizeDraft(composition);
  const definition = getSectionDefinition(sectionType, registry);

  if (!definition) return draft;

  const existingSection = draft.sections.find(
    (section) => section.type === sectionType,
  );

  if (existingSection) {
    return {
      ...draft,
      sections: reindexSections(
        draft.sections.map((section) =>
          section.type === sectionType
            ? { ...section, enabled: true }
            : section,
        ),
      ),
    };
  }

  const nextOrder = draft.sections.length + 1;

  return {
    ...draft,
    sections: [
      ...draft.sections,
      {
        id: definition.sectionId || sectionType,
        type: sectionType,
        enabled: true,
        order: nextOrder,
      },
    ],
  };
}

export function getAvailableSectionTypes(
  composition,
  registry = SECTION_REGISTRY,
) {
  const draft = normalizeDraft(composition);
  const enabledTypes = new Set(
    draft.sections
      .filter((section) => section.enabled)
      .map((section) => section.type),
  );

  return Object.values(registry)
    .filter((definition) => !enabledTypes.has(definition.type))
    .map((definition) => definition.type);
}

export function validateDraftComposition(
  composition,
  registry = SECTION_REGISTRY,
) {
  return validatePageComposition(composition, registry);
}

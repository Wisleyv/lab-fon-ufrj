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
  insertionTarget,
) {
  if (sectionType === "custom") return { ok: false, diagnostics: [{ code: "CUSTOM_CREATION_REQUIRED", severity: "error", message: "Informe o título da nova seção." }] };
  if (insertionTarget !== undefined) {
    const validation = validatePageComposition(composition, registry);
    const invalid = () => ({
      ok: false,
      diagnostics: [{ code: "SECTION_INSERTION_INVALID", severity: "error", message: "A posição escolhida não está disponível. Selecione uma seção ativa ou o início da página." }],
    });
    if (!validation.valid) return { ok: false, diagnostics: validation.diagnostics };
    if (!insertionTarget || !Object.hasOwn(insertionTarget, "afterSectionId")) return invalid();
    const definition = getSectionDefinition(sectionType, registry);
    if (!definition) return invalid();
    const draft = validation.composition;
    const existing = draft.sections.find((section) => section.type === sectionType);
    if (existing?.enabled) return invalid();
    const sections = draft.sections.filter((section) => section !== existing);
    const afterId = insertionTarget.afterSectionId;
    const targetIndex = sections.findIndex((section) => section.id === afterId && section.enabled);
    if (afterId !== null && targetIndex === -1) return invalid();
    const section = existing
      ? { ...existing, enabled: true }
      : { id: definition.sectionId || sectionType, type: sectionType, enabled: true };
    sections.splice(afterId === null ? 0 : targetIndex + 1, 0, section);
    const result = validatePageComposition({ ...draft, sections: reindexSections(sections) }, registry);
    return result.valid ? result.composition : { ok: false, diagnostics: result.diagnostics };
  }
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
    .filter((definition) => definition.unique && !enabledTypes.has(definition.type))
    .map((definition) => definition.type);
}

function placeCustom(draft, entry, insertionTarget) {
  const sections = draft.sections.filter((section) => section.id !== entry.id);
  let index = draft.sections.findIndex((section) => section.id === entry.id);
  if (index < 0) index = sections.length;
  if (insertionTarget !== undefined) {
    const afterId = insertionTarget?.afterSectionId;
    const target = sections.findIndex((section) => section.id === afterId && section.enabled);
    if (afterId !== null && target < 0) return { ok: false, diagnostics: [{ code: "SECTION_INSERTION_INVALID", severity: "error", message: "A posição escolhida não está disponível." }] };
    index = afterId === null ? 0 : target + 1;
  }
  sections.splice(index, 0, entry);
  const result = validatePageComposition({ ...draft, schemaVersion: 2, sections: reindexSections(sections) });
  return result.valid ? result.composition : { ok: false, diagnostics: result.diagnostics };
}

export function createCustomSection(composition, { title, label, visible = true }, insertionTarget) {
  const draft = normalizeDraft(composition);
  let id;
  do { id = `custom-${globalThis.crypto.randomUUID()}`; } while (draft.sections.some((section) => section.id === id));
  return placeCustom(draft, { id, type: "custom", title, enabled: true, order: draft.sections.length + 1,
    navigation: { visible, ...(label ? { label } : {}) }, presentation: { variant: "text" }, content: { blocks: [] } }, insertionTarget);
}

export function enableCustomSection(composition, id, insertionTarget) {
  const draft = normalizeDraft(composition);
  const section = draft.sections.find((entry) => entry.type === "custom" && entry.id === id && !entry.enabled);
  if (!section) return { ok: false, diagnostics: [{ code: "CUSTOM_NOT_DISABLED", severity: "error", message: "A seção não está disponível para reativação." }] };
  return placeCustom(draft, { ...section, enabled: true }, insertionTarget);
}

export function updateCustomSection(composition, id, changes) {
  const draft = cloneComposition(composition);
  const section = draft.sections.find((entry) => entry.type === "custom" && entry.id === id);
  if (!section || Object.keys(changes).some((key) => !["title", "navigation", "content"].includes(key))) return draft;
  Object.assign(section, changes);
  return draft;
}

export function validateDraftComposition(
  composition,
  registry = SECTION_REGISTRY,
) {
  return validatePageComposition(composition, registry);
}

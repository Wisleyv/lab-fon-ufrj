import { HTMLSanitizer } from "../utils/sanitizer.js";

export const CUSTOM_ID = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export const hasOnlyKeys = (value, keys) => isRecord(value) && Object.keys(value).every((key) => keys.includes(key));
const text = (value, max) => typeof value === "string" && !!value.trim() && [...value].length <= max;

export function validCustomSection(section, anchors) {
  if (!hasOnlyKeys(section, ["id", "type", "enabled", "order", "title", "navigation", "presentation", "content"]) ||
      !CUSTOM_ID.test(section.id) || typeof section.enabled !== "boolean" ||
      !Number.isInteger(section.order) || section.order < 1 || !text(section.title, 120)) return false;
  const nav = section.navigation;
  if (nav !== undefined && (!hasOnlyKeys(nav, ["visible", "label"]) ||
      (nav.visible !== undefined && typeof nav.visible !== "boolean") ||
      (nav.label !== undefined && !text(nav.label, 60)))) return false;
  if (section.presentation !== undefined && (!hasOnlyKeys(section.presentation, ["variant"]) ||
      (section.presentation.variant !== undefined && section.presentation.variant !== "text"))) return false;
  return hasOnlyKeys(section.content, ["blocks"]) && Array.isArray(section.content.blocks) &&
    section.content.blocks.length <= 100 && section.content.blocks.every((block) => validCustomBlock(block, anchors));
}

export function validCustomBlock(block, anchors = new Set()) {
  if (!isRecord(block)) return false;
  switch (block.type) {
    case "heading":
    case "paragraph":
      return hasOnlyKeys(block, ["type", "text"]) && text(block.text, block.type === "heading" ? 160 : 4000);
    case "list":
      return hasOnlyKeys(block, ["type", "ordered", "items"]) &&
        (block.ordered === undefined || typeof block.ordered === "boolean") &&
        Array.isArray(block.items) && block.items.length >= 1 && block.items.length <= 50 &&
        block.items.every((item) => text(item, 1000));
    case "link":
    case "button":
      return hasOnlyKeys(block, ["type", "label", "url"]) && text(block.label, 120) &&
        HTMLSanitizer.isSafeCustomURL(block.url, anchors);
    default: return false;
  }
}

export function normalizeCustomSection(section) {
  return {
    id: section.id, type: "custom", enabled: section.enabled, order: section.order,
    title: section.title,
    navigation: { visible: section.navigation?.visible ?? false,
      ...(section.navigation?.label !== undefined ? { label: section.navigation.label } : {}) },
    presentation: { variant: "text" },
    content: { blocks: section.content.blocks.map((block) => block.type === "list"
      ? { type: "list", ordered: block.ordered ?? false, items: [...block.items] }
      : block.type === "link" || block.type === "button"
        ? { type: block.type, label: block.label, url: block.url }
        : { type: block.type, text: block.text }) },
  };
}

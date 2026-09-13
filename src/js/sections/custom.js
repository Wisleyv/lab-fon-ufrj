import { SectionRenderer } from "../modules/renderer.js";
import { validCustomSection } from "../page/custom-schema.js";

export function createCustomSectionElement(documentRef, section) {
  const element = documentRef.createElement("section");
  element.id = section.id;
  element.className = "section custom-text-section";
  element.dataset.pageSection = "custom";
  element.setAttribute("aria-labelledby", `${section.id}-title`);
  const inner = documentRef.createElement("div");
  inner.className = "container";
  const prose = documentRef.createElement("div");
  prose.className = "content-prose";
  const title = documentRef.createElement("h2");
  title.id = `${section.id}-title`;
  title.textContent = section.title;
  const content = documentRef.createElement("div");
  content.id = `${section.id}-content`;
  prose.append(title, content);
  inner.append(prose);
  element.append(inner);
  return element;
}

export class CustomSection extends SectionRenderer {
  template(section) {
    const { anchors, activeAnchors } = this.options;
    if (!validCustomSection(section, anchors)) throw new Error("Invalid custom section");
    const doc = this.container.ownerDocument;
    const fragment = doc.createDocumentFragment();
    for (const block of section.content.blocks) {
      let element;
      if (block.type === "list") {
        element = doc.createElement(block.ordered ? "ol" : "ul");
        for (const item of block.items) {
          const li = doc.createElement("li");
          li.textContent = item;
          element.append(li);
        }
      } else if (block.type === "link" || block.type === "button") {
        const inactive = block.url.startsWith("#") && !activeAnchors.has(block.url.slice(1));
        element = doc.createElement(inactive ? "span" : "a");
        element.textContent = block.label;
        if (!inactive) {
          element.setAttribute("href", block.url);
          if (block.type === "button") element.className = "btn btn-primary";
        }
      } else {
        element = doc.createElement(block.type === "heading" ? "h3" : "p");
        element.textContent = block.text;
      }
      fragment.append(element);
    }
    return fragment;
  }
}

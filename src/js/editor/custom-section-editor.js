import { createElement } from "../utils/helpers.js";
import { createCustomSection, updateCustomSection } from "./composition-commands.js";
import { getEditingReadiness } from "./state.js";
import { validatePageComposition } from "../page/composition.js";

const BLOCK_LABELS = { heading: "Subtítulo", paragraph: "Parágrafo", list: "Lista", link: "Link", button: "Botão de navegação" };

export function createCustomSectionEditor({ store, update, insertionTarget, saveButton, discardButton }) {
  const page = createElement("div", { className: "editor-custom-page" });
  const content = createElement("section", { className: "editor-panel", "aria-labelledby": "editor-custom-content-title" });
  content.append(createElement("h2", { id: "editor-custom-content-title" }, "Seções personalizadas"));
  const select = createElement("select", { id: "editor-custom-select", className: "editor-input", "aria-label": "Seção personalizada" });
  const metadata = createElement("div");
  const blocks = createElement("div", { id: "editor-custom-blocks" });
  const blockType = createElement("select", { id: "editor-custom-block-type", className: "editor-input", "aria-label": "Tipo de bloco" });
  for (const [value, label] of Object.entries(BLOCK_LABELS)) blockType.append(createElement("option", { value }, label));
  let changing = false;
  let lastDraft;
  let selectedId;
  const selected = () => store.getState().draftComposition?.sections.find((section) => section.id === selectedId);
  const commit = (changes) => {
    changing = true;
    try { update(() => updateCustomSection(store.getState().draftComposition, selectedId, changes), true); }
    finally { changing = false; }
  };
  const button = (label, id, handler) => {
    const element = createElement("button", { type: "button", id, className: "editor-btn editor-btn-secondary" }, label);
    element.addEventListener("click", handler);
    return element;
  };
  const field = (parent, label, value, handler, { multiline = false, checkbox = false, id } = {}) => {
    const input = createElement(multiline ? "textarea" : "input", { className: "editor-input", ...(id ? { id } : {}) });
    if (checkbox) { input.type = "checkbox"; input.checked = value; }
    else input.value = value;
    input.addEventListener(checkbox ? "change" : "input", () => handler(checkbox ? input.checked : input.value));
    const wrapper = createElement("label", { className: "editor-custom-field" }, label);
    wrapper.append(input);
    parent.append(wrapper);
    return input;
  };

  const creation = createElement("details");
  creation.append(createElement("summary", {}, "Nova seção personalizada"));
  const title = field(creation, "Título", "", () => {}, { id: "editor-custom-new-title" });
  title.required = true;
  const label = field(creation, "Rótulo de navegação (opcional)", "", () => {}, { id: "editor-custom-new-label" });
  const visible = field(creation, "Exibir na navegação", true, () => {}, { checkbox: true });
  creation.append(button("Criar seção", "editor-custom-create", () => {
    const before = store.getState().draftComposition;
    update(() => createCustomSection(before, { title: title.value, label: label.value, visible: visible.checked }, insertionTarget()));
    if (store.getState().draftComposition !== before) {
      title.value = ""; label.value = ""; visible.checked = true; creation.open = false;
      selectedId = store.getState().draftComposition.sections.find((entry) => !before.sections.some((old) => old.id === entry.id))?.id;
      render(true);
    }
  }), button("Cancelar", "editor-custom-cancel", () => { title.value = ""; label.value = ""; visible.checked = true; creation.open = false; }));
  page.append(creation, createElement("h3", {}, "Identificação da seção personalizada"), metadata);

  const editBlocks = (transform) => {
    const section = selected();
    if (!section) return;
    const next = structuredClone(section.content.blocks);
    transform(next);
    commit({ content: { blocks: next } });
  };
  const add = button("Adicionar bloco", "editor-custom-add-block", () => {
    const type = blockType.value;
    editBlocks((items) => items.push(type === "list" ? { type, ordered: false, items: [""] }
      : type === "link" || type === "button" ? { type, label: "", url: "" } : { type, text: "" }));
    render(true);
  });
  const save = button("Salvar página", "editor-custom-save", () => saveButton.click());
  const discard = button("Descartar alterações da página", "editor-custom-discard", () => discardButton.click());
  const status = createElement("p", { role: "status", className: "editor-status" });
  content.append(select, blocks, blockType, add, save, discard, status);
  select.addEventListener("change", () => { selectedId = select.value; render(true); });

  function render(force = false) {
    const state = store.getState();
    const draft = state.draftComposition;
    const instances = draft?.sections.filter((section) => section.type === "custom") || [];
    if (!instances.some((section) => section.id === selectedId)) selectedId = instances[0]?.id;
    const section = selected();
    if (!changing && (force || lastDraft !== draft)) {
      select.replaceChildren(...instances.map((entry, index) => createElement("option", { value: entry.id }, `${index + 1}. ${entry.title || "Sem título"}${entry.enabled ? "" : " (desabilitada)"}`)));
      select.value = selectedId || "";
      metadata.replaceChildren();
      blocks.replaceChildren();
      if (section) {
        const metaSelect = select.cloneNode(true);
        metaSelect.removeAttribute("id");
        metaSelect.value = selectedId;
        metaSelect.addEventListener("change", () => { selectedId = metaSelect.value; render(true); });
        metadata.append(metaSelect);
        field(metadata, "Título", section.title, (value) => commit({ title: value }), { id: "editor-custom-title" });
        field(metadata, "Rótulo de navegação (opcional)", section.navigation.label || "", (value) => {
          const navigation = { ...selected().navigation }; delete navigation.label;
          if (value) navigation.label = value;
          commit({ navigation });
        });
        field(metadata, "Exibir na navegação", section.navigation.visible, (value) => commit({ navigation: { ...selected().navigation, visible: value } }), { checkbox: true });
        section.content.blocks.forEach((block, index) => {
          const row = createElement("fieldset", { className: "editor-custom-block", "data-block-index": String(index) });
          row.append(createElement("legend", {}, `${index + 1}. ${BLOCK_LABELS[block.type]}`));
          const change = (key, value) => editBlocks((items) => { items[index][key] = value; });
          if (block.type === "list") {
            field(row, "Itens", block.items.join("\n"), (value) => change("items", value.split(/\r?\n/)), { multiline: true });
            field(row, "Numerada", !!block.ordered, (value) => change("ordered", value), { checkbox: true });
          } else if (block.type === "link" || block.type === "button") {
            field(row, "Rótulo", block.label, (value) => change("label", value));
            field(row, "URL", block.url, (value) => change("url", value));
          } else field(row, "Texto", block.text, (value) => change("text", value), { multiline: block.type === "paragraph" });
          for (const [symbol, name, offset] of [["\u2191", "Subir bloco", -1], ["\u2193", "Descer bloco", 1], ["\u00d7", "Remover bloco", 0]]) {
            const action = button(symbol, "", () => {
              editBlocks((items) => { const [item] = items.splice(index, 1); if (offset) items.splice(index + offset, 0, item); });
              render(true);
            });
            action.title = name; action.setAttribute("aria-label", name);
            action.dataset.edge = String((offset === -1 && index === 0) || (offset === 1 && index === section.content.blocks.length - 1));
            row.append(action);
          }
          blocks.append(row);
        });
      }
    }
    lastDraft = draft;
    for (const option of select.options) {
      const index = instances.findIndex((entry) => entry.id === option.value);
      if (index >= 0) option.textContent = `${index + 1}. ${instances[index].title || "Sem título"}${instances[index].enabled ? "" : " (desabilitada)"}`;
    }
    const editable = getEditingReadiness(state).ok;
    for (const control of [...page.querySelectorAll("input, textarea, select, button"), ...content.querySelectorAll("input, textarea, select, button")]) {
      control.disabled = !editable || control.dataset.edge === "true";
    }
    add.disabled = !editable || !section || section.content.blocks.length >= 100;
    blockType.disabled = !editable || !section;
    const valid = draft && validatePageComposition(draft).valid;
    creation.querySelector("#editor-custom-create").disabled = !editable || !valid;
    save.disabled = !editable || !state.compositionDirty || !valid || saveButton.disabled;
    discard.disabled = !editable || !state.compositionDirty;
    status.textContent = state.compositionOutcome || (!valid && section ? "Há campos inválidos na página." : "");
  }
  return { page, content, render };
}

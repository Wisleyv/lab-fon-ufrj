import { createElement as el } from "../utils/helpers.js";
import { CONTENT_DATASETS, validateContent } from "./content-fields.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createContentEditor({ host, store }) {
  const element = el("section", { className: "editor-panel", id: "editor-content-editing" });
  element.appendChild(el("h2", {}, "Editar conteúdo"));
  const chooser = el("select", { id: "editor-content-dataset", className: "editor-input", "aria-label": "Conteúdo" });
  Object.entries(CONTENT_DATASETS).forEach(([key, schema]) => chooser.appendChild(el("option", { value: key }, schema.label)));
  const recordsSelect = el("select", { id: "editor-content-record", className: "editor-input", "aria-label": "Registro" });
  const form = el("form", { id: "editor-content-form" });
  const fields = el("div");
  const status = el("p", { id: "editor-content-edit-status", role: "status" });
  const actions = el("div", { className: "editor-actions" });
  const button = (id, label, type = "button") => el("button", { id, type, className: "editor-btn editor-btn-secondary" }, label);
  const add = button("editor-content-add", "Adicionar registro");
  const remove = button("editor-content-remove", "Remover registro");
  const cancel = button("editor-content-cancel", "Descartar alterações");
  const save = button("editor-content-save", "Salvar conteúdo", "submit");
  actions.append(add, remove, cancel, save);
  form.append(fields, actions);
  element.append(chooser, recordsSelect, form, status);
  let directory = null, records = [], selected = null, draft = null, baselineModel = null, busy = false;
  let inputId = 0;
  const schema = () => CONTENT_DATASETS[chooser.value];

  function setControls() {
    const dirty = store.getState().contentDirty;
    chooser.disabled = recordsSelect.disabled = busy || dirty;
    add.disabled = busy || dirty || schema().singleton || !directory;
    remove.disabled = busy || dirty || schema().singleton || !selected;
    cancel.disabled = busy || !dirty;
    save.disabled = busy || !dirty;
    fields.querySelectorAll("input,textarea,select,button").forEach((node) => { node.disabled = busy; });
  }

  function markDraft() {
    const model = clone(baselineModel);
    if (schema().singleton) model[chooser.value] = draft;
    else model[chooser.value] = records.filter((r) => r.name !== selected?.name).map((r) => r.value).concat(draft === null ? [] : [draft]);
    store.setState({ contentDirty: true, editorSiteModel: model, build: { ...store.getState().build, status: "idle", previewUrl: null } });
    status.textContent = draft === null ? "Remoção pendente. Salve para confirmar." : "Há alterações não salvas.";
    setControls();
  }

  function renderFields(parent, object, definitions) {
    for (const field of definitions) {
      if (field.type === "list") {
        const fieldset = el("fieldset");
        fieldset.appendChild(el("legend", {}, field.label));
        const items = object[field.key] || [];
        items.forEach((entry, index) => {
          const row = el("fieldset");
          row.appendChild(el("legend", {}, `${field.label} ${index + 1}`));
          if (typeof entry === "string") {
            const input = el("textarea", { className: "editor-input", "aria-label": `${field.label} ${index + 1}` });
            input.value = entry;
            input.addEventListener("input", () => { items[index] = input.value; markDraft(); });
            row.appendChild(input);
          } else renderFields(row, entry, field.fields);
          const del = button("", `Remover ${field.label} ${index + 1}`);
          del.addEventListener("click", () => { items.splice(index, 1); markDraft(); render(); });
          row.appendChild(del);
          fieldset.appendChild(row);
        });
        const append = button("", `Adicionar ${field.label}`);
        append.addEventListener("click", () => { object[field.key] = [...items, clone(field.empty)]; markDraft(); render(); });
        fieldset.appendChild(append);
        parent.appendChild(fieldset);
      } else if (field.fields) {
        const group = el("fieldset");
        group.appendChild(el("legend", {}, field.label));
        // Optional groups are materialized only after an edit.
        const nested = object[field.key] || {};
        group.addEventListener("input", () => { object[field.key] = nested; markDraft(); });
        renderFields(group, nested, field.fields);
        parent.appendChild(group);
      } else {
        const id = `content-field-${++inputId}`;
        const input = el(field.options ? "select" : field.type === "textarea" ? "textarea" : "input", {
          id, className: "editor-input", ...(field.options || field.type === "textarea" ? {} : { type: ["number", "checkbox"].includes(field.type) ? field.type : "text" }),
        });
        if (field.options) [...new Set([...field.options, object[field.key]].filter(Boolean))].forEach((v) => input.appendChild(el("option", { value: v }, v)));
        if (field.type === "checkbox") input.checked = Boolean(object[field.key]);
        else input.value = object[field.key] ?? "";
        if (field.required) input.required = true;
        if (field.type === "number") { input.min = "0"; input.step = "1"; }
        input.addEventListener("input", () => {
          object[field.key] = field.type === "checkbox" ? input.checked : field.type === "number" ? Number(input.value) : input.value;
          markDraft();
        });
        parent.append(el("label", { for: id }, field.label), input);
      }
    }
  }

  function render() {
    fields.replaceChildren();
    if (draft) renderFields(fields, draft, schema().fields);
    setControls();
  }

  function selectRecord() {
    selected = records.find((r) => r.name === recordsSelect.value) || null;
    draft = selected ? clone(selected.value) : null;
    render();
  }

  async function load() {
    if (!directory || !host.readContentDataset) { status.textContent = "Abra o projeto no aplicativo desktop."; return; }
    busy = true; setControls();
    try {
      records = await host.readContentDataset(directory, chooser.value);
      recordsSelect.replaceChildren(...records.map((r) => el("option", { value: r.name }, r.value.nome || r.value.hero?.title || schema().label)));
      baselineModel = clone(store.getState().editorSiteModel);
      selectRecord();
      status.textContent = "Conteúdo carregado.";
    } catch (error) {
      records = []; selected = draft = null; fields.replaceChildren();
      status.textContent = `Não foi possível abrir: ${error.message}`;
    } finally { busy = false; setControls(); }
  }
  chooser.addEventListener("change", load);
  recordsSelect.addEventListener("change", selectRecord);
  add.addEventListener("click", () => { selected = null; draft = clone(schema().empty); markDraft(); render(); });
  remove.addEventListener("click", () => { draft = null; markDraft(); render(); });
  cancel.addEventListener("click", () => {
    store.setState({ contentDirty: false, editorSiteModel: baselineModel });
    selectRecord(); status.textContent = "Alterações descartadas.";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !store.getState().contentDirty) return;
    const errors = draft === null ? [] : validateContent(draft, schema().fields);
    if (draft?.id && records.some((r) => r.name !== selected?.name && r.value.id === draft.id)) errors.push("Identificador já utilizado.");
    if (errors.length) { status.textContent = errors.join(" "); return; }
    busy = true; store.setState({ contentSaving: true }); setControls();
    try {
      const name = selected?.name || `registro-${crypto.randomUUID()}.json`;
      const result = await host.saveContentRecord(directory, chooser.value, name, selected?.value || null, draft);
      if (!result.ok) throw new Error(result.message || "Falha ao salvar.");
      store.setState({ contentDirty: false });
      await load();
      status.textContent = "Conteúdo salvo e verificado localmente.";
    } catch (error) { status.textContent = `Não foi possível salvar: ${error.message}`; }
    finally { busy = false; store.setState({ contentSaving: false }); setControls(); }
  });
  const unsubscribe = store.subscribe((state) => {
    if (state.openedProject !== directory) {
      directory = state.openedProject;
      void load();
    }
  });
  setControls();
  return { element, destroy: unsubscribe };
}

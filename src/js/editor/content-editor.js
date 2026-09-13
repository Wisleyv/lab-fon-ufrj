import { createElement as el } from "../utils/helpers.js";
import { CONTENT_DATASETS, validateContent } from "./content-fields.js";
import { getEditingReadiness } from "./state.js";

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
  const reason = el("p", { id: "editor-content-save-reason", className: "editor-operation-reason" });
  save.setAttribute("aria-describedby", reason.id);
  actions.append(add, remove, cancel, save);
  form.append(fields, actions, reason);
  element.append(chooser, recordsSelect, form, status);
  let directory = null, records = [], selected = null, draft = null, baselineModel = null, busy = false;
  let inputId = 0;
  const schema = () => CONTENT_DATASETS[chooser.value];
  const validationErrors = () => {
    const errors = draft === null ? [] : validateContent(draft, schema().fields);
    if (draft?.id && records.some((r) => r.name !== selected?.name && r.value.id === draft.id)) errors.push("Identificador já utilizado.");
    return errors;
  };

  function setControls() {
    const dirty = store.getState().contentDirty;
    const ready = getEditingReadiness(store.getState());
    const blocked = busy || !ready.ok;
    const errors = dirty ? validationErrors() : [];
    chooser.disabled = recordsSelect.disabled = blocked || dirty;
    add.disabled = blocked || dirty || schema().singleton || !directory;
    remove.disabled = blocked || dirty || schema().singleton || !selected;
    cancel.disabled = blocked || !dirty;
    save.disabled = blocked || !dirty || errors.length > 0;
    reason.textContent = !ready.ok ? ready.message : busy ? "Aguarde a operação em andamento." : !dirty ? "Nenhuma alteração para salvar." : errors.join(" ");
    reason.hidden = !save.disabled;
    fields.querySelectorAll("input,textarea,select,button").forEach((node) => { node.disabled = blocked; });
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
        if (field.max !== undefined) input.max = String(field.max);
        if (field.maxLength) input.maxLength = field.maxLength;
        input.addEventListener("input", () => {
          if (field.optional && field.type === "number" && input.value === "") delete object[field.key];
          else object[field.key] = field.type === "checkbox" ? input.checked : field.type === "number" ? Number(input.value) : input.value;
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
    if (directory?.status !== "valid" || !host.readContentDataset) { status.textContent = "Abra o projeto no aplicativo desktop."; setControls(); return; }
    busy = true; store.setState({ contentLoading: true }); setControls();
    try {
      records = await host.readContentDataset(directory, chooser.value);
      recordsSelect.replaceChildren(...records.map((r) => el("option", { value: r.name }, r.value.nome || r.value.hero?.title || schema().label)));
      baselineModel = clone(store.getState().editorSiteModel);
      selectRecord();
      status.textContent = "Conteúdo carregado.";
    } catch (error) {
      records = []; selected = draft = null; fields.replaceChildren();
      status.textContent = `Não foi possível abrir: ${error.message}`;
    } finally { busy = false; store.setState({ contentLoading: false }); setControls(); }
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
    if (busy || !getEditingReadiness(store.getState()).ok || !store.getState().contentDirty) return;
    const errors = validationErrors();
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
    setControls();
  });
  setControls();
  return { element, destroy: unsubscribe };
}

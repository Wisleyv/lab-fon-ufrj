import { createElement as el } from "../utils/helpers.js";
import { CONTENT_DATASETS, isSectionTypeEnabled, validateContent } from "./content-fields.js";
import { getEditingReadiness } from "./state.js";
import { renderFocusedFields } from "./focused-fields.js";
import { createImageField } from "./image-field.js";
import { normalizeInstagramInput, PROVALE_INSTAGRAM } from "../sections/provale-instagram.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

function createUniqueId(label, used) {
  const base = String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return "";
  let candidate = base;
  for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  used.add(candidate);
  return candidate;
}

export function createContentEditor({ host, store, customEditor }) {
  const element = el("section", { className: "editor-panel", id: "editor-content-editing" });
  element.appendChild(el("h2", {}, "Editar conteúdo"));
  const chooser = el("select", { id: "editor-content-dataset", className: "editor-input", "aria-label": "Conteúdo" });
  const recordsSelect = el("select", { id: "editor-content-record", className: "editor-input", "aria-label": "Registro" });
  const form = el("form", { id: "editor-content-form" });
  const fields = el("div", { id: "editor-content-fields" });
  const advanced = el("details", { id: "editor-content-advanced", className: "editor-advanced" });
  const advancedFields = el("div", { id: "editor-content-advanced-fields" });
  advanced.append(
    el("summary", {}, "Edição avançada"),
    el("p", { className: "editor-warning" }, "Alterações nesta área podem afetar a estrutura ou a apresentação do site. Edite somente se compreender os efeitos."),
    advancedFields,
  );
  const status = el("p", { id: "editor-content-edit-status", role: "status" });
  const actions = el("div", { className: "editor-actions" });
  const button = (id, label, type = "button") => el("button", { id, type, className: "editor-btn editor-btn-secondary" }, label);
  const add = button("editor-content-add", "Adicionar registro");
  const remove = button("editor-content-remove", "Remover registro");
  const cancel = button("editor-content-cancel", "Descartar alterações");
  const save = button("editor-content-save", "Salvar conteúdo", "submit");
  save.className = "editor-btn editor-btn-primary";
  remove.className = "editor-btn editor-btn-danger";
  const reason = el("p", { id: "editor-content-save-reason", className: "editor-operation-reason" });
  save.setAttribute("aria-describedby", reason.id);
  actions.append(add, remove, cancel, save);
  form.append(actions, reason, status, fields, advanced);
  element.append(chooser, recordsSelect, form);
  if (customEditor) element.append(customEditor.content);
  let directory = null, records = [], selected = null, draft = null, baselineModel = null, busy = false;
  let dataset = "site", activeItem = dataset, lastComposition, lastContentDirty, previousRecordName;
  const navigation = new Map();
  let imageFields = [];
  let instagramInputInvalid = false;
  const disposeFields = () => { imageFields.forEach((field) => field.destroy()); imageFields = []; };
  const schema = () => CONTENT_DATASETS[dataset];
  const isCustom = () => !CONTENT_DATASETS[activeItem];
  const validationErrors = () => {
    const errors = draft === null ? [] : validateContent(draft, schema().fields);
    if (instagramInputInvalid) errors.push("Perfil ou código de incorporação do PROVALE inválido.");
    if (draft?.id && records.some((r) => r.name !== selected?.name && r.value.id === draft.id)) errors.push("Identificador já utilizado.");
    return errors;
  };

  function ensureInternalIds() {
    if (!draft) return;
    if (dataset === "linhasPesquisa" && !draft.id) {
      const used = new Set(records
        .filter((record) => record.name !== selected?.name)
        .map((record) => record.value.id)
        .filter(Boolean));
      draft.id = createUniqueId(draft.nome, used);
    }
    if (dataset === "extensao") {
      const used = new Set(draft.projects?.map((project) => project.id).filter(Boolean));
      for (const project of draft.projects || []) {
        if (!project.id) project.id = createUniqueId(project.title, used);
      }
    }
  }

  function setControls() {
    const dirty = store.getState().contentDirty;
    const ready = getEditingReadiness(store.getState());
    const blocked = busy || !ready.ok;
    const errors = dirty ? validationErrors() : [];
    chooser.disabled = blocked;
    recordsSelect.disabled = blocked || dirty;
    recordsSelect.hidden = isCustom() || !!schema().singleton;
    form.hidden = status.hidden = isCustom();
    if (customEditor) customEditor.content.hidden = !isCustom();
    add.disabled = blocked || dirty || schema().singleton || !directory;
    remove.disabled = blocked || dirty || schema().singleton || !selected;
    cancel.disabled = blocked || !dirty;
    save.disabled = blocked || !dirty || errors.length > 0;
    reason.textContent = !ready.ok ? ready.message : busy ? "Aguarde a operação em andamento." : !dirty ? "Nenhuma alteração para salvar." : errors.join(" ");
    reason.hidden = !save.disabled;
    [...fields.querySelectorAll("input,textarea,select,button"),
      ...advancedFields.querySelectorAll("input,textarea,select,button")].forEach((node) => {
      node.disabled = blocked || node.dataset.edge === "true" || (dirty && node.dataset.navigation === "true");
    });
  }

  function markDraft() {
    ensureInternalIds();
    const model = clone(baselineModel);
    if (schema().singleton) model[dataset] = draft;
    else model[dataset] = records.filter((r) => r.name !== selected?.name).map((r) => r.value).concat(draft === null ? [] : [draft]);
    store.setState({ contentDirty: true, editorSiteModel: model, build: { ...store.getState().build, status: "idle", previewUrl: null } });
    status.textContent = draft === null ? "Remoção pendente. Salve para confirmar." : "Há alterações não salvas.";
    setControls();
  }

  function render() {
    instagramInputInvalid = false;
    const focusKey = fields.ownerDocument.activeElement?.dataset.focusKey;
    disposeFields();
    fields.replaceChildren();
    advancedFields.replaceChildren();
    advanced.hidden = dataset !== "linhasPesquisa" || !draft;
    if (draft) renderFocusedFields(fields, draft, schema().fields, {
      navigation, change: markDraft, render, button, dirty: () => store.getState().contentDirty,
      renderField: (field, object) => {
        if (dataset === "extensao" && field.key === "instagram") {
          const group = el("div", { className: "editor-focused-group" });
          const enabled = el("input", { type: "checkbox", id: "editor-instagram-enabled" });
          enabled.checked = object.instagram?.enabled === true;
          const source = el("textarea", { id: "editor-instagram-source", className: "editor-input", rows: "3" });
          source.value = object.instagram?.source || "";
          source.placeholder = PROVALE_INSTAGRAM;
          const error = el("p", { id: "editor-instagram-error", role: "status" });
          source.setAttribute("aria-describedby", error.id);
          const change = () => {
            const normalized = normalizeInstagramInput(source.value);
            instagramInputInvalid = !!source.value.trim() && !normalized;
            source.setAttribute("aria-invalid", String(instagramInputInvalid));
            error.textContent = instagramInputInvalid ? "Perfil ou código de incorporação do PROVALE inválido." : "";
            // Invalid clipboard content stays in the input, never in the content model.
            if (!instagramInputInvalid) object.instagram = { ...object.instagram,
              enabled: enabled.checked, provider: "instagram", source: normalized || "" };
            markDraft();
          };
          source.addEventListener("input", change);
          enabled.addEventListener("input", () => {
            if (enabled.checked && !source.value.trim()) source.value = PROVALE_INSTAGRAM;
            change();
          });
          group.append(el("label", { for: enabled.id }, "Ativar integração"), enabled,
            el("label", { for: source.id }, "Perfil ou código do Instagram"), source, error);
          return group;
        }
        if (dataset === "site" && field.key === "logo" && field.fields) {
          const logo = object.logo || {};
          const group = el("div", { className: "editor-focused-group" });
          const change = () => {
            object.logo = logo;
            draft.header = object;
            group.querySelector("img").alt = logo.alt || "";
            markDraft();
          };
          const imageField = createImageField({ host, directory, kind: "logo", allowRemove: false,
            value: logo.fallback, alt: () => logo.alt || "",
            canEdit: () => !busy && getEditingReadiness(store.getState()).ok,
            onBusy: (imageSelecting) => store.setState({ imageSelecting }),
            onChange: (value) => { Object.assign(logo, { source: "", fallback: value, srcset: "" }); change(); },
          });
          imageFields.push(imageField);
          group.append(imageField.element);
          renderFocusedFields(group, logo, field.fields.filter((entry) => entry.key === "alt"), {
            navigation, change, render, button, dirty: () => store.getState().contentDirty,
          }, "root.header.logo");
          return group;
        }
        const logo = dataset === "parcerias" && field.key === "logo";
        if (!logo && (dataset !== "equipe" || field.key !== "foto")) return null;
        const imageField = createImageField({ host, directory, kind: logo ? "logo" : "photo", value: object[field.key], alt: logo ? object.nome || "Logo" : object.nome ? `Foto de ${object.nome}` : "Foto",
          canEdit: () => !busy && getEditingReadiness(store.getState()).ok,
          onBusy: (imageSelecting) => store.setState({ imageSelecting }),
          onChange: (value) => { object[field.key] = value; markDraft(); },
        });
        imageFields.push(imageField);
        return imageField.element;
      },
    });
    if (draft && dataset === "linhasPesquisa") {
      renderFocusedFields(advancedFields, draft, schema().fields, {
        navigation, change: markDraft, render, button,
        dirty: () => store.getState().contentDirty,
        surface: "advanced",
      });
    }
    setControls();
    if (focusKey) {
      const control = [...fields.querySelectorAll("[data-focus-key]")].find((node) => node.dataset.focusKey === focusKey && !node.disabled);
      (control || fields.querySelector("input:not(:disabled),textarea:not(:disabled)"))?.focus();
    }
  }

  function selectRecord() {
    selected = records.find((r) => r.name === recordsSelect.value) || null;
    draft = selected ? clone(selected.value) : null;
    render();
  }

  async function load() {
    if (isCustom()) { setControls(); return; }
    if (directory?.status !== "valid" || !host.readContentDataset) { status.textContent = "Abra o projeto no aplicativo desktop."; setControls(); return; }
    busy = true; store.setState({ contentLoading: true }); setControls();
    try {
      records = await host.readContentDataset(directory, dataset);
      const previousName = selected?.name;
      recordsSelect.replaceChildren(...records.map((r) => el("option", { value: r.name }, r.value.nome || r.value.hero?.title || schema().label)));
      if (records.some((record) => record.name === previousName)) recordsSelect.value = previousName;
      baselineModel = clone(store.getState().editorSiteModel);
      selectRecord();
      status.textContent = "Conteúdo carregado.";
    } catch (error) {
      records = []; selected = draft = null; disposeFields(); fields.replaceChildren();
      status.textContent = `Não foi possível abrir: ${error.message}`;
    } finally { busy = false; store.setState({ contentLoading: false }); setControls(); }
  }
  function refreshOptions() {
    const state = store.getState();
    const composition = state.draftComposition;
    if (composition === lastComposition && state.contentDirty === lastContentDirty) return;
    lastComposition = composition;
    lastContentDirty = state.contentDirty;
    const datasets = Object.entries(CONTENT_DATASETS)
      .filter(([, value]) => isSectionTypeEnabled(composition, value.sectionType));
    const customSections = customEditor
      ? composition?.sections.filter((section) => section.type === "custom" && section.enabled) || []
      : [];
    const options = [
      ...datasets.map(([key, value]) => el("option", { value: key }, value.label)),
      ...customSections.map((section, index) => el("option", { value: section.id }, `${index + 1}. ${section.title || "Sem título"}`)),
    ];
    const activeVisible = datasets.some(([key]) => key === activeItem) || customSections.some((section) => section.id === activeItem);
    if (!activeVisible && state.contentDirty) {
      const label = CONTENT_DATASETS[activeItem]?.label || composition?.sections.find((section) => section.id === activeItem)?.title || "Conteúdo em edição";
      options.push(el("option", { value: activeItem }, `${label} (alterações pendentes)`));
    }
    chooser.replaceChildren(...options);
    if (![...chooser.options].some((option) => option.value === activeItem)) {
      const next = chooser.options[0]?.value || "site";
      activeItem = next;
      if (CONTENT_DATASETS[next]) {
        dataset = next; selected = draft = null; navigation.clear();
        void load();
      } else customEditor?.select(next);
    }
    chooser.value = activeItem;
  }
  function selectItem(value, { fromPage = false, created = false } = {}) {
    const state = store.getState();
    refreshOptions();
    if (value === activeItem) return true;
    const blocked = busy || !getEditingReadiness(state).ok || state.contentDirty ||
      (state.compositionDirty && !created && !(fromPage && !isCustom()));
    if (blocked || ![...chooser.options].some((option) => option.value === value)) {
      chooser.value = activeItem;
      selectionStatus.textContent = "Troca de conteúdo bloqueada: alterações não salvas ou operação em andamento.";
      return false;
    }
    activeItem = value; chooser.value = value;
    selectionStatus.textContent = "";
    if (isCustom()) customEditor.select(value);
    else {
      dataset = value; selected = draft = null; navigation.clear();
      void load();
    }
    setControls();
    return true;
  }
  const selectionStatus = el("p", { role: "status", id: "editor-content-selection-status" });
  element.insertBefore(selectionStatus, recordsSelect);
  chooser.addEventListener("change", () => selectItem(chooser.value));
  recordsSelect.addEventListener("change", () => {
    if (store.getState().contentDirty || busy || !getEditingReadiness(store.getState()).ok) { recordsSelect.value = selected?.name || (draft ? "__new__" : ""); return; }
    navigation.clear(); selectRecord();
  });
  add.addEventListener("click", () => {
    previousRecordName = recordsSelect.value;
    selected = null; draft = clone(schema().empty); navigation.clear();
    recordsSelect.append(el("option", { value: "__new__" }, "Novo registro"));
    recordsSelect.value = "__new__";
    markDraft(); render();
  });
  remove.addEventListener("click", () => { draft = null; markDraft(); render(); });
  cancel.addEventListener("click", () => {
    if (recordsSelect.value === "__new__") recordsSelect.value = previousRecordName || records[0]?.name || "";
    recordsSelect.querySelector('[value="__new__"]')?.remove();
    selectRecord(); status.textContent = "Alterações descartadas.";
    store.setState({ contentDirty: false, editorSiteModel: baselineModel });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isCustom() || busy || !getEditingReadiness(store.getState()).ok || !store.getState().contentDirty) return;
    const errors = validationErrors();
    if (errors.length) { status.textContent = errors.join(" "); return; }
    busy = true; store.setState({ contentSaving: true }); setControls();
    try {
      const name = selected?.name || `registro-${crypto.randomUUID()}.json`;
      const result = await host.saveContentRecord(directory, dataset, name, selected?.value || null, draft);
      if (!result.ok) throw new Error(result.message || "Falha ao salvar.");
      selected = draft ? { name } : null;
      store.setState({ contentDirty: false });
      await load();
      status.textContent = result.path ? `Conteúdo salvo localmente em: ${result.path}` : "Conteúdo salvo e verificado localmente.";
    } catch (error) { status.textContent = `Não foi possível salvar: ${error.message}`; }
    finally { busy = false; store.setState({ contentSaving: false }); setControls(); }
  });
  const unsubscribe = store.subscribe((state) => {
    if (state.openedProject !== directory) {
      disposeFields(); fields.replaceChildren();
      directory = state.openedProject;
      dataset = CONTENT_DATASETS[chooser.value] ? chooser.value : "site";
      activeItem = dataset; chooser.value = dataset;
      selected = draft = baselineModel = null; records = []; recordsSelect.replaceChildren(); navigation.clear();
      void load();
    }
    refreshOptions();
    if (!state.contentDirty && !state.compositionDirty) selectionStatus.textContent = "";
    setControls();
  });
  refreshOptions();
  setControls();
  return { element, selectItem, destroy() { disposeFields(); unsubscribe(); } };
}

import { createElement as el } from "../utils/helpers.js";

// Navigation is ephemeral; every edit still belongs to the containing dataset draft.
export function renderFocusedFields(parent, object, definitions, { navigation, change, render, button, dirty }, path = "root") {
  const groups = definitions.filter((field) => field.fields || field.type === "list");
  if (groups.length && definitions.length > 1) {
    const plain = definitions.filter((field) => !groups.includes(field));
    const options = [...(plain.length ? [["general", "Geral"]] : []), ...groups.map((field) => [field.key, field.label])];
    const active = renderFocusedListSelect(parent, "Grupo de campos", options, navigation, `${path}:group`, dirty, render);
    definitions = active === "general" ? plain : groups.filter((field) => field.key === active);
  }
  for (const field of definitions) {
    const key = `${path}.${field.key}`;
    if (field.type === "list") {
      const section = el("div", { className: "editor-focused-group" });
      const items = object[field.key] || [];
      const options = items.map((entry, index) => [String(index), `${index + 1}. ${typeof entry === "string" ? entry || field.label : entry.title || entry.label || entry.name || entry.id || field.label}`]);
      const active = renderFocusedListSelect(section, field.label, options, navigation, key, dirty, render);
      const index = Number(active);
      const entry = items[index];
      const row = el("div", { className: "editor-focused-item" });
      if (entry !== undefined) {
        if (typeof entry === "string") {
          const input = el("textarea", { className: "editor-input", "aria-label": `${field.label} ${index + 1}` });
          input.value = entry;
          input.addEventListener("input", () => { items[index] = input.value; change(); });
          row.append(input);
        } else renderFocusedFields(row, entry, field.fields, { navigation, change, render, button, dirty }, `${key}.${index}`);
      }
      const actions = el("div", { className: "editor-actions" });
      const append = button("", `Adicionar ${field.label}`);
      append.dataset.navigation = "true";
      append.dataset.focusKey = `${key}:add`;
      append.addEventListener("click", () => {
        if (dirty()) return;
        object[field.key] = [...items, structuredClone(field.empty)];
        navigation.set(key, String(items.length)); change(); render();
      });
      actions.append(append);
      if (entry !== undefined) {
        for (const [symbol, label, offset] of [["\u2191", "Subir", -1], ["\u2193", "Descer", 1], ["\u00d7", "Remover", 0]]) {
          const action = button("", symbol);
          action.title = `${label} ${field.label}`; action.setAttribute("aria-label", action.title);
          action.dataset.focusKey = `${key}:${offset}`;
          if (!offset) action.className = "editor-btn editor-btn-danger";
          action.dataset.edge = String(offset !== 0 && (index + offset < 0 || index + offset >= items.length));
          action.addEventListener("click", () => {
            if (action.disabled) return;
            const [item] = items.splice(index, 1);
            if (offset) items.splice(index + offset, 0, item);
            navigation.set(key, String(offset ? index + offset : Math.max(0, index - 1)));
            change(); render();
          });
          actions.append(action);
        }
      }
      section.append(row, actions); parent.append(section);
    } else if (field.fields) {
      const group = el("div", { className: "editor-focused-group" });
      const nested = object[field.key] || {};
      renderFocusedFields(group, nested, field.fields, {
        navigation, render, button, dirty,
        change: () => { object[field.key] = nested; change(); },
      }, key);
      parent.append(group);
    } else {
      const input = el(field.options ? "select" : field.type === "textarea" ? "textarea" : "input", {
        className: "editor-input", ...(field.options || field.type === "textarea" ? {} : { type: ["number", "checkbox"].includes(field.type) ? field.type : "text" }),
      });
      input.id = `content-field-${key}`;
      if (field.options) [...new Set([...field.options, object[field.key]].filter(Boolean))].forEach((value) => input.append(el("option", { value }, value)));
      if (field.type === "checkbox") input.checked = Boolean(object[field.key]);
      else input.value = object[field.key] ?? "";
      if (field.required) input.required = true;
      if (field.type === "number") { input.min = "0"; input.step = "1"; }
      if (field.max !== undefined) input.max = String(field.max);
      if (field.maxLength) input.maxLength = field.maxLength;
      input.addEventListener("input", () => {
        if (field.optional && field.type === "number" && input.value === "") delete object[field.key];
        else object[field.key] = field.type === "checkbox" ? input.checked : field.type === "number" ? Number(input.value) : input.value;
        change();
      });
      parent.append(el("label", { for: input.id }, field.label), input);
    }
  }
}

function renderFocusedListSelect(parent, label, options, navigation, key, dirty, render) {
  const select = el("select", { className: "editor-input", "aria-label": label, "data-navigation": "true" });
  select.dataset.focusKey = key;
  options.forEach(([value, text]) => select.append(el("option", { value }, text)));
  const active = options.some(([value]) => value === navigation.get(key)) ? navigation.get(key) : options[0]?.[0] || "";
  navigation.set(key, active); select.value = active;
  select.dataset.edge = String(!options.length);
  select.addEventListener("change", () => {
    if (dirty()) { select.value = active; return; }
    navigation.set(key, select.value); render();
  });
  const wrapper = el("label", {}, label);
  wrapper.append(select); parent.append(wrapper);
  return active;
}

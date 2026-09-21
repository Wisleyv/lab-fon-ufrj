import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CONTENT_DATASETS, validateContent } from "../../src/js/editor/content-fields.js";
import { getBuildReadiness } from "../../src/js/editor/build-service.js";
import { createContentEditor } from "../../src/js/editor/content-editor.js";
import { createEditorStore } from "../../src/js/editor/state.js";
import { applySiteContent } from "../../src/js/site-content.js";
const require = createRequire(import.meta.url);
const { readContentDataset, saveContentRecord } = require("../../desktop/content-store.cjs");
const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }); });
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-content-test-"));
  roots.push(root);
  await fs.mkdir(path.join(root, "content/equipe"), { recursive: true });
  return root;
}
describe("canonical content persistence", () => {
  it("preserves existing footer fields through local save and read-back", async () => {
    const root = await fixture();
    const site = JSON.parse(await fs.readFile("content/site.json", "utf8"));
    expect(validateContent(site, CONTENT_DATASETS.site.fields)).toEqual([]);
    const original = { ...site, footer: { ...site.footer, coordination: { lab: [], extensionProject: [] } } };
    await fs.writeFile(path.join(root, "content/site.json"), JSON.stringify(original));
    await saveContentRecord(null, root, "site", "site.json", original, site);
    const saved = (await readContentDataset(null, root, "site"))[0].value;
    expect(saved).toEqual(site);
    document.body.innerHTML = '<footer><div data-site-footer-content></div><p data-site-footer-bottom></p></footer>';
    applySiteContent(document, saved);
    expect(document.querySelectorAll(".footer-coordination li")).toHaveLength(5);
    expect(document.querySelectorAll(".footer-credits li")).toHaveLength(3);
  });
  it("adds, edits and removes one record without changing unrelated files", async () => {
    const root = await fixture();
    const a = { nome: "Teste", extra: { preserved: true } };
    await saveContentRecord(null, root, "equipe", "first.json", null, a);
    await saveContentRecord(null, root, "equipe", "other.json", null, { nome: "Outro" });
    const b = { ...a, nome: "Alterado" };
    await saveContentRecord(null, root, "equipe", "first.json", a, b);
    expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual(b);
    await saveContentRecord(null, root, "equipe", "first.json", b, null);
    expect(await readContentDataset(null, root, "equipe")).toEqual([{ name: "other.json", value: { nome: "Outro" } }]);
  });
  it("rejects stale writes, collisions and unauthorized paths", async () => {
    const root = await fixture();
    const a = { nome: "Original" };
    await saveContentRecord(null, root, "equipe", "first.json", null, a);
    await expect(saveContentRecord(null, root, "equipe", "first.json", null, {})).rejects.toThrow("mudou");
    await expect(saveContentRecord(null, root, "equipe", "../site.json", null, {})).rejects.toThrow();
    await expect(readContentDataset(null, root, "publicacoes")).rejects.toThrow();
    expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual(a);
  });
  it("does not permit removing the site singleton", async () => {
    const root = await fixture();
    await fs.writeFile(path.join(root, "content/site.json"), "{}");
    await expect(saveContentRecord(null, root, "site", "site.json", {}, null)).rejects.toThrow("removido");
  });
});
it("validates required fields, counters, identifiers and unsafe URLs", () => {
  expect(validateContent({ ...CONTENT_DATASETS.linhasPesquisa.empty, estudantes: -1 }, CONTENT_DATASETS.linhasPesquisa.fields).length).toBeGreaterThan(0);
  expect(validateContent({ nome: "A", instituicao: "B", foto: "javascript:alert(1)" }, CONTENT_DATASETS.equipe.fields)).toContain("Foto: endereço inválido.");
});
it("validates optional team metadata without changing older record requirements", () => {
  const person = { nome: "Teste", instituicao: "UFRJ" };
  const fields = CONTENT_DATASETS.equipe.fields;
  expect(validateContent(person, fields)).toEqual([]);
  expect(validateContent({ ...person, badge: "Fundador", priority: 0 }, fields)).toEqual([]);
  expect(validateContent({ ...person, priority: 999 }, fields)).toEqual([]);
  for (const priority of [-1, 1000, 1.5, "0", null]) expect(validateContent({ ...person, priority }, fields).length).toBeGreaterThan(0);
  for (const badge of [42, "a".repeat(41)]) expect(validateContent({ ...person, badge }, fields).length).toBeGreaterThan(0);
});
it("saves team metadata from the existing form and clears optional priority without converting it to zero", async () => {
  const root = await fixture();
  const original = { nome: "Teste", instituicao: "UFRJ", categoria: "docentes" };
  await saveContentRecord(null, root, "equipe", "person.json", null, original);
  const host = {
    readContentDataset: (_root, dataset) => readContentDataset(null, root, dataset),
    saveContentRecord: (_root, dataset, name, previous, next) => saveContentRecord(null, root, dataset, name, previous, next),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  document.querySelector("#editor-content-dataset").value = "equipe";
  store.setState({ openedProject: { path: root, status: "valid" }, editorSiteModel: { equipe: [original] } });
  const inputFor = (label) => document.getElementById([...document.querySelectorAll("label")].find((node) => node.textContent === label)?.htmlFor);
  await vi.waitFor(() => expect(inputFor("Distinção")).not.toBeNull());
  const edit = (label, value) => { const input = inputFor(label); input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); };
  edit("Distinção", "Fundador"); edit("Prioridade em Docentes", "0");
  expect(inputFor("Prioridade em Docentes").max).toBe("999");
  expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual(original);
  document.querySelector("#editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() => expect(store.getState().contentDirty).toBe(false));
  expect((await readContentDataset(null, root, "equipe"))[0].value).toMatchObject({ badge: "Fundador", priority: 0 });
  edit("Prioridade em Docentes", "");
  document.querySelector("#editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() => expect(store.getState().contentDirty).toBe(false));
  expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual({ ...original, badge: "Fundador" });
  editor.destroy();
});
it("blocks generation while content is unsaved or saving", () => {
  const state = { openedProject: { status: "valid" }, diagnostics: [] };
  expect(getBuildReadiness({ ...state, contentDirty: true }).ok).toBe(false);
  expect(getBuildReadiness({ ...state, contentSaving: true }).ok).toBe(false);
});
it("keeps form edits reversible and preserves the draft when saving fails", async () => {
  const original = { nome: "Original", instituicao: "UFRJ", categoria: "docentes", foto: "assets/images/avatar.webp", lattes: "" };
  const host = {
    readContentDataset: vi.fn(async () => [{ name: "original.json", value: original }]),
    saveContentRecord: vi.fn(async () => { throw new Error("Disco indisponível"); }),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  const chooser = document.querySelector("#editor-content-dataset");
  chooser.value = "equipe";
  store.setState({ openedProject: { path: "project", status: "valid" }, editorSiteModel: { equipe: [original] } });
  await vi.waitFor(() => expect(document.querySelector("#editor-content-form input")).not.toBeNull());
  const input = document.querySelector("#editor-content-form input");
  const save = document.querySelector("#editor-content-save");
  expect(save.disabled).toBe(true);
  input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
  expect(save.disabled).toBe(true);
  expect(document.getElementById(save.getAttribute("aria-describedby")).textContent).not.toBe("");
  input.value = "Alterado"; input.dispatchEvent(new Event("input", { bubbles: true }));
  expect(save.disabled).toBe(false);
  expect(store.getState().contentDirty).toBe(true);
  expect(original.nome).toBe("Original");
  expect(host.saveContentRecord).not.toHaveBeenCalled();
  document.querySelector("#editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  document.querySelector("#editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  expect(host.saveContentRecord).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(document.querySelector("#editor-content-edit-status").textContent).toContain("Disco indisponível"));
  expect(store.getState().contentDirty).toBe(true);
  expect(store.getState().editorSiteModel.equipe[0].nome).toBe("Alterado");
  document.querySelector("#editor-content-cancel").click();
  expect(store.getState().contentDirty).toBe(false);
  expect(store.getState().editorSiteModel.equipe[0].nome).toBe("Original");
  editor.destroy();
});

it.each(["equipe", "parcerias", "linhasPesquisa"])("focuses one %s record and protects selection until save/discard", async (dataset) => {
  let records = ["First", "Second"].map((nome, index) => ({ name: `${index}.json`, value: {
    ...structuredClone(CONTENT_DATASETS[dataset].empty), nome, instituicao: "UFRJ", id: `item-${index}`, descricao: "Description",
  } }));
  const host = {
    readContentDataset: vi.fn(async () => structuredClone(records)),
    saveContentRecord: vi.fn(async (_directory, _dataset, name, _previous, value) => {
      records = records.filter((record) => record.name !== name);
      if (value) records.push({ name, value: structuredClone(value) });
      return { ok: true };
    }),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  const get = (id) => document.getElementById(id);
  const select = (node, value) => { node.value = value; node.dispatchEvent(new Event("change")); };
  const nameInput = () => get("content-field-root.nome");
  try {
    get("editor-content-dataset").value = dataset;
    store.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { [dataset]: records.map((record) => record.value) } });
    await vi.waitFor(() => expect(nameInput()?.value).toBe("First"));
    expect(document.querySelectorAll('#editor-content-form input[id$=".nome"]')).toHaveLength(1);
    select(get("editor-content-record"), "1.json");
    expect(nameInput().value).toBe("Second");
    nameInput().value = "Edited"; nameInput().dispatchEvent(new Event("input", { bubbles: true }));
    select(get("editor-content-record"), "0.json");
    expect(get("editor-content-record").value).toBe("1.json");
    expect(nameInput().value).toBe("Edited");
    select(get("editor-content-dataset"), "site");
    expect(get("editor-content-dataset").value).toBe(dataset);
    get("editor-content-cancel").click();
    expect(nameInput().value).toBe("Second");
    get("editor-content-add").click();
    expect(get("editor-content-record").selectedOptions[0].textContent).toBe("Novo registro");
    get("editor-content-cancel").click();
    expect(nameInput().value).toBe("Second");
    nameInput().value = "Saved"; nameInput().dispatchEvent(new Event("input", { bubbles: true }));
    get("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(store.getState().contentSaving).toBe(false));
    expect(records.find((record) => record.name === "1.json").value.nome).toBe("Saved");
    expect(get("editor-content-record").value).toBe("1.json");
    expect(get("editor-content-save").classList.contains("editor-btn-primary")).toBe(true);
    expect(get("editor-content-remove").classList.contains("editor-btn-danger")).toBe(true);
  } finally { editor.destroy(); }
});

it("focuses Site groups and one nested link, preserving add/remove/reorder through canonical read-back", async () => {
  const root = await fixture();
  const original = JSON.parse(await fs.readFile("content/site.json", "utf8"));
  await fs.writeFile(path.join(root, "content/site.json"), JSON.stringify(original));
  const host = {
    readContentDataset: (_directory, dataset) => readContentDataset(null, root, dataset),
    saveContentRecord: (_directory, dataset, name, previous, next) => saveContentRecord(null, root, dataset, name, previous, next),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  const get = (id) => document.getElementById(id);
  const group = (value) => [...document.querySelectorAll('[aria-label="Grupo de campos"]')].find((node) => [...node.options].some((option) => option.value === value));
  const select = (node, value) => { node.value = value; node.dispatchEvent(new Event("change")); };
  const save = async () => {
    expect(get("editor-content-save").disabled).toBe(false);
    get("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(store.getState().contentSaving).toBe(false));
    expect(store.getState().contentDirty).toBe(false);
    return (await readContentDataset(null, root, "site"))[0].value;
  };
  try {
    store.setState({ openedProject: { path: root, status: "valid" }, editorSiteModel: { site: original } });
    await vi.waitFor(() => expect(group("hero")).toBeDefined());
    expect(get("content-field-root.header.title")).not.toBeNull();
    expect(get("content-field-root.hero.title")).toBeNull();
    group("hero").focus();
    select(group("hero"), "hero");
    expect(document.activeElement).toBe(group("hero"));
    select(group("actions"), "actions");
    expect(document.querySelectorAll("#editor-content-form fieldset")).toHaveLength(0);
    const links = () => document.querySelector('[aria-label="Links"]');
    expect(links().options.length).toBe(original.hero.actions.length);
    select(links(), "1");
    const label = get("content-field-root.hero.actions.1.label");
    expect(get("content-field-root.hero.actions.0.label")).toBeNull();
    label.value = "Pending"; label.dispatchEvent(new Event("input", { bubbles: true }));
    select(links(), "0"); expect(links().value).toBe("1");
    expect(group("hero").disabled).toBe(true);
    expect((await readContentDataset(null, root, "site"))[0].value).toEqual(original);
    get("editor-content-cancel").click();
    expect(get("content-field-root.hero.actions.1.label").value).toBe(original.hero.actions[1].label);
    document.querySelector('[aria-label="Subir Links"]').click();
    expect(links().value).toBe("0");
    let saved = await save();
    expect(saved.hero.actions[0]).toEqual(original.hero.actions[1]);
    const add = [...document.querySelectorAll("button")].find((node) => node.textContent === "Adicionar Links");
    add.click();
    expect(links().value).toBe(String(original.hero.actions.length));
    saved = await save();
    expect(saved.hero.actions).toHaveLength(original.hero.actions.length + 1);
    document.querySelector('[aria-label="Remover Links"]').click();
    saved = await save();
    expect(saved.hero.actions).toHaveLength(original.hero.actions.length);
    expect(saved.header).toEqual(original.header);
    expect(saved.footer).toEqual(original.footer);
    expect(validateContent(saved, CONTENT_DATASETS.site.fields)).toEqual([]);
  } finally { editor.destroy(); }
});

it("focuses extension projects and materializes optional groups only on edit", async () => {
  const original = { projects: [
    { id: "one", title: "One", projectType: "Extension", image: null, socialLinks: [] },
    { id: "two", title: "Two", projectType: "Extension", image: null, socialLinks: [] },
  ] };
  const host = { readContentDataset: async () => [{ name: "extensao.json", value: structuredClone(original) }] };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  const get = (id) => document.getElementById(id);
  const select = (node, value) => { node.value = value; node.dispatchEvent(new Event("change")); };
  try {
    get("editor-content-dataset").value = "extensao";
    store.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { extensao: original } });
    await vi.waitFor(() => expect(get("content-field-root.projects.0.title")).not.toBeNull());
    expect(get("content-field-root.projects.1.title")).toBeNull();
    select(document.querySelector('[aria-label="Projetos"]'), "1");
    select(document.querySelector('[aria-label="Grupo de campos"]'), "image");
    expect(store.getState().contentDirty).toBeFalsy();
    expect(store.getState().editorSiteModel.extensao.projects[1].image).toBeNull();
    const input = get("content-field-root.projects.1.image.alt");
    input.value = "Alternative"; input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(store.getState().editorSiteModel.extensao.projects[1].image).toEqual({ alt: "Alternative" });
    expect(store.getState().editorSiteModel.extensao.projects[0]).toEqual(original.projects[0]);
    get("editor-content-cancel").click();
    expect(store.getState().editorSiteModel.extensao).toEqual(original);
  } finally { editor.destroy(); }
});

it("shows only enabled section datasets and preserves a dirty selection when composition disables it", async () => {
  const line = { id: "fonetica", nome: "Fonética", descricao: "Descrição", icon: "fa-solid fa-flask", estudantes: 2, pesquisadores: 3, ordem: 1 };
  const site = { hero: { title: "Site" } };
  const host = { readContentDataset: vi.fn(async (_directory, key) => key === "site"
    ? [{ name: "site.json", value: site }]
    : [{ name: "linha.json", value: line }]) };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  const enabled = { sections: [
    { id: "linhas", type: "linhas_pesquisa", enabled: true },
    { id: "equipe", type: "equipe", enabled: true },
    { id: "extensao", type: "extension", enabled: false },
    { id: "parcerias", type: "parcerias", enabled: false },
    { id: "publicacoes", type: "publicacoes", enabled: false },
  ] };
  store.setState({ draftComposition: enabled, openedProject: { path: "fixture", status: "valid" },
    editorSiteModel: { site, linhasPesquisa: [line], equipe: [], extensao: { projects: [] }, parcerias: [], publicacoes: [{ title: "Preservada" }] } });
  const chooser = document.getElementById("editor-content-dataset");
  await vi.waitFor(() => expect([...chooser.options].map((option) => option.value)).toEqual(["site", "equipe", "linhasPesquisa"]));
  chooser.value = "linhasPesquisa"; chooser.dispatchEvent(new Event("change"));
  await vi.waitFor(() => expect(document.getElementById("content-field-root.nome")?.value).toBe("Fonética"));
  const name = document.getElementById("content-field-root.nome");
  name.value = "Fonética editada"; name.dispatchEvent(new Event("input", { bubbles: true }));
  store.setState({ draftComposition: { sections: enabled.sections.map((section) => section.type === "linhas_pesquisa" ? { ...section, enabled: false } : section) } });
  expect(chooser.value).toBe("linhasPesquisa");
  expect(chooser.selectedOptions[0].textContent).toContain("alterações pendentes");
  expect(document.getElementById("content-field-root.nome").value).toBe("Fonética editada");
  expect(store.getState().editorSiteModel.publicacoes).toEqual([{ title: "Preservada" }]);
  document.getElementById("editor-content-cancel").click();
  await vi.waitFor(() => expect([...chooser.options].map((option) => option.value)).toEqual(["site", "equipe"]));
  editor.destroy();
});

it("keeps research-line technical data while exposing only name and description outside advanced editing", async () => {
  let record = { id: "fonetica-experimental", nome: "Fonética", descricao: "Descrição", icon: "fa-solid fa-wave-square", estudantes: 4, pesquisadores: 5, ordem: 7 };
  const host = {
    readContentDataset: vi.fn(async () => [{ name: "linha.json", value: structuredClone(record) }]),
    saveContentRecord: vi.fn(async (_directory, _dataset, _name, _previous, next) => { record = structuredClone(next); return { ok: true }; }),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  document.getElementById("editor-content-dataset").value = "linhasPesquisa";
  store.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { linhasPesquisa: [record] } });
  await vi.waitFor(() => expect(document.getElementById("content-field-root.nome")?.value).toBe("Fonética"));
  expect([...document.querySelectorAll("#editor-content-fields label")].map((label) => label.textContent)).toEqual(["Nome", "Descrição"]);
  const advanced = document.getElementById("editor-content-advanced");
  expect(advanced.open).toBe(false);
  expect(advanced.querySelector("summary").textContent).toBe("Edição avançada");
  expect([...advanced.querySelectorAll("label")].map((label) => label.textContent)).toEqual(["Ícone", "Ordem de exibição"]);
  expect(document.body.textContent).not.toContain("Identificador");
  expect(document.body.textContent).not.toContain("Estudantes");
  expect(document.body.textContent).not.toContain("Pesquisadores");
  const name = document.getElementById("content-field-root.nome");
  name.value = "Fonética atualizada"; name.dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() => expect(store.getState().contentDirty).toBe(false));
  expect(record).toEqual({ id: "fonetica-experimental", nome: "Fonética atualizada", descricao: "Descrição", icon: "fa-solid fa-wave-square", estudantes: 4, pesquisadores: 5, ordem: 7 });
  editor.destroy();
});

it("preserves the PROVALE identifier while hiding it from ordinary editing", async () => {
  let extension = { projects: [{ id: "provale-em-extensao", projectType: "Projeto de Extensão", title: "PROVALE em Extensão", image: null, minibio: "Texto", complementaryText: "", coordination: [], socialLinks: [], instagram: { enabled: false, source: "", provider: "instagram" } }] };
  const host = {
    readContentDataset: vi.fn(async () => [{ name: "extensao.json", value: structuredClone(extension) }]),
    saveContentRecord: vi.fn(async (_directory, _dataset, _name, _previous, next) => { extension = structuredClone(next); return { ok: true }; }),
  };
  const store = createEditorStore();
  const editor = createContentEditor({ host, store });
  document.body.replaceChildren(editor.element);
  document.getElementById("editor-content-dataset").value = "extensao";
  store.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { extensao: extension } });
  await vi.waitFor(() => expect(document.getElementById("content-field-root.projects.0.title")?.value).toBe("PROVALE em Extensão"));
  expect(document.body.textContent).not.toContain("Identificador");
  const title = document.getElementById("content-field-root.projects.0.title");
  title.value = "PROVALE atualizado"; title.dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() => expect(store.getState().contentDirty).toBe(false));
  expect(extension.projects[0].id).toBe("provale-em-extensao");
  expect(extension.projects[0].title).toBe("PROVALE atualizado");
  editor.destroy();
});

it("generates unique stable IDs for new research lines and extension projects", async () => {
  let lines = [{ id: "nova-linha", nome: "Existente", descricao: "Descrição", icon: "fa-solid fa-flask", estudantes: 0, pesquisadores: 0, ordem: 1 }];
  const lineHost = {
    readContentDataset: vi.fn(async () => lines.map((value, index) => ({ name: `${index}.json`, value: structuredClone(value) }))),
    saveContentRecord: vi.fn(async (_directory, _dataset, _name, _previous, next) => { lines.push(structuredClone(next)); return { ok: true }; }),
  };
  const lineStore = createEditorStore();
  const lineEditor = createContentEditor({ host: lineHost, store: lineStore });
  document.body.replaceChildren(lineEditor.element);
  document.getElementById("editor-content-dataset").value = "linhasPesquisa";
  lineStore.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { linhasPesquisa: lines } });
  await vi.waitFor(() => expect(document.getElementById("content-field-root.nome")).not.toBeNull());
  document.getElementById("editor-content-add").click();
  const name = document.getElementById("content-field-root.nome");
  name.value = "Nova Linha"; name.dispatchEvent(new Event("input", { bubbles: true }));
  const description = document.getElementById("content-field-root.descricao");
  description.value = "Descrição nova"; description.dispatchEvent(new Event("input", { bubbles: true }));
  name.value = "Nome alterado"; name.dispatchEvent(new Event("input", { bubbles: true }));
  const newLine = lineStore.getState().editorSiteModel.linhasPesquisa.find((item) => item.nome === "Nome alterado");
  expect(newLine.id).toBe("nova-linha-2");
  expect(validateContent(newLine, CONTENT_DATASETS.linhasPesquisa.fields)).toEqual([]);
  lineEditor.destroy();

  const extension = { projects: [{ id: "novo-projeto", projectType: "Tipo", title: "Existente", image: null, coordination: [], socialLinks: [] }] };
  const extensionHost = { readContentDataset: vi.fn(async () => [{ name: "extensao.json", value: structuredClone(extension) }]) };
  const extensionStore = createEditorStore();
  const extensionEditor = createContentEditor({ host: extensionHost, store: extensionStore });
  document.body.replaceChildren(extensionEditor.element);
  document.getElementById("editor-content-dataset").value = "extensao";
  extensionStore.setState({ openedProject: { path: "fixture", status: "valid" }, editorSiteModel: { extensao: extension } });
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Projetos"]')).not.toBeNull());
  document.querySelector('[data-focus-key="root.projects:add"]').click();
  const newTitle = document.getElementById("content-field-root.projects.1.title");
  newTitle.value = "Novo Projeto"; newTitle.dispatchEvent(new Event("input", { bubbles: true }));
  newTitle.value = "Título alterado"; newTitle.dispatchEvent(new Event("input", { bubbles: true }));
  const newProject = extensionStore.getState().editorSiteModel.extensao.projects[1];
  expect(newProject.id).toBe("novo-projeto-2");
  expect(validateContent(extensionStore.getState().editorSiteModel.extensao, CONTENT_DATASETS.extensao.fields)).toEqual([]);
  extensionEditor.destroy();
});

describe("Equipe managed photo form", () => {
  const previewUrl = "data:image/png;base64,iVBORw0KGgo=";
  const photo = "assets/images/image-00000000-0000-4000-8000-000000000001.png";
  async function openPhotoEditor(original = { nome: "Original", instituicao: "UFRJ", foto: "assets/images/legacy.jpeg" }) {
    const root = await fixture();
    const other = { nome: "Other", instituicao: "UFRJ", foto: "assets/images/shared.webp" };
    await saveContentRecord(null, root, "equipe", "first.json", null, original);
    await saveContentRecord(null, root, "equipe", "second.json", null, other);
    const host = {
      readContentDataset: (_root, dataset) => readContentDataset(null, root, dataset),
      saveContentRecord: vi.fn((_root, dataset, name, previous, next) => saveContentRecord(null, root, dataset, name, previous, next)),
      selectProjectImage: vi.fn(async () => ({ ok: true, path: photo, previewUrl })),
      readProjectImage: vi.fn(async () => ({ ok: true, previewUrl })),
    };
    const store = createEditorStore();
    const editor = createContentEditor({ host, store });
    document.body.replaceChildren(editor.element);
    document.getElementById("editor-content-dataset").value = "equipe";
    store.setState({ openedProject: { path: root, status: "valid" }, editorSiteModel: { equipe: [original, other] } });
    await vi.waitFor(() => expect(document.querySelector(".editor-image-field button")).not.toBeNull());
    return { root, original, other, host, store, editor };
  }
  const choose = () => document.querySelector(".editor-image-field button");
  const output = () => document.querySelector(".editor-image-field output");
  const get = (id) => document.getElementById(id);
  it("previews existing photos, replaces only the draft, discards, saves and reopens independently", async () => {
    const { root, original, other, host, store, editor } = await openPhotoEditor();
    try {
      await vi.waitFor(() => expect(document.querySelector(".editor-image-field img").getAttribute("src")).toBe(previewUrl));
      expect(choose().textContent).toBe("Alterar foto");
      expect(output().textContent).toBe(original.foto);
      expect(get("content-field-root.foto")).toBeNull();
      choose().click();
      expect(store.getState().imageSelecting).toBe(true);
      expect(get("editor-content-record").disabled).toBe(true);
      expect(getBuildReadiness(store.getState()).ok).toBe(false);
      await vi.waitFor(() => expect(store.getState().imageSelecting).toBe(false));
      expect(store.getState().contentDirty).toBe(true);
      expect(output().textContent).toBe(photo);
      expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual(original);
      expect(host.saveContentRecord).not.toHaveBeenCalled();
      get("editor-content-cancel").click();
      expect(output().textContent).toBe(original.foto);
      expect(store.getState().editorSiteModel.equipe[0]).toEqual(original);
      choose().click();
      await vi.waitFor(() => expect(store.getState().imageSelecting).toBe(false));
      get("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
      await vi.waitFor(() => expect(store.getState().contentSaving).toBe(false));
      expect(store.getState().contentDirty).toBe(false);
      const saved = await readContentDataset(null, root, "equipe");
      expect(saved[0].value).toEqual({ ...original, foto: photo });
      expect(saved[1].value).toEqual(other);
      const record = get("editor-content-record");
      record.value = "second.json"; record.dispatchEvent(new Event("change"));
      expect(output().textContent).toBe(other.foto);
      store.setState({ openedProject: { path: root, status: "valid" } });
      await vi.waitFor(() => expect(output()?.textContent).toBe(photo));
      expect(JSON.stringify(saved)).not.toContain(root);
    } finally { editor.destroy(); }
  });
  it.each(["cancel", "unsupported", "throw"])("keeps existing content intact after picker %s", async (outcome) => {
    const { original, host, store, editor } = await openPhotoEditor();
    try {
      if (outcome === "throw") host.selectProjectImage.mockRejectedValue(new Error("Disk failed"));
      else host.selectProjectImage.mockResolvedValue(outcome === "cancel" ? { ok: false, cancelled: true } : { ok: false, message: "Formato não aceito." });
      choose().click();
      await vi.waitFor(() => expect(store.getState().imageSelecting).toBe(false));
      expect(store.getState().contentDirty).toBeFalsy();
      expect(output().textContent).toBe(original.foto);
      expect(host.saveContentRecord).not.toHaveBeenCalled();
      expect(choose().disabled).toBe(false);
    } finally { editor.destroy(); }
  });
  it("keeps no-photo and missing-photo records editable without rewriting legacy paths", async () => {
    const { host, store, editor } = await openPhotoEditor({ nome: "No photo", instituicao: "UFRJ" });
    try {
      expect(choose().textContent).toBe("Carregar foto");
      expect(output().textContent).toBe("");
      host.readProjectImage.mockResolvedValue({ ok: false });
      const record = get("editor-content-record");
      record.value = "second.json"; record.dispatchEvent(new Event("change"));
      await vi.waitFor(() => expect(document.querySelector(".editor-image-field [role=status]").textContent).toBe("Imagem indisponível."));
      expect(store.getState().contentDirty).toBeFalsy();
      expect(output().textContent).toBe("assets/images/shared.webp");
      expect(choose().disabled).toBe(false);
    } finally { editor.destroy(); }
  });
  it("keeps the replacement draft after a failed save", async () => {
    const { host, store, editor } = await openPhotoEditor();
    try {
      choose().click();
      await vi.waitFor(() => expect(store.getState().imageSelecting).toBe(false));
      host.saveContentRecord.mockRejectedValue(new Error("Write failed"));
      get("editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
      await vi.waitFor(() => expect(store.getState().contentSaving).toBe(false));
      expect(store.getState().contentDirty).toBe(true);
      expect(output().textContent).toBe(photo);
    } finally { editor.destroy(); }
  });
  it("ignores a late picker result after the editor is destroyed", async () => {
    const { host, store, editor } = await openPhotoEditor();
    let finish;
    host.selectProjectImage.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    choose().click();
    editor.destroy();
    finish({ ok: true, path: photo, previewUrl });
    await vi.waitFor(() => expect(store.getState().imageSelecting).toBe(false));
    expect(store.getState().contentDirty).toBeFalsy();
  });
});

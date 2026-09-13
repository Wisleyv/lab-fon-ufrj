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

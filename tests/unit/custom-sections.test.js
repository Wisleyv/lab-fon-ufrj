import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizePageComposition, validatePageComposition, applyPageComposition } from "../../src/js/page/composition.js";
import { createCustomSection, enableCustomSection, removeSection, moveSection, updateCustomSection, compositionsEqual } from "../../src/js/editor/composition-commands.js";
import { createProjectCompositionService, createMemoryCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import { loadEditorSiteModel } from "../../src/js/editor/project-loader.js";
import { renderCompositionPreview } from "../../src/js/editor/composition-preview.js";
import { renderPageNavigation } from "../../src/js/page/navigation.js";
import { createSectionRenderer, SECTION_REGISTRY } from "../../src/js/page/section-registry.js";
import { HTMLSanitizer } from "../../src/js/utils/sanitizer.js";
import { initEditorApp } from "../../src/js/editor/bootstrap.js";
import { readPageComposition } from "../../scripts/build-data.js";

const legacy = { kind: "single-page", sections: [{ id: "sobre", type: "sobre", enabled: true, order: 1 }] };
const blocks = [
  { type: "heading", text: "Resultados" },
  { type: "paragraph", text: '<script>alert("literal")</script>' },
  { type: "list", ordered: true, items: ["Um", "Dois"] },
  { type: "link", label: "UFRJ", url: "https://ufrj.br/" },
  { type: "button", label: "Contato", url: "mailto:lab@ufrj.br" },
];
const clone = (value) => structuredClone(value);
const custom = (page) => page.sections.filter((section) => section.type === "custom");
function two() {
  let page = createCustomSection(legacy, { title: "Custom A" }, { afterSectionId: null });
  page = updateCustomSection(page, custom(page)[0].id, { content: { blocks: clone(blocks) } });
  page = createCustomSection(page, { title: "Custom B", label: "Segundo" }, { afterSectionId: "sobre" });
  return normalizePageComposition(updateCustomSection(page, custom(page)[1].id, { content: { blocks: [{ type: "paragraph", text: "Independente" }] } }));
}
const temporary = [];
afterEach(() => { for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); document.body.replaceChildren(); });

describe("C2 compatibility and identity", () => {
  it("retains legacy representation and upgrades only the creation draft", () => {
    expect(normalizePageComposition(legacy).schemaVersion).toBeUndefined();
    expect(normalizePageComposition({ ...legacy, schemaVersion: 1 }).schemaVersion).toBe(1);
    const page = two();
    expect(page.schemaVersion).toBe(2);
    const [a, b] = custom(page);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^custom-[0-9a-f-]{36}$/);
    expect(page.sections.map((section) => section.id)).toEqual([a.id, "sobre", b.id]);
    expect(updateCustomSection(page, a.id, { title: "Renomeada" }).sections[0].id).toBe(a.id);
    expect(updateCustomSection(page, a.id, { id: "bad" })).toEqual(page);
    expect(moveSection(page, b.id, "up").sections[1].id).toBe(b.id);
    expect(compositionsEqual(page, updateCustomSection(page, a.id, { content: { blocks: [] } }))).toBe(false);
    expect(legacy.schemaVersion).toBeUndefined();
  });

  it.each([
    ["future version", (p) => { p.schemaVersion = 3; }],
    ["missing version", (p) => { delete p.schemaVersion; }],
    ["unknown root field", (p) => { p.extension = true; }],
    ["unknown custom field", (p) => { custom(p)[0].html = "<b>bad</b>"; }],
    ["unknown variant", (p) => { custom(p)[0].presentation.variant = "cards"; }],
    ["unknown block", (p) => { custom(p)[0].content.blocks[0].type = "video"; }],
    ["unknown block field", (p) => { custom(p)[0].content.blocks[0].html = "bad"; }],
    ["duplicate ID", (p) => { custom(p)[1].id = custom(p)[0].id; }],
    ["reserved builtin ID", (p) => { p.sections.find((s) => s.type === "sobre").id = custom(p)[0].id; }],
    ["invalid enabled", (p) => { custom(p)[0].enabled = "true"; }],
    ["invalid order", (p) => { custom(p)[0].order = "1"; }],
    ["blank title", (p) => { custom(p)[0].title = " "; }],
    ["long title", (p) => { custom(p)[0].title = "a".repeat(121); }],
    ["large paragraph", (p) => { custom(p)[0].content.blocks[1].text = "a".repeat(4001); }],
    ["too many blocks", (p) => { custom(p)[0].content.blocks = Array.from({ length: 101 }, () => ({ type: "paragraph", text: "a" })); }],
    ["empty list", (p) => { custom(p)[0].content.blocks[2].items = []; }],
    ["nested list", (p) => { custom(p)[0].content.blocks[2].items = [{ text: "a" }]; }],
    ["custom dropdown", (p) => { custom(p)[0].navigation.children = []; }],
    ["builtin duplicate", (p) => { p.sections.push({ id: "other", type: "sobre" }); }],
  ])("refuses %s without stripping or writing, even disabled", async (_name, mutate) => {
    const page = two(); mutate(page); custom(page)[0].enabled = false;
    // Keep the malformed enabled case malformed after disabling other cases.
    if (_name === "invalid enabled") custom(page)[0].enabled = "false";
    const raw = JSON.stringify(page);
    expect(validatePageComposition(page).valid).toBe(false);
    expect(() => normalizePageComposition(page)).toThrow();
    const host = { readJson: vi.fn(async () => page), writeTextFileAtomic: vi.fn() };
    const service = createProjectCompositionService({ host, directory: {} });
    await expect(service.loadComposition()).rejects.toThrow();
    expect((await service.saveComposition(page)).ok).toBe(false);
    expect(host.writeTextFileAtomic).not.toHaveBeenCalled();
    expect(JSON.stringify(page)).toBe(raw);
  });

  it("retains disabled content and rejects stale/self placement", () => {
    const page = two(); const [a, b] = custom(page);
    const disabled = removeSection(page, a.id);
    expect(enableCustomSection(disabled, a.id, { afterSectionId: b.id }).sections.at(-1)).toEqual({ ...a, order: 3 });
    expect(enableCustomSection(disabled, a.id, { afterSectionId: a.id }).ok).toBe(false);
    expect(createCustomSection(page, { title: "C" }, { afterSectionId: "missing" }).ok).toBe(false);
    expect(custom(disabled)[0].content).toEqual(a.content);
  });

  it("rejects unknown legacy extensions and exposes invalid project diagnostics", async () => {
    const page = { ...legacy, extension: "unrecognized" };
    const host = createMemoryDesktopHost({ "package.json": "{}", "scripts/build-data.js": "", "content/page.json": JSON.stringify(page), "content/site.json": "{}" });
    const result = await loadEditorSiteModel(host, { name: "fixture", path: "C:/fixture" });
    expect(result.ok).toBe(false);
    expect(result.model).toBeNull();
    expect(result.diagnostics.some((item) => item.code === "PAGE_SCHEMA_UNSUPPORTED")).toBe(true);
  });

  it("enforces aggregate limits including disabled instances and UTF-8 size", () => {
    const page = two();
    const base = custom(page)[0];
    const entries = (count) => Array.from({ length: count }, (_, index) => ({ ...clone(base),
      id: `custom-00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      enabled: false, order: index + 1, content: { blocks: [] } }));
    expect(validatePageComposition({ ...page, sections: entries(50) }).valid).toBe(true);
    expect(validatePageComposition({ ...page, sections: entries(51) }).valid).toBe(false);
    const fiveHundred = entries(5).map((entry) => ({ ...entry, content: { blocks: Array.from({ length: 100 }, () => ({ type: "paragraph", text: "a" })) } }));
    expect(validatePageComposition({ ...page, sections: fiveHundred }).valid).toBe(true);
    expect(validatePageComposition({ ...page, sections: [...fiveHundred, { ...entries(6)[5], content: { blocks: [{ type: "paragraph", text: "a" }] } }] }).valid).toBe(false);
    fiveHundred.forEach((entry) => entry.content.blocks.forEach((block) => { block.text = "\u00e9".repeat(4000); }));
    expect(validatePageComposition({ ...page, sections: fiveHundred }).diagnostics.some((entry) => entry.code === "PAGE_LIMIT_EXCEEDED")).toBe(true);
    expect(validatePageComposition({ ...legacy, sections: [{ id: "bad", type: "toString" }] }).valid).toBe(false);
  });

  it("preserves valid defaults, Unicode boundaries and complete version-2 project load", async () => {
    const page = two(); const section = custom(page)[0];
    section.title = "\u{1f600}".repeat(120);
    delete section.navigation;
    delete section.presentation;
    delete section.content.blocks[2].ordered;
    const normalized = normalizePageComposition(page);
    expect(custom(normalized)[0]).toMatchObject({ title: section.title, navigation: { visible: false }, presentation: { variant: "text" } });
    expect(custom(normalized)[0].navigation.label).toBeUndefined();
    const host = createMemoryDesktopHost({ "package.json": "{}", "scripts/build-data.js": "", "content/page.json": JSON.stringify(page), "content/site.json": "{}" });
    const result = await loadEditorSiteModel(host, { name: "fixture", path: "C:/fixture" });
    expect(result.ok).toBe(true);
    expect(result.model.page).toEqual(normalized);
  });
});

describe("C2 safe URL policy", () => {
  it.each(["https://ufrj.br/path?q=a", "http://ufrj.br/", "mailto:lab@ufrj.br", "#sobre"])("accepts %s", (url) => {
    expect(HTMLSanitizer.isSafeCustomURL(url, new Set(["sobre"]))).toBe(true);
  });
  it.each(["javascript:alert(1)", "data:text/html,hello", "vbscript:x", "//ufrj.br", "/relative", "https://u:p@ufrj.br", "https:\\ufrj.br", "\nhttps://ufrj.br", "mailto:a@b.br?subject=x", "mailto:a@b.br,c@d.br", "mailto:a%0d%0aBcc:x@b.br", "#missing"])("rejects %s", (url) => {
    expect(HTMLSanitizer.isSafeCustomURL(url, new Set(["sobre"]))).toBe(false);
  });
});

describe("C2 shared rendering and persistence", () => {
  it("renders two independent instances in production and scoped preview with identical markup", async () => {
    const page = two(); const [a, b] = custom(page);
    document.body.innerHTML = '<ul id="main-navigation"></ul><main id="main-content"><section id="sobre"></section></main><div id="preview"></div>';
    applyPageComposition(document, page);
    renderPageNavigation({ composition: page });
    for (const section of custom(page)) await createSectionRenderer("custom", SECTION_REGISTRY, { section, composition: page }).render(section);
    const publicA = document.getElementById(a.id);
    const html = publicA.outerHTML;
    expect(publicA.querySelector(":scope > .container > .content-prose > h2")).not.toBeNull();
    expect(publicA.querySelector(`[id="${a.id}-content"]`).parentElement.className).toBe("content-prose");
    expect(publicA.querySelector("script")).toBeNull();
    expect(publicA.querySelector("p").textContent).toBe(blocks[1].text);
    expect(publicA.querySelectorAll("h2,h3,ol,a")).toHaveLength(5);
    expect(document.getElementById(b.id).textContent).toContain("Independente");
    const preview = document.getElementById("preview");
    for (let i = 0; i < 2; i++) await renderCompositionPreview({ container: preview, composition: page });
    expect(preview.querySelector(`[id="${a.id}"]`).outerHTML).toBe(html);
    expect(document.getElementById(a.id)).toBe(publicA);
    expect(preview.querySelectorAll('[data-page-section="custom"]')).toHaveLength(2);
    expect([...preview.querySelectorAll("nav a")].map((node) => [node.textContent, node.getAttribute("href")])).toEqual([["Custom A", `#${a.id}`], ["Segundo", `#${b.id}`], ["Contato", "#contato"]]);
    const disabled = removeSection(updateCustomSection(page, b.id, { content: { blocks: [{ type: "link", label: "A", url: `#${a.id}` }] } }), a.id);
    await renderCompositionPreview({ container: preview, composition: disabled });
    expect(preview.querySelector(`[id="${a.id}"]`)).toBeNull();
    expect(preview.querySelector(`[id="${b.id}-content"] a`)).toBeNull();
    expect(preview.querySelector(`[id="${b.id}-content"] span`).textContent).toBe("A");
  });

  it("saves two instances atomically, verifies, consolidates, copies and reopens without data loss", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "labfon-c2-")); temporary.push(directory);
    fs.mkdirSync(path.join(directory, "content"));
    const host = {
      readJson: async (dir, file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")),
      writeTextFileAtomic: async (dir, file, value) => { const dest = path.join(dir, file); fs.writeFileSync(`${dest}.tmp`, value); fs.renameSync(`${dest}.tmp`, dest); },
    };
    const service = createProjectCompositionService({ host, directory });
    const page = two(); const [a] = custom(page);
    expect((await service.saveComposition(page)).ok).toBe(true);
    const fresh = () => createProjectCompositionService({ host, directory });
    expect(await fresh().loadComposition()).toEqual(page);
    expect(readPageComposition(path.join(directory, "content"))).toEqual(page);
    fs.copyFileSync(path.join(directory, "content/page.json"), path.join(directory, "copy.json"));
    expect(JSON.parse(fs.readFileSync(path.join(directory, "copy.json"), "utf8"))).toEqual(page);
    await service.saveComposition(removeSection(page, a.id));
    const reopened = await fresh().loadComposition();
    expect(custom(reopened)[0]).toEqual({ ...a, enabled: false });
    const restored = enableCustomSection(reopened, a.id);
    await service.saveComposition(restored);
    expect(custom(await fresh().loadComposition())[0]).toEqual(a);
    fs.writeFileSync(path.join(directory, "content/page.json"), '{"schemaVersion":3}');
    expect(() => readPageComposition(path.join(directory, "content"))).toThrow();
    fs.writeFileSync(path.join(directory, "content/page.json"), '{broken');
    expect(() => readPageComposition(path.join(directory, "content"))).toThrow();
  });

  it.each(["block", "version", "unknown", "write"])("does not report success after %s verification/write failure", async (failure) => {
    const page = two(); const raw = clone(page);
    if (failure === "block") custom(raw)[0].content.blocks[1].text = "Changed";
    if (failure === "version") delete raw.schemaVersion;
    if (failure === "unknown") custom(raw)[0].content.blocks[0].type = "embed";
    const host = { readJson: async () => raw, writeTextFileAtomic: async () => { if (failure === "write") throw new Error("write failed"); } };
    const result = await createProjectCompositionService({ host, directory: {} }).saveComposition(page);
    expect(result.ok).toBe(false);
    expect(result.composition).toBeUndefined();
    expect(custom(page)[0].content.blocks).toEqual(blocks);
  });
});

describe("C2 editor shared ownership", () => {
  it("unifies built-ins and duplicate-title instances, guards dirty navigation and routes from Page", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const initial = two();
    const [a, b] = custom(initial);
    b.title = a.title;
    const service = createMemoryCompositionService(initial);
    const app = initEditorApp({ compositionService: service });
    const get = (id) => document.getElementById(id);
    const choose = (value) => { get("editor-content-dataset").value = value; get("editor-content-dataset").dispatchEvent(new Event("change")); };
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", source: "local", path: "C:/fixture" } });
      const chooser = get("editor-content-dataset");
      expect([...chooser.options].slice(0, 5).map((option) => option.value)).toEqual(["site", "equipe", "linhasPesquisa", "parcerias", "extensao"]);
      expect([...chooser.options].filter((option) => option.value.startsWith("custom-")).map((option) => option.textContent)).toEqual(["1. Custom A", "2. Custom A"]);
      expect(get("editor-custom-select")).toBeNull();
      choose(a.id);
      expect(get("editor-content-form").hidden).toBe(true);
      expect(get("editor-custom-blocks").parentElement.hidden).toBe(false);
      const text = get("editor-custom-blocks").querySelector("textarea");
      text.value = "A draft"; text.dispatchEvent(new Event("input", { bubbles: true }));
      choose(b.id);
      expect(chooser.value).toBe(a.id);
      expect(get("editor-content-selection-status").textContent).toContain("bloqueada");
      expect(custom(app.store.getState().draftComposition)[0].content.blocks[1].text).toBe("A draft");
      expect(custom(app.store.getState().draftComposition)[1].content).toEqual(b.content);
      get("editor-custom-save").click();
      await vi.waitFor(() => expect(app.store.getState().compositionDirty).toBe(false));
      choose(b.id);
      expect(chooser.value).toBe(b.id);
      choose("equipe");
      expect(get("editor-content-form").hidden).toBe(false);
      expect(get("editor-custom-blocks").parentElement.hidden).toBe(true);
      get("editor-tab-page").click();
      get("editor-custom-edit-content").click();
      expect(chooser.value).toBe(b.id);
      expect(get("editor-tab-content").getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(chooser);
      const title = get("editor-custom-title");
      title.value = "Renamed B"; title.dispatchEvent(new Event("input", { bubbles: true }));
      expect(chooser.value).toBe(b.id);
      expect(chooser.selectedOptions[0].textContent).toContain("Renamed B");
      choose("site"); expect(chooser.value).toBe(b.id);
      get("editor-custom-discard").click();
      choose("site"); expect(chooser.value).toBe("site");
      app.store.setState({ contentDirty: true });
      choose(a.id); expect(chooser.value).toBe("site");
      expect(get("editor-custom-create").disabled).toBe(true);
      expect(get("editor-custom-save").classList.contains("editor-btn-primary")).toBe(true);
      expect(get("editor-custom-blocks").querySelector('[aria-label="Remover bloco"]').classList.contains("editor-btn-danger")).toBe(true);
    } finally { app.destroy(); }
  });

  it("creates two instances, edits all block types, saves and discards through the page owner", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const service = createMemoryCompositionService(legacy);
    const app = initEditorApp({ compositionService: service });
    const get = (id) => document.getElementById(id);
    const input = (element, value) => { element.value = value; element.dispatchEvent(new Event("input", { bubbles: true })); };
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", path: "C:/fixture" } });
      input(get("editor-custom-new-title"), "Disposable");
      get("editor-custom-create").click();
      get("editor-custom-discard").click();
      expect(app.store.getState().draftComposition.schemaVersion).toBeUndefined();
      for (const name of ["Custom A", "Custom B"]) {
        get("editor-tab-page").click();
        input(get("editor-custom-new-title"), name);
        get("editor-custom-create").click();
        expect(get("editor-tab-content").getAttribute("aria-selected")).toBe("true");
        expect(document.activeElement).toBe(get("editor-content-dataset"));
        expect(get("editor-tabpanel-content").firstElementChild.contains(get("editor-custom-add-block"))).toBe(true);
        expect(get("editor-custom-current-title").textContent).toContain(name);
        if (name === "Custom A") {
          expect(service.getSavedComposition().schemaVersion).toBeUndefined();
          expect(get("editor-custom-create").disabled).toBe(true);
          get("editor-custom-save").click();
          await vi.waitFor(() => expect(app.store.getState().compositionDirty).toBe(false));
        }
      }
      expect(custom(app.store.getState().draftComposition)).toHaveLength(2);
      expect(custom(service.getSavedComposition())).toHaveLength(1);
      const id = get("editor-content-dataset").value;
      for (const block of blocks) {
        get("editor-custom-block-type").value = block.type;
        get("editor-custom-add-block").click();
        expect(get("editor-custom-save").disabled).toBe(true);
        const row = get("editor-custom-blocks").lastElementChild;
        const fields = row.querySelectorAll("input:not([type=checkbox]),textarea");
        if (block.type === "list") input(fields[0], block.items.join("\n"));
        else if (block.type === "link" || block.type === "button") { input(fields[0], block.label); input(fields[1], block.url); }
        else input(fields[0], block.text);
      }
      expect(get("editor-custom-save").disabled).toBe(false);
      get("editor-custom-blocks").lastElementChild.querySelector('[aria-label="Subir bloco"]').click();
      get("editor-custom-blocks").lastElementChild.querySelector('[aria-label="Remover bloco"]').click();
      expect(custom(app.store.getState().draftComposition).find((entry) => entry.id === id).content.blocks).toHaveLength(4);
      app.store.setState({ contentDirty: true });
      get("editor-custom-save").click();
      await vi.waitFor(() => expect(app.store.getState().compositionDirty).toBe(false));
      expect(app.store.getState().contentDirty).toBe(true);
      expect(custom(await service.loadComposition())).toHaveLength(2);
      input(get("editor-custom-title"), "Renamed");
      expect(get("editor-content-dataset").value).toBe(id);
      get("editor-custom-discard").click();
      expect(app.store.getState().draftComposition).toEqual(await service.loadComposition());
      expect(app.store.getState().contentDirty).toBe(true);
      const baseline = app.store.getState().loadedComposition;
      input(get("editor-custom-title"), "Keep failed draft");
      const draft = app.store.getState().draftComposition;
      vi.spyOn(service, "saveComposition").mockResolvedValueOnce({ ok: false, code: "COMPOSITION_VERIFY_MISMATCH", message: "Verification failed" });
      get("editor-custom-save").click();
      await vi.waitFor(() => expect(app.store.getState().compositionSaving).toBe(false));
      expect(app.store.getState().draftComposition).toBe(draft);
      expect(app.store.getState().loadedComposition).toBe(baseline);
      expect(app.store.getState().compositionDirty).toBe(true);
    } finally { app.destroy(); }
  });

  it("edits independent instances and refreshes preview from draft changes without a preview click", async () => {
    document.body.innerHTML = '<div id="editor-root"></div>';
    const initial = two();
    const service = createMemoryCompositionService(initial);
    const app = initEditorApp({ compositionService: service });
    const get = (id) => document.getElementById(id);
    try {
      await app.ready;
      app.store.setState({ openedProject: { status: "valid", source: "local", path: "C:/fixture" } });
      const [a, b] = custom(app.store.getState().draftComposition);
      const preview = get("editor-composition-preview");
      const ids = () => [...preview.querySelectorAll('[data-page-section="custom"]')].map((node) => node.id);
      await vi.waitFor(() => expect(ids()).toEqual([a.id, b.id]));
      get("editor-content-dataset").value = b.id;
      get("editor-content-dataset").dispatchEvent(new Event("change"));
      const textarea = get("editor-custom-blocks").querySelector("textarea");
      textarea.value = "Independent B draft";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(preview.querySelector(`[id="${b.id}"]`).textContent).toContain("Independent B draft"));
      expect(custom(app.store.getState().draftComposition)[0].content).toEqual(a.content);
      const title = get("editor-custom-title");
      title.value = "Renamed B"; title.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(preview.querySelector(`[id="${b.id}-title"]`).textContent).toBe("Renamed B"));
      expect(get("editor-content-dataset").value).toBe(b.id);
      get("editor-tab-page").click();
      get("editor-custom-edit-content").click();
      expect(get("editor-tab-content").getAttribute("aria-selected")).toBe("true");
      // Rapid state updates must leave the newest order/content visible.
      app.store.setState({ draftComposition: moveSection(moveSection(app.store.getState().draftComposition, b.id, "up"), b.id, "up") });
      app.store.setState({ draftComposition: removeSection(app.store.getState().draftComposition, a.id) });
      await vi.waitFor(() => expect(ids()).toEqual([b.id]));
      app.store.setState({ draftComposition: enableCustomSection(app.store.getState().draftComposition, a.id, { afterSectionId: b.id }) });
      await vi.waitFor(() => expect(ids()).toEqual([b.id, a.id]));
      const invalid = updateCustomSection(app.store.getState().draftComposition, b.id, { title: "" });
      app.store.setState({ draftComposition: invalid });
      await vi.waitFor(() => expect(preview.querySelectorAll('[data-page-section="custom"]')).toHaveLength(0));
      expect(preview.textContent).toContain("campos inválidos");
      get("editor-custom-discard").click();
      await vi.waitFor(() => expect(ids()).toEqual([a.id, b.id]));
      expect(service.getSavedComposition()).toEqual(initial);
    } finally { app.destroy(); }
  });
});

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createContentEditor } from "../../src/js/editor/content-editor.js";
import { createEditorStore } from "../../src/js/editor/state.js";
import { renderCompositionPreview } from "../../src/js/editor/composition-preview.js";
const require = createRequire(import.meta.url);
const { readContentDataset, saveContentRecord } = require("../../desktop/content-store.cjs");
const URL = "https://www.instagram.com/provaleinterinstitucional/";
const SCRIPT = "https://www.instagram.com/embed.js";
const snippet = `<blockquote class="instagram-media" data-instgrm-permalink="${URL}" data-instgrm-version="14"><a href="${URL}?utm_source=ig_embed&amp;utm_campaign=loading">PROVALE</a></blockquote><script async src="${SCRIPT}"></script>`;
let normalize, normalizeURL, ExtensaoSection;
const data = () => ({ projects: [{ id: "provale", title: "PROVALE", projectType: "Projeto", minibio: "Preservada", instagram: { enabled: true, source: URL, provider: "instagram" } }] });
beforeEach(async () => {
  vi.resetModules();
  ({ normalizeInstagramInput: normalize, normalizeInstagramURL: normalizeURL } = await import("../../src/js/sections/provale-instagram.js"));
  ({ ExtensaoSection } = await import("../../src/js/sections/extensao.js"));
  document.body.innerHTML = '<div id="extensao-content"></div>';
});
afterEach(() => {
  document.querySelectorAll(`script[src="${SCRIPT}"]`).forEach((node) => node.remove());
  delete window.instgrm;
  delete window.labfonDesktopHost;
  vi.useRealTimers();
});

describe("PROVALE-only input", () => {
  it.each([URL, "https://instagram.com/provaleinterinstitucional", `${URL}?utm_source=ig_embed`, " https://WWW.INSTAGRAM.COM/PROVALEINTERINSTITUCIONAL/ "])("normalizes %s", (input) => {
    expect(normalize(input)).toBe(URL);
  });
  it.each([
    "https://example.com/provaleinterinstitucional/", "https://www.instagram.com.evil.test/provaleinterinstitucional/",
    "http://www.instagram.com/provaleinterinstitucional/", "javascript:alert(1)", "not a URL",
    "https://user:pass@www.instagram.com/provaleinterinstitucional/", "https://www.instagram.com:444/provaleinterinstitucional/",
    "https://www.instagram.com/p/abc/", "https://www.instagram.com/other/", `${URL}embed/`, `${URL}#x`, `${URL}?next=https://evil.test`,
    `${URL} ${URL}`, `<iframe src="${URL}"></iframe>`, `${snippet}<script>alert(1)</script>`,
    snippet.replace(SCRIPT, "https://evil.test/script.js"), snippet.replace("<a href=", "<a onclick='alert(1)' href="),
    `${snippet}<a href="https://www.instagram.com/other/">Other</a>`, `${snippet}<img src=x onerror=alert(1)>`,
    `${snippet}<svg><foreignObject><iframe src="${URL}"></iframe></foreignObject></svg>`, `${snippet}${snippet}`,
  ])("rejects unsupported or unsafe input: %s", (input) => expect(normalize(input)).toBeNull());
  it("parses the official snippet inertly without storing or connecting markup", () => {
    expect(normalize(snippet)).toBe(URL);
    expect(normalizeURL(snippet)).toBeNull();
    expect(document.querySelector("script, blockquote, iframe")).toBeNull();
  });
});

describe("controlled rendering", () => {
  it("loads once and processes connected replacements without blocking render", async () => {
    vi.useFakeTimers();
    const section = new ExtensaoSection("extensao-content", { allowInstagram: true });
    await section.render(data());
    const script = document.querySelector(`script[src="${SCRIPT}"]`);
    expect(script).not.toBeNull();
    expect(section.isRendering).toBe(false);
    const id = document.querySelector(".extension-instagram-feed").getAttribute("aria-labelledby");
    await section.render(data());
    const process = vi.fn();
    window.instgrm = { Embeds: { process } };
    script.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(process).toHaveBeenCalledTimes(1);
    await section.render(data());
    expect(document.querySelectorAll(`script[src="${SCRIPT}"]`)).toHaveLength(1);
    expect(process).toHaveBeenCalledTimes(2);
    expect(document.querySelector(".extension-instagram-feed").getAttribute("aria-labelledby")).toBe(id);
    expect(document.querySelector("blockquote").dataset.instgrmPermalink).toBe(URL);
    expect(document.querySelector(".extension-instagram-feed > a").href).toBe(URL);
  });
  it.each(["error", "timeout", "process-throws"])("retains a usable link and presentation on %s", async (failure) => {
    vi.useFakeTimers();
    await new ExtensaoSection("extensao-content", { allowInstagram: true }).render(data());
    const script = document.querySelector(`script[src="${SCRIPT}"]`);
    if (failure === "timeout") await vi.advanceTimersByTimeAsync(8000);
    else {
      if (failure === "process-throws") window.instgrm = { Embeds: { process: () => { throw new Error("provider"); } } };
      script.dispatchEvent(new Event(failure === "error" ? "error" : "load"));
      await Promise.resolve();
    }
    expect(document.querySelector(".extension-instagram-embed")).toBeNull();
    expect(document.querySelector(".extension-instagram-feed > a").href).toBe(URL);
    expect(document.querySelector(".extension-project-minibio").textContent).toBe("Preservada");
    expect(document.querySelector(".loading-spinner")).toBeNull();
  });
  it("assigns unique stable region headings and never executes disabled/unsupported sources", async () => {
    const fixture = data();
    fixture.projects[0].instagram.enabled = false;
    fixture.projects.push({ ...fixture.projects[0], id: "second", instagram: { enabled: true, source: snippet, provider: "instagram" } });
    await new ExtensaoSection("extensao-content", { allowInstagram: true }).render(fixture);
    expect(new Set([...document.querySelectorAll(".extension-instagram-feed h4")].map((h) => h.id)).size).toBe(2);
    expect(document.querySelector("script, blockquote, iframe")).toBeNull();
    expect(document.querySelectorAll(".extension-instagram-feed > a")).toHaveLength(2);
  });
  it("keeps default and privileged contexts inert, even with explicit opt-in", async () => {
    await new ExtensaoSection("extensao-content").render(data());
    expect(document.querySelector("script, blockquote")).toBeNull();
    window.labfonDesktopHost = { saveContentRecord: vi.fn() };
    await new ExtensaoSection("extensao-content", { allowInstagram: true }).render(data());
    expect(document.querySelector("script, blockquote")).toBeNull();
    expect(window.labfonDesktopHost.saveContentRecord).not.toHaveBeenCalled();
  });
  it("keeps actual composition preview link-only", async () => {
    const composition = JSON.parse(await fs.readFile("content/page.json", "utf8"));
    composition.sections.forEach((section) => { section.enabled = section.type === "extension"; });
    await renderCompositionPreview({ container: document.querySelector("#extensao-content"), composition, previewData: { site: { extensao: data() } } });
    expect(document.querySelector("script, blockquote, iframe")).toBeNull();
    expect(document.querySelector(".extension-instagram-feed > a").href).toBe(URL);
  });
});

it("saves normalized data through the existing focused form, discards, and reopens", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-instagram-content-"));
  let editor;
  try {
    await fs.mkdir(path.join(root, "content"));
    const original = data();
    original.projects[0].instagram = { enabled: false, source: null, provider: null };
    original.projects.push({ id: "untouched", projectType: "Projeto", title: "Outro", minibio: "Outro" });
    await fs.writeFile(path.join(root, "content/extensao.json"), JSON.stringify(original));
    const host = {
      readContentDataset: (_dir, key) => readContentDataset(null, root, key),
      saveContentRecord: (_dir, key, name, previous, next) => saveContentRecord(null, root, key, name, previous, next),
    };
    const mount = async () => {
      const store = createEditorStore();
      editor = createContentEditor({ host, store });
      document.body.replaceChildren(editor.element);
      document.querySelector("#editor-content-dataset").value = "extensao";
      store.setState({ openedProject: { path: root, status: "valid" }, editorSiteModel: { extensao: structuredClone(original) } });
      await vi.waitFor(() => expect(document.querySelector('[data-focus-key="root.projects.0:group"]')).not.toBeNull());
      const select = document.querySelector('[data-focus-key="root.projects.0:group"]');
      select.value = "instagram"; select.dispatchEvent(new Event("change"));
      return store;
    };
    const store = await mount();
    const edit = (input) => {
      const source = document.querySelector("#editor-instagram-source");
      source.value = input; source.dispatchEvent(new Event("input"));
    };
    const enable = () => { const checkbox = document.querySelector("#editor-instagram-enabled"); checkbox.checked = true; checkbox.dispatchEvent(new Event("input")); };
    edit(`${snippet}<script>alert(1)</script>`);
    expect(document.querySelector("#editor-content-save").disabled).toBe(true);
    expect(store.getState().editorSiteModel.extensao).toEqual(original);
    document.querySelector("#editor-content-cancel").click();
    enable(); edit(snippet);
    expect(store.getState().contentDirty).toBe(true);
    expect(store.getState().editorSiteModel.extensao.projects[0].instagram).toEqual({ enabled: true, source: URL, provider: "instagram" });
    expect((await readContentDataset(null, root, "extensao"))[0].value).toEqual(original);
    document.querySelector("#editor-content-cancel").click();
    expect(store.getState().editorSiteModel.extensao).toEqual(original);
    expect(document.querySelector("#editor-instagram-source").value).toBe("");
    enable(); edit(snippet);
    document.querySelector("#editor-content-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(store.getState().contentDirty).toBe(false));
    const saved = (await readContentDataset(null, root, "extensao"))[0].value;
    expect(saved).toEqual({ ...original, projects: [{ ...original.projects[0], instagram: { enabled: true, source: URL, provider: "instagram" } }, original.projects[1]] });
    expect(JSON.stringify(saved)).not.toMatch(/<|script/);
    editor.destroy();
    await mount();
    expect(document.querySelector("#editor-instagram-enabled").checked).toBe(true);
    expect(document.querySelector("#editor-instagram-source").value).toBe(URL);
  } finally { editor?.destroy(); await fs.rm(root, { recursive: true, force: true }); }
});

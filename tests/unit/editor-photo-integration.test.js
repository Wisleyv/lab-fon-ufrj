import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { initEditorApp } from "../../src/js/editor/bootstrap.js";
import { createMemoryCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import { TEAM_PLACEHOLDER_URL, isCustomTeamPhoto } from "../../src/js/sections/team-photo.js";

const { readContentDataset, saveContentRecord } = createRequire(import.meta.url)("../../desktop/content-store.cjs");
const roots = [];
const get = (id) => document.getElementById(id);
const image = () => document.querySelector(".editor-image-field img");
const choose = () => document.querySelector('[data-focus-key="photo"]');
const remove = () => document.querySelector('[data-focus-key="remove-photo"]');
const managed = "assets/images/image-00000000-0000-4000-8000-000000000001.png";
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function fixture(foto = "assets/images/custom.png") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-photo-app-")); roots.push(root);
  for (const folder of ["content/equipe", "public/assets/images", "scripts"]) await fs.mkdir(path.join(root, folder), { recursive: true });
  const page = { kind: "single-page", sections: [{ id: "pesquisadores", type: "equipe", enabled: true, order: 1 }] };
  const first = { nome: "First", instituicao: "UFRJ", categoria: "docentes", foto };
  const other = { nome: "Other", instituicao: "UFRJ", foto: "assets/images/avatar.webp" };
  for (const [name, value] of Object.entries({ "package.json": {}, "content/page.json": page, "content/site.json": {}, "content/equipe/first.json": first, "content/equipe/other.json": other })) {
    await fs.writeFile(path.join(root, name), JSON.stringify(value));
  }
  await fs.writeFile(path.join(root, "scripts/build-data.js"), "");
  await fs.writeFile(path.join(root, "public/assets/images/custom.png"), "original binary");
  const host = createMemoryDesktopHost({}, { directory: { path: root } });
  host.pathExists = (_dir, name) => fs.stat(path.join(root, name)).then(() => true, () => false);
  host.readJson = async (_dir, name) => JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
  host.readJsonFiles = async (_dir, folder) => {
    const files = await fs.readdir(path.join(root, folder)).catch(() => []);
    return Promise.all(files.filter((f) => f.endsWith(".json")).map((f) => host.readJson(null, `${folder}/${f}`)));
  };
  host.readContentDataset = vi.fn((directory, dataset) => readContentDataset(null, directory.path, dataset));
  host.saveContentRecord = vi.fn((_dir, ...args) => saveContentRecord(null, root, ...args));
  host.readProjectImage = async () => ({ ok: true, previewUrl: "data:image/png;base64,iVBORw0KGgo=" });
  host.selectProjectImage = vi.fn(async () => {
    await fs.writeFile(path.join(root, "public", managed), "replacement binary");
    return { ok: true, path: managed, previewUrl: "data:image/png;base64,iVBORw0KGgo=" };
  });
  host.closeProject = vi.fn(async () => ({ ok: true }));
  document.body.innerHTML = '<div id="editor-root"></div>';
  const app = initEditorApp({ desktopHost: host, compositionService: createMemoryCompositionService(), storageRef: null });
  await app.ready;
  get("editor-content-dataset").value = "equipe";
  const open = async () => {
    get("editor-tab-project").click();
    get("editor-project-advanced").open = true;
    get("editor-open-project").click();
    await vi.waitFor(() => expect(app.store.getState().openedProject?.status).toBe("valid"));
    await vi.waitFor(() => expect(app.store.getState().contentLoading || app.store.getState().projectOpening).toBeFalsy());
    get("editor-tab-content").click();
  };
  await open();
  const read = () => host.readJson(null, "content/equipe/first.json");
  const save = async () => {
    get("editor-content-save").click();
    await vi.waitFor(() => expect(app.store.getState().contentSaving).toBe(false));
    expect(app.store.getState().contentDirty).toBe(false);
  };
  return { app, host, root, first, other, open, read, save };
}

describe("complete editor photo lifecycle", () => {
  it.each([
    [undefined, false], ["", false], ["assets/images/avatar.webp", false],
    ["/assets/images/avatar.webp", false], ["assets/images/team-placeholder.svg", false],
    ["assets/images/placeholder-avatar.jpg", false], [managed, true],
    ["assets/images/legacy-portrait.webp", true], ["/assets/images/avatar-custom.webp", true],
  ])("classifies photo %s without member-specific exceptions", async (foto, custom) => {
    const { app } = await fixture(foto === undefined ? "" : foto);
    try {
      expect(isCustomTeamPhoto(foto)).toBe(custom);
      expect(remove().hidden).toBe(!custom);
      expect(app.store.getState().contentDirty).toBe(false);
    } finally { app.destroy(); }
  });
  it("uses the visible content save for dirty photo drafts, canonical JSON and close/reopen", async () => {
    const { app, host, root, first, other, open, read, save } = await fixture("assets/images/avatar.webp");
    try {
      const sourceFile = path.join(await fs.realpath(root), "content/equipe", get("editor-content-record").value);
      expect(app.store.getState().openedProject.path).toBe(root);
      expect(get("editor-content-dataset").value).toBe("equipe");
      expect((await read()).foto).toBe("assets/images/avatar.webp");
      const saveButton = get("editor-content-save");
      expect(saveButton.closest("[hidden]")).toBeNull();
      expect(saveButton.disabled).toBe(true);
      expect(get("editor-content-cancel").closest("[hidden]")).toBeNull();
      expect(saveButton.compareDocumentPosition(choose()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const composition = app.store.getState().draftComposition;
      choose().click();
      await vi.waitFor(() => expect(app.store.getState().imageSelecting).toBe(false));
      expect(app.store.getState().contentDirty).toBe(true);
      expect(get("editor-session-changes").textContent).toBe("não salvas");
      expect(app.store.getState().editorSiteModel.equipe.find((m) => m.nome === first.nome).foto).toBe(managed);
      expect(saveButton.disabled).toBe(false);
      expect(get("editor-content-record").value).toBe("first.json");
      expect(await read()).toEqual(first);
      expect(host.saveContentRecord).not.toHaveBeenCalled();
      await save();
      expect(host.saveContentRecord).toHaveBeenCalledWith(expect.objectContaining({ path: root }), "equipe", "first.json", first, { ...first, foto: managed });
      const savedResult = await host.saveContentRecord.mock.results[0].value;
      expect(savedResult.path).toBe(sourceFile);
      expect(JSON.parse(await fs.readFile(savedResult.path, "utf8")).foto).toBe(managed);
      expect((await read()).foto).toBe(managed);
      expect(get("editor-content-edit-status").textContent).toContain(path.join(root, "content/equipe/first.json"));
      expect(get("editor-session-changes").textContent).toBe("nenhuma não salva");
      expect(app.store.getState().draftComposition).toBe(composition);
      expect(app.store.getState().compositionDirty).toBe(false);
      expect(await host.readJson(null, "content/equipe/other.json")).toEqual(other);
      get("editor-tab-project").click(); get("editor-close-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject).toBeNull());
      expect(app.store.getState()).toMatchObject({ editorSiteModel: null, draftComposition: null, contentDirty: false, build: { status: "idle", previewUrl: null } });
      expect(document.querySelector(".editor-image-field")).toBeNull();
      expect(get("editor-content-record").options).toHaveLength(0);
      expect(await fs.readFile(path.join(root, "public", managed), "utf8")).toBe("replacement binary");
      await open();
      const reopenedFile = path.join(await fs.realpath(app.store.getState().openedProject.path), "content/equipe", get("editor-content-record").value);
      expect(reopenedFile).toBe(sourceFile);
      expect(host.readContentDataset).toHaveBeenLastCalledWith(expect.objectContaining({ path: root }), "equipe");
      expect(app.store.getState().editorSiteModel.equipe.find((member) => member.nome === first.nome).foto).toBe(managed);
      expect(document.querySelector(".editor-image-path").textContent).toBe(managed);
      console.info("Photo identity trace", JSON.stringify({ root, member: first.nome, initialPhoto: first.foto,
        sourceFile, saveFile: savedResult.path, reopenedFile, diskPhoto: (await read()).foto,
        editorPhoto: document.querySelector(".editor-image-path").textContent }));
    } finally { app.destroy(); }
  });

  it("removes only the reference, supports discard, persists empty foto and retains the old binary", async () => {
    const { app, root, first, read, save, open } = await fixture();
    try {
      expect(remove().hidden).toBe(false);
      remove().click();
      expect(image().getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
      expect(remove().hidden).toBe(true);
      expect(app.store.getState().contentDirty).toBe(true);
      expect(await read()).toEqual(first);
      get("editor-content-cancel").click();
      expect(document.querySelector(".editor-image-path").textContent).toBe(first.foto);
      expect(remove().hidden).toBe(false);
      remove().click(); await save();
      expect((await read()).foto).toBe("");
      get("editor-close-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject).toBeNull());
      await open();
      expect(image().getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
      expect(await fs.readFile(path.join(root, "public/assets/images/custom.png"), "utf8")).toBe("original binary");
    } finally { app.destroy(); }
  });

  it.each(["content", "composition"])("guards %s drafts: cancel keeps open and confirmed discard closes without saving", async (kind) => {
    const { app, host, first, read } = await fixture();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      if (kind === "content") remove().click();
      else app.store.setState({ compositionDirty: true });
      get("editor-close-project").click();
      expect(confirm).toHaveBeenCalledOnce();
      expect(app.store.getState().openedProject.status).toBe("valid");
      expect(host.closeProject).not.toHaveBeenCalled();
      confirm.mockReturnValue(true); get("editor-close-project").click();
      await vi.waitFor(() => expect(app.store.getState().openedProject).toBeNull());
      expect(await read()).toEqual(first);
      expect(host.saveContentRecord).not.toHaveBeenCalled();
    } finally { app.destroy(); }
  });

  it("keeps a failed save dirty and blocks closing while the picker is active", async () => {
    const { app, host, read, first } = await fixture();
    try {
      let finish;
      host.selectProjectImage.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
      choose().click();
      expect(get("editor-close-project").disabled).toBe(true);
      finish({ ok: true, path: managed });
      await vi.waitFor(() => expect(app.store.getState().imageSelecting).toBe(false));
      host.saveContentRecord.mockResolvedValue({ ok: false, message: "Read-back failed" });
      get("editor-content-save").click();
      await vi.waitFor(() => expect(app.store.getState().contentSaving).toBe(false));
      expect(app.store.getState().contentDirty).toBe(true);
      expect(await read()).toEqual(first);
      expect(get("editor-session-changes").textContent).toBe("não salvas");
    } finally { app.destroy(); }
  });

  it("preserves legacy placeholder references until explicit replacement", async () => {
    const { app, first, read } = await fixture("assets/images/avatar.webp");
    try {
      expect(remove().hidden).toBe(true);
      expect(await read()).toEqual(first);
      choose().click();
      await vi.waitFor(() => expect(app.store.getState().imageSelecting).toBe(false));
      expect(remove().hidden).toBe(false);
      get("editor-content-cancel").click();
      expect(remove().hidden).toBe(true);
      expect(await read()).toEqual(first);
    } finally { app.destroy(); }
  });
});

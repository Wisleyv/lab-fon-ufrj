import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { consolidateData } from "../../scripts/build-data.js";
import { PesquisadoresSection } from "../../src/js/sections/pesquisadores.js";
import { ParceriasSection } from "../../src/js/sections/parcerias.js";
import { JSONAdapter } from "../../src/js/adapters/JSONAdapter.js";
import { createNativeDesktopHost } from "../../src/js/editor/desktop-host.js";
import { TEAM_PLACEHOLDER_PATH, TEAM_PLACEHOLDER_URL } from "../../src/js/sections/team-photo.js";
const require = createRequire(import.meta.url);
const { createImageAssetService } = require("../../desktop/image-assets.cjs");
const { validateLocalEditableProject } = require("../../desktop/main.cjs");
const { saveContentRecord, readContentDataset } = require("../../desktop/content-store.cjs");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }); });
async function fixture(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-images-")); roots.push(root);
  for (const directory of ["scripts", "content/equipe", "content/linhas", "content/parcerias", "content/publicacoes"]) await fs.mkdir(path.join(root, directory), { recursive: true });
  for (const name of ["package.json", "package-lock.json", "content/site.json"]) await fs.writeFile(path.join(root, name), "{}");
  await fs.writeFile(path.join(root, "content/page.json"), JSON.stringify({ kind: "single-page", sections: [{ id: "pesquisadores", type: "equipe", enabled: true, order: 1 }] }));
  await fs.writeFile(path.join(root, "scripts/build-data.js"), "");
  const source = path.join(root, "Minha foto (teste).PNG"); await fs.writeFile(source, PNG);
  const event = { sender: {} };
  const dialog = { showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: [source] })) };
  const service = createImageAssetService({ dialog, validateProject: (root) => validateLocalEditableProject(root, { requireLockfile: false }), ...options });
  service.rememberProject(event, { ok: true, directory: { path: root } });
  return { root, source, event, dialog, service };
}

describe("restricted image asset service", () => {
  it("accepts locally editable projects without requiring the remote-source lockfile marker", async () => {
    const { root, event, service } = await fixture();
    await fs.unlink(path.join(root, "package-lock.json"));
    expect((await service.selectProjectImage(event, root)).ok).toBe(true);
    expect((await validateLocalEditableProject(root)).ok).toBe(false);
  });
  it("copies and previews PNG under the active project's existing public directory", async () => {
    const { root, source, event, dialog, service } = await fixture();
    const result = await service.selectProjectImage(event, root);
    expect(result.ok).toBe(true);
    expect(result.path).toMatch(/^assets\/images\/image-[a-f0-9-]{36}\.png$/);
    expect(JSON.stringify(result)).not.toContain(source);
    expect(await fs.readFile(path.join(root, "public", result.path))).toEqual(PNG);
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(expect.objectContaining({ properties: ["openFile", "dontAddToRecent"] }));
    expect(await service.readProjectImage(event, root, result.path.replaceAll("/", "\\"))).toEqual({ ok: true, previewUrl: result.previewUrl });
    expect(await service.readProjectImage(event, root, `/${result.path}`)).toEqual({ ok: true, previewUrl: result.previewUrl });
  });
  it.each(["jpg", "jpeg", "webp"])("accepts the %s signature and returns a portable path", async (extension) => {
    const { root, event, dialog, service } = await fixture();
    const source = path.join(root, `photo.${extension}`);
    const bytes = extension === "webp" ? Buffer.from("RIFF0000WEBPVP8 ") : Buffer.from([255, 216, 255, ...Array(12).fill(0)]);
    await fs.writeFile(source, bytes);
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [source] });
    const result = await service.selectProjectImage(event, root);
    expect(result.ok).toBe(true);
    expect(result.path.endsWith(extension === "webp" ? ".webp" : ".jpg")).toBe(true);
  });
  it("cancels without creating assets or changing content", async () => {
    const { root, event, dialog, service } = await fixture();
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await service.selectProjectImage(event, root)).toEqual({ ok: false, cancelled: true });
    await expect(fs.access(path.join(root, "public"))).rejects.toThrow();
    expect(await fs.readFile(path.join(root, "content/site.json"), "utf8")).toBe("{}");
  });
  it.each(["unsupported", "signature", "oversize"])("rejects %s files without copies", async (kind) => {
    const { root, event, dialog, service } = await fixture();
    const source = path.join(root, kind === "unsupported" ? "bad.svg" : "bad.jpg");
    await fs.writeFile(source, kind === "signature" ? PNG : Buffer.alloc(30));
    if (kind === "oversize") await fs.truncate(source, 20 * 1024 * 1024 + 1);
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [source] });
    const result = await service.selectProjectImage(event, root);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Formato|corresponde|20 MB/);
    await expect(fs.access(path.join(root, "public"))).rejects.toThrow();
  });
  it("retries a filename collision without overwriting an existing asset", async () => {
    const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
    const { root, event, service } = await fixture({ createId: vi.fn().mockReturnValueOnce(ids[0]).mockReturnValueOnce(ids[1]) });
    const folder = path.join(root, "public/assets/images"); await fs.mkdir(folder, { recursive: true });
    const old = path.join(folder, `image-${ids[0]}.png`); await fs.writeFile(old, "Shared old asset");
    const result = await service.selectProjectImage(event, root);
    expect(result.path).toContain(ids[1]);
    expect(await fs.readFile(old, "utf8")).toBe("Shared old asset");
  });
  it("rejects unapproved roots and senders before opening the dialog", async () => {
    const { root, event, dialog, service } = await fixture();
    expect((await service.selectProjectImage({ sender: {} }, root)).ok).toBe(false);
    expect((await service.selectProjectImage(event, path.dirname(root))).ok).toBe(false);
    expect(dialog.showOpenDialog).not.toHaveBeenCalled();
  });
  it("does not copy after the active project changes while the dialog is open", async () => {
    const { root, source, event, dialog, service } = await fixture();
    dialog.showOpenDialog.mockImplementation(async () => {
      service.rememberProject(event, { ok: true, directory: { path: path.dirname(root) } });
      return { canceled: false, filePaths: [source] };
    });
    expect((await service.selectProjectImage(event, root)).ok).toBe(false);
    await expect(fs.access(path.join(root, "public"))).rejects.toThrow();
  });
  it("refuses junctions outside the project's assets", async () => {
    const { root, event, service } = await fixture();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-outside-images-")); roots.push(outside);
    await fs.mkdir(path.join(root, "public"));
    await fs.symlink(outside, path.join(root, "public/assets"), "junction");
    expect((await service.selectProjectImage(event, root)).ok).toBe(false);
    expect(await fs.readdir(outside)).toEqual([]);
  });
  it.each(["assets/images/../../package.json", "assets/images/%2e%2e/secret.png", "C:\\private\\photo.png", "//server/share/photo.png", "assets/images/missing.png"])("refuses unsafe or missing preview %s", async (value) => {
    const { root, event, service } = await fixture();
    expect((await service.readProjectImage(event, root, value)).ok).toBe(false);
  });
  it("preserves external image references without fetching them in main", async () => {
    const { root, event, service } = await fixture();
    expect(await service.readProjectImage(event, root, "https://example.org/photo.jpg")).toEqual({ ok: true, previewUrl: "https://example.org/photo.jpg" });
    expect((await service.readProjectImage(event, root, "https://user:secret@example.org/photo.jpg")).ok).toBe(false);
  });
  it("persists a managed reference through canonical read-back, build-data and Vite public-asset copy", async () => {
    const { root, event, service } = await fixture();
    const result = await service.selectProjectImage(event, root);
    const member = { nome: "Example", instituicao: "UFRJ", categoria: "docentes", foto: result.path };
    await saveContentRecord(null, root, "equipe", "member.json", null, member);
    expect((await readContentDataset(null, root, "equipe"))[0].value).toEqual(member);
    await saveContentRecord(null, root, "equipe", "no-photo.json", null, { nome: "No photo", foto: "" });
    await saveContentRecord(null, root, "parcerias", "partner.json", null, { nome: "Partner", tipo: "instituicao", logo: result.path });
    await saveContentRecord(null, root, "parcerias", "text-only.json", null, { nome: "Text only", tipo: "instituicao" });
    await fs.copyFile(path.join("public", TEAM_PLACEHOLDER_PATH), path.join(root, "public", TEAM_PLACEHOLDER_PATH));
    const data = consolidateData({ contentDir: path.join(root, "content"), outputFile: path.join(root, "public/data.json") });
    expect(data.equipe.find((entry) => entry.nome === member.nome).foto).toBe(result.path);
    await fs.writeFile(path.join(root, "index.html"), '<html><body><div id="team"></div></body></html>');
    await promisify(execFile)(process.execPath, [path.resolve("node_modules/vite/bin/vite.js"), "build", root, "--logLevel", "silent"], { cwd: root });
    expect(await fs.readFile(path.join(root, "dist", result.path))).toEqual(PNG);
    expect(await fs.readFile(path.join(root, "dist", TEAM_PLACEHOLDER_PATH), "utf8")).toBe(await fs.readFile(path.join("public", TEAM_PLACEHOLDER_PATH), "utf8"));
    const output = JSON.parse(await fs.readFile(path.join(root, "dist/data.json"), "utf8"));
    const normalized = new JSONAdapter("./data.json").normalize(output);
    const partner = normalized.parcerias.find((record) => record.nome === "Partner");
    expect(partner.logo).toBe(result.path);
    const partnerRenderer = new ParceriasSection("unused");
    expect(partnerRenderer.createPartnerCard(partner).querySelector("img").getAttribute("src")).toBe(result.path);
    expect(partnerRenderer.createPartnerCard(normalized.parcerias.find((record) => record.nome === "Text only")).querySelector("img")).toBeNull();
    document.body.innerHTML = '<div id="team"></div>';
    const renderer = new PesquisadoresSection("team");
    document.getElementById("team").append(renderer.template(output.equipe));
    expect(document.querySelector("#team img").getAttribute("src")).toBe(result.path);
    expect(document.querySelector("#team img").alt).toBe("Foto de Example");
    expect(document.querySelectorAll("#team .membro-foto img")[1].getAttribute("src")).toBe(TEAM_PLACEHOLDER_URL);
    expect(JSON.stringify(output)).not.toContain(root);
  });
});

it("exposes only approved image operations through preload and the native host adapter", async () => {
  let bridge;
  const invoke = vi.fn(async () => ({ ok: true }));
  vm.runInNewContext(await fs.readFile("desktop/preload.cjs", "utf8"), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } }, ipcRenderer: { invoke } }),
  });
  const host = createNativeDesktopHost(bridge);
  await host.selectProjectImage({ path: "project" });
  expect(invoke).toHaveBeenLastCalledWith("labfon:selectProjectImage", "project");
  await host.readProjectImage({ path: "project" }, "assets/images/photo.png");
  expect(invoke).toHaveBeenLastCalledWith("labfon:readProjectImage", "project", "assets/images/photo.png");
  expect(bridge.copyFile).toBeUndefined();
  await host.closeProject();
  expect(invoke).toHaveBeenLastCalledWith("labfon:closeProject");
});

it("wires native project selection to the sender-scoped image handlers", async () => {
  const { root, source, event, dialog } = await fixture();
  dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [root] });
  const handlers = new Map();
  const electron = {
    dialog, ipcMain: { handle: (name, fn) => handlers.set(name, fn) },
    app: { whenReady: () => Promise.resolve(), on() {} },
    BrowserWindow: function () { return { webContents: { on() {} }, loadURL() {} }; },
  };
  const entry = path.resolve("desktop/main.cjs");
  const nativeRequire = createRequire(entry);
  const mockRequire = (name) => name === "electron" ? electron : nativeRequire(name);
  mockRequire.main = {};
  vm.runInNewContext(await fs.readFile(entry, "utf8"), {
    require: mockRequire, module: { exports: {} }, __dirname: path.dirname(entry),
    process: { env: { LABFON_EDITOR_DEV: "true" }, versions: { electron: "44" }, type: "browser", platform: "win32" },
  });
  await Promise.resolve();
  const opened = await handlers.get("labfon:openProjectDirectory")(event);
  expect(opened.directory.path).toBe(root);
  const image = await handlers.get("labfon:selectProjectImage")(event, root);
  expect(image.ok).toBe(true);
  expect(image.path).not.toContain(source);
  expect((await handlers.get("labfon:readProjectImage")(event, root, image.path)).previewUrl).toBe(image.previewUrl);
  expect((await handlers.get("labfon:closeProject")(event)).ok).toBe(true);
  expect((await handlers.get("labfon:readProjectImage")(event, root, image.path)).ok).toBe(false);
  expect((await handlers.get("labfon:selectProjectImage")(event, root)).ok).toBe(false);
  expect(await fs.readFile(path.join(root, "public", image.path))).toEqual(PNG);
});

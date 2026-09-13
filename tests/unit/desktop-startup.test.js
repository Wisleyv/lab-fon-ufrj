import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

const entry = path.resolve("desktop/main.cjs");
const nativeRequire = createRequire(entry);

async function loadEntry(electronProcess, development = true) {
  const loadURL = vi.fn();
  const loadFile = vi.fn();
  const electron = {
    app: { whenReady: vi.fn(() => Promise.resolve()), on: vi.fn() },
    ipcMain: { handle: vi.fn() },
    BrowserWindow: vi.fn(function () { return { loadURL, loadFile }; }),
  };
  const require = vi.fn((name) => name === "electron" ? electron : nativeRequire(name));
  // Electron's development launcher imports the CJS entry, rather than making it require.main.
  require.main = {};
  vm.runInNewContext(readFileSync(entry, "utf8"), {
    require, module: { exports: {} }, __dirname: path.dirname(entry),
    process: { env: { LABFON_EDITOR_DEV: String(development) },
      versions: electronProcess ? { electron: "44.0.0" } : {},
      type: electronProcess ? "browser" : undefined, platform: "win32" },
  });
  await Promise.resolve();
  return { electron, loadURL, loadFile, require };
}

describe("desktop entry startup", () => {
  it("starts the imported Electron entry at Vite's editor base path", async () => {
    const result = await loadEntry(true);
    expect(result.electron.BrowserWindow).toHaveBeenCalledOnce();
    expect(result.electron.ipcMain.handle).toHaveBeenCalledWith("labfon:openProjectDirectory", expect.any(Function));
    expect(result.loadURL).toHaveBeenCalledWith("http://127.0.0.1:3000/labfonac/editor.html");
    expect(result.loadFile).not.toHaveBeenCalled();
  });

  it("keeps Node imports inert for native-handler tests", async () => {
    const result = await loadEntry(false);
    expect(result.require).not.toHaveBeenCalledWith("electron");
    expect(result.electron.BrowserWindow).not.toHaveBeenCalled();
  });

  it("preserves the packaged local editor entry", async () => {
    const result = await loadEntry(true, false);
    expect(result.loadURL).not.toHaveBeenCalled();
    expect(result.loadFile).toHaveBeenCalledWith(path.join(path.dirname(entry), "..", "dist", "editor.html"));
  });
});

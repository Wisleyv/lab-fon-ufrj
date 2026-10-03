import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { runPortableBuild } = require("../../desktop/portable-build.cjs");
const { createWindow } = require("../../desktop/main.cjs");
const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }); });

async function project({ lock = true, installed = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-build-preparation-"));
  roots.push(root);
  await fs.writeFile(path.join(root, "vite.config.js"), "legacy config preserved");
  if (lock) await fs.writeFile(path.join(root, "package-lock.json"), "{}");
  if (installed) await installVite(root);
  return root;
}
async function installVite(root) {
  await fs.mkdir(path.join(root, "node_modules", "vite"), { recursive: true });
  await fs.writeFile(path.join(root, "node_modules", "vite", "package.json"), "{}");
}

describe("portable build preparation", () => {
  it("prepares local dependencies before build despite inherited Vite availability", async () => {
    const root = await project();
    const calls = [];
    const result = await runPortableBuild(root, async (command, args, cwd) => {
      calls.push({ command, args, cwd });
      if (args[0] === "ci") await installVite(root);
      return { ok: true, output: args[0] === "ci" ? "installed\n" : "built\n" };
    });
    expect(result.ok).toBe(true);
    expect(calls).toEqual([
      { command: "npm", args: ["ci"], cwd: root },
      { command: "npm", args: ["run", "build", "--", "--config", "node_modules/.labfon-build/vite.config.mjs"], cwd: root },
    ]);
    expect(result.output).toBe("installed\nbuilt\n");
    expect(await fs.readFile(path.join(root, "vite.config.js"), "utf8")).toBe("legacy config preserved");
  });
  it("does not reinstall dependencies that exist locally", async () => {
    const root = await project({ installed: true });
    const calls = [];
    await runPortableBuild(root, async (_command, args) => { calls.push(args); return { ok: true }; });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("run");
  });
  it("blocks before running any command if the required lockfile is missing", async () => {
    const root = await project({ lock: false });
    let called = false;
    const result = await runPortableBuild(root, async () => { called = true; });
    expect(result.code).toBe("BUILD_DEPENDENCIES_UNAVAILABLE");
    expect(called).toBe(false);
  });
  it("blocks build when installation fails", async () => {
    const root = await project();
    const calls = [];
    const result = await runPortableBuild(root, async (_command, args) => { calls.push(args); return { ok: false, output: "offline" }; });
    expect(result.code).toBe("BUILD_DEPENDENCIES_FAILED");
    expect(result.output).toBe("offline");
    expect(calls).toEqual([["ci"]]);
  });
  it("blocks build if successful installation did not supply Vite", async () => {
    const root = await project();
    const calls = [];
    const result = await runPortableBuild(root, async (_command, args) => { calls.push(args); return { ok: true }; });
    expect(result.code).toBe("BUILD_DEPENDENCIES_UNAVAILABLE");
    expect(calls).toEqual([["ci"]]);
  });
  it("preserves real build failures rather than retrying arbitrary errors", async () => {
    const root = await project({ installed: true });
    const result = await runPortableBuild(root, async () => ({ ok: false, exitCode: 1, output: "invalid content" }));
    expect(result).toMatchObject({ ok: false, exitCode: 1, output: "invalid content" });
  });
  it("assigns the existing shipped icon to the native window", async () => {
    let options;
    class Window {
      constructor(value) { options = value; this.webContents = { on() {} }; }
      loadURL() {}
      loadFile() {}
    }
    createWindow({ BrowserWindow: Window });
    await expect(fs.access(options.icon)).resolves.toBeUndefined();
    expect(options.icon).toBe(path.join(process.cwd(), "build", "icon.ico"));
    const metadata = JSON.parse(await fs.readFile("package.json", "utf8"));
    expect(metadata.build.files).toContain("build/icon.ico");
  });
});

import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { inspectMediaReferences, selectReferencedMedia } = require("../../desktop/media-references.cjs");
const native = require("../../desktop/main.cjs");

async function fixture(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "labfon-media-"));
  const write = async (name, value) => {
    const target = path.join(root, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, typeof value === "object" ? JSON.stringify(value) : value);
  };
  for (const [name, value] of Object.entries({
    "content/page.json": { sections: [{ enabled: false, image: "assets/images/inactive.png" }] },
    "content/site.json": { logo: "assets/images/shared.png" },
    "content/equipe/member.json": { foto: "assets/images/shared.png" },
    "src/js/main.js": 'const fallback = "/labfonac/assets/images/default.png";',
    "src/css/main.css": 'body { background: url("../../assets/images/background.png"); }',
    "scripts/build-data.js": "// fixture", "package.json": {}, "package-lock.json": {},
    "index.html": "<html></html>", "vite.config.js": "// fixture",
    "public/assets/images/icon.svg": '<svg><image href="svg-child.png"/></svg>',
    "public/assets/images/shared.png": "shared", "public/assets/images/inactive.png": "inactive",
    "public/assets/images/default.png": "default", "public/assets/images/background.png": "background",
    "public/assets/images/svg-child.png": "svg child", "public/assets/images/old.png": "old large photo",
    "public/assets/document.pdf": "document",
  })) await write(name, value);
  try { await callback({ root, write }); }
  finally { await fs.rm(root, { recursive: true, force: true }); }
}

describe("saved project media references", () => {
  it("keeps shared, inactive, default, CSS and SVG dependencies; omits only unused raster files", async () => fixture(async ({ root }) => {
    const audit = await inspectMediaReferences(root);
    expect(audit.certain).toBe(true);
    expect(audit.required.map(file => file.path)).toEqual(expect.arrayContaining([
      "assets/images/shared.png", "assets/images/inactive.png", "assets/images/default.png",
      "assets/images/background.png", "assets/images/svg-child.png",
    ]));
    expect(audit.unused).toEqual([{ path: "assets/images/old.png", bytes: 15 }]);
    expect(await fs.readFile(path.join(root, "public/assets/images/old.png"), "utf8")).toBe("old large photo");
  }));

  it.each(["dynamic", "nested dynamic", "split prefix", "malformed", "missing", "incomplete"])("preserves all images when references are %s", async mode => fixture(async ({ root, write }) => {
    if (mode === "dynamic") await write("src/js/main.js", 'const image = "assets/images/" + name;');
    if (mode === "nested dynamic") await write("src/js/main.js", 'const image = `assets/images/team/${name}.png`;');
    if (mode === "split prefix") await write("src/js/main.js", 'const base = "assets/images"; const image = base + "/" + name;');
    if (mode === "malformed") await write("content/site.json", "{broken");
    if (mode === "missing") await write("content/site.json", { image: "assets/images/not-present.png" });
    if (mode === "incomplete") await fs.unlink(path.join(root, "index.html"));
    const audit = await inspectMediaReferences(root);
    expect(audit.certain).toBe(false);
    expect(audit.unused).toEqual([]);
    const files = [{ relativePath: "public/assets/images/old.png" }];
    expect(selectReferencedMedia(files, audit)).toEqual(files);
  }));

  it("recomputes references after edits without trusting a cached report", async () => fixture(async ({ root, write }) => {
    const before = await inspectMediaReferences(root);
    await write("content/site.json", { logo: "assets/images/old.png" });
    const after = await inspectMediaReferences(root);
    expect(after.revision).not.toBe(before.revision);
    expect(after.unused).toEqual([]); // shared image is still used by the member
  }));

  it("filters source and publication lists without deleting local images or other assets", async () => fixture(async ({ root, write }) => {
    await write("dist/index.html", "<html></html>");
    await write("dist/data.json", {});
    for (const image of ["old.png", "shared.png", "inactive.png", "icon.svg"]) await write(`dist/assets/images/${image}`, image);
    await write("dist/assets/document.pdf", "document");
    const source = (await native.listEditableProjectBundleFiles(root)).map(file => file.relativePath);
    const publication = (await native.listDistFiles(root)).map(file => file.relativePath);
    expect(source).not.toContain("public/assets/images/old.png");
    expect(publication).not.toContain("assets/images/old.png");
    expect(source).toContain("content/equipe/member.json");
    expect(source).toContain("public/assets/document.pdf");
    expect(publication).toEqual(expect.arrayContaining(["assets/images/shared.png", "assets/images/inactive.png", "assets/images/icon.svg", "assets/document.pdf"]));
    expect(await fs.readFile(path.join(root, "dist/assets/images/old.png"), "utf8")).toBe("old.png");
  }));

  it("uses remote inventory sizes before downloading images", async () => fixture(async ({ root }) => {
    const audit = await inspectMediaReferences(root, [{ relativePath: "public/assets/images/remote-old.png", size: 50000000 }]);
    expect(audit.unused).toContainEqual({ path: "assets/images/remote-old.png", bytes: 50000000 });
  }));
});

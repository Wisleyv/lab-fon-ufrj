import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { isSourceFile, REQUIRED_SOURCE_MARKERS } = require("../../desktop/source-manifest.cjs");

describe("portable website source boundary", () => {
  it.each([
    ...REQUIRED_SOURCE_MARKERS, "content/equipe/person.json", "content/custom/section.json",
    "src/js/adapters/json-adapter.js", "src/js/sections/pesquisadores.js",
    "src/js/page/composition.js", "src/js/modules/navigation.js", "src/js/utils/helpers.js",
    "src/assets/images/placeholder-avatar.jpg", "public/assets/images/photo.jpg",
    "public/publication_references.json",
  ])("admits website file %s", file => expect(isSourceFile(file)).toBe(true));

  it.each([
    "editor.html", "src/js/editor/main.js", "src/css/editor.css", "desktop/main.cjs",
    "tests/unit/build.test.js", "docs/guide.md", "release/editor.exe", "dist/index.html",
    "public/data.json", "scripts/editor-smoke-ftp.cjs", "scripts/fix-encoding.js",
    "node_modules/vite/index.js", ".git/config", "content/notes.md", "src/js/new-entry.js",
    "public/.htaccess", "../index.html", "public/assets/../secret", "src\\js\\main.js",
  ])("rejects non-source path %s", file => expect(isSourceFile(file)).toBe(false));
});

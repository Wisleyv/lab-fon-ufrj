import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProjectCompositionService } from "../../src/js/editor/composition-service.js";
import { createMemoryDesktopHost } from "../../src/js/editor/desktop-host.js";
import {
  addSection,
  removeSection,
} from "../../src/js/editor/composition-commands.js";

const directory = {
  name: "lab-fon-ufrj",
  path: "C:/lab-fon-ufrj",
};

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");

const initialComposition = {
  kind: "single-page",
  sections: [
    { id: "sobre", type: "sobre", enabled: true, order: 1 },
    { id: "publicacoes", type: "publicacoes", enabled: true, order: 2 },
    {
      id: "extensao",
      type: "extension",
      enabled: false,
      order: 3,
      navigation: { visible: true, label: "Extensão" },
    },
  ],
};

function createHost(options = {}) {
  return createMemoryDesktopHost(
    {
      "content/page.json": JSON.stringify(initialComposition),
    },
    { directory, ...options },
  );
}

async function createTemporaryProject() {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "labfon-editor-"));
  await mkdir(path.join(rootPath, "content"), { recursive: true });
  await writeFile(
    path.join(rootPath, "content", "page.json"),
    `${JSON.stringify(initialComposition, null, 2)}\n`,
    "utf8",
  );

  return {
    directory: {
      name: path.basename(rootPath),
      path: rootPath,
    },
    async readPageComposition() {
      return JSON.parse(
        await readFile(path.join(rootPath, "content", "page.json"), "utf8"),
      );
    },
    async cleanup() {
      await rm(rootPath, { recursive: true, force: true });
    },
  };
}

function createNodeFileHost() {
  return {
    async readTextFile(directoryRef, relativePath) {
      return readFile(path.join(directoryRef.path, relativePath), "utf8");
    },

    async readJson(directoryRef, relativePath) {
      return JSON.parse(await this.readTextFile(directoryRef, relativePath));
    },

    async writeTextFileAtomic(directoryRef, relativePath, content) {
      await writeFile(path.join(directoryRef.path, relativePath), content, "utf8");
    },
  };
}

function getEnabledByType(composition, type) {
  return composition.sections.find((section) => section.type === type).enabled;
}

describe("editor composition persistence", () => {
  it("loads composition from the canonical content/page.json target", async () => {
    const host = createHost();
    const service = createProjectCompositionService({ host, directory });

    const composition = await service.loadComposition();

    expect(composition.sections.map((section) => section.type)).toEqual([
      "sobre",
      "publicacoes",
      "extension",
    ]);
  });

  it("does not write invalid composition", async () => {
    const host = createHost();
    const service = createProjectCompositionService({ host, directory });

    const result = await service.saveComposition({
      kind: "single-page",
      sections: [
        { id: "sobre", type: "sobre", enabled: true, order: 1 },
        { id: "sobre-2", type: "sobre", enabled: true, order: 2 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("COMPOSITION_INVALID");
    expect(host.getWrites()).toHaveLength(0);
  });

  it("serializes valid draft composition only through the host abstraction", async () => {
    const host = createHost();
    const service = createProjectCompositionService({ host, directory });
    const draft = removeSection(initialComposition, "publicacoes");

    const result = await service.saveComposition(draft);
    const writes = host.getWrites();

    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe("content/page.json");
    expect(JSON.parse(writes[0].content).sections[1]).toMatchObject({
      type: "publicacoes",
      enabled: false,
    });
  });

  it("can persist the Publicações to Extensão transition in a mock project", async () => {
    const host = createHost();
    const service = createProjectCompositionService({ host, directory });
    const withoutPublicacoes = removeSection(initialComposition, "publicacoes");
    const withExtensao = addSection(withoutPublicacoes, "extension");

    const result = await service.saveComposition(withExtensao);
    const persisted = JSON.parse(host.getText("content/page.json"));

    expect(result.ok).toBe(true);
    expect(
      persisted.sections.find((section) => section.type === "publicacoes")
        .enabled,
    ).toBe(false);
    expect(
      persisted.sections.find((section) => section.type === "extension")
        .enabled,
    ).toBe(true);
  });

  it("persists the Publicações to Extensão transition in a real filesystem project", async () => {
    const project = await createTemporaryProject();

    try {
      const service = createProjectCompositionService({
        host: createNodeFileHost(),
        directory: project.directory,
      });

      const before = await service.loadComposition();
      const draft = addSection(removeSection(before, "publicacoes"), "extension");
      const saveResult = await service.saveComposition(draft);
      const afterSave = await project.readPageComposition();
      const afterReload = await service.loadComposition();

      expect(saveResult.ok).toBe(true);
      expect(getEnabledByType(before, "publicacoes")).toBe(true);
      expect(getEnabledByType(before, "extension")).toBe(false);
      expect(getEnabledByType(afterSave, "publicacoes")).toBe(false);
      expect(getEnabledByType(afterSave, "extension")).toBe(true);
      expect(getEnabledByType(afterReload, "publicacoes")).toBe(false);
      expect(getEnabledByType(afterReload, "extension")).toBe(true);
    } finally {
      await project.cleanup();
    }
  });

  it("persists through the native Electron filesystem handler without the GUI", async () => {
    const project = await createTemporaryProject();

    try {
      const host = {
        async readTextFile(directoryRef, relativePath) {
          return nativeHandlers.readTextFile(
            null,
            directoryRef.path,
            relativePath,
          );
        },

        async readJson(directoryRef, relativePath) {
          return JSON.parse(await this.readTextFile(directoryRef, relativePath));
        },

        async writeTextFileAtomic(directoryRef, relativePath, content) {
          await nativeHandlers.writeTextFileAtomic(
            null,
            directoryRef.path,
            relativePath,
            content,
          );
        },
      };
      const service = createProjectCompositionService({
        host,
        directory: project.directory,
      });

      const before = await service.loadComposition();
      const draft = addSection(removeSection(before, "publicacoes"), "extension");
      const saveResult = await service.saveComposition(draft);
      const afterSave = await project.readPageComposition();

      expect(saveResult.ok).toBe(true);
      expect(getEnabledByType(afterSave, "publicacoes")).toBe(false);
      expect(getEnabledByType(afterSave, "extension")).toBe(true);
    } finally {
      await project.cleanup();
    }
  });

  it("reports failed writes without returning a saved composition", async () => {
    const host = createHost({ failWrite: true });
    const service = createProjectCompositionService({ host, directory });

    const result = await service.saveComposition(
      removeSection(initialComposition, "publicacoes"),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("COMPOSITION_WRITE_FAILED");
    expect(host.getWrites()).toHaveLength(0);
  });

  it("reports failed verification without pretending save succeeded", async () => {
    const host = createHost({ corruptAfterWrite: true });
    const service = createProjectCompositionService({ host, directory });

    const result = await service.saveComposition(
      removeSection(initialComposition, "publicacoes"),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("COMPOSITION_VERIFY_FAILED");
    expect(result.composition).toBeUndefined();
  });

  it("reports a verification mismatch when the read-back file kept stale state", async () => {
    const host = {
      ...createHost(),
      async writeTextFileAtomic() {},
    };
    const service = createProjectCompositionService({ host, directory });
    const draft = addSection(
      removeSection(initialComposition, "publicacoes"),
      "extension",
    );

    const result = await service.saveComposition(draft);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("COMPOSITION_VERIFY_MISMATCH");
    expect(result.diagnostics[0].expected).toMatchObject({
      publicacoes: false,
      extension: true,
    });
    expect(result.diagnostics[0].persisted).toMatchObject({
      publicacoes: true,
      extension: false,
    });
  });
});

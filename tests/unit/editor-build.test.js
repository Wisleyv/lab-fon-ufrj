import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBuildController,
  validateGeneratedSite,
} from "../../src/js/editor/build-service.js";

const require = createRequire(import.meta.url);
const nativeHandlers = require("../../desktop/main.cjs");
const repoRoot = process.cwd();

function createState(overrides = {}) {
  return {
    openedProject: {
      name: "lab-fon-ufrj",
      path: "C:/lab-fon-ufrj",
      status: "valid",
      valid: true,
    },
    compositionDirty: false,
    diagnostics: [],
    build: {
      status: "idle",
      message: "",
      diagnostics: [],
      output: "",
      previewUrl: null,
    },
    ...overrides,
  };
}

function createHost(overrides = {}) {
  return {
    async pathExists(_directory, relativePath) {
      return ["dist/index.html", "dist/data.json"].includes(relativePath);
    },
    async readJson() {
      return {
        page: {
          sections: [],
        },
      };
    },
    async runProjectBuild() {
      return {
        ok: true,
        code: "BUILD_SUCCEEDED",
        message: "Site generated successfully.",
        output: "ok",
      };
    },
    async previewGeneratedSite() {
      return {
        ok: true,
        url: "http://127.0.0.1:4173/",
      };
    },
    ...overrides,
  };
}

async function createDisposableProject() {
  const tempRoot = path.join(
    repoRoot,
    "tmp",
    `labfon-build-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  await fs.mkdir(tempRoot, { recursive: true });
  await Promise.all(
    ["src", "scripts", "public"].map((directory) =>
      fs.cp(path.join(repoRoot, directory), path.join(tempRoot, directory), {
        recursive: true,
      }),
    ),
  );
  await Promise.all(
    ["index.html", "editor.html", "vite.config.js"].map((fileName) =>
      fs.copyFile(path.join(repoRoot, fileName), path.join(tempRoot, fileName)),
    ),
  );
  await fs.writeFile(
    path.join(tempRoot, "package.json"),
    JSON.stringify(
      {
        type: "module",
        scripts: {
          prebuild: "node scripts/build-data.js",
          build: "vite build",
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeDisposableContent(tempRoot);
  await fs.mkdir(path.join(tempRoot, "node_modules"), { recursive: true });
  await fs.symlink(path.join(repoRoot, "node_modules", "vite"), path.join(tempRoot, "node_modules", "vite"), "junction");

  return {
    directory: {
      name: path.basename(tempRoot),
      path: tempRoot,
    },
    async cleanup() {
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeDisposableContent(rootPath) {
  await fs.rm(path.join(rootPath, "content"), { recursive: true, force: true });
  await writeJson(path.join(rootPath, "content", "site.json"), {
    hero: {
      title: "Lab-FON",
      description: "Laboratório de Fonética",
    },
    sobre: {
      title: "Sobre",
      paragraphs: ["Projeto descartável."],
    },
    footer: {
      sections: [],
      coordination: {
        lab: [],
        extensionProject: [],
      },
    },
  });
  await writeJson(path.join(rootPath, "content", "page.json"), {
    kind: "single-page",
    sections: [
      { id: "sobre", type: "sobre", enabled: true, order: 1 },
      {
        id: "publicacoes",
        type: "publicacoes",
        enabled: false,
        order: 2,
        navigation: { visible: true, label: "Publicações" },
      },
      {
        id: "extensao",
        type: "extension",
        enabled: true,
        order: 3,
        navigation: { visible: true, label: "Extensão" },
      },
    ],
  });
  await writeJson(path.join(rootPath, "content", "equipe", "egressa.json"), {
    nome: "Pessoa Egressa",
    categoria: "egressos",
  });
  await writeJson(path.join(rootPath, "content", "linhas", "linha.json"), {
    id: "linha",
    nome: "Prosódia",
    descricao: "Linha de pesquisa.",
    ordem: 1,
  });
  await writeJson(path.join(rootPath, "content", "parcerias", "capes.json"), {
    nome: "CAPES",
  });
  await writeJson(
    path.join(rootPath, "content", "publicacoes", "publicacao.json"),
    {
      title: "Publicação preservada",
      year: 2024,
    },
  );
  await writeJson(path.join(rootPath, "content", "extensao.json"), {
    projects: [
      {
        id: "provale-em-extensao",
        title: "PROVALE em Extensão",
        projectType: "Projeto de Extensão",
        minibio: "Projeto de extensão em teste.",
      },
    ],
  });
}

describe("editor build workflow", () => {
  it("does not run a build for invalid project state", async () => {
    let called = false;
    const controller = createBuildController({
      host: createHost({
        async runProjectBuild() {
          called = true;
        },
      }),
      getState: () =>
        createState({
          openedProject: {
            status: "invalid",
          },
        }),
    });

    const result = await controller.runBuild();

    expect(result.ok).toBe(false);
    expect(result.code).toBe("BUILD_PROJECT_INVALID");
    expect(called).toBe(false);
  });

  it("does not run a build while composition changes are unsaved", async () => {
    let called = false;
    const controller = createBuildController({
      host: createHost({
        async runProjectBuild() {
          called = true;
        },
      }),
      getState: () => createState({ compositionDirty: true }),
    });

    const result = await controller.runBuild();

    expect(result.ok).toBe(false);
    expect(result.code).toBe("BUILD_UNSAVED_CHANGES");
    expect(called).toBe(false);
  });

  it("reports process failure from the constrained native build path", async () => {
    const projectPath = path.join(
      repoRoot,
      "tmp",
      `labfon-build-fail-${Date.now()}`,
    );
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({
        scripts: {
          build: "node -e \"process.exit(7)\"",
        },
      }),
      "utf8",
    );

    try {
      const result = await nativeHandlers.runProjectBuild(null, projectPath);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("BUILD_COMMAND_FAILED");
      expect(result.command).toBe("npm run build");
    } finally {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
  });

  it("treats successful process exit with missing artifacts as failure", async () => {
    const projectPath = path.join(
      repoRoot,
      "tmp",
      `labfon-build-missing-${Date.now()}`,
    );
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({
        scripts: {
          build: "node -e \"process.exit(0)\"",
        },
      }),
      "utf8",
    );

    try {
      const result = await nativeHandlers.runProjectBuild(null, projectPath);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("BUILD_ARTIFACT_INVALID");
      expect(result.missing).toContain("dist/index.html");
    } finally {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
  });

  it("validates a complete generated dist artifact", async () => {
    const host = createHost();
    const result = await validateGeneratedSite(host, {
      name: "lab-fon",
      path: "C:/lab-fon",
    });

    expect(result.ok).toBe(true);
    expect(result.artifacts).toEqual(["dist/index.html", "dist/data.json"]);
  });

  it("rejects Editor-only artifacts from generated public output", async () => {
    const projectPath = await fs.mkdtemp(path.join(repoRoot, "tmp", "editor-dist-"));
    await fs.mkdir(path.join(projectPath, "dist", "js"), { recursive: true });
    await fs.writeFile(path.join(projectPath, "dist", "index.html"), "public", "utf8");
    await fs.writeFile(
      path.join(projectPath, "dist", "data.json"),
      JSON.stringify({ page: { sections: [] } }),
      "utf8",
    );
    await fs.writeFile(path.join(projectPath, "dist", "editor.html"), "editor", "utf8");
    await fs.writeFile(path.join(projectPath, "dist", "js", "editor.hash.js"), "", "utf8");

    try {
      const result = await nativeHandlers.validateGeneratedSite(projectPath);

      expect(result.ok).toBe(false);
      expect(result.code).toBe("BUILD_ARTIFACT_INVALID");
      expect(result.unexpected).toEqual(["editor.html", "js/editor.hash.js"]);
    } finally {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
  });

  it("targets generated dist for preview instead of draft data", async () => {
    const controller = createBuildController({
      host: createHost(),
      getState: () =>
        createState({
          build: {
            status: "success",
            message: "Site generated successfully.",
            diagnostics: [],
            output: "",
            previewUrl: null,
          },
        }),
    });

    const result = await controller.previewGeneratedSite();

    expect(result.ok).toBe(true);
    expect(result.url).toBe("http://127.0.0.1:4173/");
  });

  it("runs the real production build for a disposable Publicações to Extensão project", async () => {
    const project = await createDisposableProject();

    try {
      const result = await nativeHandlers.runProjectBuild(null, project.directory.path);
      const generatedData = JSON.parse(
        await fs.readFile(
          path.join(project.directory.path, "dist", "data.json"),
          "utf8",
        ),
      );
      const publicacoes = generatedData.page.sections.find(
        (section) => section.type === "publicacoes",
      );
      const extensao = generatedData.page.sections.find(
        (section) => section.type === "extension",
      );
      const navigationLabels = generatedData.page.sections
        .filter((section) => section.navigation?.visible)
        .map((section) => section.navigation.label);

      expect(result.ok).toBe(true);
      expect(publicacoes.enabled).toBe(false);
      expect(extensao.enabled).toBe(true);
      expect(navigationLabels).toContain("Extensão");
      expect(navigationLabels).not.toContain("PROVALE");
      expect(generatedData.extensao.projects[0].title).toBe(
        "PROVALE em Extensão",
      );

      const preview = await nativeHandlers.previewGeneratedSite(
        null,
        project.directory.path,
      );
      expect(preview.url).toMatch(/\/labfonac\/$/);

      const previewData = await fetch(`${preview.url}data.json`).then(
        (response) => response.json(),
      );

      expect(preview.ok).toBe(true);
      expect(previewData.extensao.projects[0].title).toBe(
        "PROVALE em Extensão",
      );
    } finally {
      await nativeHandlers.stopGeneratedPreviewServer();
      await project.cleanup();
    }
  }, 60000);

  it("builds retrieved legacy source without restoring Editor files or changing its config", async () => {
    const project = await createDisposableProject();
    const configPath = path.join(project.directory.path, "vite.config.js");
    const legacyConfig = `export default { base: '/labfonac/', build: { rollupOptions: { input: { index: 'index.html', editor: 'editor.html' }, output: { entryFileNames: 'js/[name].[hash].js', chunkFileNames: 'js/[name].[hash].js', assetFileNames: 'assets/[name].[hash][extname]' } } } };\n`;
    await fs.writeFile(configPath, legacyConfig);
    await fs.rm(path.join(project.directory.path, "editor.html"));
    const sourceBefore = await fs.readFile(path.join(project.directory.path, "content", "site.json"), "utf8");
    const priorMode = process.env.LABFON_EDITOR_BUILD;
    const priorOutput = process.env.BUILD_OUTPUT;
    process.env.LABFON_EDITOR_BUILD = "true";
    process.env.BUILD_OUTPUT = "unexpected-output";
    try {
      const result = await nativeHandlers.runProjectBuild(null, project.directory.path);
      expect(result.ok, result.output).toBe(true);
      expect(await fs.readFile(configPath, "utf8")).toBe(legacyConfig);
      expect(await fs.readFile(path.join(project.directory.path, "content", "site.json"), "utf8")).toBe(sourceBefore);
      await expect(fs.access(path.join(project.directory.path, "editor.html"))).rejects.toThrow();
      await expect(fs.access(path.join(project.directory.path, "dist", "editor.html"))).rejects.toThrow();
      await expect(fs.access(path.join(project.directory.path, "unexpected-output"))).rejects.toThrow();
      expect((await nativeHandlers.validateGeneratedSite(project.directory.path)).ok).toBe(true);
    } finally {
      if (priorMode === undefined) delete process.env.LABFON_EDITOR_BUILD; else process.env.LABFON_EDITOR_BUILD = priorMode;
      if (priorOutput === undefined) delete process.env.BUILD_OUTPUT; else process.env.BUILD_OUTPUT = priorOutput;
      await project.cleanup();
    }
  }, 60000);
});

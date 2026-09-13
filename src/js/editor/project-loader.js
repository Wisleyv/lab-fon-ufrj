import { normalizePageComposition, validatePageComposition } from "../page/composition.js";

const REQUIRED_MARKERS = [
  "package.json",
  "content",
  "content/page.json",
  "content/site.json",
  "scripts/build-data.js",
];

const REQUIRED_JSON_FILES = ["content/page.json", "content/site.json"];

const CONTENT_COLLECTIONS = {
  equipe: "content/equipe",
  linhasPesquisa: "content/linhas",
  parcerias: "content/parcerias",
  publicacoes: "content/publicacoes",
};

export async function validateLabFonProject(host, directory) {
  const diagnostics = [];

  for (const marker of REQUIRED_MARKERS) {
    try {
      if (!(await host.pathExists(directory, marker))) {
        diagnostics.push({
          code: "PROJECT_MARKER_MISSING",
          severity: marker.startsWith("content/") ? "error" : "warning",
          file: marker,
          message: `Marcador obrigatório ausente: ${marker}`,
        });
      }
    } catch (error) {
      diagnostics.push({
        code: "PROJECT_MARKER_UNREADABLE",
        severity: "error",
        file: marker,
        message: `Não foi possível verificar ${marker}: ${getErrorMessage(error)}`,
      });
    }
  }

  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );

  return {
    status:
      diagnostics.length === 0 ? "valid" : hasErrors ? "invalid" : "incomplete",
    valid: diagnostics.length === 0,
    diagnostics,
  };
}

export async function loadEditorSiteModel(host, directory) {
  const validation = await validateLabFonProject(host, directory);

  if (validation.status === "invalid") {
    return {
      ok: false,
      project: createProjectSummary(directory, validation),
      diagnostics: validation.diagnostics,
      model: null,
    };
  }

  const diagnostics = [...validation.diagnostics];
  const loaded = {};

  for (const filePath of REQUIRED_JSON_FILES) {
    const key = filePath === "content/page.json" ? "page" : "site";
    const result = await readRequiredJson(host, directory, filePath);

    if (!result.ok) {
      diagnostics.push(result.diagnostic);
      return {
        ok: false,
        project: createProjectSummary(directory, {
          ...validation,
          status: "invalid",
          valid: false,
        }),
        diagnostics,
        model: null,
      };
    }

    loaded[key] = result.data;
  }

  const pageValidation = validatePageComposition(loaded.page);
  if (!pageValidation.valid) {
    return { ok: false, model: null,
      project: createProjectSummary(directory, { ...validation, status: "invalid", valid: false }),
      diagnostics: [...diagnostics, ...pageValidation.diagnostics] };
  }
  const model = {
    project: createProjectSummary(directory, validation),
    page: normalizePageComposition(loaded.page),
    site: loaded.site,
    equipe: await readCollection(
      host,
      directory,
      CONTENT_COLLECTIONS.equipe,
      diagnostics,
    ),
    linhasPesquisa: await readCollection(
      host,
      directory,
      CONTENT_COLLECTIONS.linhasPesquisa,
      diagnostics,
    ),
    extensao: await readOptionalJson(
      host,
      directory,
      "content/extensao.json",
      { projects: [] },
      diagnostics,
    ),
    parcerias: await readCollection(
      host,
      directory,
      CONTENT_COLLECTIONS.parcerias,
      diagnostics,
    ),
    publicacoes: await readCollection(
      host,
      directory,
      CONTENT_COLLECTIONS.publicacoes,
      diagnostics,
    ),
  };

  return {
    ok: true,
    project: model.project,
    diagnostics,
    model,
  };
}

function createProjectSummary(directory, validation) {
  return {
    name: directory.name || directory.path || "Projeto local",
    path: directory.path || directory.name || "",
    status: validation.status,
    valid: validation.valid,
  };
}

async function readRequiredJson(host, directory, filePath) {
  try {
    return {
      ok: true,
      data: await host.readJson(directory, filePath),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code:
          error instanceof SyntaxError
            ? "PROJECT_JSON_MALFORMED"
            : "PROJECT_FILE_UNREADABLE",
        severity: "error",
        file: filePath,
        message: `Não foi possível carregar ${filePath}: ${getErrorMessage(error)}`,
      },
    };
  }
}

async function readOptionalJson(
  host,
  directory,
  filePath,
  fallback,
  diagnostics,
) {
  try {
    if (!(await host.pathExists(directory, filePath))) {
      diagnostics.push({
        code: "PROJECT_OPTIONAL_CONTENT_MISSING",
        severity: "warning",
        file: filePath,
        message: `Conteúdo opcional ausente: ${filePath}`,
      });
      return fallback;
    }

    return await host.readJson(directory, filePath);
  } catch (error) {
    diagnostics.push({
      code:
        error instanceof SyntaxError
          ? "PROJECT_JSON_MALFORMED"
          : "PROJECT_FILE_UNREADABLE",
      severity: "warning",
      file: filePath,
      message: `Não foi possível carregar ${filePath}: ${getErrorMessage(error)}`,
    });
    return fallback;
  }
}

async function readCollection(host, directory, collectionPath, diagnostics) {
  try {
    if (!(await host.pathExists(directory, collectionPath))) {
      diagnostics.push({
        code: "PROJECT_OPTIONAL_CONTENT_MISSING",
        severity: "warning",
        file: collectionPath,
        message: `Coleção opcional ausente: ${collectionPath}`,
      });
      return [];
    }

    return await host.readJsonFiles(directory, collectionPath);
  } catch (error) {
    diagnostics.push({
      code: "PROJECT_COLLECTION_UNREADABLE",
      severity: "warning",
      file: collectionPath,
      message: `Não foi possível carregar ${collectionPath}: ${getErrorMessage(error)}`,
    });
    return [];
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "erro desconhecido";
}

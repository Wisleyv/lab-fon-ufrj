import { getBusyReadiness } from "./state.js";
const REQUIRED_ARTIFACTS = ["dist/index.html", "dist/data.json"];

export function createBuildController({ host, getState } = {}) {
  return {
    canBuild() {
      return getBuildReadiness(getState()).ok;
    },

    getReadiness() {
      return getBuildReadiness(getState());
    },

    async runBuild() {
      const state = getState();
      const readiness = getBuildReadiness(state);

      if (!readiness.ok) {
        return readiness;
      }

      if (typeof host.runProjectBuild !== "function") {
        return {
          ok: false,
          code: "BUILD_UNAVAILABLE",
          message: "A geração do site exige o aplicativo desktop.",
        };
      }

      return host.runProjectBuild(state.openedProject);
    },

    async previewGeneratedSite() {
      const state = getState();

      const readiness = getGeneratedPreviewReadiness(state);
      if (!readiness.ok) {
        return readiness;
      }
      if (typeof host.previewGeneratedSite !== "function") {
        return {
          ok: false,
          code: "GENERATED_PREVIEW_UNAVAILABLE",
          message: "A prévia do site gerado exige o aplicativo desktop.",
        };
      }

      return host.previewGeneratedSite(state.openedProject);
    },
  };
}

export function getBuildReadiness(state) {
  const busy = getBusyReadiness(state);
  if (!busy.ok) return busy;
  if (!state.openedProject || state.openedProject.status !== "valid") {
    return {
      ok: false,
      code: "BUILD_PROJECT_INVALID",
      message: "Abra um projeto Labfonac válido antes de gerar o site.",
    };
  }

  if (state.compositionDirty || state.contentDirty || state.contentSaving) {
    return {
      ok: false,
      code: "BUILD_UNSAVED_CHANGES",
      message: "Salve as alterações antes de gerar o site.",
    };
  }

  const blockingDiagnostics = (state.diagnostics || []).filter(
    (diagnostic) => diagnostic.severity === "error",
  );

  if (blockingDiagnostics.length > 0) {
    return {
      ok: false,
      code: "BUILD_BLOCKED_BY_DIAGNOSTICS",
      message: "Corrija os erros do projeto antes de gerar o site.",
      diagnostics: blockingDiagnostics,
    };
  }

  return { ok: true };
}

export function getGeneratedPreviewReadiness(state) {
  const ready = getBuildReadiness(state);
  if (!ready.ok) return ready;
  return state.build?.status === "success" ? { ok: true } : { ok: false, code: "GENERATED_PREVIEW_UNAVAILABLE", message: "Gere uma versão atual do site antes de abrir a prévia." };
}

export async function validateGeneratedSite(host, directory) {
  const missing = [];

  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!(await host.pathExists(directory, artifact))) {
      missing.push(artifact);
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: `A geração terminou, mas arquivos obrigatórios não foram encontrados: ${missing.join(", ")}.`,
      missing,
    };
  }

  let data;
  try {
    data = await host.readJson(directory, "dist/data.json");
  } catch (error) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: `A geração terminou, mas dist/data.json não pôde ser lido: ${getErrorMessage(error)}`,
    };
  }

  if (!Array.isArray(data.page?.sections)) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: "A geração terminou, mas dist/data.json não contém a composição da página.",
    };
  }

  return {
    ok: true,
    artifacts: [...REQUIRED_ARTIFACTS],
    data,
  };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "erro desconhecido";
}

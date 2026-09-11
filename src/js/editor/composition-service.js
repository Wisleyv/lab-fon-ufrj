import { JSONAdapter } from "../adapters/JSONAdapter.js";
import { createDefaultPageComposition } from "../page/default-composition.js";
import {
  normalizePageComposition,
  validatePageComposition,
} from "../page/composition.js";
import { compositionsEqual } from "./composition-commands.js";

function cloneComposition(composition) {
  return JSON.parse(JSON.stringify(composition));
}

const CANONICAL_COMPOSITION_PATH = "content/page.json";

export function createBrowserCompositionService({
  dataUrl = "./data.json",
} = {}) {
  return {
    canSave: false,

    async loadComposition() {
      const adapter = new JSONAdapter(dataUrl, 1);
      const data = await adapter.fetch();

      if (data.error) {
        return normalizePageComposition(createDefaultPageComposition());
      }

      return normalizePageComposition(data.page);
    },

    async saveComposition() {
      return {
        ok: false,
        code: "COMPOSITION_SAVE_UNAVAILABLE",
        message:
          "O salvamento da composição exige a integração futura com o aplicativo desktop.",
      };
    },
  };
}

export function createMemoryCompositionService(initialComposition) {
  let savedComposition = normalizePageComposition(
    initialComposition || createDefaultPageComposition(),
  );

  return {
    canSave: true,

    async loadComposition() {
      return cloneComposition(savedComposition);
    },

    async saveComposition(composition) {
      savedComposition = normalizePageComposition(composition);
      return {
        ok: true,
        composition: cloneComposition(savedComposition),
      };
    },

    getSavedComposition() {
      return cloneComposition(savedComposition);
    },
  };
}

export function createProjectCompositionService({
  host,
  directory,
  filePath = CANONICAL_COMPOSITION_PATH,
} = {}) {
  return {
    canSave: true,
    filePath,

    async loadComposition() {
      return normalizePageComposition(await host.readJson(directory, filePath));
    },

    async saveComposition(composition) {
      const validation = validatePageComposition(composition);

      if (!validation.valid) {
        return {
          ok: false,
          code: "COMPOSITION_INVALID",
          message: "A composição contém erros e não foi salva.",
          diagnostics: validation.diagnostics,
        };
      }

      const normalized = normalizePageComposition(validation.composition);
      const serialized = `${JSON.stringify(normalized, null, 2)}\n`;

      try {
        await host.writeTextFileAtomic(directory, filePath, serialized);
      } catch (error) {
        return {
          ok: false,
          code: "COMPOSITION_WRITE_FAILED",
          message: `Não foi possível gravar ${filePath}: ${getErrorMessage(error)}`,
        };
      }

      try {
        const verified = normalizePageComposition(
          await host.readJson(directory, filePath),
        );

        if (!compositionsEqual(verified, normalized)) {
          return {
            ok: false,
            code: "COMPOSITION_VERIFY_MISMATCH",
            message: `A composição gravada em ${filePath} não corresponde ao rascunho salvo.`,
            diagnostics: [
              {
                code: "COMPOSITION_VERIFY_MISMATCH",
                severity: "error",
                file: filePath,
                message: "O conteúdo relido após salvar diverge do rascunho normalizado.",
                expected: summarizeCompositionState(normalized),
                persisted: summarizeCompositionState(verified),
              },
            ],
          };
        }

        return {
          ok: true,
          composition: cloneComposition(verified),
        };
      } catch (error) {
        return {
          ok: false,
          code: "COMPOSITION_VERIFY_FAILED",
          message: `A composição foi gravada, mas não pôde ser verificada em ${filePath}: ${getErrorMessage(error)}`,
        };
      }
    },
  };
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "erro desconhecido";
}

function summarizeCompositionState(composition) {
  return Object.fromEntries(
    normalizePageComposition(composition).sections.map((section) => [
      section.type,
      section.enabled,
    ]),
  );
}

import { getBusyReadiness, getEditingReadiness } from "./state.js";
export const DEFAULT_FTP_PORT = 2100;

export function createEmptyPublishProfile() {
  return {
    host: "",
    port: DEFAULT_FTP_PORT,
    username: "",
    remoteSourcePath: "/source",
    remotePublishPath: "/",
    secure: true,
    passiveMode: true,
    hasPassword: false,
  };
}

export function sanitizePublishProfile(profile = {}) {
  const legacyPath = profile.remotePath || "";
  return {
    host: String(profile.host || "").trim(),
    port: normalizePort(profile.port),
    username: String(profile.username || "").trim(),
    remoteSourcePath: normalizeRemotePath(
      profile.remoteSourcePath || legacyPath,
    ),
    remotePublishPath: normalizeRemotePath(
      profile.remotePublishPath || legacyPath || "/",
    ),
    secure: profile.secure === true,
    passiveMode: profile.passiveMode !== false,
    hasPassword: profile.hasPassword === true,
  };
}

export function validatePublishProfile(profile = {}, options = {}) {
  const normalized = sanitizePublishProfile(profile);
  const diagnostics = [];

  if (!normalized.host) {
    diagnostics.push(createDiagnostic("PUBLISH_HOST_MISSING", "Informe o servidor FTP."));
  }

  if (!normalized.username) {
    diagnostics.push(
      createDiagnostic("PUBLISH_USERNAME_MISSING", "Informe o usuário FTP."),
    );
  }

  if (!normalized.remoteSourcePath) {
    diagnostics.push(
      createDiagnostic(
        "PUBLISH_REMOTE_SOURCE_PATH_MISSING",
        "Informe a pasta remota do projeto editável.",
      ),
    );
  }

  if (!normalized.remotePublishPath) {
    diagnostics.push(
      createDiagnostic(
        "PUBLISH_REMOTE_PATH_MISSING",
        "Informe a pasta remota do site publicado.",
      ),
    );
  }

  for (const [field, code] of [
    ["remoteSourcePath", "PUBLISH_REMOTE_SOURCE_PATH_INVALID"],
    ["remotePublishPath", "PUBLISH_REMOTE_PATH_INVALID"],
  ]) {
    if (normalized[field].split("/").includes("..")) {
      diagnostics.push(
        createDiagnostic(
          code,
          "A pasta remota não pode conter navegação por '..'.",
        ),
      );
    }
  }

  if (
    normalized.remoteSourcePath &&
    normalized.remotePublishPath &&
    normalized.remoteSourcePath === normalized.remotePublishPath
  ) {
    diagnostics.push(
      createDiagnostic(
        "PUBLISH_REMOTE_PATHS_NOT_DISTINCT",
        "A pasta do projeto editável deve ser diferente da pasta do site publicado.",
      ),
    );
  }

  if (!Number.isInteger(normalized.port) || normalized.port < 1 || normalized.port > 65535) {
    diagnostics.push(createDiagnostic("PUBLISH_PORT_INVALID", "Informe uma porta FTP válida."));
  }

  if (options.requirePassword && !options.hasPassword) {
    diagnostics.push(
      createDiagnostic("PUBLISH_PASSWORD_MISSING", "Informe a senha FTP."),
    );
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    profile: normalized,
  };
}

export function validateConnectionProfile(profile = {}, options = {}) {
  const normalized = sanitizePublishProfile(profile);
  const diagnostics = [];

  if (!normalized.host) {
    diagnostics.push(createDiagnostic("PUBLISH_HOST_MISSING", "Informe o servidor FTP."));
  }

  if (!normalized.username) {
    diagnostics.push(
      createDiagnostic("PUBLISH_USERNAME_MISSING", "Informe o usuário FTP."),
    );
  }

  if (!Number.isInteger(normalized.port) || normalized.port < 1 || normalized.port > 65535) {
    diagnostics.push(createDiagnostic("PUBLISH_PORT_INVALID", "Informe uma porta FTP válida."));
  }

  if (options.requirePassword && !options.hasPassword) {
    diagnostics.push(
      createDiagnostic("PUBLISH_PASSWORD_MISSING", "Informe a senha FTP."),
    );
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    profile: normalized,
  };
}

export function createPublishController({ host, getState } = {}) {
  return {
    async loadProfile() {
      if (typeof host.loadPublishProfile !== "function") {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_UNAVAILABLE",
          message: "A configuração de publicação exige o aplicativo desktop.",
        };
      }

      return host.loadPublishProfile();
    },

    async saveProfile(profile, password) {
      const validation = validatePublishProfile(profile, {
        requirePassword: Boolean(password),
        hasPassword: Boolean(password),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.savePublishProfile !== "function") {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_UNAVAILABLE",
          message: "A configuração de publicação exige o aplicativo desktop.",
        };
      }

      return host.savePublishProfile(validation.profile, password);
    },

    async testConnection(profile, password) {
      const validation = validatePublishProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.testFtpConnection !== "function") {
        return {
          ok: false,
          code: "FTP_UNAVAILABLE",
          message: "O teste de conexão FTP exige o aplicativo desktop.",
        };
      }

      return host.testFtpConnection(validation.profile, password || "");
    },

    async connect(profile, password) {
      const validation = validateConnectionProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "Preencha servidor, usuário e senha para conectar.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.connectFtp !== "function") {
        return {
          ok: false,
          code: "FTP_UNAVAILABLE",
          message: "A conexão FTP exige o aplicativo desktop.",
        };
      }

      return host.connectFtp(validation.profile, password || "");
    },

    async listDirectory(profile, password, remotePath) {
      const validation = validateConnectionProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "Preencha servidor, usuário e senha para navegar pelas pastas.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.listRemoteDirectory !== "function") {
        return {
          ok: false,
          code: "FTP_UNAVAILABLE",
          message: "A navegação remota exige o aplicativo desktop.",
        };
      }

      return host.listRemoteDirectory(
        validation.profile,
        password || "",
        normalizeRemotePath(remotePath || "/") || "/",
      );
    },

    async retrieveRemoteProject(profile, password) {
      const readiness = getRetrievalReadiness(getState(), profile, password);
      if (!readiness.ok) return readiness;
      const validation = validatePublishProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.retrieveRemoteProject !== "function") {
        return {
          ok: false,
          code: "REMOTE_PROJECT_RETRIEVAL_UNAVAILABLE",
          message: "A abertura de projeto remoto exige o aplicativo desktop.",
        };
      }

      return host.retrieveRemoteProject(validation.profile, password || "");
    },

    async initializeRemoteProjectSource(directory, profile, password) {
      const validation = validatePublishProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.initializeRemoteProjectSource !== "function") {
        return {
          ok: false,
          code: "REMOTE_PROJECT_SOURCE_INIT_UNAVAILABLE",
          message: "A inicialização do projeto remoto exige o aplicativo desktop.",
        };
      }

      return host.initializeRemoteProjectSource(
        directory,
        validation.profile,
        password || "",
      );
    },

    async updateRemoteProjectSource(directory, profile, password) {
      const readiness = getSourceUpdateReadiness(getState(), profile, password);
      if (!readiness.ok) return readiness;
      const validation = validatePublishProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.updateRemoteProjectSource !== "function") {
        return {
          ok: false,
          code: "REMOTE_PROJECT_SOURCE_UPDATE_UNAVAILABLE",
          message: "A atualização do projeto remoto exige o aplicativo desktop.",
        };
      }

      return host.updateRemoteProjectSource(
        directory,
        validation.profile,
        password || "",
      );
    },

    async publish(profile, password) {
      const readiness = getPublicationReadiness(getState());
      if (!readiness.ok) {
        return readiness;
      }

      const validation = validatePublishProfile(profile, {
        requirePassword: true,
        hasPassword: Boolean(password || profile.hasPassword),
      });

      if (!validation.valid) {
        return {
          ok: false,
          code: "PUBLISH_PROFILE_INVALID",
          stage: "not_started",
          message: "A configuração de publicação contém erros.",
          diagnostics: validation.diagnostics,
        };
      }

      if (typeof host.publishGeneratedSite !== "function") {
        return {
          ok: false,
          code: "PUBLISH_UNAVAILABLE",
          stage: "not_started",
          message: "A publicação exige o aplicativo desktop.",
        };
      }

      return host.publishGeneratedSite(
        getState().openedProject,
        validation.profile,
        password || "",
      );
    },
  };
}

export function getPublishReadiness(state) {
  if (!state.openedProject || state.openedProject.status !== "valid") {
    return {
      ok: false,
      code: "PUBLISH_PROJECT_INVALID",
      message: "Abra um projeto Labfonac válido antes de testar a publicação.",
    };
  }

  return { ok: true };
}

export function getPublicationReadiness(state) {
  const busy = getBusyReadiness(state);
  if (!busy.ok) return busy;
  const projectReadiness = getPublishReadiness(state);
  if (!projectReadiness.ok) {
    return {
      ...projectReadiness,
      stage: "not_started",
    };
  }

  if (state.openedProject.source === "local") return localProjectRemoteUnavailable();

  if (state.compositionDirty || state.contentDirty || state.contentSaving) {
    return {
      ok: false,
      code: "PUBLISH_UNSAVED_CHANGES",
      stage: "not_started",
      message: "Salve a composição antes de publicar.",
    };
  }

  if (state.build?.status !== "success") {
    return {
      ok: false,
      code: "PUBLISH_BUILD_STALE",
      stage: "not_started",
      message: "Gere o site novamente antes de publicar.",
    };
  }

  if (state.publish?.status !== "ready" || !state.publish?.profile) {
    return {
      ok: false,
      code: "PUBLISH_DESTINATION_NOT_READY",
      stage: "not_started",
      message: "Teste a conexão FTP antes de publicar.",
    };
  }

  return { ok: true };
}

export function getProfileReadiness(profile, password, connectionOnly = false) {
  const validate = connectionOnly ? validateConnectionProfile : validatePublishProfile;
  const result = validate(profile, { requirePassword: true, hasPassword: Boolean(password || profile?.hasPassword) });
  return result.valid ? { ok: true } : { ok: false, code: "PUBLISH_PROFILE_INVALID", message: result.diagnostics[0].message, diagnostics: result.diagnostics };
}

export function getRetrievalReadiness(state, profile, password) {
  const busy = getBusyReadiness(state);
  if (!busy.ok) return busy;
  if (state.contentDirty || state.compositionDirty) return { ok: false, code: "REMOTE_UNSAVED_CHANGES", message: "Salve ou descarte as alterações antes de recuperar o projeto." };
  return getProfileReadiness(profile, password);
}

export function getSourceUpdateReadiness(state, profile, password) {
  const ready = getEditingReadiness(state);
  if (!ready.ok) return ready;
  if (state.openedProject.source === "local") return localProjectRemoteUnavailable();
  if (state.contentDirty || state.compositionDirty) return { ok: false, code: "REMOTE_UNSAVED_CHANGES", message: "Salve as alterações antes de atualizar o projeto remoto." };
  return getProfileReadiness(profile, password);
}

function localProjectRemoteUnavailable() {
  return { ok: false, code: "REMOTE_PROJECT_REQUIRED", stage: "not_started",
    message: "Projeto local: atualização remota e publicação indisponíveis nesta sessão." };
}

function normalizePort(value) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : DEFAULT_FTP_PORT;
}

export function normalizeRemotePath(value) {
  const trimmed = String(value || "").trim().replaceAll("\\", "/");
  if (!trimmed) return "";

  const compact = trimmed.replace(/\/+/g, "/");
  return compact === "/" ? "/" : compact.replace(/\/+$/, "");
}

function createDiagnostic(code, message) {
  return {
    code,
    severity: "error",
    message,
  };
}

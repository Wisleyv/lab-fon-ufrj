export function createBrowserDesktopHost(windowRef = window) {
  return {
    async openProjectDirectory() {
      if (typeof windowRef.showDirectoryPicker !== "function") {
        return {
          ok: false,
          cancelled: false,
          code: "PROJECT_DIRECTORY_PICKER_UNAVAILABLE",
          message:
            "A seleção de pasta local exige um navegador ou host desktop com suporte a diretórios.",
        };
      }

      try {
        const handle = await windowRef.showDirectoryPicker({
          mode: "readwrite",
        });
        return {
          ok: true,
          directory: {
            name: handle.name,
            path: handle.name,
            handle,
          },
        };
      } catch (error) {
        if (error?.name === "AbortError") {
          return {
            ok: false,
            cancelled: true,
            code: "PROJECT_SELECTION_CANCELLED",
            message: "Seleção de projeto cancelada.",
          };
        }

        return {
          ok: false,
          cancelled: false,
          code: "PROJECT_SELECTION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível selecionar a pasta do projeto.",
        };
      }
    },

    async pathExists(directory, relativePath) {
      try {
        await getFileHandle(directory.handle, relativePath);
        return true;
      } catch {
        try {
          await getDirectoryHandle(directory.handle, relativePath);
          return true;
        } catch {
          return false;
        }
      }
    },

    async readTextFile(directory, relativePath) {
      const fileHandle = await getFileHandle(directory.handle, relativePath);
      const file = await fileHandle.getFile();
      return file.text();
    },

    async readJson(directory, relativePath) {
      return JSON.parse(await this.readTextFile(directory, relativePath));
    },

    async readJsonFiles(directory, relativePath) {
      const dirHandle = await getDirectoryHandle(
        directory.handle,
        relativePath,
      );
      const files = [];

      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind !== "file" || !name.endsWith(".json")) continue;
        const file = await handle.getFile();
        files.push(JSON.parse(await file.text()));
      }

      return files;
    },

    async writeTextFileAtomic(directory, relativePath, content) {
      const fileHandle = await getFileHandle(directory.handle, relativePath);
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    },

    async runProjectBuild() {
      return {
        ok: false,
        code: "BUILD_UNAVAILABLE",
        message: "A geração do site exige o aplicativo desktop.",
      };
    },

    async previewGeneratedSite() {
      return {
        ok: false,
        code: "GENERATED_PREVIEW_UNAVAILABLE",
        message: "A prévia do site gerado exige o aplicativo desktop.",
      };
    },

    async loadPublishProfile() {
      return {
        ok: false,
        code: "PUBLISH_PROFILE_UNAVAILABLE",
        message: "A configuração de publicação exige o aplicativo desktop.",
      };
    },

    async savePublishProfile() {
      return {
        ok: false,
        code: "PUBLISH_PROFILE_UNAVAILABLE",
        message: "A configuração de publicação exige o aplicativo desktop.",
      };
    },

    async testFtpConnection() {
      return {
        ok: false,
        code: "FTP_UNAVAILABLE",
        message: "O teste de FTP exige o aplicativo desktop.",
      };
    },

    async connectFtp() {
      return {
        ok: false,
        code: "FTP_UNAVAILABLE",
        message: "A conexão FTP exige o aplicativo desktop.",
      };
    },

    async listRemoteDirectory() {
      return {
        ok: false,
        code: "FTP_UNAVAILABLE",
        message: "A navegação remota exige o aplicativo desktop.",
      };
    },

    async publishGeneratedSite() {
      return {
        ok: false,
        code: "PUBLISH_UNAVAILABLE",
        message: "A publicação exige o aplicativo desktop.",
      };
    },

    async retrieveRemoteProject() {
      return {
        ok: false,
        code: "REMOTE_PROJECT_RETRIEVAL_UNAVAILABLE",
        message: "A abertura de projeto remoto exige o aplicativo desktop.",
      };
    },

    async initializeRemoteProjectSource() {
      return {
        ok: false,
        code: "REMOTE_PROJECT_SOURCE_INIT_UNAVAILABLE",
        message: "A inicialização do projeto remoto exige o aplicativo desktop.",
      };
    },

    async updateRemoteProjectSource() {
      return {
        ok: false,
        code: "REMOTE_PROJECT_SOURCE_UPDATE_UNAVAILABLE",
        message: "A atualização do projeto remoto exige o aplicativo desktop.",
      };
    },
  };
}

export function createNativeDesktopHost(nativeBridge) {
  return {
    closeProject() {
      return nativeBridge.closeProject();
    },
    selectProjectImage(directory) {
      return nativeBridge.selectProjectImage(directory.path);
    },
    readProjectImage(directory, publicPath) {
      return nativeBridge.readProjectImage(directory.path, publicPath);
    },
    readContentDataset(directory, key) {
      return nativeBridge.readContentDataset(directory.path, key);
    },
    saveContentRecord(directory, key, name, expected, value) {
      return nativeBridge.saveContentRecord(directory.path, key, name, expected, value);
    },
    async openProjectDirectory() {
      return nativeBridge.openProjectDirectory();
    },

    async pathExists(directory, relativePath) {
      return nativeBridge.pathExists(directory.path, relativePath);
    },

    async readTextFile(directory, relativePath) {
      return nativeBridge.readTextFile(directory.path, relativePath);
    },

    async readJson(directory, relativePath) {
      return JSON.parse(await this.readTextFile(directory, relativePath));
    },

    async readJsonFiles(directory, relativePath) {
      return nativeBridge.readJsonFiles(directory.path, relativePath);
    },

    async writeTextFileAtomic(directory, relativePath, content) {
      return nativeBridge.writeTextFileAtomic(
        directory.path,
        relativePath,
        content,
      );
    },

    async runProjectBuild(directory) {
      return nativeBridge.runProjectBuild(directory.path);
    },

    async previewGeneratedSite(directory) {
      return nativeBridge.previewGeneratedSite(directory.path);
    },

    async loadPublishProfile() {
      return nativeBridge.loadPublishProfile();
    },

    async savePublishProfile(profile, password) {
      return nativeBridge.savePublishProfile(profile, password);
    },

    async testFtpConnection(profile, password) {
      return nativeBridge.testFtpConnection(profile, password);
    },

    async connectFtp(profile, password) {
      return nativeBridge.connectFtp(profile, password);
    },

    async listRemoteDirectory(profile, password, remotePath) {
      return nativeBridge.listRemoteDirectory(profile, password, remotePath);
    },

    async publishGeneratedSite(directory, profile, password) {
      return nativeBridge.publishGeneratedSite(
        directory.path,
        profile,
        password,
      );
    },

    async retrieveRemoteProject(profile, password) {
      return nativeBridge.retrieveRemoteProject(profile, password);
    },

    async initializeRemoteProjectSource(directory, profile, password) {
      return nativeBridge.initializeRemoteProjectSource(
        directory.path,
        profile,
        password,
      );
    },

    async updateRemoteProjectSource(directory, profile, password) {
      return nativeBridge.updateRemoteProjectSource(
        directory.path,
        profile,
        password,
      );
    },
  };
}

export function createDesktopHost(windowRef = window) {
  if (windowRef.labfonDesktopHost) {
    return createNativeDesktopHost(windowRef.labfonDesktopHost);
  }

  return createBrowserDesktopHost(windowRef);
}

async function getFileHandle(rootHandle, relativePath) {
  const segments = relativePath.split("/").filter(Boolean);
  const fileName = segments.pop();
  let current = rootHandle;

  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }

  return current.getFileHandle(fileName);
}

async function getDirectoryHandle(rootHandle, relativePath) {
  const segments = relativePath.split("/").filter(Boolean);
  let current = rootHandle;

  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }

  return current;
}

export function createMemoryDesktopHost(filesByPath = {}, options = {}) {
  const normalizedFiles = new Map(
    Object.entries(filesByPath).map(([filePath, value]) => [
      normalizePath(filePath),
      value,
    ]),
  );
  const directory = options.directory || {
    name: "lab-fon-ufrj",
    path: "C:/lab-fon-ufrj",
  };
  const writes = [];

  return {
    async openProjectDirectory() {
      if (options.cancelled) {
        return {
          ok: false,
          cancelled: true,
          code: "PROJECT_SELECTION_CANCELLED",
          message: "Seleção de projeto cancelada.",
        };
      }

      return { ok: true, directory };
    },

    async pathExists(_directory, relativePath) {
      const normalizedPath = normalizePath(relativePath);
      return (
        normalizedFiles.has(normalizedPath) ||
        Array.from(normalizedFiles.keys()).some((filePath) =>
          filePath.startsWith(`${normalizedPath}/`),
        )
      );
    },

    async readTextFile(_directory, relativePath) {
      const normalizedPath = normalizePath(relativePath);
      if (!normalizedFiles.has(normalizedPath)) {
        throw new Error(`Arquivo não encontrado: ${relativePath}`);
      }

      return normalizedFiles.get(normalizedPath);
    },

    async readJson(directoryRef, relativePath) {
      return JSON.parse(await this.readTextFile(directoryRef, relativePath));
    },

    async readJsonFiles(_directory, relativePath) {
      const normalizedDirectory = normalizePath(relativePath);
      return Array.from(normalizedFiles.entries())
        .filter(([filePath]) => {
          const normalizedFile = normalizePath(filePath);
          return (
            normalizedFile.startsWith(`${normalizedDirectory}/`) &&
            normalizedFile.endsWith(".json") &&
            normalizedFile
              .slice(normalizedDirectory.length + 1)
              .indexOf("/") === -1
          );
        })
        .sort(([fileA], [fileB]) => fileA.localeCompare(fileB))
        .map(([, value]) => JSON.parse(value));
    },

    async writeTextFileAtomic(_directory, relativePath, content) {
      if (options.failWrite) {
        throw new Error("Falha simulada de escrita");
      }

      const normalizedPath = normalizePath(relativePath);
      writes.push({
        path: normalizedPath,
        content,
      });
      normalizedFiles.set(
        normalizedPath,
        options.corruptAfterWrite ? "{malformed" : content,
      );
    },

    async runProjectBuild(_directory) {
      if (typeof options.runProjectBuild === "function") {
        return options.runProjectBuild();
      }

      return {
        ok: false,
        code: "BUILD_UNAVAILABLE",
        message: "Geração indisponível no host de teste.",
      };
    },

    async previewGeneratedSite(_directory) {
      if (typeof options.previewGeneratedSite === "function") {
        return options.previewGeneratedSite();
      }

      return {
        ok: false,
        code: "GENERATED_PREVIEW_UNAVAILABLE",
        message: "Prévia indisponível no host de teste.",
      };
    },

    async loadPublishProfile() {
      if (typeof options.loadPublishProfile === "function") {
        return options.loadPublishProfile();
      }

      return {
        ok: true,
        profile: options.publishProfile || null,
      };
    },

    async savePublishProfile(profile, password) {
      if (typeof options.savePublishProfile === "function") {
        return options.savePublishProfile(profile, password);
      }

      return {
        ok: true,
        profile: {
          ...profile,
          hasPassword: Boolean(password || profile.hasPassword),
        },
      };
    },

    async testFtpConnection(profile, password) {
      if (typeof options.testFtpConnection === "function") {
        return options.testFtpConnection(profile, password);
      }

      return {
        ok: true,
        code: "FTP_READY",
        message: "Connection successful.",
        summary: {
          remotePublishPath: profile.remotePublishPath || profile.remotePath,
          remoteSourcePath: profile.remoteSourcePath || profile.remotePath,
          publishFileCount: 1,
          sourceFileCount: 1,
          indexHtmlPresent: true,
          sourceReady: true,
        },
      };
    },

    async connectFtp(profile, password) {
      if (typeof options.connectFtp === "function") {
        return options.connectFtp(profile, password);
      }

      return {
        ok: true,
        code: "FTP_CONNECTED",
        message: "Conexão estabelecida.",
      };
    },

    async listRemoteDirectory(profile, password, remotePath) {
      if (typeof options.listRemoteDirectory === "function") {
        return options.listRemoteDirectory(profile, password, remotePath);
      }

      return {
        ok: true,
        code: "FTP_LISTING_READY",
        path: remotePath || "/",
        entries: [],
      };
    },

    async publishGeneratedSite(directoryRef, profile, password) {
      if (typeof options.publishGeneratedSite === "function") {
        return options.publishGeneratedSite(directoryRef, profile, password);
      }

      return {
        ok: true,
        code: "PUBLISH_SUCCEEDED",
        message: "Site published successfully.",
        manifest: {
          files: [],
        },
      };
    },

    async retrieveRemoteProject(profile, password) {
      if (typeof options.retrieveRemoteProject === "function") {
        return options.retrieveRemoteProject(profile, password);
      }

      return {
        ok: false,
        code: "REMOTE_PROJECT_NOT_INITIALIZED",
        message:
          "O servidor foi acessado, mas ainda não existe um projeto editável remoto configurado.",
      };
    },

    async initializeRemoteProjectSource(directoryRef, profile, password) {
      if (typeof options.initializeRemoteProjectSource === "function") {
        return options.initializeRemoteProjectSource(directoryRef, profile, password);
      }

      return {
        ok: false,
        code: "REMOTE_PROJECT_SOURCE_INIT_UNAVAILABLE",
        message: "A inicialização do projeto remoto exige o aplicativo desktop.",
      };
    },

    async updateRemoteProjectSource(directoryRef, profile, password) {
      if (typeof options.updateRemoteProjectSource === "function") {
        return options.updateRemoteProjectSource(directoryRef, profile, password);
      }

      return {
        ok: false,
        code: "REMOTE_PROJECT_SOURCE_UPDATE_UNAVAILABLE",
        message: "A atualização do projeto remoto exige o aplicativo desktop.",
      };
    },

    getWrites() {
      return [...writes];
    },

    getText(relativePath) {
      return normalizedFiles.get(normalizePath(relativePath));
    },
  };
}

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\/+/, "");
}

const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const ftp = require("basic-ftp");
const { readContentDataset, saveContentRecord, readContentDeletions } = require("./content-store.cjs");
const { Writable } = require("node:stream");
const { isDeepStrictEqual } = require("node:util");

const isDev = process.env.LABFON_EDITOR_DEV === "true";
const REQUIRED_BUILD_ARTIFACTS = ["dist/index.html", "dist/data.json"];
const GENERATED_SITE_BASE_PATH = "/labfonac/";
const PROFILE_FILE = "publish-profile.json";
const PASSWORD_FILE = "publish-password.bin";
const CRITICAL_REMOTE_FILES = ["index.html", "data.json"];
let generatedPreviewServer = null;
let appServices = {
  app: null,
  safeStorage: null,
  createFtpClient: null,
};

const EDITABLE_PROJECT_BUNDLE = [
  "content",
  "scripts",
  "src",
  "package.json",
  "package-lock.json",
  "index.html",
  "editor.html",
  "vite.config.js",
];
const SOURCE_PROTECTION_METADATA = new Set([".htaccess", ".ftpquota"]);
const STATIC_PROJECT_ASSETS = ["public/assets", "public/publication_references.json"];

function createWindow({ BrowserWindow }) {
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    window.loadURL("http://127.0.0.1:3000/editor.html");
    return;
  }

  window.loadFile(path.join(__dirname, "..", "dist", "editor.html"));
}

async function pathExists(_event, rootPath, relativePath) {
  try {
    await fs.access(resolveProjectPath(rootPath, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(_event, rootPath, relativePath) {
  return fs.readFile(resolveProjectPath(rootPath, relativePath), "utf8");
}

async function readJsonFiles(_event, rootPath, relativePath) {
  const directoryPath = resolveProjectPath(rootPath, relativePath);
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    jsonFiles.map(async (fileName) => {
      const content = await fs.readFile(path.join(directoryPath, fileName), "utf8");
      return JSON.parse(content);
    }),
  );
}

async function writeTextFileAtomic(_event, rootPath, relativePath, content) {
  const targetPath = resolveProjectPath(rootPath, relativePath);
  const directoryPath = path.dirname(targetPath);
  const temporaryPath = path.join(
    directoryPath,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await fs.writeFile(temporaryPath, content, "utf8");
  await fs.rename(temporaryPath, targetPath);
}

async function runProjectBuild(_event, rootPath) {
  const projectRoot = path.resolve(rootPath);

  if (!(await pathExists(null, projectRoot, "package.json"))) {
    return {
      ok: false,
      code: "BUILD_UNAVAILABLE",
      message: "Não foi possível encontrar package.json no projeto aberto.",
    };
  }

  const command = "npm";
  let dependencyResult = { ok: true, command: "dependency check", output: "" };
  let buildResult = await runApprovedBuildCommand(command, projectRoot);

  if (!buildResult.ok && isMissingLocalVite(buildResult.output)) {
    dependencyResult = await ensureProjectDependencies(command, projectRoot);
    if (!dependencyResult.ok) {
      return dependencyResult;
    }
    buildResult = await runApprovedBuildCommand(command, projectRoot);
  }

  if (!buildResult.ok) {
    return buildResult;
  }

  const validation = await validateGeneratedSite(projectRoot);
  if (!validation.ok) {
    return {
      ...validation,
      command: buildResult.command,
      output: buildResult.output,
    };
  }

  return {
    ok: true,
    code: "BUILD_SUCCEEDED",
    message: "Site generated successfully.",
    command: buildResult.command,
    output: `${dependencyResult.output || ""}${buildResult.output}`,
    artifacts: validation.artifacts,
  };
}

async function ensureProjectDependencies(command, projectRoot) {
  if (!(await pathExists(null, projectRoot, "package-lock.json"))) {
    return {
      ok: false,
      code: "BUILD_DEPENDENCIES_UNAVAILABLE",
      message:
        "Não foi possível preparar a geração: package-lock.json não foi encontrado no projeto aberto.",
      command: "npm ci",
      output: "",
    };
  }

  const installResult = await runNpmCommand(command, ["ci"], projectRoot);
  if (!installResult.ok) {
    return {
      ...installResult,
      code: "BUILD_DEPENDENCIES_FAILED",
      message: "Não foi possível instalar as dependências do projeto aberto.",
    };
  }

  return installResult;
}

function isMissingLocalVite(output) {
  const lower = String(output || "").toLowerCase();
  return (
    lower.includes("vite") &&
    (lower.includes("not recognized") ||
      lower.includes("não é reconhecido") ||
      lower.includes("reconhecido") ||
      lower.includes("not found"))
  );
}

function runApprovedBuildCommand(command, projectRoot) {
  return runNpmCommand(command, ["run", "build"], projectRoot);
}

function runNpmCommand(command, args, projectRoot) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: process.platform === "win32",
      windowsHide: true,
      env: process.env,
    });
    let output = "";
    const commandLabel = [command, ...args].join(" ");

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: "BUILD_UNAVAILABLE",
        message: `Não foi possível iniciar a geração do site: ${error.message}`,
        command: commandLabel,
        output,
      });
    });
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({
          ok: true,
          command: commandLabel,
          output,
        });
        return;
      }

      resolve({
        ok: false,
        code: "BUILD_COMMAND_FAILED",
        message: `Site generation failed. Código de saída: ${exitCode}.`,
        command: commandLabel,
        exitCode,
        output,
      });
    });
  });
}

async function validateGeneratedSite(rootPath) {
  const missing = [];

  for (const artifact of REQUIRED_BUILD_ARTIFACTS) {
    if (!(await pathExists(null, rootPath, artifact))) {
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

  try {
    const data = JSON.parse(await readTextFile(null, rootPath, "dist/data.json"));
    if (!Array.isArray(data.page?.sections)) {
      return {
        ok: false,
        code: "BUILD_ARTIFACT_INVALID",
        message: "dist/data.json não contém a composição da página.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: `dist/data.json não pôde ser validado: ${getErrorMessage(error)}`,
    };
  }

  return {
    ok: true,
    artifacts: [...REQUIRED_BUILD_ARTIFACTS],
  };
}

async function previewGeneratedSite(_event, rootPath) {
  const validation = await validateGeneratedSite(rootPath);
  if (!validation.ok) {
    return validation;
  }

  await stopGeneratedPreviewServer();

  const distPath = resolveProjectPath(rootPath, "dist");
  generatedPreviewServer = http.createServer((request, response) => {
    serveStaticDistFile(distPath, request, response);
  });

  return new Promise((resolve) => {
    generatedPreviewServer.once("error", (error) => {
      generatedPreviewServer = null;
      resolve({
        ok: false,
        code: "GENERATED_PREVIEW_FAILED",
        message: `Não foi possível abrir a prévia local: ${error.message}`,
      });
    });

    generatedPreviewServer.listen(0, "127.0.0.1", () => {
      const { port } = generatedPreviewServer.address();
      resolve({
        ok: true,
        code: "GENERATED_PREVIEW_READY",
        message: "Prévia local do site gerado pronta.",
        url: `http://127.0.0.1:${port}${GENERATED_SITE_BASE_PATH}`,
      });
    });
  });
}

function serveStaticDistFile(distPath, request, response) {
  const requestedPath = new URL(request.url, "http://127.0.0.1").pathname;
  const basePath = GENERATED_SITE_BASE_PATH.replace(/\/+$/, "");
  let effectivePath = requestedPath;

  if (effectivePath === basePath) {
    response.writeHead(302, { Location: `${basePath}/` });
    response.end();
    return;
  }

  if (effectivePath.startsWith(`${basePath}/`)) {
    effectivePath = effectivePath.slice(basePath.length) || "/";
  }

  const relativePath =
    effectivePath === "/" ? "index.html" : decodeURIComponent(effectivePath.slice(1));
  const targetPath = path.resolve(distPath, relativePath);

  if (targetPath !== distPath && !targetPath.startsWith(`${distPath}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fsSync.readFile(targetPath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": getContentType(targetPath),
    });
    response.end(content);
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function stopGeneratedPreviewServer() {
  return new Promise((resolve) => {
    if (!generatedPreviewServer) {
      resolve();
      return;
    }

    generatedPreviewServer.close(() => {
      generatedPreviewServer = null;
      resolve();
    });
  });
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "erro desconhecido";
}

function resolveProjectPath(rootPath, relativePath) {
  const root = path.resolve(rootPath);
  const resolved = path.resolve(root, relativePath);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Caminho fora do projeto: ${relativePath}`);
  }

  return resolved;
}

async function openProjectDirectory({ dialog }) {
  const result = await dialog.showOpenDialog({
    title: "Abrir projeto Labfonac",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      ok: false,
      cancelled: true,
      code: "PROJECT_SELECTION_CANCELLED",
      message: "Seleção de projeto cancelada.",
    };
  }

  const selectedPath = result.filePaths[0];
  return {
    ok: true,
    directory: {
      name: path.basename(selectedPath),
      path: selectedPath,
    },
  };
}

function configureAppServices(services) {
  appServices = {
    ...appServices,
    ...services,
  };
}

async function loadPublishProfile() {
  const profile = await readStoredProfile();

  return {
    ok: true,
    profile: profile
      ? {
          ...profile,
          hasPassword: await hasStoredPassword(),
        }
      : null,
  };
}

async function savePublishProfile(_event, profile, password) {
  const sanitized = sanitizeProfile(profile);
  await fs.mkdir(getPublishStorageDirectory(), { recursive: true });
  await fs.writeFile(
    getProfilePath(),
    `${JSON.stringify(sanitized, null, 2)}\n`,
    "utf8",
  );

  if (password) {
    const passwordResult = await savePublishPassword(password);
    if (!passwordResult.ok) {
      return passwordResult;
    }
  }

  return {
    ok: true,
    profile: {
      ...sanitized,
      hasPassword: Boolean(password || (await hasStoredPassword())),
    },
  };
}

async function testFtpConnection(_event, profile, password) {
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    await client.cd(sanitized.remotePublishPath);
    const publishEntries = await client.list();
    let sourceReady = true;
    let sourceEntries = [];

    try {
      await client.cd(sanitized.remoteSourcePath);
      sourceEntries = await client.list();
    } catch {
      sourceReady = false;
    }

    return {
      ok: true,
      code: sourceReady ? "FTP_READY" : "REMOTE_PROJECT_NOT_INITIALIZED",
      message: sourceReady
        ? "Connection successful."
        : "O servidor foi acessado, mas ainda não existe um projeto editável remoto configurado.",
      summary: {
        remotePublishPath: sanitized.remotePublishPath,
        remoteSourcePath: sanitized.remoteSourcePath,
        publishFileCount: publishEntries.length,
        sourceFileCount: sourceEntries.length,
        indexHtmlPresent: publishEntries.some((entry) => entry.name === "index.html"),
        sourceReady,
      },
    };
  } catch (error) {
    return classifyFtpError(error);
  } finally {
    client.close();
  }
}

async function connectFtp(_event, profile, password) {
  const sanitized = sanitizeProfile(profile);
  const profileError = validateConnectionProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    return {
      ok: true,
      code: "FTP_CONNECTED",
      message: "Conexão estabelecida.",
    };
  } catch (error) {
    return classifyFtpError(error);
  } finally {
    client.close();
  }
}

async function listRemoteDirectory(_event, profile, password, remotePath) {
  const sanitized = sanitizeProfile(profile);
  const profileError = validateConnectionProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const targetPath = normalizeRemotePath(remotePath) || "/";

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    await client.cd(targetPath);
    const rawEntries = await client.list();

    return {
      ok: true,
      code: "FTP_LISTING_READY",
      message: "Listagem obtida.",
      path: targetPath,
      entries: rawEntries
        .map((entry) => ({
          name: entry.name,
          type: entry.isDirectory ? "directory" : "file",
          size: entry.size,
        }))
        .sort((left, right) => {
          if (left.type !== right.type) {
            return left.type === "directory" ? -1 : 1;
          }
          return left.name.localeCompare(right.name);
        }),
    };
  } catch (error) {
    return classifyFtpError(error);
  } finally {
    client.close();
  }
}

async function publishGeneratedSite(_event, rootPath, profile, password) {
  const projectRoot = path.resolve(rootPath);
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) {
    return {
      ...profileError,
      stage: "not_started",
    };
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "PUBLISH_AUTHENTICATION_MISSING",
      stage: "not_started",
      message: "Senha FTP não configurada.",
    };
  }

  const buildValidation = await validateGeneratedSite(projectRoot);
  if (!buildValidation.ok) {
    return {
      ok: false,
      code: "PUBLISH_LOCAL_BUILD_INVALID",
      stage: "not_started",
      message: buildValidation.message,
    };
  }

  let manifest;
  try {
    manifest = await createPublicationManifest(projectRoot, sanitized);
  } catch (error) {
    return {
      ok: false,
      code: "PUBLISH_MANIFEST_FAILED",
      stage: "not_started",
      message: `Não foi possível criar o manifesto local de publicação: ${getErrorMessage(error)}`,
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });
    await client.cd(sanitized.remotePublishPath);

    for (const file of orderFilesForPublication(manifest.files)) {
      const remotePath = joinRemotePath(sanitized.remotePublishPath, file.remotePath);
      const remoteDir = path.posix.dirname(remotePath);
      if (remoteDir && remoteDir !== "." && remoteDir !== sanitized.remotePublishPath) {
        await client.ensureDir(remoteDir);
      }
      await client.uploadFrom(file.localPath, remotePath);
      file.status = "uploaded";
    }

    for (const criticalFile of CRITICAL_REMOTE_FILES) {
      const expected = manifest.files.find(
        (file) => file.remotePath === criticalFile,
      );
      if (!expected) {
        continue;
      }

      const remoteSize = await getRemoteSize(client, sanitized.remotePublishPath, criticalFile);
      if (remoteSize !== expected.size) {
        throw new Error(
          `Remote verification failed for ${criticalFile}: expected ${expected.size}, got ${remoteSize}`,
        );
      }
    }

    manifest.status = "success";
    manifest.finishedAt = new Date().toISOString();
    await writePublicationManifest(manifest);

    return {
      ok: true,
      code: "PUBLISH_SUCCEEDED",
      stage: "success",
      message: "Site published successfully.",
      manifest: summarizeManifest(manifest),
    };
  } catch (error) {
    const uploaded = manifest.files.filter((file) => file.status === "uploaded");
    manifest.status = uploaded.length > 0 ? "failed_during_transfer" : "failed_before_mutation";
    manifest.finishedAt = new Date().toISOString();
    manifest.error = {
      message: sanitizeErrorMessage(getErrorMessage(error)),
    };
    await writePublicationManifest(manifest);

    return {
      ok: false,
      code: manifest.status === "failed_before_mutation"
        ? "PUBLISH_FAILED_BEFORE_MUTATION"
        : getErrorMessage(error).toLowerCase().includes("verification")
          ? "PUBLISH_VERIFICATION_FAILED"
          : "PUBLISH_TRANSFER_FAILED",
      stage: manifest.status,
      message: "Publication failed. The local manifest was preserved for diagnosis.",
      manifest: summarizeManifest(manifest),
    };
  } finally {
    client.close();
  }
}

async function retrieveRemoteProject(_event, profile, password) {
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  const workspacesRoot = getWorkspacesDirectory();
  const temporaryWorkspace = path.join(workspacesRoot, `retrieving-${Date.now()}`);
  const activeWorkspace = path.join(workspacesRoot, "current");
  const previousWorkspace = path.join(workspacesRoot, "previous");

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    try {
      await client.cd(sanitized.remoteSourcePath);
      await client.list();
    } catch {
      return {
        ok: false,
        code: "REMOTE_PROJECT_NOT_INITIALIZED",
        message:
          "O servidor foi acessado, mas ainda não existe um projeto editável remoto configurado.",
      };
    }

    await fs.rm(temporaryWorkspace, { recursive: true, force: true });
    await fs.mkdir(temporaryWorkspace, { recursive: true });

    for (const bundlePath of EDITABLE_PROJECT_BUNDLE) {
      const remotePath = joinRemotePath(sanitized.remoteSourcePath, bundlePath);
      const localPath = path.join(temporaryWorkspace, bundlePath);
      if (path.extname(bundlePath)) {
        await client.downloadTo(localPath, remotePath);
      } else {
        await client.downloadToDir(localPath, remotePath);
      }
    }

    const sourceEntries = await client.list(sanitized.remoteSourcePath);
    if (sourceEntries.some((entry) => entry.name === "public")) {
      const publicEntries = await client.list(joinRemotePath(sanitized.remoteSourcePath, "public"));
      for (const assetPath of STATIC_PROJECT_ASSETS) {
        if (!publicEntries.some((entry) => entry.name === path.posix.basename(assetPath))) continue;
        const localPath = path.join(temporaryWorkspace, assetPath);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        const remotePath = joinRemotePath(sanitized.remoteSourcePath, assetPath);
        if (path.extname(assetPath)) await client.downloadTo(localPath, remotePath);
        else await client.downloadToDir(localPath, remotePath);
      }
    }

    const validation = await validateLocalEditableProject(temporaryWorkspace);
    if (!validation.ok) {
      await fs.rm(temporaryWorkspace, { recursive: true, force: true });
      return validation;
    }

    await fs.rm(previousWorkspace, { recursive: true, force: true });
    try {
      await fs.rename(activeWorkspace, previousWorkspace);
    } catch {
      // No previous active workspace exists.
    }
    await fs.rename(temporaryWorkspace, activeWorkspace);

    const provenance = {
      source: "remote-ftp",
      remoteSourcePath: sanitized.remoteSourcePath,
      remotePublishPath: sanitized.remotePublishPath,
      retrievedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(activeWorkspace, ".labfon-workspace.json"),
      `${JSON.stringify(provenance, null, 2)}\n`,
      "utf8",
    );

    return {
      ok: true,
      code: "REMOTE_PROJECT_RETRIEVED",
      message: "Projeto remoto carregado.",
      directory: {
        name: "Labfonac remoto",
        path: activeWorkspace,
        provenance,
      },
    };
  } catch (error) {
    await fs.rm(temporaryWorkspace, { recursive: true, force: true });
    return {
      ok: false,
      code: "REMOTE_PROJECT_RETRIEVAL_FAILED",
      message: `Não foi possível abrir o projeto remoto: ${sanitizeErrorMessage(getErrorMessage(error))}`,
    };
  } finally {
    client.close();
  }
}

async function initializeRemoteProjectSource(_event, rootPath, profile, password) {
  const projectRoot = path.resolve(rootPath);
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const localValidation = await validateLocalEditableProject(projectRoot);
  if (!localValidation.ok) {
    return localValidation;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    const existingEntries = await listRemotePath(client, sanitized.remoteSourcePath);
    const markerStatus = await verifyRemoteEditableProject(client, sanitized.remoteSourcePath);
    if (markerStatus.ok) {
      return {
        ok: true,
        code: "REMOTE_PROJECT_SOURCE_ALREADY_INITIALIZED",
        message: "O projeto editável remoto já está inicializado.",
        markers: markerStatus.markers,
      };
    }

    const unexpectedEntries = existingEntries.filter(
      (entry) => !SOURCE_PROTECTION_METADATA.has(entry.name),
    );
    if (unexpectedEntries.length > 0) {
      return {
        ok: false,
        code: "REMOTE_PROJECT_SOURCE_NOT_EMPTY",
        message:
          "A pasta remota do projeto editável contém arquivos inesperados. A inicialização foi interrompida.",
        entries: unexpectedEntries.map((entry) => ({
          name: entry.name,
          type: entry.isDirectory ? "directory" : "file",
        })),
      };
    }

    await uploadEditableProjectBundle(client, projectRoot, sanitized.remoteSourcePath);
    const verification = await verifyRemoteEditableProject(
      client,
      sanitized.remoteSourcePath,
    );
    if (!verification.ok) {
      return verification;
    }

    return {
      ok: true,
      code: "REMOTE_PROJECT_SOURCE_INITIALIZED",
      message: "Projeto editável remoto inicializado.",
      markers: verification.markers,
    };
  } catch (error) {
    return classifyFtpError(error);
  } finally {
    client.close();
  }
}

async function updateRemoteProjectSource(_event, rootPath, profile, password) {
  const projectRoot = path.resolve(rootPath);
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) {
    return profileError;
  }
  const localValidation = await validateLocalEditableProject(projectRoot);
  if (!localValidation.ok) {
    return localValidation;
  }
  const secret = password || (await loadPublishPassword());

  if (!secret) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Senha FTP não configurada.",
    };
  }

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });

    const remoteValidation = await verifyRemoteEditableProject(
      client,
      sanitized.remoteSourcePath,
    );
    if (!remoteValidation.ok) {
      return remoteValidation;
    }

    const deletions = await verifyContentDeletions(client, projectRoot, sanitized.remoteSourcePath);
    await uploadEditableProjectBundle(client, projectRoot, sanitized.remoteSourcePath);
    const verification = await verifyRemoteEditableProject(
      client,
      sanitized.remoteSourcePath,
    );
    if (!verification.ok) {
      return verification;
    }

    for (const deletion of deletions) {
      if (deletion.exists) {
        await client.remove(deletion.remotePath);
        const remaining = await client.list(path.posix.dirname(deletion.remotePath));
        if (remaining.some((entry) => entry.name === path.posix.basename(deletion.remotePath))) {
          throw new Error("Não foi possível verificar a remoção do registro remoto.");
        }
      }
      await fs.unlink(deletion.ledgerPath);
    }

    return {
      ok: true,
      code: "REMOTE_PROJECT_SOURCE_UPDATED",
      message: "Projeto editável remoto atualizado.",
      markers: verification.markers,
    };
  } catch (error) {
    return classifyFtpError(error);
  } finally {
    client.close();
  }
}

async function verifyContentDeletions(client, projectRoot, remoteSourcePath) {
  const deletions = await readContentDeletions(projectRoot);
  for (const deletion of deletions) {
    if (await pathExists(null, projectRoot, deletion.relativePath)) {
      throw new Error("O registro removido foi recriado localmente. Reabra o conteúdo antes de sincronizar.");
    }
    deletion.remotePath = joinRemotePath(remoteSourcePath, deletion.relativePath);
    const entries = await client.list(path.posix.dirname(deletion.remotePath));
    deletion.exists = entries.some((entry) => entry.name === path.posix.basename(deletion.remotePath));
    if (!deletion.exists) continue;
    const chunks = [];
    await client.downloadTo(new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } }), deletion.remotePath);
    const current = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!isDeepStrictEqual(current, deletion.value)) {
      throw new Error(`O registro remoto mudou e não foi removido: ${deletion.relativePath}`);
    }
  }
  return deletions;
}

async function validateLocalEditableProject(rootPath) {
  const required = [
    "package.json",
    "package-lock.json",
    "content/page.json",
    "content/site.json",
    "scripts/build-data.js",
  ];

  for (const marker of required) {
    if (!(await pathExists(null, rootPath, marker))) {
      return {
        ok: false,
        code: "REMOTE_PROJECT_INCOMPLETE",
        message: `O projeto editável remoto está incompleto: ${marker} ausente.`,
      };
    }
  }

  try {
    JSON.parse(await readTextFile(null, rootPath, "content/page.json"));
    JSON.parse(await readTextFile(null, rootPath, "content/site.json"));
  } catch (error) {
    return {
      ok: false,
      code: "REMOTE_PROJECT_MALFORMED",
      message: `O projeto editável remoto contém JSON inválido: ${getErrorMessage(error)}`,
    };
  }

  return { ok: true };
}

async function listRemotePath(client, remotePath) {
  return client.list(remotePath);
}

async function verifyRemoteEditableProject(client, remoteSourcePath) {
  const requiredMarkers = [
    "package.json",
    "content/page.json",
    "content/site.json",
    "scripts/build-data.js",
    "src/js/main.js",
    "index.html",
    "editor.html",
    "vite.config.js",
  ];
  const markers = [];

  for (const marker of requiredMarkers) {
    try {
      const markerPath = joinRemotePath(remoteSourcePath, marker);
      const directoryPath = path.posix.dirname(markerPath);
      const fileName = path.posix.basename(markerPath);
      const entries = await client.list(directoryPath);
      if (!entries.some((entry) => entry.name === fileName)) {
        return {
          ok: false,
          code: "REMOTE_PROJECT_INCOMPLETE",
          message: `O projeto remoto não contém ${marker}.`,
          markers,
        };
      }
      markers.push(marker);
    } catch {
      return {
        ok: false,
        code: "REMOTE_PROJECT_INCOMPLETE",
        message: `O projeto remoto não contém ${marker}.`,
        markers,
      };
    }
  }

  return { ok: true, markers };
}

async function uploadEditableProjectBundle(client, projectRoot, remoteSourcePath) {
  const files = await listEditableProjectBundleFiles(projectRoot);

  for (const file of files) {
    const remotePath = joinRemotePath(remoteSourcePath, file.relativePath);
    const remoteDir = path.posix.dirname(remotePath);
    if (remoteDir && remoteDir !== ".") {
      await client.ensureDir(remoteDir);
    }
    await client.uploadFrom(file.localPath, remotePath);
  }
}

async function listEditableProjectBundleFiles(projectRoot) {
  const files = [];

  for (const bundlePath of [...EDITABLE_PROJECT_BUNDLE, ...STATIC_PROJECT_ASSETS]) {
    const localPath = path.join(projectRoot, bundlePath);
    if (STATIC_PROJECT_ASSETS.includes(bundlePath) && !(await pathExists(null, projectRoot, bundlePath))) continue;
    const stat = await fs.stat(localPath);

    if (stat.isDirectory()) {
      await collectDirectoryFiles(projectRoot, localPath, files);
      continue;
    }

    files.push({
      localPath,
      relativePath: bundlePath.replaceAll(path.sep, "/"),
    });
  }

  return files;
}

async function collectDirectoryFiles(projectRoot, directoryPath, files) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await collectDirectoryFiles(projectRoot, entryPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push({
        localPath: entryPath,
        relativePath: path.relative(projectRoot, entryPath).replaceAll(path.sep, "/"),
      });
    }
  }
}

async function createPublicationManifest(projectRoot, profile) {
  const files = await listDistFiles(projectRoot);
  const now = new Date().toISOString();
  const manifest = {
    version: 1,
    createdAt: now,
    finishedAt: null,
    projectRoot,
    build: {
      distPath: resolveProjectPath(projectRoot, "dist"),
    },
    remoteRoot: profile.remotePublishPath,
    status: "not_started",
    files,
  };

  manifest.manifestPath = getManifestPath(now);
  await writePublicationManifest(manifest);
  return manifest;
}

async function listDistFiles(projectRoot) {
  const distRoot = resolveProjectPath(projectRoot, "dist");
  const files = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;

      const relativePath = path
        .relative(distRoot, absolutePath)
        .replaceAll(path.sep, "/");
      validateSafeRelativePath(relativePath);
      const stats = await fs.stat(absolutePath);
      files.push({
        localPath: absolutePath,
        relativePath,
        remotePath: relativePath,
        size: stats.size,
        status: "pending",
      });
    }
  }

  await walk(distRoot);
  return files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function orderFilesForPublication(files) {
  return [...files].sort((left, right) => {
    if (left.remotePath === "index.html") return 1;
    if (right.remotePath === "index.html") return -1;
    return left.remotePath.localeCompare(right.remotePath);
  });
}

function validateSafeRelativePath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe generated path: ${relativePath}`);
  }
}

function joinRemotePath(remoteRoot, relativePath) {
  validateSafeRelativePath(relativePath);
  const normalizedRoot = normalizeRemotePath(remoteRoot);
  const joined = path.posix.normalize(
    path.posix.join(normalizedRoot, relativePath),
  );

  if (normalizedRoot === "/") {
    return joined.startsWith("/") ? joined : `/${joined}`;
  }

  if (joined !== normalizedRoot && !joined.startsWith(`${normalizedRoot}/`)) {
    throw new Error(`Remote path outside publication root: ${relativePath}`);
  }

  return joined;
}

async function getRemoteSize(client, remoteRoot, relativePath) {
  const remotePath = joinRemotePath(remoteRoot, relativePath);
  if (typeof client.size === "function") {
    return client.size(remotePath);
  }

  const remoteDir = path.posix.dirname(remotePath);
  const basename = path.posix.basename(remotePath);
  const entries = await client.list(remoteDir);
  const entry = entries.find((item) => item.name === basename);
  if (!entry) {
    throw new Error(`Remote verification failed for ${relativePath}: missing`);
  }
  return entry.size;
}

async function writePublicationManifest(manifest) {
  await fs.mkdir(path.dirname(manifest.manifestPath), { recursive: true });
  const safeManifest = {
    ...manifest,
    files: manifest.files.map(({ localPath, ...file }) => file),
  };
  await fs.writeFile(
    manifest.manifestPath,
    `${JSON.stringify(safeManifest, null, 2)}\n`,
    "utf8",
  );
}

function getManifestPath(timestamp) {
  const safeTimestamp = timestamp.replaceAll(":", "-").replaceAll(".", "-");
  return path.join(
    getPublishStorageDirectory(),
    "manifests",
    `publish-${safeTimestamp}.json`,
  );
}

function summarizeManifest(manifest) {
  return {
    manifestPath: manifest.manifestPath,
    status: manifest.status,
    fileCount: manifest.files.length,
    uploadedCount: manifest.files.filter((file) => file.status === "uploaded")
      .length,
    remoteRoot: manifest.remoteRoot,
  };
}

function sanitizeErrorMessage(message) {
  return String(message || "").replace(/password=[^\s]+/gi, "password=[redacted]");
}

function sanitizeProfile(profile = {}) {
  const legacyPath = profile.remotePath || "";
  return {
    host: String(profile.host || "").trim(),
    port: normalizePort(profile.port),
    username: String(profile.username || "").trim(),
    remoteSourcePath: normalizeRemotePath(profile.remoteSourcePath || legacyPath),
    remotePublishPath: normalizeRemotePath(
      profile.remotePublishPath || legacyPath || "/",
    ),
    secure: profile.secure !== false,
    passiveMode: profile.passiveMode !== false,
  };
}

function validateNativeProfile(profile) {
  if (
    !profile.host ||
    !profile.username ||
    !profile.remoteSourcePath ||
    !profile.remotePublishPath ||
    profile.remoteSourcePath.split("/").includes("..") ||
    profile.remotePublishPath.split("/").includes("..") ||
    profile.remoteSourcePath === profile.remotePublishPath
  ) {
    return {
      ok: false,
      code: "PUBLISH_PROFILE_INVALID",
      message: "Configuração FTP inválida.",
    };
  }

  return null;
}

function validateConnectionProfile(profile) {
  if (!profile.host || !profile.username) {
    return {
      ok: false,
      code: "PUBLISH_PROFILE_INVALID",
      message: "Preencha servidor e usuário para conectar.",
    };
  }

  return null;
}

function normalizePort(value) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : 2100;
}

function normalizeRemotePath(value) {
  const normalized = String(value || "").trim().replaceAll("\\", "/");
  if (!normalized) return "";
  const compact = normalized.replace(/\/+/g, "/");
  return compact === "/" ? "/" : compact.replace(/\/+$/, "");
}

async function readStoredProfile() {
  try {
    return JSON.parse(await fs.readFile(getProfilePath(), "utf8"));
  } catch {
    return null;
  }
}

async function savePublishPassword(password) {
  const safeStorage = appServices.safeStorage;

  if (!safeStorage?.isEncryptionAvailable()) {
    return {
      ok: false,
      code: "PUBLISH_CREDENTIAL_STORAGE_UNAVAILABLE",
      message: "Armazenamento seguro de credenciais indisponível.",
    };
  }

  const encrypted = safeStorage.encryptString(password);
  await fs.writeFile(getPasswordPath(), encrypted);
  return { ok: true };
}

async function loadPublishPassword() {
  const safeStorage = appServices.safeStorage;

  if (!safeStorage?.isEncryptionAvailable()) {
    return "";
  }

  try {
    const encrypted = await fs.readFile(getPasswordPath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return "";
  }
}

async function hasStoredPassword() {
  try {
    await fs.access(getPasswordPath());
    return true;
  } catch {
    return false;
  }
}

function getPublishStorageDirectory() {
  if (appServices.app) {
    return path.join(appServices.app.getPath("userData"), "publish");
  }

  return path.join(process.cwd(), "tmp", "publish-test-storage");
}

function getWorkspacesDirectory() {
  if (appServices.app) {
    return path.join(appServices.app.getPath("userData"), "workspaces", "lab-fon");
  }

  return path.join(process.cwd(), "tmp", "workspaces", "lab-fon");
}

function getProfilePath() {
  return path.join(getPublishStorageDirectory(), PROFILE_FILE);
}

function getPasswordPath() {
  return path.join(getPublishStorageDirectory(), PASSWORD_FILE);
}

function classifyFtpError(error) {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("530") || lower.includes("login") || lower.includes("auth")) {
    return {
      ok: false,
      code: "FTP_AUTHENTICATION_FAILED",
      message: "Falha de autenticação FTP.",
    };
  }

  if (
    lower.includes("tls") ||
    lower.includes("secure") ||
    lower.includes("certificate") ||
    lower.includes("ssl") ||
    lower.includes("econnreset")
  ) {
    return {
      ok: false,
      code: "FTP_TLS_FAILED",
      message: `Falha na negociação de segurança FTP/TLS: ${sanitizeErrorMessage(message)}`,
    };
  }

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return {
      ok: false,
      code: "FTP_TIMEOUT",
      message: `Tempo esgotado ao conectar ao servidor FTP: ${sanitizeErrorMessage(message)}`,
    };
  }

  if (lower.includes("550") || lower.includes("not found") || lower.includes("no such")) {
    return {
      ok: false,
      code: "FTP_REMOTE_PATH_NOT_FOUND",
      message: `A pasta remota configurada não foi encontrada: ${sanitizeErrorMessage(message)}`,
    };
  }

  if (lower.includes("permission") || lower.includes("denied")) {
    return {
      ok: false,
      code: "FTP_PERMISSION_DENIED",
      message: `Sem permissão para listar a pasta remota: ${sanitizeErrorMessage(message)}`,
    };
  }

  if (
    lower.includes("enotfound")
  ) {
    return {
      ok: false,
      code: "FTP_HOST_NOT_FOUND",
      message: `Não foi possível localizar o servidor: ${sanitizeErrorMessage(message)}`,
    };
  }

  if (
    lower.includes("econnrefused") ||
    lower.includes("ehostunreach") ||
    lower.includes("enetunreach")
  ) {
    return {
      ok: false,
      code: "FTP_UNREACHABLE",
      message: `Não foi possível estabelecer conexão com a porta configurada: ${sanitizeErrorMessage(message)}`,
    };
  }

  return {
    ok: false,
    code: "FTP_CONNECTION_FAILED",
    message: `Não foi possível validar a conexão FTP: ${sanitizeErrorMessage(message)}`,
  };
}

if (require.main === module) {
  const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require("electron");
  configureAppServices({ app, safeStorage });

  ipcMain.handle("labfon:openProjectDirectory", () =>
    openProjectDirectory({ dialog }),
  );
  ipcMain.handle("labfon:pathExists", pathExists);
  ipcMain.handle("labfon:readTextFile", readTextFile);
  ipcMain.handle("labfon:readJsonFiles", readJsonFiles);
  ipcMain.handle("labfon:writeTextFileAtomic", writeTextFileAtomic);
  ipcMain.handle("labfon:readContentDataset", readContentDataset);
  ipcMain.handle("labfon:saveContentRecord", saveContentRecord);
  ipcMain.handle("labfon:runProjectBuild", runProjectBuild);
  ipcMain.handle("labfon:previewGeneratedSite", previewGeneratedSite);
  ipcMain.handle("labfon:loadPublishProfile", loadPublishProfile);
  ipcMain.handle("labfon:savePublishProfile", savePublishProfile);
  ipcMain.handle("labfon:testFtpConnection", testFtpConnection);
  ipcMain.handle("labfon:connectFtp", connectFtp);
  ipcMain.handle("labfon:listRemoteDirectory", listRemoteDirectory);
  ipcMain.handle("labfon:publishGeneratedSite", publishGeneratedSite);
  ipcMain.handle("labfon:retrieveRemoteProject", retrieveRemoteProject);
  ipcMain.handle("labfon:initializeRemoteProjectSource", initializeRemoteProjectSource);
  ipcMain.handle("labfon:updateRemoteProjectSource", updateRemoteProjectSource);

  app.whenReady().then(() => createWindow({ BrowserWindow }));

  app.on("window-all-closed", () => {
    stopGeneratedPreviewServer();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({ BrowserWindow });
    }
  });
}

module.exports = {
  pathExists,
  readTextFile,
  readJsonFiles,
  writeTextFileAtomic,
  runProjectBuild,
  validateGeneratedSite,
  previewGeneratedSite,
  stopGeneratedPreviewServer,
  configureAppServices,
  loadPublishProfile,
  savePublishProfile,
  testFtpConnection,
  connectFtp,
  listRemoteDirectory,
  publishGeneratedSite,
  retrieveRemoteProject,
  initializeRemoteProjectSource,
  updateRemoteProjectSource,
  sanitizeProfile,
  classifyFtpError,
  listDistFiles,
  orderFilesForPublication,
  listEditableProjectBundleFiles,
  joinRemotePath,
  validateLocalEditableProject,
  openProjectDirectory,
  resolveProjectPath,
};

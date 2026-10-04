const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const ftp = require("basic-ftp");
const { readContentDataset, saveContentRecord, readContentDeletions } = require("./content-store.cjs");
const { createImageAssetService } = require("./image-assets.cjs");
const { Writable } = require("node:stream");
const { isDeepStrictEqual } = require("node:util");
const { SOURCE_ENTRIES, REQUIRED_SOURCE_MARKERS, isSourceFile } = require("./source-manifest.cjs");
const { installEditorMenu } = require("./editor-menu.cjs");
const { runPortableBuild } = require("./portable-build.cjs");
const { createRecoveryStore, destinationKey } = require("./recovery-store.cjs");
const { createRemoteCleanup, fileEvidence } = require("./remote-cleanup.cjs");
const { mediaPath, inspectMediaReferences, selectReferencedMedia } = require("./media-references.cjs");
// A later explicit authorization must follow Phase 7 manual acceptance and manifest review.
const REMOTE_CLEANUP_AUTHORIZED = false;

async function cleanupEvidence(root, profile, inventory = []) {
  const source = await validateLocalEditableProject(root);
  if (!source.ok) throw new Error(source.message);
  const build = await validateGeneratedSite(root);
  if (!build.ok) throw new Error(build.message);
  return {
    sourceFiles: await fileEvidence(await listEditableProjectBundleFiles(root)),
    publicFiles: await fileEvidence(await listDistFiles(root)),
    connectionKey: destinationKey(profile),
    mediaAudit: await inspectMediaReferences(root, inventory.map(file => ({ ...file, path: file.path.replace(/^source\//, "") }))),
  };
}

function cleanupService(root, password) {
  return createRemoteCleanup({
    recoveryStore: getRecoveryStore(),
    evidence: (profile, inventory) => cleanupEvidence(root, profile, inventory),
    mutationGate: () => REMOTE_CLEANUP_AUTHORIZED,
    verifyCurrent: async profile => {
      const key = require("node:crypto").createHash("sha256").update(JSON.stringify([root, profile.host, profile.port, profile.username, profile.secure])).digest("hex");
      const journal = JSON.parse(await fs.readFile(path.join(getPublishStorageDirectory(), "guided-updates", `${key}.json`), "utf8"));
      if (journal.stage !== "complete" || journal.publicPending || !journal.receipts.source || !journal.receipts.publication || !journal.receipts.build) throw new Error("Guided update receipt required");
      const store = getRecoveryStore();
      if (await store.fingerprint(await listEditableProjectBundleFiles(root)) !== journal.revision ||
          await store.fingerprint(await listDistFiles(root)) !== journal.receipts.build.fingerprint) throw new Error("Guided revision changed");
      const secret = password || await loadPublishPassword();
      await verifyGuidedReceipt(journal.receipts.source.transactionId, "source", profile, secret);
      await verifyGuidedReceipt(journal.receipts.publication.transactionId, "public", profile, secret);
    },
  });
}

async function reviewRemoteCleanup(_event, rootPath, profile, password) {
  const root = path.resolve(rootPath);
  if (root !== path.join(getWorkspacesDirectory(), "current")) return { ok: false, code: "REMOTE_PROJECT_REQUIRED", message: "Abra o projeto remoto para revisar a limpeza." };
  const sanitized = sanitizeProfile(profile);
  const invalid = validateNativeProfile(sanitized);
  if (invalid) return invalid;
  const secret = password || await loadPublishPassword();
  if (!secret) return { ok: false, code: "FTP_AUTHENTICATION_FAILED", message: "Senha FTP não configurada." };
  try {
    const manifest = await withGuidedClient(sanitized, secret, client => cleanupService(root, secret).plan(client, sanitized));
    const directory = path.join(getPublishStorageDirectory(), "cleanup-reviews");
    await fs.mkdir(directory, { recursive: true });
    const filename = path.join(directory, `${manifest.id}.json`);
    await fs.writeFile(`${filename}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
    await fs.rename(`${filename}.tmp`, filename);
    return { ok: true, manifest, message: "Revisão concluída. Nenhum arquivo foi excluído. Esta versão permite somente consultar os resultados; a remoção ainda não está disponível." };
  } catch {
    return { ok: false, code: "CLEANUP_REVIEW_FAILED", message: "Revisão não concluída. Nenhum arquivo remoto foi alterado." };
  }
}

async function executeRemoteCleanup(_event, rootPath, profile, password, manifestId, approval) {
  if (!REMOTE_CLEANUP_AUTHORIZED) return { ok: false, code: "CLEANUP_PRODUCTION_GATE_PENDING", message: "Limpeza bloqueada: aceite manual e autorização pendentes." };
  const root = path.resolve(rootPath);
  if (root !== path.join(getWorkspacesDirectory(), "current") || !/^[a-f0-9]{64}$/.test(manifestId || "")) return { ok: false, code: "CLEANUP_BLOCKED" };
  const sanitized = sanitizeProfile(profile);
  const invalid = validateNativeProfile(sanitized);
  if (invalid) return invalid;
  const secret = password || await loadPublishPassword();
  if (!secret) return { ok: false, code: "FTP_AUTHENTICATION_FAILED" };
  const manifest = JSON.parse(await fs.readFile(path.join(getPublishStorageDirectory(), "cleanup-reviews", `${manifestId}.json`), "utf8"));
  const { dialog } = require("electron");
  const confirmation = await dialog.showMessageBox({ type: "warning", title: "Confirmar limpeza remota",
    message: `${manifest.proposed.length} arquivos serão removidos.`,
    detail: manifest.proposed.map(file => `/${file.path}`).join("\n"), buttons: ["Cancelar", "Confirmar limpeza"], defaultId: 0, cancelId: 0, noLink: true });
  if (confirmation.response !== 1) return { ok: false, cancelled: true };
  return withGuidedClient(sanitized, secret, client => cleanupService(root, secret).execute(client, sanitized, manifest, approval));
}
const { createAssetReuse } = require("./retrieval-cache.cjs");
const { createRetrievalProgress } = require("./retrieval-progress.cjs");
const { createGuidedUpdate } = require("./guided-update.cjs");
const { openTransferClients, createTransferProgress, uploadProtectedFiles, runTransferWorkers } = require("./remote-transfer.cjs");
const transferClient = () => appServices.createFtpClient ? appServices.createFtpClient() : new ftp.Client(15000);
let guidedUpdate;
let guidedUpdateDirectory;

async function updateSite(event, rootPath, profile, password) {
  const root = path.resolve(rootPath);
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) return profileError;
  const secret = password || await loadPublishPassword();
  if (!secret) return { ok: false, code: "FTP_AUTHENTICATION_FAILED", message: "Senha FTP não configurada." };
  const directory = path.join(getPublishStorageDirectory(), "guided-updates");
  // The coordinator's dependencies are bound per call, not to stale connection credentials.
  if (!guidedUpdate || guidedUpdateDirectory !== directory) {
    guidedUpdateDirectory = directory;
    guidedUpdate = createGuidedUpdate(directory, {
      validate: async (project, target, pass) => {
        if (project !== path.join(getWorkspacesDirectory(), "current")) return { ok: false, code: "REMOTE_PROJECT_REQUIRED", message: "Abra o projeto remoto antes de atualizar o site." };
        const local = await validateLocalEditableProject(project);
        if (!local.ok) return local;
        const connection = await testFtpConnection(null, target, pass);
        if (!connection.ok) return connection;
        if (!connection.summary?.sourceReady) return { ok: false, code: "REMOTE_PROJECT_NOT_INITIALIZED", message: "Projeto editável remoto não encontrado." };
        return { ok: true };
      },
      revision: async project => getRecoveryStore().fingerprint(await listEditableProjectBundleFiles(project)),
      buildRevision: async project => getRecoveryStore().fingerprint(await listDistFiles(project)),
      history: target => getRecoveryStore().list(target),
      verify: async (id, domain, target, pass, progress) => verifyGuidedReceipt(id, domain, target, pass, progress),
      restorePublic: async (id, target, pass, progress) => restoreGuidedPublic(id, target, pass, progress),
      source: (project, target, pass, progress) => updateRemoteProjectSource(null, project, target, pass, progress),
      build: project => runProjectBuild(null, project),
      publish: (project, target, pass, progress) => publishGeneratedSite(null, project, target, pass, progress),
    });
  }
  return guidedUpdate(root, sanitized, secret, progress => event?.sender?.send("labfon:siteUpdateProgress", progress));
}

async function withGuidedClient(profile, password, operation, onProgress) {
  const client = appServices.createFtpClient ? appServices.createFtpClient() : new ftp.Client(15000);
  if (client.ftp) client.ftp.verbose = false;
  let clients = [client], progress;
  try {
    await client.access({ host: profile.host, port: profile.port, user: profile.username, password, secure: profile.secure });
    clients = await openTransferClients(client, profile, password, transferClient);
    progress = createTransferProgress(clients, onProgress);
    return await operation(client, { clients, progress });
  } finally { progress?.stop(); clients.forEach(worker => worker.close()); }
}

async function verifyGuidedReceipt(id, domain, profile, password, onProgress) {
  const store = getRecoveryStore();
  const transaction = await store.verify(id, domain);
  const matches = (await store.list(profile)).some(item => item.id === id);
  if (!matches || transaction.snapshots[domain].status !== "success" || transaction.snapshots[domain].resolvedAt) throw new Error("Stale update receipt");
  return withGuidedClient(profile, password, (client, options) => store.verifyRemote(client, transaction, domain, options), onProgress);
}

async function restoreGuidedPublic(id, profile, password, onProgress) {
  const store = getRecoveryStore();
  await store.verify(id, "public");
  return withGuidedClient(profile, password, (client, options) => store.restore(client, id, "public", profile, options), onProgress);
}

const isDev = process.env.LABFON_EDITOR_DEV === "true";
const REQUIRED_BUILD_ARTIFACTS = ["dist/index.html", "dist/data.json"];
const PUBLIC_ARTIFACT_PATTERNS = [
  /^\.htaccess$/,
  /^data\.json$/,
  /^index\.html$/,
  /^publication_references\.json$/,
  /^assets\/images\/.+$/,
  /^assets\/index\.[A-Za-z0-9_-]+\.css$/,
  /^js\/index\.[A-Za-z0-9_-]+\.js$/,
  /^js\/site-content\.[A-Za-z0-9_-]+\.js$/,
];
function isPublicArtifact(relativePath) {
  return PUBLIC_ARTIFACT_PATTERNS.some(pattern => pattern.test(relativePath));
}
const GENERATED_SITE_BASE_PATH = "/labfonac/";
const PROFILE_FILE = "publish-profile.json";
const PASSWORD_FILE = "publish-password.bin";
const CRITICAL_REMOTE_FILES = ["index.html", "data.json"];
const FIXED_REMOTE_SOURCE_PATH = "/source";
const FIXED_REMOTE_PUBLISH_PATH = "/";
let generatedPreviewServer = null;
let appServices = {
  app: null,
  safeStorage: null,
  createFtpClient: null,
};

const SOURCE_PROTECTION_METADATA = new Set([".htaccess", ".ftpquota"]);

function createWindow({ BrowserWindow }) {
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || !input.control || input.alt || input.meta || input.isComposing) return;
    const direction = input.code === "NumpadAdd" ? 1 : input.code === "NumpadSubtract" ? -1 : 0;
    if (!direction) return;
    // Prevent the menu from applying a second zoom step to this same key event.
    event.preventDefault();
    window.webContents.setZoomLevel(window.webContents.getZoomLevel() + direction * 0.5);
  });

  if (isDev) {
    window.loadURL("http://127.0.0.1:3000/labfonac/editor.html");
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

  let buildResult;
  try {
    buildResult = await runPortableBuild(projectRoot, runNpmCommand);
  } catch (error) {
    return { ok: false, code: "BUILD_UNAVAILABLE",
      message: `Não foi possível preparar a geração do site: ${getErrorMessage(error)}`, output: "" };
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

  const mediaAudit = await inspectMediaReferences(projectRoot);
  return {
    ok: true,
    code: "BUILD_SUCCEEDED",
    mediaAudit,
    message: mediaAudit.certain
      ? `Página gerada. ${mediaAudit.unused.length} imagens sem referência ficarão fora das transferências; nenhum arquivo foi excluído.`
      : "Página gerada. Imagens preservadas nas transferências: há referências que exigem avaliação.",
    command: buildResult.command,
    output: buildResult.output,
    artifacts: validation.artifacts,
  };
}

function runNpmCommand(command, args, projectRoot) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: process.platform === "win32",
      windowsHide: true,
      env: { ...process.env, LABFON_EDITOR_BUILD: "false", BUILD_OUTPUT: "dist" },
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

  let unexpected = [];
  try {
    const files = await listDistFiles(rootPath);
    unexpected = files
      .map((file) => file.relativePath)
      .filter((relativePath) =>
        !isPublicArtifact(relativePath)
      );
  } catch (error) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: `Os arquivos gerados não puderam ser inspecionados: ${getErrorMessage(error)}`,
    };
  }

  if (unexpected.length > 0) {
    return {
      ok: false,
      code: "BUILD_ARTIFACT_INVALID",
      message: `A geração contém arquivos fora do limite público aprovado: ${unexpected.join(", ")}.`,
      unexpected,
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

async function openProjectDirectory({ dialog }, savedPath) {
  if (savedPath !== undefined) {
    try {
      if (typeof savedPath !== "string" || !path.isAbsolute(savedPath) || !(await fs.stat(savedPath)).isDirectory()) {
        throw new Error("Invalid directory");
      }
      return { ok: true, directory: { name: path.basename(savedPath), path: savedPath } };
    } catch {
      return { ok: false, code: "SAVED_PROJECT_UNAVAILABLE", message: "O caminho salvo não existe ou não está acessível. Use Escolher outro projeto." };
    }
  }
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
  const correctedPaths = profile ? hasNonFixedRemotePaths(profile) : false;
  const sanitized = profile ? sanitizeProfile(profile) : null;

  return {
    ok: true,
    profile: sanitized
      ? {
          ...sanitized,
          hasPassword: await hasStoredPassword(),
        }
      : null,
    correctedPaths,
    message: correctedPaths
      ? "Os destinos remotos foram corrigidos para o projeto Labfonac."
      : "",
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

async function listRemoteDirectory(_event, profile, password, _remotePath) {
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

  const targetPath = FIXED_REMOTE_SOURCE_PATH;

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

async function publishGeneratedSite(_event, rootPath, profile, password, onProgress) {
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

  const recoveryStore = getRecoveryStore();
  let recovery = null;
  let mutationStarted = false;

  const client = appServices.createFtpClient
    ? appServices.createFtpClient()
    : new ftp.Client(15000);
  if (client.ftp) {
    client.ftp.verbose = false;
  }

  let clients = [client], progress;
  try {
    await client.access({
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    });
    await client.cd(sanitized.remotePublishPath);

    clients = await openTransferClients(client, sanitized, secret, transferClient);
    progress = createTransferProgress(clients, onProgress);
    let revision = null;
    try { revision = await recoveryStore.fingerprint(await listEditableProjectBundleFiles(projectRoot)); }
    catch { /* Publication fixtures may contain only a generated site. */ }
    recovery = await recoveryStore.prepare(client, "public", sanitized, manifest.files, revision, { clients, progress });
    await recoveryStore.mark(recovery, "public", "mutating");
    mutationStarted = true;

    const transfer = await uploadProtectedFiles(orderFilesForPublication(manifest.files), recovery.snapshots.public, clients, sanitized.remotePublishPath, progress);

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

    await recoveryStore.verifyRemote(client, recovery, "public", { clients, progress });
    recovery.snapshots.public.transfer = { ...transfer, ...progress.metrics() };
    await recoveryStore.mark(recovery, "public", "success");
    manifest.recovery = recoveryStore.summary(recovery, "public");
    manifest.status = "success";
    manifest.finishedAt = new Date().toISOString();
    await writePublicationManifest(manifest);

    const retentionPending = await recoveryStore.prune().then(() => false, () => true);
    return {
      ok: true,
      code: "PUBLISH_SUCCEEDED",
      stage: "success",
      message: "Site published successfully.",
      manifest: summarizeManifest(manifest),
      recovery: recoveryStore.summary(recovery, "public"),
      retentionPending,
    };
  } catch (error) {
    manifest.status = mutationStarted ? "failed_during_transfer" : "failed_before_mutation";
    if (recovery) {
      await recoveryStore.mark(recovery, "public", mutationStarted ? "possibly_partial" : "failed_before_mutation");
      manifest.recovery = recoveryStore.summary(recovery, "public");
    }
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
      message: mutationStarted
        ? "Publicação não concluída. O projeto editável foi preservado. A cópia local permite recuperar a versão anterior do site."
        : "Publicação interrompida antes do envio. Nenhum arquivo remoto foi alterado.",
      manifest: summarizeManifest(manifest),
      recovery: recovery ? recoveryStore.summary(recovery, "public") : null,
    };
  } finally {
    progress?.stop();
    clients.forEach(worker => worker.close());
  }
}

async function retrieveRemoteProject(event, profile, password) {
  const retrievalStartedAt = performance.now();
  const metrics = {
    setupMs: 0,
    discoveryMs: 0,
    downloadMs: 0,
    reuseMs: 0,
    validationMs: 0,
    totalFiles: 0,
    totalBytes: 0,
    totalMs: 0,
    reusedFiles: 0,
    reusedBytes: 0,
    transferredBytes: 0,
  };
  const reportProgress = (phase, details = {}) => {
    event?.sender?.send("labfon:remoteProjectRetrievalProgress", {
      phase,
      ...details,
    });
  };
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

  const downloadClients = Array.from({ length: 2 }, () =>
    appServices.createFtpClient ? appServices.createFtpClient() : new ftp.Client(15000)
  );
  const [client] = downloadClients;
  for (const downloadClient of downloadClients) {
    if (downloadClient.ftp) downloadClient.ftp.verbose = false;
  }

  const workspacesRoot = getWorkspacesDirectory();
  const temporaryWorkspace = path.join(workspacesRoot, `retrieving-${Date.now()}`);
  const activeWorkspace = path.join(workspacesRoot, "current");
  const previousWorkspace = path.join(workspacesRoot, "previous");
  let progressTimer;

  try {
    reportProgress("setup");
    const setupStartedAt = performance.now();
    const accessConfig = {
      host: sanitized.host,
      port: sanitized.port,
      user: sanitized.username,
      password: secret,
      secure: sanitized.secure,
    };
    await Promise.all(downloadClients.map((downloadClient) => downloadClient.access(accessConfig)));
    metrics.setupMs = Math.round(performance.now() - setupStartedAt);

    reportProgress("discovery");
    const discoveryStartedAt = performance.now();
    try {
      await client.cd(sanitized.remoteSourcePath);
    } catch {
      return {
        ok: false,
        code: "REMOTE_PROJECT_NOT_INITIALIZED",
        message:
          "O servidor foi acessado, mas ainda não existe um projeto editável remoto configurado.",
      };
    }

    const remoteValidation = await verifyRemoteEditableProject(client, sanitized.remoteSourcePath);
    if (!remoteValidation.ok) return remoteValidation;

    let downloadManifest = await createRetrievalDownloadManifest(
      client,
      sanitized.remoteSourcePath,
    );
    metrics.discoveryMs = Math.round(performance.now() - discoveryStartedAt);

    await fs.rm(temporaryWorkspace, { recursive: true, force: true });
    await fs.mkdir(temporaryWorkspace, { recursive: true });
    reportProgress("reuse");
    const reuseStartedAt = performance.now();
    const reuse = await createAssetReuse(client, activeWorkspace);
    // Retrieve reference-bearing files first. No copied raster checksum or download is
    // requested until the saved content and code have established their use.
    const bootstrap = downloadManifest.filter(file => !mediaPath(file.relativePath));
    const bootstrapPending = [];
    let bootstrapReusedFiles = 0;
    let bootstrapDownloadedBytes = 0;
    for (const file of bootstrap) {
      const localPath = path.join(temporaryWorkspace, ...file.relativePath.split("/"));
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      if (await reuse(file, localPath)) {
        metrics.reusedFiles++;
        metrics.reusedBytes += file.size;
        bootstrapReusedFiles++;
      } else bootstrapPending.push(file);
    }
    const bootstrapDownloadStartedAt = performance.now();
    const bootstrapProgress = createRetrievalProgress(bootstrap.length, null);
    let bootstrapCompleted = bootstrapReusedFiles;
    const emitBootstrap = () => reportProgress("download", bootstrapProgress(bootstrapDownloadedBytes, bootstrapCompleted, metrics.reusedBytes));
    emitBootstrap();
    progressTimer = setInterval(emitBootstrap, 1000);
    await runTransferWorkers(bootstrapPending, downloadClients, async (file, downloadClient) => {
      const localPath = path.join(temporaryWorkspace, ...file.relativePath.split("/"));
      await downloadClient.downloadTo(localPath, file.remotePath);
      const bytes = (await fs.stat(localPath)).size;
      bootstrapDownloadedBytes += bytes;
      bootstrapCompleted++;
      emitBootstrap();
    });
    clearInterval(progressTimer);
    const bootstrapDownloadMs = Math.round(performance.now() - bootstrapDownloadStartedAt);
    const bootstrapValidation = await validateLocalEditableProject(temporaryWorkspace);
    if (!bootstrapValidation.ok) {
      await fs.rm(temporaryWorkspace, { recursive: true, force: true });
      return bootstrapValidation;
    }
    const mediaAudit = await inspectMediaReferences(temporaryWorkspace, downloadManifest);
    const originalCount = downloadManifest.length;
    downloadManifest = selectReferencedMedia(downloadManifest, mediaAudit);
    metrics.excludedImages = originalCount - downloadManifest.length;
    metrics.excludedImageBytes = mediaAudit.unusedBytes;
    const bootstrapPaths = new Set(bootstrap.map(file => file.relativePath));
    const pending = [];
    for (const file of downloadManifest) {
      if (bootstrapPaths.has(file.relativePath)) continue;
      const localPath = path.join(temporaryWorkspace, ...file.relativePath.split("/"));
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      if (await reuse(file, localPath)) {
        metrics.reusedFiles += 1;
        metrics.reusedBytes += file.size;
      } else pending.push(file);
    }
    metrics.reuseMs = Math.max(0, Math.round(performance.now() - reuseStartedAt) - bootstrapDownloadMs);
    const knownTotal = downloadManifest.every(file => Number.isSafeInteger(file.size) && file.size >= 0)
      ? downloadManifest.reduce((sum, file) => sum + file.size, 0) : null;
    const progress = createRetrievalProgress(downloadManifest.length, knownTotal);
    let completedFiles = bootstrap.length + metrics.reusedFiles - bootstrapReusedFiles;
    const transferredBytes = [0, 0];
    const emitDownload = () => reportProgress("download", progress(
      bootstrapDownloadedBytes + transferredBytes[0] + transferredBytes[1], completedFiles, metrics.reusedBytes,
    ));
    emitDownload();
    progressTimer = setInterval(emitDownload, 1000);
    for (const [index, downloadClient] of downloadClients.entries()) {
      if (typeof downloadClient.trackProgress === "function") {
        downloadClient.trackProgress((info) => {
          transferredBytes[index] = Number(info?.bytesOverall) || transferredBytes[index];
          emitDownload();
        });
      }
    }
    const downloadStartedAt = performance.now();

    const queues = [[], []];
    pending.forEach((file, index) => queues[index % 2].push(file));
    let workerFailure = null;
    await Promise.all(downloadClients.map(async (downloadClient, index) => {
      for (const file of queues[index]) {
        if (workerFailure) break;
        const localPath = path.join(temporaryWorkspace, ...file.relativePath.split("/"));
        try {
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          await downloadClient.downloadTo(localPath, file.remotePath);
          completedFiles += 1;
          emitDownload();
        } catch (error) {
          workerFailure = error;
          break;
        }
      }
    }));
    if (workerFailure) throw workerFailure;
    clearInterval(progressTimer);
    metrics.downloadMs = bootstrapDownloadMs + Math.round(performance.now() - downloadStartedAt);
    for (const downloadClient of downloadClients) {
      if (typeof downloadClient.trackProgress === "function") downloadClient.trackProgress(undefined);
    }

    reportProgress("validation");
    const validationStartedAt = performance.now();
    const retrievedFiles = await listEditableProjectBundleFiles(temporaryWorkspace);
    const retrievedStats = await Promise.all(retrievedFiles.map((file) => fs.stat(file.localPath)));
    metrics.totalFiles = retrievedFiles.length;
    metrics.totalBytes = retrievedStats.reduce((total, stat) => total + stat.size, 0);
    metrics.transferredBytes = metrics.totalBytes - metrics.reusedBytes;
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

    metrics.validationMs = Math.round(performance.now() - validationStartedAt);
    metrics.totalMs = Math.round(performance.now() - retrievalStartedAt);
    reportProgress("complete", {
      totalFiles: metrics.totalFiles,
      totalBytes: metrics.totalBytes,
      totalMs: metrics.totalMs,
    });
    console.info(`[Labfonac] Remote retrieval metrics ${JSON.stringify(metrics)}`);

    return {
      ok: true,
      code: "REMOTE_PROJECT_RETRIEVED",
      message: "Projeto remoto carregado.",
      metrics,
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
    clearInterval(progressTimer);
    for (const downloadClient of downloadClients) downloadClient.close();
  }
}

async function createRetrievalDownloadManifest(client, remoteSourcePath) {
  const files = [];
  const sourceEntries = await client.list(remoteSourcePath);
  const listings = new Map([[remoteSourcePath, sourceEntries]]);
  const list = async directory => {
    if (!listings.has(directory)) listings.set(directory, await client.list(directory));
    return listings.get(directory);
  };
  const sizeOf = entry => Number.isSafeInteger(entry?.size) && entry.size >= 0 ? entry.size : null;

  async function addDirectory(relativeDirectory) {
    const remoteDirectory = joinRemotePath(remoteSourcePath, relativeDirectory);
    const entries = await list(remoteDirectory);
    for (const entry of entries) {
      if (!entry.name || path.posix.basename(entry.name) !== entry.name) continue;
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory) await addDirectory(relativePath);
      else if (entry.isFile && isSourceFile(relativePath)) files.push({
        relativePath,
        remotePath: joinRemotePath(remoteSourcePath, relativePath),
        size: sizeOf(entry),
      });
    }
  }

  for (const entry of SOURCE_ENTRIES) {
    const bundlePath = entry.path;
    if (entry.optional) {
      if (!sourceEntries.some(item => item.name === bundlePath.split("/")[0] && item.isDirectory)) continue;
      const entries = await list(joinRemotePath(remoteSourcePath, path.posix.dirname(bundlePath)));
      if (!entries.some(item => item.name === path.posix.basename(bundlePath))) continue;
    }
    if (!entry.directory) {
      const entries = await list(joinRemotePath(remoteSourcePath, path.posix.dirname(bundlePath)));
      files.push({
        relativePath: bundlePath,
        remotePath: joinRemotePath(remoteSourcePath, bundlePath),
        size: sizeOf(entries.find(item => item.name === path.posix.basename(bundlePath))),
      });
    } else {
      await addDirectory(bundlePath);
    }
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
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

  let uploadStarted = false;
  const recoveryStore = getRecoveryStore();
  let recovery = null;
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
      (entry) => entry.isDirectory || !SOURCE_PROTECTION_METADATA.has(entry.name),
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

    const sourceFiles = await listEditableProjectBundleFiles(projectRoot);
    recovery = await recoveryStore.prepare(client, "source", sanitized, sourceFiles, await recoveryStore.fingerprint(sourceFiles));
    await recoveryStore.mark(recovery, "source", "mutating");
    uploadStarted = true;
    await uploadEditableProjectBundle(client, projectRoot, sanitized.remoteSourcePath, sourceFiles);
    const verification = await verifyRemoteEditableProject(
      client,
      sanitized.remoteSourcePath,
    );
    if (!verification.ok) {
      throw new Error(verification.message);
    }
    await recoveryStore.verifyRemote(client, recovery, "source");
    await recoveryStore.mark(recovery, "source", "success");

    const retentionPending = await recoveryStore.prune().then(() => false, () => true);
    return {
      ok: true,
      code: "REMOTE_PROJECT_SOURCE_INITIALIZED",
      message: "Projeto editável remoto inicializado.",
      markers: verification.markers,
      recovery: recoveryStore.summary(recovery, "source"),
      retentionPending,
    };
  } catch (error) {
    if (recovery) await recoveryStore.mark(recovery, "source", uploadStarted ? "possibly_partial" : "failed_before_mutation");
    return { ...classifyFtpError(error), remoteState: uploadStarted ? "possibly_partial" : "not_written",
      recovery: recovery ? recoveryStore.summary(recovery, "source") : null };
  } finally {
    client.close();
  }
}

async function updateRemoteProjectSource(_event, rootPath, profile, password, onProgress) {
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
  const recoveryStore = getRecoveryStore();
  let recovery = null;
  let mutationStarted = false;

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

  let clients = [client], progress;
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

    clients = await openTransferClients(client, sanitized, secret, transferClient);
    progress = createTransferProgress(clients, onProgress);
    const deletions = await verifyContentDeletions(client, projectRoot, sanitized.remoteSourcePath);
    const sourceFiles = await listEditableProjectBundleFiles(projectRoot);
    const revision = await recoveryStore.fingerprint(sourceFiles);
    recovery = await recoveryStore.prepare(client, "source", sanitized, [
      ...sourceFiles,
      ...deletions.map(deletion => ({ relativePath: deletion.relativePath, localPath: null })),
    ], revision, { clients, progress });
    await recoveryStore.mark(recovery, "source", "mutating");
    mutationStarted = true;
    const transfer = await uploadProtectedFiles(sourceFiles, recovery.snapshots.source, clients, sanitized.remoteSourcePath, progress);
    const verification = await verifyRemoteEditableProject(
      client,
      sanitized.remoteSourcePath,
    );
    if (!verification.ok) {
      throw new Error(verification.message);
    }

    for (const deletion of deletions) {
      if (deletion.exists) {
        await client.remove(deletion.remotePath);
        const remaining = await client.list(path.posix.dirname(deletion.remotePath));
        if (remaining.some((entry) => entry.name === path.posix.basename(deletion.remotePath))) {
          throw new Error("Não foi possível verificar a remoção do registro remoto.");
        }
      }
    }

    await recoveryStore.verifyRemote(client, recovery, "source", { clients, progress });
    recovery.snapshots.source.transfer = { ...transfer, ...progress.metrics() };
    await recoveryStore.mark(recovery, "source", "success");
    for (const deletion of deletions) await fs.unlink(deletion.ledgerPath);

    const retentionPending = await recoveryStore.prune().then(() => false, () => true);
    return {
      ok: true,
      code: "REMOTE_PROJECT_SOURCE_UPDATED",
      message: "Projeto editável remoto atualizado.",
      markers: verification.markers,
      recovery: recoveryStore.summary(recovery, "source"),
      retentionPending,
    };
  } catch (error) {
    if (recovery) await recoveryStore.mark(recovery, "source", mutationStarted ? "possibly_partial" : "failed_before_mutation");
    return { ...classifyFtpError(error), recovery: recovery ? recoveryStore.summary(recovery, "source") : null };
  } finally {
    progress?.stop();
    clients.forEach(worker => worker.close());
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

async function validateLocalEditableProject(rootPath, { requireLockfile = true } = {}) {
  const required = requireLockfile ? REQUIRED_SOURCE_MARKERS : [
    "package.json",
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
  const requiredMarkers = REQUIRED_SOURCE_MARKERS;
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

async function uploadEditableProjectBundle(client, projectRoot, remoteSourcePath, preparedFiles) {
  const files = preparedFiles || await listEditableProjectBundleFiles(projectRoot);

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

  for (const entry of SOURCE_ENTRIES) {
    const bundlePath = entry.path;
    const localPath = path.join(projectRoot, bundlePath);
    if (entry.optional && !(await pathExists(null, projectRoot, bundlePath))) continue;
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

  return selectReferencedMedia(files, await inspectMediaReferences(projectRoot));
}

async function collectDirectoryFiles(projectRoot, directoryPath, files) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await collectDirectoryFiles(projectRoot, entryPath, files);
      continue;
    }

    if (entry.isFile() && isSourceFile(path.relative(projectRoot, entryPath).replaceAll(path.sep, "/"))) {
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
  const selected = selectReferencedMedia(files, await inspectMediaReferences(projectRoot, files));
  return selected.sort((left, right) =>
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
  return {
    host: String(profile.host || "").trim(),
    port: normalizePort(profile.port),
    username: String(profile.username || "").trim(),
    remoteSourcePath: FIXED_REMOTE_SOURCE_PATH,
    remotePublishPath: FIXED_REMOTE_PUBLISH_PATH,
    secure: profile.secure !== false,
    passiveMode: profile.passiveMode !== false,
  };
}

function hasNonFixedRemotePaths(profile = {}) {
  const hasLegacyPath = Object.prototype.hasOwnProperty.call(profile, "remotePath");
  const sourcePath = normalizeRemotePath(profile.remoteSourcePath || "");
  const publishPath = normalizeRemotePath(profile.remotePublishPath || "");
  return hasLegacyPath || sourcePath !== FIXED_REMOTE_SOURCE_PATH || publishPath !== FIXED_REMOTE_PUBLISH_PATH;
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

function getRecoveryStore() {
  return createRecoveryStore(path.join(getPublishStorageDirectory(), "recovery", "transactions"));
}

async function restoreRemoteBackup(_event, profile, password) {
  const sanitized = sanitizeProfile(profile);
  const profileError = validateNativeProfile(sanitized);
  if (profileError) return profileError;
  const secret = password || (await loadPublishPassword());
  if (!secret) return { ok: false, message: "Senha FTP não configurada." };
  const store = getRecoveryStore();
  const transactions = await store.list(sanitized);
  const choices = ["public", "source"].map(domain => ({ domain, transaction: transactions.find(transaction =>
    !transaction.restoreOf && !transaction.snapshots[domain]?.resolvedAt && transaction.snapshots[domain]?.verifiedAt &&
    transaction.snapshots[domain]?.status !== "backup_failed") })).filter(choice => choice.transaction);
  if (!choices.length) return { ok: false, message: "Nenhuma cópia de segurança disponível para esta conexão." };
  const { dialog, BrowserWindow } = require("electron");
  const options = { type: "warning", title: "Recuperar versão anterior",
    message: "Escolha a versão anterior que deseja restaurar.",
    detail: choices.map(choice => `${choice.domain === "public" ? "Site publicado" : "Projeto editável"}: ${choice.transaction.createdAt}`).join("\n") +
      "\n\nA versão atual será protegida antes da restauração. Restaurar o projeto editável substitui a versão remota; será necessário recuperá-lo novamente.",
    buttons: ["Cancelar", ...choices.map(choice => choice.domain === "public" ? "Restaurar site publicado" : "Restaurar projeto editável")],
    defaultId: 0, cancelId: 0, noLink: true };
  const owner = BrowserWindow.getFocusedWindow();
  const answer = await (owner ? dialog.showMessageBox(owner, options) : dialog.showMessageBox(options));
  const choice = choices[answer.response - 1];
  if (!choice) return { ok: false, cancelled: true };
  // Validate the stored files before opening a connection or attempting mutation.
  try { await store.verify(choice.transaction.id, choice.domain); }
  catch { return { ok: false, message: "A cópia de segurança está incompleta ou danificada. Nenhum arquivo remoto foi alterado." }; }
  const client = appServices.createFtpClient ? appServices.createFtpClient() : new ftp.Client(15000);
  if (client.ftp) client.ftp.verbose = false;
  try {
    await client.access({ host: sanitized.host, port: sanitized.port, user: sanitized.username, password: secret, secure: sanitized.secure });
    const recovery = await store.restore(client, choice.transaction.id, choice.domain, sanitized);
    return { ok: true, domain: choice.domain, recovery, message: choice.domain === "public"
      ? "Site publicado restaurado. Projeto editável preservado." : "Projeto editável restaurado. Recupere o projeto remoto novamente." };
  } catch (error) {
    return { ok: false, domain: choice.domain, recovery: error.recovery || null,
      message: "A restauração não foi concluída. As cópias locais foram preservadas para uma nova tentativa." };
  } finally { client.close(); }
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

if (require.main === module || (process.versions.electron && process.type === "browser")) {
  const { app, BrowserWindow, dialog, ipcMain, safeStorage, Menu, shell } = require("electron");
  configureAppServices({ app, safeStorage });

  const images = createImageAssetService({ dialog, validateProject: (root) => validateLocalEditableProject(root, { requireLockfile: false }) });
  ipcMain.handle("labfon:openProjectDirectory", async (event, savedPath) => images.rememberProject(event, await openProjectDirectory({ dialog }, savedPath)));
  ipcMain.handle("labfon:selectProjectImage", (event, root) => images.selectProjectImage(event, root));
  ipcMain.handle("labfon:readProjectImage", (event, root, publicPath) => images.readProjectImage(event, root, publicPath));
  ipcMain.handle("labfon:closeProject", async (event) => {
    images.forgetProject(event);
    await stopGeneratedPreviewServer();
    return { ok: true };
  });
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
  ipcMain.handle("labfon:retrieveRemoteProject", async (event, ...args) => images.rememberProject(event, await retrieveRemoteProject(event, ...args)));
  ipcMain.handle("labfon:initializeRemoteProjectSource", initializeRemoteProjectSource);
  ipcMain.handle("labfon:updateRemoteProjectSource", updateRemoteProjectSource);
  ipcMain.handle("labfon:updateSite", updateSite);
  ipcMain.handle("labfon:reviewRemoteCleanup", reviewRemoteCleanup);
  ipcMain.handle("labfon:executeRemoteCleanup", executeRemoteCleanup);
  ipcMain.handle("labfon:restoreRemoteBackup", restoreRemoteBackup);

  app.whenReady().then(() => {
    installEditorMenu({ app, Menu, dialog, shell, BrowserWindow });
    createWindow({ BrowserWindow });
  });

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
  createWindow,
  isPublicArtifact,
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
  updateSite,
  reviewRemoteCleanup,
  executeRemoteCleanup,
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

import { createElement } from "../utils/helpers.js";
import { validatePageComposition } from "../page/composition.js";
import {
  SECTION_REGISTRY,
  getSectionDefinition,
} from "../page/section-registry.js";
import {
  addSection,
  compositionsEqual,
  createDraftComposition,
  getAvailableSectionTypes,
  moveSection,
  removeSection,
  restoreDraftComposition,
  enableCustomSection,
} from "./composition-commands.js";
import { renderCompositionPreview } from "./composition-preview.js";
import {
  createBrowserCompositionService,
  createProjectCompositionService,
} from "./composition-service.js";
import { createBuildController, getGeneratedPreviewReadiness } from "./build-service.js";
import { createDesktopHost } from "./desktop-host.js";
import { createContentEditor } from "./content-editor.js";
import { createCustomSectionEditor } from "./custom-section-editor.js";
import { loadEditorSiteModel } from "./project-loader.js";
import {
  createEmptyPublishProfile,
  createPublishController,
  normalizeRemotePath,
  sanitizePublishProfile,
  getProfileReadiness,
  getRetrievalReadiness,
  getSourceUpdateReadiness,
  getPublicationReadiness,
} from "./publish-service.js";
import { createEditorStore, createInitialEditorState, getBusyReadiness, getEditingReadiness } from "./state.js";

const SOURCE_STORAGE_KEY = "labfon.editor.lastSource";
const DEFAULT_BUILD_STATE = {
  status: "idle",
  message: "Gere o site depois de salvar as alterações.",
  diagnostics: [],
  output: "",
  previewUrl: null,
};
const DEFAULT_PUBLISH_STATE = {
  status: "unconfigured",
  message: "Configure o destino de publicação.",
  profile: null,
  diagnostics: [],
  summary: null,
};
const DEFAULT_REMOTE_STATE = {
  status: "idle",
  message: "Informe os dados de conexão e clique em Conectar.",
  currentPath: "/",
  entries: [],
  diagnostics: [],
};

function joinRemoteDisplayPath(basePath, name) {
  const normalizedBase = normalizeRemotePath(basePath || "/") || "/";
  return normalizedBase === "/" ? `/${name}` : `${normalizedBase}/${name}`;
}

function safeGetLocalStorage(defaultDocument) {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (defaultDocument?.defaultView?.localStorage) {
    return defaultDocument.defaultView.localStorage;
  }

  return null;
}

function loadPersistedSource(storageRef) {
  if (!storageRef) return null;

  try {
    const raw = storageRef.getItem(SOURCE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.type !== "local" && parsed.type !== "ftp")) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistSource(storageRef, source) {
  if (!storageRef) return;
  storageRef.setItem(SOURCE_STORAGE_KEY, JSON.stringify(source));
}

function parseFtpPort(value) {
  if (!value) return 21;
  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? 21 : numeric;
}

function buildSourcePayload(mode, fields) {
  if (mode === "ftp") {
    return {
      type: "ftp",
      host: fields.ftpHost.value.trim(),
      port: parseFtpPort(fields.ftpPort.value.trim()),
      username: fields.ftpUsername.value.trim(),
      remotePath: fields.ftpRemotePath.value.trim(),
      passiveMode: fields.ftpPassive.checked,
    };
  }

  return {
    type: "local",
    path: fields.localPath.value.trim(),
  };
}

function validateSource(source) {
  if (source.type === "local") {
    return Boolean(source.path);
  }

  return Boolean(source.host && source.username && source.remotePath);
}

function getContainer(documentRef, containerId) {
  const container = documentRef.getElementById(containerId);
  if (!container) {
    throw new Error(
      `Não foi possível inicializar o editor: contêiner #${containerId} não encontrado.`,
    );
  }
  return container;
}

function getCompositionLabel(type) {
  return getSectionDefinition(type)?.label || type;
}

function renderDiagnostics(documentRef, container, diagnostics = []) {
  container.innerHTML = "";

  if (diagnostics.length === 0) {
    container.textContent = "Nenhum problema encontrado na composição.";
    return;
  }

  const list = createElement("ul", { className: "editor-diagnostics-list" });
  diagnostics.forEach((diagnostic) => {
    list.appendChild(
      createElement(
        "li",
        {
          className: `editor-diagnostic editor-diagnostic-${diagnostic.severity}`,
        },
        diagnostic.message,
      ),
    );
  });
  container.appendChild(list);
}

function renderSectionList(documentRef, store, listContainer, addSelect) {
  const state = store.getState();
  const composition = state.draftComposition;

  listContainer.innerHTML = "";
  addSelect.innerHTML = "";

  if (!composition) {
    listContainer.appendChild(
      createElement("li", {}, "Composição ainda não carregada."),
    );
    return;
  }

  const visibleSections = composition.sections.filter(
    (section) => section.enabled,
  );

  visibleSections.forEach((section, index) => {
    const item = createElement("li", {
      className: "editor-section-item",
      "data-section-id": section.id,
    });

    item.appendChild(
      createElement(
        "span",
        { className: "editor-section-label" },
        `${index + 1}. ${section.title || getCompositionLabel(section.type)} (${section.enabled ? "habilitada" : "desabilitada"})`,
      ),
    );

    const actions = createElement("div", {
      className: "editor-section-actions",
    });
    const moveUpButton = createElement(
      "button",
      {
        type: "button",
        className: "editor-btn editor-btn-secondary",
      },
      "Subir",
    );
    const moveDownButton = createElement(
      "button",
      {
        type: "button",
        className: "editor-btn editor-btn-secondary",
      },
      "Descer",
    );
    const removeButton = createElement(
      "button",
      {
        type: "button",
        className: "editor-btn editor-btn-secondary",
      },
      "Remover da página",
    );

    const activeSections = visibleSections.filter((item) => item.enabled);
    moveUpButton.disabled = index === 0;
    moveDownButton.disabled = index === activeSections.length - 1;
    moveUpButton.addEventListener("click", () => {
      updateDraftComposition(store, () =>
        moveSection(store.getState().draftComposition, section.id, "up"),
      );
    });
    moveDownButton.addEventListener("click", () => {
      updateDraftComposition(store, () =>
        moveSection(store.getState().draftComposition, section.id, "down"),
      );
    });
    removeButton.addEventListener("click", () => {
      updateDraftComposition(store, () =>
        removeSection(store.getState().draftComposition, section.id),
      );
    });

    actions.appendChild(moveUpButton);
    actions.appendChild(moveDownButton);
    actions.appendChild(removeButton);
    item.appendChild(actions);
    listContainer.appendChild(item);
  });

  const availableTypes = validatePageComposition(composition).valid ? getAvailableSectionTypes(composition) : [];
  const disabledCustom = composition.sections.filter((section) => section.type === "custom" && !section.enabled);
  if (availableTypes.length === 0 && disabledCustom.length === 0) {
    addSelect.appendChild(
      createElement("option", { value: "" }, "Nenhuma seção disponível"),
    );
    addSelect.disabled = true;
    return;
  }

  addSelect.disabled = false;
  availableTypes.forEach((type) => {
    addSelect.appendChild(
      createElement("option", { value: type }, getCompositionLabel(type)),
    );
  });
  disabledCustom.forEach((section) => addSelect.append(createElement("option", { value: section.id }, `Reativar: ${section.title}`)));
}

function getLoadedBaseline(state) {
  return state.loadedComposition || state.savedComposition || null;
}

function updateDraftComposition(store, createNextComposition, allowInvalid = false) {
  if (!getEditingReadiness(store.getState()).ok) return;
  const nextComposition = createNextComposition();
  if (nextComposition.ok === false) {
    store.setState({ diagnostics: nextComposition.diagnostics });
    return;
  }
  const validation = validatePageComposition(nextComposition);

  if (!validation.valid && !allowInvalid) {
    store.setState({ diagnostics: validation.diagnostics });
    return;
  }

  const state = store.getState();
  const baseline = getLoadedBaseline(state);

  store.setState({
    compositionOutcome: null,
    draftComposition: validation.valid ? createDraftComposition(validation.composition) : nextComposition,
    compositionDirty: baseline
      ? !validation.valid || !compositionsEqual(validation.composition, baseline)
      : true,
    build:
      state.build?.status === "success"
        ? {
            status: "idle",
            message: "Há alterações não publicadas. Gere o site novamente.",
            diagnostics: [],
            output: "",
            previewUrl: null,
          }
        : state.build,
    diagnostics: validation.diagnostics,
  });
}

async function operationResult(promise) {
  try { return await promise; }
  catch (error) { return { ok: false, code: "EDITOR_OPERATION_FAILED", message: error instanceof Error ? error.message : "Não foi possível concluir a operação." }; }
}

function createLayout(
  documentRef,
  store,
  storageRef,
  compositionService,
  previewData,
  desktopHost,
) {
  let activeCompositionService = compositionService;
  const buildController = createBuildController({
    host: desktopHost,
    getState: () => store.getState(),
  });
  const publishController = createPublishController({
    host: desktopHost,
    getState: () => store.getState(),
  });
  const wrapper = createElement("div", { className: "editor-shell" });

  const header = createElement("header", { className: "editor-header" }, [
    createElement("img", { className: "editor-brand-mark", src: `${import.meta.env.BASE_URL}assets/images/logo_300x130.png`, alt: "", width: "92", height: "40" }),
    createElement("h1", { className: "editor-title" }, "Editor Labfonac"),
  ]);

  const nav = createElement("div", {
    className: "editor-nav",
    role: "tablist",
    "aria-label": "Navegação do editor",
  });

  const navItems = [
    { key: "connect", label: "Conectar" },
    { key: "project", label: "Projeto" },
    { key: "content", label: "Conteúdo" },
    { key: "page", label: "Página" },
    { key: "review", label: "Revisar" },
    { key: "publish", label: "Publicar" },
  ];

  const main = createElement("main", {
    className: "editor-main",
    role: "main",
  });

  const statusCard = createElement("section", {
    id: "editor-view-home",
    className: "editor-panel",
    "aria-labelledby": "editor-status-title",
  });

  statusCard.appendChild(
    createElement("h2", { id: "editor-status-title" }, "Estado do projeto"),
  );

  const statusText = createElement(
    "p",
    { id: "editor-project-status", className: "editor-status" },
    "Nenhum projeto aberto.",
  );

  statusCard.appendChild(statusText);

  const openProjectButton = createElement(
    "button",
    {
      id: "editor-open-project",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Abrir projeto local",
  );
  statusCard.appendChild(openProjectButton);

  main.appendChild(statusCard);

  const sourceCard = createElement("section", {
    id: "editor-view-open",
    className: "editor-panel",
    "aria-labelledby": "editor-source-title",
  });

  sourceCard.appendChild(
    createElement("h2", { id: "editor-source-title" }, "Origem do projeto"),
  );

  const sourceModeFieldset = createElement("fieldset", {
    className: "editor-source-modes",
  });

  sourceModeFieldset.appendChild(createElement("legend", {}, "Tipo de origem"));

  const localModeLabel = createElement("label", { className: "editor-inline" });
  const localModeInput = createElement("input", {
    type: "radio",
    name: "project-source-type",
    value: "local",
    checked: true,
  });
  localModeLabel.appendChild(localModeInput);
  localModeLabel.appendChild(documentRef.createTextNode(" Projeto local"));

  const ftpModeLabel = createElement("label", { className: "editor-inline" });
  const ftpModeInput = createElement("input", {
    type: "radio",
    name: "project-source-type",
    value: "ftp",
  });
  ftpModeLabel.appendChild(ftpModeInput);
  ftpModeLabel.appendChild(documentRef.createTextNode(" Diretório remoto FTP"));

  sourceModeFieldset.appendChild(localModeLabel);
  sourceModeFieldset.appendChild(ftpModeLabel);
  sourceCard.appendChild(sourceModeFieldset);

  const localGroup = createElement("div", {
    className: "editor-source-group",
    id: "editor-source-local",
  });

  localGroup.appendChild(
    createElement(
      "label",
      { for: "editor-local-path" },
      "Caminho do projeto local",
    ),
  );

  const localPathInput = createElement("input", {
    id: "editor-local-path",
    type: "text",
    className: "editor-input",
    placeholder: "Ex.: C:/projeto/lab-fon-ufrj",
  });
  localGroup.appendChild(localPathInput);

  const ftpGroup = createElement("div", {
    className: "editor-source-group is-hidden",
    id: "editor-source-ftp",
  });

  const ftpHostInput = createElement("input", {
    id: "editor-ftp-host",
    type: "text",
    className: "editor-input",
    placeholder: "Host FTP",
  });
  const ftpPortInput = createElement("input", {
    id: "editor-ftp-port",
    type: "number",
    className: "editor-input",
    value: "21",
  });
  const ftpUsernameInput = createElement("input", {
    id: "editor-ftp-username",
    type: "text",
    className: "editor-input",
    placeholder: "Usuário FTP",
  });
  const ftpRemotePathInput = createElement("input", {
    id: "editor-ftp-remote-path",
    type: "text",
    className: "editor-input",
    placeholder: "/public_html/labfonac/dist",
  });
  const ftpPassiveInput = createElement("input", {
    id: "editor-ftp-passive",
    type: "checkbox",
    checked: true,
  });

  ftpGroup.appendChild(
    createElement("label", { for: "editor-ftp-host" }, "Host"),
  );
  ftpGroup.appendChild(ftpHostInput);
  ftpGroup.appendChild(
    createElement("label", { for: "editor-ftp-port" }, "Porta"),
  );
  ftpGroup.appendChild(ftpPortInput);
  ftpGroup.appendChild(
    createElement("label", { for: "editor-ftp-username" }, "Usuário"),
  );
  ftpGroup.appendChild(ftpUsernameInput);
  ftpGroup.appendChild(
    createElement(
      "label",
      { for: "editor-ftp-remote-path" },
      "Diretório remoto",
    ),
  );
  ftpGroup.appendChild(ftpRemotePathInput);

  const passiveLabel = createElement("label", { className: "editor-inline" });
  passiveLabel.appendChild(ftpPassiveInput);
  passiveLabel.appendChild(documentRef.createTextNode(" Modo passivo"));
  ftpGroup.appendChild(passiveLabel);

  sourceCard.appendChild(localGroup);
  sourceCard.appendChild(ftpGroup);

  const sourceError = createElement(
    "p",
    {
      id: "editor-source-error",
      className: "editor-source-error",
      role: "alert",
    },
    "",
  );
  sourceCard.appendChild(sourceError);

  const actionRow = createElement("div", { className: "editor-actions" });
  const saveSourceButton = createElement(
    "button",
    {
      id: "editor-save-source",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Salvar origem",
  );
  const cancelSourceButton = createElement(
    "button",
    {
      id: "editor-cancel-source",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Cancelar",
  );
  actionRow.appendChild(saveSourceButton);
  actionRow.appendChild(cancelSourceButton);
  sourceCard.appendChild(actionRow);
  main.appendChild(sourceCard);

  const remoteCard = createElement("section", {
    id: "editor-view-remote",
    className: "editor-panel",
    "aria-labelledby": "editor-remote-title",
  });
  remoteCard.appendChild(
    createElement("h2", { id: "editor-remote-title" }, "Conexão"),
  );
  remoteCard.appendChild(
    createElement(
      "p",
      { className: "editor-status" },
      "Dados de acesso ao servidor FTP.",
    ),
  );
  const publishStatus = createElement(
    "p",
    { id: "editor-publish-status", className: "editor-status" },
    "Configure o destino de publicação.",
  );
  remoteCard.appendChild(publishStatus);

  const publishForm = createElement("div", { className: "editor-publish-form" });
  const publishHostInput = createElement("input", {
    id: "editor-publish-host",
    type: "text",
    className: "editor-input",
    placeholder: "Servidor FTP",
  });
  const publishPortInput = createElement("input", {
    id: "editor-publish-port",
    type: "number",
    className: "editor-input",
    value: "2100",
  });
  const publishUsernameInput = createElement("input", {
    id: "editor-publish-username",
    type: "text",
    className: "editor-input",
    placeholder: "Usuário",
  });
  const publishPasswordInput = createElement("input", {
    id: "editor-publish-password",
    type: "password",
    className: "editor-input",
    placeholder: "Senha",
  });
  const publishSecureInput = createElement("input", {
    id: "editor-publish-secure",
    type: "checkbox",
    checked: true,
  });

  publishForm.appendChild(
    createElement("label", { for: "editor-publish-host" }, "Servidor"),
  );
  publishForm.appendChild(publishHostInput);
  publishForm.appendChild(
    createElement("label", { for: "editor-publish-port" }, "Porta"),
  );
  publishForm.appendChild(publishPortInput);
  publishForm.appendChild(
    createElement("label", { for: "editor-publish-username" }, "Usuário"),
  );
  publishForm.appendChild(publishUsernameInput);
  publishForm.appendChild(
    createElement("label", { for: "editor-publish-password" }, "Senha"),
  );
  publishForm.appendChild(publishPasswordInput);
  const secureLabel = createElement("label", { className: "editor-inline" });
  secureLabel.appendChild(publishSecureInput);
  secureLabel.appendChild(documentRef.createTextNode(" Usar FTP/TLS"));
  publishForm.appendChild(secureLabel);
  remoteCard.appendChild(publishForm);

  const connectActions = createElement("div", { className: "editor-actions" });
  const connectFtpButton = createElement(
    "button",
    {
      id: "editor-connect-ftp",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Conectar",
  );
  const savePublishProfileButton = createElement(
    "button",
    {
      id: "editor-save-publish-profile",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Salvar configuração",
  );
  connectActions.appendChild(connectFtpButton);
  connectActions.appendChild(savePublishProfileButton);
  remoteCard.appendChild(connectActions);

  const connectStatus = createElement(
    "p",
    {
      id: "editor-connect-status",
      className: "editor-status",
      role: "status",
      "aria-live": "polite",
    },
    "Informe os dados de conexão e clique em Conectar.",
  );
  remoteCard.appendChild(connectStatus);

  const remoteBrowser = createElement("div", {
    id: "editor-remote-browser",
    className: "editor-remote-browser is-hidden",
  });
  const remoteBrowserNav = createElement("div", { className: "editor-actions" });
  const remoteUpButton = createElement(
    "button",
    {
      id: "editor-remote-up",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Pasta anterior",
  );
  const remoteReloadButton = createElement(
    "button",
    {
      id: "editor-remote-reload",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Recarregar",
  );
  const useCurrentAsSourceButton = createElement(
    "button",
    {
      id: "editor-remote-use-current-source",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Usar pasta atual como projeto editável",
  );
  const useCurrentAsPublishButton = createElement(
    "button",
    {
      id: "editor-remote-use-current-publish",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Usar pasta atual como site publicado",
  );
  remoteBrowserNav.appendChild(remoteUpButton);
  remoteBrowserNav.appendChild(remoteReloadButton);
  remoteBrowserNav.appendChild(useCurrentAsSourceButton);
  remoteBrowserNav.appendChild(useCurrentAsPublishButton);
  remoteBrowser.appendChild(remoteBrowserNav);
  const remoteBreadcrumb = createElement(
    "p",
    { id: "editor-remote-breadcrumb", className: "editor-status" },
    "/",
  );
  remoteBrowser.appendChild(remoteBreadcrumb);
  const remoteListing = createElement("ul", {
    id: "editor-remote-listing",
    className: "editor-remote-listing",
  });
  remoteBrowser.appendChild(remoteListing);
  remoteCard.appendChild(remoteBrowser);

  const publishRoleForm = createElement("div", { className: "editor-publish-form" });
  const publishRemoteSourcePathInput = createElement("input", {
    id: "editor-publish-remote-source-path",
    type: "text",
    className: "editor-input",
    placeholder: "/labfon-source",
  });
  const publishRemotePathInput = createElement("input", {
    id: "editor-publish-remote-path",
    type: "text",
    className: "editor-input",
    placeholder: "/",
  });
  publishRoleForm.appendChild(
    createElement(
      "label",
      { for: "editor-publish-remote-source-path" },
      "Pasta do projeto editável",
    ),
  );
  publishRoleForm.appendChild(publishRemoteSourcePathInput);
  publishRoleForm.appendChild(
    createElement(
      "label",
      { for: "editor-publish-remote-path" },
      "Pasta do site publicado",
    ),
  );
  publishRoleForm.appendChild(publishRemotePathInput);
  remoteCard.appendChild(publishRoleForm);

  const publishActions = createElement("div", { className: "editor-actions" });
  const testFtpConnectionButton = createElement(
    "button",
    {
      id: "editor-test-ftp-connection",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Testar conexão",
  );
  const openRemoteProjectButton = createElement(
    "button",
    {
      id: "editor-open-remote-project",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Abrir projeto remoto",
  );
  publishActions.appendChild(testFtpConnectionButton);
  publishActions.appendChild(openRemoteProjectButton);
  remoteCard.appendChild(publishActions);
  const publishDiagnostics = createElement("div", {
    id: "editor-publish-diagnostics",
    className: "editor-composition-diagnostics",
    role: "status",
    "aria-live": "polite",
  });
  remoteCard.appendChild(publishDiagnostics);
  main.appendChild(remoteCard);

  const compositionCard = createElement("section", {
    id: "editor-view-editor",
    className: "editor-panel",
    "aria-labelledby": "editor-composition-title",
  });
  compositionCard.appendChild(
    createElement("h2", { id: "editor-composition-title" }, "Página"),
  );
  compositionCard.appendChild(
    createElement(
      "p",
      { id: "editor-composition-status", className: "editor-status" },
      "Carregando composição da página...",
    ),
  );

  const sectionList = createElement("ol", {
    id: "editor-section-list",
    className: "editor-section-list",
  });
  compositionCard.appendChild(sectionList);

  const addRow = createElement("div", { className: "editor-add-section" });
  const addSelect = createElement("select", {
    id: "editor-add-section-select",
    className: "editor-input",
    "aria-label": "Seção disponível para adicionar",
  });
  const positionSelect = createElement("select", {
    id: "editor-add-section-position", className: "editor-input",
  });
  const positionField = createElement("label", { for: positionSelect.id }, "Posição ");
  positionField.appendChild(positionSelect);
  const addButton = createElement(
    "button",
    {
      id: "editor-add-section",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Adicionar seção",
  );
  addRow.appendChild(addSelect);
  addRow.appendChild(positionField);
  addRow.appendChild(addButton);
  compositionCard.appendChild(addRow);

  const compositionActions = createElement("div", {
    className: "editor-actions",
  });
  const previewButton = createElement(
    "button",
    {
      id: "editor-preview-composition",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Preview",
  );
  const saveCompositionButton = createElement(
    "button",
    {
      id: "editor-save-composition",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Salvar página",
  );
  const discardCompositionButton = createElement(
    "button",
    {
      id: "editor-discard-composition",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Descartar alterações da página",
  );
  compositionActions.appendChild(previewButton);
  compositionActions.appendChild(discardCompositionButton);
  compositionActions.appendChild(saveCompositionButton);
  compositionCard.appendChild(compositionActions);

  const compositionDiagnostics = createElement("div", {
    id: "editor-composition-diagnostics",
    className: "editor-composition-diagnostics",
    role: "status",
    "aria-live": "polite",
  });
  compositionCard.appendChild(compositionDiagnostics);
  main.appendChild(compositionCard);
  const contentEditor = createContentEditor({ host: desktopHost, store });
  const insertionTarget = () => positionSelect.value === "" ? undefined : { afterSectionId: positionSelect.value === "start" ? null : positionSelect.value.slice(6) };
  const customEditor = createCustomSectionEditor({ store, insertionTarget,
    update: (next, allowInvalid) => updateDraftComposition(store, next, allowInvalid),
    saveButton: saveCompositionButton, discardButton: discardCompositionButton });
  compositionCard.insertBefore(customEditor.page, compositionActions);
  main.appendChild(contentEditor.element);

  const buildCard = createElement("section", {
    id: "editor-view-validation",
    className: "editor-panel",
    "aria-labelledby": "editor-build-title",
  });
  buildCard.appendChild(
    createElement("h2", { id: "editor-build-title" }, "Site gerado"),
  );
  const buildStatus = createElement(
    "p",
    { id: "editor-build-status", className: "editor-status" },
    "Gere o site depois de salvar as alterações.",
  );
  buildCard.appendChild(buildStatus);
  const buildActions = createElement("div", { className: "editor-actions" });
  const generateSiteButton = createElement(
    "button",
    {
      id: "editor-generate-site",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Gerar site",
  );
  const previewGeneratedSiteButton = createElement(
    "button",
    {
      id: "editor-preview-generated-site",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Prévia do site gerado",
  );
  buildActions.appendChild(generateSiteButton);
  buildActions.appendChild(previewGeneratedSiteButton);
  buildCard.appendChild(buildActions);
  const buildDiagnostics = createElement("pre", {
    id: "editor-build-diagnostics",
    className: "editor-build-diagnostics",
  });
  buildCard.appendChild(buildDiagnostics);
  const generatedPreviewFrame = createElement("iframe", {
    id: "editor-generated-site-preview",
    className: "editor-generated-site-preview",
    title: "Prévia do site gerado",
  });
  buildCard.appendChild(generatedPreviewFrame);
  main.appendChild(buildCard);

  const publishCard = createElement("section", {
    id: "editor-view-publish",
    className: "editor-panel",
    "aria-labelledby": "editor-publish-title",
  });
  publishCard.appendChild(
    createElement("h2", { id: "editor-publish-title" }, "Publicação"),
  );
  const publishSiteActions = createElement("div", { className: "editor-actions" });
  const updateRemoteSourceButton = createElement(
    "button",
    {
      id: "editor-update-remote-source",
      type: "button",
      className: "editor-btn editor-btn-secondary",
    },
    "Atualizar projeto remoto",
  );
  const publishSiteButton = createElement(
    "button",
    {
      id: "editor-publish-site",
      type: "button",
      className: "editor-btn editor-btn-primary",
    },
    "Publicar site",
  );
  publishSiteActions.appendChild(updateRemoteSourceButton);
  publishSiteActions.appendChild(publishSiteButton);
  publishCard.appendChild(publishSiteActions);
  main.appendChild(publishCard);

  const contentCard = createElement("section", {
    className: "editor-panel",
    "aria-labelledby": "editor-content-title",
  });
  contentCard.appendChild(
    createElement("h2", { id: "editor-content-title" }, "Conteúdo editável"),
  );
  const contentStatus = createElement(
    "p",
    { id: "editor-content-status", className: "editor-status" },
    "Abra um projeto local para inspecionar os conteúdos canônicos.",
  );
  contentCard.appendChild(contentStatus);
  const contentSummary = createElement("div", {
    id: "editor-content-summary",
    className: "editor-content-summary",
  });
  contentCard.appendChild(contentSummary);
  main.appendChild(contentCard);

  const previewCard = createElement("section", {
    className: "editor-panel",
    "aria-labelledby": "editor-preview-title",
  });
  previewCard.appendChild(
    createElement("h2", { id: "editor-preview-title" }, "Preview"),
  );
  const previewContainer = createElement("div", {
    id: "editor-composition-preview",
    className: "editor-composition-preview",
  });
  previewCard.appendChild(previewContainer);
  main.appendChild(previewCard);

  const advanced = createElement("details", { id: "editor-project-advanced", className: "editor-advanced" });
  advanced.appendChild(createElement("summary", {}, "Opções avançadas"));
  advanced.append(openProjectButton, sourceCard);

  const projectRemote = createElement("section", { id: "editor-project-remote", className: "editor-panel" });
  projectRemote.append(createElement("h2", {}, "Projeto remoto"), remoteBrowser, publishRoleForm, openRemoteProjectButton);

  // Move existing nodes once; switching tabs never recreates controls or touches the store.
  const panelContents = [
    [remoteCard],
    [projectRemote, statusCard, advanced],
    [contentEditor.element, customEditor.content, contentCard],
    [compositionCard, previewCard],
    [buildCard],
    [publishCard],
  ];
  const panels = navItems.map((item, index) => {
    const panel = createElement("div", {
      id: `editor-tabpanel-${item.key}`, className: "editor-tab-panel", role: "tabpanel",
      "aria-labelledby": `editor-tab-${item.key}`, tabindex: "0",
    });
    panel.append(...panelContents[index]);
    return panel;
  });
  // Keep the existing feedback nodes with the operation's tab, without changing workflow state.
  const publishFeedback = createElement("div", { className: "editor-operation-feedback" });
  publishFeedback.append(publishStatus, publishDiagnostics);
  const showPublishFeedbackIn = (panel) => panel.appendChild(publishFeedback);
  showPublishFeedbackIn(publishCard);
  main.replaceChildren(...panels);
  const tabs = navItems.map((item) => createElement("button", {
    id: `editor-tab-${item.key}`, type: "button", role: "tab", className: "editor-nav-btn",
    "data-view": item.key, "aria-controls": `editor-tabpanel-${item.key}`,
  }, item.label));
  const selectTab = (index, focus = true) => {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle("is-active", selected);
      panels[position].hidden = !selected;
      panels[position].toggleAttribute("inert", !selected);
    });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", (event) => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next);
    });
    nav.appendChild(tab);
  });
  selectTab(0, false);

  const summary = createElement("dl", { id: "editor-session-status", className: "editor-session-status", "aria-label": "Estado da sessão" });
  const summaryValues = {};
  for (const [key, label] of [["server", "Servidor"], ["project", "Projeto"], ["changes", "Alterações locais"], ["source", "Projeto remoto"], ["build", "Prévia"], ["publication", "Publicação"]]) {
    const value = createElement("dd", { id: `editor-session-${key}` });
    summaryValues[key] = value;
    summary.appendChild(createElement("div", {}, [createElement("dt", {}, label), value]));
  }
  const operationReasons = new Map();
  for (const button of [connectFtpButton, testFtpConnectionButton, openRemoteProjectButton, openProjectButton, saveCompositionButton, generateSiteButton, previewGeneratedSiteButton, updateRemoteSourceButton, publishSiteButton]) {
    const reason = createElement("p", { id: `${button.id}-reason`, className: "editor-operation-reason" });
    const operation = createElement("div", { className: "editor-operation" });
    button.setAttribute("aria-describedby", reason.id);
    button.before(operation);
    operation.append(button, reason);
    operationReasons.set(button, reason);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(summary);
  wrapper.appendChild(nav);
  wrapper.appendChild(main);

  const fieldMap = {
    localPath: localPathInput,
    ftpHost: ftpHostInput,
    ftpPort: ftpPortInput,
    ftpUsername: ftpUsernameInput,
    ftpRemotePath: ftpRemotePathInput,
    ftpPassive: ftpPassiveInput,
  };

  const setMode = (mode) => {
    const isLocal = mode === "local";
    localGroup.classList.toggle("is-hidden", !isLocal);
    ftpGroup.classList.toggle("is-hidden", isLocal);
    localModeInput.checked = isLocal;
    ftpModeInput.checked = !isLocal;
  };

  const hydrateFromSource = (source) => {
    if (!source) {
      setMode("local");
      return;
    }

    if (source.type === "ftp") {
      setMode("ftp");
      ftpHostInput.value = source.host || "";
      ftpPortInput.value = source.port || 21;
      ftpUsernameInput.value = source.username || "";
      ftpRemotePathInput.value = source.remotePath || "";
      ftpPassiveInput.checked = source.passiveMode !== false;
      return;
    }

    setMode("local");
    localPathInput.value = source.path || "";
  };

  const updateStatus = (state) => {
    if (state.lastError) {
      statusText.textContent = `Erro de inicialização: ${state.lastError}`;
      return;
    }

    if (state.openedProject) {
      const status =
        state.openedProject.status === "valid" ? "válido" : "inválido";
      statusText.textContent = `Projeto aberto (${status}): ${state.openedProject.path}`;
      return;
    }

    if (state.projectSource?.type === "local") {
      statusText.textContent = `Origem selecionada (local): ${state.projectSource.path || "não informada"}`;
      return;
    }

    if (state.projectSource?.type === "ftp") {
      const endpoint = `${state.projectSource.host || "host"}:${state.projectSource.port || 21}`;
      statusText.textContent = `Origem selecionada (FTP): ${endpoint}`;
      return;
    }

    if (state.projectSnapshotPath) {
      statusText.textContent = `Projeto carregado: ${state.projectSnapshotPath}`;
      return;
    }

    statusText.textContent = "Nenhum projeto aberto.";
  };

  const updateCompositionUi = (state) => {
    const selectedPosition = positionSelect.value;
    const positions = [
      createElement("option", { value: "" }, "Posição padrão"),
      createElement("option", { value: "start" }, "No início"),
      ...(state.draftComposition?.sections || []).filter((section) => section.enabled).map((section) =>
        createElement("option", { value: `after:${section.id}` }, `Após ${section.title || getCompositionLabel(section.type)}`)),
    ];
    // Retain a stale choice so the command reports it instead of silently moving elsewhere.
    if (selectedPosition && !positions.some((option) => option.value === selectedPosition)) {
      positions.push(createElement("option", { value: selectedPosition }, "Posição indisponível"));
    }
    positionSelect.replaceChildren(...positions);
    positionSelect.value = selectedPosition;
    const compositionStatus = documentRef.getElementById(
      "editor-composition-status",
    );
    if (!compositionStatus) return;

    if (!state.draftComposition) {
      compositionStatus.textContent = "Composição ainda não carregada.";
      renderSectionList(documentRef, store, sectionList, addSelect);
      return;
    }

    const activeCount = state.draftComposition.sections.filter(
      (section) => section.enabled,
    ).length;
    compositionStatus.textContent = state.compositionOutcome || (state.compositionDirty
      ? `${activeCount} seções no rascunho. Há alterações não salvas.`
      : `${activeCount} seções carregadas.`);
    renderSectionList(documentRef, store, sectionList, addSelect);
    renderDiagnostics(documentRef, compositionDiagnostics, state.diagnostics);
  };

  const updateBuildUi = (state) => {
    const readiness = buildController.getReadiness();
    const build = state.build || DEFAULT_BUILD_STATE;

    if (build.status === "running") {
      buildStatus.textContent = "Gerando site...";
    } else if (!readiness.ok && build.status === "idle") {
      buildStatus.textContent = readiness.message;
    } else {
      buildStatus.textContent = build.message;
    }

    buildDiagnostics.textContent = build.output || "";
    generatedPreviewFrame.hidden = !build.previewUrl || !getGeneratedPreviewReadiness(state).ok;
    if (!build.previewUrl) generatedPreviewFrame.removeAttribute("src");
    if (build.previewUrl && generatedPreviewFrame.src !== build.previewUrl) {
      generatedPreviewFrame.src = build.previewUrl;
    }
  };

  const readPublishProfileFromForm = () =>
    sanitizePublishProfile({
      host: publishHostInput.value,
      port: publishPortInput.value,
      username: publishUsernameInput.value,
      remoteSourcePath: publishRemoteSourcePathInput.value,
      remotePublishPath: publishRemotePathInput.value,
      secure: publishSecureInput.checked,
      passiveMode: true,
      hasPassword: store.getState().publish?.profile?.hasPassword === true,
    });

  const hydratePublishProfile = (profile) => {
    const effectiveProfile = sanitizePublishProfile(
      profile || createEmptyPublishProfile(),
    );
    publishHostInput.value = effectiveProfile.host;
    publishPortInput.value = effectiveProfile.port;
    publishUsernameInput.value = effectiveProfile.username;
    publishRemoteSourcePathInput.value = effectiveProfile.remoteSourcePath;
    publishRemotePathInput.value = effectiveProfile.remotePublishPath;
    publishSecureInput.checked = effectiveProfile.secure;
    publishPasswordInput.value = "";
    publishPasswordInput.placeholder = effectiveProfile.hasPassword
      ? "Senha salva"
      : "Senha";
  };

  const updatePublishUi = (state) => {
    const publish = state.publish || DEFAULT_PUBLISH_STATE;
    publishStatus.textContent = publish.message;

    if (publish.summary && !["failed", "error", "publishing"].includes(publish.status)) {
      if (publish.summary.remoteSourceUpdated !== undefined) {
        publishDiagnostics.textContent = publish.summary.remoteSourceUpdated ? `Projeto remoto atualizado: ${publish.summary.remoteSourcePath}` : "";
        return;
      }
      if (publish.summary.uploadedCount !== undefined) {
        publishDiagnostics.textContent = `Site published successfully\nDestination: ${publish.summary.remoteRoot}\nFiles uploaded: ${publish.summary.uploadedCount}/${publish.summary.fileCount}\nManifest: ${publish.summary.manifestPath}`;
        return;
      }

      if (publish.summary.workspacePath) {
        publishDiagnostics.textContent = `Projeto remoto aberto\nProjeto editável: ${publish.summary.remoteSourcePath}\nSite publicado: ${publish.summary.remotePublishPath}`;
        return;
      }

      publishDiagnostics.textContent = `Connection successful\nPublished site: ${publish.summary.remotePublishPath}\nPublished files detected: ${publish.summary.publishFileCount}\nindex.html: ${publish.summary.indexHtmlPresent ? "present" : "not found"}\nEditable project: ${publish.summary.sourceReady ? "found" : "not initialized"}`;
      return;
    }

    if (publish.diagnostics?.length) renderDiagnostics(documentRef, publishDiagnostics, publish.diagnostics);
    else publishDiagnostics.replaceChildren();
  };

  const renderRemoteListing = (remote) => {
    remoteListing.innerHTML = "";

    if (remote.status === "error") {
      remoteListing.appendChild(
        createElement("li", { className: "editor-remote-entry" }, remote.message),
      );
      return;
    }

    if (!remote.entries || remote.entries.length === 0) {
      remoteListing.appendChild(
        createElement("li", { className: "editor-remote-entry" }, "Pasta vazia."),
      );
      return;
    }

    remote.entries.forEach((entry) => {
      const row = createElement("li", { className: "editor-remote-entry" });
      row.appendChild(
        createElement(
          "span",
          { className: "editor-remote-entry-name" },
          `${entry.type === "directory" ? "Pasta" : "Arquivo"}: ${entry.name}`,
        ),
      );

      if (entry.type === "directory") {
        const targetPath = joinRemoteDisplayPath(remote.currentPath, entry.name);
        const openButton = createElement(
          "button",
          { type: "button", className: "editor-btn editor-btn-secondary" },
          "Abrir",
        );
        openButton.addEventListener("click", () => loadRemoteDirectory(targetPath));

        const useSourceButton = createElement(
          "button",
          { type: "button", className: "editor-btn editor-btn-secondary" },
          "Usar como pasta do projeto editável",
        );
        useSourceButton.addEventListener("click", () => {
          publishRemoteSourcePathInput.value = targetPath;
          profileChanged();
        });

        const usePublishButton = createElement(
          "button",
          { type: "button", className: "editor-btn editor-btn-secondary" },
          "Usar como pasta do site publicado",
        );
        usePublishButton.addEventListener("click", () => {
          publishRemotePathInput.value = targetPath;
          profileChanged();
        });

        row.appendChild(openButton);
        row.appendChild(useSourceButton);
        row.appendChild(usePublishButton);
      }

      remoteListing.appendChild(row);
    });
  };

  const updateRemoteUi = (state) => {
    const remote = state.remote || DEFAULT_REMOTE_STATE;
    connectStatus.textContent = remote.message;
    remoteBrowser.classList.toggle("is-hidden", remote.status === "idle");
    remoteBreadcrumb.textContent = remote.currentPath || "/";
    renderRemoteListing(remote);
  };

  const loadRemoteDirectory = async (targetPath) => {
    if (!getBusyReadiness(store.getState()).ok) return;
    const profile = readPublishProfileFromForm();
    const normalizedPath = normalizeRemotePath(targetPath || "/") || "/";
    store.setState({
      remote: {
        ...(store.getState().remote || DEFAULT_REMOTE_STATE),
        status: "listing",
        message: "Carregando pasta remota...",
      },
    });

    const result = await operationResult(publishController.listDirectory(
      profile,
      publishPasswordInput.value,
      normalizedPath,
    ));

    if (!result.ok) {
      store.setState({
        remote: {
          status: "error",
          message: result.message || "Não foi possível listar a pasta remota.",
          currentPath: normalizedPath,
          entries: [],
          diagnostics: result.diagnostics || [
            { code: result.code, severity: "error", message: result.message },
          ],
        },
      });
      return;
    }

    store.setState({
      remote: {
        status: "connected",
        message: result.message || "Pasta remota carregada.",
        currentPath: result.path || normalizedPath,
        entries: result.entries || [],
        diagnostics: [],
      },
    });
  };

  const updateProjectContentUi = (state) => {
    contentSummary.innerHTML = "";

    if (!state.editorSiteModel) {
      contentStatus.textContent =
        "Abra um projeto local para inspecionar os conteúdos canônicos.";
      return;
    }

    const model = state.editorSiteModel;
    contentStatus.textContent =
      "Conteúdo canônico carregado.";

    const groups = [
      {
        title: "Site",
        items: [
          `Hero: ${model.site?.hero?.title || "não configurado"}`,
          `Sobre: ${model.site?.sobre?.title || "não configurado"}`,
          `Rodapé: ${model.site?.footer?.sections?.length || 0} blocos`,
        ],
      },
      {
        title: "Equipe",
        items: [
          `${model.equipe.length} membros`,
          `Egressos: ${model.equipe.some((member) => member.categoria === "egressos") ? "presente" : "ausente"}`,
        ],
      },
      {
        title: "Linhas de Pesquisa",
        items: [`${model.linhasPesquisa.length} linhas`],
      },
      {
        title: "Extensão",
        items: [
          `Projetos: ${model.extensao.projects?.length || 0}`,
          `PROVALE: ${model.extensao.projects?.some((project) => project.projectType === "Projeto de Extensão" && project.title === "PROVALE em Extensão") ? "Projeto de Extensão" : "não encontrado"}`,
          `Seção: ${model.page.sections.find((section) => section.type === "extension")?.enabled ? "habilitada" : "desabilitada"}`,
        ],
      },
      {
        title: "Parcerias",
        items: [`${model.parcerias.length} registros`],
      },
      {
        title: "Publicações",
        items: [
          `${model.publicacoes.length} registros`,
          `Seção: ${model.page.sections.find((section) => section.type === "publicacoes")?.enabled ? "habilitada" : "desabilitada"}`,
        ],
      },
    ];

    groups.forEach((group) => {
      const section = createElement("section", {
        className: "editor-content-group",
      });
      section.appendChild(createElement("h3", {}, group.title));
      section.appendChild(
        createElement(
          "ul",
          {},
          group.items.map((item) => createElement("li", {}, item)),
        ),
      );
      contentSummary.appendChild(section);
    });
  };

  const currentMode = () => (ftpModeInput.checked ? "ftp" : "local");

  localModeInput.addEventListener("change", () => {
    setMode("local");
    sourceError.textContent = "";
  });

  ftpModeInput.addEventListener("change", () => {
    setMode("ftp");
    sourceError.textContent = "";
  });

  saveSourceButton.addEventListener("click", () => {
    const source = buildSourcePayload(currentMode(), fieldMap);

    if (!validateSource(source)) {
      sourceError.textContent =
        source.type === "local"
          ? "Informe o caminho do projeto local para continuar."
          : "Preencha host, usuário e diretório remoto para continuar.";
      return;
    }

    sourceError.textContent = "";
    store.setState({ appStatus: "sourceSelected", projectSource: source });
    persistSource(storageRef, source);
  });

  const activateProjectDirectory = async (directory) => {
    const result = await loadEditorSiteModel(desktopHost, directory);
    const loadedComposition = result.model
      ? createDraftComposition(result.model.page)
      : null;
    if (result.ok) {
      activeCompositionService = createProjectCompositionService({
        host: desktopHost,
        directory,
      });
    }
    store.setState({
      openedProject: result.project,
      editorSiteModel: result.model,
      contentDirty: false,
      loadedComposition,
      savedComposition: loadedComposition,
      draftComposition: loadedComposition
        ? createDraftComposition(loadedComposition)
        : null,
      compositionDirty: false,
      compositionOutcome: null,
      build: {
        status: "idle",
        message: "Gere o site depois de salvar as alterações.",
        diagnostics: [],
        output: "",
        previewUrl: null,
      },
      publish: {
        ...DEFAULT_PUBLISH_STATE,
        profile: store.getState().publish?.profile || null,
        status: store.getState().publish?.profile ? "configured" : "unconfigured",
        message: store.getState().publish?.profile
          ? "Destino de publicação configurado."
          : DEFAULT_PUBLISH_STATE.message,
      },
      diagnostics: result.diagnostics,
      appStatus: result.ok ? "projectLoaded" : "projectInvalid",
    });
    return result;
  };

  openProjectButton.addEventListener("click", async () => {
    if (openProjectButton.disabled) return;
    if (store.getState().contentDirty || store.getState().contentSaving || store.getState().compositionDirty) {
      sourceError.textContent = "Salve ou descarte as alterações antes de abrir outro projeto.";
      return;
    }
    sourceError.textContent = "";
    store.setState({ projectOpening: true });
    try {
    const selection = await desktopHost.openProjectDirectory();

    if (!selection.ok) {
      if (!selection.cancelled) {
        store.setState({
          diagnostics: [
            {
              code: selection.code,
              severity: "error",
              message: selection.message,
            },
          ],
        });
      }
      return;
    }

    await activateProjectDirectory(selection.directory);
    } catch (error) {
      sourceError.textContent = error.message || "Não foi possível abrir o projeto.";
    } finally { store.setState({ projectOpening: false }); }
  });

  cancelSourceButton.addEventListener("click", () => {
    sourceError.textContent = "";
    hydrateFromSource(store.getState().projectSource);
  });

  addButton.addEventListener("click", () => {
    if (!addSelect.value) return;
    updateDraftComposition(store, () =>
      addSelect.value.startsWith("custom-")
        ? enableCustomSection(store.getState().draftComposition, addSelect.value, insertionTarget())
        : addSection(store.getState().draftComposition, addSelect.value, SECTION_REGISTRY, insertionTarget()),
    );
  });

  previewButton.addEventListener("click", async () => {
    if (!getEditingReadiness(store.getState()).ok) return;
    const validation = validatePageComposition(
      store.getState().draftComposition,
    );
    store.setState({ diagnostics: validation.diagnostics });
    if (!validation.valid) return;

    await renderCompositionPreview({
      documentRef,
      container: previewContainer,
      composition: validation.composition,
      previewData: store.getState().editorSiteModel
        ? { editorSiteModel: store.getState().editorSiteModel }
        : previewData,
      registry: SECTION_REGISTRY,
    });
  });

  discardCompositionButton.addEventListener("click", () => {
    if (!getEditingReadiness(store.getState()).ok) return;
    const baseline = getLoadedBaseline(store.getState());
    if (!baseline) return;

    store.setState({
      draftComposition: restoreDraftComposition(baseline),
      compositionOutcome: "Alterações descartadas.",
      compositionDirty: false,
      diagnostics: [],
    });
  });

  saveCompositionButton.addEventListener("click", async () => {
    if (saveCompositionButton.disabled || !getEditingReadiness(store.getState()).ok) return;
    if (!store.getState().compositionDirty) {
      return;
    }

    const validation = validatePageComposition(
      store.getState().draftComposition,
    );
    if (!validation.valid) {
      store.setState({ diagnostics: validation.diagnostics });
      return;
    }

    const previousState = store.getState();
    store.setState({ compositionSaving: true, compositionOutcome: "Salvando composição..." });
    let result;
    try { result = await activeCompositionService.saveComposition(validation.composition); }
    catch (error) { result = { ok: false, message: error.message, code: "COMPOSITION_SAVE_FAILED" }; }
    if (!result.ok) {
      store.setState({
        compositionSaving: false, compositionOutcome: result.message,
        draftComposition: previousState.draftComposition,
        loadedComposition: previousState.loadedComposition,
        savedComposition: previousState.savedComposition,
        compositionDirty: true,
        diagnostics: [
          {
            code: result.code,
            severity: "error",
            message: result.message,
          },
          ...(result.diagnostics || []),
        ],
      });
      return;
    }

    const savedComposition = createDraftComposition(result.composition);
    store.setState({
      compositionSaving: false, compositionOutcome: "Salvo neste computador.",
      savedComposition,
      loadedComposition: createDraftComposition(savedComposition),
      draftComposition: createDraftComposition(savedComposition),
      compositionDirty: false,
      build: {
        status: "idle",
        message: "Composição salva. Gere o site para atualizar dist/.",
        diagnostics: [],
        output: "",
        previewUrl: null,
      },
      diagnostics: [],
    });
  });

  generateSiteButton.addEventListener("click", async () => {
    if (generateSiteButton.disabled) return;
    const readiness = buildController.getReadiness();
    if (!readiness.ok) {
      store.setState({
        build: {
          status: "failed",
          message: readiness.message,
          diagnostics: readiness.diagnostics || [],
          output: "",
          previewUrl: null,
        },
      });
      return;
    }

    const revision = store.getState().revision;
    const building = buildController.runBuild();
    store.setState({
      build: {
        status: "running",
        message: "Gerando site...",
        diagnostics: [],
        output: "",
        previewUrl: null,
      },
    });

    const result = await operationResult(building);
    const current = revision === store.getState().revision;

    store.setState({
      receipts: { ...store.getState().receipts, build: result.ok && current ? { revision } : null },
      build: {
        status: !current ? "stale" : result.ok ? "success" : "failed",
        message: result.ok
          ? current ? "Prévia gerada." : "Prévia desatualizada. Gere o site novamente."
          : result.message || "Site generation failed.",
        diagnostics: result.diagnostics || [],
        output: result.output || "",
        previewUrl: null,
      },
    });
  });

  previewGeneratedSiteButton.addEventListener("click", async () => {
    if (previewGeneratedSiteButton.disabled) return;
    const revision = store.getState().revision;
    const previewing = buildController.previewGeneratedSite();
    store.setState({ previewOpening: true });
    let result;
    try { result = await operationResult(previewing); }
    finally { store.setState({ previewOpening: false }); }
    if (revision !== store.getState().revision) return;

    if (!result.ok) {
      store.setState({
        build: {
          ...store.getState().build,
          status: "failed",
          message: result.message || "Não foi possível abrir a prévia.",
          diagnostics: result.diagnostics || [],
        },
      });
      return;
    }

    store.setState({
      build: {
        ...store.getState().build,
        status: "success",
        message: "Prévia local do site gerado pronta.",
        previewUrl: result.url,
      },
    });
  });

  connectFtpButton.addEventListener("click", async () => {
    if (connectFtpButton.disabled) return;
    const profile = readPublishProfileFromForm();
    store.setState({
      remote: {
        status: "connecting",
        message: "Conectando ao servidor...",
        currentPath: "/",
        entries: [],
        diagnostics: [],
      },
    });

    const result = await operationResult(publishController.connect(
      profile,
      publishPasswordInput.value,
    ));

    if (!result.ok) {
      store.setState({
        remote: {
          status: "error",
          message: result.message || "Não foi possível conectar ao servidor.",
          currentPath: "/",
          entries: [],
          diagnostics: result.diagnostics || [
            { code: result.code, severity: "error", message: result.message },
          ],
        },
      });
      return;
    }

    store.setState({
      remote: {
        status: "connected",
        message: result.message || "Conectado ao servidor.",
        currentPath: "/",
        entries: [],
        diagnostics: [],
      },
    });

    await loadRemoteDirectory("/");
  });

  remoteUpButton.addEventListener("click", async () => {
    const currentPath = store.getState().remote?.currentPath || "/";
    if (currentPath === "/") return;
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    await loadRemoteDirectory(segments.length ? `/${segments.join("/")}` : "/");
  });

  remoteReloadButton.addEventListener("click", async () => {
    await loadRemoteDirectory(store.getState().remote?.currentPath || "/");
  });

  useCurrentAsSourceButton.addEventListener("click", () => {
    publishRemoteSourcePathInput.value = store.getState().remote?.currentPath || "/";
  });

  useCurrentAsPublishButton.addEventListener("click", () => {
    publishRemotePathInput.value = store.getState().remote?.currentPath || "/";
  });

  savePublishProfileButton.addEventListener("click", async () => {
    if (savePublishProfileButton.disabled) return;
    showPublishFeedbackIn(remoteCard);
    const profile = readPublishProfileFromForm();
    const saving = publishController.saveProfile(
      profile,
      publishPasswordInput.value,
    );
    store.setState({ profileSaving: true });
    let result;
    try { result = await operationResult(saving); }
    finally { store.setState({ profileSaving: false }); }

    if (!result.ok) {
      store.setState({
        publish: {
          status: "error",
          message: result.message,
          profile,
          diagnostics: result.diagnostics || [
            {
              code: result.code,
              severity: "error",
              message: result.message,
            },
          ],
          summary: null,
        },
      });
      return;
    }

    hydratePublishProfile(result.profile);
    store.setState({
      publish: {
        status: "configured",
        message: "Destino de publicação configurado.",
        profile: result.profile,
        diagnostics: [],
        summary: null,
      },
    });
  });

  testFtpConnectionButton.addEventListener("click", async () => {
    if (testFtpConnectionButton.disabled) return;
    showPublishFeedbackIn(remoteCard);
    const profile = readPublishProfileFromForm();
    store.setState({
      publish: {
        status: "testing",
        message: "Testando conexão FTP...",
        profile,
        diagnostics: [],
        summary: null,
      },
    });

    const result = await operationResult(publishController.testConnection(
      profile,
      publishPasswordInput.value,
    ));

    store.setState({
      publish: {
        status:
          result.ok && result.code === "FTP_READY" ? "ready" : result.ok ? "configured" : "error",
        message: result.ok
          ? result.message || "Conexão FTP validada."
          : result.message || "Falha ao testar conexão FTP.",
        profile: {
          ...profile,
          hasPassword:
            Boolean(publishPasswordInput.value) || profile.hasPassword === true,
        },
        diagnostics: result.diagnostics || [
          ...(result.ok
            ? []
            : [
                {
                  code: result.code,
                  severity: "error",
                  message: result.message,
                },
              ]),
        ],
        summary: result.summary || null,
      },
    });
  });

  openRemoteProjectButton.addEventListener("click", async () => {
    if (openRemoteProjectButton.disabled) return;
    showPublishFeedbackIn(projectRemote);
    const profile = readPublishProfileFromForm();
    const retrieval = publishController.retrieveRemoteProject(profile, publishPasswordInput.value);
    store.setState({
      publish: {
        status: "retrieving",
        message: "Abrindo projeto remoto...",
        profile,
        diagnostics: [],
        summary: null,
      },
    });

    const result = await operationResult(retrieval);

    if (!result.ok) {
      store.setState({
        publish: {
          status: "error",
          message: result.message || "Não foi possível abrir o projeto remoto.",
          profile,
          diagnostics: [
            {
              code: result.code,
              severity: "error",
              message: result.message,
            },
          ],
          summary: null,
        },
      });
      return;
    }

    await activateProjectDirectory(result.directory);
    store.setState({
      publish: {
        status: "configured",
        message: "Projeto remoto aberto em cópia local de trabalho.",
        profile: {
          ...profile,
          hasPassword:
            Boolean(publishPasswordInput.value) || profile.hasPassword === true,
        },
        diagnostics: [],
        summary: {
          remoteSourcePath: profile.remoteSourcePath,
          remotePublishPath: profile.remotePublishPath,
          workspacePath: result.directory.path,
        },
      },
    });
  });

  publishSiteButton.addEventListener("click", async () => {
    if (publishSiteButton.disabled) return;
    showPublishFeedbackIn(publishCard);
    const state = store.getState();
    const profile = state.publish?.profile || readPublishProfileFromForm();
    const confirmed = (documentRef.defaultView || window).confirm(
      `Publicar o site gerado?\n\nSite generated: ready\nServer: configured\nDestination: ${profile.remotePublishPath}`,
    );

    if (!confirmed) return;

    // Validate the tested destination before changing the UI to its busy state.
    const publication = publishController.publish(
      profile,
      publishPasswordInput.value,
    );
    store.setState({
      publish: {
        ...state.publish,
        status: "publishing",
        message: "Publicando site...",
        diagnostics: [],
      },
    });

    const result = await operationResult(publication);
    const current = state.revision === store.getState().revision && JSON.stringify(profile) === JSON.stringify(store.getState().publish.profile);

    store.setState({
      receipts: { ...store.getState().receipts, publication: result.ok && current ? { revision: state.revision } : null },
      publish: {
        ...store.getState().publish,
        status: result.ok ? "success" : "failed",
        message: result.ok
          ? current ? "Site publicado nesta sessão." : "Publicação concluída para o contexto anterior. Estado atual não verificado."
          : result.message || "Falha ao publicar o site.",
        diagnostics: result.ok
          ? []
          : [
              {
                code: result.code,
                severity: "error",
                message: result.message,
              },
            ],
        summary: result.ok && current ? result.manifest || null : null,
      },
    });
  });

  updateRemoteSourceButton.addEventListener("click", async () => {
    if (updateRemoteSourceButton.disabled) return;
    showPublishFeedbackIn(publishCard);
    const state = store.getState();
    const profile = state.publish?.profile || readPublishProfileFromForm();

    if (!state.openedProject || state.openedProject.status !== "valid") {
      store.setState({
        publish: {
          ...state.publish,
          status: "failed",
          message: "Abra um projeto Labfonac válido antes de atualizar o projeto remoto.",
          diagnostics: [
            {
              code: "REMOTE_PROJECT_LOCAL_INVALID",
              severity: "error",
              message:
                "Abra um projeto Labfonac válido antes de atualizar o projeto remoto.",
            },
          ],
        },
      });
      return;
    }

    const confirmed = (documentRef.defaultView || window).confirm(
      `Atualizar o projeto editável remoto?\n\nProjeto: ${profile.remoteSourcePath}\nSite publicado: ${profile.remotePublishPath}`,
    );

    if (!confirmed) return;

    const updating = publishController.updateRemoteProjectSource(state.openedProject, profile, publishPasswordInput.value);
    store.setState({
      publish: {
        ...state.publish,
        status: "publishing",
        message: "Atualizando projeto remoto...",
        diagnostics: [],
      },
    });

    const result = await operationResult(updating);
    const current = state.revision === store.getState().revision && JSON.stringify(profile) === JSON.stringify(store.getState().publish.profile);

    store.setState({
      receipts: { ...store.getState().receipts, source: result.ok && current ? { revision: state.revision } : null },
      publish: {
        ...store.getState().publish,
        status: result.ok ? "configured" : "failed",
        message: result.ok
          ? current ? "Projeto remoto atualizado." : "Atualização concluída para o contexto anterior. Estado atual não verificado."
          : result.message || "Falha ao atualizar o projeto remoto.",
        diagnostics: result.ok
          ? []
          : [
              {
                code: result.code,
                severity: "error",
                message: result.message,
              },
            ],
        summary: {
          remoteSourceUpdated: result.ok && current,
          remoteSourcePath: profile.remoteSourcePath,
          remotePublishPath: profile.remotePublishPath,
        },
      },
    });
  });

  hydrateFromSource(store.getState().projectSource);

  const updateOperationUi = (state) => {
    const busy = getBusyReadiness(state);
    const editing = getEditingReadiness(state);
    const profile = readPublishProfileFromForm();
    const password = publishPasswordInput.value;
    const unavailable = (message) => ({ ok: false, message });
    const apply = (button, readiness) => {
      button.disabled = !readiness.ok;
      const reason = operationReasons.get(button);
      if (reason) {
        reason.textContent = readiness.ok ? "" : readiness.message;
        reason.hidden = readiness.ok;
      }
    };
    apply(connectFtpButton, busy.ok ? getProfileReadiness(profile, password, true) : busy);
    apply(testFtpConnectionButton, busy.ok ? getProfileReadiness(profile, password) : busy);
    const connectionReason = operationReasons.get(connectFtpButton);
    const testReason = operationReasons.get(testFtpConnectionButton);
    const sharedReason = !connectionReason.hidden && !testReason.hidden && connectionReason.textContent === testReason.textContent;
    testReason.hidden = testReason.hidden || sharedReason;
    testFtpConnectionButton.setAttribute("aria-describedby", sharedReason ? connectionReason.id : testReason.id);
    apply(openRemoteProjectButton, getRetrievalReadiness(state, profile, password));
    apply(openProjectButton, !busy.ok ? busy : state.contentDirty || state.compositionDirty ? unavailable("Salve ou descarte as alterações antes de abrir outro projeto.") : busy);
    apply(saveCompositionButton, !editing.ok ? editing : !state.compositionDirty ? unavailable("Nenhuma alteração para salvar.") : !activeCompositionService.canSave ? unavailable("Abra o projeto no aplicativo desktop para salvar.") : !validatePageComposition(state.draftComposition).valid ? unavailable("Corrija a composição antes de salvar.") : editing);
    apply(generateSiteButton, buildController.getReadiness());
    apply(previewGeneratedSiteButton, getGeneratedPreviewReadiness(state));
    apply(updateRemoteSourceButton, getSourceUpdateReadiness(state, state.publish?.profile || profile, password));
    apply(publishSiteButton, getPublicationReadiness(state));
    savePublishProfileButton.disabled = !busy.ok;
    for (const input of [...publishForm.querySelectorAll("input"), ...publishRoleForm.querySelectorAll("input")]) input.disabled = !busy.ok;
    for (const button of [remoteReloadButton, useCurrentAsSourceButton, useCurrentAsPublishButton]) button.disabled = !busy.ok || state.remote?.status !== "connected";
    remoteUpButton.disabled = !busy.ok || state.remote?.status !== "connected" || state.remote?.currentPath === "/";
    remoteListing.querySelectorAll("button").forEach((button) => { button.disabled = !busy.ok; });
    const validComposition = !!state.draftComposition && validatePageComposition(state.draftComposition).valid;
    sectionList.querySelectorAll("button,input").forEach((node) => { if (!editing.ok || !validComposition) node.disabled = true; });
    addSelect.disabled = !editing.ok || !addSelect.value;
    addButton.disabled = !editing.ok || !addSelect.value || !validComposition;
    positionSelect.disabled = !editing.ok || !validComposition;
    previewButton.disabled = !editing.ok || !validComposition;
    discardCompositionButton.disabled = !editing.ok || !state.compositionDirty;
    const values = {
      server: state.remote?.status === "connected" ? "conectado nesta sessão" : "não verificado",
      project: state.openedProject?.status === "valid" ? "aberto" : state.openedProject ? "inválido" : "nenhum",
      changes: state.contentDirty || state.compositionDirty ? "não salvas" : "nenhuma não salva",
      source: state.receipts.source ? "atualizado nesta sessão" : "estado desconhecido",
      build: state.build?.status === "stale" ? "desatualizada" : state.build?.status === "running" ? "gerando" : state.build?.status === "success" ? "atual" : "não gerada",
      publication: state.receipts.publication ? "publicada nesta sessão" : "não realizada no contexto atual",
    };
    for (const [key, value] of Object.entries(values)) if (summaryValues[key].textContent !== value) summaryValues[key].textContent = value;
    customEditor.render();
  };
  const profileChanged = (event) => {
    showPublishFeedbackIn(event && publishForm.contains(event.target) ? remoteCard : projectRemote);
    store.setState({
      receipts: { ...store.getState().receipts, source: null, publication: null },
      ...(event && publishForm.contains(event.target) ? { remote: { ...DEFAULT_REMOTE_STATE } } : {}),
      publish: { ...store.getState().publish, profile: readPublishProfileFromForm(), status: "configured", summary: null, message: "Destino alterado. Teste a conexão." },
    });
  };
  publishForm.addEventListener("input", profileChanged);
  publishRoleForm.addEventListener("input", profileChanged);
  useCurrentAsSourceButton.addEventListener("click", profileChanged);
  useCurrentAsPublishButton.addEventListener("click", profileChanged);

  const unsubscribeStatus = store.subscribe(updateStatus);
  const unsubscribeComposition = store.subscribe(updateCompositionUi);
  const unsubscribeProjectContent = store.subscribe(updateProjectContentUi);
  const unsubscribeBuild = store.subscribe(updateBuildUi);
  const unsubscribePublish = store.subscribe(updatePublishUi);
  const unsubscribeRemote = store.subscribe(updateRemoteUi);
  const unsubscribeOperations = store.subscribe(updateOperationUi);
  updateStatus(store.getState());
  updateCompositionUi(store.getState());
  updateProjectContentUi(store.getState());
  updateBuildUi(store.getState());
  updatePublishUi(store.getState());
  updateRemoteUi(store.getState());
  updateOperationUi(store.getState());

  publishController.loadProfile().then((result) => {
    if (!result.ok || !result.profile || store.getState().publish?.profile) return;
    hydratePublishProfile(result.profile);
    store.setState({
      publish: {
        status: "configured",
        message: "Destino de publicação configurado.",
        profile: result.profile,
        diagnostics: [],
        summary: null,
      },
    });
  });

  return {
    element: wrapper,
    unsubscribe() {
      contentEditor.destroy();
      unsubscribeStatus();
      unsubscribeComposition();
      unsubscribeProjectContent();
      unsubscribeBuild();
      unsubscribePublish();
      unsubscribeRemote();
      unsubscribeOperations();
    },
  };
}

async function loadCompositionIntoStore(store, compositionService) {
  try {
    const savedComposition = createDraftComposition(
      await compositionService.loadComposition(),
    );
    const validation = validatePageComposition(savedComposition);

    store.setState({
      savedComposition,
      loadedComposition: createDraftComposition(savedComposition),
      draftComposition: createDraftComposition(savedComposition),
      compositionDirty: false,
      diagnostics: validation.diagnostics,
      compositionSaveAvailable: compositionService.canSave === true,
    });
  } catch (error) {
    store.setState({
      lastError:
        error instanceof Error
          ? error.message
          : "Falha ao carregar composição da página.",
    });
  }
}

export function initEditorApp(options = {}) {
  const {
    documentRef = document,
    containerId = "editor-root",
    initialState = createInitialEditorState(),
    storageRef = safeGetLocalStorage(documentRef),
    compositionService = createBrowserCompositionService(),
    previewData = {},
    desktopHost = createDesktopHost(documentRef.defaultView || window),
  } = options;

  const container = getContainer(documentRef, containerId);
  const persistedSource = loadPersistedSource(storageRef);
  const effectiveState = persistedSource
    ? { ...initialState, projectSource: persistedSource }
    : initialState;
  const store = createEditorStore(effectiveState);
  const layout = createLayout(
    documentRef,
    store,
    storageRef,
    compositionService,
    previewData,
    desktopHost,
  );

  container.innerHTML = "";
  container.appendChild(layout.element);

  const ready = loadCompositionIntoStore(store, compositionService);

  return {
    store,
    ready,
    destroy() {
      layout.unsubscribe();
      container.innerHTML = "";
    },
  };
}

export function startEditorApp(options = {}) {
  try {
    const api = initEditorApp(options);
    return { ok: true, api };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "EDITOR_BOOTSTRAP_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Falha desconhecida na inicialização do editor.",
      },
    };
  }
}

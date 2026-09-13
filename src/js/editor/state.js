export function createInitialEditorState() {
  return {
    appStatus: "idle",
    currentView: "home",
    projectSource: null,
    projectSnapshotPath: null,
    openedProject: null,
    editorSiteModel: null,
    loadedComposition: null,
    savedComposition: null,
    draftComposition: null,
    compositionDirty: false,
    compositionSaveAvailable: false,
    build: {
      status: "idle",
      message: "Gere o site depois de salvar as alterações.",
      diagnostics: [],
      output: "",
      previewUrl: null,
    },
    publish: {
      status: "unconfigured",
      message: "Configure o destino de publicação.",
      profile: null,
      diagnostics: [],
      summary: null,
    },
    remote: {
      status: "idle",
      message: "Informe os dados de conexão e clique em Conectar.",
      currentPath: "/",
      entries: [],
      diagnostics: [],
    },
    diagnostics: [],
    lastError: null,
  };
}

export function createEditorStore(initialState = createInitialEditorState()) {
  const session = () => ({ revision: 0, receipts: { source: null, build: null, publication: null } });
  let state = { ...initialState, ...session() };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    const changed = ["openedProject", "editorSiteModel", "draftComposition"].some((key) => key in patch && patch[key] !== state[key]) || ["contentDirty", "compositionDirty"].some((key) => patch[key] === true && !state[key]);
    const destinationChanged = patch.publish && JSON.stringify(patch.publish.profile) !== JSON.stringify(state.publish?.profile);
    const next = { ...state, ...patch };
    if (changed) {
      next.revision = state.revision + 1;
      next.receipts = { source: null, build: null, publication: null };
      if ('openedProject' in patch && !patch.build) next.build = { status: "idle", previewUrl: null, message: "Gere o site para este projeto.", diagnostics: [] };
      if (state.receipts.source || state.receipts.publication) {
        next.publish = { ...next.publish, summary: null, message: "Contexto local alterado. Estado remoto não verificado." };
      }
      if (!('openedProject' in patch) && (state.build?.status === "success" || state.build?.status === "stale")) {
        next.build = { ...next.build, status: "stale", previewUrl: null, message: "Prévia desatualizada. Gere o site novamente." };
      }
    } else if (destinationChanged) {
      next.receipts = { ...next.receipts, source: null, publication: null };
    }
    if (patch.build?.status === "running") next.receipts = { ...next.receipts, build: null, publication: null };
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function reset(nextState = createInitialEditorState()) {
    state = { ...nextState, ...session() };
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState,
    setState,
    subscribe,
    reset,
  };
}

export function getBusyReadiness(state) {
  const busy = state.imageSelecting || state.contentLoading || state.contentSaving || state.compositionSaving || state.projectOpening || state.profileSaving || state.previewOpening ||
    state.build?.status === "running" || ["connecting", "listing"].includes(state.remote?.status) ||
    ["testing", "retrieving", "publishing"].includes(state.publish?.status);
  return busy ? { ok: false, code: "EDITOR_BUSY", message: "Aguarde a operação em andamento." } : { ok: true };
}

export function getEditingReadiness(state) {
  if (state.openedProject?.status !== "valid") return { ok: false, code: "EDITOR_PROJECT_INVALID", message: "Abra um projeto válido para editar." };
  return getBusyReadiness(state);
}

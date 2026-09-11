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
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function reset(nextState = createInitialEditorState()) {
    state = { ...nextState };
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState,
    setState,
    subscribe,
    reset,
  };
}

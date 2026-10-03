const USER_GUIDE_URL = "https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md";
const LATEST_RELEASE_URL = "https://github.com/Wisleyv/lab-fon-ufrj/releases/latest";

function installEditorMenu({ app, Menu, dialog, shell, BrowserWindow }) {
  let showingAbout = false;
  async function showAbout() {
    if (showingAbout) return;
    showingAbout = true;
    try {
      const options = {
        type: "info",
        title: "Sobre o Editor Labfonac",
        message: "Editor Labfonac",
        detail: `Versão ${app.getVersion()}\n\nDesenvolvimento do Editor: Wisley Vilela`,
        buttons: ["Fechar", "Guia do usuário", "Baixar a versão mais recente"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      };
      const window = BrowserWindow.getFocusedWindow();
      const { response } = await (window
        ? dialog.showMessageBox(window, options)
        : dialog.showMessageBox(options));
      // Only these fixed HTTPS destinations can leave the application.
      if (response === 1) await shell.openExternal(USER_GUIDE_URL);
      else if (response === 2) await shell.openExternal(LATEST_RELEASE_URL);
    } catch {
      dialog.showErrorBox("Editor Labfonac", "Não foi possível abrir a janela ou o link solicitado.");
    } finally { showingAbout = false; }
  }

  const menu = Menu.buildFromTemplate([
    { label: "Arquivo", submenu: [
      { label: "Fechar janela", role: "close" },
      { label: "Sair", role: "quit" },
    ] },
    { label: "Editar", submenu: [
      { label: "Desfazer", role: "undo" },
      { label: "Refazer", role: "redo" },
      { type: "separator" },
      { label: "Recortar", role: "cut" },
      { label: "Copiar", role: "copy" },
      { label: "Colar", role: "paste" },
      { label: "Selecionar tudo", role: "selectAll" },
    ] },
    { label: "Exibir", submenu: [
      { label: "Tamanho original", role: "resetZoom" },
      { label: "Ampliar", role: "zoomIn" },
      { label: "Reduzir", role: "zoomOut" },
      { type: "separator" },
      { label: "Tela cheia", role: "togglefullscreen" },
    ] },
    { label: "Janela", submenu: [{ label: "Minimizar", role: "minimize" }] },
    { label: "Ajuda", submenu: [{ label: "Sobre o Editor Labfonac", click: showAbout }] },
  ]);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = { installEditorMenu };

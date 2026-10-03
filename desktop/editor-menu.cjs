const USER_GUIDE_URL = "https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md";
const SOURCE_URL = "https://github.com/Wisleyv/lab-fon-ufrj";
const LICENSE_URL = "https://opensource.org/license/mit";
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
        message: `Editor Labfonac — Versão ${app.getVersion()}`,
        detail: "Ferramenta de manutenção do site do Laboratório de Fonética Acústica - UFRJ. Requer um projeto compatível com o fluxo de trabalho do laboratório e, para publicação, acesso a um servidor configurado para esse projeto.\n\nConcepção e desenvolvimento: Wisley Vilela\nFinanciamento: PPGLEV/UFRJ\n\nSoftware de código aberto sob a MIT License.",
        buttons: ["Fechar", "Guia do usuário", "Código-fonte", "Licença MIT", "Última versão"],
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
      else if (response === 2) await shell.openExternal(SOURCE_URL);
      else if (response === 3) await shell.openExternal(LICENSE_URL);
      else if (response === 4) await shell.openExternal(LATEST_RELEASE_URL);
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

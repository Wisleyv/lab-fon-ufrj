import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
const require = createRequire(import.meta.url);
const { installEditorMenu } = require("../../desktop/editor-menu.cjs");

function fixture(response = 0) {
  const services = {
    app: { getVersion: vi.fn(() => "1.2.3") },
    Menu: { buildFromTemplate: vi.fn(template => template), setApplicationMenu: vi.fn() },
    dialog: { showMessageBox: vi.fn(async () => ({ response })), showErrorBox: vi.fn() },
    shell: { openExternal: vi.fn(async () => {}) },
    BrowserWindow: { getFocusedWindow: vi.fn(() => null) },
  };
  const menu = installEditorMenu(services);
  return { ...services, menu, about: menu.at(-1).submenu[0].click };
}

describe("Portuguese native Editor menu", () => {
  it("installs localized roles and obtains Sobre version at runtime", async () => {
    const { menu, Menu, app, dialog, shell, about } = fixture();
    expect(menu.map(item => item.label)).toEqual(["Arquivo", "Editar", "Exibir", "Janela", "Ajuda"]);
    expect(Menu.setApplicationMenu).toHaveBeenCalledWith(menu);
    expect(menu[1].submenu.find(item => item.role === "copy").label).toBe("Copiar");
    app.getVersion.mockReturnValue("2.4.6");
    await about();
    const options = dialog.showMessageBox.mock.calls[0][0];
    expect(options.detail).toBe("Versão 2.4.6\n\nDesenvolvimento do Editor: Wisley Vilela");
    expect(JSON.stringify(options)).not.toMatch(/orcid/i);
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it.each([
    [1, "https://github.com/Wisleyv/lab-fon-ufrj/blob/main/docs/GUIA-DO-USUARIO.md"],
    [2, "https://github.com/Wisleyv/lab-fon-ufrj/releases/latest"],
  ])("opens only the approved link for response %s", async (response, url) => {
    const { about, shell } = fixture(response);
    await about();
    expect(shell.openExternal).toHaveBeenCalledExactlyOnceWith(url);
  });

  it("parents Sobre to the focused window and handles link failures", async () => {
    const { about, BrowserWindow, shell, dialog } = fixture(1);
    const owner = {};
    BrowserWindow.getFocusedWindow.mockReturnValue(owner);
    shell.openExternal.mockRejectedValue(new Error("cannot open"));
    await about();
    expect(dialog.showMessageBox.mock.calls[0][0]).toBe(owner);
    expect(dialog.showErrorBox).toHaveBeenCalledOnce();
    await about();
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(2);
  });
});

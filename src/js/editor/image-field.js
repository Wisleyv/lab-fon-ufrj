import { createElement as el } from "../utils/helpers.js";
import { isCustomTeamPhoto, TEAM_PLACEHOLDER_URL, TEAM_PLACEHOLDER_PATH } from "../sections/team-photo.js";

export function createImageField({ host, directory, value, alt, canEdit, onBusy, onChange, kind = "photo" }) {
  const logo = kind === "logo";
  const label = logo ? "Logo" : "Foto";
  const noun = logo ? "logo" : "foto";
  const emptyMessage = logo ? "Sem logo." : "Sem foto.";
  const failureMessage = logo ? "Não foi possível carregar o logo." : "Não foi possível carregar a foto.";
  const element = el("div", { className: "editor-image-field", role: "group", "aria-label": label });
  const image = el("img", { alt, width: "160", height: "160" });
  image.hidden = true;
  const preview = el("div", { className: "editor-image-preview" });
  const status = el("p", { role: "status" }, value ? "Carregando imagem..." : emptyMessage);
  const currentPath = el("output", { className: "editor-image-path", "aria-label": logo ? "Arquivo do logo" : "Arquivo da foto" }, value || "");
  const choose = el("button", { type: "button", className: "editor-btn editor-btn-secondary", "data-focus-key": kind }, `${value ? "Alterar" : "Carregar"} ${noun}`);
  choose.dataset.edge = String(typeof host.selectProjectImage !== "function");
  const remove = el("button", { type: "button", className: "editor-btn editor-btn-danger", "data-focus-key": `remove-${kind}` }, `Remover ${noun}`);
  remove.hidden = logo ? !value : !isCustomTeamPhoto(value);
  preview.append(image);
  element.append(el("p", {}, label), preview, currentPath, choose, remove, status);
  let disposed = false, revision = 0;
  const placeholder = (message = emptyMessage) => {
    if (logo) { image.removeAttribute("src"); image.hidden = true; preview.hidden = true; }
    else { image.src = TEAM_PLACEHOLDER_URL; image.alt = ""; image.hidden = false; }
    status.textContent = message;
  };
  const show = (result) => {
    if (disposed) return;
    if (result?.ok && typeof result.previewUrl === "string" && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(result.previewUrl)) {
      image.src = result.previewUrl; image.alt = alt; image.hidden = false; preview.hidden = false; status.textContent = "";
    } else placeholder("Imagem indisponível.");
  };
  image.addEventListener("error", () => {
    if (image.getAttribute("src") !== TEAM_PLACEHOLDER_URL) placeholder("Imagem indisponível.");
  });
  if (value && (logo || value.replace(/^\//, "") !== TEAM_PLACEHOLDER_PATH)) {
    const request = revision;
    Promise.resolve().then(() => host.readProjectImage?.(directory, value)).then((result) => {
      if (revision === request) show(result);
    }).catch(() => { if (revision === request) show(null); });
  } else placeholder();
  remove.addEventListener("click", () => {
    if (disposed || !canEdit() || remove.hidden) return;
    revision++;
    onChange(""); currentPath.textContent = "";
    remove.hidden = true; choose.textContent = `Carregar ${noun}`;
    placeholder(); choose.focus();
  });
  choose.addEventListener("click", async () => {
    if (disposed || !canEdit() || typeof host.selectProjectImage !== "function") return;
    onBusy(true);
    try {
      const result = await host.selectProjectImage(directory);
      if (disposed) return;
      if (result?.cancelled) { status.textContent = "Seleção cancelada."; return; }
      if (!result?.ok || !/^assets\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(result.path || "")) {
        status.textContent = result?.message || failureMessage; return;
      }
      revision++;
      onChange(result.path);
      currentPath.textContent = result.path;
      choose.textContent = `Alterar ${noun}`;
      remove.hidden = false;
      show(result);
    } catch { if (!disposed) status.textContent = failureMessage; }
    finally { onBusy(false); if (!disposed) choose.focus(); }
  });
  return { element, destroy() { disposed = true; revision++; image.removeAttribute("src"); } };
}

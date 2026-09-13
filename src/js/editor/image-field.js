import { createElement as el } from "../utils/helpers.js";

export function createImageField({ host, directory, value, alt, canEdit, onBusy, onChange }) {
  const element = el("div", { className: "editor-image-field", role: "group", "aria-label": "Foto" });
  const image = el("img", { alt, width: "160", height: "160" });
  image.hidden = true;
  const preview = el("div", { className: "editor-image-preview" });
  const status = el("p", { role: "status" }, value ? "Carregando imagem..." : "Sem foto.");
  const currentPath = el("output", { className: "editor-image-path", "aria-label": "Arquivo da foto" }, value || "");
  const choose = el("button", { type: "button", className: "editor-btn editor-btn-secondary", "data-focus-key": "photo" }, value ? "Alterar foto" : "Carregar foto");
  choose.dataset.edge = String(typeof host.selectProjectImage !== "function");
  preview.append(image);
  element.append(el("p", {}, "Foto"), preview, currentPath, choose, status);
  let disposed = false, revision = 0;
  const show = (result) => {
    if (disposed) return;
    if (result?.ok && typeof result.previewUrl === "string" && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(result.previewUrl)) {
      image.src = result.previewUrl; image.hidden = false; status.textContent = "";
    } else { image.hidden = true; image.removeAttribute("src"); status.textContent = "Imagem indisponível."; }
  };
  image.addEventListener("error", () => { image.hidden = true; status.textContent = "Imagem indisponível."; });
  if (value) {
    const request = revision;
    Promise.resolve().then(() => host.readProjectImage?.(directory, value)).then((result) => {
      if (revision === request) show(result);
    }).catch(() => { if (revision === request) show(null); });
  }
  choose.addEventListener("click", async () => {
    if (disposed || !canEdit() || typeof host.selectProjectImage !== "function") return;
    onBusy(true);
    try {
      const result = await host.selectProjectImage(directory);
      if (disposed) return;
      if (result?.cancelled) { status.textContent = "Seleção cancelada."; return; }
      if (!result?.ok || !/^assets\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(result.path || "")) {
        status.textContent = result?.message || "Não foi possível carregar a foto."; return;
      }
      revision++;
      onChange(result.path);
      currentPath.textContent = result.path;
      choose.textContent = "Alterar foto";
      show(result);
    } catch { if (!disposed) status.textContent = "Não foi possível carregar a foto."; }
    finally { onBusy(false); if (!disposed) choose.focus(); }
  });
  return { element, destroy() { disposed = true; revision++; image.removeAttribute("src"); } };
}

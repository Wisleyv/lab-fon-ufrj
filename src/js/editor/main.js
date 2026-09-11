import { startEditorApp } from "./bootstrap.js";

const result = startEditorApp();

if (result.ok) {
  window.__LABFON_EDITOR__ = result.api;
} else {
  console.error(result.error.message);

  const fallback = document.createElement("div");
  fallback.className = "editor-fallback-error";
  fallback.setAttribute("role", "alert");
  fallback.textContent = result.error.message;
  document.body.appendChild(fallback);
}

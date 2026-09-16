export const PROVALE_INSTAGRAM = "https://www.instagram.com/provaleinterinstitucional/";
export const INSTAGRAM_SCRIPT = "https://www.instagram.com/embed.js";

export function normalizeInstagramURL(value) {
  if (typeof value !== "string" || !value.trim() || /[\s\\]/.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
        url.username || url.password || url.port || url.hash ||
        !/^\/provaleinterinstitucional\/?$/i.test(url.pathname) ||
        [...url.searchParams.keys()].some((key) => !["utm_source", "utm_campaign"].includes(key))) return null;
    return PROVALE_INSTAGRAM;
  } catch { return null; }
}

export function normalizeInstagramInput(value, documentRef = document) {
  const url = normalizeInstagramURL(value);
  if (url) return url;
  if (typeof value !== "string" || value.length > 20000 || !value.trim().startsWith("<")) return null;
  // Disconnected template contents do not execute scripts or load their resources.
  const template = documentRef.createElement("template");
  template.innerHTML = value;
  const nodes = [...template.content.querySelectorAll("*")];
  const quotes = template.content.querySelectorAll("blockquote.instagram-media[data-instgrm-permalink]");
  if (quotes.length !== 1 || !normalizeInstagramURL(quotes[0].getAttribute("data-instgrm-permalink"))) return null;
  const allowed = new Set(["BLOCKQUOTE", "DIV", "P", "SPAN", "A", "BR", "svg", "g", "path", "SCRIPT"]);
  for (const node of nodes) {
    if (!allowed.has(node.tagName)) return null;
    for (const attr of node.attributes) {
      if (/^on/i.test(attr.name) || ["srcdoc", "action", "formaction", "xlink:href"].includes(attr.name)) return null;
      if (["href", "data-instgrm-permalink"].includes(attr.name) && !normalizeInstagramURL(attr.value)) return null;
      if (attr.name === "src" && (node.tagName !== "SCRIPT" || attr.value !== INSTAGRAM_SCRIPT)) return null;
    }
    if (node.tagName === "SCRIPT" && (node.getAttribute("src") !== INSTAGRAM_SCRIPT || node.textContent.trim() ||
        [...node.attributes].some((attr) => !["src", "async", "defer"].includes(attr.name)))) return null;
  }
  return PROVALE_INSTAGRAM;
}

const loaders = new WeakMap();
export function loadInstagram(documentRef) {
  const win = documentRef.defaultView;
  if (!win || win.labfonDesktopHost) return Promise.resolve(false);
  if (loaders.has(documentRef)) return loaders.get(documentRef);
  const loaded = new Promise((resolve) => {
    const script = documentRef.createElement("script");
    script.src = INSTAGRAM_SCRIPT;
    script.async = true;
    const finish = (ok) => {
      win.clearTimeout(timer);
      script.onload = script.onerror = null;
      if (!ok) script.remove();
      resolve(ok);
    };
    const timer = win.setTimeout(() => finish(false), 8000);
    script.onload = () => finish(typeof win.instgrm?.Embeds?.process === "function");
    script.onerror = () => finish(false);
    documentRef.head.append(script);
  });
  loaders.set(documentRef, loaded);
  return loaded;
}

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const { isSourceFile } = require("../desktop/source-manifest.cjs");
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const imageKeys = new Set(["foto", "logo", "src", "source", "fallback"]);
const media = /\.(?:png|jpe?g|webp|gif|svg|ico|avif|bmp|woff2?|ttf|otf|mp4|webm|mp3|wav|ogg|pdf)$/i;

export async function auditAssets(root) {
  const unresolved = [], invalid = [], missing = [], external = [];
  const files = [];
  async function walk(relative) {
    let entries;
    try { entries = await fs.readdir(path.join(root, relative), { withFileTypes: true }); }
    catch (error) {
      if (error.code !== "ENOENT") unresolved.push({ source: relative, reason: error.code });
      return;
    }
    for (const entry of entries.sort((a, b) => compare(a.name, b.name))) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isSymbolicLink()) unresolved.push({ source: file, reason: "symbolic link not followed" });
      else if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && isSourceFile(file)) files.push(file);
    }
  }
  for (const directory of ["content", "src", "public/assets"]) await walk(directory);
  files.push("index.html");
  files.sort(compare);
  const assets = new Map();
  for (const file of files.filter(file => file.startsWith("public/assets/") || file.startsWith("src/assets/"))) {
    try {
      const bytes = await fs.readFile(path.join(root, file));
      assets.set(file, { path: file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), references: [] });
    } catch (error) { unresolved.push({ source: file, reason: `unreadable asset: ${error.code}` }); }
  }
  const references = new Map();
  function reference(raw, source, field, kind, relativeTo) {
    if (typeof raw !== "string" || !raw.trim() || raw.startsWith("#")) return;
    raw = raw.trim();
    const evidence = { source, field, value: raw, kind };
    if (/^(?:https?:)?\/\//i.test(raw)) { external.push(evidence); return; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      if (!raw.startsWith("data:")) invalid.push({ ...evidence, reason: "unsupported asset URL scheme" });
      else unresolved.push({ ...evidence, reason: "inline data asset is outside file inventory" });
      return;
    }
    let clean;
    try { clean = decodeURIComponent(raw.split(/[?#]/)[0]); }
    catch { invalid.push({ ...evidence, reason: "invalid URL encoding" }); return; }
    if (clean.includes("\\") || clean.split("/").includes("..")) {
      invalid.push({ ...evidence, reason: "unsafe or ambiguous asset path" }); return;
    }
    clean = clean.replace(/^\/labfonac\//, "").replace(/^\//, "").replace(/^\.\//, "");
    if (clean.endsWith("/")) {
      unresolved.push({ ...evidence, reason: "asset directory or computed path prefix" }); return;
    }
    const target = clean.startsWith("assets/") ? `public/${clean}`
      : clean.startsWith("src/assets/") ? clean
      : relativeTo ? path.posix.join(path.posix.dirname(relativeTo), clean) : null;
    if (!target || !isSourceFile(target) || !/^(?:public\/assets|src\/assets)\//.test(target)) {
      unresolved.push({ ...evidence, reason: "asset path outside managed source boundary" }); return;
    }
    if (!references.has(target)) references.set(target, []);
    references.get(target).push(evidence);
  }
  function srcset(value, source, field, kind) {
    if (typeof value !== "string") { invalid.push({ source, field, reason: "non-string srcset" }); return; }
    for (const candidate of value.split(",")) {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) continue;
      if (parts.length > 2 || (parts[1] && !/^(?:\d+w|(?:\d+(?:\.\d+)?)x)$/.test(parts[1]))) {
        invalid.push({ source, field, value: candidate, reason: "invalid srcset candidate" });
      }
      reference(parts[0], source, field, kind);
    }
  }
  function jsonReferences(value, source, field = "$") {
    if (Array.isArray(value)) return value.forEach((item, index) => jsonReferences(item, source, `${field}[${index}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      const location = `${field}.${key}`;
      if (key === "srcset" && item) srcset(item, source, location, "canonical");
      else if (typeof item === "string" && item &&
          (imageKeys.has(key) || /^(?:\/?(?:labfonac\/)?assets\/|\/?src\/assets\/|images\/)/.test(item))) {
        reference(item, source, location, "canonical");
      } else if (item && typeof item === "object") jsonReferences(item, source, location);
    }
  }
  function documentReferences(text, source, kind, relativeTo) {
    const dom = new JSDOM(text);
    for (const element of dom.window.document.querySelectorAll("[src], [srcset], [href], [xlink\\:href]")) {
      if (element.hasAttribute("srcset")) srcset(element.getAttribute("srcset"), source, "srcset", kind);
      for (const attribute of ["src", "href", "xlink:href"]) {
        const value = element.getAttribute(attribute);
        if (value && (relativeTo || /(?:^|\/)assets\//.test(value))) reference(value, source, attribute, kind, relativeTo);
      }
    }
    dom.window.close();
    cssReferences(text, source, kind, relativeTo);
  }
  function cssReferences(text, source, kind, relativeTo) {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) reference(match[1].trim(), source, "url()", kind, relativeTo);
  }
  for (const file of files) {
    if (assets.has(file)) continue;
    let text;
    try { text = await fs.readFile(path.join(root, file), "utf8"); }
    catch (error) { unresolved.push({ source: file, reason: `unreadable reference source: ${error.code}` }); continue; }
    if (file.startsWith("content/")) {
      try { jsonReferences(JSON.parse(text), file); }
      catch { unresolved.push({ source: file, reason: "invalid canonical JSON" }); }
    } else if (file === "index.html") documentReferences(text, file, "fixed");
    else if (file.endsWith(".css")) cssReferences(text, file, "fixed");
    else if (file.endsWith(".js")) {
      // Only complete quoted asset literals are evidence; computed paths need review.
      for (const match of text.matchAll(/["']((?:\/?(?:labfonac\/)?assets\/|\/?src\/assets\/)[^"'\r\n]+)["']/g)) {
        reference(match[1], file, "static literal", "fixed");
      }
    }
  }
  const inspected = new Set();
  for (;;) {
    const pending = [...references.keys()].filter(file => assets.has(file) && !inspected.has(file)).sort(compare);
    if (!pending.length) break;
    for (const file of pending) {
      inspected.add(file);
      if (/\.(svg|css)$/i.test(file)) {
        const text = await fs.readFile(path.join(root, file), "utf8");
        if (file.endsWith(".svg")) documentReferences(text, file, "dependency", file);
        else cssReferences(text, file, "dependency", file);
      }
    }
  }
  for (const [target, evidence] of references) {
    if (assets.has(target)) assets.get(target).references = evidence;
    else missing.push({ path: target, references: evidence });
  }
  const all = [...assets.values()].sort((a, b) => compare(a.path, b.path));
  const retained = all.filter(asset => asset.references.length);
  const candidates = all.filter(asset => !asset.references.length && media.test(asset.path));
  const unknown = all.filter(asset => !asset.references.length && !media.test(asset.path));
  for (const asset of unknown) unresolved.push({ source: asset.path, reason: "unreferenced non-media project asset; retain pending review" });
  const groups = new Map();
  for (const asset of all) {
    const key = `${asset.bytes}:${asset.sha256}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(asset);
  }
  const duplicates = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const first = await fs.readFile(path.join(root, group[0].path));
    let exact = true;
    for (const asset of group.slice(1)) if (!first.equals(await fs.readFile(path.join(root, asset.path)))) exact = false;
    if (exact) duplicates.push({ paths: group.map(asset => asset.path), bytesPerFile: group[0].bytes, redundantBytes: group[0].bytes * (group.length - 1), sha256: group[0].sha256 });
  }
  const stable = list => list.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)));
  const count = list => ({ count: list.length, bytes: list.reduce((sum, asset) => sum + asset.bytes, 0) });
  return {
    version: 1,
    scope: "Local canonical content and public website source; generated output and remote inventory are not scanned",
    limitations: ["Static source literals only; computed asset paths need review", "Disabled canonical content references remain retained", "External assets are recorded but not fetched", "Candidates are not authorization for deletion", "Duplicate groups overlap retention categories; redundant bytes are not guaranteed cleanup savings"],
    summary: { assets: count(all), retained: count(retained), fixed: count(retained.filter(asset => asset.references.some(ref => ref.kind === "fixed"))), candidates: count(candidates), unresolvedAssets: count(unknown), duplicateGroups: duplicates.length, duplicateRedundantBytes: duplicates.reduce((sum, group) => sum + group.redundantBytes, 0), missing: missing.length, invalid: invalid.length, unresolved: unresolved.length },
    retained, candidates, duplicates: stable(duplicates), missing: stable(missing), invalid: stable(invalid), unresolved: stable(unresolved), external: stable(external),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.cwd();
  const report = await auditAssets(root);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0) {
    const output = process.argv[outputIndex + 1];
    if (!output || !/^docs\/[A-Za-z0-9_.-]+\.json$/.test(output)) throw new Error("Report output must be a JSON file under docs/");
    await fs.writeFile(path.join(root, output), json);
    console.log(JSON.stringify(report.summary, null, 2));
  } else process.stdout.write(json);
}

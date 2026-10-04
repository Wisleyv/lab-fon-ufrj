const SOURCE_ENTRIES = [
  { path: "content", directory: true, pattern: /\.json$/ },
  { path: "scripts/build-data.js" },
  { path: "src", directory: true, pattern: /^src\/(?:css\/main\.css|js\/(?:main|site-content|header-scroll)\.js|js\/(?:adapters|modules|page|sections|utils)\/.+\.js|assets\/images\/.+)$/ },
  { path: "package.json" },
  { path: "package-lock.json" },
  { path: "index.html" },
  { path: "vite.config.js" },
  // Raster image selection is performed by the shared reference audit.
  { path: "public/assets", directory: true, optional: true },
  { path: "public/publication_references.json", optional: true },
];

const REQUIRED_SOURCE_MARKERS = [
  "package.json", "package-lock.json", "content/page.json", "content/site.json",
  "scripts/build-data.js", "src/js/main.js", "src/css/main.css", "index.html", "vite.config.js",
];

function isSourceFile(relativePath) {
  if (!relativePath || relativePath.includes("\\") || relativePath.startsWith("/") ||
      relativePath.split("/").some(part => !part || part === "." || part === "..")) return false;
  return SOURCE_ENTRIES.some(entry =>
    (entry.directory ? relativePath.startsWith(`${entry.path}/`) : relativePath === entry.path) &&
    (!entry.pattern || entry.pattern.test(relativePath))
  );
}

module.exports = { SOURCE_ENTRIES, REQUIRED_SOURCE_MARKERS, isSourceFile };

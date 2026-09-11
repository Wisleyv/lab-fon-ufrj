import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

const isEditorDesktopBuild = process.env.LABFON_EDITOR_BUILD === "true";

export default defineConfig({
  root: ".",
  base: isEditorDesktopBuild
    ? "./"
    : "/labfonac/", // Subpath for deployment on both staging and production servers
  build: {
    outDir: process.env.BUILD_OUTPUT || "dist", // Flexible output: dist for CI/Netlify, C:/labfonac for local
    emptyOutDir: true, // Clean output directory before build
    rollupOptions: {
      input: {
        index: "index.html",
        editor: "editor.html",
      },
      output: {
        entryFileNames: "js/[name].[hash].js",
        chunkFileNames: "js/[name].[hash].js",
        assetFileNames: "assets/[name].[hash][extname]",
      },
    },
    minify: "esbuild",
    sourcemap: false, // Disable sourcemaps for production
  },
  server: {
    fs: {
      // Preserve Vite's default deny list and keep local archives private.
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.sanitization-backup/**"],
    },
    port: 3000,
    strictPort: true, // Don't try other ports if 3000 is busy
    open: true,
    host: true, // Listen on all addresses
    watch: {
      usePolling: true, // Better file watching on Windows/OneDrive
      interval: 100, // Check for changes every 100ms
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "**/.sanitization-backup/**"],
    globals: true,
    environment: "jsdom",
    fileParallelism: false,
  },
});

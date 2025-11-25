import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/labfonac/", // Subpath for deployment on both staging and production servers
  build: {
    outDir: "C:/labfonac", // Build directly to deployment folder
    emptyOutDir: true, // Clean output directory before build
    rollupOptions: {
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
    globals: true,
    environment: "jsdom",
  },
});

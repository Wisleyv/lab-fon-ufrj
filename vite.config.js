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
    open: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});

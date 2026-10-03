import path from "node:path";
import { loadConfigFromFile } from "vite";

export default async function portableConfig(environment) {
  const loaded = await loadConfigFromFile(environment, path.resolve("vite.config.js"));
  if (!loaded) throw new Error("Project Vite configuration could not be loaded");
  const config = loaded.config;
  return {
    ...config,
    build: {
      ...config.build,
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        ...config.build?.rollupOptions,
        input: { index: "index.html" },
      },
    },
  };
}

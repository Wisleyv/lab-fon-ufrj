const fs = require("node:fs/promises");
const path = require("node:path");

async function exists(filename) {
  try { await fs.access(filename); return true; } catch { return false; }
}

async function runPortableBuild(root, runCommand) {
  const portable = await exists(path.join(root, "vite.config.js"));
  let preparation = { ok: true, output: "" };
  // An inherited Vite executable cannot satisfy imports in a retrieved workspace.
  if (portable && !await exists(path.join(root, "node_modules", "vite", "package.json"))) {
    if (!await exists(path.join(root, "package-lock.json"))) return {
      ok: false, code: "BUILD_DEPENDENCIES_UNAVAILABLE", command: "npm ci", output: "",
      message: "Não foi possível preparar a geração: package-lock.json não foi encontrado no projeto aberto.",
    };
    preparation = await runCommand("npm", ["ci"], root);
    if (!preparation.ok) return { ...preparation, code: "BUILD_DEPENDENCIES_FAILED",
      message: "Não foi possível instalar as dependências do projeto aberto." };
    if (!await exists(path.join(root, "node_modules", "vite", "package.json"))) return {
      ok: false, code: "BUILD_DEPENDENCIES_UNAVAILABLE", command: "npm ci", output: preparation.output,
      message: "As dependências instaladas não incluem o Vite necessário para gerar o site.",
    };
  }
  const args = ["run", "build"];
  if (portable) {
    // Local tooling cache is outside the canonical portable-source manifest.
    const relative = "node_modules/.labfon-build/vite.config.mjs";
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(__dirname, "portable-vite.config.mjs"), target);
    args.push("--", "--config", relative);
  }
  const result = await runCommand("npm", args, root);
  return { ...result, output: `${preparation.output || ""}${result.output || ""}` };
}

module.exports = { runPortableBuild };

/**
 * Build script: Consolidate individual content JSON files into public/data.json
 * Runs automatically before Vite build (both local and CI)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createDefaultPageComposition } from "../src/js/page/default-composition.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONTENT_DIR = path.join(__dirname, "../content");
export const OUTPUT_FILE = path.join(__dirname, "../public/data.json");

/**
 * Read all JSON files from a directory
 */
export function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  return jsonFiles.map((file) => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  });
}

export function readPageComposition(contentDir = CONTENT_DIR) {
  const pagePath = path.join(contentDir, "page.json");

  if (!fs.existsSync(pagePath)) {
    console.warn(`⚠️  Page composition not found: ${pagePath}`);
    return createDefaultPageComposition();
  }

  try {
    return JSON.parse(fs.readFileSync(pagePath, "utf8"));
  } catch (error) {
    console.warn(`⚠️  Page composition could not be read: ${error.message}`);
    return createDefaultPageComposition();
  }
}

export function readJsonFile(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`⚠️  JSON file could not be read: ${error.message}`);
    return fallback;
  }
}

/**
 * Main consolidation function
 */
export function consolidateData({
  contentDir = CONTENT_DIR,
  outputFile = OUTPUT_FILE,
} = {}) {
  console.log("📦 Consolidating content files...");

  const data = {
    site: readJsonFile(path.join(contentDir, "site.json"), {}),
    page: readPageComposition(contentDir),
    equipe: readJsonFiles(path.join(contentDir, "equipe")),
    linhas_pesquisa: readJsonFiles(path.join(contentDir, "linhas")),
    parcerias: readJsonFiles(path.join(contentDir, "parcerias")),
    publicacoes: readJsonFiles(path.join(contentDir, "publicacoes")),
    extensao: readJsonFile(path.join(contentDir, "extensao.json"), {
      projects: [],
    }),
    trabalhos: [
      {
        titulo: "Análise acústica de vogais do português brasileiro",
        autores: ["Maria Silva", "João Santos"],
        ano: 2024,
        veiculo: "Revista de Estudos da Linguagem",
        tipo: "artigo",
        link: "https://exemplo.com/artigo1.pdf",
      },
      {
        titulo: "Variação prosódica em dialetos do Rio de Janeiro",
        autores: ["Ana Paula Costa"],
        ano: 2023,
        veiculo: "Cadernos de Linguística",
        tipo: "artigo",
        link: "https://exemplo.com/artigo2.pdf",
      },
    ],
  };

  // Sort equipe by category order
  const categoryOrder = [
    "coordenacao",
    "docentes",
    "pos_graduacao",
    "graduacao",
    "egressos",
  ];
  data.equipe.sort((a, b) => {
    return (
      categoryOrder.indexOf(a.categoria) - categoryOrder.indexOf(b.categoria)
    );
  });

  // Sort linhas_pesquisa by ordem field
  data.linhas_pesquisa.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Sort publicacoes by year (newest first)
  data.publicacoes.sort((a, b) => (b.year || 0) - (a.year || 0));

  // Write consolidated file
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf8");

  console.log("✅ Consolidated data written to:", outputFile);
  console.log(`   - Equipe: ${data.equipe.length} members`);
  console.log(`   - Linhas de Pesquisa: ${data.linhas_pesquisa.length} lines`);
  console.log(`   - Parcerias: ${data.parcerias.length} partnerships`);
  console.log(`   - Publicações: ${data.publicacoes.length} publications`);

  return data;
}

// Run consolidation
if (process.argv[1] === __filename) {
  try {
    consolidateData();
  } catch (error) {
    console.error("❌ Error consolidating data:", error);
    process.exit(1);
  }
}

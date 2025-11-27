/**
 * Build script: Consolidate individual content JSON files into public/data.json
 * Runs automatically before Vite build (both local and CI)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content');
const OUTPUT_FILE = path.join(__dirname, '../public/data.json');

/**
 * Read all JSON files from a directory
 */
function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  return jsonFiles.map(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  });
}

/**
 * Main consolidation function
 */
function consolidateData() {
  console.log('📦 Consolidating content files...');

  const data = {
    equipe: readJsonFiles(path.join(CONTENT_DIR, 'equipe')),
    linhas_pesquisa: readJsonFiles(path.join(CONTENT_DIR, 'linhas')),
    parcerias: readJsonFiles(path.join(CONTENT_DIR, 'parcerias')),
    publicacoes: readJsonFiles(path.join(CONTENT_DIR, 'publicacoes')),
    sobre: {
      titulo: "Sobre o Laboratório",
      descricao: "O Laboratório de Fonética da UFRJ é um centro de excelência em pesquisa fonética e fonológica, dedicado ao estudo científico dos sons da fala humana.",
      missao: "Desenvolver pesquisas de ponta em fonética experimental e aplicada, formar pesquisadores qualificados e contribuir para o avanço do conhecimento sobre a língua portuguesa."
    },
    trabalhos: [
      {
        titulo: "Análise acústica de vogais do português brasileiro",
        autores: ["Maria Silva", "João Santos"],
        ano: 2024,
        veiculo: "Revista de Estudos da Linguagem",
        tipo: "artigo",
        link: "https://exemplo.com/artigo1.pdf"
      },
      {
        titulo: "Variação prosódica em dialetos do Rio de Janeiro",
        autores: ["Ana Paula Costa"],
        ano: 2023,
        veiculo: "Cadernos de Linguística",
        tipo: "artigo",
        link: "https://exemplo.com/artigo2.pdf"
      }
    ]
  };

  // Sort equipe by category order
  const categoryOrder = ['coordenacao', 'docentes', 'pos_graduacao', 'graduacao', 'egressos'];
  data.equipe.sort((a, b) => {
    return categoryOrder.indexOf(a.categoria) - categoryOrder.indexOf(b.categoria);
  });

  // Sort linhas_pesquisa by ordem field
  data.linhas_pesquisa.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Sort publicacoes by year (newest first)
  data.publicacoes.sort((a, b) => (b.year || 0) - (a.year || 0));

  // Write consolidated file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  
  console.log('✅ Consolidated data written to:', OUTPUT_FILE);
  console.log(`   - Equipe: ${data.equipe.length} members`);
  console.log(`   - Linhas de Pesquisa: ${data.linhas_pesquisa.length} lines`);
  console.log(`   - Parcerias: ${data.parcerias.length} partnerships`);
  console.log(`   - Publicações: ${data.publicacoes.length} publications`);
}

// Run consolidation
try {
  consolidateData();
} catch (error) {
  console.error('❌ Error consolidating data:', error);
  process.exit(1);
}

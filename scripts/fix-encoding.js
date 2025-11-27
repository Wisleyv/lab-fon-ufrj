/**
 * Fix character encoding in all content JSON files
 * Replaces corrupted UTF-8 sequences with correct Portuguese characters
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content');

// Mapping of corrupted sequences to correct characters
const ENCODING_FIXES = {
  '├º': 'ç',
  '├¡': 'í',
  '├®': 'ê',
  '├│': 'ó',
  '├úo': 'ão',
  '├úa': 'ãa',
  '├ú': 'ã',
  '├á': 'à',
  '├¬': 'ê',
  '├ºalves': 'çalves',
  '├ºao': 'ção',
  '├®ncia': 'ência',
  '├¡fica': 'ífica',
  '├│rio': 'ório',
  'C├ómara': 'Câmara',
  'Para├¡ba': 'Paraíba',
  'Jo├úo': 'João',
  'Su├®zia': 'Suézia',
  'Assump├º├úo': 'Assumpção',
  'Brand├úo': 'Brandão',
  'Sus├ú': 'Susã',
  'Ara├║jo': 'Araújo',
  'Descri├º├úo': 'Descrição',
};

function fixEncoding(text) {
  let fixed = text;
  for (const [corrupted, correct] of Object.entries(ENCODING_FIXES)) {
    fixed = fixed.replaceAll(corrupted, correct);
  }
  return fixed;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has encoding issues
  if (!content.includes('├')) {
    return false; // No issues
  }
  
  const fixed = fixEncoding(content);
  fs.writeFileSync(filePath, fixed, 'utf8');
  return true;
}

function processDirectory(dir) {
  let fixedCount = 0;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (entry.name.endsWith('.json')) {
      if (processFile(fullPath)) {
        console.log(`✅ Fixed: ${path.relative(CONTENT_DIR, fullPath)}`);
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('🔧 Fixing character encoding in content files...\n');

const fixedCount = processDirectory(CONTENT_DIR);

console.log(`\n✅ Fixed ${fixedCount} files with encoding issues`);

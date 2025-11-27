/**
 * Migration script: Split data.json into individual content files
 * Run once to populate content/ folders for CMS editing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = path.join(__dirname, '../data-backup.json');
const PUBLICATIONS_FILE = path.join(__dirname, '../public/publication_references.json');
const CONTENT_DIR = path.join(__dirname, '../content');

/**
 * Create slug from name (lowercase, spaces to hyphens, remove accents)
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Migrate data to individual files
 */
function migrateData() {
  console.log('📦 Migrating data.json to individual content files...\n');

  // Read backup file
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));

  // Migrate equipe
  console.log(`Migrating ${data.equipe.length} team members...`);
  data.equipe.forEach(member => {
    const slug = createSlug(member.nome);
    const filename = path.join(CONTENT_DIR, 'equipe', `${slug}.json`);
    fs.writeFileSync(filename, JSON.stringify(member, null, 2), 'utf8');
  });

  // Migrate linhas_pesquisa
  console.log(`Migrating ${data.linhas_pesquisa.length} research lines...`);
  data.linhas_pesquisa.forEach(linha => {
    const slug = linha.id || createSlug(linha.nome);
    const filename = path.join(CONTENT_DIR, 'linhas', `${slug}.json`);
    fs.writeFileSync(filename, JSON.stringify(linha, null, 2), 'utf8');
  });

  // Migrate parcerias
  console.log(`Migrating ${data.parcerias.length} partnerships...`);
  data.parcerias.forEach(parceria => {
    const slug = createSlug(parceria.sigla || parceria.nome);
    const filename = path.join(CONTENT_DIR, 'parcerias', `${slug}.json`);
    fs.writeFileSync(filename, JSON.stringify(parceria, null, 2), 'utf8');
  });

  // Migrate publicacoes from publication_references.json
  let publicationsCount = 0;
  if (fs.existsSync(PUBLICATIONS_FILE)) {
    const pubData = JSON.parse(fs.readFileSync(PUBLICATIONS_FILE, 'utf8'));
    const references = pubData.references || [];
    
    console.log(`Migrating ${references.length} publications...`);
    
    references.forEach(ref => {
      // Convert complex format to CMS schema
      const authors = ref.authors?.map(a => 
        a.type === 'person' ? `${a.given_name} ${a.family_name}` : a.name
      ) || [];
      
      const year = parseInt(ref.imprint?.date) || 2024;
      const title = ref.title || 'Untitled';
      
      // Map type to CMS options
      const typeMap = {
        'special-issue': 'article',
        'undergraduate-thesis': 'thesis',
        'article': 'article',
        'book': 'book',
        'chapter': 'chapter',
        'conference': 'conference'
      };
      
      const publication = {
        type: typeMap[ref.type] || 'article',
        title: title,
        authors: authors,
        year: year,
        journal: ref.container?.title || '',
        volume: ref.container?.volume || '',
        issue: ref.container?.issue || '',
        pages: ref.pages || '',
        doi: ref.doi || '',
        url: ref.access?.url || ''
      };
      
      const slug = createSlug(title.substring(0, 50)); // Limit slug length
      const filename = path.join(CONTENT_DIR, 'publicacoes', `${year}-${slug}.json`);
      fs.writeFileSync(filename, JSON.stringify(publication, null, 2), 'utf8');
      publicationsCount++;
    });
  }

  console.log('\n✅ Migration complete!');
  console.log(`   - ${data.equipe.length} team members`);
  console.log(`   - ${data.linhas_pesquisa.length} research lines`);
  console.log(`   - ${data.parcerias.length} partnerships`);
  console.log(`   - ${publicationsCount} publications`);
  console.log('\n💡 Now run: npm run build');
}

// Run migration
try {
  migrateData();
} catch (error) {
  console.error('❌ Migration error:', error);
  process.exit(1);
}

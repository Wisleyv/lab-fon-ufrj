# GitHub CMS Implementation Guide
**Lab Fonética UFRJ - Complete Setup & Operation Tutorial**

---

## Overview

This guide explains how to implement a GitHub-based Content Management System (CMS) for the Lab Fonética website, even when the final deployment is to a university server (posvernaculas.letras.ufrj.br/labfonac) via SFTP or file transfer.

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTENT EDITORS (Researchers/Coordinators)                      │
│                                                                  │
│ 1. Login to Netlify CMS                                         │
│ 2. Edit content via web interface                               │
│ 3. Click "Publish"                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB REPOSITORY (lab-fon-ufrj)                                │
│                                                                  │
│ - Stores data.json with all content                             │
│ - Tracks every change (version history)                         │
│ - Triggers automation on commit                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ GITHUB ACTIONS (Automated Build & Deploy)                       │
│                                                                  │
│ 1. Detect commit to main branch                                 │
│ 2. Run npm install                                              │
│ 3. Run npm run build (creates production files)                 │
│ 4. Upload files to university server via SFTP                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ UNIVERSITY SERVER (posvernaculas.letras.ufrj.br)                │
│                                                                  │
│ - Folder: /labfonac/                                            │
│ - Files: index.html, CSS, JS, data.json, images                 │
│ - Public access via browser                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Point:** Editors never touch SFTP. They edit via web interface. GitHub Actions handles the technical deployment automatically.

---

## Prerequisites

### What You Need

1. **GitHub Account** (free)
   - Repository: Already exists (Wisleyv/lab-fon-ufrj)
   - Write access for all content editors

2. **Netlify Account** (free tier sufficient)
   - Used only for hosting the CMS interface
   - Does NOT host the actual website

3. **University Server Access**
   - SFTP credentials (username, password, host)
   - Write permission to `/labfonac/` folder
   - Note: Only needed for initial setup, stored securely in GitHub Secrets

4. **Local Development** (for setup only)
   - Node.js 18+ installed
   - Git installed
   - VS Code or similar editor

---

## Part 1: Initial Setup (One-Time, ~2 Hours)

### Step 1: Configure Netlify CMS

**1.1: Create CMS configuration file**

Create `public/admin/config.yml`:

```yaml
# Netlify CMS Configuration
# Lab Fonética UFRJ

backend:
  name: github
  repo: Wisleyv/lab-fon-ufrj
  branch: main
  base_url: https://api.netlify.com
  auth_endpoint: auth

# Publishing mode: editorial workflow with drafts
publish_mode: editorial_workflow

# Media files (team photos, etc.)
media_folder: "public/assets/images"
public_folder: "/assets/images"

# Collections (sections of the website)
collections:
  # Team Members (Equipe)
  - name: "equipe"
    label: "Equipe"
    label_singular: "Membro da Equipe"
    folder: "content/equipe"
    create: true
    slug: "{{slug}}"
    format: "json"
    editor:
      preview: false
    fields:
      - {label: "Nome Completo", name: "nome", widget: "string", required: true}
      - {label: "Instituição", name: "instituicao", widget: "string", required: true}
      - {label: "Categoria", name: "categoria", widget: "select", 
         options: ["coordenacao", "docentes", "pos_graduacao", "graduacao", "egressos"], required: true}
      - {label: "Foto", name: "foto", widget: "image", required: false, 
         hint: "Foto do membro (opcional - usa avatar padrão se não fornecida)"}
      - {label: "Link Lattes", name: "lattes", widget: "string", required: true,
         pattern: ['^http(s)?://lattes\.cnpq\.br/\d+$', 'Deve ser URL válida do Lattes CNPq']}

  # Publications (Publicações)
  - name: "publicacoes"
    label: "Publicações"
    label_singular: "Publicação"
    folder: "content/publicacoes"
    create: true
    slug: "{{year}}-{{slug}}"
    format: "json"
    editor:
      preview: false
    fields:
      - {label: "Tipo", name: "type", widget: "select",
         options: ["article", "book", "chapter", "thesis", "conference"], required: true}
      - {label: "Título", name: "title", widget: "string", required: true}
      - {label: "Autores", name: "authors", widget: "list", required: true,
         hint: "Lista de autores (um por linha)"}
      - {label: "Ano", name: "year", widget: "number", required: true, min: 1950, max: 2100}
      - {label: "Revista/Editora", name: "journal", widget: "string", required: false}
      - {label: "Volume", name: "volume", widget: "string", required: false}
      - {label: "Número", name: "issue", widget: "string", required: false}
      - {label: "Páginas", name: "pages", widget: "string", required: false}
      - {label: "DOI", name: "doi", widget: "string", required: false,
         pattern: ['^10\.\d{4,}/.+$', 'DOI deve começar com 10.']}
      - {label: "URL", name: "url", widget: "string", required: false}

  # Research Lines (Linhas de Pesquisa)
  - name: "linhas_pesquisa"
    label: "Linhas de Pesquisa"
    label_singular: "Linha de Pesquisa"
    folder: "content/linhas"
    create: true
    slug: "{{slug}}"
    format: "json"
    editor:
      preview: false
    fields:
      - {label: "ID", name: "id", widget: "string", required: true,
         hint: "Identificador único (sem espaços, minúsculas)"}
      - {label: "Nome", name: "nome", widget: "string", required: true}
      - {label: "Ícone Font Awesome", name: "icon", widget: "string", required: true,
         hint: "Ex: fa-solid fa-wave-square"}
      - {label: "Número de Estudantes", name: "estudantes", widget: "number", required: true, min: 0}
      - {label: "Número de Pesquisadores", name: "pesquisadores", widget: "number", required: true, min: 0}
      - {label: "Descrição", name: "descricao", widget: "text", required: true}
      - {label: "Ordem de Exibição", name: "ordem", widget: "number", required: true, min: 1}

  # Partnerships (Parcerias)
  - name: "parcerias"
    label: "Parcerias"
    label_singular: "Parceria"
    folder: "content/parcerias"
    create: true
    slug: "{{slug}}"
    format: "json"
    editor:
      preview: false
    fields:
      - {label: "Nome da Instituição", name: "nome", widget: "string", required: true}
      - {label: "Sigla", name: "sigla", widget: "string", required: true}
      - {label: "Localização", name: "localizacao", widget: "string", required: true,
         hint: "Ex: João Pessoa, PB ou Paris, França"}
      - {label: "Tipo", name: "tipo", widget: "select",
         options: ["universidade", "agencia-fomento", "internacional"], required: true}
      - {label: "Descrição", name: "descricao", widget: "text", required: true}
      - {label: "Website", name: "url", widget: "string", required: true,
         pattern: ['^https?://.+', 'Deve ser URL válida (http:// ou https://)']}
```

**1.2: Create CMS entry point**

Create `public/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lab Fonética - Administração</title>
  <script src="https://unpkg.com/netlify-cms@^2.0.0/dist/netlify-cms.js"></script>
  <style>
    /* Custom CMS styling */
    :root {
      --primary-color: #054CAA;
      --secondary-color: #f7941d;
    }
  </style>
</head>
<body>
  <!-- Netlify CMS loads here -->
</body>
</html>
```

**1.3: Commit CMS files**

```bash
git add public/admin/
git commit -m "feat(cms): Add Netlify CMS configuration"
git push origin main
```

---

### Step 2: Connect GitHub to Netlify

**2.1: Create Netlify Site**

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize Netlify to access your GitHub account
5. Select repository: `Wisleyv/lab-fon-ufrj`
6. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `C:/labfonac` (or `dist` - we'll adjust later)
   - **Branch:** `main`
7. Click "Deploy site"

**Important:** We're NOT using Netlify to host the public website. We're only using it for:
- OAuth authentication (login system)
- CMS interface hosting
- The actual site will still deploy to university server

**2.2: Configure Netlify Site**

After deployment:
1. Go to "Site settings" → "Domain management"
2. Note your site URL (e.g., `labfonac-cms.netlify.app`)
3. Optionally set custom domain: `admin.labfonac.com.br` (if you have domain)

**2.3: Enable Netlify Identity**

**Finding Site Settings in Netlify (Updated Navigation):**

After your site deploys successfully, Netlify's interface shows your site overview. Here's how to access Identity settings:

1. **From Site Overview Page:**
   - You'll see tabs at the top: "Overview", "Deploys", "Logs", "Configuration", etc.
   - Look for the top navigation bar with your site name
   - Click on the **"Site configuration"** button (or "Site settings" depending on Netlify's current UI)
   - **Alternative**: Look for a gear/cog icon near your site name

2. **In the Left Sidebar:**
   - Once in Site Configuration, look for a left sidebar menu
   - Scroll down to find **"Identity"** section (it may be grouped under "Security & Identity" or similar)
   - **If you don't see Identity**: Some Netlify accounts require enabling it from the main dashboard first
     - Go back to your main Netlify dashboard (app.netlify.com)
     - Look for "Enable Identity" as a featured action on your site card

3. **Enable Identity Service:**
   - Click on "Identity" in the sidebar
   - You'll see a button that says **"Enable Identity"** or "Enable Identity service"
   - Click this button to activate the service (this is a one-time setup)

4. **Configure Identity Settings:**
   - After enabling, you'll see several configuration sections:
   
   **Registration Preferences:**
   - Look for "Registration" or "Registration preferences" section
   - Select **"Invite only"** (prevents public signups)
   
   **External Providers:**
   - Find "External providers" or "Login providers" section
   - Click "Add provider" or toggle on **"GitHub"**
   - This allows CMS users to login with their GitHub accounts
   
   **Git Gateway:**
   - Scroll down to find "Services" or "Git Gateway" section
   - Click the button to **"Enable Git Gateway"**
   - This is critical - it allows Netlify CMS to commit changes back to your GitHub repository
   - You may need to authorize GitHub access when enabling this

**Troubleshooting Identity Setup:**

- **Can't find Identity?** 
  - Make sure you're logged into Netlify with the correct account
  - Check if your site has finished deploying (green checkmark)
  - Try the direct URL: `https://app.netlify.com/sites/[your-site-name]/identity`

- **Enable Identity button doesn't work?**
  - Refresh the page and try again
  - Check browser console for errors (F12)
  - Try a different browser (Chrome/Firefox recommended)

- **Git Gateway not appearing?**
  - Make sure you've enabled Identity first
  - Look under "Services" tab within Identity settings
  - You may need to scroll down to find it

---

### Step 3: Setup GitHub Actions for SFTP Deployment

**3.1: Create GitHub Action workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy to University Server

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout code
      - name: Checkout repository
        uses: actions/checkout@v4
        
      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      # 3. Install dependencies
      - name: Install dependencies
        run: npm ci
        
      # 4. Build production files
      - name: Build project
        run: npm run build
        
      # 5. Deploy via SFTP
      - name: Deploy to University Server
        uses: SamKirkland/FTP-Deploy-Action@v4.3.4
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./C:/labfonac/
          server-dir: /labfonac/
          protocol: ftps
          port: 21
          
      # 6. Notify success
      - name: Deployment notification
        if: success()
        run: |
          echo "✅ Deployment successful!"
          echo "Site updated at: https://posvernaculas.letras.ufrj.br/labfonac"
```

**3.2: Configure GitHub Secrets**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add three secrets:

   **FTP_SERVER:**
   ```
   ftp.posvernaculas.letras.ufrj.br
   ```
   (or whatever the university FTP server is)

   **FTP_USERNAME:**
   ```
   your_username_here
   ```

   **FTP_PASSWORD:**
   ```
   your_password_here
   ```

**Important Security Notes:**
- Secrets are encrypted and never visible after creation
- Only GitHub Actions can access these secrets
- They're not exposed in logs
- Rotate passwords periodically

**3.3: Commit workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(deploy): Add automated SFTP deployment"
git push origin main
```

This will trigger the first deployment automatically!

---

### Step 4: Restructure Content for CMS

Currently, all content is in `public/data.json`. We need to split it into individual files for CMS editing.

**4.1: Create content folders**

```bash
mkdir -p content/equipe
mkdir -p content/publicacoes
mkdir -p content/linhas
mkdir -p content/parcerias
```

**4.2: Create migration script**

Create `scripts/migrate-to-cms.js`:

```javascript
/**
 * Migrates data.json to CMS-friendly structure
 * Splits single JSON into individual files
 */

const fs = require('fs');
const path = require('path');

// Read current data.json
const dataPath = path.join(__dirname, '../public/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Migrate team members
data.equipe.forEach((membro, index) => {
  const filename = membro.nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')      // Replace spaces with hyphens
    .replace(/^-|-$/g, '');           // Trim hyphens
  
  const filepath = path.join(__dirname, `../content/equipe/${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(membro, null, 2));
  console.log(`✅ Created: ${filename}.json`);
});

// Migrate publications
data.publicacoes?.forEach((pub, index) => {
  const filename = `${pub.year}-${pub.title.substring(0, 50)}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const filepath = path.join(__dirname, `../content/publicacoes/${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(pub, null, 2));
  console.log(`✅ Created: ${filename}.json`);
});

// Migrate research lines
data.linhas_pesquisa?.forEach((linha) => {
  const filepath = path.join(__dirname, `../content/linhas/${linha.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(linha, null, 2));
  console.log(`✅ Created: ${linha.id}.json`);
});

// Migrate partnerships
data.parcerias?.forEach((parceria) => {
  const filename = parceria.sigla.toLowerCase();
  const filepath = path.join(__dirname, `../content/parcerias/${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(parceria, null, 2));
  console.log(`✅ Created: ${filename}.json`);
});

console.log('\n✅ Migration complete!');
console.log('📝 Next steps:');
console.log('1. Review generated files in content/ folders');
console.log('2. Commit changes: git add content/ && git commit -m "feat: Migrate to CMS structure"');
console.log('3. Update build script to consolidate files back to data.json');
```

**4.3: Run migration**

```bash
node scripts/migrate-to-cms.js
```

**4.4: Create build script to consolidate files**

Create `scripts/build-data.js`:

```javascript
/**
 * Consolidates individual CMS files back to data.json
 * Runs before Vite build
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const data = {
  equipe: [],
  publicacoes: [],
  linhas_pesquisa: [],
  parcerias: []
};

// Read all team members
const equipeFiles = glob.sync('content/equipe/*.json');
equipeFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.equipe.push(content);
});

// Read all publications
const pubFiles = glob.sync('content/publicacoes/*.json');
pubFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.publicacoes.push(content);
});

// Read all research lines
const linhasFiles = glob.sync('content/linhas/*.json');
linhasFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.linhas_pesquisa.push(content);
});

// Read all partnerships
const parceriasFiles = glob.sync('content/parcerias/*.json');
parceriasFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.parcerias.push(content);
});

// Sort team by category order
const categoryOrder = {
  coordenacao: 1,
  docentes: 2,
  pos_graduacao: 3,
  graduacao: 4,
  egressos: 5
};
data.equipe.sort((a, b) => {
  const orderDiff = (categoryOrder[a.categoria] || 99) - (categoryOrder[b.categoria] || 99);
  if (orderDiff !== 0) return orderDiff;
  return a.nome.localeCompare(b.nome, 'pt-BR');
});

// Sort publications by year (newest first)
data.publicacoes.sort((a, b) => b.year - a.year);

// Sort research lines by ordem
data.linhas_pesquisa.sort((a, b) => a.ordem - b.ordem);

// Sort partnerships alphabetically
data.parcerias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

// Write consolidated data.json
const outputPath = path.join(__dirname, '../public/data.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log('✅ data.json rebuilt successfully');
console.log(`📊 Statistics:`);
console.log(`   - Team members: ${data.equipe.length}`);
console.log(`   - Publications: ${data.publicacoes.length}`);
console.log(`   - Research lines: ${data.linhas_pesquisa.length}`);
console.log(`   - Partnerships: ${data.parcerias.length}`);
```

**4.5: Update package.json build script**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "node scripts/build-data.js && vite build",
    "preview": "vite preview"
  }
}
```

Now `npm run build` will:
1. Consolidate individual JSON files → `data.json`
2. Run Vite build → production files

**4.6: Commit all changes**

```bash
git add .
git commit -m "feat: Restructure for CMS and add build automation"
git push origin main
```

This will trigger automated deployment to university server!

---

## Part 2: User Operations (Daily Use)

### For Content Editors

**Step 1: Access CMS**

1. Open browser
2. Navigate to: `https://labfonac-cms.netlify.app/admin/`
3. Click "Login with Netlify Identity"
4. Click "Login with GitHub"
5. Authorize access (first time only)

**Step 2: Edit Content**

**Example: Adding a new team member**

1. In CMS dashboard, click "Equipe" in sidebar
2. Click "New Equipe" button
3. Fill in form:
   - Nome Completo: "Dr. João Silva"
   - Instituição: "UFRJ"
   - Categoria: Select "Docentes"
   - Foto: Click upload (or leave empty for avatar)
   - Link Lattes: "http://lattes.cnpq.br/1234567890"
4. Click "Save" (saves draft)
5. Click "Publish" → "Publish now"

**What happens automatically:**
1. CMS creates file: `content/equipe/dr-joao-silva.json`
2. Commits to GitHub with message: "Create Equipe "dr-joao-silva""
3. GitHub Action triggers:
   - Installs dependencies
   - Runs `build-data.js` (consolidates to data.json)
   - Runs Vite build
   - Uploads to university server via SFTP
4. ~2-3 minutes later, changes are live at posvernaculas.letras.ufrj.br/labfonac

**Step 3: Check Deployment Status**

1. Go to GitHub repository
2. Click "Actions" tab
3. See workflow runs (green checkmark = success, red X = failed)
4. Click on run to see detailed logs

**Step 4: Verify Changes**

1. Open https://posvernaculas.letras.ufrj.br/labfonac
2. Navigate to "Equipe" section
3. Confirm new member appears

---

### For Administrators

**Managing Users**

1. Go to Netlify: `https://app.netlify.com`
2. Select your site
3. Go to "Identity" tab
4. Click "Invite users"
5. Enter email addresses
6. Users receive invitation email
7. They click link, set password, can now access CMS

**Monitoring Deployments**

- GitHub Actions: See all deployments
- Netlify: See CMS activity
- University Server: Manual check if needed

**Rollback Procedure**

If bad content is published:

1. Go to GitHub repository
2. Navigate to file that needs rollback
3. Click "History" button
4. Find good version
5. Click "Revert this commit"
6. Automated deployment will restore old version

---

## Part 3: Advanced Configuration

### Custom Domain for CMS

If university provides subdomain (e.g., `admin.labfonac.ufrj.br`):

1. Get DNS access from university IT
2. Add CNAME record:
   ```
   admin.labfonac.ufrj.br → labfonac-cms.netlify.app
   ```
3. In Netlify: Site settings → Domain management → Add custom domain
4. Update `config.yml` backend URL if needed

### Image Optimization

Add to GitHub Actions workflow:

```yaml
- name: Optimize images
  run: |
    npm install -g imagemin-cli imagemin-webp
    imagemin content/**/*.{jpg,png} --plugin=webp --out-dir=public/assets/images/
```

### Backup Strategy

**Automatic (Already Included):**
- GitHub stores complete history
- Every change is a Git commit
- Can restore any previous version

**Manual Backup (Recommended Monthly):**

```bash
# Clone repository
git clone https://github.com/Wisleyv/lab-fon-ufrj.git backup-2025-11

# Create archive
zip -r lab-fonac-backup-2025-11.zip backup-2025-11

# Store in safe location (Google Drive, external HD)
```

---

## Part 4: Troubleshooting

### Problem: "Deployment Failed" in GitHub Actions

**Solution:**
1. Go to Actions tab
2. Click failed workflow
3. Check error message
4. Common issues:
   - SFTP credentials wrong: Update GitHub Secrets
   - Build error: Check `npm run build` locally
   - Permission denied: Check server folder permissions

### Problem: "Changes not appearing on live site"

**Solution:**
1. Check GitHub Actions completed successfully
2. Clear browser cache (Ctrl+F5)
3. Check university server folder has updated files
4. Verify correct FTP path in workflow

### Problem: "Can't login to CMS"

**Solution:**
1. Check Netlify Identity is enabled
2. Verify user invited via Netlify dashboard
3. Check email spam folder for invitation
4. Try different browser
5. Check Git Gateway is enabled

### Problem: "Image upload fails"

**Solution:**
1. Check file size (<5MB recommended)
2. Use supported formats (JPG, PNG, WebP)
3. Check media_folder path in config.yml
4. Verify GitHub has write permission

---

## Part 5: Cost Analysis

### Free Tier Limits

**GitHub:**
- ✅ Unlimited public repositories
- ✅ 2,000 Actions minutes/month (plenty for this use)
- ✅ 500MB storage

**Netlify:**
- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited Identity users (5 free, then $19/month per 1000)

**For this project:**
- Estimated builds: ~10-20/month
- Estimated bandwidth: <1GB/month
- Estimated users: 3-5 editors

**Total cost: $0/month** (within free tiers)

---

## Part 6: Migration Timeline

### Week 1: Setup Infrastructure
- [ ] Create Netlify account
- [ ] Connect GitHub repository
- [ ] Configure Netlify Identity
- [ ] Setup GitHub Actions
- [ ] Test SFTP credentials
- [ ] First automated deployment

### Week 2: Content Restructuring
- [ ] Run migration script
- [ ] Review generated content files
- [ ] Test build process locally
- [ ] Commit content structure
- [ ] Verify automated build works

### Week 3: CMS Configuration
- [ ] Customize config.yml
- [ ] Add validation rules
- [ ] Create user documentation
- [ ] Invite first test user
- [ ] Test content editing workflow

### Week 4: Testing & Training
- [ ] Test with all content types
- [ ] Test image uploads
- [ ] Test rollback procedure
- [ ] Train coordinators
- [ ] Create video tutorials

### Week 5: Rollout
- [ ] Invite all editors
- [ ] Monitor first real edits
- [ ] Gather feedback
- [ ] Fix any issues
- [ ] Document lessons learned

---

## Appendix A: Complete File Structure

```
lab-fon-ufrj/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated deployment
├── content/                        # CMS content (individual files)
│   ├── equipe/
│   │   ├── carolina-silva.json
│   │   ├── manuella-carnaval.json
│   │   └── ...
│   ├── publicacoes/
│   │   ├── 2024-artigo-um.json
│   │   └── ...
│   ├── linhas/
│   │   ├── prosodia-afetiva.json
│   │   └── ...
│   └── parcerias/
│       ├── ufpb.json
│       └── ...
├── public/
│   ├── admin/
│   │   ├── config.yml             # CMS configuration
│   │   └── index.html             # CMS entry point
│   ├── assets/
│   │   └── images/                # Team photos, logos
│   └── data.json                  # Consolidated data (auto-generated)
├── scripts/
│   ├── migrate-to-cms.js          # One-time migration
│   └── build-data.js              # Build-time consolidation
├── src/                            # Frontend code (unchanged)
│   ├── css/
│   ├── js/
│   └── ...
└── package.json                    # Updated build script
```

---

## Appendix B: Emergency Procedures

### Immediate Rollback (Data Corruption)

```bash
# 1. Revert last commit on GitHub (via web interface or CLI)
git revert HEAD
git push origin main

# GitHub Actions will automatically deploy reverted version
```

### Manual Deployment (GitHub Actions Down)

```bash
# 1. Build locally
npm run build

# 2. Upload via FileZilla or command-line SFTP
sftp username@ftp.posvernaculas.letras.ufrj.br
> cd labfonac
> put -r C:/labfonac/*
> quit
```

### CMS Access Lost (Netlify Down)

Content is safe in GitHub. Editors can:
1. Edit files directly in GitHub web interface
2. Commit changes
3. Automated deployment still works

---

## Conclusion

This GitHub-based CMS approach provides:

✅ **Zero manual SFTP** - Editors never touch FileZilla  
✅ **Version control** - Every change tracked, easy rollback  
✅ **Collaboration** - Multiple editors work simultaneously  
✅ **Automation** - Commit → Build → Deploy (hands-free)  
✅ **Security** - No server-side admin code  
✅ **Cost** - $0/month (free tiers)  
✅ **University server** - Files still deployed to posvernaculas.letras.ufrj.br  

**The key insight:** Netlify CMS is just the editing interface. GitHub Actions handles deployment to ANY server (including university SFTP). You get modern CMS benefits while maintaining control over final hosting.

---

**Questions? Issues? Contact Information:**
- GitHub Repository: https://github.com/Wisleyv/lab-fon-ufrj
- Documentation: See docs/ folder
- Video Tutorials: [To be created]

**Last Updated:** November 27, 2025  
**Version:** 1.0

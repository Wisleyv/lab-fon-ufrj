# Deployment Guide - Lab Fonética UFRJ

## 🚀 Quick Automated Deployment (NEW!)

**You now have automated deployment scripts!**

### Option 1: PowerShell FTP Deploy (Simpler)
```powershell
.\deploy-staging.ps1
```

### Option 2: WinSCP Deploy (Recommended - Faster)
```powershell
.\deploy-winscp.ps1
```

See **Automated Deployment** section below for setup details.

---

## Architecture Overview

```
Development (Local):
├─ Git Repository: C:\Users\vil3l\OneDrive\...\lab-fon-ufrj
│  └─ Source code, tests, dev tools, documentation
└─ Build Output: C:\labfonac
   └─ Production-ready files for upload

Staging Server:
└─ https://wisley.net/labfonac/
   └─ Test deployment before production

Production Server:
└─ https://posvernaculas.letras.ufrj.br/labfonac/
   └─ Final deployment (WordPress subfolder)
```

## Local Development Workflow

### 1. Daily Development

```powershell
# Navigate to git repository
cd 'C:\Users\vil3l\OneDrive\1 - Work\PPGLEV\Laboratorio Fonetica\Git\lab-fon-ufrj'

# Start development server
npm run dev

# Visit in browser
# http://localhost:3000
```

### 2. Make Changes

- Edit files in the git repository
- Test in the browser (hot-reload enabled)
- Run tests: `npm test`
- Lint code: `npm run lint`
- Format code: `npm run format`

### 3. Commit Changes

```powershell
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: description of changes"

# Push to GitHub
git push
```

## Build & Deployment Workflow

### 🤖 Automated Deployment (Recommended)

#### Setup Once:

1. **Configure credentials** in `.env.deploy`:
```bash
FTP_HOST=ftp.wisley.net
FTP_USER=your_username
FTP_PASSWORD=your_password
FTP_PROTOCOL=ftp    # or 'sftp' for secure connection
REMOTE_PATH=/public_html/labfonac
LOCAL_BUILD_PATH=C:/labfonac
```

2. **(Optional) Install WinSCP** for faster uploads:
   - Download from https://winscp.net
   - Install to default location

#### Deploy to Staging:

**Method A - PowerShell FTP (Simple):**
```powershell
.\deploy-staging.ps1
```
- Uses built-in Windows FTP
- No additional software needed
- Prompts for credentials if not configured

**Method B - WinSCP (Faster & Recommended):**
```powershell
.\deploy-winscp.ps1
```
- Requires WinSCP installation
- Only uploads changed files (much faster!)
- Supports secure SFTP protocol
- Better progress tracking

**Dry Run (Test without uploading):**
```powershell
.\deploy-winscp.ps1 -DryRun
```

Both scripts automatically:
1. ✅ Build the project (`npm run build:staging`)
2. ✅ Upload all files to your server
3. ✅ Show progress and summary
4. ✅ Display the live URL

---

### 📋 Manual Deployment (Traditional Method)

If you prefer manual control:

#### Step 1: Build for Production

```powershell
# Navigate to git repository
cd 'C:\Users\vil3l\OneDrive\1 - Work\PPGLEV\Laboratorio Fonetica\Git\lab-fon-ufrj'

# Build staging files
npm run build:staging

# Or for production
npm run build:production
```

**Output:** Production-ready files are created in `C:\labfonac\`

#### Step 2: Verify Build Output

```powershell
# Check that files were created
ls C:\labfonac

# Expected contents:
# - index.html
# - js/
# - assets/
# - .htaccess
```

### Step 3: Deploy to Staging (Testing)

#### Using FileZilla:

1. **Open FileZilla**
2. **Connect to Staging Server:**
   - Host: `wisley.net`
   - Protocol: SFTP or FTP
   - Port: 22 (SFTP) or 21 (FTP)
   - Username: [your username]
   - Password: [your password]

3. **Upload Files:**
   - Local: Navigate to `C:\labfonac\`
   - Remote: Navigate to `/labfonac/` (or `/public_html/labfonac/`)
   - Select all files in `C:\labfonac\`
   - Drag and drop to remote folder
   - Overwrite when prompted

4. **Test:**
   - Visit: https://wisley.net/labfonac
   - Test all functionality
   - Check browser console for errors
   - Test on mobile devices

### Step 4: Deploy to Production

**⚠️ Only deploy after successful staging tests!**

#### Using FileZilla:

1. **Open FileZilla**
2. **Connect to Production Server:**
   - Host: `posvernaculas.letras.ufrj.br`
   - Protocol: SFTP or FTP
   - Port: 22 (SFTP) or 21 (FTP)
   - Username: [your username]
   - Password: [your password]

3. **Upload Files:**
   - Local: Navigate to `C:\labfonac\`
   - Remote: Navigate to `/labfonac/` (WordPress subfolder)
   - Select all files in `C:\labfonac\`
   - Drag and drop to remote folder
   - Overwrite when prompted

4. **Test:**
   - Visit: https://posvernaculas.letras.ufrj.br/labfonac
   - Verify all functionality works
   - Check that WordPress installation is unaffected

## Available npm Scripts

```powershell
# Development
npm run dev                  # Start dev server (localhost:3000)
npm run preview              # Preview production build locally
npm run preview:staging      # Preview with /labfonac/ base path

# Building
npm run build                # Build for production → C:\labfonac
npm run build:staging        # Build with staging mode
npm run build:production     # Build with production mode
npm run deploy:build         # Build + reminder to upload

# Testing & Quality
npm test                     # Run unit tests
npm run test:ui              # Run tests with UI
npm run test:coverage        # Run tests with coverage report
npm run lint                 # Check code for errors
npm run format               # Format code with Prettier
```

## Important Notes

### Git Repository vs Build Output

- **Git Repository:** `C:\Users\vil3l\OneDrive\...\lab-fon-ufrj`
  - Contains source code, tests, documentation
  - Tracked by git and pushed to GitHub
  - Used for development only

- **Build Output:** `C:\labfonac\`
  - Contains compiled production files
  - NOT tracked by git (excluded in `.gitignore`)
  - Only used for deployment
  - Generated by `npm run build`

### WordPress Compatibility

- The SPW lives in `/labfonac/` subfolder
- WordPress installation in root is not modified
- `.htaccess` file ensures proper routing
- Assets load correctly with `/labfonac/` base path

### Rollback Strategy

If you need to rollback a deployment:

1. **Keep a backup** of previous `C:\labfonac\` before building:
   ```powershell
   # Backup current build
   Copy-Item -Recurse C:\labfonac C:\labfonac-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')
   ```

2. **Restore from backup:**
   ```powershell
   # List backups
   ls C:\labfonac-backup-*
   
   # Restore specific backup
   Remove-Item -Recurse C:\labfonac
   Copy-Item -Recurse C:\labfonac-backup-20250112-143000 C:\labfonac
   ```

### Troubleshooting

#### Build fails
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse node_modules
npm install
npm run build
```

#### Assets not loading on server
- Verify `base: "/labfonac/"` in `vite.config.js`
- Check that `.htaccess` was uploaded
- Verify file permissions on server (755 for directories, 644 for files)

#### 404 errors
- Ensure `.htaccess` has correct `RewriteBase /labfonac/`
- Verify Apache `mod_rewrite` is enabled on server
- Check that all files were uploaded correctly

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] Changes committed and pushed to GitHub (`git status`)
- [ ] Build successful (`npm run build`)
- [ ] Build output verified in `C:\labfonac\`
- [ ] Tested on staging server (wisley.net)
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed
- [ ] Backup of current production created (if updating)

## Quick Reference

```powershell
# Full deployment workflow
cd 'C:\Users\vil3l\OneDrive\1 - Work\PPGLEV\Laboratorio Fonetica\Git\lab-fon-ufrj'
npm test && npm run lint && npm run build
# → Upload C:\labfonac via FileZilla
# → Test on staging
# → Upload to production
```

## Contact & Support

- **Repository:** https://github.com/Wisleyv/lab-fon-ufrj
- **Staging URL:** https://wisley.net/labfonac
- **Production URL:** https://posvernaculas.letras.ufrj.br/labfonac

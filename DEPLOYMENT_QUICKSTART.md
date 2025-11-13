# Automated Deployment Scripts - Quick Start

## 🎯 What You Got

Two powerful deployment scripts that automate building and uploading your website:

1. **`deploy-staging.ps1`** - Simple PowerShell FTP uploader
2. **`deploy-winscp.ps1`** - Advanced WinSCP-based uploader (recommended)

## 🚀 Quick Start (3 Steps)

### Step 1: Configure Your Server (One Time Only)

Create/edit `.env.deploy` with your server details:

```bash
FTP_HOST=ftp.wisley.net
FTP_USER=your_username
FTP_PASSWORD=your_password
FTP_PROTOCOL=ftp
REMOTE_PATH=/public_html/labfonac
LOCAL_BUILD_PATH=C:/labfonac
```

**Note:** This file is automatically ignored by git - your password is safe!

### Step 2: (Optional) Install WinSCP for Faster Uploads

- Download from: https://winscp.net
- Install to default location
- No configuration needed

### Step 3: Deploy!

**Option A - Simple (PowerShell FTP):**
```powershell
.\deploy-staging.ps1
```

**Option B - Faster (WinSCP):**
```powershell
.\deploy-winscp.ps1
```

That's it! The script will:
1. ✅ Build your project
2. ✅ Upload everything to your server
3. ✅ Show you the live URL

## 📝 What Each Script Does

### deploy-staging.ps1 (Simple Method)
- Uses Windows built-in FTP
- No extra software needed
- Uploads ALL files every time
- Prompts for password if not configured
- Perfect for occasional deployments

### deploy-winscp.ps1 (Fast Method)
- Requires WinSCP installation (free)
- Only uploads CHANGED files (much faster!)
- Supports secure SFTP protocol
- Better progress tracking
- Perfect for frequent deployments

## 🔒 Security Features

✅ `.env.deploy` is in `.gitignore` - never uploaded to GitHub
✅ Passwords stored only on your local machine
✅ SFTP support for encrypted connections
✅ No hardcoded credentials in scripts

## 🛠️ Advanced Usage

**Test without uploading (dry run):**
```powershell
.\deploy-winscp.ps1 -DryRun
```

**Use custom config file:**
```powershell
.\deploy-winscp.ps1 -ConfigFile ".env.production"
```

**Provide credentials as parameters:**
```powershell
.\deploy-staging.ps1 -FtpUser "username" -FtpPassword "password" -FtpHost "ftp.wisley.net"
```

## 🆘 Troubleshooting

**"WinSCP not found"**
→ Either install WinSCP or use `deploy-staging.ps1` instead

**"Build failed"**
→ Run `npm install` and make sure all files are saved

**"FTP connection failed"**
→ Check your credentials in `.env.deploy`

**"Permission denied"**
→ Verify the remote path exists and you have write access

## 📖 Full Documentation

See `DEPLOYMENT.md` for complete documentation including:
- Manual deployment process
- WordPress integration
- Rollback procedures
- Pre-deployment checklist
- Troubleshooting guide

## 💡 Pro Tips

1. **Always test locally first:** `npm run dev`
2. **Preview the build before deploying:** `npm run preview:staging`
3. **Use WinSCP method for faster uploads** (only sends changed files)
4. **Keep a backup of `.env.deploy`** somewhere safe
5. **Check the live site immediately** after deployment

## 🔄 Typical Workflow

```powershell
# 1. Make your changes
# Edit files in VS Code...

# 2. Test locally
npm run dev
# Check http://localhost:3000/labfonac/

# 3. Commit to git
git add -A
git commit -m "your changes"
git push

# 4. Deploy to staging
.\deploy-winscp.ps1

# 5. Test on staging
# Check https://wisley.net/labfonac/
```

---

**Created:** November 2025  
**Author:** GitHub Copilot  
**Project:** Lab-Fon UFRJ Website

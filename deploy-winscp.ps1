# ============================================
# Alternative Deployment Script Using WinSCP
# ============================================
# Requires WinSCP installed (free download from winscp.net)

param(
    [string]$ConfigFile = ".env.deploy",
    [switch]$DryRun
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Lab-Fon WinSCP Deployment Script  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if WinSCP is installed
$winscpPath = "C:\Program Files (x86)\WinSCP\WinSCP.com"
if (-not (Test-Path $winscpPath)) {
    $winscpPath = "C:\Program Files\WinSCP\WinSCP.com"
    if (-not (Test-Path $winscpPath)) {
        Write-Host "❌ WinSCP not found. Please install from https://winscp.net" -ForegroundColor Red
        Write-Host "   Or use deploy-staging.ps1 instead (uses built-in FTP)" -ForegroundColor Yellow
        exit 1
    }
}

# Load configuration
if (Test-Path $ConfigFile) {
    Write-Host "📋 Loading configuration from $ConfigFile..." -ForegroundColor Yellow
    Get-Content $ConfigFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
} else {
    Write-Host "⚠️  Configuration file not found: $ConfigFile" -ForegroundColor Yellow
    Write-Host "   Creating template configuration file..." -ForegroundColor Yellow
    
    $FTP_HOST = Read-Host "Enter FTP/SFTP Host (e.g., ftp.wisley.net)"
    $FTP_USER = Read-Host "Enter Username"
    $FTP_PASSWORD = Read-Host "Enter Password" -AsSecureString
    $FTP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($FTP_PASSWORD))
    $REMOTE_PATH = Read-Host "Enter Remote Path (e.g., /public_html/labfonac)"
    $LOCAL_BUILD_PATH = "C:/labfonac"
    $FTP_PROTOCOL = "ftp"
}

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be uploaded" -ForegroundColor Magenta
    Write-Host ""
}

# Step 1: Build the project
Write-Host "📦 Building project for staging..." -ForegroundColor Yellow
npm run build:staging

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Deployment aborted." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Create WinSCP script
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$scriptPath = "$env:TEMP\winscp_upload_$timestamp.txt"

# Determine protocol and port
$protocol = $FTP_PROTOCOL.ToLower()
$port = if ($protocol -eq "sftp") { 22 } else { 21 }

$scriptContent = @"
# WinSCP Upload Script
option batch abort
option confirm off

# Connect to server
open $protocol`://${FTP_USER}:${FTP_PASSWORD}@${FTP_HOST}:${port}

# Navigate to remote directory
cd $REMOTE_PATH

# Synchronize local to remote (upload only changed files)
synchronize remote $LOCAL_BUILD_PATH $REMOTE_PATH -delete -criteria=time

# Close connection
close

# Exit
exit
"@

Set-Content -Path $scriptPath -Value $scriptContent

# Step 3: Upload files using WinSCP
Write-Host "📤 Uploading files to $FTP_HOST using WinSCP..." -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "📝 WinSCP script created at: $scriptPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Script contents:" -ForegroundColor Cyan
    Write-Host $scriptContent -ForegroundColor Gray
} else {
    try {
        & $winscpPath /script=$scriptPath /log="$env:TEMP\winscp_log_$timestamp.txt"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Your site should now be live at: https://wisley.net/labfonac/" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "❌ Deployment failed. Check log: $env:TEMP\winscp_log_$timestamp.txt" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "❌ Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    finally {
        # Clean up script file
        Remove-Item -Path $scriptPath -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Build path: $LOCAL_BUILD_PATH" -ForegroundColor White
Write-Host "Remote server: $FTP_HOST" -ForegroundColor White
Write-Host "Remote path: $REMOTE_PATH" -ForegroundColor White
Write-Host "Protocol: $FTP_PROTOCOL" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan

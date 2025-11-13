# ============================================
# Staging Deployment Script for Lab-Fon-UFRJ
# ============================================
# This script builds the project and uploads to wisley.net/labfonac

param(
    [string]$FtpHost = "ftp.wisley.net",
    [string]$FtpUser = "",
    [string]$FtpPassword = "",
    [string]$RemotePath = "/public_html/labfonac",
    [string]$LocalBuildPath = "C:\labfonac"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Lab-Fon Staging Deployment Script  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if credentials are provided
if ([string]::IsNullOrEmpty($FtpUser) -or [string]::IsNullOrEmpty($FtpPassword)) {
    Write-Host "⚠️  FTP credentials not provided as parameters." -ForegroundColor Yellow
    Write-Host ""
    $FtpUser = Read-Host "Enter FTP Username"
    $FtpPassword = Read-Host "Enter FTP Password" -AsSecureString
    $FtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($FtpPassword))
}

# Step 2: Build the project
Write-Host "📦 Building project for staging..." -ForegroundColor Yellow
npm run build:staging

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Deployment aborted." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 3: Check if build directory exists
if (-not (Test-Path $LocalBuildPath)) {
    Write-Host "❌ Build directory not found: $LocalBuildPath" -ForegroundColor Red
    exit 1
}

# Step 4: Upload files via FTP
Write-Host "📤 Uploading files to $FtpHost..." -ForegroundColor Yellow
Write-Host ""

try {
    # Get all files recursively
    $files = Get-ChildItem -Path $LocalBuildPath -Recurse -File
    $totalFiles = $files.Count
    $currentFile = 0

    foreach ($file in $files) {
        $currentFile++
        $relativePath = $file.FullName.Substring($LocalBuildPath.Length + 1).Replace('\', '/')
        $remotePath = "$RemotePath/$relativePath"
        
        # Create directory structure on server if needed
        $remoteDir = Split-Path $remotePath -Parent
        
        # Progress indicator
        $percent = [math]::Round(($currentFile / $totalFiles) * 100)
        Write-Progress -Activity "Uploading files" -Status "$currentFile of $totalFiles - $relativePath" -PercentComplete $percent
        
        # Upload file
        $uri = "ftp://$FtpHost$remotePath"
        
        # Create WebClient for upload
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
        
        try {
            # Ensure remote directory exists (attempt to create it)
            $dirUri = "ftp://$FtpHost$remoteDir"
            try {
                $makeDir = [System.Net.WebRequest]::Create($dirUri)
                $makeDir.Credentials = $webclient.Credentials
                $makeDir.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $makeDir.GetResponse() | Out-Null
            } catch {
                # Directory might already exist, ignore error
            }
            
            # Upload file
            $webclient.UploadFile($uri, $file.FullName) | Out-Null
            Write-Host "  ✓ $relativePath" -ForegroundColor Gray
        }
        catch {
            Write-Host "  ✗ Failed: $relativePath - $($_.Exception.Message)" -ForegroundColor Red
        }
        finally {
            $webclient.Dispose()
        }
    }
    
    Write-Progress -Activity "Uploading files" -Completed
    Write-Host ""
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your site should now be live at: https://wisley.net/labfonac/" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Files uploaded: $totalFiles" -ForegroundColor White
Write-Host "Remote server: $FtpHost" -ForegroundColor White
Write-Host "Remote path: $RemotePath" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan

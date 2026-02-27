# PowerShell Script to Download Files from EC2
# Run this script to download the 3 files from EC2

Write-Host "=== Downloading Files from EC2 ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$EC2_USER = "ubuntu"
$EC2_HOST = "107.20.87.206"
$EC2_BACKEND_PATH = "~/fami-backend"
$LOCAL_BACKEND_PATH = "fami-app\backend"

# Check if local backend directory exists
if (-not (Test-Path $LOCAL_BACKEND_PATH)) {
    Write-Host "❌ Local backend directory not found: $LOCAL_BACKEND_PATH" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Check if utils directory exists
if (-not (Test-Path "$LOCAL_BACKEND_PATH\utils")) {
    New-Item -ItemType Directory -Path "$LOCAL_BACKEND_PATH\utils" -Force | Out-Null
    Write-Host "✅ Created utils directory" -ForegroundColor Green
}

Write-Host "Files to download:" -ForegroundColor Yellow
Write-Host "  1. server.js" -ForegroundColor White
Write-Host "  2. utils/getBaseUrl.js" -ForegroundColor White
Write-Host "  3. utils/getClientUrl.js" -ForegroundColor White
Write-Host ""

# Function to download file
function Download-File {
    param(
        [string]$RemotePath,
        [string]$LocalPath
    )
    
    Write-Host "Downloading: $RemotePath" -ForegroundColor Cyan
    
    try {
        # Use SCP to download
        $remoteFile = "${EC2_USER}@${EC2_HOST}:${RemotePath}"
        scp $remoteFile $LocalPath 2>&1 | Out-Null
        
        if (Test-Path $LocalPath) {
            Write-Host "  ✅ Downloaded: $LocalPath" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ❌ Failed to download: $RemotePath" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Download files
$success = $true

Write-Host "`nStarting downloads..." -ForegroundColor Cyan
Write-Host ""

# 1. Download server.js
if (-not (Download-File "$EC2_BACKEND_PATH/server.js" "$LOCAL_BACKEND_PATH\server.js")) {
    $success = $false
}

# 2. Download getBaseUrl.js
if (-not (Download-File "$EC2_BACKEND_PATH/utils/getBaseUrl.js" "$LOCAL_BACKEND_PATH\utils\getBaseUrl.js")) {
    $success = $false
}

# 3. Download getClientUrl.js
if (-not (Download-File "$EC2_BACKEND_PATH/utils/getClientUrl.js" "$LOCAL_BACKEND_PATH\utils\getClientUrl.js")) {
    $success = $false
}

Write-Host ""
if ($success) {
    Write-Host "✅ All files downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files saved to:" -ForegroundColor Yellow
    Write-Host "  - $LOCAL_BACKEND_PATH\server.js" -ForegroundColor White
    Write-Host "  - $LOCAL_BACKEND_PATH\utils\getBaseUrl.js" -ForegroundColor White
    Write-Host "  - $LOCAL_BACKEND_PATH\utils\getClientUrl.js" -ForegroundColor White
} else {
    Write-Host "⚠️  Some files failed to download" -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Use WinSCP to download manually" -ForegroundColor White
    Write-Host "  2. Or SSH and copy files manually" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

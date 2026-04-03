# Production Build Script for AWS S3 Deployment
# This script builds the frontend for production and prepares it for S3 deployment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION BUILD FOR AWS S3 DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Load-DotEnvFile {
    param([string]$Path, [string]$Label)
    Write-Host "  Loading environment variables from $Label..." -ForegroundColor Cyan
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if ($key -and $value) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Loaded: $key" -ForegroundColor Gray
        }
    }
}

$root = $PSScriptRoot
$envFile = Join-Path $root "frontend\frontend\.env.production"
$famiLiveExample = Join-Path $root "env.fami.live.example"

if (Test-Path $envFile) {
    Write-Host "[OK] Found .env.production file" -ForegroundColor Green
    Load-DotEnvFile -Path $envFile -Label ".env.production"
    Write-Host ""
} elseif (Test-Path $famiLiveExample) {
    Write-Host "WARNING: .env.production not found - using env.fami.live.example (https://www.fami.live)" -ForegroundColor Yellow
    Write-Host "   Copy env.fami.live.example to frontend\frontend\.env.production to customize." -ForegroundColor Gray
    Load-DotEnvFile -Path $famiLiveExample -Label "env.fami.live.example"
    Write-Host ""
} else {
    Write-Host "[WARN] No .env.production or env.fami.live.example" -ForegroundColor Yellow
    Write-Host "   Using environment variables from current session only." -ForegroundColor Yellow
    Write-Host ""
}

# Check if REACT_APP_API_BASE is set
if (-not $env:REACT_APP_API_BASE) {
    Write-Host "[ERROR] REACT_APP_API_BASE is not set!" -ForegroundColor Red
    Write-Host "   Please set it in .env.production file or as environment variable:" -ForegroundColor Yellow
    Write-Host "   REACT_APP_API_BASE=https://your-api-domain.com/api" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "   API Base: $env:REACT_APP_API_BASE" -ForegroundColor White
if ($env:REACT_APP_CLIENT_URL) {
    Write-Host "   Client URL: $env:REACT_APP_CLIENT_URL" -ForegroundColor White
}
Write-Host ""

# Set production environment
$env:NODE_ENV = "production"

function Remove-DirForce {
    param([string]$Dir)
    if (-not (Test-Path -LiteralPath $Dir)) { return $true }
    Remove-Item -LiteralPath $Dir -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path -LiteralPath $Dir)) { return $true }
    cmd /c "rmdir /s /q `"$Dir`""
    return -not (Test-Path -LiteralPath $Dir)
}

Write-Host "Step 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path (Join-Path $root "frontend\frontend\build")) {
    if (Remove-DirForce -Dir (Join-Path $root "frontend\frontend\build")) {
        Write-Host "   [OK] Removed old build folder" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Could not fully remove old build folder; continuing." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 2: Removing node_modules..." -ForegroundColor Yellow
$nm = Join-Path $root "frontend\frontend\node_modules"
if (Test-Path -LiteralPath $nm) {
    if (Remove-DirForce -Dir $nm) {
        Write-Host "   [OK] Removed node_modules" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Could not remove node_modules (file lock?). npm ci will reconcile." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 3: Installing production dependencies..." -ForegroundColor Yellow
Set-Location -LiteralPath (Join-Path $root "frontend\frontend")
npm ci --production=false
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [ERROR] npm install failed!" -ForegroundColor Red
    Set-Location -LiteralPath $root
    exit 1
}
Write-Host "   [OK] Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Building for production..." -ForegroundColor Yellow
Write-Host "   Using API Base: $env:REACT_APP_API_BASE" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [ERROR] Build failed!" -ForegroundColor Red
    Set-Location -LiteralPath $root
    exit 1
}
Write-Host "   [OK] Build completed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Verifying build output..." -ForegroundColor Yellow
if (Test-Path "build\index.html") {
    Write-Host "   [OK] index.html found" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] index.html not found!" -ForegroundColor Red
    Set-Location -LiteralPath $root
    exit 1
}

# Check for localhost references in build
Write-Host ""
Write-Host "Step 6: Checking for localhost references..." -ForegroundColor Yellow
$localhostFound = $false
Get-ChildItem -Path "build" -Recurse -File | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match 'localhost' -or $content -match '127\.0\.0\.1')) {
        if (-not $localhostFound) {
            Write-Host "   [WARN] Found localhost references in build:" -ForegroundColor Yellow
            $localhostFound = $true
        }
        Write-Host "      - $($_.Name)" -ForegroundColor Yellow
    }
}

if (-not $localhostFound) {
    Write-Host "   [OK] No localhost references found" -ForegroundColor Green
}

Set-Location -LiteralPath $root

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Build output location: $(Join-Path $root 'frontend\frontend\build')" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the build folder" -ForegroundColor White
Write-Host "2. Upload to S3 bucket using deploy-to-s3.ps1" -ForegroundColor White
Write-Host "   OR manually upload all files from build/ to your S3 bucket" -ForegroundColor White
Write-Host ""

# Clean Production Build Script for AWS S3 Deployment
# This script removes node_modules and creates a clean production build

Write-Host "Starting Clean Production Build Process..." -ForegroundColor Green
Write-Host ""

# Step 1: Remove node_modules for clean build
Write-Host "Step 1: Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "node_modules removed" -ForegroundColor Green
} else {
    Write-Host "node_modules not found (already clean)" -ForegroundColor Cyan
}

# Step 2: Remove existing build folder
Write-Host ""
Write-Host "Step 2: Removing existing build folder..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
    Write-Host "Existing build folder removed" -ForegroundColor Green
} else {
    Write-Host "No existing build folder found" -ForegroundColor Cyan
}

# Step 3: Create/Update production environment file
Write-Host ""
Write-Host "Step 3: Creating/Updating .env.production file..." -ForegroundColor Yellow

# Check for environment variables, use defaults if not set
if (-not $env:REACT_APP_API_BASE) {
    Write-Host "REACT_APP_API_BASE not set in environment. Using default: https://api.fami.live/api" -ForegroundColor Yellow
    $apiBase = "https://api.fami.live/api"
} else {
    $apiBase = $env:REACT_APP_API_BASE
}

if (-not $env:REACT_APP_CLIENT_URL) {
    Write-Host "REACT_APP_CLIENT_URL not set in environment. Using default: https://www.fami.live" -ForegroundColor Yellow
    $clientUrl = "https://www.fami.live"
} else {
    $clientUrl = $env:REACT_APP_CLIENT_URL
}

$envContent = "# Production Environment Variables`nREACT_APP_API_BASE=$apiBase`nREACT_APP_CLIENT_URL=$clientUrl`nNODE_ENV=production"
$envContent | Out-File -FilePath ".env.production" -Encoding UTF8 -Force -NoNewline

Write-Host ".env.production created/updated" -ForegroundColor Green
Write-Host "   API Base: $apiBase" -ForegroundColor Cyan
Write-Host "   Client URL: $clientUrl" -ForegroundColor Cyan

# Step 4: Clean install dependencies
Write-Host ""
Write-Host "Step 4: Installing dependencies (clean install)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green

# Step 5: Build production bundle
Write-Host ""
Write-Host "Step 5: Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 6: Verify build output
Write-Host ""
Write-Host "Step 6: Verifying build output..." -ForegroundColor Yellow
if (Test-Path "build") {
    $buildSize = (Get-ChildItem -Path "build" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Build contents:" -ForegroundColor Cyan
    Get-ChildItem -Path "build" | Select-Object Name, Length | Format-Table -AutoSize
    Write-Host ""
    Write-Host "Ready for S3 deployment!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Upload the 'build' folder contents to your S3 bucket" -ForegroundColor White
    Write-Host "   2. Enable static website hosting on your S3 bucket" -ForegroundColor White
    Write-Host "   3. Configure bucket policy for public read access" -ForegroundColor White
    Write-Host "   4. Test your application at the S3 website URL" -ForegroundColor White
} else {
    Write-Host "Build folder not found! Build may have failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Clean production build completed successfully!" -ForegroundColor Green

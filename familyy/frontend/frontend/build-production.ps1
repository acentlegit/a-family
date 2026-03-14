# Production Build Script for AWS S3 Deployment (PowerShell)

Write-Host "🚀 Starting Production Build Process..." -ForegroundColor Green

# Step 1: Remove node_modules for clean build
Write-Host "📦 Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "✅ node_modules removed" -ForegroundColor Green
}

# Step 2: Clean install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Create/Update production environment file
Write-Host "📝 Creating/Updating .env.production file..." -ForegroundColor Yellow
@"
# Production Environment Variables
# Set REACT_APP_API_BASE and REACT_APP_CLIENT_URL environment variables before running this script
# Or edit this file to set your production URLs
REACT_APP_API_BASE=${env:REACT_APP_API_BASE}
REACT_APP_CLIENT_URL=${env:REACT_APP_CLIENT_URL}
NODE_ENV=production
"@ | Out-File -FilePath ".env.production" -Encoding UTF8 -Force

# Set defaults if not in environment
if (-not $env:REACT_APP_API_BASE) {
    $env:REACT_APP_API_BASE = "https://api.fami.live/api"
    Write-Host "⚠️  Using default REACT_APP_API_BASE: https://api.fami.live/api" -ForegroundColor Yellow
}
if (-not $env:REACT_APP_CLIENT_URL) {
    $env:REACT_APP_CLIENT_URL = "https://www.fami.live"
    Write-Host "⚠️  Using default REACT_APP_CLIENT_URL: https://www.fami.live" -ForegroundColor Yellow
}

# Update .env.production with actual values
@"
# Production Environment Variables
REACT_APP_API_BASE=$($env:REACT_APP_API_BASE)
REACT_APP_CLIENT_URL=$($env:REACT_APP_CLIENT_URL)
NODE_ENV=production
"@ | Out-File -FilePath ".env.production" -Encoding UTF8 -Force

Write-Host "✅ .env.production created/updated" -ForegroundColor Green
Write-Host "   API Base: $($env:REACT_APP_API_BASE)" -ForegroundColor Cyan
Write-Host "   Client URL: $($env:REACT_APP_CLIENT_URL)" -ForegroundColor Cyan

# Step 4: Build production bundle
Write-Host "🔨 Building production bundle..." -ForegroundColor Yellow
npm run build

# Step 5: Check build output
if (Test-Path "build") {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    $buildSize = (Get-ChildItem -Path "build" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "📊 Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📁 Build contents:" -ForegroundColor Cyan
    Get-ChildItem -Path "build" | Select-Object Name, Length
    Write-Host ""
    Write-Host "✅ Ready for S3 deployment!" -ForegroundColor Green
    Write-Host "📤 Upload build/ folder contents to your S3 bucket" -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed! Check errors above." -ForegroundColor Red
    exit 1
}

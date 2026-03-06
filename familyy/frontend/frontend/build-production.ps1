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

# Step 3: Create production environment file if it doesn't exist
if (-not (Test-Path ".env.production")) {
    Write-Host "📝 Creating .env.production file..." -ForegroundColor Yellow
    @"
# Production Environment Variables
REACT_APP_API_BASE=http://34.204.50.125:5000/api
REACT_APP_CLIENT_URL=http://YOUR-S3-BUCKET-URL
NODE_ENV=production
"@ | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "⚠️  Please update .env.production with your actual S3 bucket URL" -ForegroundColor Yellow
}

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

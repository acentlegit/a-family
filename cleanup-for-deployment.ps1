# Cleanup Script for AWS Deployment
# Removes node_modules and prepares for production deployment

Write-Host "🧹 Cleaning up for AWS deployment..." -ForegroundColor Cyan

# Remove frontend node_modules
$frontendNodeModules = "C:\MY APPLICATIONS\familyy\frontend\frontend\node_modules"
if (Test-Path $frontendNodeModules) {
    Write-Host "Removing frontend node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $frontendNodeModules -ErrorAction SilentlyContinue
    Write-Host "✅ Frontend node_modules removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Frontend node_modules not found (already removed)" -ForegroundColor Gray
}

# Remove backend node_modules
$backendNodeModules = "C:\MY APPLICATIONS\familyy\fami-backend\fami-backend\node_modules"
if (Test-Path $backendNodeModules) {
    Write-Host "Removing backend node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $backendNodeModules -ErrorAction SilentlyContinue
    Write-Host "✅ Backend node_modules removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Backend node_modules not found (already removed)" -ForegroundColor Gray
}

# Check build folder
$buildFolder = "C:\MY APPLICATIONS\familyy\frontend\frontend\build"
if (Test-Path $buildFolder) {
    $buildSize = (Get-ChildItem $buildFolder -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "✅ Build folder exists: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "❌ Build folder not found. Run: npm run build" -ForegroundColor Red
}

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "📦 Ready for deployment. See AWS_S3_DEPLOYMENT_STRUCTURE.md for S3 upload instructions." -ForegroundColor Cyan

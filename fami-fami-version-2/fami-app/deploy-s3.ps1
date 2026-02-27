# S3 Deployment Script for Fami Frontend
# This script uploads the built frontend to AWS S3 bucket

param(
    [string]$BucketName = "fami-live",
    [string]$Region = "us-east-1",
    [string]$Profile = "default"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fami Frontend - S3 Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if build folder exists
$buildPath = ".\fami-app\frontend\build"
if (-not (Test-Path $buildPath)) {
    Write-Host "❌ Build folder not found at: $buildPath" -ForegroundColor Red
    Write-Host "   Please run 'npm run build' in the frontend directory first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Build folder found" -ForegroundColor Green
Write-Host ""

# Sync files to S3
Write-Host "📤 Uploading files to S3 bucket: $BucketName" -ForegroundColor Yellow
Write-Host "   Region: $Region" -ForegroundColor Gray
Write-Host ""

try {
    # Sync with delete option to remove old files
    aws s3 sync "$buildPath" "s3://$BucketName" `
        --region $Region `
        --profile $Profile `
        --delete `
        --exclude "*.map" `
        --cache-control "public, max-age=31536000, immutable" `
        --exclude "index.html" `
        --exclude "config.js"
    
    # Upload index.html and config.js with no-cache
    Write-Host ""
    Write-Host "📤 Uploading index.html and config.js (no-cache)..." -ForegroundColor Yellow
    aws s3 cp "$buildPath\index.html" "s3://$BucketName/index.html" `
        --region $Region `
        --profile $Profile `
        --cache-control "no-cache, no-store, must-revalidate" `
        --content-type "text/html"
    
    aws s3 cp "$buildPath\config.js" "s3://$BucketName/config.js" `
        --region $Region `
        --profile $Profile `
        --cache-control "no-cache, no-store, must-revalidate" `
        --content-type "application/javascript"
    
    Write-Host ""
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your application is available at:" -ForegroundColor Cyan
    Write-Host "   http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

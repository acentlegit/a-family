# Deployment Script for fami.live
# This script builds and deploys to S3 for https://www.fami.live

param(
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "fami-frontend",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiDomain = "https://api.fami.live",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY TO fami.live" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Domain: https://www.fami.live" -ForegroundColor Yellow
Write-Host "API: $ApiDomain" -ForegroundColor Yellow
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build for production
if (-not $SkipBuild) {
    Write-Host "Step 1: Building for production..." -ForegroundColor Cyan
    Write-Host ""
    
    # Set environment variables
    $env:REACT_APP_API_BASE = "$ApiDomain/api"
    $env:REACT_APP_CLIENT_URL = "https://www.fami.live"
    $env:NODE_ENV = "production"
    
    # Run build script
    .\build-production.ps1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Skipping build (using existing build)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Deploy to S3
Write-Host "Step 2: Deploying to S3..." -ForegroundColor Cyan
Write-Host ""

.\deploy-to-s3.ps1 -BucketName $BucketName -Region $Region -Delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your website is available at:" -ForegroundColor Cyan
Write-Host "   http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "After CloudFront setup:" -ForegroundColor Cyan
Write-Host "   https://www.fami.live" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update backend CORS:" -ForegroundColor Yellow
Write-Host "   CLIENT_URL=https://www.fami.live" -ForegroundColor White
Write-Host ""

# ============================================================================
# Upload Frontend and Backend to S3 Deployment Bucket
# ============================================================================
# Bucket: a-code-deploy
# Structure: frontend/ and backend/ folders
# ============================================================================

$bucketName = "a-code-deploy"
$region = "us-east-1"

Write-Host "🚀 Uploading to S3 Bucket: $bucketName" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "   Download: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# STEP 1: Upload Frontend Build
# ============================================================================
Write-Host ""
Write-Host "📦 Step 1: Uploading Frontend Build..." -ForegroundColor Yellow

$frontendBuildPath = "C:\MY APPLICATIONS\familyy\frontend\frontend\build"

if (-not (Test-Path $frontendBuildPath)) {
    Write-Host "❌ Frontend build not found at: $frontendBuildPath" -ForegroundColor Red
    Write-Host "   Run 'prepare-deployment-to-s3.ps1' first to build frontend" -ForegroundColor Yellow
    exit 1
}

Write-Host "   Source: $frontendBuildPath" -ForegroundColor Gray
Write-Host "   Destination: s3://$bucketName/frontend/" -ForegroundColor Gray
Write-Host "   Uploading..." -ForegroundColor Cyan

aws s3 sync "$frontendBuildPath" "s3://$bucketName/frontend/" --region $region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend upload failed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 2: Upload Backend Package
# ============================================================================
Write-Host ""
Write-Host "📦 Step 2: Uploading Backend Package..." -ForegroundColor Yellow

$backendPackagePath = "C:\MY APPLICATIONS\familyy\backend-package-temp"

if (-not (Test-Path $backendPackagePath)) {
    Write-Host "❌ Backend package not found at: $backendPackagePath" -ForegroundColor Red
    Write-Host "   Run 'prepare-deployment-to-s3.ps1' first to package backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "   Source: $backendPackagePath" -ForegroundColor Gray
Write-Host "   Destination: s3://$bucketName/backend/" -ForegroundColor Gray
Write-Host "   Uploading..." -ForegroundColor Cyan

aws s3 sync "$backendPackagePath" "s3://$bucketName/backend/" --region $region --delete

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend upload failed!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 3: Verify Upload
# ============================================================================
Write-Host ""
Write-Host "🔍 Step 3: Verifying Upload..." -ForegroundColor Yellow

Write-Host "   Checking frontend files..." -ForegroundColor Cyan
aws s3 ls "s3://$bucketName/frontend/" --region $region --recursive | Select-Object -First 5

Write-Host ""
Write-Host "   Checking backend files..." -ForegroundColor Cyan
aws s3 ls "s3://$bucketName/backend/" --region $region --recursive | Select-Object -First 5

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ UPLOAD COMPLETE!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 S3 Bucket Structure:" -ForegroundColor Yellow
Write-Host "   s3://$bucketName/" -ForegroundColor White
Write-Host "   ├── frontend/  (Frontend build files)" -ForegroundColor Gray
Write-Host "   └── backend/   (Backend source files)" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Next: Your manager can now deploy from S3 to arakala.net" -ForegroundColor Green
Write-Host ""

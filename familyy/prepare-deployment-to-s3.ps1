# ============================================================================
# Prepare Frontend and Backend for S3 Deployment Bucket
# ============================================================================
# This script prepares files to upload to: a-code-deploy bucket
# Structure: a-code-deploy/frontend/ and a-code-deploy/backend/
# ============================================================================

Write-Host "🚀 Preparing Deployment Files for S3 Bucket: a-code-deploy" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Build Frontend (if needed)
# ============================================================================
Write-Host "📦 Step 1: Building Frontend..." -ForegroundColor Yellow

$frontendPath = "C:\MY APPLICATIONS\familyy\frontend\frontend"
$frontendBuildPath = "$frontendPath\build"

# Check if build exists and is recent
if (Test-Path $frontendBuildPath) {
    $buildAge = (Get-Date) - (Get-Item $frontendBuildPath).LastWriteTime
    if ($buildAge.TotalHours -lt 24) {
        Write-Host "✅ Frontend build exists and is recent (< 24 hours)" -ForegroundColor Green
        Write-Host "   Location: $frontendBuildPath" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Frontend build is older than 24 hours" -ForegroundColor Yellow
        $rebuild = Read-Host "   Rebuild frontend? (y/n)"
        if ($rebuild -eq "y" -or $rebuild -eq "Y") {
            Write-Host "   Building frontend..." -ForegroundColor Cyan
            Set-Location $frontendPath
            npm run build
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Frontend build failed!" -ForegroundColor Red
                exit 1
            }
            Write-Host "✅ Frontend build complete" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠️  Frontend build not found. Building now..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend build complete" -ForegroundColor Green
}

# ============================================================================
# STEP 2: Package Backend Files
# ============================================================================
Write-Host ""
Write-Host "📦 Step 2: Packaging Backend Files..." -ForegroundColor Yellow

$backendPath = "C:\MY APPLICATIONS\familyy\fami-backend\fami-backend"
$tempBackendPath = "C:\MY APPLICATIONS\familyy\backend-package-temp"

# Create temporary directory for backend package
if (Test-Path $tempBackendPath) {
    Remove-Item -Recurse -Force $tempBackendPath
}
New-Item -ItemType Directory -Path $tempBackendPath | Out-Null

Write-Host "   Copying backend files..." -ForegroundColor Cyan

# Copy required folders
$foldersToCopy = @("models", "routes", "middleware", "utils", "services", "controllers", "scripts")
foreach ($folder in $foldersToCopy) {
    $source = Join-Path $backendPath $folder
    $dest = Join-Path $tempBackendPath $folder
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Recurse -Force
        Write-Host "   ✅ Copied: $folder/" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Missing: $folder/" -ForegroundColor Yellow
    }
}

# Copy required files
$filesToCopy = @("server.js", "package.json", "package-lock.json")
foreach ($file in $filesToCopy) {
    $source = Join-Path $backendPath $file
    $dest = Join-Path $tempBackendPath $file
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Force
        Write-Host "   ✅ Copied: $file" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Missing: $file" -ForegroundColor Yellow
    }
}

# Create empty uploads directory (structure only)
$uploadsDir = Join-Path $tempBackendPath "uploads"
New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null

Write-Host "✅ Backend files packaged" -ForegroundColor Green
Write-Host "   Location: $tempBackendPath" -ForegroundColor Gray

# ============================================================================
# STEP 3: Summary and Upload Instructions
# ============================================================================
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ PREPARATION COMPLETE!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Files Ready for Upload:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. FRONTEND BUILD:" -ForegroundColor Cyan
Write-Host "   Source: $frontendBuildPath" -ForegroundColor White
Write-Host "   Upload to: s3://a-code-deploy/frontend/" -ForegroundColor White
Write-Host "   Upload ALL contents inside the 'build' folder" -ForegroundColor Gray
Write-Host ""

Write-Host "2. BACKEND SOURCE:" -ForegroundColor Cyan
Write-Host "   Source: $tempBackendPath" -ForegroundColor White
Write-Host "   Upload to: s3://a-code-deploy/backend/" -ForegroundColor White
Write-Host "   Upload ALL contents inside the temp folder" -ForegroundColor Gray
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📤 UPLOAD OPTIONS:" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1: AWS Console (Easiest)" -ForegroundColor Cyan
Write-Host "   1. Go to: https://us-east-1.console.aws.amazon.com/s3/buckets/a-code-deploy" -ForegroundColor White
Write-Host "   2. Create folders: 'frontend' and 'backend' if they don't exist" -ForegroundColor White
Write-Host "   3. Upload frontend build contents to: frontend/" -ForegroundColor White
Write-Host "   4. Upload backend package contents to: backend/" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: AWS CLI (Faster)" -ForegroundColor Cyan
Write-Host "   # Upload Frontend" -ForegroundColor White
Write-Host "   aws s3 sync `"$frontendBuildPath`" s3://a-code-deploy/frontend/ --delete" -ForegroundColor Gray
Write-Host ""
Write-Host "   # Upload Backend" -ForegroundColor White
Write-Host "   aws s3 sync `"$tempBackendPath`" s3://a-code-deploy/backend/ --delete" -ForegroundColor Gray
Write-Host ""

Write-Host "Option 3: PowerShell with AWS CLI" -ForegroundColor Cyan
Write-Host "   Run the commands above in PowerShell" -ForegroundColor White
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📝 NOTES:" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "• Frontend: Upload contents of 'build' folder (not the 'build' folder itself)" -ForegroundColor Gray
Write-Host "• Backend: Upload all files from temp folder (models/, routes/, server.js, etc.)" -ForegroundColor Gray
Write-Host "• Backend does NOT include: node_modules, .env, logs, or uploads files" -ForegroundColor Gray
Write-Host "• After upload, your manager's script will deploy from S3 to arakala.net" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 Next Step: Upload files to S3 bucket 'a-code-deploy'" -ForegroundColor Green
Write-Host ""

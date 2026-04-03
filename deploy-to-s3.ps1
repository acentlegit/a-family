# AWS S3 Deployment Script
# This script uploads the production build to AWS S3 bucket

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$Delete
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AWS S3 DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if build folder exists
$buildPath = "frontend\frontend\build"
if (-not (Test-Path $buildPath)) {
    Write-Host "❌ Build folder not found at: $buildPath" -ForegroundColor Red
    Write-Host "   Please run build-production.ps1 first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "Bucket: $BucketName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Build Path: $buildPath" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    Write-Host "   Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host ""
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS credentials not configured!" -ForegroundColor Red
        Write-Host "   Run: aws configure" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Failed to check AWS credentials!" -ForegroundColor Red
    exit 1
}

# Check if bucket exists
Write-Host ""
Write-Host "Checking if bucket exists..." -ForegroundColor Yellow
$bucketCheck = aws s3 ls "s3://$BucketName" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Bucket not found or not accessible" -ForegroundColor Yellow
    Write-Host "   Attempting to create bucket..." -ForegroundColor Yellow
    
    $createBucket = aws s3 mb "s3://$BucketName" --region $Region 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Bucket created: $BucketName" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create bucket!" -ForegroundColor Red
        Write-Host "   Error: $createBucket" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Bucket exists: $BucketName" -ForegroundColor Green
}

# Enable static website hosting
Write-Host ""
Write-Host "Configuring static website hosting..." -ForegroundColor Yellow
$websiteConfig = @"
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
"@
$websiteConfig | Out-File -FilePath "$env:TEMP\website-config.json" -Encoding utf8

aws s3 website "s3://$BucketName" --index-document index.html --error-document index.html 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Static website hosting enabled" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not configure website hosting (may already be configured)" -ForegroundColor Yellow
}

# Set bucket policy for public read
Write-Host ""
Write-Host "Setting bucket policy for public read access..." -ForegroundColor Yellow
$bucketPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BucketName/*"
        }
    ]
}
"@
$bucketPolicy | Out-File -FilePath "$env:TEMP\bucket-policy.json" -Encoding utf8

aws s3api put-bucket-policy --bucket $BucketName --policy "file://$env:TEMP\bucket-policy.json" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Bucket policy set" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not set bucket policy (may need manual configuration)" -ForegroundColor Yellow
}

# Upload files
Write-Host ""
Write-Host "Uploading files to S3..." -ForegroundColor Yellow
$syncParams = "s3://$BucketName"
if ($Delete) {
    $syncParams += " --delete"
    Write-Host "   (Deleting files not in source)" -ForegroundColor Cyan
}

$uploadResult = aws s3 sync "$buildPath" $syncParams --region $Region 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Files uploaded successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    Write-Host "   Error: $uploadResult" -ForegroundColor Red
    exit 1
}

# Set cache control for static assets
Write-Host ""
Write-Host "Setting cache headers..." -ForegroundColor Yellow
aws s3 cp "$buildPath" "s3://$BucketName" --recursive --exclude "*.html" --cache-control "max-age=31536000,public" --region $Region 2>&1 | Out-Null
aws s3 cp "$buildPath" "s3://$BucketName" --recursive --include "*.html" --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html" --region $Region 2>&1 | Out-Null
Write-Host "✓ Cache headers set" -ForegroundColor Green

# Get website URL
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your website is available at:" -ForegroundColor Cyan
Write-Host "   http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or if using CloudFront:" -ForegroundColor Cyan
Write-Host "   https://your-cloudfront-domain.cloudfront.net" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update your backend CLIENT_URL environment variable:" -ForegroundColor Yellow
Write-Host "   CLIENT_URL=http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor White
Write-Host ""

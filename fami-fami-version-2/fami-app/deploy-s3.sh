#!/bin/bash
# S3 Deployment Script for Fami Frontend
# This script uploads the built frontend to AWS S3 bucket

BUCKET_NAME="${1:-fami-live}"
REGION="${2:-us-east-1}"
PROFILE="${3:-default}"

echo "========================================"
echo "  Fami Frontend - S3 Deployment"
echo "========================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "   Download from: https://aws.amazon.com/cli/"
    exit 1
fi

echo "✅ AWS CLI found: $(aws --version)"
echo ""

# Check if build folder exists
BUILD_PATH="./fami-app/frontend/build"
if [ ! -d "$BUILD_PATH" ]; then
    echo "❌ Build folder not found at: $BUILD_PATH"
    echo "   Please run 'npm run build' in the frontend directory first."
    exit 1
fi

echo "✅ Build folder found"
echo ""

# Sync files to S3
echo "📤 Uploading files to S3 bucket: $BUCKET_NAME"
echo "   Region: $REGION"
echo ""

# Sync with delete option to remove old files
aws s3 sync "$BUILD_PATH" "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --delete \
    --exclude "*.map" \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "config.js"

# Upload index.html and config.js with no-cache
echo ""
echo "📤 Uploading index.html and config.js (no-cache)..."
aws s3 cp "$BUILD_PATH/index.html" "s3://$BUCKET_NAME/index.html" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

aws s3 cp "$BUILD_PATH/config.js" "s3://$BUCKET_NAME/config.js" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "application/javascript"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your application is available at:"
echo "   http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo ""

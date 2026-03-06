#!/bin/bash
# Production Build Script for AWS S3 Deployment

echo "🚀 Starting Production Build Process..."

# Step 1: Remove node_modules for clean build
echo "📦 Removing node_modules..."
rm -rf node_modules

# Step 2: Clean install dependencies
echo "📥 Installing dependencies..."
npm install

# Step 3: Create production environment file if it doesn't exist
if [ ! -f .env.production ]; then
    echo "📝 Creating .env.production file..."
    cat > .env.production << EOF
# Production Environment Variables
REACT_APP_API_BASE=http://34.204.50.125:5000/api
REACT_APP_CLIENT_URL=http://YOUR-S3-BUCKET-URL
NODE_ENV=production
EOF
    echo "⚠️  Please update .env.production with your actual S3 bucket URL"
fi

# Step 4: Build production bundle
echo "🔨 Building production bundle..."
npm run build

# Step 5: Check build output
if [ -d "build" ]; then
    echo "✅ Build successful!"
    echo "📊 Build size:"
    du -sh build/
    echo ""
    echo "📁 Build contents:"
    ls -la build/
    echo ""
    echo "✅ Ready for S3 deployment!"
    echo "📤 Upload build/ folder contents to your S3 bucket"
else
    echo "❌ Build failed! Check errors above."
    exit 1
fi

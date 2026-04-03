#!/bin/bash

echo "🧹 Removing old dependencies..."
rm -rf node_modules package-lock.json

echo "📦 Installing correct core dependencies..."
npm install react-scripts@5.0.1 @craco/craco@7.1.0

echo "📦 Installing remaining dependencies..."
npm install

echo "⚙️ Ensuring package.json scripts use CRACO..."

npm pkg set scripts.start="craco start"
npm pkg set scripts.build="craco build"
npm pkg set scripts.test="craco test"

echo "🔎 Verifying react-scripts installation..."
if [ -f "node_modules/react-scripts/config/env.js" ]; then
  echo "✅ react-scripts installed correctly"
else
  echo "❌ react-scripts installation failed"
  exit 1
fi

echo "🏗 Running production build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "🎉 CRACO setup fixed and build successful!"

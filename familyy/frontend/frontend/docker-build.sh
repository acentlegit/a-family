#!/bin/bash

IMAGE_NAME="frontend-app"
CONTAINER_NAME="frontend-container"

echo "🧹 Cleaning local node_modules..."
rm -rf node_modules

echo "🛑 Stopping existing container (if running)..."
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

echo "🗑 Removing old Docker image..."
docker rmi $IMAGE_NAME 2>/dev/null

echo "🐳 Building Docker image..."
docker build --no-cache -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
  echo "Docker build failed ❌"
  exit 1
fi

echo "🚀 Running container..."
docker run -d -p 3000:80 --name $CONTAINER_NAME $IMAGE_NAME

echo "✅ App is running at http://localhost:3000"


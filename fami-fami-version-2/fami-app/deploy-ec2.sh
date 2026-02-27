#!/bin/bash
# EC2 Deployment Script for Fami Backend
# This script deploys the backend to EC2 instance

EC2_IP="${1:-107.20.87.206}"
EC2_USER="${2:-ec2-user}"
KEY_FILE="${3:-~/.ssh/fami-key.pem}"

echo "========================================"
echo "  Fami Backend - EC2 Deployment"
echo "========================================"
echo ""

# Check if SSH key exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH key not found at: $KEY_FILE"
    echo "   Please provide the path to your EC2 key file."
    exit 1
fi

echo "✅ SSH key found"
echo "📡 Connecting to EC2: $EC2_USER@$EC2_IP"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
cd fami-app/backend
tar -czf ../../backend-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='uploads/*' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.git' \
    .
cd ../..

echo "✅ Deployment package created"
echo ""

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i "$KEY_FILE" backend-deploy.tar.gz "$EC2_USER@$EC2_IP:/tmp/"

echo "✅ Upload completed"
echo ""

# Deploy on EC2
echo "🚀 Deploying on EC2..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'ENDSSH'
    # Create app directory if it doesn't exist
    mkdir -p ~/fami-backend
    cd ~/fami-backend
    
    # Extract deployment package
    tar -xzf /tmp/backend-deploy.tar.gz
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install --production
    
    # Restart PM2 process
    echo "🔄 Restarting application..."
    pm2 restart fami-backend || pm2 start server.js --name fami-backend
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ Deployment completed!"
ENDSSH

# Cleanup
rm -f backend-deploy.tar.gz

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Backend is running at:"
echo "   http://$EC2_IP:5000"
echo ""

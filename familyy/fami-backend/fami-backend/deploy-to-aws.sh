#!/bin/bash

# AWS Deployment Script for Backend
# Run this on your EC2 instance after uploading your code

echo "🚀 Starting AWS Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with your production environment variables."
    echo "Required variables:"
    echo "  - MONGODB_URI (your new MongoDB connection string)"
    echo "  - NODE_ENV=production"
    echo "  - PORT=5000"
    echo "  - BASE_URL"
    echo "  - CLIENT_URL"
    exit 1
fi

# Check if MONGODB_URI is set
if ! grep -q "MONGODB_URI" .env; then
    echo -e "${RED}❌ MONGODB_URI not found in .env file!${NC}"
    echo "Please add your MongoDB connection string to .env file."
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Stop existing PM2 process if running
echo -e "${YELLOW}🛑 Stopping existing PM2 process...${NC}"
pm2 delete fami-backend 2>/dev/null || true

# Start application with PM2
echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
pm2 start server.js --name fami-backend

# Save PM2 configuration
echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

# Setup PM2 to start on boot
echo -e "${YELLOW}⚙️  Setting up PM2 startup...${NC}"
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Wait a moment for app to start
sleep 3

# Check if application is running
if pm2 list | grep -q "fami-backend.*online"; then
    echo -e "${GREEN}✅ Application is running!${NC}"
    echo ""
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
    echo "📝 View logs with: pm2 logs fami-backend"
    echo "🔄 Restart with: pm2 restart fami-backend"
else
    echo -e "${RED}❌ Application failed to start!${NC}"
    echo "Check logs with: pm2 logs fami-backend"
    exit 1
fi

# Test MongoDB connection
echo -e "${YELLOW}🔍 Testing MongoDB connection...${NC}"
sleep 2
if pm2 logs fami-backend --lines 20 | grep -q "MongoDB Connected"; then
    echo -e "${GREEN}✅ MongoDB connection successful!${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify MongoDB connection in logs${NC}"
    echo "Check logs manually: pm2 logs fami-backend"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Nginx reverse proxy (if not already done)"
echo "2. Update security groups to allow traffic on port 80/443"
echo "3. Test your API endpoint"
echo "4. Deploy frontend to S3"

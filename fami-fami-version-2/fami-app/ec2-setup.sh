#!/bin/bash
# EC2 Initial Setup Script
# Run this script ONCE on your EC2 instance to set up the environment

echo "========================================"
echo "  Fami Backend - EC2 Initial Setup"
echo "========================================"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Git
echo "📦 Installing Git..."
sudo yum install -y git

# Create app directory
echo "📁 Creating app directory..."
mkdir -p ~/fami-backend
cd ~/fami-backend

# Create .env file template
echo "📝 Creating .env file template..."
cat > .env.template << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
EC2_IP=107.20.87.206

# MongoDB
MONGODB_URI=your_mongodb_connection_string_here

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRE=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@fami.live
FROM_EMAIL=noreply@fami.live

# Frontend URL (S3 Bucket)
CLIENT_URL=http://fami-live.s3-website-us-east-1.amazonaws.com

# Backend Base URL
BASE_URL=http://107.20.87.206:5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=a-family-media
AWS_REGION=us-east-1

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=your_livekit_url_here

# Super Admin
SUPER_ADMIN_EMAIL=admin@fami.live
SUPER_ADMIN_PASSWORD=your_secure_password_here
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
EOF

echo "✅ .env.template created. Please copy it to .env and fill in your values:"
echo "   cp .env.template .env"
echo "   nano .env"
echo ""

# Configure firewall
echo "🔒 Configuring firewall..."
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

echo "✅ Firewall configured"
echo ""

# Setup PM2 startup script
echo "📦 Setting up PM2 startup..."
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ EC2 setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy your backend files to ~/fami-backend"
echo "   2. Copy .env.template to .env and fill in your values"
echo "   3. Run: npm install"
echo "   4. Run: pm2 start server.js --name fami-backend"
echo "   5. Run: pm2 save"
echo ""

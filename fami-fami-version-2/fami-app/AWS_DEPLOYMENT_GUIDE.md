# AWS Deployment Guide for Fami Application

This guide will help you deploy the Fami application to AWS:
- **Frontend**: Deploy to S3 bucket
- **Backend**: Deploy to EC2 instance (IP: 107.20.87.206)

---

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **EC2 Instance** running (IP: 107.20.87.206)
4. **SSH Access** to EC2 instance
5. **S3 Bucket** created (e.g., `fami-live`)

---

## 🏗️ Project Structure

```
fami-fami-version-2/
├── fami-app/
│   ├── frontend/
│   │   ├── build/              # Production build (after npm run build)
│   │   ├── public/
│   │   │   └── config.js        # API URL configuration
│   │   └── package.json
│   ├── backend/
│   │   ├── server.js           # Main server file
│   │   ├── routes/             # API routes
│   │   ├── models/             # Database models
│   │   └── package.json
│   ├── deploy-s3.ps1           # Windows S3 deployment script
│   ├── deploy-s3.sh            # Linux/Mac S3 deployment script
│   ├── deploy-ec2.sh            # EC2 deployment script
│   └── ec2-setup.sh            # EC2 initial setup script
└── AWS_DEPLOYMENT_GUIDE.md     # This file
```

---

## 🚀 Step 1: Configure Frontend for Production

The frontend is already configured to use the EC2 IP address. The `public/config.js` file contains:

```javascript
window.ENV = {
  REACT_APP_API_URL: 'http://107.20.87.206:5000/api'
};
```

---

## 🏗️ Step 2: Build Frontend

Build the frontend for production:

```bash
cd fami-app/frontend
npm install
npm run build
```

This creates the `build` folder with optimized production files.

---

## 📦 Step 3: Deploy Frontend to S3

### Option A: Using PowerShell Script (Windows)

```powershell
cd fami-app
.\deploy-s3.ps1 -BucketName "fami-live" -Region "us-east-1" -Profile "default"
```

### Option B: Using Bash Script (Linux/Mac)

```bash
cd fami-app
chmod +x deploy-s3.sh
./deploy-s3.sh fami-live us-east-1 default
```

### Option C: Manual AWS CLI

```bash
# Sync all files except index.html and config.js
aws s3 sync ./fami-app/frontend/build s3://fami-live \
  --region us-east-1 \
  --delete \
  --exclude "*.map" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "config.js"

# Upload index.html with no-cache
aws s3 cp ./fami-app/frontend/build/index.html s3://fami-live/index.html \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Upload config.js with no-cache
aws s3 cp ./fami-app/frontend/build/config.js s3://fami-live/config.js \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"
```

### Configure S3 Bucket for Static Website Hosting

1. Go to S3 Console → Select your bucket (`fami-live`)
2. Go to **Properties** → **Static website hosting**
3. Enable static website hosting
4. Set **Index document**: `index.html`
5. Set **Error document**: `index.html` (for React Router)
6. Save the bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fami-live/*"
    }
  ]
}
```

7. Block public access settings:
   - Uncheck "Block all public access"
   - Save changes

**Your frontend will be available at:**
```
http://fami-live.s3-website-us-east-1.amazonaws.com
```

---

## 🖥️ Step 4: Initial EC2 Setup (One-Time)

SSH into your EC2 instance and run the setup script:

```bash
# Copy setup script to EC2
scp -i ~/.ssh/your-key.pem ec2-setup.sh ec2-user@107.20.87.206:~/

# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@107.20.87.206

# Run setup script
chmod +x ec2-setup.sh
./ec2-setup.sh
```

This will:
- Install Node.js 18.x
- Install PM2
- Install Git
- Create app directory
- Configure firewall
- Create .env template

---

## ⚙️ Step 5: Configure Backend Environment

On your EC2 instance:

```bash
cd ~/fami-backend
cp .env.template .env
nano .env
```

Fill in your environment variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
EC2_IP=107.20.87.206

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT Secrets
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_EXPIRE=7d

# Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@fami.live
FROM_EMAIL=noreply@fami.live

# Frontend URL (S3 Bucket)
CLIENT_URL=http://fami-live.s3-website-us-east-1.amazonaws.com

# Backend Base URL
BASE_URL=http://107.20.87.206:5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=a-family-media
AWS_REGION=us-east-1

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_url

# Super Admin
SUPER_ADMIN_EMAIL=admin@fami.live
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
```

---

## 🚀 Step 6: Deploy Backend to EC2

### Option A: Using Deployment Script

```bash
cd fami-app
chmod +x deploy-ec2.sh
./deploy-ec2.sh 107.20.87.206 ec2-user ~/.ssh/your-key.pem
```

### Option B: Manual Deployment

```bash
# On your local machine
cd fami-app/backend
tar -czf ../../backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='uploads/*' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='.git' \
  .

# Upload to EC2
scp -i ~/.ssh/your-key.pem backend-deploy.tar.gz ec2-user@107.20.87.206:/tmp/

# SSH into EC2
ssh -i ~/.ssh/your-key.pem ec2-user@107.20.87.206

# On EC2
cd ~/fami-backend
tar -xzf /tmp/backend-deploy.tar.gz
npm install --production
pm2 restart fami-backend || pm2 start server.js --name fami-backend
pm2 save
```

---

## ✅ Step 7: Verify Deployment

### Frontend
Visit: `http://fami-live.s3-website-us-east-1.amazonaws.com`

### Backend
Test the health endpoint:
```bash
curl http://107.20.87.206:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "mongodb": "connected",
  "timestamp": "2026-02-25T..."
}
```

---

## 🔄 Updating the Application

### Update Frontend

1. Make changes to frontend code
2. Rebuild: `cd fami-app/frontend && npm run build`
3. Redeploy: Run `deploy-s3.sh` or `deploy-s3.ps1`

### Update Backend

1. Make changes to backend code
2. Redeploy: Run `deploy-ec2.sh` or manually upload and restart

```bash
# On EC2
cd ~/fami-backend
pm2 restart fami-backend
```

---

## 🔧 Troubleshooting

### Frontend Issues

**Problem**: Frontend can't connect to backend
- **Solution**: Check `public/config.js` has correct EC2 IP
- **Solution**: Verify CORS settings in `backend/server.js`

**Problem**: 404 errors on page refresh
- **Solution**: Ensure S3 bucket has error document set to `index.html`

### Backend Issues

**Problem**: Backend not starting
- **Solution**: Check PM2 logs: `pm2 logs fami-backend`
- **Solution**: Verify .env file has all required variables
- **Solution**: Check MongoDB connection string

**Problem**: Port 5000 not accessible
- **Solution**: Verify security group allows inbound traffic on port 5000
- **Solution**: Check firewall: `sudo firewall-cmd --list-ports`

**Problem**: CORS errors
- **Solution**: Verify S3 bucket URL is in `backend/server.js` CORS allowed origins

---

## 📊 Monitoring

### PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs fami-backend

# Monitor
pm2 monit

# Restart
pm2 restart fami-backend

# Stop
pm2 stop fami-backend
```

---

## 🔐 Security Recommendations

1. **Use HTTPS**: Set up CloudFront or Application Load Balancer for HTTPS
2. **Environment Variables**: Never commit `.env` file to Git
3. **Security Groups**: Restrict EC2 security group to necessary ports only
4. **IAM Roles**: Use IAM roles instead of access keys when possible
5. **Regular Updates**: Keep Node.js and dependencies updated

---

## 📝 Important Files

- **Frontend Config**: `fami-app/frontend/public/config.js`
- **Backend CORS**: `fami-app/backend/server.js` (lines 20-93)
- **Backend Base URL**: `fami-app/backend/utils/getBaseUrl.js`
- **Backend Client URL**: `fami-app/backend/utils/getClientUrl.js`

---

## 🌐 URLs Summary

- **Frontend**: `http://fami-live.s3-website-us-east-1.amazonaws.com`
- **Backend API**: `http://107.20.87.206:5000/api`
- **Health Check**: `http://107.20.87.206:5000/api/health`

---

## ✅ Deployment Checklist

- [ ] Frontend built successfully
- [ ] S3 bucket created and configured for static hosting
- [ ] Frontend deployed to S3
- [ ] EC2 instance set up (Node.js, PM2 installed)
- [ ] Backend .env file configured
- [ ] Backend deployed to EC2
- [ ] PM2 process running
- [ ] Security groups configured
- [ ] CORS configured correctly
- [ ] Health endpoint responding
- [ ] Frontend can connect to backend

---

## 🆘 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs fami-backend`
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test backend health endpoint
5. Verify CORS settings

---

**Last Updated**: February 25, 2026
**EC2 IP**: 107.20.87.206
**S3 Bucket**: fami-live

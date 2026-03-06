# ✅ Production Deployment - Complete Checklist

## EC2 Backend IP: `34.204.50.125:5000`

## ✅ Changes Made

### 1. Frontend Configuration
- ✅ Created `.env.production` with EC2 IP
- ✅ Updated `api.ts` - Removed localhost, uses EC2 IP
- ✅ Updated `Login.tsx` - Uses EC2 IP
- ✅ Updated `MeetingRoomLiveKit.tsx` - Uses EC2 IP
- ✅ All hardcoded localhost references removed

### 2. Backend Configuration
- ✅ Updated `server.js` - CORS accepts EC2 IP and S3 URLs
- ✅ Updated `getClientUrl.js` - Uses EC2 IP or S3 URL
- ✅ Updated `getBaseUrl.js` - Uses EC2 IP

### 3. Production Build
- ✅ Build completed successfully
- ✅ Build folder created: `build/`
- ✅ All files optimized and minified

## 📦 Build Output Structure

```
build/
├── index.html
├── asset-manifest.json
├── manifest.json
├── favicon.ico
├── logo192.png
├── logo512.png
├── robots.txt
└── static/
    ├── css/
    │   └── main.cb9d9d00.css (18 KB gzipped)
    └── js/
        └── main.b6550bf2.js (344 KB gzipped)
```

## 🚀 Deployment Commands

### Step 1: Remove node_modules (Frontend)
```powershell
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
Remove-Item -Recurse -Force node_modules
```

### Step 2: Rebuild (if needed)
```powershell
npm install
npm run build
```

### Step 3: Upload to S3
```bash
# Using AWS CLI
aws s3 sync build/ s3://your-bucket-name/ --delete --acl public-read

# Or upload via AWS Console:
# 1. Go to S3 bucket
# 2. Upload all files from build/ folder
# 3. Set public-read permissions
```

## 🔧 Backend Environment Variables (EC2 Server)

Create/update `.env` file on EC2:

```env
# Backend Configuration
PORT=5000
BASE_URL=http://34.204.50.125:5000
EC2_IP=34.204.50.125

# Frontend URL (Update after S3 deployment)
CLIENT_URL=http://YOUR-S3-BUCKET-URL
S3_BUCKET_URL=http://YOUR-S3-BUCKET-URL

# Database
MONGODB_URI=your-mongodb-connection-string

# Other environment variables...
```

## 📋 S3 Bucket Configuration Checklist

- [ ] Create S3 bucket
- [ ] Enable static website hosting
- [ ] Set index.html as index document
- [ ] Set index.html as error document (for React Router)
- [ ] Configure bucket policy for public read access
- [ ] Unblock public access
- [ ] Upload build/ folder contents
- [ ] Test website endpoint
- [ ] Update .env.production with S3 URL
- [ ] Update backend .env with S3 URL
- [ ] Test API connectivity

## 🌐 URLs Configuration

### Frontend (S3):
- **S3 Website Endpoint:** `http://your-bucket-name.s3-website-region.amazonaws.com`
- **Or CloudFront:** `https://your-cloudfront-domain.cloudfront.net`

### Backend (EC2):
- **API Base URL:** `http://34.204.50.125:5000/api`

## ✅ Verification Steps

1. **Frontend:**
   - Open S3 website URL
   - Check browser console for errors
   - Verify API calls go to `34.204.50.125:5000`

2. **Backend:**
   - Test API: `http://34.204.50.125:5000/api/health` (if exists)
   - Check CORS headers
   - Verify MongoDB connection

3. **Integration:**
   - Login should work
   - API calls should succeed
   - No CORS errors

## 📝 Important Notes

1. **No localhost references** - All replaced with EC2 IP or env variables
2. **Environment variables** - Use `.env.production` for frontend build
3. **CORS** - Backend configured to accept S3 requests
4. **React Router** - S3 error document must be `index.html`
5. **HTTPS** - Consider CloudFront for HTTPS support

## 🎯 Next Steps

1. Deploy build/ folder to S3
2. Get S3 bucket URL
3. Update `.env.production` with S3 URL
4. Rebuild if needed
5. Update backend `.env` on EC2
6. Restart backend server
7. Test complete application

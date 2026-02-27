# S3 Deployment Structure & Guide

## ✅ Build Completed Successfully!

Your frontend has been built and is ready for S3 deployment.

---

## 📁 Build Folder Structure

```
fami-app/frontend/build/
├── index.html                    # Main HTML file (React entry point)
├── config.js                     # API configuration (points to EC2: 107.20.87.206:5000)
├── config.local.js               # Local development config (optional)
├── favicon.ico                   # Site favicon
├── logo192.png                   # App logo (192x192)
├── logo512.png                   # App logo (512x512)
├── manifest.json                 # PWA manifest
├── robots.txt                    # SEO robots file
├── asset-manifest.json           # Build asset manifest
└── static/
    ├── css/
    │   ├── main.c58c258a.css     # Main stylesheet (11.38 kB gzipped)
    │   └── main.c58c258a.css.map # CSS source map
    └── js/
        ├── main.e0bc1429.js      # Main JavaScript bundle (302.86 kB gzipped)
        ├── main.e0bc1429.js.map  # JS source map
        └── main.e0bc1429.js.LICENSE.txt # License file
```

**Total Files**: 14 files
**Total Size**: ~315 KB (gzipped)

---

## 🚀 Quick Deploy to S3

### Option 1: Using PowerShell Script (Windows)

```powershell
cd fami-app
.\deploy-s3.ps1 -BucketName "fami-live" -Region "us-east-1" -Profile "default"
```

### Option 2: Using Bash Script (Linux/Mac)

```bash
cd fami-app
chmod +x deploy-s3.sh
./deploy-s3.sh fami-live us-east-1 default
```

### Option 3: Manual AWS CLI Commands

```bash
# Navigate to build folder
cd fami-app/frontend/build

# Sync static assets (with long cache)
aws s3 sync . s3://fami-live \
  --region us-east-1 \
  --delete \
  --exclude "*.map" \
  --exclude "*.LICENSE.txt" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "config.js" \
  --exclude "asset-manifest.json"

# Upload index.html (no cache - for React Router)
aws s3 cp index.html s3://fami-live/index.html \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Upload config.js (no cache - for API URL updates)
aws s3 cp config.js s3://fami-live/config.js \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"

# Upload asset-manifest.json (no cache)
aws s3 cp asset-manifest.json s3://fami-live/asset-manifest.json \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/json"
```

---

## ⚙️ S3 Bucket Configuration

### 1. Enable Static Website Hosting

1. Go to **S3 Console** → Select your bucket (`fami-live`)
2. Go to **Properties** tab
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Enable static website hosting
6. Set:
   - **Index document**: `index.html`
   - **Error document**: `index.html` (important for React Router!)
7. Click **Save changes**

### 2. Set Bucket Policy (Public Read Access)

Go to **Permissions** → **Bucket policy** and add:

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

### 3. Block Public Access Settings

Go to **Permissions** → **Block public access**:
- **Uncheck** "Block all public access"
- Click **Save changes**
- Confirm by typing `confirm`

### 4. CORS Configuration (Optional)

If needed, go to **Permissions** → **CORS** and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## 📋 File Upload Strategy

### Files with Long Cache (1 year)
- `static/css/*.css` - Stylesheets
- `static/js/*.js` - JavaScript bundles
- `favicon.ico`, `logo*.png` - Images

### Files with No Cache (Always Fresh)
- `index.html` - Main HTML (React Router needs fresh version)
- `config.js` - API configuration (needs updates)
- `asset-manifest.json` - Build manifest

### Files to Exclude
- `*.map` - Source maps (not needed in production)
- `*.LICENSE.txt` - License files (optional)
- `config.local.js` - Local development config

---

## 🌐 Access Your Deployed Application

After deployment, your application will be available at:

```
http://fami-live.s3-website-us-east-1.amazonaws.com
```

Or if you set up a custom domain:

```
https://www.fami.live
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application loads at S3 website URL
- [ ] API calls work (check browser console)
- [ ] React Router works (navigate between pages)
- [ ] Images and assets load correctly
- [ ] No 404 errors in browser console
- [ ] API URL points to: `http://107.20.87.206:5000/api`

---

## 🔄 Updating the Application

When you make changes:

1. **Rebuild**:
   ```bash
   cd fami-app/frontend
   npm run build
   ```

2. **Redeploy**:
   ```bash
   cd fami-app
   ./deploy-s3.sh fami-live us-east-1 default
   ```

3. **Clear Browser Cache** (if needed):
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

---

## 🐛 Troubleshooting

### Problem: 404 errors on page refresh
**Solution**: Ensure error document is set to `index.html` in S3 static website hosting settings

### Problem: API calls failing
**Solution**: 
1. Check `config.js` has correct EC2 IP: `http://107.20.87.206:5000/api`
2. Verify CORS is configured in backend (`backend/server.js`)
3. Check browser console for CORS errors

### Problem: Old version showing
**Solution**: 
1. Clear browser cache
2. Verify `index.html` and `config.js` have no-cache headers
3. Check S3 bucket has latest files

### Problem: Assets not loading
**Solution**: 
1. Verify bucket policy allows public read
2. Check file paths in browser console
3. Ensure static files were uploaded correctly

---

## 📊 Build Statistics

- **Main JS Bundle**: 302.86 kB (gzipped)
- **Main CSS**: 11.38 kB (gzipped)
- **Total Size**: ~315 KB (gzipped)
- **Build Time**: ~30-60 seconds
- **Files**: 14 files

---

## 🔗 Related Files

- **Deployment Script**: `fami-app/deploy-s3.sh` or `deploy-s3.ps1`
- **API Config**: `fami-app/frontend/public/config.js`
- **Build Output**: `fami-app/frontend/build/`
- **Deployment Guide**: `fami-app/AWS_DEPLOYMENT_GUIDE.md`

---

## 📝 Notes

1. **React Router**: Requires `index.html` as error document for client-side routing
2. **API Configuration**: `config.js` is loaded before React, allowing runtime API URL changes
3. **Cache Strategy**: Static assets cached for 1 year, HTML/config files never cached
4. **Source Maps**: Excluded from deployment to reduce size

---

**Last Updated**: February 25, 2026
**EC2 Backend IP**: 107.20.87.206:5000
**S3 Bucket**: fami-live

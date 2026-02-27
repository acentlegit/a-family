# Deploy Frontend to S3 - Final Steps

## ✅ Build Complete

The frontend has been rebuilt with:
- **Environment Variable**: `REACT_APP_API_BASE=https://api.arakala.net`
- **No Hardcoded IP Addresses**: All removed
- **Build Location**: `fami-app/frontend/build/`

## 🚀 Deploy to S3

### Step 1: Upload Build Files

Upload **ALL contents** of the `build/` folder to your S3 bucket:

**Files to upload:**
```
build/
├── index.html
├── config.js
├── favicon.ico
├── logo192.png
├── logo512.png
├── manifest.json
├── robots.txt
└── static/
    ├── css/
    │   └── main.c58c258a.css
    └── js/
        └── main.4420d199.js
```

### Step 2: S3 Upload Methods

#### Option A: AWS Console
1. Go to your S3 bucket
2. Select all files in `build/` folder
3. Upload to root of bucket (not in a subfolder)
4. Make sure to **replace existing files**

#### Option B: AWS CLI
```bash
aws s3 sync build/ s3://your-bucket-name/ --delete
```

#### Option C: PowerShell (Windows)
```powershell
cd "C:\MY APPLICATIONS\fami-fami-version-2\fami-fami-version-2\fami-app\frontend"
aws s3 sync build/ s3://your-bucket-name/ --delete
```

### Step 3: Set Permissions

Make sure all files are **publicly readable**:
- Select all files in S3 bucket
- Actions → Make public
- Or set bucket policy for public read access

### Step 4: Clear Browser Cache

**Important**: After deployment, users must clear browser cache:

1. **Chrome/Edge**: `Ctrl+Shift+Delete` → Clear cached images and files
2. **Firefox**: `Ctrl+Shift+Delete` → Clear cache
3. **Or**: Hard refresh: `Ctrl+F5` or `Ctrl+Shift+R`

### Step 5: Verify Deployment

1. Visit `https://www.arakala.net`
2. Open browser console (F12)
3. Check for API requests - should show `https://api.arakala.net/api`
4. Should NOT see `http://107.20.87.206:5000` anywhere

## 🔍 Troubleshooting

### Still seeing old IP address?

1. **Clear browser cache** (most common issue)
2. **Check S3 files** - verify new build files are uploaded
3. **Check CloudFront** (if using) - invalidate cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```
4. **Check build folder** - verify `build/static/js/main.*.js` contains `api.arakala.net`

### Mixed Content Error?

- Make sure backend is accessible via HTTPS at `https://api.arakala.net`
- Check CORS settings on backend
- Verify SSL certificate is valid

## ✅ Verification Checklist

- [ ] Build completed successfully
- [ ] All files uploaded to S3
- [ ] Files are publicly readable
- [ ] Browser cache cleared
- [ ] CloudFront cache invalidated (if using)
- [ ] Test login - should connect to `https://api.arakala.net/api`
- [ ] No mixed content errors
- [ ] No IP addresses in browser console

## 📝 Notes

- The `.env` file is **NOT** uploaded to S3 (it's only used during build)
- Environment variables are **baked into** the JavaScript bundle at build time
- After deployment, the frontend will use `https://api.arakala.net/api` for all API calls
- No hardcoded IP addresses remain in the codebase

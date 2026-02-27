# Fix Frontend Connection Issue

## Problem
The frontend at `www.arakala.net` is trying to connect to `localhost:5000` instead of the EC2 backend at `107.20.87.206:5000`.

## Solution: Redeploy Frontend to S3

The frontend has been rebuilt with the correct configuration. Now you need to redeploy it to S3.

### Step 1: Upload Updated Files to S3

**Option A: Using PowerShell Script (Windows)**

```powershell
cd fami-app
.\deploy-s3.ps1 -BucketName "fami-live" -Region "us-east-1" -Profile "default"
```

**Option B: Using Bash Script (Linux/Mac)**

```bash
cd fami-app
chmod +x deploy-s3.sh
./deploy-s3.sh fami-live us-east-1 default
```

**Option C: Manual AWS CLI**

```bash
cd fami-app/frontend/build

# Upload all files (with cache headers)
aws s3 sync . s3://fami-live \
  --region us-east-1 \
  --delete \
  --exclude "*.map" \
  --exclude "*.LICENSE.txt" \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "config.js" \
  --exclude "asset-manifest.json"

# Upload index.html (NO CACHE - important!)
aws s3 cp index.html s3://fami-live/index.html \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Upload config.js (NO CACHE - critical!)
aws s3 cp config.js s3://fami-live/config.js \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"

# Upload asset-manifest.json (NO CACHE)
aws s3 cp asset-manifest.json s3://fami-live/asset-manifest.json \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/json"
```

### Step 2: Clear Browser Cache

After uploading, users need to clear their browser cache:

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"

**Or use Hard Refresh:**
- `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

**Or use Incognito/Private Window:**
- Open a new incognito/private window to test

### Step 3: Verify config.js is Correct

After deployment, verify the config.js file on S3:

1. Go to S3 Console → Your bucket (`fami-live`)
2. Open `config.js`
3. It should contain:
   ```javascript
   window.ENV = {
     REACT_APP_API_URL: 'http://107.20.87.206:5000/api'
   };
   ```

### Step 4: Test the Connection

1. Open `https://www.arakala.net` in a new incognito window
2. Open browser console (F12)
3. Check for API requests - they should go to `http://107.20.87.206:5000/api`
4. Try logging in

## Why This Happened

The `config.js` file on S3 was either:
1. Not updated with the EC2 IP
2. Being cached by the browser
3. Not uploaded with no-cache headers

## Prevention

Always upload `config.js` with **no-cache headers** so browsers always fetch the latest version.

## Current Status

✅ Frontend rebuilt with correct config.js
✅ Error message updated (no longer mentions localhost)
✅ Ready to redeploy to S3

**Next Step**: Redeploy to S3 using one of the methods above.

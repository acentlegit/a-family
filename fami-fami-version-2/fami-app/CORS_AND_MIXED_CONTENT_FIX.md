# CORS and Mixed Content Fix

## Issues Identified

### 1. **CORS Errors**
```
Access to XMLHttpRequest at 'https://api.arakala.net/api/...' from origin 'https://arakala.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

**Root Cause:**
- Backend CORS configuration looks correct, but the backend server might have crashed or restarted
- The backend needs to be running and accessible via `https://api.arakala.net`

### 2. **Mixed Content Error**
```
Mixed Content: The page at 'https://arakala.net/families' was loaded over HTTPS, 
but requested an insecure element 'http://localhost:5000/uploads/...'
```

**Root Cause:**
- `getBaseUrl()` function was returning `http://107.20.87.206:5000` in production
- This creates HTTP URLs for images/media, which browsers block on HTTPS pages
- Old data in database might have `localhost:5000` URLs stored

## Fixes Applied

### ✅ Fix 1: Updated `getBaseUrl()` Function

**File:** `backend/utils/getBaseUrl.js`

**Changed:**
- ❌ **Before:** `http://107.20.87.206:5000` (HTTP, causes mixed content)
- ✅ **After:** `https://api.arakala.net` (HTTPS, no mixed content)

**Result:**
- All new image/media uploads will use `https://api.arakala.net/uploads/...`
- No more mixed content errors for new uploads

### ✅ Fix 2: CORS Configuration

**File:** `backend/server.js`

**Status:** Already configured correctly
- ✅ Allows `https://arakala.net` (without www)
- ✅ Allows `https://www.arakala.net` (with www)
- ✅ Has `isArakalaDomain` check for any `arakala.net` subdomain
- ✅ Handles OPTIONS preflight requests

## What You Need to Do on EC2

### Step 1: Update Backend Code

1. **SSH into your EC2 instance:**
   ```bash
   ssh ubuntu@107.20.87.206
   ```

2. **Navigate to backend directory:**
   ```bash
   cd ~/fami-backend
   ```

3. **Pull the latest code** (or upload the updated `getBaseUrl.js` file)

4. **Restart the backend:**
   ```bash
   pm2 restart all
   # OR
   pm2 restart fami-backend
   ```

### Step 2: Verify Backend is Running

1. **Check PM2 status:**
   ```bash
   pm2 status
   ```

2. **Check backend logs:**
   ```bash
   pm2 logs fami-backend
   ```

3. **Test API endpoint:**
   ```bash
   curl https://api.arakala.net/api/health
   # OR
   curl -I https://api.arakala.net/api/families
   ```

### Step 3: Verify Nginx Configuration

Make sure Nginx is properly configured to forward requests to the backend:

```bash
sudo nano /etc/nginx/sites-available/api.arakala.net
```

**Should have:**
```nginx
server {
    listen 443 ssl;
    server_name api.arakala.net;
    
    ssl_certificate /etc/letsencrypt/live/api.arakala.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.arakala.net/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Reload Nginx:**
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload if test passes
```

### Step 4: Check Backend .env File

Make sure your backend `.env` file has:

```env
NODE_ENV=production
CLIENT_URL=https://www.arakala.net
BASE_URL=https://api.arakala.net
# OR
API_URL=https://api.arakala.net/api
```

**Important:** The backend should use `BASE_URL=https://api.arakala.net` (not the HTTP IP address)

## Handling Old Data

### Problem:
Old images/media in the database might have URLs like:
- `http://localhost:5000/uploads/...`
- `http://107.20.87.206:5000/uploads/...`

### Solution Options:

**Option 1: Frontend Fix (Already Done)**
- Frontend code already handles replacing old URLs
- Files: `MediaGallery.tsx`, `Members.tsx`, `FamilyTree.tsx`
- They check for `localhost:5000` and replace with current API base URL

**Option 2: Database Migration (Optional)**
If you want to fix the URLs in the database:

```javascript
// Run this in MongoDB or create a migration script
db.memories.updateMany(
  { "media.url": { $regex: "localhost:5000" } },
  { $set: { "media.$[].url": { $replaceAll: { input: "$media.url", find: "http://localhost:5000", replacement: "https://api.arakala.net" } } } }
)
```

## Testing After Fix

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Test API connection:**
   - Open browser console
   - Should see: `✅ API Response: GET /families 200`
   - Should NOT see CORS errors

3. **Test image loading:**
   - Upload a new image
   - Check that URL is `https://api.arakala.net/uploads/...`
   - No mixed content warnings

4. **Test old images:**
   - View old memories/media
   - Frontend should automatically replace `localhost:5000` URLs
   - Images should load correctly

## Summary

✅ **Fixed:** `getBaseUrl()` now returns `https://api.arakala.net` in production
✅ **Fixed:** CORS configuration already allows `https://arakala.net`
⚠️ **Action Required:** Deploy updated backend code to EC2 and restart
⚠️ **Action Required:** Verify Nginx is properly forwarding requests
⚠️ **Action Required:** Ensure backend `.env` has `BASE_URL=https://api.arakala.net`

After deploying the backend update, both CORS and mixed content errors should be resolved!

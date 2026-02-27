# CORS Error Troubleshooting Guide

## ✅ Frontend Status: WORKING CORRECTLY

**Your frontend is 100% correct:**
- ✅ Using `https://api.arakala.net` (no IP addresses)
- ✅ All API requests going to correct URL
- ✅ Environment variable configured correctly

**The problem is NOT in the frontend - it's in the BACKEND!**

## 🔴 The Error You're Seeing

```
Access to XMLHttpRequest at 'https://api.arakala.net/api/...' from origin 'https://arakala.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**What this means:**
- The frontend is making requests correctly ✅
- The request is reaching the backend (or Nginx) ✅
- **BUT the backend is NOT responding with CORS headers** ❌
- OR the backend is not responding at all ❌

## 🔍 Root Causes

### 1. **Backend Not Running** (Most Likely)
- The backend process might have crashed
- PM2 might have stopped the process
- The backend might not have restarted after a server reboot

### 2. **Backend Not Accessible via HTTPS**
- Nginx might not be forwarding requests correctly
- SSL certificate might have issues
- Backend might only be listening on HTTP (port 5000) not HTTPS

### 3. **CORS Configuration Issue**
- Backend CORS might not be allowing `https://arakala.net` (without www)
- Backend might need to be restarted to pick up CORS changes

## 🛠️ How to Fix - Step by Step

### Step 1: Check if Backend is Running on EC2

**SSH into your EC2 instance:**
```bash
ssh ubuntu@107.20.87.206
```

**Check PM2 status:**
```bash
pm2 status
```

**Expected output:**
```
┌─────┬──────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ status  │ restart │ uptime   │
├─────┼──────────────┼─────────┼─────────┼──────────┤
│ 0   │ fami-backend │ online  │ 15      │ 2h       │
└─────┴──────────────┴─────────┴─────────┴──────────┘
```

**If backend is NOT running:**
```bash
cd ~/fami-backend
pm2 start server.js --name fami-backend
# OR
pm2 restart all
```

### Step 2: Check Backend Logs

**View recent logs:**
```bash
pm2 logs fami-backend --lines 50
```

**Look for:**
- ✅ Server started successfully
- ✅ MongoDB connected
- ❌ Any errors or crashes
- ❌ Port 5000 already in use

### Step 3: Test Backend Directly

**Test if backend is responding:**
```bash
# Test HTTP (should work)
curl http://localhost:5000/api/health
# OR
curl http://localhost:5000/api/families

# Test HTTPS via Nginx (should work)
curl https://api.arakala.net/api/health
# OR
curl -I https://api.arakala.net/api/families
```

**If HTTP works but HTTPS doesn't:**
- Nginx is not forwarding requests correctly
- Check Nginx configuration

### Step 4: Check Nginx Configuration

**Check Nginx status:**
```bash
sudo systemctl status nginx
```

**Check Nginx configuration:**
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

**Test and reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Verify Backend CORS Configuration

**Check backend `.env` file:**
```bash
cd ~/fami-backend
cat .env | grep CLIENT_URL
```

**Should have:**
```env
CLIENT_URL=https://www.arakala.net
NODE_ENV=production
BASE_URL=https://api.arakala.net
```

**Verify CORS in server.js allows `https://arakala.net`:**
- The backend code already has this configured
- But make sure the backend has been restarted after any changes

### Step 6: Restart Everything

**Restart backend:**
```bash
pm2 restart all
pm2 logs fami-backend --lines 20
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**Test again:**
```bash
curl -I https://api.arakala.net/api/families
```

**Should see:**
```
HTTP/2 200
access-control-allow-origin: https://arakala.net
access-control-allow-credentials: true
...
```

## 🔍 Quick Diagnostic Commands

**Run these on EC2 to diagnose:**

```bash
# 1. Check if backend is running
pm2 status

# 2. Check backend logs
pm2 logs fami-backend --lines 30

# 3. Test backend directly
curl http://localhost:5000/api/health

# 4. Test via Nginx
curl -I https://api.arakala.net/api/health

# 5. Check Nginx status
sudo systemctl status nginx

# 6. Check if port 5000 is listening
sudo netstat -tlnp | grep 5000
# OR
sudo ss -tlnp | grep 5000

# 7. Check backend process
ps aux | grep node
```

## 🎯 Most Common Issues & Solutions

### Issue 1: Backend Crashed
**Solution:**
```bash
pm2 restart all
pm2 logs fami-backend
```

### Issue 2: Backend Not Started After Reboot
**Solution:**
```bash
pm2 startup
pm2 save
```

### Issue 3: Nginx Not Forwarding
**Solution:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Issue 4: CORS Not Allowing Origin
**Solution:**
- Backend already configured correctly
- Just restart backend: `pm2 restart all`

### Issue 5: SSL Certificate Issue
**Solution:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## 📝 Summary

**Your frontend is PERFECT:**
- ✅ No IP addresses
- ✅ Using `https://api.arakala.net`
- ✅ All requests correct

**The problem is BACKEND:**
- ❌ Backend might not be running
- ❌ Backend might not be accessible
- ❌ Nginx might not be forwarding
- ❌ CORS headers not being sent

**Next Steps:**
1. SSH into EC2: `ssh ubuntu@107.20.87.206`
2. Check backend: `pm2 status`
3. Check logs: `pm2 logs fami-backend`
4. Restart if needed: `pm2 restart all`
5. Test: `curl https://api.arakala.net/api/health`

The frontend is working correctly - you just need to fix the backend!

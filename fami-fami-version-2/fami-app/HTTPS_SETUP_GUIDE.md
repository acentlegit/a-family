# HTTPS Setup Guide - Fix Mixed Content Error

## Problem
Your frontend at `https://www.arakala.net` is trying to connect to `http://107.20.87.206:5000`, which causes a **Mixed Content Error**. Browsers block HTTP requests from HTTPS pages for security.

## Solution Options

### Option 1: Setup HTTPS for Backend (Recommended)

#### Using Nginx Reverse Proxy with Let's Encrypt SSL

**Step 1: Install Nginx on EC2**

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Step 2: Install Certbot (Let's Encrypt)**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Step 3: Configure Nginx**

```bash
sudo nano /etc/nginx/sites-available/fami-backend
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name api.arakala.net;  # Or use your subdomain

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

**Step 4: Enable the site**

```bash
sudo ln -s /etc/nginx/sites-available/fami-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

**Step 5: Get SSL Certificate**

```bash
sudo certbot --nginx -d api.arakala.net
```

Follow the prompts. Certbot will automatically configure HTTPS.

**Step 6: Update Frontend config.js**

Change to:
```javascript
window.ENV = {
  REACT_APP_API_URL: 'https://api.arakala.net/api'
};
```

**Step 7: Update Backend CORS**

Add to `backend/server.js` allowed origins:
```javascript
'https://api.arakala.net',
'https://www.arakala.net'
```

---

### Option 2: Use AWS Application Load Balancer (ALB) with SSL

1. Create Application Load Balancer in AWS
2. Add SSL certificate (ACM)
3. Configure target group to point to EC2:5000
4. Update DNS to point `api.arakala.net` to ALB
5. Update frontend config.js to use `https://api.arakala.net/api`

---

### Option 3: Quick Fix - Use Same Domain (Temporary)

If you can't set up HTTPS immediately, you can serve the API from the same domain:

**Update config.js to use relative path:**
```javascript
window.ENV = {
  REACT_APP_API_URL: '/api'  // Relative path - uses same domain
};
```

Then configure your web server (CloudFront/S3) to proxy `/api/*` requests to your backend.

---

### Option 4: Use CloudFront with Custom Origin (Recommended for AWS)

1. Create CloudFront distribution
2. Origin: `http://107.20.87.206:5000`
3. Behavior: Forward all requests
4. SSL Certificate: Use ACM certificate for `api.arakala.net`
5. Update DNS: Point `api.arakala.net` to CloudFront
6. Update config.js: `https://api.arakala.net/api`

---

## Quick Temporary Fix (Not Recommended for Production)

If you need a quick workaround while setting up HTTPS:

**Update frontend config.js to use HTTPS backend URL:**

```javascript
window.ENV = {
  REACT_APP_API_URL: 'https://107.20.87.206:5000/api'  // Will fail without SSL
};
```

**OR use a subdomain with HTTPS:**
- Set up `api.arakala.net` with SSL
- Point it to your EC2 backend
- Update config.js to use `https://api.arakala.net/api`

---

## Recommended Solution: Nginx + Let's Encrypt

This is the most common and free solution:

1. **Install Nginx and Certbot** (commands above)
2. **Configure Nginx** to proxy to `localhost:5000`
3. **Get SSL certificate** for `api.arakala.net`
4. **Update DNS** to point `api.arakala.net` to your EC2 IP
5. **Update frontend config.js** to use `https://api.arakala.net/api`
6. **Update backend CORS** to allow `https://api.arakala.net`

---

## After Setup

1. Rebuild frontend: `npm run build`
2. Redeploy to S3
3. Update config.js with HTTPS URL
4. Test from `https://www.arakala.net`

---

**Note**: The backend must be accessible via HTTPS for this to work. The easiest way is using Nginx as a reverse proxy with Let's Encrypt SSL certificate.

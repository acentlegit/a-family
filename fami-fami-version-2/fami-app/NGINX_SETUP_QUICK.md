# Quick Nginx + SSL Setup for Backend

## Step-by-Step Commands (Copy & Paste)

### 1. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/fami-backend
```

**Paste this (replace with your domain if different):**

```nginx
server {
    listen 80;
    server_name api.arakala.net;

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

**Save**: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/fami-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Get SSL Certificate

```bash
sudo certbot --nginx -d api.arakala.net
```

**Follow prompts:**
- Enter email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

### 6. Update DNS

Point `api.arakala.net` to your EC2 IP: `107.20.87.206`

### 7. Update Frontend config.js

```javascript
window.ENV = {
  REACT_APP_API_URL: 'https://api.arakala.net/api'
};
```

### 8. Rebuild and Redeploy Frontend

```bash
cd fami-app/frontend
npm run build
# Then deploy to S3
```

### 9. Update Backend CORS (if needed)

Add to `backend/server.js`:
```javascript
'https://api.arakala.net',
```

### 10. Restart Backend

```bash
pm2 restart fami-backend
```

---

## Verify

1. Test backend: `curl https://api.arakala.net/api/health`
2. Test frontend: Visit `https://www.arakala.net` and try login

---

## Troubleshooting

**If certbot fails:**
- Make sure DNS is pointing to EC2 IP
- Wait a few minutes for DNS propagation
- Check firewall allows port 80 and 443

**If nginx fails:**
- Check config: `sudo nginx -t`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

# PuTTY Commands Guide - EC2 Backend Setup

## 🔌 Step 1: Connect to EC2 via PuTTY

### Initial Connection Setup

1. **Open PuTTY**
2. **Enter Connection Details**:
   - **Host Name**: `107.20.87.206`
   - **Port**: `22`
   - **Connection type**: SSH
3. **Configure SSH Key**:
   - Go to **Connection** → **SSH** → **Auth**
   - Click **Browse** and select your `.pem` key file
   - (If using `.ppk`, load it here)
4. **Save Session** (optional):
   - Go to **Session**
   - Enter name: `Fami EC2`
   - Click **Save**
5. **Click Open** to connect

### Alternative: Convert .pem to .ppk (if needed)

If PuTTY doesn't accept `.pem` file:
1. Open **PuTTYgen**
2. Click **Load** → Select your `.pem` file
3. Click **Save private key** → Save as `.ppk`
4. Use the `.ppk` file in PuTTY

---

## 📋 Step 2: Initial Setup Commands

### 2.1 Navigate to Backend Directory

```bash
cd ~/fami-backend
```

### 2.2 Verify Files Are Present

```bash
ls -la
```

**Expected output**: You should see:
- `server.js`
- `package.json`
- `package-lock.json`
- Folders: `routes/`, `models/`, `middleware/`, `utils/`, `services/`, etc.

### 2.3 Check Node.js and npm Versions

```bash
node --version
npm --version
```

**Expected**: Node.js v18.x or higher, npm 9.x or higher

**If not installed**, install Node.js:
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2.4 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

Verify installation:
```bash
pm2 --version
```

**If you get permission errors**, you may need to fix npm permissions:
```bash
# Create directory for global packages
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH (add this to ~/.bashrc)
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Now install PM2
npm install -g pm2
```

---

## ⚙️ Step 3: Create .env File

### 3.1 Create .env File

```bash
nano .env
```

### 3.2 Paste Environment Variables

Copy and paste the following, then **replace the placeholder values** with your actual credentials:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
EC2_IP=107.20.87.206

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string_here

# JWT Secrets (Generate strong random strings)
JWT_SECRET=your_jwt_secret_here_min_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_min_32_characters
JWT_EXPIRE=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@fami.live
FROM_EMAIL=noreply@fami.live

# Frontend URL (Your Domain)
CLIENT_URL=https://www.arakala.net

# Backend Base URL
BASE_URL=http://107.20.87.206:5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=a-family-media
AWS_REGION=us-east-1

# LiveKit Configuration (for video calls)
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=your_livekit_url_here

# Super Admin Account
SUPER_ADMIN_EMAIL=admin@fami.live
SUPER_ADMIN_PASSWORD=your_secure_password_here
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
```

### 3.3 Save and Exit

- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

### 3.4 Verify .env File

```bash
cat .env
```

**Note**: Make sure all placeholder values are replaced with your actual credentials!

---

## 📦 Step 4: Install Dependencies

### 4.1 Install Node Modules

```bash
npm install --production
```

**This will take 2-5 minutes**. Wait for it to complete.

### 4.2 Verify Installation

```bash
ls node_modules | head -20
```

You should see installed packages listed.

---

## 📁 Step 5: Create Required Directories

### 5.1 Create Uploads Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

### 5.2 Create Generated Sites Directory

```bash
mkdir -p generated_sites
chmod 755 generated_sites
```

### 5.3 Verify Directories

```bash
ls -la | grep -E "uploads|generated_sites"
```

---

## 🚀 Step 6: Start the Server with PM2

### 6.1 Start the Application

```bash
pm2 start server.js --name fami-backend
```

### 6.2 Check Status

```bash
pm2 status
```

**Expected output**: You should see `fami-backend` with status `online`.

### 6.3 View Logs

```bash
pm2 logs fami-backend
```

**Press `Ctrl + C` to exit logs view**.

### 6.4 View Real-time Monitoring

```bash
pm2 monit
```

**Press `Ctrl + C` to exit monitoring**.

---

## 🔄 Step 7: Configure PM2 for Auto-Start

### 7.1 Save PM2 Configuration

```bash
pm2 save
```

### 7.2 Setup PM2 Startup Script

```bash
pm2 startup
```

**This will output a command**. Copy and run that command (it will look like):
```bash
# For Ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# For RHEL/CentOS (if different user)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

**Note**: The command will be different based on your system. Always copy and run the exact command that `pm2 startup` shows you.

### 7.3 Verify Startup Configuration

```bash
pm2 save
```

---

## ✅ Step 8: Verify Server is Running

### 8.1 Test Health Endpoint

```bash
curl http://localhost:5000/api/health
```

**Expected response**:
```json
{
  "success": true,
  "status": "OK",
  "message": "API is running",
  "timestamp": "2026-02-25T...",
  "mongodb": "Connected",
  "mongodbState": 1,
  "mongodbUri": "Set"
}
```

### 8.2 Test from External IP

Open a new terminal/PuTTY session or use your browser:
```
http://107.20.87.206:5000/api/health
```

### 8.3 Check Server Logs for Errors

```bash
pm2 logs fami-backend --lines 50
```

Look for:
- ✅ `Server running on http://0.0.0.0:5000`
- ✅ `MongoDB connected`
- ❌ Any error messages

---

## 🔧 Step 9: Configure Firewall (if needed)

### 9.1 Check if Port 5000 is Open

```bash
sudo firewall-cmd --list-ports
```

### 9.2 Open Port 5000 (if not open)

**For Ubuntu (UFW firewall)**:
```bash
# Check UFW status
sudo ufw status

# Allow port 5000
sudo ufw allow 5000/tcp

# Enable UFW if not enabled
sudo ufw enable

# Verify
sudo ufw status
```

**For RHEL/CentOS (firewalld)**:
```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

**For EC2 Security Groups** (Important!):
- Go to AWS Console → EC2 → Security Groups
- Select your instance's security group
- Add Inbound Rule: Type: Custom TCP, Port: 5000, Source: 0.0.0.0/0
- Save rules

### 9.3 Verify Port is Open

**Ubuntu**:
```bash
sudo ufw status
```

**RHEL/CentOS**:
```bash
sudo firewall-cmd --list-ports
```

**Check if port is listening**:
```bash
sudo netstat -tlnp | grep 5000
# Or
sudo ss -tlnp | grep 5000
```

---

## 📊 Step 10: Useful PM2 Commands

### View Application Status

```bash
pm2 status
```

### View Logs

```bash
# All logs
pm2 logs fami-backend

# Last 100 lines
pm2 logs fami-backend --lines 100

# Error logs only
pm2 logs fami-backend --err

# Output logs only
pm2 logs fami-backend --out
```

### Restart Application

```bash
pm2 restart fami-backend
```

### Stop Application

```bash
pm2 stop fami-backend
```

### Delete Application from PM2

```bash
pm2 delete fami-backend
```

### Reload Application (Zero Downtime)

```bash
pm2 reload fami-backend
```

### View Application Information

```bash
pm2 info fami-backend
```

### View Real-time Monitoring

```bash
pm2 monit
```

---

## 🔍 Step 11: Troubleshooting Commands

### Check if Server is Running

```bash
ps aux | grep node
```

### Check Port 5000 Usage

```bash
sudo netstat -tlnp | grep 5000
```

Or:
```bash
sudo ss -tlnp | grep 5000
```

### Check MongoDB Connection

```bash
# If MongoDB is on same server
mongo --eval "db.adminCommand('ping')"

# Or check connection string in .env
grep MONGODB_URI .env
```

### View System Resources

```bash
# CPU and Memory
top

# Disk Space
df -h

# Memory Usage
free -h
```

### Check Node.js Process

```bash
# Find Node processes
ps aux | grep node

# Kill a process (if needed)
# First find PID, then:
kill -9 <PID>
```

### View Recent System Logs

```bash
# System logs
sudo journalctl -u pm2-ubuntu -n 50

# Or general system logs
sudo tail -f /var/log/syslog
```

---

## 🔄 Step 12: Update Application (After Code Changes)

### 12.1 Upload New Files via WinSCP

(Upload changed files to `/home/ubuntu/fami-backend/`)

### 12.2 Restart Application

```bash
cd ~/fami-backend
pm2 restart fami-backend
```

### 12.3 Check Logs

```bash
pm2 logs fami-backend --lines 20
```

### 12.4 If Dependencies Changed

```bash
cd ~/fami-backend
npm install --production
pm2 restart fami-backend
```

---

## 🛠️ Step 13: Create Super Admin User

### 13.1 Run Super Admin Script

```bash
cd ~/fami-backend
node scripts/ensureSuperAdmin.js
```

This will create the super admin user based on `.env` variables.

### 13.2 Verify Super Admin

```bash
# Test login (replace with your credentials)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fami.live","password":"your_password"}'
```

---

## 📝 Step 14: Environment Variable Management

### View Current .env

```bash
cat .env
```

### Edit .env File

```bash
nano .env
```

After editing, restart:
```bash
pm2 restart fami-backend
```

### Add New Environment Variable

```bash
# Edit .env
nano .env

# Add your variable, then restart
pm2 restart fami-backend
```

---

## 🔐 Step 15: Security Checklist

### 15.1 Verify .env Permissions

```bash
ls -la .env
```

**Should show**: `-rw-------` (read/write for owner only)

If not, fix it:
```bash
chmod 600 .env
```

### 15.2 Verify File Permissions

```bash
# Backend files should be readable
chmod -R 755 ~/fami-backend
chmod 600 ~/fami-backend/.env
```

### 15.3 Check Firewall Status

```bash
sudo firewall-cmd --list-all
```

---

## 📊 Step 16: Monitoring and Maintenance

### View Application Metrics

```bash
pm2 monit
```

### Check Application Uptime

```bash
pm2 info fami-backend
```

### View Resource Usage

```bash
pm2 list
```

### Setup Log Rotation (Optional)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎯 Quick Reference: Essential Commands

```bash
# Navigate to backend
cd ~/fami-backend

# Start server
pm2 start server.js --name fami-backend

# Check status
pm2 status

# View logs
pm2 logs fami-backend

# Restart
pm2 restart fami-backend

# Stop
pm2 stop fami-backend

# Test API
curl http://localhost:5000/api/health
```

---

## ✅ Final Verification Checklist

Run these commands to verify everything is working:

```bash
# 1. Check PM2 status
pm2 status

# 2. Test health endpoint
curl http://localhost:5000/api/health

# 3. Check logs for errors
pm2 logs fami-backend --lines 20

# 4. Verify MongoDB connection (in logs)
pm2 logs fami-backend | grep -i mongo

# 5. Check port is listening
sudo netstat -tlnp | grep 5000

# 6. Test from browser
# Open: http://107.20.87.206:5000/api/health
```

---

## 🆘 Common Issues and Solutions

### Issue: "Port 5000 already in use"

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or restart PM2
pm2 restart fami-backend
```

### Issue: "Cannot find module"

```bash
# Reinstall dependencies
cd ~/fami-backend
rm -rf node_modules
npm install --production
pm2 restart fami-backend
```

### Issue: "MongoDB connection failed"

```bash
# Check MongoDB URI in .env
grep MONGODB_URI .env

# Test MongoDB connection
# (Adjust based on your MongoDB setup)
```

### Issue: "Permission denied"

```bash
# Fix permissions
chmod 755 ~/fami-backend
chmod 600 ~/fami-backend/.env
chmod +x ~/fami-backend/server.js
```

### Issue: "PM2 not found"

```bash
# Install PM2 globally
sudo npm install -g pm2

# Or use full path
/usr/bin/pm2 start server.js --name fami-backend
```

---

## 📞 Support Commands

### Get System Information

```bash
# OS version
cat /etc/os-release

# Node version
node --version

# npm version
npm --version

# PM2 version
pm2 --version

# Disk space
df -h

# Memory
free -h
```

---

**Last Updated**: February 25, 2026
**EC2 IP**: 107.20.87.206
**Backend Directory**: `/home/ubuntu/fami-backend/`
**Port**: 5000

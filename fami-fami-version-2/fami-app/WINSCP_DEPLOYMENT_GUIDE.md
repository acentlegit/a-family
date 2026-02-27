# WinSCP Backend Deployment Guide - EC2 Structure

## 📋 Complete File Structure for EC2 Deployment

This guide shows exactly what files to upload to your EC2 server using WinSCP.

---

## 🎯 Target Directory on EC2

**Upload all files to**: `/home/ec2-user/fami-backend/`

---

## ✅ Files to UPLOAD (Right Side in WinSCP)

### 📁 Root Directory Files

```
fami-backend/
├── 📄 server.js                    # Main server file (REQUIRED)
├── 📄 package.json                 # Dependencies list (REQUIRED)
├── 📄 package-lock.json            # Locked dependencies (REQUIRED)
└── 📄 .env                         # Environment variables (CREATE THIS ON EC2)
```

### 📁 routes/ (21 files - ALL REQUIRED)

```
fami-backend/routes/
├── 📄 admin.js
├── 📄 albums.js
├── 📄 auth.js
├── 📄 email.js
├── 📄 events.js
├── 📄 families.js
├── 📄 familyTree.js
├── 📄 googleDrive.js
├── 📄 invitations.js
├── 📄 livekit.js
├── 📄 media.js
├── 📄 members.js
├── 📄 memories.js
├── 📄 messages.js
├── 📄 notifications.js
├── 📄 roles.js
├── 📄 s3ToDrive.js
├── 📄 superAdmin.js
├── 📄 video.js
├── 📄 videoCalls.js
└── 📄 websiteAdmin.js
```

### 📁 models/ (11 files - ALL REQUIRED)

```
fami-backend/models/
├── 📄 Album.js
├── 📄 AuditLog.js
├── 📄 Event.js
├── 📄 Family.js
├── 📄 FamilyTree.js
├── 📄 Invitation.js
├── 📄 Member.js
├── 📄 Memory.js
├── 📄 Message.js
├── 📄 Notification.js
├── 📄 Permission.js
└── 📄 User.js
```

### 📁 middleware/ (4 files - ALL REQUIRED)

```
fami-backend/middleware/
├── 📄 auth.js
├── 📄 rateLimiter.js
├── 📄 rbac.js
└── 📄 superAdmin.js
```

### 📁 utils/ (11 files - ALL REQUIRED)

```
fami-backend/utils/
├── 📄 cloudinary.js
├── 📄 createNotification.js
├── 📄 email.js
├── 📄 fileSizeValidator.js
├── 📄 getBaseUrl.js
├── 📄 getClientUrl.js
├── 📄 googleDrive.js
├── 📄 localStorage.js
├── 📄 s3SignedUrls.js
├── 📄 s3Storage.js
└── 📄 sesEmail.js
```

### 📁 services/ (4 files - ALL REQUIRED)

```
fami-backend/services/
├── 📄 cloudfrontConfig.js
├── 📄 ollamaService.js
├── 📄 s3Publisher.js
└── 📄 websiteGenerator.js
```

### 📁 database/ (2 files - OPTIONAL, but recommended)

```
fami-backend/database/
├── 📄 pgClient.js
└── 📄 schema.sql
```

### 📁 scripts/ (6 files - OPTIONAL, for maintenance)

```
fami-backend/scripts/
├── 📄 ensureSuperAdmin.js          # Create super admin user
├── 📄 testSendGrid.js              # Test email service
├── 📄 testSuperAdminLogin.js      # Test admin login
├── 📄 migrateMongoToPostgres.js    # Database migration
├── 📄 configureEnv.ps1            # Windows env setup (skip on EC2)
└── 📄 setupPostgres.ps1          # Windows Postgres setup (skip on EC2)
```

### 📁 uploads/ (EMPTY FOLDER - Create on EC2)

```
fami-backend/uploads/
└── (empty - will store uploaded files)
```

### 📁 generated_sites/ (EMPTY FOLDER - Create on EC2)

```
fami-backend/generated_sites/
└── (empty - will store generated websites)
```

---

## ❌ Files to EXCLUDE (DO NOT UPLOAD)

### 🚫 Never Upload These:

```
❌ node_modules/                    # Will be installed via npm install
❌ .env                            # Create manually on EC2 with your secrets
❌ *.log                           # Log files (backend_error.txt, etc.)
❌ *.txt                           # Output files (backend_output.txt, etc.)
❌ *.ps1                           # Windows PowerShell scripts
❌ .git/                           # Git repository
❌ uploads/*                       # Existing uploads (keep folder empty)
❌ generated_sites/*               # Existing sites (keep folder empty)
❌ Dockerfile                      # Not needed for direct deployment
❌ *.md                            # Documentation files (optional)
❌ tests/                          # Test files (optional)
❌ lambdas/                        # Lambda functions (if not using)
```

---

## 📝 Step-by-Step WinSCP Instructions

### Step 1: Connect to EC2

1. Open **WinSCP**
2. Click **New Session**
3. Enter connection details:
   - **File protocol**: SFTP
   - **Host name**: `107.20.87.206`
   - **Port number**: `22`
   - **User name**: `ec2-user` (or your EC2 username)
   - **Password**: (leave empty, use key file)
   - **Private key file**: Browse and select your `.pem` key file
4. Click **Login**

### Step 2: Navigate to Target Directory

1. On **Right side (Remote)**: Navigate to `/home/ec2-user/`
2. Create folder `fami-backend` if it doesn't exist:
   - Right-click → **New** → **Directory** → Name: `fami-backend`
3. Double-click to enter `fami-backend/`

### Step 3: Upload Files

#### Option A: Upload Entire Backend Folder (Recommended)

1. On **Left side (Local)**: Navigate to `fami-app/backend/`
2. **Select files to upload** (use filters):
   - Select all files EXCEPT:
     - `node_modules/` folder
     - `*.log` files
     - `*.txt` files
     - `*.ps1` files
     - `.git/` folder
     - `uploads/` folder contents
     - `generated_sites/` folder contents
3. **Drag and drop** selected files to right side
4. WinSCP will show upload dialog - click **Copy**

#### Option B: Upload Folders One by One

1. **Upload routes/**:
   - Left: `backend/routes/` → Right: `fami-backend/routes/`
   - Select all `.js` files, drag to right side

2. **Upload models/**:
   - Left: `backend/models/` → Right: `fami-backend/models/`
   - Select all `.js` files, drag to right side

3. **Upload middleware/**:
   - Left: `backend/middleware/` → Right: `fami-backend/middleware/`
   - Select all `.js` files, drag to right side

4. **Upload utils/**:
   - Left: `backend/utils/` → Right: `fami-backend/utils/`
   - Select all `.js` files, drag to right side

5. **Upload services/**:
   - Left: `backend/services/` → Right: `fami-backend/services/`
   - Select all `.js` files, drag to right side

6. **Upload root files**:
   - Left: `backend/` → Right: `fami-backend/`
   - Select: `server.js`, `package.json`, `package-lock.json`
   - Drag to right side

7. **Create empty folders**:
   - Right-click on right side → **New** → **Directory**
   - Create: `uploads/` and `generated_sites/`

### Step 4: Set File Permissions

After upload, set permissions:

1. Select all uploaded files (Ctrl+A)
2. Right-click → **Properties** → **Permissions**
3. Set:
   - **Owner**: Read, Write, Execute
   - **Group**: Read, Execute
   - **Others**: Read, Execute
4. Check **Recursive** to apply to subdirectories
5. Click **OK**

---

## 🔧 Post-Upload Setup on EC2

### Step 1: SSH into EC2

```bash
ssh -i your-key.pem ec2-user@107.20.87.206
```

### Step 2: Navigate to Backend Directory

```bash
cd ~/fami-backend
```

### Step 3: Create .env File

```bash
nano .env
```

Paste your environment variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
EC2_IP=107.20.87.206

# MongoDB
MONGODB_URI=your_mongodb_connection_string_here

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRE=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@fami.live
FROM_EMAIL=noreply@fami.live

# Frontend URL (S3 Bucket)
CLIENT_URL=http://fami-live.s3-website-us-east-1.amazonaws.com

# Backend Base URL
BASE_URL=http://107.20.87.206:5000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=a-family-media
AWS_REGION=us-east-1

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=your_livekit_url_here

# Super Admin
SUPER_ADMIN_EMAIL=admin@fami.live
SUPER_ADMIN_PASSWORD=your_secure_password_here
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Step 4: Install Dependencies

```bash
npm install --production
```

### Step 5: Start with PM2

```bash
# Start the application
pm2 start server.js --name fami-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
# Follow the instructions shown
```

### Step 6: Verify

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs fami-backend

# Test API
curl http://localhost:5000/api/health
```

---

## 📊 Complete File Count Summary

| Category | Files | Required |
|----------|-------|----------|
| Root Files | 3 | ✅ Yes |
| routes/ | 21 | ✅ Yes |
| models/ | 11 | ✅ Yes |
| middleware/ | 4 | ✅ Yes |
| utils/ | 11 | ✅ Yes |
| services/ | 4 | ✅ Yes |
| database/ | 2 | ⚠️ Optional |
| scripts/ | 4 | ⚠️ Optional |
| **TOTAL** | **60** | **54 Required** |

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All files uploaded to `/home/ec2-user/fami-backend/`
- [ ] `.env` file created with all variables
- [ ] `node_modules/` installed (`npm install --production`)
- [ ] PM2 process running (`pm2 status`)
- [ ] Server responding (`curl http://localhost:5000/api/health`)
- [ ] Port 5000 accessible from outside
- [ ] CORS configured correctly
- [ ] MongoDB connection working
- [ ] Frontend can connect to backend

---

## 🎯 Quick Reference: WinSCP Upload Structure

```
LOCAL (Left Side)                    →    REMOTE (Right Side)
─────────────────────────────────────────────────────────────
fami-app/backend/                    →    /home/ec2-user/fami-backend/
├── server.js                        →    ├── server.js
├── package.json                     →    ├── package.json
├── package-lock.json                →    ├── package-lock.json
├── routes/                          →    ├── routes/
│   └── *.js (21 files)              →    │   └── *.js
├── models/                          →    ├── models/
│   └── *.js (11 files)              →    │   └── *.js
├── middleware/                      →    ├── middleware/
│   └── *.js (4 files)               →    │   └── *.js
├── utils/                           →    ├── utils/
│   └── *.js (11 files)              →    │   └── *.js
├── services/                        →    ├── services/
│   └── *.js (4 files)               →    │   └── *.js
├── database/                        →    ├── database/
│   └── *.js, *.sql (2 files)        →    │   └── *.js, *.sql
└── scripts/                         →    └── scripts/
    └── *.js (4 files)               →        └── *.js

CREATE ON EC2:
├── .env                             →    ├── .env (create manually)
├── uploads/                         →    ├── uploads/ (empty folder)
└── generated_sites/                 →    └── generated_sites/ (empty folder)
```

---

## 🚨 Important Notes

1. **Never upload `.env` file** - Create it manually on EC2 with your secrets
2. **Never upload `node_modules/`** - Install via `npm install` on EC2
3. **Create empty folders** - `uploads/` and `generated_sites/` must exist
4. **Set permissions** - Ensure files are executable (chmod +x if needed)
5. **Test connection** - Verify backend responds before closing WinSCP

---

## 🔄 Updating the Backend

When you make changes:

1. **Upload changed files** via WinSCP
2. **SSH into EC2**: `ssh -i key.pem ec2-user@107.20.87.206`
3. **Restart PM2**: `pm2 restart fami-backend`
4. **Check logs**: `pm2 logs fami-backend`

---

**Last Updated**: February 25, 2026
**EC2 IP**: 107.20.87.206
**Target Directory**: `/home/ec2-user/fami-backend/`

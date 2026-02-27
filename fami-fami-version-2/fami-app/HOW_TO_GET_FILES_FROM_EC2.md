# How to Get Files from EC2 Server

## What Your Manager Wants:

Get these 3 files from EC2 server:
1. `server.js` - Main backend server file
2. `getBaseUrl.js` - Base URL utility
3. `getClientUrl.js` - Client URL utility

## Method 1: SSH and Copy (Manual)

### Step 1: SSH into EC2
```bash
ssh ubuntu@107.20.87.206
```

### Step 2: Navigate to Backend Directory
```bash
cd ~/fami-backend
# OR
cd /home/ubuntu/fami-backend
```

### Step 3: View Each File

**View server.js:**
```bash
cat server.js
# OR to see with line numbers
cat -n server.js
# OR to view in editor
nano server.js
```

**View getBaseUrl.js:**
```bash
cat utils/getBaseUrl.js
# OR
cat -n utils/getBaseUrl.js
```

**View getClientUrl.js:**
```bash
cat utils/getClientUrl.js
# OR
cat -n utils/getClientUrl.js
```

### Step 4: Copy the Code
1. Select all text from the terminal
2. Copy it (Ctrl+C or right-click)
3. Create new file on your local machine
4. Paste the code

## Method 2: SFTP/WinSCP (Recommended - Easier)

### Option A: Using WinSCP (Windows)

**Step 1: Download WinSCP**
- Download from: https://winscp.net/
- Install it

**Step 2: Connect to EC2**
1. Open WinSCP
2. Click "New Session"
3. Enter:
   - **File protocol:** SFTP
   - **Host name:** `107.20.87.206`
   - **Port number:** `22`
   - **User name:** `ubuntu`
   - **Password:** (your EC2 password or use SSH key)
4. Click "Login"

**Step 3: Navigate to Files**
- Left side: Your local computer
- Right side: EC2 server
- Navigate to: `/home/ubuntu/fami-backend/`

**Step 4: Download Files**
1. Find these files on EC2 (right side):
   - `server.js`
   - `utils/getBaseUrl.js`
   - `utils/getClientUrl.js`
2. Select all 3 files
3. Drag them to your local folder (left side)
4. Or right-click → Download

**Step 5: Save to Your Project**
- Copy downloaded files to:
  - `fami-app/backend/server.js`
  - `fami-app/backend/utils/getBaseUrl.js`
  - `fami-app/backend/utils/getClientUrl.js`

### Option B: Using SFTP Command Line

**Step 1: Open PowerShell or Command Prompt**

**Step 2: Connect via SFTP**
```powershell
sftp ubuntu@107.20.87.206
```

**Step 3: Navigate to Backend Directory**
```bash
cd fami-backend
```

**Step 4: Download Files**
```bash
# Download server.js
get server.js

# Download getBaseUrl.js
get utils/getBaseUrl.js

# Download getClientUrl.js
get utils/getClientUrl.js
```

**Step 5: Exit SFTP**
```bash
exit
```

**Step 6: Files will be in your current directory**
- Move them to your project folder

### Option C: Using SCP (Single Command)

**In PowerShell:**
```powershell
# Navigate to your project backend folder first
cd "C:\MY APPLICATIONS\fami-fami-version-2\fami-fami-version-2\fami-app\backend"

# Download server.js
scp ubuntu@107.20.87.206:~/fami-backend/server.js .

# Download getBaseUrl.js
scp ubuntu@107.20.87.206:~/fami-backend/utils/getBaseUrl.js utils/

# Download getClientUrl.js
scp ubuntu@107.20.87.206:~/fami-backend/utils/getClientUrl.js utils/
```

## Method 3: Using VS Code Remote SSH (If You Have It)

1. Install "Remote - SSH" extension in VS Code
2. Connect to: `ubuntu@107.20.87.206`
3. Open folder: `/home/ubuntu/fami-backend`
4. Right-click files → Download

## Quick Commands Reference

### Find File Locations on EC2:
```bash
# SSH into EC2
ssh ubuntu@107.20.87.206

# Find server.js
find ~ -name "server.js" -type f

# Find getBaseUrl.js
find ~ -name "getBaseUrl.js" -type f

# Find getClientUrl.js
find ~ -name "getClientUrl.js" -type f
```

### Typical File Locations:
- `server.js` → `/home/ubuntu/fami-backend/server.js`
- `getBaseUrl.js` → `/home/ubuntu/fami-backend/utils/getBaseUrl.js`
- `getClientUrl.js` → `/home/ubuntu/fami-backend/utils/getClientUrl.js`

## After Downloading:

1. **Compare with local files** - See what's different
2. **Update local files** - If server versions are newer/better
3. **Or update server** - If local versions are better

## Recommended: WinSCP (Easiest)

**Why WinSCP:**
- ✅ Visual interface (like File Explorer)
- ✅ Drag and drop files
- ✅ Easy to navigate
- ✅ Can edit files directly
- ✅ Free and reliable

**Steps:**
1. Download WinSCP
2. Connect to `ubuntu@107.20.87.206`
3. Navigate to `/home/ubuntu/fami-backend/`
4. Download the 3 files
5. Save to your local project

## What Your Manager Probably Wants:

1. **See current server configuration** - What's actually running
2. **Compare with local code** - Check for differences
3. **Update local files** - Make sure local matches server
4. **Or update server** - Make sure server has latest changes

The files on EC2 might have different configurations (like different URLs, IPs, etc.) that need to be synced with your local code.

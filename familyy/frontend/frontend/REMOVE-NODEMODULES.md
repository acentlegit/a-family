# Remove node_modules - Commands

## Windows PowerShell Commands

### Remove node_modules:
```powershell
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
Remove-Item -Recurse -Force node_modules
```

### Remove node_modules and package-lock.json (clean slate):
```powershell
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
```

### Remove node_modules, reinstall, and build:
```powershell
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

## Linux/Mac Commands (for EC2 Server)

### Remove node_modules:
```bash
cd /path/to/backend
rm -rf node_modules
```

### Clean install:
```bash
cd /path/to/backend
rm -rf node_modules package-lock.json
npm install
```

## Using WinSCP/PuTTY on Remote Server

### Via PuTTY SSH:
```bash
# Navigate to backend directory
cd /path/to/backend

# Remove node_modules
rm -rf node_modules

# Verify removal
ls -la | grep node_modules
```

### Via WinSCP:
1. Connect to EC2 server (34.204.50.125)
2. Navigate to backend directory
3. Right-click on `node_modules` folder
4. Select **Delete**
5. Confirm deletion

## Production Build Commands

### Frontend (Local):
```powershell
cd "C:\Users\saipoojitha\Downloads\frontend\frontend"
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

### Backend (EC2 Server):
```bash
cd /path/to/backend
rm -rf node_modules
npm install --production
npm start
```

## Notes

- **Frontend:** Remove `node_modules` before building for production
- **Backend:** Use `npm install --production` to skip dev dependencies
- **Build folder:** Contains production-ready files (no node_modules needed)
- **S3 Deployment:** Only upload `build/` folder contents, not node_modules

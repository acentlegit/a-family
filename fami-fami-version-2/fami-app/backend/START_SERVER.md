# 🚀 Start Backend Server

## Quick Start

**Open a NEW terminal/PowerShell window** and run:

```powershell
cd "C:\Users\saipoojitha\Downloads\fami-fami-version-2\fami-fami-version-2\fami-app\backend"
npm start
```

## What to Look For

After starting, you should see:
```
✅ Website admin routes registered successfully
Server running on port 5000
```

## Verify It's Working

1. **Check the console** - Look for "✅ Website admin routes registered successfully"
2. **Test the route** - Open in browser: `http://localhost:5000/api/website-admin/test`
   - Should return: `{"success":true,"message":"Website admin route is working!"}`
3. **Refresh your frontend** - The buttons should now work!

## If You See Errors

- **Port 5000 already in use**: Kill the process and restart
- **Module not found**: Run `npm install` first
- **Database connection errors**: Check PostgreSQL is running

## After Server Starts

✅ All Website Admin buttons will work:
- Save Configuration
- Preview  
- Publish to S3
- + Add Page
- Create Page
- Edit
- Delete

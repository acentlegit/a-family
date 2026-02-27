# Error Explanation: ERR_CONNECTION_REFUSED

## What the Error Means

**`ERR_CONNECTION_REFUSED`** means:
- The frontend is trying to connect to `http://localhost:5000/api`
- But there's no backend server running on your local machine
- The connection is being **refused** because nothing is listening on that port

## Why This is Happening

Looking at your console logs:
```
Login.tsx:59 🔍 Login - API URL: http://localhost:5000/api
AuthContext.tsx:63 🔍 AuthContext - API URL: http://localhost:5000/api
api.ts:57 🔍 API Request: POST http://localhost:5000/api/auth/login
```

**The problem**: The frontend is still using `http://localhost:5000/api` instead of `https://api.arakala.net/api`

This means:
1. ❌ The environment variable `REACT_APP_API_BASE` was **not baked into the build**
2. ❌ The build is falling back to the default `http://localhost:5000/api`
3. ❌ When deployed to S3, it's trying to connect to localhost (which doesn't exist on the server)

## Solution

I've just rebuilt the frontend with the environment variable explicitly set:
- ✅ Environment variable: `REACT_APP_API_BASE=https://api.arakala.net`
- ✅ Build completed successfully
- ✅ New build is in `fami-app/frontend/build/`

## Next Steps

1. **Upload the NEW build to S3** (replace all old files)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Clear CloudFront cache** (if using CloudFront)
4. **Test again** - should now connect to `https://api.arakala.net/api`

## How to Verify

After deploying, check the browser console:
- ✅ Should see: `🔍 API Request: POST https://api.arakala.net/api/auth/login`
- ❌ Should NOT see: `http://localhost:5000/api`

## Why Environment Variables Matter

React environment variables (like `REACT_APP_API_BASE`) are:
- **Baked into the JavaScript bundle** at build time
- **Not available at runtime** - they become part of the code
- **Must be set before running `npm run build`**

If the environment variable isn't set during build, React uses the fallback value (`http://localhost:5000/api`).

## Important Notes

- The `.env` file is only used during **build time**
- After build, the environment variable becomes part of the JavaScript code
- You need to **rebuild** every time you change the environment variable
- The new build must be **uploaded to S3** to take effect

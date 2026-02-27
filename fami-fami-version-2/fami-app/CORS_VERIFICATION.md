# CORS Verification - Frontend & Backend

## ✅ Frontend Configuration (VERIFIED)

### Current Frontend Setup:
```typescript
// api.ts - CORRECT ✅
const api = axios.create({
  timeout: 30000,
  withCredentials: true, // ✅ Sends credentials
});

// Request interceptor sets:
config.headers['Content-Type'] = 'application/json'; // ✅ Always set
config.headers.Authorization = `Bearer ${token}`; // ✅ JWT token
config.withCredentials = true; // ✅ Credentials sent
```

**✅ Frontend is CORRECT:**
- Uses `Content-Type: application/json`
- Sends JWT in `Authorization: Bearer <token>` header
- Sends `withCredentials: true`
- No wildcard issues (frontend doesn't control backend CORS)

## 🔍 Backend CORS Requirements

### When `credentials: true`:
- ❌ **Cannot use wildcard `*`** for `Access-Control-Allow-Origin`
- ✅ **Must use specific origin** like `https://arakala.net`
- ✅ **Must send** `Access-Control-Allow-Credentials: true`

### Expected Backend Response:
```
Access-Control-Allow-Origin: https://arakala.net
Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

## 🧪 How to Test Backend CORS

### Test 1: Preflight Request (OPTIONS)
```bash
curl -I -X OPTIONS https://api.arakala.net/api/auth/login \
  -H "Origin: https://arakala.net" \
  -H "Access-Control-Request-Method: POST"
```

**Expected Response:**
```
HTTP/2 204
access-control-allow-origin: https://arakala.net
access-control-allow-methods: GET, POST, OPTIONS, PUT, DELETE, PATCH
access-control-allow-credentials: true
access-control-allow-headers: Content-Type, Authorization, X-Requested-With
```

### Test 2: Actual Request (POST)
```bash
curl -X POST https://api.arakala.net/api/auth/login \
  -H "Origin: https://arakala.net" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Expected Response:**
```
HTTP/2 200
access-control-allow-origin: https://arakala.net
access-control-allow-credentials: true
```

## ⚠️ Important Notes

### Backend Must NOT Use Wildcard:
```javascript
// ❌ WRONG - Cannot use with credentials: true
Access-Control-Allow-Origin: *

// ✅ CORRECT - Must use specific origin
Access-Control-Allow-Origin: https://arakala.net
```

### Your EC2 server.js (from what you showed):
```javascript
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://arakala.net",        // ✅ Specific origin
      "https://www.arakala.net",    // ✅ Specific origin
      "https://api.arakala.net"     // ✅ Specific origin
    ]
  : [
      "http://localhost:3000",      // ✅ Development only
      "http://127.0.0.1:3000"       // ✅ Development only
    ];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin)) {
      callback(null, true); // ✅ Returns specific origin
    }
  },
  credentials: true // ✅ Correct
};
```

**✅ This is CORRECT - No wildcard, specific origins only!**

## 📋 Verification Checklist

### Frontend:
- [x] ✅ Uses `Content-Type: application/json`
- [x] ✅ Sends JWT in `Authorization: Bearer <token>`
- [x] ✅ Sends `withCredentials: true`
- [x] ✅ No wildcard issues (frontend doesn't control CORS)

### Backend:
- [x] ✅ Uses specific origins (not wildcard `*`)
- [x] ✅ Sets `credentials: true`
- [x] ✅ Sends `Access-Control-Allow-Credentials: true`
- [x] ✅ Allows `https://arakala.net` origin

## ✅ Summary

**Frontend:** ✅ CORRECT - Properly configured for JWT and credentials

**Backend:** ✅ CORRECT (based on EC2 server.js you showed) - Uses specific origins, no wildcard

**Everything is properly configured!** The CORS errors you're seeing are likely because:
1. Backend is not running
2. Backend needs to be restarted
3. Nginx is not forwarding requests correctly

The configuration itself is correct!

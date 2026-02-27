# Frontend CORS Fix - JWT and Credentials

## ✅ Changes Made

### 1. Added `withCredentials: true`
- Required when backend uses `credentials: true` in CORS
- Sends cookies and credentials with requests
- Allows Authorization header to work properly

### 2. Ensured Proper Headers
- ✅ `Content-Type: application/json` - Always set for JSON requests
- ✅ `Authorization: Bearer <token>` - JWT token in header
- ✅ `withCredentials: true` - Required for CORS with credentials

## 🔍 Important CORS Rules

### When `credentials: true`:
- ❌ **Cannot use wildcard `*`** for `Access-Control-Allow-Origin`
- ✅ **Must use specific origin** like `https://arakala.net`
- ✅ **Must send credentials** from frontend (`withCredentials: true`)

### Backend Must:
```javascript
// ✅ CORRECT - Specific origin
Access-Control-Allow-Origin: https://arakala.net
Access-Control-Allow-Credentials: true

// ❌ WRONG - Wildcard not allowed with credentials
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

## 📝 What Was Fixed

### Before:
```typescript
const api = axios.create({
  timeout: 30000
  // Missing withCredentials
});
```

### After:
```typescript
const api = axios.create({
  timeout: 30000,
  withCredentials: true, // ✅ Added
});
```

### Headers:
```typescript
// ✅ Always sets Content-Type for JSON
config.headers['Content-Type'] = 'application/json';

// ✅ Always sends Authorization header with token
config.headers.Authorization = `Bearer ${token}`;

// ✅ Always sends credentials
config.withCredentials = true;
```

## 🎯 Request Format

**Now all requests look like:**
```javascript
fetch('https://api.arakala.net/api/auth/login', {
  method: 'POST',
  credentials: 'include', // ✅ Sent by axios with withCredentials: true
  headers: {
    'Content-Type': 'application/json', // ✅ Always set
    'Authorization': 'Bearer <token>' // ✅ If token exists
  },
  body: JSON.stringify({ email, password })
});
```

## ⚠️ Backend Requirements

**Your backend MUST:**
1. ✅ Use specific origin (not wildcard `*`)
2. ✅ Set `credentials: true` in CORS
3. ✅ Send `Access-Control-Allow-Credentials: true` header

**Example backend CORS:**
```javascript
const corsOptions = {
  origin: 'https://arakala.net', // ✅ Specific, not "*"
  credentials: true // ✅ Required
};
```

## ✅ Summary

- ✅ Frontend now sends credentials correctly
- ✅ Headers are properly set
- ✅ JWT token in Authorization header
- ✅ Content-Type always set for JSON
- ✅ No wildcard issues (backend must use specific origin)

The frontend is now correctly configured for CORS with credentials!

#!/bin/bash

APP_FILE="src/App.tsx"

# ===== COGNITO CONFIG =====
COGNITO_DOMAIN="us-east-1tzqglsadp.auth.us-east-1.amazoncognito.com"
CLIENT_ID="4bfpc3omjsb6ihrflun7675thf"
REDIRECT_URI="https://arakala.net"
# ==========================

echo "🔧 Cleaning Login from App.tsx..."

# 1️⃣ Remove Login import
sed -i '' "/import Login from '\.\/pages\/Login';/d" $APP_FILE

# 2️⃣ Remove /login route line
sed -i '' "/path=\"\/login\"/d" $APP_FILE

# 3️⃣ Replace PrivateRoute redirect
sed -i '' "s|return <Navigate to=\"/login\" replace />;|window.location.href = \"https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}\&response_type=code\&scope=email+openid+profile\&redirect_uri=${REDIRECT_URI}\"; return null;|g" $APP_FILE

echo "✅ Login disabled successfully."
echo "👉 Now run: npm run build"

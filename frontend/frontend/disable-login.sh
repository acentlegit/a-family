#!/bin/bash

# ====== CONFIGURE THESE ======
COGNITO_DOMAIN="https://us-east-1tzqglsadp.auth.us-east-1.amazoncognito.com"
CLIENT_ID="4bfpc3omjsb6ihrflun7675thf"
REDIRECT_URI="https://arakala.net"
APP_FILE="src/App.tsx"   # Change if App.js
# =============================

echo "Updating App file..."

# 1️⃣ Remove Login import
sed -i '/import Login from .*Login/d' $APP_FILE

# 2️⃣ Remove /login route
sed -i '/path="\/login"/d' $APP_FILE

# 3️⃣ Replace PrivateRoute redirect
sed -i "s|return <Navigate to=\"/login\" replace />;|window.location.href = \"https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}\&response_type=code\&scope=email+openid+profile\&redirect_uri=${REDIRECT_URI}\"; return null;|g" $APP_FILE

# 4️⃣ Delete Login page file
LOGIN_FILE_TS=$(find src -name "Login.tsx")
LOGIN_FILE_JS=$(find src -name "Login.jsx")

if [ -f "$LOGIN_FILE_TS" ]; then
  rm "$LOGIN_FILE_TS"
  echo "Deleted $LOGIN_FILE_TS"
fi

if [ -f "$LOGIN_FILE_JS" ]; then
  rm "$LOGIN_FILE_JS"
  echo "Deleted $LOGIN_FILE_JS"
fi

echo "Login disabled successfully."
echo "Now run: npm run build"

#!/bin/bash

echo "🔄 Restoring Local JWT Login Mode..."

APP_FILE="src/App.tsx"

if [ ! -f "$APP_FILE" ]; then
  echo "❌ src/App.tsx not found."
  exit 1
fi

echo "📌 Restoring Login import..."

# Add Login import if missing
grep -q "import Login from './pages/Login';" $APP_FILE || \
sed -i "" "1s|^|import Login from './pages/Login';\n|" $APP_FILE 2>/dev/null || \
sed -i "1s|^|import Login from './pages/Login';\n|" $APP_FILE

echo "📌 Restoring /login route..."

# Add login route inside <Routes> if missing
grep -q 'path="/login"' $APP_FILE || \
sed -i "" '/<Routes>/a\
            <Route path="/login" element={<Login />} />\
' $APP_FILE 2>/dev/null || \
sed -i '/<Routes>/a\            <Route path="/login" element={<Login />} />' $APP_FILE

echo "📌 Removing Cognito redirects..."

# Remove Cognito domain references
sed -i "" '/amazoncognito.com/d' $APP_FILE 2>/dev/null || \
sed -i '/amazoncognito.com/d' $APP_FILE

sed -i "" '/oauth2\/authorize/d' $APP_FILE 2>/dev/null || \
sed -i '/oauth2\/authorize/d' $APP_FILE

echo "📌 Removing OAuth callback route if exists..."

sed -i "" '/auth\/google\/callback/d' $APP_FILE 2>/dev/null || \
sed -i '/auth\/google\/callback/d' $APP_FILE

echo "✅ Local login mode restored."
echo ""
echo "Next steps:"
echo "1. npm run build"
echo "2. Deploy to S3"
echo "3. Invalidate CloudFront"

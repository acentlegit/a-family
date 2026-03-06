#!/bin/bash

FILE="routes/dashboard.js"

echo "🔍 Checking dashboard route..."

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found!"
  exit 1
fi

# Backup file first
cp $FILE ${FILE}.bak

echo "🛠 Fixing auth import..."

# Replace incorrect auth import with destructured version
sed -i "s|const auth = require('../middleware/auth');|const { auth } = require('../middleware/auth');|g" $FILE

echo "✅ Auth import fixed."

echo "🔄 Restarting backend..."
pm2 restart fami-backend

echo "📊 Showing logs..."
pm2 logs fami-backend --lines 20

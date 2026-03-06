#!/bin/bash

echo "========================================="
echo "🔎 DASHBOARD ROOT CAUSE DIAGNOSTIC"
echo "========================================="

API_URL="https://api.arakala.net"
TEST_EMAIL="chandra@acentle.com"
TEST_PASSWORD="Admin$478"

echo ""
echo "1️⃣ Checking PM2 status..."
pm2 status

echo ""
echo "2️⃣ Checking recent PM2 restarts..."
pm2 show fami-backend | grep restart

echo ""
echo "3️⃣ Checking memory usage..."
free -h

echo ""
echo "4️⃣ Checking MongoDB connection logs..."
pm2 logs fami-backend --lines 20 | grep -i mongo

echo ""
echo "5️⃣ Checking PostgreSQL errors..."
pm2 logs fami-backend --lines 20 | grep -i pg

echo ""
echo "6️⃣ Testing API health..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" $API_URL

echo ""
echo "7️⃣ Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "Login response:"
echo $LOGIN_RESPONSE

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d '"' -f4)

if [ -z "$TOKEN" ]; then
  echo ""
  echo "❌ Login failed — cannot test protected routes."
else
  echo ""
  echo "8️⃣ Testing protected /families endpoint..."
  curl -s -H "Authorization: Bearer $TOKEN" \
    -w "\nHTTP Status: %{http_code}\n" \
    $API_URL/api/families
fi

echo ""
echo "========================================="
echo "✅ DIAGNOSTIC COMPLETE"
echo "========================================="

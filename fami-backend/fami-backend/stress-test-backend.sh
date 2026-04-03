#!/bin/bash

API_URL="https://api.arakala.net"
EMAIL="chandra@acentle.com"
PASSWORD="Admin$478"

REQUESTS=100
CONCURRENCY=10

echo "======================================"
echo "🔥 STARTING BACKEND STRESS TEST"
echo "======================================"

echo ""
echo "1️⃣ Getting JWT token..."

LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d '"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Cannot continue."
  exit 1
fi

echo "✅ Token acquired"

echo ""
echo "2️⃣ Running stress test..."
echo "Requests: $REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo ""

for i in $(seq 1 $REQUESTS); do
  (
    curl -s -o /dev/null -w "Request $i → HTTP %{http_code} | Time %{time_total}s\n" \
      -H "Authorization: Bearer $TOKEN" \
      $API_URL/api/families
  ) &

  if (( $i % $CONCURRENCY == 0 )); then
    wait
  fi
done

wait

echo ""
echo "======================================"
echo "📊 PM2 STATUS AFTER TEST"
echo "======================================"

pm2 status

echo ""
echo "======================================"
echo "💾 MEMORY STATUS"
echo "======================================"

free -h

echo ""
echo "======================================"
echo "📝 LAST 20 LOG LINES"
echo "======================================"

pm2 logs fami-backend --lines 20

echo ""
echo "🔥 STRESS TEST COMPLETE"
echo "======================================"

#!/bin/bash

FILE="/home/ubuntu/fami-backend/server.js"
BACKUP="/home/ubuntu/fami-backend/server.js.bak.$(date +%s)"

echo "======================================"
echo "Fixing server.js for production"
echo "======================================"

# 1️⃣ Check file exists
if [ ! -f "$FILE" ]; then
  echo "server.js not found!"
  exit 1
fi

# 2️⃣ Backup file
cp $FILE $BACKUP
echo "Backup created at $BACKUP"

# 3️⃣ Remove EC2_IP usage
sed -i '/EC2_IP/d' $FILE

# 4️⃣ Replace hardcoded http://IP:5000 patterns
sed -i 's|http://107\.20\.87\.206:5000|https://api.arakala.net|g' $FILE
sed -i 's|http://localhost:5000|https://api.arakala.net|g' $FILE

# 5️⃣ Inject BASE_URL if missing
grep -q "BASE_URL" $FILE
if [ $? -ne 0 ]; then
  echo "Injecting BASE_URL support..."

  sed -i '1i const BASE_URL = process.env.BASE_URL || "https://api.arakala.net";' $FILE
fi

# 6️⃣ Replace allowedOrigins block
sed -i '/const allowedOrigins = \[/,/];/c\
const allowedOrigins = process.env.NODE_ENV === "production"\
  ? [\
      "https://arakala.net",\
      "https://www.arakala.net",\
      "https://api.arakala.net"\
    ]\
  : [\
      "http://localhost:3000",\
      "http://127.0.0.1:3000"\
    ];' $FILE

echo "Restarting PM2..."
pm2 restart fami-backend

echo ""
echo "======================================"
echo "Fix complete ✅"
echo "======================================"
echo "Test with:"
echo "curl https://api.arakala.net"

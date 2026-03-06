#!/bin/bash

echo "=============================="
echo "🟢 Files Using MongoDB"
echo "=============================="

grep -Rl "mongoose" . --exclude-dir=node_modules 2>/dev/null
grep -Rl "new mongoose.Schema" . --exclude-dir=node_modules 2>/dev/null

echo ""
echo "=============================="
echo "🔴 Files Using PostgreSQL"
echo "=============================="

grep -Rl "require('pg')" . --exclude-dir=node_modules 2>/dev/null
grep -Rl "from 'pg'" . --exclude-dir=node_modules 2>/dev/null
grep -Rl "pgClient" . --exclude-dir=node_modules 2>/dev/null
grep -Rl "SELECT " . --exclude-dir=node_modules 2>/dev/null
grep -Rl "INSERT INTO" . --exclude-dir=node_modules 2>/dev/null
grep -Rl "UPDATE " . --exclude-dir=node_modules 2>/dev/null
grep -Rl "DELETE FROM" . --exclude-dir=node_modules 2>/dev/null

echo ""
echo "=============================="
echo "✅ Done"
echo "=============================="

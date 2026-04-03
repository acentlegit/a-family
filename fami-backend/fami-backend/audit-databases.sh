#!/bin/bash

echo "======================================"
echo "🔍 DATABASE USAGE AUDIT REPORT"
echo "======================================"

echo ""
echo "==============================="
echo "🟢 MONGODB / MONGOOSE USAGE"
echo "==============================="

echo ""
echo "1️⃣ mongoose imports:"
grep -R --line-number "require('mongoose')" . 2>/dev/null
grep -R --line-number 'from "mongoose"' . 2>/dev/null

echo ""
echo "2️⃣ Mongo connection usage:"
grep -R --line-number "mongoose.connect" . 2>/dev/null

echo ""
echo "3️⃣ Mongo Models usage:"
grep -R --line-number "new mongoose.Schema" . 2>/dev/null
grep -R --line-number "model(" . 2>/dev/null

echo ""
echo "4️⃣ Mongo CRUD operations:"
grep -R --line-number ".find(" . 2>/dev/null
grep -R --line-number ".findOne(" . 2>/dev/null
grep -R --line-number ".save(" . 2>/dev/null
grep -R --line-number ".update" . 2>/dev/null
grep -R --line-number ".delete" . 2>/dev/null

echo ""
echo "==============================="
echo "🔴 POSTGRESQL USAGE"
echo "==============================="

echo ""
echo "1️⃣ pg package usage:"
grep -R --line-number "require('pg')" . 2>/dev/null
grep -R --line-number 'from "pg"' . 2>/dev/null

echo ""
echo "2️⃣ pgClient usage:"
grep -R --line-number "pgClient" . 2>/dev/null
grep -R --line-number "database/pg" . 2>/dev/null

echo ""
echo "3️⃣ Raw SQL queries:"
grep -R --line-number "SELECT " . 2>/dev/null
grep -R --line-number "INSERT INTO" . 2>/dev/null
grep -R --line-number "UPDATE " . 2>/dev/null
grep -R --line-number "DELETE FROM" . 2>/dev/null

echo ""
echo "4️⃣ PostgreSQL ENV variables:"
grep -R --line-number "PG_HOST" . 2>/dev/null
grep -R --line-number "PG_" .env 2>/dev/null

echo ""
echo "======================================"
echo "✅ AUDIT COMPLETE"
echo "======================================"

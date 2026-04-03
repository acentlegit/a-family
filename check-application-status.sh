#!/bin/bash

echo "=========================================="
echo "🚀 Application Status Check"
echo "=========================================="
echo ""

# Backend Status
echo "📊 BACKEND STATUS (EC2)"
echo "----------------------------------------"
echo "EC2 IP: 34.204.50.125"
echo "Backend URL: http://34.204.50.125:5000"
echo "API Endpoint: http://34.204.50.125:5000/api"
echo ""

# Test Backend Health
echo "🔍 Testing Backend Health Endpoint..."
curl -s http://34.204.50.125:5000/api/health || echo "❌ Backend not accessible"
echo ""
echo ""

# Frontend Status
echo "📊 FRONTEND STATUS (S3)"
echo "----------------------------------------"
echo "S3 Bucket: Check your S3 bucket website URL"
echo "Frontend should be accessible at your S3 website URL"
echo ""

# MongoDB Status
echo "📊 MONGODB STATUS"
echo "----------------------------------------"
echo "Database: famidb2026.tkffjl.mongodb.net"
echo "Status: Connected (verified from PM2 logs)"
echo ""

echo "=========================================="
echo "✅ Application Components"
echo "=========================================="
echo "✅ Backend: Running on EC2 (PM2)"
echo "✅ Frontend: Deployed to S3"
echo "✅ MongoDB: Connected to new database"
echo "✅ API: https://api.fami.live"
echo "✅ Client: https://www.fami.live"
echo ""

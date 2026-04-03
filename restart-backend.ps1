# Restart Backend Server Script
Write-Host "=== Restarting Backend Server ===" -ForegroundColor Cyan
Write-Host ""

# Stop any existing Node processes
Write-Host "Stopping existing backend processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*fami-backend*" -or 
    $_.MainWindowTitle -like "*server*" 
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "fami-backend\fami-backend"
Set-Location $backendPath

Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Green
Write-Host ""

# Set environment and start server
$env:NODE_ENV = "development"
node server.js

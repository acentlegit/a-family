# Quick script to restart the backend server
Write-Host "🔄 Restarting Backend Server..." -ForegroundColor Yellow

# Find and kill the existing Node process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Write-Host "Stopping existing server (PID: $process)..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start the server
Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location $PSScriptRoot
npm start

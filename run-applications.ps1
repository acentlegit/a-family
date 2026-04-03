# Run Both Applications Script
Write-Host "=== Starting Fami Application ===" -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\MY APPLICATIONS\familyy\fami-backend\fami-backend"
    $env:NODE_ENV = "development"
    node server.js
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Application..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\MY APPLICATIONS\familyy\frontend\frontend"
    npm start
}

# Wait a moment for frontend to start
Start-Sleep -Seconds 5

# Show output from both
Write-Host ""
Write-Host "=== Backend Output ===" -ForegroundColor Green
Receive-Job -Job $backendJob -Keep | Select-Object -First 20

Write-Host ""
Write-Host "=== Frontend Output ===" -ForegroundColor Green
Receive-Job -Job $frontendJob -Keep | Select-Object -First 20

Write-Host ""
Write-Host "=== Application Status ===" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both applications" -ForegroundColor Yellow

# Keep jobs running and show output
try {
    while ($true) {
        Start-Sleep -Seconds 2
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        
        if ($backendOutput) {
            Write-Host "[BACKEND] $backendOutput" -ForegroundColor Cyan
        }
        if ($frontendOutput) {
            Write-Host "[FRONTEND] $frontendOutput" -ForegroundColor Magenta
        }
    }
} finally {
    Write-Host "Stopping applications..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
}

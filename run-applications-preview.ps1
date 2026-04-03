# Run Both Applications - Preview Mode (starts briefly, captures logs, then stops)

Write-Host "=== Fami Application (Preview) ===" -ForegroundColor Cyan

function Start-BackendJob {
	Write-Host "Starting Backend Server..." -ForegroundColor Yellow
	$scriptBlock = {
		Set-Location "C:\MY APPLICATIONS\familyy\fami-backend\fami-backend"
		$env:NODE_ENV = "development"
		node server.js
	}
	Start-Job -ScriptBlock $scriptBlock
}

function Start-FrontendJob {
	Write-Host "Starting Frontend Application..." -ForegroundColor Yellow
	$scriptBlock = {
		Set-Location "C:\MY APPLICATIONS\familyy\frontend\frontend"
		npm start
	}
	Start-Job -ScriptBlock $scriptBlock
}

$backendJob = $null
$frontendJob = $null

try {
	$backendJob = Start-BackendJob
	Start-Sleep -Seconds 3
	$frontendJob = Start-FrontendJob

	Write-Host ""
	Write-Host "Waiting for services to emit logs..." -ForegroundColor DarkYellow
	Start-Sleep -Seconds 12

	Write-Host ""
	Write-Host "=== Backend Output (first 60 lines) ===" -ForegroundColor Green
	if ($backendJob) {
		Receive-Job -Job $backendJob -Keep | Select-Object -First 60
	} else {
		Write-Host "Backend job not started." -ForegroundColor Red
	}

	Write-Host ""
	Write-Host "=== Frontend Output (first 60 lines) ===" -ForegroundColor Green
	if ($frontendJob) {
		Receive-Job -Job $frontendJob -Keep | Select-Object -First 60
	} else {
		Write-Host "Frontend job not started." -ForegroundColor Red
	}

	Write-Host ""
	Write-Host "=== Expected Local URLs ===" -ForegroundColor Cyan
	Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
	Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
}
finally {
	Write-Host ""
	Write-Host "Stopping preview jobs..." -ForegroundColor Yellow
	if ($backendJob) {
		Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
		Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
	}
	if ($frontendJob) {
		Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
		Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue
	}
	Write-Host "Preview complete." -ForegroundColor Cyan
}


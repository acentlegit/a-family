# PostgreSQL Setup and Check Script for Family Portal
# This script helps set up and verify PostgreSQL for the migration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Setup & Verification Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if PostgreSQL is installed
Write-Host "Step 1: Checking PostgreSQL installation..." -ForegroundColor Yellow
$postgresServices = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue

if ($postgresServices) {
    Write-Host "✅ PostgreSQL service found!" -ForegroundColor Green
    $postgresServices | ForEach-Object {
        Write-Host "   Service: $($_.Name) - Status: $($_.Status)" -ForegroundColor Gray
    }
    
    # Check if any service is running
    $runningService = $postgresServices | Where-Object { $_.Status -eq 'Running' }
    if ($runningService) {
        Write-Host "✅ PostgreSQL is running!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PostgreSQL is installed but not running" -ForegroundColor Yellow
        Write-Host "   Attempting to start PostgreSQL..." -ForegroundColor Yellow
        
        $serviceToStart = $postgresServices[0]
        try {
            Start-Service -Name $serviceToStart.Name
            Start-Sleep -Seconds 3
            $service = Get-Service -Name $serviceToStart.Name
            if ($service.Status -eq 'Running') {
                Write-Host "✅ PostgreSQL started successfully!" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to start PostgreSQL. Please start it manually." -ForegroundColor Red
                Write-Host "   Try: Start-Service -Name '$($serviceToStart.Name)'" -ForegroundColor Gray
            }
        } catch {
            Write-Host "❌ Error starting PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   You may need to run this script as Administrator" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ PostgreSQL service not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation Options:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "2. Use Docker (see docker-compose.yml)" -ForegroundColor Cyan
    Write-Host "3. Use remote PostgreSQL (AWS RDS, etc.)" -ForegroundColor Cyan
    Write-Host ""
}

# Step 2: Check if psql command is available
Write-Host ""
Write-Host "Step 2: Checking psql command..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "✅ psql command found at: $($psqlPath.Source)" -ForegroundColor Green
    $psqlVersion = & psql --version 2>&1
    Write-Host "   Version: $psqlVersion" -ForegroundColor Gray
} else {
    Write-Host "⚠️  psql command not found in PATH" -ForegroundColor Yellow
    Write-Host "   PostgreSQL may be installed but not in PATH" -ForegroundColor Gray
    Write-Host "   Common locations:" -ForegroundColor Gray
    Write-Host "   - C:\Program Files\PostgreSQL\*\bin\psql.exe" -ForegroundColor Gray
}

# Step 3: Check if database exists
Write-Host ""
Write-Host "Step 3: Checking database connection..." -ForegroundColor Yellow

# Try to read .env file for database credentials
$envPath = Join-Path $PSScriptRoot "..\.env"
$pgHost = "localhost"
$pgPort = "5432"
$pgDatabase = "family_portal"
$pgUser = "postgres"
$pgPassword = ""

if (Test-Path $envPath) {
    Write-Host "✅ .env file found, reading configuration..." -ForegroundColor Green
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^PG_HOST=(.+)$") { $pgHost = $matches[1] }
        if ($line -match "^PG_PORT=(.+)$") { $pgPort = $matches[1] }
        if ($line -match "^PG_DATABASE=(.+)$") { $pgDatabase = $matches[1] }
        if ($line -match "^PG_USER=(.+)$") { $pgUser = $matches[1] }
        if ($line -match "^PG_PASSWORD=(.+)$") { $pgPassword = $matches[1] }
    }
    Write-Host "   Host: $pgHost" -ForegroundColor Gray
    Write-Host "   Port: $pgPort" -ForegroundColor Gray
    Write-Host "   Database: $pgDatabase" -ForegroundColor Gray
    Write-Host "   User: $pgUser" -ForegroundColor Gray
} else {
    Write-Host "⚠️  .env file not found at: $envPath" -ForegroundColor Yellow
    Write-Host "   Using default values" -ForegroundColor Gray
}

# Step 4: Test database connection
if ($psqlPath) {
    Write-Host ""
    Write-Host "Step 4: Testing database connection..." -ForegroundColor Yellow
    
    $env:PGPASSWORD = $pgPassword
    $testQuery = "SELECT version();"
    
    try {
        $result = & psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c $testQuery 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful!" -ForegroundColor Green
            
            # Check if family_portal database exists
            $dbCheck = & psql -h $pgHost -p $pgPort -U $pgUser -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$pgDatabase';" 2>&1
            if ($dbCheck -match "1") {
                Write-Host "✅ Database '$pgDatabase' already exists!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Database '$pgDatabase' does not exist" -ForegroundColor Yellow
                Write-Host "   Creating database..." -ForegroundColor Yellow
                $createDb = & psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "CREATE DATABASE $pgDatabase;" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Database created successfully!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Failed to create database: $createDb" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ Database connection failed" -ForegroundColor Red
            Write-Host "   Error: $result" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error testing connection: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        $env:PGPASSWORD = ""
    }
} else {
    Write-Host "⚠️  Skipping connection test (psql not found)" -ForegroundColor Yellow
}

# Step 5: Check if schema file exists
Write-Host ""
Write-Host "Step 5: Checking schema file..." -ForegroundColor Yellow
$schemaPath = Join-Path $PSScriptRoot "..\database\schema.sql"
if (Test-Path $schemaPath) {
    Write-Host "✅ Schema file found: $schemaPath" -ForegroundColor Green
    Write-Host "   To apply schema, run:" -ForegroundColor Gray
    Write-Host "   psql -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -f $schemaPath" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Schema file not found at: $schemaPath" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allGood = $true

if (-not $postgresServices) {
    Write-Host "❌ PostgreSQL not installed" -ForegroundColor Red
    $allGood = $false
} elseif (-not ($postgresServices | Where-Object { $_.Status -eq 'Running' })) {
    Write-Host "⚠️  PostgreSQL not running" -ForegroundColor Yellow
    $allGood = $false
} else {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
}

if (-not $psqlPath) {
    Write-Host "⚠️  psql command not found" -ForegroundColor Yellow
    $allGood = $false
} else {
    Write-Host "✅ psql command available" -ForegroundColor Green
}

if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  .env file not configured" -ForegroundColor Yellow
    $allGood = $false
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host ""
if ($allGood) {
    Write-Host "✅ All checks passed! Ready to run migration." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Run migration script" -ForegroundColor Cyan
    Write-Host "   node scripts/migrateMongoToPostgres.js" -ForegroundColor White
} else {
    Write-Host "⚠️  Some issues found. Please fix them before running migration." -ForegroundColor Yellow
}

Write-Host ""

# Environment Configuration Script for Family Portal
# This script helps configure the .env file with PostgreSQL settings

param(
    [string]$PgHost = "localhost",
    [int]$Port = 5432,
    [string]$Database = "family_portal",
    [string]$User = "postgres",
    [string]$Password = "",
    [switch]$UseDocker = $false,
    [switch]$UseRemote = $false,
    [string]$RemoteHost = "",
    [string]$RemotePassword = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment Configuration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envPath = Join-Path $PSScriptRoot "..\.env"

# If using Docker, set default values
if ($UseDocker) {
    Write-Host "🐳 Configuring for Docker PostgreSQL..." -ForegroundColor Cyan
    $PgHost = "localhost"
    $Port = 5432
    $Database = "family_portal"
    $User = "postgres"
    $Password = "postgres"
} elseif ($UseRemote) {
    if (-not $RemoteHost) {
        Write-Host "❌ Remote host required when using -UseRemote" -ForegroundColor Red
        exit 1
    }
    Write-Host "☁️  Configuring for remote PostgreSQL..." -ForegroundColor Cyan
    $PgHost = $RemoteHost
    if ($RemotePassword) {
        $Password = $RemotePassword
    } else {
        $Password = Read-Host "Enter PostgreSQL password" -AsSecureString
        $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
        )
    }
}

# If password not provided, prompt for it
if (-not $Password) {
    $securePassword = Read-Host "Enter PostgreSQL password for user '$User'" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    )
}

# Read existing .env file if it exists
$envContent = @{}
if (Test-Path $envPath) {
    Write-Host "📄 Reading existing .env file..." -ForegroundColor Yellow
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envContent[$key] = $value
        }
    }
} else {
    Write-Host "📄 Creating new .env file..." -ForegroundColor Yellow
}

# Update PostgreSQL settings
$envContent["PG_HOST"] = $PgHost
$envContent["PG_PORT"] = $Port.ToString()
$envContent["PG_DATABASE"] = $Database
$envContent["PG_USER"] = $User
$envContent["PG_PASSWORD"] = $Password

# Ensure other required variables exist (with defaults if not present)
if (-not $envContent.ContainsKey("AWS_REGION")) {
    $envContent["AWS_REGION"] = "us-east-1"
}
if (-not $envContent.ContainsKey("AWS_S3_BUCKET")) {
    $envContent["AWS_S3_BUCKET"] = "family-portal-sites"
}
if (-not $envContent.ContainsKey("JWT_SECRET")) {
    $envContent["JWT_SECRET"] = "your-secret-key-change-in-production"
}
if (-not $envContent.ContainsKey("PORT")) {
    $envContent["PORT"] = "5000"
}
if (-not $envContent.ContainsKey("NODE_ENV")) {
    $envContent["NODE_ENV"] = "development"
}
if (-not $envContent.ContainsKey("FROM_EMAIL")) {
    $envContent["FROM_EMAIL"] = "noreply@yourdomain.com"
}
if (-not $envContent.ContainsKey("EMAIL_PROVIDER")) {
    $envContent["EMAIL_PROVIDER"] = "sendgrid"
}

# Write .env file
Write-Host ""
Write-Host "💾 Writing .env file..." -ForegroundColor Yellow

$output = @()
$output += "# PostgreSQL Configuration"
$output += "PG_HOST=$($envContent['PG_HOST'])"
$output += "PG_PORT=$($envContent['PG_PORT'])"
$output += "PG_DATABASE=$($envContent['PG_DATABASE'])"
$output += "PG_USER=$($envContent['PG_USER'])"
$output += "PG_PASSWORD=$($envContent['PG_PASSWORD'])"
$output += ""
$output += "# AWS Configuration"
$output += "AWS_REGION=$($envContent['AWS_REGION'])"
$output += "AWS_S3_BUCKET=$($envContent['AWS_S3_BUCKET'])"
if ($envContent.ContainsKey("AWS_ACCESS_KEY_ID")) {
    $output += "AWS_ACCESS_KEY_ID=$($envContent['AWS_ACCESS_KEY_ID'])"
}
if ($envContent.ContainsKey("AWS_SECRET_ACCESS_KEY")) {
    $output += "AWS_SECRET_ACCESS_KEY=$($envContent['AWS_SECRET_ACCESS_KEY'])"
}
$output += ""
$output += "# Server Configuration"
$output += "PORT=$($envContent['PORT'])"
$output += "NODE_ENV=$($envContent['NODE_ENV'])"
$output += ""
$output += "# JWT Configuration"
$output += "JWT_SECRET=$($envContent['JWT_SECRET'])"
$output += ""
$output += "# Email Configuration"
$output += "EMAIL_PROVIDER=$($envContent['EMAIL_PROVIDER'])"
$output += "FROM_EMAIL=$($envContent['FROM_EMAIL'])"
if ($envContent.ContainsKey("SENDGRID_API_KEY")) {
    $output += "SENDGRID_API_KEY=$($envContent['SENDGRID_API_KEY'])"
}
if ($envContent.ContainsKey("SES_FROM_EMAIL")) {
    $output += "SES_FROM_EMAIL=$($envContent['SES_FROM_EMAIL'])"
}
$output += ""
$output += "# MongoDB (for migration)"
if ($envContent.ContainsKey("MONGODB_URI")) {
    $output += "MONGODB_URI=$($envContent['MONGODB_URI'])"
} else {
    $output += "# MONGODB_URI=mongodb://localhost:27017/fami"
}

$output | Out-File -FilePath $envPath -Encoding utf8

Write-Host "✅ .env file configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  PostgreSQL Host: $PgHost" -ForegroundColor Gray
Write-Host "  PostgreSQL Port: $Port" -ForegroundColor Gray
Write-Host "  Database: $Database" -ForegroundColor Gray
Write-Host "  User: $User" -ForegroundColor Gray
Write-Host "  Password: ********" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($UseDocker) {
    Write-Host "  1. Start Docker: docker-compose -f docker-compose.postgres.yml up -d" -ForegroundColor Cyan
    Write-Host "  2. Wait for PostgreSQL to be ready (about 10 seconds)" -ForegroundColor Cyan
    Write-Host "  3. Run migration: node scripts/migrateMongoToPostgres.js" -ForegroundColor Cyan
} else {
    Write-Host "  1. Ensure PostgreSQL is running" -ForegroundColor Cyan
    Write-Host "  2. Create database if needed: createdb $Database" -ForegroundColor Cyan
    Write-Host "  3. Run migration: node scripts/migrateMongoToPostgres.js" -ForegroundColor Cyan
}
Write-Host ""

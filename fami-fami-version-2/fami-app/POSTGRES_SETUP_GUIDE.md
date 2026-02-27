# PostgreSQL Setup Guide for Family Portal

This guide provides multiple options for setting up PostgreSQL for the Family Portal migration.

## Option 1: Docker Setup (Recommended - Easiest)

### Prerequisites
- Docker Desktop installed on Windows
- Docker Compose (included with Docker Desktop)

### Steps

1. **Configure environment for Docker:**
   ```powershell
   cd backend
   .\scripts\configureEnv.ps1 -UseDocker
   ```

2. **Start PostgreSQL container:**
   ```powershell
   cd ..
   docker-compose -f docker-compose.postgres.yml up -d
   ```

3. **Verify it's running:**
   ```powershell
   docker ps
   ```
   You should see `family-portal-postgres` container running.

4. **Check logs (optional):**
   ```powershell
   docker-compose -f docker-compose.postgres.yml logs
   ```

5. **Run migration:**
   ```powershell
   cd backend
   node scripts/migrateMongoToPostgres.js
   ```

### Stop PostgreSQL (when done):
```powershell
docker-compose -f docker-compose.postgres.yml down
```

### Remove all data (fresh start):
```powershell
docker-compose -f docker-compose.postgres.yml down -v
```

---

## Option 2: Local PostgreSQL Installation

### Prerequisites
- PostgreSQL installed on Windows
- Download from: https://www.postgresql.org/download/windows/

### Steps

1. **Run setup script to check installation:**
   ```powershell
   cd backend
   .\scripts\setupPostgres.ps1
   ```

2. **If PostgreSQL is not running, start it:**
   ```powershell
   # Find your PostgreSQL service name first
   Get-Service -Name "*postgres*"
   
   # Start it (replace XX with your version)
   Start-Service postgresql-x64-15
   ```

3. **Create the database:**
   ```powershell
   createdb family_portal
   ```
   Or using psql:
   ```powershell
   psql -U postgres -c "CREATE DATABASE family_portal;"
   ```

4. **Configure environment:**
   ```powershell
   cd backend
   .\scripts\configureEnv.ps1 -Host localhost -Port 5432 -Database family_portal -User postgres
   ```
   (You'll be prompted for password)

5. **Apply schema:**
   ```powershell
   psql -U postgres -d family_portal -f database/schema.sql
   ```

6. **Run migration:**
   ```powershell
   node scripts/migrateMongoToPostgres.js
   ```

---

## Option 3: Remote PostgreSQL (AWS RDS, Heroku, etc.)

### Steps

1. **Get your remote PostgreSQL credentials:**
   - Host: Your RDS endpoint or Heroku host
   - Port: Usually 5432
   - Database: Your database name
   - User: Your database user
   - Password: Your database password

2. **Configure environment:**
   ```powershell
   cd backend
   .\scripts\configureEnv.ps1 -UseRemote -RemoteHost "your-rds-endpoint.amazonaws.com" -RemotePassword "your-password"
   ```

3. **Create database (if needed):**
   Connect to your remote PostgreSQL and create the database:
   ```sql
   CREATE DATABASE family_portal;
   ```

4. **Apply schema:**
   ```powershell
   psql -h your-rds-endpoint.amazonaws.com -U your-user -d family_portal -f database/schema.sql
   ```

5. **Run migration:**
   ```powershell
   node scripts/migrateMongoToPostgres.js
   ```

---

## Quick Setup Scripts

### All-in-One Setup (Docker)
```powershell
# From project root
cd backend
.\scripts\configureEnv.ps1 -UseDocker
cd ..
docker-compose -f docker-compose.postgres.yml up -d
Start-Sleep -Seconds 10
cd backend
node scripts/migrateMongoToPostgres.js
```

### Verify Setup
```powershell
cd backend
.\scripts\setupPostgres.ps1
```

---

## Troubleshooting

### Docker Issues

**Port 5432 already in use:**
```powershell
# Find what's using the port
netstat -ano | findstr :5432

# Stop the service using it, or change port in docker-compose.postgres.yml
```

**Container won't start:**
```powershell
# Check logs
docker-compose -f docker-compose.postgres.yml logs

# Remove and recreate
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```

### Local PostgreSQL Issues

**Service won't start:**
- Check if PostgreSQL is installed: `Get-Service -Name "*postgres*"`
- Try starting manually from Services (services.msc)
- Check PostgreSQL logs in: `C:\Program Files\PostgreSQL\*\data\log\`

**Connection refused:**
- Verify PostgreSQL is running: `Get-Service -Name "*postgres*"`
- Check firewall settings
- Verify port 5432 is not blocked

**Authentication failed:**
- Reset PostgreSQL password:
  ```powershell
  # Edit pg_hba.conf to allow local connections
  # Then reset password in psql
  psql -U postgres
  ALTER USER postgres WITH PASSWORD 'newpassword';
  ```

---

## Environment Variables

After running `configureEnv.ps1`, your `.env` file will have:

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=family_portal
PG_USER=postgres
PG_PASSWORD=your_password
```

---

## Next Steps After Setup

1. ✅ PostgreSQL is running
2. ✅ Database `family_portal` exists
3. ✅ Schema is applied
4. ✅ Environment is configured
5. 🚀 Run migration: `node scripts/migrateMongoToPostgres.js`

---

## Need Help?

- Check setup script output: `.\scripts\setupPostgres.ps1`
- Verify connection: `psql -h localhost -U postgres -d family_portal`
- Check migration logs in console output

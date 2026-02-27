# PostgreSQL Setup Instructions

## Overview
The application now uses **PostgreSQL only** for website admin features. All MongoDB dependencies have been removed.

## Option 1: Using Docker (Recommended)

If you have Docker Desktop installed:

```powershell
cd "C:\MY APPLICATIONS\fami-fami-version-2\fami-fami-version-2\fami-app"
docker-compose -f docker-compose.postgres.yml up -d
```

This will:
- Start PostgreSQL on port 5432
- Create the database `family_portal`
- Run the schema automatically

## Option 2: Install PostgreSQL Locally

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download and install PostgreSQL 15 or later

2. **During Installation:**
   - Set password for `postgres` user (remember this!)
   - Default port: 5432
   - Default database: `postgres`

3. **Create Database:**
   ```sql
   CREATE DATABASE family_portal;
   ```

4. **Run Schema:**
   ```powershell
   psql -U postgres -d family_portal -f backend\database\schema.sql
   ```

5. **Update .env file** (create if it doesn't exist in `backend/`):
   ```env
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=family_portal
   PG_USER=postgres
   PG_PASSWORD=your_postgres_password
   ```

## Option 3: Use PostgreSQL Service (if already installed)

If PostgreSQL is already installed as a Windows service:

1. **Start the service:**
   ```powershell
   Start-Service postgresql-x64-15
   # Or check service name:
   Get-Service -Name postgresql*
   ```

2. **Create database and run schema:**
   ```powershell
   psql -U postgres -c "CREATE DATABASE family_portal;"
   psql -U postgres -d family_portal -f backend\database\schema.sql
   ```

## Verify PostgreSQL is Running

```powershell
# Check if PostgreSQL is listening on port 5432
netstat -ano | findstr :5432

# Or test connection
psql -U postgres -c "SELECT version();"
```

## Troubleshooting

### Connection Refused Error
- Ensure PostgreSQL service is running
- Check firewall settings
- Verify port 5432 is not blocked

### Authentication Failed
- Check username and password in `.env` file
- Verify PostgreSQL user has proper permissions

### Database Not Found
- Create the database: `CREATE DATABASE family_portal;`
- Run the schema: `psql -U postgres -d family_portal -f backend\database\schema.sql`

## After Setup

Once PostgreSQL is running, restart your backend server:

```powershell
cd "C:\MY APPLICATIONS\fami-fami-version-2\fami-fami-version-2\fami-app\backend"
npm start
```

The website admin features (logo upload, config, pages) will now work with PostgreSQL!

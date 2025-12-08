# PostgreSQL Permission Fix - Code 42501

## Problem
```
ERROR: must be owner of table evidence_vectors (Code 42501)
```

This error occurs when your current PostgreSQL user doesn't own the `evidence_vectors` table. This commonly happens after migrations run under a different user context.

---

## Solution: Change Table Ownership

### Method 1: Direct (Single Table)

```sql
-- Connect to your database
psql -U postgres -d legal_ai_db

-- Change ownership of the specific table
ALTER TABLE evidence_vectors OWNER TO postgres;

-- Verify it worked
\dt+ evidence_vectors;
```

### Method 2: Bulk (All Tables)

```sql
-- Connect to your database
psql -U postgres -d legal_ai_db

-- Reassign all tables owned by any other user to postgres
REASSIGN OWNED BY old_owner TO postgres;

-- Or reassign a specific user
-- REASSIGN OWNED BY migration_user TO postgres;
```

### Method 3: With Force (Drop and Recreate User)

```sql
-- If the original owner user no longer exists:

-- 1. Drop the orphaned user's role
DROP USER IF EXISTS migration_user CASCADE;

-- 2. Reassign ownership
REASSIGN OWNED BY migration_user TO postgres;

-- 3. Verify tables are now owned by postgres
\dt+
```

---

## Quick PowerShell Commands

### Check Current State
```powershell
# Check table owners in PostgreSQL
psql -U postgres -d legal_ai_db -c "\dt+ evidence_vectors"
```

### Run Fix from PowerShell
```powershell
# One-liner to fix all Phase 78 tables
psql -U postgres -d legal_ai_db -c "ALTER TABLE error_events OWNER TO postgres; ALTER TABLE error_suggestions OWNER TO postgres; ALTER TABLE route_health OWNER TO postgres; ALTER TABLE evidence_vectors OWNER TO postgres;"

# Or with a script file:
psql -U postgres -d legal_ai_db -f fix-ownership.sql
```

---

## Create Fix Script

### SQL Script (save as `fix-ownership.sql`)
```sql
-- Phase 78 Error Brain Tables
ALTER TABLE error_events OWNER TO postgres;
ALTER TABLE error_suggestions OWNER TO postgres;
ALTER TABLE route_health OWNER TO postgres;
ALTER TABLE evidence_vectors OWNER TO postgres;

-- Phase 90 Safety Shield Tables (if they exist)
ALTER TABLE error_patch_log OWNER TO postgres;
ALTER TABLE patch_audit_trail OWNER TO postgres;

-- Verify all fixed
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'error%' OR tablename LIKE 'route%' OR tablename LIKE 'patch%' OR tablename LIKE 'evidence%');
```

### PowerShell Script (save as `fix-postgres-ownership.ps1`)
```powershell
# Fix PostgreSQL table ownership for Phase 78 + 90

param(
    [string]$User = "postgres",
    [string]$Password = "password",
    [string]$Database = "legal_ai_db",
    [string]$Host = "localhost"
)

Write-Host "🔧 Fixing PostgreSQL table ownership..." -ForegroundColor Yellow
Write-Host "Database: $Database @ $Host" -ForegroundColor Cyan
Write-Host ""

# Create SQL command
$sql = @"
ALTER TABLE error_events OWNER TO $User;
ALTER TABLE error_suggestions OWNER TO $User;
ALTER TABLE route_health OWNER TO $User;
ALTER TABLE evidence_vectors OWNER TO $User;

-- Verify
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'error%' OR tablename LIKE 'route%' OR tablename LIKE 'patch%' OR tablename LIKE 'evidence%');
"@

# Execute
$env:PGPASSWORD = $Password
psql -U $User -h $Host -d $Database -c $sql
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "✅ PostgreSQL ownership fix complete!" -ForegroundColor Green
```

---

## Verify Fix

### Check Ownership
```sql
\dt+ evidence_vectors

-- Output should show:
--          List of relations
-- Schema |       Name       | Type  |  Owner
-- --------+------------------+-------+----------
-- public | evidence_vectors | table | postgres
```

### Check All Phase 78 Tables
```sql
SELECT tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('error_events', 'error_suggestions', 'route_health', 'evidence_vectors')
ORDER BY tablename;
```

---

## Common Issues

### Issue: "user does not exist"
```sql
-- The original owner user has been deleted
-- Solution: Use REASSIGN OWNED BY on any remaining tables
REASSIGN OWNED BY deleted_user TO postgres;
```

### Issue: "permission denied" on REASSIGN
```sql
-- You don't have superuser privileges
-- Solution: Connect as a superuser (usually 'postgres')
-- Command: psql -U postgres -d legal_ai_db
```

### Issue: Still getting error after fix
```sql
-- Tables might be in a different schema
-- Check all schemas:
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE tablename = 'evidence_vectors'
ORDER BY schemaname;

-- If found in different schema, fix it:
ALTER TABLE schema_name.evidence_vectors OWNER TO postgres;
```

---

## Full Database Reset (Nuclear Option)

If you need to start completely fresh:

```powershell
# Drop and recreate database (WARNING: DELETES ALL DATA)
psql -U postgres -c "DROP DATABASE legal_ai_db;"
psql -U postgres -c "CREATE DATABASE legal_ai_db OWNER postgres;"

# Then re-run migrations:
npm run migrate:latest
npm run phase78:insert:dry-run
```

---

## Automated Fix Command

Run this one-liner to fix everything:

```powershell
# PowerShell
$env:PGPASSWORD = "password"; psql -U postgres -h localhost -d legal_ai_db -c "ALTER TABLE error_events OWNER TO postgres; ALTER TABLE error_suggestions OWNER TO postgres; ALTER TABLE route_health OWNER TO postgres; ALTER TABLE evidence_vectors OWNER TO postgres;" ; $env:PGPASSWORD = ""
```

Or with bash:

```bash
# Bash/WSL
PGPASSWORD=password psql -U postgres -h localhost -d legal_ai_db \
  -c "ALTER TABLE error_events OWNER TO postgres; \
      ALTER TABLE error_suggestions OWNER TO postgres; \
      ALTER TABLE route_health OWNER TO postgres; \
      ALTER TABLE evidence_vectors OWNER TO postgres;"
```

---

## After Fix: Verify System

Once ownership is fixed, verify the full system:

```powershell
# 1. Check database responds
psql -U postgres -d legal_ai_db -c "SELECT COUNT(*) FROM error_events;"

# 2. Start dev server
npm run dev

# 3. Test Error Brain modal
# Navigate to: http://localhost:5173/all-routes
# Click 🧠 button on a broken route

# 4. Check database access from Node
npm run phase78:check-results
```

---

**Status**: Ready to execute. Estimated time: 2 minutes.

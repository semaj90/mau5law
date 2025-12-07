-- ============================================================================
-- Phase 90: Migration Safety Check Script
-- ============================================================================
-- Purpose: Verify no data was lost, check for duplicates, audit new columns
-- Run BEFORE and AFTER migration to compare snapshots
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Row Count Snapshot (run before/after to compare)
-- ----------------------------------------------------------------------------
\echo '=== TABLE ROW COUNTS ==='
SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ----------------------------------------------------------------------------
-- 2. Check for Duplicate Emails (MUST be 0 before adding UNIQUE constraint)
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== DUPLICATE EMAIL CHECK ==='
SELECT
    email,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) AS user_ids
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this returns rows, you MUST fix them before adding UNIQUE(email)
-- Example fix:
-- DELETE FROM users WHERE id IN (SELECT id FROM users WHERE email = 'duplicate@example.com' ORDER BY created_at DESC OFFSET 1);

-- ----------------------------------------------------------------------------
-- 3. List All Columns in Users Table (check for new additions)
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== USERS TABLE COLUMNS ==='
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ----------------------------------------------------------------------------
-- 4. Check Constraints on Users Table
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== USERS TABLE CONSTRAINTS ==='
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- Constraint types:
-- p = PRIMARY KEY
-- u = UNIQUE
-- f = FOREIGN KEY
-- c = CHECK

-- ----------------------------------------------------------------------------
-- 5. Check for NULL emails (should be 0 if email is required)
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== NULL EMAIL CHECK ==='
SELECT COUNT(*) AS null_email_count
FROM users
WHERE email IS NULL;

-- ----------------------------------------------------------------------------
-- 6. Recent User Activity (sanity check)
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== RECENT USER ACTIVITY ==='
SELECT
    COUNT(*) AS total_users,
    COUNT(DISTINCT email) AS unique_emails,
    MAX(created_at) AS most_recent_user,
    MIN(created_at) AS oldest_user
FROM users;

-- ----------------------------------------------------------------------------
-- 7. Check All Tables for New Columns Added in Last Migration
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== ALL NEW COLUMNS (if any) ==='
-- Note: This shows all columns; compare before/after snapshots manually
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  )
ORDER BY table_name, ordinal_position;

-- ----------------------------------------------------------------------------
-- 8. Migration History (if using Drizzle migrations table)
-- ----------------------------------------------------------------------------
\echo ''
\echo '=== MIGRATION HISTORY ==='
SELECT * FROM __drizzle_migrations
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
--
-- BEFORE migration:
--   psql -U legal_admin -d legal_ai_db -p 5434 -f phase90-migration-check.sql > before-migration.txt
--
-- RUN migration:
--   npm run db:migrate
--
-- AFTER migration:
--   psql -U legal_admin -d legal_ai_db -p 5434 -f phase90-migration-check.sql > after-migration.txt
--
-- COMPARE:
--   diff before-migration.txt after-migration.txt
--
-- EXPECTED CHANGES:
--   - Row counts should be IDENTICAL (no data loss)
--   - New columns appear in "USERS TABLE COLUMNS" section
--   - New constraint appears in "USERS TABLE CONSTRAINTS" section
--   - Duplicate email count should be 0 (or migration fails)
--
-- ============================================================================

# Phase 78 - Database Setup & Troubleshooting Guide

## Quick Fix for PostgreSQL Permission Error

### Problem
```
Error: must be owner of table evidence_vectors
Code: 42501 (permission denied)
```

### Solution Path 1: Fix Existing Database Permissions (Recommended)

#### Step 1: Identify Current User
```bash
# Find out who owns the problematic table
psql -U postgres -d legal_ai_db -c "\dt evidence_vectors"

# Output will show:
# public | evidence_vectors | table | postgres (or whoever owns it)
```

#### Step 2: Grant Ownership to Your User
```bash
# If postgres owns it and you're using a different user (e.g., 'james'):
psql -U postgres -d legal_ai_db -c "ALTER TABLE evidence_vectors OWNER TO james;"

# Or grant comprehensive privileges:
psql -U postgres -d legal_ai_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO james;"
psql -U postgres -d legal_ai_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO james;"
```

#### Step 3: Test Migration
```bash
cd sveltekit-frontend
npm run db:migrate
```

### Solution Path 2: Fresh Database Setup (Alternative)

If you don't mind recreating the database:

```bash
# 1. Drop the old database
psql -U postgres -c "DROP DATABASE IF EXISTS legal_ai_db;"

# 2. Create new database
psql -U postgres -c "CREATE DATABASE legal_ai_db WITH OWNER [your_user];"

# 3. Update .env
# Set DATABASE_URL=postgresql://[your_user]:[password]@localhost:5432/legal_ai_db

# 4. Run fresh migration
npm run db:migrate
```

## Verifying Database Setup

### Check Connection
```bash
# From sveltekit-frontend directory
psql $DATABASE_URL -c "SELECT version();"
```

### Check Phase 78 Tables Exist
```bash
psql $DATABASE_URL -c "\dt route_health error_events error_suggestions"
```

### Expected Output
```
                List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | error_events      | table | [user]
 public | error_suggestions | table | [user]
 public | route_health      | table | [user]
```

### Check Table Structure
```bash
psql $DATABASE_URL -c "\d route_health"
psql $DATABASE_URL -c "\d error_events"
psql $DATABASE_URL -c "\d error_suggestions"
```

## Database Schema Reference

### route_health Table
```sql
CREATE TABLE route_health (
    id SERIAL PRIMARY KEY,
    routePath VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'flaky', 'broken')),
    totalErrors INTEGER DEFAULT 0,
    errorRate DECIMAL(5,2) DEFAULT 0,
    lastErrorAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### error_events Table
```sql
CREATE TABLE error_events (
    id SERIAL PRIMARY KEY,
    routePath VARCHAR(255) NOT NULL,
    errorCode VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('fatal', 'error', 'warn', 'info')),
    message TEXT NOT NULL,
    context JSONB,
    stackTrace TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (routePath) REFERENCES route_health(routePath)
);
```

### error_suggestions Table
```sql
CREATE TABLE error_suggestions (
    id SERIAL PRIMARY KEY,
    routePath VARCHAR(255) NOT NULL,
    errorCode VARCHAR(50) NOT NULL,
    suggestionText TEXT NOT NULL,
    patchCode TEXT,
    riskLevel VARCHAR(20) NOT NULL CHECK (riskLevel IN ('high', 'medium', 'low')),
    appliedAt TIMESTAMP WITH TIME ZONE,
    appliedBy VARCHAR(255),
    dismissedAt TIMESTAMP WITH TIME ZONE,
    dismissedBy VARCHAR(255),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (routePath) REFERENCES route_health(routePath)
);
```

## Running the Error Pipeline

### After Database is Ready

```bash
cd sveltekit-frontend

# Step 1: Collect errors from TypeScript logs
npm run phase78:collect-errors:verbose

# Check output at: logs/phase78-errors.json
cat logs/phase78-errors.json | head -20

# Step 2: Insert errors into database
npm run phase78:insert:verbose

# Step 3: Cluster similar errors
npm run phase78:cluster:verbose

# Step 4: Generate suggestions
npm run phase78:suggest:verbose

# Step 5: Verify results
npm run phase78:check-results
```

## Testing the UI

### Start Dev Server
```bash
npm run dev
# Visit http://localhost:5173
```

### Test Dashboard
1. Go to `/phase78/monitor`
2. Should see:
   - Summary cards with error counts
   - Severity distribution chart
   - Routes by health table
   - Top error codes list
   - Error velocity chart

### Test Route Details
1. Go to `/all-routes`
2. Find a route with errors (should show 🔴 broken or ⚠️ flaky badge)
3. Click the route
4. Should see detailed errors and suggestions

### Test Apply Suggestion
1. On a route detail page
2. Find a suggestion
3. Click "Apply Patch"
4. Watch server logs for confirmation
5. (Future: Phase 90 will actually apply the patch)

## Environment Variables

Required in `.env`:

```env
DATABASE_URL=postgresql://[user]:[password]@localhost:5432/legal_ai_db
```

Optional for advanced features:
```env
PHASE78_LOG_PATH=logs/tsc.log
PHASE78_VERBOSE=true
PHASE78_MAX_ERRORS=1000
PHASE78_CLUSTER_THRESHOLD=0.7
```

## Common Issues & Solutions

### Issue 1: Database Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost

# Or start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

### Issue 2: Permission Denied (Current Issue)
```
Error: must be owner of table evidence_vectors
```

**Solution**: Follow "Solution Path 1" above

### Issue 3: Table Already Exists
```
Error: relation "route_health" already exists
```

**Solution**:
```bash
# Safely drop and recreate
npm run db:drop  # if available
npm run db:push  # or use push with confirmation
```

### Issue 4: Missing Drizzle Config
```
Error: Could not find drizzle.config
```

**Solution**:
```bash
# Verify drizzle.config.ts exists in root
ls -la drizzle.config.ts

# Should be at: sveltekit-frontend/drizzle.config.ts
```

## Monitoring Database

### View Error Events
```bash
psql $DATABASE_URL -c "SELECT routePath, COUNT(*) as error_count FROM error_events GROUP BY routePath ORDER BY error_count DESC LIMIT 10;"
```

### View Route Health
```bash
psql $DATABASE_URL -c "SELECT routePath, status, totalErrors, lastErrorAt FROM route_health ORDER BY totalErrors DESC LIMIT 10;"
```

### View Suggestions
```bash
psql $DATABASE_URL -c "SELECT routePath, errorCode, riskLevel, appliedAt FROM error_suggestions WHERE appliedAt IS NOT NULL LIMIT 10;"
```

### Check Database Size
```bash
psql $DATABASE_URL -c "SELECT sum(pg_total_relation_size(schemaname||'.'||tablename))::text as total_size FROM pg_tables WHERE schemaname = 'public';"
```

## Performance Tips

### Add Indexes
```sql
-- For better query performance
CREATE INDEX idx_error_events_route ON error_events(routePath);
CREATE INDEX idx_error_events_created ON error_events(createdAt DESC);
CREATE INDEX idx_route_health_status ON route_health(status);
```

### Enable Auto-Vacuum
```sql
-- For automatic cleanup
ALTER TABLE error_events SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE error_suggestions SET (autovacuum_vacuum_scale_factor = 0.01);
```

## Backup Before Cleanup

```bash
# Backup current database
pg_dump legal_ai_db > backup-$(date +%Y%m%d).sql

# Restore if needed
psql legal_ai_db < backup-20251207.sql
```

## Integration with Phase 72

The `/all-routes` page automatically integrates:
- Phase 72 AST graph visualization
- Phase 78 health status badges
- When database is populated

```svelte
<!-- In +page.svelte -->
<script>
    // Phase 72: Load routes and graph
    const { graph, stats } = await data

    // Phase 78: Load health data
    const errorSummary = await fetch('/api/phase78/routes/...')
</script>
```

## Troubleshooting Checklist

- [ ] PostgreSQL is running and accessible
- [ ] DATABASE_URL is set correctly in .env
- [ ] User has ownership of all tables
- [ ] Migration runs without permission errors
- [ ] route_health table exists and has correct structure
- [ ] error_events table exists and has correct structure
- [ ] error_suggestions table exists and has correct structure
- [ ] npm scripts execute without errors
- [ ] Dashboard loads at /phase78/monitor
- [ ] Route details load at /phase78/routes/[path]
- [ ] Health badges appear on /all-routes

## Support Commands

```bash
# Reset everything (WARNING: DESTRUCTIVE)
npm run db:drop && npm run db:migrate

# Verify current state
npm run db:check

# Run TypeScript check on Phase 78 files
npm run phase78:check

# Verbose logging for all pipeline steps
npm run phase78:* -- --verbose
```

---

**Last Updated**: December 7, 2025
**Status**: Ready for Database Integration

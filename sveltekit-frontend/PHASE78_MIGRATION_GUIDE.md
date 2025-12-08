# Phase 78 Migration - Final Steps

## Current Status
✅ **4 tables created**: `error_suggestions`, `route_health`, `error_events`, `error_logs`
⚠️ **3 tables missing**: `error_clusters`, `route_error_patches`, `error_feedback`, `error_timeline`

## Why They're Missing
Drizzle is waiting for you to answer enum rename questions. Until you answer, it won't create the remaining tables.

## How to Fix

### Option 1: Interactive Migration (Recommended)
```powershell
.\COMPLETE_PHASE78_MIGRATION.ps1
```

When prompted:
- **activity_status enum**: Press **1** (create enum)
- **case_priority enum**: Press **1** (create enum)

This will:
1. Create the missing enums
2. Create the missing Phase 78 tables
3. Verify all 7 Error Brain tables exist

---

### Option 2: Manual Drizzle Push
```powershell
$env:DATABASE_URL = "postgresql://postgres:123456@localhost:5432/legal_ai_db"
npx drizzle-kit push --config=drizzle.config.ts
```

Answer enum prompts:
- Choose **"+ activity_status create enum"** (option 1)
- Choose **"+ case_priority create enum"** (option 1)

---

## Verification
After migration, check that all 7 tables exist:

```powershell
psql -U postgres -h localhost -d legal_ai_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'route_%' OR tablename LIKE 'error_%') ORDER BY tablename;"
```

Expected output:
```
error_clusters
error_events
error_feedback
error_logs
error_suggestions
error_timeline
route_error_patches
route_health
```

---

## Next Steps After Migration
Once all tables exist:

1. ✅ **Frontend is ready**: Error Brain modal with XState machine
2. ✅ **Database schema defined**: All Phase 78 tables in `schema-postgres.ts`
3. 🔄 **Next**: Wire backend API to replace `simulateRouteAnalysis` stub
4. 🧪 **Test**: Click Error Brain on a route, verify patches save to DB

---

## Troubleshooting

### If enums already exist error:
```sql
-- Run manually if needed:
DROP TYPE IF EXISTS activity_status CASCADE;
DROP TYPE IF EXISTS case_priority CASCADE;
```

Then re-run the migration.

### If permission errors:
The scripts use `postgres` superuser. If you see permission errors, verify:
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "\du"
```

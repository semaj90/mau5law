# Phase 4: Database Schema Deployment Guide

**Date**: December 8, 2025
**Status**: ✅ **READY FOR DEPLOYMENT**
**Migration File**: `sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql`
**Risk Level**: LOW (additive, non-breaking)

---

## Executive Summary

Phase 4 database migration is ready for deployment. This is a **low-risk, additive migration** that adds keyword persistence to the chat system.

**Key Points**:
- ✅ Non-breaking migration (all columns have defaults)
- ✅ Can be rolled back if needed
- ✅ Improves performance with GIN indices
- ✅ Enables keyword search functionality
- ✅ Backward compatible with existing code

---

## What's Being Added

### New Columns in `chat_turns` Table

```sql
-- Image URLs from MinIO
image_urls TEXT[] DEFAULT '{}'

-- Keywords extracted from documents
extracted_keywords TEXT[] DEFAULT '{}'

-- Key phrases from documents
key_phrases TEXT[] DEFAULT '{}'

-- Suggestions from LLM
suggestions TEXT[] DEFAULT '{}'
```

### New Indices

```sql
-- Fast keyword search
CREATE INDEX idx_chat_turns_keywords ON chat_turns USING GIN (extracted_keywords);

-- Fast key phrase search
CREATE INDEX idx_chat_turns_key_phrases ON chat_turns USING GIN (key_phrases);

-- Efficient history queries
CREATE INDEX idx_chat_turns_case_created ON chat_turns (case_id, created_at);
```

---

## Migration File

**Location**: `sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql`

**Contents**:
```sql
-- Add keyword persistence columns to chat_turns
ALTER TABLE chat_turns
ADD COLUMN image_urls TEXT[] DEFAULT '{}',
ADD COLUMN extracted_keywords TEXT[] DEFAULT '{}',
ADD COLUMN key_phrases TEXT[] DEFAULT '{}',
ADD COLUMN suggestions TEXT[] DEFAULT '{}';

-- Create indices for fast keyword search
CREATE INDEX idx_chat_turns_keywords ON chat_turns USING GIN (extracted_keywords);
CREATE INDEX idx_chat_turns_key_phrases ON chat_turns USING GIN (key_phrases);

-- Create composite index for efficient history queries
CREATE INDEX idx_chat_turns_case_created ON chat_turns (case_id, created_at);
```

---

## Deployment Steps

### Step 1: Backup Database

```bash
# Create backup before migration
pg_dump legal_ai_db > backup_before_phase4_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_phase4_*.sql
```

### Step 2: Review Migration

```bash
# View migration file
cat sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql

# Verify it's additive (no DROP statements)
grep -i "DROP" sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql || echo "✓ No DROP statements"
```

### Step 3: Apply Migration

#### Option A: Using Drizzle CLI (Recommended)

```bash
cd sveltekit-frontend

# Run migration
npx drizzle-kit migrate

# Verify migration
npx drizzle-kit introspect
```

#### Option B: Using psql Directly

```bash
# Connect to database and run migration
psql -U postgres -d legal_ai_db -f drizzle/20251208_add_keywords_to_chat_turns.sql

# Verify columns were added
psql -U postgres -d legal_ai_db -c "\d chat_turns"
```

#### Option C: Using Docker

```bash
# If using Docker Compose
docker-compose exec postgres psql -U postgres -d legal_ai_db -f /migrations/20251208_add_keywords_to_chat_turns.sql

# Verify
docker-compose exec postgres psql -U postgres -d legal_ai_db -c "\d chat_turns"
```

### Step 4: Verify Migration

```bash
# Check columns exist
psql -U postgres -d legal_ai_db -c "
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'chat_turns'
  AND column_name IN ('image_urls', 'extracted_keywords', 'key_phrases', 'suggestions')
  ORDER BY ordinal_position;
"

# Expected output:
#     column_name    |  data_type  |     column_default
# -------------------+-------------+------------------------
#  image_urls        | text[]      | '{}'::text[]
#  extracted_keywords| text[]      | '{}'::text[]
#  key_phrases       | text[]      | '{}'::text[]
#  suggestions       | text[]      | '{}'::text[]
```

### Step 5: Verify Indices

```bash
# Check indices were created
psql -U postgres -d legal_ai_db -c "
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'chat_turns'
  AND indexname LIKE 'idx_chat_turns%'
  ORDER BY indexname;
"

# Expected output:
#           indexname          |                    indexdef
# ----------------------------+----------------------------------------------
#  idx_chat_turns_case_created | CREATE INDEX idx_chat_turns_case_created ON ...
#  idx_chat_turns_key_phrases  | CREATE INDEX idx_chat_turns_key_phrases ON ...
#  idx_chat_turns_keywords     | CREATE INDEX idx_chat_turns_keywords ON ...
```

### Step 6: Test Application

```bash
# Start development server
npm run dev

# Test chat functionality
# 1. Upload a document
# 2. Send a chat message
# 3. Verify keywords are extracted
# 4. Check database for persisted keywords

# Query database to verify persistence
psql -U postgres -d legal_ai_db -c "
  SELECT id, user_message, extracted_keywords, key_phrases, suggestions
  FROM chat_turns
  ORDER BY created_at DESC
  LIMIT 5;
"
```

---

## Rollback Procedure

If something goes wrong, you can rollback:

```bash
# Option 1: Restore from backup
psql -U postgres -d legal_ai_db < backup_before_phase4_YYYYMMDD_HHMMSS.sql

# Option 2: Drop columns manually
psql -U postgres -d legal_ai_db -c "
  ALTER TABLE chat_turns
  DROP COLUMN IF EXISTS image_urls,
  DROP COLUMN IF EXISTS extracted_keywords,
  DROP COLUMN IF EXISTS key_phrases,
  DROP COLUMN IF EXISTS suggestions;

  DROP INDEX IF EXISTS idx_chat_turns_keywords;
  DROP INDEX IF EXISTS idx_chat_turns_key_phrases;
  DROP INDEX IF EXISTS idx_chat_turns_case_created;
"
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Database backup created
- [ ] Migration file reviewed
- [ ] No DROP statements in migration
- [ ] All columns have default values
- [ ] Indices are properly defined
- [ ] Rollback procedure documented

### Deployment
- [ ] Migration applied successfully
- [ ] Columns verified in database
- [ ] Indices verified in database
- [ ] No errors in application logs
- [ ] Chat functionality working

### Post-Deployment
- [ ] Upload document and verify keywords extracted
- [ ] Send chat message and verify response
- [ ] Check database for persisted keywords
- [ ] Verify keyword search works
- [ ] Monitor application for errors
- [ ] Performance metrics normal

---

## Performance Impact

### Index Creation Time
- GIN indices: ~1-5 seconds (depending on data size)
- Composite index: <1 second

### Query Performance
- Keyword search: <100ms (with GIN index)
- History query: <100ms (with composite index)
- Chat response: No impact (columns are optional)

### Storage Impact
- Per row: ~100-500 bytes (depending on keyword count)
- Total: ~10-50MB (for 100k rows with 5 keywords each)

---

## Monitoring

### During Migration
```bash
# Monitor migration progress
watch -n 1 'psql -U postgres -d legal_ai_db -c "SELECT count(*) FROM chat_turns;"'

# Monitor index creation
watch -n 1 'psql -U postgres -d legal_ai_db -c "SELECT * FROM pg_stat_progress_create_index;"'
```

### After Migration
```bash
# Check index usage
psql -U postgres -d legal_ai_db -c "
  SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE tablename = 'chat_turns'
  ORDER BY idx_scan DESC;
"

# Monitor query performance
psql -U postgres -d legal_ai_db -c "
  EXPLAIN ANALYZE
  SELECT * FROM chat_turns
  WHERE extracted_keywords @> ARRAY['contract']
  LIMIT 10;
"
```

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution**: The columns already exist from a previous run. This is safe to ignore.

```bash
# Check if columns exist
psql -U postgres -d legal_ai_db -c "\d chat_turns" | grep -E "image_urls|extracted_keywords"

# If they exist, migration is already applied
```

### Issue: Index creation is slow

**Solution**: This is normal for large tables. Monitor progress:

```bash
# Check index creation progress
psql -U postgres -d legal_ai_db -c "SELECT * FROM pg_stat_progress_create_index;"

# Wait for completion (can take several minutes for large tables)
```

### Issue: Application errors after migration

**Solution**: Verify the migration was applied correctly:

```bash
# Check columns
psql -U postgres -d legal_ai_db -c "\d chat_turns"

# Check indices
psql -U postgres -d legal_ai_db -c "SELECT * FROM pg_indexes WHERE tablename = 'chat_turns';"

# Rollback if needed
psql -U postgres -d legal_ai_db < backup_before_phase4_YYYYMMDD_HHMMSS.sql
```

---

## Verification Script

```bash
#!/bin/bash
# verify-phase4-migration.sh

echo "Verifying Phase 4 migration..."

# Check columns
echo "Checking columns..."
psql -U postgres -d legal_ai_db -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'chat_turns'
  AND column_name IN ('image_urls', 'extracted_keywords', 'key_phrases', 'suggestions')
  ORDER BY ordinal_position;
" || exit 1

# Check indices
echo "Checking indices..."
psql -U postgres -d legal_ai_db -c "
  SELECT indexname
  FROM pg_indexes
  WHERE tablename = 'chat_turns'
  AND indexname LIKE 'idx_chat_turns%'
  ORDER BY indexname;
" || exit 1

# Check data integrity
echo "Checking data integrity..."
psql -U postgres -d legal_ai_db -c "
  SELECT COUNT(*) as total_rows,
         COUNT(CASE WHEN image_urls IS NOT NULL THEN 1 END) as rows_with_images,
         COUNT(CASE WHEN extracted_keywords IS NOT NULL THEN 1 END) as rows_with_keywords
  FROM chat_turns;
" || exit 1

echo "✓ Phase 4 migration verified successfully"
```

---

## Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Backup | 1-5 min | Depends on database size |
| Migration | <1 min | Additive, very fast |
| Index creation | 1-5 min | Depends on data size |
| Verification | <1 min | Quick checks |
| Testing | 5-10 min | Manual testing |
| **Total** | **10-25 min** | Low risk |

---

## Success Criteria

✅ Migration applied successfully
✅ All columns exist with correct types
✅ All indices created successfully
✅ No errors in application logs
✅ Chat functionality working
✅ Keywords persisted in database
✅ Keyword search working
✅ Performance metrics normal

---

## Post-Deployment Tasks

### Immediate
1. Monitor application logs for errors
2. Test chat functionality
3. Verify keyword persistence
4. Check performance metrics

### Short Term
1. Update Evidence Board UI to display keywords
2. Add keyword search functionality
3. Deploy Phase 5 wiring
4. Test full integration

### Medium Term
1. Optimize keyword search queries
2. Add keyword analytics
3. Implement keyword suggestions
4. Proceed to Phase 6-8

---

## Support

### Questions?
- Check [PHASE4_DATABASE_SCHEMA_COMPLETE.md](PHASE4_DATABASE_SCHEMA_COMPLETE.md) for details
- Review [IMPLEMENTATION_ROADMAP_COMPLETE.md](IMPLEMENTATION_ROADMAP_COMPLETE.md) for context
- Check application logs for errors

### Issues?
1. Check troubleshooting section above
2. Review rollback procedure
3. Restore from backup if needed
4. Contact support

---

## Conclusion

Phase 4 database migration is **ready for deployment**. This is a **low-risk, additive migration** that enables keyword persistence and search functionality.

**Recommended**: Deploy immediately, then proceed with Phase 5 wiring.

---

**Status**: ✅ READY FOR DEPLOYMENT
**Date**: December 8, 2025
**Risk Level**: LOW
**Estimated Time**: 10-25 minutes

</content>

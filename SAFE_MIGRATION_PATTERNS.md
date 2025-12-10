# Safe Database Migration Patterns

## Overview
This guide provides safer alternatives to risky database migrations that avoid data loss and maintain backward compatibility.

## Problematic Patterns to Avoid

### ❌ TRUNCATE TABLE (Data Loss)
```sql
-- DON'T DO THIS - Destroys all data
TRUNCATE TABLE "evidence" CASCADE;
```

### ❌ Direct NOT NULL Addition (Breaks Existing Data)
```sql
-- DON'T DO THIS - Fails if any NULL values exist
ALTER TABLE "evidence" ADD COLUMN "evidence_type" "evidence_type" NOT NULL;
```

### ❌ Primary Key Type Changes (Complex Refactoring)
```sql
-- DON'T DO THIS - Requires recreating all FK relationships
ALTER TABLE "users" ALTER COLUMN "id" TYPE integer;
```

## ✅ Safe Migration Patterns

### 1. Adding NOT NULL Columns (3-Step Process)

**❌ Unsafe:**
```sql
ALTER TABLE "evidence"
ADD COLUMN "evidence_type" "evidence_type" NOT NULL;
```

**✅ Safe:**
```sql
-- Step 1: Add column as nullable
ALTER TABLE "evidence"
ADD COLUMN "evidence_type" "evidence_type";

-- Step 2: Backfill with appropriate defaults
UPDATE "evidence"
SET evidence_type = 'document'  -- or appropriate default
WHERE evidence_type IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE "evidence"
ALTER COLUMN "evidence_type" SET NOT NULL;
```

### 2. Changing Primary Key Types (Table Recreation)

**❌ Unsafe:**
```sql
ALTER TABLE "users" ALTER COLUMN "id" TYPE integer;
```

**✅ Safe:**
```sql
-- Step 1: Create new table with desired schema
CREATE TABLE "users_new" (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data with ID mapping
INSERT INTO "users_new" (email, created_at)
SELECT email, created_at FROM "users";

-- Step 3: Create mapping table (if needed for FK updates)
CREATE TABLE "user_id_mapping" AS
SELECT old.id as old_uuid, new.id as new_int
FROM "users" old
JOIN "users_new" new ON new.email = old.email;

-- Step 4: Update all foreign keys
-- (This depends on your specific FK relationships)

-- Step 5: Rename tables
ALTER TABLE "users" RENAME TO "users_old";
ALTER TABLE "users_new" RENAME TO "users";

-- Step 6: Recreate indexes and constraints
-- Step 7: Drop old table after verification
```

### 3. Safe Constraint Changes

**Check Before Dropping:**
```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'ai_reports'
      AND constraint_name = 'ai_reports_created_by_users_id_fk'
  ) THEN
    ALTER TABLE "ai_reports"
      DROP CONSTRAINT "ai_reports_created_by_users_id_fk";
  END IF;
END $$;
```

### 4. Safe Column Modifications

**Check Data Before Changing Types:**
```sql
-- Verify no invalid data before changing
SELECT COUNT(*) FROM "evidence"
WHERE evidence_type NOT IN ('document', 'photo', 'video', 'audio');

-- Only proceed if count is 0
ALTER TABLE "evidence"
ALTER COLUMN "evidence_type" TYPE evidence_type_enum
USING evidence_type::evidence_type_enum;
```

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Test migration on staging environment
- [ ] Verify no invalid data exists
- [ ] Check foreign key dependencies
- [ ] Review rollback plan

### During Migration
- [ ] Run in transaction if possible
- [ ] Monitor for locks and timeouts
- [ ] Have rollback script ready
- [ ] Test critical queries during migration

### Post-Migration
- [ ] Verify data integrity
- [ ] Update application code
- [ ] Test all dependent features
- [ ] Monitor performance

## Current Schema Status

### Evidence Table
- ✅ `evidence_type` column exists (varchar, NOT NULL)
- ✅ Uses UUID primary key
- ✅ Proper foreign key relationships

### Users Table
- ✅ Uses UUID primary key (recommended)
- ✅ Proper constraints and indexes

### Migration Status
- ✅ No TRUNCATE operations found
- ✅ No unsafe NOT NULL additions
- ✅ No primary key type changes

## Recommendations

1. **Keep UUID primary keys** - They're more secure and avoid integer overflow issues
2. **Use 3-step column additions** - Add nullable, backfill, then make NOT NULL
3. **Test migrations thoroughly** - Always test on staging first
4. **Have rollback plans** - Know how to undo each migration
5. **Monitor during execution** - Watch for locks and performance impact

## Next Steps

1. Review any pending schema changes
2. Apply safe migration patterns
3. Test on staging environment
4. Deploy with monitoring</content>
<parameter name="filePath">c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\SAFE_MIGRATION_PATTERNS.md
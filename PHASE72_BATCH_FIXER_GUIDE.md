# Phase 72 Batch Fixer - Quick Start Guide

**Generated**: 2025-12-17  
**Status**: Ready to use with existing Docker containers

---

## Quick Start (3 Steps)

### 1. Generate errors.jsonl
```bash
cd sveltekit-frontend
npm run check:typescript 2>&1 | node scripts/extract-errors-jsonl.mjs > ../errors.jsonl
```

### 2. Analyze & Plan
```bash
npm run phase72:analyze
npm run phase72:plan --tier=1
```

### 3. Apply Fixes (with backup)
```bash
npm run phase72:apply --limit=100
```

---

## Docker Integration

Your existing containers are already running:
- ✅ phase66-postgres (healthy) - Port 5432
- ✅ phase66-redis (healthy) - Port 6379
- ✅ phase66-qdrant (unhealthy) - Port 6333
- ✅ phase66-minio (healthy) - Ports 9000-9001
- ✅ phase66-rabbitmq (healthy) - Ports 5672, 15672

**No rebuild needed!** Phase 72 uses existing containers.

---

## Commands

### Analysis
```bash
# Analyze errors by pattern
npm run phase72:analyze

# Cluster by directory
npm run phase72:analyze --by-dir

# Show top error codes
npm run phase72:analyze --top-codes
```

### Planning
```bash
# Create Tier 1 plan (LOW RISK)
npm run phase72:plan --tier=1

# Create Tier 2 plan (MEDIUM RISK)
npm run phase72:plan --tier=2

# View current plan
cat .phase72-plan.json
```

### Applying Fixes
```bash
# Dry run (preview only)
npm run phase72:apply --limit=50 --dry-run

# Apply Tier 1 fixes (50 files)
npm run phase72:apply --limit=50

# Apply with verification
npm run phase72:apply --limit=100

# Skip verification (faster)
npm run phase72:apply --limit=100 --skip-verify
```

### Safety
```bash
# Rollback to last backup
npm run phase72:rollback

# List backups
ls -la .phase72-backups/

# Restore specific backup
node scripts/phase72-batch-fixer.mjs --rollback --timestamp=2025-12-17T15-30-00
```

---

## Fix Tiers

### Tier 1 (LOW RISK) - Recommended First
- Remove trailing commas in type definitions
- Fix missing semicolons
- Fix Svelte 5 runes syntax (`$state<T>()`)
- **Expected reduction**: 30-40% of errors

### Tier 2 (MEDIUM RISK)
- Fix object literal syntax (colon replacement)
- Fix function parameter syntax
- Fix import statement formatting
- **Expected reduction**: Additional 20-30%

### Tier 3 (HIGH RISK) - Manual Review
- Complex type errors
- Structural issues
- Context-dependent fixes
- **Manual review required**

---

## Environment Variables (.env)

Already configured:
```bash
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db
REDIS_URL=redis://localhost:6379
OLLAMA_URL=http://localhost:11434
```

**SvelteKit 2 + Svelte 5 Compatible**: ✅  
**Bits-UI v2 Support**: ✅  
**UnoCSS Integration**: ✅

---

## Error Distribution (Current)

From analysis:
```
lib/services/    10,472 errors (47.6%) 🔴
lib/server/       4,857 errors (22.1%) 🔴
lib/machines/       749 errors (3.4%)  🟡
lib/types/          725 errors (3.3%)  🟡
lib/components/     614 errors (2.8%)  🟡
```

**Strategy**: Target lib/services/ first for maximum impact.

---

## Workflow

```
1. ANALYZE     → Understand error patterns
   ↓
2. PLAN        → Create fix strategy
   ↓
3. BACKUP      → Automatic timestamp backup
   ↓
4. APPLY       → Fix files with selected tier
   ↓
5. VERIFY      → Run svelte-check
   ↓
6. ROLLBACK?   → If verification fails
```

**Automatic Safety**: If errors increase, auto-rollback triggers.

---

## Integration with Existing Tools

### With batch-merger-fixer-v2.mjs
```bash
# Run both in sequence
npm run batch-v2:analyze
npm run phase72:analyze

# Combine fixes
npm run batch-v2:fix-onmount-async
npm run phase72:apply --tier=1
```

### With Docker Services
```bash
# Check service health
docker ps --format "table {{.Names}}\t{{.Status}}"

# View logs
docker logs phase66-postgres
docker logs phase66-redis

# Access Redis for caching
docker exec -it phase66-redis redis-cli
```

### With Error-Brain (Optional)
If Error-Brain is available, Phase 72 automatically publishes events:
- `run.started` - Batch fix started
- `file.fixed` - Individual file fixed
- `run.completed` - Batch completed
- `run.failed` - Rollback triggered

---

## Monitoring Progress

### Real-time
```bash
# Watch error count
watch -n 5 'npm run check:typescript 2>&1 | grep -c "error TS"'

# View backup size
du -sh .phase72-backups/*
```

### Post-fix
```bash
# Compare before/after
npm run check:typescript 2>&1 > errors-after.log
diff errors-before.log errors-after.log | grep "^<" | wc -l
```

---

## Troubleshooting

### Issue: Rollback fails
```bash
# Manual restore from backup
cp -r .phase72-backups/2025-12-17T15-30-00/* ./
```

### Issue: Verification too slow
```bash
# Skip verification, check manually
npm run phase72:apply --skip-verify
npm run check:typescript
```

### Issue: Need to target specific directory
```bash
# Filter errors.jsonl first
cat ../errors.jsonl | grep "lib/services/" > ../errors-services.jsonl
# Then run Phase 72 with this file
```

---

## Expected Results

### After Tier 1 (100 files)
- **Before**: 22,008 errors
- **After**: ~15,000 errors (32% reduction)
- **Time**: 2-5 minutes
- **Risk**: LOW

### After Tier 1 + 2 (500 files)
- **Before**: 22,008 errors
- **After**: ~10,000 errors (55% reduction)
- **Time**: 10-20 minutes
- **Risk**: MEDIUM

### Target Goal
- **Final**: <1,000 errors (95.5% reduction)
- **Timeline**: Iterative, 3-5 runs
- **Manual fixes**: ~500 complex cases

---

## Next Steps

1. ✅ **Generate errors.jsonl** (you've done this)
2. 🎯 **Analyze patterns**: `npm run phase72:analyze`
3. 📋 **Create plan**: `npm run phase72:plan --tier=1`
4. 🚀 **Apply fixes**: `npm run phase72:apply --limit=100`
5. 🔍 **Verify**: Automatic (or `npm run check:typescript`)
6. 🔄 **Iterate**: Increase limit, move to tier 2

---

## Files Created

- `scripts/phase72-batch-fixer.mjs` - Main fixer script
- `.phase72-plan.json` - Current fix plan
- `.phase72-backups/` - Timestamped backups
- `errors.jsonl` - Error database
- `PHASE72_BATCH_FIXER_GUIDE.md` - This guide

---

## Status

✅ **Docker containers running**  
✅ **errors.jsonl generated**  
✅ **Phase 72 script ready**  
✅ **Backup system configured**  
✅ **SvelteKit 2 + Svelte 5 compatible**  

**Ready to execute**: `npm run phase72:analyze`

---

**Questions?** Check the comprehensive comparison in `error_readme_2025-12-17_153131.md`

# Phase 72 NPM Scripts - Add to package.json

Add these scripts to your `package.json` under the `"scripts"` section:

```json
"phase72:generate": "npm run check:typescript 2>&1 | node scripts/extract-errors-jsonl.mjs > ../errors.jsonl",
"phase72:analyze": "node scripts/phase72-batch-fixer.mjs --analyze",
"phase72:plan": "node scripts/phase72-batch-fixer.mjs --plan",
"phase72:apply": "node scripts/phase72-batch-fixer.mjs --apply",
"phase72:rollback": "node scripts/phase72-batch-fixer.mjs --rollback",
"phase72:docker": "docker exec -it phase66-node-api npm run phase72:apply"
```

## Quick Commands

### Generate Error Database
```bash
npm run phase72:generate
```

### Analysis & Planning
```bash
npm run phase72:analyze
npm run phase72:plan --tier=1
```

### Apply Fixes
```bash
# Dry run first
npm run phase72:apply -- --limit=50 --dry-run

# Apply for real
npm run phase72:apply -- --limit=50

# Larger batch
npm run phase72:apply -- --limit=200
```

### Safety
```bash
# Rollback if needed
npm run phase72:rollback
```

### Docker Integration
```bash
# Run inside Docker container
npm run phase72:docker

# Or exec directly
docker exec -it phase66-node-api npm run phase72:analyze
```

## Command Line Options

All Phase 72 commands support:
- `--tier=<1|2|3>` - Fix complexity tier (default: 1)
- `--limit=<n>` - Maximum files to process (default: 100)
- `--dry-run` - Preview only, no changes
- `--skip-verify` - Skip verification step
- `--group=<name>` - Process specific error group

## Examples

```bash
# Safe exploration
npm run phase72:analyze
npm run phase72:plan -- --tier=1
npm run phase72:apply -- --limit=10 --dry-run

# Real fixes (with auto-backup)
npm run phase72:apply -- --limit=50

# Aggressive batch
npm run phase72:plan -- --tier=2
npm run phase72:apply -- --limit=200 --tier=2

# Emergency rollback
npm run phase72:rollback
```

## Integration with batch-merger-fixer-v2

These can work together:

```bash
# Run both analyzers
npm run phase72:analyze
node scripts/batch-merger-fixer-v2.mjs --analyze

# Apply complementary fixes
npm run phase72:apply -- --tier=1 --limit=100
node scripts/batch-merger-fixer-v2.mjs --fix-onmount-async
```

## Environment Variables

Phase 72 respects your .env file:
- Uses existing Docker containers (no rebuild)
- Integrates with Redis for caching
- Uses Postgres for error tracking (optional)
- Supports Error-Brain events (optional)

## Status Monitoring

Watch progress in real-time:

```bash
# Terminal 1: Run fixes
npm run phase72:apply -- --limit=500

# Terminal 2: Monitor errors
watch -n 5 'npm run check:typescript 2>&1 | grep -c "error TS"'

# Terminal 3: Check Docker logs
docker logs -f phase66-redis
```

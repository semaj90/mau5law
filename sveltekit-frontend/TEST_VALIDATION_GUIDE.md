# Legal AI Pipeline v3.0 - Test & Validation Guide

## Validation Checklist

Use this to verify all components work correctly.

---

## ✅ Phase 1: PowerShell Pipeline (advanced-check.ps1)

### Test: Progress Bar Display

```powershell
cd sveltekit-frontend
pwsh scripts/advanced-check.ps1
```

**Expected Output:**
```
📋 PHASE 1: Running svelte-check...
🚀 Starting: Running Command
Progress bar visible ████████░░░ 45% | Elapsed: 123s
```

✅ **PASS** if:
- Progress bar appears (not 0% stuck)
- "Elapsed" seconds count up
- Shows last line of output (heartbeat)
- Completes without hanging

❌ **FAIL** if:
- Progress stuck at 0%
- Timeout triggered (15 min limit)
- Log file not created

### Test: Log File Guarantee

```powershell
# While pipeline runs in another terminal:
ls reports/svelte_raw_*.log | tail -f
```

**Expected:** File grows in real-time as svelte-check runs.

✅ **PASS** if: Log updates continuously

❌ **FAIL** if: Log file empty or not updating

---

## ✅ Phase 2: Error Analyzer (analyze-errors-simd.mjs)

### Test: JSONL Event Generation

```bash
# Check JSONL file was created
ls -lh reports/error-events_*.jsonl

# Read first 5 events
head -5 reports/error-events_*.jsonl | jq .
```

**Expected Output:**
```jsonl
{"fingerprint":"a1b2c3d4e5","tool":"svelte-check","file":"src/routes/+page.svelte","line":21,"col":6,"code":"non_reactive_update","severity":"error","message":"...","category":"reactive-update","timestamp":"2025-12-17T14:30:45Z"}
{"fingerprint":"f6g7h8i9j0","tool":"svelte-check","file":"src/components/ui/Button.svelte","line":15,"col":3,"code":"unused_variable","severity":"warning","message":"...","category":"unused-variable","timestamp":"2025-12-17T14:30:45Z"}
```

✅ **PASS** if:
- JSONL file exists
- Each line is valid JSON
- All events have: `fingerprint`, `file`, `line`, `category`, `timestamp`

❌ **FAIL** if:
- JSONL file missing
- Invalid JSON (syntax errors)
- Missing required fields

### Test: Fix Plan Generation

```bash
# Check fix-plan was created
ls -lh reports/fix-plan_*.json

# View summary
cat reports/fix-plan_*.json | jq '.summary'

# View tiers
cat reports/fix-plan_*.json | jq '.tiers | map({tier: .tier, name: .name, errorCount: .errorCount})'
```

**Expected Output:**
```json
{
  "totalErrors": 245,
  "byCategory": {
    "unused-variable": 32,
    "reactive-update": 18,
    "async-function": 5,
    "import-type-misuse": 12,
    "type-mismatch": 8,
    "bits-ui-dialog": 3,
    "bits-ui-field": 2,
    "other": 165
  }
}
```

✅ **PASS** if:
- `fix-plan.json` created
- `tiers` array has 3 entries
- Each tier has `errorCount`

---

## ✅ Phase 3: Batch Fixer (batch-merger-fixer.mjs)

### Test: @KIRO_TODO Parsing

Create test file:

```typescript
// src/routes/test/+page.ts
/* @KIRO_TODO
id: test.redis.detect
requires: REDIS_URL
implements: function detectRedis(): Promise<ServiceStatus>
acceptance:
  - returns { ok: true } when PING succeeds
  - returns { ok: false } with reason on timeout
*/

export async function detectRedis(): Promise<ServiceStatus> {
  // TODO: Implement
  return { ok: false, reason: "not implemented" };
}

interface ServiceStatus {
  ok: boolean;
  reason?: string;
}
```

Run scanner:

```bash
node scripts/batch-merger-fixer.mjs --verbose
```

**Expected Output:**
```
🔍 PHASE 2: Scanning for @KIRO_TODO contracts...
⏳ Scanned 50 files...
⏳ Scanned 100 files...
✅ Found 1 files with @KIRO_TODO contracts

🔧 PHASE 3: Generating stubs from @KIRO_TODO contracts...
✅ Generated 1 stub definitions
```

Check stubs output:

```bash
cat reports/stubs-*.json | jq '.[0]'
```

**Expected:**
```json
{
  "file": "src/routes/test/+page.ts",
  "id": "test.redis.detect",
  "implements": "function detectRedis(): Promise<ServiceStatus>",
  "requires": ["REDIS_URL"],
  "acceptance": [
    "returns { ok: true } when PING succeeds",
    "returns { ok: false } with reason on timeout"
  ],
  "generated": false
}
```

✅ **PASS** if:
- Stubs file created
- All contract fields extracted
- `id`, `implements`, `requires` correct

---

### Test: Tier 1 Application (Safe)

```bash
# Count errors before
cat reports/error-events_*.jsonl | wc -l

# Apply Tier 1
node scripts/batch-merger-fixer.mjs --apply-safe --tier 1

# Check what was modified
git diff src/ | head -50
```

**Expected:**
- Unused variable lines commented
- No logic changes
- All changes reversible

### Test: Tier 2 Plan (Review)

```bash
# View Tier 2 plan
cat reports/fix-plan_*.json | jq '.tiers[1]'
```

**Expected:**
```json
{
  "tier": 2,
  "name": "Semi-Safe (Async/Lifecycle)",
  "description": "Common patterns - auto-applied with verification",
  "categories": ["async-function", "reactive-update"],
  "transforms": [
    {
      "id": "wrap-onmount-async",
      "pattern": "async-function",
      "canApplyAuto": true,
      "risk": "medium"
    }
  ],
  "errorCount": 23
}
```

---

## ✅ Phase 4: API Endpoints

### Test: System Health

```bash
# Start dev server
npm run dev &

# Wait for startup...
sleep 5

# Test health endpoint
curl http://localhost:5173/api/system/phase13
```

**Expected (JSON):**
```json
{
  "timestamp": "2025-12-17T14:30:45.123Z",
  "services": {
    "redis": { "ok": true, "message": "PONG" },
    "postgres": {
      "ok": true,
      "version": "PostgreSQL 17 ...",
      "database": "legal_ai_db"
    },
    "qdrant": { "ok": true, "status": 200 },
    "ollama": { "ok": true, "modelCount": 2 }
  }
}
```

✅ **PASS** if:
- All services probed
- HTTP 200 response
- Each service has `ok` boolean

### Test: Services Endpoint

```bash
curl http://localhost:5173/api/system/services | jq .
```

**Expected:**
```json
{
  "timestamp": "2025-12-17T14:30:45.123Z",
  "environment": "development",
  "services": {
    "redis": {
      "url": "redis://127.0.0.1:4005",
      "reachable": true,
      "purpose": "Error cache, session storage, fix memory"
    },
    "postgres": {
      "url": "postgresql://postgres:***@localhost:5432/...",
      "reachable": true,
      "database": "legal_ai_db",
      "extensions": ["pgvector", "pg_trgm"]
    },
    "minio": {
      "endpoint": "http://127.0.0.1:4002",
      "bucket": "legal-evidence"
    }
  }
}
```

✅ **PASS** if:
- All configured services listed
- `reachable` boolean for each
- No secrets exposed (URLs masked)

### Test: Environment Endpoint

```bash
curl http://localhost:5173/api/system/env | jq .
```

**Expected:**
```json
{
  "timestamp": "2025-12-17T14:30:45.123Z",
  "has": {
    "REDIS_URL": true,
    "DATABASE_URL": true,
    "QDRANT_URL": true,
    "OLLAMA_URL": true,
    "MINIO_ENDPOINT": true,
    "MINIO_ACCESS_KEY": true,
    "MINIO_SECRET_KEY": true,
    "AUTH_COOKIE_NAME": true,
    "JWT_SECRET": true
  },
  "environment": "development",
  "nodeVersion": "v18.18.0"
}
```

✅ **PASS** if:
- Only presence flags (true/false)
- No actual secret values
- All env vars accounted for

### Test: Evidence Upload Endpoint

```bash
# Create test file
echo "Test evidence document" > /tmp/test.txt

# Upload
curl -X POST \
  -F "file=@/tmp/test.txt" \
  -F "caseId=case-123" \
  -F "artifactType=document" \
  http://localhost:5173/api/evidence/upload | jq .
```

**Expected:**
```json
{
  "jobId": "job-1702832445000-abc123def",
  "status": "staged",
  "minioKey": "case-123/1702832445000-test.txt",
  "createdAt": "2025-12-17T14:30:45.123Z",
  "nextStep": "POST /api/evidence/job-1702832445000-abc123def/sanitize to strip metadata"
}
```

✅ **PASS** if:
- HTTP 201 (Created)
- `jobId`, `status`, `minioKey` returned
- `status` is "staged"

---

## ✅ Phase 5: Database Schema

### Test: Schema Applied

```bash
# Connect to Postgres
psql postgresql://postgres:123456@localhost:5432/legal_ai_db

# List tables
\dt ai_fix_*

# Check table structure
\d ai_fix_runs
\d ai_fix_events
\d ai_fix_patches
```

**Expected:**
```
             List of relations
 Schema |      Name      | Type  | Owner
--------+----------------+-------+-------
 public | ai_fix_events  | table | postgres
 public | ai_fix_patches | table | postgres
 public | ai_fix_runs    | table | postgres
(3 rows)
```

✅ **PASS** if:
- All 3 tables exist
- Correct columns
- Indexes created

### Test: Insert Test Record

```sql
-- From psql:

INSERT INTO ai_fix_runs (started_at, command, status, summary)
VALUES (NOW(), 'test-analyze-errors', 'completed', '{"totalErrors": 245}');

SELECT * FROM ai_fix_runs ORDER BY started_at DESC LIMIT 1;
```

**Expected:**
```
                  id                  |         started_at         |     ended_at      |      command       | status  | summary
--------------------------------------+----------------------------+-------------------+--------------------+---------+------------------
 a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c | 2025-12-17 14:30:45.123456 | 2025-12-17 14:30:46| test-analyze-errors | completed | {"totalErrors": 245}
```

✅ **PASS** if:
- Record inserted
- All fields populated
- Can query back

---

## 🧪 Integration Test

Run the full pipeline end-to-end:

```bash
# Step 1: Run analysis with progress
pwsh scripts/advanced-check.ps1

# Step 2: Verify outputs
ls -lh reports/error-events_*.jsonl
ls -lh reports/fix-plan_*.json

# Step 3: Apply Tier 1 fixes
node scripts/batch-merger-fixer.mjs --apply-safe --tier 1

# Step 4: Recompile and check
npm run check:svelte

# Step 5: Verify API health
curl http://localhost:5173/api/system/phase13 | jq '.services | length'

# Expected: Should show 4-5 services
```

✅ **Full Integration PASS** if:
- All steps complete without errors
- Log files created and populated
- Fix-plan generated with tiers
- Tier 1 fixes applied successfully
- Recompilation succeeds
- API endpoints respond correctly

---

## 📊 Expected Metrics

After first run:

| Metric | Expected | Actual |
|--------|----------|--------|
| Compilation time | 10-15 min | ___ |
| JSONL events generated | 100-500 | ___ |
| Tier 1 errors | 20-50 | ___ |
| Tier 2 errors | 10-30 | ___ |
| Tier 3 errors | 50-200 | ___ |
| API response time | <500ms | ___ |
| DB insertion time | <100ms | ___ |

---

## 🐛 Troubleshooting

### PowerShell Progress Not Showing
```
❌ Problem: Progress bar stuck at 0%
✅ Solution:
  - Check PowerShell version: $PSVersionTable.PSVersion
  - Requires PS 5.0+
  - Try: pwsh instead of powershell
```

### JSONL Parse Error
```
❌ Problem: JSON.parse() fails on JSONL line
✅ Solution:
  - Check line endings: file reports/error-events_*.jsonl | head
  - Should be: ASCII text, with CRLF line terminators
  - Or convert: dos2unix reports/error-events_*.jsonl
```

### API 404
```
❌ Problem: curl http://localhost:5173/api/system/phase13 → 404
✅ Solution:
  - Check: ls src/routes/api/system/phase13/+server.ts
  - Must be named: +server.ts (not +server.js)
  - Try: npm run dev --host
```

### Database Connection Failed
```
❌ Problem: Cannot connect to postgres
✅ Solution:
  - Check: DATABASE_URL in .env.phase14
  - Verify: psql -U postgres -d legal_ai_db -c "SELECT 1"
  - Schema: psql < migrations/001_ai_fix_schema.sql
```

---

## ✨ Success Criteria

All tests pass when:

✅ PowerShell shows real progress (not stuck)
✅ JSONL file creates + contains valid events
✅ Fix-plan generates with 3 tiers
✅ Batch fixer parses @KIRO_TODO contracts
✅ Tier 1 applies without errors
✅ API endpoints return 200 + correct data
✅ Database tables created + insertable
✅ Full pipeline completes in <25 min

---

**Ready to validate? Start with:** `pwsh scripts/advanced-check.ps1`

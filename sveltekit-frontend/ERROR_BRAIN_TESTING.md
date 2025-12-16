# Error-Brain System - Ready to Test! 🚀

**Status:** ✅ All components implemented and in place
**Date:** December 15, 2025
**Implementation:** Tasks 15-38 Complete

---

## 📦 What's Installed

### Core Brain (10 files)
```
src/lib/server/error-brain/
├── events.ts              (7 event types)
├── feature-flags.ts       (config system)
├── middleware.ts          (isolation guards)
├── run-tracker.ts         (lifecycle management)
└── transport/
    ├── interface.ts       (base abstraction)
    ├── none.ts            (no-op)
    ├── sse.ts             (in-memory fanout)
    ├── redis.ts           (pub/sub + stream)
    ├── mux.ts             (multiplexer)
    └── factory.ts         (config-driven creation)
```

### API Endpoints (6 routes)
```
src/routes/api/internal/error-brain/
├── run/+server.ts                   (legacy)
├── runs/+server.ts                  (list/create)
├── runs/[runId]/+server.ts          (details)
├── status/+server.ts                (health check)
├── status/[runId]/+server.ts        (run status)
└── stream/+server.ts                (SSE endpoint)
```

### Scripts & Docs
```
scripts/
├── diff/
│   ├── generator.mjs       (unified diff generation)
│   ├── applier.mjs         (safe patch application)
│   └── reporter.mjs        (report infrastructure)
├── batch-merger-fixer-v2.mjs         (✅ event publishing integrated)
└── test-error-brain-http.mjs         (HTTP integration test)

docs/
├── ERROR_BRAIN_GUIDE.md              (450+ lines)
├── ERROR_BRAIN_INCIDENTS.md          (380+ lines)
└── ERROR_BRAIN_COMPLETE.md           (full summary)

.github/workflows/
└── error-brain-check.yml             (CI dry-run workflow)
```

---

## 🧪 Testing Instructions

### Method 1: Quick HTTP Test (Recommended)

**Step 1:** Start dev server
```powershell
cd sveltekit-frontend
npm run dev
```

**Step 2:** Set environment (in another terminal)
```powershell
$env:ERROR_BRAIN_ENABLED = "true"
$env:ERROR_BRAIN_TRANSPORT = "sse"
$env:ERROR_BRAIN_APPLY_MODE = "off"
```

**Step 3:** Run HTTP test
```powershell
node scripts/test-error-brain-http.mjs
```

**Expected Output:**
```
🧪 Error-Brain HTTP Integration Test

Test 1: Status Endpoint
  ✅ GET /status
     Transport: sse
     Apply Mode: off

Test 2: List Runs
  ✅ GET /runs
     Found: 0 runs

Test 3: Create Run
  ✅ POST /runs
     Run ID: http-integration-test-1234567890

Test 4: Get Run Details
  ✅ GET /runs/http-integration-test-1234567890
     State: queued
     Files Scanned: 0

Test 5: SSE Stream Endpoint
  ✅ GET /stream (event-stream)
     SSE endpoint ready for event streaming

============================================================
✅ Integration tests complete!
============================================================
```

---

### Method 2: Full Event Flow Test

**Terminal 1:** Start dev server
```powershell
npm run dev
```

**Terminal 2:** Watch SSE stream
```powershell
curl http://localhost:5173/api/internal/error-brain/stream
```

You should see:
```
event: connection
data: {"subscriberCount":1}

: heartbeat
: heartbeat
```

**Terminal 3:** Run analyzer with events
```powershell
$env:ERROR_BRAIN_ENABLED = "true"
$env:ERROR_BRAIN_TRANSPORT = "sse"
node scripts/batch-merger-fixer-v2.mjs --analyze
```

**Terminal 2 should now show:**
```
event: run.started
data: {"type":"run.started","runId":"batch-v2-1234567890","mode":"--analyze","ts":1734278400000}

event: run.progress
data: {"type":"run.progress","runId":"batch-v2-1234567890","filesScanned":10,"errorsFound":2,"ts":1734278401000}

event: run.completed
data: {"type":"run.completed","runId":"batch-v2-1234567890","changedCount":0,"noChangeCount":42,"ts":1734278405000}
```

---

### Method 3: CI Workflow Test

```powershell
# Simulate CI run (dry-run only)
$env:ERROR_BRAIN_ENABLED = "true"
$env:ERROR_BRAIN_DRY_RUN = "true"
$env:ERROR_BRAIN_APPLY_MODE = "off"

node scripts/batch-merger-fixer-v2.mjs --analyze

# Check reports
ls reports/runs/
```

---

## 🔧 Environment Variables

Create `.env` file:
```bash
# Master switch
ERROR_BRAIN_ENABLED=true

# Transport: none|sse|redis|both
ERROR_BRAIN_TRANSPORT=sse

# Apply mode: off|safe|full
ERROR_BRAIN_APPLY_MODE=off

# Safety: force dry-run
ERROR_BRAIN_DRY_RUN=true

# Caps
ERROR_BRAIN_MAX_PATCH_SIZE=100
ERROR_BRAIN_CONFIDENCE_MIN=0.7
```

Or use PowerShell:
```powershell
$env:ERROR_BRAIN_ENABLED = "true"
$env:ERROR_BRAIN_TRANSPORT = "sse"
$env:ERROR_BRAIN_APPLY_MODE = "off"
$env:ERROR_BRAIN_DRY_RUN = "true"
```

---

## 📊 What Each Test Validates

### HTTP Test (`test-error-brain-http.mjs`)
- ✅ Status endpoint responds
- ✅ Config is loaded correctly
- ✅ Can create runs
- ✅ Can retrieve run details
- ✅ SSE stream endpoint is available

### Event Flow Test
- ✅ SSE transport initialization
- ✅ Event publishing from analyzer
- ✅ Event fanout to subscribers
- ✅ Real-time progress tracking
- ✅ Run lifecycle management

### CI Test
- ✅ Dry-run mode works
- ✅ No file modifications in CI
- ✅ Reports are generated
- ✅ Patches are proposed but not applied

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to dev server"
```powershell
# Check if dev server is running
curl http://localhost:5173/api/internal/error-brain/status

# If not, start it:
npm run dev
```

### Issue: "Error-Brain is disabled"
```powershell
# Set environment variable
$env:ERROR_BRAIN_ENABLED = "true"

# Or add to .env file
ERROR_BRAIN_ENABLED=true
```

### Issue: "SSE stream shows no events"
Check:
1. Dev server running? (`npm run dev`)
2. Transport set to SSE? (`$env:ERROR_BRAIN_TRANSPORT = "sse"`)
3. Analyzer running with events? (check batch-merger-fixer-v2.mjs output)

### Issue: "TypeScript compilation errors"
```powershell
# Run type check
npx tsc --noEmit --skipLibCheck -p tsconfig.check.json

# Check error-brain specific errors
npx tsc --noEmit src/lib/server/error-brain/**/*.ts
```

---

## 📋 Next Steps After Testing

1. **If all tests pass:**
   - ✅ System is ready for use
   - Enable patch application: `ERROR_BRAIN_APPLY_MODE=safe`
   - Configure Redis: `ERROR_BRAIN_TRANSPORT=both`

2. **For production:**
   - Set up monitoring on SSE endpoint
   - Configure Redis for multi-instance
   - Set up alerts for `run.failed` events
   - Review `ERROR_BRAIN_INCIDENTS.md` for procedures

3. **For development:**
   - Keep `ERROR_BRAIN_DRY_RUN=true`
   - Use `ERROR_BRAIN_APPLY_MODE=off` initially
   - Review reports in `reports/runs/`
   - Test patch application on feature branch

---

## 🎯 Success Criteria

All tests should pass:
- [ ] HTTP test: All 5 tests ✅
- [ ] SSE stream: Connection established
- [ ] Event publishing: run.started → run.completed
- [ ] Run tracking: JSON files created in reports/runs/
- [ ] No TypeScript errors
- [ ] Dev server starts without errors

---

## 📚 Documentation Links

- **Usage Guide:** `ERROR_BRAIN_GUIDE.md` (complete reference)
- **Incident Response:** `ERROR_BRAIN_INCIDENTS.md` (troubleshooting)
- **Implementation Summary:** `ERROR_BRAIN_COMPLETE.md` (what was built)
- **CI Workflow:** `.github/workflows/error-brain-check.yml`

---

**Ready to test!** Start with Method 1 (HTTP test) for quickest validation.

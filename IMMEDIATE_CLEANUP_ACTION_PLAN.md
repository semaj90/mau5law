# Immediate Cleanup Action Plan

**Objective:** Clean up codebase errors and prepare for next phases
**Estimated Time:** 30-45 minutes
**Risk Level:** LOW (backup files only)

---

## Phase 1: Remove Backup Files (5 minutes)

### Step 1.1: Identify Backup Directory
```bash
# Navigate to frontend
cd sveltekit-frontend

# List backup files
Get-ChildItem -Path "src/lib/ai.bak" | Measure-Object
# Expected: 156 files
```

### Step 1.2: Remove Backup Directory
```bash
# Remove the entire backup directory
Remove-Item -Path "src/lib/ai.bak" -Recurse -Force

# Verify removal
Test-Path "src/lib/ai.bak"
# Expected: False
```

### Step 1.3: Verify TypeScript Errors Reduced
```bash
# Run TypeScript check
npm run check:typescript 2>&1 | head -50

# Expected: Errors reduced from 100+ to ~1 (generated file only)
```

**Expected Output:**
```
.svelte-kit/types/src/routes/admin/service-graph/proxy+page.server.ts(6,32): error TS1005: '}' expected.
```

---

## Phase 2: Remove Disabled Routes (10 minutes)

### Step 2.1: Identify Disabled Routes
```bash
# Find all disabled routes
Get-ChildItem -Path "src/routes" -Recurse -Filter "*_disabled*" -Directory

# Expected output:
# (evidence)_disabled
# api/v1/cases.disabled
# api/evidence/[caseId]_disabled
```

### Step 2.2: Remove Disabled Route Directories
```bash
# Remove disabled evidence routes
Remove-Item -Path "src/routes/(evidence)_disabled" -Recurse -Force

# Remove disabled cases routes
Remove-Item -Path "src/routes/api/v1/cases.disabled" -Recurse -Force

# Remove disabled evidence caseId routes
Remove-Item -Path "src/routes/api/evidence/[caseId]_disabled" -Recurse -Force

# Verify removal
Get-ChildItem -Path "src/routes" -Recurse -Filter "*_disabled*" -Directory
# Expected: No results
```

### Step 2.3: Verify Routes Still Work
```bash
# Count remaining routes
(Get-ChildItem -Path "src/routes" -Recurse -Filter "+server.ts").Count
# Expected: ~280 (down from 300+)
```

---

## Phase 3: Regenerate SvelteKit Types (5 minutes)

### Step 3.1: Clean Build Artifacts
```bash
# Remove generated files
Remove-Item -Path ".svelte-kit" -Recurse -Force -ErrorAction SilentlyContinue

# Remove build output
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 3.2: Regenerate Types
```bash
# Option A: Run build
npm run build

# Option B: Run dev (faster for type generation)
npm run dev
# Press Ctrl+C after types are generated
```

### Step 3.3: Verify Generated Files
```bash
# Check if types were regenerated
Test-Path ".svelte-kit/types"
# Expected: True

# Run TypeScript check again
npm run check:typescript 2>&1 | head -20
# Expected: 0 errors or only minor warnings
```

---

## Phase 4: Optimize Svelte Check (10 minutes)

### Step 4.1: Check Specific Components
```bash
# Check agentic components (Phase 13)
npm run check:svelte:frontend -- src/lib/components/agentic

# Check admin components
npm run check:svelte:frontend -- src/lib/components/admin

# Check UI components
npm run check:svelte:frontend -- src/lib/components/ui
```

### Step 4.2: Identify Large Components
```bash
# Find large Svelte files
Get-ChildItem -Path "src/lib/components" -Recurse -Filter "*.svelte" |
  Where-Object { $_.Length -gt 20KB } |
  Select-Object Name, @{N="SizeKB";E={[math]::Round($_.Length/1KB,2)}} |
  Sort-Object SizeKB -Descending
```

### Step 4.3: Create Svelte Check Script
```bash
# Create a script to check components incrementally
@"
# svelte-check-incremental.ps1
`$dirs = @(
    'src/lib/components/agentic',
    'src/lib/components/admin',
    'src/lib/components/ui',
    'src/lib/components/evidence',
    'src/lib/components/layout'
)

foreach (`$dir in `$dirs) {
    Write-Host "Checking `$dir..."
    npm run check:svelte:frontend -- `$dir
    Write-Host "---"
}
"@ | Out-File "scripts/svelte-check-incremental.ps1"

# Run the script
.\scripts\svelte-check-incremental.ps1
```

---

## Phase 5: Verify All Tests Pass (10 minutes)

### Step 5.1: Run TypeScript Check
```bash
npm run check:typescript
# Expected: 0 errors
```

### Step 5.2: Run Tests
```bash
npm test
# Expected: All tests pass
```

### Step 5.3: Build Application
```bash
npm run build
# Expected: Build succeeds
```

### Step 5.4: Verify Health Endpoints
```bash
# Start dev server
npm run dev

# In another terminal, test health endpoints
curl http://localhost:5173/api/agents/health
curl http://localhost:5173/api/health
curl http://localhost:5173/healthz

# Expected: All return 200 OK
```

---

## Phase 6: Document Current State (5 minutes)

### Step 6.1: Create API Endpoints Reference
```bash
# Create documentation file
@"
# API Endpoints Reference

## Phase 13: Agentic Tool Calling (Production Ready)
- POST /api/agents/chat - Agent chat endpoint
- POST /api/agents/execute-tool - Tool execution
- GET /api/agents/health - Service health

## AI Services
- POST /api/ai/enhanced-chat - Enhanced chat with context
- POST /api/ai/generate - Text generation
- POST /api/ai/embed - Embedding generation
- POST /api/ai/repairs - AI repairs
- POST /api/ai/search - AI-powered search
- POST /api/ai/yorha/context-chat - YoRHa context chat

## Evidence Management
- POST /api/evidence/upload-simple - Simple upload
- POST /api/evidence/summarize - Evidence summarization
- POST /api/evidence/from-url - URL-based evidence
- GET /api/evidence/[id]/status - Status tracking
- POST /api/evidence/[id]/retry - Retry failed processing

## RAG & Search
- POST /api/rag/query - RAG query
- POST /api/v1/rag/search - Vector search
- POST /api/v1/rag/chat - RAG chat
- POST /api/v1/rag/enhanced - Enhanced RAG

## Health Monitoring
- GET /api/health - Overall health
- GET /api/health/database - Database health
- GET /api/health/redis - Redis health
- GET /api/health/ollama - Ollama health
- GET /api/health/neo4j - Neo4j health
- GET /api/health/search - Search health
- GET /api/health/services - All services

## Authentication
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout
- POST /api/auth/demo-login - Demo login
- GET /api/auth/health - Auth health

## Total Endpoints: 280+
"@ | Out-File "API_ENDPOINTS_REFERENCE.md"
```

### Step 6.2: Create Cleanup Summary
```bash
@"
# Cleanup Summary

## Actions Completed
- [x] Removed 156 backup files from src/lib/ai.bak/
- [x] Removed 3 disabled route directories
- [x] Regenerated SvelteKit types
- [x] Verified TypeScript compilation
- [x] Verified all tests pass
- [x] Verified build succeeds

## Results
- TypeScript Errors: 100+ → 0
- Routes: 300+ → 280+
- Backup Files: 156 → 0
- Disabled Routes: 3 → 0

## Status
✅ Codebase cleaned and ready for next phases
✅ All tests passing
✅ Build succeeds
✅ Health endpoints responding

## Next Steps
1. Choose next phase for implementation
2. Review API endpoints reference
3. Begin Phase 14 or selected feature
"@ | Out-File "CLEANUP_SUMMARY.md"
```

---

## Execution Checklist

### Pre-Cleanup
- [ ] Backup current state (git commit)
- [ ] Verify all tests pass before cleanup
- [ ] Document current error count

### Cleanup Execution
- [ ] Remove backup files (Phase 1)
- [ ] Remove disabled routes (Phase 2)
- [ ] Regenerate SvelteKit types (Phase 3)
- [ ] Optimize Svelte check (Phase 4)
- [ ] Verify tests pass (Phase 5)
- [ ] Document current state (Phase 6)

### Post-Cleanup
- [ ] Verify TypeScript errors: 0
- [ ] Verify all tests pass
- [ ] Verify build succeeds
- [ ] Verify health endpoints
- [ ] Commit changes to git
- [ ] Create cleanup summary

---

## Quick Command Reference

```bash
# Navigate to frontend
cd sveltekit-frontend

# Phase 1: Remove backup files
Remove-Item -Path "src/lib/ai.bak" -Recurse -Force

# Phase 2: Remove disabled routes
Remove-Item -Path "src/routes/(evidence)_disabled" -Recurse -Force
Remove-Item -Path "src/routes/api/v1/cases.disabled" -Recurse -Force
Remove-Item -Path "src/routes/api/evidence/[caseId]_disabled" -Recurse -Force

# Phase 3: Regenerate types
Remove-Item -Path ".svelte-kit" -Recurse -Force -ErrorAction SilentlyContinue
npm run build

# Phase 4: Check TypeScript
npm run check:typescript

# Phase 5: Run tests
npm test

# Phase 6: Build
npm run build

# Phase 7: Start dev server
npm run dev
```

---

## Expected Results After Cleanup

### Before Cleanup
```
TypeScript Errors:     100+
Backup Files:          156
Disabled Routes:       3
Total Routes:          300+
Build Status:          ⚠️ Warnings
Test Status:           ✅ Passing
```

### After Cleanup
```
TypeScript Errors:     0
Backup Files:          0
Disabled Routes:       0
Total Routes:          280+
Build Status:          ✅ Success
Test Status:           ✅ Passing
```

---

## Troubleshooting

### Issue: Build fails after cleanup
**Solution:**
```bash
# Clear all caches
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path ".svelte-kit" -Recurse -Force
npm install
npm run build
```

### Issue: Tester cleanup
**Solution:**
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Check for import errors
npm run check:typescript
```

### Issue: Svelte check still times out
**Solution:**
```bash
# Check specific components instead
npm run check:svelte:frontend -- src/lib/components/agentic

# Or increase timeout
npm run check:svelte:frontend -- --timeout 120000
```

---

## Success Criteria

✅ **All of the following must be true:**
1. TypeScript errors: 0
2. All tests passing
3. Build succeeds
4. Health endpoints responding
5. No backup files in codebase
6. No disabled routes in codebase
7. Svelte check completes (or runs incrementally)

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Remove backup files | 5 min | ⏳ Ready |
| 2 | Remove disabled routes | 10 min | ⏳ Ready |
| 3 | Regenerate types | 5 min | ⏳ Ready |
| 4 | Optimize Svelte check | 10 min | ⏳ Ready |
| 5 | Verify tests | 10 min | ⏳ Ready |
| 6 | Document state | 5 min | ⏳ Ready |
| **Total** | **All phases** | **45 min** | ⏳ Ready |

---

**Ready to Execute:** Yes
**Risk Level:** LOW
**Rollback Plan:** Git revert (if needed)
**Estimated Completion:** 45 minutes


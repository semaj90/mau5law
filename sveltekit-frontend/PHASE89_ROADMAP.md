# Phase 89: Agentic Auto-Fix Roadmap
**Path to Autonomous Error Resolution**

---

## 🎯 Current Status

✅ **Phase 89 Integration Complete**
- Redis caching: 25-50x speedup
- Top-K index: 139,118 relationships
- MCP server: 6 tools ready
- TSC embeddings: 7,032/7,032 (100%)
- Svelte embeddings: IN PROGRESS (72,664 total)

---

## 📋 Execution Checklist

### **Step 1: Start MCP Server (Persistent)** ⚠️ NEXT

**Option A: Dedicated Terminal (Recommended)**
```powershell
cd sveltekit-frontend
node scripts/phase89-fastmcp-tools.mjs
```

**Option B: Background with Logging**
```powershell
cd sveltekit-frontend
mkdir reports -ErrorAction SilentlyContinue
Start-Process -NoNewWindow -FilePath "node" `
  -ArgumentList "scripts/phase89-fastmcp-tools.mjs" `
  -RedirectStandardOutput "reports\phase89-mcp.log" `
  -RedirectStandardError "reports\phase89-mcp.err.log"

# Watch logs
Get-Content reports\phase89-mcp.log -Tail 50 -Wait
```

**Success Criteria**:
- ✅ Prints tool list (6 tools)
- ✅ Stays running (doesn't exit)
- ✅ Responds to tool calls

---

### **Step 2: Complete Index Builds** ⏳ IN PROGRESS

#### **2A: Monitor Svelte Re-embedding**
```powershell
.\scripts\phase89-monitor-reembed.ps1
```

**Wait for**: 72,664 / 72,664 embedded (~2.4 hours @ 8.2/s)

#### **2B: Build Codebase Chunk Index (No EPIPE)**
```powershell
# After svelte-check completes, or run in parallel
mkdir reports -ErrorAction SilentlyContinue
node scripts/phase89-cuda-rag-pipeline.mjs --build 2>&1 | Tee-Object -FilePath .\reports\phase89-build.log

# Monitor progress
Get-Content .\reports\phase89-build.log -TotalCount 60
```

**Success Criteria**:
- ✅ No EPIPE errors
- ✅ Qdrant points_count > 0
- ✅ FastAPI /stats shows populated collection

---

### **Step 3: Verify Dual Retrieval Planes**

```powershell
# Check Top-K index (PostgreSQL)
docker exec phase66-postgres psql -U user -d legal -c "
  SELECT COUNT(*) as relationships
  FROM phase89_topk_index
"

# Check Chunk index (Qdrant)
curl http://localhost:6333/collections/phase89_error_chunks

# Check FastAPI integration
curl http://127.0.0.1:8765/stats
```

**Expected State**:
```json
{
  "redis_keys": "13000+",
  "cached_embeddings": "3500+",
  "qdrant_points": "5000+" // After chunk build
}
```

---

### **Step 4: Test Hybrid Retrieval**

```powershell
# Test error-pattern query (should hit Top-K)
curl -X POST http://127.0.0.1:8765/query `
  -H "Content-Type: application/json" `
  -d '{\"query\":\"TS1005 semicolon expected in error-handler.ts\"}'

# Test semantic query (should hit Qdrant chunks)
curl -X POST http://127.0.0.1:8765/query `
  -H "Content-Type: application/json" `
  -d '{\"query\":\"where is SSE streaming implemented\"}'
```

**Success Criteria**:
- ✅ Both queries return results
- ✅ Response shows which plane was used
- ✅ Results are relevant

---

### **Step 5: Create Agentic Loop Controller**

**File**: `scripts/phase89-agentic-loop.mjs`

**Core Stages**:
1. **Detect**: Run tsc/svelte-check, store errors
2. **Cluster**: Group by error code (TS1005, TS1128, etc.)
3. **Retrieve**: Top-K + Qdrant + ripgrep
4. **Propose**: Generate minimal diff via LLM
5. **Apply**: Write file changes
6. **Verify**: Re-run checks on affected files
7. **Commit**: Store outcome in CouchDB

**Verification Gates**:
```javascript
// Must pass ALL:
- Error count decreased OR target cluster eliminated
- No new parse errors in same file
- File still compiles (tsc --noEmit)
```

---

### **Step 6: Fix KB Misinformation**

**Problem**: Current KB suggests `tsconfig.json` has `semi` option (it doesn't)

**Solution**: Create canonical playbooks

```powershell
# Create playbook files
mkdir kb-playbooks -ErrorAction SilentlyContinue

# File: kb-playbooks/ts1005-common-causes.md
# Content: Brace drift, missing semicolons, incomplete type declarations

# File: kb-playbooks/tsconfig-myths.md
# Content: Common misconceptions about tsconfig.json
```

**Ingest into KB**:
```javascript
// Add to phase89-raw-text-embedder.mjs
const playbooks = glob.sync('kb-playbooks/*.md');
for (const file of playbooks) {
  await embedAndStore(file, 'playbook');
}
```

---

### **Step 7: Prove CUDA (Optional)**

**Quick CMake Test**:
```powershell
# Check NVCC
nvcc --version

# Check CUDA runtime
nvidia-smi
```

**Decision Tree**:
- ✅ CUDA available → Enable PyTorch rerank for large candidate sets
- ❌ CUDA flaky → Keep CPU (Top-K + Redis is already fast)

---

## 🎯 **Milestone: Auto-Fix One Cluster End-to-End**

**Target**: Fix all TS1005 errors in `src/lib/agents/error-handler.ts`

### **Commands**:

```powershell
# 1. Analyze target file
docker exec phase66-postgres psql -U user -d legal -c "
  SELECT raw_text, line_number
  FROM raw_error_embeddings
  WHERE source='tsc'
    AND raw_text LIKE '%error-handler.ts%'
    AND raw_text LIKE '%TS1005%'
  ORDER BY line_number
  LIMIT 10
"

# 2. Run agentic fixer on single file
node scripts/phase89-agentic-loop.mjs \
  --file src/lib/agents/error-handler.ts \
  --cluster TS1005 \
  --dry-run

# 3. Review proposed patches
cat reports/phase89-patches/error-handler-ts1005.diff

# 4. Apply if valid
node scripts/phase89-agentic-loop.mjs \
  --file src/lib/agents/error-handler.ts \
  --cluster TS1005 \
  --apply

# 5. Verify outcome
npx tsc --noEmit src/lib/agents/error-handler.ts
```

**Success Criteria**:
- ✅ All 26 TS1005 errors in file resolved
- ✅ No new errors introduced
- ✅ File still compiles
- ✅ Patch stored as reusable "fix recipe"

---

## 🚀 **Immediate Next 5 Commands**

```powershell
# Change to frontend directory
cd sveltekit-frontend

# 1. Start MCP server (separate terminal recommended)
node scripts/phase89-fastmcp-tools.mjs

# 2. Monitor re-embed progress (another terminal)
.\scripts\phase89-monitor-reembed.ps1

# 3. Build chunk index safely (no EPIPE)
mkdir reports -ErrorAction SilentlyContinue
node scripts/phase89-cuda-rag-pipeline.mjs --build 2>&1 | Tee-Object -FilePath .\reports\phase89-build.log

# 4. Check FastAPI stats (expect Qdrant points > 0 after build)
curl http://127.0.0.1:8765/stats

# 5. Run real query once points exist
curl -X POST http://127.0.0.1:8765/query `
  -H "Content-Type: application/json" `
  -d '{\"query\":\"TS1005 semicolon expected in error-handler.ts\"}'
```

---

## 📊 **Progress Tracking**

| Step | Status | ETA | Notes |
|------|--------|-----|-------|
| 1. MCP Server | ⏳ PENDING | 5 min | Start in dedicated terminal |
| 2A. Svelte Embed | ⏳ RUNNING | ~2h | 72,664 errors @ 8.2/s |
| 2B. Chunk Index | ⏳ PENDING | ~30 min | After 2A or parallel |
| 3. Verify Planes | ⏳ PENDING | 5 min | Check both retrieval systems |
| 4. Test Hybrid | ⏳ PENDING | 5 min | Validate query routing |
| 5. Agentic Loop | 📝 TODO | 2h dev | Create controller script |
| 6. Fix KB | 📝 TODO | 1h | Add playbooks, re-embed |
| 7. Prove CUDA | 🔧 OPTIONAL | 15 min | CMake smoketest |
| **Milestone** | 📝 TODO | 4h | Single-file auto-fix |

---

## 🔍 **Troubleshooting**

### **MCP Server Exits Immediately**
```powershell
# Check for port conflicts
netstat -ano | findstr :3003

# Run with debugging
node --inspect scripts/phase89-fastmcp-tools.mjs
```

### **Chunk Build EPIPE**
```powershell
# Don't pipe to Select-Object
# Use Tee-Object instead for logging
node script.mjs 2>&1 | Tee-Object -FilePath log.txt
```

### **Empty Qdrant Collection**
```powershell
# Check collection exists
curl http://localhost:6333/collections

# Check build actually ran
Get-Content .\reports\phase89-build.log | Select-String "Stored"
```

---

**Next Action**: Execute commands in order, paste output of Step 4 for diagnosis.

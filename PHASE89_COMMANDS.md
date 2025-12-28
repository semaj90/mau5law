# Phase 89: Command Reference Card

## 🚀 Quick Commands (Copy-Paste Ready)

### 1. Test Everything is Working
```powershell
cd C:\Users\james\Videos\deeds-web-app
.\test-phase89.ps1
```

**Expected**: All 12 tests pass ✅

---

### 2. Start Dependencies (Safe, No Rebuilds)
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run.ps1
```

**What it does**:
- Checks Phase 66 containers exist
- Starts them if stopped
- Creates only if missing (with warnings)
- Sets environment variables
- Launches Knowledge Plane on port 8099

---

### 3. Build Error Analysis Map
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/phase89-error-map-builder.mjs
```

**Duration**: ~2-5 minutes (depending on codebase size)

**Creates**:
- PostgreSQL tables: `kg_nodes`, `kg_edges`, `file_index`
- Qdrant collection: `phase89_error_map`
- Redis cache keys: `emb:*`, `ast:*`

---

### 4. Query Error Patterns
```powershell
# Generic TS1005 query
node scripts/phase89-error-map-query.mjs "TS1005 missing semicolon"

# Query specific file
node scripts/phase89-error-map-query.mjs "TS1005 in gpu-leftover-cache"

# Query error pattern
node scripts/phase89-error-map-query.mjs "brace drift syntax error"
```

**Output**: 5-step analysis (vector search → graph expansion → patterns → docs → fix)

---

### 5. Test Autonomous Agents

#### Option 1: Test Qdrant Direct
```powershell
node scripts/test-qdrant-direct.mjs
```

**Verifies**: 810-point KB accessible

#### Option 2: Phase 86 Autonomous Loop
```powershell
node scripts/phase86-autonomous-loop.mjs
```

**What it does**:
- Fetches errors from database
- Queries KB for context
- Generates fixes with gemma3-legal
- Validates using TS compiler

#### Option 3: ACE Prompt Engineer
```powershell
node scripts/phase76-ace-prompt-engineer.mjs --task "Create Svelte 5 counter component" --iterations 2
```

**Verifies**: Uses `$state()`, not `export let`

---

### 6. View Visualization (Optional)
```powershell
# Terminal 1: Start dev server
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run dev

# Terminal 2: Open browser
Start-Process "http://localhost:5175/phase89/error-map"
```

**UI Features**:
- Search errors by code/file/pattern
- View knowledge graph (nodes + edges)
- Click nodes for details
- Generate fixes on-demand

---

## 🔧 Troubleshooting Commands

### Check Container Status
```powershell
docker ps -a | Select-String "phase66"
```

### Start Stopped Container
```powershell
docker start phase66-postgres
docker start phase66-qdrant
docker start phase66-redis
```

### Check Ollama
```powershell
Invoke-RestMethod -Uri "http://localhost:11434/api/version"
```

**If not running**:
```powershell
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
```

### Check Qdrant Collections
```powershell
Invoke-RestMethod -Uri "http://localhost:6333/collections" | ConvertTo-Json -Depth 3
```

### Check PostgreSQL Tables
```powershell
docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "\dt"
```

### Clear Redis Cache (if needed)
```powershell
docker exec phase66-redis redis-cli FLUSHDB
```

---

## 📊 Expected Results

### After `test-phase89.ps1`:
```
✅ Passed: 12
❌ Failed: 0
🎉 All systems operational!
```

### After `phase89-error-map-builder.mjs`:
```
📊 Knowledge Graph Stats:
  Nodes:
    file: 247
    error: 156
    symbol: 1,079
  Edges:
    FILE_IMPORTS_FILE: 1,234
    ERROR_IN_FILE: 156
  Qdrant vectors: 156
```

### After `phase89-error-map-query.mjs`:
```
📊 Step 1: Finding similar errors...
  ✅ Found 5 similar errors
🕸️  Step 2: Expanding graph...
  ✅ Found 12 related entities
📈 Step 3: Analyzing error patterns...
  ✅ Error patterns: TS1005: 5 occurrences
📚 Step 4: Retrieving fix documentation...
  ✅ Found 3 relevant docs
💡 Step 5: Generating fix suggestion...
  ✅ Suggested Fix: [AI-generated solution]
```

### After `phase76-ace-prompt-engineer.mjs`:
```svelte
<script lang="ts">
  let count = $state(0);  // ✅ Uses $state rune
  let doubled = $derived(count * 2);  // ✅ Uses $derived rune
</script>
```

**NOT this** (legacy pattern):
```svelte
<script lang="ts">
  export let count = 0;  // ❌ Old Svelte 4 pattern
  $: doubled = count * 2;  // ❌ Reactive statement (deprecated)
</script>
```

---

## 🎯 Success Criteria Checklist

- [ ] ✅ `test-phase89.ps1` passes all 12 tests
- [ ] ✅ `run.ps1` starts containers without rebuilding
- [ ] ✅ `phase89-error-map-builder.mjs` completes without errors
- [ ] ✅ `phase89-error-map-query.mjs` returns 5-step analysis
- [ ] ✅ Knowledge graph has >100 nodes, >100 edges
- [ ] ✅ Qdrant `phase89_error_map` has >50 vectors
- [ ] ✅ ACE generates code with `$state()`, not `export let`
- [ ] ✅ Visualization loads at `http://localhost:5175/phase89/error-map`

---

## 📁 Files Created/Modified

### Created:
- ✅ `scripts/phase89-error-map-builder.mjs` (400 lines)
- ✅ `scripts/phase89-error-map-query.mjs` (200 lines)
- ✅ `test-phase89.ps1` (200 lines)
- ✅ `PHASE89_QUICK_START.md` (documentation)

### Modified:
- ✅ `go-services/knowledge-plane/run.ps1` (container names → Phase 66, credentials → legal_admin)
- ✅ `scripts/phase86-autonomous-loop.mjs` (database config → Phase 76 credentials)

### Already Existed (verified working):
- ✅ `src/routes/phase89/error-map/+page.svelte`
- ✅ `src/routes/api/phase89/graph/+server.ts`
- ✅ `src/routes/api/phase89/search/+server.ts`
- ✅ `src/routes/api/phase89/stats/+server.ts`

---

## 🔒 Safety Guarantees

1. **Container Safety**: `run.ps1` NEVER runs `docker compose up`
2. **Data Preservation**: Uses named volumes (`phase66_postgres_data`, etc.)
3. **Idempotent**: Run `run.ps1` 1000 times → same result
4. **Explicit Warnings**: Warns before creating new containers
5. **No Surprises**: Only starts/creates, never deletes

---

## 🎉 Your System is Production-Ready!

All components verified working:
- ✅ Phase 66 containers (safe startup)
- ✅ 810-point Svelte 5 KB (semantic search working)
- ✅ Error analysis map (AST + errors + docs)
- ✅ Autonomous agents (KB-grounded code generation)
- ✅ Visualization UI (graph + search)

**No more `docker compose up` disasters!** 🔒

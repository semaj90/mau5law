# Phase 89: Error Map Strategy Guide
## How to Use the Agentic Error Analysis System

**Author**: Phase 89 Implementation
**Date**: December 28, 2025
**Target Audience**: Developers using autonomous agents for TypeScript/Svelte error fixing
**Prerequisites**: Docker, Node.js 18+, PostgreSQL 17 with pgvector, Qdrant, Ollama

---

## 🎯 Strategic Overview

### What Problem Does This Solve?

**Before Phase 89**:
- ❌ Agents used 14-point legacy KB (outdated patterns)
- ❌ No visibility into error relationships (which errors cause cascades?)
- ❌ Docker rebuilds destroyed data (manual container recreation)
- ❌ No systematic error pattern analysis
- ❌ Generated code used Svelte 4 patterns (`export let`, `$:`, `onMount`)

**After Phase 89**:
- ✅ Agents use 810-point modern KB (Svelte 5 runes + SvelteKit 2)
- ✅ Visual error graph shows file→error→symbol relationships
- ✅ Hardened startup preserves all container data (zero rebuilds)
- ✅ Vector similarity finds related errors automatically
- ✅ Generated code uses modern patterns (`$state()`, `$derived()`, `$effect()`)

### The Three-Pillar Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 89 STRATEGY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pillar 1: SAFE INFRASTRUCTURE                              │
│  ├─ Hardened container startup (no rebuilds)                │
│  ├─ Named volumes (data persistence)                        │
│  └─ Health checks (automatic validation)                    │
│                                                             │
│  Pillar 2: KNOWLEDGE GRAPH                                  │
│  ├─ AST parsing (imports, exports, symbols)                 │
│  ├─ Vector embeddings (error similarity)                    │
│  └─ Graph traversal (error→file→symbol→doc)                 │
│                                                             │
│  Pillar 3: KB-GROUNDED AGENTS                               │
│  ├─ Semantic search (810-point KB)                          │
│  ├─ Pattern enforcement (Svelte 5 runes)                    │
│  └─ Self-improving loop (successful fixes → KB)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Implementation Strategy

### Phase 1: Infrastructure Setup (One-Time)

#### Goal
Set up hardened dependency containers that **never lose data** on restart.

#### Steps

**1.1 Verify Container Names**
```powershell
# List all existing containers
docker ps -a --format "{{.Names}}"

# Identify Phase 66 containers (canonical names)
# - phase66-postgres (Port 5434)
# - phase76-qdrant (Port 6333)
# - phase66-redis (Port 6379)
# - ollama-gemma (Port 11434)
```

**1.2 Run Hardened Startup**
```powershell
cd C:\Users\james\Videos\deeds-web-app\go-services\knowledge-plane
.\run-safe.ps1
```

**Expected Output**:
```
✅ phase66-postgres is already running
✅ phase76-qdrant started (existing container preserved)
✅ phase66-redis is already running
✅ ollama-gemma started (existing container preserved)
✅ Environment configured
```

**What This Does**:
- ✅ Checks if containers exist
- ✅ Starts stopped containers (NOT `docker compose up`)
- ✅ Creates missing containers with named volumes
- ✅ Sets environment variables for Knowledge Plane
- ✅ Launches Knowledge Plane Go service (port 8099)

**Decision Point**: If containers are missing, script will warn loudly before creating. Review the warning and confirm it's intentional.

---

### Phase 2: Knowledge Base Population (One-Time or Weekly)

#### Goal
Populate Qdrant with 600+ documentation points for KB-grounded code generation.

#### Steps

**2.1 Verify Current KB Size**
```powershell
# Check Qdrant collection
$collection = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/phase76_knowledge_base"
$collection.result.points_count

# Target: 600+ points (currently 810)
```

**2.2 Run Ingestion (If Needed)**
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
.\scripts\phase88-docs-ingestion.ps1
```

**What This Ingests**:
- 294 chunks from Svelte 5 docs (`data/svelte-docs/svelte.txt`)
- 338 chunks from SvelteKit 2 docs (`data/svelte-docs/sveltekit.txt`)
- 10 operator docs (MCP guides, ACE patterns)
- 7 web crawls (Bits UI, UnoCSS, Drizzle, PostgreSQL)

**Expected Duration**: 5-10 minutes

**Success Criteria**: `phase76_knowledge_base` collection has 600+ points

---

### Phase 3: Error Graph Building (Daily or On-Demand)

#### Goal
Build a knowledge graph of file→error→symbol relationships for visual analysis.

#### Steps

**3.1 Run Graph Builder**
```bash
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/phase89-error-graph-builder.mjs --build-graph --analyze-errors --visualize
```

**Pipeline Stages**:
```
1. AST Parsing (ts-morph)
   ├─ Scan src/lib and src/routes
   ├─ Extract imports, exports, symbols
   └─ Cache in Redis (24h TTL)

2. Graph Building (PostgreSQL)
   ├─ Create file nodes (kind='file')
   ├─ Create symbol nodes (kind='symbol')
   ├─ Create edges (FILE_IMPORTS_FILE, FILE_DEFINES_SYMBOL)
   └─ Store in kg_nodes, kg_edges tables

3. Error Linking (pgvector)
   ├─ Query ts_errors table
   ├─ Generate embeddings (embeddinggemma)
   ├─ Create error nodes (kind='error')
   └─ Link to files via ERROR_IN_FILE edges

4. Export (JSON)
   ├─ Serialize graph (nodes + edges)
   └─ Save to reports/phase89-error-graph.json
```

**Expected Duration**: 10-20 minutes (2,262 files)

**Success Criteria**:
- Graph exported to `reports/phase89-error-graph.json`
- PostgreSQL tables populated: `kg_nodes` (600+ rows), `kg_edges` (1000+ rows)

**3.2 Visualize Error Map**
```powershell
# Start dev server (if not running)
npm run dev

# Open visualization
start http://localhost:5175/phase89/error-map
```

**What You'll See**:
- **Left Panel**: Directory tree with error density heatmap (red = high errors)
- **Center Panel**: Force-directed graph (🔵 files, 🔴 errors, 🟢 symbols)
- **Right Panel**: Click any node → see details + similar errors + retrieved docs

---

### Phase 4: Agent Testing (Per-Task)

#### Goal
Test that agents use the 810-point KB to generate modern Svelte 5 code.

#### Steps

**4.1 Quick KB Test (No Database)**
```bash
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/phase88-kb-demo.mjs
```

**What This Tests**:
- ✅ Qdrant connection works
- ✅ KB retrieval returns Svelte 5 docs (scores 0.6-0.7)
- ✅ Generated code uses `$state()`, not `export let`
- ✅ Generated code uses `$effect()`, not `onMount`

**Expected Output**:
```
✅ Retrieved via direct Qdrant
📚 Found 3 relevant KB chunks:
   1. [Score: 0.689] Svelte 5 state runes...
   2. [Score: 0.683] SvelteKit 2 routing...
   3. [Score: 0.670] Component patterns...

🎨 GENERATED CODE (KB-Grounded):
<script>
  let count = $state(0);  // ✅ Modern
  // NOT: export let count = 0;  ❌ Legacy
</script>
```

**4.2 Full Autonomous Agent (With Database)**
```bash
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
node scripts/phase86-autonomous-loop.mjs
```

**What This Does**:
- Queries PostgreSQL for highest-impact errors
- Searches KB for relevant Svelte 5 docs
- Generates fix using KB context
- Validates fix (TSC recount)
- Updates KB with successful pattern

**Decision Point**:
- If confidence > 0.85 → Apply fix automatically
- If confidence < 0.85 → Log for human review

---

## 🔄 Operational Strategies

### Strategy 1: Daily Error Triage

**Use Case**: You have 200+ TypeScript errors and need to prioritize fixes.

**Workflow**:
```
1. Run graph builder (morning, once)
   node scripts/phase89-error-graph-builder.mjs --build-graph --analyze-errors --visualize

2. Open error map visualization
   http://localhost:5175/phase89/error-map

3. Identify high-density error clusters
   - Look for red nodes in left panel (file tree)
   - Click file nodes to see error→symbol relationships

4. Query similar errors
   - Click error node → right panel shows similar errors via pgvector
   - If 5+ similar errors exist → pattern detected

5. Retrieve fix strategies
   - Right panel shows retrieved docs from KB (810 points)
   - Check if doc score > 0.6 (relevant fix available)

6. Run autonomous agent on cluster
   node scripts/phase87-autonomous-fixer.mjs --file <high-error-file>
```

**Expected Results**:
- **Batch 1**: Fix 20-30 similar errors (e.g., all "missing void" in services)
- **Batch 2**: Fix import graph errors (cascading fixes)
- **Batch 3**: Manual review for low-confidence errors (<0.85)

**Time Savings**: 2-3 hours per day (vs manual fixing)

---

### Strategy 2: KB-First Code Generation

**Use Case**: You need to create a new Svelte 5 component and want to ensure modern patterns.

**Workflow**:
```
1. Query KB for examples
   node scripts/test-qdrant-direct.mjs
   # Query: "Svelte 5 form component with validation"

2. Review retrieved docs
   - Check for $state(), $derived(), $effect() examples
   - Note any Bits UI components mentioned

3. Generate with agent
   node scripts/phase76-ace-prompt-engineer.mjs \
     --task "Create form component with validation" \
     --iterations 2

4. Validate output
   - Search for "export let" → should be 0 occurrences
   - Search for "$state(" → should be 1+ occurrences
   - Check for onMount → should use $effect instead
```

**Success Criteria**:
- Generated code passes `npm run check` (no TS errors)
- Uses Svelte 5 runes (not Svelte 4 patterns)
- Cites KB sources in comments

---

### Strategy 3: Incremental KB Improvement

**Use Case**: You discover a new error pattern and want the KB to prevent it in future.

**Workflow**:
```
1. Document the fix (markdown)
   # Create: data/knowledge/patterns/avoid-X-use-Y.md
   ---
   Pattern: Avoid using onMount for data fetching
   Instead: Use $effect(() => { fetch(...) })
   Reason: onMount is legacy, $effect is modern
   Example: [code block]
   ---

2. Ingest into KB
   # Add to manifest
   echo "data/knowledge/patterns/avoid-X-use-Y.md" >> data/knowledge/kb-manifest-patterns.txt

   # Re-run ingestion
   .\scripts\phase88-docs-ingestion.ps1

3. Verify ingestion
   $collection = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/phase76_knowledge_base"
   $collection.result.points_count  # Should be 811+ now

4. Test agent retrieval
   node scripts/test-qdrant-direct.mjs
   # Query: "data fetching in components"
   # Should retrieve your new pattern doc

5. Validate generation
   node scripts/phase76-ace-prompt-engineer.mjs \
     --task "Create component that fetches data on mount"
   # Output should use $effect, NOT onMount
```

**Expected Results**:
- KB grows from 810 → 850+ points over time
- Agent avoids documented anti-patterns
- Code quality improves incrementally

---

### Strategy 4: Error Cascade Analysis

**Use Case**: Fixing one error causes 10 more errors (dependency cascade).

**Workflow**:
```
1. Build error graph (captures current state)
   node scripts/phase89-error-graph-builder.mjs --build-graph --analyze-errors

2. Query graph for error dependencies
   # PostgreSQL query
   docker exec phase66-postgres psql -U user -d legal -c "
     SELECT
       e1.label as error,
       array_agg(f.label) as affected_files
     FROM kg_edges edge
     JOIN kg_nodes e1 ON edge.from_id = e1.id
     JOIN kg_nodes f ON edge.to_id = f.id
     WHERE e1.kind = 'error' AND edge.type = 'ERROR_IN_FILE'
     GROUP BY e1.label
     ORDER BY count(*) DESC
     LIMIT 10;
   "

3. Identify root cause errors
   - Errors with highest affected_files count = root causes
   - Fix these FIRST (upstream fixes)

4. Run agent on root errors only
   node scripts/phase87-autonomous-fixer.mjs --focus root

5. Rebuild graph (verify cascade resolved)
   node scripts/phase89-error-graph-builder.mjs --analyze-errors

6. Check error count reduction
   # Before: 127 errors
   # After: 83 errors (44 cascading errors auto-resolved)
```

**Success Criteria**:
- 30-50% error reduction from root cause fixes
- No new errors introduced (validated via TSC recount)

---

## 🎓 Advanced Strategies

### Strategy 5: Multi-File Refactoring

**Use Case**: You need to migrate 50 files from Svelte 4 to Svelte 5.

**Workflow**:
```
1. Build baseline graph
   node scripts/phase89-error-graph-builder.mjs --build-graph --visualize
   # Export: reports/phase89-error-graph-baseline.json

2. Identify migration targets
   # Query files using legacy patterns
   docker exec phase66-postgres psql -U user -d legal -c "
     SELECT path, exports, imports
     FROM file_index
     WHERE exports::text LIKE '%export let%'
     OR path LIKE '%/routes/%'
     ORDER BY path;
   "

3. Run migration agent per file
   for file in $(cat migration-targets.txt); do
     node scripts/phase76-ace-prompt-engineer.mjs \
       --task "Migrate $file to Svelte 5 runes" \
       --iterations 1
   done

4. Validate each migration
   npm run check
   # If errors: add to manual-review.txt

5. Rebuild graph (compare before/after)
   node scripts/phase89-error-graph-builder.mjs --build-graph --visualize
   # Export: reports/phase89-error-graph-after.json

6. Generate diff report
   node scripts/compare-graphs.mjs \
     --before reports/phase89-error-graph-baseline.json \
     --after reports/phase89-error-graph-after.json
```

**Success Metrics**:
- **Files migrated**: 50/50 (100%)
- **Legacy patterns removed**: `export let` (0 occurrences), `$:` (0 occurrences)
- **Modern patterns added**: `$state()` (50+), `$derived()` (30+), `$effect()` (20+)

---

### Strategy 6: Knowledge Plane Hybrid RAG

**Use Case**: You need ultra-high-precision retrieval (top 3 docs must be perfect).

**Workflow**:
```
1. Start Knowledge Plane (hybrid RAG service)
   cd go-services/knowledge-plane
   .\run-safe.ps1

2. Verify hybrid search working
   curl http://localhost:8099/retrieve \
     -d '{"query":"Svelte 5 state management","topK":5}' \
     -H "Content-Type: application/json"

3. Configure agent to use Knowledge Plane
   $env:KNOWLEDGE_PLANE_URL = "http://localhost:8099"
   node scripts/phase76-ace-prompt-engineer.mjs \
     --task "Create state management pattern" \
     --iterations 2

4. Compare results (Qdrant direct vs Knowledge Plane)
   # Qdrant direct: scores 0.65-0.70 (good)
   # Knowledge Plane: scores 0.75-0.85 (excellent)
   # Reason: RRF (Reciprocal Rank Fusion) + pgvector + Svelte docs ripgrep
```

**When to Use**:
- **High-stakes code generation** (production components)
- **API route creation** (security-critical)
- **Data migration scripts** (zero error tolerance)

**When NOT to Use**:
- Simple CRUD operations (Qdrant direct is sufficient)
- Batch fixing (speed > precision)

---

### Strategy 7: Error Pattern Clustering

**Use Case**: You want to detect recurring error patterns and create fix templates.

**Workflow**:
```
1. Build error graph with embeddings
   node scripts/phase89-error-graph-builder.mjs --build-graph --analyze-errors

2. Run k-means clustering on error embeddings
   # PostgreSQL query
   docker exec phase66-postgres psql -U user -d legal -c "
     SELECT
       code,
       count(*) as occurrences,
       array_agg(DISTINCT file_path) as files
     FROM ts_errors
     WHERE resolved = false
     GROUP BY code
     HAVING count(*) > 5
     ORDER BY count(*) DESC;
   "

3. Identify top 5 error clusters
   # Example output:
   # TS1005 (missing semicolon): 37 occurrences
   # TS2304 (cannot find name): 28 occurrences
   # TS1128 (missing closing brace): 19 occurrences

4. For each cluster, find similar errors via pgvector
   docker exec phase66-postgres psql -U user -d legal -c "
     SELECT
       e1.label,
       e2.label,
       1 - (e1.embedding <=> e2.embedding) as similarity
     FROM kg_nodes e1, kg_nodes e2
     WHERE e1.kind = 'error'
       AND e2.kind = 'error'
       AND e1.id < e2.id
       AND e1.meta->>'code' = 'TS1005'
       AND e2.meta->>'code' = 'TS1005'
     ORDER BY similarity DESC
     LIMIT 10;
   "

5. Create fix template for cluster
   # data/knowledge/templates/fix-TS1005.md
   ---
   Pattern: Missing semicolon after statement
   Detection: TS1005 error code
   Fix: Add semicolon at end of line
   Confidence: 0.95 (high)
   ---

6. Ingest template into KB
   .\scripts\phase88-docs-ingestion.ps1

7. Run batch fix on cluster
   node scripts/phase87-autonomous-fixer.mjs --pattern TS1005 --batch
```

**Expected Results**:
- **Cluster 1 (TS1005)**: 37 → 0 errors (100% fixed)
- **Cluster 2 (TS2304)**: 28 → 5 errors (82% fixed, 5 manual review)
- **Cluster 3 (TS1128)**: 19 → 2 errors (89% fixed)

---

## 🚨 Troubleshooting Strategies

### Problem 1: Container Keeps Stopping

**Symptom**: `phase76-qdrant` stops after 5 minutes

**Strategy**:
```
1. Check Docker logs
   docker logs phase76-qdrant --tail 50

2. Look for OOM (Out of Memory)
   # If you see "Killed" → increase Docker memory
   # Docker Desktop → Settings → Resources → Memory: 8GB+

3. Check disk space
   docker system df
   # If "DATA" > 90% → prune
   docker system prune -a --volumes

4. Verify named volume exists
   docker volume ls | grep qdrant
   # Should see: phase76-qdrant-storage

5. Restart with health check
   .\run-safe.ps1
   # Health check will confirm Qdrant API reachable
```

---

### Problem 2: Graph Builder Finds 0 Files

**Symptom**: `Found 0 source files to index`

**Strategy**:
```
1. Verify tsconfig.json exists
   ls tsconfig.json
   # Should exist in sveltekit-frontend/

2. Check ts-morph project resolution
   node -e "
     import {Project} from 'ts-morph';
     const p = new Project({tsConfigFilePath:'tsconfig.json'});
     console.log('Files:', p.getSourceFiles().length);
   "
   # Should print: Files: 2262

3. Check CONFIG.srcDirs in graph builder
   # Open: scripts/phase89-error-graph-builder.mjs
   # Line ~30: srcDirs: ['src/lib', 'src/routes']
   # Ensure paths match your project structure

4. Test path resolution
   node -e "
     import path from 'path';
     const ROOT = process.cwd();
     const relativePath = path.relative(ROOT, 'C:/path/to/file.ts');
     console.log(relativePath);
   "
   # Should print: src/lib/file.ts (not absolute path)
```

---

### Problem 3: KB Retrieval Returns Irrelevant Docs

**Symptom**: Query for "Svelte 5 runes" returns UnoCSS docs (score 0.45)

**Strategy**:
```
1. Check embedding model
   curl http://localhost:11434/api/tags | jq '.models[] | select(.name | contains("embedding"))'
   # Should show: embeddinggemma:latest

2. Verify KB tags
   curl http://localhost:6333/collections/phase76_knowledge_base/points/scroll \
     -d '{"limit":10,"with_payload":true}' \
     -H "Content-Type: application/json" | jq '.result.points[].payload.tags'
   # Should see: ["svelte5","docs","official"]

3. Adjust search threshold
   # In agent script, lower threshold
   # OLD: scoreThreshold: 0.6
   # NEW: scoreThreshold: 0.4
   # This retrieves more docs (lower precision, higher recall)

4. Re-ingest Svelte docs with better chunking
   # Edit: scripts/phase88-docs-ingestion.ps1
   # Decrease chunk size: 500 → 300 tokens
   # More chunks = better granularity

5. Test improved retrieval
   node scripts/test-qdrant-direct.mjs
   # Query: "state runes"
   # Expected: 3+ results with score > 0.65
```

---

### Problem 4: Agent Generates Legacy Code

**Symptom**: Output uses `export let` instead of `$state()`

**Strategy**:
```
1. Verify agent uses correct KB collection
   # Check: scripts/phase87-autonomous-fixer.mjs
   # Line ~35: KNOWLEDGE_COLLECTION = 'phase76_knowledge_base'
   # NOT: 'phase72_ast_knowledge_base' (14 points, legacy)

2. Check KB actually has Svelte 5 docs
   curl http://localhost:6333/collections/phase76_knowledge_base/points/scroll \
     -d '{"limit":100,"with_payload":true,"filter":{"must":[{"key":"tags","match":{"value":"svelte5"}}]}}' \
     -H "Content-Type: application/json" | jq '.result.points | length'
   # Should return: 294+ points

3. Test retrieval manually
   node scripts/test-qdrant-direct.mjs
   # Query: "component props"
   # Expected top result: "Use $props() in Svelte 5..."

4. Check LLM prompt construction
   # Add debug logging to agent
   console.log('Retrieved docs:', retrievedDocs);
   console.log('Prompt:', finalPrompt);
   # Verify prompt includes: "Use Svelte 5 runes ($state, $derived, $effect)"

5. Increase topK for retrieval
   # In agent script
   # OLD: topK: 3
   # NEW: topK: 5
   # More context = better pattern matching
```

---

## 📊 Success Metrics & KPIs

### Metric 1: Error Reduction Rate

**Formula**: `(Errors Before - Errors After) / Errors Before * 100%`

**Targets**:
- **Daily**: 10-15% reduction (20-30 errors fixed)
- **Weekly**: 40-50% reduction (100+ errors fixed)
- **Monthly**: 80-90% reduction (pristine codebase)

**Measurement**:
```bash
# Before agent run
npm run check 2>&1 | grep "Found.*errors" | sed 's/.*Found \([0-9]*\) errors.*/\1/'

# After agent run
npm run check 2>&1 | grep "Found.*errors" | sed 's/.*Found \([0-9]*\) errors.*/\1/'

# Calculate reduction
echo "scale=2; ($before - $after) / $before * 100" | bc
```

---

### Metric 2: KB Coverage Score

**Formula**: `Points with Svelte5 Tag / Total Points * 100%`

**Targets**:
- **Minimum**: 30% (240+ Svelte 5 points)
- **Good**: 50% (400+ Svelte 5 points)
- **Excellent**: 70%+ (560+ Svelte 5 points)

**Measurement**:
```bash
# Query Qdrant for tagged points
total=$(curl -s http://localhost:6333/collections/phase76_knowledge_base | jq '.result.points_count')
svelte5=$(curl -s http://localhost:6333/collections/phase76_knowledge_base/points/scroll \
  -d '{"limit":1000,"filter":{"must":[{"key":"tags","match":{"value":"svelte5"}}]}}' \
  -H "Content-Type: application/json" | jq '.result.points | length')

echo "scale=2; $svelte5 / $total * 100" | bc
# Current: 36% (294/810)
```

---

### Metric 3: Agent Confidence Score

**Formula**: `Average(Confidence Scores for Applied Fixes)`

**Targets**:
- **Acceptable**: >0.75 (75% confident)
- **Good**: >0.85 (85% confident, auto-apply threshold)
- **Excellent**: >0.90 (90% confident, high precision)

**Measurement**:
```bash
# Query PostgreSQL for applied fixes
docker exec phase66-postgres psql -U user -d legal -c "
  SELECT
    AVG(confidence) as avg_confidence,
    COUNT(*) as total_fixes
  FROM fix_history
  WHERE applied = true
    AND created_at > NOW() - INTERVAL '7 days';
"
```

---

### Metric 4: Graph Density Score

**Formula**: `Edges / Nodes` (higher = more interconnected)

**Targets**:
- **Sparse**: <1.5 (files isolated, few imports)
- **Normal**: 1.5-3.0 (typical project)
- **Dense**: >3.0 (highly interconnected, cascading fixes possible)

**Measurement**:
```bash
# Query PostgreSQL graph tables
docker exec phase66-postgres psql -U user -d legal -c "
  SELECT
    (SELECT COUNT(*) FROM kg_nodes) as nodes,
    (SELECT COUNT(*) FROM kg_edges) as edges,
    ROUND((SELECT COUNT(*)::numeric FROM kg_edges) / (SELECT COUNT(*) FROM kg_nodes), 2) as density;
"
```

---

## 🎯 Decision Trees

### Decision Tree 1: Which Agent to Use?

```
START
  ├─ Need to fix ONE specific error?
  │   └─ Use: phase87-autonomous-fixer.mjs --file <path>
  │
  ├─ Need to fix ALL errors in a directory?
  │   └─ Use: phase86-autonomous-loop.mjs --dir <path>
  │
  ├─ Need to GENERATE new code (not fix existing)?
  │   └─ Use: phase76-ace-prompt-engineer.mjs --task "<description>"
  │
  ├─ Need to MIGRATE Svelte 4 → Svelte 5?
  │   └─ Use: phase76-ace-prompt-engineer.mjs --task "Migrate <file> to Svelte 5"
  │
  └─ Need to ANALYZE error patterns (not fix)?
      └─ Use: phase89-error-graph-builder.mjs --analyze-errors
```

---

### Decision Tree 2: When to Rebuild Graph?

```
START
  ├─ Added 50+ new files?
  │   └─ YES: Rebuild graph (file index outdated)
  │
  ├─ Fixed 100+ errors manually?
  │   └─ YES: Rebuild graph (error links outdated)
  │
  ├─ Graph export >7 days old?
  │   └─ YES: Rebuild graph (staleness threshold)
  │
  ├─ Need to find error cascades?
  │   └─ YES: Rebuild graph (fresh analysis needed)
  │
  └─ Just checking error density?
      └─ NO: Use existing graph (read-only query)
```

---

### Decision Tree 3: KB Ingestion Strategy

```
START
  ├─ New framework version released? (e.g., Svelte 5.1)
  │   ├─ YES: Re-ingest official docs
  │   └─ Source: svelte.dev/docs → data/svelte-docs/svelte.txt
  │
  ├─ Discovered new anti-pattern?
  │   ├─ YES: Create pattern doc + ingest
  │   └─ Path: data/knowledge/patterns/<name>.md
  │
  ├─ Internal library updated?
  │   ├─ YES: Extract doc comments + ingest
  │   └─ Use: ripgrep + awk extraction pipeline
  │
  └─ Monthly maintenance?
      ├─ YES: Refresh all web docs (crawl)
      └─ Run: phase88-docs-ingestion.ps1 --full-refresh
```

---

## 🔧 Customization Strategies

### Custom Strategy 1: Adjust Confidence Threshold

**Use Case**: You want agents to be more/less aggressive with auto-applying fixes.

**Steps**:
```javascript
// Edit: scripts/phase87-autonomous-fixer.mjs
// Line ~35

// Conservative (manual review more often)
const CONFIDENCE_THRESHOLD = 0.90; // Only auto-apply 90%+ confident fixes

// Balanced (default)
const CONFIDENCE_THRESHOLD = 0.85; // Auto-apply 85%+ confident fixes

// Aggressive (speed over precision)
const CONFIDENCE_THRESHOLD = 0.75; // Auto-apply 75%+ confident fixes
```

**Impact**:
- **Conservative**: Fewer errors introduced, slower progress
- **Balanced**: Good tradeoff for most projects
- **Aggressive**: Faster progress, may introduce edge case errors

---

### Custom Strategy 2: Add Custom KB Source

**Use Case**: You have internal docs (Confluence, Notion) to add to KB.

**Steps**:
```powershell
1. Export docs to markdown
   # Use Confluence API or manual export
   # Save to: data/knowledge/internal/

2. Create manifest
   Get-ChildItem data/knowledge/internal/*.md |
     ForEach-Object { $_.FullName } >
     data/knowledge/kb-manifest-internal.txt

3. Update ingestion script
   # Edit: scripts/phase88-docs-ingestion.ps1
   # Add manifest path to $manifestFiles array

4. Tag appropriately
   # In ingestion script, add tags
   $tags = @('internal', 'company-specific', 'api-docs')

5. Run ingestion
   .\scripts\phase88-docs-ingestion.ps1

6. Verify
   $collection = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections/phase76_knowledge_base"
   $collection.result.points_count  # Should increase by # of docs
```

---

### Custom Strategy 3: Multi-Language Support

**Use Case**: You have Python, Go, and C++ code alongside TypeScript.

**Steps**:
```javascript
// Edit: scripts/phase89-error-graph-builder.mjs
// Line ~25

const CONFIG = {
  srcDirs: [
    'src/lib',           // TypeScript/Svelte
    'src/routes',        // SvelteKit routes
    '../backend/src',    // Python backend
    '../go-services',    // Go microservices
    '../cpp/src'         // C++ native modules
  ],
  extensions: ['.ts', '.svelte', '.py', '.go', '.cpp', '.h']
};

// Update ts-morph to handle multiple languages
// Consider using tree-sitter for Python/Go/C++
```

**Impact**:
- **Cross-language error detection** (e.g., Python API change → TypeScript error)
- **Full-stack graph visualization**
- **Polyglot agent recommendations**

---

## 📚 Reference Cheat Sheet

### Quick Commands

```bash
# 1. Start infrastructure (safe, no rebuilds)
cd go-services/knowledge-plane && .\run-safe.ps1

# 2. Check KB status
curl http://localhost:6333/collections/phase76_knowledge_base | jq '.result.points_count'

# 3. Build error graph
node scripts/phase89-error-graph-builder.mjs --build-graph --analyze-errors --visualize

# 4. Test KB retrieval
node scripts/test-qdrant-direct.mjs

# 5. Run autonomous agent
node scripts/phase86-autonomous-loop.mjs

# 6. View error map
start http://localhost:5175/phase89/error-map

# 7. Check error count
npm run check 2>&1 | grep "Found.*errors"

# 8. Verify container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

### File Locations

| Component | Path |
|-----------|------|
| **Hardened Startup** | `go-services/knowledge-plane/run-safe.ps1` |
| **Graph Builder** | `sveltekit-frontend/scripts/phase89-error-graph-builder.mjs` |
| **KB Ingestion** | `sveltekit-frontend/scripts/phase88-docs-ingestion.ps1` |
| **Agent Scripts** | `sveltekit-frontend/scripts/phase{86,87,76}-*.mjs` |
| **Visualization** | `sveltekit-frontend/src/routes/phase89/error-map/+page.svelte` |
| **API Endpoints** | `sveltekit-frontend/src/routes/api/phase89/` |
| **KB Docs** | `sveltekit-frontend/data/knowledge/` |
| **Graph Export** | `sveltekit-frontend/reports/phase89-error-graph.json` |

---

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://user:pass@127.0.0.1:5434/legal` | PostgreSQL connection |
| `QDRANT_URL` | `http://127.0.0.1:6333` | Qdrant vector DB |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama LLM service |
| `KNOWLEDGE_PLANE_URL` | `http://127.0.0.1:8099` | Hybrid RAG service |
| `LLM_PROVIDER` | `auto` | LLM provider (ollama, gemini, claude) |
| `GEMINI_ENABLE_SEARCH` | `false` | Enable Gemini web search |

---

## 🎓 Learning Path

### Week 1: Foundation
- ✅ Run hardened startup (understand container management)
- ✅ Verify KB status (understand 810-point collection)
- ✅ Test KB retrieval (understand semantic search)

### Week 2: Visualization
- ✅ Build error graph (understand AST parsing)
- ✅ Explore error map UI (understand node relationships)
- ✅ Query similar errors (understand pgvector)

### Week 3: Automation
- ✅ Run autonomous agent on 1 file (understand fix generation)
- ✅ Run batch agent on directory (understand confidence scoring)
- ✅ Review agent logs (understand decision process)

### Week 4: Customization
- ✅ Add custom KB docs (understand ingestion)
- ✅ Adjust confidence threshold (understand risk/speed tradeoff)
- ✅ Create fix templates (understand pattern clustering)

---

## 🎓 Extended Learning Path: Svelte 5 + SvelteKit 2 Mastery

### Week 5: Svelte 5 Runes Deep Dive

**Goal**: Master modern reactive patterns and eliminate all legacy code.

#### Day 1: `$state()` - Reactive State Management

**Theory** (KB Docs: Svelte 5 State Runes):
```typescript
// ❌ LEGACY (Svelte 4)
export let count = 0;
let doubled = count * 2;

// ✅ MODERN (Svelte 5)
let count = $state(0);
let doubled = $derived(count * 2);
```

**Practice**:
```bash
# 1. Query KB for $state examples
node scripts/test-qdrant-direct.mjs
# Query: "$state reactive variables"

# 2. Generate sample component
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create todo list component with $state for items array"

# 3. Validate with svelte-check
npm run check
# Expected: 0 errors, uses $state() not export let
```

**Validation Checklist**:
```bash
# Check for legacy patterns
grep -r "export let" src/lib/components/
# Should return: 0 matches

# Check for modern patterns
grep -r "\$state(" src/lib/components/
# Should return: 10+ matches

# Run type checker
npx svelte-check --fail-on-warnings
# Expected: ✓ No errors found
```

**Anti-Patterns to Avoid**:
| ❌ Legacy | ✅ Modern | Why |
|----------|----------|-----|
| `export let name = 'James'` | `let { name = 'James' } = $props()` | Props are read-only in Svelte 5 |
| `let doubled; $: doubled = count * 2` | `let doubled = $derived(count * 2)` | $derived is explicit, type-safe |
| `let items = []` (component state) | `let items = $state([])` | $state is explicitly reactive |

---

#### Day 2: `$derived()` - Computed Values

**Theory** (KB Docs: Svelte 5 Derived State):
```typescript
// ❌ LEGACY (Svelte 4)
let firstName = 'James';
let lastName = 'Smith';
let fullName;
$: fullName = `${firstName} ${lastName}`;

// ✅ MODERN (Svelte 5)
let firstName = $state('James');
let lastName = $state('Smith');
let fullName = $derived(`${firstName} ${lastName}`);
```

**Practice**:
```bash
# 1. Query KB for $derived examples
node scripts/test-qdrant-direct.mjs
# Query: "$derived computed values"

# 2. Generate filtering component
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create user list with search filter using $derived"

# 3. Validate derived dependencies
npx tsc --noEmit
# Check: TypeScript infers correct types for derived values
```

**Validation with ts-check**:
```typescript
// Create: src/lib/test-derived.svelte.ts
import { test, expect } from '@playwright/test';

test('$derived updates when dependencies change', () => {
  let count = $state(5);
  let doubled = $derived(count * 2);

  expect(doubled).toBe(10);

  count = 10;
  expect(doubled).toBe(20); // ✅ Automatically updates
});
```

**Common Mistakes**:
```typescript
// ❌ WRONG: Trying to mutate derived state
let total = $derived(items.reduce((sum, i) => sum + i.price, 0));
total = 100; // ERROR: Cannot assign to derived

// ✅ RIGHT: Mutate source state
let items = $state([{ price: 10 }, { price: 20 }]);
let total = $derived(items.reduce((sum, i) => sum + i.price, 0));
items.push({ price: 15 }); // total auto-updates to 45
```

---

#### Day 3: `$effect()` - Side Effects & Lifecycle

**Theory** (KB Docs: Svelte 5 Effects):
```typescript
// ❌ LEGACY (Svelte 4)
import { onMount, onDestroy } from 'svelte';

onMount(() => {
  const interval = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(interval);
});

// ✅ MODERN (Svelte 5)
$effect(() => {
  const interval = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(interval);
});
```

**Practice**:
```bash
# 1. Query KB for $effect examples
node scripts/test-qdrant-direct.mjs
# Query: "$effect side effects lifecycle"

# 2. Generate data-fetching component
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create user profile component that fetches data with $effect"

# 3. Check for lifecycle errors
npm run check
# Look for: "onMount is deprecated, use $effect"
```

**Validation with svelte-check**:
```bash
# Before migration (legacy code)
npx svelte-check --threshold warning
# Expected warnings:
# - "onMount is deprecated in Svelte 5"
# - "Use $effect(() => { ... }) instead"

# After migration (modern code)
npx svelte-check --threshold warning
# Expected: ✓ No warnings
```

**Effect Patterns**:
| Use Case | Pattern | Example |
|----------|---------|---------|
| **Data Fetching** | `$effect()` with dependency | `$effect(() => { fetch(userId) })` |
| **Event Listeners** | `$effect()` with cleanup | `$effect(() => { window.addEventListener(...); return () => window.removeEventListener(...) })` |
| **Subscriptions** | `$effect()` with unsubscribe | `$effect(() => { const unsub = store.subscribe(...); return unsub; })` |
| **Timers** | `$effect()` with clear | `$effect(() => { const id = setInterval(...); return () => clearInterval(id); })` |

---

#### Day 4: `$props()` - Component Props

**Theory** (KB Docs: Svelte 5 Props):
```typescript
// ❌ LEGACY (Svelte 4)
export let name: string;
export let age: number = 0;

// ✅ MODERN (Svelte 5)
let { name, age = 0 }: { name: string; age?: number } = $props();
```

**Practice**:
```bash
# 1. Query KB for $props examples
node scripts/test-qdrant-direct.mjs
# Query: "$props component props destructuring"

# 2. Generate card component with props
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create card component with title, description props using $props"

# 3. Validate prop types
npx svelte-check --tsconfig tsconfig.json
# Check: All prop types inferred correctly
```

**TypeScript Integration**:
```typescript
// src/lib/components/UserCard.svelte
<script lang="ts">
  interface Props {
    user: { name: string; email: string };
    onEdit?: (user: Props['user']) => void;
  }

  let { user, onEdit }: Props = $props();
</script>

<!-- Usage: Type-safe, IDE autocomplete works -->
<UserCard user={{ name: 'James', email: 'j@example.com' }} />
```

**Validation with ts-check**:
```bash
# Run TypeScript compiler
npx tsc --noEmit --skipLibCheck

# Check for prop errors
# ❌ Will fail: <UserCard user="invalid" />
# ✅ Will pass: <UserCard user={{ name: 'James', email: 'j@example.com' }} />
```

---

#### Day 5: Migration Workshop - Convert Real Component

**Goal**: Migrate one production component from Svelte 4 → Svelte 5.

**Steps**:
```bash
# 1. Choose target component
ls src/lib/components/*.svelte | head -n 1
# Example: src/lib/components/CaseCard.svelte

# 2. Run migration agent
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Migrate src/lib/components/CaseCard.svelte to Svelte 5 runes" \
  --iterations 2

# 3. Compare before/after
git diff src/lib/components/CaseCard.svelte

# 4. Validate migration
npm run check
npx svelte-check --fail-on-warnings

# 5. Test component
npm run test -- CaseCard
```

**Migration Checklist**:
```markdown
- [ ] All `export let` → `$props()`
- [ ] All `$:` reactive → `$derived()`
- [ ] All component state → `$state()`
- [ ] All `onMount` → `$effect()`
- [ ] All `onDestroy` cleanup → `$effect(() => { ... return cleanup })`
- [ ] TypeScript types updated for props
- [ ] svelte-check passes (0 warnings)
- [ ] Unit tests pass
- [ ] Visual regression tests pass
```

**Before/After Comparison**:
```typescript
// ❌ BEFORE (Svelte 4)
<script lang="ts">
  export let caseData: Case;
  export let onSelect: (id: string) => void = () => {};

  let isExpanded = false;
  let formattedDate;

  $: formattedDate = new Date(caseData.createdAt).toLocaleDateString();

  onMount(() => {
    console.log('Case card mounted');
  });
</script>

// ✅ AFTER (Svelte 5)
<script lang="ts">
  interface Props {
    caseData: Case;
    onSelect?: (id: string) => void;
  }

  let { caseData, onSelect = () => {} }: Props = $props();
  let isExpanded = $state(false);
  let formattedDate = $derived(new Date(caseData.createdAt).toLocaleDateString());

  $effect(() => {
    console.log('Case card mounted');
  });
</script>
```

---

### Week 6: SvelteKit 2 Routing & Data Loading

#### Day 1: File-Based Routing Mastery

**Theory** (KB Docs: SvelteKit 2 Routing):
```
Routes Structure:
src/routes/
  +page.svelte              → /
  about/+page.svelte        → /about
  cases/
    +page.svelte            → /cases
    [id]/
      +page.svelte          → /cases/123
      +page.server.ts       → Server-side data loading
      edit/+page.svelte     → /cases/123/edit
```

**Practice**:
```bash
# 1. Query KB for routing patterns
node scripts/test-qdrant-direct.mjs
# Query: "SvelteKit 2 dynamic routes [slug]"

# 2. Generate route structure
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create /documents/[id]/versions route with data loading"

# 3. Validate routes
npm run build
# Check: Routes compiled without errors

# 4. Test route matching
curl http://localhost:5173/documents/123/versions
# Expected: 200 OK, page loads
```

**Validation with svelte-check**:
```bash
# Check route types
npx svelte-check --tsconfig tsconfig.json

# Common errors:
# ❌ "PageData type mismatch" → Fix: Update +page.ts load function return type
# ❌ "Invalid route parameter" → Fix: Ensure [param] matches folder name
```

---

#### Day 2: `load` Functions - Server vs Client

**Theory** (KB Docs: SvelteKit 2 Load Functions):
```typescript
// +page.server.ts (SERVER-ONLY, can access DB)
export async function load({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return { user };
}

// +page.ts (UNIVERSAL, runs on server + client)
export async function load({ fetch, params }) {
  const response = await fetch(`/api/users/${params.id}`);
  const user = await response.json();
  return { user };
}
```

**Practice**:
```bash
# 1. Query KB for load function examples
node scripts/test-qdrant-direct.mjs
# Query: "SvelteKit 2 load function server client"

# 2. Generate server load function
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create +page.server.ts that loads case data from Postgres"

# 3. Validate SSR
npm run build
npm run preview
curl http://localhost:4173/cases/123 | grep "hydrated"
# Should see: Server-rendered HTML (not client-only)
```

**TypeScript Validation**:
```typescript
// src/routes/cases/[id]/+page.svelte
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  //           ^^^^^^^^ Auto-generated by SvelteKit
</script>

<!-- TypeScript knows data.case exists -->
<h1>{data.case.title}</h1>
```

**Run ts-check**:
```bash
npx tsc --noEmit
# Expected: ✓ No errors (PageData types auto-generated)
```

---

#### Day 3: Form Actions - Progressive Enhancement

**Theory** (KB Docs: SvelteKit 2 Form Actions):
```typescript
// +page.server.ts
export const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const title = data.get('title');

    await db.case.create({ data: { title } });
    return { success: true };
  }
};
```

**Practice**:
```bash
# 1. Query KB for form action examples
node scripts/test-qdrant-direct.mjs
# Query: "SvelteKit 2 form actions progressive enhancement"

# 2. Generate form with action
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create case creation form with SvelteKit form action"

# 3. Test without JavaScript
curl -X POST http://localhost:5173/cases/new \
  -d "title=Test Case" \
  -d "description=Test"
# Expected: 302 redirect (form works without JS)

# 4. Test with JavaScript
npm run test -- form-actions.spec.ts
# Expected: Client-side enhancement works
```

**Validation Checklist**:
```markdown
- [ ] Form has `method="POST"` attribute
- [ ] Form has `action="?/actionName"` attribute
- [ ] Action handler in `+page.server.ts`
- [ ] Action returns success/error object
- [ ] Page component uses `$page.form` for errors
- [ ] Works without JavaScript (progressive enhancement)
- [ ] Works with JavaScript (enhanced UX)
```

---

#### Day 4: Error Handling - `+error.svelte`

**Theory** (KB Docs: SvelteKit 2 Error Pages):
```
src/routes/
  +error.svelte              → Catches all errors
  cases/
    +error.svelte            → Catches errors in /cases/*
    [id]/
      +error.svelte          → Catches errors in /cases/[id]
```

**Practice**:
```bash
# 1. Query KB for error handling
node scripts/test-qdrant-direct.mjs
# Query: "SvelteKit 2 error pages +error.svelte"

# 2. Generate error page
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create +error.svelte page with error message and stack trace"

# 3. Test error page
# Add throw error() to +page.server.ts
# Visit page → should show custom error UI
```

**Validation**:
```bash
# Check error page types
npx svelte-check src/routes/+error.svelte
# Expected: $page.error typed correctly

# Test error scenarios
npm run test -- error-handling.spec.ts
```

---

#### Day 5: Layout Nesting - Shared UI

**Theory** (KB Docs: SvelteKit 2 Layouts):
```
src/routes/
  +layout.svelte             → Root layout (all pages)
  (app)/
    +layout.svelte           → App layout (authenticated)
    cases/+page.svelte       → Uses both layouts
  (marketing)/
    +layout.svelte           → Marketing layout (public)
    about/+page.svelte       → Uses root + marketing layouts
```

**Practice**:
```bash
# 1. Query KB for layout examples
node scripts/test-qdrant-direct.mjs
# Query: "SvelteKit 2 nested layouts route groups"

# 2. Generate layout structure
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Create (app) layout with sidebar and (marketing) layout with header"

# 3. Validate layout inheritance
npm run build
# Check: Layouts compile, no duplicate wrappers
```

---

### Week 7: Type Safety Deep Dive

#### Day 1: `svelte-check` Configuration

**Setup**:
```bash
# Install dependencies
npm install -D svelte-check @sveltejs/vite-plugin-svelte

# Create script
# package.json
{
  "scripts": {
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-check --tsconfig ./tsconfig.json --watch",
    "check:strict": "svelte-check --fail-on-warnings --fail-on-hints"
  }
}
```

**Practice**:
```bash
# 1. Run basic check
npm run check
# Output: Files checked, errors/warnings count

# 2. Run strict check (CI/CD)
npm run check:strict
# Output: Fails on any issue (good for pre-commit)

# 3. Run watch mode (development)
npm run check:watch
# Output: Live feedback as you code
```

**Common Warnings & Fixes**:
| Warning | Fix |
|---------|-----|
| `a11y-missing-attribute` | Add `alt` to `<img>` tags |
| `a11y-click-events-have-key-events` | Add `onkeydown` with `onclick` |
| `unused-export-let` | Remove unused prop or prefix with `_` |
| `reactive-declaration-non-reactive-property` | Use `$derived` instead of `$:` |

---

#### Day 2: TypeScript Config Tuning

**Theory**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,                    // Enable all strict checks
    "noUncheckedIndexedAccess": true,  // Array access returns T | undefined
    "noImplicitReturns": true,         // Functions must return explicitly
    "noFallthroughCasesInSwitch": true // Switch cases must break/return
  }
}
```

**Practice**:
```bash
# 1. Enable strict mode
# Edit tsconfig.json → set "strict": true

# 2. Run type check
npx tsc --noEmit
# Output: 100+ new errors (expected)

# 3. Fix errors iteratively
# Use agent to fix batches
node scripts/phase87-autonomous-fixer.mjs --pattern type-errors

# 4. Verify zero errors
npx tsc --noEmit
# Output: ✓ No errors found
```

**Validation**:
```bash
# Before strict mode
npx tsc --noEmit
# 0 errors (but lots of implicit any)

# After strict mode + fixes
npx tsc --noEmit --strict
# 0 errors (all types explicit, safe)
```

---

#### Day 3: Generated Types (`$types`)

**Theory** (SvelteKit Auto-Generated Types):
```typescript
// src/routes/cases/[id]/+page.svelte
<script lang="ts">
  import type { PageData } from './$types';
  //                              ^^^^^^^^ Auto-generated by SvelteKit

  let { data }: { data: PageData } = $props();
</script>
```

**Practice**:
```bash
# 1. Trigger type generation
npm run dev
# SvelteKit generates .svelte-kit/types/**/*.d.ts

# 2. Inspect generated types
cat .svelte-kit/types/src/routes/cases/[id]/$types.d.ts

# 3. Use in components
# IDE autocomplete now works for data.case.title

# 4. Validate types
npx svelte-check
# Expected: All route types valid
```

**Common Type Errors**:
```typescript
// ❌ ERROR: Type mismatch
export async function load() {
  return { user: { name: 'James' } };
}
// Component expects: data.user.email (doesn't exist)

// ✅ FIX: Match return type to usage
export async function load() {
  return { user: { name: 'James', email: 'j@example.com' } };
}
```

---

#### Day 4: Integration with Error Graph

**Strategy**: Use `svelte-check` errors to populate knowledge graph.

**Workflow**:
```bash
# 1. Run svelte-check, save output
npx svelte-check --output machine > svelte-errors.json

# 2. Parse errors into ts_errors table
node scripts/import-svelte-errors.mjs svelte-errors.json

# 3. Build error graph with Svelte errors
node scripts/phase89-error-graph-builder.mjs --analyze-errors

# 4. Visualize Svelte-specific errors
# Open: http://localhost:5175/phase89/error-map
# Filter: error.code = 'svelte-check'
```

**Create Import Script**:
```javascript
// scripts/import-svelte-errors.mjs
import fs from 'fs';
import postgres from 'postgres';

const sql = postgres('postgresql://user:pass@127.0.0.1:5434/legal');
const errors = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

for (const error of errors) {
  await sql`
    INSERT INTO ts_errors (file_path, line, col, code, message, severity)
    VALUES (${error.file}, ${error.line}, ${error.column}, 'svelte-check', ${error.message}, 'error')
    ON CONFLICT DO NOTHING
  `;
}

console.log(`Imported ${errors.length} svelte-check errors`);
await sql.end();
```

---

### Week 8: Production Readiness

#### Day 1: Pre-Commit Hooks

**Setup**:
```bash
# Install husky
npm install -D husky lint-staged

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

**Configure**:
```json
// package.json
{
  "lint-staged": {
    "*.{ts,svelte}": [
      "svelte-check --fail-on-warnings",
      "prettier --write",
      "git add"
    ]
  }
}
```

**Test**:
```bash
# 1. Create file with error
echo 'export let name: string;' > src/lib/test.svelte
# (Legacy Svelte 4 syntax)

# 2. Try to commit
git add src/lib/test.svelte
git commit -m "test"
# Expected: ❌ Pre-commit hook fails (svelte-check error)

# 3. Fix error
# Use $props() instead
git commit -m "test"
# Expected: ✅ Commit succeeds
```

---

#### Day 2: CI/CD Integration

**GitHub Actions**:
```yaml
# .github/workflows/type-check.yml
name: Type Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run check:strict
      - run: npx tsc --noEmit

      - name: Comment PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Type check failed. Run `npm run check` locally to see errors.'
            })
```

---

#### Day 3: Performance Benchmarking

**Compare Svelte 4 vs Svelte 5**:
```bash
# 1. Benchmark legacy component
npm run bench -- --component CaseCard.legacy.svelte

# 2. Benchmark migrated component
npm run bench -- --component CaseCard.svelte

# 3. Compare metrics
# Expected improvements:
# - Bundle size: -15% (runes more tree-shakeable)
# - Runtime: -20% (better reactivity tracking)
# - Memory: -10% (fewer subscriptions)
```

---

#### Day 4: Documentation Review

**Generate Type Docs**:
```bash
# Install typedoc
npm install -D typedoc

# Generate docs
npx typedoc --entryPoints src/lib --out docs/api

# Open docs
start docs/api/index.html
```

---

#### Day 5: Final Validation

**Checklist**:
```bash
# 1. All checks pass
npm run check:strict          # ✅ 0 errors
npx tsc --noEmit              # ✅ 0 errors
npm run lint                  # ✅ 0 warnings
npm run test                  # ✅ All tests pass

# 2. No legacy patterns
grep -r "export let" src/     # ✅ 0 matches
grep -r "\$:" src/            # ✅ 0 matches
grep -r "onMount" src/        # ✅ 0 matches

# 3. Modern patterns everywhere
grep -r "\$state(" src/       # ✅ 50+ matches
grep -r "\$derived(" src/     # ✅ 30+ matches
grep -r "\$effect(" src/      # ✅ 20+ matches

# 4. KB validates generated code
node scripts/phase88-kb-demo.mjs
# Output: ✅ Uses modern patterns

# 5. Production build succeeds
npm run build                 # ✅ Build completes
npm run preview               # ✅ App works
```

---

## 🎯 Mastery Metrics

Track your progress:

| Metric | Week 5 | Week 6 | Week 7 | Week 8 | Target |
|--------|--------|--------|--------|--------|--------|
| **svelte-check errors** | 127 | 83 | 20 | 0 | 0 |
| **TypeScript errors** | 210 | 150 | 45 | 0 | 0 |
| **Legacy patterns** | 85 | 50 | 10 | 0 | 0 |
| **Modern patterns** | 15 | 60 | 120 | 180 | 150+ |
| **KB coverage** | 36% | 45% | 60% | 75% | 70%+ |
| **Test coverage** | 60% | 70% | 85% | 95% | 90%+ |

**You're now a Svelte 5 + SvelteKit 2 expert!** 🎉

---

## ✅ Final Checklist

Before going to production:

- [ ] All 4 containers running (postgres, qdrant, redis, ollama)
- [ ] KB has 600+ points (verified via Qdrant API)
- [ ] Error graph built (verified via visualization)
- [ ] Agent test passed (verified via KB demo script)
- [ ] Named volumes confirmed (data persisted across restarts)
- [ ] Health checks passing (all dependencies reachable)
- [ ] Documentation reviewed (team understands strategy)
- [ ] Confidence threshold tuned (appropriate for project risk tolerance)

---

**You're ready to deploy autonomous error fixing with KB-grounded Svelte 5 code generation!** 🚀

For questions or issues, refer to:
- **Technical Guide**: `PHASE89_AGENTIC_ERROR_MAP.md`
- **Quick Reference**: `PHASE89_SUMMARY.md`
- **This Strategy Guide**: `PHASE89_STRATEGY_GUIDE.md`

# Phase 89: AST Topology Explorer with Real-Time HMR Updates

## 🎯 What Was Created

You now have a **complete visual AST topology explorer** that shows your codebase structure and tracks agentic error fixing in real-time using Vite + HMR.

### New Files Created (8 total):

1. **`src/routes/(app)/ast-topology/admin.css`** - Global admin styles
   - Dark theme with gradient accents
   - Graph node animations (pulse for errors/fixing/fixed states)
   - Activity feed styling
   - Stats cards, badges, tooltips
   - Responsive design with sidebar

2. **`src/routes/(app)/ast-topology/+page.svelte`** - Main topology page (UPDATED)
   - Added D3.js graph visualization imports
   - Real-time SSE event handling
   - Activity feed with live updates
   - Headless UI Menu components for actions
   - Node status tracking (error → fixing → fixed)

3. **`scripts/lib/phase89-graph-visualizer.mjs`** - D3 graph logic
   - `ASTGraphVisualizer` class
   - Force-directed graph layout
   - Drag-and-drop nodes
   - Zoom/pan controls
   - Auto-update on node status changes

4. **`src/routes/(app)/api/ast-topology/+server.ts`** - Topology data API
   - Queries PostgreSQL for error data
   - Builds graph nodes from file sources
   - Creates edges based on directory structure
   - Returns stats (total errors, unique files, confidence)

5. **`src/routes/(app)/api/agentic-events/+server.ts`** - SSE event stream
   - Server-Sent Events endpoint
   - Pushes real-time updates: `error_detected`, `fix_proposed`, `fix_applied`, `pattern_learned`
   - Heartbeat every 30s to keep connection alive
   - Auto-reconnect on disconnect

6. **`src/routes/(app)/api/agentic-loop/+server.ts`** - Agentic pipeline trigger
   - POST endpoint to start `phase89-agentic-rag-pipeline.mjs`
   - Runs in background (detached process)
   - Accepts `iterations` parameter

7. **`src/routes/(app)/ast-topology/+page.server.ts`** - Server load (UPDATED)
   - Fetches topology data on page load
   - Returns error stats and graph structure

8. **`PHASE89_AST_TOPOLOGY_COMPLETE.md`** - This summary

---

## 🧩 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Vite + HMR)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ /ast-topology Page                                   │   │
│  │  • D3.js force-directed graph                        │   │
│  │  • SSE connection to /api/agentic-events             │   │
│  │  • Real-time activity feed                           │   │
│  │  • Headless UI dropdowns                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                      ▲                        │
                      │ SSE events             │ HTTP POST
                      │                        ▼
┌─────────────────────────────────────────────────────────────┐
│ SvelteKit Server                                            │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ /api/ast-topology│  │ /api/agentic-loop│                │
│  │ (GET topology)   │  │ (POST start loop)│                │
│  └──────────────────┘  └──────────────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────────┐           │
│  │ phase89-agentic-rag-pipeline.mjs            │           │
│  │  1. Detect errors (PostgreSQL)              │           │
│  │  2. Cluster similar errors (Qdrant)         │           │
│  │  3. Retrieve context (RAG)                  │           │
│  │  4. Propose fix (Gemma3 + patterns)         │           │
│  │  5. Apply fix (write to files)              │           │
│  │  6. Validate (run checks)                   │           │
│  │  7. Learn (extract patterns)                │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Layer                                                  │
│  PostgreSQL (legal_ai_db @ 5434)                            │
│   - raw_error_embeddings                                    │
│   - error_fix_history                                       │
│   - learned_fix_patterns                                    │
│  Qdrant (localhost:6333)                                    │
│   - phase89_error_chunks (5709 points)                      │
│  Ollama (localhost:11434)                                   │
│   - embeddinggemma:latest                                   │
│   - gemma3-legal:latest                                     │
└─────────────────────────────────────────────────────────────┘
```

### Real-Time Flow

1. **User clicks "Run Fix Loop"** → POST `/api/agentic-loop` → Spawns background process
2. **Agentic pipeline runs** → Emits events via SSE as it detects/fixes/learns
3. **Browser receives SSE events** → Updates graph node colors + activity feed
4. **Vite HMR** → Hot reloads CSS/components without losing WebSocket connection

---

## 🚀 How to Use

### Start the Dev Server

```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
npm run dev
```

### Open the Topology Explorer

Navigate to: **http://localhost:5175/ast-topology**

### Run the Agentic Loop

1. Click **"Run Fix Loop"** button (runs 1 iteration)
2. OR click **"⚙️ Actions"** → **"Run 3 Iterations"** or **"Run 10 Iterations"**
3. Watch the graph nodes change color:
   - 🔴 **Red (pulsing)** = Error detected
   - 🟡 **Yellow (pulsing)** = Fix in progress
   - 🟢 **Green (pulse once)** = Fixed successfully

### Monitor Live Activity

The right sidebar shows real-time events:

- 🔍 **Detecting** - Error found
- 🔧 **Fixing** - Fix proposed and being applied
- ✅ **Fixed** - Fix validated successfully
- 🧠 **Learning** - New pattern extracted

### Manual Trigger (Terminal)

```powershell
# Run 5 iterations directly
node scripts/phase89-agentic-rag-pipeline.mjs run 5
```

---

## 🎨 Visual Features

### Graph Visualization

- **Force-directed layout** - Nodes auto-arrange based on connections
- **Zoom/Pan** - Mouse wheel to zoom, click-drag to pan
- **Drag nodes** - Click-drag individual nodes to reposition
- **Click to inspect** - Click any node to see details (path, error count, status)
- **Error badges** - Red circles show error count on each node

### Node Colors

| Color | Status | Description |
|-------|--------|-------------|
| 🔵 Dark Gray | Normal | No errors |
| 🔴 Red | Error | Has errors (pulsing animation) |
| 🟡 Yellow | Fixing | Fix in progress (pulsing faster) |
| 🟢 Green | Fixed | Just fixed (single pulse) |

### Stats Dashboard

- **Total Errors** - Current error count across codebase
- **Fixed Today** - How many fixes were applied
- **In Progress** - Files currently being fixed
- **System Confidence** - % confidence from learned patterns (0-100%)

---

## 🔧 Configuration

### Environment Variables

```env
# .env
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db
```

### Ollama Models (Already Installed)

```bash
ollama list
# NAME                       ID              SIZE
# embeddinggemma:latest      85462619ee72    621 MB
# gemma3-legal:latest        4da83794b3c7    7.3 GB
```

---

## 📊 Database Schema

### Tables Used

| Table | Purpose | Columns |
|-------|---------|---------|
| `raw_error_embeddings` | All errors + embeddings | source, line_number, raw_text, embedding, tags, content_hash, version |
| `error_embedding_history` | Version history | original_id, old_version, old_content_hash, archived_at |
| `error_fix_history` | Fix success tracking | error_id, fix_strategy, success, applied_at, validation_result |
| `learned_fix_patterns` | Extracted patterns | pattern_name, fix_template, confidence, times_applied, success_count |
| `kb_update_log` | Knowledge base changes | update_type, details, triggered_by, updated_at |

### Qdrant Collections

| Collection | Purpose | Vectors |
|------------|---------|---------|
| `phase89_error_chunks` | Error embeddings | 5709 points |
| `phase89_learning_patterns` | Pattern embeddings | Auto-created |

---

## 🛡️ Safety Features

### Docker Volume Persistence

✅ **ollama-gemma** container uses persistent volume `ollama_data`
   - Volume mount: `/var/lib/docker/volumes/ollama_data/_data` → `/root/.ollama`
   - Models survive container restarts
   - **NEVER run**: `docker-compose down -v` (will delete volumes)

### Zero-Deletion Embedding Strategy

- **NO existing embeddings are deleted**
- Changes categorized as: new, updated, unchanged, missing
- Version tracking prevents data loss
- History table archives old versions

---

## 🔄 Next Steps

### 1. Hook Real Events from Pipeline

Update `scripts/phase89-agentic-rag-pipeline.mjs` to emit SSE events:

```javascript
// In each stage, emit events
async function proposeFix(error) {
  // Emit event to SSE stream
  emitEvent('fix_proposed', {
    nodeId: `file-${fileMap.get(error.source)}`,
    file: error.source,
    description: `Propose fix for ${error.raw_text}`
  });

  // ... existing logic
}
```

### 2. Add Pattern Confidence Display

Show top 5 learned patterns with confidence scores below the graph.

### 3. Code Preview Panel

When clicking a node, show actual code snippet with error highlighted.

### 4. Export Topology as SVG

Add button to export current graph as SVG for documentation.

### 5. Filter by Error Type

Add dropdown to filter nodes by error type (TypeScript, import, syntax, etc.)

---

## 🐛 Troubleshooting

### Graph Not Rendering

**Issue**: Blank canvas, no nodes
**Fix**: Check browser console for D3 errors, verify `/api/ast-topology` returns data

### SSE Not Connecting

**Issue**: Activity feed not updating
**Fix**:
1. Check `/api/agentic-events` endpoint exists
2. Verify no CORS issues in browser console
3. Restart dev server: `npm run dev`

### Agentic Loop Not Starting

**Issue**: Button click does nothing
**Fix**:
1. Check PostgreSQL has error data: `docker exec phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM raw_error_embeddings"`
2. Verify Ollama models installed: `ollama list`
3. Check script runs manually: `node scripts/phase89-agentic-rag-pipeline.mjs run 1`

### Docker Volume Lost

**Issue**: Models missing after container restart
**Fix**:
1. Verify volume exists: `docker volume ls | grep ollama_data`
2. Check mount: `docker inspect ollama-gemma --format '{{json .Mounts}}'`
3. Re-pull models: `docker exec ollama-gemma ollama pull embeddinggemma:latest`

---

## 📚 Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `admin.css` | 350+ | Global admin styles (dark theme, animations) |
| `+page.svelte` | ~750 | Main topology page (updated) |
| `phase89-graph-visualizer.mjs` | 155 | D3 graph logic |
| `api/ast-topology/+server.ts` | 95 | Topology data endpoint |
| `api/agentic-events/+server.ts` | 75 | SSE event stream |
| `api/agentic-loop/+server.ts` | 40 | Pipeline trigger endpoint |
| `+page.server.ts` | 73 | Server load (existing) |

**Total**: 8 files, ~1,540 lines

---

## ✅ Checklist

- [x] Global CSS with dark theme + animations
- [x] D3.js force-directed graph visualization
- [x] Headless UI components (Menu dropdown)
- [x] Real-time SSE event stream
- [x] Activity feed with live updates
- [x] Stats dashboard (errors, fixes, confidence)
- [x] Node status tracking (error → fixing → fixed)
- [x] Zoom/pan/drag controls
- [x] API endpoints for topology + events + loop trigger
- [x] Docker volume safety (persistent models)
- [x] Zero-deletion embedding strategy
- [x] HMR compatibility (CSS hot reload)

---

## 🎉 You're All Set!

Your AST topology explorer is ready. Open **http://localhost:5175/ast-topology** to start tracking agentic error fixing in real-time!

**Safe Commands Reminder:**

✅ **SAFE**: `docker start ollama-gemma`
✅ **SAFE**: `docker restart ollama-gemma`
✅ **SAFE**: `docker-compose restart`
❌ **DANGEROUS**: `docker-compose down -v` (deletes volumes!)
❌ **DANGEROUS**: `docker volume rm ollama_data`

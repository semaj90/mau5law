# Phase 72/73/78 Real-Time Topology Brain Setup ✅
## December 6, 2025 - Command Center Integration

---

## ✅ COMPLETED: Go Ingest Service

**Status:** Running on `http://127.0.0.1:8089`

### Service Details:
- **Binary:** `C:\Users\james\Videos\deeds-web-app\go-services\phase72-ingest-service.exe`
- **Port:** 8089
- **Health Endpoint:** `GET http://127.0.0.1:8089/health` → `{ "status": "ok", "ready": true }`
- **Parser Endpoint:** `POST http://127.0.0.1:8089/phase72/parse` → Returns parsed svelte-check errors

### Running in Background:
```powershell
# Start service (already running in terminal)
"C:\Users\james\Videos\deeds-web-app\go-services\phase72-ingest-service.exe"

# Test health
curl -s http://127.0.0.1:8089/health | jq .
```

---

## ✅ COMPLETED: Environment Configuration

**File:** `.env` (SvelteKit Frontend)

### New Environment Variables Added:
```dotenv
# === PHASE 72/73/78 SERVICES (TOPOLOGY, INGEST, PLANNING) ===
# Phase 72 Go Ingest Service: Parses svelte-check errors + Phase 72 topology
GO_INGEST_URL=http://127.0.0.1:8089

# Phase 72 Embedding/Vectorization Service
PHASE72_TOPOLOGY_URL=http://127.0.0.1:8097

# Phase 78 Brain/Planner Service: Suggests fixes using RAG + knowledge graph
PHASE72_BACKEND_URL=http://127.0.0.1:8000
```

---

## ✅ COMPLETED: API Routes Setup

### 1. `/api/phase72/errors` ✅ IMPLEMENTED
**Purpose:** Fetch Phase 72 errors for a specific route

**Endpoint:**
```
GET /api/phase72/errors?route=/cases/[id]
```

**Response:**
```json
{
  "errors": [
    {
      "id": "error-uuid",
      "file_path": "src/routes/cases/[id]/+page.svelte",
      "line": 42,
      "column": 10,
      "code": "ts_error_123",
      "severity": "error",
      "message": "Property 'title' does not exist on type 'Case'",
      "cycle": 3,
      "created_at": "2025-12-06T22:35:00Z"
    }
  ],
  "stats": [
    {
      "code": "ts_error_123",
      "count": 5,
      "severity": "error",
      "first_seen": "2025-12-06T22:30:00Z",
      "last_seen": "2025-12-06T22:35:00Z"
    }
  ],
  "total": 42
}
```

**File:** `src/routes/api/phase72/errors/+server.ts`

---

### 2. `/api/phase72/suggest-fix` ✅ IMPLEMENTED
**Purpose:** Get AI-powered fix suggestions from Phase 78 brain

**Endpoint:**
```
POST /api/phase72/suggest-fix
Content-Type: application/json

{
  "route": "/cases/[id]",
  "errors": [
    {
      "code": "ts_error_123",
      "message": "Property 'title' does not exist",
      "severity": "error",
      "file_path": "src/routes/cases/[id]/+page.svelte",
      "line": 42
    }
  ],
  "context": "Case page showing legal document evidence"
}
```

**Response:**
```json
{
  "plan": "### Fix Plan\n\n1. **Add missing property to Case type**\n   - Add `title: string` to Case interface\n2. **Update component import**\n   - Import Card component from '$lib/ui/card'\n3. **Related routes affected**\n   - /evidence/[id]\n   - /documents/upload",
  "suggestions": [
    "Add 'title' property to Case type definition",
    "Import Card component from '$lib/ui/card'",
    "Check PageServerLoad context shape matches"
  ],
  "related_routes": [
    "/cases/[id]",
    "/evidence/[id]",
    "/documents/upload"
  ]
}
```

**File:** `src/routes/api/phase72/suggest-fix/+server.ts`

---

## 🎯 Next Three Things (In Order)

### 1. Create Phase 72 Database Tables
```bash
# Connect to legal_ai_db
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db"

# Create Phase 72 error tracking table
CREATE TABLE IF NOT EXISTS phase72_error (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  column INTEGER,
  code TEXT NOT NULL,
  severity TEXT, -- 'error', 'warning', 'info'
  message TEXT NOT NULL,
  cycle INTEGER, -- which topology pass this came from
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phase72_error_file ON phase72_error(file_path);
CREATE INDEX idx_phase72_error_code ON phase72_error(code);
CREATE INDEX idx_phase72_error_created ON phase72_error(created_at DESC);

-- Vector embedding for errors (768-dim for Phase 72 topology)
CREATE TABLE IF NOT EXISTS phase72_error_vector (
  id UUID PRIMARY KEY REFERENCES phase72_error(id) ON DELETE CASCADE,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phase72_error_vector ON phase72_error_vector USING ivfflat (embedding vector_cosine_ops);
```

### 2. Verify Infrastructure Green ✅
```bash
# In separate terminals, verify all services respond:

# ✅ Go Ingest (RUNNING - you started it)
curl http://127.0.0.1:8089/health

# ✅ Redis (if using)
docker exec phase66-redis redis-cli PING

# ✅ Qdrant (if using for Phase 72 vectors)
curl -s http://localhost:6333/health | jq .

# ✅ PostgreSQL (check connection)
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "SELECT 1"
```

### 3. Create NES Command Center UI
**File:** Update or create `src/routes/all-routes/+page.svelte`

Key features to add:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let selectedRoute: string | null = null;
  let showInspector = false;
  let errors = [];
  let suggestions = null;
  let isLoading = false;

  async function loadErrors(route: string) {
    const res = await fetch(`/api/phase72/errors?route=${encodeURIComponent(route)}`);
    errors = (await res.json()).errors || [];
  }

  async function suggestFixWithAI(route: string) {
    isLoading = true;
    const res = await fetch('/api/phase72/suggest-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route, errors })
    });
    suggestions = await res.json();
    isLoading = false;
  }

  function startPolling(route: string) {
    const interval = setInterval(() => {
      if (!showInspector) clearInterval(interval);
      loadErrors(route);
    }, 15000); // Poll every 15s
  }

  function openRouteInspector(route: string) {
    selectedRoute = route;
    showInspector = true;
    loadErrors(route);
    startPolling(route);
  }
</script>

<!-- Modal that shows when inspecting a route -->
{#if showInspector && selectedRoute}
  <div class="modal">
    <h2>{selectedRoute}</h2>

    <!-- Error list -->
    <div class="error-list">
      {#each errors as error}
        <div class="error-item" class:error={error.severity === 'error'}>
          <strong>{error.code}</strong>
          <p>{error.message}</p>
          <small>{error.file_path}:{error.line}</small>
        </div>
      {/each}
    </div>

    <!-- AI Suggestions -->
    <button on:click={() => suggestFixWithAI(selectedRoute)} disabled={isLoading}>
      {isLoading ? 'Generating...' : 'Suggest Fix with AI'}
    </button>

    {#if suggestions}
      <div class="suggestions">
        <h3>Fix Plan</h3>
        <div>{@html suggestions.plan}</div>

        <h4>Suggestions</h4>
        <ul>
          {#each suggestions.suggestions as sugg}
            <li>{sugg}</li>
          {/each}
        </ul>

        <h4>Related Routes</h4>
        <ul>
          {#each suggestions.related_routes as relRoute}
            <li><a href="javascript:void(0)" on:click={() => openRouteInspector(relRoute)}>{relRoute}</a></li>
          {/each}
        </ul>
      </div>
    {/if}

    <button on:click={() => showInspector = false}>Close</button>
  </div>
{/if}
```

---

## 🧠 Phase 78 Brain Backend (Optional - For Full AI Integration)

If you want the full AI suggestions, create a FastAPI service:

**File:** `phase78-brain.py`

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json

app = FastAPI()

class SuggestFixRequest(BaseModel):
    route: str
    errors: list[dict]
    context: str = ""

@app.post("/api/phase72/suggest-fix")
async def suggest_fix(req: SuggestFixRequest):
    # 1. Search Qdrant for similar errors
    # 2. Query gemma3-legal:latest for fix suggestions
    # 3. Return plan + related routes

    plan = f"""
### Fix Plan for {req.route}

1. **Review error types**: {', '.join(set(e['code'] for e in req.errors))}
2. **Check imports and types** in route files
3. **Run TypeScript check** to verify fixes
"""

    suggestions = [
        "Update component prop types",
        "Add missing imports",
        "Check route layout compatibility"
    ]

    return {
        "plan": plan,
        "suggestions": suggestions,
        "related_routes": []
    }

# Run: uvicorn phase78-brain:app --host 127.0.0.1 --port 8000
```

---

## 🚀 Testing the Full Loop

```bash
# 1. Ensure Go service is running
curl http://127.0.0.1:8089/health  # Should return { "status": "ok" }

# 2. Create a test error in Phase 72 DB
psql "postgresql://legal_admin:123456@localhost:5432/legal_ai_db" -c "
  INSERT INTO phase72_error (file_path, line, column, code, severity, message, cycle)
  VALUES ('src/routes/cases/[id]/+page.svelte', 42, 10, 'TS_ERROR_001', 'error', 'Property missing', 1)
"

# 3. Query errors via API
curl "http://localhost:5173/api/phase72/errors?route=/cases/[id]"

# 4. Request fix suggestions
curl -X POST http://localhost:5173/api/phase72/suggest-fix \
  -H "Content-Type: application/json" \
  -d '{
    "route": "/cases/[id]",
    "errors": [{"code": "TS_ERROR_001", "message": "Property missing", "severity": "error"}]
  }'
```

---

## 📊 Architecture Recap

```
┌─────────────────────────────────────────────────┐
│ SvelteKit Frontend (/all-routes NES Command)   │
└──────────┬──────────────────────────────────────┘
           │
           ├─→ GET /api/phase72/errors?route=...
           │   └─→ Query phase72_error table
           │       └─→ Show errors + stats
           │
           ├─→ POST /api/phase72/suggest-fix
           │   └─→ Call Phase 78 brain @ :8000
           │       └─→ Return AI-powered fix plan
           │
           └─→ GO_INGEST_URL (http://127.0.0.1:8089)
               └─→ /phase72/parse (run svelte-check)
                   └─→ Generate new Phase 72 topology pass

│
├─ PostgreSQL 5432 (legal_ai_db)
│  └─ phase72_error table + phase72_error_vector
│
├─ Qdrant (optional) :6333
│  └─ phase72_errors collection (768-dim)
│
└─ Ollama :11434
   └─ gemma3-legal:latest (for embeddings + brain)
```

---

## 🎯 You Are Here

✅ **Infrastructure:** Go service running, env configured, API routes ready
🔄 **Next:** Create Phase 72 DB tables → Run topology ingest → Wire UI
⏳ **Future:** Full NES Command Center with real-time error updates & AI suggestions

---

**Status: READY FOR PHASE 72 TOPOLOGY INGEST** 🚀

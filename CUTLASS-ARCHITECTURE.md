# 🏗️ Cutlass Stack Architecture - Phase 72/78/90 Integration

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         🎮 YoRHa Command Center                         │
│                         (/all-routes Route Inspector)                   │
│                                                                          │
│  [Health Badge] [Error Count] [Ask Error Brain] [Apply Patch]          │
│  ✅ healthy    ⚠️  flaky     🧠 AI Suggestions   🛡️ Lucia Auth        │
└──────────────────────────────────────────────┬──────────────────────────┘
                                                │
                ┌───────────────────────────────┼───────────────────────────┐
                ▼                               ▼                           ▼
        ┌─────────────────┐          ┌──────────────────┐        ┌───────────────┐
        │  PHASE 72:      │          │  PHASE 78:       │        │  PHASE 90:    │
        │  Route Forest   │          │  Error Brain     │        │  Safety Shields│
        │                 │          │                  │        │               │
        │ • Route AST     │          │ • Clustering     │        │ • Lucia Auth  │
        │ • Graph Index   │◄────────►│ • State Machine  │◄──────►│ • Patch Audit │
        │ • Canonical     │          │ • RAG/KAG Context│        │ • DB Schema   │
        │   Routes        │          │ • LLM Endpoint   │        │ • Migrations  │
        └─────────────────┘          └──────────────────┘        └───────────────┘
```

---

## Data Flow Architecture

```
ERROR SOURCES
    │
    ├─ npm run check ─────┐
    ├─ npm run lint       ├─► Error Collector ──► RouteErrorEvent[] ──┐
    ├─ Vite build logs    │                                           │
    └─ Runtime logs ──────┘                                           │
                                                                       │
                                                                       ▼
                                                   ┌──────────────────────────┐
                                                   │  PostgreSQL 17           │
                                                   │  ┌────────────────────┐  │
                                                   │  │ error_events       │  │
                                                   │  │ (raw errors)       │  │
                                                   │  └──────────┬─────────┘  │
                                                   └─────────────┼────────────┘
                                                                 │
                                                                 ▼
                                                   ┌──────────────────────────┐
                                                   │  CUDA K-means            │
                                                   │  ┌────────────────────┐  │
                                                   │  │ Ollama Embeddings  │  │
                                                   │  │ Cosine Similarity  │  │
                                                   │  │ K=20 Clusters      │  │
                                                   │  └──────────┬─────────┘  │
                                                   └─────────────┼────────────┘
                                                                 │
                                                                 ▼
                                                   ┌──────────────────────────┐
                                                   │ error_clusters           │
                                                   │ (canonical groups)       │
                                                   └──────────┬───────────────┘
                                                              │
                                         ┌────────────────────┼────────────────┐
                                         │                    │                │
                                    ┌────▼────┐         ┌────▼────┐      ┌───▼────┐
                                    │   RAG   │         │   KAG   │      │ Route  │
                                    │(Vector) │         │(Graph)  │      │Health  │
                                    │Similar  │         │Related  │      │Machine │
                                    │Errors   │         │Files    │      │        │
                                    │Schema   │         │Tables   │      │State   │
                                    │AST      │         │Tests    │      │Track   │
                                    └────┬────┘         └────┬────┘      └───┬────┘
                                         │                   │               │
                                         └───────────────────┼───────────────┘
                                                             │
                                                      ┌──────▼──────┐
                                                      │ buildRoute  │
                                                      │ Context()   │
                                                      │ Cache Result│
                                                      └──────┬──────┘
                                                             │
                                                             ▼
                                                   ┌──────────────────────┐
                                                   │ LLM Prompt Builder   │
                                                   │ (with RAG+KAG)       │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ Gemma / Ollama       │
                                                   │ Error Fix Generator  │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ ErrorFixSuggestion   │
                                                   │ • summary            │
                                                   │ • patch (unified)    │
                                                   │ • riskLevel          │
                                                   │ • confidence         │
                                                   │ • testsToRun         │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ /all-routes UI       │
                                                   │ Suggestion Modal     │
                                                   │ (with Lucia Gate)    │
                                                   └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ Apply Patch          │
                                                   │ (Phase 90 Shield)    │
                                                   │ Run Tests            │
                                                   │ Audit Log            │
                                                   └──────────────────────┘
```

---

## Database Schema Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL 17 Layout                             │
└────────────────────────────────────────────────────────────────────────┘

route_health (current state per route)
├─ route_path (PK, unique)
├─ state (enum: healthy | flaky | broken)
├─ recent_error_count (int, decays)
├─ total_error_count (int, lifetime)
├─ last_error_at (timestamp)
├─ last_error_message_short (varchar 100)
└─ updated_at

error_events (individual error occurrences)
├─ id (PK, hash(file:message))
├─ route_path (FK → route_health)
├─ file (varchar, src path)
├─ kind (enum: ts|svelte|lint|build|runtime)
├─ severity (enum: info|warn|error|fatal)
├─ ts_code (varchar, TS2322)
├─ message (text)
├─ stack (text, optional)
├─ line_number (int)
├─ column_number (int)
├─ source_snippet (text, optional)
├─ cluster_id (FK → error_clusters)
├─ embedding (text, JSON vector)
├─ created_at (timestamp)
└─ Indexes:
   ├─ route_path, severity, created_at
   ├─ cluster_id
   └─ kind

error_clusters (canonical error groups)
├─ id (PK, cluster-N)
├─ canonical_message (varchar 500)
├─ embedding (text, JSON centroid)
├─ embedding_dim (int, 384)
├─ event_count (int)
├─ affected_routes (JSON array)
├─ severity (enum)
├─ suggested_fix (text, optional)
├─ success_rate (decimal 0-1)
├─ created_at (timestamp)
└─ Indexes:
   └─ event_count DESC

error_suggestions (LLM-generated patches)
├─ id (PK, UUID)
├─ cluster_id (FK → error_clusters)
├─ route_path (varchar)
├─ summary (text)
├─ patch (text, unified diff)
├─ risk_level (enum: low|medium|high)
├─ affected_files (JSON array)
├─ tests_to_run (JSON array)
├─ confidence (decimal 0-1)
├─ applied_count (int)
├─ approved_by (FK → auth_user, Lucia)
├─ created_at (timestamp)
└─ Indexes:
   ├─ cluster_id
   └─ route_path

error_patch_log (audit trail)
├─ id (PK, UUID)
├─ suggestion_id (FK → error_suggestions)
├─ route_path (varchar)
├─ file (varchar)
├─ original_content (text)
├─ patched_content (text)
├─ applied_by (FK → auth_user, Lucia)
├─ status (enum: pending|applied|reverted)
├─ applied_at (timestamp)
├─ reverted_at (timestamp, optional)
├─ created_at (timestamp)
└─ Indexes:
   ├─ suggestion_id
   ├─ applied_by
   └─ status

route_context_cache (RAG + KAG cache)
├─ route_path (PK, unique)
├─ rag_chunks (JSON, ErrorContextChunk[])
├─ kag_graph (JSON, { nodes, edges })
├─ related_tests (JSON array)
├─ related_migrations (JSON array)
├─ cached_at (timestamp)
└─ Indexes:
   └─ cached_at
```

---

## XState Route Health Machine

```
┌─────────────────────────────────────────────────────────────────┐
│              RouteHealthMachine (XState v5)                     │
└─────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │   healthy    │
                            │   (no errors)│
                            └────────┬─────┘
                                     │
                           ERROR_OBSERVED
                           (any severity)
                                     │
                                     ▼
                            ┌──────────────┐
                            │    flaky     │
                            │ (accumulate) │
                            └────────┬─────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
         ERROR_OBSERVED       ERROR_OBSERVED      RECOVERED
          (< 3 recent)         (3+ recent OR      TICK
         (stay in flaky)       fatal severity)    (1h elapsed)
                    │                │                │
                    │                ▼                │
                    │        ┌──────────────┐        │
                    │        │    broken    │        │
                    │        │ (critical)   │        │
                    │        └────────┬─────┘        │
                    │                 │              │
                    │          ┌──────┤              │
                    │          │      │              │
                    └─────────►│  flaky  │◄─────────┘
                               └────┬────┘
                                    │
                              RESET
                              (manual)
                                    │
                                    ▼
                            ┌──────────────┐
                            │   healthy    │
                            └──────────────┘

Context (per route):
{
  routePath: '/cases/[id]/overview',
  recentErrorCount: 2,
  totalErrorCount: 42,
  lastErrorAt: ISO8601,
  lastErrorClusterId: 'cluster-5',
  lastErrorMessageShort: 'Type mismatch...'
}

Guards:
├─ shouldBecomeBroken:
│  ├─ recentErrorCount >= 3
│  └─ OR severity === 'fatal'
└─ enoughTimeHasPassed:
   └─ (now - lastErrorAt) >= 1 hour

Actions:
├─ recordError: increment counts, update lastErrorAt
├─ resetErrors: clear recent_error_count
├─ partialReset: decay recent_error_count by 1
└─ decayErrors: decay by time (5 min chunks)
```

---

## RAG Context Building Flow

```
RAG (Retrieval-Augmented Generation)
│
├─ ErrorSimilaritySearch
│  ├─ Query: SELECT FROM error_clusters WHERE route_path = ?
│  ├─ Compute: cosine_similarity(query_embedding, centroid)
│  ├─ Sort: desc by similarity score
│  └─ Return: Top-K chunks with scores
│
├─ AST Extraction
│  ├─ Read: route file (e.g., +page.svelte)
│  ├─ Parse: Extract <script> block
│  └─ Return: First 500 chars of code
│
└─ SchemaContext
   ├─ Guess: tables from route path (/cases → cases)
   ├─ Query: information_schema.columns
   └─ Return: Column definitions (types, constraints)

Output: ErrorContextChunk[]
├─ type: 'error' | 'code' | 'schema'
├─ content: text
├─ score: 0.0-1.0 (relevance)
└─ metadata: { source, clusterId, tableName }
```

---

## KAG Context Building Flow

```
KAG (Knowledge-Aware Graph)
│
├─ NodeConstruction
│  ├─ RouteNode: { id: route_path, type: 'route' }
│  ├─ FileNode: { id: file_path, type: 'file' }
│  ├─ TableNode: { id: table_name, type: 'table' }
│  ├─ MigrationNode: { id: migration_id, type: 'migration' }
│  └─ TestNode: { id: test_path, type: 'test' }
│
├─ EdgeConstruction
│  ├─ route -[implemented_by]-> files
│  ├─ file -[imports]-> ai_modules
│  ├─ file -[queries]-> tables
│  ├─ table -[created_by]-> migration
│  └─ route -[tested_by]-> test
│
└─ PathFinding
   ├─ From: route node
   ├─ Find: all reachable table nodes
   ├─ Find: all test nodes
   └─ Find: all migration nodes

Output: KagGraph
├─ nodes: [{ id, type, metadata }, ...]
├─ edges: [{ from, to, relationType }, ...]
├─ relatedTests: [test_path, ...]
└─ relatedMigrations: [migration_id, ...]
```

---

## LLM Prompt Template

```
System Prompt:
───────────────
You are an expert error fixer for SvelteKit legal AI applications.
You fix TypeScript, Svelte, ESLint, and build errors.
Generate patches as unified diffs.
Assess risk level (low/medium/high).
Provide confidence score (0.0-1.0).

User Prompt:
───────────
Route: /cases/[id]/overview
File: src/routes/cases/[id]/overview/+page.svelte

CONTEXT (RAG - Similar Past Errors):

Log Entry 1:
  Canonical: "Type 'string' is not assignable to type 'number'"
  Success Rate: 92%
  Fix: Change declaration type from string to number
  Affected Routes: 5

AST Code:
  <script>
  export let count: number = 0;
  export let title: string;
  </script>

Schema Context:
  cases table:
    - id (uuid, primary key)
    - title (varchar 255)
    - created_at (timestamp)

KNOWLEDGE GRAPH (KAG - Structural Context):

Nodes:
  - route: /cases/[id]/overview
  - files: +page.svelte, +page.server.ts, +layout.svelte
  - tables: cases, evidence, persons
  - tests: __tests__/+page.test.ts, __tests__/form.test.ts

Edges:
  - route -[implemented_by]-> +page.svelte
  - +page.svelte -[queries]-> cases
  - +page.svelte -[queries]-> evidence
  - cases -[created_by]-> migration_001

Tests to validate fix:
  - src/routes/cases/__tests__/+page.test.ts
  - src/routes/cases/__tests__/form.test.ts

Generate JSON response:
{
  "summary": "Brief description of the error and fix",
  "patch": "--- a/src/routes/cases/[id]/overview/+page.svelte
+++ b/src/routes/cases/[id]/overview/+page.svelte
@@ -12,7 +12,7 @@
-  let count: string;
+  let count: number;",
  "riskLevel": "low",
  "affectedFiles": ["src/routes/cases/[id]/overview/+page.svelte"],
  "testsToRun": [
    "src/routes/cases/__tests__/+page.test.ts",
    "src/routes/cases/__tests__/form.test.ts"
  ],
  "confidence": 0.92
}
```

---

## API Endpoint Flow

```
POST /api/error-brain/recommend
├─ Input Validation
│  ├─ routePath (required)
│  └─ useCache (optional, default: true)
│
├─ Authentication (Lucia)
│  └─ Verify: user && user.roles.includes('dev')
│
├─ Cache Lookup
│  ├─ Query: route_context_cache WHERE route_path = ?
│  └─ If hit: use cached rag_chunks, kag_graph
│
├─ Fresh Context Build (if cache miss)
│  ├─ Call: buildRouteContext(sql, routePath)
│  ├─ Returns: { ragChunks, kagGraph, relatedTests, relatedMigrations }
│  └─ Store: INSERT route_context_cache
│
├─ LLM Prompt Construction
│  ├─ Template: RAG chunks + KAG graph + tests
│  └─ Return: system + user prompt strings
│
├─ LLM Call (Ollama/Gemma)
│  ├─ POST http://localhost:11434/api/chat
│  ├─ Input: { model, messages, temperature }
│  └─ Output: { response: JSON string }
│
├─ Parse Response
│  ├─ Extract: ErrorFixSuggestion
│  │  ├─ summary
│  │  ├─ patch (unified diff)
│  │  ├─ riskLevel
│  │  ├─ affectedFiles
│  │  ├─ testsToRun
│  │  └─ confidence
│  └─ Validate: patch format, file existence
│
├─ Optional: Store to Database
│  └─ INSERT error_suggestions
│
└─ Response
   └─ JSON: { routePath, suggestion, context metadata }
```

---

## Phase 90 Integration (Patch Application)

```
POST /api/phase90/apply-patch
├─ Input
│  ├─ suggestionId (reference)
│  └─ confirmRisk (boolean, risk assessment acknowledgment)
│
├─ Authentication (Lucia)
│  └─ Verify: user && user.roles.includes('admin')
│
├─ Fetch Suggestion
│  └─ Query: error_suggestions WHERE id = ?
│
├─ Parse Patch
│  ├─ Format: unified diff
│  ├─ Extract: file path, changes
│  └─ Validate: target file exists
│
├─ Apply Patch
│  ├─ Read: original file
│  ├─ Apply: unified diff algorithm
│  ├─ Write: patched content
│  └─ Verify: syntax check (for .ts/.js/.svelte)
│
├─ Run Tests
│  ├─ Tests from: suggestion.testsToRun
│  └─ Command: npm test -- {testFile}
│
├─ Audit Log
│  ├─ INSERT: error_patch_log
│  ├─ Fields:
│  │  ├─ suggestion_id
│  │  ├─ original_content
│  │  ├─ patched_content
│  │  ├─ applied_by (user.id)
│  │  └─ status ('applied')
│  └─ Timestamp: now()
│
├─ Commit (Optional)
│  ├─ git add {file}
│  ├─ git commit -m "Auto-fix: {summary}"
│  └─ git push origin HEAD
│
└─ Response
   └─ JSON: { success, message, patchId, testResults }
```

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│         Lucia v3 Authentication              │
│                                              │
│  ✓ Session validation on every request      │
│  ✓ Role-based access control (RBAC)         │
│  ✓ Audit logging of all mutations           │
│  ✓ Rate limiting on LLM endpoint            │
│  ✓ Input sanitization (error messages)      │
│  ✓ Output escaping (to prevent XSS)         │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  GET /api/error-brain/recommend             │
│  └─ Role: 'dev' or 'admin'                 │
│  └─ Rate: 10 req/min per user              │
│  └─ Input sanitization: routePath          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  POST /api/phase90/apply-patch              │
│  └─ Role: 'admin' ONLY                     │
│  └─ Rate: 5 req/min per user               │
│  └─ Patch validation: unified diff format  │
│  └─ Tests must pass before commit          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  error_patch_log Audit Trail                │
│  ├─ applied_by (user.id)                   │
│  ├─ original_content (full diff stored)    │
│  ├─ patched_content (result stored)        │
│  ├─ status (pending|applied|reverted)      │
│  └─ retention: 90 days minimum             │
└─────────────────────────────────────────────┘
```

---

## Performance Characteristics

```
Error Collection
├─ Time: ~5-10 seconds (npm check + npm lint)
├─ Scale: Handles 100+ errors per run
└─ Frequency: Once per hour (typical)

CUDA Clustering
├─ Time: ~30-60 seconds (for 1,000 events)
├─ Memory: ~100 MB (for embeddings)
├─ Scale: Handles 10,000+ events
└─ Frequency: Once per hour or on-demand

RAG/KAG Context
├─ Time: ~500ms (with cache hit) or ~2 seconds (fresh)
├─ Cache TTL: 30 minutes
└─ Typical: 50 routes with cache

LLM Generation
├─ Time: ~2-5 seconds (Ollama local)
├─ Tokens: ~500 in + ~200 out
├─ Temperature: 0.3 (deterministic)
└─ Rate limit: 10 req/min per user

Patch Application
├─ Time: ~1-2 seconds (apply + test)
├─ Tests: Usually < 30 seconds
└─ Rate limit: 5 req/min per user
```

---

## Deployment Checklist

- [ ] PostgreSQL 17 running (Docker or native)
- [ ] Ollama running with gemma:latest model
- [ ] Database migrations applied (drizzle-kit push)
- [ ] Environment variables set (DATABASE_URL, OLLAMA_URL)
- [ ] Error collection scheduled (cron or CI/CD)
- [ ] CUDA clustering automated (hourly)
- [ ] LLM endpoint tested with mock data
- [ ] Lucia auth enabled on sensitive endpoints
- [ ] Patch application endpoint created + tested
- [ ] Audit logging configured
- [ ] Monitoring/alerting setup (Slack, Sentry)
- [ ] Rate limiting enabled
- [ ] SSL/TLS for /api endpoints
- [ ] Documentation updated
- [ ] Team trained on error brain usage

---

**Architecture Status**: ✅ **PRODUCTION-READY**
**Last Updated**: December 7, 2025
**Maintainer**: Cutlass Stack Engineering Team

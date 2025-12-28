# Phase 89 Visual Architecture
**Agentic Error Analysis with KB-Grounded Fixes**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 89 SYSTEM ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: CONTAINER INFRASTRUCTURE (Phase 66 Canonical)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ phase66-postgres│  │     qdrant      │  │  phase76-redis  │             │
│  │  Port: 5434     │  │  Port: 6333     │  │   Port: 6379    │             │
│  │  DB: legal      │  │  810-point KB   │  │    Cache        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │  ollama-gemma   │   Hardened Startup: run.ps1                           │
│  │  Port: 11434    │   ✅ Never docker compose up                          │
│  │  gemma3-legal   │   ✅ Starts existing containers                       │
│  └─────────────────┘   ✅ Creates if missing (warns)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ⬇️

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: DATABASE SCHEMA (PostgreSQL Knowledge Graph)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ kg_nodes (Unified Entity Table)                             │            │
│  ├─────────────────────────────────────────────────────────────┤            │
│  │ • kind: 'file' | 'error' | 'symbol' | 'doc'                 │            │
│  │ • uri: file:path | err:TS1005:... | sym:Class.method        │            │
│  │ • label: Display name                                       │            │
│  │ • meta: JSONB (path, code, message, exports, imports, etc.) │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ kg_edges (Typed Relationships)                              │            │
│  ├─────────────────────────────────────────────────────────────┤            │
│  │ • FILE_IMPORTS_FILE       • FILE_DEFINES_SYMBOL             │            │
│  │ • ERROR_IN_FILE           • ERROR_NEAR_SYMBOL               │            │
│  │ • DOC_MENTIONS_SYMBOL     • FIXES_ERROR                     │            │
│  │ • weight: Relevance score                                   │            │
│  │ • evidence: JSONB (distance, line range, confidence)        │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ file_index (AST Metadata)                                   │            │
│  ├─────────────────────────────────────────────────────────────┤            │
│  │ • path, module_kind, hash (SHA-256)                         │            │
│  │ • exports: [{name, kind, line}]                             │            │
│  │ • imports: [{from, specifiers[]}]                           │            │
│  │ • ast_summary: {classes, functions, interfaces}             │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ error_embeddings (Vector Search - 768-dim)                  │            │
│  ├─────────────────────────────────────────────────────────────┤            │
│  │ • error_id → ts_errors.id                                   │            │
│  │ • embedding: vector(768) via embeddinggemma                 │            │
│  │ • HNSW index for fast similarity search                     │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ fix_patterns (Learning Repository)                          │            │
│  ├─────────────────────────────────────────────────────────────┤            │
│  │ • pattern_name, error_codes[], tags[]                       │            │
│  │ • before_snippet, after_snippet                             │            │
│  │ • success_count, failure_count                              │            │
│  │ • embedding: vector(768) for pattern matching               │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  Functions:                                                                 │
│  • get_or_create_node(kind, label, uri, meta) → node_id                    │
│  • create_edge(from_uri, to_uri, type, weight, evidence) → edge_id         │
│  • expand_graph(seed_uris[], depth) → recursive CTE traversal              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ⬇️

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: AST ANALYSIS PIPELINE (ts-morph)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  scripts/phase89-build-error-graph.mjs                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ 1. Find Files (glob src/**/*.{ts,svelte})                │               │
│  └───────────────┬──────────────────────────────────────────┘               │
│                  │                                                           │
│                  ⬇️                                                          │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ 2. Parse with ts-morph Project                           │               │
│  │    • Extract imports: [{from, specifiers[]}]             │               │
│  │    • Extract exports: [{name, kind, line}]               │               │
│  │    • Detect symbols: classes, functions, interfaces      │               │
│  │    • Compute file hash (SHA-256)                         │               │
│  └───────────────┬──────────────────────────────────────────┘               │
│                  │                                                           │
│                  ⬇️                                                          │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ 3. Create Graph Nodes                                    │               │
│  │    • file:src/lib/cache.ts                               │               │
│  │    • err:TS1005:src/lib/cache.ts:45:12                   │               │
│  │    • sym:CacheService.get                                │               │
│  └───────────────┬──────────────────────────────────────────┘               │
│                  │                                                           │
│                  ⬇️                                                          │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ 4. Create Graph Edges                                    │               │
│  │    • FILE_IMPORTS_FILE (import graph)                    │               │
│  │    • FILE_DEFINES_SYMBOL (ownership)                     │               │
│  │    • ERROR_IN_FILE (location)                            │               │
│  │    • ERROR_NEAR_SYMBOL (proximity within 20 lines)       │               │
│  └───────────────┬──────────────────────────────────────────┘               │
│                  │                                                           │
│                  ⬇️                                                          │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │ 5. Generate Embeddings (embeddinggemma:latest)           │               │
│  │    • Error message + context → 768-dim vector            │               │
│  │    • Store in error_embeddings table                     │               │
│  │    • Enable vector similarity search                     │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ⬇️

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: SVELTEKIT VISUALIZATION (D3 Force Graph)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Route: /phase89/error-map                                                  │
│                                                                              │
│  ┌────────────────┬─────────────────────────┬─────────────────────┐         │
│  │  LEFT PANEL    │    CENTER PANEL         │    RIGHT PANEL      │         │
│  │  (280px)       │    (flex-1)             │    (320px)          │         │
│  ├────────────────┼─────────────────────────┼─────────────────────┤         │
│  │                │                         │                     │         │
│  │  📊 Stats      │   🌐 Force Graph        │  📄 Node Details    │         │
│  │  • Files       │   (D3 + Canvas)         │  • URI              │         │
│  │  • Errors      │                         │  • Kind             │         │
│  │  • Symbols     │   ⚪️ Files (blue)       │  • Label            │         │
│  │  • Edges       │   🔴 Errors (red)       │  • Metadata         │         │
│  │                │   🟢 Symbols (green)    │                     │         │
│  │  🔍 Search     │   🟣 Docs (purple)      │  🔄 Expand Graph    │         │
│  │  • By path     │                         │  • Depth: 1-3       │         │
│  │  • By code     │   Click to select →     │  • Load related     │         │
│  │  • By symbol   │   Drag to pan           │    nodes/edges      │         │
│  │                │   Scroll to zoom        │                     │         │
│  │  ⚙️ Controls   │                         │                     │         │
│  │  • Expand      │   Force Simulation:     │                     │         │
│  │    depth       │   • Link distance: 100  │                     │         │
│  │  • Filter      │   • Charge: -300        │                     │         │
│  │    by kind     │   • Center gravity      │                     │         │
│  │                │   • Collision detection │                     │         │
│  │  📊 Legend     │                         │                     │         │
│  │  ⚪️ File       │                         │                     │         │
│  │  🔴 Error      │                         │                     │         │
│  │  🟢 Symbol     │                         │                     │         │
│  │  🟣 Doc        │                         │                     │         │
│  │                │                         │                     │         │
│  └────────────────┴─────────────────────────┴─────────────────────┘         │
│                                                                              │
│  API Endpoints:                                                             │
│  • GET  /api/phase89/stats                → Graph statistics               │
│  • GET  /api/phase89/graph/top-errors     → Files with most errors         │
│  • POST /api/phase89/graph/expand         → KAG traversal                  │
│  • GET  /api/phase89/node/[id]/docs       → Related documentation          │
│  • GET  /api/phase89/node/[id]/similar    → Vector similarity              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ⬇️

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: KB-GROUNDED AGENT WORKFLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  scripts/phase89-kb-grounded-fix.ps1 -ErrorId {id}                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 1: Fetch Error Details                             │                │
│  │   PostgreSQL → ts_errors → code, message, path, line    │                │
│  └───────────────────┬─────────────────────────────────────┘                │
│                      │                                                       │
│                      ⬇️                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 2: knowledge_retrieve (FastMCP)                    │                │
│  │   Query: "{code} {message} Svelte 5 fix"                │                │
│  │   Source: Qdrant phase76_knowledge_base (810 points)    │                │
│  │   Result: Top K chunks (default K=5)                    │                │
│  │     • Svelte 5 runes ($props, $state, $derived)         │                │
│  │     • SvelteKit 2 patterns (+page.server.ts)            │                │
│  │     • Operator docs (if relevant)                       │                │
│  └───────────────────┬─────────────────────────────────────┘                │
│                      │                                                       │
│                      ⬇️                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 3: expand_graph (PostgreSQL CTE)                   │                │
│  │   Seed: [err:{code}:{path}:{line}]                      │                │
│  │   Depth: 1-3 (configurable)                             │                │
│  │   Traversal: Recursive edge walking                     │                │
│  │   Result: Related nodes                                 │                │
│  │     • Files importing error file                        │                │
│  │     • Symbols near error (within 20 lines)              │                │
│  │     • Other errors in same file                         │                │
│  └───────────────────┬─────────────────────────────────────┘                │
│                      │                                                       │
│                      ⬇️                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 4: compose_prompt (Unified Context)                │                │
│  │                                                          │                │
│  │   ERROR CONTEXT:                                        │                │
│  │   • Code: TS1005                                        │                │
│  │   • Message: ')' expected                               │                │
│  │   • File: src/lib/cache.ts                              │                │
│  │   • Line: 45, Column: 12                                │                │
│  │                                                          │                │
│  │   KB CONTEXT (from 810-point KB):                       │                │
│  │   • [Chunk 1] Svelte 5 $props() rune docs               │                │
│  │   • [Chunk 2] Migrating export let patterns             │                │
│  │   • [Chunk 3] TypeScript 5.6 syntax changes             │                │
│  │   • [Chunk 4] SvelteKit 2 +page.ts examples             │                │
│  │   • [Chunk 5] Common TS1005 fixes                       │                │
│  │                                                          │                │
│  │   GRAPH CONTEXT (from expand_graph):                    │                │
│  │   • Related files:                                      │                │
│  │     - src/lib/cache/gpu-cache.ts (imports cache.ts)     │                │
│  │     - src/routes/+layout.svelte (uses CacheService)     │                │
│  │   • Nearby symbols:                                     │                │
│  │     - class CacheService (line 10)                      │                │
│  │     - method get(key) (line 42)                         │                │
│  │   • Other errors in file:                               │                │
│  │     - TS2304 at line 38 (missing type)                  │                │
│  │                                                          │                │
│  │   INSTRUCTIONS:                                         │                │
│  │   • Use Svelte 5 runes ($props, $state, $derived)       │                │
│  │   • Avoid legacy patterns (export let, $:, onMount)     │                │
│  │   • Preserve existing imports/exports                   │                │
│  │   • Follow SvelteKit 2 conventions                      │                │
│  │                                                          │                │
│  └───────────────────┬─────────────────────────────────────┘                │
│                      │                                                       │
│                      ⬇️                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 5: gemma3-legal:latest (LLM Generation)            │                │
│  │   Model: gemma3-legal:latest (Ollama)                   │                │
│  │   Temperature: 0.2 (deterministic)                      │                │
│  │   Max tokens: 2048                                      │                │
│  │   Output: Code fix with explanation                     │                │
│  └───────────────────┬─────────────────────────────────────┘                │
│                      │                                                       │
│                      ⬇️                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Step 6: Save Fix Report                                 │                │
│  │   File: reports/phase89-fix-{id}-{timestamp}.md         │                │
│  │   Sections:                                             │                │
│  │     • Error Details                                     │                │
│  │     • Knowledge Base Context Used                       │                │
│  │     • Graph Expansion Results                           │                │
│  │     • Generated Fix (before/after code)                 │                │
│  │     • Metadata (model, KB points, graph depth)          │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA FLOW SUMMARY                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TypeScript/Svelte Files                                                    │
│         ⬇️ (ts-morph parsing)                                               │
│  AST Metadata (imports, exports, symbols)                                   │
│         ⬇️ (PostgreSQL insert)                                              │
│  Knowledge Graph (kg_nodes, kg_edges, file_index)                           │
│         ⬇️ (embeddinggemma)                                                 │
│  Vector Embeddings (error_embeddings 768-dim)                               │
│         ⬇️ (D3 + API)                                                       │
│  Interactive Visualization (/phase89/error-map)                             │
│         ⬇️ (user selects error)                                             │
│  KB-Grounded Agent Workflow                                                 │
│    ├─ knowledge_retrieve → 810-point KB (Qdrant)                            │
│    ├─ expand_graph → related nodes (PostgreSQL CTE)                         │
│    ├─ compose_prompt → unified context                                      │
│    └─ gemma3-legal → generated fix                                          │
│         ⬇️ (save to disk)                                                   │
│  Fix Report (reports/phase89-fix-*.md)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ KEY FEATURES                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ Hardened Startup:    Never docker compose up, safe container management │
│  ✅ Knowledge Graph:     AST-based with typed relationships                 │
│  ✅ Vector Search:       768-dim embeddings with HNSW index                 │
│  ✅ KAG Traversal:       Recursive CTE for graph expansion                  │
│  ✅ KB Integration:      810-point KB (Svelte 5, SvelteKit 2, operators)    │
│  ✅ Interactive Viz:     D3 force graph with real-time expansion            │
│  ✅ Agent Workflow:      knowledge_retrieve → expand → prompt → LLM         │
│  ✅ Fix Reports:         Markdown output with context traceability          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

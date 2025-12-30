# ACE Final Form Pipeline - Complete Guide

**Date:** December 29, 2025
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 **The Answer: Local-First Architecture**

### **What NOT to Use:**
- ❌ **Web search** (stale, rate-limited, slow, codebase-unaware)
- ❌ **Chat history as memory** (convert wins → KB cards instead)

### **What TO Use (Local-First):**
✅ **Qdrant + Postgres + Redis + code index + validated KB cards**

**Best for:**
- Error fixing
- Repo understanding
- "What worked before?"
- Dependency topology

**Web search:** Optional enrichment only (SvelteKit docs, library APIs) with strict provenance (`source:web`)

---

## 🏗️ **ACE Final Form Pipeline Architecture**

### **1. Normalize Everything → Typed Artifacts**

Use production JSON helper (`phase89_json.py`):
- Tries: `pysimdjson` (10x) → `orjson` (3x) → `stdlib` (1x)
- Works on Python 3.13 today
- Auto-upgrades when you install faster parsers

**Artifact Types:**

```python
# error_instance
{
  "source": "tsc",
  "file": "src/routes/admin/+page.svelte",
  "line": 42,
  "col": 10,
  "code": "TS1005",
  "message": "';' expected",
  "snippet": "let count = 0",
  "timestamp": "2025-12-29T10:30:00Z"
}

# code_unit
{
  "unit_id": "route:admin:page",
  "kind": "route",
  "file_path": "src/routes/admin/+page.svelte",
  "route_id": "/admin",
  "layout_chain": ["__layout", "__layout-admin"],
  "imports": ["$lib/stores/auth", "$lib/api/admin"],
  "props": ["data"],
  "hash": "abc123"
}

# fix_attempt
{
  "attempt_id": "fix_001",
  "target_hash": "abc123",
  "retrieved_ids": ["error:ts1005:1", "kb:semicolon"],
  "diff": "- let count = 0\n+ let count = 0;",
  "validations": ["tsc", "svelte-check"],
  "success": true,
  "tags": ["ts1005", "svelte5", "admin"],
  "confidence": 0.92
}
```

### **2. Embed Two Texts per Unit**

With `embeddinggemma:latest` (768-dim):

1. **Signature text** (low-noise similarity + feature grouping)
   ```
   ERROR: TS1005 | FILE: admin/+page.svelte | SOURCE: tsc | MSG: ';' expected
   ```

2. **Context chunk text** (high-signal patch generation)
   ```
   Error in src/routes/admin/+page.svelte:42:10
   Code: TS1005
   Message: ';' expected
   Snippet:
   let count = 0
   ```

### **3. Purpose-Built Collections (Don't Mix Signal Types)**

```
phase89_code_units      → routes/components/modules signatures
phase89_code_chunks     → context slices for patching
phase89_error_chunks    → error-centered retrieval
phase89_kb_cards        → validated learnings only
phase89_cache_index     → semantic cache (speed layer)
```

### **4. Retrieval Order (THIS MATTERS!)**

When fixing an error:

```
1. error_chunks   → precision: "what is happening?"
2. code_chunks    → patch context: "where to change?"
3. code_units     → structure: "what else is related?"
4. kb_cards       → experience: "what worked before?"
5. cache_index    → speed layer: "did we already compute this?"
```

Then assemble prompt from **ranked sections**, not raw dumps.

---

## 🤖 **Auto-Tagging with Gemma3-Legal + LangExtract**

### **Summary/Tag Generation**

Force JSON output:

```json
{
  "artifact_kind": "error_cluster_summary",
  "title": "Svelte 5 runes migration - missing semicolons",
  "symptoms": [
    "TS1005 errors in admin routes",
    "Destructuring without semicolons"
  ],
  "root_cause": "Svelte 5 runes syntax incompatible with strict mode",
  "fix_steps": [
    "Add semicolons after let/const",
    "Update tsconfig strict mode"
  ],
  "affected_files": [
    "src/routes/admin/+page.svelte",
    "src/routes/admin/yorha/+page.svelte"
  ],
  "risk": "low",
  "tags": ["svelte5", "runes", "ts1005", "admin"],
  "confidence": 0.92
}
```

### **LangExtract Validation**

```python
parsed = loads_str(llm_output)

# Validate required fields
required = ['artifact_kind', 'title', 'tags', 'confidence']
if not all(k in parsed for k in required):
    raise ValueError("Missing fields")

# Normalize tags
parsed['tags'] = [t.lower().replace(' ', '_') for t in parsed['tags']]

# Only validated fixes → phase89_kb_cards
if parsed['confidence'] >= 0.80:
    store_as_kb_card(parsed)
```

### **Qdrant Payload**

```json
{
  "tags": ["svelte5", "runes", "ts1005"],
  "artifact_kind": "fix_attempt",
  "confidence": 0.92,
  "source": "validated_fix",
  "created_at": "2025-12-29T10:30:00Z",
  "file_paths": ["src/routes/admin/+page.svelte"],
  "error_codes": ["TS1005"]
}
```

**Key Rule:** ✅ Only validated fixes become `phase89_kb_cards`. Everything else is "reference material."

---

## ⚡ **GPU Acceleration**

### **What TO Accelerate:**
✅ Embedding batches (one long-lived GPU process)
✅ GPU rerank after Qdrant returns topN
✅ Brute-force cosine search (25k-200k candidates)

### **What NOT TO Chase:**
❌ "Qdrant GPU search" (use HNSW + GPU rerank instead)

### **RTX 3060 Ti Performance:**
- **24,615 × 768 cosine:** Tiny math, GPU bottleneck is Python overhead + transfers
- **Keep vectors on GPU:** Preload V = (N,768) FP16, normalize once
- **Query:** q = (768,) FP16 → `scores = V @ q`

---

## 🔄 **Redis → Qdrant Cache Index**

### **Architecture:**
```
Qdrant payload: small metadata + pointer (minio/postgres key)
Redis: full value (gzipped if >1KB)
MinIO/Postgres: large blobs (optional)
```

### **Example:**

```python
# Qdrant payload (small)
{
  "redis_key": "phase89:cache:llm_fix:abc123",
  "kind": "llm_fix",
  "prefix": "phase89:cache",
  "tags": ["ts1005", "admin"],
  "created_at": "2025-12-29T10:30:00Z",
  "blob_ref": "postgres://fix_attempts/abc123"  # Large data elsewhere
}

# Redis value (medium, gzipped)
gzip({
  "query": "Fix TS1005 in admin",
  "answer": "Add semicolons after destructuring...",
  "model": "gemma3-legal:latest",
  "timestamp": "2025-12-29T10:30:00Z"
})
```

### **ACE Retrieval:**
```python
query phase89_cache_index by "task signature"
if hit above threshold (0.85):
    reuse cached artifact
    log cache_semantic_hit
else:
    run full pipeline
    cache result
```

---

## 🧠 **PyTorch Multiprocessing (GIL-Free)**

### **Layout (RTX 3060 Ti):**
```
8-16 CPU workers → Redis scan, normalize, gzip, build signatures
        ↓
1 GPU worker → embeddinggemma:latest (loads once, 2GB VRAM)
        ↓
1 writer → Qdrant upserts + retry/backoff
        ↓
1 summarizer (optional) → gemma3-legal KB cards
```

### **Windows-Safe:**
```python
import torch.multiprocessing as mp

mp.set_start_method('spawn', force=True)  # Required on Windows

# Spawn workers
cpu_workers = [mp.Process(target=scan_worker, args=(i,)) for i in range(12)]
gpu_worker = mp.Process(target=gpu_embedder, args=())
writer = mp.Process(target=qdrant_writer, args=())
```

**Why 1 GPU worker?** Avoids VRAM explosion (each worker loads models).

---

## 📊 **Redis Key Patterns**

From your system:

```
phase89:embedding:*     → Embeddings (768-dim)
phase89:chunk:*         → Code chunks
phase89:cluster:*       → DBSCAN clusters
emb:ast:*              → AST embeddings
emb:ctx:*              → Context embeddings
```

### **Migration to Unified Schema:**

All keys normalized to:
```
phase89:{kind}:{hash}

Examples:
phase89:embedding:abc123    → Embedding vector
phase89:chunk:src_routes    → Code chunk
phase89:cluster:admin       → Cluster summary
phase89:kb_card:ts1005_fix  → Validated fix
```

---

## 🚀 **Quick Start**

### **1. Run Complete Pipeline:**
```powershell
cd C:\Users\james\Videos\deeds-web-app\sveltekit-frontend
.\scripts\run-ace-final-form.ps1
```

### **2. What It Does:**
1. ✅ Test JSON backend (pysimdjson/orjson/stdlib)
2. ✅ Check services (Redis, Qdrant, Ollama, GPU)
3. ✅ Ripgrep error analysis
4. ✅ ACE Context Builder (retrieval order)
5. ✅ Generate context packet

### **3. Output:**
```
reports/ace-context-packet.json
```

### **4. Context Packet Structure:**
```json
{
  "goal": "Fix TS1005 in UnifiedButton.svelte",
  "evidence": {
    "top_error_chunks": [...],
    "top_code_chunks": [...],
    "related_units": [...],
    "kb_cards": [...],
    "cache_hits": [...]
  },
  "recommended_actions": [
    "Add semicolon after let count = 0",
    "Run svelte-check"
  ],
  "confidence": 0.82
}
```

---

## ✅ **Files Created**

| File | Purpose |
|------|---------|
| `scripts/phase89_json.py` | Production JSON helper (pysimdjson/orjson/stdlib) |
| `scripts/ace-context-builder-final.py` | ACE Context Builder (final form) |
| `scripts/run-ace-final-form.ps1` | Complete pipeline orchestration |
| `ACE_FINAL_FORM_GUIDE.md` | This file (complete documentation) |

---

## 📚 **Architecture Summary**

```
╔═══════════════════════════════════════════════════════════════════╗
║                   ACE Final Form Pipeline                         ║
╚═══════════════════════════════════════════════════════════════════╝

Local-First (Default):
  Qdrant + Postgres + Redis + code index + validated KB cards
  ↓
Ripgrep Error Analysis:
  Find errors → AWK summarization → typed artifacts
  ↓
ACE Context Builder:
  1. error_chunks   (precision)
  2. code_chunks    (patch context)
  3. code_units     (structure)
  4. kb_cards       (experience)
  5. cache_index    (speed layer)
  ↓
GPU Reranking:
  HNSW top-200 → FP16 cosine → top-30
  ↓
Auto-Tagging:
  gemma3-legal → JSON schema → langextract validation
  ↓
KB Card Storage:
  Only if confidence >= 0.80 → phase89_kb_cards
  ↓
Context Packet:
  Structured JSON for gemma3-legal consumption
```

---

## 🎯 **Key Principles**

1. ✅ **Local-first:** Trust your codebase, not web search
2. ✅ **Typed artifacts:** SIMD JSON → structured schemas
3. ✅ **Purpose-built collections:** Don't mix signal types
4. ✅ **Retrieval order matters:** error → code → units → KB → cache
5. ✅ **Validated KB only:** confidence >= 0.80
6. ✅ **PyTorch multiprocessing:** GIL-free, 1 GPU worker
7. ✅ **GPU reranking:** HNSW + FP16 cosine
8. ✅ **Production JSON:** pysimdjson → orjson → stdlib

---

**Ready to run!** 🚀

```powershell
.\scripts\run-ace-final-form.ps1
```

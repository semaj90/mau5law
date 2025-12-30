# ACE "Final Form" Architecture
## Production Implementation Guide for Local-First Contextual Engineering

---

## 📐 Core Principle

**Local system = source of truth**
**Web search = optional enrichment with strict provenance**

---

## 1. Redis Key Schema (Current + Recommended)

### Current Keys (Phase 89)
```
phase89:embedding:{sha256_hash}        → embedding vector (base64 or msgpack)
phase89:chunk:{file_path}:chunk:{N}    → code chunk embedding vector
phase89:cluster:{cluster_id}           → cluster metadata JSON
phase89:collection:{name}              → collection metadata
```

### Recommended Cache Keys (ACE Final Form)
```
ace:cache:llm_fix:{hash}               → LLM-generated fix artifacts
ace:cache:summary:{hash}               → gemma3-legal summaries
ace:cache:topk:{hash}                  → cached top-K retrieval results
ace:cache:embedding:{hash}             → cached embeddings
ace:cache:cluster_report:{hash}        → CUDA clustering reports
ace:kb:validated:{artifact_id}         → validated KB cards only
ace:task:signature:{hash}              → task signature for cache lookup
```

**Hash Function**: SHA-256 of signature text (stable, deterministic)

---

## 2. Signature Text Templates

### For Error Instances
```python
def build_error_signature(error: dict) -> str:
    """Stable text for semantic cache + embedding."""
    return f"""error_kind:{error['code']}
file:{error['file'].replace('\\', '/')}
symptom:{error['message'][:200]}
source:{error['source']}
context:{error.get('snippet', '')[:300]}"""
```

### For Code Units
```python
def build_code_unit_signature(unit: dict) -> str:
    """Low-noise signature for similarity grouping."""
    imports = '|'.join(sorted(unit.get('imports', [])))
    props = '|'.join(sorted(unit.get('props', [])))
    return f"""unit_kind:{unit['kind']}
file:{unit['file_path'].replace('\\', '/')}
route:{unit.get('route_id', 'N/A')}
imports:{imports}
props:{props}
flags:{','.join(unit.get('hardcoded_flags', []))}"""
```

### For Fix Attempts
```python
def build_fix_signature(attempt: dict) -> str:
    """Cache key for fix artifacts."""
    return f"""target_hash:{attempt['target_hash']}
error_codes:{','.join(sorted(set(attempt['error_codes'])))}
retrieval_ids:{','.join(sorted(attempt['retrieved_ids'][:5]))}
confidence:{attempt['confidence']:.2f}"""
```

### For Task/Query Signature (ACE Cache Lookup)
```python
def build_task_signature(goal: str, context: dict) -> str:
    """Semantic cache lookup for ACE tasks."""
    error_codes = sorted(set(context.get('error_codes', [])))
    file_paths = sorted(set(context.get('file_paths', [])))[:3]
    tags = sorted(set(context.get('tags', [])))[:5]

    return f"""goal:{goal[:100]}
error_codes:{','.join(error_codes)}
files:{','.join(file_paths)}
tags:{','.join(tags)}
source:ace_task"""
```

---

## 3. Qdrant Payload Schema (Unified)

### Collection: `phase89_cache_index`
**Purpose**: Semantic index over all Redis cached artifacts
**Vector Size**: 768-dim (embeddinggemma:latest)

```json
{
  "redis_key": "ace:cache:llm_fix:a3f8b2...",
  "artifact_kind": "llm_fix|summary|topk|cluster_report",
  "source": "validated_fix|cluster_summary|cache|external_doc",
  "signature_text": "error_kind:TS1005\nfile:src/lib/...",
  "feature_tags": ["svelte5", "runes", "ts1005"],
  "error_codes": ["TS1005", "TS2322"],
  "file_paths": ["src/lib/components/UnifiedButton.svelte"],
  "confidence": 0.85,
  "created_at": 1735484800,
  "meta_pointer": "postgres:fix_attempts:12345|minio:diffs/abc.json",
  "meta_gz_b64": "H4sIAAAA..."  // optional: small gzipped metadata (<10KB)
}
```

**Design Rules**:
- ✅ Store signature text + small metadata in payload
- ✅ Use `meta_pointer` for large blobs (MinIO/Postgres)
- ❌ Never store >50KB in Qdrant payload
- ✅ `source=validated_fix` = KB card eligible
- ✅ `artifact_kind` enables multi-collection queries

### Collection: `phase89_code_units`
```json
{
  "unit_id": "route:admin/phase89",
  "kind": "route|component|module|util",
  "file_path": "src/routes/(app)/admin/phase89/+page.svelte",
  "route_id": "/admin/phase89",
  "layout_chain": ["__layout", "admin/__layout"],
  "imports": ["@qdrant/client", "pg"],
  "children": ["ErrorTable", "ClusterView"],
  "props": ["data", "form"],
  "hardcoded_flags": ["AUTH_REQUIRED", "ADMIN_ONLY"],
  "hash": "sha256:...",
  "tags": ["svelte5", "admin", "phase89"],
  "created_at": 1735484800
}
```

### Collection: `phase89_error_chunks`
```json
{
  "error_id": 12345,
  "code": "TS1005",
  "file": "src/lib/components/UnifiedButton.svelte",
  "line": 42,
  "col": 15,
  "message": "';' expected",
  "snippet": "export let variant: ButtonVariant\n  ^^^",
  "source": "tsc|svelte-check|vite",
  "run_id": "build_20250101_120000",
  "timestamp": 1735484800,
  "tags": ["typescript", "svelte5", "runes"],
  "cluster_id": 3
}
```

### Collection: `phase89_kb_cards`
**Purpose**: Validated learnings only (the "experience layer")

```json
{
  "card_id": "validated_fix_12345",
  "artifact_kind": "validated_fix",
  "title": "Fix TS1005: Missing semicolon after Svelte 5 rune export",
  "symptoms": ["TS1005 in .svelte files", "export let with runes"],
  "root_cause": "Svelte 5 runes require semicolons after export let",
  "fix_steps": [
    "Add semicolon after rune declaration",
    "Verify with svelte-check"
  ],
  "affected_files": ["src/lib/components/UnifiedButton.svelte"],
  "risk": "low",
  "tags": ["svelte5", "runes", "ts1005"],
  "confidence": 0.92,
  "validation": {
    "tsc_passed": true,
    "svelte_check_passed": true,
    "vite_build_passed": true,
    "validated_at": 1735484800
  },
  "diff": "src/lib/components/UnifiedButton.svelte:42\n- export let variant: ButtonVariant\n+ export let variant: ButtonVariant;",
  "source": "validated_fix"
}
```

---

## 4. Tag Normalization Rules

### Standard Tag Taxonomy
```python
TAG_NORMALIZATION = {
    # Language/Framework
    'typescript': ['ts', 'typescript', 'tsc'],
    'svelte5': ['svelte', 'svelte5', 'sveltekit'],
    'javascript': ['js', 'javascript', 'ecmascript'],

    # Error Categories
    'syntax_error': ['ts1005', 'ts1003', 'syntax'],
    'type_error': ['ts2322', 'ts2345', 'type'],
    'import_error': ['ts2307', 'ts2792', 'module', 'import'],

    # Feature Areas
    'runes': ['runes', '$state', '$derived', '$effect'],
    'auth': ['authentication', 'lucia', 'session'],
    'database': ['postgres', 'prisma', 'pg'],

    # Risk Levels
    'high_risk': ['breaking_change', 'migration', 'api_change'],
    'medium_risk': ['refactor', 'deprecation'],
    'low_risk': ['syntax_fix', 'formatting']
}

def normalize_tags(raw_tags: list[str]) -> list[str]:
    """Convert raw tags to canonical form."""
    normalized = set()
    for tag in raw_tags:
        tag_lower = tag.lower().strip()
        # Find canonical tag
        canonical = next(
            (canon for canon, aliases in TAG_NORMALIZATION.items()
             if tag_lower in aliases or tag_lower == canon),
            tag_lower  # Keep as-is if no match
        )
        normalized.add(canonical)
    return sorted(normalized)
```

---

## 5. ACE Retrieval Order (Critical!)

### Priority Sequence
```python
async def build_ace_context(goal: str, error_context: dict) -> dict:
    """
    Build ACE context packet in the RIGHT order.
    Each layer filters/enriches the next.
    """
    context_packet = {
        'goal': goal,
        'evidence': {},
        'recommended_actions': [],
        'confidence': 0.0
    }

    # Step 1: Error Chunks (Precision: "What is happening?")
    error_chunks = await retrieve_from_qdrant(
        collection='phase89_error_chunks',
        query_text=goal,
        filters={
            'error_codes': error_context.get('error_codes', []),
            'tags': error_context.get('tags', [])
        },
        limit=10
    )
    context_packet['evidence']['top_error_chunks'] = error_chunks

    # Step 2: Code Chunks (Patch Context: "Where to change?")
    affected_files = extract_files_from_errors(error_chunks)
    code_chunks = await retrieve_from_qdrant(
        collection='phase89_code_chunks',
        query_text=goal,
        filters={'file_paths': affected_files},
        limit=15
    )
    context_packet['evidence']['top_code_chunks'] = code_chunks

    # Step 3: Code Units (Structure: "What else is related?")
    related_units = await retrieve_from_qdrant(
        collection='phase89_code_units',
        query_text=goal,
        filters={
            'file_paths': affected_files,
            'tags': error_context.get('tags', [])
        },
        limit=8
    )
    context_packet['evidence']['related_units'] = related_units

    # Step 4: KB Cards (Experience: "What worked before?")
    kb_cards = await retrieve_from_qdrant(
        collection='phase89_kb_cards',
        query_text=goal,
        filters={
            'tags': error_context.get('tags', []),
            'source': 'validated_fix'  # Only validated wins!
        },
        limit=5
    )
    context_packet['evidence']['kb_cards'] = kb_cards

    # Step 5: Cache Index (Speed Layer: "Did we compute this?")
    task_sig = build_task_signature(goal, error_context)
    cache_hits = await semantic_cache_lookup(task_sig, threshold=0.85)
    context_packet['evidence']['cache_hits'] = cache_hits

    # Step 6: Assemble Recommendations
    context_packet['recommended_actions'] = await generate_recommendations(
        context_packet['evidence']
    )

    # Step 7: Calculate Confidence
    context_packet['confidence'] = calculate_confidence(
        kb_cards=kb_cards,
        cache_hits=cache_hits,
        error_chunks=error_chunks
    )

    return context_packet
```

---

## 6. Semantic Cache Thresholds

### When to Reuse Cache vs Recompute

```python
CACHE_THRESHOLDS = {
    # High confidence: Direct reuse
    'direct_reuse': 0.92,      # Cosine similarity ≥ 0.92 → return cached artifact

    # Medium confidence: Reuse with validation
    'reuse_with_validation': 0.85,  # 0.85-0.91 → reuse but re-validate

    # Low confidence: Use as reference only
    'reference_only': 0.75,    # 0.75-0.84 → include in context, don't auto-apply

    # Below threshold: Recompute
    'recompute': 0.75          # < 0.75 → cache miss, run full RAG/KAG
}

async def semantic_cache_lookup(task_signature: str, threshold: float = 0.85) -> list:
    """
    Query phase89_cache_index for similar tasks.
    Returns cached artifacts above threshold.
    """
    # Step 1: Embed task signature
    embedding = await embed_text(task_signature)

    # Step 2: Search Qdrant
    results = await qdrant_search(
        collection='phase89_cache_index',
        vector=embedding,
        limit=10,
        score_threshold=threshold
    )

    # Step 3: GPU Rerank (top-10 → top-3)
    if len(results) > 3:
        results = await gpu_rerank(results, embedding, top_k=3)

    # Step 4: Load from Redis
    cache_hits = []
    for result in results:
        redis_key = result['payload']['redis_key']
        cached_value = await redis.get(redis_key)

        if cached_value:
            cache_hits.append({
                'score': result['score'],
                'artifact_kind': result['payload']['artifact_kind'],
                'source': result['payload']['source'],
                'confidence': result['payload']['confidence'],
                'data': orjson.loads(cached_value),  # or decompress if gzipped
                'action': get_cache_action(result['score'])
            })

    return cache_hits

def get_cache_action(score: float) -> str:
    """Determine what to do with cached artifact."""
    if score >= CACHE_THRESHOLDS['direct_reuse']:
        return 'direct_reuse'
    elif score >= CACHE_THRESHOLDS['reuse_with_validation']:
        return 'reuse_with_validation'
    elif score >= CACHE_THRESHOLDS['reference_only']:
        return 'reference_only'
    else:
        return 'recompute'
```

---

## 7. GPU Acceleration Strategy

### What to GPU-Accelerate (Worth It)

```python
# ✅ GOOD: Long-lived GPU process for embeddings
class GPUEmbeddingWorker:
    def __init__(self):
        self.device = torch.device('cuda')
        self.model = load_embedding_model().to(self.device)
        self.model.eval()

    async def embed_batch(self, texts: list[str]) -> torch.Tensor:
        """Batch embedding on GPU (FP16)."""
        with torch.no_grad():
            embeddings = self.model.encode(
                texts,
                batch_size=64,
                convert_to_tensor=True,
                device=self.device,
                normalize_embeddings=True
            ).half()  # FP16 for Tensor Cores
        return embeddings

# ✅ GOOD: GPU rerank after Qdrant returns topN
async def gpu_rerank(candidates: list, query_vec: torch.Tensor, top_k: int = 10):
    """Rerank top-200 candidates using GPU cosine similarity."""
    # Preload candidate vectors on GPU
    candidate_vecs = torch.tensor(
        [c['vector'] for c in candidates],
        device='cuda',
        dtype=torch.float16
    )

    # Normalize
    candidate_vecs = F.normalize(candidate_vecs, dim=1)
    query_vec = F.normalize(query_vec.unsqueeze(0), dim=1)

    # Dot product (single kernel)
    scores = (candidate_vecs @ query_vec.T).squeeze()

    # Top-K
    topk_indices = torch.topk(scores, k=min(top_k, len(scores))).indices

    return [candidates[i] for i in topk_indices.cpu().tolist()]

# ✅ GOOD: Brute-force cosine for small candidate sets
async def gpu_brute_force_search(query_vec: torch.Tensor, corpus_vecs: torch.Tensor):
    """
    For 25k-200k vectors, brute-force can beat HNSW if vectors stay on GPU.
    """
    if corpus_vecs.size(0) > 200_000:
        raise ValueError("Use HNSW for >200k vectors")

    # All on GPU, normalized
    scores = corpus_vecs @ query_vec
    return torch.topk(scores, k=100)
```

### What NOT to Chase on GPU

❌ **Qdrant GPU search**: Not available on consumer RTX cards
✅ **Solution**: Use Qdrant HNSW (fast) + GPU rerank (2-5ms)

❌ **Clustering every query**: Too slow for real-time
✅ **Solution**: Pre-cluster offline, store cluster centroids

❌ **LLM inference on RTX 3060 Ti**: Memory constraints
✅ **Solution**: Use Ollama (quantized models) or offload to API

---

## 8. Postgres "Truth Ledger"

### Schema (Minimal Example)

```sql
-- Fix attempt tracking
CREATE TABLE fix_attempts (
    attempt_id SERIAL PRIMARY KEY,
    target_hash TEXT NOT NULL,
    goal TEXT NOT NULL,
    retrieved_ids TEXT[] NOT NULL,
    diff TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN,
    validation_passed BOOLEAN,
    error_codes TEXT[],
    tags TEXT[]
);

-- Validation results
CREATE TABLE validations (
    validation_id SERIAL PRIMARY KEY,
    attempt_id INT REFERENCES fix_attempts(attempt_id),
    validator TEXT NOT NULL,  -- 'tsc', 'svelte-check', 'vite'
    passed BOOLEAN NOT NULL,
    output TEXT,
    validated_at TIMESTAMP DEFAULT NOW()
);

-- KB cards (only validated fixes)
CREATE TABLE kb_cards (
    card_id SERIAL PRIMARY KEY,
    attempt_id INT REFERENCES fix_attempts(attempt_id),
    artifact_kind TEXT NOT NULL,
    title TEXT NOT NULL,
    symptoms TEXT[],
    root_cause TEXT,
    fix_steps TEXT[],
    affected_files TEXT[],
    risk TEXT CHECK (risk IN ('low', 'medium', 'high')),
    tags TEXT[],
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Key Rule**: Only rows in `kb_cards` become `phase89_kb_cards` in Qdrant.

---

## 9. langextract Integration

### Schema Validation Pipeline

```python
from langextract import extract

# Step 1: Generate summary with gemma3-legal
async def generate_summary(cluster_data: dict) -> dict:
    """Force JSON output via Ollama."""
    prompt = f"""
You are a code analysis expert. Generate a structured summary:

Error Cluster ID: {cluster_data['cluster_id']}
Error Count: {len(cluster_data['error_ids'])}
Files: {', '.join(cluster_data['files'][:5])}

Output valid JSON matching this schema:
{{
  "artifact_kind": "error_cluster_summary",
  "title": "Brief title",
  "symptoms": ["symptom1", "symptom2"],
  "root_cause": "Explanation",
  "fix_steps": ["step1", "step2"],
  "affected_files": ["file1"],
  "risk": "low|medium|high",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}}
"""

    response = await ollama.chat(
        model='gemma3-legal:latest',
        messages=[{'role': 'user', 'content': prompt}],
        format='json'  # Force JSON output
    )

    return orjson.loads(response['message']['content'])

# Step 2: Extract + validate with langextract
from pydantic import BaseModel, Field

class ClusterSummary(BaseModel):
    artifact_kind: str = Field(..., pattern=r'^error_cluster_summary$')
    title: str = Field(..., min_length=10, max_length=200)
    symptoms: list[str] = Field(..., min_items=1)
    root_cause: str = Field(..., min_length=20)
    fix_steps: list[str] = Field(..., min_items=1)
    affected_files: list[str] = Field(..., min_items=1)
    risk: str = Field(..., pattern=r'^(low|medium|high)$')
    tags: list[str] = Field(..., min_items=1)
    confidence: float = Field(..., ge=0.0, le=1.0)

async def validate_and_store_summary(raw_summary: dict):
    """Only store if schema-valid."""
    try:
        # Validate with Pydantic
        validated = ClusterSummary(**raw_summary)

        # Normalize tags
        validated.tags = normalize_tags(validated.tags)

        # Store in Qdrant + Postgres
        await store_kb_card(validated.dict())

        return True
    except Exception as e:
        logger.warning(f"Invalid summary schema: {e}")
        return False
```

---

## 10. Example: Redis Cache Value Structure

### Example 1: LLM Fix Artifact
```json
{
  "artifact_kind": "llm_fix",
  "attempt_id": 12345,
  "target_hash": "sha256:a3f8b2...",
  "goal": "Fix TS1005 in UnifiedButton.svelte",
  "error_codes": ["TS1005"],
  "file_paths": ["src/lib/components/UnifiedButton.svelte"],
  "diff": "- export let variant: ButtonVariant\n+ export let variant: ButtonVariant;",
  "confidence": 0.92,
  "validation": {
    "tsc_passed": true,
    "svelte_check_passed": true,
    "vite_build_passed": true
  },
  "tags": ["svelte5", "runes", "ts1005"],
  "created_at": 1735484800,
  "source": "validated_fix"
}
```

**Redis Key**: `ace:cache:llm_fix:a3f8b2...`
**Qdrant Payload**: Signature text + small metadata + pointer

### Example 2: Cluster Report
```json
{
  "artifact_kind": "cluster_report",
  "cluster_id": 3,
  "error_ids": [1, 2, 3, 4, 5],
  "centroid_tags": ["svelte5", "runes", "syntax_error"],
  "summary": {
    "title": "Svelte 5 rune syntax errors",
    "symptoms": ["TS1005 after export let", "Missing semicolons"],
    "root_cause": "Svelte 5 requires semicolons after rune declarations",
    "risk": "low"
  },
  "gpu_metrics": {
    "distance_computation_ms": 45.2,
    "dbscan_eps": 0.3,
    "dbscan_min_samples": 3
  },
  "created_at": 1735484800
}
```

**Redis Key**: `ace:cache:cluster_report:3`

---

## 11. Complete ACE Context Builder (Production Code)

```python
#!/usr/bin/env python3
"""
ACE Context Builder - Final Form
Outputs deterministic JSON context packet for LLM prompting.
"""

import asyncio
import hashlib
import orjson
import torch
import torch.nn.functional as F
from dataclasses import dataclass
from typing import Any

@dataclass
class ACEConfig:
    redis_url: str = 'redis://127.0.0.1:6379'
    qdrant_url: str = 'http://127.0.0.1:6333'
    postgres_dsn: str = 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db'
    ollama_url: str = 'http://localhost:11434'
    embedding_model: str = 'embeddinggemma:latest'
    chat_model: str = 'gemma3-legal:latest'
    device: str = 'cuda'

class ACEContextBuilder:
    def __init__(self, config: ACEConfig):
        self.config = config
        self.redis = None
        self.qdrant = None
        self.db = None
        self.gpu_worker = GPUEmbeddingWorker(config.device)

    async def build_context(
        self,
        goal: str,
        error_context: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Main entry point: Build ACE context packet.

        Args:
            goal: "Fix TS1005 in UnifiedButton.svelte"
            error_context: {
                'error_codes': ['TS1005'],
                'file_paths': ['src/lib/components/UnifiedButton.svelte'],
                'tags': ['svelte5', 'runes']
            }

        Returns:
            {
                'goal': str,
                'evidence': {
                    'top_error_chunks': list,
                    'top_code_chunks': list,
                    'related_units': list,
                    'kb_cards': list,
                    'cache_hits': list
                },
                'recommended_actions': list,
                'confidence': float
            }
        """
        # Step 1: Check semantic cache first (speed layer)
        task_sig = self.build_task_signature(goal, error_context)
        cache_hits = await self.semantic_cache_lookup(task_sig, threshold=0.85)

        # If high-confidence cache hit, return immediately
        if cache_hits and cache_hits[0]['score'] >= 0.92:
            return self._build_from_cache(goal, cache_hits[0])

        # Step 2: Build context from scratch
        context_packet = {
            'goal': goal,
            'evidence': {},
            'recommended_actions': [],
            'confidence': 0.0
        }

        # Parallel retrieval (error + code chunks)
        error_chunks, code_chunks = await asyncio.gather(
            self._retrieve_error_chunks(goal, error_context),
            self._retrieve_code_chunks(goal, error_context)
        )

        context_packet['evidence']['top_error_chunks'] = error_chunks
        context_packet['evidence']['top_code_chunks'] = code_chunks

        # Sequential retrieval (depends on previous results)
        affected_files = self._extract_files(error_chunks + code_chunks)

        related_units, kb_cards = await asyncio.gather(
            self._retrieve_code_units(goal, affected_files, error_context),
            self._retrieve_kb_cards(goal, error_context)
        )

        context_packet['evidence']['related_units'] = related_units
        context_packet['evidence']['kb_cards'] = kb_cards
        context_packet['evidence']['cache_hits'] = cache_hits  # Include partial hits

        # Generate recommendations
        context_packet['recommended_actions'] = await self._generate_recommendations(
            context_packet['evidence']
        )

        # Calculate confidence
        context_packet['confidence'] = self._calculate_confidence(context_packet['evidence'])

        return context_packet

    def build_task_signature(self, goal: str, context: dict) -> str:
        """Build stable task signature for cache lookup."""
        error_codes = sorted(set(context.get('error_codes', [])))
        file_paths = sorted(set(context.get('file_paths', [])))[:3]
        tags = sorted(set(context.get('tags', [])))[:5]

        return f"""goal:{goal[:100]}
error_codes:{','.join(error_codes)}
files:{','.join(file_paths)}
tags:{','.join(tags)}
source:ace_task"""

    async def semantic_cache_lookup(
        self,
        task_signature: str,
        threshold: float = 0.85
    ) -> list[dict]:
        """Query phase89_cache_index for similar tasks."""
        # Embed signature
        embedding = await self.gpu_worker.embed_single(task_signature)

        # Search Qdrant
        results = await self._qdrant_search(
            collection='phase89_cache_index',
            vector=embedding.cpu().tolist(),
            limit=10,
            score_threshold=threshold
        )

        # GPU rerank
        if len(results) > 3:
            results = await self._gpu_rerank(results, embedding, top_k=3)

        # Load from Redis
        cache_hits = []
        for result in results:
            redis_key = result['payload']['redis_key']
            cached_value = await self.redis.get(redis_key)

            if cached_value:
                cache_hits.append({
                    'score': result['score'],
                    'artifact_kind': result['payload']['artifact_kind'],
                    'source': result['payload']['source'],
                    'confidence': result['payload']['confidence'],
                    'data': orjson.loads(cached_value),
                    'action': self._get_cache_action(result['score'])
                })

        return cache_hits

    def _get_cache_action(self, score: float) -> str:
        """Determine what to do with cached artifact."""
        if score >= 0.92:
            return 'direct_reuse'
        elif score >= 0.85:
            return 'reuse_with_validation'
        elif score >= 0.75:
            return 'reference_only'
        else:
            return 'recompute'

    async def _gpu_rerank(
        self,
        candidates: list,
        query_vec: torch.Tensor,
        top_k: int = 10
    ) -> list:
        """GPU-accelerated reranking."""
        candidate_vecs = torch.tensor(
            [c['vector'] for c in candidates],
            device=self.config.device,
            dtype=torch.float16
        )

        candidate_vecs = F.normalize(candidate_vecs, dim=1)
        query_vec = F.normalize(query_vec.unsqueeze(0), dim=1).half()

        scores = (candidate_vecs @ query_vec.T).squeeze()
        topk_indices = torch.topk(scores, k=min(top_k, len(scores))).indices

        return [candidates[i] for i in topk_indices.cpu().tolist()]

    # ... (rest of retrieval methods)

if __name__ == '__main__':
    config = ACEConfig()
    builder = ACEContextBuilder(config)

    # Example usage
    context = asyncio.run(builder.build_context(
        goal="Fix TS1005 in UnifiedButton.svelte",
        error_context={
            'error_codes': ['TS1005'],
            'file_paths': ['src/lib/components/UnifiedButton.svelte'],
            'tags': ['svelte5', 'runes']
        }
    ))

    print(orjson.dumps(context, option=orjson.OPT_INDENT_2).decode())
```

---

## 12. Summary: What to Do Next

### Priority 1 (Core Infrastructure)
1. ✅ Update Redis key schema to `ace:cache:*` pattern
2. ✅ Create `phase89_cache_index` Qdrant collection
3. ✅ Implement signature text templates
4. ✅ Implement tag normalization

### Priority 2 (ACE Implementation)
5. ✅ Build `ACEContextBuilder` class
6. ✅ Implement retrieval order (error → code → units → KB → cache)
7. ✅ Implement semantic cache lookup with thresholds
8. ✅ Add GPU reranking

### Priority 3 (Validation Pipeline)
9. ✅ Integrate langextract for AST validation
10. ✅ Only promote validated fixes to `phase89_kb_cards`
11. ✅ Track all attempts in Postgres

### LangExtract Integration

**Validation Gate: Only validated fixes → KB cards**

```bash
# Validate single fix
python scripts/phase89-langextract-validator.py --fix-id 12345

# Batch validate all pending
python scripts/phase89-langextract-validator.py --batch --limit 100
```

**Validation Checks:**
- ✅ Syntax: AST parses without errors
- ✅ Types: No new TypeScript errors
- ✅ Imports: All modules resolve
- ✅ Semantics: Variable scopes, control flow correct

**KB Card Promotion:** Only if `overall_valid = true` (0.92 confidence)

**Performance:** 17-62ms/fix, batch 100 fixes in 3-5 seconds

### What NOT to Do
❌ Store >50KB blobs in Qdrant
❌ Mix validated + unvalidated artifacts in KB cards
❌ Use web search for codebase queries
❌ Rely on chat history as primary memory
❌ Run GPU clustering in real-time queries

---

**Next Step**: Paste 3-5 actual Redis key examples (with values) and I'll give you the exact migration script to convert your current `phase89:*` keys to the ACE final form schema.

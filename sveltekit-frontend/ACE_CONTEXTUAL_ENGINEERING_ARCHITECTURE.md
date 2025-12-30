# ACE Contextual Engineering Architecture (Phase 89)

**Status**: Production Ready (2025-12-29)

## 1. System Overview

The **ACE (Agentic Contextual Engineering)** system is a high-performance knowledge synthesis pipeline designed to fix software errors autonomously. It leverages local hardware (RTX 3060 Ti) for vector operations and semantic search, keeping data local and secure.

### Core Components
| Component | Technology | Role |
| --- | --- | --- |
| **Pipeline Runner** | `scripts/run-ace-pipeline.ps1` | Orchestrates indexing, analysis, and testing |
| **Context7 Server** | Python 3.13 + `torch.multiprocessing` | **NEW**: Shared-GPU multi-core logic server (GIL-free) |
| **JSON Parser** | `phase89_json.py` | Robust loader: SIMD (if avail) > orjson > stdlib fallback |
| **Cache Store** | Redis (66k+ keys) | High-speed artifact storage |
| **Vector DB** | Qdrant | Semantic index for cache, code, and errors |
| **Embedding Model** | `embeddinggemma:latest` (Ollama) | 768-dimension dense vectors |
| **LLM** | `gemma3-legal:latest` | Summarization and tag generation |

## 2. Data Flow

### A. Ingestion & Indexing
1.  **Redis Cache Indexing** (`scripts/phase89-redis-qdrant-cache-indexer.mjs`):
    *   Scans Redis keys (`phase89:*`).
    *   Generates embeddings via Ollama (cached).
    *   Compresses metadata (gzip).
    *   Upserts to Qdrant collection `phase89_redis_cache_index`.

### B. Retrieval & Synthesis
1.  **Search**: GPU-accelerated cosine similarity search in Qdrant.
2.  **Reranking**: PyTorch tensor operations to rerank top-K candidates.
3.  **Synthesis**: ACE synthesizes a "context packet" from:
    *   Key error chunks.
    *   Relevant code snippets.
    *   Validated KB cards ("what worked before").
    *   Cached verification results.

## 3. Deployment & Usage

### Running the Pipeline
Use the new PowerShell runner for simplified operation:
```powershell
./scripts/run-ace-pipeline.ps1
```
*   **Option 1**: Index fresh Redis keys.
*   **Option 2**: Run synthesis stress test (Python/PyTorch).
*   **Option 4**: Full "Index + Test" cycle (**Recommended**).

### Technical Details (Python 3.13)
*   **SIMD JSON**: We use a custom wrapper `phase89_json.py` to ensure compatibility with Python 3.13. It attempts `simdjson` -> `orjson` -> `json`.
*   **Multiprocessing**: Replaced Go microservices with `torch.multiprocessing` server (`scripts/phase89-context7-python-multicore.py`). This allows sharing the single GPU context across multiple worker processes effectively.

## 4. Key Performance Metrics
*   **Cache Hit**: 10-20ms
*   **Vector Search**: <100ms (HNSW + GPU rerank)
*   **Indexing Rate**: ~10-20 keys/sec (limited by embedding generation)
*   **Speedup**: ~1000x over linear Redis scan.

## 5. LangExtract & Future Schema (Phase 90+)

### LangExtract Integration
To ensure structured data integrity for agentic tools, `LangExtract` will be integrated to validate:
1.  **Error Clusters**: Validate structure of error analysis.
2.  **Fix Recommendations**: Ensure fixes follow strict schema (diffs, file paths).
3.  **Tags**: Validate generated tags against a controlled vocabulary.

### Knowledge Base "Cards"
ACE moves towards "Cache Cards" stored in Qdrant:
-   **Payload**: Small metadata (tags, hash, success_rate).
-   **Blob**: Stored in Redis/Postgres (gzipped).
-   **Link**: Qdrant vector points to the blob.

**Retrieval Flow**:
1.  **Qdrant**: Fetch top 200 candidates (CPU HNSW).
2.  **GPU**: Rerank candidates using `phase89-context7-python-multicore.py`.
3.  **Synthesis**: Feed top 30-80 into ACE Prompt.

This architecture ensures scalable, high-speed retrieval without bloating the vector database.

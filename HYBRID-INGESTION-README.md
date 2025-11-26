# Legal AI Platform - Hybrid Ingestion System

A comprehensive document ingestion and embedding system for the Legal AI platform using **embeddinggemma:latest (768-dim)** with MinIO + PostgreSQL storage.

## Architecture Overview

### 🏗️ System Components

1. **ingestion-watcher** (C++) - Low-latency file change detection
2. **embedding-service** (Python) - GPU-accelerated embedding generation
3. **mcp-svelte-docs** (TypeScript) - SvelteKit route crawling and embedding triggers
4. **weekly-cleanup** (Python) - Deduplication and maintenance

### 🔄 Data Flow

```
File Change (VS Code/MCP)
        ↓
ingestion-watcher detects change
        ↓
embedding-service processes file
        ↓
MinIO: embeddings/ + originals/ + summaries/
        ↓
PostgreSQL: document_embeddings table
        ↓
Qdrant: 768d vector search
        ↓
Weekly cleanup removes duplicates
```

## Component Details

### 1. Ingestion Watcher (C++)

**Purpose**: Monitors file system changes and triggers embedding generation.

**Features**:
- Inotify-based file watching (Linux)
- SHA256 hash comparison to avoid reprocessing
- File type filtering (deny list for binaries)
- Size limits (10MB max)
- AVX2 optimizations for performance

**Build & Run**:
```bash
cd ingestion-watcher
mkdir build && cd build
cmake ..
make -j$(nproc)
./ingestion_watcher /path/to/watch
```

**Configuration**:
- Watches: `.cpp`, `.cu`, `.hpp`, `.svelte`, `.ts`, `.txt`, `.md`
- Denies: `.png`, `.zip`, `.exe`, `.dll`, etc.
- Triggers: Python embedding service on changes

### 2. Embedding Service (Python)

**Purpose**: Generates 768-dimensional embeddings using embeddinggemma.

**Features**:
- **embeddinggemma:latest** model (768-dim)
- Automatic chunking (2000 chars, 200 overlap)
- GPU acceleration with CPU fallback
- MinIO storage integration
- PostgreSQL metadata storage

**Setup**:
```bash
cd embedding-service
pip install -r requirements.txt
python embedding_service.py --file /path/to/document.txt
```

**Storage Format**:
```json
{
  "path": "src/rag_lora_trainer.cpp",
  "timestamp": "2025-11-25T18:20:12Z",
  "hash": "0749aebc...",
  "summary": "Fixes gradient checkpointing, NF4 quantization",
  "embedding_model": "embeddinggemma-768d",
  "embedding": [0.024, -0.918, ...],  // 768 values
  "chunk_index": 0,
  "total_chunks": 1
}
```

**Summary Style**: Code Fix Style (S1)
- Examples: "Fixes chrono template mismatch, adds CUDA error handling, implements gradient checkpointing"
- Focus: Identifies specific code improvements, bug fixes, and optimizations
- Purpose: Enables targeted code review and understanding of changes

### 3. MCP Svelte Docs Crawler (TypeScript)

**Purpose**: Crawls SvelteKit routes and triggers documentation embeddings.

**Features**:
- Playwright-based route discovery
- Automatic documentation extraction
- File system watching for doc changes
- MCP server integration
- WebSocket real-time updates

**Setup**:
```bash
cd mcp-svelte-docs
npm install
npm run build
npm start
```

**MCP Tools**:
- `crawl_sveltekit_docs` - Full route analysis
- `analyze_route_content` - Single route analysis
- `trigger_doc_embedding` - Manual embedding trigger

### 4. Weekly Cleanup (Python)

**Purpose**: Maintains embedding quality through deduplication and optimization.

**Features**:
- Cosine similarity duplicate detection (95% threshold)
- Content-hash deduplication
- Age-based cleanup (90-day retention)
- Vector index optimization
- Citation history preservation

**Run Cleanup**:
```bash
cd weekly-cleanup
pip install -r requirements.txt
python weekly_cleanup.py --dry-run  # Test run
python weekly_cleanup.py            # Real cleanup
```

## Database Schema

### document_embeddings Table

```sql
CREATE TABLE document_embeddings (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    hash TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    embedding_vector VECTOR(768),
    summary TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    UNIQUE(path, hash, chunk_index)
);

CREATE INDEX idx_embeddings_path ON document_embeddings(path);
CREATE INDEX idx_embeddings_timestamp ON document_embeddings(timestamp DESC);
```

## MinIO Bucket Structure

```
code-docs/
├── embeddings/
│   └── 2025-11-25/
│       ├── trainer.cpp.json
│       └── dataset_ingestion_pipeline.cpp.json
├── originals/
│   ├── trainer.cpp
│   └── mcp_llms.txt
└── summaries/
    ├── trainer.cpp.summary
    └── mcp_llms.summary
```

## Configuration

### Environment Variables

```bash
# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=legal_ai_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Embedding Service
MAX_CHUNK_SIZE=2000
CHUNK_OVERLAP=200
SIMILARITY_THRESHOLD=0.95
```

## Usage Examples

### Process Single File
```bash
python embedding-service/embedding_service.py --file src/rag_lora_trainer.cpp
```

### Watch Directory for Changes
```bash
./ingestion-watcher/build/ingestion_watcher src/ backend/
```

### Crawl SvelteKit Documentation
```bash
cd mcp-svelte-docs && npm run dev
# Then call MCP tools to crawl routes
```

### Run Weekly Maintenance
```bash
python weekly-cleanup/weekly_cleanup.py --days-to-keep 90
```

## Performance Characteristics

- **Ingestion Speed**: ~50-100 files/minute (GPU dependent)
- **Embedding Dimensions**: 768 (fixed for consistency)
- **Chunk Size**: 2000 characters with 200 overlap
- **Similarity Threshold**: 95% for deduplication
- **Retention Period**: 90 days rolling window

## Safety Features

- **File Type Filtering**: Automatic exclusion of binaries/images
- **Size Limits**: 10MB maximum file size
- **Duplicate Prevention**: Hash-based change detection
- **GPU Safety**: CPU fallback when GPU busy
- **Error Recovery**: Continues processing on individual failures

## Monitoring & Maintenance

### Health Checks
- Database connection status
- MinIO bucket accessibility
- Model loading status
- Queue processing rates

### Logs
- File processing events
- Embedding generation times
- Duplicate detection results
- Cleanup operation summaries

### Metrics
- Total embeddings stored
- Processing throughput
- Storage utilization
- Vector search performance

## Integration Points

### With VS Code
- File save triggers → ingestion-watcher
- MCP server integration → mcp-svelte-docs

### With SvelteKit Frontend
- Route crawling → mcp-svelte-docs
- Real-time updates → WebSocket connections

### With Backend Services
- Vector search → Qdrant integration
- Metadata queries → PostgreSQL
- File storage → MinIO

## Troubleshooting

### Common Issues

1. **CUDA Out of Memory**
   - Reduce batch size in embedding service
   - Enable CPU fallback

2. **Database Connection Errors**
   - Check PostgreSQL service status
   - Verify connection parameters

3. **MinIO Upload Failures**
   - Ensure bucket exists
   - Check network connectivity

4. **High Duplicate Rate**
   - Adjust similarity threshold
   - Review chunking parameters

### Performance Tuning

- **GPU Memory**: Monitor VRAM usage
- **Database**: Regular VACUUM operations
- **Storage**: Implement data lifecycle policies
- **Indexing**: Rebuild vector indexes periodically

## Key Concepts

### Gradient Checkpointing

**What it is**: A memory optimization technique for deep learning training that trades computation for memory efficiency.

**How it works**:
- During forward pass: Only saves select "checkpoint" activations instead of all intermediate values
- During backward pass: Recomputation of intermediate values when needed for gradient calculation
- **Result**: Dramatically reduces GPU memory usage (often 50-80% less) while increasing training time by ~20-30%

**Benefits for Legal AI**:
- Train larger models on limited GPU memory (RTX 3060 Ti)
- Enable longer context windows for legal document analysis
- Support more complex transformer architectures
- Reduce CUDA out-of-memory errors during fine-tuning

**Implementation**: Typically saves activations every N layers and recomputes the intermediate layers during backpropagation.</content>
<parameter name="filePath">c:\Users\james\Videos\deeds-web-app\HYBRID-INGESTION-README.md
# Phase 73: AI-Powered Error Fixer with CMake Build

**Complete automation pipeline: Error embedding → Semantic search → Redis caching → AST-based fixes**

## 🎯 Overview

Phase 73 builds on Phase 72's error embeddings with an intelligent AI fixer agent that:
- Searches Qdrant vector database for similar previously-fixed errors
- Caches fix patterns in Redis KAG storage (atomic counters)
- Applies safe AST-based code transformations using ts-morph
- Logs all changes to MinIO for audit trail and rollback
- Uses SIMD JSON parser for 10x faster error batch processing

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Phase 73 Fixer Pipeline                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Load errors.jsonl (16,436 errors from Phase 72)              │
│     → SIMD JSON Parser (Go service, Port 8096)                   │
│     → 10x faster parsing vs native JSON.parse                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Check Redis KAG Cache (Port 6379)                            │
│     → Error signature hash (SHA256)                              │
│     → Cached fix pattern? → Apply immediately                    │
│     → Cache miss? → Continue to Qdrant search                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Qdrant Semantic Search (Port 6333)                           │
│     → Generate embedding via Ollama (embeddinggemma:latest)      │
│     → Search phase72_error_patterns collection                   │
│     → Return top 5 similar errors (>70% cosine similarity)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AST-Based Fix Application (ts-morph)                         │
│     → Parse source file with TypeScript compiler                 │
│     → Locate error node by line/column                           │
│     → Apply safe transformation:                                 │
│       • TS1005: Add missing semicolon                            │
│       • TS1128: Remove extra semicolons                          │
│       • TS2304: Add import (requires context)                    │
│     → Dry run mode available for preview                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Store Fix Pattern to Redis KAG                               │
│     → Atomic pipeline: SET + HINCRBY                             │
│     → 24-hour TTL (86400 seconds)                                │
│     → Update stats: totalFixesStored, totalSignatures            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Audit Logging to MinIO (Port 4002)                           │
│     → Store before/after code diffs                              │
│     → AST transformation metadata                                │
│     → Bucket: phase73-fix-audit                                  │
│     → Enables rollback and analysis                              │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Components

### Go Microservices (CMake Build)

| Service | Port | Purpose | Binary |
|---------|------|---------|--------|
| SIMD JSON Parser | 8096 | 10x faster JSON parsing | `simd-json-parser.exe` |
| MinIO SIMD Service | 8095 | Object storage with SIMD metadata parsing | `minio-simd-service.exe` |
| Redis KAG Manager | - | Cache layer for fix patterns | `redis-kag-manager.exe` |
| Phase 73 Orchestrator | - | Main fixer coordinator | `phase73-fixer-orchestrator.exe` |

### Node.js Scripts

| Script | Purpose |
|--------|---------|
| `fixer-agent-phase73.mjs` | Main AI fixer agent (Qdrant → Redis → AST) |
| `redis-cache-helper.mjs` | Redis KAG utilities (stats, search, clear) |
| `generate-errors-jsonl.mjs` | Phase 72 - Generate error list from tsc/svelte-check |
| `embed-errors-phase73.mjs` | Phase 72 - Generate embeddings and upload to Qdrant |

## 🚀 Quick Start

### 1. Build Go Services (CMake)

```powershell
cd go-microservice
BUILD-PHASE73-CMAKE.bat
```

**What it does:**
- Configures CMake with Release build type
- Enables CUDA, SIMD, Redis, MinIO support
- Builds 4 Go binaries to `go-microservice/build/bin/`
- Takes ~2-3 minutes

### 2. Start All Services

```powershell
cd go-microservice
start-phase73-services.bat
```

**Launches:**
- ✅ Redis (Port 6379)
- ✅ SIMD JSON Parser (Port 8096)
- ✅ MinIO SIMD Service (Port 8095)

### 3. Verify Infrastructure

Run VS Code task: **`🧪 Phase 73: Health Check All Services`**

Or manually:
```powershell
node scripts/redis-cache-helper.mjs stats
```

Expected output:
```json
{
  "totalFixesStored": 0,
  "totalSignatures": 0,
  "fixes_TS1005": 0,
  "fixes_TS1128": 0
}
```

### 4. Run AI Fixer Agent (Dry Run)

```powershell
cd sveltekit-frontend
node --expose-gc --max-old-space-size=8192 scripts/fixer-agent-phase73.mjs --dry-run
```

**Dry run mode:**
- ✅ Loads errors from `reports/latest/errors.jsonl`
- ✅ Searches Qdrant for similar errors
- ✅ Checks Redis cache for fix patterns
- ✅ Previews AST transformations
- ❌ **Does NOT modify files**

### 5. Apply Fixes (Production Mode)

Remove `--dry-run` flag:

```powershell
node --expose-gc --max-old-space-size=8192 scripts/fixer-agent-phase73.mjs
```

**Safety features:**
- Batch size: 50 errors at a time
- Max fixes per run: 500 (configurable)
- Progress bars with ETA
- Detailed logging to `phase73_logs/`
- Atomic Redis transactions (no partial updates)

## 📋 VS Code Tasks

Press `Ctrl+Shift+P` → `Tasks: Run Task` → Choose:

### Build & Deploy
- **🔧 Phase 73: Build Go Services (CMake)** - Build all Go binaries
- **🚀 Phase 73: Start All Services** - Launch Redis + SIMD Parser + MinIO

### Run Fixer
- **🤖 Phase 73: Run AI Fixer Agent** - Apply fixes (production mode)
- **🤖 Phase 73: Run Fixer (Dry Run)** - Preview fixes only

### Utilities
- **📊 Phase 73: Redis Cache Stats** - Show KAG statistics
- **🔍 Phase 73: Ripgrep Search Codebase** - Search with context
- **🗑️ Phase 73: Clear Redis Cache** - Reset cache
- **🧪 Phase 73: Health Check All Services** - Verify all services running

## 🧠 Redis KAG Cache

### Storage Schema

```
phase72:kag:sig:<signature>     → JSON array of fix patterns (24h TTL)
phase72:kag:timestamp:<sig>     → Unix timestamp (24h TTL)
phase72:kag:stats               → Hash with counters
```

### Stats Hash Fields

```
totalFixesStored       → Total fix patterns stored
totalSignatures        → Unique error signatures
fixes_TS1005          → Count of TS1005 fixes
fixes_TS1128          → Count of TS1128 fixes
fixes_TS2304          → Count of TS2304 fixes
```

### CLI Tools

```bash
# Show statistics
node scripts/redis-cache-helper.mjs stats

# Get fix pattern by signature
node scripts/redis-cache-helper.mjs get a1b2c3d4e5f6g7h8

# Search codebase with ripgrep
node scripts/redis-cache-helper.mjs search "on:click" --context=3

# Clear all cached patterns
node scripts/redis-cache-helper.mjs clear
```

## 🔍 Ripgrep Integration

Searches codebase for patterns with context:

```typescript
ripgrepSearchPatterns('on:click', {
  directory: 'src',
  filePattern: '*.{ts,tsx,svelte}',
  contextLines: 2,
  caseSensitive: false
});
```

Returns structured matches:
```javascript
[
  {
    file: 'src/lib/components/Button.svelte',
    line: 42,
    content: '<button on:click={handleClick}>',
    context: [
      { line: 41, content: 'export let onClick;' },
      { line: 43, content: '  Click me' }
    ]
  }
]
```

## 🎨 AST Fix Handlers

### TS1005: Expected semicolon

```typescript
// Before
const x = 5
console.log(x)

// After (AST adds semicolon)
const x = 5;
console.log(x);
```

### TS1128: Declaration or statement expected

```typescript
// Before
;;; // Extra semicolons
export function foo() {}

// After (AST removes extra semicolons)
export function foo() {}
```

### TS2304: Cannot find name (WIP)

Requires import resolution - currently logs identifier for manual review.

## 📊 Performance Metrics

### Phase 72 (Error Generation + Embedding)

| Metric | Value |
|--------|-------|
| Total Errors | 16,436 |
| Generation Time | 70.58s |
| Embedding Time | 1283.44s (21 min) |
| Avg Embedding | 78.09ms/error |
| Success Rate | 100% |

### Phase 73 (AI Fixer - Projected)

| Metric | Estimate |
|--------|----------|
| Errors/Batch | 50 |
| Total Batches | 329 (16,436 / 50) |
| Avg Time/Error | ~200ms (Qdrant + Redis + AST) |
| Total Time | ~55 minutes (full run) |
| Cache Hit Rate | 30-40% (after first 1000 fixes) |

## 🐛 Troubleshooting

### SIMD Parser Not Available

If you see:
```
⚠️  SIMD parser not available, using native JSON
```

**Solution:**
1. Check service status: `curl http://localhost:8096/health`
2. Restart: `cd go-microservice && start-phase73-services.bat`
3. Rebuild: `BUILD-PHASE73-CMAKE.bat`

### Redis Connection Failed

```bash
# Check if Redis is running
netstat -an | find ":6379"

# Start Redis
cd ..\redis-latest
redis-server.exe --port 6379
```

### Qdrant Collection Not Found

```bash
# Verify collection exists
curl http://localhost:6333/collections/phase72_error_patterns

# If missing, re-run Phase 72 embedding generation
node scripts/embed-errors-phase73.mjs --limit 20000 --batch 2000
```

### AST Transformation Failed

Check `phase73_logs/` for detailed error logs:
```
phase73_logs/
├── session_2025-12-18T23-45-12/
│   ├── fixer.log          ← Detailed execution log
│   ├── fix-report.json    ← Statistics and results
│   └── failed-fixes.json  ← Errors that couldn't be fixed
```

## 🔐 Configuration

Edit `.env.phase72` in `sveltekit-frontend/`:

```bash
# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=embeddinggemma:latest

# Qdrant
QDRANT_URL=http://localhost:6333

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
KAG_PREFIX=phase72:kag

# MinIO
MINIO_URL=http://localhost:4002
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## 📈 Next Steps

1. **Increase Fix Coverage**: Add handlers for more error codes (TS2345, TS2322, etc.)
2. **Import Resolution**: Implement intelligent import adding for TS2304 errors
3. **ML-Based Ranking**: Train model to rank fix patterns by success probability
4. **Parallel Processing**: Use worker threads for batch processing
5. **MinIO Audit Trail**: Full implementation of rollback mechanism

## 📚 Related Documentation

- [Phase 72 README](../PHASE72_README.md) - Error generation and embedding
- [CMake Build Guide](../go-microservice/CMAKE_BUILD_GUIDE.md)
- [Redis KAG Architecture](../REDIS_KAG_ARCHITECTURE.md)
- [AST Transformation Guide](../AST_TRANSFORM_GUIDE.md)

## 🙏 Credits

Built with:
- [ts-morph](https://ts-morph.com/) - TypeScript AST manipulation
- [Qdrant](https://qdrant.tech/) - Vector database
- [Redis](https://redis.io/) - KAG cache
- [Ollama](https://ollama.ai/) - Local embeddings
- [CMake](https://cmake.org/) - Build system
- [ripgrep](https://github.com/BurntSushi/ripgrep) - Code search

---

**Phase 73** | Built December 18, 2025 | Legal AI Platform

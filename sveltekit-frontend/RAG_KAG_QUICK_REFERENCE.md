# Phase 79: RAG/KAG Quick Reference Card

## 🚀 Start Here

```bash
# 1. Ensure services running
ollama serve                          # Terminal 1
docker run -p 6333:6333 qdrant/qdrant # Terminal 2
npm run dev                           # Terminal 3

# 2. Initialize system
npm run knowledge:setup
npm run index:codebase ./src
npm run index:errors

# 3. Open dashboard
http://localhost:5173/indexing

# 4. Test Phase 79
npm run phase79 src/routes/+page.svelte
```

## 📡 API Endpoints

### Status
```bash
GET /api/indexing
→ Returns: { collections: { codebase, errors }, timestamp }
```

### Index Operations
```bash
POST /api/indexing/codebase
Body: { rootPath: "./src" }
→ Returns: { success, indexed, results[] }

POST /api/indexing/errors
→ Returns: { success, indexed, results[] }
```

### Search
```bash
POST /api/indexing/search
Body: { query: "...", limit: 5 }
→ Returns: { results: [file, chunk, similarity, content] }

POST /api/indexing/search-errors
Body: { query: "...", limit: 5 }
→ Returns: { results: [code, file, count, similarity] }
```

## 🔧 Configuration

**Environment Variables:**
```bash
QDRANT_URL=http://localhost:6333
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
OLLAMA_URL=http://localhost:11434
DATABASE_URL=postgresql://...
```

**Thresholds:**
- Codebase search: 0.7 (70% minimum)
- Error search: 0.6 (60% minimum)
- Composite score: 0.8 (80% for HIGH confidence)

## 📊 Collections

**phase79_codebase**
- 768 dimensions
- Cosine distance
- Stores: file_path, chunk_index, content, language, imports, exports, types

**phase79_error_analysis**
- 768 dimensions
- Cosine distance
- Stores: error_code, file_path, message, error_count, phase

## 🔍 Search Examples

### Codebase Search
```bash
"Svelte reactive state"
→ Returns similar patterns with $state, $derived, runes

"error handling with try catch"
→ Returns error handling code examples

"TypeScript interface"
→ Returns type definitions and interfaces
```

### Error Search
```bash
"cannot find module"
→ Returns TS2307 errors with import issues

"property does not exist"
→ Returns TS2339 errors with missing properties

"type mismatch"
→ Returns type-related errors
```

## 📈 Similarity Scoring

**Result Ranking:**
```
100% → Perfect match
90%  → Excellent match (use it)
80%  → Good match (probably useful)
70%  → Okay match (might help)
60%  → Weak match (limited value)
<60% → Ignore (too dissimilar)
```

## 💾 Storage

**MinIO Buckets:**
- `codebase-index/` - Indexed source files
- `error-analysis/` - Error pattern snapshots

**PostgreSQL Tables:**
- `knowledge_base` - Document chunks
- `error_cluster` - Error patterns

**Qdrant Collections:**
- `phase79_codebase` - Code vectors
- `phase79_error_analysis` - Error vectors

## ⚡ Performance

| Task | Time | Limit |
|------|------|-------|
| Index file | ~50ms | <1s |
| Generate embedding | 200-500ms | Per chunk |
| Search query | ~400ms | <1s |
| Full index | 2-5 min | 234 files |
| Memory | <2GB | Per service |

## 🧪 Testing

```bash
# Basic test
npm run test:all

# Component tests
npm run knowledge:test
npm run phase79:test

# Search tests
npm run search:codebase --query="state"
npm run search:errors --query="module"
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No embedding | Restart Ollama: `ollama serve` |
| No results | Re-index, lower threshold, try broader query |
| Slow search | Check Qdrant stats, optimize indexes |
| Full disk | Clean MinIO buckets or increase storage |
| No errors indexed | Check PostgreSQL error_cluster table |

## 📊 Monitoring

```bash
# Check collection stats
curl http://localhost:6333/collections/phase79_codebase

# Check Qdrant health
curl http://localhost:6333/health

# Check MinIO buckets
minio ls minio/

# Check database
psql -c "SELECT COUNT(*) FROM knowledge_base"
```

## 🎯 Phase 79 Integration

```typescript
// Automatic RAG flow in Phase 79:
1. Receive error (e.g., TS2307)
2. Search codebase: "import svelte/store"
3. Search errors: "cannot find module"
4. Build augmented prompt with context
5. Generate patch with LLM
6. Validate with 4-layer checks
7. Rank: Validation (60%) + Similarity (40%)
8. Apply if composite score ≥ 80%
```

## 📁 File Locations

**Services:**
- Indexer: `src/lib/services/codebase-indexer.ts`
- API: `src/routes/api/indexing/+server.ts`
- UI: `src/routes/indexing/+page.svelte`
- Middleware: `scripts/phase79-rag-kag-middleware.py`

**Documentation:**
- Guide: `CODEBASE_INDEXER_GUIDE.md`
- Knowledge: `KNOWLEDGE_BASE_GUIDE.md`
- Testing: `RAG_KAG_TESTING_GUIDE.md`
- Summary: `PHASE79_RAG_KAG_SUMMARY.md`

## 🔗 Quick Links

- Dashboard: http://localhost:5173/indexing
- Knowledge UI: http://localhost:5173/knowledge
- Qdrant API: http://localhost:6333
- MinIO UI: http://localhost:9000
- API Docs: http://localhost:8000/docs (Python)

## 💡 Tips

1. **Broader queries work better** - "import module" > "import svelte/store"
2. **Lower threshold for more results** - 0.6 > 0.7 for exploratory search
3. **Re-index after major changes** - New files need indexing
4. **Monitor similarity scores** - Check if results make sense
5. **Use error phases** - Tag with phase66-79 for tracking
6. **Archive regularly** - Backup MinIO buckets
7. **Monitor memory** - Watch Ollama/Qdrant usage
8. **Test searches** - Verify before using in Phase 79

## 🚨 Critical Commands

```bash
# Emergency restart all services
killall ollama
docker stop qdrant
npm run dev

# Reset collections (WARNING: loses data)
curl -X DELETE http://localhost:6333/collections/phase79_codebase
curl -X DELETE http://localhost:6333/collections/phase79_error_analysis

# Verify all services
npm run services:check

# Quick status check
curl http://localhost:5173/api/indexing
```

## 📋 Checklist for Production

- [ ] Services running (Ollama, Qdrant, PostgreSQL)
- [ ] Environment variables set
- [ ] npm scripts added to package.json
- [ ] Initial indexing complete
- [ ] Searches return results
- [ ] Phase 79 integration verified
- [ ] MinIO buckets created
- [ ] PostgreSQL tables created
- [ ] Monitoring in place
- [ ] Backups configured
- [ ] Performance baselines recorded
- [ ] Team trained on usage

## 🎓 Learn More

- Full guides: See CODEBASE_INDEXER_GUIDE.md
- Testing: See RAG_KAG_TESTING_GUIDE.md
- Architecture: See PHASE79_RAG_KAG_COMPLETE.md
- Implementation: See source code with TypeScript comments

---

**Version:** 1.0
**Status:** Production Ready
**Last Updated:** January 2024

For detailed information, see the comprehensive guides in the documentation folder.

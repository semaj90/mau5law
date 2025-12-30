# ACE Quick Reference Card

**Fast lookup for daily ACE operations**

---

## 🚀 Most Used Commands

### **Smart Search (Phase 93)**
```powershell
# Basic search
python scripts/phase93-smart-filter.py "your query here"

# Common patterns
python scripts/phase93-smart-filter.py "svelte errors"
python scripts/phase93-smart-filter.py "typescript TS1005"
python scripts/phase93-smart-filter.py "auth login bugs"
python scripts/phase93-smart-filter.py "docker database issues"
```

### **Timeline Queries (Phase 92)**
```powershell
# Recent edits (last 24 hours)
python scripts/phase92-event-sourcing.py --recent-edits

# Recent edits (last week)
python scripts/phase92-event-sourcing.py --recent-edits --hours 168

# Search timeline
python scripts/phase92-event-sourcing.py --search-timeline "cache index"
```

---

## 📋 Tag Cheat Sheet

### **Feature Tags** (use in queries)
```
svelte    → Svelte/SvelteKit components
typescript → TypeScript files
auth      → Authentication/authorization
api       → API endpoints/routes
database  → Database/Postgres/Prisma
docker    → Containers/deployment
cache     → Redis/caching
rag       → Vector search/embeddings
```

### **Error Tags** (use in queries)
```
ts2304 → Cannot find name
ts1005 → Expected token (syntax)
ts2345 → Argument type mismatch
ts2322 → Type not assignable
ts7006 → Implicit any
```

---

## 🎯 Query Patterns

### **By Technology**
```powershell
"svelte components"
"typescript errors"
"docker containers"
"database queries"
```

### **By Error Type**
```powershell
"TS1005 syntax errors"
"ts2304 undefined variable"
"typescript type errors"
```

### **By Feature + Error**
```powershell
"svelte typescript errors"
"auth login TS2304"
"api endpoint type errors"
```

### **By Time**
```powershell
"recent svelte fixes"          # Last 24h
"typescript errors yesterday"  # Last 24h
"last week database changes"   # Last 168h
```

---

## ⚡ Performance Expectations

| Query Type | Expected Latency |
|-----------|------------------|
| Single tag | ~600ms |
| Multi-tag | ~500ms |
| Timeline search | ~300ms |
| Recent edits | ~50ms |

---

## 🔧 Troubleshooting

### **No results returned?**
```powershell
# Check collection exists
python scripts/phase92-timeline-collection.py --verify

# Try without filters
python scripts/phase93-smart-filter.py "error" --limit 10
```

### **Slow query?**
```powershell
# Reduce candidates
python scripts/phase93-smart-filter.py "query" --hnsw-limit 20

# Check GPU
nvidia-smi
```

### **Wrong results?**
```powershell
# Get JSON output to inspect
python scripts/phase93-smart-filter.py "query" --json

# Check what tags were extracted
# (Look for "Extracted Intent" in output)
```

---

## 📊 Confidence Levels

```
✅ SAFE_REUSE (>0.55)  → High confidence, use directly
⚠️  VERIFY (0.38-0.55) → Medium confidence, review
❌ MISS (<0.38)        → Low confidence, ignore
```

---

## 🎓 Example Workflows

### **Workflow 1: Find Svelte 5 Runes Migration Issues**
```powershell
python scripts/phase93-smart-filter.py "svelte runes migration" --limit 10
```

### **Workflow 2: Debug TypeScript Compilation Errors**
```powershell
python scripts/phase93-smart-filter.py "typescript TS1005" --limit 5
```

### **Workflow 3: Check Recent Authentication Changes**
```powershell
python scripts/phase92-event-sourcing.py --search-timeline "auth" --hours 24
```

### **Workflow 4: Review Database Schema Updates**
```powershell
python scripts/phase93-smart-filter.py "database schema" --collection phase92_timeline_events
```

---

## 🔑 Environment Variables

```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
OLLAMA_URL=http://localhost:11434
POSTGRES_DSN=postgresql://user:pass@localhost:5434/legal
```

---

## 📦 Collections

| Collection | Purpose | Points |
|-----------|---------|--------|
| `phase89_cache_index` | Main codebase search | ~78 |
| `phase92_timeline_events` | Event history | ~2 |
| `phase89_kb_cards` | Validated fixes | TBD |

---

**Quick Access:** Bookmark this file for daily reference!

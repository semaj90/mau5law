# 🚨 ACE Indexing Recovery Guide
**Status Check:** January 2, 2026 - Evening Session

## ⚠️ Critical Issue Detected

**Problem:** Qdrant is offline (Docker Desktop not running)
**Impact:** Full codebase indexing cannot continue
**Solution:** Restart Docker Desktop + Qdrant container

---

## 🔧 Quick Recovery Steps

### 1. Start Docker Desktop
```powershell
# Start Docker Desktop (or manually from Start menu)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait ~30 seconds for Docker to start
Start-Sleep -Seconds 30
```

### 2. Verify Qdrant Container
```powershell
# Check if Qdrant container exists
docker ps -a | Select-String "qdrant"

# Start Qdrant if stopped
docker start phase66-qdrant  # Or your Qdrant container name

# Verify Qdrant is accessible
curl http://localhost:6333/collections
```

### 3. Check Indexing Progress
```powershell
cd sveltekit-frontend
.\scripts\check-indexing-progress.ps1
```

### 4. Resume Indexing (If Needed)
```bash
# Check how many files were indexed before crash
curl http://localhost:6333/collections/fastmcp_file_profiles | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object points_count

# Resume from that point (example: 301 files)
cd C:\Users\james\Videos\deeds-web-app
python backend/scripts/fastmcp_batch_indexer.py --start 301 --workers 8
```

---

## 📊 Session State Before Issue

### What Was Completed ✅
1. ✅ **Enhanced Codebase Indexer Built**
   - `fastmcp_ripgrep_indexer.py` (400 lines)
   - `fastmcp_batch_indexer.py` (200 lines)
   - `query_indexed_codebase.py` (150 lines)

2. ✅ **ACE Error Analysis Complete**
   - Parsed 73,475 TypeScript errors
   - Clustered into 724 unique patterns
   - Generated 20 cluster cards + 50 file cards
   - Ready for embedding phase

3. ✅ **Documentation Created** (2,800+ lines)
   - ACE_ENHANCED_CODEBASE_INDEXER.md
   - ACE_LANGEXTRACT_INTEGRATION.md
   - ACE_PHASE89_PRODUCTION_SUMMARY.md
   - ACE_DEPLOYMENT_CHECKLIST.md
   - ACE_SESSION_STATUS_20260102.md

4. ✅ **Indexing Started**
   - Target: 13,039 files
   - Last known progress: 301 files (2.31%)
   - Method: 8 concurrent workers
   - Models: gemma3:270m + embeddinggemma

### What Needs Recovery 🔄
- **Qdrant** - Must be online for indexing to work
- **Full Codebase Indexing** - Resume from last checkpoint
- **ACE Error Embedding** - Waiting for Ollama availability

---

## 🎯 Post-Recovery Next Steps

### Immediate (After Qdrant Restart)

#### 1. Resume Full Codebase Indexing
```bash
# Check current progress
curl http://localhost:6333/collections/fastmcp_file_profiles

# Resume indexing
python backend/scripts/fastmcp_batch_indexer.py --workers 8
# OR if you know the checkpoint:
python backend/scripts/fastmcp_batch_indexer.py --start 301 --workers 8
```

#### 2. Monitor Progress
```powershell
# Check every 15 minutes
while ($true) {
    Clear-Host
    .\scripts\check-indexing-progress.ps1
    Start-Sleep -Seconds 900  # 15 minutes
}
```

### Once Indexing Completes

#### 3. Complete ACE Error Embedding
```bash
cd sveltekit-frontend
python scripts/ace-check-ingest.py --input check_output.txt
```

This will:
- Generate embeddings for 20 cluster cards + 50 file cards
- Validate with LangExtract (port 8095)
- Store in Qdrant: `phase89_ace_cluster_cards`, `phase89_file_error_cards`

#### 4. Verify All Collections
```bash
python backend/scripts/query_indexed_codebase.py --stats
python backend/scripts/query_indexed_codebase.py --tag service --limit 10
python backend/scripts/query_indexed_codebase.py "TypeScript error handling"
```

---

## 🛠️ Alternative: Lightweight Recovery

If Docker Desktop won't start or you want to test without full stack:

### Option A: Use Qdrant in Memory Mode (Testing Only)
```python
# Modify fastmcp_batch_indexer.py temporarily
from qdrant_client import QdrantClient

# Change from:
client = QdrantClient(url="http://localhost:6333")

# To:
client = QdrantClient(":memory:")  # In-memory only, lost on exit
```

### Option B: Skip Qdrant, Store in JSON (Backup)
```python
# Create a simple JSON storage fallback
import json

indexed_files = []
for file in files:
    profile = index_file(file)
    indexed_files.append(profile)

with open('indexed_files_backup.json', 'w') as f:
    json.dump(indexed_files, f, indent=2)
```

**Note:** These are temporary solutions. Production requires Qdrant.

---

## 📋 System Status Checklist

Before resuming, verify:

- [ ] Docker Desktop running
- [ ] Qdrant accessible (`curl http://localhost:6333/collections`)
- [ ] Redis running (`docker ps | grep redis`)
- [ ] Ollama running (`curl http://localhost:11434/api/tags`)
- [ ] LangExtract running (`curl http://localhost:8095/health` or check port)
- [ ] Python environment activated
- [ ] Environment variables set (`$env:PYTHONUTF8="1"`)

---

## 🚀 Full Recovery Command Sequence

```powershell
# 1. Start Docker Desktop (manual or via command)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 30

# 2. Verify all services
docker ps | Select-String "qdrant|redis|postgres"

# 3. Check Qdrant
curl http://localhost:6333/collections

# 4. Check last indexed count
curl http://localhost:6333/collections/fastmcp_file_profiles | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object points_count

# 5. Resume indexing
cd C:\Users\james\Videos\deeds-web-app
$env:PYTHONUTF8="1"
python backend/scripts/fastmcp_batch_indexer.py --workers 8

# 6. Monitor in separate terminal
cd sveltekit-frontend
.\scripts\check-indexing-progress.ps1
```

---

## 📞 Help & References

**Documentation:**
- Full guide: `ACE_SESSION_STATUS_20260102.md`
- Architecture: `ACE_ENHANCED_CODEBASE_INDEXER.md`
- Deployment: `ACE_DEPLOYMENT_CHECKLIST.md`

**Key Scripts:**
- Progress monitor: `scripts/check-indexing-progress.ps1`
- Batch indexer: `backend/scripts/fastmcp_batch_indexer.py`
- Query tool: `backend/scripts/query_indexed_codebase.py`
- ACE ingest: `scripts/ace-check-ingest.py`

**Quick Health Check:**
```powershell
# All in one
Write-Host "Qdrant:" (curl -s http://localhost:6333/collections -ErrorAction SilentlyContinue | Select-Object -First 1)
Write-Host "Ollama:" (curl -s http://localhost:11434/api/tags -ErrorAction SilentlyContinue | Select-Object -First 1)
Write-Host "Redis:" (docker exec phase66-redis redis-cli PING 2>&1)
```

---

## ✅ Recovery Complete When...

1. ✅ Qdrant responds to `curl http://localhost:6333/collections`
2. ✅ Progress script shows: "Collection: fastmcp_file_profiles"
3. ✅ Indexing process running (check with `tasklist | Select-String python`)
4. ✅ Progress percentage increasing

**Then:** Let it run for ~4 hours, check back, and complete ACE error embedding!

---

**Remember:** The batch indexer is **resumable** - you won't lose progress! 🎯

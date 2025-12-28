# 🔥 CRITICAL: Phase 89 Database Configuration
**Canonical reference for all Phase 66/87/89 PostgreSQL connections**

---

## The Two PostgreSQL Instances

Your environment has **TWO separate PostgreSQL databases**:

| Instance | Port | Database | User | Password | Purpose | Phase |
|----------|------|----------|------|----------|---------|-------|
| **Docker pgvector** | **5434** | **legal** | **user** | **pass** | ✅ **Embeddings, HNSW, KAG, Phase 89** | **66/87/89** |
| App Database | 5432 | legal_ai_db | legal_admin | 123456 | ❌ Not used by Phase 89 | 76 |

---

## 🔥 Why Port 5434 is Canonical for Phase 89

### All Embeddings Generated Here
```sql
-- error_embeddings table (768-dim vectors via embeddinggemma)
SELECT COUNT(*) FROM error_embeddings;  -- Port 5434/legal
```

### All HNSW Indexes Built Here
```sql
-- Vector similarity search indexes
CREATE INDEX idx_error_embeddings_vector ON error_embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### All KAG Graph Data Stored Here
```sql
-- Knowledge graph tables
SELECT COUNT(*) FROM kg_nodes;   -- Port 5434/legal
SELECT COUNT(*) FROM kg_edges;   -- Port 5434/legal
SELECT COUNT(*) FROM file_index; -- Port 5434/legal
```

### Phase 86/87 Autonomous Loop Uses This
```javascript
// scripts/phase86-autonomous-loop.mjs
const pool = new pg.Pool({
  port: 5434,           // ✅ Correct
  database: "legal",    // ✅ Correct
  user: "user"          // ✅ Correct
});
```

### Prevents Windows PostgreSQL Collision
- Port 5432 often conflicts with native Windows PostgreSQL
- Port 5434 is dedicated to Docker container
- No accidental overwrites

---

## Environment Variables (Correct Setup)

### Phase 89 (Knowledge Graph + Embeddings)
```powershell
# PRIMARY: Phase 66/87 Docker PostgreSQL
$env:DATABASE_URL = "postgresql://user:pass@127.0.0.1:5434/legal"

# Or use specific env vars
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5434"
$env:PGDATABASE = "legal"
$env:PGUSER = "user"
$env:PGPASSWORD = "pass"
```

### Phase 76 App (Optional - Not Used by Phase 89)
```powershell
# SECONDARY: Phase 76 app database (if needed)
$env:DATABASE_URL_APP = "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
```

---

## Container Name

```powershell
# Check container exists
docker ps -a --filter "name=phase66-postgres"
```

**Expected output**:
```
CONTAINER ID   IMAGE         PORTS                    NAMES
abc123def456   postgres:17   0.0.0.0:5434->5432/tcp   phase66-postgres
```

**Start if stopped**:
```powershell
docker start phase66-postgres
```

**Verify connectivity**:
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "SELECT version();"
```

---

## Tables in Phase 89 Database (Port 5434)

### From Phase 66/87 (Embeddings)
```sql
-- TypeScript errors
\d ts_errors

-- Error embeddings (768-dim vectors)
\d error_embeddings

-- Fix patterns with embeddings
\d fix_patterns
```

### From Phase 89 (Knowledge Graph)
```sql
-- Unified entity table
\d kg_nodes

-- Typed relationships
\d kg_edges

-- AST metadata
\d file_index
```

**Check table counts**:
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT
  (SELECT COUNT(*) FROM ts_errors) as ts_errors,
  (SELECT COUNT(*) FROM error_embeddings) as embeddings,
  (SELECT COUNT(*) FROM kg_nodes) as kg_nodes,
  (SELECT COUNT(*) FROM kg_edges) as kg_edges,
  (SELECT COUNT(*) FROM file_index) as file_index
"
```

---

## Common Mistakes (DON'T DO THIS)

### ❌ Wrong Port
```powershell
# WRONG: Phase 76 app database (no embeddings, no HNSW)
psql "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
```

### ❌ Wrong Database
```powershell
# WRONG: Even if port is correct, wrong database name
psql "postgresql://user:pass@127.0.0.1:5434/legal_ai_db"
```

### ❌ Wrong User
```powershell
# WRONG: Even if port and database are correct, wrong user
psql "postgresql://legal_admin:123456@127.0.0.1:5434/legal"
```

### ✅ Correct Connection String
```powershell
# RIGHT: Phase 66/87 Docker PostgreSQL
psql "postgresql://user:pass@127.0.0.1:5434/legal"
```

---

## Scripts Using Phase 89 Database

All these scripts **MUST** use port 5434/legal/user:

1. `scripts/phase86-autonomous-loop.mjs` ✅ Fixed
2. `scripts/phase87-autonomous-fixer.mjs` (verify)
3. `scripts/phase89-build-error-graph.mjs` ✅ Correct
4. `scripts/phase89-kb-grounded-fix.ps1` ✅ Correct
5. `scripts/phase89-quick-start.ps1` ✅ Correct
6. `go-services/knowledge-plane/run.ps1` ✅ Correct

---

## Quick Verification Commands

### Test Phase 89 Database Connection
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT
  'Database: ' || current_database() as db_check,
  'User: ' || current_user as user_check,
  'Port: ' || inet_server_port() as port_check
"
```

**Expected output**:
```
       db_check        |  user_check  | port_check
-----------------------+--------------+------------
 Database: legal       | User: user   | Port: 5434
```

### Check Vector Extension
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT * FROM pg_extension WHERE extname = 'vector'
"
```

**Expected**: `vector` extension installed

### Check HNSW Indexes
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexdef LIKE '%ivfflat%'
"
```

**Expected**: Indexes on `error_embeddings.embedding` and `fix_patterns.embedding`

---

## Migration Path (If You Used Wrong DB)

If you accidentally used port 5432/legal_ai_db/legal_admin:

### Step 1: Export Data
```powershell
# Export from wrong DB
pg_dump "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db" \
  -t ts_errors -t error_embeddings -t fix_patterns \
  > wrong_db_export.sql
```

### Step 2: Import to Correct DB
```powershell
# Import to correct DB
psql "postgresql://user:pass@127.0.0.1:5434/legal" -f wrong_db_export.sql
```

### Step 3: Verify
```powershell
psql "postgresql://user:pass@127.0.0.1:5434/legal" -c "
SELECT COUNT(*) FROM ts_errors
"
```

---

## hardened `run.ps1` Configuration

From `go-services/knowledge-plane/run.ps1`:

```powershell
# CORRECT: Phase 66/87 Docker PostgreSQL
$env:KP_DATABASE_URL = $env:KP_DATABASE_URL ?? "postgresql://user:pass@127.0.0.1:5434/legal"
```

**NOT**:
```powershell
# WRONG: Phase 76 app database
$env:KP_DATABASE_URL = "postgresql://legal_admin:123456@127.0.0.1:5432/legal_ai_db"
```

---

## Summary

| What | Value |
|------|-------|
| **Port** | **5434** |
| **Database** | **legal** |
| **User** | **user** |
| **Password** | **pass** |
| **Connection String** | **postgresql://user:pass@127.0.0.1:5434/legal** |
| **Container** | **phase66-postgres** |
| **Used By** | Phase 66, 67, 86, 87, 88, **89** |

**Remember**: Port 5432/legal_ai_db/legal_admin is Phase 76 app DB and **NOT** used by Phase 89!

---

**This is the canonical database configuration for all Phase 89 operations.** 🔒

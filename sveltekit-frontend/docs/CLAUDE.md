# Phase 72 – GPU Environment (Claude / Cursor / VS Code)

## Canonical Python (GPU Legal Env)

**Python Environment:**
- **Python:** 3.13.5 (`.venv` - shared with TensorRT-LLM)
- **Path:** `C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe`
- **PyTorch:** `torch 2.9.0+cu128`
- **Device:** `cuda:0` (NVIDIA GeForce RTX 3060 Ti, 12GB VRAM)

**Environment Variable:**
```powershell
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
```

**Rule:** Phase 72 GPU jobs MUST use `${PHASE72_PYTHON}`.
Global `python` (if different) is for experiments only.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/phase72-svelte-check-vectorize.mjs` | Calls `phase72_gpu_vectorizer.py` via `${PHASE72_PYTHON}` |
| `scripts/phase72_gpu_vectorizer.py` | PyTorch GPU embeddings (8D vectors from errors) |
| `scripts/phase72-gpu-pipeline.mjs` | Full pipeline: svelte-check → vectorize → cluster → ingest |
| `scripts/phase72-logger.mjs` | Structured logs (`logs/phase72/*.jsonl`) |
| `scripts/phase72-auto-iterate.mjs` | 3-cycle automation with progress bars |

## Logging Fields for Claude Agents

When Claude interacts with Phase 72, these fields are logged:

```json
{
  "ts": "2025-12-01T20:00:00.000Z",
  "kind": "llm_call",
  "phase": "phase72",
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022",
  "tokens_in": 1024,
  "tokens_out": 512,
  "latency_ms": 2500,
  "python_bin": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe",
  "cuda_available": true,
  "error_count": 12000
}
```

## Usage Examples

### Run Phase 72 with Claude-aware logging

```powershell
# Set Python path
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

# Run 3-cycle automation
cd sveltekit-frontend
npm run phase72:auto-iterate

# Query Claude-specific logs
cat logs/phase72/*.jsonl | jq 'select(.provider == "claude")'
```

### Check GPU vectorizer status

```powershell
# Verify Python has PyTorch CUDA
& $env:PHASE72_PYTHON -c "import torch; print('CUDA:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0))"

# Expected output:
# CUDA: True
# Device: NVIDIA GeForce RTX 3060 Ti
```

### View vectorization metrics

```powershell
# See GPU vectorization performance
cat logs/phase72/*.jsonl | jq 'select(.step == "vectorize_gpu") | {errorCount: .metrics.errorCount, latency_ms: .metrics.latency_ms, device: .metrics.device}'
```

## Use These Logs To

1. **Detect regressions:** Compare `error_count` across runs
2. **Throttle expensive calls:** Track `tokens_in/out` per provider
3. **Feed ACE/ACA:** Token-efficiency stats for orchestration
4. **Optimize clusters:** Identify which error patterns require most LLM fixes

## Claude Best Practices

**When editing Phase 72 code:**
- ✅ Preserve logging calls (`logPhaseStep`, `logLlmCall`)
- ✅ Keep error count metrics accurate
- ✅ Use `PHASE72_PYTHON` env var for all Python spawns
- ✅ Add `provider: "claude"` to any LLM-related logs

**When fixing TypeScript errors:**
- ✅ Reduce errors in largest clusters first (highest impact)
- ✅ Validate syntax before committing (run `svelte-check`)
- ✅ Update Phase 72 logs with fix count and token usage
- ✅ Test GPU vectorizer still works after AST changes

## Integration with ACE/ACA

Phase 72 logs are consumed by:
- **ACE (Automated Code Evolution):** Applies fixes based on cluster analysis
- **ACA (Agentic Code Automation):** Orchestrates multi-agent workflows

Claude should treat Phase 72 as a **competitive game**:
- **Goal:** Fix max errors with min tokens
- **Metric:** `errors_fixed_per_1k_tokens`
- **Scoreboard:** Stored in Postgres `phase72_logs` table

## Troubleshooting

**Problem:** `Python spawn error: torch not found`
```powershell
# Solution: Verify PHASE72_PYTHON points to .venv
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
& $env:PHASE72_PYTHON -m pip list | findstr torch
```

**Problem:** `CUDA device not found`
```powershell
# Solution: Check NVIDIA driver and PyTorch CUDA support
nvidia-smi
& $env:PHASE72_PYTHON -c "import torch; print(torch.version.cuda)"
```

**Problem:** Logs not appearing in `logs/phase72/`
```powershell
# Solution: Check log directory exists
New-Item -ItemType Directory -Force -Path sveltekit-frontend\logs\phase72
npm run phase72:auto-iterate
```

## CUDA Version Matrix

| Component | Version | Source |
|-----------|---------|--------|
| CUDA Toolkit | 13.0 | System install (for nvcc, LibTorch) |
| CUDA Runtime (PyTorch) | 12.8 | Bundled in `torch 2.9.0+cu128` wheel |
| Driver | 566.36+ | NVIDIA GeForce driver |

**Why two CUDA versions?**
- **13.0:** Used by CMake/C++ builds (LibTorch, TensorRT-LLM)
- **12.8:** Used by Python PyTorch (bundled runtime, no manual linking needed)
- Both coexist safely - PyTorch wheel is self-contained

## Next Steps

After Phase 72 completes:
1. **Review logs:** `cat logs/phase72/*.jsonl | jq .`
2. **Check error reduction:** 12k → 6k → 3k → ~1.2k (~90%)
3. **Analyze clusters:** Identify remaining error patterns for Phase 73
4. **Update ACE:** Ingest logs into Qdrant + Postgres for future runs

---

## 🗄️ Drizzle ORM 0.44 Migration Best Practices

### Stack
- **Drizzle ORM**: 0.44.x
- **Drizzle Kit**: 0.30.x
- **PostgreSQL**: via `postgres-js` driver
- **Schema Location**: `src/lib/server/db/schema-postgres.ts`
- **Migrations Directory**: `drizzle/`

### Migration Scripts (package.json)
```bash
db:check           # Validate schema syntax before any operation
db:push:dev        # Interactive push (development only, with prompts)
db:generate        # Create SQL migration files (review before applying)
db:migrate:apply   # Apply migrations (production-safe)
db:verify:canvas   # Verify canvas_states table exists
db:studio          # Open Drizzle Studio GUI
```

### "No Data Loss" Workflow
```
1. Change schema → src/lib/server/db/schema-postgres.ts
2. npm run db:generate → Creates drizzle/00XX_xxx.sql
3. REVIEW the SQL file:
   ✅ CREATE TABLE, ALTER TABLE ADD COLUMN
   ❌ DROP TABLE, DROP COLUMN, TRUNCATE, ALTER COLUMN TYPE
4. npm run db:migrate:apply → Applies to database
```

### Critical Rules
1. **Never use `db:push` on production** - Use `db:generate` → review → `db:migrate:apply`
2. **Always review generated SQL** for DROP/TRUNCATE statements
3. **Use `doublePrecision()` for float8 columns** to avoid precision loss
4. **Run `db:check` before any migration** to catch syntax errors early
5. **Backup before migrations**: `pg_dump -Fc -f backup.dump`

### Schema Type Mappings
| PostgreSQL | Drizzle |
|------------|---------|
| `uuid` | `uuid()` |
| `text` | `text()` |
| `varchar(n)` | `varchar('col', { length: n })` |
| `integer` | `integer()` |
| `boolean` | `boolean()` |
| `jsonb` | `jsonb()` |
| `timestamp` | `timestamp('col', { mode: 'string' })` |
| `float8/double precision` | `doublePrecision()` |
| `float4/real` | `real()` |
| `text[]` | `text('col').array()` |

### Canvas States Table Verification
Before saving board state, verify table exists:
```typescript
import { verifyCanvasStatesTable } from '$lib/server/db/verify-canvas-table';

const tableExists = await verifyCanvasStatesTable();
if (!tableExists) {
    return json({ error: 'canvas_states table missing', code: 'TABLE_MISSING' }, { status: 503 });
}
```

### Related Files
- `src/lib/server/db/schema-postgres.ts` - Main schema
- `src/lib/server/db/index.ts` - DB client + exports
- `src/lib/server/db/verify-canvas-table.ts` - Table existence check
- `drizzle.config.ts` - Drizzle Kit configuration
- `drizzle/` - Migration files

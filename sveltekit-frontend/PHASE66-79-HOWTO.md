# Phase 66–79 Error Brain — How-To (Production Grade)

This distills the existing Phase 66–79 tooling into a repeatable, corruption-proof pipeline: capture errors, cluster/rank them, index for search/RAG, and feed deterministic fixes/prompts.

## 0. Hard Rules (Corruption Prevention)

### Rule A — Env Import Quarantine
Only allow `$env/*` imports in one folder: `src/lib/env/**`.
Everything else must import from your wrappers.
**CI Gate:** Fail if any file outside `src/lib/env` contains `$env/`.

### Rule B — Fixers Must Be Idempotent
Every pattern fixer should:
1. Detect → Patch → Re-detect (same file) → Ensure "no second patch".
2. Emit `changed:false` if already compliant.
This prevents "pattern fixer injected hundreds of imports" scenarios.

## Playbook: Log, Cluster, Rank, Index, Serve

### 1. Capture & Normalize (Enhanced)
Run linters/checkers with structured output and normalize to a unified JSONL schema.

- **Run Checkers:**
  ```bash
  pnpm svelte-check --json > reports/svelte-check-latest.json
  ```
- **Ingest & Normalize:**
  ```bash
  node scripts/error-ingest.mjs --input reports/svelte-check-latest.json --run run-$(date +%s)
  ```
  *Schema:*
  ```json
  {
    "runId": "...",
    "commit": "...",
    "tool": "svelte-check",
    "file": "src/routes/+page.svelte",
    "line": 10,
    "column": 5,
    "code": "js(2322)",
    "message": "Type string is not assignable...",
    "snippet": "...",
    "fingerprint": "hash(tool|ruleId|code|messageNormalized|fileRel|lineBucket)",
    "projectRootRel": "src/routes/+page.svelte",
    "ruleId": "js(2322)",
    "severity": "error"
  }
  ```

### 2. Pattern Detection & Clustering (With Guardrails)
Define regex-based patterns to group errors.

- **Registry:** `scripts/patterns.json`
  - `scope`: "ts" | "svelte" | "sql" | "tests" | "env"
  - `risk`: "safe" | "medium" | "high"
  - `requires`: ["fileExists:...", "contains:...", "notContains:..."]
  - `patchKind`: "replace" | "codemod" | "ast" | "manual"

### 3. Ranking (Impact vs Risk)
Score errors by severity, frequency, and recency, plus:

- **Impact Score:** Cluster size, distinct packages touched, build-breaker status.
- **Risk Score:** Chance of runtime breakage (Env/Auth/DB = High Risk).
- **Prioritization:** Impact / Risk (Safe big wins first).

### 4. Indexing (PgVector + Qdrant)
- **Postgres 17 + pgvector:** Canonical history (runs, errors, fixes, patches).
- **Qdrant:** Speed layer for ANN retrieval (error message + snippet).
- **Linkage:** Store `error_id` and `fingerprint` in both.

### 5. Auto-Fix Pipeline (3-Phase Risk Tier)
Apply deterministic fixes based on risk tiers.

- **Phase 1 (Safe):** Renames, import style, obvious Svelte 5 migrations.
  ```bash
  node scripts/phase79-pattern-fixer.mjs --apply --risk=safe --verify
  ```
- **Phase 2 (Medium):** Superforms adapters, drizzle enum renames.
  ```bash
  node scripts/phase79-pattern-fixer.mjs --apply --risk=medium --verify
  ```
- **Phase 3 (High):** Env refactors, auth helpers, db wiring.
  ```bash
  node scripts/phase79-pattern-fixer.mjs --apply --risk=high --verify
  ```

### 6. Context Packs (Standardized)
Standardized JSON object for LLM prompts:
```json
{
  "fingerprint": "...",
  "patternId": "db-import",
  "fixTemplate": "...",
  "error": { ... },
  "topSimilarResolved": [ ... ],
  "repoContext": {
    "framework": "SvelteKit",
    "svelteVersion": "5",
    "db": "Postgres17+Drizzle",
    "vector": "pgvector+Qdrant"
  }
}
```

### 7. CouchDB Analytics
Use CouchDB for MapReduce graph analysis:
- `errors_by_run`
- `fingerprint_edges` (fingerprint → patternId)
- `file_hotspots` (file → fingerprints)
- `pattern_cooccurrence`

### 8. Corruption Prevention Hooks
- **Pre-fixer hook:** Scan changed files for forbidden imports. Abort if detected.
- **Post-fixer hook:** Run same scan. If found, auto-revert/cleanup and mark run as "tainted".

## 9. Recommended Loop (Upgraded)

1. **Ingest:**
   ```bash
   node scripts/error-ingest.mjs --run run-01
   ```
2. **Rank:**
   ```bash
   node scripts/error-leaderboard.mjs --run run-01
   ```
3. **Fix Safe Wins:**
   ```bash
   node scripts/phase79-pattern-fixer.mjs --apply --risk=safe --verify
   ```
4. **Re-Ingest:**
   ```bash
   node scripts/error-ingest.mjs --run run-02
   ```
5. **Fix Medium:**
   ```bash
   node scripts/phase79-pattern-fixer.mjs --apply --risk=medium --verify
   ```
6. **Graph Analysis:**
   ```bash
   node scripts/error-graph-push.mjs --run run-03
   ```
7. **Fix High Risk:**
   ```bash
   node scripts/phase79-pattern-fixer.mjs --apply --risk=high --verify
   ```

## Key Patterns (Phase 79)

- **Drizzle Enum:** `active` -> `open`, `done` -> `closed`.
- **DB Import:** `import { db }` -> `import db`.
- **Superforms:** `zodClient` -> `zod` (server adapters).
- **Svelte Route:** `[[...path]]` in `<style>` -> `[...path]`.
- **Env Vars:** `DATABASE_URL` -> `process.env.DATABASE_URL` (with context safety).
- **Type Imports:** `import type` used as runtime value.

## File Layout

- `scripts/phase79-pattern-fixer.mjs`: Deterministic fixer & regression gate.
- `scripts/error-ingest.mjs`: Normalization pipeline.
- `scripts/error-leaderboard.mjs`: Ranking logic.
- `scripts/error-search.mjs`: Semantic search CLI.
- `scripts/patterns.json`: Pattern registry.
- `reports/`: Stores leaderboards and fix logs.
- `logs/errors/`: Stores raw JSONL error logs.


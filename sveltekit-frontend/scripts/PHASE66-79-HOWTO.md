# Phase 66–79 Error Brain — How-To

This distills the existing Phase 66–79 tooling already in `scripts/` into a repeatable pipeline: capture errors, cluster/rank them, index for search/RAG, and feed deterministic fixes/prompts.

## Playbook: Log, Cluster, Rank, Index, Serve

### 1. Capture & Normalize
Run linters/checkers with structured output and normalize to a unified JSONL schema.

- **Run Checkers:**
  ```bash
  pnpm svelte-check --json > reports/svelte-check-latest.json
  ```
- **Ingest & Normalize:**
  ```bash
  node scripts/error-ingest.mjs --input reports/svelte-check-latest.json --run run-$(date +%s)
  ```
  *Schema:* `{runId, commit, tool, file, line, column, code, message, snippet, fingerprint}`
  *Storage:* `logs/errors/<runId>.jsonl`

### 2. Pattern Detection & Clustering
Define regex-based patterns to group errors.

- **Registry:** `scripts/patterns.json` (Canonical patterns with ID, regex, fixTemplate, priority).
- **Logic:** `scripts/phase79-pattern-fixer.mjs` contains the active detection and fix logic.

### 3. Ranking
Score errors by severity, frequency, and recency to prioritize fixes.

- **Generate Leaderboard:**
  ```bash
  node scripts/error-leaderboard.mjs --run <runId>
  ```
  *Outputs:* `reports/phase79-leaderboard/errors-top1000.json`

### 4. Indexing for Search/RAG
Index errors and fixes for semantic lookup.

- **Search CLI:**
  ```bash
  node scripts/error-search.mjs --query "PgEnum active" --top 20
  ```
- **Vector Store:** Uses Qdrant/Ollama (`embeddinggemma:latest`) to embed error messages and snippets.

### 5. Auto-Fix Pipeline
Apply deterministic fixes based on patterns.

- **Run Fixer (SAFE MODE):**
  ```bash
  # ALWAYS start with safe patterns only
  node scripts/phase79-pattern-fixer.mjs --risk=safe --apply
  ```

- **⚠️ CRITICAL SAFETY RULES:**
  1. **ALWAYS backup before applying**: All fixes create `.phase79.bak` files
  2. **START WITH SAFE PATTERNS ONLY**: Use `--risk=safe` flag
  3. **VERIFY AFTER EACH RUN**: Check error count doesn't increase
  4. **NEVER apply all patterns at once**: Too risky, hard to debug
  5. **ROLLBACK ON REGRESSION**: Restore from `.phase79.bak` files immediately

- **Rollback Process:**
  ```powershell
  # If error count increases, immediately restore:
  Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
      $original = $_.FullName -replace '\.phase79\.bak$', ''
      Copy-Item $_.FullName $original -Force
  }
  ```

  *Features:*
  - Iterates patterns by priority.
  - Generates `reports/fix-log-<runId>.jsonl` audit trail.
  - Optional regression gate: `--verify` (runs svelte-check after fixes).

- **Known Dangerous Patterns (DISABLED):**
  - `env-type-declarations`: Injects garbage imports
  - `auth-machine-garbage-*`: Corrupts state machine code
  - Any pattern with `risk: "high"` in patterns.json

### 6. Contextual Prompting Integration
Use the indexed data to build "context packs" for LLM prompts.

- **Workflow:**
  1. Lookup error fingerprint -> Check for known fix.
  2. Lookup pattern ID -> Get `fixTemplate`.
  3. Vector Search -> Find similar resolved errors.
  4. Construct Prompt: `{error, patternId, fixTemplate, examplePatch, similarFiles}`.

## Recommended Quick Loop

1. **Capture & Ingest:**
   ```bash
   # Runs svelte-check internally and saves to logs/errors/run-01.jsonl
   node scripts/error-ingest.mjs --run=run-01
   ```

2. **⚠️ Fix (SAFE MODE ONLY):**
   ```bash
   # CRITICAL: ONLY apply safe patterns
   node scripts/phase79-pattern-fixer.mjs --risk=safe --apply
   ```

3. **Verify & Re-Ingest:**
   ```bash
   # IMMEDIATELY verify error count didn't increase
   npx svelte-check --output machine 2>&1 | Select-String "COMPLETED"

   # If errors increased, ROLLBACK:
   # Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
   #     $original = $_.FullName -replace '\.phase79\.bak$', ''
   #     Copy-Item $_.FullName $original -Force
   # }

   # Then re-ingest to confirm baseline
   node scripts/error-ingest.mjs --run=run-02
   ```

4. **Rank:**
   ```bash
   # Generates a leaderboard of remaining errors
   node scripts/error-leaderboard.mjs --run=run-02
   ```

5. **Search:**
   ```bash
   # Search for specific error types
   node scripts/error-search.mjs --query "remaining errors"
   ```

## ⚠️ LESSONS LEARNED (Dec 25, 2025)

### Pattern Fixer Regression Incident
- **Issue**: Applied all patterns without verification → 14,511 errors jumped to 81,562 (+67k)
- **Root Cause**: "auth-machine-garbage" patterns corrupted files instead of fixing them
- **Recovery**: Restored from `.phase79.bak` files (backup system worked perfectly)

### Best Practices Going Forward:
1. **ALWAYS use `--risk=safe` flag first**
2. **NEVER apply all patterns at once** - too hard to identify which pattern broke things
3. **VERIFY after each pattern application** - check error count immediately
4. **Keep backup files** until verified - don't clean up `.phase79.bak` files prematurely
5. **Audit patterns.json regularly** - disable dangerous patterns with `risk: "disabled"`
6. **Test patterns on small file sets first** - use `--dry-run` to preview changes

### Recovery Commands (Keep Handy):
```powershell
# Restore all from backups
Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
    $original = $_.FullName -replace '\.phase79\.bak$', ''
    Copy-Item $_.FullName $original -Force
}

# Clean up backups after verification
Get-ChildItem -Recurse -Filter "*.phase79.bak" | Remove-Item -Force

# Quick error count check
npx svelte-check --output machine 2>&1 | Select-String "COMPLETED" | Select-Object -Last 1
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
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

- **Run Fixer:**
  ```bash
  node scripts/phase79-pattern-fixer.mjs --apply
  ```
  *Features:*
  - Iterates patterns by priority.
  - Generates `reports/fix-log-<runId>.jsonl` audit trail.
  - Optional regression gate: `--verify` (runs svelte-check after fixes).

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

2. **Fix:**
   ```bash
   # Applies deterministic fixes based on patterns.json
   node scripts/phase79-pattern-fixer.mjs --apply
   ```

3. **Verify & Re-Ingest:**
   ```bash
   # Runs svelte-check again to verify fixes
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
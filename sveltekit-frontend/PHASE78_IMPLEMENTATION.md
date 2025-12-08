# Phase 78 - Cutlass Error Tracking System

## Overview

Phase 78 (Cutlass) is a comprehensive error tracking system that ties together:
- **Phase 72**: Route AST graph (1,495 routes)
- **Phase 74**: LangExtract service (error normalization)
- **Phase 90**: PostgreSQL database with Drizzle ORM

## Architecture

```
Error Logs (TypeScript/Vite)
    ↓
Phase 78 Collector (error parsing)
    ↓
Phase 72 Mapper (route graph lookup)
    ↓
Phase 74 Enrichment (LangExtract)
    ↓
Phase 90 Database (insert + health tracking)
    ↓
NES Command Center (UI visualization)
```

## Implementation Status

### ✅ Completed

1. **Route Graph Adapter** (`src/lib/phase72/routeGraphAdapter.ts`)
   - Type definitions for raw route nodes and UI groups
   - Classification logic (Cases/Evidence/Persons/System)
   - Badge enrichment (status, AI, shield, error, health)
   - Search and filtering utilities

2. **Drizzle Schema Tables** (3 files)
   - `src/lib/server/db/schema/route_health.ts` - Current health state per route
   - `src/lib/server/db/schema/error_events.ts` - Individual error occurrences
   - `src/lib/server/db/schema/error_suggestions.ts` - AI-generated fix suggestions

3. **Database Migration**
   - `drizzle/migrations/20251110_phase78_error_tracking.sql`
   - Creates all 3 tables with proper indexes
   - Supports PostgreSQL with UUID, timestamps, JSONB

4. **Error Collector Script** (`scripts/phase78-collect-errors.mts`)
   - Parses TypeScript/Vite error logs
   - Maps file paths to routes using Phase 72 graph
   - Calls Phase 74 LangExtract for enrichment
   - Generates comprehensive error summary with health states

5. **NPM Scripts** (`package.json`)
   - `phase78:collect-errors` - Main collector
   - `phase78:collect-errors:dry-run` - Preview mode
   - `phase78:collect-errors:verbose` - Detailed logging
   - `phase78:insert` - Insert errors into database (Part 2)
   - `phase78:insert:dry-run` - Preview database inserts
   - `phase78:insert:verbose` - Detailed insert logging
   - `phase78:cluster` - CUDA clustering on embeddings (Part 2)
   - `phase78:cluster:dry-run` - Preview clustering
   - `phase78:cluster:verbose` - Detailed clustering logs
   - `phase78:suggest` - LLM-based fix suggestions (Part 3)
   - `phase78:suggest:dry-run` - Preview suggestions
   - `phase78:suggest:verbose` - Detailed suggestion logs
   - `phase78:check-results` - View database statistics
   - `phase78:full` - Complete pipeline: collect → insert → cluster → suggest

6. **Server Load Update** (`src/routes/(app)/all-routes/+page.server.ts`)
   - Now uses Phase 72 route graph adapter
   - Returns grouped routes with health stats

## How It Works

### 1. Error Collection

The Phase 78 collector reads error logs from:
- `logs/tsc.log` - TypeScript compilation errors
- `logs/vite-build.log` - Vite build errors
- `logs/phase72.log` - Phase 72 graph generation errors

**Parsing:** Regex extracts file path, line, column, error code, and message
```typescript
// Example error line:
// src/routes/cases/[id]/overview/+page.ts(42,5): error TS1005: ';' expected.
```

### 2. Route Mapping

Phase 72 graph contains node objects with:
- `path`: SvelteKit route (e.g., `/cases/[id]/overview`)
- `file`: Source file (e.g., `src/routes/cases/[id]/overview/+page.svelte`)

Collector creates a `Map<filePath, routePath>` for O(1) lookups

### 3. Enrichment (LangExtract)

Optional POST to Phase 74 service at `http://127.0.0.1:8010/langextract/analyze`:
```json
{
  "text": "';' expected.",
  "kind": "ts-error",
  "errorCode": "TS1005"
}
```

Response includes semantic metadata for clustering and suggestions

### 4. Health State Tracking

Routes classified as:
- **Healthy** (0 errors): ✅
- **Flaky** (2-4 errors): ⚠️
- **Broken** (5+ errors): ❌

### 5. Database Schema

#### route_health
Tracks current state per route:
```sql
id UUID, route_path TEXT UNIQUE, file_path TEXT,
error_state TEXT, recent_error_count INT,
last_error_cluster_id TEXT, last_error_message_short TEXT, last_error_at TIMESTAMP,
created_at TIMESTAMP, updated_at TIMESTAMP
```

#### error_events
Logs individual occurrences:
```sql
id UUID, route_path TEXT, file_path TEXT,
ts_code TEXT, severity TEXT, message TEXT, stack TEXT,
cluster_id TEXT, meta_json TEXT, created_at TIMESTAMP
```

#### error_suggestions
AI-generated or manual fixes:
```sql
id UUID, route_path TEXT, error_event_id UUID,
cluster_id TEXT, summary TEXT, patch TEXT,
risk_level TEXT, created_by_user_id TEXT,
applied BOOLEAN, applied_at TIMESTAMP,
created_at TIMESTAMP, updated_at TIMESTAMP
```

## Usage

### Dry Run (Preview)
```bash
npm run phase78:collect-errors:dry-run
```

### Collect Errors
```bash
npm run phase78:collect-errors
```

### Full Pipeline
```bash
npm run phase78:full
```

### Output Example
```
✅ HEALTHY ROUTES (347):
  /all-routes
  /cases
  /cases/[id]/overview
  ...

⚠️ FLAKY ROUTES (12):
  /evidence/analyze (3 errors)
  /assistant/chat (4 errors)
  ...

❌ BROKEN ROUTES (8):
  /gpu-metrics (12 errors)
  /detection/analyze (15 errors)
  ...
```

## Next Steps

### Phase 78 Part 2: Clustering
- Run errors through CUDA clustering on embeddings
- Group similar errors together
- Identify root causes across multiple routes

### Phase 78 Part 3: Suggestions
- Use LLM to generate fix suggestions
- Apply semantic analysis from LangExtract
- Track which suggestions have been applied

### Integration with UI
- Display health badges in `/all-routes`
- Show error details in modal
- Apply suggested fixes
- Track fix effectiveness

## Testing

### Manual Test
1. Generate some TypeScript errors (leave syntax error in a file)
2. Run: `npm run phase78:collect-errors:verbose`
3. Check output for route classification and health states

### Database Test
1. Apply migration: `npm run db:migrate`
2. Run collector with DB inserts (when implemented)
3. Query tables to verify data

### Integration Test
1. Check `/all-routes` page loads correctly
2. Verify route groups display (Cases/Evidence/Persons/System)
3. Inspect health badges from database

## Files Modified

- `package.json` - Added Phase 78 npm scripts
- `src/lib/server/db/schema/index.ts` - Exported new tables

## Files Created

- `src/lib/phase72/routeGraphAdapter.ts` (300+ lines)
- `src/lib/server/db/schema/route_health.ts` (40 lines)
- `src/lib/server/db/schema/error_events.ts` (40 lines)
- `src/lib/server/db/schema/error_suggestions.ts` (50 lines)
- `scripts/phase78-collect-errors.mts` (273 lines)
- `drizzle/migrations/20251110_phase78_error_tracking.sql` (60 lines)

## Architecture Notes

### Error State Machine

```
HEALTHY (0 errors)
  ↓ (new error)
FLAKY (1-4 errors)
  ↓ (more errors)
BROKEN (5+ errors)
  ↓ (fixes applied)
HEALTHY (errors cleared)
```

### Cluster ID Strategy

Errors with same cluster_id share:
- Similar root cause
- Same error code (e.g., TS1005)
- Semantic similarity (from LangExtract embeddings)
- Can be fixed with same patch

### Risk Levels for Suggestions

- **Low**: Single character fix, no refactoring
- **Medium**: Local fix, affects one function
- **High**: Cross-module impact, requires testing

## Performance Considerations

- Phase 72 graph loads once (cached)
- LangExtract calls timeout at 5 seconds (non-blocking)
- Database indexes on route_path, ts_code, created_at
- Incremental error collection (only new errors)

## Phase 78 - Parts 2 & 3 Implementation

### Part 2: Insert & Clustering

**`scripts/phase78-insert-errors.mts`**
- Reads `logs/phase78-errors.json` from collector
- Inserts into `error_events` table
- Updates `route_health` table with error counts
- Health state calculation:
  - 0 errors = healthy ✅
  - 1-4 errors = flaky ⚠️
  - 5+ errors = broken ❌

Usage:
```bash
npm run phase78:insert              # Normal insert
npm run phase78:insert:dry-run      # Preview without inserting
npm run phase78:insert:verbose      # Detailed output
```

**`scripts/phase78-cluster-errors.mts`**
- Generates embeddings using Ollama (default: nomic-embed-text)
- Performs K-means clustering on error messages
- Updates `cluster_id` on error_events
- Default: 10 clusters, configurable via `CLUSTER_COUNT` env var

Environment variables:
```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
EMBEDDING_MODEL=nomic-embed-text
CLUSTER_COUNT=10
BATCH_SIZE=32
```

Usage:
```bash
npm run phase78:cluster              # Normal clustering
npm run phase78:cluster:dry-run      # Preview
npm run phase78:cluster:verbose      # Detailed logs
```

### Part 3: LLM-Based Suggestions

**`scripts/phase78-generate-suggestions.mts`**
- Groups errors by cluster_id
- Generates fix suggestions using Ollama (default: gemma3:latest)
- Assesses risk level:
  - 🟢 Low: Style, formatting, warnings
  - 🟡 Medium: Syntax, structure errors
  - 🔴 High: Type errors, runtime errors, breaking changes
- Inserts into `error_suggestions` table with patch and summary

Usage:
```bash
npm run phase78:suggest              # Generate suggestions
npm run phase78:suggest:dry-run      # Preview
npm run phase78:suggest:verbose      # Detailed output
```

### Results & Monitoring

**`scripts/phase78-check-results.mts`**
- Displays total errors by severity
- Shows route health distribution
- Reports cluster statistics
- Shows suggestion statistics with risk breakdown

Usage:
```bash
npm run phase78:check-results
```

### Full Pipeline

Run complete error processing:
```bash
npm run phase78:full
# Equivalent to: collect → insert → cluster → suggest
```

### Quick Start Example

1. Create sample error log:
```bash
cat > logs/tsc.log << 'EOF'
src/routes/cases/[id]/+page.ts(10,5): error TS1005: ';' expected.
src/routes/cases/[id]/+page.ts(20,1): error TS2322: Type mismatch.
EOF
```

2. Run collection:
```bash
npm run phase78:collect-errors:verbose
```

3. Insert into database:
```bash
npm run phase78:insert:verbose
```

4. Cluster similar errors:
```bash
npm run phase78:cluster:verbose
```

5. Generate suggestions:
```bash
npm run phase78:suggest:verbose
```

6. View results:
```bash
npm run phase78:check-results
```

## Monitoring

Track metrics in Phase 78:
- Error velocity (new errors per hour)
- Route health distribution
- Top error codes by frequency
- Fix effectiveness (% suggestions applied)
- Error clustering quality (cluster size distribution)

---

**Status**: Core infrastructure complete
**Next Phase**: CUDA clustering + LLM suggestions
**Timeline**: Phase 78 spans 2-3 sprints depending on GPU availability

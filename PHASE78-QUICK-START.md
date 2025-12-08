# 🚀 Phase 78 Error Brain - Quick Start Guide

## Prerequisites

```bash
# 1. Database up and running
echo "PostgreSQL 17 on localhost:5434 (Docker Desktop)"

# 2. Ollama embeddings available
curl -s http://localhost:11434/api/tags
# Should return: { "models": [{ "name": "gemma:latest", ... }] }

# 3. Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5434/legal_ai_db"
export OLLAMA_URL="http://localhost:11434"
```

## Step-by-Step Execution

### **Step 1: Apply Schema Migration** (One-time)

```bash
cd sveltekit-frontend

# Generate migration (if needed)
npx drizzle-kit generate

# Apply to database
npx drizzle-kit push

# Verify (should show 6 tables)
psql "$DATABASE_URL" -c "\dt" | grep error_
```

### **Step 2: Collect Errors**

```bash
cd ..  # Back to main project root

# Run error collector
node scripts/phase78-collect-errors.mts

# Output: sveltekit-frontend/.phase78-collection.json
# Contains: total, byKind, byRoute, events[]

# Verify database
psql "$DATABASE_URL" -c "SELECT count(*) FROM error_events;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM route_health;"
```

### **Step 3: Cluster Errors (K-means via CUDA)**

```bash
# With default k=20
node scripts/phase78-cluster-errors.mts

# With custom k=10
node scripts/phase78-cluster-errors.mts --k 10

# Force recompute (ignore cached IDs)
node scripts/phase78-cluster-errors.mts --force-recompute

# Output: sveltekit-frontend/.phase78-clustering.json
# Contains: total_events, clusters_created, cluster_sizes

# Verify clustering
psql "$DATABASE_URL" -c "SELECT count(*) FROM error_clusters;"
psql "$DATABASE_URL" -c "SELECT event_count, affected_routes FROM error_clusters LIMIT 5;"
```

### **Step 4: Enrich Route Graph**

```bash
# Add health metadata to Phase 72 route graph
node scripts/phase72-enrich-with-health.mts

# Output: sveltekit-frontend/static/phase72/route-ast-graph.json
# Now includes: meta.errorState, meta.errorCount, meta.lastErrorAt
```

### **Step 5: Test Error Brain Endpoint**

```bash
# Start dev server (in another terminal)
cd sveltekit-frontend && npm run dev

# In another terminal, test the endpoint
curl -X POST http://localhost:5173/api/error-brain/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "routePath": "/cases/overview",
    "useCache": true
  }'

# Response: { routePath, suggestion { summary, patch, riskLevel, confidence }, context }
```

### **Step 6: Enable Lucia Auth** (Optional for now)

```typescript
// src/routes/api/error-brain/recommend/+server.ts
// Line: const { user } = await locals.auth.validateRequest();

// Uncomment auth check:
// if (!user || !user.roles.includes('dev')) {
//   return json({ error: 'Unauthorized' }, { status: 401 });
// }
```

## Monitoring & Debugging

### Check Error Events

```sql
-- Top 10 recent errors
SELECT route_path, kind, severity, message, created_at
FROM error_events
ORDER BY created_at DESC
LIMIT 10;

-- Errors by route
SELECT route_path, count(*) as error_count
FROM error_events
GROUP BY route_path
ORDER BY error_count DESC
LIMIT 20;

-- Error distribution by kind
SELECT kind, count(*) as count
FROM error_events
GROUP BY kind;
```

### Check Route Health

```sql
-- Routes in broken state
SELECT route_path, state, total_error_count, recent_error_count, last_error_at
FROM route_health
WHERE state = 'broken'
ORDER BY last_error_at DESC;

-- Top unhealthy routes
SELECT route_path, total_error_count, state
FROM route_health
ORDER BY total_error_count DESC
LIMIT 10;
```

### Check Clustering

```sql
-- Cluster distribution
SELECT event_count, array_length(affected_routes, 1) as route_count
FROM error_clusters
ORDER BY event_count DESC
LIMIT 10;

-- Largest cluster
SELECT canonical_message, event_count, affected_routes
FROM error_clusters
WHERE event_count = (SELECT max(event_count) FROM error_clusters);
```

### Test Route Health Machine

```typescript
// In src/lib/state/routeHealthMachine.ts

// Manual test
import { createMachine, interpret } from 'xstate';
import { routeHealthMachine } from '$lib/state/routeHealthMachine';

const actor = interpret(routeHealthMachine.withContext({
  routePath: '/test/route',
  recentErrorCount: 0,
  totalErrorCount: 0,
  lastErrorAt: null,
  lastErrorClusterId: null,
  lastErrorMessageShort: null
})).start();

// Simulate errors
actor.send({
  type: 'ERROR_OBSERVED',
  clusterId: 'cluster-1',
  severity: 'error',
  message: 'Test error'
});

console.log(actor.getSnapshot().value); // 'flaky'
```

## UI Testing

### 1. Navigate to /all-routes

```
http://localhost:5173/all-routes
```

### 2. Check Health Badges

- Should see green (✅ healthy), yellow (⚠️ flaky), or red (❌ broken) badges
- Filtered by route health state

### 3. Test "Ask Error Brain"

- Click on a route in the table
- Modal opens with health info
- Click "🧠 Ask Error Brain" button
- Should see loading indicator
- Response shows: summary, patch, risk level, confidence

### 4. Inspect Suggestion

- Patch displayed as unified diff
- Risk assessment color-coded
- Confidence as percentage
- Related tests listed

## Troubleshooting

### Ollama not responding

```bash
# Start Ollama
ollama serve

# In another terminal, pull Gemma model
ollama pull gemma:latest

# Verify API
curl -s http://localhost:11434/api/tags | jq .
```

### Database errors

```bash
# Check connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Reset tables (DANGER: clears all data)
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS error_patch_log, error_suggestions, error_clusters, error_events, route_health CASCADE;"
npx drizzle-kit push
```

### Schema mismatch

```bash
# Regenerate types
npx drizzle-kit generate

# Update migrations
npx drizzle-kit migrate
```

### Clustering timeout

- Increase `--batch` size: `--batch 100`
- Reduce `--k`: `--k 10`
- Check Ollama memory: `ollama show gemma:latest`

## Performance Tips

1. **Batch Error Collection**
   - Run once per hour via cron
   - Or trigger on CI pipeline (after npm check/lint)

2. **Cache Context**
   - `route_context_cache` TTL: 30 minutes
   - Reduces RAG/KAG rebuilds

3. **Cluster Incremental**
   - Only cluster unclustered events: default behavior
   - Use `--force-recompute` weekly

4. **Index Optimization**
   - Use `(route_path, created_at)` for recent errors
   - Use `cluster_id` for suggestion lookup

## Advanced Customization

### Change Clustering Parameters

```bash
# Fewer, larger clusters
node scripts/phase78-cluster-errors.mts --k 10

# More, smaller clusters
node scripts/phase78-cluster-errors.mts --k 50

# Smaller batches (slower but lower memory)
node scripts/phase78-cluster-errors.mts --batch 10
```

### Change Error Collection Frequency

```bash
# In your CI/CD pipeline (GitHub Actions example)
- name: Collect errors
  run: node scripts/phase78-collect-errors.mts
  if: always()  # Run even if tests fail

- name: Cluster errors
  run: node scripts/phase78-cluster-errors.mts
  if: always()
```

### Customize LLM Prompt

Edit `src/lib/server/phase78/contextBuilder.ts` → `buildLlmPrompt()`

```typescript
// Add custom instructions
const systemPrompt = `
You are an expert error fixer for SvelteKit applications.
Only suggest patches that:
1. Are low-risk (compile-tested)
2. Don't change API contracts
3. Include unit test coverage
`;
```

## Next: Connect to Phase 90 (Patch Application)

Once error brain is working:

1. Create POST `/api/phase90/apply-patch` endpoint
2. Verify patch format (unified diff)
3. Apply to file system
4. Run tests
5. Commit + push to git
6. Log audit trail

See: PHASE78-PHASE90-INTEGRATION.md (TODO)

---

## Quick Command Reference

```bash
# Full pipeline (all steps)
npx drizzle-kit push && \
node scripts/phase78-collect-errors.mts && \
node scripts/phase78-cluster-errors.mts && \
node scripts/phase72-enrich-with-health.mts

# Just collection
node scripts/phase78-collect-errors.mts

# Just clustering
node scripts/phase78-cluster-errors.mts --k 20

# Just enrichment
node scripts/phase72-enrich-with-health.mts

# Test endpoint
curl -X POST http://localhost:5173/api/error-brain/recommend \
  -H "Content-Type: application/json" \
  -d '{"routePath":"/cases/overview","useCache":true}'
```

---

**Status**: ✅ Ready to execute
**Last Updated**: December 7, 2025
**Maintainer**: AI Error Brain Team

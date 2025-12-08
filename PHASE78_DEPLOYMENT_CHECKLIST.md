# Phase 78 - Deployment Checklist

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] PostgreSQL 17 running on localhost:5432
- [ ] Database `legal_ai_db` created
- [ ] `.env` file with `DATABASE_URL` set
- [ ] Drizzle ORM configured and working
- [ ] Ollama running on localhost:11434 (for clustering)
- [ ] Embedding model `nomic-embed-text` available in Ollama
- [ ] LLM model `gemma3:latest` available in Ollama

### Database Setup
- [ ] Run migration: `npm run db:migrate`
- [ ] Verify tables created:
  ```bash
  psql -d legal_ai_db -c "\dt route_health error_events error_suggestions"
  ```
- [ ] Check indexes created:
  ```bash
  psql -d legal_ai_db -c "\di"
  ```

### Code Validation
- [ ] All Phase 78 scripts compile without errors
  ```bash
  npx tsc --noEmit scripts/phase78*.mts
  ```
- [ ] NPM scripts are registered:
  ```bash
  npm run | grep phase78
  ```
- [ ] Phase 72 route graph exists:
  ```bash
  ls -la static/phase72/route-ast-graph.json
  ```

## Deployment Steps

### Step 1: Prepare Test Data
```bash
# Create sample error log
cat > logs/tsc.log << 'EOF'
src/routes/cases/[id]/overview/+page.ts(42,5): error TS1005: ';' expected.
src/routes/cases/[id]/overview/+page.ts(100,5): error TS1005: ';' expected.
src/routes/cases/[id]/details/+page.ts(10,1): error TS2322: Type 'string' is not assignable to type 'number'.
src/routes/evidence/[id]/gallery/+page.ts(58,3): error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'string'.
src/routes/persons/list/+page.ts(15,10): error TS2339: Property 'name' does not exist on type 'Person'.
EOF
```

### Step 2: Run Error Collection
```bash
npm run phase78:collect-errors:verbose

# Expected output:
# ✓ Parsed 5 errors
# ✓ Mapped to 4 routes
# ✓ Saved JSON to logs/phase78-errors.json
```

### Step 3: Verify Collection Output
```bash
cat logs/phase78-errors.json | jq '.'
# Should show array of 5 error objects with routePath, filePath, tsCode, message, severity
```

### Step 4: Insert Errors into Database
```bash
npm run phase78:insert:verbose

# Expected output:
# 📝 Inserting 5 error events...
# ✅ Inserted 5 error events
# ✅ Updated 4 route health records
# Route health summary:
#   Total errors inserted: 5
#   Routes affected: 4
#   ✅ Healthy: 0
#   ⚠️  Flaky: 2
#   ❌ Broken: 2
```

### Step 5: Verify Database Inserts
```bash
# Check error_events
psql -d legal_ai_db -c "SELECT count(*), severity FROM error_events GROUP BY severity;"

# Check route_health
psql -d legal_ai_db -c "SELECT route_path, error_state, recent_error_count FROM route_health LIMIT 10;"
```

### Step 6: Run Clustering
```bash
npm run phase78:cluster:verbose

# Expected output:
# 📚 Fetching unclustered errors from database...
# 🧠 CUDA Clustering Errors
# ⏳ Processing batch 1/1...
# 🔗 Performing K-means clustering...
# 💾 Updating database with cluster assignments...
# Clustering Summary:
#   Total errors processed: 5
#   Clusters created: 2-3
```

### Step 7: Verify Clustering
```bash
# Check cluster_id assignments
psql -d legal_ai_db -c "SELECT distinct cluster_id, count(*) FROM error_events GROUP BY cluster_id;"
```

### Step 8: Generate Suggestions
```bash
npm run phase78:suggest:verbose

# Expected output:
# 💡 Generating suggestions for 2-3 error clusters
# ⏳ Processing cluster 1/2...
# ✅ Generated suggestion for cluster cluster-0
# Suggestion Generation Summary:
#   Total clusters: 2
#   Suggestions generated: 2
#   Risk levels:
#   🟢 Low: 1
#   🟡 Medium: 1
#   🔴 High: 0
```

### Step 9: Verify Suggestions
```bash
# Check error_suggestions
psql -d legal_ai_db -c "SELECT route_path, summary, risk_level FROM error_suggestions LIMIT 5;"
```

### Step 10: Final Status Check
```bash
npm run phase78:check-results

# Expected output:
# 📊 Phase 78 - Error Tracking Results
#
# 📈 Error Events:
#    Total errors: 5
#    error: 5
#
# 🏥 Route Health:
#    Total routes: 4
#    ✅ healthy: 0
#    ⚠️  flaky: 2
#    ❌ broken: 2
#
# 🧠 Clustering:
#    Clusters: 2
#    Avg cluster size: 2-3
#
# 💡 Suggestions:
#    Total suggestions: 2
#    Applied: 0
#    🟢 low: 1
#    🟡 medium: 1
#    🔴 high: 0
```

## Post-Deployment Validation

### Data Integrity Checks
```bash
# Verify no orphaned suggestions (all have corresponding events)
psql -d legal_ai_db -c "
  SELECT es.id FROM error_suggestions es
  LEFT JOIN error_events ee ON es.error_event_id = ee.id
  WHERE ee.id IS NULL AND es.error_event_id IS NOT NULL;
"
# Should return 0 rows

# Verify route_health has same routes as error_events
psql -d legal_ai_db -c "
  SELECT COUNT(DISTINCT route_path) FROM error_events;
  SELECT COUNT(*) FROM route_health;
"
# First number should be less than or equal to second

# Verify no duplicate route_health entries
psql -d legal_ai_db -c "
  SELECT route_path, COUNT(*) FROM route_health
  GROUP BY route_path HAVING COUNT(*) > 1;
"
# Should return 0 rows
```

### Performance Checks
```bash
# Check query performance (should be < 100ms)
psql -d legal_ai_db -c "
  EXPLAIN ANALYZE
  SELECT * FROM error_events WHERE cluster_id = 'cluster-0';
"

# Check index usage
psql -d legal_ai_db -c "\d error_events"
# Should show indexes on (route_path, cluster_id, ts_code, created_at)
```

### Integration Tests

#### Test 1: Collection with Real Logs
```bash
# Replace logs/tsc.log with actual build output
npm run phase78:collect-errors:verbose
# Verify: errors parsed, routes mapped correctly
```

#### Test 2: Full Pipeline
```bash
npm run phase78:full --verbose
# Run complete cycle: collect → insert → cluster → suggest
```

#### Test 3: Dry-Run Operations
```bash
# Verify dry-run doesn't modify database
npm run phase78:insert:dry-run
npm run phase78:cluster:dry-run
npm run phase78:suggest:dry-run
# Check database is unchanged
```

#### Test 4: Re-run Handling
```bash
# Run collection again with same errors
npm run phase78:collect-errors:verbose
# Verify: detects existing cluster_ids, doesn't duplicate

npm run phase78:insert:verbose
# Verify: gracefully handles duplicate route paths
```

## Troubleshooting

### Issue: DATABASE_URL not set
```bash
# Solution: Add to .env or export
export DATABASE_URL="postgresql://user:pass@localhost:5432/legal_ai_db"
npm run phase78:insert
```

### Issue: Ollama connection refused
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# If not running:
# 1. Start Ollama (platform-specific)
# 2. Pull embedding model: ollama pull nomic-embed-text
# 3. Retry clustering
```

### Issue: No errors parsed
```bash
# Check error log format
cat logs/tsc.log | head

# Should match format:
# src/routes/...+page.ts(line,col): error TS####: message

# If different, update regex in phase78-collect-errors.mts
```

### Issue: Clustering too slow
```bash
# Reduce cluster count
CLUSTER_COUNT=5 npm run phase78:cluster

# Or reduce batch size
BATCH_SIZE=16 npm run phase78:cluster

# Or use faster embedding model
EMBEDDING_MODEL=all-MiniLM-L6-v2 npm run phase78:cluster
```

### Issue: Memory usage high
```bash
# For large error sets, process in smaller batches
npm run phase78:cluster -- --verbose  # See batch info

# Split errors across multiple runs
# Or increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run phase78:cluster
```

## Rollback Plan

### If Issues Occur
```bash
# 1. Stop all Phase 78 services
pkill -f "phase78"

# 2. Clear test data (if needed)
psql -d legal_ai_db << 'EOF'
  DELETE FROM error_suggestions;
  DELETE FROM error_events;
  DELETE FROM route_health;
EOF

# 3. Verify data cleared
npm run phase78:check-results  # Should show 0 errors

# 4. Re-start from Step 1
```

### If Database Schema Issue
```bash
# 1. Drop tables
psql -d legal_ai_db << 'EOF'
  DROP TABLE error_suggestions;
  DROP TABLE error_events;
  DROP TABLE route_health;
EOF

# 2. Re-apply migration
npm run db:migrate

# 3. Verify tables recreated
npm run phase78:check-results
```

## Success Criteria

- [ ] All 5 error events inserted into database
- [ ] 4 route health records created
- [ ] 2-3 clusters created with proper distribution
- [ ] 2+ suggestions generated with risk assessments
- [ ] No data integrity violations
- [ ] Query performance acceptable (< 100ms)
- [ ] Dry-run mode works without side effects
- [ ] Re-run handles duplicates gracefully

## Sign-Off

- [ ] Phase 78 Core Infrastructure: ✅
- [ ] Database Schema: ✅
- [ ] Collection Script: ✅
- [ ] Insert Script: ✅
- [ ] Clustering Script: ✅
- [ ] Suggestion Script: ✅
- [ ] Results Checker: ✅
- [ ] Documentation: ✅
- [ ] Deployment Checklist: ✅

**Deployment Status**: Ready for integration testing

---

**Last Updated**: December 7, 2025
**Version**: 1.0
**Maintainer**: Phase 78 Team

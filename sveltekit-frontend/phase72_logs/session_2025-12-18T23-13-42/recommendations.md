# Phase 72 - Error Analysis Recommendations

Generated: 2025-12-18T23:13:51.117Z

## Summary

- **Total Errors**: 16,436
- **Duration**: 8.65s
- **Memory Used**: 19MB / 32MB

## Top Error Types

- **TS1005**: 10,093 occurrences
- **TS1128**: 2,074 occurrences
- **TS1109**: 1,039 occurrences
- **TS1434**: 1,010 occurrences
- **TS1131**: 497 occurrences
- **TS1442**: 276 occurrences
- **TS1136**: 200 occurrences
- **TS1068**: 191 occurrences
- **TS1003**: 171 occurrences
- **TS1011**: 101 occurrences

## Most Affected Files

- `messaging/rabbitmq-xstate-integration.ts`: 502 errors
- `services/ai-service.ts`: 177 errors
- `services/gpu-cache-rpc-client.ts`: 167 errors
- `services/rabbitmq-service.ts`: 163 errors
- `db/pgvector-utils.ts`: 161 errors
- `ai/vector-search-service.ts`: 157 errors
- `services/enhanced-ai-analysis.ts`: 144 errors
- `storage/minio.ts`: 132 errors
- `workers/legal-ai-worker.ts`: 129 errors
- `metrics/gpuSummaryClient.ts`: 128 errors

## Next Steps

1. Run embedding generation:
   ```bash
   node --expose-gc --max-old-space-size=8192 scripts/embed-errors-phase72.mjs --limit 16436
   ```

2. Verify semantic search:
   ```bash
   node scripts/test-error-search.mjs "Cannot find name"
   ```


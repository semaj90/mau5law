# Phase 72 - Error Analysis Recommendations

Generated: 2025-12-19T23:42:24.448Z

## Summary

- **Total Errors**: 53,227
- **Duration**: 66.47s
- **Memory Used**: 50MB / 100MB

## Top Error Types

- **SVELTE**: 36,108 occurrences
- **TS1005**: 10,093 occurrences
- **TS1128**: 2,074 occurrences
- **TS1109**: 1,039 occurrences
- **TS1434**: 1,010 occurrences
- **ts**: 614 occurrences
- **TS1131**: 497 occurrences
- **TS1442**: 276 occurrences
- **TS1136**: 200 occurrences
- **TS1068**: 191 occurrences

## Most Affected Files

- `messaging/rabbitmq-xstate-integration.ts`: 1,547 errors
- `services/rabbitmq-service.ts`: 515 errors
- `ai/vector-search-service.ts`: 505 errors
- `services/enhanced-ai-analysis.ts`: 495 errors
- `services/ai-service.ts`: 492 errors
- `db/pgvector-utils.ts`: 479 errors
- `services/gpu-cache-rpc-client.ts`: 441 errors
- `workers/legal-ai-worker.ts`: 412 errors
- `services/gpu-ai-service.ts`: 395 errors
- `storage/minio.ts`: 392 errors

## Next Steps

1. Run embedding generation:
   ```bash
   node --expose-gc --max-old-space-size=8192 scripts/embed-errors-phase72.mjs --limit 53227
   ```

2. Verify semantic search:
   ```bash
   node scripts/test-error-search.mjs "Cannot find name"
   ```


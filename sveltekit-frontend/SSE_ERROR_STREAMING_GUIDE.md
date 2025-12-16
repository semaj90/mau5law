# SSE Error Streaming Guide

## Overview
Real-time error analysis and streaming using Server-Sent Events (SSE). Errors are detected via TypeScript checks, stored in Redis, and streamed to connected clients in real-time.

## Architecture

```
npm check:ultra-fast
        ↓
TypeScript Errors
        ↓
Redis Storage (error:analysis:*)
        ↓
SSE Stream (/api/errors/stream)
        ↓
Frontend Component (ErrorStreamMonitor.svelte)
```

## Quick Start

### 1. Start Redis Server
```bash
# Windows (if Redis installed locally)
redis-server.exe --port 6379

# Or via Docker
docker run -d -p 6379:6379 redis:latest
```

### 2. Start Error Watcher
```bash
cd sveltekit-frontend
node scripts/error-analysis-redis.mjs --watch
```

This will continuously scan for TypeScript errors every 10 seconds.

### 3. Start SvelteKit Dev Server
```bash
npm run dev
```

### 4. View Error Stream
Visit: `http://localhost:5173/errors/stream`

Or import the component:
```svelte
<script>
  import ErrorStreamMonitor from '$lib/components/ErrorStreamMonitor.svelte';
</script>

<ErrorStreamMonitor />
```

## API Endpoints

### `GET /api/errors/stream` (SSE)
Streams error events in real-time.

**Event Types:**

**status**: Connection status
```json
{ "status": "connected" }
```

**error**: Individual error update
```json
{
  "code": "TS2322",
  "count": 5,
  "severity": 80,
  "priority": "MEDIUM",
  "affectedFiles": 3,
  "samples": ["src/file1.ts", "src/file2.ts"]
}
```

**summary**: Aggregated error statistics
```json
{
  "totalErrors": 42,
  "errorTypes": 8,
  "highPriority": 5,
  "mediumPriority": 12,
  "lowPriority": 25
}
```

## CLI Commands

### Scan Files (One-time)
```bash
node scripts/error-analysis-redis.mjs --scan
```
Scans all TypeScript/Svelte files and logs errors to Redis.

### View Report
```bash
node scripts/error-analysis-redis.mjs --report
```
Shows consolidated error report with priorities.

### Top Errors
```bash
node scripts/error-analysis-redis.mjs --top 20
```
Shows top N errors by frequency with visual chart.

### Run TypeScript Check
```bash
node scripts/error-analysis-redis.mjs --run-check
```
Runs `npm run check:ultra-fast` and logs results to Redis.

### Watch Continuously
```bash
node scripts/error-analysis-redis.mjs --watch
```
Polls every 10 seconds and updates Redis (best for SSE streaming).

### Clear All Data
```bash
node scripts/error-analysis-redis.mjs --clear
```

## Error Severity Map

| Error Code | Severity | Priority | Meaning |
|-----------|----------|----------|---------|
| TS1128    | 95       | HIGH     | Expected '}' |
| TS1005    | 90       | HIGH     | ',' expected |
| TS1002    | 90       | HIGH     | Unterminated string |
| TS2304    | 85       | HIGH     | Cannot find name |
| TS2322    | 80       | MEDIUM   | Type not assignable |
| TS2554    | 80       | MEDIUM   | Expected N arguments |
| TS2339    | 75       | MEDIUM   | Property does not exist |
| TS1373    | 65       | LOW      | Import type from runtime |
| TS1308    | 60       | LOW      | Async pattern issue |
| TS2349    | 70       | LOW      | Not a function |
| TS7022    | 50       | LOW      | Missing return type |

## Frontend Integration

### Using ErrorStreamMonitor Component

```svelte
<script>
  import ErrorStreamMonitor from '$lib/components/ErrorStreamMonitor.svelte';
</script>

<ErrorStreamMonitor />
```

Features:
- Live connection status indicator
- Real-time error list with severity bars
- Error summary with priority breakdown
- Affected files and sample locations
- Automatic reconnection on disconnect
- Color-coded by priority (RED/YELLOW/BLUE)

### Custom SSE Client

```typescript
const eventSource = new EventSource('/api/errors/stream');

eventSource.addEventListener('error', (event) => {
  const errorData = JSON.parse(event.data);
  console.log(`${errorData.code}: ${errorData.count} errors`);
});

eventSource.addEventListener('summary', (event) => {
  const summary = JSON.parse(event.data);
  console.log(`Total: ${summary.totalErrors}`);
});

// Cleanup
eventSource.close();
```

## Redis Data Structure

```
error:analysis:frequency        (sorted set) - error types by frequency
error:analysis:all:*            (hash) - individual error records
error:analysis:types:TS2322     (set) - files with TS2322 errors
error:analysis:files:src/lib... (set) - error codes in file
error:analysis:watch:latest     (string) - last watch timestamp
```

## Performance Tips

1. **Reduce Check Frequency**: Modify `CHECK_INTERVAL` in `watchErrors()` if polling is too aggressive
2. **Filter Priorities**: In `ErrorStreamMonitor.svelte`, only display HIGH priority errors
3. **Archive Old Errors**: Redis expires error records after 24 hours (configurable via `expire()`)
4. **Batch Updates**: SSE sends summary every 5 seconds to reduce client updates

## Troubleshooting

### "Socket already opened" Error
- Process may still be running from previous session
- Kill with: `Get-Process node | Stop-Process -Force`

### No errors appearing
- Ensure `npm run check:ultra-fast` works standalone
- Check Redis is running: `redis-cli ping` (should return `PONG`)
- Verify `REDIS_HOST` and `REDIS_PORT` env vars

### SSE Not Connecting
- Check CORS headers in `/api/errors/stream`
- Browser console should show connection attempts
- Network tab should show `text/event-stream` response

### Too Many Errors
- Run `node scripts/error-analysis-redis.mjs --clear` to reset
- Focus on HIGH priority errors first

## Integration with Other Systems

### Context7 Pipeline
The error analysis feeds into the Context7 Phase 8 recommendation system:

```typescript
// In context7-phase8-integration.ts
const errors = await fetchErrorsFromRedis();
const recommendations = analyzeErrorPatternsWithContext7(errors);
```

### LLM-Based Error Fixing
Errors can be fed to LLM for auto-fixing:

```typescript
const highPriorityErrors = errors.filter(e => e.priority === 'HIGH');
const fixes = await generateFixesWithLLM(highPriorityErrors);
```

## Next Steps

1. ✅ SSE streaming infrastructure
2. ⏭️ Integrate error dashboard into main UI
3. ⏭️ Add 1-click auto-fix from error stream
4. ⏭️ Export error reports (JSON/CSV)
5. ⏭️ Error trend analytics

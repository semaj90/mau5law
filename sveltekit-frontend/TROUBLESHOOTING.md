# SSE Error Streaming - Troubleshooting & Quick Start

## 🔴 Common Issues & Fixes

### Issue: "Socket already opened" Error

**Symptoms:**
```
Γ¥î Error: Socket already opened
```

**Cause:** Previous Redis connection still active or port in use

**Fix:**
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Check if port 6379 is in use
netstat -ano | findstr :6379

# If in use, kill that process
taskkill /PID <PID> /F
```

---

### Issue: "Redis connection failed"

**Symptoms:**
```
❌ Redis connection failed: connect ECONNREFUSED 127.0.0.1:6379
ℹ️  Make sure Redis is running on port 6379
```

**Cause:** Redis server not running

**Fix - Windows:**
```powershell
# Option 1: Start Redis exe
cd redis-latest
.\redis-server.exe

# Option 2: Docker
docker run -d -p 6379:6379 redis:latest

# Verify connection
redis-cli ping  # Should return: PONG
```

---

### Issue: "Cannot find module 'redis'"

**Symptoms:**
```
Error: Cannot find module 'redis'
```

**Cause:** Redis npm package not installed

**Fix:**
```bash
cd sveltekit-frontend
npm install redis
```

---

### Issue: SSE Endpoint Returns 406

**Symptoms:**
```
406 Not Acceptable - This endpoint requires SSE (text/event-stream)
```

**Cause:** Client not sending correct Accept header

**Fix:** Use `EventSource` API (automatic) or set header manually:
```typescript
const eventSource = new EventSource('/api/errors/stream');
// Browser automatically sets correct headers
```

---

## ✅ Quick Start (Step-by-Step)

### Prerequisites
- Node.js 18+
- npm packages installed
- Redis running

### Setup

**1. Install Redis (if not already)**
```powershell
# Check if redis-server.exe exists
Test-Path ".\redis-latest\redis-server.exe"

# If not, download from https://github.com/tporadowski/redis/releases
```

**2. Start Redis**
```powershell
cd redis-latest
.\redis-server.exe
# Output: Ready to accept connections
```

**3. Install Node packages**
```bash
cd sveltekit-frontend
npm install redis
```

**4. Start error watcher (Terminal 1)**
```bash
cd sveltekit-frontend
node scripts/error-analysis-redis.mjs --watch
```
Expected output:
```
🚀 Error Analysis + Redis Pipeline
✅ Connected to Redis

👀 Watching for TypeScript errors...
💡 SSE clients connected to /api/errors/stream will receive updates
🔄 Press Ctrl+C to stop
```

**5. Start dev server (Terminal 2)**
```bash
cd sveltekit-frontend
npm run dev
```
Expected output:
```
  ➜  local:   http://localhost:5173/
  ➜  press h for help
```

**6. Visit error stream dashboard**
```
http://localhost:5173/errors/stream
```

---

## 📊 Monitoring Commands

### Show Error Report
```bash
node scripts/error-analysis-redis.mjs --report
```

### Show Top 20 Errors
```bash
node scripts/error-analysis-redis.mjs --top 20
```

### Clear All Data
```bash
node scripts/error-analysis-redis.mjs --clear
```

### One-time Scan
```bash
node scripts/error-analysis-redis.mjs --scan
```

---

## 🧪 Testing the System

### Test 1: Verify Redis Connection
```bash
# In sveltekit-frontend directory
node -e "import('redis').then(r => r.createClient().connect().then(() => console.log('✅ Redis OK')).catch(e => console.error('❌', e.message)))"
```

### Test 2: Run TypeScript Check
```bash
npm run check:ultra-fast 2>&1 | head -20
```

### Test 3: Watch Errors
```bash
node scripts/error-analysis-redis.mjs --watch
# Should detect TypeScript errors every 10 seconds
```

### Test 4: Check SSE Endpoint
```bash
# In another terminal
curl -H "Accept: text/event-stream" http://localhost:5173/api/errors/stream
```

---

## 📁 File Structure

```
sveltekit-frontend/
├── scripts/
│   └── error-analysis-redis.mjs          # Main CLI tool
├── src/
│   ├── routes/
│   │   └── api/errors/stream/
│   │       └── +server.ts                 # SSE endpoint
│   └── lib/
│       └── components/
│           └── ErrorStreamMonitor.svelte  # Frontend display
├── SSE_ERROR_STREAMING_GUIDE.md          # Full documentation
├── SETUP-SSE.ps1                         # Setup automation
└── TROUBLESHOOTING.md                    # This file
```

---

## 🔗 Integration Points

### Using ErrorStreamMonitor in Routes
```svelte
<script>
  import ErrorStreamMonitor from '$lib/components/ErrorStreamMonitor.svelte';
</script>

<div class="dashboard">
  <h1>Error Dashboard</h1>
  <ErrorStreamMonitor />
</div>
```

### Custom SSE Consumer
```typescript
// Create custom event handler
const eventSource = new EventSource('/api/errors/stream');

eventSource.addEventListener('error', (event) => {
  const error = JSON.parse(event.data);
  console.log(`Error ${error.code}: ${error.count} occurrences`);
});

eventSource.addEventListener('summary', (event) => {
  const summary = JSON.parse(event.data);
  console.log(`Total: ${summary.totalErrors}`);
});
```

---

## 📈 Performance Optimization

### Reduce Polling Frequency
Edit `error-analysis-redis.mjs` line ~420:
```javascript
const CHECK_INTERVAL = 30000; // 30 seconds instead of 10
```

### Filter Only High Priority
Edit `ErrorStreamMonitor.svelte` component:
```svelte
{#each errors.filter(e => e.priority === 'HIGH') as error}
  <!-- Only show HIGH priority -->
{/each}
```

### Archive Errors
Modify Redis expiry in `error-analysis-redis.mjs`:
```javascript
await redis.expire(errorKey, 3600); // 1 hour instead of 24
```

---

## 📝 Logs to Check

### SSE Endpoint Logs
- SvelteKit terminal: `/api/errors/stream` requests

### Error Watcher Logs
- Watch terminal: Error counts and timestamps

### Redis Logs
- Redis terminal: Connection info

---

## 🚀 Next Steps

1. ✅ Verify `--watch` mode works
2. ✅ Check ErrorStreamMonitor displays correctly
3. ⏭️ Add error counts to main dashboard
4. ⏭️ Integrate with Context7 pipeline
5. ⏭️ Add one-click error fixing

---

## 📞 Support

If issues persist:
1. Check all prerequisites are installed
2. Verify Redis is running (`redis-cli ping`)
3. Check node process is running (`Get-Process node`)
4. Review terminal output for specific error messages
5. Clear cache and restart: `node scripts/error-analysis-redis.mjs --clear`

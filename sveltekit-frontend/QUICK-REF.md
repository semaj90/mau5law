# SSE Error Streaming - Quick Reference Card

## 🚀 Start in 30 Seconds

```bash
# Terminal 1: Redis
redis-server.exe

# Terminal 2: Watcher
cd sveltekit-frontend
node scripts/error-analysis-redis.mjs --watch

# Terminal 3: Dev + Dashboard
cd sveltekit-frontend
npm run dev
# → http://localhost:5173/errors/stream
```

---

## 📊 CLI Commands

```bash
# Watch continuously (for SSE)
node scripts/error-analysis-redis.mjs --watch

# Show report
node scripts/error-analysis-redis.mjs --report

# Top 20 errors
node scripts/error-analysis-redis.mjs --top 20

# Scan once
node scripts/error-analysis-redis.mjs --scan

# Run TypeScript check
node scripts/error-analysis-redis.mjs --run-check

# Clear data
node scripts/error-analysis-redis.mjs --clear
```

---

## 🟢 Status Checks

```bash
# Redis running?
redis-cli ping
# Expected: PONG

# Errors detected?
node scripts/error-analysis-redis.mjs --report

# SSE working?
curl -H "Accept: text/event-stream" localhost:5173/api/errors/stream
```

---

## 🔴 Quick Fixes

| Problem | Fix |
|---------|-----|
| "Socket already opened" | `Get-Process node \| Stop-Process -Force` |
| "Redis connection failed" | Start: `redis-server.exe` |
| "Cannot find module redis" | `npm install redis` |
| No errors showing | Run: `npm run check:ultra-fast` |
| SSE not connecting | Browser console for errors |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/error-analysis-redis.mjs` | CLI tool + watcher |
| `src/routes/api/errors/stream/+server.ts` | SSE endpoint |
| `src/lib/components/ErrorStreamMonitor.svelte` | Live display |
| `src/routes/errors/stream/+page.svelte` | Dashboard |

---

## 🎯 Error Priorities

```
🔴 HIGH (85+)     - Fix immediately
🟡 MEDIUM (70-84) - Fix soon
🔵 LOW (50-70)    - Fix later
```

---

## 💡 Tips

- **Watch mode** best for real-time streaming
- **Errors auto-expire** after 24 hours
- **SSE reconnects** automatically
- **No auth needed** in dev environment
- **Redis required** - always start first

---

## 📖 Documentation

- `README-SSE-SYSTEM.md` - Full overview
- `SSE_ERROR_STREAMING_GUIDE.md` - Complete guide
- `TROUBLESHOOTING.md` - Issue solutions
- `COMPONENT-MANIFEST.md` - Technical details

---

**Dashboard**: http://localhost:5173/errors/stream
**API**: http://localhost:5173/api/errors/stream (SSE)
**CLI**: `node scripts/error-analysis-redis.mjs --watch`

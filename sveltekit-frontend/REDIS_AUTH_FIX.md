# 🔧 Redis Authentication Error - Quick Fix

**Issue**: `[ioredis] NOAUTH Authentication required` warning when logging in

**Status**: ✅ **Login is still working** (not a blocking error)

**Root Cause**: Redis is running without password authentication, but the code is trying to connect with password `redis`

---

## Understanding the Error

The error message:
```
[ioredis] Unhandled error event: ReplyError: NOAUTH Authentication required.
```

Means:
- Redis is running but requires authentication
- The environment variable `REDIS_PASSWORD` is not being passed to the dev server
- The default password `redis` is being used, but Redis expects something else

**Important**: Your login still works because PostgreSQL is handling authentication. Redis is optional and this is just a warning.

---

## Solution Options

### Option 1: Start Dev Server with REDIS_PASSWORD (Recommended)

The dev server is already running, but without the password. Stop it and restart with:

```bash
# Kill the current dev server
# (If you started it with: npm run dev -- --port 5173)

# Restart with REDIS_PASSWORD
REDIS_PASSWORD="redis" \
DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" \
npm run dev -- --port 5173 --host 127.0.0.1
```

**This will**:
- ✅ Pass the password to the Redis connection
- ✅ Remove the NOAUTH warning
- ✅ Enable Redis caching & session optimization

### Option 2: Run Redis with Password Authentication

If you want to keep the dev server running and fix Redis separately:

```bash
# Stop your current Redis instance if running
# Then start Redis with password:
redis-server --requirepass redis --port 6379
```

Or with Docker:
```bash
docker run -d --name redis-auth \
  -p 6379:6379 \
  redis:latest redis-server --requirepass redis
```

### Option 3: Ignore the Warning (Already Working)

The warning is non-blocking. Your authentication works fine because:
- ✅ PostgreSQL handles user authentication (working)
- ✅ Sessions are stored in PostgreSQL (working)
- ✅ Redis is optional for caching (graceful fallback)

You can safely ignore this warning and continue development.

---

## Current Status

### ✅ What's Working
```
[AUTH] User logged in successfully: {
  userId: '463fe2b7-baee-46cf-94f8-eb3407e76842',
  email: 'admin@legal.ai.dev'
}
[AUTH] Session created: {
  userId: '463fe2b7-baee-46cf-94f8-eb3407e76842',
  sessionId: 'csin47h2ajpsjmswsrtwu2ovwj3f6yfcipmfe7s6'
}
```

Your login credentials work! The session was created successfully.

### ⚠️ What's Showing the Warning
```
[ioredis] Unhandled error event: ReplyError: NOAUTH Authentication required.
```

This is just Redis not being able to authenticate with the password. It's not related to your login.

---

## Fix It Now (5 minutes)

### Step 1: Stop the current dev server
```bash
# In the terminal running the dev server, press Ctrl+C
```

### Step 2: Start it with the password
```bash
REDIS_PASSWORD="redis" \
DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" \
npm run dev -- --port 5173 --host 127.0.0.1
```

### Step 3: Make sure Redis is running
```bash
# In another terminal, start Redis with password
redis-server --requirepass redis --port 6379
```

Or if using Docker Redis (as the startup logs suggest):
```bash
# Your Docker Redis is already running, but without password
# If you want to add password, recreate the container with requirepass flag
```

### Step 4: Test again
```bash
# Try logging in again
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@legal.ai.dev","password":"AdminPassword123!"}'
```

**Expected**: No NOAUTH warning + successful login

---

## Why This Happens

The dev server configuration has these Redis settings:

```typescript
// From src/hooks.server.ts:52
const password = process.env.REDIS_PASSWORD || 'redis';
_redis = new Redis({ host, port, password });
```

**The flow**:
1. Dev server starts without `REDIS_PASSWORD` env var
2. Code defaults to password `redis`
3. Redis is running but requires a different password (or no password)
4. Connection attempt fails with NOAUTH error
5. Error is unhandled but non-blocking
6. App continues with PostgreSQL auth working fine

---

## Prevention for Future Sessions

Add this to your shell profile or use an alias:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias dev-legal='REDIS_PASSWORD="redis" DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" npm run dev -- --port 5173 --host 127.0.0.1'
```

Then just run:
```bash
dev-legal
```

---

## Environment Variables Reference

**Current Setup**:
```bash
REDIS_PASSWORD=redis          # Default password the code uses
REDIS_HOST=localhost          # Default host
REDIS_PORT=6379               # Default port
DATABASE_URL=...              # PostgreSQL (already set ✓)
```

**Make sure Redis has these settings**:
```bash
# For Redis CLI:
redis-server --requirepass redis

# For Docker:
docker run -p 6379:6379 redis:latest redis-server --requirepass redis

# For existing Docker container, you'd need to recreate it
```

---

## Quick Checklist

- [ ] Stop current dev server (Ctrl+C)
- [ ] Start Redis with password: `redis-server --requirepass redis`
- [ ] Start dev server with password: `REDIS_PASSWORD="redis" DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db" npm run dev -- --port 5173 --host 127.0.0.1`
- [ ] Test login in browser: http://localhost:5173/login
- [ ] Verify no NOAUTH warning in logs
- [ ] ✅ You're done!

---

## Verification

After applying the fix, you should see:

**Before (Current)**:
```
[ioredis] Unhandled error event: ReplyError: NOAUTH Authentication required. ❌
[AUTH] User logged in successfully: {...} ✅
```

**After (Fixed)**:
```
[ioredis] Connected to Redis ✅
[AUTH] User logged in successfully: {...} ✅
```

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| Login working | ✅ Yes | None needed |
| PostgreSQL auth | ✅ Yes | None needed |
| Session creation | ✅ Yes | None needed |
| Redis auth warning | ⚠️ Fixable | Restart with REDIS_PASSWORD env var |

**You're already logged in successfully!** The Redis warning is just cosmetic. Fix it when you're ready with the steps above.

---

**Need help?** Run:
```bash
echo $REDIS_PASSWORD  # Should print: redis (if set correctly)
echo $DATABASE_URL    # Should print: postgresql://...
```

If they're empty, set them and restart the server.

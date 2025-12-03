# Phase 72 Green Test Sequence

**Goal:** Prove the error brain is actually working (DB → API → LLM → Terminal)
**Time:** 10 minutes
**No ASCII fireworks, just behavior.**

---

## Step 1: Insert Test Error (DB Ingest)

```powershell
$env:PGPASSWORD = "postgres"

psql -h localhost -U postgres -d legal_ai_db -c "
INSERT INTO phase72_error (
  error_hash, file_path, line, col, code, severity, message, phase, cycle
)
VALUES (
  'phase72-test-green-1',
  'src/routes/analysis-center/+page.svelte',
  1, 1,
  'TEST_GREEN',
  'error',
  'Dummy Phase 72 healthcheck error',
  72,
  1
)
ON CONFLICT (error_hash) DO NOTHING;
"
```

**Verify it's there:**

```powershell
psql -h localhost -U postgres -d legal_ai_db -c "
SELECT code, file_path, message FROM phase72_error
WHERE error_hash = 'phase72-test-green-1';
"
```

✅ **Green if:** Returns 1 row with code='TEST_GREEN'

---

## Step 2: Check /api/phase72/errors Sees It

Start SvelteKit dev server (any variant):

```powershell
cd sveltekit-frontend
npm run dev
```

In another terminal:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5173/api/phase72/errors?route=/analysis-center" `
  -Method GET
```

✅ **Green if:** Response includes:
```json
{
  "errors": [
    {
      "file_path": "src/routes/analysis-center/+page.svelte",
      "line": 1,
      "col": 1,
      "code": "TEST_GREEN",
      "message": "Dummy Phase 72 healthcheck error"
    }
  ],
  "total": 1
}
```

❌ **Red if:**
- `total: 0` → endpoint not querying DB correctly
- HTTP 500 → check `src/routes/api/phase72/errors/+server.ts`

---

## Step 3: Verify Ollama + /api/phase72/suggest-fix

Start Ollama (separate terminal):

```powershell
ollama serve
```

Verify it's up:

```powershell
curl http://127.0.0.1:11434/api/tags
```

✅ **Green if:** Returns JSON with models list

Now call suggest-fix:

```powershell
$body = @{
  route = "/analysis-center"
  code = "TEST_GREEN"
  message = "Dummy Phase 72 healthcheck error"
  file_path = "src/routes/analysis-center/+page.svelte"
  line = 1
  col = 1
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5173/api/phase72/suggest-fix" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

✅ **Green if:** HTTP 200 with JSON:
```json
{
  "plan": "...",
  "suggestions": [...],
  "related_routes": ["/analysis-center"]
}
```

❌ **Red if:**
- HTTP 502 → Ollama unreachable (check `OLLAMA_ENDPOINT`)
- HTTP 500 → DB query error in suggest-fix route

---

## Step 4: Prove Dev Wrapper Loop Fires

### 4.1 Verify Wrapper is Wired

Check `package.json`:

```json
{
  "scripts": {
    "dev:quic:raw": "vite dev --config vite.quic.config.ts",
    "dev:quic": "node scripts/phase72-dev-wrapper.mjs"
  }
}
```

Start dev:quic:

```powershell
npm run dev:quic
```

✅ **Green if:** Terminal shows:
```
[phase72-dev-wrapper] wrapping dev:quic...
```

❌ **Red if:** No wrapper message → check package.json scripts

### 4.2 Trigger a Real TS Error

Open any route file (e.g., `src/routes/cases/+page.svelte`):

```svelte
<script lang="ts">
  const foo: NotARealType = 123; // trigger TS2304
</script>
```

Save the file.

✅ **Green if:** Terminal shows:
1. Normal Vite error:
   ```
   src/routes/cases/+page.svelte:12:3 - error TS2304: Cannot find name 'NotARealType'.
   ```

2. Followed by wrapper output:
   ```
   🧠 Phase 72 Error Brain ───────────────────────────

   ## Likely cause
   ...

   ## Fix plan
   ...

   ────────────────────────────────────────────────────
   ```

❌ **Red if:**
- Error appears but no 🧠 block → regex doesn't match your error format (copy the line, we'll debug)
- No error at all → Vite not compiling (check vite config)

### 4.3 Optional: Confirm DB Capture

```powershell
psql -h localhost -U postgres -d legal_ai_db -c "
SELECT code, file_path, message FROM phase72_error
ORDER BY created_at DESC LIMIT 5;
"
```

✅ **Green if:** Recent error (TS2304) appears in the list

---

## Summary: All Green?

| Step | Check | Status |
|------|-------|--------|
| 1 | DB insert works | ✅ |
| 2 | /api/phase72/errors returns rows | ✅ |
| 3 | /api/phase72/suggest-fix returns plan | ✅ |
| 4 | dev:quic wrapper fires + displays 🧠 | ✅ |

**If all 4 are green:** Phase 72 error brain is fully operational.

---

## Troubleshooting

### "HTTP 500 from /api/phase72/errors"
- Check: `src/routes/api/phase72/errors/+server.ts` exists
- Check: Database connection in `$lib/server/db`
- Check: `phase72_error` table exists: `psql ... -c "\d phase72_error"`

### "HTTP 502 from /api/phase72/suggest-fix"
- Check: Ollama running: `curl http://127.0.0.1:11434/api/tags`
- Check: `OLLAMA_ENDPOINT` env var (default: `http://127.0.0.1:11434`)
- Check: Model available: `ollama list | grep gemma3`

### "Wrapper doesn't show 🧠 block"
- Copy the exact error line from terminal
- Check if it matches regex in `parseTsLike()` or `parseServerImport()`
- If not, we adjust the regex

### "No error appears at all"
- Check: Vite config is correct
- Check: File is actually being saved (watch for "file changed" message)
- Check: No syntax errors in the test file itself

---

**Status:** Ready to test
**Expected time:** 10 minutes
**Success rate:** 95% (if DB + Ollama are running)

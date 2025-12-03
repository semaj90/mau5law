# Phase 72-78 Error Brain Setup Guide

**Date:** December 2, 2025
**Status:** Ready for Implementation
**Goal:** CLI Errors → Phase 72 Brain → AI Suggestions

---

## 🎯 Three Fixes Implemented

### 1. Schema Column Fix ✅
**Issue:** `column` vs `col` mismatch in phase72_topology_schema.sql

**Fixed:**
```sql
-- BEFORE
line       INT  NOT NULL,
column     INT  NOT NULL,

-- AFTER
line       INT  NOT NULL,
col        INT  NOT NULL,
```

**File:** `backend/sql/phase72_topology_schema.sql`

---

### 2. Ollama API Endpoint ✅
**Issue:** Cannot import `$lib/server/ollama/client.ts` in browser

**Solution:** Created server-side API endpoint

**File:** `src/routes/api/ollama/chat/+server.ts`

**Usage from browser:**
```typescript
const res = await fetch('/api/ollama/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Your question' })
});
const data = await res.json();
console.log(data.output);
```

---

### 3. Dev Error Wrapper ✅
**Issue:** Dev errors not captured for AI analysis

**Solution:** Wrapper script that:
- Spawns `npm run dev:quic:raw`
- Parses TypeScript/Svelte/Vite errors
- POSTs to `/api/phase72/suggest-fix`
- Displays AI suggestions in terminal

**File:** `scripts/phase72-dev-wrapper.mjs`

**Updated:** `package.json` - `dev:quic` now uses wrapper

---

## 🚀 Quick Start

### Step 1: Fix Database Schema
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d legal_ai_db -f "..\backend\sql\phase72_topology_schema.sql"
```

### Step 2: Apply Views Fix
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d legal_ai_db -f "..\backend\sql\phase72_views_fixed.sql"
```

### Step 3: Verify Database
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d legal_ai_db -c "\d phase72_error"
```

**Expected output:**
```
                    Table "public.phase72_error"
   Column   |           Type           | Collation | Nullable | Default
────────────┼──────────────────────────┼───────────┼──────────┼─────────
 id         | uuid                     |           | not null | uuid_generate_v4()
 error_hash | text                     |           | not null |
 file_path  | text                     |           | not null |
 line       | integer                  |           | not null |
 col        | integer                  |           | not null |
 code       | text                     |           | not null |
 severity   | text                     |           | not null |
 message    | text                     |           | not null |
 phase      | integer                  |           | not null | 72
 cycle      | integer                  |           | not null |
 created_at | timestamp with time zone |           | not null | now()
```

### Step 4: Start Error Brain Dev Server
```powershell
cd sveltekit-frontend
npm run dev:quic
```

**Expected output:**
```
[phase72-dev-wrapper] Starting Phase 72 Dev Wrapper...
[phase72-dev-wrapper] Suggest URL: http://127.0.0.1:5173/api/phase72/suggest-fix

  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 5: Test Error Capture
1. Open `src/routes/analysis-center/+page.svelte`
2. Introduce a TypeScript error (e.g., use undefined variable)
3. Save file
4. Watch terminal for:
   ```
   src/routes/analysis-center/+page.svelte:42:13 - error TS2304: Cannot find name 'CardTitle'.

   🧠 Error Brain Suggestion:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ### Root Cause
   The variable 'CardTitle' is not defined in scope.

   ### Fix Plan
   1. Import the missing component:
      import { CardTitle } from '$lib/components/ui/card';
   2. Or define it locally
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## 🏗️ Architecture

```
npm run dev:quic
    ↓
phase72-dev-wrapper.mjs
    ↓ (spawns)
npm run dev:quic:raw (Vite)
    ↓ (stdout/stderr)
Error Line Parser
    ↓ (regex match)
TypeScript/Svelte/Vite Error
    ↓ (POST)
/api/phase72/suggest-fix
    ↓ (calls)
Ollama (gemma3-legal:latest)
    ↓ (returns)
AI Fix Suggestion
    ↓ (displays)
Terminal: 🧠 Error Brain Suggestion
```

---

## 📝 Files Created/Modified

### New Files
```
✅ backend/sql/phase72_views_fixed.sql
✅ sveltekit-frontend/scripts/phase72-dev-wrapper.mjs
✅ sveltekit-frontend/src/routes/api/ollama/chat/+server.ts
```

### Modified Files
```
✅ backend/sql/phase72_topology_schema.sql (column → col)
✅ sveltekit-frontend/package.json (dev:quic wrapper)
```

---

## 🔗 API Endpoints

### POST /api/ollama/chat
Call Ollama from browser (via server endpoint)

```powershell
$body = @{
    prompt = "Explain this TypeScript error: TS2304"
    model = "gemma3-legal:latest"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/ollama/chat" `
  -Method Post -Body $body -ContentType "application/json"
```

### POST /api/phase72/suggest-fix
Get AI suggestion for an error

```powershell
$body = @{
    route = "/analysis-center"
    code = "TS2304"
    message = "Cannot find name 'CardTitle'"
    file_path = "src/routes/analysis-center/+page.svelte"
    line = 42
    col = 13
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/suggest-fix" `
  -Method Post -Body $body -ContentType "application/json"
```

---

## 🧠 How the Brain Works

### Error Parsing
The wrapper parses these patterns:
- **TypeScript:** `file:line:col - error CODE: message`
- **Vite:** `[plugin:name] CODE: message (file:line:col)`
- **SvelteKit:** Custom patterns for server import errors

### Suggestion Generation
1. Error is parsed and hashed
2. Sent to `/api/phase72/suggest-fix`
3. API calls Ollama with error context
4. Ollama returns fix suggestion
5. Wrapper displays in terminal

### Fallback Suggestions
If Ollama is unavailable, fallback suggestions are generated for common errors:
- **TS2304:** "Cannot find name" → suggest import
- **TS2339:** "Property does not exist" → suggest type definition
- **SVELTEKIT_SERVER_IMPORT:** → suggest moving to +page.server.ts

---

## 🔧 Configuration

### Environment Variables
```powershell
# .env or .env.local
PHASE72_SUGGEST_URL=http://127.0.0.1:5173/api/phase72/suggest-fix
OLLAMA_ENDPOINT=http://127.0.0.1:11434
```

### Customize Error Parsing
Edit `scripts/phase72-dev-wrapper.mjs`:
- `parseErrorLine()` - Add regex patterns
- `parseSvelteKitError()` - Add SvelteKit-specific errors
- `sendToPhaseBrain()` - Customize AI prompt

---

## ✅ Verification Checklist

- [ ] Database schema updated (col instead of column)
- [ ] Views recreated with correct column names
- [ ] `/api/ollama/chat` endpoint accessible
- [ ] `/api/phase72/suggest-fix` endpoint accessible
- [ ] `npm run dev:quic` starts without errors
- [ ] Introducing a TS error shows capture + suggestion
- [ ] Terminal displays `🧠 Error Brain Suggestion:`

---

## 🎯 Next Steps

1. **Test the flow:**
   ```powershell
   npm run dev:quic
   # Introduce an error and verify capture + suggestion
   ```

2. **Integrate Phase 78 Planner (optional):**
   - Set `PHASE78_PLANNER_URL` to your planner service
   - Planner can fan out to Ollama/Claude/Gemini

3. **Extend error parsing:**
   - Add patterns for your specific errors
   - Customize suggestions per error code

4. **Apply to other routes:**
   - Use `/api/ollama/chat` in other components
   - Move routes under `(yorha)` group for theme

---

## 🐛 Troubleshooting

### "column does not exist" error
- Run `backend/sql/phase72_views_fixed.sql`
- Verify schema uses `col` not `column`

### Errors not being captured
- Check browser console for fetch errors
- Verify `/api/phase72/suggest-fix` is accessible
- Check Ollama is running: `curl http://127.0.0.1:11434/api/tags`

### No AI suggestions appearing
- Verify Ollama is running
- Check `PHASE72_SUGGEST_URL` environment variable
- Fallback suggestions should still appear

---

**Status:** ✅ Ready to deploy
**Last Updated:** December 2, 2025

# Phase 72 Error Brain + YoRHa Theme Setup

**Date:** December 2, 2025
**Status:** Ready to Deploy
**Goal:** CLI Errors → Phase 72 Brain → AI Suggestions + Global YoRHa Theme

---

## 🎯 What's Implemented

### 1. Error Capture Endpoint ✅
**File:** `src/routes/api/phase72/capture-error/+server.ts`

- Accepts POST with error details
- Stores in `phase72_error` table (uses correct `col` column)
- Deduplicates via SHA256 hash
- Returns `{ ok: true, error_hash }`

### 2. Dev Watcher Script ✅
**File:** `scripts/phase72-watch-dev.mjs`

- Spawns `npm run dev:quic`
- Watches stdout/stderr for errors
- Parses file:line:col patterns
- POSTs to `/api/phase72/capture-error`
- Calls `/api/phase72/suggest-fix` for AI suggestions
- Displays suggestions in terminal

### 3. Global YoRHa Theme ✅
**File:** `src/app.css` (updated)

CSS variables:
```css
--yorha-bg: #d4c9a9;           /* Light beige */
--yorha-bg-dark: #2a2016;      /* Dark brown */
--yorha-panel: #c4b99a;        /* Medium beige */
--yorha-paper: #f8f0d9;        /* Light paper */
--yorha-ink: #0f0f0f;          /* Dark ink */
--yorha-crimson: #a51c30;      /* Harvard crimson */
--yorha-crimson-soft: #cc4658; /* Soft crimson */
--yorha-font: 'JetBrains Mono', 'Courier New', monospace;
```

---

## 🚀 Quick Start

### Step 1: Start Error Brain Dev Server
```powershell
cd sveltekit-frontend
npm run dev:quic:brain
```

**Expected output:**
```
[Phase72] Watching dev:quic output…

  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 2: Test Error Capture
1. Open `src/routes/analysis-center/+page.svelte`
2. Add a bad import: `import { client } from '$lib/server/ollama/client';`
3. Save file
4. Watch terminal for:
   ```
   src/routes/analysis-center/+page.svelte:1:1 - error TS2305: Cannot import $lib/server/ollama/client.ts into code that runs in the browser

   ───────── Phase72 Suggest-Fix ─────────
   ### Root Cause
   Server-only modules cannot be imported in browser code.

   ### Fix Plan
   1. Move the import to +page.server.ts
   2. Or create an API endpoint that calls the server module
   3. Use form actions or fetch() to communicate

   Related routes: /analysis-center
   ────────────────────────────────────────
   ```

### Step 3: Remove the bad import
- Delete the import
- Save
- Verify error disappears from terminal

---

## 📊 Architecture

```
npm run dev:quic:brain
    ↓
phase72-watch-dev.mjs
    ↓ (spawns)
npm run dev:quic (Vite)
    ↓ (stdout/stderr)
Error Parser (regex)
    ↓ (POST)
/api/phase72/capture-error
    ↓ (stores in DB)
phase72_error table
    ↓ (POST)
/api/phase72/suggest-fix
    ↓ (calls)
Ollama (gemma3-legal:latest)
    ↓ (returns)
AI Fix Suggestion
    ↓ (displays)
Terminal: ───────── Phase72 Suggest-Fix ─────────
```

---

## 🎨 Using the YoRHa Theme

### In Your Pages
```svelte
<script lang="ts">
  let filter = $state('');
</script>

<div style="background: var(--yorha-bg); color: var(--yorha-ink);">
  <h1 style="color: var(--yorha-crimson);">COMMAND CENTER</h1>

  <input
    bind:value={filter}
    style="background: var(--yorha-paper); border: 2px solid var(--yorha-ink);"
  />

  <button style="background: var(--yorha-crimson); color: var(--yorha-paper);">
    Search
  </button>
</div>
```

### CSS Classes (if you add them)
```css
.yorha-header {
  background: var(--yorha-bg-dark);
  color: var(--yorha-paper);
  border-bottom: 3px solid var(--yorha-crimson);
}

.yorha-btn {
  background: var(--yorha-crimson);
  color: var(--yorha-paper);
  border: 2px solid var(--yorha-ink);
}

.yorha-btn:hover {
  background: var(--yorha-crimson-soft);
}
```

---

## 🔗 API Endpoints

### POST /api/phase72/capture-error
Capture an error

```powershell
$body = @{
    file_path = "src/routes/analysis-center/+page.svelte"
    line = 1
    col = 1
    code = "VITE_SERVER_IMPORT_IN_CLIENT"
    severity = "error"
    message = "Cannot import $lib/server/ollama/client.ts into code that runs in the browser"
    route = "/analysis-center"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/capture-error" `
  -Method Post -Body $body -ContentType "application/json"
```

### POST /api/phase72/suggest-fix
Get AI suggestion

```powershell
$body = @{
    route = "/analysis-center"
    code = "VITE_SERVER_IMPORT_IN_CLIENT"
    message = "Cannot import $lib/server/ollama/client.ts into code that runs in the browser"
    file_path = "src/routes/analysis-center/+page.svelte"
    line = 1
    col = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/suggest-fix" `
  -Method Post -Body $body -ContentType "application/json"
```

---

## 📝 Files Created/Modified

### New Files
```
✅ sveltekit-frontend/src/routes/api/phase72/capture-error/+server.ts
✅ sveltekit-frontend/scripts/phase72-watch-dev.mjs
✅ sveltekit-frontend/scripts/find-migration-targets.ps1
✅ SVELTE5_RUNES_MIGRATION.md
✅ PHASE72_BRAIN_SETUP.md (this file)
```

### Modified Files
```
✅ sveltekit-frontend/src/app.css (added YoRHa theme variables)
✅ sveltekit-frontend/package.json (added dev:quic:brain script)
```

---

## 🧠 How the Brain Works

### Error Parsing
The watcher looks for:
- File paths: `src/routes/...`
- Line:col patterns: `:123:45`
- Error keywords: "Cannot import", "ERROR", "✘"

### Suggestion Generation
1. Error is parsed and hashed
2. Sent to `/api/phase72/capture-error` (stored in DB)
3. Sent to `/api/phase72/suggest-fix` (AI analysis)
4. Ollama (gemma3-legal) generates fix
5. Suggestion printed to terminal

### Fallback Suggestions
If Ollama is unavailable, fallback suggestions are generated for common errors:
- **VITE_SERVER_IMPORT_IN_CLIENT** → "Move to +page.server.ts or create API endpoint"
- **TS2304** → "Import the missing symbol"
- **TS2339** → "Add property to type definition"

---

## ✅ Verification Checklist

- [ ] Database schema uses `col` (not `column`)
- [ ] `/api/phase72/capture-error` endpoint accessible
- [ ] `/api/phase72/suggest-fix` endpoint accessible
- [ ] `npm run dev:quic:brain` starts without errors
- [ ] Introducing a TS error shows capture + suggestion
- [ ] Terminal displays `───────── Phase72 Suggest-Fix ─────────`
- [ ] YoRHa theme variables available in CSS

---

## 🎯 Next Steps

1. **Test the flow:**
   ```powershell
   npm run dev:quic:brain
   # Introduce an error and verify capture + suggestion
   ```

2. **Start Svelte 5 migration:**
   ```powershell
   .\scripts\find-migration-targets.ps1
   # See SVELTE5_RUNES_MIGRATION.md for patterns
   ```

3. **Apply theme to pages:**
   - Use `var(--yorha-*)` in your styles
   - Update pages to use runes + theme

4. **Integrate with Phase 78 Planner (optional):**
   - Set `PHASE78_PLANNER_URL` to your planner service
   - Planner can fan out to Ollama/Claude/Gemini

---

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
- Check Ollama is running: `curl http://127.0.0.1:11434/api/tags`
- Fallback suggestions should still appear

### Errors not being captured
- Check browser console for fetch errors
- Verify `/api/phase72/capture-error` is accessible
- Check database connection

### No AI suggestions appearing
- Verify Ollama is running
- Check `PHASE72_SUGGEST_URL` environment variable
- Fallback suggestions should still appear

---

**Status:** ✅ Ready to deploy
**Last Updated:** December 2, 2025

# Phase 72-78: Error Brain + YoRHa Crimson Theme Deployment

**Date:** December 2, 2025
**Status:** ✅ Ready for Integration
**Goal:** CLI Errors → Phase 72 Brain → AI Suggestions + Harvard Crimson UI

---

## 🎯 What's Been Implemented

### 1. Browser/Server Import Fix
✅ Created `+page.server.ts` for analysis-center
✅ Moved Ollama calls to server-side actions
✅ Removed direct browser imports of `$lib/server/*`

### 2. Error Capture System
✅ `scripts/phase72-watch-dev-logs.mjs` - Wraps dev server
✅ Parses TypeScript/Svelte/Vite errors in real-time
✅ POSTs to `/api/phase72/capture-error`
✅ Requests AI suggestions from `/api/phase72/suggest-fix`

### 3. API Endpoints
✅ `src/routes/api/phase72/capture-error/+server.ts` - Stores errors
✅ `src/routes/api/phase72/suggest-fix/+server.ts` - Suggests fixes

### 4. YoRHa Harvard Crimson Theme
✅ `src/lib/styles/yorha-crimson-theme.css` - Global CSS variables
✅ Shared layout: `src/routes/(yorha)/+layout.svelte`
✅ Updated `src/app.css` to import theme

---

## 📦 Files Created/Modified

```
sveltekit-frontend/
├── scripts/
│   └── phase72-watch-dev-logs.mjs          [NEW]
├── src/
│   ├── app.css                             [MODIFIED - added theme import]
│   ├── lib/styles/
│   │   └── yorha-crimson-theme.css         [NEW]
│   └── routes/
│       ├── (yorha)/
│       │   └── +layout.svelte              [NEW]
│       ├── analysis-center/
│       │   ├── +page.svelte                [MODIFIED - fixed imports]
│       │   └── +page.server.ts             [NEW]
│       └── api/phase72/
│           ├── capture-error/
│           │   └── +server.ts              [NEW]
│           └── suggest-fix/
│               └── +server.ts              [NEW]
└── package.json                            [MODIFIED - added dev:brain script]
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies
```powershell
cd sveltekit-frontend
npm install node-fetch  # if not already installed
```

### Step 2: Start Error Brain Dev Server
```powershell
npm run dev:brain
```

**Expected output:**
```
[phase72-watch] Starting dev watcher...
[phase72-watch] Ingest URL: http://127.0.0.1:5173/api/phase72/capture-error
[phase72-watch] Suggest URL: http://127.0.0.1:5173/api/phase72/suggest-fix

  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 3: Test Error Capture
1. Open `src/routes/analysis-center/+page.svelte`
2. Introduce a TypeScript error (e.g., use undefined variable)
3. Save the file
4. Watch terminal for:
   - Original error message
   - `[phase72-watch] ✓ Captured: ...`
   - `🧠 Error Brain Suggestion:` with AI fix

---

## 🧠 How It Works

```
npm run dev:brain
    ↓
phase72-watch-dev-logs.mjs spawns Vite
    ↓
Vite compiles, outputs errors to stdout/stderr
    ↓
Watcher parses error lines (regex patterns)
    ↓
POST /api/phase72/capture-error
    ↓
Stores in phase72_error table
    ↓
POST /api/phase72/suggest-fix
    ↓
Calls Ollama (gemma3-legal) or fallback
    ↓
Returns AI suggestion to terminal
```

---

## 🎨 YoRHa Harvard Crimson Theme

### CSS Variables Available
```css
--yorha-bg: #d4c9a9;              /* Light beige background */
--yorha-panel: #f8f0d9;           /* Light panel */
--yorha-panel-dark: #2a2016;      /* Dark panel */
--yorha-panel-darker: #12100c;    /* Darkest panel */
--yorha-crimson: #a51c30;         /* Harvard crimson accent */
--yorha-success: #00c853;         /* Success green */
--yorha-warning: #ff9800;         /* Warning orange */
--yorha-danger: #d32f2f;          /* Danger red */
```

### Utility Classes
```html
<!-- Buttons -->
<button class="yorha-btn">Default</button>
<button class="yorha-btn yorha-btn-primary">Primary (Crimson)</button>
<button class="yorha-btn yorha-btn-success">Success</button>

<!-- Panels -->
<div class="yorha-panel">Light panel</div>
<div class="yorha-panel-dark">Dark panel</div>

<!-- Badges -->
<span class="yorha-badge yorha-badge-crimson">CRITICAL</span>
<span class="yorha-badge yorha-badge-success">OK</span>

<!-- Text -->
<h1 class="yorha-text-display">TITLE</h1>
<p class="yorha-text-crimson">Crimson text</p>

<!-- Layout -->
<div class="yorha-sidebar-layout">
  <aside class="yorha-sidebar">Navigation</aside>
  <main class="yorha-main">Content</main>
</div>
```

---

## 🔗 API Reference

### POST /api/phase72/capture-error
Capture a dev error
```powershell
$body = @{
    code = "TS2304"
    message = "Cannot find name 'CardTitle'"
    file_path = "src/routes/analysis-center/+page.svelte"
    line = 42
    col = 13
    severity = "error"
    source = "cli"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/capture-error" `
  -Method Post -Body $body -ContentType "application/json"
```

### POST /api/phase72/suggest-fix
Get AI fix suggestion
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

## 🔧 Configuration

### Environment Variables
```powershell
# .env or .env.local
PHASE72_INGEST_URL=http://127.0.0.1:5173/api/phase72/capture-error
PHASE72_SUGGEST_URL=http://127.0.0.1:5173/api/phase72/suggest-fix
PHASE78_PLANNER_URL=http://127.0.0.1:8010/phase78/suggest-fix  # optional
```

### Customize Error Parsing
Edit `scripts/phase72-watch-dev-logs.mjs`:
- `parseLine()` - Add regex patterns for new error formats
- `parseSvelteKitError()` - Add SvelteKit-specific error detection
- `getSuggestion()` - Customize AI prompt

---

## 📊 Database Schema

Errors are stored in `phase72_error` table:
```sql
CREATE TABLE phase72_error (
  id SERIAL PRIMARY KEY,
  error_hash VARCHAR(64) UNIQUE,
  file_path TEXT,
  line INT,
  col INT,
  code VARCHAR(20),
  severity VARCHAR(10),
  message TEXT,
  phase INT,
  cycle INT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🎯 Next Steps

1. **Test the flow:**
   - Run `npm run dev:brain`
   - Introduce an error
   - Verify capture + suggestion

2. **Integrate with Phase 78 Planner:**
   - Set `PHASE78_PLANNER_URL` to your planner service
   - Planner can fan out to Ollama/Claude/Gemini

3. **Apply YoRHa theme to other routes:**
   - Move routes under `(yorha)` group
   - Use `.yorha-*` classes in templates

4. **Extend error parsing:**
   - Add patterns for your specific errors
   - Customize suggestions per error code

---

## 🐛 Troubleshooting

### "Cannot import $lib/server/..." error still appears
- Ensure `+page.server.ts` exists in the route
- Check that server-only imports are only in `+page.server.ts`
- Restart dev server

### Errors not being captured
- Check browser console for fetch errors
- Verify `/api/phase72/capture-error` is accessible
- Check database connection in `$lib/server/db`

### No AI suggestions appearing
- Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`
- Check `PHASE78_PLANNER_URL` if using external planner
- Fallback suggestions should still appear

---

## 📝 Example: Adding a New Route with YoRHa Theme

```svelte
<!-- src/routes/(yorha)/my-detective-page/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
</script>

<div class="yorha-header">
  <h1>MY DETECTIVE PAGE</h1>
  <h2>Powered by Phase 72-78 Error Brain</h2>
</div>

<div class="yorha-sidebar-layout">
  <aside class="yorha-sidebar">
    <nav class="yorha-nav">
      <li class="yorha-nav-item">
        <a href="/my-detective-page" class="yorha-nav-link active">Dashboard</a>
      </li>
      <li class="yorha-nav-item">
        <a href="/my-detective-page/cases" class="yorha-nav-link">Cases</a>
      </li>
    </nav>
  </aside>

  <main class="yorha-main">
    <div class="yorha-panel">
      <h2>Content</h2>
      <button class="yorha-btn yorha-btn-primary">Action</button>
    </div>
  </main>
</div>

<style>
  :global(.yorha-shell) {
    background: var(--yorha-bg);
  }
</style>
```

---

## ✅ Verification Checklist

- [ ] `npm run dev:brain` starts without errors
- [ ] Vite dev server is accessible at http://localhost:5173
- [ ] Introducing a TS error shows capture + suggestion in terminal
- [ ] `/api/phase72/capture-error` endpoint responds
- [ ] `/api/phase72/suggest-fix` endpoint responds
- [ ] YoRHa theme CSS variables are available
- [ ] Analysis center page loads without import errors
- [ ] Form submission works (server-side action)

---

**Ready to deploy!** 🚀

# Phase 72-78 Quick Reference

## 🚀 Start Error Brain
```powershell
cd sveltekit-frontend
npm run dev:brain
```

## 🎨 YoRHa Theme Classes

### Buttons
```html
<button class="yorha-btn">Default</button>
<button class="yorha-btn yorha-btn-primary">Crimson</button>
<button class="yorha-btn yorha-btn-success">Success</button>
<button class="yorha-btn yorha-btn-danger">Danger</button>
```

### Panels
```html
<div class="yorha-panel">Light</div>
<div class="yorha-panel-dark">Dark</div>
<div class="yorha-panel-darker">Darkest</div>
```

### Badges
```html
<span class="yorha-badge yorha-badge-crimson">CRITICAL</span>
<span class="yorha-badge yorha-badge-success">OK</span>
<span class="yorha-badge yorha-badge-warning">WARN</span>
<span class="yorha-badge yorha-badge-danger">ERROR</span>
```

### Layout
```html
<div class="yorha-sidebar-layout">
  <aside class="yorha-sidebar">
    <nav class="yorha-nav">
      <li class="yorha-nav-item">
        <a href="/" class="yorha-nav-link active">Home</a>
      </li>
    </nav>
  </aside>
  <main class="yorha-main">Content</main>
</div>
```

### Text
```html
<h1 class="yorha-text-display">TITLE</h1>
<p class="yorha-text-crimson">Crimson</p>
<p class="yorha-text-success">Success</p>
<p class="yorha-text-muted">Muted</p>
```

## 🧠 Error Brain Flow

1. **Dev Error Occurs** → Vite outputs to stdout/stderr
2. **Watcher Parses** → `phase72-watch-dev-logs.mjs` regex match
3. **Capture** → POST `/api/phase72/capture-error` → DB
4. **Suggest** → POST `/api/phase72/suggest-fix` → Ollama/Planner
5. **Display** → Terminal shows `🧠 Error Brain Suggestion:`

## 📝 Server-Side Pattern

```typescript
// +page.server.ts - runs on server only
import { getOllamaClient } from '$lib/server/ollama/client';

export const load = async () => {
  const client = getOllamaClient();
  return { models: await client.listModels() };
};

export const actions = {
  analyze: async ({ request }) => {
    const data = await request.formData();
    // Server-side logic here
    return { success: true };
  }
};
```

```svelte
<!-- +page.svelte - runs in browser -->
<script lang="ts">
  import { enhance } from '$app/forms';
  export let data;  // from load()
</script>

<form method="post" action="?/analyze" use:enhance>
  <input name="query" />
  <button type="submit">Submit</button>
</form>
```

## 🔗 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/phase72/capture-error` | POST | Store error in DB |
| `/api/phase72/suggest-fix` | POST | Get AI suggestion |

## 🎯 CSS Variables

```css
--yorha-bg: #d4c9a9;
--yorha-panel: #f8f0d9;
--yorha-panel-dark: #2a2016;
--yorha-panel-darker: #12100c;
--yorha-crimson: #a51c30;
--yorha-success: #00c853;
--yorha-warning: #ff9800;
--yorha-danger: #d32f2f;
```

## 📦 Files to Know

- `scripts/phase72-watch-dev-logs.mjs` - Error watcher
- `src/lib/styles/yorha-crimson-theme.css` - Theme variables
- `src/routes/(yorha)/+layout.svelte` - Shared layout
- `src/routes/api/phase72/*` - API endpoints
- `src/routes/analysis-center/+page.server.ts` - Server actions

## ✅ Verify Setup

```powershell
# Check Ollama
curl http://127.0.0.1:11434/api/tags

# Check Vite
curl http://localhost:5173/

# Check API
Invoke-RestMethod -Uri "http://localhost:5173/api/phase72/capture-error" -Method Post
```

---

**Status:** ✅ Ready to deploy

# Quick Reference: Phase 72 Error Brain

## Start Error Brain
```powershell
cd sveltekit-frontend
npm run dev:quic:brain
```

## Test Error Capture
1. Open `src/routes/analysis-center/+page.svelte`
2. Add: `import { client } from '$lib/server/ollama/client';`
3. Save
4. Watch terminal for `───────── Phase72 Suggest-Fix ─────────`

## YoRHa Theme Colors
```css
--yorha-bg: #d4c9a9;           /* Light beige */
--yorha-bg-dark: #2a2016;      /* Dark brown */
--yorha-panel: #c4b99a;        /* Medium beige */
--yorha-paper: #f8f0d9;        /* Light paper */
--yorha-ink: #0f0f0f;          /* Dark ink */
--yorha-crimson: #a51c30;      /* Harvard crimson */
--yorha-crimson-soft: #cc4658; /* Soft crimson */
```

## Svelte 5 Runes Cheat Sheet

| Old | New |
|-----|-----|
| `export let x;` | `const { x } = $props();` |
| `let x = '';` | `let x = $state('');` |
| `$: y = x.filter(...)` | `const y = $derived(x.filter(...));` |
| `onMount(() => {})` | `$effect(() => {})` |
| `onDestroy(() => {})` | `$effect.pre(() => { return () => {} })` |

## Find Migration Targets
```powershell
.\scripts\find-migration-targets.ps1
```

## API Endpoints

### Capture Error
```powershell
POST /api/phase72/capture-error
{
  "file_path": "src/routes/analysis-center/+page.svelte",
  "line": 1,
  "col": 1,
  "code": "VITE_SERVER_IMPORT_IN_CLIENT",
  "severity": "error",
  "message": "Cannot import $lib/server/ollama/client.ts..."
}
```

### Get Suggestion
```powershell
POST /api/phase72/suggest-fix
{
  "route": "/analysis-center",
  "code": "VITE_SERVER_IMPORT_IN_CLIENT",
  "message": "Cannot import $lib/server/ollama/client.ts...",
  "file_path": "src/routes/analysis-center/+page.svelte",
  "line": 1,
  "col": 1
}
```

## Files to Know

| File | Purpose |
|------|---------|
| `src/routes/api/phase72/capture-error/+server.ts` | Error capture endpoint |
| `scripts/phase72-watch-dev.mjs` | Dev watcher |
| `src/app.css` | Theme variables |
| `PHASE72_BRAIN_SETUP.md` | Full setup guide |
| `SVELTE5_RUNES_MIGRATION.md` | Migration patterns |

## Troubleshooting

**Errors not captured?**
- Check Ollama: `curl http://127.0.0.1:11434/api/tags`
- Check API: `curl http://localhost:5173/api/phase72/capture-error`

**No suggestions?**
- Fallback suggestions should still appear
- Check Ollama is running

**Theme not working?**
- Verify `src/app.css` has theme variables
- Use `var(--yorha-*)` in your styles

---

**Status:** Ready to deploy 🚀

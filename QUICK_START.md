# Quick Start: Phase 72-78 Error Brain

## 3-Step Setup

### Step 1: Fix Database
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d legal_ai_db -f "..\backend\sql\phase72_topology_schema.sql"
psql -h localhost -U postgres -d legal_ai_db -f "..\backend\sql\phase72_views_fixed.sql"
```

### Step 2: Start Dev Server
```powershell
cd sveltekit-frontend
npm run dev:quic
```

### Step 3: Test Error Capture
1. Open `src/routes/analysis-center/+page.svelte`
2. Add: `const x = undefined_var;`
3. Save file
4. Watch terminal for `🧠 Error Brain Suggestion:`

---

## What You Get

- ✅ Real-time error capture from dev server
- ✅ AI suggestions via Ollama (gemma3-legal)
- ✅ Errors stored in PostgreSQL
- ✅ No "Cannot import $lib/server" errors
- ✅ Terminal displays fix suggestions

---

## Files Changed

| File | Change |
|------|--------|
| `backend/sql/phase72_topology_schema.sql` | `column` → `col` |
| `sveltekit-frontend/package.json` | `dev:quic` uses wrapper |
| `sveltekit-frontend/scripts/phase72-dev-wrapper.mjs` | NEW - error watcher |
| `sveltekit-frontend/src/routes/api/ollama/chat/+server.ts` | NEW - API endpoint |
| `backend/sql/phase72_views_fixed.sql` | NEW - fixed views |

---

## Troubleshooting

**"column does not exist"**
→ Run `phase72_views_fixed.sql`

**Errors not captured**
→ Check Ollama: `curl http://127.0.0.1:11434/api/tags`

**No suggestions**
→ Fallback suggestions should still appear

---

**Status:** Ready to deploy 🚀

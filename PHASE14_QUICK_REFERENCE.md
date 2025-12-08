# Phase 14 Quick Reference Card

## What is Phase 14?
**Phase 14** = `.env.phase14` = Master env file at repo root = Single source of truth for entire stack

## Quick Commands

### Apply Phase 14 to Frontend
```bash
cd sveltekit-frontend
Copy-Item ..\.env.phase14 .\.env -Force
```

### Start Dev with Phase 14
```bash
npm run dev:quic
```

### Verify Phase 14 Loaded
```bash
node -e "require('dotenv').config({path:'.env'}); console.log('✅', process.env.OLLAMA_URL);"
```

### Run Phase 6 Validation
```bash
npm run phase6:core
```

### Sync to All Services
```bash
Copy-Item .env.phase14 sveltekit-frontend\.env -Force
Copy-Item .env.phase14 go-services\legal-engine\.env -Force
Copy-Item .env.phase14 go-services\rag-service\.env -Force
```

## VS Code Tasks (Ctrl+Shift+B)
1. **Phase 14: Apply env + Phase 6 core check** - Sync and validate
2. **Dev: QUIC (Phase 14 env)** - Start dev server
3. **Phase 14: Sync env to all services** - Copy to all services
4. **Phase 14: Verify env loaded** - Check env vars

## Key Env Vars

| Variable | Value | Used By |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://legal_admin:123456@localhost:5434/legal_ai_db` | Lucia, Drizzle, Go services |
| `REDIS_URL` | `redis://localhost:6379` | Sessions, cache |
| `OLLAMA_URL` | `http://localhost:11434` | AI chat, RAG, reports |
| `OLLAMA_MODEL` | `gemma3-legal:latest` | Chat, analysis |
| `EMBEDDING_MODEL` | `embeddinggemma:latest` | Vector search |
| `QDRANT_URL` | `http://localhost:6333` | Vector DB |
| `AUTH_COOKIE_NAME` | `yorha_session` | Lucia sessions |
| `GO_LEGAL_ENGINE_PORT` | `8080` | Legal engine service |
| `GO_RAG_SERVICE_PORT` | `8081` | RAG service |
| `PHASE72_ENABLED` | `true` | Error Brain |
| `PHASE78_ENABLED` | `true` | Playwright checks |
| `PHASE82_ENABLED` | `true` | Svelte 5 codemod |

## Routes

### Public (No Auth)
- `/` - Home
- `/login` - Login
- `/register` - Register

### Protected (Lucia Auth)
- `/(app)/cases/[id]/overview` - Case overview
- `/(app)/cases/[id]/evidence` - Evidence board
- `/(app)/cases/[id]/reports` - Reports
- `/(app)/all-routes` - Phase 72/78/82 dashboard

## Test URLs
```
http://127.0.0.1:5173/                    # Home
http://127.0.0.1:5173/login               # Login
http://127.0.0.1:5173/cases/1/overview    # Protected
http://127.0.0.1:5173/all-routes          # Dashboard
```

## Files Modified
- ✅ `.env.phase14` - Created master env
- ✅ `sveltekit-frontend/.env` - Synced from Phase 14
- ✅ `sveltekit-frontend/src/lib/server/auth/lucia.ts` - Uses AUTH_COOKIE_NAME
- ✅ `.vscode/tasks.json` - Added Phase 14 tasks
- ✅ `PHASE14_INTEGRATION_COMPLETE.md` - Full docs
- ✅ `PHASE14_WIRED_COMPLETE.md` - Summary

## Troubleshooting

### "Cannot connect to database"
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
# Start Postgres
docker-compose up -d postgres
```

### "Ollama not responding"
```bash
# Check OLLAMA_URL in .env
cat .env | grep OLLAMA_URL
# Start Ollama
ollama serve
```

### "Auth redirect loop"
```bash
# Check DEV_BYPASS_AUTH
cat .env | grep DEV_BYPASS_AUTH
# Should be: DEV_BYPASS_AUTH=true for dev
```

## Next Steps
1. ✅ Phase 14 created and synced
2. ✅ Lucia auth configured
3. ✅ VS Code tasks ready
4. ⏭️ Sync to Go services
5. ⏭️ Run Phase 6 validation
6. ⏭️ Test full stack

**Phase 14 = One file. One truth. Mechanically wired.**

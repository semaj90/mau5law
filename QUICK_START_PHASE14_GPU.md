# Quick Start - Phase 14 + GPU Phase 72

**Status**: ✅ Ready to go
**Dev Server**: http://127.0.0.1:5173/
**GPU Addon**: ✅ Built

---

## 30-Second Setup

```bash
# 1. Sync Phase 14 env
cd sveltekit-frontend
Copy-Item ..\.env.phase14 .\.env -Force

# 2. Dev server already running at http://127.0.0.1:5173/
# (or restart with: npm run dev:quic)

# 3. Test it
curl http://127.0.0.1:5173/
```

---

## Key URLs

| URL | Type | Auth |
|-----|------|------|
| http://127.0.0.1:5173/ | Home | Public |
| http://127.0.0.1:5173/login | Login | Public |
| http://127.0.0.1:5173/cases/1/overview | Case | Protected |
| http://127.0.0.1:5173/all-routes | Dashboard | Protected |

---

## VS Code Tasks (Ctrl+Shift+B)

1. **Phase 14: Apply env + Phase 6 core check** - Sync + validate
2. **Dev: QUIC (Phase 14 env)** - Start dev server
3. **Phase 14: Sync env to all services** - Copy to Go services
4. **Phase 14: Verify env loaded** - Check env vars
5. **Phase 72: Build GPU AST Vectorizer** - Rebuild GPU addon

---

## GPU Phase 72 Setup

### Check addon
```bash
Test-Path "sveltekit-frontend\build\Release\ast_error_vectorizer.node"
# Should return: True
```

### Rebuild addon
```bash
cd sveltekit-frontend
cmake --build build --config Release --target ast_error_vectorizer
```

### Implement wrapper (templates in PHASE72_GPU_VECTORIZER_INTEGRATION.md)
1. Create `src/lib/server/phase72/astVectorizer.ts`
2. Create `src/lib/server/phase72/vectorizeErrors.ts`
3. Create `src/lib/server/phase72/clusterErrors.ts`
4. Use in Phase 72 error analysis pipeline

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://legal_admin:123456@localhost:5434/legal_ai_db

# Auth
AUTH_COOKIE_NAME=yorha_session
AUTH_SECRET=phase14-yorha-legal-ai-32char-secret-change-in-production

# AI
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3-legal:latest

# Vector DB
QDRANT_URL=http://localhost:6333

# Go Services
GO_LEGAL_ENGINE_PORT=8080
GO_RAG_SERVICE_PORT=8081
```

---

## Troubleshooting

### Dev server won't start
```bash
# Kill port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Restart
npm run dev:quic
```

### Auth redirect loop
```bash
# Check DEV_BYPASS_AUTH
cat .env | grep DEV_BYPASS_AUTH
# Should be: DEV_BYPASS_AUTH=true
```

### GPU addon not found
```bash
# Rebuild
cmake --build build --config Release
```

### Lucide-svelte errors
Already excluded in vite.config.ts. If issues persist:
```bash
# Clean cache
Remove-Item -Recurse -Force .svelte-kit
npm run dev:quic
```

---

## Next Steps

1. ✅ Phase 14 env synced
2. ✅ Dev server running
3. ✅ GPU addon verified
4. ⏭️ Implement GPU Phase 72 wrapper (see PHASE72_GPU_VECTORIZER_INTEGRATION.md)
5. ⏭️ Sync Phase 14 to Go services
6. ⏭️ Start infrastructure services
7. ⏭️ Test full stack

---

## Documentation

- **PHASE14_MASTER_REFERENCE.md** - Complete reference
- **PHASE72_GPU_VECTORIZER_INTEGRATION.md** - GPU setup
- **SESSION_COMPLETE_SUMMARY.md** - Full summary
- **QUICK_START_PHASE14_GPU.md** - This file

---

**Everything is ready. Start building!**


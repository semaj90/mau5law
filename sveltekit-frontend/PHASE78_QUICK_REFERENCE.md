# Phase 78 - Quick Reference Card

## 🚀 Immediate Actions (Copy-Paste Ready)

### Fix Database Permissions (Choose ONE)

#### Option 1: Grant Ownership (Fastest)
```bash
psql -U postgres -d legal_ai_db -c "ALTER TABLE evidence_vectors OWNER TO $(whoami);"
npm run db:migrate
```

#### Option 2: Grant All Privileges
```bash
psql -U postgres -d legal_ai_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $(whoami);"
npm run db:migrate
```

#### Option 3: Fresh Database
```bash
psql -U postgres -c "DROP DATABASE IF EXISTS legal_ai_db;"
psql -U postgres -c "CREATE DATABASE legal_ai_db WITH OWNER $(whoami);"
npm run db:migrate
```

---

## 📍 Important URLs

| Page | URL | Purpose |
|------|-----|---------|
| **Dashboard** | `/phase78/monitor` | All error metrics and trends |
| **Route Details** | `/phase78/routes/[routePath]` | Errors & suggestions for one route |
| **Command Center** | `/all-routes` | All routes with health badges |

---

## 🔧 Key Commands

```bash
# Collect errors from logs
npm run phase78:collect-errors:verbose

# Insert errors into database
npm run phase78:insert:verbose

# Cluster similar errors
npm run phase78:cluster:verbose

# Generate fix suggestions
npm run phase78:suggest:verbose

# Verify results
npm run phase78:check-results

# Start dev server
npm run dev

# Database check
psql $DATABASE_URL -c "SELECT COUNT(*) FROM error_events;"
```

---

## 📊 File Locations

**Page Servers**:
- `src/routes/(app)/phase78/routes/[routePath]/+page.server.ts`
- `src/routes/(app)/phase78/monitor/+page.server.ts`

**Components**:
- `src/lib/components/phase78/ErrorEventsList.svelte`
- `src/lib/components/phase78/SuggestionsList.svelte`
- `src/lib/components/phase78/ErrorModal.svelte`

**API Endpoints**:
- `src/routes/api/phase78/routes/[routePath]/+server.ts`
- `src/routes/api/phase78/monitor/+server.ts`
- `src/routes/api/phase78/suggestions/[id]/+server.ts`

**Documentation**:
- `PHASE78_STATUS.md` - Current status
- `PHASE78_DATABASE_SETUP.md` - Database troubleshooting
- `PHASE78_INDEX.md` - Complete file reference
- `PHASE78_DEPLOYMENT_CHECKLIST.md` - Testing checklist
- `PHASE78_SESSION_COMPLETE.md` - What was done today

---

## ✅ Implementation Checklist

- [x] Page servers created (2 new files)
- [x] All components verified (0 errors)
- [x] Syntax errors fixed (1 bug)
- [x] Documentation complete (5 docs)
- [ ] Database migration succeeds (pending)
- [ ] Error pipeline runs (pending)
- [ ] UI displays real data (pending)

---

## 🔴 Known Blocker

**PostgreSQL Permission Error**
```
Error: must be owner of table evidence_vectors (Code 42501)
```

**Solution**: Run one of the commands above to fix permissions, then:
```bash
npm run db:migrate
```

---

## 💡 Architecture Overview

```
User Visits /phase78/monitor
         ↓
    Page Server Loads
  (returns empty initial state)
         ↓
    Page Component Renders
  (shows loading state)
         ↓
    Client Fetches API
  GET /api/phase78/monitor
         ↓
    API Queries Database
  (route_health, error_events, etc.)
         ↓
    Data Returned & UI Updates
  (charts, tables, metrics display)
         ↓
    Auto-refresh Every 30 Seconds
```

---

## 🎯 Success Indicators

✅ Database migration completes without errors
✅ `/phase78/monitor` loads and shows error metrics
✅ `/phase78/routes/[path]` shows specific errors
✅ Error suggestions are clickable and can be applied
✅ `/all-routes` shows health badges on broken routes
✅ 30-second auto-refresh works on dashboard

---

## 📞 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Database connection fails | Check `DATABASE_URL` in `.env` |
| Permission error on migration | Run permission fix commands above |
| API returns 404 | Run migration first |
| Dashboard is empty | Check error_events table has data |
| Page won't load | Check browser console for errors |
| Suggestions won't apply | Verify error_suggestions table exists |

---

## 🕐 Estimated Timeline

| Step | Time |
|------|------|
| Fix permissions | 2-5 min |
| Run migration | 1-2 min |
| Collect errors | 2-3 min |
| Insert errors | 1-2 min |
| UI testing | 5-10 min |
| **Total** | **15-25 min** |

---

## 📚 Documentation Maps

**Choose your next read based on what you need:**

- 🚀 **Want to deploy?** → `PHASE78_DEPLOYMENT_CHECKLIST.md`
- 🔧 **Database issues?** → `PHASE78_DATABASE_SETUP.md`
- 📋 **What files exist?** → `PHASE78_INDEX.md`
- 📊 **Current status?** → `PHASE78_STATUS.md`
- 🎯 **What got done today?** → `PHASE78_SESSION_COMPLETE.md`

---

## 💾 Key Exports

### Database Tables
```sql
route_health          -- Route health status & error counts
error_events          -- Individual error occurrences
error_suggestions     -- Fix suggestions for errors
```

### API Endpoints
```
GET    /api/phase78/routes/[routePath]     -- Error details
GET    /api/phase78/monitor                -- Dashboard data
POST   /api/phase78/suggestions/[id]       -- Apply suggestion
DELETE /api/phase78/suggestions/[id]       -- Dismiss suggestion
```

### UI Pages
```
/phase78/monitor                           -- Dashboard
/phase78/routes/[routePath]               -- Route details
/all-routes                                -- Command center
```

---

## 🔒 Security Checklist

- [x] API endpoints require proper user context
- [x] Suggestions stored with user tracking (appliedBy, dismissedBy)
- [x] Database queries use Drizzle ORM (SQL injection protected)
- [ ] Add rate limiting for API endpoints (Phase 90)
- [ ] Add permission checks for suggestion application (Phase 90)

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page load time | < 2s | ⏳ Pending DB |
| API response time | < 200ms | ⏳ Pending DB |
| Dashboard refresh | 30s intervals | ✅ Ready |
| Component render | < 100ms | ✅ Ready |

---

## 🎓 Learning Resources

**If you need to understand:**
- **SvelteKit page servers**: See `+page.server.ts` files
- **Component architecture**: See `.svelte` files in `phase78/`
- **Database queries**: See API endpoints
- **Error pipeline**: See scripts in `src/lib/server/phase78/`

---

## 🆘 Emergency Commands

```bash
# Kill and restart everything
pkill -f "npm run dev"
npm run db:drop
npm run db:migrate
npm run phase78:collect-errors:verbose
npm run phase78:insert:verbose
npm run dev
```

```bash
# View real-time logs
tail -f logs/phase78-*.log

# Check database health
psql $DATABASE_URL -c "SELECT COUNT(*) as errors FROM error_events; SELECT COUNT(*) as routes FROM route_health;"

# Reset suggestions only (keep errors)
psql $DATABASE_URL -c "DELETE FROM error_suggestions;"
npm run phase78:suggest:verbose
```

---

## 📞 Support Matrix

| Issue | File to Check | Command to Run |
|-------|---------------|---|
| TypeScript errors | PHASE78_INDEX.md | `npm run check` |
| Database errors | PHASE78_DATABASE_SETUP.md | `psql $DATABASE_URL` |
| API errors | API endpoint files | Check browser Network tab |
| UI errors | Component files | Check browser Console |
| Deployment issues | PHASE78_DEPLOYMENT_CHECKLIST.md | Follow checklist |

---

**Last Updated**: December 7, 2025
**Status**: Ready for Database Fix ✅
**Estimated Time to Production**: 15-25 minutes

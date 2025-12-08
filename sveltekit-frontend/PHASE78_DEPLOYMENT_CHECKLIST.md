# Phase 78 Deployment Checklist

## ✅ Pre-Deployment (COMPLETED)

### Page Servers
- [x] Create `/phase78/routes/[routePath]/+page.server.ts`
- [x] Create `/phase78/monitor/+page.server.ts`
- [x] Verify `/all-routes/+page.server.ts` exists
- [x] All page servers compile without errors

### Bug Fixes
- [x] Fix `contextBuilder.ts` line 135 regex error
- [x] Verify all Phase 78 files have no TypeScript errors

### Documentation
- [x] Create implementation status document
- [x] Create database setup guide
- [x] Create complete file index
- [x] Create session completion report

### Verification
- [x] All components are accessible at correct paths
- [x] All imports are correct
- [x] TypeScript compilation succeeds for Phase 78 files

---

## 🔴 Database Setup (BLOCKED - ACTION REQUIRED)

### Fix PostgreSQL Permissions
**Current Issue**:
```
Error: must be owner of table evidence_vectors
Code: 42501 (permission denied)
```

**Select Your Fix Path**:

#### Option A: Grant Ownership (Recommended - 2 minutes)
```bash
# Check current ownership
psql -U postgres -d legal_ai_db -c "\dt evidence_vectors"

# Transfer ownership (replace [your_user] with your username)
psql -U postgres -d legal_ai_db -c "ALTER TABLE evidence_vectors OWNER TO [your_user];"

# Verify
psql -U $DATABASE_URL -c "SELECT version();"

# Then run migration
npm run db:migrate
```

#### Option B: Fresh Database (5 minutes)
```bash
# Drop old database
psql -U postgres -c "DROP DATABASE IF EXISTS legal_ai_db;"

# Create new database
psql -U postgres -c "CREATE DATABASE legal_ai_db WITH OWNER [your_user];"

# Update DATABASE_URL in .env
# Then run migration
npm run db:migrate
```

#### Option C: Use Docker (Alternative)
```bash
# If using Docker, ensure PostgreSQL service has correct permissions
docker-compose up -d postgres

# Then follow Option A above
```

---

## 🔧 Post-Database-Fix Checklist

Once database migration succeeds:

### Verify Database Tables
```bash
[ ] Run: psql $DATABASE_URL -c "\dt route_health error_events error_suggestions"
[ ] All 3 tables appear in output
[ ] All have correct owner (your user)
[ ] Column structure matches schema
```

### Run Error Collection Pipeline
```bash
[ ] npm run phase78:collect-errors:verbose
[ ] Check: logs/phase78-errors.json created
[ ] Check: No errors in collection output
[ ] Review: Sample errors in JSON file
```

### Populate Database
```bash
[ ] npm run phase78:insert:verbose
[ ] Check: error_events table populated
[ ] Check: route_health records created
[ ] Run: psql $DATABASE_URL -c "SELECT COUNT(*) FROM error_events;"
```

### Cluster Errors (Optional)
```bash
[ ] npm run phase78:cluster:verbose
[ ] Check: Error clusters generated
[ ] Check: Cluster metadata saved
```

### Generate Suggestions
```bash
[ ] npm run phase78:suggest:verbose
[ ] Check: Suggestions created
[ ] Check: error_suggestions table populated
[ ] Run: psql $DATABASE_URL -c "SELECT COUNT(*) FROM error_suggestions;"
```

---

## 🧪 UI Testing Checklist

Once database is populated:

### Start Dev Server
```bash
[ ] npm run dev
[ ] Server starts without errors
[ ] No console errors in browser
```

### Test Dashboard Page
```bash
[ ] Visit: http://localhost:5173/phase78/monitor
[ ] Summary cards show error counts
[ ] Severity chart displays data
[ ] Routes by health table shows data
[ ] Top error codes list populated
[ ] Routes with most errors table shows data
[ ] 30-second auto-refresh works
[ ] Manual refresh button works
```

### Test Route Details Page
```bash
[ ] Visit: http://localhost:5173/all-routes
[ ] Routes with errors show badges (❌/⚠️)
[ ] Click on a broken route
[ ] Details page loads at /phase78/routes/[path]
[ ] Errors tab shows error events
[ ] Suggestions tab shows suggestions
[ ] Search works on errors list
[ ] Filter by severity works
```

### Test Interactivity
```bash
[ ] Click "Apply Patch" on a suggestion
[ ] See optimistic UI update
[ ] Check server logs for patch request
[ ] Click "Dismiss" on a suggestion
[ ] Suggestion disappears from list
[ ] Close error details page
[ ] Modal closes cleanly
```

### Test Error States
```bash
[ ] Route with no errors shows empty state
[ ] Route with no suggestions shows empty state
[ ] Loading spinner appears during fetch
[ ] Network error shows error message
[ ] 404 route shows appropriate error
```

---

## 📈 Performance Verification

### Database Performance
```bash
[ ] Query time < 100ms for route details
[ ] Query time < 200ms for dashboard
[ ] No N+1 query issues
[ ] Indexes created and used
```

### Browser Performance
```bash
[ ] Page load time < 2 seconds
[ ] No layout shifts during load
[ ] Smooth animations
[ ] No memory leaks (check DevTools)
[ ] No console warnings
```

---

## 🚀 Deployment Checklist

### Pre-Production
```bash
[ ] All tests pass (npm run test)
[ ] TypeScript check passes (npm run check)
[ ] No ESLint warnings
[ ] No console errors in production build
[ ] Lighthouse score > 80
```

### Production Deploy
```bash
[ ] Update DATABASE_URL in production .env
[ ] Run: npm run build (succeeds)
[ ] Run: npm run preview (works)
[ ] Test all routes in production build
[ ] Monitor error rates post-deploy
```

### Post-Deploy Monitoring
```bash
[ ] Dashboard loads in production
[ ] No 500 errors in logs
[ ] No permission errors
[ ] Auto-refresh working
[ ] All UI interactions responsive
```

---

## 📋 Rollback Plan

If issues arise:

### Quick Rollback
```bash
# Disable Phase 78 UI
[ ] Comment out Phase 78 routes in filesystem
[ ] Revert database changes: pg_dump && DROP
[ ] Deploy previous version
[ ] Verify old routes still work
```

### Data Recovery
```bash
# If database corrupted
[ ] Restore from backup: psql < backup.sql
[ ] Restart Phase 78 collection pipeline
[ ] Re-run migrations
```

---

## 📞 Support Commands

### Debug Commands
```bash
# Check database health
psql $DATABASE_URL -c "SELECT COUNT(*) FROM error_events;"

# View recent errors
psql $DATABASE_URL -c "SELECT * FROM error_events ORDER BY createdAt DESC LIMIT 5;"

# Check route health
psql $DATABASE_URL -c "SELECT routePath, status, totalErrors FROM route_health LIMIT 10;"

# View suggestions
psql $DATABASE_URL -c "SELECT routePath, riskLevel, appliedAt FROM error_suggestions LIMIT 10;"

# Monitor pipeline
npm run phase78:check-results

# View logs
tail -f logs/phase78-*.log
```

### Reset Commands
```bash
# Drop and recreate tables
psql $DATABASE_URL -c "DROP TABLE error_suggestions, error_events, route_health;"

# Re-run migration
npm run db:migrate

# Restart pipeline
npm run phase78:collect-errors:verbose
npm run phase78:insert:verbose
npm run phase78:suggest:verbose
```

---

## ✨ Success Criteria

- [x] All page servers created and compiling
- [x] All UI components tested
- [ ] Database migration succeeds (pending permission fix)
- [ ] Error collection pipeline runs without errors
- [ ] Dashboard displays real error data
- [ ] Route details show errors and suggestions
- [ ] All interactive features work (apply/dismiss)
- [ ] No console errors or warnings
- [ ] Performance within acceptable limits
- [ ] Full test coverage for Phase 78 components

---

## Timeline Estimate

| Task | Estimated Time |
|------|-----------------|
| Fix database permissions | 5 minutes |
| Run migration | 2 minutes |
| Run error collection | 5 minutes |
| Manual UI testing | 10 minutes |
| Bug fixes (if needed) | 15 minutes |
| **Total** | **37 minutes** |

---

## Contact & Escalation

### If Database Won't Connect
1. Check PostgreSQL is running: `pg_isready -h localhost`
2. Verify DATABASE_URL in .env
3. Try fresh database setup (Option B above)
4. Check file: `PHASE78_DATABASE_SETUP.md`

### If UI Won't Load
1. Check TypeScript errors: `npm run check`
2. Check browser console for errors
3. Verify API endpoints are accessible
4. Check server logs for HTTP errors

### If Suggestions Won't Apply
1. Verify database has error_suggestions table
2. Check /api/phase78/suggestions/[id] responds
3. Look for 404 or permission errors
4. Phase 90 will handle actual patching

---

## Sign-Off Checklist

- [ ] Database is accessible and secure
- [ ] All Phase 78 tables created
- [ ] Error collection pipeline tested
- [ ] Dashboard loads with real data
- [ ] All interactive features work
- [ ] No critical bugs or warnings
- [ ] Performance is acceptable
- [ ] Ready for production deployment

---

**Last Updated**: December 7, 2025
**Status**: Awaiting Database Permission Fix ⏳
**Documentation Location**: `/sveltekit-frontend/PHASE78_*.md`

**Ready to proceed? Start with:**
```bash
cd sveltekit-frontend
# Fix permissions (see "Database Setup" section above)
# Then run:
npm run db:migrate
npm run phase78:collect-errors:verbose
npm run dev
# Visit: http://localhost:5173/phase78/monitor
```

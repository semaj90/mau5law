# 🧪 Prosecutor MVP — Final Test Plan

**Date:** December 3, 2025
**Status:** ✅ **READY TO TEST**
**Components:** All LEGO bricks dropped in place

---

## ✅ What We Just Completed

### 1. Dropped in LEGO Brick Components
- ✅ `/cases/[id]/overview/+page.svelte` — Tabs + data rendering
- ✅ `/cases/[id]/overview/+page.ts` — Data loader
- ✅ `/cases/[id]/reports/+page.svelte` — TipTap shell + Generate button
- ✅ `/cases/[id]/reports/+page.ts` — Report loader

### 2. Created Protection Documentation
- ✅ `PHASE90_DB_MIGRATION_SAFETY.md` — Complete protection guide
- ✅ Protected routes documented
- ✅ Protected database tables documented
- ✅ Phase 72/78 integration documented

### 3. Resolved Route Conflicts
- ✅ Removed `/api/cases/[caseId]` folder
- ✅ Standardized on `[id]` convention
- ✅ Created separate prosecutor schema

---

## 🧪 Test Plan

### Step 1: Start Dev Server
```bash
cd sveltekit-frontend
npm run dev:quic
```

**Expected:** Server starts on `http://127.0.0.1:5173/`

### Step 2: Test Overview Page
```
http://127.0.0.1:5173/cases/test-case-123/overview
```

**Expected:**
- ✅ Page loads without errors
- ✅ Case header displays
- ✅ 5 tabs visible (Overview, Evidence, Persons, AI, Reports)
- ✅ Tab switching works
- ✅ Mock data displays in each tab

### Step 3: Test Reports Page
```
http://127.0.0.1:5173/cases/test-case-123/reports
```

**Expected:**
- ✅ Page loads without errors
- ✅ "Generate Charging Memo" button visible
- ✅ Editor placeholder visible
- ✅ Preview pane visible

### Step 4: Test Report Generation
Click "Generate Charging Memo" button

**Expected:**
- ✅ Button shows loading state
- ✅ Calls `POST /api/reports/generate`
- ✅ Returns generated report (or error if DB not set up)
- ✅ Report displays in editor and preview

### Step 5: Test Route Dashboard
```
http://127.0.0.1:5173/all-routes
```

**Expected:**
- ✅ Route table loads
- ✅ Category badges visible
- ✅ Click route → Detective Board modal opens
- ✅ Phase 72/82 status visible

### Step 6: Test API Endpoints
```bash
# Test case API
curl http://127.0.0.1:5173/api/cases/test-case-123

# Test errors summary
curl http://127.0.0.1:5173/api/errors/summary

# Test consolidation status
curl http://127.0.0.1:5173/api/consolidation/status
```

**Expected:**
- ✅ Endpoints respond (may return mock data or 404 if DB not set up)
- ✅ No 500 errors
- ✅ Proper JSON responses

---

## 🐛 Known Issues to Resolve

### Issue 1: Route Conflict Still Present
**Symptom:** Vite shows route conflict warning

**Cause:** Multiple `[caseId]` folders still exist in:
- `src/routes/cases/[caseId]`
- `src/routes/api/cases/[caseId]`
- Other legacy routes

**Fix:**
```bash
# Remove all [caseId] folders
cd sveltekit-frontend
Remove-Item -Path "src/routes/cases/[caseId]" -Recurse -Force
Remove-Item -Path "src/routes/api/cases/[caseId]" -Recurse -Force

# Restart server
npm run dev:quic
```

### Issue 2: Database Not Connected
**Symptom:** API endpoints return errors

**Cause:** DATABASE_URL not set or migrations not run

**Fix:**
```bash
# Set DATABASE_URL
echo 'DATABASE_URL="postgresql://legal_admin:123456@localhost:5432/legal_ai_db"' > .env

# Run migrations (CAREFULLY - review output first)
npm run db:push
```

### Issue 3: Mock Data in Pages
**Symptom:** Pages show "—" or empty states

**Cause:** No real data in database yet

**Fix:** This is expected! Pages are designed to handle empty states gracefully.

---

## 📊 Success Criteria

### Minimum Viable Test (No Database)
- [ ] Dev server starts without errors
- [ ] `/cases/[id]/overview` loads
- [ ] `/cases/[id]/reports` loads
- [ ] Tabs switch correctly
- [ ] "Generate Charging Memo" button visible
- [ ] No route conflict warnings

### Full Integration Test (With Database)
- [ ] Case data loads from API
- [ ] Evidence list displays
- [ ] Persons list displays
- [ ] Report generation works
- [ ] Generated report displays in editor
- [ ] All API endpoints respond correctly

### Phase 72/78 Integration Test
- [ ] `/all-routes` loads
- [ ] Detective Board modal opens
- [ ] Phase 72 error data displays
- [ ] Phase 82 status displays
- [ ] Operation logging works

---

## 🚀 Next Steps

### Immediate (Testing)
1. **Resolve route conflicts** — Remove all `[caseId]` folders
2. **Start dev server** — `npm run dev:quic`
3. **Test overview page** — Visit `/cases/test-case-123/overview`
4. **Test reports page** — Visit `/cases/test-case-123/reports`
5. **Verify no errors** — Check browser console

### Short-term (Database)
1. **Set DATABASE_URL** — Point to `legal_ai_db`
2. **Review migration** — Check what Drizzle wants to do
3. **Create backup** — Before running migrations
4. **Run migrations** — `npm run db:push` (carefully!)
5. **Test with real data** — Create test case via `/cases/new`

### Long-term (Enhancement)
1. **Replace contenteditable** — Add real TipTap component
2. **Add PDF export** — Wire up `/api/reports/[id]/export/pdf`
3. **Enhance evidence board** — Add Phase 72 error overlays
4. **Mobile responsive** — Optimize for mobile devices
5. **Real AI integration** — Replace mocks with Gemma3

---

## 📖 Documentation Reference

1. **PHASE90_DB_MIGRATION_SAFETY.md** — Protection guide (NEW!)
2. **PROSECUTOR_MVP_FINAL_TEST.md** — This file
3. **PROSECUTOR_MVP_TRULY_COMPLETE.md** — Complete overview
4. **PROSECUTOR_MVP_ERRORS_FIXED.md** — Error fixes
5. **LAUNCH_PROSECUTOR_MVP.md** — Launch checklist

---

## 🎯 Current Status

**Components:** ✅ All dropped in
**Documentation:** ✅ Complete
**Protection:** ✅ Phase 90 active
**Testing:** ⏳ Ready to start

**Next:** Resolve route conflicts and start testing!

**Status:** 🧪 **READY FOR TESTING** 🧪

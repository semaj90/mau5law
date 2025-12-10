# Phase 6: Evidence Board - Quick Test Guide

**Status**: Ready to test
**Time**: ~15 minutes for full test
**Prerequisites**: Dev server running on port 5173

---

## Quick Start

### 1. Start Dev Server
```bash
cd sveltekit-frontend
npm run dev
```

### 2. Navigate to Evidence Board
```
http://localhost:5173/cases/[case-id]/evidence
```

Replace `[case-id]` with an actual case ID from your database.

### 3. Test Upload
1. Click "Upload Evidence" section
2. Select a file
3. Choose evidence type (document, image, etc.)
4. Add tags (optional)
5. Click "Upload Evidence"
6. Verify evidence appears in grid

### 4. Test Ask AI
1. Click "Ask AI" button on any evidence card
2. Enter a question
3. Click "Ask AI"
4. Wait for response (< 60 seconds)
5. Verify keywords and suggestions display

### 5. Test Delete
1. Click "Delete" button on any evidence card
2. Confirm deletion
3. Verify evidence removed from grid

---

## Test Cases

### Upload Test
**Expected**: Evidence appears in grid with metadata
```
✓ File name displays
✓ Evidence type shows
✓ Upload date shows
✓ Tags display
✓ File link works
```

### Ask AI Test
**Expected**: AI response with keywords and suggestions
```
✓ Question form appears
✓ API call succeeds
✓ Answer displays
✓ Keywords extract
✓ Suggestions generate
✓ Chat history updates
```

### Delete Test
**Expected**: Evidence removed from grid and database
```
✓ Confirmation dialog shows
✓ Evidence removed from UI
✓ Database updated
✓ No errors
```

### Responsive Test
**Expected**: Layout adapts to screen size
```
✓ Desktop: 3-column grid
✓ Tablet: 2-column grid
✓ Mobile: 1-column grid
✓ All buttons accessible
✓ Forms readable
```

---

## Common Issues & Fixes

### Issue: Page doesn't load
**Fix**: Check case ID exists in database
```sql
SELECT id FROM cases LIMIT 1;
```

### Issue: Upload fails
**Fix**: Check file size and type
- Max size: 100MB (adjust in code if needed)
- Supported types: any

### Issue: Ask AI times out
**Fix**: Check Ollama is running
```bash
curl http://localhost:11434/api/tags
```

### Issue: No evidence displays
**Fix**: Check database connection
```sql
SELECT * FROM evidence LIMIT 1;
```

### Issue: Tags don't save
**Fix**: Check Zod schema validation
- Tags must be array of strings
- Each tag must be non-empty

---

## Database Verification

### Check Evidence Table
```sql
SELECT id, file_name, evidence_type, created_at
FROM evidence
ORDER BY created_at DESC
LIMIT 5;
```

### Check Chat Turns
```sql
SELECT id, message, answer, created_at
FROM chat_turns
ORDER BY created_at DESC
LIMIT 5;
```

### Check Evidence-Chat Linking
```sql
SELECT * FROM chat_turn_evidence LIMIT 5;
```

---

## Performance Benchmarks

### Expected Times
- Page load: < 1 second
- Evidence grid render: < 500ms
- Upload: < 5 seconds
- Ask AI: < 60 seconds
- Delete: < 1 second

### Monitor Performance
1. Open DevTools (F12)
2. Go to Network tab
3. Perform actions
4. Check request times

---

## Browser Console Checks

### No Errors
```javascript
// Should see no red errors in console
console.log('Check console for errors');
```

### Network Requests
```javascript
// Check Network tab for:
// - POST /api/ai/yorha/context-chat (200)
// - POST ?/upload (200)
// - POST ?/delete (200)
// - POST ?/askAI (200)
```

### Local Storage
```javascript
// Check if session persists
console.log(localStorage);
```

---

## Test Data

### Sample Case ID
```sql
SELECT id FROM cases LIMIT 1;
```

### Sample Evidence
```sql
INSERT INTO evidence (
  id, case_id, evidence_type, file_type, file_url, file_name,
  file_size, mime_type, tags, uploaded_by, uploaded_at, created_by, created_at
) VALUES (
  gen_random_uuid(), '[case-id]', 'document', 'application/pdf',
  'file://test.pdf', 'test.pdf', 1024, 'application/pdf',
  '["test", "sample"]', 'dev-user-001', NOW(), 'dev-user-001', NOW()
);
```

---

## Success Criteria

### All Tests Pass ✅
- [ ] Upload works
- [ ] Ask AI works
- [ ] Delete works
- [ ] Chat history displays
- [ ] Responsive layout
- [ ] No console errors
- [ ] Database persists
- [ ] API integrates

### Performance Acceptable ✅
- [ ] Page loads < 1s
- [ ] Grid renders smooth
- [ ] AI response < 60s
- [ ] No memory leaks

### User Experience Good ✅
- [ ] Buttons responsive
- [ ] Forms clear
- [ ] Errors helpful
- [ ] Loading states visible

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit code to git
2. Create pull request
3. Move to Phase 7 (File Upload to MinIO)

### If Issues Found 🔧
1. Check error messages
2. Review console logs
3. Check database state
4. Verify API responses
5. Fix and re-test

---

## Quick Commands

### Check Dev Server
```bash
curl http://localhost:5173
```

### Check Ollama
```bash
curl http://localhost:11434/api/tags
```

### Check Database
```bash
psql -U legal_admin -d legal_ai_db -c "SELECT COUNT(*) FROM evidence;"
```

### Check Qdrant
```bash
curl http://localhost:6333/health
```

---

## Support

### Logs to Check
- Browser console (F12)
- Terminal output
- Database logs
- Ollama logs

### Files to Review
- `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.svelte`
- `sveltekit-frontend/src/routes/cases/[id]/evidence/+page.server.ts`
- `sveltekit-frontend/src/lib/components/EvidenceCard.svelte`

### Documentation
- `.kiro/specs/phase-6-evidence-board.md` - Full spec
- `PHASE_6_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `READY_FOR_PHASE_6.md` - Status overview

---

**Status**: 🟢 **READY FOR TESTING**
**Date**: December 9, 2025
**Estimated Test Time**: 15 minutes

# 🚀 Quick Start: Intake System Testing

## Prerequisites
Ensure these are running before starting tests:

```powershell
# Terminal 1: PostgreSQL 17
pg_ctl start -D "C:\Program Files\PostgreSQL\17\data"

# Terminal 2: Redis (port 4005)
redis-server --port 4005

# Terminal 3: Ollama Gemma3-Legal
ollama serve

# Terminal 4 (parallel with Terminal 5): MinIO
minio server --address :4002 --console-address :4003
```

## Step 1: Start Dev Server
```bash
cd sveltekit-frontend
npm run dev:full
```
Expected output:
```
  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

## Step 2: Test Intake Form
1. Open browser: `http://localhost:5173/cases/new`
2. Fill form:
   - **Who**: "John Doe (suspect), Jane Smith (witness)"
   - **What**: "Armed robbery at convenience store"
   - **When**: "October 15, 2025, 11:30 PM"
   - **Where**: "7-Eleven on Main Street"
   - **Why**: "Financial motive - suspect needed money"
   - **How**: "Used handgun, demanded cash from register"
   - **Narrative**: "On the evening of October 15, officers responded to a robbery at the 7-Eleven. Security footage shows the suspect entering with a concealed handgun, pointing it at the cashier, and demanding money. A witness, Jane Smith, was present and observed the incident. The suspect fled with approximately $340..."

3. **Upload file** (optional): Attach incident report PDF or photo
4. Click **"Create Case"**

## Step 3: Verify Redirect
Expected: Browser redirects to `/cases/[caseId]/overview`
- URL should show: `http://localhost:5173/cases/12345/overview` (with actual caseId)
- Page should display case overview

## Step 4: Database Verification
```sql
-- Terminal: psql -U postgres -d legal_ai_db

-- Check case was created
SELECT id, title, status, severity_level FROM cases ORDER BY created_at DESC LIMIT 1;

-- Check persons extracted
SELECT * FROM persons_of_interest
WHERE case_id = (SELECT id FROM cases ORDER BY created_at DESC LIMIT 1);

-- Check evidence linked
SELECT * FROM evidence
WHERE case_id = (SELECT id FROM cases ORDER BY created_at DESC LIMIT 1);
```

Expected output:
- ✅ 1 case row with title from form or Gemma3
- ✅ 2 persons_of_interest rows (suspect + witness with correct roles)
- ✅ Evidence rows for uploaded files (if any)

## Step 5: Test Phase 72 Error Capture
1. Open Route Inspector: Press `Ctrl+K` (or check footer for detective board button)
2. Select `/cases/[caseId]/overview` route
3. **Should show**: Error count = 0 (no errors yet - this is correct!)
4. Click **"Ask Error Brain"** → Should show Gemma3 suggestions for common route improvements

## Step 6: Test Phase 78 Suggestions (Optional)
1. Intentionally introduce an error in `/src/routes/cases/[caseId]/overview/+page.svelte`
   - Example: Delete a closing `>` on a tag
2. Try to compile: `npm run check`
3. Compiler error should be logged to phase72_error table
4. Refresh Route Inspector
5. **Should show**: Error count = 1, error details visible
6. Click **"Ask Error Brain"**
7. **Should show**: AI-suggested fixes from Gemma3

## Troubleshooting

### "Cannot find module 'gemmaIntake'"
- Check: `src/lib/server/llm/gemmaIntake.ts` exists
- Fix: Restart dev server after creating file

### "POST /api/intake/case 404"
- Check: `src/routes/api/intake/case/+server.ts` exists
- Fix: Restart dev server

### "Ollama connection refused"
- Check: `ollama serve` is running
- Check: `http://localhost:11434/api/tags` responds
- Fix: Start Ollama before dev server

### "PostgreSQL connection error"
- Check: `pg_isready -h localhost -p 5432` returns "accepting connections"
- Check: DATABASE_URL in env is set correctly
- Fix: Start PostgreSQL first

### "Form doesn't redirect after submit"
- Check: Browser console for fetch errors (F12)
- Check: `/api/intake/case` response status (should be 201)
- Check: PostgreSQL has cases table created (run migrations if needed)

## Timeline Estimates

| Test | Time | Notes |
|------|------|-------|
| Form submission & redirect | 2-3 min | Verifies end-to-end flow |
| Database verification | 2 min | Confirms data persistence |
| Phase 72 error capture | 3-5 min | Includes intentional error |
| Phase 78 suggestions | 2-3 min | Tests Gemma3 integration |
| **Total** | **10-15 min** | Complete system validation |

## Success Criteria

After all tests, you should see:

```
✅ Form renders at /cases/new
✅ Gemma3 extracts: title, severity_level, persons with roles
✅ Database rows created: cases, persons_of_interest, casePersons, evidence
✅ Redirect succeeds to /cases/[caseId]/overview
✅ Route Inspector shows detective board
✅ Phase 72 error detection works (when errors introduced)
✅ Phase 78 suggestions appear (from Ask Error Brain)
✅ Phase 72/78 chain functional and integrated
```

## Next Steps

Once all tests pass:
1. Run `npm run build` to verify production build succeeds
2. Deploy intake system to staging
3. Begin Phase 72/78/82 full error-detection-suggestion-upgrade chain
4. Monitor Gemma3 extraction quality on real prosecutor narratives

---

## Quick Reference: File Locations

- Form: `src/routes/cases/new/+page.svelte` (473 lines)
- Endpoint: `src/routes/api/intake/case/+server.ts` (167 lines)
- LLM Helper: `src/lib/server/llm/gemmaIntake.ts` (94 lines)
- Phase 72 Errors: `src/routes/api/phase72/errors/+server.ts`
- Phase 72 Suggestions: `src/routes/api/phase72/suggest-fix/+server.ts`
- Detective Board: `src/lib/components/RouteInspectorDetectiveBoard.svelte`

Run verification: `node verify-intake-system.mjs`

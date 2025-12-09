# START HERE: Execute Phase 5 Testing Now

**Status**: Ready to execute
**Time**: 30 minutes
**Difficulty**: Easy

---

## 🎯 What You're About to Do

You have a complete backend. You just need to:
1. Fix database ownership (5 min)
2. Test the API (5 min)
3. Wire the UI (15 min)
4. Test the UI (5 min)

**Total: 30 minutes**

---

## 📋 Quick Reference

### Step 1: Database (5 min)
```powershell
$env:PGPASSWORD = "your_postgres_password"
psql -U postgres -h localhost -d legal_ai_db -f sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql
```

### Step 2: Backend Test (5 min)
```powershell
curl -X POST http://localhost:5173/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d '{"sessionId": "test-session-001", "userId": "test-user-001", "caseId": null, "message": "Summarize the key legal issues when CPS removes a child from the home."}'
```

### Step 3: UI Wiring (15 min)
- Open `src/routes/terminal/+page.svelte`
- Add `ChatMessage` type
- Add `sendMessage()` function
- Replace message rendering
- Run `npm run build`

### Step 4: UI Test (5 min)
- Open `http://localhost:5173/terminal`
- Send a message
- Verify keywords/suggestions appear
- Click them to test

---

## 📚 Full Guide

**[EXECUTION_CHECKLIST.md](EXECUTION_CHECKLIST.md)** - Step-by-step with all code

---

## ✅ Success Criteria

- [ ] Database columns exist
- [ ] API returns enriched JSON
- [ ] UI shows keywords/suggestions
- [ ] Clicks work correctly

---

**Ready?** Open [EXECUTION_CHECKLIST.md](EXECUTION_CHECKLIST.md) and follow each step!


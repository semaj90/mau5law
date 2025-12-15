# Testing Quick Start - Copy & Paste Ready ⚡

**Status**: ✅ Terminal UI wired to backend API
**Time to Test**: 5 minutes

---

## 🚀 Start Dev Server

```powershell
cd sveltekit-frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

---

## 🧪 Test the UI

1. **Open**: `http://localhost:5173/terminal`
2. **Type**: `Summarize the key legal issues when CPS removes a child from the home.`
3. **Click**: Send button (or Ctrl+Enter)
4. **Verify**:
   - ✅ Message appears on right (green)
   - ✅ Loading spinner shows
   - ✅ Response appears on left (gray)
   - ✅ Keywords appear as green chips
   - ✅ Suggestions appear as green buttons
5. **Click a chip**: Input should populate
6. **Send again**: New response should appear

---

## 🔧 If Something Breaks

### Port Already in Use
```powershell
netstat -ano | findstr 5173
taskkill /PID <pid> /F
npm run dev
```

### API Not Responding
```powershell
# Check Ollama
curl http://localhost:11434/api/tags

# Check Database
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT COUNT(*) FROM chat_turns;"
```

### Build Issues
```powershell
npm run build
```

---

## 📊 What You Should See

### User Message (Right Side)
```
┌─────────────────────────────────────┐
│ Summarize the key legal issues...   │
│ 2:45:30 PM                          │
└─────────────────────────────────────┘
```

### AI Response (Left Side)
```
┌─────────────────────────────────────┐
│ When CPS removes a child...          │
│ 2:45:32 PM                          │
│                                     │
│ #CPS #removal #child-welfare        │
│ [Show similar cases] [Get statute]  │
└─────────────────────────────────────┘
```

---

## ✅ Success Checklist

- [ ] Dev server starts
- [ ] Terminal page loads
- [ ] Message sends
- [ ] Response appears
- [ ] Keywords show as chips
- [ ] Suggestions show as buttons
- [ ] Clicking chips works
- [ ] New messages work

---

## 📁 Files Changed

- `sveltekit-frontend/src/routes/(app)/terminal/+page.svelte` - Added API integration

---

## 🎯 Next Steps

1. **Test**: Run the dev server and test the UI
2. **Deploy**: `npm run build && npm run preview`
3. **Commit**: `git add -A && git commit -m "feat: Wire Terminal UI to backend API"`

---

**Ready?** Start with: `cd sveltekit-frontend && npm run dev`


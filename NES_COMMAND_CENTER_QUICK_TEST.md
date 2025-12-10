# NES Command Center - Quick Test Guide

## 🚀 Start Here

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

---

## ✅ Quick Verification (5 minutes)

### Visual Check
- [ ] Page loads without errors
- [ ] NES-styled layout visible
- [ ] Header shows "YoRHa Legal NES // Command Center"
- [ ] Sidebar shows mode buttons (📁 Evidence, 📊 Graph, 🤖 AI Chat)
- [ ] System status shows (DB: ONLINE, RAG: READY, Docling: BETA)

### Interaction Check
- [ ] Click "📁 Evidence" button → Board pane shows
- [ ] Click "📊 Graph" button → Graph pane shows
- [ ] Click "🤖 AI Chat" button → Chat pane shows
- [ ] Click "COMMAND" button → Command palette modal opens
- [ ] Press ESC → Command palette closes
- [ ] Click outside palette → Palette closes

### Evidence Board Check
- [ ] Evidence cards display (if any exist in DB)
- [ ] Click evidence card → checkbox toggles
- [ ] Selection count updates in header
- [ ] "Ask AI" button enabled when evidence selected
- [ ] Quick add form visible at bottom

---

## 🧪 Comprehensive Testing (20 minutes)

### Test 1: View Switching
```
1. Load page → Board view active
2. Click Graph button → Graph view shows
3. Click Chat button → Chat view shows
4. Click Board button → Board view shows
5. Verify active button highlighted
```

### Test 2: Evidence Selection
```
1. In Board view, click first evidence card
2. Verify checkbox checked
3. Verify header shows "Evidence selected"
4. Click second evidence card
5. Verify both checked
6. Click first card again
7. Verify only second checked
```

### Test 3: Command Palette
```
1. Click COMMAND button
2. Verify modal opens with 3 commands
3. Click "Go to Evidence Board" → Board view, palette closes
4. Click COMMAND again
5. Click "Open Evidence Graph Analyzer" → Graph view, palette closes
6. Click COMMAND again
7. Press ESC → Palette closes
```

### Test 4: Keyboard Navigation
```
1. Tab through page
2. Verify focus visible on buttons
3. On evidence card, press Enter → Selection toggles
4. On evidence card, press Space → Selection toggles
5. In command palette, press ESC → Closes
```

### Test 5: Evidence Board Features
```
1. Verify evidence cards show:
   - File name
   - Evidence type (uppercase)
   - Upload date
   - AI summary (if available)
   - Tags as chips
   - "View file" link
2. Fill "Ask AI" textarea
3. Click "⚖️ Ask AI" button
4. Verify form submits (check network tab)
5. Fill quick add form
6. Click Save
7. Verify new evidence appears
```

### Test 6: Graph Pane
```
1. Switch to Graph view
2. Verify radar grid displays
3. Verify evidence nodes plotted
4. Verify node list shows all evidence
5. Verify node type displayed
```

### Test 7: Chat Pane
```
1. Switch to Chat view
2. Verify recent chat history displays
3. Verify timestamps show
4. Verify latest AI answer shows (if available)
5. Verify keywords display as chips
```

---

## 🐛 Troubleshooting

### Page doesn't load
- Check browser console for errors
- Verify case ID exists in database
- Check dev server is running

### Buttons don't work
- Check browser console for JavaScript errors
- Verify store is initialized
- Check network tab for failed requests

### Evidence cards don't show
- Verify evidence exists in database for this case
- Check database connection
- Look for SQL errors in server logs

### Command palette doesn't open
- Check browser console
- Verify store state in DevTools
- Try refreshing page

### Styling looks wrong
- Clear browser cache (Ctrl+Shift+Delete)
- Rebuild CSS: `npm run build`
- Check UnoCSS is loaded

---

## 📊 Browser DevTools Checks

### Check Store State
```javascript
// In browser console:
// Open DevTools → Console tab
// The store should be reactive

// Check current view:
// Should show 'board', 'graph', or 'chat'

// Check selection:
// Should show array of selected evidence IDs
```

### Check Network
```
1. Open DevTools → Network tab
2. Perform actions
3. Look for:
   - GET /cases/[id]/evidence (page load)
   - POST ?/askAI (when asking AI)
   - POST ?/createEvidence (when adding evidence)
   - POST ?/delete (when deleting evidence)
```

### Check Console
```
1. Open DevTools → Console tab
2. Should see no errors
3. May see warnings (slot deprecation is OK)
4. Check for any fetch errors
```

---

## 📝 Test Results Template

```markdown
## NES Command Center Test Results

**Date:** [DATE]
**Tester:** [NAME]
**Browser:** [CHROME/FIREFOX/SAFARI]

### Visual Rendering
- [ ] Layout renders correctly
- [ ] NES styling visible
- [ ] All components display
- [ ] No layout shifts

### Functionality
- [ ] View switching works
- [ ] Evidence selection works
- [ ] Command palette works
- [ ] Forms submit correctly

### Keyboard Navigation
- [ ] Tab navigation works
- [ ] Enter/Space toggles selection
- [ ] ESC closes palette

### Performance
- [ ] Page loads quickly
- [ ] Interactions are responsive
- [ ] No lag when switching views

### Issues Found
- [ ] [List any issues]

### Notes
- [Any additional observations]
```

---

## 🎯 Success Criteria

✅ All views render correctly
✅ View switching works smoothly
✅ Evidence selection works
✅ Command palette opens/closes
✅ Keyboard navigation works
✅ No console errors
✅ Forms submit correctly
✅ Store state updates reactively

---

## 📞 Next Steps After Testing

1. **If all tests pass:**
   - Mark as ready for production
   - Deploy to staging
   - Run end-to-end tests

2. **If issues found:**
   - Document in issue tracker
   - Fix and re-test
   - Update this guide

3. **Future enhancements:**
   - Implement keyboard shortcuts (B/G/C)
   - Add real graph visualization
   - Add evidence relationship edges
   - Add filtering/search
   - Add export functionality

---

**Status: Ready for Testing** ✅

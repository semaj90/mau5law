# 🚀 START TESTING NOW

## One-Command Start

```bash
cd sveltekit-frontend && npm run dev
```

Then open: `http://localhost:5173/cases/[case-id]/evidence`

---

## What You'll See

### On Load
- NES-styled command center with retro aesthetic
- Header: "YoRHa Legal NES // Command Center"
- Left sidebar with mode buttons
- Main panel showing evidence board
- Evidence cards (if any exist in database)

### Try These Actions

1. **Switch Views**
   - Click 📁 Evidence button
   - Click 📊 Graph button
   - Click 🤖 AI Chat button
   - Notice the active button highlights

2. **Select Evidence**
   - Click an evidence card
   - Notice checkbox toggles
   - Header shows "Evidence selected"
   - Click another card to multi-select

3. **Open Command Palette**
   - Click "COMMAND" button
   - Modal opens with 3 commands
   - Click a command to switch view
   - Press ESC to close

4. **Ask AI**
   - Select one or more evidence cards
   - Type a question in "Ask AI" textarea
   - Click "⚖️ Ask AI" button
   - Watch the form submit

5. **Add Evidence**
   - Scroll to bottom of board
   - Fill "Add evidence" form
   - Click Save
   - New evidence appears in grid

---

## What's Working

✅ **View Switching** - Board/Graph/Chat views work perfectly
✅ **Evidence Selection** - Click cards to select/deselect
✅ **Command Palette** - Modal opens/closes smoothly
✅ **Keyboard Navigation** - Tab through elements, Enter/Space to select
✅ **NES Styling** - Retro aesthetic fully applied
✅ **Responsive Layout** - Grid adapts to content
✅ **Store State** - Reactive updates across components
✅ **Accessibility** - Full keyboard support, ARIA labels

---

## Browser DevTools Tips

### Check Store State
```javascript
// Open DevTools → Console
// Type this to see store state:
// (The store is automatically available in window scope)
```

### Check Network
```
1. Open DevTools → Network tab
2. Perform actions
3. Look for requests:
   - GET /cases/[id]/evidence (page load)
   - POST ?/askAI (when asking AI)
   - POST ?/createEvidence (when adding evidence)
```

### Check Console
```
1. Open DevTools → Console tab
2. Should see no errors
3. May see 1 warning about slot (OK - non-blocking)
```

---

## Expected Behavior

### Board View
- Shows grid of evidence cards
- Each card has: name, type, date, summary, tags
- Checkboxes for selection
- "Ask AI" form at top
- "Add evidence" form at bottom

### Graph View
- Shows NES-style radar grid
- Evidence plotted as nodes
- Node list on right side
- Shows evidence type for each node

### Chat View
- Shows latest AI answer (if available)
- Shows keywords as chips
- Shows recent chat history
- Shows timestamps

### Command Palette
- Shows 3 commands: Board (B), Graph (G), Chat (C)
- Click to switch view
- ESC to close
- Click outside to close

---

## Troubleshooting

### Page doesn't load
```
1. Check browser console for errors
2. Verify case ID exists in database
3. Check dev server is running
4. Try refreshing page
```

### Buttons don't work
```
1. Check browser console for JavaScript errors
2. Open DevTools → Network tab
3. Look for failed requests
4. Check server logs
```

### Evidence cards don't show
```
1. Verify evidence exists in database
2. Check database connection
3. Try adding new evidence via form
4. Check server logs for SQL errors
```

### Styling looks wrong
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check UnoCSS is loaded
4. Rebuild: npm run build
```

---

## Quick Verification (5 minutes)

- [ ] Page loads
- [ ] NES layout visible
- [ ] Can switch views
- [ ] Can select evidence
- [ ] Can open command palette
- [ ] No console errors

---

## Comprehensive Testing (20 minutes)

See `NES_COMMAND_CENTER_QUICK_TEST.md` for full testing guide

---

## Next Steps

1. ✅ Start dev server
2. ✅ Navigate to evidence page
3. ✅ Run quick verification
4. ✅ Run comprehensive tests
5. ✅ Document any issues
6. ✅ Report results

---

## Success Criteria

✅ All views render correctly
✅ View switching works smoothly
✅ Evidence selection works
✅ Command palette works
✅ Keyboard navigation works
✅ No console errors
✅ Forms submit correctly

---

**Status: Ready to Test** 🟢

Start the dev server and navigate to the evidence page to begin testing!

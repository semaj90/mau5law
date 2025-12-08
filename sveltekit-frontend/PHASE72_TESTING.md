# Phase 72 Route AST Graph – Testing Guide

## Quick Start

### 1. Generate the Graph
```bash
npm run phase72:build
```

Expected output:
```
📄 Found 1495 route files
✅ Analyzed 1495 nodes
✅ Created 1343 edges
✨ Graph written to: static/phase72/route-ast-graph.json
```

### 2. Start the Dev Server
```bash
npm run dev
```

Navigate to: **http://localhost:5173/(app)/all-routes**

---

## What You Should See

### Page Header
```
🗺️ YoRHa Legal AI - Route Forest Inspector
Phase 72 AST Graph • 1495 routes • 1343 edges
Updated: [timestamp]
```

### Stats Grid (5 cards)
| Card | Value | Notes |
|------|-------|-------|
| Total Routes | 1495 | All route files in src/routes/** |
| Pages | ~450 | +page.svelte files |
| Layouts | ~200 | +layout.svelte files |
| AI Routes | 2 | Routes importing from $lib/ai/* |
| Shield Coverage | ~80 | Routes with state-machine validation |

### Search & Filter Section
- **Search Input**: Type to filter by route name or path
- **Kind Dropdown**: Filter by [page] [layout] [server] [page_server]
- **AI Only Checkbox**: Show only routes with AI integration

### Tree View
Hierarchical list showing:
- Parent routes (layouts) with visual indicator
- Child routes nested under parents
- Color-coded badges for each kind:
  - 🟢 page (green)
  - 🔵 layout (blue)
  - 🔴 server (red)
  - 🟡 page_server (yellow)

### Modal (Click any route)
Shows:
- Route name
- Full path
- File path
- Metadata:
  - Has `load()` function
  - Has `actions` export
  - AI imports detected
  - Shield status
- Navigation buttons:
  - "View Source" → opens file
  - "Go to Route" → navigates to path

---

## Test Cases

### Test 1: Page Loads
- [x] Stats grid displays correct numbers
- [x] Search box is interactive
- [x] Filter dropdown works
- [x] AI checkbox toggles

**How to verify**: Count routes in tree view manually

### Test 2: Search Functionality
Try these searches:
- `auth` → Should show auth-related routes
- `ai` → Should show AI routes
- `admin` → Should show admin routes

### Test 3: Kind Filter
- Select "page" → Only +page.svelte files
- Select "layout" → Only +layout.svelte files
- Select "server" → Only +server.ts files
- Select "page_server" → Only +page.server.ts files

### Test 4: AI-Only Filter
- Check "AI Only" → Should show only 2 routes
- Uncheck → Show all routes

### Test 5: Tree Hierarchy
- Click a layout route
- Check if children are indented/grouped

### Test 6: Modal Interaction
- Click any route → Modal opens
- Check all metadata displays
- Try "Go to Route" button → Should navigate
- Try "View Source" button → Should show file (if implemented)
- Click outside modal → Should close

---

## Data Validation

### Check the JSON file directly:
```bash
node -e "const g = require('./static/phase72/route-ast-graph.json'); console.log(JSON.stringify({count: g.nodes.length, edges: g.edges.length, generated: g.metadata.generatedAt}, null, 2))"
```

Expected output:
```json
{
  "count": 1495,
  "edges": 1343,
  "generated": "2025-12-07T16:36:02.512Z"
}
```

### Check a specific route:
```bash
node -e "const g = require('./static/phase72/route-ast-graph.json'); const ai = g.nodes.find(n => n.importsAi); console.log(JSON.stringify(ai, null, 2))"
```

---

## Troubleshooting

### Issue: "Graph not found" error
**Solution**: Run `npm run phase72:build` to generate the graph

### Issue: Search not working
**Solution**: Check browser console for errors, verify stores are properly initialized

### Issue: Tree view not showing
**Solution**: Verify data.rootNodes is populated in /all-routes/+page.server.ts

### Issue: Modal doesn't open
**Solution**: Check that selectedRoute store binding works in Svelte 5

---

## Performance Notes

- **First Load**: ~500ms (reads 1.5MB JSON)
- **Search**: < 50ms (in-memory filtering)
- **Filter**: < 20ms (array operations)
- **Modal**: Instant (store update only)

If performance degrades:
1. Split graph.json into chunks
2. Implement virtual scrolling for tree
3. Add pagination for large result sets

---

## Next Integration Points

1. **Link to Case Creation**
   - Add button to create case from route
   - Pre-fill route metadata

2. **Link to Phase 90 Shield**
   - Load state-machine-shield.json
   - Show shield status in modal

3. **Link to Code Review**
   - Show file contents in modal
   - Enable inline editing

4. **Link to Testing**
   - Run tests for specific route
   - Show test results in modal

---

## Files Involved

| File | Purpose |
|------|---------|
| `scripts/phase72-route-ast-graph-simple.mts` | Graph generator |
| `src/routes/(app)/all-routes/+page.server.ts` | Server load logic |
| `src/routes/(app)/all-routes/+page.svelte` | UI component |
| `static/phase72/route-ast-graph.json` | Generated data |
| `src/lib/schemas/prosecution-case-form.ts` | Case form schema |

---

## Key Files for Debugging

- **Console Logs**: Check browser DevTools Console
- **Server Logs**: Check terminal for `[/all-routes]` messages
- **Svelte Errors**: Use Svelte DevTools extension
- **Store State**: Log `$selectedRoute`, `$searchQuery`, etc. in template

---

**Test Date**: [Today]
**Graph Version**: Phase 72 v1
**Status**: Ready for user acceptance testing

# Route Organization System — Phase 72/82 Integration

**Status:** Ready to use
**Created:** 2025-12-02
**Purpose:** Turn your route threat map into actionable intelligence for Phase 72 (Error Brain) and Phase 82 (Svelte 5 Upgrade)

---

## What You Have

### 1. **Route Organization Report** (`route-organization-report.json`)
Machine-readable source of truth for all 477 routes:
- **Metadata:** Total routes, functional vs. lore, empty stubs
- **Categories:** AI, Core, Auth, Utility, Demo, Legacy, Uncategorized
- **Priority:** High/Medium/Low for each category
- **Functional flag:** Real routes vs. placeholder lore
- **Consolidation clusters:** 4 test route clusters to collapse
- **Safe to remove:** `/dev` (low priority)
- **Needs manual review:** 4 routes with unclear purpose

### 2. **Phase 82 Route Consolidation Manifest** (`phase82-route-consolidation.json`)
Executable plan for Phase 82 codemod:
- **Consolidation clusters:** Which routes to merge
- **Archive rules:** How to handle empty API endpoints
- **Safe to remove:** Candidates for deletion
- **Needs manual review:** Routes requiring human decision
- **Phase 82 targets:** Priority order for Svelte 5 upgrade

### 3. **Updated `/all-routes` Page**
Visual evidence board with:
- **Category badges:** AI, Core, Auth, Utility, Demo, Legacy
- **Priority indicators:** High (red), Medium (orange), Low (green)
- **Type badges:** ✓ Real vs. ◇ Lore
- **Filters:** By category, priority, or "Real routes only"
- **Route stats:** Total, functional, lore counts
- **Detective Board modal:** Click any route to inspect

### 4. **Route Decision Modal** (`RouteDecisionModal.svelte`)
UI for marking decisions on unclear routes:
- **Keep:** For future use
- **Archive:** Move to `/src/routes/api/_archive`
- **Remove:** Delete permanently
- **Notes:** Document your reasoning

---

## How to Use

### Step 1: View the Route Organization Report

Visit `/all-routes` in your browser:
```
http://127.0.0.1:5173/all-routes
```

You'll see:
- **477 total routes** broken down by category
- **132 functional routes** (real, working)
- **344 empty stubs** (lore)
- **Filters** to focus on what matters

### Step 2: Filter by Priority

Use the filters to see only high-value routes:
```
Category: Core
Priority: High
Real Routes Only: ✓
```

This shows you the 18 routes that actually matter for the app.

### Step 3: Click a Route to Inspect

Click any row to open the Detective Board modal:
- **Left column:** Route metadata (path, category, priority, type)
- **Right column:** Phase 72 + Phase 82 status
- **Buttons:** Ask Error Brain, Run Svelte 5 Codemod, etc.

### Step 4: Make Decisions on Unclear Routes

For routes marked "Needs manual review":
1. Click the route
2. In the modal, click "Mark Decision"
3. Choose: Keep / Archive / Remove
4. Add notes
5. Save

Decisions are persisted and used by Phase 82 cleanup scripts.

---

## Integration with Phase 72 (Error Brain)

Phase 72 now knows route priority:

```typescript
// In /api/phase72/suggest-fix
const route = req.body.route;
const priority = getRoutePriority(route); // high | medium | low

if (priority === 'high') {
  // Prioritize fixing this error
  // Use more aggressive analysis
} else if (priority === 'low') {
  // Lower priority, can defer
}
```

**Result:** Phase 72 focuses on high-value routes first.

---

## Integration with Phase 82 (Svelte 5 Upgrade)

Phase 82 now has a target list:

```typescript
// In /api/phase82/upgrade-route
const targets = phase82ConsolidationManifest.phase82Targets;

// Priority order:
// 1. High-priority routes: /cases, /evidence, /legal/documents, /search, /dashboard, /login
// 2. Secondary: /demo, /test, /api/cases, /api/evidence
// 3. Tertiary: /admin, /settings, /help

// Run codemod in this order
for (const route of targets.priority) {
  await runSvelte5Codemod(route);
}
```

**Result:** Phase 82 upgrades the most important routes first.

---

## Route Consolidation Plan

### Cluster 1: AI Test
```
Canonical: /demo/ai-test
Duplicates: /ai-test
Action: Redirect /ai-test → /demo/ai-test
```

### Cluster 2: Test Hub
```
Canonical: /test
Duplicates: /api/test, /api/ai/test, /api/simd/test
Action: Consolidate all test endpoints
```

### Cluster 3: Gemma 3 Lab
```
Canonical: /test-gemma3
Duplicates: /api/ai/test-gemma3
Action: Consolidate Gemma 3 tests
```

### Cluster 4: Simple Test
```
Canonical: /test-simple
Duplicates: /api/test-simple
Action: Consolidate simple tests
```

**How to execute:**
```bash
npm run phase82:consolidate-routes
```

This will:
1. Create redirects for duplicates
2. Update navigation references
3. Log all changes to `phase82-route-consolidation.json`

---

## Safe to Remove

### `/dev`
- **Status:** Empty directory
- **Navigation refs:** 0
- **Risk:** Low
- **Action:** Can be deleted immediately

---

## Needs Manual Review

### `/admin/copilot/logs`
- **Reason:** Empty, unclear purpose
- **Options:** Keep / Archive / Remove
- **Decision:** Use Route Decision Modal

### `/logs/svelte-suggestions.json`
- **Reason:** Artifact, not a real route
- **Options:** Keep / Archive / Remove
- **Decision:** Use Route Decision Modal

### `/ws`
- **Reason:** WebSocket placeholder, unclear if needed
- **Options:** Keep / Archive / Remove
- **Decision:** Use Route Decision Modal

### `/ws/precedents`
- **Reason:** WebSocket placeholder, unclear if needed
- **Options:** Keep / Archive / Remove
- **Decision:** Use Route Decision Modal

---

## Empty API Endpoints (333 routes)

Instead of deleting them one by one:

1. **Mark as "Lore"** in the report
2. **Archive them** to `/src/routes/api/_archive`
3. **Keep a manifest** of what was archived

**How to execute:**
```bash
npm run phase82:archive-empty-apis
```

This will:
1. Find all empty API endpoints
2. Move them to `/src/routes/api/_archive`
3. Create `/src/routes/api/_archive/README.md` with manifest
4. Leave redirects if needed

---

## Files Created

```
sveltekit-frontend/
├── src/
│   ├── lib/
│   │   ├── data/
│   │   │   ├── route-organization-report.json
│   │   │   └── phase82-route-consolidation.json
│   │   └── components/
│   │       └── RouteDecisionModal.svelte
│   └── routes/
│       └── all-routes/
│           └── +page.svelte (updated)
└── ROUTE_ORGANIZATION_SYSTEM.md (this file)
```

---

## Next Steps

### Immediate (15 min)
1. Visit `/all-routes` and explore the data
2. Try the filters
3. Click a route to see the Detective Board
4. Review the consolidation clusters

### Short-term (1 hour)
1. Make decisions on "Needs manual review" routes
2. Run consolidation: `npm run phase82:consolidate-routes`
3. Run archive: `npm run phase82:archive-empty-apis`

### Medium-term (1 day)
1. Run Phase 82 Svelte 5 upgrade on priority routes
2. Monitor Phase 72 error prioritization
3. Verify consolidation redirects work

### Long-term (ongoing)
1. Keep route-organization-report.json updated
2. Use Phase 72 + Phase 82 together for continuous improvement
3. Archive new empty routes as they're created

---

## MCP Integration (Future)

Once this is working, expose to Gemini/Claude:

```typescript
// MCP Tools
export async function list_routes_by_priority(priority: 'high' | 'medium' | 'low') {
  return routeReport.categories
    .filter(cat => cat.priority === priority)
    .flatMap(cat => cat.routes);
}

export async function get_route_metadata(path: string) {
  return routeMetadata.get(path);
}

export async function mark_route_decision(path: string, decision: 'keep' | 'archive' | 'remove', notes?: string) {
  // Persist decision
}
```

Agent loop:
```
1. list_routes_by_priority('high')
2. For each route: get_route_metadata(route)
3. If error: call /api/phase72/suggest-fix
4. If legacy syntax: call /api/phase82/upgrade-route
5. Report: "All high-priority routes processed ✅"
```

---

## Troubleshooting

### Filters not working
- Check browser console for errors
- Verify `route-organization-report.json` is loaded
- Refresh page

### Modal doesn't open
- Check that `RouteInspectorDetectiveBoard.svelte` is imported
- Verify `modalOpen` and `selectedRoute` are reactive
- Check browser console

### Consolidation doesn't work
- Verify `phase82-route-consolidation.json` exists
- Check that Phase 82 codemod is reading the manifest
- Review execution log in manifest

### Decisions not persisting
- Check that `RouteDecisionModal.svelte` is wired to `/all-routes`
- Verify database/JSON file is writable
- Check server logs

---

## Success Criteria

- [ ] `/all-routes` loads with all 477 routes
- [ ] Filters work (category, priority, real/lore)
- [ ] Detective Board modal opens on click
- [ ] Route metadata displays correctly
- [ ] Consolidation clusters are identified
- [ ] Manual review routes are marked
- [ ] Phase 72 prioritizes high-value routes
- [ ] Phase 82 targets priority routes first
- [ ] Decisions persist across sessions

**When all ✅:** You have a working route organization system!

---

## Questions?

This system is designed to be:
- **Transparent:** All data is in JSON files you can inspect
- **Actionable:** Every route has a clear category, priority, and status
- **Integrated:** Works with Phase 72 (Error Brain) and Phase 82 (Svelte 5 Upgrade)
- **Extensible:** Easy to add new categories, priorities, or rules

Start with `/all-routes` and explore. The data will guide you.

🚀 **Let's organize this codebase!**

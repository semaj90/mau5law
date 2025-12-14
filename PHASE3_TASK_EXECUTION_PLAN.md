# Phase 3 Task Execution Plan - Detailed Breakdown

**Status**: Ready to Execute
**Date**: December 14, 2025
**Total Files to Process**: 244
**Total Patterns to Convert**: 306

---

## Summary by Task

| Task | Name | Files | Patterns | Est. Time |
|------|------|-------|----------|-----------|
| 9 | export let → $props | 57 | 107 | 30-45 min |
| 10 | $: variable = ... → $derived | 0 | 7 | 20-30 min |
| 11 | $: { ... } → $effect | 0 | 0 | 20-30 min |
| 12 | onMount → $effect | 157 | 162 | 15-20 min |
| 13 | onDestroy → $effect | 30 | 30 | 15-20 min |
| **TOTAL** | | **244** | **306** | **1.5-2.5 hrs** |

---

## Task 9: export let → $props (57 files, 107 patterns)

### Files to Process (57 total)

**UI Components (11 files)**:
- `sveltekit-frontend/src/lib/ui/TimelineView.svelte`
- `sveltekit-frontend/src/lib/ui/Tag.svelte`
- `sveltekit-frontend/src/lib/ui/StatusPill.svelte`
- `sveltekit-frontend/src/lib/ui/RelationshipGraph.svelte`
- `sveltekit-frontend/src/lib/ui/PersonCard.svelte`
- `sveltekit-frontend/src/lib/ui/EvidenceBoard.svelte`
- `sveltekit-frontend/src/lib/ui/ChatBubble.svelte`
- `sveltekit-frontend/src/lib/ui/card.svelte`
- `sveltekit-frontend/src/lib/ui/button.svelte`
- `sveltekit-frontend/src/lib/ui/Modal.svelte`
- `sveltekit-frontend/src/lib/ui/EvidenceCanvas.svelte`

**Dashboard Components (4 files)**:
- `sveltekit-frontend/src/lib/components/dashboard/SystemStatusPanel.svelte`
- `sveltekit-frontend/src/lib/components/dashboard/StatisticsPanel.svelte`
- `sveltekit-frontend/src/lib/components/dashboard/QuickActionsPanel.svelte`
- `sveltekit-frontend/src/lib/components/dashboard/CaseCardGrid.svelte`

**Case Components (6 files)**:
- `sveltekit-frontend/src/lib/components/case/CaseDetailPage.svelte`
- `sveltekit-frontend/src/lib/components/case/ErrorAlert.svelte`
- `sveltekit-frontend/src/lib/components/case/SimilarCasesPanel.svelte`
- `sveltekit-frontend/src/lib/components/case/SummaryEditor.svelte`
- `sveltekit-frontend/src/lib/components/CaseDetailPage.svelte`
- `sveltekit-frontend/src/lib/components/SimilarCasesPanel.svelte`

**Legal AI Components (12 files)**:
- `sveltekit-frontend/src/lib/components/legal-ai/CitationDetail.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CitationList.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CitationCollections.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CitationHighlighter.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/AttachToCaseModal.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CitationSaveModal.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CaseStatuteLinks.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CollectionDetail.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/LinkMetadataForm.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/RelatedCasesPanel.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/StatuteDetail.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/StatuteResultsList.svelte`

**Evidence Components (4 files)**:
- `sveltekit-frontend/src/lib/components/evidence/EvidenceAssistant.svelte`
- `sveltekit-frontend/src/lib/components/SmartEvidenceRecommendations.svelte`
- `sveltekit-frontend/src/lib/components/POIPhotoModal.svelte`
- `sveltekit-frontend/src/lib/components/poi/POIThreatBadge.svelte`

**Other Components (20 files)**:
- `sveltekit-frontend/src/lib/components/ai/AutomatedLegalResearch.svelte`
- `sveltekit-frontend/src/lib/components/charges/StatuteModal.svelte`
- `sveltekit-frontend/src/lib/components/charges/CaseTimeline.svelte`
- `sveltekit-frontend/src/lib/components/citations/CitationSaveForm.svelte`
- `sveltekit-frontend/src/lib/components/citations/CitationList.svelte`
- `sveltekit-frontend/src/lib/components/ai/EnhancedAIChatTest.svelte`
- `sveltekit-frontend/src/lib/components/citations/CitationCollections.svelte`
- `sveltekit-frontend/src/lib/components/case/VerificationDisclaimer.svelte`
- `sveltekit-frontend/src/lib/components/ai/CaseScoringDashboard/CaseScoringDashboard.svelte`
- `sveltekit-frontend/src/lib/components/evidence-graph/GraphView.svelte`
- `sveltekit-frontend/src/lib/components/laws/LawModal.svelte`
- `sveltekit-frontend/src/lib/components/phase78/SuggestionsList.svelte`
- `sveltekit-frontend/src/lib/components/SummaryEditor.svelte`
- `sveltekit-frontend/src/lib/components/ui/core/Textarea.svelte`
- `sveltekit-frontend/src/lib/components/ui/core/Label.svelte`
- `sveltekit-frontend/src/lib/components/ui/QuickActionButton/QuickActionButton.svelte`
- `sveltekit-frontend/src/lib/components/ui/StatsCard/StatsCard.svelte`
- `sveltekit-frontend/src/routes/(auth)_disabled/profile/+page.svelte`
- `sveltekit-frontend/src/routes/(ai)_disabled/ai-dashboard/+page.svelte`
- `sveltekit-frontend/src/routes/monitor/+page.svelte`

**Pages (3 files)**:
- `sveltekit-frontend/src/routes/archive/tests/pages/upload-test/+page.svelte`
- `sveltekit-frontend/src/routes/upload-test/+page.svelte`
- `sveltekit-frontend/src/lib/components/board/CanvasBoard.svelte`

### Execution Strategy

1. **Start with UI components** (11 files) - These are foundational
2. **Then dashboard components** (4 files) - Used by many pages
3. **Then case components** (6 files) - Core functionality
4. **Then legal AI components** (12 files) - Complex but isolated
5. **Then evidence components** (4 files) - Important for evidence pipeline
6. **Then other components** (20 files) - Various utilities

### Verification After Task 9
```bash
npm run svelte-check 2>&1 | head -50
```

Expected: Significant reduction in errors related to `export let`

---

## Task 10: $: variable = ... → $derived (0 files, 7 patterns)

### Status
No files found with ripgrep due to escaping issues. These patterns exist but need manual search.

### Search Command (Manual)
```bash
rg '\$: \w+ =' sveltekit-frontend/src --glob "*.svelte" -B 1 -A 1
```

### Expected Files
- `sveltekit-frontend/src/lib/ui/TimelineView.svelte`
- `sveltekit-frontend/src/lib/components/legal-ai/CaseStatuteLinks.svelte`
- `sveltekit-frontend/src/lib/components/PersonList.svelte`
- And 4 others

### Execution Strategy
1. Manually search for patterns
2. Convert each to `$derived`
3. Verify computed values update

---

## Task 11: $: { ... } → $effect (0 files, 0 patterns)

### Status
No reactive side effects found in codebase. This task is complete.

---

## Task 12: onMount → $effect (157 files, 162 patterns)

### Files to Process (157 total)

**High Priority (Core Routes)**:
- `sveltekit-frontend/src/routes/+layout.svelte`
- `sveltekit-frontend/src/routes/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/+layout.svelte`
- `sveltekit-frontend/src/routes/yorha/terminal/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/detective/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/dashboard/+page.svelte`
- `sveltekit-frontend/src/routes/(app)/command-center/+page.svelte`
- `sveltekit-frontend/src/routes/(app)/cases/[id]/+page.svelte`

**Medium Priority (Evidence & Analysis)**:
- `sveltekit-frontend/src/routes/yorha/evidence-board/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/analysis/+page.svelte`
- `sveltekit-frontend/src/routes/evidence-board/+page.svelte`
- `sveltekit-frontend/src/routes/evidence-analysis/+page.svelte`
- `sveltekit-frontend/src/routes/evidence-workspace/+page.svelte`

**Lower Priority (Demos & Tests)**:
- `sveltekit-frontend/src/routes/archive/tests/pages/webgpu-test/+page.svelte`
- `sveltekit-frontend/src/routes/archive/tests/pages/ui-test/+page.svelte`
- `sveltekit-frontend/src/routes/archive/demos/demo/integrated-rag/+page.svelte`
- And 140+ others

### Execution Strategy

1. **Start with core routes** (8 files) - These are critical
2. **Then evidence routes** (5 files) - Important for evidence pipeline
3. **Then component files** (50+ files) - Bulk of the work
4. **Then demo/test routes** (90+ files) - Lower priority

### Verification After Task 12
```bash
npm run svelte-check 2>&1 | head -50
```

Expected: Significant reduction in errors related to `onMount`

---

## Task 13: onDestroy → $effect (30 files, 30 patterns)

### Files to Process (30 total)

**High Priority**:
- `sveltekit-frontend/src/routes/(app)/command-center/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/detective/+page.svelte`
- `sveltekit-frontend/src/routes/yorha/dashboard/+page.svelte`
- `sveltekit-frontend/src/lib/evidence-canvas/evidence-canvas.svelte`
- `sveltekit-frontend/src/lib/evidence-canvas/evidence-canvas-core.svelte`

**Medium Priority**:
- `sveltekit-frontend/src/lib/ui/Modal.svelte`
- `sveltekit-frontend/src/lib/components/evidence-graph/GraphView.svelte`
- `sveltekit-frontend/src/lib/components/editors/LegalRichTextEditor.svelte`
- `sveltekit-frontend/src/lib/components/yorha/PhoenixProsecutorDashboard.svelte`
- `sveltekit-frontend/src/lib/components/yorha/PhoenixEventMonitor.svelte`

**Lower Priority**:
- `sveltekit-frontend/src/routes/admin/cluster/+page.svelte`
- `sveltekit-frontend/src/routes/archive/tests/pages/api-test/+page.svelte`
- `sveltekit-frontend/src/routes/demo/integrated-rag/+page.svelte`
- And 17 others

### Execution Strategy

1. **Start with high priority** (5 files) - Critical for functionality
2. **Then medium priority** (5 files) - Important components
3. **Then lower priority** (20 files) - Remaining files

### Verification After Task 13
```bash
npm run svelte-check 2>&1 | head -50
```

Expected: All Svelte 4 lifecycle patterns converted to Svelte 5 runes

---

## Overall Execution Timeline

### Phase 3 Execution (1.5-2.5 hours total)

**Hour 1**:
- Task 9: export let → $props (57 files) - 45 min
- Task 10: $: variable = ... → $derived (0 files) - 15 min

**Hour 2**:
- Task 11: $: { ... } → $effect (0 files) - 5 min
- Task 12: onMount → $effect (157 files) - 40 min
- Task 13: onDestroy → $effect (30 files) - 15 min

**Verification**:
- Full build check - 10 min

---

## Success Criteria

After Phase 3 completion:
- ✅ All 107 `export let` patterns converted to `$props`
- ✅ All 7 `$: variable = ...` patterns converted to `$derived`
- ✅ All 0 `$: { ... }` patterns converted to `$effect` (none found)
- ✅ All 162 `onMount` patterns converted to `$effect`
- ✅ All 30 `onDestroy` patterns converted to `$effect` cleanup
- ✅ No Svelte 4 lifecycle patterns remain
- ✅ Components compile without errors
- ✅ svelte-check passes

---

## Next Steps

After Phase 3:
1. **Phase 4**: Bits-UI v2 Component Updates (1-2 hours)
2. **Phase 5**: Styling Standardization (1-2 hours)
3. **Phase 6**: Verification & Testing (1-2 hours)

---

**Status**: ✅ READY FOR PHASE 3 EXECUTION
**Generated**: December 14, 2025

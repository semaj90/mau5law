# 📋 Phase 74: Complete Route Inventory

Generated: 2025-12-20T03:15:09.499Z

## 📊 Summary

- **Active Routes:** 80
- **Parked Routes:** 10
- **Duplicate Paths:** 1
- **API Endpoints:** 24
- **Test Files:** 392
- **Files with Missing Imports:** 10

## 📄 Active Routes by Type

- **page.svelte:** 34
- **page.ts:** 3
- **page.server:** 10
- **layout.svelte:** 3
- **layout.ts:** 2
- **layout.server:** 2
- **server:** 25
- **error:** 1

## ⚠️ Duplicate Routes

### `/`

- [active] `src/routes/+page.svelte` (15.8 KB)
- [active] `src/routes/(app)/terminal/+page.svelte` (9.3 KB)
- [active] `src/routes/(app)/system-configuration/+page.svelte` (23.9 KB)
- [active] `src/routes/(app)/gpu-evidence-graph/+page.svelte` (21.0 KB)
- [active] `src/routes/(app)/persons-of-interest/+page.svelte` (7.0 KB)
- [active] `src/routes/(app)/evidence-library/+page.svelte` (0.9 KB)
- [active] `src/routes/(app)/evidence/+page.svelte` (10.4 KB)
- [active] `src/routes/(app)/global-search/+page.svelte` (18.5 KB)
- [active] `src/routes/(app)/cases/+page.svelte` (1.4 KB)
- [active] `src/routes/(app)/command-center/+page.svelte` (33.9 KB)
- [active] `src/routes/(app)/dashboard/+page.svelte` (2.6 KB)
- [active] `src/routes/(app)/analysis-center/+page.svelte` (12.2 KB)
- [active] `src/routes/(app)/all-routes/+page.svelte` (8.4 KB)
- [active] `src/routes/(app)/active-cases/+page.svelte` (0.7 KB)
- [active] `src/routes/(app)/phase78/monitor/+page.svelte` (11.0 KB)
- [active] `src/routes/(app)/persons-of-interest/[id]/+page.svelte` (8.0 KB)
- [active] `src/routes/(app)/persons-of-interest/create/+page.svelte` (2.0 KB)
- [active] `src/routes/(app)/evidence/upload/+page.svelte` (7.7 KB)
- [active] `src/routes/(app)/evidence/realtime/+page.svelte` (13.5 KB)
- [active] `src/routes/(app)/evidence/manage/+page.svelte` (0.6 KB)
- [active] `src/routes/(app)/evidence/hash/+page.svelte` (13.5 KB)
- [active] `src/routes/(app)/evidence/analyze/+page.svelte` (12.9 KB)
- [active] `src/routes/(app)/cases/[id]/+page.svelte` (11.4 KB)
- [active] `src/routes/(app)/cases/new/+page.svelte` (9.0 KB)
- [active] `src/routes/(app)/cases/create/+page.svelte` (13.5 KB)
- [active] `src/routes/(app)/phase78/routes/[routePath]/+page.svelte` (3.8 KB)
- [active] `src/routes/(app)/cases/[id]/reports/+page.svelte` (3.2 KB)
- [active] `src/routes/(app)/cases/[id]/persons/+page.svelte` (2.8 KB)
- [active] `src/routes/(app)/cases/[id]/overview/+page.svelte` (8.8 KB)
- [active] `src/routes/(app)/cases/[id]/chat/+page.svelte` (0.7 KB)
- [active] `src/routes/(app)/cases/[id]/canvas/+page.svelte` (1.6 KB)
- [active] `src/routes/(app)/cases/[id]/board/+page.svelte` (4.1 KB)
- [active] `src/routes/(app)/cases/[id]/ai/+page.svelte` (3.4 KB)
- [active] `src/routes/(app)/cases/[id]/evidence/upload/+page.svelte` (9.0 KB)
- [active] `src/routes/(app)/cases/[id]/overview/+page.ts` (0.4 KB)
- [active] `src/routes/(app)/cases/[id]/reports/+page.ts` (0.3 KB)
- [active] `src/routes/(app)/cases/[id]/canvas/+page.ts` (0.3 KB)
- [active] `src/routes/(app)/persons-of-interest/+page.server.ts` (0.3 KB)
- [active] `src/routes/(app)/evidence/+page.server.ts` (1.2 KB)
- [active] `src/routes/(app)/analysis-center/+page.server.ts` (1.5 KB)
- [active] `src/routes/(app)/all-routes/+page.server.ts` (15.3 KB)
- [active] `src/routes/(app)/phase78/monitor/+page.server.ts` (0.8 KB)
- [active] `src/routes/(app)/persons-of-interest/[id]/+page.server.ts` (0.1 KB)
- [active] `src/routes/(app)/persons-of-interest/create/+page.server.ts` (1.7 KB)
- [active] `src/routes/(app)/evidence/upload/+page.server.ts` (13.4 KB)
- [active] `src/routes/(app)/phase78/routes/[routePath]/+page.server.ts` (0.7 KB)
- [active] `src/routes/(app)/cases/[id]/evidence/upload/+page.server.ts` (1.7 KB)
- [active] `src/routes/+layout.svelte` (4.1 KB)
- [active] `src/routes/(app)/+layout.svelte` (0.6 KB)
- [active] `src/routes/(app)/cases/[id]/+layout.svelte` (1.8 KB)
- [active] `src/routes/+layout.ts` (0.1 KB)
- [active] `src/routes/(app)/cases/[id]/+layout.ts` (0.3 KB)
- [active] `src/routes/+layout.server.ts` (0.2 KB)
- [active] `src/routes/(app)/+layout.server.ts` (0.7 KB)
- [active] `src/routes/api/health/+server.ts` (0.9 KB)
- [active] `src/routes/(app)/evidence/+server.ts` (1.3 KB)
- [active] `src/routes/api/system/services/+server.ts` (2.4 KB)
- [active] `src/routes/api/system/phase13/+server.ts` (1.8 KB)
- [active] `src/routes/api/system/health/+server.ts` (0.5 KB)
- [active] `src/routes/api/system/env/+server.ts` (0.7 KB)
- [active] `src/routes/api/ollama/pull/+server.ts` (1.9 KB)
- [active] `src/routes/api/llm-improvement/metrics/+server.ts` (2.6 KB)
- [active] `src/routes/api/llm-improvement/learn/+server.ts` (2.9 KB)
- [active] `src/routes/api/llm-improvement/fix/+server.ts` (2.2 KB)
- [active] `src/routes/api/llm-improvement/escalate/+server.ts` (4.1 KB)
- [active] `src/routes/api/llm-improvement/analyze/+server.ts` (2.9 KB)
- [active] `src/routes/api/health/services/+server.ts` (2.6 KB)
- [active] `src/routes/api/health/search/+server.ts` (1.3 KB)
- [active] `src/routes/api/health/ollama/+server.ts` (1.8 KB)
- [active] `src/routes/api/health/redis/+server.ts` (2.1 KB)
- [active] `src/routes/api/health/ocr/+server.ts` (8.4 KB)
- [active] `src/routes/api/health/neo4j/+server.ts` (0.0 KB)
- [active] `src/routes/api/health/database/+server.ts` (0.0 KB)
- [active] `src/routes/api/evidence/upload/+server.ts` (2.1 KB)
- [active] `src/routes/api/auth/logout/+server.ts` (1.4 KB)
- [active] `src/routes/api/auth/health/+server.ts` (3.5 KB)
- [active] `src/routes/api/auth/demo-login/+server.ts` (2.5 KB)
- [active] `src/routes/api/auth/login/+server.ts` (1.2 KB)
- [active] `src/routes/api/auth/debug/+server.ts` (0.6 KB)
- [active] `src/routes/+error.svelte` (0.5 KB)

## ✅ Active Routes

| Path | Type | File | Size |
|------|------|------|------|
| / | page.svelte | src/routes/+page.svelte | 15.8 KB |
| / | page.svelte | src/routes/(app)/terminal/+page.svelte | 9.3 KB |
| / | page.svelte | src/routes/(app)/system-configuration/+page.svelte | 23.9 KB |
| / | page.svelte | src/routes/(app)/gpu-evidence-graph/+page.svelte | 21.0 KB |
| / | page.svelte | src/routes/(app)/persons-of-interest/+page.svelte | 7.0 KB |
| / | page.svelte | src/routes/(app)/evidence-library/+page.svelte | 0.9 KB |
| / | page.svelte | src/routes/(app)/evidence/+page.svelte | 10.4 KB |
| / | page.svelte | src/routes/(app)/global-search/+page.svelte | 18.5 KB |
| / | page.svelte | src/routes/(app)/cases/+page.svelte | 1.4 KB |
| / | page.svelte | src/routes/(app)/command-center/+page.svelte | 33.9 KB |
| / | page.svelte | src/routes/(app)/dashboard/+page.svelte | 2.6 KB |
| / | page.svelte | src/routes/(app)/analysis-center/+page.svelte | 12.2 KB |
| / | page.svelte | src/routes/(app)/all-routes/+page.svelte | 8.4 KB |
| / | page.svelte | src/routes/(app)/active-cases/+page.svelte | 0.7 KB |
| / | page.svelte | src/routes/(app)/phase78/monitor/+page.svelte | 11.0 KB |
| / | page.svelte | src/routes/(app)/persons-of-interest/[id]/+page.svelte | 8.0 KB |
| / | page.svelte | src/routes/(app)/persons-of-interest/create/+page.svelte | 2.0 KB |
| / | page.svelte | src/routes/(app)/evidence/upload/+page.svelte | 7.7 KB |
| / | page.svelte | src/routes/(app)/evidence/realtime/+page.svelte | 13.5 KB |
| / | page.svelte | src/routes/(app)/evidence/manage/+page.svelte | 0.6 KB |
| / | page.svelte | src/routes/(app)/evidence/hash/+page.svelte | 13.5 KB |
| / | page.svelte | src/routes/(app)/evidence/analyze/+page.svelte | 12.9 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/+page.svelte | 11.4 KB |
| / | page.svelte | src/routes/(app)/cases/new/+page.svelte | 9.0 KB |
| / | page.svelte | src/routes/(app)/cases/create/+page.svelte | 13.5 KB |
| / | page.svelte | src/routes/(app)/phase78/routes/[routePath]/+page.svelte | 3.8 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/reports/+page.svelte | 3.2 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/persons/+page.svelte | 2.8 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/overview/+page.svelte | 8.8 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/chat/+page.svelte | 0.7 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/canvas/+page.svelte | 1.6 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/board/+page.svelte | 4.1 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/ai/+page.svelte | 3.4 KB |
| / | page.svelte | src/routes/(app)/cases/[id]/evidence/upload/+page.svelte | 9.0 KB |
| / | page.ts | src/routes/(app)/cases/[id]/overview/+page.ts | 0.4 KB |
| / | page.ts | src/routes/(app)/cases/[id]/reports/+page.ts | 0.3 KB |
| / | page.ts | src/routes/(app)/cases/[id]/canvas/+page.ts | 0.3 KB |
| / | page.server | src/routes/(app)/persons-of-interest/+page.server.ts | 0.3 KB |
| / | page.server | src/routes/(app)/evidence/+page.server.ts | 1.2 KB |
| / | page.server | src/routes/(app)/analysis-center/+page.server.ts | 1.5 KB |
| / | page.server | src/routes/(app)/all-routes/+page.server.ts | 15.3 KB |
| / | page.server | src/routes/(app)/phase78/monitor/+page.server.ts | 0.8 KB |
| / | page.server | src/routes/(app)/persons-of-interest/[id]/+page.server.ts | 0.1 KB |
| / | page.server | src/routes/(app)/persons-of-interest/create/+page.server.ts | 1.7 KB |
| / | page.server | src/routes/(app)/evidence/upload/+page.server.ts | 13.4 KB |
| / | page.server | src/routes/(app)/phase78/routes/[routePath]/+page.server.ts | 0.7 KB |
| / | page.server | src/routes/(app)/cases/[id]/evidence/upload/+page.server.ts | 1.7 KB |
| / | layout.svelte | src/routes/+layout.svelte | 4.1 KB |
| / | layout.svelte | src/routes/(app)/+layout.svelte | 0.6 KB |
| / | layout.svelte | src/routes/(app)/cases/[id]/+layout.svelte | 1.8 KB |
| / | layout.ts | src/routes/+layout.ts | 0.1 KB |
| / | layout.ts | src/routes/(app)/cases/[id]/+layout.ts | 0.3 KB |
| / | layout.server | src/routes/+layout.server.ts | 0.2 KB |
| / | layout.server | src/routes/(app)/+layout.server.ts | 0.7 KB |
| / | server | src/routes/api/health/+server.ts | 0.9 KB |
| / | server | src/routes/(app)/evidence/+server.ts | 1.3 KB |
| / | server | src/routes/api/system/services/+server.ts | 2.4 KB |
| / | server | src/routes/api/system/phase13/+server.ts | 1.8 KB |
| / | server | src/routes/api/system/health/+server.ts | 0.5 KB |
| / | server | src/routes/api/system/env/+server.ts | 0.7 KB |
| / | server | src/routes/api/ollama/pull/+server.ts | 1.9 KB |
| / | server | src/routes/api/llm-improvement/metrics/+server.ts | 2.6 KB |
| / | server | src/routes/api/llm-improvement/learn/+server.ts | 2.9 KB |
| / | server | src/routes/api/llm-improvement/fix/+server.ts | 2.2 KB |
| / | server | src/routes/api/llm-improvement/escalate/+server.ts | 4.1 KB |
| / | server | src/routes/api/llm-improvement/analyze/+server.ts | 2.9 KB |
| / | server | src/routes/api/health/services/+server.ts | 2.6 KB |
| / | server | src/routes/api/health/search/+server.ts | 1.3 KB |
| / | server | src/routes/api/health/ollama/+server.ts | 1.8 KB |
| / | server | src/routes/api/health/redis/+server.ts | 2.1 KB |
| / | server | src/routes/api/health/ocr/+server.ts | 8.4 KB |
| / | server | src/routes/api/health/neo4j/+server.ts | 0.0 KB |
| / | server | src/routes/api/health/database/+server.ts | 0.0 KB |
| / | server | src/routes/api/evidence/upload/+server.ts | 2.1 KB |
| / | server | src/routes/api/auth/logout/+server.ts | 1.4 KB |
| / | server | src/routes/api/auth/health/+server.ts | 3.5 KB |
| / | server | src/routes/api/auth/demo-login/+server.ts | 2.5 KB |
| / | server | src/routes/api/auth/login/+server.ts | 1.2 KB |
| / | server | src/routes/api/auth/debug/+server.ts | 0.6 KB |
| / | error | src/routes/+error.svelte | 0.5 KB |

## ⏸️ Parked Routes

| File | Size |
|------|------|
| src/routes__parked/gaming-evidence-board/+page.svelte | 1.4 KB |
| src/routes__parked/evidence-workspace/+page.svelte | 18.7 KB |
| src/routes__parked/evidence-canvas-demo/+page.svelte | 2.8 KB |
| src/routes__parked/evidence-canvas/+page.svelte | 1.5 KB |
| src/routes__parked/evidence-canvas/+layout.svelte | 1.0 KB |
| src/routes__parked/evidence-graph/EvidenceCanvas.svelte | 17.2 KB |
| src/routes__parked/evidence-graph/+page.svelte | 1.0 KB |
| src/routes__parked/evidence-analysis/+page.svelte | 7.5 KB |
| src/routes__parked/evidence-ai/+page.svelte | 23.1 KB |
| src/routes__parked/evidence-workspace/+page.server.ts | 0.2 KB |

## 🔌 API Endpoints

| Path | Methods | Error Handling | Tested |
|------|---------|----------------|--------|
| /api | None | ✅ | ❌ |
| /api | GET | ✅ | ❌ |
| /api | GET | ✅ | ❌ |
| /api | None | ❌ | ❌ |
| /api | GET | ❌ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | POST | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ❌ | ❌ |
| /api | None | ❌ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ✅ | ❌ |
| /api | None | ❌ | ❌ |

## ❌ Missing Imports

### `src/routes/(app)/terminal/+page.svelte`

- `$lib/components/ui/button/button.svelte`

### `src/routes/(app)/evidence-library/+page.svelte`

- `$lib/components/yorha/evidence/EvidenceFilters.svelte`
- `$lib/components/yorha/evidence/EvidenceGrid.svelte`
- `$lib/components/yorha/evidence/EvidenceStats.svelte`
- `$lib/components/yorha/evidence/UploadZone.svelte`

### `src/routes/(app)/active-cases/+page.svelte`

- `$lib/components/yorha/cases/CaseFilters.svelte`
- `$lib/components/yorha/cases/CasesList.svelte`
- `$lib/components/yorha/cases/CaseStats.svelte`

### `src/routes/(app)/persons-of-interest/create/+page.svelte`

- `$lib/components/poi/POIForm.svelte`

### `src/routes/(app)/evidence/manage/+page.svelte`

- `$lib/components/evidence/EvidenceFilesManager.svelte`

### `src/routes/(app)/cases/[id]/+page.svelte`

- `$lib/components/cases/CaseNotesEditor.svelte`
- `$lib/components/cases/ContextualChatModal.svelte`
- `$lib/components/evidence/EvidenceUploadPreview.svelte`
- `$lib/components/evidence/SummaryReviewPanel.svelte`
- `$lib/components/nes/NesModal.svelte`

### `src/routes/(app)/phase78/routes/[routePath]/+page.svelte`

- `$lib/components/phase78/ErrorEventsList.svelte`
- `$lib/components/phase78/SuggestionsList.svelte`
- `$lib/server/db/schema/index.js`

### `src/routes/(app)/cases/[id]/chat/+page.svelte`

- `$lib/components/legal-ai/CaseChatPanel.svelte`
- `$lib/components/legal-ai/LegalAILayout.svelte`

### `src/routes/(app)/cases/[id]/board/+page.svelte`

- `$lib/components/board/CanvasBoard.svelte`

### `src/routes/+layout.svelte`

- `$lib/components/yorha/CommandCenterNav.svelte`
- `$lib/components/yorha/SystemStatus.svelte`


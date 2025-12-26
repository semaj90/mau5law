# Phase 79: Error Leaderboard (run-1766770182224)

**Generated:** 2025-12-26T17:31:36.498Z
**Total Errors:** 27161
**Affected Files:** 778
**Top N:** 1000

---

## 📊 By Architecture Component

- **other**: 21374 errors
- **components**: 3942 errors
- **utils**: 532 errors
- **auth**: 525 errors
- **database**: 472 errors
- **stores**: 284 errors
- **quic-protocol**: 32 errors

## 🔍 By Error Pattern

- **unknown**: 26540 occurrences
- **duplicate-identifier**: 619 occurrences
- **env-type-declarations**: 2 occurrences

## 🎯 Top 778 Files by Impact Score

| Rank | File | Errors | Impact | Risk | Impact/Risk | Category | Packages | Cluster |
|------|------|--------|--------|------|-------------|----------|----------|---------|
| 1 | `src\lib\cache\loki-redis-integration-fixed.ts` | 762 | 2354 | 2 | **1177 (P0)** | other | 1 | 10 |
| 2 | `src\lib\cache\loki-redis-integration.ts` | 745 | 2288 | 2 | **1144 (P0)** | other | 1 | 7 |
| 3 | `src\lib\cache\headless-ui-cache.ts` | 563 | 1752 | 2 | **876 (P0)** | other | 1 | 9 |
| 4 | `src\lib\cache\gpu-leftover-cache.ts` | 558 | 1747 | 2 | **873.5 (P0)** | other | 1 | 11 |
| 5 | `src\lib\auth\roles.ts` | 93 | 2549 | 3 | **849.67 (P0)** | auth | 1 | 4 |
| 6 | `src\lib\cache\chr-rom-pattern-cache.ts` | 523 | 1622 | 2 | **811 (P0)** | other | 1 | 7 |
| 7 | `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` | 100 | 1578 | 2 | **789 (P0)** | components | 1 | 12 |
| 8 | `src\lib\stores\app-store.ts` | 86 | 1576 | 2 | **788 (P0)** | stores | 1 | 2 |
| 9 | `src\lib\components\POIPhotoModal.svelte` | 101 | 1563 | 2 | **781.5 (P0)** | components | 1 | 6 |
| 10 | `src\lib\api\services\auth-service.ts` | 84 | 2301 | 3 | **767 (P0)** | auth | 1 | 3 |
| 11 | `src\lib\3d\memory-palace-engine.ts` | 484 | 1505 | 2 | **752.5 (P0)** | other | 1 | 7 |
| 12 | `src\lib\components\ui\gaming\core\GamingEvolutionManager.ts` | 94 | 1483 | 2 | **741.5 (P0)** | components | 1 | 11 |
| 13 | `src\lib\components\ui\layout\index.ts` | 84 | 1373 | 2 | **686.5 (P0)** | components | 1 | 19 |
| 14 | `src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts` | 83 | 1323 | 2 | **661.5 (P0)** | components | 1 | 12 |
| 15 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` | 85 | 1318 | 2 | **659 (P0)** | components | 1 | 5 |
| 16 | `src\lib\memory\nes-memory-architecture.ts` | 390 | 1228 | 2 | **614 (P0)** | other | 1 | 8 |
| 17 | `src\lib\server\auth.ts` | 67 | 1837 | 3 | **612.33 (P0)** | auth | 1 | 2 |
| 18 | `src\lib\server\lokiHybridStore.ts` | 388 | 1222 | 2 | **611 (P0)** | other | 1 | 8 |
| 19 | `src\lib\db\schema-example-legal.ts` | 66 | 1830 | 3 | **610 (P0)** | database | 1 | 6 |
| 20 | `src\lib\utils\type-guards.ts` | 85 | 1218 | 2 | **609 (P0)** | utils | 1 | 36 |
| 21 | `src\lib\stores\dashboard\GrpcStatusAdapter.ts` | 64 | 1185 | 2 | **592.5 (P0)** | stores | 1 | 3 |
| 22 | `src\lib\services\cognitive-cache-integration.ts` | 367 | 1164 | 2 | **582 (P0)** | other | 1 | 9 |
| 23 | `src\lib\components\NESGraphRenderer.svelte` | 75 | 1158 | 2 | **579 (P0)** | components | 1 | 3 |
| 24 | `src\lib\middleware\authSeparation.ts` | 63 | 1734 | 3 | **578 (P0)** | auth | 1 | 3 |
| 25 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts` | 74 | 1153 | 2 | **576.5 (P0)** | components | 1 | 5 |
| 26 | `src\lib\components\ui\context-menu\index.ts` | 69 | 1133 | 2 | **566.5 (P0)** | components | 1 | 16 |
| 27 | `src\lib\components\RouteInspectorWorking.svelte` | 71 | 1103 | 2 | **551.5 (P0)** | components | 1 | 4 |
| 28 | `src\lib\utils\buffer-conversion.ts` | 84 | 1086 | 2 | **543 (P0)** | utils | 1 | 12 |
| 29 | `src\lib\stores.svelte.ts` | 58 | 1082 | 2 | **541 (P0)** | stores | 1 | 4 |
| 30 | `src\lib\ast\ast-processor.ts` | 328 | 1057 | 2 | **528.5 (P0)** | other | 1 | 11 |
| 31 | `src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts` | 65 | 1048 | 2 | **524 (P0)** | components | 1 | 11 |
| 32 | `src\lib\components\ui\enhanced\Button.stories.ts` | 64 | 1048 | 2 | **524 (P0)** | components | 1 | 14 |
| 33 | `src\lib\test-utils\mocks.ts` | 328 | 1037 | 2 | **518.5 (P0)** | other | 1 | 7 |
| 34 | `src\lib\components\yorha\JudicialAnalysisAgent.svelte` | 62 | 963 | 2 | **481.5 (P0)** | components | 1 | 3 |
| 35 | `src\lib\auth\auth-store.ts` | 51 | 1410 | 3 | **470 (P0)** | auth | 1 | 3 |
| 36 | `src\lib\middleware\binary-encoding.ts` | 256 | 936 | 2 | **468 (P0)** | other | 1 | 30 |
| 37 | `src\lib\components\three\yorha-ui\api\YoRHaAPIClient.ts` | 59 | 928 | 2 | **464 (P0)** | components | 1 | 5 |
| 38 | `src\lib\cache\multi-layer-cache.ts` | 291 | 921 | 2 | **460.5 (P0)** | other | 1 | 6 |
| 39 | `src\lib\components\types.ts` | 58 | 913 | 2 | **456.5 (P0)** | components | 1 | 5 |
| 40 | `src\lib\components\yorha\DetectiveEvidenceMap.svelte` | 58 | 908 | 2 | **454 (P0)** | components | 1 | 4 |
| 41 | `src\lib\schemas\prosecution-case-form.ts` | 32 | 897 | 2 | **448.5 (P0)** | database | 1 | 3 |
| 42 | `src\lib\components\ai\legal\ComprehensiveLegalAI.svelte` | 57 | 883 | 2 | **441.5 (P0)** | components | 1 | 2 |
| 43 | `src\lib\routing\dynamic-route-generator.ts` | 270 | 883 | 2 | **441.5 (P0)** | other | 1 | 11 |
| 44 | `src\lib\machines\aiAssistantMachine.ts` | 273 | 882 | 2 | **441 (P0)** | other | 1 | 9 |
| 45 | `src\lib\components\three\yorha-ui\components\YoRHaButton3D.ts` | 54 | 873 | 2 | **436.5 (P0)** | components | 1 | 9 |
| 46 | `src\lib\components\ui\bits\custom-design-integration.ts` | 55 | 873 | 2 | **436.5 (P0)** | components | 1 | 6 |
| 47 | `src\lib\routing\route-registry.svelte.ts` | 272 | 864 | 2 | **432 (P0)** | other | 1 | 6 |
| 48 | `src\lib\database\migrations\migration-system.ts` | 314 | 1255 | 3 | **418.33 (P0)** | other | 1 | 59 |
| 49 | `src\lib\components\yorha\TimelineReconstructionEngine.svelte` | 53 | 828 | 2 | **414 (P0)** | components | 1 | 3 |
| 50 | `src\lib\utils\webgpu-buffer-uploader.ts` | 63 | 809 | 2 | **404.5 (P0)** | utils | 1 | 7 |
| 51 | `src\lib\routing\unified-api-router.ts` | 250 | 808 | 2 | **404 (P0)** | other | 1 | 8 |
| 52 | `src\lib\utils\simd-json-cache.ts` | 92 | 1207 | 3 | **402.33 (P0)** | utils | 1 | 17 |
| 53 | `src\lib\components\cases\CaseNotesEditor.svelte` | 51 | 803 | 2 | **401.5 (P0)** | components | 1 | 4 |
| 54 | `src\lib\machines\graph-cache-machine.ts` | 182 | 794 | 2 | **397 (P0)** | other | 1 | 46 |
| 55 | `src\lib\components\ai\FileUploadGemma3.stories.ts` | 49 | 793 | 2 | **396.5 (P0)** | components | 1 | 8 |
| 56 | `src\lib\server\db-insert-helpers.ts` | 42 | 1182 | 3 | **394 (P0)** | database | 1 | 6 |
| 57 | `src\lib\machines\auth-machine.ts` | 41 | 1170 | 3 | **390 (P0)** | auth | 1 | 9 |
| 58 | `src\lib\server\storage\minio-service.ts` | 244 | 780 | 2 | **390 (P0)** | other | 1 | 6 |
| 59 | `src\lib\components\yorha\CaseTheoryConstructor.svelte` | 48 | 758 | 2 | **379 (P0)** | components | 1 | 4 |
| 60 | `src\lib\components\three\yorha-ui\components\YoRHaInput3D.ts` | 43 | 738 | 2 | **369 (P0)** | components | 1 | 15 |
| 61 | `src\lib\server\pgvector-cache.ts` | 140 | 683 | 2 | **341.5 (P0)** | other | 1 | 49 |
| 62 | `src\lib\components\poi\POIForm.svelte` | 43 | 678 | 2 | **339 (P0)** | components | 1 | 3 |
| 63 | `src\lib\server\auth-guard.ts` | 36 | 1010 | 3 | **336.67 (P0)** | auth | 1 | 4 |
| 64 | `src\lib\cache\semantic-cache.ts` | 201 | 671 | 2 | **335.5 (P0)** | other | 1 | 10 |
| 65 | `src\lib\server\ai\agentic-stream.ts` | 202 | 664 | 2 | **332 (P0)** | other | 1 | 8 |
| 66 | `src\lib\components\ui\bits\component-loader.ts` | 41 | 653 | 2 | **326.5 (P0)** | components | 1 | 4 |
| 67 | `src\lib\components\ui\enhanced-bits.ts` | 40 | 643 | 2 | **321.5 (P0)** | components | 1 | 5 |
| 68 | `src\lib\components\three\yorha-ui\YoRHaLayout3D.ts` | 40 | 638 | 2 | **319 (P0)** | components | 1 | 4 |
| 69 | `src\lib\api\services\cache-service.ts` | 193 | 632 | 2 | **316 (P0)** | other | 1 | 7 |
| 70 | `src\lib\components\ai\AutomatedLegalResearch.svelte` | 39 | 628 | 2 | **314 (P0)** | components | 1 | 5 |
| 71 | `src\lib\db\chat-schema.ts` | 32 | 927 | 3 | **309 (P0)** | database | 1 | 9 |
| 72 | `src\lib\db\drizzle-usage-examples.ts` | 33 | 924 | 3 | **308 (P0)** | database | 1 | 3 |
| 73 | `src\lib\machines\ingestion-workflow-machine.ts` | 181 | 616 | 2 | **308 (P0)** | other | 1 | 11 |
| 74 | `src\lib\components\three\yorha-ui\webgpu\YoRHaWebGPUMath.ts` | 38 | 613 | 2 | **306.5 (P0)** | components | 1 | 5 |
| 75 | `src\lib\components\three\yorha-ui\components\YoRHaModal3D.ts` | 36 | 608 | 2 | **304 (P0)** | components | 1 | 10 |
| 76 | `src\lib\components\ui\bits\index.optimized.ts` | 37 | 603 | 2 | **301.5 (P0)** | components | 1 | 6 |
| 77 | `src\lib\machines\agentShellMachine.ts` | 148 | 602 | 2 | **301 (P0)** | other | 1 | 28 |
| 78 | `src\lib\components\yorha\PhoenixProsecutorDashboard.svelte` | 38 | 598 | 2 | **299 (P0)** | components | 1 | 2 |
| 79 | `src\lib\components\three\yorha-ui\webgpu\YoRHaOptimizedTextureManager.ts` | 36 | 588 | 2 | **294 (P0)** | components | 1 | 6 |
| 80 | `src\lib\components\vision\PhoenixWrightSearch.svelte` | 37 | 583 | 2 | **291.5 (P0)** | components | 1 | 2 |
| 81 | `src\lib\server\schema.ts` | 19 | 581 | 2 | **290.5 (P0)** | database | 1 | 10 |
| 82 | `src\lib\machines\predictive-typing-machine.ts` | 160 | 578 | 2 | **289 (P0)** | other | 1 | 16 |
| 83 | `src\lib\db\schema\legacy.ts` | 31 | 865 | 3 | **288.33 (P0)** | database | 1 | 2 |
| 84 | `src\lib\services\qlora-rl-langextract-integration.ts` | 171 | 566 | 2 | **283 (P0)** | other | 1 | 7 |
| 85 | `src\lib\hooks\useRedisOrchestrator.ts` | 152 | 559 | 2 | **279.5 (P0)** | other | 1 | 17 |
| 86 | `src\lib\stores\dashboard\SSEStatusStore.ts` | 29 | 555 | 2 | **277.5 (P0)** | stores | 1 | 3 |
| 87 | `src\lib\components\integration\LegalAIOrchestrationDemo.svelte` | 34 | 548 | 2 | **274 (P0)** | components | 1 | 4 |
| 88 | `src\lib\adapters\webasm-ai-adapter.ts` | 163 | 547 | 2 | **273.5 (P0)** | other | 1 | 8 |
| 89 | `src\lib\components\evidence\EvidenceBoard.svelte` | 34 | 543 | 2 | **271.5 (P0)** | components | 1 | 3 |
| 90 | `src\lib\components\poi\PersonOfInterestDetailView.svelte` | 34 | 543 | 2 | **271.5 (P0)** | components | 1 | 3 |
| 91 | `src\lib\components\ui\AIFileUpload.svelte` | 34 | 538 | 2 | **269 (P0)** | components | 1 | 2 |
| 92 | `src\lib\components\yorha\PoliceReportGenerator.svelte` | 34 | 538 | 2 | **269 (P0)** | components | 1 | 2 |
| 93 | `src\lib\utils\typed-array-quantization.ts` | 41 | 525 | 2 | **262.5 (P0)** | utils | 1 | 3 |
| 94 | `src\lib\config\gemma3-config.ts` | 130 | 523 | 2 | **261.5 (P0)** | other | 1 | 23 |
| 95 | `src\lib\server\helpers\docker-discovery.ts` | 135 | 523 | 2 | **261.5 (P0)** | other | 1 | 20 |
| 96 | `src\lib\forms\contextual-chat-schema.ts` | 17 | 517 | 2 | **258.5 (P0)** | database | 1 | 8 |
| 97 | `src\lib\server\db\queries.ts` | 27 | 772 | 3 | **257.33 (P0)** | database | 1 | 5 |
| 98 | `src\lib\workers\legal-ai-worker-pool.ts` | 130 | 513 | 2 | **256.5 (P0)** | other | 1 | 21 |
| 99 | `src\lib\components\ui\gaming\constants\gaming-constants.ts` | 30 | 513 | 2 | **256.5 (P0)** | components | 1 | 9 |
| 100 | `src\lib\server\db\drizzle.ts` | 27 | 762 | 3 | **254 (P0)** | database | 1 | 3 |
| 101 | `src\lib\machines\vector-pipeline-machine.ts` | 135 | 508 | 2 | **254 (P0)** | other | 1 | 17 |
| 102 | `src\lib\client\secure-storage-client.ts` | 144 | 505 | 2 | **252.5 (P0)** | other | 1 | 11 |
| 103 | `src\lib\stores\generic.svelte.ts` | 26 | 501 | 2 | **250.5 (P0)** | stores | 1 | 3 |
| 104 | `src\lib\components\RouteInspectorDetectiveBoard.svelte` | 31 | 493 | 2 | **246.5 (P0)** | components | 1 | 2 |
| 105 | `src\lib\utils\route-operation-logger.ts` | 38 | 489 | 2 | **244.5 (P0)** | utils | 1 | 3 |
| 106 | `src\lib\utils\mcp-helpers.ts` | 38 | 484 | 2 | **242 (P0)** | utils | 1 | 2 |
| 107 | `src\lib\schemas\vector.ts` | 16 | 480 | 2 | **240 (P0)** | database | 1 | 6 |
| 108 | `src\lib\services\enhanced-rag-pagerank.ts` | 141 | 471 | 2 | **235.5 (P0)** | other | 1 | 6 |
| 109 | `src\lib\components\ui\bits\performance.ts` | 29 | 468 | 2 | **234 (P0)** | components | 1 | 3 |
| 110 | `src\lib\server\lucia.ts` | 16 | 460 | 2 | **230 (P0)** | auth | 1 | 2 |
| 111 | `src\lib\components\ui\gaming\types\gaming-types.ts` | 27 | 458 | 2 | **229 (P0)** | components | 1 | 7 |
| 112 | `src\lib\components\ContextConfirmModal.svelte` | 27 | 453 | 2 | **226.5 (P0)** | components | 1 | 6 |
| 113 | `src\lib\routing\route-guards.ts` | 118 | 442 | 2 | **221 (P0)** | other | 1 | 14 |
| 114 | `src\lib\forms\superforms-xstate-integration.ts` | 127 | 434 | 2 | **217 (P0)** | other | 1 | 7 |
| 115 | `src\lib\components\ui\bits\types.ts` | 26 | 433 | 2 | **216.5 (P0)** | components | 1 | 5 |
| 116 | `src\lib\machines\legalAIMachine.v5.ts` | 127 | 424 | 2 | **212 (P0)** | other | 1 | 5 |
| 117 | `src\lib\agents\tools.ts` | 123 | 422 | 2 | **211 (P0)** | other | 1 | 7 |
| 118 | `src\lib\models\ChatSession.svelte.ts` | 125 | 413 | 2 | **206.5 (P0)** | other | 1 | 4 |
| 119 | `src\lib\stores\dashboard\DocumentProgressStore.ts` | 21 | 411 | 2 | **205.5 (P0)** | stores | 1 | 3 |
| 120 | `src\lib\components\legal-ai\CitationSaveModal.svelte` | 24 | 408 | 2 | **204 (P0)** | components | 1 | 6 |
| 121 | `src\lib\utils\webgpu-array-utils.ts` | 30 | 408 | 2 | **204 (P0)** | utils | 1 | 6 |
| 122 | `src\lib\components\evidence\EvidenceAssistant.svelte` | 25 | 403 | 2 | **201.5 (P0)** | components | 1 | 2 |
| 123 | `src\lib\components\upload\upload-core.ts` | 24 | 403 | 2 | **201.5 (P0)** | components | 1 | 5 |
| 124 | `src\lib\ast\svelte-check-analyzer.ts` | 121 | 401 | 2 | **200.5 (P0)** | other | 1 | 4 |
| 125 | `src\lib\schemas\evidence-upload.ts` | 14 | 401 | 2 | **200.5 (P0)** | database | 1 | 1 |
| 126 | `src\lib\server\minio-service.ts` | 116 | 401 | 2 | **200.5 (P0)** | other | 1 | 7 |
| 127 | `src\lib\simd\simd-json-worker-client.ts` | 100 | 393 | 2 | **196.5 (P0)** | other | 1 | 15 |
| 128 | `src\lib\types\api-schemas.ts` | 13 | 389 | 2 | **194.5 (P0)** | database | 1 | 4 |
| 129 | `src\lib\components\command-center\AceAgentControls.svelte` | 24 | 388 | 2 | **194 (P0)** | components | 1 | 2 |
| 130 | `src\lib\components\evidence\VictimStatementWizard.svelte` | 24 | 388 | 2 | **194 (P0)** | components | 1 | 2 |
| 131 | `src\lib\server\concurrent-json-serializer.ts` | 97 | 384 | 2 | **192 (P0)** | other | 1 | 15 |
| 132 | `src\lib\mlp.ts` | 113 | 377 | 2 | **188.5 (P0)** | other | 1 | 4 |
| 133 | `src\lib\logic\POI.ts` | 92 | 374 | 2 | **187 (P0)** | other | 1 | 16 |
| 134 | `src\lib\webgpu\shader-cache-manager.ts` | 105 | 373 | 2 | **186.5 (P0)** | other | 1 | 8 |
| 135 | `src\lib\components\ui\EvidenceCanvas.svelte` | 22 | 373 | 2 | **186.5 (P0)** | components | 1 | 5 |
| 136 | `src\lib\components\three\yorha-ui\theme\yorha-theme-adapter.ts` | 22 | 373 | 2 | **186.5 (P0)** | components | 1 | 5 |
| 137 | `src\lib\components\ui\QuickActionButton\QuickActionButton.svelte` | 22 | 373 | 2 | **186.5 (P0)** | quic-protocol | 1 | 5 |
| 138 | `src\lib\machines\enhanced-legal-upload-analytics-machine.ts` | 108 | 372 | 2 | **186 (P0)** | other | 1 | 6 |
| 139 | `src\lib\server\cache.ts` | 103 | 367 | 2 | **183.5 (P0)** | other | 1 | 8 |
| 140 | `src\lib\orchestration\optimized-rabbitmq-orchestrator.ts` | 97 | 364 | 2 | **182 (P0)** | other | 1 | 11 |
| 141 | `src\lib\services\glyph-diffusion-service.ts` | 103 | 362 | 2 | **181 (P0)** | other | 1 | 7 |
| 142 | `src\lib\components\ui\AutoPopulatedCaseForm.svelte` | 22 | 358 | 2 | **179 (P0)** | components | 1 | 2 |
| 143 | `src\lib\components\ui\Button.stories.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 144 | `src\lib\components\ui\gaming\core\GamingEvolutionManager-minimal.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 145 | `src\lib\components\CanvasEditor.svelte` | 21 | 353 | 2 | **176.5 (P0)** | components | 1 | 4 |
| 146 | `src\lib\components\three\yorha-ui\components\YoRHaQuantumEffects3D.ts` | 21 | 353 | 2 | **176.5 (P0)** | components | 1 | 4 |
| 147 | `src\lib\components\phase78\ErrorModal.svelte` | 21 | 348 | 2 | **174 (P0)** | components | 1 | 3 |
| 148 | `src\lib\components\RouteOperationsDashboard.svelte` | 21 | 343 | 2 | **171.5 (P0)** | components | 1 | 2 |
| 149 | `src\lib\machines\recommendation-routing-machine.ts` | 100 | 343 | 2 | **171.5 (P0)** | other | 1 | 5 |
| 150 | `src\lib\client\ocr-tensor-processor.ts` | 100 | 338 | 2 | **169 (P0)** | other | 1 | 4 |
| 151 | `src\lib\components\canvas\index.ts` | 20 | 338 | 2 | **169 (P0)** | components | 1 | 4 |
| 152 | `src\lib\components\ui\wrappers\bits\index.ts` | 20 | 338 | 2 | **169 (P0)** | components | 1 | 4 |
| 153 | `src\lib\server\authUtils.ts` | 17 | 507 | 3 | **169 (P0)** | auth | 1 | 6 |
| 154 | `src\lib\optimization\neural-memory-manager.ts` | 93 | 337 | 2 | **168.5 (P0)** | other | 1 | 8 |
| 155 | `src\lib\evidence-canvas\evidence-canvas-core.svelte` | 86 | 336 | 2 | **168 (P0)** | other | 1 | 12 |
| 156 | `src\lib\server\auth-simple.ts` | 17 | 502 | 3 | **167.33 (P0)** | auth | 1 | 5 |
| 157 | `src\lib\server\redisPubSub.ts` | 87 | 334 | 2 | **167 (P0)** | other | 1 | 11 |
| 158 | `src\lib\components\legal-ai\AttachToCaseModal.svelte` | 20 | 333 | 2 | **166.5 (P0)** | components | 1 | 3 |
| 159 | `src\lib\server\redis-cache.ts` | 69 | 330 | 2 | **165 (P0)** | other | 1 | 21 |
| 160 | `src\lib\webgpu\webgpu-init.ts` | 82 | 329 | 2 | **164.5 (P0)** | other | 1 | 13 |
| 161 | `src\lib\components\cases\ContextualChatModal.svelte` | 20 | 328 | 2 | **164 (P0)** | components | 1 | 2 |
| 162 | `src\lib\server\cache\redis-cache.ts` | 68 | 327 | 2 | **163.5 (P0)** | other | 1 | 21 |
| 163 | `src\lib\components\legal\index.ts` | 19 | 323 | 2 | **161.5 (P0)** | components | 1 | 4 |
| 164 | `src\lib\machines\legalCaseMachine.ts` | 85 | 323 | 2 | **161.5 (P0)** | other | 1 | 10 |
| 165 | `src\lib\db\localDocs.svelte.ts` | 148 | 482 | 3 | **160.67 (P0)** | other | 1 | 4 |
| 166 | `src\lib\services\localStorage-file-fallback.ts` | 92 | 319 | 2 | **159.5 (P0)** | other | 1 | 5 |
| 167 | `src\lib\optimization\optimization-test-suite.ts` | 87 | 319 | 2 | **159.5 (P0)** | other | 1 | 8 |
| 168 | `src\lib\components\CaseOutcomePrediction.svelte` | 19 | 318 | 2 | **159 (P0)** | components | 1 | 3 |
| 169 | `src\lib\components\headless\texture-streaming.svelte.ts` | 18 | 313 | 2 | **156.5 (P0)** | components | 1 | 5 |
| 170 | `src\lib\server\http-cache-headers.ts` | 79 | 310 | 2 | **155 (P0)** | other | 1 | 11 |
| 171 | `src\lib\utils\ollama-endpoints.ts` | 23 | 309 | 2 | **154.5 (P0)** | utils | 1 | 3 |
| 172 | `src\lib\services\cache-layer-manager.ts` | 65 | 308 | 2 | **154 (P0)** | other | 1 | 19 |
| 173 | `src\lib\demos\neural-intent-demo.ts` | 71 | 306 | 2 | **153 (P0)** | other | 1 | 15 |
| 174 | `src\lib\machines\workflow-machine.ts` | 91 | 306 | 2 | **153 (P0)** | other | 1 | 3 |
| 175 | `src\lib\evidence-canvas\webgpu-init.ts` | 89 | 305 | 2 | **152.5 (P0)** | other | 1 | 4 |
| 176 | `src\lib\machines\index.ts` | 69 | 305 | 2 | **152.5 (P0)** | other | 1 | 16 |
| 177 | `src\lib\server\rate-limiter.ts` | 67 | 304 | 2 | **152 (P0)** | other | 1 | 17 |
| 178 | `src\lib\components\AIChat.stories.ts` | 17 | 303 | 2 | **151.5 (P0)** | components | 1 | 6 |
| 179 | `src\lib\components\error-analysis\KnowledgeGraph.svelte` | 18 | 303 | 2 | **151.5 (P0)** | components | 1 | 3 |
| 180 | `src\lib\components\ui\gaming\effects\gradient-utils.ts` | 15 | 303 | 2 | **151.5 (P0)** | components | 1 | 12 |
| 181 | `src\lib\types\legal-types.ts` | 75 | 303 | 2 | **151.5 (P0)** | other | 1 | 12 |
| 182 | `src\lib\optimization\index.ts` | 68 | 302 | 2 | **151 (P0)** | other | 1 | 16 |
| 183 | `src\lib\middleware\namespaceRouter.ts` | 87 | 299 | 2 | **149.5 (P0)** | other | 1 | 4 |
| 184 | `src\lib\components\CitationLink.svelte` | 18 | 298 | 2 | **149 (P0)** | components | 1 | 2 |
| 185 | `src\lib\server\embedding-cache-middleware.ts` | 60 | 298 | 2 | **149 (P0)** | other | 1 | 20 |
| 186 | `src\lib\components\phase78\SuggestionsList.svelte` | 17 | 288 | 2 | **144 (P0)** | components | 1 | 3 |
| 187 | `src\lib\index.ts` | 76 | 286 | 2 | **143 (P0)** | other | 1 | 8 |
| 188 | `src\lib\components\ReportEditor.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 189 | `src\lib\components\board\CanvasBoard.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 190 | `src\lib\components\case\ErrorAlert.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 191 | `src\lib\components\command-center\Phase72ToolPanel.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 192 | `src\lib\components\legal\WorkspacePanel.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 193 | `src\lib\components\yorha\YoRHaCommandCenter.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 194 | `src\lib\components\LegalCaseManager.stories.ts` | 16 | 278 | 2 | **139 (P0)** | components | 1 | 4 |
| 195 | `src\lib\workers\rabbitmq-service-worker.ts` | 80 | 273 | 2 | **136.5 (P0)** | other | 1 | 3 |
| 196 | `src\lib\components\ui\modern\index.ts` | 16 | 273 | 2 | **136.5 (P0)** | components | 1 | 3 |
| 197 | `src\lib\schemas\file-upload.ts` | 9 | 271 | 2 | **135.5 (P0)** | database | 1 | 2 |
| 198 | `src\lib\machines\ai-computation-machine.ts` | 65 | 268 | 2 | **134 (P0)** | other | 1 | 11 |
| 199 | `src\lib\server\database-api-bridge.ts` | 98 | 397 | 3 | **132.33 (P0)** | other | 1 | 17 |
| 200 | `src\lib\components\agentic\AgentChat.svelte` | 16 | 263 | 2 | **131.5 (P0)** | components | 1 | 1 |
| 201 | `src\lib\components\yorha\YoRHaCommandCenter.stories.ts` | 15 | 263 | 2 | **131.5 (P0)** | components | 1 | 4 |
| 202 | `src\lib\cache\parallel-cache-orchestrator.ts` | 76 | 261 | 2 | **130.5 (P0)** | other | 1 | 3 |
| 203 | `src\lib\components\ui\alert\index.ts` | 15 | 258 | 2 | **129 (P0)** | components | 1 | 3 |
| 204 | `src\lib\machines\vectorJobMachine.ts` | 68 | 257 | 2 | **128.5 (P0)** | other | 1 | 7 |
| 205 | `src\lib\database\enhanced-schema.ts` | 13 | 384 | 3 | **128 (P0)** | database | 1 | 3 |
| 206 | `src\lib\proto\enhanced-rag.ts` | 69 | 255 | 2 | **127.5 (P0)** | other | 1 | 6 |
| 207 | `src\lib\server\rabbitmq.ts` | 72 | 254 | 2 | **127 (P0)** | other | 1 | 4 |
| 208 | `src\lib\server\z-schemas.ts` | 8 | 254 | 2 | **127 (P0)** | database | 1 | 4 |
| 209 | `src\lib\components\citations\CitationSaveForm.svelte` | 15 | 253 | 2 | **126.5 (P0)** | components | 1 | 2 |
| 210 | `src\lib\routing\index.ts` | 70 | 253 | 2 | **126.5 (P0)** | other | 1 | 5 |
| 211 | `src\lib\config\unified-config.ts` | 53 | 252 | 2 | **126 (P0)** | other | 1 | 15 |
| 212 | `src\lib\config\env.server.ts` | 83 | 372 | 3 | **124 (P0)** | other | 1 | 21 |
| 213 | `src\lib\server\redisRateLimit.ts` | 51 | 246 | 2 | **123 (P0)** | other | 1 | 15 |
| 214 | `src\lib\caching\multi-dimensional-image-cache.ts` | 62 | 244 | 2 | **122 (P0)** | other | 1 | 8 |
| 215 | `src\lib\components\legal-ai\StatuteResultsList.svelte` | 14 | 243 | 2 | **121.5 (P0)** | components | 1 | 3 |
| 216 | `src\lib\search\fuse-rag-search.ts` | 51 | 241 | 2 | **120.5 (P0)** | other | 1 | 14 |
| 217 | `src\lib\components\ChatPanel.svelte` | 14 | 238 | 2 | **119 (P0)** | components | 1 | 2 |
| 218 | `src\lib\components\evidence\EvidenceUploadModal.svelte` | 14 | 238 | 2 | **119 (P0)** | components | 1 | 2 |
| 219 | `src\lib\modules\auth-demo.ts` | 12 | 352 | 3 | **117.33 (P0)** | auth | 1 | 2 |
| 220 | `src\lib\components\legal-ai\LawsSearchPage.svelte` | 14 | 233 | 2 | **116.5 (P0)** | components | 1 | 1 |
| 221 | `src\lib\optimization\context7-mcp-integration.ts` | 60 | 233 | 2 | **116.5 (P0)** | other | 1 | 7 |
| 222 | `src\lib\cache\ssr-legal-api-cache.ts` | 58 | 232 | 2 | **116 (P0)** | other | 1 | 8 |
| 223 | `src\lib\middleware\tfjs-synthesizer.ts` | 63 | 232 | 2 | **116 (P0)** | other | 1 | 5 |
| 224 | `src\lib\services\enhanced-api-client.ts` | 59 | 230 | 2 | **115 (P0)** | other | 1 | 7 |
| 225 | `src\lib\components\realtime\index.ts` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 226 | `src\lib\components\three\yorha-ui\YoRHaUIExample.ts` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 227 | `src\lib\components\yorha\dashboard\SystemOverview.svelte` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 228 | `src\lib\server\embedding-cache-service.ts` | 65 | 228 | 2 | **114 (P0)** | other | 1 | 3 |
| 229 | `src\lib\webgpu\webgpu-similarity-engine.ts` | 63 | 227 | 2 | **113.5 (P0)** | other | 1 | 4 |
| 230 | `src\lib\components\case\SummaryEditor.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 231 | `src\lib\components\laws\Sidebar.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 232 | `src\lib\components\poi\POIStats.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 233 | `src\lib\__tests__\unified-schema.ts` | 7 | 222 | 2 | **111 (P0)** | database | 1 | 3 |
| 234 | `src\lib\server\config.ts` | 61 | 221 | 2 | **110.5 (P0)** | other | 1 | 4 |
| 235 | `src\lib\client\ai\webgpu-reranker-worker.ts` | 55 | 218 | 2 | **109 (P0)** | other | 1 | 7 |
| 236 | `src\lib\components\legal-ai\RelatedCasesPanel.svelte` | 13 | 218 | 2 | **109 (P0)** | components | 1 | 1 |
| 237 | `src\lib\components\yorha\evidence\EvidenceGrid.svelte` | 13 | 218 | 2 | **109 (P0)** | components | 1 | 1 |
| 238 | `src\lib\integrations\flashattention-multicore-bridge.ts` | 54 | 215 | 2 | **107.5 (P0)** | other | 1 | 7 |
| 239 | `src\lib\config\legal-priorities.ts` | 57 | 214 | 2 | **107 (P0)** | other | 1 | 5 |
| 240 | `src\lib\integrations\phase13-full-integration.ts` | 57 | 214 | 2 | **107 (P0)** | other | 1 | 5 |
| 241 | `src\lib\agents\error-recovery.ts` | 60 | 213 | 2 | **106.5 (P0)** | other | 1 | 3 |
| 242 | `src\lib\server\api-ssr-helpers.ts` | 60 | 213 | 2 | **106.5 (P0)** | other | 1 | 3 |
| 243 | `src\lib\client\ui\POIPhotoModal.svelte` | 56 | 211 | 2 | **105.5 (P0)** | other | 1 | 5 |
| 244 | `src\lib\evidence\simd-gpu-tiling-engine.ts` | 54 | 210 | 2 | **105 (P0)** | other | 1 | 6 |
| 245 | `src\lib\server\audit-logger.ts` | 54 | 210 | 2 | **105 (P0)** | other | 1 | 6 |
| 246 | `src\lib\components\ErrorStreamMonitor.svelte` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 247 | `src\lib\components\search\utils.ts` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 248 | `src\lib\components\ui\orchestrated\index.ts` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 249 | `src\lib\services\neo4jGraphService.ts` | 53 | 207 | 2 | **103.5 (P0)** | other | 1 | 6 |
| 250 | `src\lib\routing\route-registry.ts` | 48 | 207 | 2 | **103.5 (P0)** | other | 1 | 9 |
| 251 | `src\lib\server\authPolicy.ts` | 10 | 308 | 3 | **102.67 (P0)** | auth | 1 | 4 |
| 252 | `src\lib\server\rag-sync.ts` | 54 | 205 | 2 | **102.5 (P0)** | other | 1 | 5 |
| 253 | `src\lib\components\yorha\cases\CasesList.svelte` | 12 | 203 | 2 | **101.5 (P0)** | components | 1 | 1 |
| 254 | `src\lib\routing\dynamic-navigation.ts` | 58 | 202 | 2 | **101 (P0)** | other | 1 | 2 |
| 255 | `src\lib\server\evidence-processing.ts` | 58 | 202 | 2 | **101 (P0)** | other | 1 | 2 |
| 256 | `src\lib\proto\legal-ai-types.ts` | 48 | 197 | 2 | **98.5 (P0)** | other | 1 | 7 |
| 257 | `src\lib\gemma3Client.ts` | 51 | 196 | 2 | **98 (P0)** | other | 1 | 5 |
| 258 | `src\lib\optimization\simd-json-parser-bridge.ts` | 54 | 195 | 2 | **97.5 (P0)** | other | 1 | 3 |
| 259 | `src\lib\services\unified-legal-orchestrator.ts` | 47 | 194 | 2 | **97 (P0)** | other | 1 | 7 |
| 260 | `src\lib\components\WebGPUSimilarityDemo.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 261 | `src\lib\components\evidence\EvidenceConnections.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 262 | `src\lib\components\legal-ai\CitationLibraryPage.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 263 | `src\lib\components\ui\MarkdownSceneViewer.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 264 | `src\lib\config\production.ts` | 53 | 192 | 2 | **96 (P0)** | other | 1 | 3 |
| 265 | `src\lib\server\message-queue.ts` | 51 | 191 | 2 | **95.5 (P0)** | other | 1 | 4 |
| 266 | `src\lib\server\database-pool-service.ts` | 65 | 283 | 3 | **94.33 (P0)** | other | 1 | 14 |
| 267 | `src\lib\components\ClientGemmaDemo.svelte` | 11 | 188 | 2 | **94 (P0)** | components | 1 | 1 |
| 268 | `src\lib\components\case\CaseDetailPage.svelte` | 11 | 188 | 2 | **94 (P0)** | components | 1 | 1 |
| 269 | `src\lib\db\persons.ts` | 73 | 282 | 3 | **94 (P0)** | other | 1 | 9 |
| 270 | `src\lib\db\schema\rag-integration.ts` | 9 | 281 | 3 | **93.67 (P0)** | database | 1 | 4 |
| 271 | `src\lib\cache\xstate-cache-integration.ts` | 51 | 186 | 2 | **93 (P0)** | other | 1 | 3 |
| 272 | `src\lib\machines\ssr-qlora-chat-machine.ts` | 39 | 185 | 2 | **92.5 (P0)** | other | 1 | 10 |
| 273 | `src\lib\services\xstate-integration.ts` | 50 | 183 | 2 | **91.5 (P0)** | other | 1 | 3 |
| 274 | `src\lib\components\three\yorha-ui\components\YoRHaPanel3D.ts` | 10 | 183 | 2 | **91.5 (P0)** | components | 1 | 3 |
| 275 | `src\lib\utils\simd-json-parser.ts` | 13 | 179 | 2 | **89.5 (P0)** | utils | 1 | 1 |
| 276 | `src\lib\components\citations\CitationList.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 277 | `src\lib\components\dashboard\DocumentThumbnailTray.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 278 | `src\lib\components\ui\DiffViewer.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 279 | `src\lib\components\unified\index.ts` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 280 | `src\lib\types\case.ts` | 38 | 177 | 2 | **88.5 (P0)** | other | 1 | 9 |
| 281 | `src\lib\evidence-canvas\graph-layout-gpu.ts` | 46 | 176 | 2 | **88 (P0)** | other | 1 | 4 |
| 282 | `src\lib\types\api.ts` | 44 | 175 | 2 | **87.5 (P0)** | other | 1 | 5 |
| 283 | `src\lib\services\predictive-asset-engine.ts` | 39 | 175 | 2 | **87.5 (P0)** | other | 1 | 8 |
| 284 | `src\lib\components\SearchPanel.svelte` | 10 | 173 | 2 | **86.5 (P0)** | components | 1 | 1 |
| 285 | `src\lib\detective-mode\comprehensive-integration.svelte.ts` | 43 | 172 | 2 | **86 (P0)** | other | 1 | 5 |
| 286 | `src\lib\machines\agentShellMachine.mcp.ts` | 43 | 172 | 2 | **86 (P0)** | other | 1 | 5 |
| 287 | `src\lib\utils\fetch-with-timeout.ts` | 12 | 172 | 2 | **86 (P0)** | utils | 1 | 2 |
| 288 | `src\lib\server\rabbitmq-service.ts` | 46 | 171 | 2 | **85.5 (P0)** | other | 1 | 3 |
| 289 | `src\lib\compat\lokijs.ts` | 44 | 170 | 2 | **85 (P0)** | other | 1 | 4 |
| 290 | `src\lib\services\case-memory-engine.ts` | 37 | 169 | 2 | **84.5 (P0)** | other | 1 | 8 |
| 291 | `src\lib\optimization\copilot-index-optimizer.ts` | 35 | 168 | 2 | **84 (P0)** | other | 1 | 9 |
| 292 | `src\lib\server\schemas.ts` | 5 | 168 | 2 | **84 (P0)** | database | 1 | 3 |
| 293 | `src\lib\evidence-canvas\ai-suggestions-service.ts` | 43 | 167 | 2 | **83.5 (P0)** | other | 1 | 4 |
| 294 | `src\lib\db\enhanced-ai-schema.ts` | 8 | 249 | 3 | **83 (P0)** | database | 1 | 3 |
| 295 | `src\lib\orchestration\qlora-ollama-orchestrator.ts` | 41 | 166 | 2 | **83 (P0)** | other | 1 | 5 |
| 296 | `src\lib\integrations\full-stack-workflow.ts` | 29 | 165 | 2 | **82.5 (P0)** | other | 1 | 12 |
| 297 | `src\lib\components\layout\EvidenceBoardLayout.svelte` | 9 | 163 | 2 | **81.5 (P0)** | components | 1 | 2 |
| 298 | `src\lib\machines\legalAIMachine.ts` | 35 | 163 | 2 | **81.5 (P0)** | other | 1 | 8 |
| 299 | `src\lib\cache\glyph-shader-cache-bridge.ts` | 43 | 162 | 2 | **81 (P0)** | other | 1 | 3 |
| 300 | `src\lib\optimization\simd-json-index-processor.ts` | 39 | 160 | 2 | **80 (P0)** | other | 1 | 5 |
| 301 | `src\lib\server\utils\server-cache.ts` | 32 | 159 | 2 | **79.5 (P0)** | other | 1 | 9 |
| 302 | `src\lib\machines\rag-machine.ts` | 32 | 159 | 2 | **79.5 (P0)** | other | 1 | 9 |
| 303 | `src\lib\components\legal-ai\LinkMetadataForm.svelte` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 304 | `src\lib\components\ui\index.ts` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 305 | `src\lib\components\poi\POIPhotoGrid.svelte` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 306 | `src\lib\services\gemma-embeddings-service.ts` | 35 | 158 | 2 | **79 (P0)** | other | 1 | 7 |
| 307 | `src\lib\server\rag\cache.ts` | 36 | 156 | 2 | **78 (P0)** | other | 1 | 6 |
| 308 | `src\lib\machines\legal-case-machine-factory.ts` | 34 | 155 | 2 | **77.5 (P0)** | other | 1 | 7 |
| 309 | `src\lib\polyfills.ts` | 40 | 153 | 2 | **76.5 (P0)** | other | 1 | 3 |
| 310 | `src\lib\integrations\supercharged-legal-ai-server.ts` | 30 | 153 | 2 | **76.5 (P0)** | other | 1 | 9 |
| 311 | `src\lib\components\ui\dialog\DialogHeader.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 312 | `src\lib\components\poi\POIFaceMatchDialog.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 313 | `src\lib\components\ui\enhanced\Card.stories.ts` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 314 | `src\lib\components\yorha\SystemStatus.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 315 | `src\lib\server\services\vectorDBService.ts` | 63 | 222 | 3 | **74 (P0)** | other | 1 | 3 |
| 316 | `src\lib\server\legal-autocomplete.ts` | 39 | 145 | 2 | **72.5 (P0)** | other | 1 | 2 |
| 317 | `src\lib\server\ragStreamRegistry.ts` | 34 | 145 | 2 | **72.5 (P0)** | other | 1 | 5 |
| 318 | `src\lib\orchestration\autoencoder-context-switcher.ts` | 37 | 144 | 2 | **72 (P0)** | other | 1 | 3 |
| 319 | `src\lib\utils.ts` | 10 | 143 | 2 | **71.5 (P0)** | utils | 1 | 1 |
| 320 | `src\lib\components\PersonStatsPanel.svelte` | 7 | 143 | 2 | **71.5 (P0)** | components | 1 | 4 |
| 321 | `src\lib\ast\error-vectorizer.ts` | 33 | 142 | 2 | **71 (P0)** | other | 1 | 5 |
| 322 | `src\lib\server\db\schema-postgres.ts` | 7 | 212 | 3 | **70.67 (P0)** | database | 1 | 1 |
| 323 | `src\lib\ast\suggestion-engine.ts` | 36 | 141 | 2 | **70.5 (P0)** | other | 1 | 3 |
| 324 | `src\lib\server\charge-bundler.ts` | 39 | 140 | 2 | **70 (P0)** | other | 1 | 1 |
| 325 | `src\lib\machines\prefetchMachine.ts` | 32 | 139 | 2 | **69.5 (P0)** | other | 1 | 5 |
| 326 | `src\lib\components\ast\ErrorPanel.svelte` | 7 | 138 | 2 | **69 (P0)** | components | 1 | 3 |
| 327 | `src\lib\config\gemma3-legal-config.ts` | 36 | 136 | 2 | **68 (P0)** | other | 1 | 2 |
| 328 | `src\lib\orchestration\master-cognitive-hub.ts` | 31 | 136 | 2 | **68 (P0)** | other | 1 | 5 |
| 329 | `src\lib\json\fastjson.ts` | 34 | 135 | 2 | **67.5 (P0)** | other | 1 | 3 |
| 330 | `src\lib\db\dexie-integration.ts` | 46 | 201 | 3 | **67 (P0)** | other | 1 | 9 |
| 331 | `src\lib\components\laws\LawModal.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 332 | `src\lib\components\legal\StatuteActionPanel.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 333 | `src\lib\components\ui\SearchResults.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 334 | `src\lib\components\ui\ThemeToggle.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 335 | `src\lib\components\ui\gaming\n64\index.ts` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 336 | `src\lib\components\yorha\evidence\EvidenceStats.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 337 | `src\lib\server\init.ts` | 30 | 133 | 2 | **66.5 (P0)** | other | 1 | 5 |
| 338 | `src\lib\server\knowledge-cache.ts` | 35 | 133 | 2 | **66.5 (P0)** | other | 1 | 2 |
| 339 | `src\lib\command-center-manifest.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 340 | `src\lib\server\messaging\rabbitmq-service.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 341 | `src\lib\services\rabbitmq-service.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 342 | `src\lib\actors\xstate-actor-wrapper.ts` | 29 | 130 | 2 | **65 (P0)** | other | 1 | 5 |
| 343 | `src\lib\composables\legal-data-runes.svelte.ts` | 22 | 129 | 2 | **64.5 (P0)** | other | 1 | 9 |
| 344 | `src\lib\monitoring\legal-performance-metrics.ts` | 27 | 129 | 2 | **64.5 (P0)** | other | 1 | 6 |
| 345 | `src\lib\components\PersonList.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 346 | `src\lib\components\SlideTabs.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 347 | `src\lib\components\dashboard\QuickActionsPanel.svelte` | 7 | 128 | 2 | **64 (P0)** | quic-protocol | 1 | 1 |
| 348 | `src\lib\components\evidence\UploadProgressCard.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 349 | `src\lib\components\ui\IconContainerDemo.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 350 | `src\lib\components\ui\table\index.ts` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 351 | `src\lib\services\context7-multicore.ts` | 18 | 127 | 2 | **63.5 (P0)** | other | 1 | 11 |
| 352 | `src\lib\machines\document-upload-machine.ts` | 23 | 127 | 2 | **63.5 (P0)** | other | 1 | 8 |
| 353 | `src\lib\memory\visual-memory-palace-integration.ts` | 28 | 127 | 2 | **63.5 (P0)** | other | 1 | 5 |
| 354 | `src\lib\server\db\schema\error_clusters.ts` | 6 | 190 | 3 | **63.33 (P0)** | database | 1 | 2 |
| 355 | `src\lib\db\schema-jsonb.ts` | 6 | 190 | 3 | **63.33 (P0)** | database | 1 | 2 |
| 356 | `src\lib\config\rabbitmq-config.ts` | 26 | 126 | 2 | **63 (P0)** | other | 1 | 6 |
| 357 | `src\lib\integrations\revolutionary-multicore-bridge.ts` | 24 | 125 | 2 | **62.5 (P0)** | other | 1 | 7 |
| 358 | `src\lib\config\environment.ts` | 62 | 249 | 4 | **62.25 (P0)** | other | 1 | 9 |
| 359 | `src\lib\machines\ai-processing-machine.ts` | 27 | 124 | 2 | **62 (P0)** | other | 1 | 5 |
| 360 | `src\lib\db\schema\nes-command-center.ts` | 6 | 185 | 3 | **61.67 (P0)** | database | 1 | 1 |
| 361 | `src\lib\services\rag-ingestion-pipeline.ts` | 30 | 123 | 2 | **61.5 (P0)** | other | 1 | 3 |
| 362 | `src\lib\rag\demo-rag.ts` | 30 | 123 | 2 | **61.5 (P0)** | other | 1 | 3 |
| 363 | `src\lib\agents\error-handler.ts` | 28 | 122 | 2 | **61 (P0)** | other | 1 | 4 |
| 364 | `src\lib\server\ibm-vision.ts` | 28 | 122 | 2 | **61 (P0)** | other | 1 | 4 |
| 365 | `src\lib\server\production-logger.ts` | 23 | 122 | 2 | **61 (P0)** | other | 1 | 7 |
| 366 | `src\lib\components\ui\enhanced-bits.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 367 | `src\lib\components\laws\StatuteColumn.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 368 | `src\lib\components\ui\label\Label.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 369 | `src\lib\components\yorha\evidence\EvidenceFilters.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 370 | `src\lib\caching\reinforcement-learning-cache.ts` | 23 | 117 | 2 | **58.5 (P1)** | other | 1 | 6 |
| 371 | `src\lib\moogle\stage6-production-orchestrator.ts` | 23 | 117 | 2 | **58.5 (P1)** | other | 1 | 6 |
| 372 | `src\lib\modules\citations-manager.ts` | 21 | 116 | 2 | **58 (P1)** | other | 1 | 7 |
| 373 | `src\lib\config\endpoints.ts` | 24 | 115 | 2 | **57.5 (P1)** | other | 1 | 5 |
| 374 | `src\lib\config\env.ts` | 28 | 172 | 3 | **57.33 (P1)** | other | 1 | 14 |
| 375 | `src\lib\cache\parallel-cache-orchestrator-corrupted.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 376 | `src\lib\client\subscribeEmbedding.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 377 | `src\lib\components\ui\input\InputBits.svelte` | 6 | 113 | 2 | **56.5 (P1)** | components | 1 | 1 |
| 378 | `src\lib\components\poi\POIThreatBadge.svelte` | 6 | 113 | 2 | **56.5 (P1)** | components | 1 | 1 |
| 379 | `src\lib\integrations\full-system-orchestrator.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 380 | `src\lib\services\unified-vector-orchestrator.ts` | 25 | 113 | 2 | **56.5 (P1)** | other | 1 | 4 |
| 381 | `src\lib\machines\auth-machine.v5.ts` | 5 | 168 | 3 | **56 (P1)** | auth | 1 | 3 |
| 382 | `src\lib\services\featureFlags.ts` | 28 | 112 | 2 | **56 (P1)** | other | 1 | 2 |
| 383 | `src\lib\server\helpers\service-discovery.ts` | 16 | 111 | 2 | **55.5 (P1)** | other | 1 | 9 |
| 384 | `src\lib\errors\featureErrors.ts` | 24 | 110 | 2 | **55 (P1)** | other | 1 | 4 |
| 385 | `src\lib\server\cache\redis.ts` | 27 | 109 | 2 | **54.5 (P1)** | other | 1 | 2 |
| 386 | `src\lib\parsers\simd-json-parser.ts` | 22 | 109 | 2 | **54.5 (P1)** | other | 1 | 5 |
| 387 | `src\lib\api\clients\api-client.ts` | 25 | 108 | 2 | **54 (P1)** | other | 1 | 3 |
| 388 | `src\lib\webgpu\som-webgpu-cache.ts` | 25 | 108 | 2 | **54 (P1)** | other | 1 | 3 |
| 389 | `src\lib\machines\canvasSystem.ts` | 20 | 108 | 2 | **54 (P1)** | other | 1 | 6 |
| 390 | `src\lib\services\simd-redis-client.ts` | 18 | 107 | 2 | **53.5 (P1)** | other | 1 | 7 |
| 391 | `src\lib\services\ollama-integration-layer.ts` | 17 | 104 | 2 | **52 (P1)** | other | 1 | 7 |
| 392 | `src\lib\api\client.ts` | 27 | 104 | 2 | **52 (P1)** | other | 1 | 1 |
| 393 | `src\lib\wasm\llvm-wasm-bridge.ts` | 22 | 104 | 2 | **52 (P1)** | other | 1 | 4 |
| 394 | `src\lib\api\services\evidence-service.ts` | 25 | 103 | 2 | **51.5 (P1)** | other | 1 | 2 |
| 395 | `src\lib\components\charges\StatuteModal.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 396 | `src\lib\components\dashboard\StatisticsPanel.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 397 | `src\lib\components\editor\index.ts` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 398 | `src\lib\components\vision\EvidenceUpload.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 399 | `src\lib\machines\aiAssistantMachine.minimal.ts` | 20 | 103 | 2 | **51.5 (P1)** | other | 1 | 5 |
| 400 | `src\lib\machines\caseManagementMachine.ts` | 25 | 103 | 2 | **51.5 (P1)** | other | 1 | 2 |
| 401 | `src\lib\orchestration\index.ts` | 20 | 103 | 2 | **51.5 (P1)** | other | 1 | 5 |
| 402 | `src\lib\machines\aiAssistantMachine.stories.ts` | 18 | 102 | 2 | **51 (P1)** | other | 1 | 6 |
| 403 | `src\lib\observability\client-timing.ts` | 18 | 102 | 2 | **51 (P1)** | other | 1 | 6 |
| 404 | `src\lib\performance\optimizations.ts` | 22 | 99 | 2 | **49.5 (P1)** | other | 1 | 3 |
| 405 | `src\lib\server\rag\tag-persist.ts` | 22 | 99 | 2 | **49.5 (P1)** | other | 1 | 3 |
| 406 | `src\lib\components\ClientGemmaInference.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 407 | `src\lib\components\EvidenceCard.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 408 | `src\lib\components\legal-ai\CitationSearch.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 409 | `src\lib\components\citations\CitationCollections.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 410 | `src\lib\components\error-brain\PatchCard.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 411 | `src\lib\components\ui\TypewriterPrompt.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 412 | `src\lib\components\ui\enhanced-bits\index.ts` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 413 | `src\lib\components\ui\tabs-bits\index.ts` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 414 | `src\lib\actions\accessibility-actions.ts` | 23 | 97 | 2 | **48.5 (P1)** | other | 1 | 2 |
| 415 | `src\lib\server\errors.ts` | 21 | 96 | 2 | **48 (P1)** | other | 1 | 3 |
| 416 | `src\lib\config\local-llm.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 417 | `src\lib\error-brain\report-writer.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 418 | `src\lib\optimization\redis-som-cache.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 419 | `src\lib\server\fetch-wrapper.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 420 | `src\lib\database\schema.ts` | 4 | 141 | 3 | **47 (P1)** | database | 1 | 3 |
| 421 | `src\lib\services\flashattention2-rtx3060.ts` | 12 | 94 | 2 | **47 (P1)** | other | 1 | 8 |
| 422 | `src\lib\types\pipeline.ts` | 12 | 94 | 2 | **47 (P1)** | other | 1 | 8 |
| 423 | `src\lib\cache\nes-cache-orchestrator.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 424 | `src\lib\error-brain\analyze\ingest.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 425 | `src\lib\hooks\fastjson-server.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 426 | `src\lib\rag\query-helpers.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 427 | `src\lib\db\client-db.ts` | 27 | 139 | 3 | **46.33 (P1)** | other | 1 | 8 |
| 428 | `src\lib\optimization\simd-json-parser.ts` | 18 | 92 | 2 | **46 (P1)** | other | 1 | 4 |
| 429 | `src\lib\adapters\wasm-rabbitmq-bridge.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 430 | `src\lib\webgpu\webgpu-similarity-service.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 431 | `src\lib\error-brain\diff\apply.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 432 | `src\lib\services\enhanced-caching-revolutionary-bridge.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 433 | `src\lib\server\gemma3-vlm-embedder.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 434 | `src\lib\database\drizzle-compatibility-fix.ts` | 4 | 136 | 3 | **45.33 (P1)** | database | 1 | 2 |
| 435 | `src\lib\server\auth-helpers.ts` | 4 | 136 | 3 | **45.33 (P1)** | auth | 1 | 2 |
| 436 | `src\lib\actors\embedding-actor.ts` | 17 | 89 | 2 | **44.5 (P1)** | other | 1 | 4 |
| 437 | `src\lib\ClientEmbeddingGemma.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 438 | `src\lib\services\qdrant-client.ts` | 15 | 88 | 2 | **44 (P1)** | other | 1 | 5 |
| 439 | `src\lib\api\production-service-client.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 440 | `src\lib\clients\securityOrchestrator.ts` | 15 | 88 | 2 | **44 (P1)** | other | 1 | 5 |
| 441 | `src\lib\components\three\yorha-ui\index.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 442 | `src\lib\components\ui\bits\index.enhanced.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 443 | `src\lib\components\yorha\index.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 444 | `src\lib\components\yorha\cases\CaseFilters.svelte` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 445 | `src\lib\services\revolutionary-ai-integration.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 446 | `src\lib\client\db\loki-client.ts` | 26 | 131 | 3 | **43.67 (P1)** | other | 1 | 7 |
| 447 | `src\lib\machines\search-machine.ts` | 18 | 87 | 2 | **43.5 (P1)** | other | 1 | 3 |
| 448 | `src\lib\metrics\gpuMetricsBatcher.ts` | 18 | 87 | 2 | **43.5 (P1)** | other | 1 | 3 |
| 449 | `src\lib\wasm\vector-wasm-wrapper.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 450 | `src\lib\machines\chatMachine.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 451 | `src\lib\registry\texture-component-registry.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 452 | `src\lib\api\ollama.ts` | 19 | 85 | 2 | **42.5 (P1)** | other | 1 | 2 |
| 453 | `src\lib\client\workflow-event-stream.ts` | 14 | 85 | 2 | **42.5 (P1)** | other | 1 | 5 |
| 454 | `src\lib\error-brain\analyze\propose.ts` | 17 | 84 | 2 | **42 (P1)** | other | 1 | 3 |
| 455 | `src\lib\components\SimilarCasesPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 456 | `src\lib\components\ui\tabs\index.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 457 | `src\lib\components\RoutesList.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 458 | `src\lib\components\admin\TagSelector.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 459 | `src\lib\components\evidence\SummaryReviewPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 460 | `src\lib\components\evidence-graph\GraphToolbar.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 461 | `src\lib\components\laws\LawsDashboard.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 462 | `src\lib\components\legal-ai\CaseChatPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 463 | `src\lib\components\legal-ai\CaseStatuteLinks.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 464 | `src\lib\components\ui\IconContainer.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 465 | `src\lib\components\ui\button-variants.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 466 | `src\lib\components\ui\enhanced\button-variants.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 467 | `src\lib\components\ui\gaming\8bit\NES8BitButton.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 468 | `src\lib\components\ui\wrappers\bits\bits-overrides.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 469 | `src\lib\components\yorha\ContradictionReveal.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 470 | `src\lib\components\yorha\dashboard\EvidenceStats.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 471 | `src\lib\evidence-canvas\case-similarity-service.ts` | 20 | 83 | 2 | **41.5 (P1)** | other | 1 | 1 |
| 472 | `src\lib\server\minio.ts` | 15 | 83 | 2 | **41.5 (P1)** | other | 1 | 4 |
| 473 | `src\lib\config\multi-protocol-routes.ts` | 18 | 82 | 2 | **41 (P1)** | other | 1 | 2 |
| 474 | `src\lib\schemas\upload.ts` | 2 | 82 | 2 | **41 (P1)** | database | 1 | 2 |
| 475 | `src\lib\integration-status.ts` | 11 | 81 | 2 | **40.5 (P1)** | other | 1 | 6 |
| 476 | `src\lib\server\redis-client.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 477 | `src\lib\memory-palace\MemoryPalaceScene.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 478 | `src\lib\optimization\enhanced-vscode-extension-manager.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 479 | `src\lib\evidence\detective-analysis-engine.ts` | 14 | 80 | 2 | **40 (P1)** | other | 1 | 4 |
| 480 | `src\lib\services\uploadEvidenceService.ts` | 17 | 79 | 2 | **39.5 (P1)** | other | 1 | 2 |
| 481 | `src\lib\search\fuseStore.ts` | 12 | 79 | 2 | **39.5 (P1)** | other | 1 | 5 |
| 482 | `src\lib\phase78\routeErrorAssistantMachine.ts` | 15 | 78 | 2 | **39 (P1)** | other | 1 | 3 |
| 483 | `src\lib\services\api-client.ts` | 18 | 77 | 2 | **38.5 (P1)** | other | 1 | 1 |
| 484 | `src\lib\integrations\legal-ai-webgpu-bridge.ts` | 13 | 77 | 2 | **38.5 (P1)** | other | 1 | 4 |
| 485 | `src\lib\api\enhanced-case-api.ts` | 16 | 76 | 2 | **38 (P1)** | other | 1 | 2 |
| 486 | `src\lib\data\routes-config.ts` | 11 | 76 | 2 | **38 (P1)** | other | 1 | 5 |
| 487 | `src\lib\simd\simd-json-integration.ts` | 14 | 75 | 2 | **37.5 (P1)** | other | 1 | 3 |
| 488 | `src\lib\integrations\rabbitmq-tensor-integration.ts` | 14 | 75 | 2 | **37.5 (P1)** | other | 1 | 3 |
| 489 | `src\lib\server\neo4j-driver.ts` | 12 | 74 | 2 | **37 (P1)** | other | 1 | 4 |
| 490 | `src\lib\cache\MultiLayerCacheSystem.ts` | 10 | 73 | 2 | **36.5 (P1)** | other | 1 | 5 |
| 491 | `src\lib\components\legal-ai\StatuteSearchBar.svelte` | 3 | 73 | 2 | **36.5 (P1)** | components | 1 | 2 |
| 492 | `src\lib\server\queue.ts` | 15 | 73 | 2 | **36.5 (P1)** | other | 1 | 2 |
| 493 | `src\lib\embedding\embedding-adapter.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 494 | `src\lib\webgpu\webgpu-rag-service.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 495 | `src\lib\optimization\advanced-memory-optimizer.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 496 | `src\lib\api\utils\rate-limiter.ts` | 11 | 71 | 2 | **35.5 (P1)** | other | 1 | 4 |
| 497 | `src\lib\services\anonymous-session-manager.ts` | 16 | 71 | 2 | **35.5 (P1)** | other | 1 | 1 |
| 498 | `src\lib\demo\sampleData.ts` | 11 | 71 | 2 | **35.5 (P1)** | other | 1 | 4 |
| 499 | `src\lib\ClientEmbeddingService.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 500 | `src\lib\integrations\comprehensive-agent-orchestration.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 501 | `src\lib\logic\Report.ts` | 9 | 70 | 2 | **35 (P1)** | other | 1 | 5 |
| 502 | `src\lib\phase72\astVectorizer.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 503 | `src\lib\db\schema\aiHistory.ts` | 3 | 104 | 3 | **34.67 (P1)** | database | 1 | 1 |
| 504 | `src\lib\db\schema\gpuInferenceDemo.ts` | 3 | 104 | 3 | **34.67 (P1)** | database | 1 | 1 |
| 505 | `src\lib\phase72\command-center-restructure-tasks.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 506 | `src\lib\integrations\enhanced-rabbitmq-cuda-bridge.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 507 | `src\lib\logic\HistoryManager.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 508 | `src\lib\machines\ai-system-monitor.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 509 | `src\lib\db\queries\nes-command-center-archive.ts` | 25 | 103 | 3 | **34.33 (P1)** | other | 1 | 2 |
| 510 | `src\lib\services\search-service.ts` | 10 | 68 | 2 | **34 (P1)** | other | 1 | 4 |
| 511 | `src\lib\client\rerank-client.ts` | 15 | 68 | 2 | **34 (P1)** | other | 1 | 1 |
| 512 | `src\lib\components\SummaryEditor.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 513 | `src\lib\components\DocumentUploadMachineIntegration.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 514 | `src\lib\components\FilterPanel.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 515 | `src\lib\components\PersonProfile.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 516 | `src\lib\components\RouteInspectorModal.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 517 | `src\lib\components\admin\EvidenceDrawer.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 518 | `src\lib\components\detective\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 519 | `src\lib\components\evidence-graph\GraphSearchBox.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 520 | `src\lib\components\headless\evidence-canvas.svelte.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 521 | `src\lib\components\ui\checkbox\Checkbox.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 522 | `src\lib\components\poi\POIEditor.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 523 | `src\lib\components\poi\POIQuickActions.svelte` | 3 | 68 | 2 | **34 (P1)** | quic-protocol | 1 | 1 |
| 524 | `src\lib\components\subcomponents\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 525 | `src\lib\components\ui\checkbox\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 526 | `src\lib\components\ui\command\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 527 | `src\lib\components\ui\dialog\types.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 528 | `src\lib\components\ui\scroll-area\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 529 | `src\lib\components\ui\separator\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 530 | `src\lib\components\yorha\dashboard\ActiveCasesWidget.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 531 | `src\lib\ai\ollama-config.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 532 | `src\lib\rabbitmq\index.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 533 | `src\lib\phase72\routeAdapter.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 534 | `src\lib\optimization\docker-memory-optimizer-v2.ts` | 11 | 66 | 2 | **33 (P1)** | other | 1 | 3 |
| 535 | `src\lib\server\database-orchestrator.ts` | 22 | 99 | 3 | **33 (P1)** | other | 1 | 3 |
| 536 | `src\lib\components\MigrationTest.svelte` | 5 | 98 | 3 | **32.67 (P1)** | components | 1 | 1 |
| 537 | `src\lib\services\webgpu-texture-streaming.ts` | 9 | 65 | 2 | **32.5 (P1)** | other | 1 | 4 |
| 538 | `src\lib\server\adapter-ranking.ts` | 14 | 65 | 2 | **32.5 (P1)** | other | 1 | 1 |
| 539 | `src\lib\services\ollamaService.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 540 | `src\lib\client\search-client.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 541 | `src\lib\constants\local-llm-config.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 542 | `src\lib\routing\multidimensional-routing-matrix.server.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 543 | `src\lib\messaging\rabbitmq-legal-queue.ts` | 10 | 63 | 2 | **31.5 (P1)** | other | 1 | 3 |
| 544 | `src\lib\db\queries\nes-command-center.ts` | 22 | 94 | 3 | **31.33 (P1)** | other | 1 | 2 |
| 545 | `src\lib\services\enhanced-file-upload.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 546 | `src\lib\data\types.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 547 | `src\lib\llm\gemma.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 548 | `src\lib\machines\canvasEditorMachine.ts` | 13 | 62 | 2 | **31 (P1)** | other | 1 | 1 |
| 549 | `src\lib\middleware\featureFlagEnforcer.ts` | 13 | 62 | 2 | **31 (P1)** | other | 1 | 1 |
| 550 | `src\lib\webgpu\webgpu-polyfill.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 551 | `src\lib\config\database.ts` | 18 | 92 | 3 | **30.67 (P1)** | other | 1 | 4 |
| 552 | `src\lib\core\logic\legal-ai-logic.ts` | 7 | 59 | 2 | **29.5 (P2)** | other | 1 | 4 |
| 553 | `src\lib\optimization\ultra-json-processor.ts` | 7 | 59 | 2 | **29.5 (P2)** | other | 1 | 4 |
| 554 | `src\lib\components\alerts\AlertsPanel.svelte` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 555 | `src\lib\components\evidence-graph\GraphView.svelte` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 556 | `src\lib\components\poi\POICard.svelte` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 557 | `src\lib\components\ui\gaming\constants\gaming-constants-minimal.ts` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 558 | `src\lib\config\redis-config.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 559 | `src\lib\error-brain\state.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 560 | `src\lib\error-brain\diff\emit-unified.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 561 | `src\lib\server\env-helper.ts` | 18 | 87 | 3 | **29 (P2)** | other | 1 | 3 |
| 562 | `src\lib\server\rag\qdrant.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 563 | `src\lib\client\ai\webgpu-reranker.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 564 | `src\lib\machines\aiSummaryMachine.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 565 | `src\lib\machines\idle-detection-rabbitmq-machine.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 566 | `src\lib\server\redis-streams.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 567 | `src\lib\components\evidence\EvidenceUploadButton.svelte` | 4 | 83 | 3 | **27.67 (P2)** | components | 1 | 1 |
| 568 | `src\lib\config\ollama.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 569 | `src\lib\webgpu\texture-streaming.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 570 | `src\lib\server\rag-query.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 571 | `src\lib\server\rateLimit.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 572 | `src\lib\auth\session.ts` | 2 | 82 | 3 | **27.33 (P2)** | auth | 1 | 2 |
| 573 | `src\lib\types\database.ts` | 16 | 81 | 3 | **27 (P2)** | other | 1 | 3 |
| 574 | `src\lib\config\production-config.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 575 | `src\lib\services\tensor-upscaler-service.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 576 | `src\lib\server\evidence-stream.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 577 | `src\lib\components\AIAssistant.svelte.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 578 | `src\lib\components\CaseDetailPage.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 579 | `src\lib\components\ComprehensiveUploadAnalytics.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 580 | `src\lib\components\CrewAIOrchestrationDemo.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 581 | `src\lib\components\EvidenceConnections.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 582 | `src\lib\components\Navigation.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 583 | `src\lib\components\NesModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 584 | `src\lib\components\Phase72ErrorBrain.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 585 | `src\lib\components\RAGSearchComponent.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 586 | `src\lib\components\SearchBox.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 587 | `src\lib\components\SmartEvidenceRecommendations.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 588 | `src\lib\components\ai\ContextualEvidenceChatModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 589 | `src\lib\components\ai\PatternRecognition.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 590 | `src\lib\components\ai\cognitive\CognitiveDocumentationHub.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 591 | `src\lib\components\canvas\FabricCanvas.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 592 | `src\lib\components\case\VerificationDisclaimer.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 593 | `src\lib\components\charges\CaseTimeline.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 594 | `src\lib\components\command-center\AllRoutesExplorer.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 595 | `src\lib\components\error-brain\ErrorBrainModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 596 | `src\lib\components\evidence\EvidenceNode.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 597 | `src\lib\components\evidence\RelationshipInspector.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 598 | `src\lib\components\evidence-editor\AIAssistantPanel.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 599 | `src\lib\components\keyboard\KeyboardShortcuts.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 600 | `src\lib\components\laws\LawSearchPanel.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 601 | `src\lib\components\navigation\ConsolidatedNavigation.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 602 | `src\lib\components\notes\LegalNotesManager.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 603 | `src\lib\components\three\yorha-ui\YoRHaAntiAliasing3D.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 604 | `src\lib\components\ui\bits\StatCard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 605 | `src\lib\components\ui\select\types.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 606 | `src\lib\components\vector\VectorIntelligenceDemo.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 607 | `src\lib\components\vision\SimilarityHeatmap.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 608 | `src\lib\components\vision\ZoomEnhanceViewer.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 609 | `src\lib\components\visualizations\WebGPUEvidenceGraphVisualization\index.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 610 | `src\lib\components\yorha\DetectiveModeDashboard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 611 | `src\lib\components\yorha\EvidenceBoard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 612 | `src\lib\components\yorha\dashboard\GPUMetrics.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 613 | `src\lib\utils\accessibility.ts` | 2 | 52 | 2 | **26 (P2)** | utils | 1 | 2 |
| 614 | `src\lib\features\evidence-command-center\EvidenceBoardPane.svelte` | 8 | 52 | 2 | **26 (P2)** | other | 1 | 2 |
| 615 | `src\lib\rag\som-intent.ts` | 8 | 52 | 2 | **26 (P2)** | other | 1 | 2 |
| 616 | `src\lib\auth\auth-store.svelte.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 617 | `src\lib\components\auth\index.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 618 | `src\lib\server\auth-utils.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 619 | `src\lib\server\db-shim.ts` | 2 | 77 | 3 | **25.67 (P2)** | database | 1 | 1 |
| 620 | `src\lib\types\generics.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 621 | `src\lib\services\autogen-service.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 622 | `src\lib\machines\system-monitor.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 623 | `src\lib\shared\quantize.ts` | 9 | 50 | 2 | **25 (P2)** | other | 1 | 1 |
| 624 | `src\lib\server\embedding-gateway.ts` | 7 | 49 | 2 | **24.5 (P2)** | other | 1 | 2 |
| 625 | `src\lib\machines\metrics.ts` | 7 | 49 | 2 | **24.5 (P2)** | other | 1 | 2 |
| 626 | `src\lib\services\documentApi.ts` | 5 | 48 | 2 | **24 (P2)** | other | 1 | 3 |
| 627 | `src\lib\server\docling.ts` | 8 | 47 | 2 | **23.5 (P2)** | other | 1 | 1 |
| 628 | `src\lib\types.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 629 | `src\lib\animations\gpu-animations.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 630 | `src\lib\api\services\case-service.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 631 | `src\lib\integrations\context7-wasm-mock.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 632 | `src\lib\machines\case-workflow-machine.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 633 | `src\lib\optimization\json-wasm-optimizer.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 634 | `src\lib\types\search.types.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 635 | `src\lib\evidence-canvas\evidence-canvas.svelte` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 636 | `src\lib\orchestration\complete-legal-ai-orchestrator.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 637 | `src\lib\server\onnx.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 638 | `src\lib\detective-mode\comprehensive-integration.ts` | 5 | 43 | 2 | **21.5 (P2)** | other | 1 | 2 |
| 639 | `src\lib\api\recommendation-engine.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 640 | `src\lib\services\end-to-end-api-integration.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 641 | `src\lib\server\yolo.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 642 | `src\lib\server\document-processor.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 643 | `src\lib\api\services\job-cache-service.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 644 | `src\lib\composables\ui-state-runes.svelte.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 645 | `src\lib\error-brain\run-id.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 646 | `src\lib\machines\ai-analysis-machine.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 647 | `src\lib\machines\userTypingStateMachine.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 648 | `src\lib\server\vector\vectorService.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 649 | `src\lib\server\thread-safe-postgres.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 650 | `src\lib\database\connection.ts` | 7 | 59 | 3 | **19.67 (P2)** | other | 1 | 4 |
| 651 | `src\lib\server\env.server.ts` | 7 | 59 | 3 | **19.67 (P2)** | other | 1 | 4 |
| 652 | `src\lib\mcp-rabbitmq-redis-docs.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 653 | `src\lib\components\SearchBar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 654 | `src\lib\components\Dialog\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 655 | `src\lib\components\admin\AdminLayout.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 656 | `src\lib\components\ai\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 657 | `src\lib\components\ai\PatternDetectionInterface\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 658 | `src\lib\components\ast\CodeEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 659 | `src\lib\components\editors\LegalRichTextEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 660 | `src\lib\components\evidence-graph\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 661 | `src\lib\components\laws\LegalAutocomplete.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 662 | `src\lib\components\legal-ai\LegalAILayout.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 663 | `src\lib\components\nes\NesModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 664 | `src\lib\components\ui\core\Textarea.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 665 | `src\lib\components\poi\POIProfile.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 666 | `src\lib\components\search\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 667 | `src\lib\components\search\types.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 668 | `src\lib\components\ui\EvidenceCard\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 669 | `src\lib\components\ui\gaming\types\gaming-types-minimal.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 670 | `src\lib\components\ui\gaming\effects\audio-effects.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 671 | `src\lib\components\yorha\CrossExaminationAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 672 | `src\lib\components\yorha\evidence\EvidenceComparisonOverlay.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 673 | `src\lib\features\featureFlags.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 674 | `src\lib\llm\tauri-llm.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 675 | `src\lib\polyfills\sveltekit2-universal-polyfill.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 676 | `src\lib\server\ocr\hybrid.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 677 | `src\lib\core\logic\case-logic.ts` | 3 | 37 | 2 | **18.5 (P2)** | other | 1 | 2 |
| 678 | `src\lib\server\chat\ssr-qlora-gpu-chat-assistant.ts` | 3 | 37 | 2 | **18.5 (P2)** | other | 1 | 2 |
| 679 | `src\lib\search\local-pipeline.ts` | 3 | 37 | 2 | **18.5 (P2)** | other | 1 | 2 |
| 680 | `src\lib\types\index.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 681 | `src\lib\api\services\health-service.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 682 | `src\lib\utils\debounce.ts` | 1 | 35 | 2 | **17.5 (P2)** | utils | 1 | 1 |
| 683 | `src\lib\embedding\client-embedding-generator.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 684 | `src\lib\features\evidence-command-center\CommandCenterShell.svelte` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 685 | `src\lib\features\evidence-command-center\EvidenceGraphPane.svelte` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 686 | `src\lib\integrations\redis-webgpu-simd-integration.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 687 | `src\lib\machines\enhanced-legal-case-machine.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 688 | `src\lib\mcp\cases.mcp.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 689 | `src\lib\server\redis.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 690 | `src\lib\services\hybrid-vector-search.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 691 | `src\lib\server\evidence-detective.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 692 | `src\lib\server\logger.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 693 | `src\lib\server\llm\contextual-chat.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 694 | `src\lib\server\rate-limit.ts` | 4 | 35 | 2 | **17.5 (P2)** | other | 1 | 1 |
| 695 | `src\lib\services\comprehensive-ollama-summarizer.ts` | 2 | 34 | 2 | **17 (P2)** | other | 1 | 2 |
| 696 | `src\lib\mcp-memory-read-graph.ts` | 2 | 34 | 2 | **17 (P2)** | other | 1 | 2 |
| 697 | `src\lib\services\recommendation-engine.ts` | 2 | 34 | 2 | **17 (P2)** | other | 1 | 2 |
| 698 | `src\lib\phase14\server\queues\logWorker.ts` | 2 | 34 | 2 | **17 (P2)** | other | 1 | 2 |
| 699 | `src\lib\components\auth\RegisterModal\index.ts` | 1 | 50 | 3 | **16.67 (P2)** | auth | 1 | 1 |
| 700 | `src\lib\server\db\schema\error_events.ts` | 1 | 50 | 3 | **16.67 (P2)** | database | 1 | 1 |
| 701 | `src\lib\server\utils\endpoints.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 702 | `src\lib\services\hybrid-vector-operations.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 703 | `src\lib\api\services\clients\api-client.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 704 | `src\lib\client\actors\llmStreamActor.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 705 | `src\lib\error-brain\diff\guards.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 706 | `src\lib\features\evidence-command-center\EvidenceChatPane.svelte` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 707 | `src\lib\types\vector-jobs.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 708 | `src\lib\phase72\routeGraphAdapter.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 709 | `src\lib\server\ocr\tesseract.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 710 | `src\lib\server\ollama.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 711 | `src\lib\server\ollama-utils.ts` | 3 | 32 | 2 | **16 (P2)** | other | 1 | 1 |
| 712 | `src\context7-multicore-error-analysis.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 713 | `src\lib\agents\rag-sync-agent.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 714 | `src\lib\api\documentApi.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 715 | `src\lib\api\enhanced-rest-architecture.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 716 | `src\lib\api\search-client.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 717 | `src\lib\api\services\embedding-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 718 | `src\lib\api\services\metrics-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 719 | `src\lib\api\services\note-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 720 | `src\lib\api\services\search-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 721 | `src\lib\api\services\vector-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 722 | `src\lib\server\redis-service.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 723 | `src\lib\client\streaming-handler.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 724 | `src\lib\client\api\analytics.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 725 | `src\lib\client\ui\POIPhotoUploader.svelte` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 726 | `src\lib\server\clients\ollama.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 727 | `src\lib\types\user.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 728 | `src\lib\types\canvas.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 729 | `src\lib\config\enhanced-ai-config.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 730 | `src\lib\config\ollama-config.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 731 | `src\lib\evidence-canvas\case-suggestion-modal.svelte` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 732 | `src\lib\forms\enhanced-cache-forms.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 733 | `src\lib\machines\case-creation-machine.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 734 | `src\lib\server\gpu-thread-coordinator.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 735 | `src\lib\server\embeddings.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 736 | `src\lib\server\gpu-thread-coordinator-broken.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 737 | `src\lib\server\keyword-extractor.ts` | 2 | 29 | 2 | **14.5 (P2)** | other | 1 | 1 |
| 738 | `src\lib\db\pool.ts` | 4 | 40 | 3 | **13.33 (P2)** | other | 1 | 2 |
| 739 | `src\lib\db\vector-operations.ts` | 4 | 40 | 3 | **13.33 (P2)** | other | 1 | 2 |
| 740 | `src\hooks.server.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 741 | `src\test-error.svelte` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 742 | `src\lib\server\embedding-service.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 743 | `src\lib\tauri.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 744 | `src\lib\actions\accessibleClick.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 745 | `src\lib\types\api-contracts.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 746 | `src\lib\api\legal-ai-api-client.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 747 | `src\lib\api\ollama-client.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 748 | `src\lib\api\submitWithProgress.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 749 | `src\lib\api\clients\sse-client.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 750 | `src\lib\api\clients\websocket-client.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 751 | `src\lib\api\services\ollama-service.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 752 | `src\lib\api\utils\api-helpers.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 753 | `src\lib\caching\reinforcement-learning-cache.server.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 754 | `src\lib\types\sharedTypes.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 755 | `src\lib\client\rerank.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 756 | `src\lib\config\gpu-rag-config.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 757 | `src\lib\evidence-canvas\graph-control-panel.svelte` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 758 | `src\lib\features\evidence-command-center\EvidenceCommandPalette.svelte` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 759 | `src\lib\services\enhanced-caching-service.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 760 | `src\lib\logic\caseWorkflow.svelte.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 761 | `src\lib\machines\sessionMachine.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 762 | `src\lib\models\LegalDocument.svelte.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 763 | `src\lib\optimization\comprehensive-orchestrator.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 764 | `src\lib\orchestration\cognitive-routing-orchestrator.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 765 | `src\lib\phase14\server\queues\logQueue.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 766 | `src\lib\types\ai-chat.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 767 | `src\lib\server\endpoints.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 768 | `src\lib\server\ollama-service.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 769 | `src\lib\server\ocr.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 770 | `src\lib\server\rag-pipeline.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 771 | `src\lib\server\rag.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 772 | `src\lib\server\server.ts` | 1 | 26 | 2 | **13 (P2)** | other | 1 | 1 |
| 773 | `src\lib\components\chat\ChatAuthPrompt.svelte` | 1 | 38 | 3 | **12.67 (P2)** | components | 1 | 1 |
| 774 | `src\lib\server\database\connection.ts` | 2 | 34 | 3 | **11.33 (P2)** | other | 1 | 2 |
| 775 | `src\lib\db\client.ts` | 3 | 32 | 3 | **10.67 (P2)** | other | 1 | 1 |
| 776 | `src\lib\services\indexeddb-service.ts` | 2 | 29 | 3 | **9.67 (P2)** | other | 1 | 1 |
| 777 | `src\lib\env\index.ts` | 1 | 26 | 4 | **6.5 (P2)** | other | 1 | 1 |
| 778 | `src\lib\env\public.ts` | 1 | 26 | 4 | **6.5 (P2)** | other | 1 | 1 |

## 📋 Detailed Breakdown (Top 20)

### 1. src\lib\cache\loki-redis-integration-fixed.ts
- **Errors:** 762
- **Category:** other
- **Impact:** 2354
- **Risk:** 2
- **Impact/Risk:** 1177
- **Cluster Size:** 10 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 758 occurrences
- `duplicate-identifier`: 4 occurrences

### 2. src\lib\cache\loki-redis-integration.ts
- **Errors:** 745
- **Category:** other
- **Impact:** 2288
- **Risk:** 2
- **Impact/Risk:** 1144
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 742 occurrences
- `duplicate-identifier`: 3 occurrences

### 3. src\lib\cache\headless-ui-cache.ts
- **Errors:** 563
- **Category:** other
- **Impact:** 1752
- **Risk:** 2
- **Impact/Risk:** 876
- **Cluster Size:** 9 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 558 occurrences
- `duplicate-identifier`: 5 occurrences

### 4. src\lib\cache\gpu-leftover-cache.ts
- **Errors:** 558
- **Category:** other
- **Impact:** 1747
- **Risk:** 2
- **Impact/Risk:** 873.5
- **Cluster Size:** 11 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 554 occurrences
- `duplicate-identifier`: 4 occurrences

### 5. src\lib\auth\roles.ts
- **Errors:** 93
- **Category:** auth
- **Impact:** 2549
- **Risk:** 3
- **Impact/Risk:** 849.67
- **Cluster Size:** 4 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 93 occurrences

### 6. src\lib\cache\chr-rom-pattern-cache.ts
- **Errors:** 523
- **Category:** other
- **Impact:** 1622
- **Risk:** 2
- **Impact/Risk:** 811
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 519 occurrences
- `duplicate-identifier`: 4 occurrences

### 7. src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts
- **Errors:** 100
- **Category:** components
- **Impact:** 1578
- **Risk:** 2
- **Impact/Risk:** 789
- **Cluster Size:** 12 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 100 occurrences

### 8. src\lib\stores\app-store.ts
- **Errors:** 86
- **Category:** stores
- **Impact:** 1576
- **Risk:** 2
- **Impact/Risk:** 788
- **Cluster Size:** 2 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 79 occurrences
- `duplicate-identifier`: 7 occurrences

### 9. src\lib\components\POIPhotoModal.svelte
- **Errors:** 101
- **Category:** components
- **Impact:** 1563
- **Risk:** 2
- **Impact/Risk:** 781.5
- **Cluster Size:** 6 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 101 occurrences

### 10. src\lib\api\services\auth-service.ts
- **Errors:** 84
- **Category:** auth
- **Impact:** 2301
- **Risk:** 3
- **Impact/Risk:** 767
- **Cluster Size:** 3 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 84 occurrences

### 11. src\lib\3d\memory-palace-engine.ts
- **Errors:** 484
- **Category:** other
- **Impact:** 1505
- **Risk:** 2
- **Impact/Risk:** 752.5
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 484 occurrences

### 12. src\lib\components\ui\gaming\core\GamingEvolutionManager.ts
- **Errors:** 94
- **Category:** components
- **Impact:** 1483
- **Risk:** 2
- **Impact/Risk:** 741.5
- **Cluster Size:** 11 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 94 occurrences

### 13. src\lib\components\ui\layout\index.ts
- **Errors:** 84
- **Category:** components
- **Impact:** 1373
- **Risk:** 2
- **Impact/Risk:** 686.5
- **Cluster Size:** 19 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 76 occurrences
- `duplicate-identifier`: 8 occurrences

### 14. src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts
- **Errors:** 83
- **Category:** components
- **Impact:** 1323
- **Risk:** 2
- **Impact/Risk:** 661.5
- **Cluster Size:** 12 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 83 occurrences

### 15. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts
- **Errors:** 85
- **Category:** components
- **Impact:** 1318
- **Risk:** 2
- **Impact/Risk:** 659
- **Cluster Size:** 5 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 77 occurrences
- `duplicate-identifier`: 8 occurrences

### 16. src\lib\memory\nes-memory-architecture.ts
- **Errors:** 390
- **Category:** other
- **Impact:** 1228
- **Risk:** 2
- **Impact/Risk:** 614
- **Cluster Size:** 8 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 381 occurrences
- `duplicate-identifier`: 9 occurrences

### 17. src\lib\server\auth.ts
- **Errors:** 67
- **Category:** auth
- **Impact:** 1837
- **Risk:** 3
- **Impact/Risk:** 612.33
- **Cluster Size:** 2 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 67 occurrences

### 18. src\lib\server\lokiHybridStore.ts
- **Errors:** 388
- **Category:** other
- **Impact:** 1222
- **Risk:** 2
- **Impact/Risk:** 611
- **Cluster Size:** 8 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 387 occurrences
- `duplicate-identifier`: 1 occurrences

### 19. src\lib\db\schema-example-legal.ts
- **Errors:** 66
- **Category:** database
- **Impact:** 1830
- **Risk:** 3
- **Impact/Risk:** 610
- **Cluster Size:** 6 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 54 occurrences
- `duplicate-identifier`: 12 occurrences

### 20. src\lib\utils\type-guards.ts
- **Errors:** 85
- **Category:** utils
- **Impact:** 1218
- **Risk:** 2
- **Impact/Risk:** 609
- **Cluster Size:** 36 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 85 occurrences

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)
- [ ] `src\lib\cache\loki-redis-integration-fixed.ts` (762 errors, impact/risk: 1177)
- [ ] `src\lib\cache\loki-redis-integration.ts` (745 errors, impact/risk: 1144)
- [ ] `src\lib\cache\headless-ui-cache.ts` (563 errors, impact/risk: 876)
- [ ] `src\lib\cache\gpu-leftover-cache.ts` (558 errors, impact/risk: 873.5)
- [ ] `src\lib\auth\roles.ts` (93 errors, impact/risk: 849.67)
- [ ] `src\lib\cache\chr-rom-pattern-cache.ts` (523 errors, impact/risk: 811)
- [ ] `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` (100 errors, impact/risk: 789)
- [ ] `src\lib\stores\app-store.ts` (86 errors, impact/risk: 788)
- [ ] `src\lib\components\POIPhotoModal.svelte` (101 errors, impact/risk: 781.5)
- [ ] `src\lib\api\services\auth-service.ts` (84 errors, impact/risk: 767)

### P1 (High - Impact 50-100)
- [ ] `src\lib\components\ui\enhanced-bits.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\components\laws\StatuteColumn.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\components\ui\label\Label.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\components\yorha\evidence\EvidenceFilters.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\caching\reinforcement-learning-cache.ts` (23 errors, impact/risk: 58.5)
- [ ] `src\lib\moogle\stage6-production-orchestrator.ts` (23 errors, impact/risk: 58.5)
- [ ] `src\lib\modules\citations-manager.ts` (21 errors, impact/risk: 58)
- [ ] `src\lib\config\endpoints.ts` (24 errors, impact/risk: 57.5)
- [ ] `src\lib\config\env.ts` (28 errors, impact/risk: 57.33)
- [ ] `src\lib\cache\parallel-cache-orchestrator-corrupted.ts` (20 errors, impact/risk: 56.5)

### P2 (Medium - Impact < 50)
- 227 files remaining

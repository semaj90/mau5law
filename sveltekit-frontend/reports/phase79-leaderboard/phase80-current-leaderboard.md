# Phase 79: Error Leaderboard (phase80-current)

**Generated:** 2025-12-26T17:32:52.082Z
**Total Errors:** 28524
**Affected Files:** 1641
**Top N:** 1000

---

## 📊 By Architecture Component

- **other**: 21872 errors
- **components**: 4804 errors
- **auth**: 543 errors
- **utils**: 520 errors
- **database**: 467 errors
- **stores**: 284 errors
- **quic-protocol**: 34 errors

## 🔍 By Error Pattern

- **unknown**: 27923 occurrences
- **duplicate-identifier**: 599 occurrences
- **env-type-declarations**: 2 occurrences

## 🎯 Top 1000 Files by Impact Score

| Rank | File | Errors | Impact | Risk | Impact/Risk | Category | Packages | Cluster |
|------|------|--------|--------|------|-------------|----------|----------|---------|
| 1 | `at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js` | 1094 | 8770 | 2 | **4385 (P0)** | other | 1 | 1094 |
| 2 | `src\lib\cache\loki-redis-integration-fixed.ts` | 762 | 2354 | 2 | **1177 (P0)** | other | 1 | 10 |
| 3 | `src\lib\cache\loki-redis-integration.ts` | 745 | 2288 | 2 | **1144 (P0)** | other | 1 | 7 |
| 4 | `src\lib\cache\headless-ui-cache.ts` | 563 | 1752 | 2 | **876 (P0)** | other | 1 | 9 |
| 5 | `src\lib\cache\gpu-leftover-cache.ts` | 558 | 1747 | 2 | **873.5 (P0)** | other | 1 | 11 |
| 6 | `src\lib\auth\roles.ts` | 93 | 2549 | 3 | **849.67 (P0)** | auth | 1 | 4 |
| 7 | `src\lib\cache\chr-rom-pattern-cache.ts` | 523 | 1622 | 2 | **811 (P0)** | other | 1 | 7 |
| 8 | `src\lib\components\POIPhotoModal.svelte` | 102 | 1578 | 2 | **789 (P0)** | components | 1 | 6 |
| 9 | `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` | 100 | 1578 | 2 | **789 (P0)** | components | 1 | 12 |
| 10 | `src\lib\stores\app-store.ts` | 86 | 1576 | 2 | **788 (P0)** | stores | 1 | 2 |
| 11 | `src\lib\api\services\auth-service.ts` | 84 | 2301 | 3 | **767 (P0)** | auth | 1 | 3 |
| 12 | `src\lib\3d\memory-palace-engine.ts` | 484 | 1505 | 2 | **752.5 (P0)** | other | 1 | 7 |
| 13 | `src\lib\components\ui\gaming\core\GamingEvolutionManager.ts` | 94 | 1483 | 2 | **741.5 (P0)** | components | 1 | 11 |
| 14 | `src\lib\components\ui\layout\index.ts` | 84 | 1373 | 2 | **686.5 (P0)** | components | 1 | 19 |
| 15 | `src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts` | 83 | 1323 | 2 | **661.5 (P0)** | components | 1 | 12 |
| 16 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` | 85 | 1318 | 2 | **659 (P0)** | components | 1 | 5 |
| 17 | `src\lib\memory\nes-memory-architecture.ts` | 390 | 1228 | 2 | **614 (P0)** | other | 1 | 8 |
| 18 | `src\lib\server\auth.ts` | 67 | 1837 | 3 | **612.33 (P0)** | auth | 1 | 2 |
| 19 | `src\lib\server\lokiHybridStore.ts` | 388 | 1222 | 2 | **611 (P0)** | other | 1 | 8 |
| 20 | `src\lib\db\schema-example-legal.ts` | 66 | 1830 | 3 | **610 (P0)** | database | 1 | 6 |
| 21 | `src\lib\utils\type-guards.ts` | 85 | 1218 | 2 | **609 (P0)** | utils | 1 | 36 |
| 22 | `src\lib\stores\dashboard\GrpcStatusAdapter.ts` | 64 | 1185 | 2 | **592.5 (P0)** | stores | 1 | 3 |
| 23 | `src\lib\services\cognitive-cache-integration.ts` | 367 | 1164 | 2 | **582 (P0)** | other | 1 | 9 |
| 24 | `src\lib\components\NESGraphRenderer.svelte` | 75 | 1158 | 2 | **579 (P0)** | components | 1 | 3 |
| 25 | `src\lib\middleware\authSeparation.ts` | 63 | 1734 | 3 | **578 (P0)** | auth | 1 | 3 |
| 26 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts` | 74 | 1153 | 2 | **576.5 (P0)** | components | 1 | 5 |
| 27 | `src\lib\components\ui\context-menu\index.ts` | 69 | 1133 | 2 | **566.5 (P0)** | components | 1 | 16 |
| 28 | `src\lib\components\RouteInspectorWorking.svelte` | 71 | 1103 | 2 | **551.5 (P0)** | components | 1 | 4 |
| 29 | `src\lib\utils\buffer-conversion.ts` | 84 | 1086 | 2 | **543 (P0)** | utils | 1 | 12 |
| 30 | `src\lib\stores.svelte.ts` | 58 | 1082 | 2 | **541 (P0)** | stores | 1 | 4 |
| 31 | `src\lib\ast\ast-processor.ts` | 328 | 1057 | 2 | **528.5 (P0)** | other | 1 | 11 |
| 32 | `src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts` | 65 | 1048 | 2 | **524 (P0)** | components | 1 | 11 |
| 33 | `src\lib\components\ui\enhanced\Button.stories.ts` | 64 | 1048 | 2 | **524 (P0)** | components | 1 | 14 |
| 34 | `src\lib\test-utils\mocks.ts` | 328 | 1037 | 2 | **518.5 (P0)** | other | 1 | 7 |
| 35 | `src\lib\components\yorha\JudicialAnalysisAgent.svelte` | 62 | 963 | 2 | **481.5 (P0)** | components | 1 | 3 |
| 36 | `src\lib\auth\auth-store.ts` | 51 | 1410 | 3 | **470 (P0)** | auth | 1 | 3 |
| 37 | `src\lib\middleware\binary-encoding.ts` | 256 | 936 | 2 | **468 (P0)** | other | 1 | 30 |
| 38 | `src\lib\components\three\yorha-ui\api\YoRHaAPIClient.ts` | 59 | 928 | 2 | **464 (P0)** | components | 1 | 5 |
| 39 | `src\lib\cache\multi-layer-cache.ts` | 291 | 921 | 2 | **460.5 (P0)** | other | 1 | 6 |
| 40 | `src\lib\components\types.ts` | 58 | 913 | 2 | **456.5 (P0)** | components | 1 | 5 |
| 41 | `src\lib\components\yorha\DetectiveEvidenceMap.svelte` | 58 | 908 | 2 | **454 (P0)** | components | 1 | 4 |
| 42 | `src\lib\schemas\prosecution-case-form.ts` | 32 | 897 | 2 | **448.5 (P0)** | database | 1 | 3 |
| 43 | `src\lib\components\ai\legal\ComprehensiveLegalAI.svelte` | 57 | 883 | 2 | **441.5 (P0)** | components | 1 | 2 |
| 44 | `src\lib\routing\dynamic-route-generator.ts` | 270 | 883 | 2 | **441.5 (P0)** | other | 1 | 11 |
| 45 | `src\lib\machines\aiAssistantMachine.ts` | 273 | 882 | 2 | **441 (P0)** | other | 1 | 9 |
| 46 | `src\lib\components\three\yorha-ui\components\YoRHaButton3D.ts` | 54 | 873 | 2 | **436.5 (P0)** | components | 1 | 9 |
| 47 | `src\lib\components\ui\bits\custom-design-integration.ts` | 55 | 873 | 2 | **436.5 (P0)** | components | 1 | 6 |
| 48 | `src\lib\routing\route-registry.svelte.ts` | 272 | 864 | 2 | **432 (P0)** | other | 1 | 6 |
| 49 | `src\lib\database\migrations\migration-system.ts` | 314 | 1255 | 3 | **418.33 (P0)** | other | 1 | 59 |
| 50 | `src\lib\components\yorha\TimelineReconstructionEngine.svelte` | 53 | 828 | 2 | **414 (P0)** | components | 1 | 3 |
| 51 | `src\lib\utils\webgpu-buffer-uploader.ts` | 63 | 809 | 2 | **404.5 (P0)** | utils | 1 | 7 |
| 52 | `src\lib\routing\unified-api-router.ts` | 250 | 808 | 2 | **404 (P0)** | other | 1 | 8 |
| 53 | `src\lib\utils\simd-json-cache.ts` | 92 | 1207 | 3 | **402.33 (P0)** | utils | 1 | 17 |
| 54 | `src\lib\components\cases\CaseNotesEditor.svelte` | 51 | 803 | 2 | **401.5 (P0)** | components | 1 | 4 |
| 55 | `src\lib\machines\graph-cache-machine.ts` | 182 | 794 | 2 | **397 (P0)** | other | 1 | 46 |
| 56 | `src\lib\components\ai\FileUploadGemma3.stories.ts` | 49 | 793 | 2 | **396.5 (P0)** | components | 1 | 8 |
| 57 | `src\lib\server\db-insert-helpers.ts` | 42 | 1182 | 3 | **394 (P0)** | database | 1 | 6 |
| 58 | `src\lib\machines\auth-machine.ts` | 41 | 1170 | 3 | **390 (P0)** | auth | 1 | 9 |
| 59 | `src\lib\server\storage\minio-service.ts` | 244 | 780 | 2 | **390 (P0)** | other | 1 | 6 |
| 60 | `src\lib\components\yorha\CaseTheoryConstructor.svelte` | 48 | 758 | 2 | **379 (P0)** | components | 1 | 4 |
| 61 | `src\lib\components\three\yorha-ui\components\YoRHaInput3D.ts` | 43 | 738 | 2 | **369 (P0)** | components | 1 | 15 |
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
| 102 | `src\lib\server\pgvector-cache.ts` | 81 | 506 | 2 | **253 (P0)** | other | 1 | 49 |
| 103 | `src\lib\client\secure-storage-client.ts` | 144 | 505 | 2 | **252.5 (P0)** | other | 1 | 11 |
| 104 | `src\lib\stores\generic.svelte.ts` | 26 | 501 | 2 | **250.5 (P0)** | stores | 1 | 3 |
| 105 | `src\lib\components\RouteInspectorDetectiveBoard.svelte` | 31 | 493 | 2 | **246.5 (P0)** | components | 1 | 2 |
| 106 | `src\lib\utils\route-operation-logger.ts` | 38 | 489 | 2 | **244.5 (P0)** | utils | 1 | 3 |
| 107 | `src\lib\utils\mcp-helpers.ts` | 38 | 484 | 2 | **242 (P0)** | utils | 1 | 2 |
| 108 | `src\lib\schemas\vector.ts` | 16 | 480 | 2 | **240 (P0)** | database | 1 | 6 |
| 109 | `src\lib\services\enhanced-rag-pagerank.ts` | 141 | 471 | 2 | **235.5 (P0)** | other | 1 | 6 |
| 110 | `src\lib\components\ui\bits\performance.ts` | 29 | 468 | 2 | **234 (P0)** | components | 1 | 3 |
| 111 | `src\lib\server\lucia.ts` | 16 | 460 | 2 | **230 (P0)** | auth | 1 | 2 |
| 112 | `src\lib\components\ui\gaming\types\gaming-types.ts` | 27 | 458 | 2 | **229 (P0)** | components | 1 | 7 |
| 113 | `src\lib\components\ContextConfirmModal.svelte` | 27 | 453 | 2 | **226.5 (P0)** | components | 1 | 6 |
| 114 | `src\lib\routing\route-guards.ts` | 118 | 442 | 2 | **221 (P0)** | other | 1 | 14 |
| 115 | `src\lib\forms\superforms-xstate-integration.ts` | 127 | 434 | 2 | **217 (P0)** | other | 1 | 7 |
| 116 | `src\lib\components\ui\bits\types.ts` | 26 | 433 | 2 | **216.5 (P0)** | components | 1 | 5 |
| 117 | `src\lib\machines\legalAIMachine.v5.ts` | 127 | 424 | 2 | **212 (P0)** | other | 1 | 5 |
| 118 | `src\lib\agents\tools.ts` | 123 | 422 | 2 | **211 (P0)** | other | 1 | 7 |
| 119 | `src\lib\components\evidence\EvidenceAssistant.svelte` | 26 | 418 | 2 | **209 (P0)** | components | 1 | 2 |
| 120 | `src\lib\models\ChatSession.svelte.ts` | 125 | 413 | 2 | **206.5 (P0)** | other | 1 | 4 |
| 121 | `src\lib\stores\dashboard\DocumentProgressStore.ts` | 21 | 411 | 2 | **205.5 (P0)** | stores | 1 | 3 |
| 122 | `src\lib\components\legal-ai\CitationSaveModal.svelte` | 24 | 408 | 2 | **204 (P0)** | components | 1 | 6 |
| 123 | `src\lib\utils\webgpu-array-utils.ts` | 30 | 408 | 2 | **204 (P0)** | utils | 1 | 6 |
| 124 | `src\lib\components\upload\upload-core.ts` | 24 | 403 | 2 | **201.5 (P0)** | components | 1 | 5 |
| 125 | `src\lib\ast\svelte-check-analyzer.ts` | 121 | 401 | 2 | **200.5 (P0)** | other | 1 | 4 |
| 126 | `src\lib\schemas\evidence-upload.ts` | 14 | 401 | 2 | **200.5 (P0)** | database | 1 | 1 |
| 127 | `src\lib\server\minio-service.ts` | 116 | 401 | 2 | **200.5 (P0)** | other | 1 | 7 |
| 128 | `src\lib\simd\simd-json-worker-client.ts` | 100 | 393 | 2 | **196.5 (P0)** | other | 1 | 15 |
| 129 | `src\lib\types\api-schemas.ts` | 13 | 389 | 2 | **194.5 (P0)** | database | 1 | 4 |
| 130 | `src\lib\components\command-center\AceAgentControls.svelte` | 24 | 388 | 2 | **194 (P0)** | components | 1 | 2 |
| 131 | `src\lib\components\evidence\VictimStatementWizard.svelte` | 24 | 388 | 2 | **194 (P0)** | components | 1 | 2 |
| 132 | `src\lib\server\concurrent-json-serializer.ts` | 97 | 384 | 2 | **192 (P0)** | other | 1 | 15 |
| 133 | `src\lib\mlp.ts` | 113 | 377 | 2 | **188.5 (P0)** | other | 1 | 4 |
| 134 | `src\lib\logic\POI.ts` | 92 | 374 | 2 | **187 (P0)** | other | 1 | 16 |
| 135 | `src\lib\webgpu\shader-cache-manager.ts` | 105 | 373 | 2 | **186.5 (P0)** | other | 1 | 8 |
| 136 | `src\lib\components\ui\EvidenceCanvas.svelte` | 22 | 373 | 2 | **186.5 (P0)** | components | 1 | 5 |
| 137 | `src\lib\components\three\yorha-ui\theme\yorha-theme-adapter.ts` | 22 | 373 | 2 | **186.5 (P0)** | components | 1 | 5 |
| 138 | `src\lib\components\ui\QuickActionButton\QuickActionButton.svelte` | 22 | 373 | 2 | **186.5 (P0)** | quic-protocol | 1 | 5 |
| 139 | `src\lib\machines\enhanced-legal-upload-analytics-machine.ts` | 108 | 372 | 2 | **186 (P0)** | other | 1 | 6 |
| 140 | `src\lib\server\cache.ts` | 103 | 367 | 2 | **183.5 (P0)** | other | 1 | 8 |
| 141 | `src\lib\orchestration\optimized-rabbitmq-orchestrator.ts` | 97 | 364 | 2 | **182 (P0)** | other | 1 | 11 |
| 142 | `src\lib\services\glyph-diffusion-service.ts` | 103 | 362 | 2 | **181 (P0)** | other | 1 | 7 |
| 143 | `src\lib\components\ui\AutoPopulatedCaseForm.svelte` | 22 | 358 | 2 | **179 (P0)** | components | 1 | 2 |
| 144 | `src\lib\components\ui\Button.stories.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 145 | `src\lib\components\ui\gaming\core\GamingEvolutionManager-minimal.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 146 | `src\lib\components\CanvasEditor.svelte` | 21 | 353 | 2 | **176.5 (P0)** | components | 1 | 4 |
| 147 | `src\lib\components\three\yorha-ui\components\YoRHaQuantumEffects3D.ts` | 21 | 353 | 2 | **176.5 (P0)** | components | 1 | 4 |
| 148 | `src\lib\components\phase78\ErrorModal.svelte` | 21 | 348 | 2 | **174 (P0)** | components | 1 | 3 |
| 149 | `src\lib\components\RouteOperationsDashboard.svelte` | 21 | 343 | 2 | **171.5 (P0)** | components | 1 | 2 |
| 150 | `src\lib\machines\recommendation-routing-machine.ts` | 100 | 343 | 2 | **171.5 (P0)** | other | 1 | 5 |
| 151 | `src\lib\client\ocr-tensor-processor.ts` | 100 | 338 | 2 | **169 (P0)** | other | 1 | 4 |
| 152 | `src\lib\components\canvas\index.ts` | 20 | 338 | 2 | **169 (P0)** | components | 1 | 4 |
| 153 | `src\lib\components\ui\wrappers\bits\index.ts` | 20 | 338 | 2 | **169 (P0)** | components | 1 | 4 |
| 154 | `src\lib\server\authUtils.ts` | 17 | 507 | 3 | **169 (P0)** | auth | 1 | 6 |
| 155 | `src\lib\optimization\neural-memory-manager.ts` | 93 | 337 | 2 | **168.5 (P0)** | other | 1 | 8 |
| 156 | `src\lib\evidence-canvas\evidence-canvas-core.svelte` | 86 | 336 | 2 | **168 (P0)** | other | 1 | 12 |
| 157 | `src\lib\server\auth-simple.ts` | 17 | 502 | 3 | **167.33 (P0)** | auth | 1 | 5 |
| 158 | `src\lib\components\legal-ai\AttachToCaseModal.svelte` | 20 | 333 | 2 | **166.5 (P0)** | components | 1 | 3 |
| 159 | `src\lib\webgpu\webgpu-init.ts` | 82 | 329 | 2 | **164.5 (P0)** | other | 1 | 13 |
| 160 | `src\lib\components\cases\ContextualChatModal.svelte` | 20 | 328 | 2 | **164 (P0)** | components | 1 | 2 |
| 161 | `src\lib\server\cache\redis-cache.ts` | 68 | 327 | 2 | **163.5 (P0)** | other | 1 | 21 |
| 162 | `src\lib\components\legal\index.ts` | 19 | 323 | 2 | **161.5 (P0)** | components | 1 | 4 |
| 163 | `src\lib\machines\legalCaseMachine.ts` | 85 | 323 | 2 | **161.5 (P0)** | other | 1 | 10 |
| 164 | `src\lib\db\localDocs.svelte.ts` | 148 | 482 | 3 | **160.67 (P0)** | other | 1 | 4 |
| 165 | `src\lib\services\localStorage-file-fallback.ts` | 92 | 319 | 2 | **159.5 (P0)** | other | 1 | 5 |
| 166 | `src\lib\optimization\optimization-test-suite.ts` | 87 | 319 | 2 | **159.5 (P0)** | other | 1 | 8 |
| 167 | `src\lib\components\CaseOutcomePrediction.svelte` | 19 | 318 | 2 | **159 (P0)** | components | 1 | 3 |
| 168 | `src\lib\components\headless\texture-streaming.svelte.ts` | 18 | 313 | 2 | **156.5 (P0)** | components | 1 | 5 |
| 169 | `src\lib\server\http-cache-headers.ts` | 79 | 310 | 2 | **155 (P0)** | other | 1 | 11 |
| 170 | `src\lib\utils\ollama-endpoints.ts` | 23 | 309 | 2 | **154.5 (P0)** | utils | 1 | 3 |
| 171 | `src\lib\services\cache-layer-manager.ts` | 65 | 308 | 2 | **154 (P0)** | other | 1 | 19 |
| 172 | `src\lib\demos\neural-intent-demo.ts` | 71 | 306 | 2 | **153 (P0)** | other | 1 | 15 |
| 173 | `src\lib\machines\workflow-machine.ts` | 91 | 306 | 2 | **153 (P0)** | other | 1 | 3 |
| 174 | `src\lib\evidence-canvas\webgpu-init.ts` | 89 | 305 | 2 | **152.5 (P0)** | other | 1 | 4 |
| 175 | `src\lib\machines\index.ts` | 69 | 305 | 2 | **152.5 (P0)** | other | 1 | 16 |
| 176 | `src\lib\components\AIChat.stories.ts` | 17 | 303 | 2 | **151.5 (P0)** | components | 1 | 6 |
| 177 | `src\lib\components\error-analysis\KnowledgeGraph.svelte` | 18 | 303 | 2 | **151.5 (P0)** | components | 1 | 3 |
| 178 | `src\lib\components\ui\gaming\effects\gradient-utils.ts` | 15 | 303 | 2 | **151.5 (P0)** | components | 1 | 12 |
| 179 | `src\lib\types\legal-types.ts` | 75 | 303 | 2 | **151.5 (P0)** | other | 1 | 12 |
| 180 | `src\lib\optimization\index.ts` | 68 | 302 | 2 | **151 (P0)** | other | 1 | 16 |
| 181 | `src\lib\middleware\namespaceRouter.ts` | 87 | 299 | 2 | **149.5 (P0)** | other | 1 | 4 |
| 182 | `src\lib\components\CitationLink.svelte` | 18 | 298 | 2 | **149 (P0)** | components | 1 | 2 |
| 183 | `src\lib\server\embedding-cache-middleware.ts` | 60 | 298 | 2 | **149 (P0)** | other | 1 | 20 |
| 184 | `src\lib\components\phase78\SuggestionsList.svelte` | 17 | 288 | 2 | **144 (P0)** | components | 1 | 3 |
| 185 | `src\lib\index.ts` | 76 | 286 | 2 | **143 (P0)** | other | 1 | 8 |
| 186 | `src\lib\components\ReportEditor.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 187 | `src\lib\components\board\CanvasBoard.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 188 | `src\lib\components\case\ErrorAlert.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 189 | `src\lib\components\command-center\Phase72ToolPanel.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 190 | `src\lib\components\legal\WorkspacePanel.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 191 | `src\lib\components\yorha\YoRHaCommandCenter.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 192 | `src\lib\components\LegalCaseManager.stories.ts` | 16 | 278 | 2 | **139 (P0)** | components | 1 | 4 |
| 193 | `src\lib\workers\rabbitmq-service-worker.ts` | 80 | 273 | 2 | **136.5 (P0)** | other | 1 | 3 |
| 194 | `src\lib\components\ui\modern\index.ts` | 16 | 273 | 2 | **136.5 (P0)** | components | 1 | 3 |
| 195 | `src\lib\schemas\file-upload.ts` | 9 | 271 | 2 | **135.5 (P0)** | database | 1 | 2 |
| 196 | `src\lib\machines\ai-computation-machine.ts` | 65 | 268 | 2 | **134 (P0)** | other | 1 | 11 |
| 197 | `src\lib\server\database-api-bridge.ts` | 98 | 397 | 3 | **132.33 (P0)** | other | 1 | 17 |
| 198 | `src\lib\components\agentic\AgentChat.svelte` | 16 | 263 | 2 | **131.5 (P0)** | components | 1 | 1 |
| 199 | `src\lib\components\yorha\YoRHaCommandCenter.stories.ts` | 15 | 263 | 2 | **131.5 (P0)** | components | 1 | 4 |
| 200 | `src\lib\cache\parallel-cache-orchestrator.ts` | 76 | 261 | 2 | **130.5 (P0)** | other | 1 | 3 |
| 201 | `src\lib\components\ui\alert\index.ts` | 15 | 258 | 2 | **129 (P0)** | components | 1 | 3 |
| 202 | `src\lib\machines\vectorJobMachine.ts` | 68 | 257 | 2 | **128.5 (P0)** | other | 1 | 7 |
| 203 | `src\lib\database\enhanced-schema.ts` | 13 | 384 | 3 | **128 (P0)** | database | 1 | 3 |
| 204 | `src\lib\proto\enhanced-rag.ts` | 69 | 255 | 2 | **127.5 (P0)** | other | 1 | 6 |
| 205 | `src\lib\server\rabbitmq.ts` | 72 | 254 | 2 | **127 (P0)** | other | 1 | 4 |
| 206 | `src\lib\server\z-schemas.ts` | 8 | 254 | 2 | **127 (P0)** | database | 1 | 4 |
| 207 | `src\lib\components\citations\CitationSaveForm.svelte` | 15 | 253 | 2 | **126.5 (P0)** | components | 1 | 2 |
| 208 | `src\lib\routing\index.ts` | 70 | 253 | 2 | **126.5 (P0)** | other | 1 | 5 |
| 209 | `src\lib\config\unified-config.ts` | 53 | 252 | 2 | **126 (P0)** | other | 1 | 15 |
| 210 | `src\lib\config\env.server.ts` | 83 | 372 | 3 | **124 (P0)** | other | 1 | 21 |
| 211 | `src\lib\caching\multi-dimensional-image-cache.ts` | 62 | 244 | 2 | **122 (P0)** | other | 1 | 8 |
| 212 | `src\lib\components\legal-ai\StatuteResultsList.svelte` | 14 | 243 | 2 | **121.5 (P0)** | components | 1 | 3 |
| 213 | `src\lib\search\fuse-rag-search.ts` | 51 | 241 | 2 | **120.5 (P0)** | other | 1 | 14 |
| 214 | `src\lib\components\ChatPanel.svelte` | 14 | 238 | 2 | **119 (P0)** | components | 1 | 2 |
| 215 | `src\lib\components\evidence\EvidenceUploadModal.svelte` | 14 | 238 | 2 | **119 (P0)** | components | 1 | 2 |
| 216 | `src\lib\modules\auth-demo.ts` | 12 | 352 | 3 | **117.33 (P0)** | auth | 1 | 2 |
| 217 | `src\lib\components\legal-ai\LawsSearchPage.svelte` | 14 | 233 | 2 | **116.5 (P0)** | components | 1 | 1 |
| 218 | `src\lib\optimization\context7-mcp-integration.ts` | 60 | 233 | 2 | **116.5 (P0)** | other | 1 | 7 |
| 219 | `src\lib\cache\ssr-legal-api-cache.ts` | 58 | 232 | 2 | **116 (P0)** | other | 1 | 8 |
| 220 | `src\lib\middleware\tfjs-synthesizer.ts` | 63 | 232 | 2 | **116 (P0)** | other | 1 | 5 |
| 221 | `src\lib\services\enhanced-api-client.ts` | 59 | 230 | 2 | **115 (P0)** | other | 1 | 7 |
| 222 | `src\lib\components\realtime\index.ts` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 223 | `src\lib\components\three\yorha-ui\YoRHaUIExample.ts` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 224 | `src\lib\components\yorha\dashboard\SystemOverview.svelte` | 13 | 228 | 2 | **114 (P0)** | components | 1 | 3 |
| 225 | `src\lib\server\embedding-cache-service.ts` | 65 | 228 | 2 | **114 (P0)** | other | 1 | 3 |
| 226 | `src\lib\webgpu\webgpu-similarity-engine.ts` | 63 | 227 | 2 | **113.5 (P0)** | other | 1 | 4 |
| 227 | `src\lib\components\case\SummaryEditor.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 228 | `src\lib\components\laws\Sidebar.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 229 | `src\lib\components\poi\POIStats.svelte` | 13 | 223 | 2 | **111.5 (P0)** | components | 1 | 2 |
| 230 | `src\lib\__tests__\unified-schema.ts` | 7 | 222 | 2 | **111 (P0)** | database | 1 | 3 |
| 231 | `src\lib\server\config.ts` | 61 | 221 | 2 | **110.5 (P0)** | other | 1 | 4 |
| 232 | `src\lib\client\ai\webgpu-reranker-worker.ts` | 55 | 218 | 2 | **109 (P0)** | other | 1 | 7 |
| 233 | `src\lib\components\legal-ai\RelatedCasesPanel.svelte` | 13 | 218 | 2 | **109 (P0)** | components | 1 | 1 |
| 234 | `src\lib\components\yorha\evidence\EvidenceGrid.svelte` | 13 | 218 | 2 | **109 (P0)** | components | 1 | 1 |
| 235 | `src\lib\integrations\flashattention-multicore-bridge.ts` | 54 | 215 | 2 | **107.5 (P0)** | other | 1 | 7 |
| 236 | `src\lib\config\legal-priorities.ts` | 57 | 214 | 2 | **107 (P0)** | other | 1 | 5 |
| 237 | `src\lib\integrations\phase13-full-integration.ts` | 57 | 214 | 2 | **107 (P0)** | other | 1 | 5 |
| 238 | `src\lib\agents\error-recovery.ts` | 60 | 213 | 2 | **106.5 (P0)** | other | 1 | 3 |
| 239 | `src\lib\server\api-ssr-helpers.ts` | 60 | 213 | 2 | **106.5 (P0)** | other | 1 | 3 |
| 240 | `src\lib\client\ui\POIPhotoModal.svelte` | 56 | 211 | 2 | **105.5 (P0)** | other | 1 | 5 |
| 241 | `src\lib\evidence\simd-gpu-tiling-engine.ts` | 54 | 210 | 2 | **105 (P0)** | other | 1 | 6 |
| 242 | `src\lib\server\audit-logger.ts` | 54 | 210 | 2 | **105 (P0)** | other | 1 | 6 |
| 243 | `src\lib\components\ErrorStreamMonitor.svelte` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 244 | `src\lib\components\WebGPUSimilarityDemo.svelte` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 245 | `src\lib\components\search\utils.ts` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 246 | `src\lib\components\ui\orchestrated\index.ts` | 12 | 208 | 2 | **104 (P0)** | components | 1 | 2 |
| 247 | `src\lib\services\neo4jGraphService.ts` | 53 | 207 | 2 | **103.5 (P0)** | other | 1 | 6 |
| 248 | `src\lib\routing\route-registry.ts` | 48 | 207 | 2 | **103.5 (P0)** | other | 1 | 9 |
| 249 | `src\lib\server\authPolicy.ts` | 10 | 308 | 3 | **102.67 (P0)** | auth | 1 | 4 |
| 250 | `src\lib\components\yorha\cases\CasesList.svelte` | 12 | 203 | 2 | **101.5 (P0)** | components | 1 | 1 |
| 251 | `src\lib\routing\dynamic-navigation.ts` | 58 | 202 | 2 | **101 (P0)** | other | 1 | 2 |
| 252 | `src\lib\server\evidence-processing.ts` | 58 | 202 | 2 | **101 (P0)** | other | 1 | 2 |
| 253 | `src\lib\proto\legal-ai-types.ts` | 48 | 197 | 2 | **98.5 (P0)** | other | 1 | 7 |
| 254 | `src\lib\gemma3Client.ts` | 51 | 196 | 2 | **98 (P0)** | other | 1 | 5 |
| 255 | `src\lib\optimization\simd-json-parser-bridge.ts` | 54 | 195 | 2 | **97.5 (P0)** | other | 1 | 3 |
| 256 | `src\lib\services\unified-legal-orchestrator.ts` | 47 | 194 | 2 | **97 (P0)** | other | 1 | 7 |
| 257 | `src\lib\components\evidence\EvidenceConnections.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 258 | `src\lib\components\legal-ai\CitationLibraryPage.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 259 | `src\lib\components\ui\MarkdownSceneViewer.svelte` | 11 | 193 | 2 | **96.5 (P0)** | components | 1 | 2 |
| 260 | `src\lib\config\production.ts` | 53 | 192 | 2 | **96 (P0)** | other | 1 | 3 |
| 261 | `src\lib\server\message-queue.ts` | 51 | 191 | 2 | **95.5 (P0)** | other | 1 | 4 |
| 262 | `src\lib\server\database-pool-service.ts` | 65 | 283 | 3 | **94.33 (P0)** | other | 1 | 14 |
| 263 | `src\lib\components\ClientGemmaDemo.svelte` | 11 | 188 | 2 | **94 (P0)** | components | 1 | 1 |
| 264 | `src\lib\components\case\CaseDetailPage.svelte` | 11 | 188 | 2 | **94 (P0)** | components | 1 | 1 |
| 265 | `src\lib\db\persons.ts` | 73 | 282 | 3 | **94 (P0)** | other | 1 | 9 |
| 266 | `src\lib\db\schema\rag-integration.ts` | 9 | 281 | 3 | **93.67 (P0)** | database | 1 | 4 |
| 267 | `src\lib\cache\xstate-cache-integration.ts` | 51 | 186 | 2 | **93 (P0)** | other | 1 | 3 |
| 268 | `src\lib\machines\ssr-qlora-chat-machine.ts` | 39 | 185 | 2 | **92.5 (P0)** | other | 1 | 10 |
| 269 | `src\lib\services\xstate-integration.ts` | 50 | 183 | 2 | **91.5 (P0)** | other | 1 | 3 |
| 270 | `src\lib\components\three\yorha-ui\components\YoRHaPanel3D.ts` | 10 | 183 | 2 | **91.5 (P0)** | components | 1 | 3 |
| 271 | `src\lib\utils\simd-json-parser.ts` | 13 | 179 | 2 | **89.5 (P0)** | utils | 1 | 1 |
| 272 | `src\lib\components\citations\CitationList.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 273 | `src\lib\components\dashboard\DocumentThumbnailTray.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 274 | `src\lib\components\ui\DiffViewer.svelte` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 275 | `src\lib\components\unified\index.ts` | 10 | 178 | 2 | **89 (P0)** | components | 1 | 2 |
| 276 | `src\lib\types\case.ts` | 38 | 177 | 2 | **88.5 (P0)** | other | 1 | 9 |
| 277 | `src\lib\evidence-canvas\graph-layout-gpu.ts` | 46 | 176 | 2 | **88 (P0)** | other | 1 | 4 |
| 278 | `src\lib\types\api.ts` | 44 | 175 | 2 | **87.5 (P0)** | other | 1 | 5 |
| 279 | `src\lib\services\predictive-asset-engine.ts` | 39 | 175 | 2 | **87.5 (P0)** | other | 1 | 8 |
| 280 | `src\lib\components\SearchPanel.svelte` | 10 | 173 | 2 | **86.5 (P0)** | components | 1 | 1 |
| 281 | `src\lib\detective-mode\comprehensive-integration.svelte.ts` | 43 | 172 | 2 | **86 (P0)** | other | 1 | 5 |
| 282 | `src\lib\machines\agentShellMachine.mcp.ts` | 43 | 172 | 2 | **86 (P0)** | other | 1 | 5 |
| 283 | `src\lib\compat\lokijs.ts` | 44 | 170 | 2 | **85 (P0)** | other | 1 | 4 |
| 284 | `src\lib\services\case-memory-engine.ts` | 37 | 169 | 2 | **84.5 (P0)** | other | 1 | 8 |
| 285 | `src\lib\optimization\copilot-index-optimizer.ts` | 35 | 168 | 2 | **84 (P0)** | other | 1 | 9 |
| 286 | `src\lib\evidence-canvas\ai-suggestions-service.ts` | 43 | 167 | 2 | **83.5 (P0)** | other | 1 | 4 |
| 287 | `src\lib\db\enhanced-ai-schema.ts` | 8 | 249 | 3 | **83 (P0)** | database | 1 | 3 |
| 288 | `src\lib\orchestration\qlora-ollama-orchestrator.ts` | 41 | 166 | 2 | **83 (P0)** | other | 1 | 5 |
| 289 | `src\lib\integrations\full-stack-workflow.ts` | 29 | 165 | 2 | **82.5 (P0)** | other | 1 | 12 |
| 290 | `src\lib\components\layout\EvidenceBoardLayout.svelte` | 9 | 163 | 2 | **81.5 (P0)** | components | 1 | 2 |
| 291 | `src\lib\machines\legalAIMachine.ts` | 35 | 163 | 2 | **81.5 (P0)** | other | 1 | 8 |
| 292 | `src\lib\cache\glyph-shader-cache-bridge.ts` | 43 | 162 | 2 | **81 (P0)** | other | 1 | 3 |
| 293 | `src\lib\optimization\simd-json-index-processor.ts` | 39 | 160 | 2 | **80 (P0)** | other | 1 | 5 |
| 294 | `src\lib\server\utils\server-cache.ts` | 32 | 159 | 2 | **79.5 (P0)** | other | 1 | 9 |
| 295 | `src\lib\machines\rag-machine.ts` | 32 | 159 | 2 | **79.5 (P0)** | other | 1 | 9 |
| 296 | `src\lib\components\PersonStatsPanel.svelte` | 8 | 158 | 2 | **79 (P0)** | components | 1 | 4 |
| 297 | `src\lib\components\legal-ai\LinkMetadataForm.svelte` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 298 | `src\lib\components\ui\index.ts` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 299 | `src\lib\components\poi\POIPhotoGrid.svelte` | 9 | 158 | 2 | **79 (P0)** | components | 1 | 1 |
| 300 | `src\lib\services\gemma-embeddings-service.ts` | 35 | 158 | 2 | **79 (P0)** | other | 1 | 7 |
| 301 | `src\lib\machines\legal-case-machine-factory.ts` | 34 | 155 | 2 | **77.5 (P0)** | other | 1 | 7 |
| 302 | `src\lib\polyfills.ts` | 40 | 153 | 2 | **76.5 (P0)** | other | 1 | 3 |
| 303 | `src\lib\integrations\supercharged-legal-ai-server.ts` | 30 | 153 | 2 | **76.5 (P0)** | other | 1 | 9 |
| 304 | `src\lib\components\ui\dialog\DialogHeader.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 305 | `src\lib\components\poi\POIFaceMatchDialog.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 306 | `src\lib\components\ui\enhanced\Card.stories.ts` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 307 | `src\lib\components\yorha\SystemStatus.svelte` | 8 | 148 | 2 | **74 (P0)** | components | 1 | 2 |
| 308 | `src\lib\server\services\vectorDBService.ts` | 63 | 222 | 3 | **74 (P0)** | other | 1 | 3 |
| 309 | `src\lib\server\legal-autocomplete.ts` | 39 | 145 | 2 | **72.5 (P0)** | other | 1 | 2 |
| 310 | `src\lib\orchestration\autoencoder-context-switcher.ts` | 37 | 144 | 2 | **72 (P0)** | other | 1 | 3 |
| 311 | `src\lib\utils.ts` | 10 | 143 | 2 | **71.5 (P0)** | utils | 1 | 1 |
| 312 | `src\lib\components\PersonList.svelte` | 8 | 143 | 2 | **71.5 (P0)** | components | 1 | 1 |
| 313 | `src\lib\ast\error-vectorizer.ts` | 33 | 142 | 2 | **71 (P0)** | other | 1 | 5 |
| 314 | `src\lib\server\db\schema-postgres.ts` | 7 | 212 | 3 | **70.67 (P0)** | database | 1 | 1 |
| 315 | `src\lib\ast\suggestion-engine.ts` | 36 | 141 | 2 | **70.5 (P0)** | other | 1 | 3 |
| 316 | `src\lib\server\charge-bundler.ts` | 39 | 140 | 2 | **70 (P0)** | other | 1 | 1 |
| 317 | `src\lib\machines\prefetchMachine.ts` | 32 | 139 | 2 | **69.5 (P0)** | other | 1 | 5 |
| 318 | `src\lib\components\ast\ErrorPanel.svelte` | 7 | 138 | 2 | **69 (P0)** | components | 1 | 3 |
| 319 | `src\lib\config\gemma3-legal-config.ts` | 36 | 136 | 2 | **68 (P0)** | other | 1 | 2 |
| 320 | `src\lib\orchestration\master-cognitive-hub.ts` | 31 | 136 | 2 | **68 (P0)** | other | 1 | 5 |
| 321 | `src\lib\json\fastjson.ts` | 34 | 135 | 2 | **67.5 (P0)** | other | 1 | 3 |
| 322 | `src\lib\db\dexie-integration.ts` | 46 | 201 | 3 | **67 (P0)** | other | 1 | 9 |
| 323 | `src\lib\components\laws\LawModal.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 324 | `src\lib\components\legal\StatuteActionPanel.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 325 | `src\lib\components\ui\SearchResults.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 326 | `src\lib\components\ui\ThemeToggle.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 327 | `src\lib\components\ui\gaming\n64\index.ts` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 328 | `src\lib\components\yorha\evidence\EvidenceStats.svelte` | 7 | 133 | 2 | **66.5 (P0)** | components | 1 | 2 |
| 329 | `src\lib\server\init.ts` | 30 | 133 | 2 | **66.5 (P0)** | other | 1 | 5 |
| 330 | `src\lib\server\knowledge-cache.ts` | 35 | 133 | 2 | **66.5 (P0)** | other | 1 | 2 |
| 331 | `src\lib\command-center-manifest.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 332 | `src\lib\server\messaging\rabbitmq-service.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 333 | `src\lib\services\rabbitmq-service.ts` | 33 | 132 | 2 | **66 (P0)** | other | 1 | 3 |
| 334 | `src\lib\actors\xstate-actor-wrapper.ts` | 29 | 130 | 2 | **65 (P0)** | other | 1 | 5 |
| 335 | `src\lib\composables\legal-data-runes.svelte.ts` | 22 | 129 | 2 | **64.5 (P0)** | other | 1 | 9 |
| 336 | `src\lib\monitoring\legal-performance-metrics.ts` | 27 | 129 | 2 | **64.5 (P0)** | other | 1 | 6 |
| 337 | `src\lib\components\SlideTabs.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 338 | `src\lib\components\dashboard\QuickActionsPanel.svelte` | 7 | 128 | 2 | **64 (P0)** | quic-protocol | 1 | 1 |
| 339 | `src\lib\components\evidence\UploadProgressCard.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 340 | `src\lib\components\ui\IconContainerDemo.svelte` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 341 | `src\lib\components\ui\table\index.ts` | 7 | 128 | 2 | **64 (P0)** | components | 1 | 1 |
| 342 | `src\lib\services\context7-multicore.ts` | 18 | 127 | 2 | **63.5 (P0)** | other | 1 | 11 |
| 343 | `src\lib\machines\document-upload-machine.ts` | 23 | 127 | 2 | **63.5 (P0)** | other | 1 | 8 |
| 344 | `src\lib\memory\visual-memory-palace-integration.ts` | 28 | 127 | 2 | **63.5 (P0)** | other | 1 | 5 |
| 345 | `src\lib\server\db\schema\error_clusters.ts` | 6 | 190 | 3 | **63.33 (P0)** | database | 1 | 2 |
| 346 | `src\lib\db\schema-jsonb.ts` | 6 | 190 | 3 | **63.33 (P0)** | database | 1 | 2 |
| 347 | `src\lib\config\rabbitmq-config.ts` | 26 | 126 | 2 | **63 (P0)** | other | 1 | 6 |
| 348 | `src\lib\integrations\revolutionary-multicore-bridge.ts` | 24 | 125 | 2 | **62.5 (P0)** | other | 1 | 7 |
| 349 | `src\lib\config\environment.ts` | 62 | 249 | 4 | **62.25 (P0)** | other | 1 | 9 |
| 350 | `src\lib\machines\ai-processing-machine.ts` | 27 | 124 | 2 | **62 (P0)** | other | 1 | 5 |
| 351 | `src\lib\db\schema\nes-command-center.ts` | 6 | 185 | 3 | **61.67 (P0)** | database | 1 | 1 |
| 352 | `src\lib\services\rag-ingestion-pipeline.ts` | 30 | 123 | 2 | **61.5 (P0)** | other | 1 | 3 |
| 353 | `src\lib\rag\demo-rag.ts` | 30 | 123 | 2 | **61.5 (P0)** | other | 1 | 3 |
| 354 | `src\lib\agents\error-handler.ts` | 28 | 122 | 2 | **61 (P0)** | other | 1 | 4 |
| 355 | `src\lib\server\ibm-vision.ts` | 28 | 122 | 2 | **61 (P0)** | other | 1 | 4 |
| 356 | `src\lib\components\ui\enhanced-bits.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 357 | `src\lib\components\laws\StatuteColumn.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 358 | `src\lib\components\ui\label\Label.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 359 | `src\lib\components\yorha\evidence\EvidenceFilters.svelte` | 6 | 118 | 2 | **59 (P1)** | components | 1 | 2 |
| 360 | `src\lib\caching\reinforcement-learning-cache.ts` | 23 | 117 | 2 | **58.5 (P1)** | other | 1 | 6 |
| 361 | `src\lib\moogle\stage6-production-orchestrator.ts` | 23 | 117 | 2 | **58.5 (P1)** | other | 1 | 6 |
| 362 | `src\lib\modules\citations-manager.ts` | 21 | 116 | 2 | **58 (P1)** | other | 1 | 7 |
| 363 | `src\lib\config\endpoints.ts` | 24 | 115 | 2 | **57.5 (P1)** | other | 1 | 5 |
| 364 | `src\lib\config\env.ts` | 28 | 172 | 3 | **57.33 (P1)** | other | 1 | 14 |
| 365 | `src\lib\cache\parallel-cache-orchestrator-corrupted.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 366 | `src\lib\client\subscribeEmbedding.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 367 | `src\lib\components\ui\input\InputBits.svelte` | 6 | 113 | 2 | **56.5 (P1)** | components | 1 | 1 |
| 368 | `src\lib\components\poi\POIThreatBadge.svelte` | 6 | 113 | 2 | **56.5 (P1)** | components | 1 | 1 |
| 369 | `src\lib\integrations\full-system-orchestrator.ts` | 20 | 113 | 2 | **56.5 (P1)** | other | 1 | 7 |
| 370 | `src\lib\services\unified-vector-orchestrator.ts` | 25 | 113 | 2 | **56.5 (P1)** | other | 1 | 4 |
| 371 | `src\lib\machines\auth-machine.v5.ts` | 5 | 168 | 3 | **56 (P1)** | auth | 1 | 3 |
| 372 | `src\lib\services\featureFlags.ts` | 28 | 112 | 2 | **56 (P1)** | other | 1 | 2 |
| 373 | `src\lib\server\helpers\service-discovery.ts` | 16 | 111 | 2 | **55.5 (P1)** | other | 1 | 9 |
| 374 | `src\lib\errors\featureErrors.ts` | 24 | 110 | 2 | **55 (P1)** | other | 1 | 4 |
| 375 | `src\lib\server\cache\redis.ts` | 27 | 109 | 2 | **54.5 (P1)** | other | 1 | 2 |
| 376 | `src\lib\parsers\simd-json-parser.ts` | 22 | 109 | 2 | **54.5 (P1)** | other | 1 | 5 |
| 377 | `src\lib\api\clients\api-client.ts` | 25 | 108 | 2 | **54 (P1)** | other | 1 | 3 |
| 378 | `src\lib\webgpu\som-webgpu-cache.ts` | 25 | 108 | 2 | **54 (P1)** | other | 1 | 3 |
| 379 | `src\lib\machines\canvasSystem.ts` | 20 | 108 | 2 | **54 (P1)** | other | 1 | 6 |
| 380 | `src\lib\services\simd-redis-client.ts` | 18 | 107 | 2 | **53.5 (P1)** | other | 1 | 7 |
| 381 | `src\lib\services\ollama-integration-layer.ts` | 17 | 104 | 2 | **52 (P1)** | other | 1 | 7 |
| 382 | `src\lib\api\client.ts` | 27 | 104 | 2 | **52 (P1)** | other | 1 | 1 |
| 383 | `src\lib\wasm\llvm-wasm-bridge.ts` | 22 | 104 | 2 | **52 (P1)** | other | 1 | 4 |
| 384 | `src\lib\api\services\evidence-service.ts` | 25 | 103 | 2 | **51.5 (P1)** | other | 1 | 2 |
| 385 | `src\lib\components\charges\StatuteModal.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 386 | `src\lib\components\dashboard\StatisticsPanel.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 387 | `src\lib\components\editor\index.ts` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 388 | `src\lib\components\vision\EvidenceUpload.svelte` | 5 | 103 | 2 | **51.5 (P1)** | components | 1 | 2 |
| 389 | `src\lib\machines\aiAssistantMachine.minimal.ts` | 20 | 103 | 2 | **51.5 (P1)** | other | 1 | 5 |
| 390 | `src\lib\machines\caseManagementMachine.ts` | 25 | 103 | 2 | **51.5 (P1)** | other | 1 | 2 |
| 391 | `src\lib\orchestration\index.ts` | 20 | 103 | 2 | **51.5 (P1)** | other | 1 | 5 |
| 392 | `src\lib\machines\aiAssistantMachine.stories.ts` | 18 | 102 | 2 | **51 (P1)** | other | 1 | 6 |
| 393 | `src\lib\observability\client-timing.ts` | 18 | 102 | 2 | **51 (P1)** | other | 1 | 6 |
| 394 | `src\lib\performance\optimizations.ts` | 22 | 99 | 2 | **49.5 (P1)** | other | 1 | 3 |
| 395 | `src\lib\components\ClientGemmaInference.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 396 | `src\lib\components\EvidenceCard.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 397 | `src\lib\components\legal-ai\CitationSearch.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 398 | `src\lib\components\citations\CitationCollections.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 399 | `src\lib\components\error-brain\PatchCard.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 400 | `src\lib\components\ui\TypewriterPrompt.svelte` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 401 | `src\lib\components\ui\enhanced-bits\index.ts` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 402 | `src\lib\components\ui\tabs-bits\index.ts` | 5 | 98 | 2 | **49 (P1)** | components | 1 | 1 |
| 403 | `src\lib\actions\accessibility-actions.ts` | 23 | 97 | 2 | **48.5 (P1)** | other | 1 | 2 |
| 404 | `src\lib\server\errors.ts` | 21 | 96 | 2 | **48 (P1)** | other | 1 | 3 |
| 405 | `src\lib\config\local-llm.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 406 | `src\lib\error-brain\report-writer.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 407 | `src\lib\optimization\redis-som-cache.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 408 | `src\lib\server\fetch-wrapper.ts` | 19 | 95 | 2 | **47.5 (P1)** | other | 1 | 4 |
| 409 | `src\lib\database\schema.ts` | 4 | 141 | 3 | **47 (P1)** | database | 1 | 3 |
| 410 | `src\lib\services\flashattention2-rtx3060.ts` | 12 | 94 | 2 | **47 (P1)** | other | 1 | 8 |
| 411 | `src\lib\types\pipeline.ts` | 12 | 94 | 2 | **47 (P1)** | other | 1 | 8 |
| 412 | `src\lib\cache\nes-cache-orchestrator.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 413 | `src\lib\error-brain\analyze\ingest.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 414 | `src\lib\hooks\fastjson-server.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 415 | `src\lib\rag\query-helpers.ts` | 20 | 93 | 2 | **46.5 (P1)** | other | 1 | 3 |
| 416 | `src\lib\db\client-db.ts` | 27 | 139 | 3 | **46.33 (P1)** | other | 1 | 8 |
| 417 | `src\lib\optimization\simd-json-parser.ts` | 18 | 92 | 2 | **46 (P1)** | other | 1 | 4 |
| 418 | `src\lib\adapters\wasm-rabbitmq-bridge.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 419 | `src\lib\webgpu\webgpu-similarity-service.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 420 | `src\lib\error-brain\diff\apply.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 421 | `src\lib\services\enhanced-caching-revolutionary-bridge.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 422 | `src\lib\server\gemma3-vlm-embedder.ts` | 21 | 91 | 2 | **45.5 (P1)** | other | 1 | 2 |
| 423 | `src\lib\database\drizzle-compatibility-fix.ts` | 4 | 136 | 3 | **45.33 (P1)** | database | 1 | 2 |
| 424 | `src\lib\server\auth-helpers.ts` | 4 | 136 | 3 | **45.33 (P1)** | auth | 1 | 2 |
| 425 | `src\lib\actors\embedding-actor.ts` | 17 | 89 | 2 | **44.5 (P1)** | other | 1 | 4 |
| 426 | `src\lib\ClientEmbeddingGemma.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 427 | `src\lib\services\qdrant-client.ts` | 15 | 88 | 2 | **44 (P1)** | other | 1 | 5 |
| 428 | `src\lib\api\production-service-client.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 429 | `src\lib\clients\securityOrchestrator.ts` | 15 | 88 | 2 | **44 (P1)** | other | 1 | 5 |
| 430 | `src\lib\components\three\yorha-ui\index.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 431 | `src\lib\components\ui\bits\index.enhanced.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 432 | `src\lib\components\yorha\index.ts` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 433 | `src\lib\components\yorha\cases\CaseFilters.svelte` | 4 | 88 | 2 | **44 (P1)** | components | 1 | 2 |
| 434 | `src\lib\services\revolutionary-ai-integration.ts` | 20 | 88 | 2 | **44 (P1)** | other | 1 | 2 |
| 435 | `src\lib\client\db\loki-client.ts` | 26 | 131 | 3 | **43.67 (P1)** | other | 1 | 7 |
| 436 | `src\lib\machines\search-machine.ts` | 18 | 87 | 2 | **43.5 (P1)** | other | 1 | 3 |
| 437 | `src\lib\metrics\gpuMetricsBatcher.ts` | 18 | 87 | 2 | **43.5 (P1)** | other | 1 | 3 |
| 438 | `src\lib\wasm\vector-wasm-wrapper.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 439 | `src\lib\machines\chatMachine.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 440 | `src\lib\registry\texture-component-registry.ts` | 16 | 86 | 2 | **43 (P1)** | other | 1 | 4 |
| 441 | `src\lib\api\ollama.ts` | 19 | 85 | 2 | **42.5 (P1)** | other | 1 | 2 |
| 442 | `src\lib\client\workflow-event-stream.ts` | 14 | 85 | 2 | **42.5 (P1)** | other | 1 | 5 |
| 443 | `src\lib\error-brain\analyze\propose.ts` | 17 | 84 | 2 | **42 (P1)** | other | 1 | 3 |
| 444 | `src\lib\components\SimilarCasesPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 445 | `src\lib\components\DocumentUploadMachineIntegration.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 446 | `src\lib\components\ui\tabs\index.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 447 | `src\lib\components\RoutesList.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 448 | `src\lib\components\admin\TagSelector.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 449 | `src\lib\components\evidence\SummaryReviewPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 450 | `src\lib\components\evidence-graph\GraphToolbar.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 451 | `src\lib\components\laws\LawsDashboard.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 452 | `src\lib\components\legal-ai\CaseChatPanel.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 453 | `src\lib\components\legal-ai\CaseStatuteLinks.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 454 | `src\lib\components\poi\POIQuickActions.svelte` | 4 | 83 | 2 | **41.5 (P1)** | quic-protocol | 1 | 1 |
| 455 | `src\lib\components\ui\IconContainer.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 456 | `src\lib\components\ui\button-variants.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 457 | `src\lib\components\ui\enhanced\button-variants.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 458 | `src\lib\components\ui\gaming\8bit\NES8BitButton.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 459 | `src\lib\components\ui\wrappers\bits\bits-overrides.ts` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 460 | `src\lib\components\yorha\ContradictionReveal.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 461 | `src\lib\components\yorha\dashboard\EvidenceStats.svelte` | 4 | 83 | 2 | **41.5 (P1)** | components | 1 | 1 |
| 462 | `src\lib\evidence-canvas\case-similarity-service.ts` | 20 | 83 | 2 | **41.5 (P1)** | other | 1 | 1 |
| 463 | `src\lib\server\minio.ts` | 15 | 83 | 2 | **41.5 (P1)** | other | 1 | 4 |
| 464 | `src\lib\config\multi-protocol-routes.ts` | 18 | 82 | 2 | **41 (P1)** | other | 1 | 2 |
| 465 | `src\lib\schemas\upload.ts` | 2 | 82 | 2 | **41 (P1)** | database | 1 | 2 |
| 466 | `src\lib\integration-status.ts` | 11 | 81 | 2 | **40.5 (P1)** | other | 1 | 6 |
| 467 | `src\lib\server\redis-client.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 468 | `src\lib\memory-palace\MemoryPalaceScene.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 469 | `src\lib\optimization\enhanced-vscode-extension-manager.ts` | 16 | 81 | 2 | **40.5 (P1)** | other | 1 | 3 |
| 470 | `src\lib\evidence\detective-analysis-engine.ts` | 14 | 80 | 2 | **40 (P1)** | other | 1 | 4 |
| 471 | `src\lib\services\uploadEvidenceService.ts` | 17 | 79 | 2 | **39.5 (P1)** | other | 1 | 2 |
| 472 | `src\lib\search\fuseStore.ts` | 12 | 79 | 2 | **39.5 (P1)** | other | 1 | 5 |
| 473 | `src\lib\phase78\routeErrorAssistantMachine.ts` | 15 | 78 | 2 | **39 (P1)** | other | 1 | 3 |
| 474 | `src\lib\services\api-client.ts` | 18 | 77 | 2 | **38.5 (P1)** | other | 1 | 1 |
| 475 | `src\lib\integrations\legal-ai-webgpu-bridge.ts` | 13 | 77 | 2 | **38.5 (P1)** | other | 1 | 4 |
| 476 | `src\lib\api\enhanced-case-api.ts` | 16 | 76 | 2 | **38 (P1)** | other | 1 | 2 |
| 477 | `src\lib\data\routes-config.ts` | 11 | 76 | 2 | **38 (P1)** | other | 1 | 5 |
| 478 | `src\lib\simd\simd-json-integration.ts` | 14 | 75 | 2 | **37.5 (P1)** | other | 1 | 3 |
| 479 | `src\lib\integrations\rabbitmq-tensor-integration.ts` | 14 | 75 | 2 | **37.5 (P1)** | other | 1 | 3 |
| 480 | `src\lib\server\neo4j-driver.ts` | 12 | 74 | 2 | **37 (P1)** | other | 1 | 4 |
| 481 | `src\lib\cache\MultiLayerCacheSystem.ts` | 10 | 73 | 2 | **36.5 (P1)** | other | 1 | 5 |
| 482 | `src\lib\components\legal-ai\StatuteSearchBar.svelte` | 3 | 73 | 2 | **36.5 (P1)** | components | 1 | 2 |
| 483 | `src\lib\embedding\embedding-adapter.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 484 | `src\lib\webgpu\webgpu-rag-service.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 485 | `src\lib\optimization\advanced-memory-optimizer.ts` | 13 | 72 | 2 | **36 (P1)** | other | 1 | 3 |
| 486 | `src\lib\api\utils\rate-limiter.ts` | 11 | 71 | 2 | **35.5 (P1)** | other | 1 | 4 |
| 487 | `src\lib\services\anonymous-session-manager.ts` | 16 | 71 | 2 | **35.5 (P1)** | other | 1 | 1 |
| 488 | `src\lib\demo\sampleData.ts` | 11 | 71 | 2 | **35.5 (P1)** | other | 1 | 4 |
| 489 | `src\lib\ClientEmbeddingService.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 490 | `src\lib\integrations\comprehensive-agent-orchestration.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 491 | `src\lib\logic\Report.ts` | 9 | 70 | 2 | **35 (P1)** | other | 1 | 5 |
| 492 | `src\lib\phase72\astVectorizer.ts` | 14 | 70 | 2 | **35 (P1)** | other | 1 | 2 |
| 493 | `src\lib\db\schema\aiHistory.ts` | 3 | 104 | 3 | **34.67 (P1)** | database | 1 | 1 |
| 494 | `src\lib\db\schema\gpuInferenceDemo.ts` | 3 | 104 | 3 | **34.67 (P1)** | database | 1 | 1 |
| 495 | `src\lib\phase72\command-center-restructure-tasks.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 496 | `src\lib\integrations\enhanced-rabbitmq-cuda-bridge.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 497 | `src\lib\logic\HistoryManager.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 498 | `src\lib\machines\ai-system-monitor.ts` | 12 | 69 | 2 | **34.5 (P1)** | other | 1 | 3 |
| 499 | `src\lib\db\queries\nes-command-center-archive.ts` | 25 | 103 | 3 | **34.33 (P1)** | other | 1 | 2 |
| 500 | `src\lib\services\search-service.ts` | 10 | 68 | 2 | **34 (P1)** | other | 1 | 4 |
| 501 | `src\lib\client\rerank-client.ts` | 15 | 68 | 2 | **34 (P1)** | other | 1 | 1 |
| 502 | `src\lib\components\SummaryEditor.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 503 | `src\lib\components\CaseDetailPage.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 504 | `src\lib\components\CrewAIOrchestrationDemo.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 505 | `src\lib\components\FilterPanel.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 506 | `src\lib\components\PersonProfile.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 507 | `src\lib\components\RouteInspectorModal.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 508 | `src\lib\components\admin\EvidenceDrawer.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 509 | `src\lib\components\detective\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 510 | `src\lib\components\evidence-graph\GraphSearchBox.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 511 | `src\lib\components\headless\evidence-canvas.svelte.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 512 | `src\lib\components\ui\checkbox\Checkbox.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 513 | `src\lib\components\poi\POIEditor.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 514 | `src\lib\components\subcomponents\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 515 | `src\lib\components\ui\checkbox\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 516 | `src\lib\components\ui\command\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 517 | `src\lib\components\ui\dialog\types.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 518 | `src\lib\components\ui\scroll-area\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 519 | `src\lib\components\ui\separator\index.ts` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 520 | `src\lib\components\yorha\dashboard\ActiveCasesWidget.svelte` | 3 | 68 | 2 | **34 (P1)** | components | 1 | 1 |
| 521 | `src\lib\ai\ollama-config.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 522 | `src\lib\rabbitmq\index.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 523 | `src\lib\phase72\routeAdapter.ts` | 13 | 67 | 2 | **33.5 (P1)** | other | 1 | 2 |
| 524 | `src\lib\optimization\docker-memory-optimizer-v2.ts` | 11 | 66 | 2 | **33 (P1)** | other | 1 | 3 |
| 525 | `src\lib\server\database-orchestrator.ts` | 22 | 99 | 3 | **33 (P1)** | other | 1 | 3 |
| 526 | `src\lib\components\MigrationTest.svelte` | 5 | 98 | 3 | **32.67 (P1)** | components | 1 | 1 |
| 527 | `src\lib\services\webgpu-texture-streaming.ts` | 9 | 65 | 2 | **32.5 (P1)** | other | 1 | 4 |
| 528 | `src\lib\server\adapter-ranking.ts` | 14 | 65 | 2 | **32.5 (P1)** | other | 1 | 1 |
| 529 | `src\lib\services\ollamaService.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 530 | `src\lib\client\search-client.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 531 | `src\lib\constants\local-llm-config.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 532 | `src\lib\routing\multidimensional-routing-matrix.server.ts` | 12 | 64 | 2 | **32 (P1)** | other | 1 | 2 |
| 533 | `src\lib\messaging\rabbitmq-legal-queue.ts` | 10 | 63 | 2 | **31.5 (P1)** | other | 1 | 3 |
| 534 | `src\lib\db\queries\nes-command-center.ts` | 22 | 94 | 3 | **31.33 (P1)** | other | 1 | 2 |
| 535 | `src\lib\services\enhanced-file-upload.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 536 | `src\lib\data\types.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 537 | `src\lib\llm\gemma.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 538 | `src\lib\machines\canvasEditorMachine.ts` | 13 | 62 | 2 | **31 (P1)** | other | 1 | 1 |
| 539 | `src\lib\middleware\featureFlagEnforcer.ts` | 13 | 62 | 2 | **31 (P1)** | other | 1 | 1 |
| 540 | `src\lib\webgpu\webgpu-polyfill.ts` | 8 | 62 | 2 | **31 (P1)** | other | 1 | 4 |
| 541 | `src\lib\config\database.ts` | 18 | 92 | 3 | **30.67 (P1)** | other | 1 | 4 |
| 542 | `src\lib\core\logic\legal-ai-logic.ts` | 7 | 59 | 2 | **29.5 (P2)** | other | 1 | 4 |
| 543 | `src\lib\optimization\ultra-json-processor.ts` | 7 | 59 | 2 | **29.5 (P2)** | other | 1 | 4 |
| 544 | `src\lib\components\evidence-graph\GraphView.svelte` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 545 | `src\lib\components\ui\gaming\constants\gaming-constants-minimal.ts` | 2 | 58 | 2 | **29 (P2)** | components | 1 | 2 |
| 546 | `src\lib\config\redis-config.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 547 | `src\lib\error-brain\state.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 548 | `src\lib\error-brain\diff\emit-unified.ts` | 10 | 58 | 2 | **29 (P2)** | other | 1 | 2 |
| 549 | `src\lib\server\env-helper.ts` | 18 | 87 | 3 | **29 (P2)** | other | 1 | 3 |
| 550 | `src\lib\client\ai\webgpu-reranker.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 551 | `src\lib\machines\aiSummaryMachine.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 552 | `src\lib\machines\idle-detection-rabbitmq-machine.ts` | 8 | 57 | 2 | **28.5 (P2)** | other | 1 | 3 |
| 553 | `src\lib\components\evidence\EvidenceUploadButton.svelte` | 4 | 83 | 3 | **27.67 (P2)** | components | 1 | 1 |
| 554 | `src\lib\config\ollama.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 555 | `src\lib\webgpu\texture-streaming.ts` | 9 | 55 | 2 | **27.5 (P2)** | other | 1 | 2 |
| 556 | `src\lib\auth\session.ts` | 2 | 82 | 3 | **27.33 (P2)** | auth | 1 | 2 |
| 557 | `src\lib\types\database.ts` | 16 | 81 | 3 | **27 (P2)** | other | 1 | 3 |
| 558 | `src\lib\config\production-config.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 559 | `src\lib\services\tensor-upscaler-service.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 560 | `src\lib\server\evidence-stream.ts` | 7 | 54 | 2 | **27 (P2)** | other | 1 | 3 |
| 561 | `src\lib\components\AIAssistant.svelte.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 562 | `src\lib\components\EvidenceConnections.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 563 | `src\lib\components\Navigation.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 564 | `src\lib\components\NesModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 565 | `src\lib\components\Phase72ErrorBrain.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 566 | `src\lib\components\SearchBar.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 567 | `src\lib\components\SmartEvidenceRecommendations.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 568 | `src\lib\components\admin\AdminLayout.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 569 | `src\lib\components\ai\ContextualEvidenceChatModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 570 | `src\lib\components\ai\PatternRecognition.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 571 | `src\lib\components\ai\cognitive\CognitiveDocumentationHub.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 572 | `src\lib\components\alerts\AlertsPanel.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 573 | `src\lib\components\ast\CodeEditor.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 574 | `src\lib\components\canvas\FabricCanvas.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 575 | `src\lib\components\case\VerificationDisclaimer.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 576 | `src\lib\components\charges\CaseTimeline.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 577 | `src\lib\components\editors\LegalRichTextEditor.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 578 | `src\lib\components\error-brain\ErrorBrainModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 579 | `src\lib\components\evidence\EvidenceNode.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 580 | `src\lib\components\evidence\RelationshipInspector.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 581 | `src\lib\components\laws\LegalAutocomplete.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 582 | `src\lib\components\legal-ai\LegalAILayout.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 583 | `src\lib\components\navigation\ConsolidatedNavigation.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 584 | `src\lib\components\nes\NesModal.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 585 | `src\lib\components\notes\LegalNotesManager.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 586 | `src\lib\components\poi\POICard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 587 | `src\lib\components\ui\core\Textarea.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 588 | `src\lib\components\three\yorha-ui\YoRHaAntiAliasing3D.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 589 | `src\lib\components\ui\bits\StatCard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 590 | `src\lib\components\ui\select\types.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 591 | `src\lib\components\vision\SimilarityHeatmap.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 592 | `src\lib\components\vision\ZoomEnhanceViewer.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 593 | `src\lib\components\visualizations\WebGPUEvidenceGraphVisualization\index.ts` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 594 | `src\lib\components\yorha\CrossExaminationAssistant.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 595 | `src\lib\components\yorha\DetectiveModeDashboard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 596 | `src\lib\components\yorha\EvidenceBoard.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 597 | `src\lib\components\yorha\evidence\EvidenceComparisonOverlay.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 598 | `src\lib\components\yorha\dashboard\GPUMetrics.svelte` | 2 | 53 | 2 | **26.5 (P2)** | components | 1 | 1 |
| 599 | `src\lib\utils\accessibility.ts` | 2 | 52 | 2 | **26 (P2)** | utils | 1 | 2 |
| 600 | `src\lib\features\evidence-command-center\EvidenceBoardPane.svelte` | 8 | 52 | 2 | **26 (P2)** | other | 1 | 2 |
| 601 | `src\lib\rag\som-intent.ts` | 8 | 52 | 2 | **26 (P2)** | other | 1 | 2 |
| 602 | `src\lib\auth\auth-store.svelte.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 603 | `src\lib\components\auth\index.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 604 | `src\lib\server\auth-utils.ts` | 2 | 77 | 3 | **25.67 (P2)** | auth | 1 | 1 |
| 605 | `src\lib\server\db-shim.ts` | 2 | 77 | 3 | **25.67 (P2)** | database | 1 | 1 |
| 606 | `src\lib\types\generics.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 607 | `src\lib\services\autogen-service.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 608 | `src\lib\machines\system-monitor.ts` | 6 | 51 | 2 | **25.5 (P2)** | other | 1 | 3 |
| 609 | `src\lib\shared\quantize.ts` | 9 | 50 | 2 | **25 (P2)** | other | 1 | 1 |
| 610 | `src\lib\server\embedding-gateway.ts` | 7 | 49 | 2 | **24.5 (P2)** | other | 1 | 2 |
| 611 | `src\lib\machines\metrics.ts` | 7 | 49 | 2 | **24.5 (P2)** | other | 1 | 2 |
| 612 | `src\lib\services\documentApi.ts` | 5 | 48 | 2 | **24 (P2)** | other | 1 | 3 |
| 613 | `src\lib\server\docling.ts` | 8 | 47 | 2 | **23.5 (P2)** | other | 1 | 1 |
| 614 | `src\lib\types.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 615 | `src\lib\animations\gpu-animations.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 616 | `src\lib\api\services\case-service.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 617 | `src\lib\integrations\context7-wasm-mock.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 618 | `src\lib\machines\case-workflow-machine.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 619 | `src\lib\optimization\json-wasm-optimizer.ts` | 6 | 46 | 2 | **23 (P2)** | other | 1 | 2 |
| 620 | `src\lib\types\search.types.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 621 | `src\lib\evidence-canvas\evidence-canvas.svelte` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 622 | `src\lib\orchestration\complete-legal-ai-orchestrator.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 623 | `src\lib\server\onnx.ts` | 7 | 44 | 2 | **22 (P2)** | other | 1 | 1 |
| 624 | `src\lib\detective-mode\comprehensive-integration.ts` | 5 | 43 | 2 | **21.5 (P2)** | other | 1 | 2 |
| 625 | `src\lib\api\recommendation-engine.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 626 | `src\lib\services\end-to-end-api-integration.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 627 | `src\lib\server\yolo.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 628 | `src\lib\server\document-processor.ts` | 6 | 41 | 2 | **20.5 (P2)** | other | 1 | 1 |
| 629 | `src\lib\api\services\job-cache-service.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 630 | `src\lib\composables\ui-state-runes.svelte.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 631 | `src\lib\error-brain\run-id.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 632 | `src\lib\machines\ai-analysis-machine.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 633 | `src\lib\machines\userTypingStateMachine.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 634 | `src\lib\server\vector\vectorService.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 635 | `src\lib\server\thread-safe-postgres.ts` | 4 | 40 | 2 | **20 (P2)** | other | 1 | 2 |
| 636 | `src\lib\database\connection.ts` | 7 | 59 | 3 | **19.67 (P2)** | other | 1 | 4 |
| 637 | `src\lib\server\env.server.ts` | 7 | 59 | 3 | **19.67 (P2)** | other | 1 | 4 |
| 638 | `src\lib\mcp-rabbitmq-redis-docs.ts` | 5 | 38 | 2 | **19 (P2)** | other | 1 | 1 |
| 639 | `src\lib\components\+AddNotesSection.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 640 | `src\lib\components\+CaseCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 641 | `src\lib\components\AIAnalysisForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 642 | `src\lib\components\AIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 643 | `src\lib\components\AIAssistantButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 644 | `src\lib\components\AIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 645 | `src\lib\components\AIChatAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 646 | `src\lib\components\AIFabButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 647 | `src\lib\components\ActionPopup.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 648 | `src\lib\components\AdvancedRichTextEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 649 | `src\lib\components\ArtifactViewer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 650 | `src\lib\components\CRUDDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 651 | `src\lib\components\CaseSelector.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 652 | `src\lib\components\Chat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 653 | `src\lib\components\ChatMessages.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 654 | `src\lib\components\ComprehensiveUploadAnalytics.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 655 | `src\lib\components\DemoChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 656 | `src\lib\components\DetectiveLayout.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 657 | `src\lib\components\DocumentDetailModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 658 | `src\lib\components\DocumentUploadForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 659 | `src\lib\components\EditableCanvasSystem.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 660 | `src\lib\components\Enhanced3DSemanticProcessor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 661 | `src\lib\components\EnhancedAISearch.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 662 | `src\lib\components\EnhancedCanvasEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 663 | `src\lib\components\EnhancedChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 664 | `src\lib\components\EnhancedDocumentUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 665 | `src\lib\components\EnhancedLegalAI.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 666 | `src\lib\components\EnhancedLegalAIDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 667 | `src\lib\components\EnhancedLegalCaseManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 668 | `src\lib\components\EnhancedLegalChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 669 | `src\lib\components\EnhancedLegalUploadAnalytics.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 670 | `src\lib\components\EnhancedRAGInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 671 | `src\lib\components\ErrorHandler.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 672 | `src\lib\components\EvidenceAnalysisForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 673 | `src\lib\components\EvidenceGrid.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 674 | `src\lib\components\EvidencePanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 675 | `src\lib\components\EvidenceSidebar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 676 | `src\lib\components\EvidenceUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 677 | `src\lib\components\EvidenceUploader.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 678 | `src\lib\components\FileUploadSection.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 679 | `src\lib\components\FileUploadWithFallback.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 680 | `src\lib\components\GPUAcceleratedChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 681 | `src\lib\components\GlobalAIAssistantButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 682 | `src\lib\components\GlobalSidebar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 683 | `src\lib\components\GraphExplorer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 684 | `src\lib\components\Header.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 685 | `src\lib\components\HeadlessDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 686 | `src\lib\components\HeadlessTypingListener.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 687 | `src\lib\components\IntelligentEvidenceList.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 688 | `src\lib\components\KeyboardShortcutProvider.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 689 | `src\lib\components\KeyboardShortcuts.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 690 | `src\lib\components\KeyboardShortcutsPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 691 | `src\lib\components\LLMAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 692 | `src\lib\components\LLMInference.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 693 | `src\lib\components\LLMUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 694 | `src\lib\components\LazyLoader.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 695 | `src\lib\components\LegalAIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 696 | `src\lib\components\LegalAIDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 697 | `src\lib\components\LegalAnalysisDialog.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 698 | `src\lib\components\LegalCaseManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 699 | `src\lib\components\LegalDisclaimer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 700 | `src\lib\components\LegalTextureCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 701 | `src\lib\components\LoadingSpinner.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 702 | `src\lib\components\LoggingDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 703 | `src\lib\components\MemoryMonitor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 704 | `src\lib\components\MinimalLanding.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 705 | `src\lib\components\MinioUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 706 | `src\lib\components\MonacoEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 707 | `src\lib\components\Neo4jRecommendation3DViewer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 708 | `src\lib\components\NierHeader.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 709 | `src\lib\components\NierNavigation.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 710 | `src\lib\components\NierRichTextEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 711 | `src\lib\components\NierThemeShowcase.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 712 | `src\lib\components\OllamaChatInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 713 | `src\lib\components\OptimizedMinIOUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 714 | `src\lib\components\ui\dialog\DialogContent.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 715 | `src\lib\components\ui\dialog\DialogDescription.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 716 | `src\lib\components\ui\dialog\DialogFooter.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 717 | `src\lib\components\ui\dialog\DialogRoot.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 718 | `src\lib\components\ui\dialog\DialogTitle.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 719 | `src\lib\components\ui\dialog\DialogTrigger.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 720 | `src\lib\components\ui\dialog\Dialog.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 721 | `src\lib\components\PerfChart.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 722 | `src\lib\components\PerformanceDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 723 | `src\lib\components\PersonCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 724 | `src\lib\components\PersonForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 725 | `src\lib\components\RAGSearchComponent.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 726 | `src\lib\components\ResultDetail.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 727 | `src\lib\components\RouteDecisionModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 728 | `src\lib\components\SearchBox.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 729 | `src\lib\components\SearchInput.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 730 | `src\lib\components\SearchResults.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 731 | `src\lib\components\SessionInitializer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 732 | `src\lib\components\Settings.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 733 | `src\lib\components\Sidebar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 734 | `src\lib\components\StatsPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 735 | `src\lib\components\StreamingResponse.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 736 | `src\lib\components\TagList.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 737 | `src\lib\components\TipTapEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 738 | `src\lib\components\TokenUsageManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 739 | `src\lib\components\Toolbar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 740 | `src\lib\components\Typewriter.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 741 | `src\lib\components\UIDiagram.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 742 | `src\lib\components\UnifiedIntegrationDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 743 | `src\lib\components\UploadArea.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 744 | `src\lib\components\UploadAreaExample.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 745 | `src\lib\components\UploadProgress.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 746 | `src\lib\components\UserDropdown.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 747 | `src\lib\components\VoiceAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 748 | `src\lib\components\WebGPUProcessor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 749 | `src\lib\components\ai-synthesis-client.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 750 | `src\lib\components\Dialog\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 751 | `src\lib\components\_archive\svelte4\AccessibilityPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 752 | `src\lib\components\_archive\svelte4\AttractivenessMetr.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 753 | `src\lib\components\_archive\svelte4\Avatar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 754 | `src\lib\components\_archive\svelte4\BitsDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 755 | `src\lib\components\_archive\svelte4\CanvasEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 756 | `src\lib\components\_archive\svelte4\CaseInfoForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 757 | `src\lib\components\_archive\svelte4\CaseSummaryModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 758 | `src\lib\components\_archive\svelte4\CitationSidebar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 759 | `src\lib\components\_archive\svelte4\CommandMenu.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 760 | `src\lib\components\_archive\svelte4\ComprehensiveSummaryEngine.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 761 | `src\lib\components\_archive\svelte4\Dialog.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 762 | `src\lib\components\_archive\svelte4\EnhancedAIAssistant.new.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 763 | `src\lib\components\_archive\svelte4\EnhancedAIAssistant.simple.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 764 | `src\lib\components\_archive\svelte4\ErrorBoundary.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 765 | `src\lib\components\_archive\svelte4\EvidenceProcessor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 766 | `src\lib\components\_archive\svelte4\InfiniteScrollList.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 767 | `src\lib\components\_archive\svelte4\InspectorPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 768 | `src\lib\components\_archive\svelte4\LoginModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 769 | `src\lib\components\_archive\svelte4\ProfessionalEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 770 | `src\lib\components\_archive\svelte4\ProgressIndicator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 771 | `src\lib\components\_archive\svelte4\RealTimeEvidenceGrid.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 772 | `src\lib\components\_archive\svelte4\RealtimeRAG.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 773 | `src\lib\components\_archive\svelte4\ReportEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 774 | `src\lib\components\_archive\svelte4\ReviewSubmitForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 775 | `src\lib\components\_archive\test-demo\demo\AdvancedCacheDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 776 | `src\lib\components\_archive\test-demo\demo\CachedRAGDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 777 | `src\lib\components\_archive\test-demo\demo\EnhancedCaseManagementDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 778 | `src\lib\components\_archive\test-demo\demo\EnhancedSemanticIntegration.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 779 | `src\lib\components\_archive\test-demo\demo\GamingCacheDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 780 | `src\lib\components\_archive\test-demo\demo\IntegratedSystemDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 781 | `src\lib\components\_archive\test-demo\demo\PerformanceOptimizedEvidenceBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 782 | `src\lib\components\_archive\test-demo\demo\SOMIntelligentTodoGenerator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 783 | `src\lib\components\_archive\test-demo\demo\VectorIntelligenceDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 784 | `src\lib\components\_archive\test-demo\demo\VectorPipelineDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 785 | `src\lib\components\_archive\test-demo\demo\WasmGpuDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 786 | `src\lib\components\_archive\test-demo\demo\WebGPUAccelerationDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 787 | `src\lib\components\_archive\test-demo\demo\WebGPUArrayUtilsDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 788 | `src\lib\components\_archive\test-demo\demo\WebGPUQuantizationDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 789 | `src\lib\components\_archive\test-demo\dev\Context7TestDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 790 | `src\lib\components\_archive\test-demo\dev\CookieStatus.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 791 | `src\lib\components\_archive\test-demo\dev\MCPToolsDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 792 | `src\lib\components\_archive\test-demo\dev\SelfPromptingDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 793 | `src\lib\components\_archive\test-demo\examples\CounterExample.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 794 | `src\lib\components\_archive\test-demo\examples\NESMemoryArchitectureExample.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 795 | `src\lib\components\_archive\test-demo\examples\NESTextureStreamingExample.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 796 | `src\lib\components\_archive\test-demo\examples\Svelte5Examples.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 797 | `src\lib\components\_archive\test-demo\storybook\DiffusionEmbeddingEffects.stories.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 798 | `src\lib\components\_archive\test-demo\storybook\PS1CRTEffects.stories.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 799 | `src\lib\components\_archive\test-demo\storybook\PS1ParallaxDynamic.stories.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 800 | `src\lib\components\_archive\test-demo\storybook\PS1StereoscopicEffects.stories.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 801 | `src\lib\components\_archive\test-demo\storybook\PS1TextureFiltering.stories.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 802 | `src\lib\components\_archive\test-demo\tests\ComprehensiveAITest.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 803 | `src\lib\components\_archive\test-demo\tests\WebAssemblyLangChainTest.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 804 | `src\lib\components\admin\AdminSidebar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 805 | `src\lib\components\admin\EvidenceDataGrid.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 806 | `src\lib\components\admin\JurisdictionSelector.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 807 | `src\lib\components\agentic\AgenticController.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 808 | `src\lib\components\ai\AIAssistantButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 809 | `src\lib\components\ai\AIAssistantChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 810 | `src\lib\components\ai\AIAssistantModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 811 | `src\lib\components\ai\AIAssistantPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 812 | `src\lib\components\ai\AIButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 813 | `src\lib\components\ai\AIButtonPortal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 814 | `src\lib\components\ai\AIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 815 | `src\lib\components\ai\AIChatInput.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 816 | `src\lib\components\ai\AIChatInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 817 | `src\lib\components\ai\AIChatMessage.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 818 | `src\lib\components\ai\AIChatWidget.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 819 | `src\lib\components\ai\AIProcessingDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 820 | `src\lib\components\ai\AIPromptSearch.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 821 | `src\lib\components\ai\AIRecommendation.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 822 | `src\lib\components\ai\AIServiceStatus.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 823 | `src\lib\components\ai\AIStatusIndicator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 824 | `src\lib\components\ai\AISummaryButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 825 | `src\lib\components\ai\AIToolbar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 826 | `src\lib\components\ai\AgentOrchestrator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 827 | `src\lib\components\ai\AiAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 828 | `src\lib\components\ai\AiSetupBanner.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 829 | `src\lib\components\ai\AskAI.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 830 | `src\lib\components\ai\AuditResults.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 831 | `src\lib\components\ai\CachePerformanceDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 832 | `src\lib\components\ai\CaseScoringDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 833 | `src\lib\components\ai\ChatInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 834 | `src\lib\components\ai\ChatMessage.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 835 | `src\lib\components\ai\ClientSideAIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 836 | `src\lib\components\ai\ContextualChatDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 837 | `src\lib\components\ai\CudaSearch.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 838 | `src\lib\components\ai\DeedAnalysis.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 839 | `src\lib\components\ai\DocumentUploadSimulator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 840 | `src\lib\components\ai\Enhanced3DLegalAIInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 841 | `src\lib\components\ai\EnhancedAIAssistant.simple.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 842 | `src\lib\components\ai\EnhancedAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 843 | `src\lib\components\ai\EnhancedAIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 844 | `src\lib\components\ai\EnhancedAIChatTest.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 845 | `src\lib\components\ai\EnhancedContextualChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 846 | `src\lib\components\ai\EnhancedDocumentUploader.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 847 | `src\lib\components\ai\EnhancedFileUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 848 | `src\lib\components\ai\EnhancedInlineEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 849 | `src\lib\components\ai\EnhancedLegalAIChatWithSynthesis.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 850 | `src\lib\components\ai\EnhancedMCPIntegration.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 851 | `src\lib\components\ai\EnhancedRAGDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 852 | `src\lib\components\ai\EnhancedVectorSearch.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 853 | `src\lib\components\ai\EvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 854 | `src\lib\components\ai\EvidenceTimelineCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 855 | `src\lib\components\ai\FileUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 856 | `src\lib\components\ai\FindModal.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 857 | `src\lib\components\ai\GPUAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 858 | `src\lib\components\ai\GPUStreamingChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 859 | `src\lib\components\ai\GamingAIButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 860 | `src\lib\components\ai\GamingAIInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 861 | `src\lib\components\ai\Gemma270MWebAssembly.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 862 | `src\lib\components\ai\Gemma3LegalChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 863 | `src\lib\components\ai\IngestAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 864 | `src\lib\components\ai\IntegratedAIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 865 | `src\lib\components\ai\IntelligentModelOrchestrator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 866 | `src\lib\components\ai\IntelligentWebAnalysisDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 867 | `src\lib\components\ai\LLMProviderSelector.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 868 | `src\lib\components\ai\LLMSelector.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 869 | `src\lib\components\ai\LegalAIPipelineDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 870 | `src\lib\components\ai\LegalDocumentDrafting.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 871 | `src\lib\components\ai\LegalDocumentSummarizer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 872 | `src\lib\components\ai\LocalImageGenerator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 873 | `src\lib\components\ai\ModularAIExperience.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 874 | `src\lib\components\ai\MultiAgentAnalysisCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 875 | `src\lib\components\ai\MultiLLMOrchestrator.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 876 | `src\lib\components\ai\NESTextureStreamer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 877 | `src\lib\components\ai\NeuralTopology3DDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 878 | `src\lib\components\ai\NierAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 879 | `src\lib\components\ai\OCRTensorDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 880 | `src\lib\components\ai\OllamaAutoComplete.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 881 | `src\lib\components\ai\PatternDetectionInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 882 | `src\lib\components\ai\PersonOfInterestCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 883 | `src\lib\components\ai\Phase8Demo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 884 | `src\lib\components\ai\ProactiveAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 885 | `src\lib\components\ai\ProactivePrompt.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 886 | `src\lib\components\ai\QLorATrainingPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 887 | `src\lib\components\ai\RAGAssistantChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 888 | `src\lib\components\ai\RealtimeCommunicationDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 889 | `src\lib\components\ai\RecommendationEngine.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 890 | `src\lib\components\ai\SIMDAIAssistantDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 891 | `src\lib\components\ai\SIMDGlyphDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 892 | `src\lib\components\ai\SIMDTextTilingDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 893 | `src\lib\components\ai\SOMVisualization.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 894 | `src\lib\components\ai\SimpleFileUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 895 | `src\lib\components\ai\SimpleWorkingChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 896 | `src\lib\components\ai\SmartSearchInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 897 | `src\lib\components\ai\SoraGraphVisualization.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 898 | `src\lib\components\ai\ThinkingStyleToggle.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 899 | `src\lib\components\ai\TypewriterResponse.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 900 | `src\lib\components\ai\UnifiedAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 901 | `src\lib\components\ai\VectorIntelligenceDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 902 | `src\lib\components\ai\WWWHAnalyzer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 903 | `src\lib\components\ai\XStatePhase8Integration.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 904 | `src\lib\components\ai\YorhaAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 905 | `src\lib\components\ai\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 906 | `src\lib\components\ai\ollama-agent-shell.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 907 | `src\lib\components\ai\webgpu-viewer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 908 | `src\lib\components\ai\CaseScoringDashboard\CaseScoringDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 909 | `src\lib\components\ai\PatternDetectionInterface\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 910 | `src\lib\components\ai\cognitive\NeuralPerformanceDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 911 | `src\lib\components\ai\cognitive\WebGPUVisualization.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 912 | `src\lib\components\ai\copilot\AutonomousEngineeringDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 913 | `src\lib\components\ui\progress\Progress.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 914 | `src\lib\components\upload\EnhancedUploadProgress.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 915 | `src\lib\components\ai\rag\DocumentUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 916 | `src\lib\components\ai\rag\EnhancedRAGInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 917 | `src\lib\components\ai\webgpu\CacheOptimizerDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 918 | `src\lib\components\ai\webgpu\WebGPUProcessor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 919 | `src\lib\components\ai\webgpu\WebGPUWebAssemblyBridge.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 920 | `src\lib\components\analytics\PerformanceDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 921 | `src\lib\components\bits-ui\ButtonExample.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 922 | `src\lib\components\bits-ui\ButtonExampleUsage.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 923 | `src\lib\components\bits-ui\Search.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 924 | `src\lib\components\bits-ui\Upload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 925 | `src\lib\components\bits-ui\VectorCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 926 | `src\lib\components\cache\CacheDemo.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 927 | `src\lib\components\canvas\AdvancedEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 928 | `src\lib\components\canvas\CollaborativeEvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 929 | `src\lib\components\canvas\EnhancedEvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 930 | `src\lib\components\canvas\EnhancedLegalCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 931 | `src\lib\components\canvas\EvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 932 | `src\lib\components\canvas\EvidenceCanvasEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 933 | `src\lib\components\canvas\EvidenceNode.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 934 | `src\lib\components\canvas\FabricEvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 935 | `src\lib\components\canvas\POINode.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 936 | `src\lib\components\canvas\RecursiveEvidenceNode.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 937 | `src\lib\components\canvas\RecursiveEvidenceVisualization.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 938 | `src\lib\components\canvas\ReportNode.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 939 | `src\lib\components\canvas\UnifiedCanvasIntegration.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 940 | `src\lib\components\canvas\WebGPUCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 941 | `src\lib\components\case\SimilarCasesPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 942 | `src\lib\components\legal-ai\CitationDetail.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 943 | `src\lib\components\legal-ai\CitationList.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 944 | `src\lib\components\cases\CaseCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 945 | `src\lib\components\cases\CaseFilters.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 946 | `src\lib\components\cases\CaseListItem.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 947 | `src\lib\components\editors\NierRichTextEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 948 | `src\lib\components\cases\CaseStats.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 949 | `src\lib\components\cases\EvidenceCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 950 | `src\lib\components\chat\ChatMessage.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 951 | `src\lib\components\chat\ContextualComposer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 952 | `src\lib\components\chat\LegalAIChat.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 953 | `src\lib\components\chat\SSRQLorAChatInterface.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 954 | `src\lib\components\chat\nes-typewriter-stream.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 955 | `src\lib\components\chr-rom\DocumentListCHRROM.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 956 | `src\lib\components\citations\CitationEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 957 | `src\lib\components\citations\CitationsList.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 958 | `src\lib\components\citations\CitationsManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 959 | `src\lib\components\citations\CitationsSaveButton.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 960 | `src\lib\components\command-center\AllRoutesExplorer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 961 | `src\lib\components\dashboard\CachePerformanceMonitor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 962 | `src\lib\components\dashboard\CaseCardGrid.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 963 | `src\lib\components\dashboard\EvidenceAnalysisDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 964 | `src\lib\components\dashboard\FallbackAlert.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 965 | `src\lib\components\dashboard\LegalAIDashboard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 966 | `src\lib\components\dashboard\ProgressCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 967 | `src\lib\components\dashboard\SystemStatusPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 968 | `src\lib\components\detective\ContextMenu.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 969 | `src\lib\components\detective\ContextualDetectiveBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 970 | `src\lib\components\detective\DetectiveBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 971 | `src\lib\components\detective\EvidenceCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 972 | `src\lib\components\detective\UploadZone.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 973 | `src\lib\components\editor\LegalDocumentEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 974 | `src\lib\components\editor\ReportEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 975 | `src\lib\components\editor\ReportToolbar.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 976 | `src\lib\components\editor\RichTextEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 977 | `src\lib\components\editor\TiptapWithAIAssistant.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 978 | `src\lib\components\editor\WysiwygEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 979 | `src\lib\components\effects\ParallaxBackground.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 980 | `src\lib\components\error\ErrorBoundary.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 981 | `src\lib\components\evidence\+EvidenceUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 982 | `src\lib\components\evidence\CaseEvidenceOrganizer.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 983 | `src\lib\components\evidence\DraggableEvidenceNode.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 984 | `src\lib\components\evidence\Enhanced3DEvidenceBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 985 | `src\lib\components\evidence\EnhancedEvidenceBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 986 | `src\lib\components\evidence\EvidenceCanvas.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 987 | `src\lib\components\evidence\EvidenceCard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 988 | `src\lib\components\evidence\EvidenceFilesManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 989 | `src\lib\components\evidence\EvidenceManager.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 990 | `src\lib\components\evidence\EvidenceProcessingWorkflow.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 991 | `src\lib\components\evidence\EvidenceUpload.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 992 | `src\lib\components\evidence\EvidenceUploadPreview.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 993 | `src\lib\components\evidence\EvidenceUploader.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 994 | `src\lib\components\evidence\SimpleEvidenceBoard.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 995 | `src\lib\components\evidence-editor\AIAssistantPanel.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 996 | `src\lib\components\evidence-editor\VisualEvidenceEditor.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 997 | `src\lib\components\evidence-graph\index.ts` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 998 | `src\lib\components\forms\CaseForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 999 | `src\lib\components\forms\EnhancedCaseForm.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |
| 1000 | `src\lib\components\forms\EnhancedCaseFormWithZod.svelte` | 1 | 38 | 2 | **19 (P2)** | components | 1 | 1 |

## 📋 Detailed Breakdown (Top 20)

### 1. at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js
- **Errors:** 1094
- **Category:** other
- **Impact:** 8770
- **Risk:** 2
- **Impact/Risk:** 4385
- **Cluster Size:** 1094 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 1094 occurrences

### 2. src\lib\cache\loki-redis-integration-fixed.ts
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

### 3. src\lib\cache\loki-redis-integration.ts
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

### 4. src\lib\cache\headless-ui-cache.ts
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

### 5. src\lib\cache\gpu-leftover-cache.ts
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

### 6. src\lib\auth\roles.ts
- **Errors:** 93
- **Category:** auth
- **Impact:** 2549
- **Risk:** 3
- **Impact/Risk:** 849.67
- **Cluster Size:** 4 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 93 occurrences

### 7. src\lib\cache\chr-rom-pattern-cache.ts
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

### 8. src\lib\components\POIPhotoModal.svelte
- **Errors:** 102
- **Category:** components
- **Impact:** 1578
- **Risk:** 2
- **Impact/Risk:** 789
- **Cluster Size:** 6 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 102 occurrences

### 9. src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts
- **Errors:** 100
- **Category:** components
- **Impact:** 1578
- **Risk:** 2
- **Impact/Risk:** 789
- **Cluster Size:** 12 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 100 occurrences

### 10. src\lib\stores\app-store.ts
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

### 11. src\lib\api\services\auth-service.ts
- **Errors:** 84
- **Category:** auth
- **Impact:** 2301
- **Risk:** 3
- **Impact/Risk:** 767
- **Cluster Size:** 3 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 84 occurrences

### 12. src\lib\3d\memory-palace-engine.ts
- **Errors:** 484
- **Category:** other
- **Impact:** 1505
- **Risk:** 2
- **Impact/Risk:** 752.5
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 484 occurrences

### 13. src\lib\components\ui\gaming\core\GamingEvolutionManager.ts
- **Errors:** 94
- **Category:** components
- **Impact:** 1483
- **Risk:** 2
- **Impact/Risk:** 741.5
- **Cluster Size:** 11 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 94 occurrences

### 14. src\lib\components\ui\layout\index.ts
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

### 15. src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts
- **Errors:** 83
- **Category:** components
- **Impact:** 1323
- **Risk:** 2
- **Impact/Risk:** 661.5
- **Cluster Size:** 12 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 83 occurrences

### 16. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts
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

### 17. src\lib\memory\nes-memory-architecture.ts
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

### 18. src\lib\server\auth.ts
- **Errors:** 67
- **Category:** auth
- **Impact:** 1837
- **Risk:** 3
- **Impact/Risk:** 612.33
- **Cluster Size:** 2 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 67 occurrences

### 19. src\lib\server\lokiHybridStore.ts
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

### 20. src\lib\db\schema-example-legal.ts
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

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)
- [ ] `at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js` (1094 errors, impact/risk: 4385)
- [ ] `src\lib\cache\loki-redis-integration-fixed.ts` (762 errors, impact/risk: 1177)
- [ ] `src\lib\cache\loki-redis-integration.ts` (745 errors, impact/risk: 1144)
- [ ] `src\lib\cache\headless-ui-cache.ts` (563 errors, impact/risk: 876)
- [ ] `src\lib\cache\gpu-leftover-cache.ts` (558 errors, impact/risk: 873.5)
- [ ] `src\lib\auth\roles.ts` (93 errors, impact/risk: 849.67)
- [ ] `src\lib\cache\chr-rom-pattern-cache.ts` (523 errors, impact/risk: 811)
- [ ] `src\lib\components\POIPhotoModal.svelte` (102 errors, impact/risk: 789)
- [ ] `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` (100 errors, impact/risk: 789)
- [ ] `src\lib\stores\app-store.ts` (86 errors, impact/risk: 788)

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
- 1100 files remaining

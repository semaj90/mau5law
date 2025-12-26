# Phase 79: Error Leaderboard (phase80-machine-baseline)

**Generated:** 2025-12-26T20:00:46.744Z
**Total Errors:** 28593
**Affected Files:** 748
**Top N:** 200

---

## 📊 By Architecture Component

- **other**: 22371 errors
- **components**: 4616 errors
- **utils**: 686 errors
- **database**: 490 errors
- **auth**: 270 errors
- **stores**: 128 errors
- **quic-protocol**: 32 errors

## 🔍 By Error Pattern

- **unknown**: 27759 occurrences
- **duplicate-identifier**: 831 occurrences
- **env-type-declarations**: 2 occurrences
- **missing-await**: 1 occurrences

## 🎯 Top 200 Files by Impact Score

| Rank | File | Errors | Impact | Risk | Impact/Risk | Category | Packages | Cluster |
|------|------|--------|--------|------|-------------|----------|----------|---------|
| 1 | `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` | 213 | 3268 | 2 | **1634 (P0)** | components | 1 | 11 |
| 2 | `src\lib\server\ai\rag-pipeline-enhanced.ts` | 781 | 2431 | 2 | **1215.5 (P0)** | other | 1 | 14 |
| 3 | `src\lib\adapters\webasm-ai-adapter.ts` | 768 | 2372 | 2 | **1186 (P0)** | other | 1 | 10 |
| 4 | `src\lib\components\yorha\CaseTheoryConstructor.svelte` | 140 | 2183 | 2 | **1091.5 (P0)** | components | 1 | 13 |
| 5 | `src\lib\services\qlora-rl-langextract-integration.ts` | 672 | 2104 | 2 | **1052 (P0)** | other | 1 | 14 |
| 6 | `src\lib\server\lokiHybridStore.ts` | 665 | 2063 | 2 | **1031.5 (P0)** | other | 1 | 10 |
| 7 | `src\lib\services\enhanced-api-client.ts` | 618 | 1907 | 2 | **953.5 (P0)** | other | 1 | 7 |
| 8 | `src\lib\services\enhanced-rag-pagerank.ts` | 573 | 1787 | 2 | **893.5 (P0)** | other | 1 | 10 |
| 9 | `src\lib\components\POIPhotoModal.svelte` | 101 | 1553 | 2 | **776.5 (P0)** | components | 1 | 4 |
| 10 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` | 99 | 1543 | 2 | **771.5 (P0)** | components | 1 | 8 |
| 11 | `src\lib\components\RouteInspectorWorking.svelte` | 98 | 1533 | 2 | **766.5 (P0)** | components | 1 | 9 |
| 12 | `src\lib\components\ui\gaming\types\gaming-types.ts` | 97 | 1508 | 2 | **754 (P0)** | components | 1 | 7 |
| 13 | `src\lib\server\embedding-cache-service.ts` | 482 | 1504 | 2 | **752 (P0)** | other | 1 | 8 |
| 14 | `src\lib\components\ui\context-menu\index.ts` | 89 | 1463 | 2 | **731.5 (P0)** | components | 1 | 22 |
| 15 | `src\lib\schemas\vector.ts` | 48 | 1344 | 2 | **672 (P0)** | database | 1 | 6 |
| 16 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts` | 84 | 1318 | 2 | **659 (P0)** | components | 1 | 8 |
| 17 | `src\lib\utils\type-guards.ts` | 92 | 1302 | 2 | **651 (P0)** | utils | 1 | 36 |
| 18 | `src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts` | 81 | 1288 | 2 | **644 (P0)** | components | 1 | 11 |
| 19 | `src\lib\utils\simd-json-parser.ts` | 100 | 1248 | 2 | **624 (P0)** | utils | 1 | 6 |
| 20 | `src\lib\client\ocr-tensor-processor.ts` | 376 | 1206 | 2 | **603 (P0)** | other | 1 | 12 |
| 21 | `src\lib\db\schema-example-legal.ts` | 65 | 1803 | 3 | **601 (P0)** | database | 1 | 6 |
| 22 | `src\lib\services\cognitive-cache-integration.ts` | 369 | 1170 | 2 | **585 (P0)** | other | 1 | 9 |
| 23 | `src\lib\utils\buffer-conversion.ts` | 86 | 1105 | 2 | **552.5 (P0)** | utils | 1 | 11 |
| 24 | `src\lib\components\ui\bits\types.ts` | 71 | 1103 | 2 | **551.5 (P0)** | components | 1 | 4 |
| 25 | `src\lib\components\NESGraphRenderer.svelte` | 71 | 1098 | 2 | **549 (P0)** | components | 1 | 3 |
| 26 | `src\lib\utils\route-operation-logger.ts` | 87 | 1087 | 2 | **543.5 (P0)** | utils | 1 | 5 |
| 27 | `src\lib\components\cases\CaseNotesEditor.svelte` | 67 | 1073 | 2 | **536.5 (P0)** | components | 1 | 10 |
| 28 | `src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts` | 69 | 1068 | 2 | **534 (P0)** | components | 1 | 3 |
| 29 | `src\lib\components\ui\enhanced\Button.stories.ts` | 64 | 1048 | 2 | **524 (P0)** | components | 1 | 14 |
| 30 | `src\lib\components\ui\gaming\constants\gaming-constants-minimal.ts` | 60 | 1028 | 2 | **514 (P0)** | components | 1 | 22 |
| 31 | `src\lib\components\ai\legal\ComprehensiveLegalAI.svelte` | 66 | 1023 | 2 | **511.5 (P0)** | components | 1 | 3 |
| 32 | `src\lib\components\three\yorha-ui\components\YoRHaModal3D.ts` | 62 | 1023 | 2 | **511.5 (P0)** | components | 1 | 15 |
| 33 | `src\lib\components\ui\gaming\n64\index.ts` | 62 | 1003 | 2 | **501.5 (P0)** | components | 1 | 11 |
| 34 | `src\lib\middleware\binary-encoding.ts` | 273 | 1002 | 2 | **501 (P0)** | other | 1 | 33 |
| 35 | `src\lib\components\ui\bits\custom-design-integration.ts` | 63 | 998 | 2 | **499 (P0)** | components | 1 | 7 |
| 36 | `src\lib\components\ui\gaming\constants\gaming-constants.ts` | 62 | 988 | 2 | **494 (P0)** | components | 1 | 8 |
| 37 | `src\lib\components\integration\LegalAIOrchestrationDemo.svelte` | 60 | 978 | 2 | **489 (P0)** | components | 1 | 12 |
| 38 | `src\lib\components\yorha\JudicialAnalysisAgent.svelte` | 63 | 978 | 2 | **489 (P0)** | components | 1 | 3 |
| 39 | `src\lib\cache\chr-rom-pattern-cache.ts` | 300 | 963 | 2 | **481.5 (P0)** | other | 1 | 9 |
| 40 | `src\lib\machines\vectorJobMachine.ts` | 286 | 956 | 2 | **478 (P0)** | other | 1 | 16 |
| 41 | `src\lib\routing\dynamic-route-generator.ts` | 294 | 940 | 2 | **470 (P0)** | other | 1 | 8 |
| 42 | `src\lib\utils\webgpu-buffer-uploader.ts` | 72 | 932 | 2 | **466 (P0)** | utils | 1 | 10 |
| 43 | `src\lib\components\three\yorha-ui\api\YoRHaAPIClient.ts` | 59 | 928 | 2 | **464 (P0)** | components | 1 | 5 |
| 44 | `src\lib\stores.svelte.ts` | 49 | 920 | 2 | **460 (P0)** | stores | 1 | 4 |
| 45 | `src\lib\components\ai\ContextualEvidenceChatModal.svelte` | 58 | 918 | 2 | **459 (P0)** | components | 1 | 6 |
| 46 | `src\lib\components\yorha\DetectiveEvidenceMap.svelte` | 58 | 913 | 2 | **456.5 (P0)** | components | 1 | 5 |
| 47 | `src\lib\machines\ingestion-workflow-machine.ts` | 280 | 903 | 2 | **451.5 (P0)** | other | 1 | 9 |
| 48 | `src\lib\cache\parallel-cache-orchestrator.ts` | 282 | 894 | 2 | **447 (P0)** | other | 1 | 6 |
| 49 | `src\lib\components\ui\gaming\core\GamingEvolutionManager-minimal.ts` | 55 | 883 | 2 | **441.5 (P0)** | components | 1 | 8 |
| 50 | `src\lib\routing\route-registry.svelte.ts` | 278 | 882 | 2 | **441 (P0)** | other | 1 | 6 |
| 51 | `src\lib\cache\multi-layer-cache.ts` | 277 | 879 | 2 | **439.5 (P0)** | other | 1 | 6 |
| 52 | `src\lib\components\three\yorha-ui\components\YoRHaButton3D.ts` | 54 | 873 | 2 | **436.5 (P0)** | components | 1 | 9 |
| 53 | `src\lib\machines\aiAssistantMachine.ts` | 273 | 872 | 2 | **436 (P0)** | other | 1 | 7 |
| 54 | `src\lib\db\drizzle-usage-examples.ts` | 46 | 1280 | 3 | **426.67 (P0)** | database | 1 | 4 |
| 55 | `src\lib\components\yorha\TimelineReconstructionEngine.svelte` | 54 | 843 | 2 | **421.5 (P0)** | components | 1 | 3 |
| 56 | `src\lib\server\db\queries.ts` | 45 | 1258 | 3 | **419.33 (P0)** | database | 1 | 5 |
| 57 | `src\lib\server\ai\agentic-stream.ts` | 253 | 837 | 2 | **418.5 (P0)** | other | 1 | 12 |
| 58 | `src\lib\database\migrations\migration-system.ts` | 314 | 1255 | 3 | **418.33 (P0)** | other | 1 | 59 |
| 59 | `src\lib\utils\simd-json-cache.ts` | 92 | 1222 | 3 | **407.33 (P0)** | utils | 1 | 20 |
| 60 | `src\lib\server\db-insert-helpers.ts` | 43 | 1199 | 3 | **399.67 (P0)** | database | 1 | 4 |
| 61 | `src\lib\memory\nes-memory-architecture.ts` | 249 | 795 | 2 | **397.5 (P0)** | other | 1 | 6 |
| 62 | `src\lib\components\ai\FileUploadGemma3.stories.ts` | 49 | 793 | 2 | **396.5 (P0)** | components | 1 | 8 |
| 63 | `src\lib\machines\graph-cache-machine.ts` | 188 | 787 | 2 | **393.5 (P0)** | other | 1 | 41 |
| 64 | `src\lib\machines\enhanced-legal-upload-analytics-machine.ts` | 230 | 773 | 2 | **386.5 (P0)** | other | 1 | 13 |
| 65 | `src\lib\routing\unified-api-router.ts` | 240 | 768 | 2 | **384 (P0)** | other | 1 | 6 |
| 66 | `src\lib\optimization\simd-json-parser-bridge.ts` | 232 | 764 | 2 | **382 (P0)** | other | 1 | 10 |
| 67 | `src\lib\components\types.ts` | 47 | 743 | 2 | **371.5 (P0)** | components | 1 | 4 |
| 68 | `src\lib\ast\suggestion-engine.ts` | 233 | 742 | 2 | **371 (P0)** | other | 1 | 5 |
| 69 | `src\lib\components\legal-ai\CitationSaveModal.svelte` | 42 | 738 | 2 | **369 (P0)** | components | 1 | 18 |
| 70 | `src\lib\components\three\yorha-ui\components\YoRHaInput3D.ts` | 43 | 738 | 2 | **369 (P0)** | components | 1 | 15 |
| 71 | `src\lib\components\vision\PhoenixWrightSearch.svelte` | 46 | 728 | 2 | **364 (P0)** | components | 1 | 4 |
| 72 | `src\lib\server\auth-guard.ts` | 37 | 1032 | 3 | **344 (P0)** | auth | 1 | 3 |
| 73 | `src\lib\components\poi\POIForm.svelte` | 43 | 678 | 2 | **339 (P0)** | components | 1 | 3 |
| 74 | `src\lib\server\pgvector-cache.ts` | 138 | 677 | 2 | **338.5 (P0)** | other | 1 | 49 |
| 75 | `src\lib\auth\roles.ts` | 36 | 1015 | 3 | **338.33 (P0)** | auth | 1 | 5 |
| 76 | `src\lib\utils\typed-array-quantization.ts` | 53 | 674 | 2 | **337 (P0)** | utils | 1 | 4 |
| 77 | `src\lib\optimization\neural-memory-manager.ts` | 188 | 667 | 2 | **333.5 (P0)** | other | 1 | 17 |
| 78 | `src\lib\workers\rabbitmq-service-worker.ts` | 200 | 663 | 2 | **331.5 (P0)** | other | 1 | 9 |
| 79 | `src\lib\machines\auth-machine.ts` | 35 | 988 | 3 | **329.33 (P0)** | auth | 1 | 5 |
| 80 | `src\lib\components\ui\AIFileUpload.svelte` | 42 | 658 | 2 | **329 (P0)** | components | 1 | 2 |
| 81 | `src\lib\cache\gpu-leftover-cache.ts` | 203 | 657 | 2 | **328.5 (P0)** | other | 1 | 6 |
| 82 | `src\lib\components\three\yorha-ui\YoRHaAntiAliasing3D.ts` | 38 | 653 | 2 | **326.5 (P0)** | components | 1 | 13 |
| 83 | `src\lib\components\three\yorha-ui\YoRHaLayout3D.ts` | 41 | 653 | 2 | **326.5 (P0)** | components | 1 | 4 |
| 84 | `src\lib\components\ui\bits\component-loader.ts` | 41 | 653 | 2 | **326.5 (P0)** | components | 1 | 4 |
| 85 | `src\lib\components\ai\AutomatedLegalResearch.svelte` | 40 | 643 | 2 | **321.5 (P0)** | components | 1 | 5 |
| 86 | `src\lib\components\ui\enhanced-bits.ts` | 40 | 643 | 2 | **321.5 (P0)** | components | 1 | 5 |
| 87 | `src\lib\machines\vector-pipeline-machine.ts` | 165 | 638 | 2 | **319 (P0)** | other | 1 | 25 |
| 88 | `src\lib\db\chat-schema.ts` | 32 | 927 | 3 | **309 (P0)** | database | 1 | 9 |
| 89 | `src\lib\components\yorha\PhoenixProsecutorDashboard.svelte` | 39 | 613 | 2 | **306.5 (P0)** | components | 1 | 2 |
| 90 | `src\lib\components\RouteInspectorDetectiveBoard.svelte` | 38 | 608 | 2 | **304 (P0)** | components | 1 | 4 |
| 91 | `src\lib\server\schema.ts` | 20 | 608 | 2 | **304 (P0)** | database | 1 | 10 |
| 92 | `src\lib\components\ui\bits\index.optimized.ts` | 37 | 603 | 2 | **301.5 (P0)** | components | 1 | 6 |
| 93 | `src\lib\machines\predictive-typing-machine.ts` | 163 | 597 | 2 | **298.5 (P0)** | other | 1 | 18 |
| 94 | `src\lib\services\automated-barrel-store-generator.ts` | 168 | 597 | 2 | **298.5 (P0)** | other | 1 | 15 |
| 95 | `src\lib\machines\agentShellMachine.ts` | 144 | 590 | 2 | **295 (P0)** | other | 1 | 28 |
| 96 | `src\lib\components\evidence\EvidenceBoard.svelte` | 37 | 588 | 2 | **294 (P0)** | components | 1 | 3 |
| 97 | `src\lib\components\three\yorha-ui\webgpu\YoRHaOptimizedTextureManager.ts` | 36 | 588 | 2 | **294 (P0)** | components | 1 | 6 |
| 98 | `src\lib\db\schema\legacy.ts` | 31 | 865 | 3 | **288.33 (P0)** | database | 1 | 2 |
| 99 | `src\lib\hooks\useRedisOrchestrator.ts` | 152 | 559 | 2 | **279.5 (P0)** | other | 1 | 17 |
| 100 | `src\lib\utils\mcp-helpers.ts` | 44 | 556 | 2 | **278 (P0)** | utils | 1 | 2 |
| 101 | `src\lib\components\yorha\PoliceReportGenerator.svelte` | 35 | 553 | 2 | **276.5 (P0)** | components | 1 | 2 |
| 102 | `src\lib\components\three\yorha-ui\webgpu\YoRHaWebGPUMath.ts` | 33 | 538 | 2 | **269 (P0)** | components | 1 | 5 |
| 103 | `src\lib\config\gemma3-config.ts` | 134 | 535 | 2 | **267.5 (P0)** | other | 1 | 23 |
| 104 | `src\lib\forms\contextual-chat-schema.ts` | 17 | 517 | 2 | **258.5 (P0)** | database | 1 | 8 |
| 105 | `src\lib\schemas\evidence-upload.ts` | 18 | 514 | 2 | **257 (P0)** | database | 1 | 2 |
| 106 | `src\lib\types\legal-types.ts` | 132 | 509 | 2 | **254.5 (P0)** | other | 1 | 19 |
| 107 | `src\lib\server\auth.ts` | 27 | 757 | 3 | **252.33 (P0)** | auth | 1 | 2 |
| 108 | `src\lib\components\ui\AutoPopulatedCaseForm.svelte` | 31 | 493 | 2 | **246.5 (P0)** | components | 1 | 2 |
| 109 | `src\lib\components\poi\PersonOfInterestDetailView.svelte` | 31 | 493 | 2 | **246.5 (P0)** | components | 1 | 2 |
| 110 | `src\lib\client\secure-storage-client.ts` | 141 | 486 | 2 | **243 (P0)** | other | 1 | 9 |
| 111 | `src\lib\workers\legal-ai-worker-pool.ts` | 129 | 485 | 2 | **242.5 (P0)** | other | 1 | 16 |
| 112 | `src\lib\ast\svelte-check-analyzer.ts` | 149 | 480 | 2 | **240 (P0)** | other | 1 | 3 |
| 113 | `src\lib\stores\dashboard\DocumentProgressStore.ts` | 25 | 478 | 2 | **239 (P0)** | stores | 1 | 2 |
| 114 | `src\lib\utils\webgpu-array-utils.ts` | 36 | 475 | 2 | **237.5 (P0)** | utils | 1 | 5 |
| 115 | `src\lib\components\ui\bits\performance.ts` | 29 | 468 | 2 | **234 (P0)** | components | 1 | 3 |
| 116 | `src\lib\db\localDocs.svelte.ts` | 217 | 699 | 3 | **233 (P0)** | other | 1 | 6 |
| 117 | `src\lib\logic\POI.ts` | 114 | 460 | 2 | **230 (P0)** | other | 1 | 20 |
| 118 | `src\lib\components\ContextConfirmModal.svelte` | 27 | 453 | 2 | **226.5 (P0)** | components | 1 | 6 |
| 119 | `src\lib\forms\superforms-xstate-integration.ts` | 131 | 451 | 2 | **225.5 (P0)** | other | 1 | 8 |
| 120 | `src\lib\machines\recommendation-routing-machine.ts` | 134 | 445 | 2 | **222.5 (P0)** | other | 1 | 5 |
| 121 | `src\lib\machines\legalAIMachine.v5.ts` | 125 | 438 | 2 | **219 (P0)** | other | 1 | 9 |
| 122 | `src\lib\components\yorha\dashboard\SystemOverview.svelte` | 26 | 438 | 2 | **219 (P0)** | components | 1 | 6 |
| 123 | `src\lib\models\ChatSession.svelte.ts` | 128 | 432 | 2 | **216 (P0)** | other | 1 | 6 |
| 124 | `src\lib\api\enhanced-case-api.ts` | 129 | 430 | 2 | **215 (P0)** | other | 1 | 5 |
| 125 | `src\lib\server\authPolicy.ts` | 22 | 637 | 3 | **212.33 (P0)** | auth | 1 | 5 |
| 126 | `src\lib\webgpu\shader-cache-manager.ts` | 120 | 418 | 2 | **209 (P0)** | other | 1 | 8 |
| 127 | `src\lib\components\evidence\EvidenceAssistant.svelte` | 26 | 418 | 2 | **209 (P0)** | components | 1 | 2 |
| 128 | `src\lib\components\ui\DiffViewer.svelte` | 26 | 418 | 2 | **209 (P0)** | components | 1 | 2 |
| 129 | `src\lib\proto\legal-ai-types.ts` | 113 | 412 | 2 | **206 (P0)** | other | 1 | 11 |
| 130 | `src\lib\routing\route-guards.ts` | 107 | 409 | 2 | **204.5 (P0)** | other | 1 | 14 |
| 131 | `src\lib\components\canvas\index.ts` | 24 | 398 | 2 | **199 (P0)** | components | 1 | 4 |
| 132 | `src\lib\components\legal\index.ts` | 24 | 398 | 2 | **199 (P0)** | components | 1 | 4 |
| 133 | `src\lib\auth\auth-store.ts` | 21 | 595 | 3 | **198.33 (P0)** | auth | 1 | 2 |
| 134 | `src\lib\server\authUtils.ts` | 20 | 593 | 3 | **197.67 (P0)** | auth | 1 | 7 |
| 135 | `src\lib\machines\index.ts` | 89 | 395 | 2 | **197.5 (P0)** | other | 1 | 22 |
| 136 | `src\lib\components\ui\MarkdownSceneViewer.svelte` | 24 | 393 | 2 | **196.5 (P0)** | components | 1 | 3 |
| 137 | `src\lib\components\upload\upload-core.ts` | 24 | 393 | 2 | **196.5 (P0)** | components | 1 | 3 |
| 138 | `src\lib\optimization\index.ts` | 88 | 392 | 2 | **196 (P0)** | other | 1 | 22 |
| 139 | `src\lib\components\evidence\VictimStatementWizard.svelte` | 24 | 388 | 2 | **194 (P0)** | components | 1 | 2 |
| 140 | `src\lib\simd\simd-json-worker-client.ts` | 98 | 387 | 2 | **193.5 (P0)** | other | 1 | 15 |
| 141 | `src\lib\machines\auth-machine.v5.ts` | 20 | 578 | 3 | **192.67 (P0)** | auth | 1 | 4 |
| 142 | `src\lib\components\cases\ContextualChatModal.svelte` | 23 | 383 | 2 | **191.5 (P0)** | components | 1 | 4 |
| 143 | `src\lib\components\ui\gaming\core\GamingEvolutionManager.ts` | 23 | 378 | 2 | **189 (P0)** | components | 1 | 3 |
| 144 | `src\lib\components\ui\EvidenceCanvas.svelte` | 22 | 373 | 2 | **186.5 (P0)** | components | 1 | 5 |
| 145 | `src\lib\components\ui\QuickActionButton\QuickActionButton.svelte` | 22 | 373 | 2 | **186.5 (P0)** | quic-protocol | 1 | 5 |
| 146 | `src\lib\agents\tools.ts` | 108 | 367 | 2 | **183.5 (P0)** | other | 1 | 5 |
| 147 | `src\lib\cache\headless-ui-cache.ts` | 109 | 365 | 2 | **182.5 (P0)** | other | 1 | 4 |
| 148 | `src\lib\stores\app-store.ts` | 19 | 365 | 2 | **182.5 (P0)** | stores | 1 | 1 |
| 149 | `src\lib\ast\ast-processor.ts` | 107 | 364 | 2 | **182 (P0)** | other | 1 | 5 |
| 150 | `src\lib\server\helpers\docker-discovery.ts` | 93 | 362 | 2 | **181 (P0)** | other | 1 | 13 |
| 151 | `src\lib\components\command-center\AceAgentControls.svelte` | 22 | 358 | 2 | **179 (P0)** | components | 1 | 2 |
| 152 | `src\lib\components\three\yorha-ui\theme\yorha-theme-adapter.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 153 | `src\lib\components\ui\Button.stories.ts` | 21 | 358 | 2 | **179 (P0)** | components | 1 | 5 |
| 154 | `src\lib\services\glyph-diffusion-service.ts` | 101 | 356 | 2 | **178 (P0)** | other | 1 | 7 |
| 155 | `src\lib\server\concurrent-json-serializer.ts` | 96 | 356 | 2 | **178 (P0)** | other | 1 | 10 |
| 156 | `src\lib\components\CanvasEditor.svelte` | 21 | 353 | 2 | **176.5 (P0)** | components | 1 | 4 |
| 157 | `src\lib\machines\caseManagementMachine.ts` | 99 | 350 | 2 | **175 (P0)** | other | 1 | 7 |
| 158 | `src\lib\components\CaseOutcomePrediction.svelte` | 21 | 348 | 2 | **174 (P0)** | components | 1 | 3 |
| 159 | `src\lib\evidence-canvas\graph-layout-gpu.ts` | 102 | 344 | 2 | **172 (P0)** | other | 1 | 4 |
| 160 | `src\lib\components\RouteOperationsDashboard.svelte` | 21 | 343 | 2 | **171.5 (P0)** | components | 1 | 2 |
| 161 | `src\lib\components\evidence\EvidenceUploadModal.svelte` | 21 | 343 | 2 | **171.5 (P0)** | components | 1 | 2 |
| 162 | `src\lib\orchestration\optimized-rabbitmq-orchestrator.ts` | 93 | 342 | 2 | **171 (P0)** | other | 1 | 9 |
| 163 | `src\lib\components\ui\wrappers\bits\index.ts` | 20 | 338 | 2 | **169 (P0)** | components | 1 | 4 |
| 164 | `src\lib\components\ui\modern\index.ts` | 20 | 333 | 2 | **166.5 (P0)** | components | 1 | 3 |
| 165 | `src\lib\components\error-analysis\KnowledgeGraph.svelte` | 19 | 318 | 2 | **159 (P0)** | components | 1 | 3 |
| 166 | `src\lib\components\phase78\ErrorModal.svelte` | 19 | 318 | 2 | **159 (P0)** | components | 1 | 3 |
| 167 | `src\lib\server\http-cache-headers.ts` | 79 | 315 | 2 | **157.5 (P0)** | other | 1 | 12 |
| 168 | `src\lib\components\legal\WorkspacePanel.svelte` | 19 | 313 | 2 | **156.5 (P0)** | components | 1 | 2 |
| 169 | `src\lib\agents\error-handler.ts` | 88 | 312 | 2 | **156 (P0)** | other | 1 | 6 |
| 170 | `src\lib\middleware\authSeparation.ts` | 16 | 465 | 3 | **155 (P0)** | auth | 1 | 3 |
| 171 | `src\lib\machines\legalCaseMachine.ts` | 83 | 307 | 2 | **153.5 (P0)** | other | 1 | 8 |
| 172 | `src\lib\services\api-client.ts` | 86 | 306 | 2 | **153 (P0)** | other | 1 | 6 |
| 173 | `src\lib\demos\neural-intent-demo.ts` | 71 | 306 | 2 | **153 (P0)** | other | 1 | 15 |
| 174 | `src\lib\components\legal-ai\AttachToCaseModal.svelte` | 18 | 303 | 2 | **151.5 (P0)** | components | 1 | 3 |
| 175 | `src\lib\components\ui\gaming\effects\gradient-utils.ts` | 15 | 303 | 2 | **151.5 (P0)** | components | 1 | 12 |
| 176 | `src\lib\server\storage\minio-service.ts` | 78 | 302 | 2 | **151 (P0)** | other | 1 | 10 |
| 177 | `src\lib\optimization\optimization-test-suite.ts` | 81 | 301 | 2 | **150.5 (P0)** | other | 1 | 8 |
| 178 | `src\lib\machines\workflow-machine.ts` | 89 | 300 | 2 | **150 (P0)** | other | 1 | 3 |
| 179 | `src\lib\actors\xstate-actor-wrapper.ts` | 77 | 299 | 2 | **149.5 (P0)** | other | 1 | 10 |
| 180 | `src\lib\server\embedding-cache-middleware.ts` | 60 | 298 | 2 | **149 (P0)** | other | 1 | 20 |
| 181 | `src\lib\server\knowledge-cache.ts` | 84 | 295 | 2 | **147.5 (P0)** | other | 1 | 5 |
| 182 | `src\lib\stores\dashboard\SSEStatusStore.ts` | 15 | 293 | 2 | **146.5 (P0)** | stores | 1 | 1 |
| 183 | `src\lib\services\cache-layer-manager.ts` | 63 | 292 | 2 | **146 (P0)** | other | 1 | 17 |
| 184 | `src\lib\components\phase78\SuggestionsList.svelte` | 17 | 288 | 2 | **144 (P0)** | components | 1 | 3 |
| 185 | `src\lib\evidence-canvas\evidence-canvas-core.svelte` | 79 | 285 | 2 | **142.5 (P0)** | other | 1 | 6 |
| 186 | `src\lib\server\database-api-bridge.ts` | 106 | 426 | 3 | **142 (P0)** | other | 1 | 18 |
| 187 | `src\lib\components\board\CanvasBoard.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 188 | `src\lib\components\case\ErrorAlert.svelte` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 189 | `src\lib\components\three\yorha-ui\components\YoRHaQuantumEffects3D.ts` | 17 | 283 | 2 | **141.5 (P0)** | components | 1 | 2 |
| 190 | `src\lib\optimization\context7-mcp-integration.ts` | 76 | 281 | 2 | **140.5 (P0)** | other | 1 | 7 |
| 191 | `src\lib\server\auth-simple.ts` | 14 | 421 | 3 | **140.33 (P0)** | auth | 1 | 5 |
| 192 | `src\lib\types\api-schemas.ts` | 9 | 276 | 2 | **138 (P0)** | database | 1 | 3 |
| 193 | `src\lib\webgpu\webgpu-init.ts` | 65 | 273 | 2 | **136.5 (P0)** | other | 1 | 12 |
| 194 | `src\lib\stores\dashboard\GrpcStatusAdapter.ts` | 13 | 272 | 2 | **136 (P0)** | stores | 1 | 4 |
| 195 | `src\lib\schemas\prosecution-case-form.ts` | 9 | 271 | 2 | **135.5 (P0)** | database | 1 | 2 |
| 196 | `src\lib\components\yorha\YoRHaCommandCenter.svelte` | 16 | 268 | 2 | **134 (P0)** | components | 1 | 2 |
| 197 | `src\lib\machines\ai-computation-machine.ts` | 65 | 268 | 2 | **134 (P0)** | other | 1 | 11 |
| 198 | `src\lib\components\agentic\AgentChat.svelte` | 16 | 263 | 2 | **131.5 (P0)** | components | 1 | 1 |
| 199 | `src\lib\components\yorha\YoRHaCommandCenter.stories.ts` | 15 | 263 | 2 | **131.5 (P0)** | components | 1 | 4 |
| 200 | `src\lib\server\api-ssr-helpers.ts` | 71 | 261 | 2 | **130.5 (P0)** | other | 1 | 6 |

## 📋 Detailed Breakdown (Top 20)

### 1. src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts
- **Errors:** 213
- **Category:** components
- **Impact:** 3268
- **Risk:** 2
- **Impact/Risk:** 1634
- **Cluster Size:** 11 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 211 occurrences
- `duplicate-identifier`: 2 occurrences

### 2. src\lib\server\ai\rag-pipeline-enhanced.ts
- **Errors:** 781
- **Category:** other
- **Impact:** 2431
- **Risk:** 2
- **Impact/Risk:** 1215.5
- **Cluster Size:** 14 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 779 occurrences
- `duplicate-identifier`: 2 occurrences

### 3. src\lib\adapters\webasm-ai-adapter.ts
- **Errors:** 768
- **Category:** other
- **Impact:** 2372
- **Risk:** 2
- **Impact/Risk:** 1186
- **Cluster Size:** 10 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 766 occurrences
- `duplicate-identifier`: 2 occurrences

### 4. src\lib\components\yorha\CaseTheoryConstructor.svelte
- **Errors:** 140
- **Category:** components
- **Impact:** 2183
- **Risk:** 2
- **Impact/Risk:** 1091.5
- **Cluster Size:** 13 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 140 occurrences

### 5. src\lib\services\qlora-rl-langextract-integration.ts
- **Errors:** 672
- **Category:** other
- **Impact:** 2104
- **Risk:** 2
- **Impact/Risk:** 1052
- **Cluster Size:** 14 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 660 occurrences
- `duplicate-identifier`: 12 occurrences

### 6. src\lib\server\lokiHybridStore.ts
- **Errors:** 665
- **Category:** other
- **Impact:** 2063
- **Risk:** 2
- **Impact/Risk:** 1031.5
- **Cluster Size:** 10 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 661 occurrences
- `duplicate-identifier`: 4 occurrences

### 7. src\lib\services\enhanced-api-client.ts
- **Errors:** 618
- **Category:** other
- **Impact:** 1907
- **Risk:** 2
- **Impact/Risk:** 953.5
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 607 occurrences
- `duplicate-identifier`: 11 occurrences

### 8. src\lib\services\enhanced-rag-pagerank.ts
- **Errors:** 573
- **Category:** other
- **Impact:** 1787
- **Risk:** 2
- **Impact/Risk:** 893.5
- **Cluster Size:** 10 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 573 occurrences

### 9. src\lib\components\POIPhotoModal.svelte
- **Errors:** 101
- **Category:** components
- **Impact:** 1553
- **Risk:** 2
- **Impact/Risk:** 776.5
- **Cluster Size:** 4 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 101 occurrences

### 10. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts
- **Errors:** 99
- **Category:** components
- **Impact:** 1543
- **Risk:** 2
- **Impact/Risk:** 771.5
- **Cluster Size:** 8 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 91 occurrences
- `duplicate-identifier`: 8 occurrences

### 11. src\lib\components\RouteInspectorWorking.svelte
- **Errors:** 98
- **Category:** components
- **Impact:** 1533
- **Risk:** 2
- **Impact/Risk:** 766.5
- **Cluster Size:** 9 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 98 occurrences

### 12. src\lib\components\ui\gaming\types\gaming-types.ts
- **Errors:** 97
- **Category:** components
- **Impact:** 1508
- **Risk:** 2
- **Impact/Risk:** 754
- **Cluster Size:** 7 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 84 occurrences
- `duplicate-identifier`: 13 occurrences

### 13. src\lib\server\embedding-cache-service.ts
- **Errors:** 482
- **Category:** other
- **Impact:** 1504
- **Risk:** 2
- **Impact/Risk:** 752
- **Cluster Size:** 8 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 482 occurrences

### 14. src\lib\components\ui\context-menu\index.ts
- **Errors:** 89
- **Category:** components
- **Impact:** 1463
- **Risk:** 2
- **Impact/Risk:** 731.5
- **Cluster Size:** 22 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 89 occurrences

### 15. src\lib\schemas\vector.ts
- **Errors:** 48
- **Category:** database
- **Impact:** 1344
- **Risk:** 2
- **Impact/Risk:** 672
- **Cluster Size:** 6 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 48 occurrences

### 16. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts
- **Errors:** 84
- **Category:** components
- **Impact:** 1318
- **Risk:** 2
- **Impact/Risk:** 659
- **Cluster Size:** 8 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 76 occurrences
- `duplicate-identifier`: 8 occurrences

### 17. src\lib\utils\type-guards.ts
- **Errors:** 92
- **Category:** utils
- **Impact:** 1302
- **Risk:** 2
- **Impact/Risk:** 651
- **Cluster Size:** 36 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 86 occurrences
- `duplicate-identifier`: 6 occurrences

### 18. src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts
- **Errors:** 81
- **Category:** components
- **Impact:** 1288
- **Risk:** 2
- **Impact/Risk:** 644
- **Cluster Size:** 11 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 77 occurrences
- `duplicate-identifier`: 4 occurrences

### 19. src\lib\utils\simd-json-parser.ts
- **Errors:** 100
- **Category:** utils
- **Impact:** 1248
- **Risk:** 2
- **Impact/Risk:** 624
- **Cluster Size:** 6 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 97 occurrences
- `duplicate-identifier`: 3 occurrences

### 20. src\lib\client\ocr-tensor-processor.ts
- **Errors:** 376
- **Category:** other
- **Impact:** 1206
- **Risk:** 2
- **Impact/Risk:** 603
- **Cluster Size:** 12 | **Packages:** 1
- **Build Breaker:** yes

**Error Patterns:**
- `unknown`: 372 occurrences
- `duplicate-identifier`: 4 occurrences

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)
- [ ] `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` (213 errors, impact/risk: 1634)
- [ ] `src\lib\server\ai\rag-pipeline-enhanced.ts` (781 errors, impact/risk: 1215.5)
- [ ] `src\lib\adapters\webasm-ai-adapter.ts` (768 errors, impact/risk: 1186)
- [ ] `src\lib\components\yorha\CaseTheoryConstructor.svelte` (140 errors, impact/risk: 1091.5)
- [ ] `src\lib\services\qlora-rl-langextract-integration.ts` (672 errors, impact/risk: 1052)
- [ ] `src\lib\server\lokiHybridStore.ts` (665 errors, impact/risk: 1031.5)
- [ ] `src\lib\services\enhanced-api-client.ts` (618 errors, impact/risk: 953.5)
- [ ] `src\lib\services\enhanced-rag-pagerank.ts` (573 errors, impact/risk: 893.5)
- [ ] `src\lib\components\POIPhotoModal.svelte` (101 errors, impact/risk: 776.5)
- [ ] `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` (99 errors, impact/risk: 771.5)

### P1 (High - Impact 50-100)
- [ ] `src\lib\components\ui\enhanced-bits.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\components\ui\label\Label.svelte` (6 errors, impact/risk: 59)
- [ ] `src\lib\services\localStorage-file-fallback.ts` (16 errors, impact/risk: 58)
- [ ] `src\lib\server\ibm-vision.ts` (26 errors, impact/risk: 58)
- [ ] `src\lib\adapters\wasm-rabbitmq-bridge.ts` (29 errors, impact/risk: 57.5)
- [ ] `src\lib\config\endpoints.ts` (24 errors, impact/risk: 57.5)
- [ ] `src\lib\machines\canvasSystem.ts` (22 errors, impact/risk: 57)
- [ ] `src\lib\moogle\stage6-production-orchestrator.ts` (22 errors, impact/risk: 57)
- [ ] `src\lib\components\EvidenceCard.svelte` (6 errors, impact/risk: 56.5)
- [ ] `src\lib\components\ui\input\InputBits.svelte` (6 errors, impact/risk: 56.5)

### P2 (Medium - Impact < 50)
- 222 files remaining

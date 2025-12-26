# Phase 79: Error Leaderboard (priority-analysis)

**Generated:** 2025-12-26T02:01:12.485Z
**Total Errors:** 28806
**Affected Files:** 1601
**Top N:** 1000

---

## 📊 By Architecture Component

- **other**: 21862 errors
- **components**: 4804 errors
- **auth**: 882 errors
- **utils**: 520 errors
- **database**: 420 errors
- **stores**: 284 errors
- **quic-protocol**: 34 errors

## 🔍 By Error Pattern

- **unknown**: 28179 occurrences
- **duplicate-identifier**: 625 occurrences
- **env-type-declarations**: 2 occurrences

## 🎯 Top 1000 Files by Impact Score

| Rank | File | Errors | Category | Weight | Impact | Fix Priority |
|------|------|--------|----------|--------|--------|--------------|
| 1 | `src\lib\server\auth.ts` | 262 | auth | 9 | 2925 | **P0** |
| 2 | `src\lib\machines\auth-machine.v5.ts` | 147 | auth | 9 | 1512 | **P0** |
| 3 | `src\lib\db\schema-example-legal.ts` | 66 | database | 9 | 1350 | **P0** |
| 4 | `at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js` | 1094 | other | 1 | 1094 | **P0** |
| 5 | `src\lib\auth\roles.ts` | 93 | auth | 9 | 837 | **P0** |
| 6 | `src\lib\stores\app-store.ts` | 86 | stores | 6 | 810 | **P0** |
| 7 | `src\lib\cache\loki-redis-integration-fixed.ts` | 762 | other | 1 | 790 | **P0** |
| 8 | `src\lib\cache\loki-redis-integration.ts` | 745 | other | 1 | 766 | **P0** |
| 9 | `src\lib\api\services\auth-service.ts` | 84 | auth | 9 | 756 | **P0** |
| 10 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` | 85 | components | 5 | 705 | **P0** |
| 11 | `src\lib\components\ui\layout\index.ts` | 84 | components | 5 | 700 | **P0** |
| 12 | `src\lib\auth\auth-store.ts` | 52 | auth | 9 | 657 | **P0** |
| 13 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts` | 74 | components | 5 | 650 | **P0** |
| 14 | `src\lib\messaging\rabbitmq-xstate-integration.ts` | 574 | other | 1 | 623 | **P0** |
| 15 | `src\lib\cache\headless-ui-cache.ts` | 563 | other | 1 | 598 | **P0** |
| 16 | `src\lib\cache\gpu-leftover-cache.ts` | 558 | other | 1 | 586 | **P0** |
| 17 | `src\lib\middleware\authSeparation.ts` | 63 | auth | 9 | 567 | **P0** |
| 18 | `src\lib\machines\auth-machine.ts` | 41 | auth | 9 | 558 | **P0** |
| 19 | `src\lib\cache\chr-rom-pattern-cache.ts` | 523 | other | 1 | 551 | **P0** |
| 20 | `src\lib\components\ui\enhanced-bits.ts` | 40 | components | 5 | 550 | **P0** |
| 21 | `src\lib\mcp-context72-get-library-docs.ts` | 445 | other | 1 | 515 | **P0** |
| 22 | `src\lib\db\chat-schema.ts` | 29 | database | 9 | 513 | **P0** |
| 23 | `src\lib\components\POIPhotoModal.svelte` | 102 | components | 5 | 510 | **P0** |
| 24 | `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` | 100 | components | 5 | 500 | **P0** |
| 25 | `src\lib\components\yorha\DetectiveEvidenceMap.svelte` | 58 | components | 5 | 500 | **P0** |
| 26 | `src\lib\3d\memory-palace-engine.ts` | 484 | other | 1 | 484 | **P0** |
| 27 | `src\lib\utils\simd-json-cache.ts` | 92 | utils | 4 | 484 | **P0** |
| 28 | `src\lib\stores.svelte.ts` | 58 | stores | 6 | 474 | **P0** |
| 29 | `src\lib\components\ui\gaming\core\GamingEvolutionManager.ts` | 94 | components | 5 | 470 | **P0** |
| 30 | `src\lib\memory\nes-memory-architecture.ts` | 390 | other | 1 | 453 | **P0** |
| 31 | `src\lib\components\ui\gaming\types\gaming-types.ts` | 27 | components | 5 | 450 | **P0** |
| 32 | `src\lib\components\NESGraphRenderer.svelte` | 75 | components | 5 | 445 | **P0** |
| 33 | `src\lib\types\api-schemas.ts` | 13 | database | 9 | 432 | **P0** |
| 34 | `src\lib\ocr\ocr-client.ts` | 421 | other | 1 | 421 | **P0** |
| 35 | `src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts` | 83 | components | 5 | 415 | **P0** |
| 36 | `src\lib\components\cases\CaseNotesEditor.svelte` | 51 | components | 5 | 395 | **P0** |
| 37 | `src\lib\utils\buffer-conversion.ts` | 84 | utils | 4 | 392 | **P0** |
| 38 | `src\lib\stores\dashboard\GrpcStatusAdapter.ts` | 64 | stores | 6 | 384 | **P0** |
| 39 | `src\lib\database\enhanced-schema.ts` | 13 | database | 9 | 369 | **P0** |
| 40 | `src\lib\services\cognitive-cache-integration.ts` | 367 | other | 1 | 367 | **P0** |
| 41 | `src\lib\metrics\gpuSummaryClient.ts` | 300 | other | 1 | 363 | **P0** |
| 42 | `src\lib\components\RouteInspectorWorking.svelte` | 71 | components | 5 | 355 | **P0** |
| 43 | `src\lib\components\ui\bits\custom-design-integration.ts` | 55 | components | 5 | 345 | **P0** |
| 44 | `src\lib\components\ui\context-menu\index.ts` | 69 | components | 5 | 345 | **P0** |
| 45 | `src\lib\utils\type-guards.ts` | 85 | utils | 4 | 340 | **P0** |
| 46 | `src\lib\db\schema\rag-integration.ts` | 9 | database | 9 | 333 | **P0** |
| 47 | `src\lib\test-utils\mocks.ts` | 328 | other | 1 | 328 | **P0** |
| 48 | `src\lib\ast\ast-processor.ts` | 328 | other | 1 | 328 | **P0** |
| 49 | `src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts` | 65 | components | 5 | 325 | **P0** |
| 50 | `src\lib\db\enhanced-ai-schema.ts` | 8 | database | 9 | 324 | **P0** |
| 51 | `src\lib\server\auth-guard.ts` | 36 | auth | 9 | 324 | **P0** |
| 52 | `src\lib\components\ui\enhanced\Button.stories.ts` | 64 | components | 5 | 320 | **P0** |
| 53 | `src\lib\database\migrations\migration-system.ts` | 314 | other | 1 | 314 | **P0** |
| 54 | `src\lib\components\yorha\JudicialAnalysisAgent.svelte` | 62 | components | 5 | 310 | **P0** |
| 55 | `src\lib\server\db\schema\error_clusters.ts` | 6 | database | 9 | 306 | **P0** |
| 56 | `src\lib\db\drizzle-usage-examples.ts` | 33 | database | 9 | 297 | **P0** |
| 57 | `src\lib\components\three\yorha-ui\api\YoRHaAPIClient.ts` | 59 | components | 5 | 295 | **P0** |
| 58 | `src\lib\cache\multi-layer-cache.ts` | 291 | other | 1 | 291 | **P0** |
| 59 | `src\lib\middleware\binary-encoding.ts` | 256 | other | 1 | 291 | **P0** |
| 60 | `src\lib\components\types.ts` | 58 | components | 5 | 290 | **P0** |
| 61 | `src\lib\schemas\prosecution-case-form.ts` | 32 | database | 9 | 288 | **P0** |
| 62 | `src\lib\components\ai\legal\ComprehensiveLegalAI.svelte` | 57 | components | 5 | 285 | **P0** |
| 63 | `src\lib\db\schema\legacy.ts` | 31 | database | 9 | 279 | **P0** |
| 64 | `src\lib\machines\aiAssistantMachine.ts` | 273 | other | 1 | 273 | **P0** |
| 65 | `src\lib\routing\route-registry.svelte.ts` | 273 | other | 1 | 273 | **P0** |
| 66 | `src\lib\server\lucia.ts` | 16 | auth | 9 | 270 | **P0** |
| 67 | `src\lib\components\three\yorha-ui\components\YoRHaButton3D.ts` | 54 | components | 5 | 270 | **P0** |
| 68 | `src\lib\components\yorha\TimelineReconstructionEngine.svelte` | 53 | components | 5 | 265 | **P0** |
| 69 | `src\lib\components\command-center\AceAgentControls.svelte` | 24 | components | 5 | 260 | **P0** |
| 70 | `src\lib\components\three\yorha-ui\webgpu\YoRHaWebGPUMath.ts` | 38 | components | 5 | 260 | **P0** |
| 71 | `src\lib\stores\dashboard\SSEStatusStore.ts` | 29 | stores | 6 | 258 | **P0** |
| 72 | `src\lib\routing\dynamic-route-generator.ts` | 258 | other | 1 | 258 | **P0** |
| 73 | `src\lib\utils\webgpu-buffer-uploader.ts` | 63 | utils | 4 | 252 | **P0** |
| 74 | `src\lib\routing\unified-api-router.ts` | 250 | other | 1 | 250 | **P0** |
| 75 | `src\lib\components\ai\FileUploadGemma3.stories.ts` | 49 | components | 5 | 245 | **P0** |
| 76 | `src\lib\components\phase78\ErrorModal.svelte` | 21 | components | 5 | 245 | **P0** |
| 77 | `src\lib\server\db\drizzle.ts` | 27 | database | 9 | 243 | **P0** |
| 78 | `src\lib\server\db\queries.ts` | 27 | database | 9 | 243 | **P0** |
| 79 | `src\lib\server\storage\minio-service.ts` | 242 | other | 1 | 242 | **P0** |
| 80 | `src\lib\stores\generic.svelte.ts` | 26 | stores | 6 | 240 | **P0** |
| 81 | `src\lib\components\canvas\index.ts` | 20 | components | 5 | 240 | **P0** |
| 82 | `src\lib\components\ui\wrappers\bits\index.ts` | 20 | components | 5 | 240 | **P0** |
| 83 | `src\lib\components\yorha\CaseTheoryConstructor.svelte` | 48 | components | 5 | 240 | **P0** |
| 84 | `src\lib\components\legal\index.ts` | 19 | components | 5 | 235 | **P0** |
| 85 | `src\lib\components\RouteInspectorDetectiveBoard.svelte` | 31 | components | 5 | 225 | **P0** |
| 86 | `src\lib\cache\semantic-cache.ts` | 201 | other | 1 | 215 | **P0** |
| 87 | `src\lib\components\poi\POIForm.svelte` | 43 | components | 5 | 215 | **P0** |
| 88 | `src\lib\components\three\yorha-ui\components\YoRHaInput3D.ts` | 43 | components | 5 | 215 | **P0** |
| 89 | `src\lib\orchestration\optimized-rabbitmq-orchestrator.ts` | 97 | other | 1 | 209 | **P0** |
| 90 | `src\lib\components\ui\bits\component-loader.ts` | 41 | components | 5 | 205 | **P0** |
| 91 | `src\lib\components\three\yorha-ui\YoRHaLayout3D.ts` | 40 | components | 5 | 200 | **P0** |
| 92 | `src\lib\components\ui\bits\types.ts` | 26 | components | 5 | 200 | **P0** |
| 93 | `src\lib\machines\legalCaseMachine.ts` | 85 | other | 1 | 197 | **P0** |
| 94 | `src\lib\components\ai\AutomatedLegalResearch.svelte` | 39 | components | 5 | 195 | **P0** |
| 95 | `src\lib\components\evidence\EvidenceConnections.svelte` | 11 | components | 5 | 195 | **P0** |
| 96 | `src\lib\machines\ingestion-workflow-machine.ts` | 181 | other | 1 | 195 | **P0** |
| 97 | `src\lib\api\services\cache-service.ts` | 193 | other | 1 | 193 | **P0** |
| 98 | `src\lib\components\yorha\PhoenixProsecutorDashboard.svelte` | 38 | components | 5 | 190 | **P0** |
| 99 | `src\lib\hooks\useRedisOrchestrator.ts` | 152 | other | 1 | 187 | **P0** |
| 100 | `src\lib\workers\legal-ai-worker-pool.ts` | 130 | other | 1 | 186 | **P0** |
| 101 | `src\lib\components\ui\bits\index.optimized.ts` | 37 | components | 5 | 185 | **P0** |
| 102 | `src\lib\components\ui\modern\index.ts` | 16 | components | 5 | 185 | **P0** |
| 103 | `src\lib\components\vision\PhoenixWrightSearch.svelte` | 37 | components | 5 | 185 | **P0** |
| 104 | `src\lib\types\api.ts` | 44 | other | 1 | 184 | **P0** |
| 105 | `src\lib\machines\graph-cache-machine.ts` | 182 | other | 1 | 182 | **P0** |
| 106 | `src\lib\caching\multi-dimensional-image-cache.ts` | 62 | other | 1 | 181 | **P0** |
| 107 | `src\lib\components\three\yorha-ui\components\YoRHaModal3D.ts` | 36 | components | 5 | 180 | **P0** |
| 108 | `src\lib\components\three\yorha-ui\webgpu\YoRHaOptimizedTextureManager.ts` | 36 | components | 5 | 180 | **P0** |
| 109 | `src\lib\components\ui\alert\index.ts` | 15 | components | 5 | 180 | **P0** |
| 110 | `src\lib\machines\legalAIMachine.v5.ts` | 127 | other | 1 | 176 | **P0** |
| 111 | `src\lib\components\three\yorha-ui\components\YoRHaQuantumEffects3D.ts` | 21 | components | 5 | 175 | **P0** |
| 112 | `src\lib\machines\predictive-typing-machine.ts` | 160 | other | 1 | 174 | **P0** |
| 113 | `src\lib\services\qlora-rl-langextract-integration.ts` | 171 | other | 1 | 171 | **P0** |
| 114 | `src\lib\server\schema.ts` | 19 | database | 9 | 171 | **P0** |
| 115 | `src\lib\components\evidence\EvidenceBoard.svelte` | 34 | components | 5 | 170 | **P0** |
| 116 | `src\lib\components\integration\LegalAIOrchestrationDemo.svelte` | 34 | components | 5 | 170 | **P0** |
| 117 | `src\lib\components\ui\AIFileUpload.svelte` | 34 | components | 5 | 170 | **P0** |
| 118 | `src\lib\components\poi\PersonOfInterestDetailView.svelte` | 34 | components | 5 | 170 | **P0** |
| 119 | `src\lib\components\yorha\PoliceReportGenerator.svelte` | 34 | components | 5 | 170 | **P0** |
| 120 | `src\lib\components\ui\enhanced-bits\index.ts` | 5 | components | 5 | 165 | **P0** |
| 121 | `src\lib\utils\typed-array-quantization.ts` | 41 | utils | 4 | 164 | **P0** |
| 122 | `src\lib\adapters\webasm-ai-adapter.ts` | 163 | other | 1 | 163 | **P0** |
| 123 | `src\lib\optimization\neural-memory-manager.ts` | 93 | other | 1 | 163 | **P0** |
| 124 | `src\lib\middleware\tfjs-synthesizer.ts` | 63 | other | 1 | 161 | **P0** |
| 125 | `src\lib\components\headless\texture-streaming.svelte.ts` | 18 | components | 5 | 160 | **P0** |
| 126 | `src\lib\components\command-center\Phase72ToolPanel.svelte` | 17 | components | 5 | 155 | **P0** |
| 127 | `src\lib\forms\contextual-chat-schema.ts` | 17 | database | 9 | 153 | **P0** |
| 128 | `src\lib\server\auth-simple.ts` | 17 | auth | 9 | 153 | **P0** |
| 129 | `src\lib\server\authUtils.ts` | 17 | auth | 9 | 153 | **P0** |
| 130 | `src\lib\utils\route-operation-logger.ts` | 38 | utils | 4 | 152 | **P0** |
| 131 | `src\lib\utils\mcp-helpers.ts` | 38 | utils | 4 | 152 | **P0** |
| 132 | `src\lib\components\ui\gaming\constants\gaming-constants.ts` | 30 | components | 5 | 150 | **P0** |
| 133 | `src\lib\db\localDocs.svelte.ts` | 148 | other | 1 | 148 | **P0** |
| 134 | `src\lib\machines\agentShellMachine.ts` | 148 | other | 1 | 148 | **P0** |
| 135 | `src\lib\components\ui\bits\performance.ts` | 29 | components | 5 | 145 | **P0** |
| 136 | `src\lib\client\secure-storage-client.ts` | 144 | other | 1 | 144 | **P0** |
| 137 | `src\lib\schemas\vector.ts` | 16 | database | 9 | 144 | **P0** |
| 138 | `src\lib\services\enhanced-rag-pagerank.ts` | 141 | other | 1 | 141 | **P0** |
| 139 | `src\lib\machines\vectorJobMachine.ts` | 68 | other | 1 | 138 | **P0** |
| 140 | `src\lib\config\unified-config.ts` | 53 | other | 1 | 137 | **P0** |
| 141 | `src\lib\components\ContextConfirmModal.svelte` | 27 | components | 5 | 135 | **P0** |
| 142 | `src\lib\components\realtime\index.ts` | 13 | components | 5 | 135 | **P0** |
| 143 | `src\lib\machines\vector-pipeline-machine.ts` | 135 | other | 1 | 135 | **P0** |
| 144 | `src\lib\proto\legal-ai-types.ts` | 48 | other | 1 | 132 | **P0** |
| 145 | `src\lib\routing\route-guards.ts` | 118 | other | 1 | 132 | **P0** |
| 146 | `src\lib\components\evidence\EvidenceAssistant.svelte` | 26 | components | 5 | 130 | **P0** |
| 147 | `src\lib\config\gemma3-config.ts` | 130 | other | 1 | 130 | **P0** |
| 148 | `src\lib\forms\superforms-xstate-integration.ts` | 127 | other | 1 | 127 | **P0** |
| 149 | `src\lib\stores\dashboard\DocumentProgressStore.ts` | 21 | stores | 6 | 126 | **P0** |
| 150 | `src\lib\schemas\evidence-upload.ts` | 14 | database | 9 | 126 | **P0** |
| 151 | `src\lib\models\ChatSession.svelte.ts` | 125 | other | 1 | 125 | **P0** |
| 152 | `src\lib\agents\tools.ts` | 123 | other | 1 | 123 | **P0** |
| 153 | `src\lib\ast\svelte-check-analyzer.ts` | 121 | other | 1 | 121 | **P0** |
| 154 | `src\lib\components\evidence\VictimStatementWizard.svelte` | 24 | components | 5 | 120 | **P0** |
| 155 | `src\lib\components\legal-ai\CitationSaveModal.svelte` | 24 | components | 5 | 120 | **P0** |
| 156 | `src\lib\components\unified\index.ts` | 10 | components | 5 | 120 | **P0** |
| 157 | `src\lib\components\upload\upload-core.ts` | 24 | components | 5 | 120 | **P0** |
| 158 | `src\lib\utils\webgpu-array-utils.ts` | 30 | utils | 4 | 120 | **P0** |
| 159 | `src\lib\webgpu\shader-cache-manager.ts` | 105 | other | 1 | 119 | **P0** |
| 160 | `src\lib\server\services\vectorDBService.ts` | 63 | other | 1 | 119 | **P0** |
| 161 | `src\lib\evidence-canvas\webgpu-init.ts` | 89 | other | 1 | 117 | **P0** |
| 162 | `src\lib\server\utils\server-cache.ts` | 32 | other | 1 | 116 | **P0** |
| 163 | `src\lib\types\case.ts` | 38 | other | 1 | 115 | **P0** |
| 164 | `src\lib\simd\simd-json-worker-client.ts` | 100 | other | 1 | 114 | **P0** |
| 165 | `src\lib\mlp.ts` | 113 | other | 1 | 113 | **P0** |
| 166 | `src\lib\server\concurrent-json-serializer.ts` | 97 | other | 1 | 111 | **P0** |
| 167 | `src\lib\components\ui\EvidenceCanvas.svelte` | 22 | components | 5 | 110 | **P0** |
| 168 | `src\lib\components\ui\AutoPopulatedCaseForm.svelte` | 22 | components | 5 | 110 | **P0** |
| 169 | `src\lib\components\three\yorha-ui\theme\yorha-theme-adapter.ts` | 22 | components | 5 | 110 | **P0** |
| 170 | `src\lib\components\ui\QuickActionButton\QuickActionButton.svelte` | 22 | quic-protocol | 5 | 110 | **P0** |
| 171 | `src\lib\machines\enhanced-legal-upload-analytics-machine.ts` | 108 | other | 1 | 108 | **P0** |
| 172 | `src\lib\modules\auth-demo.ts` | 12 | auth | 9 | 108 | **P0** |
| 173 | `src\lib\components\CanvasEditor.svelte` | 21 | components | 5 | 105 | **P0** |
| 174 | `src\lib\components\RouteOperationsDashboard.svelte` | 21 | components | 5 | 105 | **P0** |
| 175 | `src\lib\components\ui\Button.stories.ts` | 21 | components | 5 | 105 | **P0** |
| 176 | `src\lib\components\ui\gaming\core\GamingEvolutionManager-minimal.ts` | 21 | components | 5 | 105 | **P0** |
| 177 | `src\lib\webgpu\webgpu-init.ts` | 82 | other | 1 | 103 | **P0** |
| 178 | `src\lib\types\legal-types.ts` | 75 | other | 1 | 103 | **P0** |
| 179 | `src\lib\services\glyph-diffusion-service.ts` | 103 | other | 1 | 103 | **P0** |
| 180 | `src\lib\server\cache.ts` | 103 | other | 1 | 103 | **P0** |
| 181 | `src\lib\evidence-canvas\graph-layout-gpu.ts` | 46 | other | 1 | 102 | **P0** |
| 182 | `src\lib\client\ocr-tensor-processor.ts` | 100 | other | 1 | 100 | **P1** |
| 183 | `src\lib\machines\recommendation-routing-machine.ts` | 100 | other | 1 | 100 | **P1** |
| 184 | `src\lib\components\cases\ContextualChatModal.svelte` | 20 | components | 5 | 100 | **P1** |
| 185 | `src\lib\components\legal-ai\AttachToCaseModal.svelte` | 20 | components | 5 | 100 | **P1** |
| 186 | `src\lib\components\CaseOutcomePrediction.svelte` | 19 | components | 5 | 95 | **P1** |
| 187 | `src\lib\services\localStorage-file-fallback.ts` | 92 | other | 1 | 92 | **P1** |
| 188 | `src\lib\utils\ollama-endpoints.ts` | 23 | utils | 4 | 92 | **P1** |
| 189 | `src\lib\machines\workflow-machine.ts` | 91 | other | 1 | 91 | **P1** |
| 190 | `src\lib\components\CitationLink.svelte` | 18 | components | 5 | 90 | **P1** |
| 191 | `src\lib\components\error-analysis\KnowledgeGraph.svelte` | 18 | components | 5 | 90 | **P1** |
| 192 | `src\lib\monitoring\legal-performance-metrics.ts` | 27 | other | 1 | 90 | **P1** |
| 193 | `src\lib\server\authPolicy.ts` | 10 | auth | 9 | 90 | **P1** |
| 194 | `src\lib\middleware\namespaceRouter.ts` | 87 | other | 1 | 87 | **P1** |
| 195 | `src\lib\optimization\optimization-test-suite.ts` | 87 | other | 1 | 87 | **P1** |
| 196 | `src\lib\cache\ssr-legal-api-cache.ts` | 58 | other | 1 | 86 | **P1** |
| 197 | `src\lib\evidence-canvas\evidence-canvas-core.svelte` | 86 | other | 1 | 86 | **P1** |
| 198 | `src\lib\components\AIChat.stories.ts` | 17 | components | 5 | 85 | **P1** |
| 199 | `src\lib\components\ReportEditor.svelte` | 17 | components | 5 | 85 | **P1** |
| 200 | `src\lib\components\board\CanvasBoard.svelte` | 17 | components | 5 | 85 | **P1** |
| 201 | `src\lib\components\case\ErrorAlert.svelte` | 17 | components | 5 | 85 | **P1** |
| 202 | `src\lib\components\legal\WorkspacePanel.svelte` | 17 | components | 5 | 85 | **P1** |
| 203 | `src\lib\components\phase78\SuggestionsList.svelte` | 17 | components | 5 | 85 | **P1** |
| 204 | `src\lib\components\yorha\YoRHaCommandCenter.svelte` | 17 | components | 5 | 85 | **P1** |
| 205 | `src\lib\config\env.server.ts` | 83 | other | 1 | 83 | **P1** |
| 206 | `src\lib\machines\ssr-qlora-chat-machine.ts` | 39 | other | 1 | 81 | **P1** |
| 207 | `src\lib\schemas\file-upload.ts` | 9 | database | 9 | 81 | **P1** |
| 208 | `src\lib\workers\rabbitmq-service-worker.ts` | 80 | other | 1 | 80 | **P1** |
| 209 | `src\lib\components\LegalCaseManager.stories.ts` | 16 | components | 5 | 80 | **P1** |
| 210 | `src\lib\components\agentic\AgentChat.svelte` | 16 | components | 5 | 80 | **P1** |
| 211 | `src\lib\services\cache-layer-manager.ts` | 65 | other | 1 | 79 | **P1** |
| 212 | `src\lib\webgpu\webgpu-similarity-engine.ts` | 63 | other | 1 | 77 | **P1** |
| 213 | `src\lib\index.ts` | 76 | other | 1 | 76 | **P1** |
| 214 | `src\lib\cache\parallel-cache-orchestrator.ts` | 76 | other | 1 | 76 | **P1** |
| 215 | `src\lib\components\citations\CitationSaveForm.svelte` | 15 | components | 5 | 75 | **P1** |
| 216 | `src\lib\components\ui\gaming\effects\gradient-utils.ts` | 15 | components | 5 | 75 | **P1** |
| 217 | `src\lib\components\yorha\YoRHaCommandCenter.stories.ts` | 15 | components | 5 | 75 | **P1** |
| 218 | `src\lib\agents\error-recovery.ts` | 60 | other | 1 | 74 | **P1** |
| 219 | `src\lib\server\embedding-cache-middleware.ts` | 60 | other | 1 | 74 | **P1** |
| 220 | `src\lib\db\persons.ts` | 73 | other | 1 | 73 | **P1** |
| 221 | `src\lib\server\rabbitmq.ts` | 72 | other | 1 | 72 | **P1** |
| 222 | `src\lib\integrations\supercharged-legal-ai-server.ts` | 30 | other | 1 | 72 | **P1** |
| 223 | `src\lib\server\z-schemas.ts` | 8 | database | 9 | 72 | **P1** |
| 224 | `src\lib\demos\neural-intent-demo.ts` | 71 | other | 1 | 71 | **P1** |
| 225 | `src\lib\integrations\phase13-full-integration.ts` | 57 | other | 1 | 71 | **P1** |
| 226 | `src\lib\components\ChatPanel.svelte` | 14 | components | 5 | 70 | **P1** |
| 227 | `src\lib\components\evidence\EvidenceUploadModal.svelte` | 14 | components | 5 | 70 | **P1** |
| 228 | `src\lib\components\legal-ai\StatuteResultsList.svelte` | 14 | components | 5 | 70 | **P1** |
| 229 | `src\lib\components\legal-ai\LawsSearchPage.svelte` | 14 | components | 5 | 70 | **P1** |
| 230 | `src\lib\routing\index.ts` | 70 | other | 1 | 70 | **P1** |
| 231 | `src\lib\client\ai\webgpu-reranker-worker.ts` | 55 | other | 1 | 69 | **P1** |
| 232 | `src\lib\machines\index.ts` | 69 | other | 1 | 69 | **P1** |
| 233 | `src\lib\proto\enhanced-rag.ts` | 69 | other | 1 | 69 | **P1** |
| 234 | `src\lib\evidence\simd-gpu-tiling-engine.ts` | 54 | other | 1 | 68 | **P1** |
| 235 | `src\lib\server\cache\redis-cache.ts` | 68 | other | 1 | 68 | **P1** |
| 236 | `src\lib\optimization\index.ts` | 68 | other | 1 | 68 | **P1** |
| 237 | `src\lib\server\audit-logger.ts` | 54 | other | 1 | 68 | **P1** |
| 238 | `src\lib\optimization\simd-json-index-processor.ts` | 39 | other | 1 | 67 | **P1** |
| 239 | `src\lib\services\neo4jGraphService.ts` | 53 | other | 1 | 67 | **P1** |
| 240 | `src\lib\components\case\SummaryEditor.svelte` | 13 | components | 5 | 65 | **P1** |
| 241 | `src\lib\components\laws\Sidebar.svelte` | 13 | components | 5 | 65 | **P1** |
| 242 | `src\lib\components\legal-ai\RelatedCasesPanel.svelte` | 13 | components | 5 | 65 | **P1** |
| 243 | `src\lib\components\poi\POIStats.svelte` | 13 | components | 5 | 65 | **P1** |
| 244 | `src\lib\components\three\yorha-ui\YoRHaUIExample.ts` | 13 | components | 5 | 65 | **P1** |
| 245 | `src\lib\components\yorha\dashboard\SystemOverview.svelte` | 13 | components | 5 | 65 | **P1** |
| 246 | `src\lib\components\yorha\evidence\EvidenceGrid.svelte` | 13 | components | 5 | 65 | **P1** |
| 247 | `src\lib\machines\ai-computation-machine.ts` | 65 | other | 1 | 65 | **P1** |
| 248 | `src\lib\server\db\schema-postgres.ts` | 7 | database | 9 | 63 | **P1** |
| 249 | `src\lib\__tests__\unified-schema.ts` | 7 | database | 9 | 63 | **P1** |
| 250 | `src\lib\config\environment.ts` | 62 | other | 1 | 63 | **P1** |
| 251 | `src\lib\server\config.ts` | 61 | other | 1 | 61 | **P1** |
| 252 | `src\lib\components\ErrorStreamMonitor.svelte` | 12 | components | 5 | 60 | **P1** |
| 253 | `src\lib\components\WebGPUSimilarityDemo.svelte` | 12 | components | 5 | 60 | **P1** |
| 254 | `src\lib\components\search\utils.ts` | 12 | components | 5 | 60 | **P1** |
| 255 | `src\lib\components\ui\orchestrated\index.ts` | 12 | components | 5 | 60 | **P1** |
| 256 | `src\lib\components\yorha\cases\CasesList.svelte` | 12 | components | 5 | 60 | **P1** |
| 257 | `src\lib\optimization\context7-mcp-integration.ts` | 60 | other | 1 | 60 | **P1** |
| 258 | `src\lib\server\api-ssr-helpers.ts` | 60 | other | 1 | 60 | **P1** |
| 259 | `src\lib\services\enhanced-api-client.ts` | 59 | other | 1 | 59 | **P1** |
| 260 | `src\lib\routing\dynamic-navigation.ts` | 58 | other | 1 | 58 | **P1** |
| 261 | `src\lib\composables\legal-data-runes.svelte.ts` | 22 | other | 1 | 57 | **P1** |
| 262 | `src\lib\config\legal-priorities.ts` | 57 | other | 1 | 57 | **P1** |
| 263 | `src\lib\client\ui\POIPhotoModal.svelte` | 56 | other | 1 | 56 | **P1** |
| 264 | `src\lib\modules\citations-manager.ts` | 21 | other | 1 | 56 | **P1** |
| 265 | `src\lib\components\ClientGemmaDemo.svelte` | 11 | components | 5 | 55 | **P1** |
| 266 | `src\lib\components\case\CaseDetailPage.svelte` | 11 | components | 5 | 55 | **P1** |
| 267 | `src\lib\components\legal-ai\CitationLibraryPage.svelte` | 11 | components | 5 | 55 | **P1** |
| 268 | `src\lib\components\ui\MarkdownSceneViewer.svelte` | 11 | components | 5 | 55 | **P1** |
| 269 | `src\lib\db\client-db.ts` | 27 | other | 1 | 55 | **P1** |
| 270 | `src\lib\machines\ai-processing-machine.ts` | 27 | other | 1 | 55 | **P1** |
| 271 | `src\lib\orchestration\qlora-ollama-orchestrator.ts` | 41 | other | 1 | 55 | **P1** |
| 272 | `src\lib\server\messaging\rabbitmq-service.ts` | 33 | other | 1 | 54 | **P1** |
| 273 | `src\lib\db\schema\nes-command-center.ts` | 6 | database | 9 | 54 | **P1** |
| 274 | `src\lib\db\schema-jsonb.ts` | 6 | database | 9 | 54 | **P1** |
| 275 | `src\lib\integrations\flashattention-multicore-bridge.ts` | 54 | other | 1 | 54 | **P1** |
| 276 | `src\lib\optimization\simd-json-parser-bridge.ts` | 54 | other | 1 | 54 | **P1** |
| 277 | `src\lib\config\production.ts` | 53 | other | 1 | 53 | **P1** |
| 278 | `src\lib\utils\simd-json-parser.ts` | 13 | utils | 4 | 52 | **P1** |
| 279 | `src\lib\logic\POI.ts` | 38 | other | 1 | 52 | **P1** |
| 280 | `src\lib\gemma3Client.ts` | 51 | other | 1 | 51 | **P1** |
| 281 | `src\lib\cache\xstate-cache-integration.ts` | 51 | other | 1 | 51 | **P1** |
| 282 | `src\lib\orchestration\autoencoder-context-switcher.ts` | 37 | other | 1 | 51 | **P1** |
| 283 | `src\lib\search\fuse-rag-search.ts` | 51 | other | 1 | 51 | **P1** |
| 284 | `src\lib\components\SearchPanel.svelte` | 10 | components | 5 | 50 | **P2** |
| 285 | `src\lib\components\citations\CitationList.svelte` | 10 | components | 5 | 50 | **P2** |
| 286 | `src\lib\components\dashboard\DocumentThumbnailTray.svelte` | 10 | components | 5 | 50 | **P2** |
| 287 | `src\lib\services\xstate-integration.ts` | 50 | other | 1 | 50 | **P2** |
| 288 | `src\lib\components\ui\DiffViewer.svelte` | 10 | components | 5 | 50 | **P2** |
| 289 | `src\lib\components\three\yorha-ui\components\YoRHaPanel3D.ts` | 10 | components | 5 | 50 | **P2** |
| 290 | `src\lib\services\enhanced-caching-revolutionary-bridge.ts` | 21 | other | 1 | 49 | **P2** |
| 291 | `src\lib\services\gemma-embeddings-service.ts` | 35 | other | 1 | 49 | **P2** |
| 292 | `src\lib\integrations\full-system-orchestrator.ts` | 20 | other | 1 | 48 | **P2** |
| 293 | `src\lib\optimization\advanced-memory-optimizer.ts` | 13 | other | 1 | 48 | **P2** |
| 294 | `src\lib\routing\route-registry.ts` | 48 | other | 1 | 48 | **P2** |
| 295 | `src\lib\services\unified-legal-orchestrator.ts` | 47 | other | 1 | 47 | **P2** |
| 296 | `src\lib\db\dexie-integration.ts` | 46 | other | 1 | 46 | **P2** |
| 297 | `src\lib\services\context7-multicore.ts` | 18 | other | 1 | 46 | **P2** |
| 298 | `src\lib\services\uploadEvidenceService.ts` | 17 | other | 1 | 45 | **P2** |
| 299 | `src\lib\components\layout\EvidenceBoardLayout.svelte` | 9 | components | 5 | 45 | **P2** |
| 300 | `src\lib\components\legal-ai\LinkMetadataForm.svelte` | 9 | components | 5 | 45 | **P2** |
| 301 | `src\lib\components\ui\index.ts` | 9 | components | 5 | 45 | **P2** |
| 302 | `src\lib\components\poi\POIPhotoGrid.svelte` | 9 | components | 5 | 45 | **P2** |
| 303 | `src\lib\compat\lokijs.ts` | 44 | other | 1 | 44 | **P2** |
| 304 | `src\lib\registry\texture-component-registry.ts` | 16 | other | 1 | 44 | **P2** |
| 305 | `src\lib\cache\glyph-shader-cache-bridge.ts` | 43 | other | 1 | 43 | **P2** |
| 306 | `src\lib\detective-mode\comprehensive-integration.svelte.ts` | 43 | other | 1 | 43 | **P2** |
| 307 | `src\lib\evidence-canvas\ai-suggestions-service.ts` | 43 | other | 1 | 43 | **P2** |
| 308 | `src\lib\integrations\full-stack-workflow.ts` | 29 | other | 1 | 43 | **P2** |
| 309 | `src\lib\machines\agentShellMachine.mcp.ts` | 43 | other | 1 | 43 | **P2** |
| 310 | `src\lib\services\featureFlags.ts` | 28 | other | 1 | 42 | **P2** |
| 311 | `src\lib\polyfills.ts` | 40 | other | 1 | 40 | **P2** |
| 312 | `src\lib\utils.ts` | 10 | utils | 4 | 40 | **P2** |
| 313 | `src\lib\client\db\loki-client.ts` | 26 | other | 1 | 40 | **P2** |
| 314 | `src\lib\components\ui\dialog\DialogHeader.svelte` | 8 | components | 5 | 40 | **P2** |
| 315 | `src\lib\components\PersonList.svelte` | 8 | components | 5 | 40 | **P2** |
| 316 | `src\lib\components\PersonStatsPanel.svelte` | 8 | components | 5 | 40 | **P2** |
| 317 | `src\lib\components\poi\POIFaceMatchDialog.svelte` | 8 | components | 5 | 40 | **P2** |
| 318 | `src\lib\components\ui\enhanced\Card.stories.ts` | 8 | components | 5 | 40 | **P2** |
| 319 | `src\lib\components\yorha\SystemStatus.svelte` | 8 | components | 5 | 40 | **P2** |
| 320 | `src\lib\services\flashattention2-rtx3060.ts` | 12 | other | 1 | 40 | **P2** |
| 321 | `src\lib\optimization\redis-som-cache.ts` | 19 | other | 1 | 40 | **P2** |
| 322 | `src\lib\services\predictive-asset-engine.ts` | 39 | other | 1 | 39 | **P2** |
| 323 | `src\lib\server\charge-bundler.ts` | 39 | other | 1 | 39 | **P2** |
| 324 | `src\lib\cache\MultiLayerCacheSystem.ts` | 10 | other | 1 | 38 | **P2** |
| 325 | `src\lib\services\case-memory-engine.ts` | 37 | other | 1 | 37 | **P2** |
| 326 | `src\lib\moogle\stage6-production-orchestrator.ts` | 23 | other | 1 | 37 | **P2** |
| 327 | `src\lib\ast\suggestion-engine.ts` | 36 | other | 1 | 36 | **P2** |
| 328 | `src\lib\data\types.ts` | 8 | other | 1 | 36 | **P2** |
| 329 | `src\lib\config\gemma3-legal-config.ts` | 36 | other | 1 | 36 | **P2** |
| 330 | `src\lib\database\drizzle-compatibility-fix.ts` | 4 | database | 9 | 36 | **P2** |
| 331 | `src\lib\database\schema.ts` | 4 | database | 9 | 36 | **P2** |
| 332 | `src\lib\server\auth-helpers.ts` | 4 | auth | 9 | 36 | **P2** |
| 333 | `src\lib\components\SlideTabs.svelte` | 7 | components | 5 | 35 | **P2** |
| 334 | `src\lib\components\ast\ErrorPanel.svelte` | 7 | components | 5 | 35 | **P2** |
| 335 | `src\lib\components\dashboard\QuickActionsPanel.svelte` | 7 | quic-protocol | 5 | 35 | **P2** |
| 336 | `src\lib\components\evidence\UploadProgressCard.svelte` | 7 | components | 5 | 35 | **P2** |
| 337 | `src\lib\components\laws\LawModal.svelte` | 7 | components | 5 | 35 | **P2** |
| 338 | `src\lib\components\legal\StatuteActionPanel.svelte` | 7 | components | 5 | 35 | **P2** |
| 339 | `src\lib\components\ui\SearchResults.svelte` | 7 | components | 5 | 35 | **P2** |
| 340 | `src\lib\components\ui\ThemeToggle.svelte` | 7 | components | 5 | 35 | **P2** |
| 341 | `src\lib\components\ui\IconContainerDemo.svelte` | 7 | components | 5 | 35 | **P2** |
| 342 | `src\lib\components\ui\gaming\n64\index.ts` | 7 | components | 5 | 35 | **P2** |
| 343 | `src\lib\components\ui\table\index.ts` | 7 | components | 5 | 35 | **P2** |
| 344 | `src\lib\components\yorha\evidence\EvidenceStats.svelte` | 7 | components | 5 | 35 | **P2** |
| 345 | `src\lib\machines\legalAIMachine.ts` | 35 | other | 1 | 35 | **P2** |
| 346 | `src\lib\optimization\copilot-index-optimizer.ts` | 35 | other | 1 | 35 | **P2** |
| 347 | `src\lib\cache\parallel-cache-orchestrator-corrupted.ts` | 20 | other | 1 | 34 | **P2** |
| 348 | `src\lib\json\fastjson.ts` | 34 | other | 1 | 34 | **P2** |
| 349 | `src\lib\services\revolutionary-ai-integration.ts` | 20 | other | 1 | 34 | **P2** |
| 350 | `src\lib\machines\legal-case-machine-factory.ts` | 34 | other | 1 | 34 | **P2** |
| 351 | `src\lib\rag\query-helpers.ts` | 20 | other | 1 | 34 | **P2** |
| 352 | `src\lib\command-center-manifest.ts` | 33 | other | 1 | 33 | **P2** |
| 353 | `src\lib\ast\error-vectorizer.ts` | 33 | other | 1 | 33 | **P2** |
| 354 | `src\lib\config\database.ts` | 18 | other | 1 | 32 | **P2** |
| 355 | `src\lib\machines\prefetchMachine.ts` | 32 | other | 1 | 32 | **P2** |
| 356 | `src\lib\machines\rag-machine.ts` | 32 | other | 1 | 32 | **P2** |
| 357 | `src\lib\observability\client-timing.ts` | 18 | other | 1 | 32 | **P2** |
| 358 | `src\lib\orchestration\master-cognitive-hub.ts` | 31 | other | 1 | 31 | **P2** |
| 359 | `src\lib\components\ui\input\InputBits.svelte` | 6 | components | 5 | 30 | **P2** |
| 360 | `src\lib\components\ui\enhanced-bits.svelte` | 6 | components | 5 | 30 | **P2** |
| 361 | `src\lib\components\laws\StatuteColumn.svelte` | 6 | components | 5 | 30 | **P2** |
| 362 | `src\lib\components\ui\label\Label.svelte` | 6 | components | 5 | 30 | **P2** |
| 363 | `src\lib\components\poi\POIThreatBadge.svelte` | 6 | components | 5 | 30 | **P2** |
| 364 | `src\lib\components\yorha\evidence\EvidenceFilters.svelte` | 6 | components | 5 | 30 | **P2** |
| 365 | `src\lib\memory-palace\MemoryPalaceScene.ts` | 16 | other | 1 | 30 | **P2** |
| 366 | `src\lib\optimization\enhanced-vscode-extension-manager.ts` | 16 | other | 1 | 30 | **P2** |
| 367 | `src\lib\services\rag-ingestion-pipeline.ts` | 30 | other | 1 | 30 | **P2** |
| 368 | `src\lib\rag\demo-rag.ts` | 30 | other | 1 | 30 | **P2** |
| 369 | `src\lib\actors\xstate-actor-wrapper.ts` | 29 | other | 1 | 29 | **P2** |
| 370 | `src\lib\agents\error-handler.ts` | 28 | other | 1 | 28 | **P2** |
| 371 | `src\lib\client\workflow-event-stream.ts` | 14 | other | 1 | 28 | **P2** |
| 372 | `src\lib\config\env.ts` | 28 | other | 1 | 28 | **P2** |
| 373 | `src\lib\memory\visual-memory-palace-integration.ts` | 28 | other | 1 | 28 | **P2** |
| 374 | `src\lib\types\generics.ts` | 6 | other | 1 | 27 | **P2** |
| 375 | `src\lib\server\cache\redis.ts` | 27 | other | 1 | 27 | **P2** |
| 376 | `src\lib\api\client.ts` | 27 | other | 1 | 27 | **P2** |
| 377 | `src\lib\auth\auth-store.svelte.ts` | 3 | auth | 9 | 27 | **P2** |
| 378 | `src\lib\db\schema\aiHistory.ts` | 3 | database | 9 | 27 | **P2** |
| 379 | `src\lib\db\schema\gpuInferenceDemo.ts` | 3 | database | 9 | 27 | **P2** |
| 380 | `src\lib\embedding\embedding-adapter.ts` | 13 | other | 1 | 27 | **P2** |
| 381 | `src\lib\webgpu\webgpu-rag-service.ts` | 13 | other | 1 | 27 | **P2** |
| 382 | `src\lib\rabbitmq\index.ts` | 13 | other | 1 | 27 | **P2** |
| 383 | `src\lib\services\ollamaService.ts` | 12 | other | 1 | 26 | **P2** |
| 384 | `src\lib\config\rabbitmq-config.ts` | 26 | other | 1 | 26 | **P2** |
| 385 | `src\lib\types\pipeline.ts` | 12 | other | 1 | 26 | **P2** |
| 386 | `src\lib\api\clients\api-client.ts` | 25 | other | 1 | 25 | **P2** |
| 387 | `src\lib\api\services\evidence-service.ts` | 25 | other | 1 | 25 | **P2** |
| 388 | `src\lib\components\ClientGemmaInference.svelte` | 5 | components | 5 | 25 | **P2** |
| 389 | `src\lib\components\EvidenceCard.svelte` | 5 | components | 5 | 25 | **P2** |
| 390 | `src\lib\components\MigrationTest.svelte` | 5 | components | 5 | 25 | **P2** |
| 391 | `src\lib\components\legal-ai\CitationSearch.svelte` | 5 | components | 5 | 25 | **P2** |
| 392 | `src\lib\components\charges\StatuteModal.svelte` | 5 | components | 5 | 25 | **P2** |
| 393 | `src\lib\components\citations\CitationCollections.svelte` | 5 | components | 5 | 25 | **P2** |
| 394 | `src\lib\components\dashboard\StatisticsPanel.svelte` | 5 | components | 5 | 25 | **P2** |
| 395 | `src\lib\components\editor\index.ts` | 5 | components | 5 | 25 | **P2** |
| 396 | `src\lib\components\error-brain\PatchCard.svelte` | 5 | components | 5 | 25 | **P2** |
| 397 | `src\lib\components\ui\TypewriterPrompt.svelte` | 5 | components | 5 | 25 | **P2** |
| 398 | `src\lib\components\ui\tabs-bits\index.ts` | 5 | components | 5 | 25 | **P2** |
| 399 | `src\lib\components\vision\EvidenceUpload.svelte` | 5 | components | 5 | 25 | **P2** |
| 400 | `src\lib\db\queries\nes-command-center-archive.ts` | 25 | other | 1 | 25 | **P2** |
| 401 | `src\lib\webgpu\som-webgpu-cache.ts` | 25 | other | 1 | 25 | **P2** |
| 402 | `src\lib\machines\caseManagementMachine.ts` | 25 | other | 1 | 25 | **P2** |
| 403 | `src\lib\optimization\docker-memory-optimizer-v2.ts` | 11 | other | 1 | 25 | **P2** |
| 404 | `src\lib\services\unified-vector-orchestrator.ts` | 25 | other | 1 | 25 | **P2** |
| 405 | `src\lib\config\endpoints.ts` | 24 | other | 1 | 24 | **P2** |
| 406 | `src\lib\error-brain\diff\emit-unified.ts` | 10 | other | 1 | 24 | **P2** |
| 407 | `src\lib\errors\featureErrors.ts` | 24 | other | 1 | 24 | **P2** |
| 408 | `src\lib\integrations\revolutionary-multicore-bridge.ts` | 24 | other | 1 | 24 | **P2** |
| 409 | `src\lib\actions\accessibility-actions.ts` | 23 | other | 1 | 23 | **P2** |
| 410 | `src\lib\caching\reinforcement-learning-cache.ts` | 23 | other | 1 | 23 | **P2** |
| 411 | `src\lib\services\webgpu-texture-streaming.ts` | 9 | other | 1 | 23 | **P2** |
| 412 | `src\lib\machines\document-upload-machine.ts` | 23 | other | 1 | 23 | **P2** |
| 413 | `src\lib\services\enhanced-file-upload.ts` | 8 | other | 1 | 22 | **P2** |
| 414 | `src\lib\db\queries\nes-command-center.ts` | 22 | other | 1 | 22 | **P2** |
| 415 | `src\lib\parsers\simd-json-parser.ts` | 22 | other | 1 | 22 | **P2** |
| 416 | `src\lib\performance\optimizations.ts` | 22 | other | 1 | 22 | **P2** |
| 417 | `src\lib\wasm\llvm-wasm-bridge.ts` | 22 | other | 1 | 22 | **P2** |
| 418 | `src\lib\server\errors.ts` | 21 | other | 1 | 21 | **P2** |
| 419 | `src\lib\adapters\wasm-rabbitmq-bridge.ts` | 21 | other | 1 | 21 | **P2** |
| 420 | `src\lib\webgpu\webgpu-similarity-service.ts` | 21 | other | 1 | 21 | **P2** |
| 421 | `src\lib\error-brain\diff\apply.ts` | 21 | other | 1 | 21 | **P2** |
| 422 | `src\lib\optimization\ultra-json-processor.ts` | 7 | other | 1 | 21 | **P2** |
| 423 | `src\lib\ClientEmbeddingGemma.ts` | 20 | other | 1 | 20 | **P2** |
| 424 | `src\lib\types.ts` | 6 | other | 1 | 20 | **P2** |
| 425 | `src\lib\api\production-service-client.ts` | 20 | other | 1 | 20 | **P2** |
| 426 | `src\lib\cache\nes-cache-orchestrator.ts` | 20 | other | 1 | 20 | **P2** |
| 427 | `src\lib\client\subscribeEmbedding.ts` | 20 | other | 1 | 20 | **P2** |
| 428 | `src\lib\components\SimilarCasesPanel.svelte` | 4 | components | 5 | 20 | **P2** |
| 429 | `src\lib\components\DocumentUploadMachineIntegration.svelte` | 4 | components | 5 | 20 | **P2** |
| 430 | `src\lib\components\ui\tabs\index.ts` | 4 | components | 5 | 20 | **P2** |
| 431 | `src\lib\components\RoutesList.svelte` | 4 | components | 5 | 20 | **P2** |
| 432 | `src\lib\components\admin\TagSelector.svelte` | 4 | components | 5 | 20 | **P2** |
| 433 | `src\lib\components\evidence\EvidenceUploadButton.svelte` | 4 | components | 5 | 20 | **P2** |
| 434 | `src\lib\components\evidence\SummaryReviewPanel.svelte` | 4 | components | 5 | 20 | **P2** |
| 435 | `src\lib\components\evidence-graph\GraphToolbar.svelte` | 4 | components | 5 | 20 | **P2** |
| 436 | `src\lib\components\laws\LawsDashboard.svelte` | 4 | components | 5 | 20 | **P2** |
| 437 | `src\lib\components\legal-ai\CaseChatPanel.svelte` | 4 | components | 5 | 20 | **P2** |
| 438 | `src\lib\components\legal-ai\CaseStatuteLinks.svelte` | 4 | components | 5 | 20 | **P2** |
| 439 | `src\lib\components\poi\POIQuickActions.svelte` | 4 | quic-protocol | 5 | 20 | **P2** |
| 440 | `src\lib\components\three\yorha-ui\index.ts` | 4 | components | 5 | 20 | **P2** |
| 441 | `src\lib\components\ui\IconContainer.svelte` | 4 | components | 5 | 20 | **P2** |
| 442 | `src\lib\components\ui\button-variants.ts` | 4 | components | 5 | 20 | **P2** |
| 443 | `src\lib\components\ui\bits\index.enhanced.ts` | 4 | components | 5 | 20 | **P2** |
| 444 | `src\lib\components\ui\enhanced\button-variants.ts` | 4 | components | 5 | 20 | **P2** |
| 445 | `src\lib\components\ui\gaming\8bit\NES8BitButton.svelte` | 4 | components | 5 | 20 | **P2** |
| 446 | `src\lib\components\ui\wrappers\bits\bits-overrides.ts` | 4 | components | 5 | 20 | **P2** |
| 447 | `src\lib\components\yorha\ContradictionReveal.svelte` | 4 | components | 5 | 20 | **P2** |
| 448 | `src\lib\components\yorha\index.ts` | 4 | components | 5 | 20 | **P2** |
| 449 | `src\lib\components\yorha\cases\CaseFilters.svelte` | 4 | components | 5 | 20 | **P2** |
| 450 | `src\lib\components\yorha\dashboard\EvidenceStats.svelte` | 4 | components | 5 | 20 | **P2** |
| 451 | `src\lib\error-brain\analyze\ingest.ts` | 20 | other | 1 | 20 | **P2** |
| 452 | `src\lib\evidence-canvas\case-similarity-service.ts` | 20 | other | 1 | 20 | **P2** |
| 453 | `src\lib\hooks\fastjson-server.ts` | 20 | other | 1 | 20 | **P2** |
| 454 | `src\lib\integrations\legal-ai-webgpu-bridge.ts` | 13 | other | 1 | 20 | **P2** |
| 455 | `src\lib\machines\aiAssistantMachine.minimal.ts` | 20 | other | 1 | 20 | **P2** |
| 456 | `src\lib\machines\canvasSystem.ts` | 20 | other | 1 | 20 | **P2** |
| 457 | `src\lib\orchestration\index.ts` | 20 | other | 1 | 20 | **P2** |
| 458 | `src\lib\api\ollama.ts` | 19 | other | 1 | 19 | **P2** |
| 459 | `src\lib\config\local-llm.ts` | 19 | other | 1 | 19 | **P2** |
| 460 | `src\lib\error-brain\report-writer.ts` | 19 | other | 1 | 19 | **P2** |
| 461 | `src\lib\types\index.ts` | 4 | other | 1 | 18 | **P2** |
| 462 | `src\lib\api\services\job-cache-service.ts` | 4 | other | 1 | 18 | **P2** |
| 463 | `src\lib\auth\session.ts` | 2 | auth | 9 | 18 | **P2** |
| 464 | `src\lib\components\auth\index.ts` | 2 | auth | 9 | 18 | **P2** |
| 465 | `src\lib\services\api-client.ts` | 18 | other | 1 | 18 | **P2** |
| 466 | `src\lib\config\multi-protocol-routes.ts` | 18 | other | 1 | 18 | **P2** |
| 467 | `src\lib\services\simd-redis-client.ts` | 18 | other | 1 | 18 | **P2** |
| 468 | `src\lib\machines\aiAssistantMachine.stories.ts` | 18 | other | 1 | 18 | **P2** |
| 469 | `src\lib\machines\search-machine.ts` | 18 | other | 1 | 18 | **P2** |
| 470 | `src\lib\metrics\gpuMetricsBatcher.ts` | 18 | other | 1 | 18 | **P2** |
| 471 | `src\lib\optimization\simd-json-parser.ts` | 18 | other | 1 | 18 | **P2** |
| 472 | `src\lib\schemas\upload.ts` | 2 | database | 9 | 18 | **P2** |
| 473 | `src\lib\server\auth-utils.ts` | 2 | auth | 9 | 18 | **P2** |
| 474 | `src\lib\services\ollama-integration-layer.ts` | 17 | other | 1 | 17 | **P2** |
| 475 | `src\lib\actors\embedding-actor.ts` | 17 | other | 1 | 17 | **P2** |
| 476 | `src\lib\error-brain\analyze\propose.ts` | 17 | other | 1 | 17 | **P2** |
| 477 | `src\lib\server\database-api-bridge.ts` | 17 | other | 1 | 17 | **P2** |
| 478 | `src\lib\api\enhanced-case-api.ts` | 16 | other | 1 | 16 | **P2** |
| 479 | `src\lib\wasm\vector-wasm-wrapper.ts` | 16 | other | 1 | 16 | **P2** |
| 480 | `src\lib\services\anonymous-session-manager.ts` | 16 | other | 1 | 16 | **P2** |
| 481 | `src\lib\types\database.ts` | 16 | other | 1 | 16 | **P2** |
| 482 | `src\lib\server\redis-client.ts` | 16 | other | 1 | 16 | **P2** |
| 483 | `src\lib\machines\chatMachine.ts` | 16 | other | 1 | 16 | **P2** |
| 484 | `src\lib\services\qdrant-client.ts` | 15 | other | 1 | 15 | **P2** |
| 485 | `src\lib\client\rerank-client.ts` | 15 | other | 1 | 15 | **P2** |
| 486 | `src\lib\clients\securityOrchestrator.ts` | 15 | other | 1 | 15 | **P2** |
| 487 | `src\lib\components\SummaryEditor.svelte` | 3 | components | 5 | 15 | **P2** |
| 488 | `src\lib\components\CaseDetailPage.svelte` | 3 | components | 5 | 15 | **P2** |
| 489 | `src\lib\components\CrewAIOrchestrationDemo.svelte` | 3 | components | 5 | 15 | **P2** |
| 490 | `src\lib\components\FilterPanel.svelte` | 3 | components | 5 | 15 | **P2** |
| 491 | `src\lib\components\PersonProfile.svelte` | 3 | components | 5 | 15 | **P2** |
| 492 | `src\lib\components\RouteInspectorModal.svelte` | 3 | components | 5 | 15 | **P2** |
| 493 | `src\lib\components\admin\EvidenceDrawer.svelte` | 3 | components | 5 | 15 | **P2** |
| 494 | `src\lib\components\detective\index.ts` | 3 | components | 5 | 15 | **P2** |
| 495 | `src\lib\components\evidence-graph\GraphSearchBox.svelte` | 3 | components | 5 | 15 | **P2** |
| 496 | `src\lib\components\headless\evidence-canvas.svelte.ts` | 3 | components | 5 | 15 | **P2** |
| 497 | `src\lib\components\legal-ai\StatuteSearchBar.svelte` | 3 | components | 5 | 15 | **P2** |
| 498 | `src\lib\components\ui\checkbox\Checkbox.svelte` | 3 | components | 5 | 15 | **P2** |
| 499 | `src\lib\components\poi\POIEditor.svelte` | 3 | components | 5 | 15 | **P2** |
| 500 | `src\lib\components\subcomponents\index.ts` | 3 | components | 5 | 15 | **P2** |
| 501 | `src\lib\components\ui\checkbox\index.ts` | 3 | components | 5 | 15 | **P2** |
| 502 | `src\lib\components\ui\command\index.ts` | 3 | components | 5 | 15 | **P2** |
| 503 | `src\lib\components\ui\dialog\types.ts` | 3 | components | 5 | 15 | **P2** |
| 504 | `src\lib\components\ui\scroll-area\index.ts` | 3 | components | 5 | 15 | **P2** |
| 505 | `src\lib\components\ui\separator\index.ts` | 3 | components | 5 | 15 | **P2** |
| 506 | `src\lib\components\yorha\dashboard\ActiveCasesWidget.svelte` | 3 | components | 5 | 15 | **P2** |
| 507 | `src\lib\phase78\routeErrorAssistantMachine.ts` | 15 | other | 1 | 15 | **P2** |
| 508 | `src\lib\ClientEmbeddingService.ts` | 14 | other | 1 | 14 | **P2** |
| 509 | `src\lib\simd\simd-json-integration.ts` | 14 | other | 1 | 14 | **P2** |
| 510 | `src\lib\evidence\detective-analysis-engine.ts` | 14 | other | 1 | 14 | **P2** |
| 511 | `src\lib\integrations\comprehensive-agent-orchestration.ts` | 14 | other | 1 | 14 | **P2** |
| 512 | `src\lib\integrations\rabbitmq-tensor-integration.ts` | 14 | other | 1 | 14 | **P2** |
| 513 | `src\lib\phase72\astVectorizer.ts` | 14 | other | 1 | 14 | **P2** |
| 514 | `src\lib\server\adapter-ranking.ts` | 14 | other | 1 | 14 | **P2** |
| 515 | `src\lib\ai\ollama-config.ts` | 13 | other | 1 | 13 | **P2** |
| 516 | `src\lib\machines\canvasEditorMachine.ts` | 13 | other | 1 | 13 | **P2** |
| 517 | `src\lib\middleware\featureFlagEnforcer.ts` | 13 | other | 1 | 13 | **P2** |
| 518 | `src\lib\phase72\routeAdapter.ts` | 13 | other | 1 | 13 | **P2** |
| 519 | `src\lib\phase72\command-center-restructure-tasks.ts` | 12 | other | 1 | 12 | **P2** |
| 520 | `src\lib\client\search-client.ts` | 12 | other | 1 | 12 | **P2** |
| 521 | `src\lib\constants\local-llm-config.ts` | 12 | other | 1 | 12 | **P2** |
| 522 | `src\lib\integrations\enhanced-rabbitmq-cuda-bridge.ts` | 12 | other | 1 | 12 | **P2** |
| 523 | `src\lib\logic\HistoryManager.ts` | 12 | other | 1 | 12 | **P2** |
| 524 | `src\lib\machines\ai-system-monitor.ts` | 12 | other | 1 | 12 | **P2** |
| 525 | `src\lib\routing\multidimensional-routing-matrix.server.ts` | 12 | other | 1 | 12 | **P2** |
| 526 | `src\lib\search\fuseStore.ts` | 12 | other | 1 | 12 | **P2** |
| 527 | `src\lib\integration-status.ts` | 11 | other | 1 | 11 | **P2** |
| 528 | `src\lib\api\utils\rate-limiter.ts` | 11 | other | 1 | 11 | **P2** |
| 529 | `src\lib\data\routes-config.ts` | 11 | other | 1 | 11 | **P2** |
| 530 | `src\lib\demo\sampleData.ts` | 11 | other | 1 | 11 | **P2** |
| 531 | `src\lib\services\search-service.ts` | 10 | other | 1 | 10 | **P2** |
| 532 | `src\lib\components\AIAssistant.svelte.ts` | 2 | components | 5 | 10 | **P2** |
| 533 | `src\lib\components\EvidenceConnections.svelte` | 2 | components | 5 | 10 | **P2** |
| 534 | `src\lib\components\Navigation.svelte` | 2 | components | 5 | 10 | **P2** |
| 535 | `src\lib\components\NesModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 536 | `src\lib\components\Phase72ErrorBrain.svelte` | 2 | components | 5 | 10 | **P2** |
| 537 | `src\lib\components\SearchBar.svelte` | 2 | components | 5 | 10 | **P2** |
| 538 | `src\lib\components\SmartEvidenceRecommendations.svelte` | 2 | components | 5 | 10 | **P2** |
| 539 | `src\lib\components\admin\AdminLayout.svelte` | 2 | components | 5 | 10 | **P2** |
| 540 | `src\lib\components\ai\ContextualEvidenceChatModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 541 | `src\lib\components\ai\PatternRecognition.svelte` | 2 | components | 5 | 10 | **P2** |
| 542 | `src\lib\components\ai\cognitive\CognitiveDocumentationHub.svelte` | 2 | components | 5 | 10 | **P2** |
| 543 | `src\lib\components\alerts\AlertsPanel.svelte` | 2 | components | 5 | 10 | **P2** |
| 544 | `src\lib\components\ast\CodeEditor.svelte` | 2 | components | 5 | 10 | **P2** |
| 545 | `src\lib\components\canvas\FabricCanvas.svelte` | 2 | components | 5 | 10 | **P2** |
| 546 | `src\lib\components\case\VerificationDisclaimer.svelte` | 2 | components | 5 | 10 | **P2** |
| 547 | `src\lib\components\charges\CaseTimeline.svelte` | 2 | components | 5 | 10 | **P2** |
| 548 | `src\lib\components\editors\LegalRichTextEditor.svelte` | 2 | components | 5 | 10 | **P2** |
| 549 | `src\lib\components\error-brain\ErrorBrainModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 550 | `src\lib\components\evidence\EvidenceNode.svelte` | 2 | components | 5 | 10 | **P2** |
| 551 | `src\lib\components\evidence\RelationshipInspector.svelte` | 2 | components | 5 | 10 | **P2** |
| 552 | `src\lib\components\evidence-graph\GraphView.svelte` | 2 | components | 5 | 10 | **P2** |
| 553 | `src\lib\components\laws\LegalAutocomplete.svelte` | 2 | components | 5 | 10 | **P2** |
| 554 | `src\lib\components\legal-ai\LegalAILayout.svelte` | 2 | components | 5 | 10 | **P2** |
| 555 | `src\lib\components\navigation\ConsolidatedNavigation.svelte` | 2 | components | 5 | 10 | **P2** |
| 556 | `src\lib\components\nes\NesModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 557 | `src\lib\components\notes\LegalNotesManager.svelte` | 2 | components | 5 | 10 | **P2** |
| 558 | `src\lib\components\poi\POICard.svelte` | 2 | components | 5 | 10 | **P2** |
| 559 | `src\lib\components\ui\core\Textarea.svelte` | 2 | components | 5 | 10 | **P2** |
| 560 | `src\lib\components\three\yorha-ui\YoRHaAntiAliasing3D.ts` | 2 | components | 5 | 10 | **P2** |
| 561 | `src\lib\components\ui\bits\StatCard.svelte` | 2 | components | 5 | 10 | **P2** |
| 562 | `src\lib\components\ui\gaming\constants\gaming-constants-minimal.ts` | 2 | components | 5 | 10 | **P2** |
| 563 | `src\lib\components\ui\select\types.ts` | 2 | components | 5 | 10 | **P2** |
| 564 | `src\lib\components\vision\SimilarityHeatmap.svelte` | 2 | components | 5 | 10 | **P2** |
| 565 | `src\lib\components\vision\ZoomEnhanceViewer.svelte` | 2 | components | 5 | 10 | **P2** |
| 566 | `src\lib\components\visualizations\WebGPUEvidenceGraphVisualization\index.ts` | 2 | components | 5 | 10 | **P2** |
| 567 | `src\lib\components\yorha\CrossExaminationAssistant.svelte` | 2 | components | 5 | 10 | **P2** |
| 568 | `src\lib\components\yorha\DetectiveModeDashboard.svelte` | 2 | components | 5 | 10 | **P2** |
| 569 | `src\lib\components\yorha\EvidenceBoard.svelte` | 2 | components | 5 | 10 | **P2** |
| 570 | `src\lib\components\yorha\evidence\EvidenceComparisonOverlay.svelte` | 2 | components | 5 | 10 | **P2** |
| 571 | `src\lib\components\yorha\dashboard\GPUMetrics.svelte` | 2 | components | 5 | 10 | **P2** |
| 572 | `src\lib\config\redis-config.ts` | 10 | other | 1 | 10 | **P2** |
| 573 | `src\lib\error-brain\state.ts` | 10 | other | 1 | 10 | **P2** |
| 574 | `src\lib\messaging\rabbitmq-legal-queue.ts` | 10 | other | 1 | 10 | **P2** |
| 575 | `src\lib\shared\quantize.ts` | 9 | other | 1 | 9 | **P2** |
| 576 | `src\lib\components\auth\AuthForm.svelte` | 1 | auth | 9 | 9 | **P2** |
| 577 | `src\lib\components\auth\AuthGuard.svelte` | 1 | auth | 9 | 9 | **P2** |
| 578 | `src\lib\components\auth\AuthProvider.svelte` | 1 | auth | 9 | 9 | **P2** |
| 579 | `src\lib\components\auth\AvatarUpload.svelte` | 1 | auth | 9 | 9 | **P2** |
| 580 | `src\lib\components\auth\DemoLoginButton.svelte` | 1 | auth | 9 | 9 | **P2** |
| 581 | `src\lib\components\auth\EnhancedAuthForm.svelte` | 1 | auth | 9 | 9 | **P2** |
| 582 | `src\lib\components\auth\LoginButton.svelte` | 1 | auth | 9 | 9 | **P2** |
| 583 | `src\lib\components\auth\LoginModal.svelte` | 1 | auth | 9 | 9 | **P2** |
| 584 | `src\lib\components\auth\ModernAuthForm.svelte` | 1 | auth | 9 | 9 | **P2** |
| 585 | `src\lib\components\auth\NesAuthButton.svelte` | 1 | auth | 9 | 9 | **P2** |
| 586 | `src\lib\components\auth\NesAuthModal.svelte` | 1 | auth | 9 | 9 | **P2** |
| 587 | `src\lib\components\auth\PermissionGuard.svelte` | 1 | auth | 9 | 9 | **P2** |
| 588 | `src\lib\components\auth\RegisterForm.simple.svelte` | 1 | auth | 9 | 9 | **P2** |
| 589 | `src\lib\components\auth\RegisterForm.svelte` | 1 | auth | 9 | 9 | **P2** |
| 590 | `src\lib\components\auth\RegisterModal.svelte` | 1 | auth | 9 | 9 | **P2** |
| 591 | `src\lib\components\auth\RoleGuard.svelte` | 1 | auth | 9 | 9 | **P2** |
| 592 | `src\lib\components\auth\UserProfileDropdown.svelte` | 1 | auth | 9 | 9 | **P2** |
| 593 | `src\lib\components\auth\XStateAuthDemo.svelte` | 1 | auth | 9 | 9 | **P2** |
| 594 | `src\lib\components\auth\RegisterModal\index.ts` | 1 | auth | 9 | 9 | **P2** |
| 595 | `src\lib\server\db\schema\error_events.ts` | 1 | database | 9 | 9 | **P2** |
| 596 | `src\lib\config\ollama.ts` | 9 | other | 1 | 9 | **P2** |
| 597 | `src\lib\webgpu\texture-streaming.ts` | 9 | other | 1 | 9 | **P2** |
| 598 | `src\lib\logic\Report.ts` | 9 | other | 1 | 9 | **P2** |
| 599 | `src\lib\client\ai\webgpu-reranker.ts` | 8 | other | 1 | 8 | **P2** |
| 600 | `src\lib\utils\accessibility.ts` | 2 | utils | 4 | 8 | **P2** |
| 601 | `src\lib\features\evidence-command-center\EvidenceBoardPane.svelte` | 8 | other | 1 | 8 | **P2** |
| 602 | `src\lib\llm\gemma.ts` | 8 | other | 1 | 8 | **P2** |
| 603 | `src\lib\machines\aiSummaryMachine.ts` | 8 | other | 1 | 8 | **P2** |
| 604 | `src\lib\machines\idle-detection-rabbitmq-machine.ts` | 8 | other | 1 | 8 | **P2** |
| 605 | `src\lib\webgpu\webgpu-polyfill.ts` | 8 | other | 1 | 8 | **P2** |
| 606 | `src\lib\rag\som-intent.ts` | 8 | other | 1 | 8 | **P2** |
| 607 | `src\lib\types\search.types.ts` | 7 | other | 1 | 7 | **P2** |
| 608 | `src\lib\config\production-config.ts` | 7 | other | 1 | 7 | **P2** |
| 609 | `src\lib\core\logic\legal-ai-logic.ts` | 7 | other | 1 | 7 | **P2** |
| 610 | `src\lib\database\connection.ts` | 7 | other | 1 | 7 | **P2** |
| 611 | `src\lib\evidence-canvas\evidence-canvas.svelte` | 7 | other | 1 | 7 | **P2** |
| 612 | `src\lib\server\embedding-gateway.ts` | 7 | other | 1 | 7 | **P2** |
| 613 | `src\lib\machines\metrics.ts` | 7 | other | 1 | 7 | **P2** |
| 614 | `src\lib\services\tensor-upscaler-service.ts` | 7 | other | 1 | 7 | **P2** |
| 615 | `src\lib\orchestration\complete-legal-ai-orchestrator.ts` | 7 | other | 1 | 7 | **P2** |
| 616 | `src\lib\animations\gpu-animations.ts` | 6 | other | 1 | 6 | **P2** |
| 617 | `src\lib\api\recommendation-engine.ts` | 6 | other | 1 | 6 | **P2** |
| 618 | `src\lib\api\services\case-service.ts` | 6 | other | 1 | 6 | **P2** |
| 619 | `src\lib\services\end-to-end-api-integration.ts` | 6 | other | 1 | 6 | **P2** |
| 620 | `src\lib\integrations\context7-wasm-mock.ts` | 6 | other | 1 | 6 | **P2** |
| 621 | `src\lib\services\autogen-service.ts` | 6 | other | 1 | 6 | **P2** |
| 622 | `src\lib\machines\case-workflow-machine.ts` | 6 | other | 1 | 6 | **P2** |
| 623 | `src\lib\machines\system-monitor.ts` | 6 | other | 1 | 6 | **P2** |
| 624 | `src\lib\optimization\json-wasm-optimizer.ts` | 6 | other | 1 | 6 | **P2** |
| 625 | `src\lib\mcp-rabbitmq-redis-docs.ts` | 5 | other | 1 | 5 | **P2** |
| 626 | `src\lib\services\documentApi.ts` | 5 | other | 1 | 5 | **P2** |
| 627 | `src\lib\components\+AddNotesSection.svelte` | 1 | components | 5 | 5 | **P2** |
| 628 | `src\lib\components\+CaseCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 629 | `src\lib\components\AIAnalysisForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 630 | `src\lib\components\AIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 631 | `src\lib\components\AIAssistantButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 632 | `src\lib\components\AIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 633 | `src\lib\components\AIChatAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 634 | `src\lib\components\AIFabButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 635 | `src\lib\components\ActionPopup.svelte` | 1 | components | 5 | 5 | **P2** |
| 636 | `src\lib\components\AdvancedRichTextEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 637 | `src\lib\components\ArtifactViewer.svelte` | 1 | components | 5 | 5 | **P2** |
| 638 | `src\lib\components\CRUDDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 639 | `src\lib\components\CaseSelector.svelte` | 1 | components | 5 | 5 | **P2** |
| 640 | `src\lib\components\Chat.svelte` | 1 | components | 5 | 5 | **P2** |
| 641 | `src\lib\components\ChatMessages.svelte` | 1 | components | 5 | 5 | **P2** |
| 642 | `src\lib\components\ComprehensiveUploadAnalytics.svelte` | 1 | components | 5 | 5 | **P2** |
| 643 | `src\lib\components\DemoChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 644 | `src\lib\components\DetectiveLayout.svelte` | 1 | components | 5 | 5 | **P2** |
| 645 | `src\lib\components\DocumentDetailModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 646 | `src\lib\components\DocumentUploadForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 647 | `src\lib\components\EditableCanvasSystem.svelte` | 1 | components | 5 | 5 | **P2** |
| 648 | `src\lib\components\Enhanced3DSemanticProcessor.svelte` | 1 | components | 5 | 5 | **P2** |
| 649 | `src\lib\components\EnhancedAISearch.svelte` | 1 | components | 5 | 5 | **P2** |
| 650 | `src\lib\components\EnhancedCanvasEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 651 | `src\lib\components\EnhancedChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 652 | `src\lib\components\EnhancedDocumentUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 653 | `src\lib\components\EnhancedLegalAI.svelte` | 1 | components | 5 | 5 | **P2** |
| 654 | `src\lib\components\EnhancedLegalAIDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 655 | `src\lib\components\EnhancedLegalCaseManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 656 | `src\lib\components\EnhancedLegalChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 657 | `src\lib\components\EnhancedLegalUploadAnalytics.svelte` | 1 | components | 5 | 5 | **P2** |
| 658 | `src\lib\components\EnhancedRAGInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 659 | `src\lib\components\ErrorHandler.svelte` | 1 | components | 5 | 5 | **P2** |
| 660 | `src\lib\components\EvidenceAnalysisForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 661 | `src\lib\components\EvidenceGrid.svelte` | 1 | components | 5 | 5 | **P2** |
| 662 | `src\lib\components\EvidencePanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 663 | `src\lib\components\EvidenceSidebar.svelte` | 1 | components | 5 | 5 | **P2** |
| 664 | `src\lib\components\EvidenceUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 665 | `src\lib\components\EvidenceUploadBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 666 | `src\lib\components\EvidenceUploader.svelte` | 1 | components | 5 | 5 | **P2** |
| 667 | `src\lib\components\FeedbackButtons.svelte` | 1 | components | 5 | 5 | **P2** |
| 668 | `src\lib\components\FileUploadSection.svelte` | 1 | components | 5 | 5 | **P2** |
| 669 | `src\lib\components\FileUploadWithFallback.svelte` | 1 | components | 5 | 5 | **P2** |
| 670 | `src\lib\components\GPUAcceleratedChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 671 | `src\lib\components\GlobalAIAssistantButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 672 | `src\lib\components\GlobalSidebar.svelte` | 1 | components | 5 | 5 | **P2** |
| 673 | `src\lib\components\GraphExplorer.svelte` | 1 | components | 5 | 5 | **P2** |
| 674 | `src\lib\components\Header.svelte` | 1 | components | 5 | 5 | **P2** |
| 675 | `src\lib\components\HeadlessDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 676 | `src\lib\components\HeadlessTypingListener.svelte` | 1 | components | 5 | 5 | **P2** |
| 677 | `src\lib\components\IntelligentEvidenceList.svelte` | 1 | components | 5 | 5 | **P2** |
| 678 | `src\lib\components\KeyboardShortcutProvider.svelte` | 1 | components | 5 | 5 | **P2** |
| 679 | `src\lib\components\KeyboardShortcuts.svelte` | 1 | components | 5 | 5 | **P2** |
| 680 | `src\lib\components\KeyboardShortcutsPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 681 | `src\lib\components\LLMAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 682 | `src\lib\components\LLMInference.svelte` | 1 | components | 5 | 5 | **P2** |
| 683 | `src\lib\components\LLMUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 684 | `src\lib\components\LazyLoader.svelte` | 1 | components | 5 | 5 | **P2** |
| 685 | `src\lib\components\LegalAIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 686 | `src\lib\components\LegalAIDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 687 | `src\lib\components\LegalAnalysisDialog.svelte` | 1 | components | 5 | 5 | **P2** |
| 688 | `src\lib\components\LegalCaseManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 689 | `src\lib\components\LegalDisclaimer.svelte` | 1 | components | 5 | 5 | **P2** |
| 690 | `src\lib\components\LegalTextureCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 691 | `src\lib\components\LoadingSpinner.svelte` | 1 | components | 5 | 5 | **P2** |
| 692 | `src\lib\components\LoggingDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 693 | `src\lib\components\MemoryMonitor.svelte` | 1 | components | 5 | 5 | **P2** |
| 694 | `src\lib\components\MinimalLanding.svelte` | 1 | components | 5 | 5 | **P2** |
| 695 | `src\lib\components\MinioUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 696 | `src\lib\components\MonacoEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 697 | `src\lib\components\Neo4jRecommendation3DViewer.svelte` | 1 | components | 5 | 5 | **P2** |
| 698 | `src\lib\components\NierHeader.svelte` | 1 | components | 5 | 5 | **P2** |
| 699 | `src\lib\components\NierNavigation.svelte` | 1 | components | 5 | 5 | **P2** |
| 700 | `src\lib\components\NierRichTextEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 701 | `src\lib\components\NierThemeShowcase.svelte` | 1 | components | 5 | 5 | **P2** |
| 702 | `src\lib\components\OllamaChatInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 703 | `src\lib\components\OptimizedMinIOUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 704 | `src\lib\components\ui\dialog\DialogContent.svelte` | 1 | components | 5 | 5 | **P2** |
| 705 | `src\lib\components\ui\dialog\DialogDescription.svelte` | 1 | components | 5 | 5 | **P2** |
| 706 | `src\lib\components\ui\dialog\DialogFooter.svelte` | 1 | components | 5 | 5 | **P2** |
| 707 | `src\lib\components\ui\dialog\DialogRoot.svelte` | 1 | components | 5 | 5 | **P2** |
| 708 | `src\lib\components\ui\dialog\DialogTitle.svelte` | 1 | components | 5 | 5 | **P2** |
| 709 | `src\lib\components\ui\dialog\DialogTrigger.svelte` | 1 | components | 5 | 5 | **P2** |
| 710 | `src\lib\components\ui\dialog\Dialog.svelte` | 1 | components | 5 | 5 | **P2** |
| 711 | `src\lib\components\PerfChart.svelte` | 1 | components | 5 | 5 | **P2** |
| 712 | `src\lib\components\PerformanceDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 713 | `src\lib\components\PersonCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 714 | `src\lib\components\PersonForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 715 | `src\lib\components\RAGSearchComponent.svelte` | 1 | components | 5 | 5 | **P2** |
| 716 | `src\lib\components\ResultDetail.svelte` | 1 | components | 5 | 5 | **P2** |
| 717 | `src\lib\components\RouteDecisionModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 718 | `src\lib\components\SearchBox.svelte` | 1 | components | 5 | 5 | **P2** |
| 719 | `src\lib\components\SearchInput.svelte` | 1 | components | 5 | 5 | **P2** |
| 720 | `src\lib\components\SearchResults.svelte` | 1 | components | 5 | 5 | **P2** |
| 721 | `src\lib\components\SessionInitializer.svelte` | 1 | components | 5 | 5 | **P2** |
| 722 | `src\lib\components\Settings.svelte` | 1 | components | 5 | 5 | **P2** |
| 723 | `src\lib\components\Sidebar.svelte` | 1 | components | 5 | 5 | **P2** |
| 724 | `src\lib\components\StatsPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 725 | `src\lib\components\StreamingResponse.svelte` | 1 | components | 5 | 5 | **P2** |
| 726 | `src\lib\components\TagList.svelte` | 1 | components | 5 | 5 | **P2** |
| 727 | `src\lib\components\TipTapEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 728 | `src\lib\components\TokenUsageManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 729 | `src\lib\components\Toolbar.svelte` | 1 | components | 5 | 5 | **P2** |
| 730 | `src\lib\components\Typewriter.svelte` | 1 | components | 5 | 5 | **P2** |
| 731 | `src\lib\components\UIDiagram.svelte` | 1 | components | 5 | 5 | **P2** |
| 732 | `src\lib\components\UnifiedIntegrationDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 733 | `src\lib\components\UploadArea.svelte` | 1 | components | 5 | 5 | **P2** |
| 734 | `src\lib\components\UploadAreaExample.svelte` | 1 | components | 5 | 5 | **P2** |
| 735 | `src\lib\components\UploadProgress.svelte` | 1 | components | 5 | 5 | **P2** |
| 736 | `src\lib\components\UserDropdown.svelte` | 1 | components | 5 | 5 | **P2** |
| 737 | `src\lib\components\VoiceAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 738 | `src\lib\components\WebGPUProcessor.svelte` | 1 | components | 5 | 5 | **P2** |
| 739 | `src\lib\components\ai-synthesis-client.svelte` | 1 | components | 5 | 5 | **P2** |
| 740 | `src\lib\components\Dialog\index.ts` | 1 | components | 5 | 5 | **P2** |
| 741 | `src\lib\components\_archive\svelte4\AccessibilityPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 742 | `src\lib\components\_archive\svelte4\AttractivenessMetr.svelte` | 1 | components | 5 | 5 | **P2** |
| 743 | `src\lib\components\_archive\svelte4\Avatar.svelte` | 1 | components | 5 | 5 | **P2** |
| 744 | `src\lib\components\_archive\svelte4\BitsDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 745 | `src\lib\components\_archive\svelte4\CanvasEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 746 | `src\lib\components\_archive\svelte4\CaseInfoForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 747 | `src\lib\components\_archive\svelte4\CaseSummaryModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 748 | `src\lib\components\_archive\svelte4\CitationSidebar.svelte` | 1 | components | 5 | 5 | **P2** |
| 749 | `src\lib\components\_archive\svelte4\CommandMenu.svelte` | 1 | components | 5 | 5 | **P2** |
| 750 | `src\lib\components\_archive\svelte4\ComprehensiveSummaryEngine.svelte` | 1 | components | 5 | 5 | **P2** |
| 751 | `src\lib\components\_archive\svelte4\Dialog.svelte` | 1 | components | 5 | 5 | **P2** |
| 752 | `src\lib\components\_archive\svelte4\EnhancedAIAssistant.new.svelte` | 1 | components | 5 | 5 | **P2** |
| 753 | `src\lib\components\_archive\svelte4\EnhancedAIAssistant.simple.svelte` | 1 | components | 5 | 5 | **P2** |
| 754 | `src\lib\components\_archive\svelte4\ErrorBoundary.svelte` | 1 | components | 5 | 5 | **P2** |
| 755 | `src\lib\components\_archive\svelte4\EvidenceProcessor.svelte` | 1 | components | 5 | 5 | **P2** |
| 756 | `src\lib\components\_archive\svelte4\InfiniteScrollList.svelte` | 1 | components | 5 | 5 | **P2** |
| 757 | `src\lib\components\_archive\svelte4\InspectorPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 758 | `src\lib\components\_archive\svelte4\LoginModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 759 | `src\lib\components\_archive\svelte4\ProfessionalEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 760 | `src\lib\components\_archive\svelte4\ProgressIndicator.svelte` | 1 | components | 5 | 5 | **P2** |
| 761 | `src\lib\components\_archive\svelte4\RealTimeEvidenceGrid.svelte` | 1 | components | 5 | 5 | **P2** |
| 762 | `src\lib\components\_archive\svelte4\RealtimeRAG.svelte` | 1 | components | 5 | 5 | **P2** |
| 763 | `src\lib\components\_archive\svelte4\ReportEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 764 | `src\lib\components\_archive\svelte4\ReviewSubmitForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 765 | `src\lib\components\_archive\test-demo\demo\AdvancedCacheDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 766 | `src\lib\components\_archive\test-demo\demo\CachedRAGDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 767 | `src\lib\components\_archive\test-demo\demo\EnhancedCaseManagementDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 768 | `src\lib\components\_archive\test-demo\demo\EnhancedSemanticIntegration.svelte` | 1 | components | 5 | 5 | **P2** |
| 769 | `src\lib\components\_archive\test-demo\demo\GamingCacheDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 770 | `src\lib\components\_archive\test-demo\demo\IntegratedSystemDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 771 | `src\lib\components\_archive\test-demo\demo\PerformanceOptimizedEvidenceBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 772 | `src\lib\components\_archive\test-demo\demo\SOMIntelligentTodoGenerator.svelte` | 1 | components | 5 | 5 | **P2** |
| 773 | `src\lib\components\_archive\test-demo\demo\VectorIntelligenceDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 774 | `src\lib\components\_archive\test-demo\demo\VectorPipelineDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 775 | `src\lib\components\_archive\test-demo\demo\WasmGpuDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 776 | `src\lib\components\_archive\test-demo\demo\WebGPUAccelerationDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 777 | `src\lib\components\_archive\test-demo\demo\WebGPUArrayUtilsDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 778 | `src\lib\components\_archive\test-demo\demo\WebGPUQuantizationDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 779 | `src\lib\components\_archive\test-demo\dev\Context7TestDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 780 | `src\lib\components\_archive\test-demo\dev\CookieStatus.svelte` | 1 | components | 5 | 5 | **P2** |
| 781 | `src\lib\components\_archive\test-demo\dev\MCPToolsDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 782 | `src\lib\components\_archive\test-demo\dev\SelfPromptingDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 783 | `src\lib\components\_archive\test-demo\examples\CounterExample.svelte` | 1 | components | 5 | 5 | **P2** |
| 784 | `src\lib\components\_archive\test-demo\examples\NESMemoryArchitectureExample.svelte` | 1 | components | 5 | 5 | **P2** |
| 785 | `src\lib\components\_archive\test-demo\examples\NESTextureStreamingExample.svelte` | 1 | components | 5 | 5 | **P2** |
| 786 | `src\lib\components\_archive\test-demo\examples\Svelte5Examples.svelte` | 1 | components | 5 | 5 | **P2** |
| 787 | `src\lib\components\_archive\test-demo\storybook\DiffusionEmbeddingEffects.stories.svelte` | 1 | components | 5 | 5 | **P2** |
| 788 | `src\lib\components\_archive\test-demo\storybook\PS1CRTEffects.stories.svelte` | 1 | components | 5 | 5 | **P2** |
| 789 | `src\lib\components\_archive\test-demo\storybook\PS1ParallaxDynamic.stories.svelte` | 1 | components | 5 | 5 | **P2** |
| 790 | `src\lib\components\_archive\test-demo\storybook\PS1StereoscopicEffects.stories.svelte` | 1 | components | 5 | 5 | **P2** |
| 791 | `src\lib\components\_archive\test-demo\storybook\PS1TextureFiltering.stories.svelte` | 1 | components | 5 | 5 | **P2** |
| 792 | `src\lib\components\_archive\test-demo\tests\ComprehensiveAITest.svelte` | 1 | components | 5 | 5 | **P2** |
| 793 | `src\lib\components\_archive\test-demo\tests\WebAssemblyLangChainTest.svelte` | 1 | components | 5 | 5 | **P2** |
| 794 | `src\lib\components\admin\AdminSidebar.svelte` | 1 | components | 5 | 5 | **P2** |
| 795 | `src\lib\components\admin\EvidenceDataGrid.svelte` | 1 | components | 5 | 5 | **P2** |
| 796 | `src\lib\components\admin\JurisdictionSelector.svelte` | 1 | components | 5 | 5 | **P2** |
| 797 | `src\lib\components\agentic\AgenticController.svelte` | 1 | components | 5 | 5 | **P2** |
| 798 | `src\lib\components\ai\AIAssistantButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 799 | `src\lib\components\ai\AIAssistantChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 800 | `src\lib\components\ai\AIAssistantModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 801 | `src\lib\components\ai\AIAssistantPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 802 | `src\lib\components\ai\AIButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 803 | `src\lib\components\ai\AIButtonPortal.svelte` | 1 | components | 5 | 5 | **P2** |
| 804 | `src\lib\components\ai\AIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 805 | `src\lib\components\ai\AIChatInput.svelte` | 1 | components | 5 | 5 | **P2** |
| 806 | `src\lib\components\ai\AIChatInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 807 | `src\lib\components\ai\AIChatMessage.svelte` | 1 | components | 5 | 5 | **P2** |
| 808 | `src\lib\components\ai\AIChatWidget.svelte` | 1 | components | 5 | 5 | **P2** |
| 809 | `src\lib\components\ai\AIProcessingDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 810 | `src\lib\components\ai\AIPromptSearch.svelte` | 1 | components | 5 | 5 | **P2** |
| 811 | `src\lib\components\ai\AIRecommendation.svelte` | 1 | components | 5 | 5 | **P2** |
| 812 | `src\lib\components\ai\AIServiceStatus.svelte` | 1 | components | 5 | 5 | **P2** |
| 813 | `src\lib\components\ai\AIStatusIndicator.svelte` | 1 | components | 5 | 5 | **P2** |
| 814 | `src\lib\components\ai\AISummaryButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 815 | `src\lib\components\ai\AIToolbar.svelte` | 1 | components | 5 | 5 | **P2** |
| 816 | `src\lib\components\ai\AgentOrchestrator.svelte` | 1 | components | 5 | 5 | **P2** |
| 817 | `src\lib\components\ai\AiAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 818 | `src\lib\components\ai\AiSetupBanner.svelte` | 1 | components | 5 | 5 | **P2** |
| 819 | `src\lib\components\ai\AskAI.svelte` | 1 | components | 5 | 5 | **P2** |
| 820 | `src\lib\components\ai\AuditResults.svelte` | 1 | components | 5 | 5 | **P2** |
| 821 | `src\lib\components\ai\CachePerformanceDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 822 | `src\lib\components\ai\CaseScoringDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 823 | `src\lib\components\ai\ChatInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 824 | `src\lib\components\ai\ChatMessage.svelte` | 1 | components | 5 | 5 | **P2** |
| 825 | `src\lib\components\ai\ClientSideAIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 826 | `src\lib\components\ai\ContextualChatDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 827 | `src\lib\components\ai\CudaSearch.svelte` | 1 | components | 5 | 5 | **P2** |
| 828 | `src\lib\components\ai\DeedAnalysis.svelte` | 1 | components | 5 | 5 | **P2** |
| 829 | `src\lib\components\ai\DocumentUploadSimulator.svelte` | 1 | components | 5 | 5 | **P2** |
| 830 | `src\lib\components\ai\Enhanced3DLegalAIInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 831 | `src\lib\components\ai\EnhancedAIAssistant.simple.svelte` | 1 | components | 5 | 5 | **P2** |
| 832 | `src\lib\components\ai\EnhancedAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 833 | `src\lib\components\ai\EnhancedAIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 834 | `src\lib\components\ai\EnhancedAIChatTest.svelte` | 1 | components | 5 | 5 | **P2** |
| 835 | `src\lib\components\ai\EnhancedContextualChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 836 | `src\lib\components\ai\EnhancedDocumentUploader.svelte` | 1 | components | 5 | 5 | **P2** |
| 837 | `src\lib\components\ai\EnhancedFileUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 838 | `src\lib\components\ai\EnhancedInlineEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 839 | `src\lib\components\ai\EnhancedLegalAIChatWithSynthesis.svelte` | 1 | components | 5 | 5 | **P2** |
| 840 | `src\lib\components\ai\EnhancedMCPIntegration.svelte` | 1 | components | 5 | 5 | **P2** |
| 841 | `src\lib\components\ai\EnhancedRAGDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 842 | `src\lib\components\ai\EnhancedVectorSearch.svelte` | 1 | components | 5 | 5 | **P2** |
| 843 | `src\lib\components\ai\EvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 844 | `src\lib\components\ai\EvidenceTimelineCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 845 | `src\lib\components\ai\FileUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 846 | `src\lib\components\ai\FindModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 847 | `src\lib\components\ai\GPUAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 848 | `src\lib\components\ai\GPUStreamingChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 849 | `src\lib\components\ai\GamingAIButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 850 | `src\lib\components\ai\GamingAIInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 851 | `src\lib\components\ai\Gemma270MWebAssembly.svelte` | 1 | components | 5 | 5 | **P2** |
| 852 | `src\lib\components\ai\Gemma3LegalChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 853 | `src\lib\components\ai\IngestAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 854 | `src\lib\components\ai\IntegratedAIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 855 | `src\lib\components\ai\IntelligentModelOrchestrator.svelte` | 1 | components | 5 | 5 | **P2** |
| 856 | `src\lib\components\ai\IntelligentWebAnalysisDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 857 | `src\lib\components\ai\LLMProviderSelector.svelte` | 1 | components | 5 | 5 | **P2** |
| 858 | `src\lib\components\ai\LLMSelector.svelte` | 1 | components | 5 | 5 | **P2** |
| 859 | `src\lib\components\ai\LegalAIPipelineDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 860 | `src\lib\components\ai\LegalDocumentDrafting.svelte` | 1 | components | 5 | 5 | **P2** |
| 861 | `src\lib\components\ai\LegalDocumentSummarizer.svelte` | 1 | components | 5 | 5 | **P2** |
| 862 | `src\lib\components\ai\LocalImageGenerator.svelte` | 1 | components | 5 | 5 | **P2** |
| 863 | `src\lib\components\ai\ModularAIExperience.svelte` | 1 | components | 5 | 5 | **P2** |
| 864 | `src\lib\components\ai\MultiAgentAnalysisCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 865 | `src\lib\components\ai\MultiLLMOrchestrator.svelte` | 1 | components | 5 | 5 | **P2** |
| 866 | `src\lib\components\ai\NESTextureStreamer.svelte` | 1 | components | 5 | 5 | **P2** |
| 867 | `src\lib\components\ai\NeuralTopology3DDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 868 | `src\lib\components\ai\NierAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 869 | `src\lib\components\ai\OCRTensorDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 870 | `src\lib\components\ai\OllamaAutoComplete.svelte` | 1 | components | 5 | 5 | **P2** |
| 871 | `src\lib\components\ai\PatternDetectionInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 872 | `src\lib\components\ai\PersonOfInterestCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 873 | `src\lib\components\ai\Phase8Demo.svelte` | 1 | components | 5 | 5 | **P2** |
| 874 | `src\lib\components\ai\ProactiveAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 875 | `src\lib\components\ai\ProactivePrompt.svelte` | 1 | components | 5 | 5 | **P2** |
| 876 | `src\lib\components\ai\QLorATrainingPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 877 | `src\lib\components\ai\RAGAssistantChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 878 | `src\lib\components\ai\RealtimeCommunicationDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 879 | `src\lib\components\ai\RecommendationEngine.svelte` | 1 | components | 5 | 5 | **P2** |
| 880 | `src\lib\components\ai\SIMDAIAssistantDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 881 | `src\lib\components\ai\SIMDGlyphDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 882 | `src\lib\components\ai\SIMDTextTilingDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 883 | `src\lib\components\ai\SOMVisualization.svelte` | 1 | components | 5 | 5 | **P2** |
| 884 | `src\lib\components\ai\SimpleFileUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 885 | `src\lib\components\ai\SimpleWorkingChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 886 | `src\lib\components\ai\SmartSearchInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 887 | `src\lib\components\ai\SoraGraphVisualization.svelte` | 1 | components | 5 | 5 | **P2** |
| 888 | `src\lib\components\ai\ThinkingStyleToggle.svelte` | 1 | components | 5 | 5 | **P2** |
| 889 | `src\lib\components\ai\TypewriterResponse.svelte` | 1 | components | 5 | 5 | **P2** |
| 890 | `src\lib\components\ai\UnifiedAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 891 | `src\lib\components\ai\VectorIntelligenceDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 892 | `src\lib\components\ai\WWWHAnalyzer.svelte` | 1 | components | 5 | 5 | **P2** |
| 893 | `src\lib\components\ai\XStatePhase8Integration.svelte` | 1 | components | 5 | 5 | **P2** |
| 894 | `src\lib\components\ai\YorhaAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 895 | `src\lib\components\ai\index.ts` | 1 | components | 5 | 5 | **P2** |
| 896 | `src\lib\components\ai\ollama-agent-shell.svelte` | 1 | components | 5 | 5 | **P2** |
| 897 | `src\lib\components\ai\webgpu-viewer.svelte` | 1 | components | 5 | 5 | **P2** |
| 898 | `src\lib\components\ai\CaseScoringDashboard\CaseScoringDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 899 | `src\lib\components\ai\PatternDetectionInterface\index.ts` | 1 | components | 5 | 5 | **P2** |
| 900 | `src\lib\components\ai\cognitive\NeuralPerformanceDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 901 | `src\lib\components\ai\cognitive\WebGPUVisualization.svelte` | 1 | components | 5 | 5 | **P2** |
| 902 | `src\lib\components\ai\copilot\AutonomousEngineeringDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 903 | `src\lib\components\ui\progress\Progress.svelte` | 1 | components | 5 | 5 | **P2** |
| 904 | `src\lib\components\upload\EnhancedUploadProgress.svelte` | 1 | components | 5 | 5 | **P2** |
| 905 | `src\lib\components\ai\rag\DocumentUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 906 | `src\lib\components\ai\rag\EnhancedRAGInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 907 | `src\lib\components\ai\webgpu\CacheOptimizerDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 908 | `src\lib\components\ai\webgpu\WebGPUProcessor.svelte` | 1 | components | 5 | 5 | **P2** |
| 909 | `src\lib\components\ai\webgpu\WebGPUWebAssemblyBridge.svelte` | 1 | components | 5 | 5 | **P2** |
| 910 | `src\lib\components\analytics\PerformanceDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 911 | `src\lib\components\bits-ui\ButtonExample.svelte` | 1 | components | 5 | 5 | **P2** |
| 912 | `src\lib\components\bits-ui\ButtonExampleUsage.svelte` | 1 | components | 5 | 5 | **P2** |
| 913 | `src\lib\components\bits-ui\Search.svelte` | 1 | components | 5 | 5 | **P2** |
| 914 | `src\lib\components\bits-ui\Upload.svelte` | 1 | components | 5 | 5 | **P2** |
| 915 | `src\lib\components\bits-ui\VectorCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 916 | `src\lib\components\cache\CacheDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 917 | `src\lib\components\canvas\AdvancedEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 918 | `src\lib\components\canvas\CollaborativeEvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 919 | `src\lib\components\canvas\EnhancedEvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 920 | `src\lib\components\canvas\EnhancedLegalCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 921 | `src\lib\components\canvas\EvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 922 | `src\lib\components\canvas\EvidenceCanvasEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 923 | `src\lib\components\canvas\EvidenceNode.svelte` | 1 | components | 5 | 5 | **P2** |
| 924 | `src\lib\components\canvas\FabricEvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 925 | `src\lib\components\canvas\POINode.svelte` | 1 | components | 5 | 5 | **P2** |
| 926 | `src\lib\components\canvas\RecursiveEvidenceNode.svelte` | 1 | components | 5 | 5 | **P2** |
| 927 | `src\lib\components\canvas\RecursiveEvidenceVisualization.svelte` | 1 | components | 5 | 5 | **P2** |
| 928 | `src\lib\components\canvas\ReportNode.svelte` | 1 | components | 5 | 5 | **P2** |
| 929 | `src\lib\components\canvas\UnifiedCanvasIntegration.svelte` | 1 | components | 5 | 5 | **P2** |
| 930 | `src\lib\components\canvas\WebGPUCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 931 | `src\lib\components\case\SimilarCasesPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 932 | `src\lib\components\legal-ai\CitationDetail.svelte` | 1 | components | 5 | 5 | **P2** |
| 933 | `src\lib\components\legal-ai\CitationList.svelte` | 1 | components | 5 | 5 | **P2** |
| 934 | `src\lib\components\cases\CaseCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 935 | `src\lib\components\cases\CaseFilters.svelte` | 1 | components | 5 | 5 | **P2** |
| 936 | `src\lib\components\cases\CaseListItem.svelte` | 1 | components | 5 | 5 | **P2** |
| 937 | `src\lib\components\editors\NierRichTextEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 938 | `src\lib\components\cases\CaseStats.svelte` | 1 | components | 5 | 5 | **P2** |
| 939 | `src\lib\components\cases\EvidenceCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 940 | `src\lib\components\chat\ChatAuthPrompt.svelte` | 1 | components | 5 | 5 | **P2** |
| 941 | `src\lib\components\chat\ChatMessage.svelte` | 1 | components | 5 | 5 | **P2** |
| 942 | `src\lib\components\chat\ContextualComposer.svelte` | 1 | components | 5 | 5 | **P2** |
| 943 | `src\lib\components\chat\LegalAIChat.svelte` | 1 | components | 5 | 5 | **P2** |
| 944 | `src\lib\components\chat\SSRQLorAChatInterface.svelte` | 1 | components | 5 | 5 | **P2** |
| 945 | `src\lib\components\chat\nes-typewriter-stream.svelte` | 1 | components | 5 | 5 | **P2** |
| 946 | `src\lib\components\chr-rom\DocumentListCHRROM.svelte` | 1 | components | 5 | 5 | **P2** |
| 947 | `src\lib\components\citations\CitationEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 948 | `src\lib\components\citations\CitationsList.svelte` | 1 | components | 5 | 5 | **P2** |
| 949 | `src\lib\components\citations\CitationsManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 950 | `src\lib\components\citations\CitationsSaveButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 951 | `src\lib\components\command-center\AllRoutesExplorer.svelte` | 1 | components | 5 | 5 | **P2** |
| 952 | `src\lib\components\dashboard\CachePerformanceMonitor.svelte` | 1 | components | 5 | 5 | **P2** |
| 953 | `src\lib\components\dashboard\CaseCardGrid.svelte` | 1 | components | 5 | 5 | **P2** |
| 954 | `src\lib\components\dashboard\EvidenceAnalysisDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 955 | `src\lib\components\dashboard\FallbackAlert.svelte` | 1 | components | 5 | 5 | **P2** |
| 956 | `src\lib\components\dashboard\LegalAIDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 957 | `src\lib\components\dashboard\ProgressCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 958 | `src\lib\components\dashboard\SystemStatusPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 959 | `src\lib\components\detective\ContextMenu.svelte` | 1 | components | 5 | 5 | **P2** |
| 960 | `src\lib\components\detective\ContextualDetectiveBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 961 | `src\lib\components\detective\DetectiveBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 962 | `src\lib\components\detective\EvidenceCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 963 | `src\lib\components\detective\UploadZone.svelte` | 1 | components | 5 | 5 | **P2** |
| 964 | `src\lib\components\editor\LegalDocumentEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 965 | `src\lib\components\editor\ReportEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 966 | `src\lib\components\editor\ReportToolbar.svelte` | 1 | components | 5 | 5 | **P2** |
| 967 | `src\lib\components\editor\RichTextEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 968 | `src\lib\components\editor\TiptapWithAIAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 969 | `src\lib\components\editor\WysiwygEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 970 | `src\lib\components\effects\ParallaxBackground.svelte` | 1 | components | 5 | 5 | **P2** |
| 971 | `src\lib\components\error\ErrorBoundary.svelte` | 1 | components | 5 | 5 | **P2** |
| 972 | `src\lib\components\evidence\+EvidenceUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 973 | `src\lib\components\evidence\CaseEvidenceOrganizer.svelte` | 1 | components | 5 | 5 | **P2** |
| 974 | `src\lib\components\evidence\DraggableEvidenceNode.svelte` | 1 | components | 5 | 5 | **P2** |
| 975 | `src\lib\components\evidence\Enhanced3DEvidenceBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 976 | `src\lib\components\evidence\EnhancedEvidenceBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 977 | `src\lib\components\evidence\EvidenceCanvas.svelte` | 1 | components | 5 | 5 | **P2** |
| 978 | `src\lib\components\evidence\EvidenceCard.svelte` | 1 | components | 5 | 5 | **P2** |
| 979 | `src\lib\components\evidence\EvidenceFilesManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 980 | `src\lib\components\evidence\EvidenceManager.svelte` | 1 | components | 5 | 5 | **P2** |
| 981 | `src\lib\components\evidence\EvidenceProcessingWorkflow.svelte` | 1 | components | 5 | 5 | **P2** |
| 982 | `src\lib\components\evidence\EvidenceUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 983 | `src\lib\components\evidence\EvidenceUploadPreview.svelte` | 1 | components | 5 | 5 | **P2** |
| 984 | `src\lib\components\evidence\EvidenceUploader.svelte` | 1 | components | 5 | 5 | **P2** |
| 985 | `src\lib\components\evidence\SimpleEvidenceBoard.svelte` | 1 | components | 5 | 5 | **P2** |
| 986 | `src\lib\components\evidence-editor\AIAssistantPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 987 | `src\lib\components\evidence-editor\VisualEvidenceEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 988 | `src\lib\components\evidence-graph\index.ts` | 1 | components | 5 | 5 | **P2** |
| 989 | `src\lib\components\feedback\FeedbackAnalyticsDashboard.svelte` | 1 | components | 5 | 5 | **P2** |
| 990 | `src\lib\components\feedback\FeedbackIntegration.svelte` | 1 | components | 5 | 5 | **P2** |
| 991 | `src\lib\components\feedback\FeedbackWidget.svelte` | 1 | components | 5 | 5 | **P2** |
| 992 | `src\lib\components\forms\CaseForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 993 | `src\lib\components\forms\EnhancedCaseForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 994 | `src\lib\components\forms\EnhancedCaseFormWithZod.svelte` | 1 | components | 5 | 5 | **P2** |
| 995 | `src\lib\components\forms\EnhancedDocumentUploadForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 996 | `src\lib\components\forms\EnhancedFileUpload.svelte` | 1 | components | 5 | 5 | **P2** |
| 997 | `src\lib\components\forms\EnhancedFormInput.svelte` | 1 | components | 5 | 5 | **P2** |
| 998 | `src\lib\components\forms\EvidenceForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 999 | `src\lib\components\forms\LegalCaseForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 1000 | `src\lib\components\forms\ProgressiveForm.svelte` | 1 | components | 5 | 5 | **P2** |

## 📋 Detailed Breakdown (Top 20)

### 1. src\lib\server\auth.ts
- **Errors:** 262
- **Category:** auth
- **Impact Score:** 2925

**Error Patterns:**
- `unknown`: 253 occurrences
- `duplicate-identifier`: 9 occurrences

### 2. src\lib\machines\auth-machine.v5.ts
- **Errors:** 147
- **Category:** auth
- **Impact Score:** 1512

**Error Patterns:**
- `unknown`: 144 occurrences
- `duplicate-identifier`: 3 occurrences

### 3. src\lib\db\schema-example-legal.ts
- **Errors:** 66
- **Category:** database
- **Impact Score:** 1350

**Error Patterns:**
- `unknown`: 54 occurrences
- `duplicate-identifier`: 12 occurrences

### 4. at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js
- **Errors:** 1094
- **Category:** other
- **Impact Score:** 1094

**Error Patterns:**
- `unknown`: 1094 occurrences

### 5. src\lib\auth\roles.ts
- **Errors:** 93
- **Category:** auth
- **Impact Score:** 837

**Error Patterns:**
- `unknown`: 93 occurrences

### 6. src\lib\stores\app-store.ts
- **Errors:** 86
- **Category:** stores
- **Impact Score:** 810

**Error Patterns:**
- `unknown`: 79 occurrences
- `duplicate-identifier`: 7 occurrences

### 7. src\lib\cache\loki-redis-integration-fixed.ts
- **Errors:** 762
- **Category:** other
- **Impact Score:** 790

**Error Patterns:**
- `unknown`: 758 occurrences
- `duplicate-identifier`: 4 occurrences

### 8. src\lib\cache\loki-redis-integration.ts
- **Errors:** 745
- **Category:** other
- **Impact Score:** 766

**Error Patterns:**
- `unknown`: 742 occurrences
- `duplicate-identifier`: 3 occurrences

### 9. src\lib\api\services\auth-service.ts
- **Errors:** 84
- **Category:** auth
- **Impact Score:** 756

**Error Patterns:**
- `unknown`: 84 occurrences

### 10. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts
- **Errors:** 85
- **Category:** components
- **Impact Score:** 705

**Error Patterns:**
- `unknown`: 77 occurrences
- `duplicate-identifier`: 8 occurrences

### 11. src\lib\components\ui\layout\index.ts
- **Errors:** 84
- **Category:** components
- **Impact Score:** 700

**Error Patterns:**
- `unknown`: 76 occurrences
- `duplicate-identifier`: 8 occurrences

### 12. src\lib\auth\auth-store.ts
- **Errors:** 52
- **Category:** auth
- **Impact Score:** 657

**Error Patterns:**
- `unknown`: 49 occurrences
- `duplicate-identifier`: 3 occurrences

### 13. src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts
- **Errors:** 74
- **Category:** components
- **Impact Score:** 650

**Error Patterns:**
- `unknown`: 66 occurrences
- `duplicate-identifier`: 8 occurrences

### 14. src\lib\messaging\rabbitmq-xstate-integration.ts
- **Errors:** 574
- **Category:** other
- **Impact Score:** 623

**Error Patterns:**
- `unknown`: 567 occurrences
- `duplicate-identifier`: 7 occurrences

### 15. src\lib\cache\headless-ui-cache.ts
- **Errors:** 563
- **Category:** other
- **Impact Score:** 598

**Error Patterns:**
- `unknown`: 558 occurrences
- `duplicate-identifier`: 5 occurrences

### 16. src\lib\cache\gpu-leftover-cache.ts
- **Errors:** 558
- **Category:** other
- **Impact Score:** 586

**Error Patterns:**
- `unknown`: 554 occurrences
- `duplicate-identifier`: 4 occurrences

### 17. src\lib\middleware\authSeparation.ts
- **Errors:** 63
- **Category:** auth
- **Impact Score:** 567

**Error Patterns:**
- `unknown`: 63 occurrences

### 18. src\lib\machines\auth-machine.ts
- **Errors:** 41
- **Category:** auth
- **Impact Score:** 558

**Error Patterns:**
- `unknown`: 38 occurrences
- `duplicate-identifier`: 3 occurrences

### 19. src\lib\cache\chr-rom-pattern-cache.ts
- **Errors:** 523
- **Category:** other
- **Impact Score:** 551

**Error Patterns:**
- `unknown`: 519 occurrences
- `duplicate-identifier`: 4 occurrences

### 20. src\lib\components\ui\enhanced-bits.ts
- **Errors:** 40
- **Category:** components
- **Impact Score:** 550

**Error Patterns:**
- `unknown`: 30 occurrences
- `duplicate-identifier`: 10 occurrences

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)
- [ ] `src\lib\server\auth.ts` (262 errors, score: 2925)
- [ ] `src\lib\machines\auth-machine.v5.ts` (147 errors, score: 1512)
- [ ] `src\lib\db\schema-example-legal.ts` (66 errors, score: 1350)
- [ ] `at c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\node_modules\vite\node_modules\esbuild\lib\main.js` (1094 errors, score: 1094)
- [ ] `src\lib\auth\roles.ts` (93 errors, score: 837)
- [ ] `src\lib\stores\app-store.ts` (86 errors, score: 810)
- [ ] `src\lib\cache\loki-redis-integration-fixed.ts` (762 errors, score: 790)
- [ ] `src\lib\cache\loki-redis-integration.ts` (745 errors, score: 766)
- [ ] `src\lib\api\services\auth-service.ts` (84 errors, score: 756)
- [ ] `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` (85 errors, score: 705)

### P1 (High - Impact 50-100)
- [ ] `src\lib\client\ocr-tensor-processor.ts` (100 errors, score: 100)
- [ ] `src\lib\machines\recommendation-routing-machine.ts` (100 errors, score: 100)
- [ ] `src\lib\components\cases\ContextualChatModal.svelte` (20 errors, score: 100)
- [ ] `src\lib\components\legal-ai\AttachToCaseModal.svelte` (20 errors, score: 100)
- [ ] `src\lib\components\CaseOutcomePrediction.svelte` (19 errors, score: 95)
- [ ] `src\lib\services\localStorage-file-fallback.ts` (92 errors, score: 92)
- [ ] `src\lib\utils\ollama-endpoints.ts` (23 errors, score: 92)
- [ ] `src\lib\machines\workflow-machine.ts` (91 errors, score: 91)
- [ ] `src\lib\components\CitationLink.svelte` (18 errors, score: 90)
- [ ] `src\lib\components\error-analysis\KnowledgeGraph.svelte` (18 errors, score: 90)

### P2 (Medium - Impact < 50)
- 1318 files remaining

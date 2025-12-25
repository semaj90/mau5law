# Phase 79: Error Leaderboard (run-07)

**Generated:** 2025-12-25T20:43:35.857Z
**Total Errors:** 14488
**Affected Files:** 629
**Top N:** 1000

---

## 📊 By Architecture Component

- **other**: 11334 errors
- **components**: 2125 errors
- **database**: 450 errors
- **auth**: 300 errors
- **utils**: 263 errors
- **stores**: 13 errors
- **quic-protocol**: 3 errors

## 🔍 By Error Pattern

- **unknown**: 14334 occurrences
- **duplicate-identifier**: 152 occurrences
- **env-type-declarations**: 2 occurrences

## 🎯 Top 629 Files by Impact Score

| Rank | File | Errors | Category | Weight | Impact | Fix Priority |
|------|------|--------|----------|--------|--------|--------------|
| 1 | `src\lib\machines\auth-machine.v5.ts` | 132 | auth | 9 | 1188 | **P0** |
| 2 | `src\lib\db\chat-schema.ts` | 113 | database | 9 | 1017 | **P0** |
| 3 | `src\lib\db\schema-example-legal.ts` | 57 | database | 9 | 891 | **P0** |
| 4 | `src\lib\components\ui\layout\index.ts` | 84 | components | 5 | 700 | **P0** |
| 5 | `src\lib\forms\contextual-chat-schema.ts` | 75 | database | 9 | 675 | **P0** |
| 6 | `src\lib\components\ui\context-menu\index.ts` | 125 | components | 5 | 625 | **P0** |
| 7 | `src\lib\messaging\rabbitmq-xstate-integration.ts` | 548 | other | 1 | 562 | **P0** |
| 8 | `src\lib\components\ui\enhanced-bits.ts` | 40 | components | 5 | 550 | **P0** |
| 9 | `src\lib\mcp-context72-get-library-docs.ts` | 440 | other | 1 | 510 | **P0** |
| 10 | `src\lib\components\POIPhotoModal.svelte` | 101 | components | 5 | 505 | **P0** |
| 11 | `src\lib\utils\simd-json-cache.ts` | 92 | utils | 4 | 484 | **P0** |
| 12 | `src\lib\components\ui\gaming\core\GamingEvolutionManager.ts` | 93 | components | 5 | 465 | **P0** |
| 13 | `src\lib\server\auth.ts` | 47 | auth | 9 | 423 | **P0** |
| 14 | `src\lib\ocr\ocr-client.ts` | 415 | other | 1 | 415 | **P0** |
| 15 | `src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts` | 81 | components | 5 | 405 | **P0** |
| 16 | `src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts` | 79 | components | 5 | 395 | **P0** |
| 17 | `src\lib\components\ui\enhanced\Button.stories.ts` | 64 | components | 5 | 320 | **P0** |
| 18 | `src\lib\server\auth-guard.ts` | 35 | auth | 9 | 315 | **P0** |
| 19 | `src\lib\database\migrations\migration-system.ts` | 314 | other | 1 | 314 | **P0** |
| 20 | `src\lib\server\db\schema\error_clusters.ts` | 6 | database | 9 | 306 | **P0** |
| 21 | `src\lib\utils\buffer-conversion.ts` | 75 | utils | 4 | 300 | **P0** |
| 22 | `src\lib\server\db-insert-helpers.ts` | 33 | database | 9 | 297 | **P0** |
| 23 | `src\lib\components\three\yorha-ui\api\YoRHaAPIClient.ts` | 59 | components | 5 | 295 | **P0** |
| 24 | `src\lib\metrics\gpuSummaryClient.ts` | 281 | other | 1 | 295 | **P0** |
| 25 | `src\lib\db\drizzle-usage-examples.ts` | 32 | database | 9 | 288 | **P0** |
| 26 | `src\lib\components\three\yorha-ui\webgpu\YoRHaMipmapShaders.ts` | 56 | components | 5 | 280 | **P0** |
| 27 | `src\lib\components\three\yorha-ui\components\YoRHaButton3D.ts` | 54 | components | 5 | 270 | **P0** |
| 28 | `src\lib\machines\auth-machine.ts` | 30 | auth | 9 | 270 | **P0** |
| 29 | `src\lib\components\ai\FileUploadGemma3.stories.ts` | 49 | components | 5 | 245 | **P0** |
| 30 | `src\lib\components\ui\bits\custom-design-integration.ts` | 49 | components | 5 | 245 | **P0** |
| 31 | `src\lib\components\ui\wrappers\bits\index.ts` | 20 | components | 5 | 240 | **P0** |
| 32 | `src\lib\server\pgvector-cache.ts` | 139 | other | 1 | 237 | **P0** |
| 33 | `src\lib\components\types.ts` | 47 | components | 5 | 235 | **P0** |
| 34 | `src\lib\utils\webgpu-buffer-uploader.ts` | 58 | utils | 4 | 232 | **P0** |
| 35 | `src\lib\components\canvas\index.ts` | 18 | components | 5 | 230 | **P0** |
| 36 | `src\lib\components\legal\index.ts` | 17 | components | 5 | 225 | **P0** |
| 37 | `src\lib\server\schema.ts` | 25 | database | 9 | 225 | **P0** |
| 38 | `src\lib\middleware\binary-encoding.ts` | 218 | other | 1 | 218 | **P0** |
| 39 | `src\lib\components\three\yorha-ui\components\YoRHaInput3D.ts` | 43 | components | 5 | 215 | **P0** |
| 40 | `src\lib\3d\memory-palace-engine.ts` | 211 | other | 1 | 211 | **P0** |
| 41 | `src\lib\components\ui\bits\component-loader.ts` | 41 | components | 5 | 205 | **P0** |
| 42 | `src\lib\server\ai\agentic-stream.ts` | 196 | other | 1 | 196 | **P0** |
| 43 | `src\lib\server\authUtils.ts` | 21 | auth | 9 | 189 | **P0** |
| 44 | `src\lib\hooks\useRedisOrchestrator.ts` | 152 | other | 1 | 187 | **P0** |
| 45 | `src\lib\components\ui\bits\index.optimized.ts` | 37 | components | 5 | 185 | **P0** |
| 46 | `src\lib\server\ai\som-bitmap-visualizer.ts` | 163 | other | 1 | 184 | **P0** |
| 47 | `src\lib\components\three\yorha-ui\YoRHaLayout3D.ts` | 36 | components | 5 | 180 | **P0** |
| 48 | `src\lib\components\three\yorha-ui\components\YoRHaModal3D.ts` | 36 | components | 5 | 180 | **P0** |
| 49 | `src\lib\components\ui\alert\index.ts` | 15 | components | 5 | 180 | **P0** |
| 50 | `src\lib\components\ui\gaming\constants\gaming-constants.ts` | 36 | components | 5 | 180 | **P0** |
| 51 | `src\lib\components\ui\modern\index.ts` | 14 | components | 5 | 175 | **P0** |
| 52 | `src\lib\server\ai\embeddings-enhanced.ts` | 133 | other | 1 | 175 | **P0** |
| 53 | `src\lib\machines\graph-cache-machine.ts` | 173 | other | 1 | 173 | **P0** |
| 54 | `src\lib\components\ui\enhanced-bits\index.ts` | 5 | components | 5 | 165 | **P0** |
| 55 | `src\lib\workers\legal-ai-worker-pool.ts` | 120 | other | 1 | 162 | **P0** |
| 56 | `src\lib\components\three\yorha-ui\webgpu\YoRHaOptimizedTextureManager.ts` | 32 | components | 5 | 160 | **P0** |
| 57 | `src\lib\machines\predictive-typing-machine.ts` | 151 | other | 1 | 151 | **P0** |
| 58 | `src\lib\server\db\queries.ts` | 16 | database | 9 | 144 | **P0** |
| 59 | `src\lib\machines\agentShellMachine.ts` | 144 | other | 1 | 144 | **P0** |
| 60 | `src\lib\components\three\yorha-ui\webgpu\YoRHaWebGPUMath.ts` | 28 | components | 5 | 140 | **P0** |
| 61 | `src\lib\index.ts` | 135 | other | 1 | 135 | **P0** |
| 62 | `src\lib\machines\vector-pipeline-machine.ts` | 132 | other | 1 | 132 | **P0** |
| 63 | `src\lib\server\ai\contextual-gpu-chain.ts` | 126 | other | 1 | 126 | **P0** |
| 64 | `src\lib\components\evidence\EvidenceAssistant.svelte` | 25 | components | 5 | 125 | **P0** |
| 65 | `src\lib\components\realtime\index.ts` | 11 | components | 5 | 125 | **P0** |
| 66 | `src\lib\forms\superforms-xstate-integration.ts` | 124 | other | 1 | 124 | **P0** |
| 67 | `src\lib\types\qlora-protobuf.ts` | 121 | other | 1 | 121 | **P0** |
| 68 | `src\lib\components\evidence\VictimStatementWizard.svelte` | 24 | components | 5 | 120 | **P0** |
| 69 | `src\lib\components\poi\PersonOfInterestDetailView.svelte` | 24 | components | 5 | 120 | **P0** |
| 70 | `src\lib\components\unified\index.ts` | 10 | components | 5 | 120 | **P0** |
| 71 | `src\lib\server\utils\server-cache.ts` | 32 | other | 1 | 116 | **P0** |
| 72 | `src\lib\optimization\index.ts` | 116 | other | 1 | 116 | **P0** |
| 73 | `src\lib\components\ai\legal\ComprehensiveLegalAI.svelte` | 23 | components | 5 | 115 | **P0** |
| 74 | `src\lib\config\gemma3-config.ts` | 115 | other | 1 | 115 | **P0** |
| 75 | `src\lib\server\webgpu-redis-optimizer.ts` | 115 | other | 1 | 115 | **P0** |
| 76 | `src\lib\routing\route-guards.ts` | 100 | other | 1 | 114 | **P0** |
| 77 | `src\lib\machines\index.ts` | 112 | other | 1 | 112 | **P0** |
| 78 | `src\lib\components\three\yorha-ui\theme\yorha-theme-adapter.ts` | 22 | components | 5 | 110 | **P0** |
| 79 | `src\lib\server\ai\legalbert-middleware.ts` | 110 | other | 1 | 110 | **P0** |
| 80 | `src\lib\machines\ingestion-workflow-machine.ts` | 109 | other | 1 | 109 | **P0** |
| 81 | `src\lib\utils\webgpu-array-utils.ts` | 27 | utils | 4 | 108 | **P0** |
| 82 | `src\lib\schemas\vector.ts` | 12 | database | 9 | 108 | **P0** |
| 83 | `src\lib\components\ui\Button.stories.ts` | 21 | components | 5 | 105 | **P0** |
| 84 | `src\lib\optimization\neural-memory-manager.ts` | 74 | other | 1 | 102 | **P0** |
| 85 | `src\lib\components\upload\upload-core.ts` | 20 | components | 5 | 100 | **P1** |
| 86 | `src\lib\webgpu\shader-cache-manager.ts` | 97 | other | 1 | 97 | **P1** |
| 87 | `src\lib\simd\simd-json-worker-client.ts` | 97 | other | 1 | 97 | **P1** |
| 88 | `src\lib\server\database-api-bridge.ts` | 95 | other | 1 | 95 | **P1** |
| 89 | `src\lib\services\glyph-diffusion-service.ts` | 91 | other | 1 | 91 | **P1** |
| 90 | `src\lib\server\services\vectorDBService.ts` | 49 | other | 1 | 91 | **P1** |
| 91 | `src\lib\components\integration\LegalAIOrchestrationDemo.svelte` | 18 | components | 5 | 90 | **P1** |
| 92 | `src\lib\components\ui\EvidenceCanvas.svelte` | 18 | components | 5 | 90 | **P1** |
| 93 | `src\lib\server\ai\ai-service-orchestrator.ts` | 87 | other | 1 | 87 | **P1** |
| 94 | `src\lib\server\ai\caching-layer.ts` | 83 | other | 1 | 83 | **P1** |
| 95 | `src\lib\server\concurrent-json-serializer.ts` | 82 | other | 1 | 82 | **P1** |
| 96 | `src\lib\modules\auth-demo.ts` | 9 | auth | 9 | 81 | **P1** |
| 97 | `src\lib\server\authPolicy.ts` | 9 | auth | 9 | 81 | **P1** |
| 98 | `src\lib\server\ai\cluster-stream.ts` | 81 | other | 1 | 81 | **P1** |
| 99 | `src\lib\optimization\optimization-test-suite.ts` | 80 | other | 1 | 80 | **P1** |
| 100 | `src\lib\server\redisPubSub.ts` | 80 | other | 1 | 80 | **P1** |
| 101 | `src\lib\stores\app-store.ts` | 13 | stores | 6 | 78 | **P1** |
| 102 | `src\lib\machines\workflow-machine.ts` | 78 | other | 1 | 78 | **P1** |
| 103 | `src\lib\server\embedding-cache-middleware.ts` | 62 | other | 1 | 76 | **P1** |
| 104 | `src\lib\components\three\yorha-ui\components\YoRHaQuantumEffects3D.ts` | 15 | components | 5 | 75 | **P1** |
| 105 | `src\lib\components\ui\bits\types.ts` | 15 | components | 5 | 75 | **P1** |
| 106 | `src\lib\components\ui\gaming\effects\gradient-utils.ts` | 15 | components | 5 | 75 | **P1** |
| 107 | `src\lib\components\yorha\YoRHaCommandCenter.stories.ts` | 15 | components | 5 | 75 | **P1** |
| 108 | `src\lib\server\ai\agentic.ts` | 74 | other | 1 | 74 | **P1** |
| 109 | `src\lib\server\helpers\docker-discovery.ts` | 66 | other | 1 | 73 | **P1** |
| 110 | `src\lib\server\z-schemas.ts` | 8 | database | 9 | 72 | **P1** |
| 111 | `src\lib\schemas\file-upload.ts` | 8 | database | 9 | 72 | **P1** |
| 112 | `src\lib\server\http-cache-headers.ts` | 72 | other | 1 | 72 | **P1** |
| 113 | `src\lib\demos\neural-intent-demo.ts` | 71 | other | 1 | 71 | **P1** |
| 114 | `src\lib\server\rabbitmq.ts` | 69 | other | 1 | 69 | **P1** |
| 115 | `src\lib\integrations\flashattention-multicore-bridge.ts` | 69 | other | 1 | 69 | **P1** |
| 116 | `src\lib\server\redis-cache.ts` | 69 | other | 1 | 69 | **P1** |
| 117 | `src\lib\server\cache\redis-cache.ts` | 68 | other | 1 | 68 | **P1** |
| 118 | `src\lib\machines\ai-computation-machine.ts` | 65 | other | 1 | 65 | **P1** |
| 119 | `src\lib\__tests__\unified-schema.ts` | 7 | database | 9 | 63 | **P1** |
| 120 | `src\lib\database\enhanced-schema.ts` | 7 | database | 9 | 63 | **P1** |
| 121 | `src\lib\cache\ssr-legal-api-cache.ts` | 47 | other | 1 | 61 | **P1** |
| 122 | `src\lib\server\vector-cache.ts` | 61 | other | 1 | 61 | **P1** |
| 123 | `src\lib\types\legal-types.ts` | 60 | other | 1 | 60 | **P1** |
| 124 | `src\lib\optimization\redis-som-cache.ts` | 60 | other | 1 | 60 | **P1** |
| 125 | `src\lib\server\ai\enhanced-orchestrator.ts` | 60 | other | 1 | 60 | **P1** |
| 126 | `src\lib\orchestration\optimized-rabbitmq-orchestrator.ts` | 59 | other | 1 | 59 | **P1** |
| 127 | `src\lib\server\rate-limiter.ts` | 58 | other | 1 | 58 | **P1** |
| 128 | `src\lib\config\environment.ts` | 56 | other | 1 | 57 | **P1** |
| 129 | `src\lib\adapters\webasm-ai-adapter.ts` | 55 | other | 1 | 55 | **P1** |
| 130 | `src\lib\components\LegalCaseManager.stories.ts` | 11 | components | 5 | 55 | **P1** |
| 131 | `src\lib\components\headless\texture-streaming.svelte.ts` | 11 | components | 5 | 55 | **P1** |
| 132 | `src\lib\components\ui\gaming\core\GamingEvolutionManager-minimal.ts` | 11 | components | 5 | 55 | **P1** |
| 133 | `src\lib\optimization\context7-mcp-integration.ts` | 55 | other | 1 | 55 | **P1** |
| 134 | `src\lib\server\database-pool-service.ts` | 55 | other | 1 | 55 | **P1** |
| 135 | `src\lib\db\schema-jsonb.ts` | 6 | database | 9 | 54 | **P1** |
| 136 | `src\lib\db\schema\aiHistory.ts` | 6 | database | 9 | 54 | **P1** |
| 137 | `src\lib\db\schema\gpuInferenceDemo.ts` | 6 | database | 9 | 54 | **P1** |
| 138 | `src\lib\server\schemas.ts` | 6 | database | 9 | 54 | **P1** |
| 139 | `src\lib\server\ai\config.ts` | 53 | other | 1 | 53 | **P1** |
| 140 | `src\lib\integrations\phase13-full-integration.ts` | 52 | other | 1 | 52 | **P1** |
| 141 | `src\lib\orchestration\autoencoder-context-switcher.ts` | 37 | other | 1 | 51 | **P1** |
| 142 | `src\lib\components\ui\orchestrated\index.ts` | 10 | components | 5 | 50 | **P2** |
| 143 | `src\lib\config\legal-priorities.ts` | 49 | other | 1 | 49 | **P2** |
| 144 | `src\lib\services\enhanced-caching-revolutionary-bridge.ts` | 21 | other | 1 | 49 | **P2** |
| 145 | `src\lib\evidence\simd-gpu-tiling-engine.ts` | 48 | other | 1 | 48 | **P2** |
| 146 | `src\lib\services\unified-legal-orchestrator.ts` | 47 | other | 1 | 47 | **P2** |
| 147 | `src\lib\server\summarizeCache.ts` | 47 | other | 1 | 47 | **P2** |
| 148 | `src\lib\server\rabbitmq-service.ts` | 46 | other | 1 | 46 | **P2** |
| 149 | `src\lib\components\alerts\AlertsPanel.svelte` | 9 | components | 5 | 45 | **P2** |
| 150 | `src\lib\components\ui\index.ts` | 9 | components | 5 | 45 | **P2** |
| 151 | `src\lib\components\three\yorha-ui\YoRHaUIExample.ts` | 9 | components | 5 | 45 | **P2** |
| 152 | `src\lib\components\yorha\DetectiveEvidenceMap.svelte` | 9 | components | 5 | 45 | **P2** |
| 153 | `src\lib\components\yorha\dashboard\GPUMetrics.svelte` | 9 | components | 5 | 45 | **P2** |
| 154 | `src\lib\server\db\drizzle.ts` | 5 | database | 9 | 45 | **P2** |
| 155 | `src\lib\server\audit-logger.ts` | 45 | other | 1 | 45 | **P2** |
| 156 | `src\lib\search\fuse-rag-search.ts` | 44 | other | 1 | 44 | **P2** |
| 157 | `src\lib\services\cache-layer-manager.ts` | 43 | other | 1 | 43 | **P2** |
| 158 | `src\lib\machines\enhanced-legal-upload-analytics-machine.ts` | 43 | other | 1 | 43 | **P2** |
| 159 | `src\lib\messaging\rabbitmq-legal-queue.ts` | 42 | other | 1 | 42 | **P2** |
| 160 | `src\lib\machines\agentShellMachine.mcp.ts` | 41 | other | 1 | 41 | **P2** |
| 161 | `src\lib\routing\route-registry.ts` | 41 | other | 1 | 41 | **P2** |
| 162 | `src\lib\server\redisRateLimit.ts` | 41 | other | 1 | 41 | **P2** |
| 163 | `src\lib\components\WebGPUSimilarityDemo.svelte` | 8 | components | 5 | 40 | **P2** |
| 164 | `src\lib\components\citations\CitationList.svelte` | 8 | components | 5 | 40 | **P2** |
| 165 | `src\lib\components\poi\POIFaceMatchDialog.svelte` | 8 | components | 5 | 40 | **P2** |
| 166 | `src\lib\components\search\utils.ts` | 8 | components | 5 | 40 | **P2** |
| 167 | `src\lib\components\three\yorha-ui\components\YoRHaPanel3D.ts` | 8 | components | 5 | 40 | **P2** |
| 168 | `src\lib\components\ui\enhanced\Card.stories.ts` | 8 | components | 5 | 40 | **P2** |
| 169 | `src\lib\server\ai\monitoring-service.ts` | 40 | other | 1 | 40 | **P2** |
| 170 | `src\lib\services\neo4jGraphService.ts` | 39 | other | 1 | 39 | **P2** |
| 171 | `src\lib\server\wsBroker.ts` | 39 | other | 1 | 39 | **P2** |
| 172 | `src\lib\server\ai\cluster-service.ts` | 39 | other | 1 | 39 | **P2** |
| 173 | `src\lib\db\dexie-integration.ts` | 38 | other | 1 | 38 | **P2** |
| 174 | `src\lib\integrations\full-stack-workflow.ts` | 23 | other | 1 | 37 | **P2** |
| 175 | `src\lib\services\case-memory-engine.ts` | 37 | other | 1 | 37 | **P2** |
| 176 | `src\lib\database\drizzle-compatibility-fix.ts` | 4 | database | 9 | 36 | **P2** |
| 177 | `src\lib\database\schema.ts` | 4 | database | 9 | 36 | **P2** |
| 178 | `src\lib\server\auth-simple.ts` | 4 | auth | 9 | 36 | **P2** |
| 179 | `src\lib\components\AIChat.stories.ts` | 7 | components | 5 | 35 | **P2** |
| 180 | `src\lib\components\PersonList.svelte` | 7 | components | 5 | 35 | **P2** |
| 181 | `src\lib\components\PersonStatsPanel.svelte` | 7 | components | 5 | 35 | **P2** |
| 182 | `src\lib\components\SearchPanel.svelte` | 7 | components | 5 | 35 | **P2** |
| 183 | `src\lib\components\ai\AutomatedLegalResearch.svelte` | 7 | components | 5 | 35 | **P2** |
| 184 | `src\lib\components\citations\CitationSaveForm.svelte` | 7 | components | 5 | 35 | **P2** |
| 185 | `src\lib\components\ui\IconContainerDemo.svelte` | 7 | components | 5 | 35 | **P2** |
| 186 | `src\lib\components\ui\gaming\n64\index.ts` | 7 | components | 5 | 35 | **P2** |
| 187 | `src\lib\components\ui\table\index.ts` | 7 | components | 5 | 35 | **P2** |
| 188 | `src\lib\orchestration\qlora-ollama-orchestrator.ts` | 35 | other | 1 | 35 | **P2** |
| 189 | `src\lib\machines\canvasSystem.ts` | 34 | other | 1 | 34 | **P2** |
| 190 | `src\lib\services\predictive-asset-engine.ts` | 34 | other | 1 | 34 | **P2** |
| 191 | `src\lib\server\ai\tensorrt-embeddings.ts` | 34 | other | 1 | 34 | **P2** |
| 192 | `src\lib\detective-mode\comprehensive-integration.svelte.ts` | 33 | other | 1 | 33 | **P2** |
| 193 | `src\lib\server\ai\feedback-loop.ts` | 33 | other | 1 | 33 | **P2** |
| 194 | `src\lib\machines\recommendation-routing-machine.ts` | 32 | other | 1 | 32 | **P2** |
| 195 | `src\lib\memory\nes-memory-architecture.ts` | 11 | other | 1 | 32 | **P2** |
| 196 | `src\lib\services\gemma-embeddings-service.ts` | 31 | other | 1 | 31 | **P2** |
| 197 | `src\lib\services\rag-ingestion-pipeline.ts` | 31 | other | 1 | 31 | **P2** |
| 198 | `src\lib\components\ChatContextPanel.svelte` | 6 | components | 5 | 30 | **P2** |
| 199 | `src\lib\components\ChatPanel.svelte` | 6 | components | 5 | 30 | **P2** |
| 200 | `src\lib\components\poi\POIThreatBadge.svelte` | 6 | components | 5 | 30 | **P2** |
| 201 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D.ts` | 6 | components | 5 | 30 | **P2** |
| 202 | `src\lib\components\three\yorha-ui\NESYoRHaHybrid3D_FIXED.ts` | 6 | components | 5 | 30 | **P2** |
| 203 | `src\lib\components\ui\gaming\types\gaming-types.ts` | 6 | components | 5 | 30 | **P2** |
| 204 | `src\lib\services\revolutionary-ai-integration.ts` | 16 | other | 1 | 30 | **P2** |
| 205 | `src\lib\observability\client-timing.ts` | 16 | other | 1 | 30 | **P2** |
| 206 | `src\lib\server\init.ts` | 30 | other | 1 | 30 | **P2** |
| 207 | `src\lib\server\ai\hmm-transition-predictor.ts` | 30 | other | 1 | 30 | **P2** |
| 208 | `src\lib\server\ai\gemma-config.ts` | 30 | other | 1 | 30 | **P2** |
| 209 | `src\lib\server\evidence-processing.ts` | 29 | other | 1 | 29 | **P2** |
| 210 | `src\lib\config\env.ts` | 28 | other | 1 | 28 | **P2** |
| 211 | `src\lib\machines\ai-processing-machine.ts` | 28 | other | 1 | 28 | **P2** |
| 212 | `src\lib\machines\prefetchMachine.ts` | 28 | other | 1 | 28 | **P2** |
| 213 | `src\lib\optimization\copilot-index-optimizer.ts` | 28 | other | 1 | 28 | **P2** |
| 214 | `src\lib\auth\auth-store.svelte.ts` | 3 | auth | 9 | 27 | **P2** |
| 215 | `src\lib\db\schema\rag-integration.ts` | 3 | database | 9 | 27 | **P2** |
| 216 | `src\lib\logic\POI.ts` | 27 | other | 1 | 27 | **P2** |
| 217 | `src\lib\machines\legal-case-machine-factory.ts` | 27 | other | 1 | 27 | **P2** |
| 218 | `src\lib\services\ollamaService.ts` | 12 | other | 1 | 26 | **P2** |
| 219 | `src\lib\machines\legalAIMachine.ts` | 26 | other | 1 | 26 | **P2** |
| 220 | `src\lib\caching\multi-dimensional-image-cache.ts` | 25 | other | 1 | 25 | **P2** |
| 221 | `src\lib\components\Phase72ErrorBrain.svelte` | 5 | components | 5 | 25 | **P2** |
| 222 | `src\lib\components\SlideTabs.svelte` | 5 | components | 5 | 25 | **P2** |
| 223 | `src\lib\components\error-brain\PatchCard.svelte` | 5 | components | 5 | 25 | **P2** |
| 224 | `src\lib\machines\legalAIMachine.v5.ts` | 25 | other | 1 | 25 | **P2** |
| 225 | `src\lib\components\ui\tabs-bits\index.ts` | 5 | components | 5 | 25 | **P2** |
| 226 | `src\lib\components\yorha\PhoenixProsecutorDashboard.svelte` | 5 | components | 5 | 25 | **P2** |
| 227 | `src\lib\memory\visual-memory-palace-integration.ts` | 25 | other | 1 | 25 | **P2** |
| 228 | `src\lib\services\unified-vector-orchestrator.ts` | 25 | other | 1 | 25 | **P2** |
| 229 | `src\lib\orchestration\master-cognitive-hub.ts` | 25 | other | 1 | 25 | **P2** |
| 230 | `src\lib\server\ragStreamRegistry.ts` | 25 | other | 1 | 25 | **P2** |
| 231 | `src\lib\config\rabbitmq-config.ts` | 24 | other | 1 | 24 | **P2** |
| 232 | `src\lib\caching\reinforcement-learning-cache.ts` | 23 | other | 1 | 23 | **P2** |
| 233 | `src\lib\db\persons.ts` | 23 | other | 1 | 23 | **P2** |
| 234 | `src\lib\optimization\simd-json-index-processor.ts` | 23 | other | 1 | 23 | **P2** |
| 235 | `src\lib\server\adapters\service-integrations.ts` | 23 | other | 1 | 23 | **P2** |
| 236 | `src\lib\server\database-orchestrator.ts` | 22 | other | 1 | 22 | **P2** |
| 237 | `src\lib\server\lokiHybridStore.ts` | 22 | other | 1 | 22 | **P2** |
| 238 | `src\lib\server\ai\enhanced-ai-synthesis-orchestrator.ts` | 22 | other | 1 | 22 | **P2** |
| 239 | `src\lib\machines\document-upload-machine.ts` | 21 | other | 1 | 21 | **P2** |
| 240 | `src\lib\cache\nes-cache-orchestrator.ts` | 20 | other | 1 | 20 | **P2** |
| 241 | `src\lib\components\ClientGemmaDemo.svelte` | 4 | components | 5 | 20 | **P2** |
| 242 | `src\lib\components\MigrationTest.svelte` | 4 | components | 5 | 20 | **P2** |
| 243 | `src\lib\components\ui\tabs\index.ts` | 4 | components | 5 | 20 | **P2** |
| 244 | `src\lib\components\editor\index.ts` | 4 | components | 5 | 20 | **P2** |
| 245 | `src\lib\components\error-analysis\KnowledgeGraph.svelte` | 4 | components | 5 | 20 | **P2** |
| 246 | `src\lib\components\evidence\EvidenceUploadModal.svelte` | 4 | components | 5 | 20 | **P2** |
| 247 | `src\lib\components\evidence-graph\GraphToolbar.svelte` | 4 | components | 5 | 20 | **P2** |
| 248 | `src\lib\components\poi\POIPhotoGrid.svelte` | 4 | components | 5 | 20 | **P2** |
| 249 | `src\lib\components\poi\POIStats.svelte` | 4 | components | 5 | 20 | **P2** |
| 250 | `src\lib\components\three\yorha-ui\index.ts` | 4 | components | 5 | 20 | **P2** |
| 251 | `src\lib\components\ui\button-variants.ts` | 4 | components | 5 | 20 | **P2** |
| 252 | `src\lib\components\ui\bits\index.enhanced.ts` | 4 | components | 5 | 20 | **P2** |
| 253 | `src\lib\components\ui\enhanced\button-variants.ts` | 4 | components | 5 | 20 | **P2** |
| 254 | `src\lib\components\yorha\ContradictionReveal.svelte` | 4 | components | 5 | 20 | **P2** |
| 255 | `src\lib\components\yorha\DetectiveModeDashboard.svelte` | 4 | components | 5 | 20 | **P2** |
| 256 | `src\lib\config\unified-config.ts` | 20 | other | 1 | 20 | **P2** |
| 257 | `src\lib\utils\typed-array-quantization.ts` | 5 | utils | 4 | 20 | **P2** |
| 258 | `src\lib\machines\aiAssistantMachine.minimal.ts` | 20 | other | 1 | 20 | **P2** |
| 259 | `src\lib\orchestration\index.ts` | 20 | other | 1 | 20 | **P2** |
| 260 | `src\lib\wasm\llvm-wasm-bridge.ts` | 20 | other | 1 | 20 | **P2** |
| 261 | `src\lib\cache\chr-rom-pattern-cache.ts` | 19 | other | 1 | 19 | **P2** |
| 262 | `src\lib\client\db\loki-client.ts` | 19 | other | 1 | 19 | **P2** |
| 263 | `src\lib\config\endpoints.ts` | 19 | other | 1 | 19 | **P2** |
| 264 | `src\lib\config\local-llm.ts` | 19 | other | 1 | 19 | **P2** |
| 265 | `src\lib\moogle\stage6-production-orchestrator.ts` | 19 | other | 1 | 19 | **P2** |
| 266 | `src\lib\performance\optimizations.ts` | 19 | other | 1 | 19 | **P2** |
| 267 | `src\lib\server\fetch-wrapper.ts` | 19 | other | 1 | 19 | **P2** |
| 268 | `src\lib\server\ai\graph-rag-orchestrator.ts` | 19 | other | 1 | 19 | **P2** |
| 269 | `src\lib\types\api-schemas.ts` | 2 | database | 9 | 18 | **P2** |
| 270 | `src\lib\auth\session.ts` | 2 | auth | 9 | 18 | **P2** |
| 271 | `src\lib\components\auth\index.ts` | 2 | auth | 9 | 18 | **P2** |
| 272 | `src\lib\db\enhanced-ai-schema.ts` | 2 | database | 9 | 18 | **P2** |
| 273 | `src\lib\machines\aiAssistantMachine.stories.ts` | 18 | other | 1 | 18 | **P2** |
| 274 | `src\lib\machines\legalCaseMachine.ts` | 18 | other | 1 | 18 | **P2** |
| 275 | `src\lib\machines\search-machine.ts` | 18 | other | 1 | 18 | **P2** |
| 276 | `src\lib\metrics\gpuMetricsBatcher.ts` | 18 | other | 1 | 18 | **P2** |
| 277 | `src\lib\parsers\simd-json-parser.ts` | 18 | other | 1 | 18 | **P2** |
| 278 | `src\lib\schemas\upload.ts` | 2 | database | 9 | 18 | **P2** |
| 279 | `src\lib\server\auth-helpers.ts` | 2 | auth | 9 | 18 | **P2** |
| 280 | `src\lib\server\auth-utils.ts` | 2 | auth | 9 | 18 | **P2** |
| 281 | `src\lib\server\db-shim.ts` | 2 | database | 9 | 18 | **P2** |
| 282 | `src\lib\server\production-logger.ts` | 18 | other | 1 | 18 | **P2** |
| 283 | `src\lib\server\ai\ai-provider-router.ts` | 18 | other | 1 | 18 | **P2** |
| 284 | `src\lib\cache\parallel-cache-orchestrator.ts` | 17 | other | 1 | 17 | **P2** |
| 285 | `src\lib\integrations\revolutionary-multicore-bridge.ts` | 17 | other | 1 | 17 | **P2** |
| 286 | `src\lib\server\webSocketServer.ts` | 17 | other | 1 | 17 | **P2** |
| 287 | `src\lib\server\ai\embeddings-simple.ts` | 17 | other | 1 | 17 | **P2** |
| 288 | `src\lib\ast\ast-processor.ts` | 16 | other | 1 | 16 | **P2** |
| 289 | `src\lib\types\database.ts` | 16 | other | 1 | 16 | **P2** |
| 290 | `src\lib\server\webgpu-langchain-bridge.ts` | 16 | other | 1 | 16 | **P2** |
| 291 | `src\lib\components\CaseOutcomePrediction.svelte` | 3 | components | 5 | 15 | **P2** |
| 292 | `src\lib\components\DocumentUploadMachineIntegration.svelte` | 3 | components | 5 | 15 | **P2** |
| 293 | `src\lib\components\FilterPanel.svelte` | 3 | components | 5 | 15 | **P2** |
| 294 | `src\lib\components\ai\ContextualEvidenceChatModal.svelte` | 3 | components | 5 | 15 | **P2** |
| 295 | `src\lib\components\case\SummaryEditor.svelte` | 3 | components | 5 | 15 | **P2** |
| 296 | `src\lib\components\detective\index.ts` | 3 | components | 5 | 15 | **P2** |
| 297 | `src\lib\components\error-brain\ErrorBrainModal.svelte` | 3 | components | 5 | 15 | **P2** |
| 298 | `src\lib\components\evidence\UploadProgressCard.svelte` | 3 | components | 5 | 15 | **P2** |
| 299 | `src\lib\components\ui\input\InputBits.svelte` | 3 | components | 5 | 15 | **P2** |
| 300 | `src\lib\components\evidence-graph\GraphSearchBox.svelte` | 3 | components | 5 | 15 | **P2** |
| 301 | `src\lib\components\headless\evidence-canvas.svelte.ts` | 3 | components | 5 | 15 | **P2** |
| 302 | `src\lib\components\legal-ai\LawsSearchPage.svelte` | 3 | components | 5 | 15 | **P2** |
| 303 | `src\lib\components\ui\AutoPopulatedCaseForm.svelte` | 3 | components | 5 | 15 | **P2** |
| 304 | `src\lib\components\poi\POIEditor.svelte` | 3 | components | 5 | 15 | **P2** |
| 305 | `src\lib\components\poi\POIQuickActions.svelte` | 3 | quic-protocol | 5 | 15 | **P2** |
| 306 | `src\lib\components\subcomponents\index.ts` | 3 | components | 5 | 15 | **P2** |
| 307 | `src\lib\components\ui\checkbox\index.ts` | 3 | components | 5 | 15 | **P2** |
| 308 | `src\lib\components\ui\command\index.ts` | 3 | components | 5 | 15 | **P2** |
| 309 | `src\lib\components\ui\dialog\types.ts` | 3 | components | 5 | 15 | **P2** |
| 310 | `src\lib\components\ui\scroll-area\index.ts` | 3 | components | 5 | 15 | **P2** |
| 311 | `src\lib\components\ui\separator\index.ts` | 3 | components | 5 | 15 | **P2** |
| 312 | `src\lib\components\yorha\index.ts` | 3 | components | 5 | 15 | **P2** |
| 313 | `src\lib\config\gemma3-legal-config.ts` | 15 | other | 1 | 15 | **P2** |
| 314 | `src\lib\middleware\tfjs-synthesizer.ts` | 15 | other | 1 | 15 | **P2** |
| 315 | `src\lib\server\ai\contextual-understanding-service.ts` | 15 | other | 1 | 15 | **P2** |
| 316 | `src\lib\evidence-canvas\graph-layout-gpu.ts` | 14 | other | 1 | 14 | **P2** |
| 317 | `src\lib\optimization\simd-json-parser.ts` | 14 | other | 1 | 14 | **P2** |
| 318 | `src\lib\server\knowledge-cache.ts` | 14 | other | 1 | 14 | **P2** |
| 319 | `src\lib\workers\rabbitmq-service-worker.ts` | 13 | other | 1 | 13 | **P2** |
| 320 | `src\lib\db\queries\nes-command-center-archive.ts` | 13 | other | 1 | 13 | **P2** |
| 321 | `src\lib\integrations\comprehensive-agent-orchestration.ts` | 13 | other | 1 | 13 | **P2** |
| 322 | `src\lib\machines\canvasEditorMachine.ts` | 13 | other | 1 | 13 | **P2** |
| 323 | `src\lib\services\cognitive-cache-integration.ts` | 13 | other | 1 | 13 | **P2** |
| 324 | `src\lib\server\tensor-acceleration.ts` | 13 | other | 1 | 13 | **P2** |
| 325 | `src\lib\server\ai\gemma-embedding-service.ts` | 13 | other | 1 | 13 | **P2** |
| 326 | `src\lib\server\ai\embeddings.ts` | 13 | other | 1 | 13 | **P2** |
| 327 | `src\lib\constants\local-llm-config.ts` | 12 | other | 1 | 12 | **P2** |
| 328 | `src\lib\db\client-db.ts` | 12 | other | 1 | 12 | **P2** |
| 329 | `src\lib\services\simd-redis-client.ts` | 12 | other | 1 | 12 | **P2** |
| 330 | `src\lib\logic\HistoryManager.ts` | 12 | other | 1 | 12 | **P2** |
| 331 | `src\lib\machines\ai-system-monitor.ts` | 12 | other | 1 | 12 | **P2** |
| 332 | `src\lib\machines\chatMachine.ts` | 12 | other | 1 | 12 | **P2** |
| 333 | `src\lib\types\case.ts` | 12 | other | 1 | 12 | **P2** |
| 334 | `src\lib\mcp\cases.mcp.ts` | 12 | other | 1 | 12 | **P2** |
| 335 | `src\lib\server\tensorrt-service.ts` | 12 | other | 1 | 12 | **P2** |
| 336 | `src\lib\client\ui\POIPhotoModal.svelte` | 11 | other | 1 | 11 | **P2** |
| 337 | `src\lib\composables\legal-data-runes.svelte.ts` | 11 | other | 1 | 11 | **P2** |
| 338 | `src\lib\integrations\full-system-orchestrator.ts` | 11 | other | 1 | 11 | **P2** |
| 339 | `src\lib\machines\aiAssistantMachine.ts` | 11 | other | 1 | 11 | **P2** |
| 340 | `src\lib\machines\ssr-qlora-chat-machine.ts` | 11 | other | 1 | 11 | **P2** |
| 341 | `src\lib\optimization\enhanced-vscode-extension-manager.ts` | 11 | other | 1 | 11 | **P2** |
| 342 | `src\lib\services\qlora-rl-langextract-integration.ts` | 11 | other | 1 | 11 | **P2** |
| 343 | `src\lib\rag\query-helpers.ts` | 11 | other | 1 | 11 | **P2** |
| 344 | `src\lib\routing\multidimensional-routing-matrix.server.ts` | 11 | other | 1 | 11 | **P2** |
| 345 | `src\lib\server\helpers\service-discovery.ts` | 11 | other | 1 | 11 | **P2** |
| 346 | `src\lib\services\search-service.ts` | 10 | other | 1 | 10 | **P2** |
| 347 | `src\lib\cache\parallel-cache-orchestrator-corrupted.ts` | 10 | other | 1 | 10 | **P2** |
| 348 | `src\lib\components\AIAssistant.svelte.ts` | 2 | components | 5 | 10 | **P2** |
| 349 | `src\lib\components\ComprehensiveUploadAnalytics.svelte` | 2 | components | 5 | 10 | **P2** |
| 350 | `src\lib\components\ErrorStreamMonitor.svelte` | 2 | components | 5 | 10 | **P2** |
| 351 | `src\lib\components\EvidenceConnections.svelte` | 2 | components | 5 | 10 | **P2** |
| 352 | `src\lib\components\Navigation.svelte` | 2 | components | 5 | 10 | **P2** |
| 353 | `src\lib\components\NesModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 354 | `src\lib\components\RAGSearchComponent.svelte` | 2 | components | 5 | 10 | **P2** |
| 355 | `src\lib\components\ReportEditor.svelte` | 2 | components | 5 | 10 | **P2** |
| 356 | `src\lib\components\SearchBox.svelte` | 2 | components | 5 | 10 | **P2** |
| 357 | `src\lib\components\SmartEvidenceRecommendations.svelte` | 2 | components | 5 | 10 | **P2** |
| 358 | `src\lib\webgpu\webgpu-similarity-engine.ts` | 10 | other | 1 | 10 | **P2** |
| 359 | `src\lib\components\ai\PatternRecognition.svelte` | 2 | components | 5 | 10 | **P2** |
| 360 | `src\lib\components\ai\cognitive\CognitiveDocumentationHub.svelte` | 2 | components | 5 | 10 | **P2** |
| 361 | `src\lib\components\canvas\FabricCanvas.svelte` | 2 | components | 5 | 10 | **P2** |
| 362 | `src\lib\components\case\VerificationDisclaimer.svelte` | 2 | components | 5 | 10 | **P2** |
| 363 | `src\lib\components\charges\CaseTimeline.svelte` | 2 | components | 5 | 10 | **P2** |
| 364 | `src\lib\components\dashboard\DocumentThumbnailTray.svelte` | 2 | components | 5 | 10 | **P2** |
| 365 | `src\lib\components\evidence-editor\AIAssistantPanel.svelte` | 2 | components | 5 | 10 | **P2** |
| 366 | `src\lib\components\evidence-graph\GraphView.svelte` | 2 | components | 5 | 10 | **P2** |
| 367 | `src\lib\components\keyboard\KeyboardShortcuts.svelte` | 2 | components | 5 | 10 | **P2** |
| 368 | `src\lib\components\laws\LawSearchPanel.svelte` | 2 | components | 5 | 10 | **P2** |
| 369 | `src\lib\components\legal-ai\AttachToCaseModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 370 | `src\lib\components\legal-ai\CitationLibraryPage.svelte` | 2 | components | 5 | 10 | **P2** |
| 371 | `src\lib\components\legal-ai\CitationSaveModal.svelte` | 2 | components | 5 | 10 | **P2** |
| 372 | `src\lib\components\navigation\ConsolidatedNavigation.svelte` | 2 | components | 5 | 10 | **P2** |
| 373 | `src\lib\components\notes\LegalNotesManager.svelte` | 2 | components | 5 | 10 | **P2** |
| 374 | `src\lib\components\poi\POICard.svelte` | 2 | components | 5 | 10 | **P2** |
| 375 | `src\lib\components\ui\AIFileUpload.svelte` | 2 | components | 5 | 10 | **P2** |
| 376 | `src\lib\components\ui\MarkdownSceneViewer.svelte` | 2 | components | 5 | 10 | **P2** |
| 377 | `src\lib\components\three\yorha-ui\YoRHaAntiAliasing3D.ts` | 2 | components | 5 | 10 | **P2** |
| 378 | `src\lib\components\ui\gaming\constants\gaming-constants-minimal.ts` | 2 | components | 5 | 10 | **P2** |
| 379 | `src\lib\components\ui\select\types.ts` | 2 | components | 5 | 10 | **P2** |
| 380 | `src\lib\components\vector\VectorIntelligenceDemo.svelte` | 2 | components | 5 | 10 | **P2** |
| 381 | `src\lib\components\visualizations\WebGPUEvidenceGraphVisualization\index.ts` | 2 | components | 5 | 10 | **P2** |
| 382 | `src\lib\components\yorha\JudicialAnalysisAgent.svelte` | 2 | components | 5 | 10 | **P2** |
| 383 | `src\lib\components\yorha\TimelineReconstructionEngine.svelte` | 2 | components | 5 | 10 | **P2** |
| 384 | `src\lib\components\yorha\EvidenceBoard.svelte` | 2 | components | 5 | 10 | **P2** |
| 385 | `src\lib\config\redis-config.ts` | 10 | other | 1 | 10 | **P2** |
| 386 | `src\lib\server\cache\redis.ts` | 10 | other | 1 | 10 | **P2** |
| 387 | `src\lib\webgpu\texture-streaming.ts` | 10 | other | 1 | 10 | **P2** |
| 388 | `src\lib\evidence\detective-analysis-engine.ts` | 10 | other | 1 | 10 | **P2** |
| 389 | `src\lib\integrations\enhanced-rabbitmq-cuda-bridge.ts` | 10 | other | 1 | 10 | **P2** |
| 390 | `src\lib\webgpu\webgpu-rag-service.ts` | 10 | other | 1 | 10 | **P2** |
| 391 | `src\lib\routing\dynamic-navigation.ts` | 10 | other | 1 | 10 | **P2** |
| 392 | `src\lib\server\ai\pgvector-indexing-service.ts` | 10 | other | 1 | 10 | **P2** |
| 393 | `src\lib\server\db\schema-postgres.ts` | 1 | database | 9 | 9 | **P2** |
| 394 | `src\lib\auth\auth-store.ts` | 1 | auth | 9 | 9 | **P2** |
| 395 | `src\lib\components\auth\RegisterModal\index.ts` | 1 | auth | 9 | 9 | **P2** |
| 396 | `src\lib\server\db\schema\error_events.ts` | 1 | database | 9 | 9 | **P2** |
| 397 | `src\lib\db\schema\legacy.ts` | 1 | database | 9 | 9 | **P2** |
| 398 | `src\lib\integrations\rabbitmq-tensor-integration.ts` | 9 | other | 1 | 9 | **P2** |
| 399 | `src\lib\integrations\supercharged-legal-ai-server.ts` | 9 | other | 1 | 9 | **P2** |
| 400 | `src\lib\logic\Report.ts` | 9 | other | 1 | 9 | **P2** |
| 401 | `src\lib\machines\rag-machine.ts` | 9 | other | 1 | 9 | **P2** |
| 402 | `src\lib\server\minio-service.ts` | 9 | other | 1 | 9 | **P2** |
| 403 | `src\lib\server\neo4j-driver.ts` | 9 | other | 1 | 9 | **P2** |
| 404 | `src\lib\server\websocket.ts` | 9 | other | 1 | 9 | **P2** |
| 405 | `src\lib\utils.ts` | 2 | utils | 4 | 8 | **P2** |
| 406 | `src\lib\utils\ollama-endpoints.ts` | 2 | utils | 4 | 8 | **P2** |
| 407 | `src\lib\utils\accessibility.ts` | 2 | utils | 4 | 8 | **P2** |
| 408 | `src\lib\services\xstate-integration.ts` | 8 | other | 1 | 8 | **P2** |
| 409 | `src\lib\llm\gemma.ts` | 8 | other | 1 | 8 | **P2** |
| 410 | `src\lib\rag\som-intent.ts` | 8 | other | 1 | 8 | **P2** |
| 411 | `src\lib\server\ai\embedding.ts` | 8 | other | 1 | 8 | **P2** |
| 412 | `src\lib\server\ai\gemma3-agentic-functions.ts` | 8 | other | 1 | 8 | **P2** |
| 413 | `src\lib\server\messaging\rabbitmq-service.ts` | 7 | other | 1 | 7 | **P2** |
| 414 | `src\lib\api\services\cache-service.ts` | 7 | other | 1 | 7 | **P2** |
| 415 | `src\lib\cache\glyph-shader-cache-bridge.ts` | 7 | other | 1 | 7 | **P2** |
| 416 | `src\lib\client\ocr-tensor-processor.ts` | 7 | other | 1 | 7 | **P2** |
| 417 | `src\lib\client\ai\webgpu-reranker-worker.ts` | 7 | other | 1 | 7 | **P2** |
| 418 | `src\lib\config\production-config.ts` | 7 | other | 1 | 7 | **P2** |
| 419 | `src\lib\database\connection.ts` | 7 | other | 1 | 7 | **P2** |
| 420 | `src\lib\embedding\embedding-adapter.ts` | 7 | other | 1 | 7 | **P2** |
| 421 | `src\lib\evidence-canvas\evidence-canvas-core.svelte` | 7 | other | 1 | 7 | **P2** |
| 422 | `src\lib\services\context7-multicore.ts` | 7 | other | 1 | 7 | **P2** |
| 423 | `src\lib\integrations\legal-ai-webgpu-bridge.ts` | 7 | other | 1 | 7 | **P2** |
| 424 | `src\lib\services\tensor-upscaler-service.ts` | 7 | other | 1 | 7 | **P2** |
| 425 | `src\lib\orchestration\complete-legal-ai-orchestrator.ts` | 7 | other | 1 | 7 | **P2** |
| 426 | `src\lib\rabbitmq\index.ts` | 7 | other | 1 | 7 | **P2** |
| 427 | `src\lib\routing\unified-api-router.ts` | 7 | other | 1 | 7 | **P2** |
| 428 | `src\lib\search\fuseStore.ts` | 7 | other | 1 | 7 | **P2** |
| 429 | `src\lib\server\adapter-ranking.ts` | 7 | other | 1 | 7 | **P2** |
| 430 | `src\lib\server\env.server.ts` | 7 | other | 1 | 7 | **P2** |
| 431 | `src\lib\services\rabbitmq-service.ts` | 7 | other | 1 | 7 | **P2** |
| 432 | `src\lib\server\rateLimit.ts` | 7 | other | 1 | 7 | **P2** |
| 433 | `src\lib\server\redis-streams.ts` | 7 | other | 1 | 7 | **P2** |
| 434 | `src\lib\services\unified-legal-simd-pgvector-production.ts` | 7 | other | 1 | 7 | **P2** |
| 435 | `src\lib\server\shutdown.ts` | 7 | other | 1 | 7 | **P2** |
| 436 | `src\lib\types\search.types.ts` | 6 | other | 1 | 6 | **P2** |
| 437 | `src\lib\actors\embedding-actor.ts` | 6 | other | 1 | 6 | **P2** |
| 438 | `src\lib\services\end-to-end-api-integration.ts` | 6 | other | 1 | 6 | **P2** |
| 439 | `src\lib\services\autogen-service.ts` | 6 | other | 1 | 6 | **P2** |
| 440 | `src\lib\machines\case-workflow-machine.ts` | 6 | other | 1 | 6 | **P2** |
| 441 | `src\lib\machines\idle-detection-rabbitmq-machine.ts` | 6 | other | 1 | 6 | **P2** |
| 442 | `src\lib\machines\system-monitor.ts` | 6 | other | 1 | 6 | **P2** |
| 443 | `src\lib\modules\citations-manager.ts` | 6 | other | 1 | 6 | **P2** |
| 444 | `src\lib\server\simd-body-parser.ts` | 6 | other | 1 | 6 | **P2** |
| 445 | `src\lib\server\utils\json-fast.ts` | 6 | other | 1 | 6 | **P2** |
| 446 | `src\lib\mcp-rabbitmq-redis-docs.ts` | 5 | other | 1 | 5 | **P2** |
| 447 | `src\lib\api\client.ts` | 5 | other | 1 | 5 | **P2** |
| 448 | `src\lib\services\documentApi.ts` | 5 | other | 1 | 5 | **P2** |
| 449 | `src\lib\components\CanvasEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 450 | `src\lib\components\CaseDetailPage.svelte` | 1 | components | 5 | 5 | **P2** |
| 451 | `src\lib\shared\quantize.ts` | 5 | other | 1 | 5 | **P2** |
| 452 | `src\lib\components\CrewAIOrchestrationDemo.svelte` | 1 | components | 5 | 5 | **P2** |
| 453 | `src\lib\components\NESGraphRenderer.svelte` | 1 | components | 5 | 5 | **P2** |
| 454 | `src\lib\components\PersonProfile.svelte` | 1 | components | 5 | 5 | **P2** |
| 455 | `src\lib\components\SearchBar.svelte` | 1 | components | 5 | 5 | **P2** |
| 456 | `src\lib\components\Dialog\index.ts` | 1 | components | 5 | 5 | **P2** |
| 457 | `src\lib\components\admin\AdminLayout.svelte` | 1 | components | 5 | 5 | **P2** |
| 458 | `src\lib\components\ai\PatternDetectionInterface\index.ts` | 1 | components | 5 | 5 | **P2** |
| 459 | `src\lib\components\ast\CodeEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 460 | `src\lib\components\chat\ChatAuthPrompt.svelte` | 1 | components | 5 | 5 | **P2** |
| 461 | `src\lib\components\command-center\AllRoutesExplorer.svelte` | 1 | components | 5 | 5 | **P2** |
| 462 | `src\lib\components\editors\LegalRichTextEditor.svelte` | 1 | components | 5 | 5 | **P2** |
| 463 | `src\lib\components\evidence\EvidenceUploadButton.svelte` | 1 | components | 5 | 5 | **P2** |
| 464 | `src\lib\components\evidence-graph\index.ts` | 1 | components | 5 | 5 | **P2** |
| 465 | `src\lib\components\laws\LegalAutocomplete.svelte` | 1 | components | 5 | 5 | **P2** |
| 466 | `src\lib\components\laws\StatuteColumn.svelte` | 1 | components | 5 | 5 | **P2** |
| 467 | `src\lib\components\layout\EvidenceBoardLayout.svelte` | 1 | components | 5 | 5 | **P2** |
| 468 | `src\lib\components\legal\StatuteActionPanel.svelte` | 1 | components | 5 | 5 | **P2** |
| 469 | `src\lib\components\legal-ai\LegalAILayout.svelte` | 1 | components | 5 | 5 | **P2** |
| 470 | `src\lib\components\nes\NesModal.svelte` | 1 | components | 5 | 5 | **P2** |
| 471 | `src\lib\components\ui\core\Textarea.svelte` | 1 | components | 5 | 5 | **P2** |
| 472 | `src\lib\components\ui\TypewriterPrompt.svelte` | 1 | components | 5 | 5 | **P2** |
| 473 | `src\lib\components\poi\POIForm.svelte` | 1 | components | 5 | 5 | **P2** |
| 474 | `src\lib\components\poi\POIProfile.svelte` | 1 | components | 5 | 5 | **P2** |
| 475 | `src\lib\components\search\index.ts` | 1 | components | 5 | 5 | **P2** |
| 476 | `src\lib\components\search\types.ts` | 1 | components | 5 | 5 | **P2** |
| 477 | `src\lib\components\ui\EvidenceCard\index.ts` | 1 | components | 5 | 5 | **P2** |
| 478 | `src\lib\components\ui\gaming\types\gaming-types-minimal.ts` | 1 | components | 5 | 5 | **P2** |
| 479 | `src\lib\components\ui\wrappers\bits\bits-overrides.ts` | 1 | components | 5 | 5 | **P2** |
| 480 | `src\lib\components\yorha\CaseTheoryConstructor.svelte` | 1 | components | 5 | 5 | **P2** |
| 481 | `src\lib\components\yorha\CrossExaminationAssistant.svelte` | 1 | components | 5 | 5 | **P2** |
| 482 | `src\lib\components\yorha\PoliceReportGenerator.svelte` | 1 | components | 5 | 5 | **P2** |
| 483 | `src\lib\components\yorha\evidence\EvidenceComparisonOverlay.svelte` | 1 | components | 5 | 5 | **P2** |
| 484 | `src\lib\components\yorha\dashboard\ActiveCasesWidget.svelte` | 1 | components | 5 | 5 | **P2** |
| 485 | `src\lib\evidence-canvas\evidence-canvas.svelte` | 5 | other | 1 | 5 | **P2** |
| 486 | `src\lib\features\featureFlags.ts` | 5 | other | 1 | 5 | **P2** |
| 487 | `src\lib\machines\aiSummaryMachine.ts` | 5 | other | 1 | 5 | **P2** |
| 488 | `src\lib\types\pipeline.ts` | 5 | other | 1 | 5 | **P2** |
| 489 | `src\lib\server\embedding-gateway.ts` | 5 | other | 1 | 5 | **P2** |
| 490 | `src\lib\optimization\json-wasm-optimizer.ts` | 5 | other | 1 | 5 | **P2** |
| 491 | `src\lib\polyfills\sveltekit2-universal-polyfill.ts` | 5 | other | 1 | 5 | **P2** |
| 492 | `src\lib\registry\texture-component-registry.ts` | 5 | other | 1 | 5 | **P2** |
| 493 | `src\lib\integration-status.ts` | 4 | other | 1 | 4 | **P2** |
| 494 | `src\lib\client\workflow-event-stream.ts` | 4 | other | 1 | 4 | **P2** |
| 495 | `src\lib\client\ai\webgpu-reranker.ts` | 4 | other | 1 | 4 | **P2** |
| 496 | `src\lib\webgpu\webgpu-init.ts` | 4 | other | 1 | 4 | **P2** |
| 497 | `src\lib\composables\ui-state-runes.svelte.ts` | 4 | other | 1 | 4 | **P2** |
| 498 | `src\lib\db\vector-operations.ts` | 4 | other | 1 | 4 | **P2** |
| 499 | `src\lib\detective-mode\comprehensive-integration.ts` | 4 | other | 1 | 4 | **P2** |
| 500 | `src\lib\embedding\client-embedding-generator.ts` | 4 | other | 1 | 4 | **P2** |
| 501 | `src\lib\features\evidence-command-center\CommandCenterShell.svelte` | 4 | other | 1 | 4 | **P2** |
| 502 | `src\lib\hooks\fastjson-server.ts` | 4 | other | 1 | 4 | **P2** |
| 503 | `src\lib\integrations\redis-webgpu-simd-integration.ts` | 4 | other | 1 | 4 | **P2** |
| 504 | `src\lib\llm\tauri-llm.ts` | 4 | other | 1 | 4 | **P2** |
| 505 | `src\lib\machines\enhanced-legal-case-machine.ts` | 4 | other | 1 | 4 | **P2** |
| 506 | `src\lib\machines\userTypingStateMachine.ts` | 4 | other | 1 | 4 | **P2** |
| 507 | `src\lib\memory-palace\MemoryPalaceScene.ts` | 4 | other | 1 | 4 | **P2** |
| 508 | `src\lib\monitoring\legal-performance-metrics.ts` | 4 | other | 1 | 4 | **P2** |
| 509 | `src\lib\server\vector\vectorService.ts` | 4 | other | 1 | 4 | **P2** |
| 510 | `src\lib\services\hybrid-vector-search.ts` | 4 | other | 1 | 4 | **P2** |
| 511 | `src\lib\server\thread-safe-postgres.ts` | 4 | other | 1 | 4 | **P2** |
| 512 | `src\lib\server\env-helper.ts` | 4 | other | 1 | 4 | **P2** |
| 513 | `src\lib\server\evidence-detective.ts` | 4 | other | 1 | 4 | **P2** |
| 514 | `src\lib\server\rag-sync.ts` | 4 | other | 1 | 4 | **P2** |
| 515 | `src\lib\server\ai\ai-utils.ts` | 4 | other | 1 | 4 | **P2** |
| 516 | `src\lib\server\ai\embedding-service.ts` | 4 | other | 1 | 4 | **P2** |
| 517 | `src\lib\server\ai\embeddinggemma-service.ts` | 4 | other | 1 | 4 | **P2** |
| 518 | `src\lib\server\ai\enhanced-legal-search.ts` | 4 | other | 1 | 4 | **P2** |
| 519 | `src\lib\services\enhanced-file-upload.ts` | 3 | other | 1 | 3 | **P2** |
| 520 | `src\lib\services\hybrid-vector-operations.ts` | 3 | other | 1 | 3 | **P2** |
| 521 | `src\lib\adapters\wasm-rabbitmq-bridge.ts` | 3 | other | 1 | 3 | **P2** |
| 522 | `src\lib\cache\loki-redis-integration.ts` | 3 | other | 1 | 3 | **P2** |
| 523 | `src\lib\client\rerank-client.ts` | 3 | other | 1 | 3 | **P2** |
| 524 | `src\lib\client\actors\llmStreamActor.ts` | 3 | other | 1 | 3 | **P2** |
| 525 | `src\lib\config\database.ts` | 3 | other | 1 | 3 | **P2** |
| 526 | `src\lib\config\env.server.ts` | 3 | other | 1 | 3 | **P2** |
| 527 | `src\lib\services\webgpu-texture-streaming.ts` | 3 | other | 1 | 3 | **P2** |
| 528 | `src\lib\machines\ai-analysis-machine.ts` | 3 | other | 1 | 3 | **P2** |
| 529 | `src\lib\server\utils\endpoints.ts` | 3 | other | 1 | 3 | **P2** |
| 530 | `src\lib\machines\vectorJobMachine.ts` | 3 | other | 1 | 3 | **P2** |
| 531 | `src\lib\proto\legal-ai-types.ts` | 3 | other | 1 | 3 | **P2** |
| 532 | `src\lib\server\document-processor.ts` | 3 | other | 1 | 3 | **P2** |
| 533 | `src\lib\server\evidence-stream.ts` | 3 | other | 1 | 3 | **P2** |
| 534 | `src\lib\server\ollama-utils.ts` | 3 | other | 1 | 3 | **P2** |
| 535 | `src\lib\server\queue.ts` | 3 | other | 1 | 3 | **P2** |
| 536 | `src\lib\server\services.ts` | 3 | other | 1 | 3 | **P2** |
| 537 | `src\lib\server\session.ts` | 3 | other | 1 | 3 | **P2** |
| 538 | `src\lib\server\vlm-document-analyzer.ts` | 3 | other | 1 | 3 | **P2** |
| 539 | `src\lib\server\agents\crewRouter.ts` | 3 | other | 1 | 3 | **P2** |
| 540 | `src\lib\mcp-memory-read-graph.ts` | 2 | other | 1 | 2 | **P2** |
| 541 | `src\lib\services\indexeddb-service.ts` | 2 | other | 1 | 2 | **P2** |
| 542 | `src\lib\api\documentApi.ts` | 2 | other | 1 | 2 | **P2** |
| 543 | `src\lib\api\services\health-service.ts` | 2 | other | 1 | 2 | **P2** |
| 544 | `src\lib\cache\headless-ui-cache.ts` | 2 | other | 1 | 2 | **P2** |
| 545 | `src\lib\cache\xstate-cache-integration.ts` | 2 | other | 1 | 2 | **P2** |
| 546 | `src\lib\server\redis-service.ts` | 2 | other | 1 | 2 | **P2** |
| 547 | `src\lib\cache\semantic-cache.ts` | 2 | other | 1 | 2 | **P2** |
| 548 | `src\lib\client\api\analytics.ts` | 2 | other | 1 | 2 | **P2** |
| 549 | `src\lib\client\ui\POIPhotoUploader.svelte` | 2 | other | 1 | 2 | **P2** |
| 550 | `src\lib\server\clients\ollama.ts` | 2 | other | 1 | 2 | **P2** |
| 551 | `src\lib\types\user.ts` | 2 | other | 1 | 2 | **P2** |
| 552 | `src\lib\types\canvas.ts` | 2 | other | 1 | 2 | **P2** |
| 553 | `src\lib\services\api-client.ts` | 2 | other | 1 | 2 | **P2** |
| 554 | `src\lib\config\enhanced-ai-config.ts` | 2 | other | 1 | 2 | **P2** |
| 555 | `src\lib\config\ollama-config.ts` | 2 | other | 1 | 2 | **P2** |
| 556 | `src\lib\core\logic\case-logic.ts` | 2 | other | 1 | 2 | **P2** |
| 557 | `src\lib\core\logic\legal-ai-logic.ts` | 2 | other | 1 | 2 | **P2** |
| 558 | `src\lib\demo\sampleData.ts` | 2 | other | 1 | 2 | **P2** |
| 559 | `src\lib\evidence-canvas\case-suggestion-modal.svelte` | 2 | other | 1 | 2 | **P2** |
| 560 | `src\lib\features\evidence-command-center\EvidenceBoardPane.svelte` | 2 | other | 1 | 2 | **P2** |
| 561 | `src\lib\forms\enhanced-cache-forms.ts` | 2 | other | 1 | 2 | **P2** |
| 562 | `src\lib\json\fastjson.ts` | 2 | other | 1 | 2 | **P2** |
| 563 | `src\lib\machines\case-creation-machine.ts` | 2 | other | 1 | 2 | **P2** |
| 564 | `src\lib\server\database\connection.ts` | 2 | other | 1 | 2 | **P2** |
| 565 | `src\lib\services\recommendation-engine.ts` | 2 | other | 1 | 2 | **P2** |
| 566 | `src\lib\phase14\server\queues\logWorker.ts` | 2 | other | 1 | 2 | **P2** |
| 567 | `src\lib\routing\dynamic-route-generator.ts` | 2 | other | 1 | 2 | **P2** |
| 568 | `src\lib\search\local-pipeline.ts` | 2 | other | 1 | 2 | **P2** |
| 569 | `src\lib\server\gpu-thread-coordinator.ts` | 2 | other | 1 | 2 | **P2** |
| 570 | `src\lib\server\ocr\hybrid.ts` | 2 | other | 1 | 2 | **P2** |
| 571 | `src\lib\server\ibm-vision.ts` | 2 | other | 1 | 2 | **P2** |
| 572 | `src\lib\server\embeddings.ts` | 2 | other | 1 | 2 | **P2** |
| 573 | `src\lib\server\gpu-thread-coordinator-broken.ts` | 2 | other | 1 | 2 | **P2** |
| 574 | `src\lib\server\message-queue.ts` | 2 | other | 1 | 2 | **P2** |
| 575 | `src\lib\server\rag\qdrant.ts` | 2 | other | 1 | 2 | **P2** |
| 576 | `src\lib\services\node-simd-json.ts` | 2 | other | 1 | 2 | **P2** |
| 577 | `src\lib\server\adapters\redis-adapter.ts` | 2 | other | 1 | 2 | **P2** |
| 578 | `src\lib\server\ai\ai-assistant-input-synthesizer.ts` | 2 | other | 1 | 2 | **P2** |
| 579 | `src\lib\tauri.ts` | 1 | other | 1 | 1 | **P2** |
| 580 | `src\lib\actors\xstate-actor-wrapper.ts` | 1 | other | 1 | 1 | **P2** |
| 581 | `src\lib\simd\simd-json-integration.ts` | 1 | other | 1 | 1 | **P2** |
| 582 | `src\lib\types\api-contracts.ts` | 1 | other | 1 | 1 | **P2** |
| 583 | `src\lib\api\enhanced-case-api.ts` | 1 | other | 1 | 1 | **P2** |
| 584 | `src\lib\api\search-client.ts` | 1 | other | 1 | 1 | **P2** |
| 585 | `src\lib\api\submitWithProgress.ts` | 1 | other | 1 | 1 | **P2** |
| 586 | `src\lib\api\clients\sse-client.ts` | 1 | other | 1 | 1 | **P2** |
| 587 | `src\lib\api\clients\websocket-client.ts` | 1 | other | 1 | 1 | **P2** |
| 588 | `src\lib\api\services\embedding-service.ts` | 1 | other | 1 | 1 | **P2** |
| 589 | `src\lib\api\services\metrics-service.ts` | 1 | other | 1 | 1 | **P2** |
| 590 | `src\lib\api\services\search-service.ts` | 1 | other | 1 | 1 | **P2** |
| 591 | `src\lib\api\services\clients\api-client.ts` | 1 | other | 1 | 1 | **P2** |
| 592 | `src\lib\cache\MultiLayerCacheSystem.ts` | 1 | other | 1 | 1 | **P2** |
| 593 | `src\lib\cache\loki-redis-integration-fixed.ts` | 1 | other | 1 | 1 | **P2** |
| 594 | `src\lib\caching\reinforcement-learning-cache.server.ts` | 1 | other | 1 | 1 | **P2** |
| 595 | `src\lib\client\rerank.ts` | 1 | other | 1 | 1 | **P2** |
| 596 | `src\lib\types\api.ts` | 1 | other | 1 | 1 | **P2** |
| 597 | `src\lib\config\gpu-rag-config.ts` | 1 | other | 1 | 1 | **P2** |
| 598 | `src\lib\evidence-canvas\webgpu-init.ts` | 1 | other | 1 | 1 | **P2** |
| 599 | `src\lib\evidence-canvas\case-similarity-service.ts` | 1 | other | 1 | 1 | **P2** |
| 600 | `src\lib\evidence-canvas\graph-control-panel.svelte` | 1 | other | 1 | 1 | **P2** |
| 601 | `src\lib\features\evidence-command-center\EvidenceChatPane.svelte` | 1 | other | 1 | 1 | **P2** |
| 602 | `src\lib\features\evidence-command-center\EvidenceCommandPalette.svelte` | 1 | other | 1 | 1 | **P2** |
| 603 | `src\lib\features\evidence-command-center\EvidenceGraphPane.svelte` | 1 | other | 1 | 1 | **P2** |
| 604 | `src\lib\services\flashattention2-rtx3060.ts` | 1 | other | 1 | 1 | **P2** |
| 605 | `src\lib\services\enhanced-caching-service.ts` | 1 | other | 1 | 1 | **P2** |
| 606 | `src\lib\logic\caseWorkflow.svelte.ts` | 1 | other | 1 | 1 | **P2** |
| 607 | `src\lib\machines\sessionMachine.ts` | 1 | other | 1 | 1 | **P2** |
| 608 | `src\lib\optimization\comprehensive-orchestrator.ts` | 1 | other | 1 | 1 | **P2** |
| 609 | `src\lib\optimization\ultra-json-processor.ts` | 1 | other | 1 | 1 | **P2** |
| 610 | `src\lib\orchestration\cognitive-routing-orchestrator.ts` | 1 | other | 1 | 1 | **P2** |
| 611 | `src\lib\server\chat\ssr-qlora-gpu-chat-assistant.ts` | 1 | other | 1 | 1 | **P2** |
| 612 | `src\lib\phase14\server\queues\logQueue.ts` | 1 | other | 1 | 1 | **P2** |
| 613 | `src\lib\proto\enhanced-rag.ts` | 1 | other | 1 | 1 | **P2** |
| 614 | `src\lib\routing\index.ts` | 1 | other | 1 | 1 | **P2** |
| 615 | `src\lib\server\docling.ts` | 1 | other | 1 | 1 | **P2** |
| 616 | `src\lib\server\embedding-cache-service.ts` | 1 | other | 1 | 1 | **P2** |
| 617 | `src\lib\server\gemma3-vlm-embedder.ts` | 1 | other | 1 | 1 | **P2** |
| 618 | `src\lib\server\logger.ts` | 1 | other | 1 | 1 | **P2** |
| 619 | `src\lib\server\ocr.ts` | 1 | other | 1 | 1 | **P2** |
| 620 | `src\lib\server\rag.ts` | 1 | other | 1 | 1 | **P2** |
| 621 | `src\lib\server\server.ts` | 1 | other | 1 | 1 | **P2** |
| 622 | `src\lib\types\external-services.ts` | 1 | other | 1 | 1 | **P2** |
| 623 | `src\lib\server\sse.ts` | 1 | other | 1 | 1 | **P2** |
| 624 | `src\lib\server\terminalFunctions.ts` | 1 | other | 1 | 1 | **P2** |
| 625 | `src\lib\server\timeline-logger.ts` | 1 | other | 1 | 1 | **P2** |
| 626 | `src\lib\server\trt-llm.ts` | 1 | other | 1 | 1 | **P2** |
| 627 | `src\lib\server\ocr\extractText.ts` | 1 | other | 1 | 1 | **P2** |
| 628 | `src\lib\server\ai\cache.ts` | 1 | other | 1 | 1 | **P2** |
| 629 | `src\lib\server\ai\embeddingService.ts` | 1 | other | 1 | 1 | **P2** |

## 📋 Detailed Breakdown (Top 20)

### 1. src\lib\machines\auth-machine.v5.ts
- **Errors:** 132
- **Category:** auth
- **Impact Score:** 1188

**Error Patterns:**
- `unknown`: 132 occurrences

### 2. src\lib\db\chat-schema.ts
- **Errors:** 113
- **Category:** database
- **Impact Score:** 1017

**Error Patterns:**
- `unknown`: 113 occurrences

### 3. src\lib\db\schema-example-legal.ts
- **Errors:** 57
- **Category:** database
- **Impact Score:** 891

**Error Patterns:**
- `unknown`: 51 occurrences
- `duplicate-identifier`: 6 occurrences

### 4. src\lib\components\ui\layout\index.ts
- **Errors:** 84
- **Category:** components
- **Impact Score:** 700

**Error Patterns:**
- `unknown`: 76 occurrences
- `duplicate-identifier`: 8 occurrences

### 5. src\lib\forms\contextual-chat-schema.ts
- **Errors:** 75
- **Category:** database
- **Impact Score:** 675

**Error Patterns:**
- `unknown`: 75 occurrences

### 6. src\lib\components\ui\context-menu\index.ts
- **Errors:** 125
- **Category:** components
- **Impact Score:** 625

**Error Patterns:**
- `unknown`: 125 occurrences

### 7. src\lib\messaging\rabbitmq-xstate-integration.ts
- **Errors:** 548
- **Category:** other
- **Impact Score:** 562

**Error Patterns:**
- `unknown`: 546 occurrences
- `duplicate-identifier`: 2 occurrences

### 8. src\lib\components\ui\enhanced-bits.ts
- **Errors:** 40
- **Category:** components
- **Impact Score:** 550

**Error Patterns:**
- `unknown`: 30 occurrences
- `duplicate-identifier`: 10 occurrences

### 9. src\lib\mcp-context72-get-library-docs.ts
- **Errors:** 440
- **Category:** other
- **Impact Score:** 510

**Error Patterns:**
- `unknown`: 430 occurrences
- `duplicate-identifier`: 10 occurrences

### 10. src\lib\components\POIPhotoModal.svelte
- **Errors:** 101
- **Category:** components
- **Impact Score:** 505

**Error Patterns:**
- `unknown`: 101 occurrences

### 11. src\lib\utils\simd-json-cache.ts
- **Errors:** 92
- **Category:** utils
- **Impact Score:** 484

**Error Patterns:**
- `unknown`: 87 occurrences
- `env-type-declarations`: 1 occurrences
- `duplicate-identifier`: 4 occurrences

### 12. src\lib\components\ui\gaming\core\GamingEvolutionManager.ts
- **Errors:** 93
- **Category:** components
- **Impact Score:** 465

**Error Patterns:**
- `unknown`: 93 occurrences

### 13. src\lib\server\auth.ts
- **Errors:** 47
- **Category:** auth
- **Impact Score:** 423

**Error Patterns:**
- `unknown`: 47 occurrences

### 14. src\lib\ocr\ocr-client.ts
- **Errors:** 415
- **Category:** other
- **Impact Score:** 415

**Error Patterns:**
- `unknown`: 415 occurrences

### 15. src\lib\components\three\yorha-ui\components\YoRHaButtonAA3D.ts
- **Errors:** 81
- **Category:** components
- **Impact Score:** 405

**Error Patterns:**
- `unknown`: 81 occurrences

### 16. src\lib\components\three\yorha-ui\webgpu\HeadlessLegalProcessorFactory.ts
- **Errors:** 79
- **Category:** components
- **Impact Score:** 395

**Error Patterns:**
- `unknown`: 79 occurrences

### 17. src\lib\components\ui\enhanced\Button.stories.ts
- **Errors:** 64
- **Category:** components
- **Impact Score:** 320

**Error Patterns:**
- `unknown`: 64 occurrences

### 18. src\lib\server\auth-guard.ts
- **Errors:** 35
- **Category:** auth
- **Impact Score:** 315

**Error Patterns:**
- `unknown`: 35 occurrences

### 19. src\lib\database\migrations\migration-system.ts
- **Errors:** 314
- **Category:** other
- **Impact Score:** 314

**Error Patterns:**
- `unknown`: 314 occurrences

### 20. src\lib\server\db\schema\error_clusters.ts
- **Errors:** 6
- **Category:** database
- **Impact Score:** 306

**Error Patterns:**
- `duplicate-identifier`: 4 occurrences
- `unknown`: 2 occurrences

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)
- [ ] `src\lib\machines\auth-machine.v5.ts` (132 errors, score: 1188)
- [ ] `src\lib\db\chat-schema.ts` (113 errors, score: 1017)
- [ ] `src\lib\db\schema-example-legal.ts` (57 errors, score: 891)
- [ ] `src\lib\components\ui\layout\index.ts` (84 errors, score: 700)
- [ ] `src\lib\forms\contextual-chat-schema.ts` (75 errors, score: 675)
- [ ] `src\lib\components\ui\context-menu\index.ts` (125 errors, score: 625)
- [ ] `src\lib\messaging\rabbitmq-xstate-integration.ts` (548 errors, score: 562)
- [ ] `src\lib\components\ui\enhanced-bits.ts` (40 errors, score: 550)
- [ ] `src\lib\mcp-context72-get-library-docs.ts` (440 errors, score: 510)
- [ ] `src\lib\components\POIPhotoModal.svelte` (101 errors, score: 505)

### P1 (High - Impact 50-100)
- [ ] `src\lib\components\upload\upload-core.ts` (20 errors, score: 100)
- [ ] `src\lib\webgpu\shader-cache-manager.ts` (97 errors, score: 97)
- [ ] `src\lib\simd\simd-json-worker-client.ts` (97 errors, score: 97)
- [ ] `src\lib\server\database-api-bridge.ts` (95 errors, score: 95)
- [ ] `src\lib\services\glyph-diffusion-service.ts` (91 errors, score: 91)
- [ ] `src\lib\server\services\vectorDBService.ts` (49 errors, score: 91)
- [ ] `src\lib\components\integration\LegalAIOrchestrationDemo.svelte` (18 errors, score: 90)
- [ ] `src\lib\components\ui\EvidenceCanvas.svelte` (18 errors, score: 90)
- [ ] `src\lib\server\ai\ai-service-orchestrator.ts` (87 errors, score: 87)
- [ ] `src\lib\server\ai\caching-layer.ts` (83 errors, score: 83)

### P2 (Medium - Impact < 50)
- 488 files remaining

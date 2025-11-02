# TypeScript Error Analysis Report
Generated: 2025-11-02T22:21:12.064Z
Total files with errors: 72
Total errors: 12235

## 🔴 Priority 1 - Fix These First (High Impact)
- **src/lib/ai/lod-cache-engine.ts** (615 errors, priority: 615)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1134, 1136, 1146, 1160, 1161, 1180, 1434, 1435, 1443, 1472
- **src/lib/ai/enhanced-rag-glyph-system.ts** (563 errors, priority: 563)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1135, 1136, 1138, 1359, 1434
- **src/lib/ai/gpu-acceleration-pipeline.ts** (466 errors, priority: 466)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1134, 1135, 1136, 1138, 1146, 1180, 1181, 1351, 1434, 1443, 1472
- **src/lib/ai/qlora-topology-predictor.ts** (463 errors, priority: 463)  - Error codes: 1005, 1011, 1068, 1109, 1110, 1128, 1131, 1134, 1135, 1136, 1138, 1146, 1180, 1351, 1434, 1443, 1472
- **src/lib/ai/moogle-graph-synthesizer.ts** (457 errors, priority: 457)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1136, 1351, 1359, 1434, 1472
- **src/lib/ai/intelligent-model-orchestrator.ts** (413 errors, priority: 413)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1359, 1434
- **src/lib/ai/crewai-legal-team.ts** (395 errors, priority: 395)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1137, 1160, 1359, 1434, 1435, 1443
- **src/lib/ai/langchain-rag.ts** (382 errors, priority: 382)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1127, 1128, 1131, 1135, 1136, 1180, 1359, 1434, 1435, 1442, 1443, 1472
- **src/lib/ai/legal-bert-semantic-analyzer.ts** (363 errors, priority: 363)  - Error codes: 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1135, 1136, 1160, 1228, 1359, 1434, 1435, 1443, 1472
- **src/lib/ai/intelligent-web-analyzer.ts** (327 errors, priority: 327)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1136, 1138, 1434, 1472
- **src/lib/ai/pgvector-faiss-bridge.ts** (323 errors, priority: 323)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1127, 1128, 1131, 1136, 1434, 1443, 1472
- **src/lib/ai/hybrid-gemma-bitmap-engine.ts** (317 errors, priority: 317)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1134, 1136, 1434, 1472
- **src/lib/adapters/webasm-ai-adapter.ts** (313 errors, priority: 313)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1134, 1136, 1359, 1434, 1435, 1443, 1472
- **src/lib/3d/memory-palace-engine.ts** (311 errors, priority: 311)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1136, 1359, 1434
- **src/lib/ai/enhanced-ingestion-pipeline.ts** (310 errors, priority: 310)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1127, 1128, 1131, 1135, 1136, 1161, 1359, 1434, 1435, 1443
- **src/lib/ai/grpc-gemma-embedding-client.ts** (244 errors, priority: 284)  - Error codes: 1005, 1011, 1109, 1110, 1128, 1131, 1135, 1136, 1138, 1160, 1434, 1435, 1472
- **src/lib/ai/browser-local-ai.ts** (281 errors, priority: 281)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1110, 1128, 1131, 1134, 1136, 1434, 1472
- **src/lib/ai/cuda-cache-memory-optimizer.ts** (273 errors, priority: 273)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1136, 1138, 1359, 1434
- **src/lib/ai/legal-workflow-orchestrator.ts** (264 errors, priority: 264)  - Error codes: 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1139, 1160, 1359, 1434, 1443
- **src/lib/ai/ai-service.ts** (219 errors, priority: 251)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1127, 1128, 1131, 1136, 1359, 1434, 1435, 1443, 1472, 2809

## 🟡 Priority 2 - Medium Impact
- src/lib/actors/xstate-actor-wrapper.ts (142 errors, priority: 142)
- src/lib/ai/crewai-legal-agents.ts (130 errors, priority: 130)
- src/lib/ai/browser-qwen.ts (125 errors, priority: 125)
- src/lib/ai/ollama-client.ts (76 errors, priority: 116)
- src/lib/ai/browser-embeddings.ts (115 errors, priority: 115)
- src/lib/ai/cache/multiTierCache.ts (112 errors, priority: 112)
- src/lib/ai/custom-reranker.ts (100 errors, priority: 100)
- src/lib/ai/gpu-inference-examples.ts (138 errors, priority: 97)
- src/lib/ai/ollama-embeddings.ts (97 errors, priority: 97)
- src/lib/ai/context7-adapter.ts (86 errors, priority: 86)
- src/lib/ai/mcp-helpers.ts (73 errors, priority: 73)
- src/lib/ai/qlora-integration-analyzer.ts (70 errors, priority: 70)
- src/lib/actors/embedding-actor.ts (69 errors, priority: 69)
- src/global.d.ts (23 errors, priority: 68)
- src/env.d.ts (20 errors, priority: 65)
- src/lib/ai/gpu-error-checker.ts (61 errors, priority: 61)
- src/lib/actions/accessibility-actions.ts (60 errors, priority: 60)
- src/custom-modules.d.ts (11 errors, priority: 56)
- src/ambient-legacy.d.ts (7 errors, priority: 52)
- src/app.d.ts (7 errors, priority: 52)

## 🟢 Priority 3 - Low Impact
16 files with low impact (393 total errors)

## 📊 Most Common Error Codes
- TS1128: 70 files affected
- TS1005: 67 files affected
- TS1434: 62 files affected
- TS1131: 52 files affected
- TS1109: 48 files affected
- TS1136: 43 files affected
- TS1011: 40 files affected
- TS1472: 40 files affected
- TS1003: 39 files affected
- TS1068: 35 files affected

## 📋 Recommended Fix Order
```
1. src/lib/ai/lod-cache-engine.ts
   └─ 615 errors | Priority: 615
2. src/lib/ai/enhanced-rag-glyph-system.ts
   └─ 563 errors | Priority: 563
3. src/lib/ai/gpu-acceleration-pipeline.ts
   └─ 466 errors | Priority: 466
4. src/lib/ai/qlora-topology-predictor.ts
   └─ 463 errors | Priority: 463
5. src/lib/ai/moogle-graph-synthesizer.ts
   └─ 457 errors | Priority: 457
6. src/lib/ai/intelligent-model-orchestrator.ts
   └─ 413 errors | Priority: 413
7. src/lib/ai/crewai-legal-team.ts
   └─ 395 errors | Priority: 395
8. src/lib/ai/langchain-rag.ts
   └─ 382 errors | Priority: 382
9. src/lib/ai/legal-bert-semantic-analyzer.ts
   └─ 363 errors | Priority: 363
10. src/lib/ai/intelligent-web-analyzer.ts
   └─ 327 errors | Priority: 327
11. src/lib/ai/pgvector-faiss-bridge.ts
   └─ 323 errors | Priority: 323
12. src/lib/ai/hybrid-gemma-bitmap-engine.ts
   └─ 317 errors | Priority: 317
13. src/lib/adapters/webasm-ai-adapter.ts
   └─ 313 errors | Priority: 313
14. src/lib/3d/memory-palace-engine.ts
   └─ 311 errors | Priority: 311
15. src/lib/ai/enhanced-ingestion-pipeline.ts
   └─ 310 errors | Priority: 310
```

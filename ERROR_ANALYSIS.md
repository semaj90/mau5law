# TypeScript Error Analysis Report
Generated: 2025-11-03T21:12:21.916Z
Total files with errors: 536
Total errors: 12573

## 🔴 Priority 1 - Fix These First (High Impact)
- **src/lib/server/ai/rag-pipeline-enhanced.ts** (400 errors, priority: 420)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1136, 1181, 1359, 1434, 1472
- **src/lib/messaging/rabbitmq-xstate-integration.ts** (389 errors, priority: 389)  - Error codes: 1003, 1005, 1011, 1109, 1128, 1135, 1136, 1138, 1359, 1434, 1472
- **src/lib/ai/langchain-rag.ts** (388 errors, priority: 388)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1136, 1359, 1434, 1442
- **src/lib/ai/moogle-graph-synthesizer.ts** (341 errors, priority: 341)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1351, 1359, 1434
- **src/lib/server/config/vector-config.ts** (302 errors, priority: 322)  - Error codes: 1003, 1005, 1127, 1128, 1434
- **src/lib/server/ai/enhanced-orchestrator.ts** (235 errors, priority: 255)  - Error codes: 1003, 1005, 1011, 1109, 1127, 1128, 1180, 1359, 1434, 1435, 1443, 1472
- **src/lib/server/ai/rag-pipeline.ts** (216 errors, priority: 236)  - Error codes: 1002, 1005, 1011, 1068, 1109, 1127, 1128, 1131, 1135, 1136, 1160, 1434, 1435, 1442
- **src/lib/machines/aiAssistantMachine.ts** (203 errors, priority: 223)  - Error codes: 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1359, 1434
- **src/lib/machines/workflow-machine.ts** (156 errors, priority: 211)  - Error codes: 1003, 1005, 1109, 1128, 1131, 1135, 1136
- **src/lib/server/ai/vector-search-service.ts** (155 errors, priority: 207)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1434, 1435, 1442, 1443, 1472
- **src/lib/client/secure-storage-client.ts** (160 errors, priority: 200)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1434, 1442
- **src/lib/rag/demo-rag.ts** (252 errors, priority: 176)  - Error codes: 1002, 1003, 1005, 1109, 1127, 1128, 1228, 1434, 1435
- **src/lib/machines/legalAIMachine.v5.ts** (152 errors, priority: 172)  - Error codes: 1005, 1109, 1128, 1131, 1135, 1136, 1472
- **src/lib/server/api-ssr-helpers.ts** (140 errors, priority: 160)  - Error codes: 1005, 1109, 1110, 1128, 1131, 1136, 1160, 1434, 1472, 2809
- **src/lib/ai/lod-cache-engine.ts** (151 errors, priority: 151)  - Error codes: 1002, 1005, 1068, 1109, 1128, 1131, 1134, 1434, 1442
- **src/lib/graph/sora-graph-traversal.ts** (150 errors, priority: 150)  - Error codes: 1002, 1005, 1068, 1109, 1127, 1128, 1131, 1434, 1442

## 🟡 Priority 2 - Medium Impact
- src/lib/ai/unified-llama-examples.ts (205 errors, priority: 144)
- src/lib/ai/tensorrt-client.ts (103 errors, priority: 143)
- src/lib/machines/graph-cache-machine.ts (86 errors, priority: 141)
- src/lib/server/ai/pgvector-indexing-service.ts (86 errors, priority: 138)
- src/lib/proto/enhanced-rag.ts (133 errors, priority: 133)
- src/lib/server/ai/mcp-context7-embedding-integration.ts (109 errors, priority: 129)
- src/lib/machines/predictive-typing-machine.ts (73 errors, priority: 128)
- src/lib/ai/crewai-legal-team.ts (125 errors, priority: 125)
- src/lib/metrics/gpuSummaryClient.ts (124 errors, priority: 124)
- src/lib/routing/index.ts (81 errors, priority: 123)
- src/lib/server/ai/ollama-local-llm.ts (101 errors, priority: 121)
- src/lib/api/ollama-client.ts (70 errors, priority: 110)
- src/lib/server/ai/som-bitmap-visualizer.ts (90 errors, priority: 110)
- src/lib/config/gemma3-config.ts (109 errors, priority: 109)
- src/lib/optimization/optimization-test-suite.ts (109 errors, priority: 109)
- src/lib/hooks/useRedisOrchestrator.ts (108 errors, priority: 108)
- src/lib/ai/enhanced-grpo-processor.ts (104 errors, priority: 104)
- src/lib/machines/recommendation-routing-machine.ts (48 errors, priority: 103)
- src/lib/machines/agentShellMachine.ts (82 errors, priority: 102)
- src/lib/optimization/index.ts (58 errors, priority: 100)
- src/lib/cuda/ptx-compiler-config.ts (96 errors, priority: 96)
- src/lib/machines/vector-pipeline-machine.ts (41 errors, priority: 96)
- src/lib/api/services/vector-service.ts (62 errors, priority: 94)
- src/lib/machines/enhanced-legal-upload-analytics-machine.ts (39 errors, priority: 94)
- src/lib/machines/canvasEditorMachine.ts (73 errors, priority: 93)
- src/lib/server/cache/redis.ts (68 errors, priority: 88)
- src/lib/forms/contextual-chat-schema.ts (49 errors, priority: 87)
- src/lib/machines/auth-machine.v5.ts (67 errors, priority: 87)
- src/lib/machines/ai-computation-machine.ts (30 errors, priority: 85)
- src/lib/server/database-pool-service.ts (33 errors, priority: 85)

## 🟢 Priority 3 - Low Impact
407 files with low impact (3505 total errors)

## 📊 Most Common Error Codes
- TS1005: 494 files affected
- TS1128: 293 files affected
- TS1109: 215 files affected
- TS1131: 164 files affected
- TS1434: 116 files affected
- TS1442: 102 files affected
- TS1068: 89 files affected
- TS1003: 76 files affected
- TS1136: 75 files affected
- TS1002: 39 files affected

## 📋 Recommended Fix Order
```
1. src/lib/server/ai/rag-pipeline-enhanced.ts
   └─ 400 errors | Priority: 420
2. src/lib/messaging/rabbitmq-xstate-integration.ts
   └─ 389 errors | Priority: 389
3. src/lib/ai/langchain-rag.ts
   └─ 388 errors | Priority: 388
4. src/lib/ai/moogle-graph-synthesizer.ts
   └─ 341 errors | Priority: 341
5. src/lib/server/config/vector-config.ts
   └─ 302 errors | Priority: 322
6. src/lib/server/ai/enhanced-orchestrator.ts
   └─ 235 errors | Priority: 255
7. src/lib/server/ai/rag-pipeline.ts
   └─ 216 errors | Priority: 236
8. src/lib/machines/aiAssistantMachine.ts
   └─ 203 errors | Priority: 223
9. src/lib/machines/workflow-machine.ts
   └─ 156 errors | Priority: 211
10. src/lib/server/ai/vector-search-service.ts
   └─ 155 errors | Priority: 207
11. src/lib/client/secure-storage-client.ts
   └─ 160 errors | Priority: 200
12. src/lib/rag/demo-rag.ts
   └─ 252 errors | Priority: 176
13. src/lib/machines/legalAIMachine.v5.ts
   └─ 152 errors | Priority: 172
14. src/lib/server/api-ssr-helpers.ts
   └─ 140 errors | Priority: 160
15. src/lib/ai/lod-cache-engine.ts
   └─ 151 errors | Priority: 151
```

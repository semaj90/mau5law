# TypeScript Error Analysis Report
Generated: 2025-11-06T22:48:14.787Z
Total files with errors: 628
Total errors: 12658

## 🔴 Priority 1 - Fix These First (High Impact)
- **src/lib/ai/moogle-graph-synthesizer.ts** (341 errors, priority: 341)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1351, 1359, 1434
- **src/lib/server/ai/enhanced-orchestrator.ts** (237 errors, priority: 257)  - Error codes: 1003, 1005, 1011, 1109, 1127, 1128, 1180, 1359, 1434, 1435, 1443, 1472
- **src/lib/server/lokiHybridStore.ts** (205 errors, priority: 225)  - Error codes: 1003, 1005, 1068, 1109, 1128, 1131, 1134, 1136, 1160, 1359, 1434, 1442
- **src/lib/machines/workflow-machine.ts** (160 errors, priority: 215)  - Error codes: 1003, 1005, 1109, 1128, 1131, 1135, 1136
- **src/lib/server/db/pgvector-utils.ts** (161 errors, priority: 209)  - Error codes: 1002, 1005, 1011, 1109, 1128, 1131, 1136, 1160, 1389, 1434, 1435, 1443, 1472
- **src/lib/server/ai/vector-search-service.ts** (155 errors, priority: 207)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1434, 1435, 1442, 1443, 1472
- **src/lib/server/db/vector-operations.ts** (169 errors, priority: 189)  - Error codes: 1003, 1005, 1068, 1109, 1128, 1136, 1181, 1434, 1472, 2809
- **src/lib/rag/demo-rag.ts** (252 errors, priority: 176)  - Error codes: 1002, 1003, 1005, 1109, 1127, 1128, 1228, 1434, 1435
- **src/lib/server/api-ssr-helpers.ts** (139 errors, priority: 159)  - Error codes: 1005, 1109, 1110, 1128, 1131, 1136, 1160, 1434, 1472, 2809
- **src/lib/server/embedding-cache-service.ts** (101 errors, priority: 153)  - Error codes: 1003, 1005, 1011, 1109, 1128, 1131, 1136, 1181, 1434, 1472
- **src/lib/ai/lod-cache-engine.ts** (152 errors, priority: 152)  - Error codes: 1002, 1005, 1068, 1109, 1128, 1131, 1134, 1434, 1442
- **src/lib/graph/sora-graph-traversal.ts** (151 errors, priority: 151)  - Error codes: 1002, 1005, 1068, 1109, 1127, 1128, 1131, 1434, 1442

## 🟡 Priority 2 - Medium Impact
- src/lib/ai/tensorrt-client.ts (105 errors, priority: 145)
- src/lib/ai/unified-llama-examples.ts (207 errors, priority: 145)
- src/lib/machines/graph-cache-machine.ts (87 errors, priority: 142)
- src/lib/proto/enhanced-rag.ts (138 errors, priority: 138)
- src/lib/server/ai/mcp-context7-embedding-integration.ts (112 errors, priority: 132)
- src/lib/machines/predictive-typing-machine.ts (74 errors, priority: 129)
- src/lib/server/db/jsonb-legal-schema.ts (70 errors, priority: 128)
- src/lib/ai/crewai-legal-team.ts (126 errors, priority: 126)
- src/lib/metrics/gpuSummaryClient.ts (124 errors, priority: 124)
- src/lib/server/ai/ollama-local-llm.ts (103 errors, priority: 123)
- src/lib/server/ai/som-bitmap-visualizer.ts (92 errors, priority: 112)
- src/lib/api/ollama-client.ts (70 errors, priority: 110)
- src/lib/optimization/optimization-test-suite.ts (110 errors, priority: 110)
- src/lib/config/gemma3-config.ts (109 errors, priority: 109)
- src/lib/hooks/useRedisOrchestrator.ts (108 errors, priority: 108)
- src/lib/machines/agentShellMachine.ts (86 errors, priority: 106)
- src/lib/server/messaging/rabbitmq-service.ts (54 errors, priority: 106)
- src/lib/server/db/unified-client.ts (45 errors, priority: 105)
- src/lib/server/integrations/minio.ts (85 errors, priority: 105)
- src/lib/ai/enhanced-grpo-processor.ts (104 errors, priority: 104)
- src/lib/machines/recommendation-routing-machine.ts (48 errors, priority: 103)
- src/lib/optimization/index.ts (58 errors, priority: 100)
- src/lib/api/services/vector-service.ts (65 errors, priority: 97)
- src/lib/machines/enhanced-legal-upload-analytics-machine.ts (42 errors, priority: 97)
- src/lib/cuda/ptx-compiler-config.ts (96 errors, priority: 96)
- src/lib/machines/vector-pipeline-machine.ts (41 errors, priority: 96)
- src/lib/machines/canvasEditorMachine.ts (73 errors, priority: 93)
- src/lib/server/integrations/ollama.ts (69 errors, priority: 89)
- src/lib/machines/auth-machine.v5.ts (68 errors, priority: 88)
- src/lib/forms/contextual-chat-schema.ts (49 errors, priority: 87)

## 🟢 Priority 3 - Low Impact
472 files with low impact (4142 total errors)

## 📊 Most Common Error Codes
- TS1005: 581 files affected
- TS1128: 341 files affected
- TS1109: 252 files affected
- TS1131: 184 files affected
- TS1434: 140 files affected
- TS1442: 109 files affected
- TS1003: 86 files affected
- TS1136: 83 files affected
- TS1068: 78 files affected
- TS1002: 45 files affected

## 📋 Recommended Fix Order
```
1. src/lib/ai/moogle-graph-synthesizer.ts
   └─ 341 errors | Priority: 341
2. src/lib/server/ai/enhanced-orchestrator.ts
   └─ 237 errors | Priority: 257
3. src/lib/server/lokiHybridStore.ts
   └─ 205 errors | Priority: 225
4. src/lib/machines/workflow-machine.ts
   └─ 160 errors | Priority: 215
5. src/lib/server/db/pgvector-utils.ts
   └─ 161 errors | Priority: 209
6. src/lib/server/ai/vector-search-service.ts
   └─ 155 errors | Priority: 207
7. src/lib/server/db/vector-operations.ts
   └─ 169 errors | Priority: 189
8. src/lib/rag/demo-rag.ts
   └─ 252 errors | Priority: 176
9. src/lib/server/api-ssr-helpers.ts
   └─ 139 errors | Priority: 159
10. src/lib/server/embedding-cache-service.ts
   └─ 101 errors | Priority: 153
11. src/lib/ai/lod-cache-engine.ts
   └─ 152 errors | Priority: 152
12. src/lib/graph/sora-graph-traversal.ts
   └─ 151 errors | Priority: 151
13. src/lib/ai/tensorrt-client.ts
   └─ 105 errors | Priority: 145
14. src/lib/ai/unified-llama-examples.ts
   └─ 207 errors | Priority: 145
15. src/lib/machines/graph-cache-machine.ts
   └─ 87 errors | Priority: 142
```

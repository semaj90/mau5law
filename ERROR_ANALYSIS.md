# TypeScript Error Analysis Report
Generated: 2025-11-04T23:42:58.533Z
Total files with errors: 593
Total errors: 12600

## 🔴 Priority 1 - Fix These First (High Impact)
- **src/lib/server/ai/rag-pipeline-enhanced.ts** (332 errors, priority: 352)  - Error codes: 1003, 1005, 1011, 1068, 1109, 1128, 1136, 1181, 1359, 1434
- **src/lib/ai/moogle-graph-synthesizer.ts** (341 errors, priority: 341)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1351, 1359, 1434
- **src/lib/server/ai/enhanced-orchestrator.ts** (237 errors, priority: 257)  - Error codes: 1003, 1005, 1011, 1109, 1127, 1128, 1180, 1359, 1434, 1435, 1443, 1472
- **src/lib/server/ai/rag-pipeline.ts** (217 errors, priority: 237)  - Error codes: 1002, 1005, 1011, 1068, 1109, 1127, 1128, 1131, 1135, 1136, 1160, 1434, 1435, 1442
- **src/lib/machines/aiAssistantMachine.ts** (212 errors, priority: 232)  - Error codes: 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1359, 1434
- **src/lib/machines/workflow-machine.ts** (160 errors, priority: 215)  - Error codes: 1003, 1005, 1109, 1128, 1131, 1135, 1136
- **src/lib/server/db/pgvector-utils.ts** (161 errors, priority: 209)  - Error codes: 1002, 1005, 1011, 1109, 1128, 1131, 1136, 1160, 1389, 1434, 1435, 1443, 1472
- **src/lib/server/ai/vector-search-service.ts** (155 errors, priority: 207)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1128, 1131, 1135, 1136, 1434, 1435, 1442, 1443, 1472
- **src/lib/client/secure-storage-client.ts** (163 errors, priority: 203)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1434, 1442
- **src/lib/rag/demo-rag.ts** (252 errors, priority: 176)  - Error codes: 1002, 1003, 1005, 1109, 1127, 1128, 1228, 1434, 1435
- **src/lib/machines/legalAIMachine.v5.ts** (155 errors, priority: 175)  - Error codes: 1005, 1109, 1128, 1131, 1135, 1136, 1472
- **src/lib/server/graph/evidence-graph-service.ts** (122 errors, priority: 174)  - Error codes: 1003, 1005, 1068, 1109, 1128, 1131, 1136, 1138, 1359, 1434, 1442, 1472
- **src/lib/server/api-ssr-helpers.ts** (139 errors, priority: 159)  - Error codes: 1005, 1109, 1110, 1128, 1131, 1136, 1160, 1434, 1472, 2809
- **src/lib/server/embedding-cache-service.ts** (101 errors, priority: 153)  - Error codes: 1003, 1005, 1011, 1109, 1128, 1131, 1136, 1181, 1434, 1472
- **src/lib/ai/lod-cache-engine.ts** (152 errors, priority: 152)  - Error codes: 1002, 1005, 1068, 1109, 1128, 1131, 1134, 1434, 1442
- **src/lib/graph/sora-graph-traversal.ts** (151 errors, priority: 151)  - Error codes: 1002, 1005, 1068, 1109, 1127, 1128, 1131, 1434, 1442

## 🟡 Priority 2 - Medium Impact
- src/lib/ai/tensorrt-client.ts (105 errors, priority: 145)
- src/lib/ai/unified-llama-examples.ts (207 errors, priority: 145)
- src/lib/machines/graph-cache-machine.ts (87 errors, priority: 142)
- src/lib/server/ai/pgvector-indexing-service.ts (89 errors, priority: 141)
- src/lib/proto/enhanced-rag.ts (138 errors, priority: 138)
- src/lib/server/ai/mcp-context7-embedding-integration.ts (112 errors, priority: 132)
- src/lib/machines/predictive-typing-machine.ts (74 errors, priority: 129)
- src/lib/server/db/jsonb-legal-schema.ts (70 errors, priority: 128)
- src/lib/ai/crewai-legal-team.ts (126 errors, priority: 126)
- src/lib/metrics/gpuSummaryClient.ts (124 errors, priority: 124)
- src/lib/routing/index.ts (81 errors, priority: 123)
- src/lib/server/ai/ollama-local-llm.ts (103 errors, priority: 123)
- src/lib/server/ai/som-bitmap-visualizer.ts (92 errors, priority: 112)
- src/lib/api/ollama-client.ts (70 errors, priority: 110)
- src/lib/optimization/optimization-test-suite.ts (110 errors, priority: 110)
- src/lib/config/gemma3-config.ts (109 errors, priority: 109)
- src/lib/hooks/useRedisOrchestrator.ts (108 errors, priority: 108)
- src/lib/machines/agentShellMachine.ts (86 errors, priority: 106)
- src/lib/server/db/unified-client.ts (45 errors, priority: 105)
- src/lib/ai/enhanced-grpo-processor.ts (104 errors, priority: 104)
- src/lib/machines/recommendation-routing-machine.ts (48 errors, priority: 103)
- src/lib/optimization/index.ts (58 errors, priority: 100)
- src/lib/api/services/vector-service.ts (65 errors, priority: 97)
- src/lib/machines/enhanced-legal-upload-analytics-machine.ts (42 errors, priority: 97)
- src/lib/cuda/ptx-compiler-config.ts (96 errors, priority: 96)
- src/lib/machines/vector-pipeline-machine.ts (41 errors, priority: 96)
- src/lib/machines/canvasEditorMachine.ts (73 errors, priority: 93)
- src/lib/machines/auth-machine.v5.ts (68 errors, priority: 88)
- src/lib/forms/contextual-chat-schema.ts (49 errors, priority: 87)
- src/lib/server/database-pool-service.ts (34 errors, priority: 86)

## 🟢 Priority 3 - Low Impact
453 files with low impact (3965 total errors)

## 📊 Most Common Error Codes
- TS1005: 550 files affected
- TS1128: 321 files affected
- TS1109: 232 files affected
- TS1131: 173 files affected
- TS1434: 125 files affected
- TS1442: 102 files affected
- TS1136: 83 files affected
- TS1003: 82 files affected
- TS1068: 73 files affected
- TS1002: 41 files affected

## 📋 Recommended Fix Order
```
1. src/lib/server/ai/rag-pipeline-enhanced.ts
   └─ 332 errors | Priority: 352
2. src/lib/ai/moogle-graph-synthesizer.ts
   └─ 341 errors | Priority: 341
3. src/lib/server/ai/enhanced-orchestrator.ts
   └─ 237 errors | Priority: 257
4. src/lib/server/ai/rag-pipeline.ts
   └─ 217 errors | Priority: 237
5. src/lib/machines/aiAssistantMachine.ts
   └─ 212 errors | Priority: 232
6. src/lib/machines/workflow-machine.ts
   └─ 160 errors | Priority: 215
7. src/lib/server/db/pgvector-utils.ts
   └─ 161 errors | Priority: 209
8. src/lib/server/ai/vector-search-service.ts
   └─ 155 errors | Priority: 207
9. src/lib/client/secure-storage-client.ts
   └─ 163 errors | Priority: 203
10. src/lib/rag/demo-rag.ts
   └─ 252 errors | Priority: 176
11. src/lib/machines/legalAIMachine.v5.ts
   └─ 155 errors | Priority: 175
12. src/lib/server/graph/evidence-graph-service.ts
   └─ 122 errors | Priority: 174
13. src/lib/server/api-ssr-helpers.ts
   └─ 139 errors | Priority: 159
14. src/lib/server/embedding-cache-service.ts
   └─ 101 errors | Priority: 153
15. src/lib/ai/lod-cache-engine.ts
   └─ 152 errors | Priority: 152
```

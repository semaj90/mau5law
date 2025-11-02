# TypeScript Error Analysis Report
Generated: 2025-11-02T23:18:05.039Z
Total files with errors: 590
Total errors: 12342

## 🔴 Priority 1 - Fix These First (High Impact)
- **src/lib/demo/sampleData.ts** (942 errors, priority: 659)  - Error codes: 1002, 1003, 1005, 1068, 1109, 1121, 1127, 1128, 1144, 1228, 1351, 1434, 1435, 1443, 1489
- **src/lib/machines/ingestion-workflow-machine.ts** (246 errors, priority: 301)  - Error codes: 1005, 1109, 1127, 1128, 1131, 1136, 1137
- **src/lib/server/ai/rag-pipeline-enhanced.ts** (245 errors, priority: 265)  - Error codes: 1002, 1005, 1011, 1109, 1127, 1128, 1131, 1136, 1434, 1435, 2457
- **src/lib/ai/langchain-rag.ts** (232 errors, priority: 232)  - Error codes: 1002, 1003, 1005, 1011, 1068, 1109, 1127, 1128, 1131, 1228, 1434, 1435, 1443
- **src/lib/messaging/rabbitmq-xstate-integration.ts** (195 errors, priority: 195)  - Error codes: 1003, 1005, 1109, 1127, 1128, 1351, 1434, 1435, 1443
- **src/lib/machines/recommendation-routing-machine.ts** (127 errors, priority: 182)  - Error codes: 1005, 1109, 1128, 1136, 1160, 1434, 1443
- **src/lib/server/config/vector-config.ts** (158 errors, priority: 178)  - Error codes: 1127, 1128, 1434, 1435
- **src/lib/server/embedding-cache-service.ts** (113 errors, priority: 165)  - Error codes: 1002, 1005, 1011, 1068, 1109, 1128, 1131, 1434, 1435, 1443
- **src/lib/machines/workflow-machine.ts** (107 errors, priority: 162)  - Error codes: 1003, 1005, 1011, 1109, 1128, 1131, 1136
- **src/lib/server/ai/rag-pipeline.ts** (142 errors, priority: 162)  - Error codes: 1003, 1005, 1011, 1109, 1128, 1434, 1435, 1443
- **src/lib/rag/demo-rag.ts** (223 errors, priority: 156)  - Error codes: 1002, 1003, 1005, 1109, 1127, 1128, 1228, 1434, 1435
- **src/lib/config/gemma3-legal-config.ts** (154 errors, priority: 154)  - Error codes: 1003, 1005, 1109, 1128, 1434, 1435

## 🟡 Priority 2 - Medium Impact
- src/lib/ai/types.ts (107 errors, priority: 144)
- src/lib/server/db/schema-postgres.ts (124 errors, priority: 144)
- src/lib/forms/superforms-xstate-integration.ts (140 errors, priority: 140)
- src/lib/server/db/unified-client.ts (79 errors, priority: 139)
- src/lib/ai/unified-llama-examples.ts (197 errors, priority: 138)
- src/lib/ai/tensorrt-client.ts (97 errors, priority: 137)
- src/lib/orchestration/qlora-ollama-orchestrator.ts (131 errors, priority: 131)
- src/lib/machines/aiAssistantMachine.ts (105 errors, priority: 125)
- src/lib/server/api-ssr-helpers.ts (104 errors, priority: 124)
- src/lib/machines/predictive-typing-machine.ts (68 errors, priority: 123)
- src/lib/server/ai/enhanced-orchestrator.ts (103 errors, priority: 123)
- src/lib/server/db/jsonb-legal-schema.ts (62 errors, priority: 120)
- src/lib/config/gemma3-config.ts (119 errors, priority: 119)
- src/lib/machines/enhanced-legal-upload-analytics-machine.ts (61 errors, priority: 116)
- src/lib/optimization/optimization-test-suite.ts (111 errors, priority: 111)
- src/lib/server/db/pgvector-utils.ts (62 errors, priority: 110)
- src/lib/client/secure-storage-client.ts (67 errors, priority: 107)
- src/lib/machines/legalAIMachine.v5.ts (86 errors, priority: 106)
- src/lib/routing/index.ts (63 errors, priority: 105)
- src/lib/cuda/ptx-compiler-config.ts (104 errors, priority: 104)
- src/lib/ai/enhanced-grpo-processor.ts (103 errors, priority: 103)
- src/lib/machines/agentShellMachine.mcp.ts (80 errors, priority: 100)
- src/lib/machines/graph-cache-machine.ts (42 errors, priority: 97)
- src/lib/ai/lod-cache-engine.ts (96 errors, priority: 96)
- src/lib/server/database-pool-service.ts (44 errors, priority: 96)
- src/lib/server/ai/types.ts (36 errors, priority: 93)
- src/lib/api/ollama-client.ts (49 errors, priority: 89)
- src/lib/database/migrations/migration-system.ts (89 errors, priority: 89)
- src/lib/ai/gpu-acceleration-pipeline.ts (87 errors, priority: 87)
- src/lib/ai/unified-llama.ts (87 errors, priority: 87)

## 🟢 Priority 3 - Low Impact
453 files with low impact (3912 total errors)

## 📊 Most Common Error Codes
- TS1005: 521 files affected
- TS1128: 334 files affected
- TS1109: 210 files affected
- TS1131: 178 files affected
- TS1434: 173 files affected
- TS1011: 121 files affected
- TS1068: 107 files affected
- TS1136: 80 files affected
- TS1003: 76 files affected
- TS1002: 40 files affected

## 📋 Recommended Fix Order
```
1. src/lib/demo/sampleData.ts
   └─ 942 errors | Priority: 659
2. src/lib/machines/ingestion-workflow-machine.ts
   └─ 246 errors | Priority: 301
3. src/lib/server/ai/rag-pipeline-enhanced.ts
   └─ 245 errors | Priority: 265
4. src/lib/ai/langchain-rag.ts
   └─ 232 errors | Priority: 232
5. src/lib/messaging/rabbitmq-xstate-integration.ts
   └─ 195 errors | Priority: 195
6. src/lib/machines/recommendation-routing-machine.ts
   └─ 127 errors | Priority: 182
7. src/lib/server/config/vector-config.ts
   └─ 158 errors | Priority: 178
8. src/lib/server/embedding-cache-service.ts
   └─ 113 errors | Priority: 165
9. src/lib/machines/workflow-machine.ts
   └─ 107 errors | Priority: 162
10. src/lib/server/ai/rag-pipeline.ts
   └─ 142 errors | Priority: 162
11. src/lib/rag/demo-rag.ts
   └─ 223 errors | Priority: 156
12. src/lib/config/gemma3-legal-config.ts
   └─ 154 errors | Priority: 154
13. src/lib/ai/types.ts
   └─ 107 errors | Priority: 144
14. src/lib/server/db/schema-postgres.ts
   └─ 124 errors | Priority: 144
15. src/lib/forms/superforms-xstate-integration.ts
   └─ 140 errors | Priority: 140
```

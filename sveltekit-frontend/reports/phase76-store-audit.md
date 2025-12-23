# Phase 76: Store Audit Report

**Generated**: 12/23/2025, 11:18:48 AM
**Total Files**: 159
**Migration Needed**: 96
**Already Migrated**: 32
**Non-Store Files**: 31

---

## 📊 Summary

| Category | Count | Percentage |
|----------|-------|------------|
| ✅ **Svelte 5 Stores** | 32 | 20.1% |
| 🔴 **Needs Migration** | 96 | 60.4% |
| ⚪ **Not Stores** | 31 | 19.5% |

---

## 🎯 Migration Priority Queue

*Sorted by priority score (higher = migrate first)*

### 🥇 1. `src\lib\stores\_archive\old-stores\chat-store.ts`

**Priority Score**: 2397
**Complexity**: 323 (13 lines)
**Stores**: 16 writable, 9 derived
**Functions**: 0
**Exports**: 33 (chatMessages, currentSession, activeSessions, isConnected, connectionStatus, lastConnectionTime, isTyping, typingUsers, streamingResponse, streamingMessageId, currentAnalysis, ragContext, recommendations, didYouMean, isProcessing, processingStage, processingMetrics, lastError, errorHistory, userAttention, userActivities, chatConfig, messageCount, lastUserMessage, lastAIResponse, conversationSummary, isSessionActive, sessionMetrics, hasRecommendations, hasAnalysis, attentionScore, chatActions, chatStores)
**Dependencies**: 3

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\chat-store.ts
```

---

### 🥇 2. `src\lib\stores\_archive\old-stores\chatStore.ts`

**Priority Score**: 2176
**Complexity**: 274 (29 lines)
**Stores**: 3 writable, 13 derived
**Functions**: 1
**Exports**: 27 (ChatMessage, Conversation, ChatSettings, ServiceStatus, ChatContext, chatStore, serviceStatus, showProactivePrompt, aiPersonality, messages, currentConversation, conversations, isLoading, isStreaming, isTyping, error, settings, modelStatus, contextInjection, conversationsList, isActiveChat, chatActions, serviceActions, XStateCompatibleState, xstateCompatibleStore, useChatActor, persistenceHelpers)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\chatStore.ts
```

---

### 🥇 3. `src\lib\stores\_archive\old-stores\error-handler.ts`

**Priority Score**: 2034
**Complexity**: 376 (26 lines)
**Stores**: 6 writable, 6 derived
**Functions**: 9
**Exports**: 27 (ErrorDetails, UserFriendlyError, ErrorAction, LegalErrorContext, ComplianceViolation, ErrorStats, ErrorFilter, ErrorNotificationSettings, enhancedErrorHandler, handleError, handleApiError, handleNetworkError, handleValidationError, handleAuthError, handleLegalDocumentError, handleChainOfCustodyError, handlePrivilegeViolation, handleCourtFilingError, currentError, errorHistory, errorStats, criticalErrors, complianceViolations, chainOfCustodyErrors, privilegeViolations, recentErrors, errorTrends)
**Dependencies**: 4

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\error-handler.ts
```

---

### 🥈 4. `src\lib\stores\_archive\old-stores\evidence.ts`

**Priority Score**: 1922
**Complexity**: 218 (23 lines)
**Stores**: 1 writable, 8 derived
**Functions**: 3
**Exports**: 21 (Evidence, ChainOfCustodyEntry, AccessLogEntry, AnalysisResult, EvidenceNote, EvidenceFilter, EvidenceStats, EvidenceStoreState, SecurityAlert, evidenceStore, filteredEvidence, selectedEvidence, isEvidenceLoading, evidenceError, evidenceStats, pendingEvidenceIds, allSecurityAlerts, securityAlerts, getUnprocessedEvidence, calculateEvidenceStats, validateChainOfCustody)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidence.ts
```

---

### 🥈 5. `src\lib\stores\_archive\old-stores\component-adapter-store.ts`

**Priority Score**: 1728
**Complexity**: 152 (22 lines)
**Stores**: 2 writable, 0 derived
**Functions**: 5
**Exports**: 16 (ComponentState, UIProps, ComponentAdapter, createComponentAdapter, ChatMessage, ChatData, createChatAdapter, SearchResult, SearchData, createSearchAdapter, UploadData, createUploadAdapter, FormData, createFormAdapter, componentRegistry, svelte5Utils)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\component-adapter-store.ts
```

---

### 🥈 6. `src\lib\stores\_archive\old-stores\evidence-store.ts`

**Priority Score**: 1727
**Complexity**: 23 (8 lines)
**Stores**: 0 writable, 1 derived
**Functions**: 0
**Exports**: 13 (ChainOfCustodyEntry, LabAnalysis, AIAnalysis, CanvasPosition, Evidence, UploadFile, EvidenceGridState, UploadModalState, evidenceGrid, uploadModal, filteredEvidence, evidenceActions, uploadActions)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidence-store.ts
```

---

### 🥈 7. `src\lib\stores\_archive\old-stores\ui.ts`

**Priority Score**: 1694
**Complexity**: 56 (11 lines)
**Stores**: 3 writable, 1 derived
**Functions**: 0
**Exports**: 13 (ContextMenuState, contextMenuStore, contextMenuActions, theme, colorScheme, notifications, modals, loading, sidebar, motion, forms, isDarkMode, uiStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\ui.ts
```

---

### 🥈 8. `src\lib\stores\_archive\old-stores\detectiveBoard.ts`

**Priority Score**: 1677
**Complexity**: 373 (23 lines)
**Stores**: 3 writable, 4 derived
**Functions**: 13
**Exports**: 19 (AIMessage, AISuggestion, AIContext, CaseAIContext, AIInsight, aiAssistantContexts, currentAIContext, aiProcessing, currentMessages, currentInsights, unacknowledgedInsights, priorityInsights, initializeCaseAI, switchToCase, updateAIContext, addMessage, addInsight, acknowledgeInsight, clearMessages)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\detectiveBoard.ts
```

---

### 🥈 9. `src\lib\stores\_archive\old-stores\redis-orchestrator-store.ts`

**Priority Score**: 1643
**Complexity**: 107 (12 lines)
**Stores**: 5 writable, 3 derived
**Functions**: 0
**Exports**: 13 (RedisStats, RedisOptimizationResult, QueuedTask, redisStats, isRedisHealthy, queuedTasks, cacheHitRate, processingTimes, averageProcessingTime, totalQueuedTasks, memoryPressure, RedisOrchestratorClient, redisOrchestratorClient)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\redis-orchestrator-store.ts
```

---

### 🥈 10. `src\lib\stores\_archive\old-stores\enhancedLokiStore.ts`

**Priority Score**: 1641
**Complexity**: 59 (14 lines)
**Stores**: 0 writable, 3 derived
**Functions**: 0
**Exports**: 12 (CacheConfig, SyncOperation, CacheStats, CollectionStats, IndexStrategy, enhancedLokiDB, enhancedLokiStore, evidenceCacheStore, cacheStatsStore, cacheHealthStore, enhancedLoki, lokiStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\enhancedLokiStore.ts
```

---

### 🥉 11. `src\lib\stores\_archive\old-stores\legal-reports.ts`

**Priority Score**: 1616
**Complexity**: 304 (29 lines)
**Stores**: 3 writable, 2 derived
**Functions**: 10
**Exports**: 17 (LegalReport, ReportSection, ReportComment, GenerationEntry, ReportTemplate, TemplateSectionDefinition, TemplateVariable, ReportFilters, ReportStats, legalReports, reportTemplates, reportFilters, filteredReports, reportStats, reportsManager, setReportFilter, clearReportFilters)
**Dependencies**: 3

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\legal-reports.ts
```

---

### 🥉 12. `src\lib\stores\_archive\old-stores\ai-store.ts`

**Priority Score**: 1607
**Complexity**: 73 (13 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 0
**Exports**: 12 (Gemma3Config, Message, AIConversationState, AISettingsState, AIStatusState, aiConversation, aiSettings, aiStatus, conversationHistory, isAIReady, currentModelInfo, aiStore)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\ai-store.ts
```

---

### 🥉 13. `src\lib\stores\_archive\old-stores\ai-unified.ts`

**Priority Score**: 1602
**Complexity**: 98 (8 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 2
**Exports**: 12 (AIState, aiStore, aiCommandResult, applyAIClasses, addCommand, setCurrentCommand, setProcessing, setError, clearHistory, aiCommandService, recentCommands, isAIActive)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\ai-unified.ts
```

---

### 🥉 14. `src\lib\stores\clustering.ts`

**Priority Score**: 1585
**Complexity**: 505 (190 lines)
**Stores**: 6 writable, 6 derived
**Functions**: 8
**Exports**: 20 (clusterCategories, selectedClusters, hoveredCluster, statuteClusterMap, clusterFilter, clusterStats, selectedCategories, getClusterById, getStatuteMetadata, selectedClusterCount, hasSelectedClusters, flaggedCount, toggleCluster, clearClusterSelection, setStatuteMetadata, setStatuteMetadataBatch, updateClusterCategories, updateClusterStats, setClusterFilter, resetClusteringState)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\clustering.ts
```

---

### 🥉 15. `src\lib\stores\_archive\old-stores\caseStore.ts`

**Priority Score**: 1480
**Complexity**: 110 (5 lines)
**Stores**: 1 writable, 6 derived
**Functions**: 0
**Exports**: 10 (CaseWithRelations, CaseState, CaseStoreAPI, caseStore, activeCaseId, activeCase, filteredCases, casesLoading, casesError, casesPagination)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\caseStore.ts
```

---

### 🥉 16. `src\lib\stores\_archive\old-stores\langchain-service-store.ts`

**Priority Score**: 1476
**Complexity**: 104 (34 lines)
**Stores**: 3 writable, 2 derived
**Functions**: 0
**Exports**: 10 (LangChainState, DocumentProcessingState, ProcessedDocument, ChatState, langchainServiceLogic, langchainService, documentProcessing, chatService, isLangChainReady, availableModels)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\langchain-service-store.ts
```

---

### 🥉 17. `src\lib\stores\_archive\old-stores\realtime.ts`

**Priority Score**: 1476
**Complexity**: 124 (14 lines)
**Stores**: 4 writable, 2 derived
**Functions**: 2
**Exports**: 10 (StageStatus, FinalResultEntry, connectionStatus, stages, finalResults, recentEvents, connectRealtime, disconnectRealtime, activePipelines, completedPipelines)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\realtime.ts
```

---

### 🥉 18. `src\lib\stores\unified\canvas-store.ts`

**Priority Score**: 1475
**Complexity**: 65 (5 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 9 (CanvasElement, CanvasConnection, CanvasState, CollaboratorCursor, CanvasHistoryEntry, canvasStore, canvasElements, canvasConnections, selectedElements)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\canvas-store.ts
```

---

### 🥉 19. `src\lib\stores\unified\notification-store.ts`

**Priority Score**: 1444
**Complexity**: 96 (6 lines)
**Stores**: 1 writable, 5 derived
**Functions**: 0
**Exports**: 9 (Toast, Notification, Alert, notificationStore, notifications, unreadCount, toasts, alerts, activeAlerts)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\notification-store.ts
```

---

### 🥉 20. `src\lib\stores\dashboard\DocumentProgressStore.ts`

**Priority Score**: 1440
**Complexity**: 550 (325 lines)
**Stores**: 1 writable, 14 derived
**Functions**: 0
**Exports**: 18 (PageStatus, ProcessingError, ProgressState, documentProgressStore, overallProgress, currentStage, etaSeconds, currentPage, totalPages, pageStatusesArray, completedPagesCount, errorPagesCount, processingStatus, processingDetails, isProcessing, fallbackActive, fallbackConfidence, errors)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\dashboard\DocumentProgressStore.ts
```

---

### 🥉 21. `src\lib\stores\_archive\old-stores\barrel-store-manager.ts`

**Priority Score**: 1418
**Complexity**: 52 (12 lines)
**Stores**: 1 writable, 1 derived
**Functions**: 0
**Exports**: 8 (StoreMetadata, BarrelStoreEntry, StoreConfig, BarrelStoreManager, barrelStore, legalAIStores, legalAIComputed, storeUtils)
**Dependencies**: 3

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\barrel-store-manager.ts
```

---

### 🥉 22. `src\lib\stores\unified\ai-assistant-store.ts`

**Priority Score**: 1409
**Complexity**: 81 (6 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 8 (Message, Conversation, AnalysisContext, aiAssistantStore, messages, isProcessing, currentConversation, conversations)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\ai-assistant-store.ts
```

---

### 🥉 23. `src\lib\stores\_archive\old-stores\cases.ts`

**Priority Score**: 1409
**Complexity**: 41 (6 lines)
**Stores**: 2 writable, 1 derived
**Functions**: 0
**Exports**: 7 (cases, caseSearch, caseFilters, filteredCases, selectedCase, sidebarOpen, caseStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\cases.ts
```

---

### 🥉 24. `src\lib\stores\ingestionWatcherStore.ts`

**Priority Score**: 1407
**Complexity**: 593 (328 lines)
**Stores**: 4 writable, 3 derived
**Functions**: 9
**Exports**: 18 (PipelineStatus, ProcessingEvent, pipelineStatus, isConnected, recentEvents, errorLog, processingRate, successRate, duplicateRate, connectToPipeline, disconnectFromPipeline, sendPipelineCommand, startPipeline, stopPipeline, resetMetrics, clearErrorLog, clearRecentEvents, exportMetrics)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\ingestionWatcherStore.ts
```

---

### 🥉 25. `src\lib\stores\unified\search-store.ts`

**Priority Score**: 1394
**Complexity**: 86 (6 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 8 (SearchResult, SearchFilters, SavedSearch, searchStore, searchResults, totalResults, isSearching, activeFilters)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\search-store.ts
```

---

### 🥉 26. `src\lib\stores\_archive\old-stores\alerts.ts`

**Priority Score**: 1389
**Complexity**: 161 (11 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 7
**Exports**: 9 (Alert, alerts, pushAlert, removeAlert, clearAlerts, showSuccess, showError, showInfo, showWarning)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\alerts.ts
```

---

### 🥉 27. `src\lib\stores\_archive\old-stores\saved-notes.ts`

**Priority Score**: 1387
**Complexity**: 163 (13 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 5
**Exports**: 9 (SavedNote, NoteFilters, savedNotes, noteFilters, filteredNotes, noteStats, notesManager, setNoteFilter, clearNoteFilters)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\saved-notes.ts
```

---

### 🥉 28. `src\lib\stores\_archive\old-stores\ai-agent.ts`

**Priority Score**: 1365
**Complexity**: 25 (10 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 6 (AIAgentState, ProcessingJob, SimilarDocument, CitationSource, AIError, aiAgentStore)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\ai-agent.ts
```

---

### 🥉 29. `src\lib\stores\metrics.ts`

**Priority Score**: 1363
**Complexity**: 227 (62 lines)
**Stores**: 0 writable, 4 derived
**Functions**: 5
**Exports**: 10 (metricsState, metrics, metricsError, isUpdating, isFailed, fetchMetrics, retryMetrics, resetMetrics, setMetricsSuccess, setMetricsError)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\metrics.ts
```

---

### 🥉 30. `src\lib\stores\_archive\old-stores\legal-poi.ts`

**Priority Score**: 1363
**Complexity**: 267 (7 lines)
**Stores**: 5 writable, 0 derived
**Functions**: 10
**Exports**: 11 (PersonOfInterest, POIFilters, POISearchQuery, POIAnalytics, poiMachine, poiStore, networkAnalysisStore, riskMonitoringStore, savedSearchesStore, mostWantedStore, surveillanceStore)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\legal-poi.ts
```

---

### 🥉 31. `src\lib\stores\_archive\old-stores\loading-store.ts`

**Priority Score**: 1362
**Complexity**: 38 (8 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 1
**Exports**: 6 (LoadingOperation, loadingStore, aiLoading, gpuLoading, uploadLoading, withLoadingTimeout)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\loading-store.ts
```

---

### 🥉 32. `src\lib\stores\search.ts`

**Priority Score**: 1357
**Complexity**: 193 (113 lines)
**Stores**: 4 writable, 0 derived
**Functions**: 2
**Exports**: 9 (SearchResultChunk, AlignmentSignals, SearchResponse, searchResults, searchAlignment, searchReasoning, searchLoading, searchError, clearSearch)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\search.ts
```

---

### 🥉 33. `src\lib\stores\_archive\old-stores\dialogs.ts`

**Priority Score**: 1355
**Complexity**: 35 (10 lines)
**Stores**: 2 writable, 0 derived
**Functions**: 0
**Exports**: 6 (Dialog, Modal, dialogStore, modalStore, dialog, modal)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\dialogs.ts
```

---

### 🥉 34. `src\lib\stores\_archive\old-stores\casesStore.ts`

**Priority Score**: 1354
**Complexity**: 46 (6 lines)
**Stores**: 4 writable, 0 derived
**Functions**: 0
**Exports**: 6 (CaseStoreData, casesStore, activeCases, caseStats, filterState, casesActions)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\casesStore.ts
```

---

### 🥉 35. `src\lib\stores\_archive\old-stores\evidence-unified-fixed.ts`

**Priority Score**: 1351
**Complexity**: 49 (9 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 0
**Exports**: 6 (Evidence, EvidenceStoreState, evidenceStore, evidenceById, evidenceByCase, evidence)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidence-unified-fixed.ts
```

---

### 🥉 36. `src\lib\stores\_archive\old-stores\evidence-unified.ts`

**Priority Score**: 1351
**Complexity**: 49 (9 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 0
**Exports**: 6 (Evidence, EvidenceStoreState, evidenceStore, evidenceById, evidenceByCase, evidence)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidence-unified.ts
```

---

### 🥉 37. `src\lib\stores\_archive\old-stores\canvas.ts`

**Priority Score**: 1348
**Complexity**: 2 (2 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 5 (sidebarStore, toolbarStore, canvasStore, aiStore, uploadStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\canvas.ts
```

---

### 🥉 38. `src\lib\stores\canvas.ts`

**Priority Score**: 1346
**Complexity**: 204 (54 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 7
**Exports**: 9 (sidebarStore, openSidebar, closeSidebar, toggleSidebar, defaultTransition, slideParams, fadeParams, prefersReducedMotion, motionSafeParams)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\canvas.ts
```

---

### 🥉 39. `src\lib\stores\_archive\old-stores\ai.ts`

**Priority Score**: 1342
**Complexity**: 8 (8 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 5 (AIContext, aiGlobalMachine, aiGlobalActor, aiGlobalStore, aiGlobalActions)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\ai.ts
```

---

### 🥉 40. `src\lib\stores\unified\evidence-store.ts`

**Priority Score**: 1340
**Complexity**: 50 (5 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 0
**Exports**: 6 (EvidenceFile, ChainOfCustodyEntry, AnalysisResult, evidenceStore, evidence, filteredEvidence)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\evidence-store.ts
```

---

### 🥉 41. `src\lib\stores\_archive\old-stores\vector-search.ts`

**Priority Score**: 1339
**Complexity**: 61 (6 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 6 (VectorSearchState, vectorSearchStore, isVectorSearchActive, hasSearchResults, averageSearchLatency, vectorSearchActions)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\vector-search.ts
```

---

### 🥉 42. `src\lib\stores\unified\case-store.ts`

**Priority Score**: 1325
**Complexity**: 65 (5 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 6 (Case, CaseFilters, caseStore, cases, filteredCases, activeCase)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\case-store.ts
```

---

### 🥉 43. `src\lib\stores\_archive\old-stores\userActivityStore.ts`

**Priority Score**: 1306
**Complexity**: 84 (9 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 6 (userActivityDetector, userActivity, forceUserActivity, setIdleThreshold, getActivitySummary, getRecentActivity)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\userActivityStore.ts
```

---

### 🥉 44. `src\lib\stores\_archive\old-stores\enhanced-saved-notes.ts`

**Priority Score**: 1304
**Complexity**: 266 (21 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 9
**Exports**: 10 (LegalNote, NoteFilters, NoteStats, legalNotes, noteFilters, filteredNotes, noteStats, enhancedNotesManager, setNoteFilter, clearNoteFilters)
**Dependencies**: 3

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\enhanced-saved-notes.ts
```

---

### 🥉 45. `src\lib\stores\_archive\old-stores\aiRecommendations.ts`

**Priority Score**: 1288
**Complexity**: 52 (7 lines)
**Stores**: 4 writable, 0 derived
**Functions**: 0
**Exports**: 5 (recommendations, partialRecommendations, engineState, errorMessage, runQuery)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\aiRecommendations.ts
```

---

### 🥉 46. `src\lib\stores\_archive\old-stores\legal-citations.ts`

**Priority Score**: 1287
**Complexity**: 273 (23 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 9
**Exports**: 10 (LegalCitation, CitationFilters, CitationStats, legalCitations, citationFilters, filteredCitations, citationStats, citationsManager, setCitationFilter, clearCitationFilters)
**Dependencies**: 4

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\legal-citations.ts
```

---

### 🥉 47. `src\lib\stores\theme.ts`

**Priority Score**: 1286
**Complexity**: 114 (64 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 2
**Exports**: 6 (YoRHaTheme, yorhaTheme, theme, terminalThemes, setTerminalTheme, resetTheme)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\theme.ts
```

---

### 🥉 48. `src\lib\stores\_archive\old-stores\notification.ts`

**Priority Score**: 1281
**Complexity**: 19 (9 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 4 (NotificationAction, Notification, NotificationState, notifications)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\notification.ts
```

---

### 🥉 49. `src\lib\stores\unified.ts`

**Priority Score**: 1266
**Complexity**: 364 (204 lines)
**Stores**: 3 writable, 0 derived
**Functions**: 6
**Exports**: 11 (UserStoreState, user, AIMessage, AIAssistantStoreState, aiAssistant, sendToAIAssistant, websocketStore, subscribeToCase, isEvidenceBeingEdited, getActiveEditorsForEvidence, formatRecentActivity)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified.ts
```

---

### 🥉 50. `src\lib\stores\_archive\old-stores\notifications.ts`

**Priority Score**: 1266
**Complexity**: 24 (9 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 4 (Notification, NotificationOptions, notificationStore, notify)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\notifications.ts
```

---

### 🥉 51. `src\lib\stores\user.ts`

**Priority Score**: 1250
**Complexity**: 200 (80 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 4
**Exports**: 7 (UserSession, userStore, isAuthenticated, userDisplayName, setUserSession, clearUserSession, updateUserProfile)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\user.ts
```

---

### 🥉 52. `src\lib\stores\_archive\old-stores\enhanced-upload-machine.ts`

**Priority Score**: 1242
**Complexity**: 8 (8 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 3 (EnhancedUploadContext, enhancedUploadMachine, enhancedUploadStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\enhanced-upload-machine.ts
```

---

### 🥉 53. `src\lib\stores\_archive\old-stores\citations.ts`

**Priority Score**: 1232
**Complexity**: 18 (8 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 3 (Citation, CitationStore, citationStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\citations.ts
```

---

### 🥉 54. `src\lib\stores\_archive\old-stores\modal.ts`

**Priority Score**: 1232
**Complexity**: 18 (8 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 3 (ModalConfig, ModalState, modals)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\modal.ts
```

---

### 🥉 55. `src\lib\stores\_archive\old-stores\upload-machine.ts`

**Priority Score**: 1226
**Complexity**: 14 (9 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 3 (UploadContext, uploadMachine, uploadStore)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\upload-machine.ts
```

---

### 🥉 56. `src\lib\stores\_archive\old-stores\enhancedStateMachines.ts`

**Priority Score**: 1224
**Complexity**: 776 (666 lines)
**Stores**: 0 writable, 6 derived
**Functions**: 1
**Exports**: 18 (Evidence, EnhancedAIContext, ProcessingResult, VectorMatch, AIAnalysis, GraphNode, GraphConnection, StreamingUpdate, ProcessingError, evidenceProcessingMachine, evidenceProcessingStore, currentlyProcessingStore, processingResultsStore, aiRecommendationsStore, vectorSimilarityStore, graphRelationshipsStore, systemHealthStore, streamingStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\enhancedStateMachines.ts
```

---

### 🥉 57. `src\lib\stores\_archive\old-stores\user.analytics.ts`

**Priority Score**: 1215
**Complexity**: 35 (5 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 1
**Exports**: 3 (UserEvent, userEvents, analyticsService)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\user.analytics.ts
```

---

### 🥉 58. `src\lib\stores\_archive\old-stores\pipeline.ts`

**Priority Score**: 1214
**Complexity**: 136 (81 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 5 (PipelineEventBase, EvidenceUploadEvent, AIResponseEvent, pipeline, pipeline)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\pipeline.ts
```

---

### 🥉 59. `src\lib\stores\_archive\old-stores\lokiStore.ts`

**Priority Score**: 1196
**Complexity**: 4 (4 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 2 (lokiStore, loki)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\lokiStore.ts
```

---

### 🥉 60. `src\lib\stores\_archive\old-stores\user.ts`

**Priority Score**: 1196
**Complexity**: 4 (4 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 2 (User, user)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\user.ts
```

---

### 🥉 61. `src\lib\stores\uploadStore.ts`

**Priority Score**: 1194
**Complexity**: 196 (121 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 6 (uploadStore, isUploading, isProcessing, isComplete, hasError, uploadActions)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\uploadStore.ts
```

---

### 🥉 62. `src\lib\stores\_archive\old-stores\legal-platform-integration.ts`

**Priority Score**: 1193
**Complexity**: 127 (17 lines)
**Stores**: 0 writable, 1 derived
**Functions**: 4
**Exports**: 5 (LegalCase, CrossSystemInsights, legalPlatformMachine, legalPlatformStore, dashboardStore)
**Dependencies**: 3

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\legal-platform-integration.ts
```

---

### 🥉 63. `src\lib\stores\_archive\old-stores\cases-fallback.ts`

**Priority Score**: 1188
**Complexity**: 12 (2 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 2 (selectedCase, casesStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\cases-fallback.ts
```

---

### 🥉 64. `src\lib\stores\ai-store.ts`

**Priority Score**: 1187
**Complexity**: 253 (178 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 7 (AIMessage, AIState, aiStore, messageCount, lastMessage, isLoading, currentError)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\ai-store.ts
```

---

### 🥉 65. `src\lib\stores\lokiStore.ts`

**Priority Score**: 1183
**Complexity**: 117 (107 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 4 (Item, RefreshableCollection, lokiStore, loki)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\lokiStore.ts
```

---

### 🥉 66. `src\lib\stores\_archive\old-stores\analyticsStore.ts`

**Priority Score**: 1177
**Complexity**: 23 (3 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 1
**Exports**: 2 (logAnalyticsEvent, analyticsStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\analyticsStore.ts
```

---

### 🥉 67. `src\lib\stores\errorStore.ts`

**Priority Score**: 1172
**Complexity**: 78 (28 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 2
**Exports**: 3 (toasts, pushToast, removeToast)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\errorStore.ts
```

---

### 🥉 68. `src\lib\stores\keyboardShortcutsStore.ts`

**Priority Score**: 1168
**Complexity**: 32 (2 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 1
**Exports**: 2 (ShortcutItem, keyboardShortcuts)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\keyboardShortcutsStore.ts
```

---

### 🥉 69. `src\lib\stores\reports-live.ts`

**Priority Score**: 1167
**Complexity**: 33 (3 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 1
**Exports**: 2 (liveReports, connectReportsStream)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\reports-live.ts
```

---

### 🥉 70. `src\lib\stores\_archive\old-stores\avatarStore.ts`

**Priority Score**: 1165
**Complexity**: 25 (10 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 2 (AvatarState, avatarStore)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\avatarStore.ts
```

---

### 🥉 71. `src\lib\stores\toast.ts`

**Priority Score**: 1156
**Complexity**: 44 (34 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 2 (Toast, toastStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\toast.ts
```

---

### 🥉 72. `src\lib\stores\_archive\old-stores\aiHistoryStore.ts`

**Priority Score**: 1147
**Complexity**: 3 (3 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 1 (aiHistory)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\aiHistoryStore.ts
```

---

### 🥉 73. `src\lib\stores\ui-store.ts`

**Priority Score**: 1146
**Complexity**: 654 (429 lines)
**Stores**: 7 writable, 5 derived
**Functions**: 4
**Exports**: 14 (TypewriterPrompt, UploadedFile, AIMetadata, TimelineEvent, EmotionAnalysis, SceneAnalysis, ExtractedEntity, AutoPopulatedForm, MarkdownScene, UIState, createUIStore, setUIStore, getUIStore, getGlobalUIStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\ui-store.ts
```

---

### 🥉 74. `src\lib\stores\machines\enhancedRagMachine.ts`

**Priority Score**: 1133
**Complexity**: 117 (117 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 0
**Exports**: 3 (RagContext, enhancedRagMachine, enhancedRagStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\machines\enhancedRagMachine.ts
```

---

### 🥉 75. `src\lib\stores\reports.ts`

**Priority Score**: 1133
**Complexity**: 117 (57 lines)
**Stores**: 2 writable, 0 derived
**Functions**: 2
**Exports**: 3 (reports, activeReport, isSaving)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\reports.ts
```

---

### 🥉 76. `src\lib\stores\_archive\old-stores\chat-history.ts`

**Priority Score**: 1124
**Complexity**: 76 (16 lines)
**Stores**: 2 writable, 0 derived
**Functions**: 2
**Exports**: 2 (chatSessions, chatMessages)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\chat-history.ts
```

---

### 🥉 77. `src\lib\stores\evidenceCommandCenter.store.ts`

**Priority Score**: 1123
**Complexity**: 77 (52 lines)
**Stores**: 1 writable, 1 derived
**Functions**: 0
**Exports**: 2 (evidenceCommandCenter, hasSelection)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\evidenceCommandCenter.store.ts
```

---

### 🥉 78. `src\lib\stores\_archive\old-stores\current-user.ts`

**Priority Score**: 1118
**Complexity**: 32 (12 lines)
**Stores**: 0 writable, 0 derived
**Functions**: 1
**Exports**: 1 (currentUser)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\current-user.ts
```

---

### 🥉 79. `src\lib\stores\_archive\old-stores\keyboardShortcuts.ts`

**Priority Score**: 1110
**Complexity**: 190 (100 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 4
**Exports**: 4 (Shortcut, keyboardShortcuts, registerShortcut, unregisterShortcut)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\keyboardShortcuts.ts
```

---

### 🥉 80. `src\lib\stores\dashboard\SSEStatusStore.ts`

**Priority Score**: 1105
**Complexity**: 295 (240 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 6 (SSEConnectionState, ProcessingEvent, sseStatusStore, isConnected, connectionError, connectionStatus)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\dashboard\SSEStatusStore.ts
```

---

### 🥉 81. `src\lib\stores\enhanced-rag-store.ts`

**Priority Score**: 1092
**Complexity**: 58 (48 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 1 (enhancedRAGStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\enhanced-rag-store.ts
```

---

### 🥉 82. `src\lib\stores\xstateIntegration.ts`

**Priority Score**: 1090
**Complexity**: 260 (120 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 5
**Exports**: 5 (useMachine, machineState, machineContext, machineCleanup, createMachineStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\xstateIntegration.ts
```

---

### 🥉 83. `src\lib\stores\chat-context.ts`

**Priority Score**: 1087
**Complexity**: 103 (88 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 2 (ChatContextItem, chatContext)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\chat-context.ts
```

---

### 🥉 84. `src\lib\stores\evidence-unified.ts`

**Priority Score**: 1081
**Complexity**: 59 (44 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 1 (evidenceStore)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\evidence-unified.ts
```

---

### 🥉 85. `src\lib\stores\_archive\old-stores\recommendations.ts`

**Priority Score**: 1078
**Complexity**: 452 (387 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 9 (Recommendation, TrendItem, UserAnalytics, RecommendationState, recommendationStore, highPriorityRecommendations, recommendationsByType, userProductivityScore, recommendationActions)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\recommendations.ts
```

---

### 🥉 86. `src\lib\stores\_archive\old-stores\redis-component-store.ts`

**Priority Score**: 1057
**Complexity**: 343 (233 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 5
**Exports**: 6 (redisComponentStore, createRedisBackedState, cacheComponentMetadata, getComponentMetadata, cacheEvidenceAnalysis, getEvidenceAnalysis)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\redis-component-store.ts
```

---

### 🥉 87. `src\lib\stores\notes.ts`

**Priority Score**: 1037
**Complexity**: 353 (158 lines)
**Stores**: 2 writable, 2 derived
**Functions**: 7
**Exports**: 6 (legalNotes, noteFilters, filteredNotes, noteStats, setNoteFilter, clearNoteFilters)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\notes.ts
```

---

### 🥉 88. `src\lib\stores\unified\poi-store.ts`

**Priority Score**: 1027
**Complexity**: 453 (388 lines)
**Stores**: 1 writable, 3 derived
**Functions**: 0
**Exports**: 8 (PersonOfInterest, POIRelationship, TimelineEvent, POICluster, poiStore, pois, activePOI, relationships)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\poi-store.ts
```

---

### 🥉 89. `src\lib\stores\unified\citation-store.ts`

**Priority Score**: 1023
**Complexity**: 407 (327 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 7 (Citation, CitationCluster, citationStore, citations, filteredCitations, activeCitation, similarCitations)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\citation-store.ts
```

---

### 🥉 90. `src\lib\stores\_archive\old-stores\tables.ts`

**Priority Score**: 1011
**Complexity**: 429 (339 lines)
**Stores**: 1 writable, 1 derived
**Functions**: 3
**Exports**: 7 (TableState, TableNotification, tableManager, createTableStats, legalAITableConfigs, formatTableData, exportTableData)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\tables.ts
```

---

### 🥉 91. `src\lib\stores\_archive\old-stores\form.ts`

**Priority Score**: 929
**Complexity**: 321 (281 lines)
**Stores**: 1 writable, 2 derived
**Functions**: 0
**Exports**: 3 (FormField, FormState, FormOptions)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\form.ts
```

---

### 🥉 92. `src\lib\stores\app-store.ts`

**Priority Score**: 886
**Complexity**: 414 (404 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 4 (AppState, appStore, appActions, storeSelectors)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\app-store.ts
```

---

### 🥉 93. `src\lib\stores\unified\user-store.ts`

**Priority Score**: 849
**Complexity**: 431 (326 lines)
**Stores**: 1 writable, 4 derived
**Functions**: 0
**Exports**: 5 (userStore, isAuthenticated, currentUser, userLoading, userError)
**Dependencies**: 7

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\user-store.ts
```

---

### 🥉 94. `src\lib\stores\unified\report-store.ts`

**Priority Score**: 815
**Complexity**: 425 (410 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 0
**Exports**: 3 (ReportSection, Report, reportStore)
**Dependencies**: 1

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\unified\report-store.ts
```

---

### 🥉 95. `src\lib\stores\_archive\old-stores\enhanced-rag-store.ts`

**Priority Score**: 762
**Complexity**: 618 (578 lines)
**Stores**: 1 writable, 0 derived
**Functions**: 1
**Exports**: 6 (SearchResult, RAGSystemStatus, MLCachingMetrics, RAGStoreState, createEnhancedRAGStore, enhancedRAGStore)
**Dependencies**: 2

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\enhanced-rag-store.ts
```

---

### 🥉 96. `src\lib\stores\_archive\old-stores\evidenceStore.ts`

**Priority Score**: 606
**Complexity**: 644 (584 lines)
**Stores**: 3 writable, 2 derived
**Functions**: 0
**Exports**: 3 (Evidence, EvidenceOperation, evidenceStore)
**Dependencies**: 0

**Migration Command**:
```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidenceStore.ts
```

---

## ✅ Already Migrated (Svelte 5)

- ✅ `src\lib\stores\appState.svelte.ts` (15 lines, 1 exports)
- ✅ `src\lib\stores\gpu-summary-store.svelte.ts` (47 lines, 3 exports)
- ✅ `src\lib\stores\knowledge-search.svelte.ts` (312 lines, 3 exports)
- ✅ `src\lib\stores\preferences.svelte.ts` (276 lines, 1 exports)
- ✅ `src\lib\stores\tokenUsage.svelte.ts` (166 lines, 1 exports)
- ✅ `src\lib\stores\_archive\old-stores\ai-assistant-unified.svelte.ts` (5 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\ai-assistant.svelte.ts` (12 lines, 4 exports)
- ✅ `src\lib\stores\_archive\old-stores\ai-chat-store.svelte.ts` (7 lines, 24 exports)
- ✅ `src\lib\stores\_archive\old-stores\aiAssistant.svelte.ts` (11 lines, 20 exports)
- ✅ `src\lib\stores\_archive\old-stores\analyticsStore.svelte.ts` (10 lines, 9 exports)
- ✅ `src\lib\stores\_archive\old-stores\auth.svelte.ts` (23 lines, 15 exports)
- ✅ `src\lib\stores\_archive\old-stores\chat.svelte.ts` (29 lines, 19 exports)
- ✅ `src\lib\stores\_archive\old-stores\comprehensive-package-barrel-store.svelte.ts` (2 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\enhanced-auth.svelte.ts` (20 lines, 7 exports)
- ✅ `src\lib\stores\_archive\old-stores\evidence-global-store.svelte.ts` (585 lines, 7 exports)
- ✅ `src\lib\stores\_archive\old-stores\evidence-workflow.svelte.ts` (12 lines, 15 exports)
- ✅ `src\lib\stores\_archive\old-stores\feedback-store.svelte.ts` (8 lines, 5 exports)
- ✅ `src\lib\stores\_archive\old-stores\form.svelte.ts` (282 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\global-user-store.svelte.ts` (550 lines, 8 exports)
- ✅ `src\lib\stores\_archive\old-stores\gpu-metrics-runes.svelte.ts` (8 lines, 2 exports)
- ✅ `src\lib\stores\_archive\old-stores\gpu-summary-store.svelte.ts` (18 lines, 12 exports)
- ✅ `src\lib\stores\_archive\old-stores\legal-case.store.svelte.ts` (348 lines, 7 exports)
- ✅ `src\lib\stores\_archive\old-stores\legal-case.svelte.ts` (8 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\redis-state.svelte.ts` (10 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\report.svelte.ts` (9 lines, 12 exports)
- ✅ `src\lib\stores\_archive\old-stores\sessionManager.svelte.ts` (5 lines, 12 exports)
- ✅ `src\lib\stores\_archive\old-stores\sessionStore.svelte.ts` (98 lines, 5 exports)
- ✅ `src\lib\stores\_archive\old-stores\system-health-store.svelte.ts` (14 lines, 3 exports)
- ✅ `src\lib\stores\_archive\old-stores\userDataStore.svelte.ts` (16 lines, 38 exports)
- ✅ `src\lib\stores\_archive\old-stores\websocket-store.svelte.ts` (6 lines, 4 exports)
- ✅ `src\lib\stores\_archive\old-stores\xstate-service-adapter.svelte.ts` (19 lines, 12 exports)
- ✅ `src\lib\stores\_archive\_old-stores\sessionStore.svelte.ts` (21 lines, 7 exports)

---

## 📋 Detailed Analysis

| File | Lines | Writable | Derived | Functions | Priority |
|------|-------|----------|---------|-----------|----------|
| `src\lib\stores\_archive\old-stores\chat-store.ts` | 13 | 16 | 9 | 0 | 2397 |
| `src\lib\stores\_archive\old-stores\chatStore.ts` | 29 | 3 | 13 | 1 | 2176 |
| `src\lib\stores\_archive\old-stores\error-handler.ts` | 26 | 6 | 6 | 9 | 2034 |
| `src\lib\stores\_archive\old-stores\evidence.ts` | 23 | 1 | 8 | 3 | 1922 |
| `src\lib\stores\_archive\old-stores\component-adapter-store.ts` | 22 | 2 | 0 | 5 | 1728 |
| `src\lib\stores\_archive\old-stores\evidence-store.ts` | 8 | 0 | 1 | 0 | 1727 |
| `src\lib\stores\_archive\old-stores\ui.ts` | 11 | 3 | 1 | 0 | 1694 |
| `src\lib\stores\_archive\old-stores\detectiveBoard.ts` | 23 | 3 | 4 | 13 | 1677 |
| `src\lib\stores\_archive\old-stores\redis-orchestrator-store.ts` | 12 | 5 | 3 | 0 | 1643 |
| `src\lib\stores\_archive\old-stores\enhancedLokiStore.ts` | 14 | 0 | 3 | 0 | 1641 |
| `src\lib\stores\_archive\old-stores\legal-reports.ts` | 29 | 3 | 2 | 10 | 1616 |
| `src\lib\stores\_archive\old-stores\ai-store.ts` | 13 | 2 | 2 | 0 | 1607 |
| `src\lib\stores\_archive\old-stores\ai-unified.ts` | 8 | 2 | 2 | 2 | 1602 |
| `src\lib\stores\clustering.ts` | 190 | 6 | 6 | 8 | 1585 |
| `src\lib\stores\_archive\old-stores\caseStore.ts` | 5 | 1 | 6 | 0 | 1480 |
| `src\lib\stores\_archive\old-stores\langchain-service-store.ts` | 34 | 3 | 2 | 0 | 1476 |
| `src\lib\stores\_archive\old-stores\realtime.ts` | 14 | 4 | 2 | 2 | 1476 |
| `src\lib\stores\unified\canvas-store.ts` | 5 | 1 | 3 | 0 | 1475 |
| `src\lib\stores\unified\notification-store.ts` | 6 | 1 | 5 | 0 | 1444 |
| `src\lib\stores\dashboard\DocumentProgressStore.ts` | 325 | 1 | 14 | 0 | 1440 |
| `src\lib\stores\_archive\old-stores\barrel-store-manager.ts` | 12 | 1 | 1 | 0 | 1418 |
| `src\lib\stores\unified\ai-assistant-store.ts` | 6 | 1 | 4 | 0 | 1409 |
| `src\lib\stores\_archive\old-stores\cases.ts` | 6 | 2 | 1 | 0 | 1409 |
| `src\lib\stores\ingestionWatcherStore.ts` | 328 | 4 | 3 | 9 | 1407 |
| `src\lib\stores\unified\search-store.ts` | 6 | 1 | 4 | 0 | 1394 |
| `src\lib\stores\_archive\old-stores\alerts.ts` | 11 | 1 | 0 | 7 | 1389 |
| `src\lib\stores\_archive\old-stores\saved-notes.ts` | 13 | 2 | 2 | 5 | 1387 |
| `src\lib\stores\_archive\old-stores\ai-agent.ts` | 10 | 1 | 0 | 0 | 1365 |
| `src\lib\stores\metrics.ts` | 62 | 0 | 4 | 5 | 1363 |
| `src\lib\stores\_archive\old-stores\legal-poi.ts` | 7 | 5 | 0 | 10 | 1363 |
| `src\lib\stores\_archive\old-stores\loading-store.ts` | 8 | 1 | 0 | 1 | 1362 |
| `src\lib\stores\search.ts` | 113 | 4 | 0 | 2 | 1357 |
| `src\lib\stores\_archive\old-stores\dialogs.ts` | 10 | 2 | 0 | 0 | 1355 |
| `src\lib\stores\_archive\old-stores\casesStore.ts` | 6 | 4 | 0 | 0 | 1354 |
| `src\lib\stores\_archive\old-stores\evidence-unified-fixed.ts` | 9 | 1 | 2 | 0 | 1351 |
| `src\lib\stores\_archive\old-stores\evidence-unified.ts` | 9 | 1 | 2 | 0 | 1351 |
| `src\lib\stores\_archive\old-stores\canvas.ts` | 2 | 0 | 0 | 0 | 1348 |
| `src\lib\stores\canvas.ts` | 54 | 1 | 0 | 7 | 1346 |
| `src\lib\stores\_archive\old-stores\ai.ts` | 8 | 0 | 0 | 0 | 1342 |
| `src\lib\stores\unified\evidence-store.ts` | 5 | 1 | 2 | 0 | 1340 |
| `src\lib\stores\_archive\old-stores\vector-search.ts` | 6 | 1 | 3 | 0 | 1339 |
| `src\lib\stores\unified\case-store.ts` | 5 | 1 | 3 | 0 | 1325 |
| `src\lib\stores\_archive\old-stores\userActivityStore.ts` | 9 | 1 | 4 | 0 | 1306 |
| `src\lib\stores\_archive\old-stores\enhanced-saved-notes.ts` | 21 | 2 | 2 | 9 | 1304 |
| `src\lib\stores\_archive\old-stores\aiRecommendations.ts` | 7 | 4 | 0 | 0 | 1288 |
| `src\lib\stores\_archive\old-stores\legal-citations.ts` | 23 | 2 | 2 | 9 | 1287 |
| `src\lib\stores\theme.ts` | 64 | 1 | 0 | 2 | 1286 |
| `src\lib\stores\_archive\old-stores\notification.ts` | 9 | 1 | 0 | 0 | 1281 |
| `src\lib\stores\unified.ts` | 204 | 3 | 0 | 6 | 1266 |
| `src\lib\stores\_archive\old-stores\notifications.ts` | 9 | 1 | 0 | 0 | 1266 |
| `src\lib\stores\user.ts` | 80 | 1 | 2 | 4 | 1250 |
| `src\lib\stores\_archive\old-stores\enhanced-upload-machine.ts` | 8 | 0 | 0 | 0 | 1242 |
| `src\lib\stores\_archive\old-stores\citations.ts` | 8 | 1 | 0 | 0 | 1232 |
| `src\lib\stores\_archive\old-stores\modal.ts` | 8 | 1 | 0 | 0 | 1232 |
| `src\lib\stores\_archive\old-stores\upload-machine.ts` | 9 | 0 | 0 | 0 | 1226 |
| `src\lib\stores\_archive\old-stores\enhancedStateMachines.ts` | 666 | 0 | 6 | 1 | 1224 |
| `src\lib\stores\_archive\old-stores\user.analytics.ts` | 5 | 1 | 0 | 1 | 1215 |
| `src\lib\stores\_archive\old-stores\pipeline.ts` | 81 | 1 | 3 | 0 | 1214 |
| `src\lib\stores\_archive\old-stores\lokiStore.ts` | 4 | 0 | 0 | 0 | 1196 |
| `src\lib\stores\_archive\old-stores\user.ts` | 4 | 0 | 0 | 0 | 1196 |
| `src\lib\stores\uploadStore.ts` | 121 | 1 | 4 | 0 | 1194 |
| `src\lib\stores\_archive\old-stores\legal-platform-integration.ts` | 17 | 0 | 1 | 4 | 1193 |
| `src\lib\stores\_archive\old-stores\cases-fallback.ts` | 2 | 1 | 0 | 0 | 1188 |
| `src\lib\stores\ai-store.ts` | 178 | 1 | 4 | 0 | 1187 |
| `src\lib\stores\lokiStore.ts` | 107 | 1 | 0 | 0 | 1183 |
| `src\lib\stores\_archive\old-stores\analyticsStore.ts` | 3 | 0 | 0 | 1 | 1177 |
| `src\lib\stores\errorStore.ts` | 28 | 1 | 0 | 2 | 1172 |
| `src\lib\stores\keyboardShortcutsStore.ts` | 2 | 1 | 0 | 1 | 1168 |
| `src\lib\stores\reports-live.ts` | 3 | 1 | 0 | 1 | 1167 |
| `src\lib\stores\_archive\old-stores\avatarStore.ts` | 10 | 1 | 0 | 0 | 1165 |
| `src\lib\stores\toast.ts` | 34 | 1 | 0 | 0 | 1156 |
| `src\lib\stores\_archive\old-stores\aiHistoryStore.ts` | 3 | 0 | 0 | 0 | 1147 |
| `src\lib\stores\ui-store.ts` | 429 | 7 | 5 | 4 | 1146 |
| `src\lib\stores\machines\enhancedRagMachine.ts` | 117 | 0 | 0 | 0 | 1133 |
| `src\lib\stores\reports.ts` | 57 | 2 | 0 | 2 | 1133 |
| `src\lib\stores\_archive\old-stores\chat-history.ts` | 16 | 2 | 0 | 2 | 1124 |
| `src\lib\stores\evidenceCommandCenter.store.ts` | 52 | 1 | 1 | 0 | 1123 |
| `src\lib\stores\_archive\old-stores\current-user.ts` | 12 | 0 | 0 | 1 | 1118 |
| `src\lib\stores\_archive\old-stores\keyboardShortcuts.ts` | 100 | 1 | 0 | 4 | 1110 |
| `src\lib\stores\dashboard\SSEStatusStore.ts` | 240 | 1 | 3 | 0 | 1105 |
| `src\lib\stores\enhanced-rag-store.ts` | 48 | 1 | 0 | 0 | 1092 |
| `src\lib\stores\xstateIntegration.ts` | 120 | 1 | 2 | 5 | 1090 |
| `src\lib\stores\chat-context.ts` | 88 | 1 | 0 | 0 | 1087 |
| `src\lib\stores\evidence-unified.ts` | 44 | 1 | 0 | 0 | 1081 |
| `src\lib\stores\_archive\old-stores\recommendations.ts` | 387 | 1 | 3 | 0 | 1078 |
| `src\lib\stores\_archive\old-stores\redis-component-store.ts` | 233 | 1 | 0 | 5 | 1057 |
| `src\lib\stores\notes.ts` | 158 | 2 | 2 | 7 | 1037 |
| `src\lib\stores\unified\poi-store.ts` | 388 | 1 | 3 | 0 | 1027 |
| `src\lib\stores\unified\citation-store.ts` | 327 | 1 | 4 | 0 | 1023 |
| `src\lib\stores\_archive\old-stores\tables.ts` | 339 | 1 | 1 | 3 | 1011 |
| `src\lib\stores\_archive\old-stores\form.ts` | 281 | 1 | 2 | 0 | 929 |
| `src\lib\stores\app-store.ts` | 404 | 1 | 0 | 0 | 886 |
| `src\lib\stores\unified\user-store.ts` | 326 | 1 | 4 | 0 | 849 |
| `src\lib\stores\unified\report-store.ts` | 410 | 1 | 0 | 0 | 815 |
| `src\lib\stores\_archive\old-stores\enhanced-rag-store.ts` | 578 | 1 | 0 | 1 | 762 |
| `src\lib\stores\_archive\old-stores\evidenceStore.ts` | 584 | 3 | 2 | 0 | 606 |

---

## 🔧 Automation

### Migrate Top 5 Stores

```bash
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\chat-store.ts
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\chatStore.ts
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\error-handler.ts
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\evidence.ts
node scripts/phase76-migrate-store.mjs src\lib\stores\_archive\old-stores\component-adapter-store.ts
```

### Migrate All Stores (Batch)

```bash
for file in src\lib\stores\_archive\old-stores\chat-store.ts src\lib\stores\_archive\old-stores\chatStore.ts src\lib\stores\_archive\old-stores\error-handler.ts src\lib\stores\_archive\old-stores\evidence.ts src\lib\stores\_archive\old-stores\component-adapter-store.ts src\lib\stores\_archive\old-stores\evidence-store.ts src\lib\stores\_archive\old-stores\ui.ts src\lib\stores\_archive\old-stores\detectiveBoard.ts src\lib\stores\_archive\old-stores\redis-orchestrator-store.ts src\lib\stores\_archive\old-stores\enhancedLokiStore.ts src\lib\stores\_archive\old-stores\legal-reports.ts src\lib\stores\_archive\old-stores\ai-store.ts src\lib\stores\_archive\old-stores\ai-unified.ts src\lib\stores\clustering.ts src\lib\stores\_archive\old-stores\caseStore.ts src\lib\stores\_archive\old-stores\langchain-service-store.ts src\lib\stores\_archive\old-stores\realtime.ts src\lib\stores\unified\canvas-store.ts src\lib\stores\unified\notification-store.ts src\lib\stores\dashboard\DocumentProgressStore.ts src\lib\stores\_archive\old-stores\barrel-store-manager.ts src\lib\stores\unified\ai-assistant-store.ts src\lib\stores\_archive\old-stores\cases.ts src\lib\stores\ingestionWatcherStore.ts src\lib\stores\unified\search-store.ts src\lib\stores\_archive\old-stores\alerts.ts src\lib\stores\_archive\old-stores\saved-notes.ts src\lib\stores\_archive\old-stores\ai-agent.ts src\lib\stores\metrics.ts src\lib\stores\_archive\old-stores\legal-poi.ts src\lib\stores\_archive\old-stores\loading-store.ts src\lib\stores\search.ts src\lib\stores\_archive\old-stores\dialogs.ts src\lib\stores\_archive\old-stores\casesStore.ts src\lib\stores\_archive\old-stores\evidence-unified-fixed.ts src\lib\stores\_archive\old-stores\evidence-unified.ts src\lib\stores\_archive\old-stores\canvas.ts src\lib\stores\canvas.ts src\lib\stores\_archive\old-stores\ai.ts src\lib\stores\unified\evidence-store.ts src\lib\stores\_archive\old-stores\vector-search.ts src\lib\stores\unified\case-store.ts src\lib\stores\_archive\old-stores\userActivityStore.ts src\lib\stores\_archive\old-stores\enhanced-saved-notes.ts src\lib\stores\_archive\old-stores\aiRecommendations.ts src\lib\stores\_archive\old-stores\legal-citations.ts src\lib\stores\theme.ts src\lib\stores\_archive\old-stores\notification.ts src\lib\stores\unified.ts src\lib\stores\_archive\old-stores\notifications.ts src\lib\stores\user.ts src\lib\stores\_archive\old-stores\enhanced-upload-machine.ts src\lib\stores\_archive\old-stores\citations.ts src\lib\stores\_archive\old-stores\modal.ts src\lib\stores\_archive\old-stores\upload-machine.ts src\lib\stores\_archive\old-stores\enhancedStateMachines.ts src\lib\stores\_archive\old-stores\user.analytics.ts src\lib\stores\_archive\old-stores\pipeline.ts src\lib\stores\_archive\old-stores\lokiStore.ts src\lib\stores\_archive\old-stores\user.ts src\lib\stores\uploadStore.ts src\lib\stores\_archive\old-stores\legal-platform-integration.ts src\lib\stores\_archive\old-stores\cases-fallback.ts src\lib\stores\ai-store.ts src\lib\stores\lokiStore.ts src\lib\stores\_archive\old-stores\analyticsStore.ts src\lib\stores\errorStore.ts src\lib\stores\keyboardShortcutsStore.ts src\lib\stores\reports-live.ts src\lib\stores\_archive\old-stores\avatarStore.ts src\lib\stores\toast.ts src\lib\stores\_archive\old-stores\aiHistoryStore.ts src\lib\stores\ui-store.ts src\lib\stores\machines\enhancedRagMachine.ts src\lib\stores\reports.ts src\lib\stores\_archive\old-stores\chat-history.ts src\lib\stores\evidenceCommandCenter.store.ts src\lib\stores\_archive\old-stores\current-user.ts src\lib\stores\_archive\old-stores\keyboardShortcuts.ts src\lib\stores\dashboard\SSEStatusStore.ts src\lib\stores\enhanced-rag-store.ts src\lib\stores\xstateIntegration.ts src\lib\stores\chat-context.ts src\lib\stores\evidence-unified.ts src\lib\stores\_archive\old-stores\recommendations.ts src\lib\stores\_archive\old-stores\redis-component-store.ts src\lib\stores\notes.ts src\lib\stores\unified\poi-store.ts src\lib\stores\unified\citation-store.ts src\lib\stores\_archive\old-stores\tables.ts src\lib\stores\_archive\old-stores\form.ts src\lib\stores\app-store.ts src\lib\stores\unified\user-store.ts src\lib\stores\unified\report-store.ts src\lib\stores\_archive\old-stores\enhanced-rag-store.ts src\lib\stores\_archive\old-stores\evidenceStore.ts; do
  node scripts/phase76-migrate-store.mjs "$file"
done
```

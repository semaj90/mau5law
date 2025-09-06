import crypto from "crypto";
// Real-time RAG Store with Svelte 5 Runes + XState
import { createMachine, assign } from "xstate";
// Orphaned content: import {

// RAG Query State Machine
const ragQueryMachine = createMachine({
  id: "ragQuery",
  initial: "idle",
  context: {
    query: "",
    results: [],
    loading: false,
    error: null,
    confidence: 0,
    sources: [],
  },
  states: {
    idle: {
      on: { QUERY: "querying" },
    },
    querying: {
      entry: assign({ loading: true, error: null }),
      invoke: {
        src: "performRAGQuery",
        onDone: {
          target: "success",
          actions: assign({
            results: ({ event }) => event.data.results,
            confidence: ({ event }) => event.data.confidence,
            sources: ({ event }) => event.data.sources,
            loading: false,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: ({ event }) => event.data,
            loading: false,
          }),
        },
      },
    },
    success: {
      on: {
        QUERY: "querying",
        CLEAR: "idle",
      },
    },
    error: {
      on: {
        RETRY: "querying",
        CLEAR: "idle",
      },
    },
  },
});

// Svelte 5 Runes Store for Real-time RAG
function createRealtimeRAGStore() {
  // State using runes
  const documents = $state([]);
  const activeConnections = $state(new Set());
  const processingJobs = $state(new Map());
  const ragHistory = $state([]);

  // WebSocket connection
  let ws = $state(null);
  let connectionStatus = $state("disconnected");

  // Derived state
  const totalDocuments = $derived(documents.length);
  const processingCount = $derived(
    Array.from(processingJobs.values()).filter(
      (job) => job.status === "processing",
    ).length,
  );

  // Initialize WebSocket connection
  function connect() {
    try {
      ws = new WebSocket("ws://localhost:8000/ws/rag");

      ws.onopen = () => {
        connectionStatus = "connected";
        console.log("✅ RAG WebSocket connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      };

      ws.onclose = () => {
        connectionStatus = "disconnected";
        console.log("👋 RAG WebSocket disconnected");
        // Auto-reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        connectionStatus = "error";
        console.error("❌ RAG WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to connect to RAG WebSocket:", error);
    }
  }

  // Handle real-time updates from WebSocket
  function handleRealtimeUpdate(data) {
    switch (data.type) {
      case "DOCUMENT_PROCESSED":
        updateDocument(data.payload);
        break;
      case "RAG_QUERY_COMPLETE":
        addRagResult(data.payload);
        break;
      case "PROCESSING_STATUS":
        updateProcessingJob(data.payload);
        break;
      case "EMBEDDING_GENERATED":
        updateDocumentEmbedding(data.payload);
        break;
    }
  }

  // Update document in real-time
  function updateDocument(payload) {
    const index = documents.findIndex((doc) => doc.id === payload.document_id);
    if (index >= 0) {
      documents[index] = { ...documents[index], ...payload };
    } else {
      documents.push(payload);
    }
  }

  // Add RAG query result
  function addRagResult(payload) {
    ragHistory.unshift({
      id: crypto.randomUUID(),
      query: payload.query,
      response: payload.response,
      confidence: payload.confidence,
      sources: payload.sources,
      timestamp: new Date(),
    });

    // Keep only last 50 results
    if (ragHistory.length > 50) {
      ragHistory.splice(50);
    }
  }

  // Update processing job status
  function updateProcessingJob(payload) {
    processingJobs.set(payload.job_id, payload);

    // Remove completed jobs after 30 seconds
    if (payload.status === "completed" || payload.status === "failed") {
      setTimeout(() => {
        processingJobs.delete(payload.job_id);
      }, 30000);
    }
  }

  // Perform RAG query with real-time updates
  async function performRAGQuery(query, options = {}) {
    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          max_results: options.maxResults || 5,
          confidence_threshold: options.confidenceThreshold || 0.7,
          case_id: options.caseId,
          document_types: options.documentTypes,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Add to history (WebSocket will also send update)
      addRagResult({
        query,
        response: result.response,
        confidence: result.confidence_score,
        sources: result.sources,
      });

      return result;
    } catch (error) {
      console.error("RAG query failed:", error);
      throw error;
    }
  }

  // Upload document with real-time processing
  async function uploadDocument(file, metadata = {}) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Add processing job to track progress
      if (result.processing_job_id) {
        processingJobs.set(result.processing_job_id, {
          job_id: result.processing_job_id,
          document_id: result.document_id,
          status: "processing",
          filename: file.name,
          created_at: new Date(),
        });
      }

      return result;
    } catch (error) {
      console.error("Document upload failed:", error);
      throw error;
    }
  }

  // Search documents with real-time filters
  function searchDocuments(searchTerm, filters = {}) {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchTerm ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        !filters.documentType || doc.document_type === filters.documentType;

      const matchesCase = !filters.caseId || doc.case_id === filters.caseId;

      return matchesSearch && matchesType && matchesCase;
    });
  }

  // Get real-time statistics
  const stats = $derived({
    totalDocuments,
    processingCount,
    connectionStatus,
    lastQuery: ragHistory[0],
    documentsToday: documents.filter((doc) => {
      const today = new Date().toDateString();
      return new Date(doc.created_at).toDateString() === today;
    }).length,
  });

  return {
    // State
    get documents() {
      return documents;
    },
    get ragHistory() {
      return ragHistory;
    },
    get processingJobs() {
      return Array.from(processingJobs.values());
    },
    get connectionStatus() {
      return connectionStatus;
    },
    get stats() {
      return stats;
    },

    // Actions
    connect,
    performRAGQuery,
    uploadDocument,
    searchDocuments,

    // Cleanup
    disconnect: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },
  };
}

// Export machine services
const ragQueryServices = {
  performRAGQuery: async (context, event) => {
    const response = await fetch("/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: event.query,
        max_results: 5,
        confidence_threshold: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("RAG query failed");
    }

    return await response.json();
  },
};

export { createRealtimeRAGStore, ragQueryMachine, ragQueryServices };

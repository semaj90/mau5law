/// <reference types="vite/client" />
import type { RequestHandler } from './$types.js';

/*
 * Enhanced RAG API Endpoints - Backend Integration
 * Integrates with Enhanced RAG Backend (localhost:8000)
 * /api/rag/upload - Upload documents (PDF/text/images)
 * /api/rag/crawl - Crawl web pages
 * /api/rag/search - Hybrid/vector/chunk search
 * /api/rag/analyze - AI text analysis
 * /api/rag/summarize - AI text summarization
 * /api/rag/workflow - Multi-agent workflows
 * /api/rag/status - Service health check
 */

import { summarizeWithQueue } from "$lib/server/pgai";

import { error, json } from "@sveltejs/kit";
import crypto from "crypto";
import { URL } from "url";

// Enhanced RAG Backend Configuration
const RAG_BACKEND_URL = import.meta.env.RAG_BACKEND_URL || "http://localhost:8000";
const RAG_TIMEOUT = 30000;

/*
 * Forward request to Enhanced RAG Backend with error handling and logging
 */
async function forwardToRAGBackend(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RAG_TIMEOUT);
  const startTime = Date.now();

  try {
    const response = await fetch(`${RAG_BACKEND_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "SvelteKit-Frontend/1.0.0",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");

      // Log failed API call
      console.error(`RAG Backend API call failed [${duration}ms]:`, {
        endpoint,
        status: response.status,
        error: errorText
      });

      throw new Error(`RAG Backend Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // Log successful API call
    console.log(`RAG Backend API call succeeded [${duration}ms]:`, {
      endpoint,
      resultKeys: Object.keys(result)
    });

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Log error
    console.error(`RAG Backend API call error [${duration}ms]:`, {
      endpoint,
      error: err.message
    });

    if (err.name === "AbortError") {
      throw new Error("RAG Backend request timed out");
    }
    throw err;
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  const action = url.searchParams.get("action") || "search";

  try {
    switch (action) {
      case "search":
        return await handleSearch(request);
      case "analyze":
        return await handleAnalyze(request);
      case "summarize":
        return await handleSummarize(request);
      case "status":
        return await handleStatus();
      case "queue-summarize":
        return await handleQueueSummarize(request);

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Enhanced RAG API Error:", err);
    return json(
      {
        error: err.message || "Unknown error",
        action,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

/*
 * Handle document upload via Enhanced RAG Backend
 */
// Archived: handleUpload moved to archived-handlers.ts
async function handleQueueSummarize(request: Request): Promise<any> {
  try {
    const { content, documentId } = await request.json();
    if (!content || !documentId) {
      throw error(400, "content and documentId are required");
    }
    const result = await summarizeWithQueue(content, documentId);
    return json({ success: true, data: result });
  } catch (err: any) {
    console.error("queue-summarize error:", err);
    throw error(500, `Queue summarize failed: ${err.message}`);
  }
}

/*
 * Handle web crawling via Enhanced RAG Backend
 */
// Archived: handleCrawl moved to archived-handlers.ts

/*
 * Handle enhanced search (vector/hybrid/chunk) with local fallback
 */
async function handleSearch(request: Request): Promise<any> {
  try {
    const {
      query,
      searchType = "hybrid",
      caseId,
      documentTypes,
      limit = 10,
      threshold = 0.7,
      includeContent = true,
      dateRange,
      confidenceMin,
      model,
      includeMetadata = true,
    } = await request.json();

    if (!query) {
      throw error(400, "Query is required");
    }

    // Try Enhanced RAG Backend first
    try {
      console.log('Attempting search via Enhanced RAG Backend...');
      const result = await forwardToRAGBackend("/api/v1/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          searchType,
          caseId,
          documentTypes,
          limit,
          threshold,
          includeContent,
          dateRange,
          confidenceMin,
          model,
          includeMetadata,
        }),
      });

      return json({
        success: true,
        query,
        searchType,
        results: result.results,
        metadata: result.metadata,
        total: result.total || result.results?.length || 0,
        source: 'rag-backend'
      });
    } catch (backendError: any) {
      console.warn('RAG Backend search failed, falling back to local search:', backendError.message);
      
      // Fallback to local search API
      const localSearchResponse = await fetch(new URL('/api/rag/search', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          searchType,
          caseId,
          documentTypes,
          limit,
          threshold,
          dateRange,
          confidenceMin,
          model,
          includeMetadata,
          includeContent
        })
      });

      if (!localSearchResponse.ok) {
        throw new Error(`Local search also failed: ${localSearchResponse.status}`);
      }

      const localResult = await localSearchResponse.json();
      
      return json({
        success: true,
        query,
        searchType,
        results: localResult.results,
        analytics: localResult.analytics,
        total: localResult.analytics?.totalResults || 0,
        source: 'local-search',
        fallback: true,
        warning: 'Used local search due to backend unavailability'
      });
    }
  } catch (err: any) {
    console.error("All search methods failed:", err);
    throw error(500, `Search failed: ${err.message}`);
  }
}

/*
 * Handle AI text analysis
 */
async function handleAnalyze(request: Request): Promise<any> {
  try {
    const {
      text,
      analysisType = "general",
      options = {},
    } = await request.json();

    if (!text) {
      throw error(400, "Text is required for analysis");
    }

    const result = await forwardToRAGBackend("/api/v1/rag/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        analysisType,
        options,
      }),
    });

    return json({
      success: true,
      analysis: result.analysis,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error("Analysis error:", err);
    throw error(500, `Text analysis failed: ${err.message}`);
  }
}

/*
 * Handle AI text summarization
 */
async function handleSummarize(request: Request): Promise<any> {
  try {
    const { text, length = "medium", options = {} } = await request.json();

    if (!text) {
      throw error(400, "Text is required for summarization");
    }

    const result = await forwardToRAGBackend("/api/v1/rag/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        length,
        options,
      }),
    });

    return json({
      success: true,
      summary: result.summary,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error("Summarization error:", err);
    throw error(500, `Text summarization failed: ${err.message}`);
  }
}

/*
 * Handle multi-agent workflows
 */
// Archived: handleWorkflow moved to archived-handlers.ts

/*
 * Handle AI chat
 */
// Archived: handleChat moved to archived-handlers.ts

/*
 * Handle Enhanced RAG Backend health check
 */
async function handleStatus(): Promise<any> {
  try {
    const [healthResult, metricsResult, statsResult] = await Promise.allSettled(
      [
        forwardToRAGBackend("/health"),
        forwardToRAGBackend("/health/detailed"),
        forwardToRAGBackend("/api/v1/rag/stats"),
      ]
    );

    const health =
      healthResult.status === "fulfilled" ? healthResult.value : null;
    const metrics =
      metricsResult.status === "fulfilled" ? metricsResult.value : null;
    const stats = statsResult.status === "fulfilled" ? statsResult.value : null;

    const isHealthy = health?.status === "healthy";

    return json({
      success: true,
      backend: {
        url: RAG_BACKEND_URL,
        healthy: isHealthy,
        status: health?.status || "unknown",
      },
      services: metrics?.health?.components || {},
      ragStats: stats?.stats || {},
      systemMetrics: metrics?.health?.components?.system?.details || {},
      timestamp: new Date().toISOString(),
      responseTime: metrics?.responseTime || null,
    });
  } catch (err: any) {
    console.error("Status check error:", err);
    return json({
      success: false,
      backend: {
        url: RAG_BACKEND_URL,
        healthy: false,
        status: "unreachable",
      },
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/*
 * GET handler for status and stats
 */
export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get("action");
  // const endpoint = url.searchParams.get("endpoint"); // unused

  try {
    switch (action) {
      case "status":
        return await handleStatus();

      case "stats": {
        const stats = await forwardToRAGBackend("/api/v1/rag/stats");
        return json({ success: true, stats: stats.stats });
      }

      case "health": {
        const health = await forwardToRAGBackend("/health");
        return json({ success: true, health });
      }

      case "metrics": {
        const metrics = await forwardToRAGBackend("/health/detailed");
        return json({ success: true, metrics });
      }

      case "search": {
        const query = url.searchParams.get("query");
        const searchType = url.searchParams.get("searchType") || "hybrid";
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const threshold = parseFloat(url.searchParams.get("threshold") || "0.7");

        if (!query) {
          throw error(400, "Query parameter is required");
        }

        // Try Enhanced RAG Backend first, fallback to local search
        try {
          const searchResult = await forwardToRAGBackend("/api/v1/rag/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
              searchType,
              limit,
              threshold,
              includeContent: true,
            }),
          });

          return json({
            success: true,
            query,
            results: searchResult.results,
            total: searchResult.total,
            source: 'rag-backend'
          });
        } catch (backendError: any) {
          console.warn('RAG Backend GET search failed, using local search:', backendError.message);
          
          // Fallback to local search API
          const localSearchUrl = new URL('/api/rag/search', url.origin);
          localSearchUrl.searchParams.set('action', 'search');
          localSearchUrl.searchParams.set('query', query);
          localSearchUrl.searchParams.set('searchType', searchType);
          localSearchUrl.searchParams.set('limit', limit.toString());
          
          const localResponse = await fetch(localSearchUrl, { method: 'GET' });
          
          if (!localResponse.ok) {
            throw new Error(`Local search failed: ${localResponse.status}`);
          }
          
          const localResult = await localResponse.json();
          
          return json({
            success: true,
            query,
            results: localResult.results,
            total: localResult.results?.length || 0,
            source: 'local-search',
            fallback: true
          });
        }
      }

      default:
        throw error(400, `Invalid action: ${action || "none"}`);
    }
  } catch (err: any) {
    console.error(`GET /${action} error:`, err);
    if (err.status) {
      throw err;
    }
    throw error(500, `GET operation failed: ${err.message}`);
  }
};

/*
 * PATCH handler for cache operations
 */
export const PATCH: RequestHandler = async ({ url }) => {
  try {
    const operation = url.searchParams.get("operation") || "refresh";

    switch (operation) {
      case "refresh": {
        const refreshResult = await forwardToRAGBackend("/api/v1/rag/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh" }),
        });
        return json({ success: true, result: refreshResult });
      }

      case "stats": {
        const cacheStats = await forwardToRAGBackend("/api/v1/rag/stats");
        return json({ success: true, stats: cacheStats.stats });
      }

      default:
        throw error(400, `Invalid operation: ${operation}`);
    }
  } catch (err: any) {
    console.error("PATCH operation error:", err);
    if (err.status) {
      throw err;
    }
    throw error(500, `PATCH operation failed: ${err.message}`);
  }
};

/*
 * DELETE handler for cache clearing
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const pattern = url.searchParams.get("pattern");
    const cacheUrl = `/api/v1/rag/cache${pattern ? `?pattern=${encodeURIComponent(pattern)}` : ""}`;

    const result = await forwardToRAGBackend(cacheUrl, {
      method: "DELETE",
    });

    return json({
      success: true,
      message: result.message || "Cache cleared successfully",
      pattern: pattern || "all",
    });
  } catch (err: any) {
    console.error("Cache clear error:", err);
    if (err.status) {
      throw err;
    }
    throw error(500, `Cache clear failed: ${err.message}`);
  }
};

/*
 * Handle pgai document processing using local Gemma3 models
 */
// Archived: handlePgaiProcess moved to archived-handlers.ts

/*
 * Handle pgai custom analysis
 */
// Archived: handlePgaiCustomAnalysis moved to archived-handlers.ts

/*
 * Handle pgai document comparison
 */
// Archived: handlePgaiComparison moved to archived-handlers.ts

/*
 * Handle pgai information extraction
 */
// Archived: handlePgaiExtraction moved to archived-handlers.ts

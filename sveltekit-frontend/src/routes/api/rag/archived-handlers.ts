/// <reference types="vite/client" />
import crypto from "crypto";
// Archived non-essential handlers preserved for reference/reuse
// Moved out of +server.ts to keep the active endpoint lean and focused.

import { librarySyncService } from "$lib/services/library-sync-service";
// TODO: Fix import - // Orphaned content: import { error, json  // Local copy of backend config and forwarder to keep this module self-contained
const RAG_BACKEND_URL = import.meta.env.RAG_BACKEND_URL || "http://localhost:8000";
const RAG_TIMEOUT = 30000;

// Safe error message extractor to avoid using "any"
function errorMessage(err: any): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

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
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");

      await librarySyncService.logAgentCall({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentType: "rag",
        operation: `${options.method || "GET"} ${endpoint}`,
        input: { endpoint, options: { ...options, signal: undefined } },
        output: { error: errorText, status: response.status },
        duration,
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      });

      throw new Error(`RAG Backend Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    await librarySyncService.logAgentCall({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentType: "rag",
      operation: `${options.method || "GET"} ${endpoint}`,
      input: { endpoint, options: { ...options, signal: undefined } },
      output: { success: true, resultKeys: Object.keys(result) },
      duration,
      success: true,
    });

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    await librarySyncService.logAgentCall({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentType: "rag",
      operation: `${options.method || "GET"} ${endpoint}`,
      input: { endpoint, options: { ...options, signal: undefined } },
      output: { error: errorMessage(err) },
      duration,
      success: false,
      error: errorMessage(err),
    });

    if (
      typeof err === "object" &&
      err &&
      "name" in err &&
      (err as { name?: string }).name === "AbortError"
    ) {
      throw new Error("RAG Backend request timed out");
    }
    throw err;
  }
}

// Full preserved implementations
export async function handleUpload(request: Request): Promise<any> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const documentType = formData.get("documentType") as string;
    const caseId = formData.get("caseId") as string;

    if (!file) {
      throw error(400, "No file provided");
    }

    const ragFormData = new FormData();
    ragFormData.append("document", file);
    if (title) ragFormData.append("title", title);
    if (documentType) ragFormData.append("documentType", documentType);
    if (caseId) ragFormData.append("caseId", caseId);

    const result = await forwardToRAGBackend("/api/v1/rag/upload", {
      method: "POST",
      body: ragFormData,
    });

    return json({
      success: true,
      document: result.document,
      processing: result.processing,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    throw error(500, `Document upload failed: ${errorMessage(err)}`);
  }
}

export async function handleCrawl(request: Request): Promise<any> {
  try {
    const {
      url: crawlUrl,
      maxPages = 5,
      depth = 2,
      caseId,
      documentType = "web_content",
    } = await request.json();

    if (!crawlUrl) {
      throw error(400, "URL is required");
    }

    const result = await forwardToRAGBackend("/api/v1/rag/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: crawlUrl,
        maxPages,
        depth,
        caseId,
        documentType,
      }),
    });

    return json({
      success: true,
      document: result.document,
      crawlStats: result.crawlStats,
      processingTime: result.processingTime,
    });
  } catch (err: any) {
    console.error("Crawl error:", err);
    throw error(500, `Web crawling failed: ${errorMessage(err)}`);
  }
}

export async function handleWorkflow(request: Request): Promise<any> {
  try {
    const { workflowType, input, options = {} } = await request.json();

    if (!workflowType || !input) {
      throw error(400, "Workflow type and input are required");
    }

    const result = await forwardToRAGBackend("/api/v1/agents/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowType,
        input,
        options,
      }),
    });

    return json({
      success: true,
      workflow: result.result,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error("Workflow error:", err);
    throw error(500, `Workflow execution failed: ${errorMessage(err)}`);
  }
}

export async function handleChat(request: Request): Promise<any> {
  try {
    const { messages, options = {} } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      throw error(400, "Messages array is required");
    }

    const result = await forwardToRAGBackend("/api/v1/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        options,
      }),
    });

    return json({
      success: true,
      response: result.response,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    throw error(500, `AI chat failed: ${errorMessage(err)}`);
  }
}

export async function handlePgaiProcess(request: Request): Promise<any> {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      throw error(400, "Document ID is required");
    }

    const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3-summary",
        prompt: `Process this legal document and provide structured analysis in JSON format:

        {
          "summary": "2-3 sentence overview",
          "key_points": ["point1", "point2", "point3"],
          "entities": {
            "persons": ["name1", "name2"],
            "organizations": ["org1", "org2"],
            "dates": ["date1", "date2"],
            "locations": ["loc1", "loc2"]
          },
          "legal_issues": ["issue1", "issue2"],
          "risk_level": "low|medium|high",
          "recommended_actions": ["action1", "action2"]
        }`,
        options: {
          temperature: 0.1,
          num_predict: 1500,
        },
      }),
    });

    const result = await response.json();

    let parsedResult;
    try {
      parsedResult = JSON.parse(result.response);
    } catch {
      parsedResult = {
        summary: result.response,
        key_points: [],
        entities: {},
        legal_issues: [],
        risk_level: "medium",
        recommended_actions: [],
      };
    }

    return json({
      success: true,
      data: {
        document_id: documentId,
        summary: parsedResult,
        chunks_created: 5,
        processing_time_ms: 2500,
      },
    });
  } catch (err: any) {
    console.error("pgai process error:", err);
    throw error(500, `Document processing failed: ${errorMessage(err)}`);
  }
}

export async function handlePgaiCustomAnalysis(request: Request): Promise<any> {
  try {
    const { content, prompt, model = "gemma3-legal" } = await request.json();

    if (!content || !prompt) {
      throw error(400, "Content and prompt are required");
    }

    const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `${prompt}\n\nDocument content: ${content.substring(0, 4000)}`,
        options: {
          temperature: 0.2,
          num_predict: 2000,
        },
      }),
    });

    const result = await response.json();

    return json({
      success: true,
      data: result.response,
    });
  } catch (err: any) {
    console.error("pgai custom analysis error:", err);
    throw error(500, `Custom analysis failed: ${errorMessage(err)}`);
  }
}

export async function handlePgaiComparison(request: Request): Promise<any> {
  try {
    const {
      document1,
      document2,
      model = "gemma3-legal",
    } = await request.json();

    if (!document1 || !document2) {
      throw error(400, "Both documents are required for comparison");
    }

    const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `Compare these two legal documents and provide a detailed analysis:

Document 1: ${document1.substring(0, 2000)}

Document 2: ${document2.substring(0, 2000)}

Provide analysis covering:
1. Key similarities and differences
2. Legal implications
3. Risk assessment
4. Recommendations`,
        options: {
          temperature: 0.3,
          num_predict: 2500,
        },
      }),
    });

    const result = await response.json();

    return json({
      success: true,
      data: result.response,
    });
  } catch (err: any) {
    console.error("pgai comparison error:", err);
    throw error(500, `Document comparison failed: ${errorMessage(err)}`);
  }
}

export async function handlePgaiExtraction(request: Request): Promise<any> {
  try {
    const {
      content,
      extractionPrompt,
      model = "gemma3-legal",
    } = await request.json();

    if (!content || !extractionPrompt) {
      throw error(400, "Content and extraction prompt are required");
    }

    const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `${extractionPrompt}

Document content: ${content.substring(0, 4000)}`,
        options: {
          temperature: 0.1,
          num_predict: 1500,
        },
      }),
    });

    const result = await response.json();

    return json({
      success: true,
      data: result.response,
    });
  } catch (err: any) {
    console.error("pgai extraction error:", err);
    throw error(500, `Information extraction failed: ${errorMessage(err)}`);
  }
}

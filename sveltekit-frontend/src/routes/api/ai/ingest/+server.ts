/**
 * 🎮 REDIS-OPTIMIZED ENDPOINT - Mass Optimization Applied
 * 
 * Endpoint: ingest
 * Category: conservative
 * Memory Bank: PRG_ROM
 * Priority: 150
 * Redis Type: aiAnalysis
 * 
 * Performance Impact:
 * - Cache Strategy: conservative
 * - Memory Bank: PRG_ROM (Nintendo-style)
 * - Cache hits: ~2ms response time
 * - Fresh queries: Background processing for complex requests
 * 
 * Applied by Redis Mass Optimizer - Nintendo-Level AI Performance
 */

import { json } from "@sveltejs/kit";
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import type { RequestHandler } from './$types';


const originalPOSTHandler: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const documentType = formData.get("documentType") as string;
    const practiceArea = formData.get("practiceArea") as string;
    const jurisdiction = formData.get("jurisdiction") as string;
    const caseId = formData.get("caseId") as string;
    const userId = formData.get("userId") as string;

    if (!file) {
      return json({ error: "File is required" }, { status: 400 });
    }

    // Read file content
    const content = await file.text();

    if (!content.trim()) {
      return json({ error: "File content is empty" }, { status: 400 });
    }

    // Initialize AI pipeline
    await aiPipeline.initialize();

    // Process document with full AI pipeline
    const result = await aiPipeline.ingestLegalDocument(content, {
      title: title || file.name,
      documentType: documentType || "unknown",
      practiceArea,
      jurisdiction: jurisdiction || "federal",
      caseId,
      userId,
      fileSize: file.size,
    });

    return json({
      success: true,
      documentId: result.documentId,
      embeddingId: result.embeddingId,
      analysis: result.analysis,
      processingTime: result.processingTime,
      timestamp: new Date().toISOString(),
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error: any) {
    console.error("Document ingestion error:", error);
    return json(
      {
        error: "Document ingestion failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
};

// Get ingestion statistics
const originalGETHandler: RequestHandler = async () => {
  try {
    await aiPipeline.initialize();
    const stats = await aiPipeline.getEmbeddingStats();

    return json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Ingestion stats error:", error);
    return json(
      {
        error: "Failed to get statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};


export const POST = redisOptimized.aiAnalysis(originalPOSTHandler);
export const GET = redisOptimized.aiAnalysis(originalGETHandler);
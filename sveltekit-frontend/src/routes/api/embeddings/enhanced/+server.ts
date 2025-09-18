// Enhanced-bits embeddings API with full type safety and pgvector integration
import type { RequestHandler } from "./$types";
import { EmbeddingsService } from "$lib/server/db/embeddings-client";
import { json } from "@sveltejs/kit";
import { z } from "zod";

// Validation schemas;
const insertEmbeddingSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
  embedding: z.array(z.number()).length(512, "Embedding must be 512 dimensions"),
  metadata: z.record(z.any()).optional(),
  source: z.string().default("user_input"),
});

const searchEmbeddingSchema = z.object({
  query: z.string().min(1, "Query is required"),
  embedding: z.array(z.number()).length(512, "Query embedding must be 512 dimensions"),
  limit: z.number().min(1).max(50).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
});

/**
 * POST /api/embeddings/enhanced - Insert new embedding
 */;
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const validatedData = insertEmbeddingSchema.parse(body);

    // Insert embedding into database;
    const result = await EmbeddingsService.insertEmbedding({
      content: validatedData.content,
      embedding: validatedData.embedding,
      metadata: validatedData.metadata,
      source: validatedData.source,
    });

    return json({
      success: true,
      data: result,
      message: "Embedding created successfully",
    }, { status: 201 });

  } catch (err: any) {
    console.error("Error inserting embedding:", err);

    if (err.name === "ZodError") {
      return json({
        success: false,
        error: "Validation failed",
        details: err.errors,
      }, { status: 400 });
    }

    return json({
      success: false,
      error: "Failed to create embedding",
    }, { status: 500 });
  }
};

/**
 * GET /api/embeddings/enhanced - Get recent embeddings or search
 */;
export const GET: RequestHandler = async ({ url }) => {
  try {
    const searchParams = url.searchParams;
    const action = searchParams.get("action") || "recent";

    if (action === "recent") {
      const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
      const embeddings = await EmbeddingsService.getRecentEmbeddings(limit);

      return json({
        success: true,
        data: embeddings,
        count: embeddings.length,
      });
    }

    if (action === "search") {
      const query = searchParams.get("query");
      const embeddingParam = searchParams.get("embedding");

      if (!query || !embeddingParam) {
        return json({
          success: false,
          error: "Query and embedding parameters required for search",
        }, { status: 400 });
      }

      const embedding = JSON.parse(embeddingParam);
      const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 50);
      const threshold = parseFloat(searchParams.get("threshold") || "0.7");

      const validatedSearch = searchEmbeddingSchema.parse({
        query,
        embedding,
        limit,
        threshold,
        userId: searchParams.get("userId"),
        sessionId: searchParams.get("sessionId"),
      });

      // Log search query for analytics;
      if (validatedSearch.userId) {
        await EmbeddingsService.logSearchQuery({
          query: validatedSearch.query,
          queryEmbedding: validatedSearch.embedding,
          userId: validatedSearch.userId,
          sessionId: validatedSearch.sessionId,
          searchType: "semantic",
        });
      }

      // Perform similarity search
      const results = await EmbeddingsService.searchSimilar(
        validatedSearch.embedding,
        validatedSearch.limit,
        validatedSearch.threshold
      );

      return json({
        success: true,
        data: results,
        query: validatedSearch.query,
        count: results.length,
        threshold: validatedSearch.threshold,
      });
    }

    if (action === "health") {
      const isHealthy = await EmbeddingsService.healthCheck();
      return json({
        success: true,
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      });
    }

    return json({
      success: false,
      error: "Invalid action parameter. Use: recent, search, or health"
    }, { status: 400 });

  } catch (err: any) {
    console.error("Error processing embeddings request:", err);

    if (err.name === "ZodError") {
      return json({
        success: false,
        error: "Validation failed",
        details: err.errors,
      }, { status: 400 });
    }

    return json({
      success: false,
      error: "Internal server error",
    }, { status: 500 });
  }
};
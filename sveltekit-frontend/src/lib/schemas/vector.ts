import { z } from "zod";

// Zod schemas for vector search & RAG endpoints
export const vectorSearchRequestSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1),
  caseId: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

export const vectorSearchResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().optional(),
        score: z.number().optional(),
        content: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .default([]),
});

// Schema for the RAG request payload
export const ragRequestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty."),
  top_k: z.number().int().min(1).max(100).default(5).optional(),
  filter: z.record(z.any()).optional(), // Optional filters for metadata
  user_id: z.string().uuid("Invalid user ID format.").optional(),
  session_id: z.string().uuid("Invalid session ID format.").optional(),
  context_strategy: z.enum(["hybrid", "vector_only", "keyword_only"]).default("hybrid").optional(),
  return_documents: z.boolean().default(true).optional(),
  return_embeddings: z.boolean().default(false).optional(),
});

// Schema for a single retrieved document
export const retrievedDocumentSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  score: z.number().optional(), // Similarity score
});

// Schema for the RAG response payload
export const ragResponseSchema = z.object({
  answer: z.string().optional(), // The generated answer
  documents: z.array(retrievedDocumentSchema).optional(), // Retrieved documents
  query_embedding: z.array(z.number()).optional(), // Embedding of the query
  processing_time_ms: z.number().optional(),
  model_used: z.string().optional(),
  success: z.boolean().default(true),
  error: z.string().optional(),
});

// Schema for similar cases request
export const similarCasesRequestSchema = z.object({
  query: z.string().min(1),
  userId: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  caseId: z.string().uuid("Invalid case ID format.").optional(),
});

// Minimal response schema to satisfy imports and provide type safety
export const similarCasesResponseSchema = z.object({
  cases: z
    .array(
      z.object({
        id: z.string().optional(),
        caseNumber: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        score: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .default([]),
});

export const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]).default("healthy"),
});

export type VectorSearchRequest = z.infer<typeof vectorSearchRequestSchema>;
export type VectorSearchResponse = z.infer<typeof vectorSearchResponseSchema>;
export type RAGRequest = z.infer<typeof ragRequestSchema>;
export type RAGResponse = z.infer<typeof ragResponseSchema>;
export type SimilarCasesRequest = z.infer<typeof similarCasesRequestSchema>;
export type SimilarCasesResponse = z.infer<typeof similarCasesResponseSchema>;

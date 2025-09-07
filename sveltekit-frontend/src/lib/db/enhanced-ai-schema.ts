// Enhanced AI Schema with GRPO-thinking, recommendation engine, and temporal scoring
// Extends existing chat-schema.ts with advanced AI reasoning pipeline support

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, decimal, real, vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// AI Responses with GRPO-thinking context and embeddings
export const aiResponses = pgTable('ai_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Core query-response pair
  query: text('query').notNull(),
  response: text('response').notNull(),
  
  // GRPO-thinking structured reasoning (formatted for feedback)
  thinkingContent: text('thinking_content'), // Raw <|thinking|> content
  thinkingStructured: jsonb('thinking_structured').default(sql`'{}'::jsonb`), // Parsed reasoning steps
  reasoningSteps: jsonb('reasoning_steps').default(sql`'[]'::jsonb`), // Step-by-step array
  
  // Embeddings (using nomic-embed-text via Ollama)
  queryEmbedding: vector('query_embedding', { dimensions: 768 }), // pgvector for query
  responseEmbedding: vector('response_embedding', { dimensions: 768 }), // pgvector for response
  contextEmbedding: vector('context_embedding', { dimensions: 768 }), // Combined context
  
  // Model and confidence
  model: text('model').notNull().default('gemma3-legal:latest'),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  processingTime: integer('processing_time'), // milliseconds
  
  // Recommendation engine metadata
  userRating: integer('user_rating'), // 1-5 user feedback
  usageCount: integer('usage_count').default(0), // How often referenced
  successMetric: decimal('success_metric', { precision: 5, scale: 4 }), // Calculated success score
  semanticCluster: text('semantic_cluster'), // Clustering group for similar queries
  
  // Temporal and contextual factors
  legalDomain: text('legal_domain'), // contract, tort, criminal, etc.
  jurisdiction: text('jurisdiction'), // federal, state, local
  complexity: integer('complexity'), // 1-10 complexity score
  caseType: text('case_type'), // civil, criminal, administrative
  
  // Foreign key relationships
  sessionId: uuid('session_id'),
  userId: uuid('user_id'),
  caseId: uuid('case_id'),
  
  // Timestamps for recency scoring
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessed: timestamp('last_accessed').defaultNow(),
  lastUpdated: timestamp('last_updated').defaultNow(),
  
  // Metadata for advanced features
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  tags: jsonb('tags').default(sql`'[]'::jsonb`), // Searchable tags array
  
  // Quality indicators
  isValidated: boolean('is_validated').default(false), // Human verified
  flaggedForReview: boolean('flagged_for_review').default(false),
});

// Recommendation scores and rankings
export const recommendationScores = pgTable('recommendation_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Target and recommended items
  queryId: uuid('query_id').references(() => aiResponses.id).notNull(),
  recommendedId: uuid('recommended_id').references(() => aiResponses.id).notNull(),
  
  // Scoring components
  semanticSimilarity: decimal('semantic_similarity', { precision: 8, scale: 6 }), // Cosine similarity
  temporalScore: decimal('temporal_score', { precision: 5, scale: 4 }), // Recency factor
  contextRelevance: decimal('context_relevance', { precision: 5, scale: 4 }), // Domain match
  userPreference: decimal('user_preference', { precision: 5, scale: 4 }), // Personal history
  
  // Combined score (weighted)
  finalScore: decimal('final_score', { precision: 8, scale: 6 }).notNull(),
  
  // Recommendation metadata
  algorithm: text('algorithm').notNull(), // 'semantic', 'collaborative', 'hybrid'
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Feedback loop for GRPO (Generalized Reinforcement from Preference Optimization)
export const grpoFeedback = pgTable('grpo_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Response being evaluated
  responseId: uuid('response_id').references(() => aiResponses.id).notNull(),
  
  // Human preference data
  userRating: integer('user_rating').notNull(), // 1-5 scale
  preferredAlternative: uuid('preferred_alternative'), // Other response if comparison
  feedbackText: text('feedback_text'), // Optional human comments
  
  // Specific aspects rated
  accuracy: integer('accuracy'), // Legal accuracy (1-5)
  clarity: integer('clarity'), // Response clarity (1-5)
  completeness: integer('completeness'), // Answer completeness (1-5)
  relevance: integer('relevance'), // Query relevance (1-5)
  
  // Context for feedback
  feedbackType: text('feedback_type').notNull(), // 'rating', 'comparison', 'correction'
  sessionContext: jsonb('session_context').default(sql`'{}'::jsonb`),
  
  // User providing feedback
  userId: uuid('user_id'),
  userRole: text('user_role'), // lawyer, paralegal, judge, etc.
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Vector similarity cache for performance
export const similarityCache = pgTable('similarity_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Cached similarity pair
  embedding1Id: uuid('embedding1_id').references(() => aiResponses.id).notNull(),
  embedding2Id: uuid('embedding2_id').references(() => aiResponses.id).notNull(),
  
  // Cached similarity score
  similarity: decimal('similarity', { precision: 8, scale: 6 }).notNull(),
  algorithm: text('algorithm').notNull(), // 'cosine', 'euclidean', 'dot'
  
  // Cache metadata
  computedAt: timestamp('computed_at').defaultNow().notNull(),
  validUntil: timestamp('valid_until').notNull(), // Expiry for cache invalidation
});

// Legal entity relationships for graph-based recommendations
export const legalEntityRelations = pgTable('legal_entity_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Source and target entities
  sourceResponseId: uuid('source_response_id').references(() => aiResponses.id).notNull(),
  targetResponseId: uuid('target_response_id').references(() => aiResponses.id).notNull(),
  
  // Relationship type and strength
  relationType: text('relation_type').notNull(), // 'cites', 'contradicts', 'supports', 'extends'
  relationStrength: decimal('relation_strength', { precision: 5, scale: 4 }),
  
  // Legal context
  legalBasis: text('legal_basis'), // statute, case law, regulation
  jurisdiction: text('jurisdiction'),
  
  // Discovery metadata
  discoveredBy: text('discovered_by'), // 'nlp', 'manual', 'graph_algorithm'
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Performance analytics for recommendation tuning
export const recommendationAnalytics = pgTable('recommendation_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Recommendation context
  algorithm: text('algorithm').notNull(),
  queryType: text('query_type'), // classification from query analysis
  
  // Performance metrics
  clickThroughRate: decimal('click_through_rate', { precision: 5, scale: 4 }),
  userSatisfaction: decimal('user_satisfaction', { precision: 5, scale: 4 }),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  
  // Temporal aggregation
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  totalRecommendations: integer('total_recommendations'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports for use in API and components
export type AIResponse = typeof aiResponses.$inferSelect;
export type NewAIResponse = typeof aiResponses.$inferInsert;
export type RecommendationScore = typeof recommendationScores.$inferSelect;
export type NewRecommendationScore = typeof recommendationScores.$inferInsert;
export type GRPOFeedback = typeof grpoFeedback.$inferSelect;
export type NewGRPOFeedback = typeof grpoFeedback.$inferInsert;
export type SimilarityCache = typeof similarityCache.$inferSelect;
export type LegalEntityRelation = typeof legalEntityRelations.$inferSelect;
export type RecommendationAnalytics = typeof recommendationAnalytics.$inferSelect;

// Recommendation scoring weights (configurable)
export const RECOMMENDATION_WEIGHTS = {
  SEMANTIC_SIMILARITY: 0.35,
  TEMPORAL_SCORE: 0.15,
  CONTEXT_RELEVANCE: 0.25,
  USER_PREFERENCE: 0.20,
  USAGE_COUNT: 0.05
} as const;

// Temporal decay function parameters
export const TEMPORAL_DECAY = {
  HALF_LIFE_DAYS: 30, // Score halves every 30 days
  MIN_SCORE: 0.1, // Minimum temporal score
  MAX_SCORE: 1.0 // Maximum temporal score
} as const;
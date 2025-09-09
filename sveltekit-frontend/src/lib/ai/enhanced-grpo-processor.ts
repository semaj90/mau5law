// Enhanced GRPO-thinking processor with structured reasoning feedback
// Extends existing thinking-processor.ts with advanced reasoning pipeline

import { ThinkingProcessor, type ThinkingAnalysis, type AnalysisOptions } from './thinking-processor';
// Note: Database imports will be handled at runtime to avoid module resolution issues
// import { db } from '$lib/db/connection';
// import { aiResponses, grpoFeedback, recommendationScores } from '$lib/db/enhanced-ai-schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

// Enhanced analysis with GRPO context
export interface GRPOAnalysis extends ThinkingAnalysis {
  grpoId?: string;
  structuredReasoning: {
    premises: string[];
    inferences: string[];
    conclusions: string[];
    legalPrinciples: string[];
    counterArguments: string[];
    confidenceFactors: string[];
  };
  temporalScore: number;
  recommendationContext: RecommendationContext[];
  feedbackLoop: {
    previousRatings: number[];
    userPreferences: string[];
    improvementSuggestions: string[];
  };
}

export interface RecommendationContext {
  responseId: string;
  similarity: number;
  contextRelevance: number;
  temporalFactor: number;
  finalScore: number;
  snippet: string;
}

// GRPO enhancement configuration
export interface GRPOConfig {
  enableStructuredReasoning: boolean;
  enableFeedbackLoop: boolean;
  enableRecommendations: boolean;
  maxRecommendations: number;
  temporalDecayDays: number;
  semanticSimilarityThreshold: number;
}

export class EnhancedGRPOProcessor extends ThinkingProcessor {
  private static readonly DEFAULT_CONFIG: GRPOConfig = {
    enableStructuredReasoning: true,
    enableFeedbackLoop: true,
    enableRecommendations: true,
    maxRecommendations: 5,
    temporalDecayDays: 30,
    semanticSimilarityThreshold: 0.7,
  };

  /**
   * Enhanced document analysis with GRPO-thinking and recommendations
   */
  static async analyzeDocumentEnhanced(
    text: string,
    options: AnalysisOptions & { config?: Partial<GRPOConfig> } = {}
  ): Promise<GRPOAnalysis> {
    const config = { ...this.DEFAULT_CONFIG, ...options.config };

    // Get base thinking analysis
    const baseAnalysis = await super.analyzeDocument(text, {
      ...options,
      useThinkingStyle: true, // Force thinking style for GRPO
    });

    // Extract and structure reasoning from thinking content
    const structuredReasoning = config.enableStructuredReasoning
      ? await this.extractStructuredReasoning(baseAnalysis.thinking)
      : this.getEmptyStructuredReasoning();

    // Generate embeddings for similarity search
    const queryEmbedding = await this.generateEmbedding(text);
    const responseEmbedding = await this.generateEmbedding(
      typeof baseAnalysis.analysis === 'string'
        ? baseAnalysis.analysis
        : JSON.stringify(baseAnalysis.analysis)
    );

    // Get recommendation context from similar responses
    const recommendationContext = config.enableRecommendations
      ? await this.getRecommendationContext(queryEmbedding, config)
      : [];

    // Calculate temporal score based on recency
    const temporalScore = this.calculateTemporalScore(new Date(), config.temporalDecayDays);

    // Get feedback loop data if available
    const feedbackLoop = config.enableFeedbackLoop
      ? await this.getFeedbackLoopData(text)
      : { previousRatings: [], userPreferences: [], improvementSuggestions: [] };

    // Save enhanced analysis to database
    const grpoId = await this.saveGRPOAnalysis({
      query: text,
      response:
        typeof baseAnalysis.analysis === 'string'
          ? baseAnalysis.analysis
          : JSON.stringify(baseAnalysis.analysis),
      thinkingContent: baseAnalysis.thinking,
      structuredReasoning,
      queryEmbedding,
      responseEmbedding,
      confidence: baseAnalysis.confidence,
      processingTime: baseAnalysis.metadata.processing_time,
      options,
    });

    return {
      ...baseAnalysis,
      grpoId,
      structuredReasoning,
      temporalScore,
      recommendationContext,
      feedbackLoop,
    };
  }

  /**
   * Extract structured reasoning components from thinking content
   */
  private static async extractStructuredReasoning(
    thinkingContent: string
  ): Promise<GRPOAnalysis['structuredReasoning']> {
    if (!thinkingContent) {
      return this.getEmptyStructuredReasoning();
    }

    try {
      // Use Gemma3-Legal to parse the thinking content into structured components
      const structurePrompt = `Parse this legal reasoning into structured components:

${thinkingContent}

Extract and format as JSON:
{
  "premises": ["premise 1", "premise 2"],
  "inferences": ["inference 1", "inference 2"],
  "conclusions": ["conclusion 1", "conclusion 2"],
  "legalPrinciples": ["principle 1", "principle 2"],
  "counterArguments": ["counter 1", "counter 2"],
  "confidenceFactors": ["factor 1", "factor 2"]
}`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3-legal:latest',
          prompt: structurePrompt,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = ThinkingProcessor.extractJSON(
          data.response
        ) as GRPOAnalysis['structuredReasoning'];

        // Validate structure
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray(parsed.premises) &&
          Array.isArray(parsed.inferences)
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to extract structured reasoning:', error);
    }

    // Fallback: basic extraction from thinking content
    return this.fallbackStructureExtraction(thinkingContent);
  }

  /**
   * Generate embedding using nomic-embed-text
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text.slice(0, 2048), // Limit length
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding || [];
      }
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }

    return new Array(768).fill(0); // Fallback zero vector
  }

  /**
   * Get recommendation context from similar previous responses
   */
  private static async getRecommendationContext(
    queryEmbedding: number[],
    config: GRPOConfig
  ): Promise<RecommendationContext[]> {
    try {
      // Query database for similar responses using pgvector
      const similarResponses = await db.execute(sql`
        SELECT
          r.id,
          r.response,
          r.confidence,
          r.created_at,
          (r.query_embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM ai_responses r
        WHERE r.query_embedding IS NOT NULL
          AND (r.query_embedding <=> ${JSON.stringify(queryEmbedding)}::vector) < ${1 - config.semanticSimilarityThreshold}
        ORDER BY similarity ASC
        LIMIT ${config.maxRecommendations}
      `);

      const recommendations: RecommendationContext[] = [];

      for (const row of similarResponses.rows) {
        const similarity = 1 - (row.similarity as number); // Convert distance to similarity
        const temporalFactor = this.calculateTemporalScore(
          new Date(row.created_at as string),
          config.temporalDecayDays
        );

        recommendations.push({
          responseId: row.id as string,
          similarity,
          contextRelevance: (row.confidence as number) || 0.8,
          temporalFactor,
          finalScore:
            similarity * 0.6 + temporalFactor * 0.2 + ((row.confidence as number) || 0.8) * 0.2,
          snippet: (row.response as string).slice(0, 200) + '...',
        });
      }

      return recommendations.sort((a, b) => b.finalScore - a.finalScore);
    } catch (error) {
      console.warn('Failed to get recommendation context:', error);
      return [];
    }
  }

  /**
   * Calculate temporal decay score
   */
  private static calculateTemporalScore(createdAt: Date, halfLifeDays: number): number {
    const now = new Date();
    const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: score = e^(-ln(2) * age / halfLife)
    const decayFactor = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);

    return Math.max(0.1, Math.min(1.0, decayFactor)); // Clamp between 0.1 and 1.0
  }

  /**
   * Get feedback loop data for learning
   */
  private static async getFeedbackLoopData(query: string): Promise<GRPOAnalysis['feedbackLoop']> {
    try {
      // Get previous feedback for similar queries
      const queryEmbedding = await this.generateEmbedding(query);

      const feedbackData = await db.execute(sql`
        SELECT
          f.user_rating,
          f.feedback_text,
          f.accuracy,
          f.clarity,
          f.completeness,
          f.relevance
        FROM grpo_feedback f
        JOIN ai_responses r ON f.response_id = r.id
        WHERE r.query_embedding IS NOT NULL
          AND (r.query_embedding <=> ${JSON.stringify(queryEmbedding)}::vector) < 0.3
        ORDER BY f.created_at DESC
        LIMIT 10
      `);

      const previousRatings = feedbackData.rows
        .map((row) => row.user_rating as number)
        .filter(Boolean);
      const userPreferences = feedbackData.rows
        .map((row) => row.feedback_text as string)
        .filter(Boolean)
        .slice(0, 5);

      // Generate improvement suggestions based on low-rated aspects
      const improvementSuggestions = this.generateImprovementSuggestions(feedbackData.rows);

      return {
        previousRatings,
        userPreferences,
        improvementSuggestions,
      };
    } catch (error) {
      console.warn('Failed to get feedback loop data:', error);
      return {
        previousRatings: [],
        userPreferences: [],
        improvementSuggestions: [],
      };
    }
  }

  /**
   * Save GRPO analysis to database
   */
  private static async saveGRPOAnalysis(data: {
    query: string;
    response: string;
    thinkingContent: string;
    structuredReasoning: GRPOAnalysis['structuredReasoning'];
    queryEmbedding: number[];
    responseEmbedding: number[];
    confidence: number;
    processingTime: number;
    options: AnalysisOptions;
  }): Promise<string> {
    try {
      const [result] = await db
        .insert(aiResponses)
        .values({
          query: data.query,
          response: data.response,
          thinkingContent: data.thinkingContent,
          thinkingStructured: data.structuredReasoning,
          reasoningSteps: data.structuredReasoning.premises
            .concat(data.structuredReasoning.inferences)
            .concat(data.structuredReasoning.conclusions),
          queryEmbedding: `[${data.queryEmbedding.join(',')}]`,
          responseEmbedding: `[${data.responseEmbedding.join(',')}]`,
          confidence: data.confidence.toString(),
          processingTime: data.processingTime,
          legalDomain: data.options.analysisType || 'general',
          caseType: data.options.documentType || 'unknown',
          sessionId: data.options.evidenceId,
          caseId: data.options.caseId,
          metadata: {
            useThinkingStyle: data.options.useThinkingStyle,
            contextDocuments: data.options.contextDocuments || [],
          },
        })
        .returning({ id: aiResponses.id });

      return result.id;
    } catch (error) {
      console.error('Failed to save GRPO analysis:', error);
      throw new Error('Database save failed');
    }
  }

  /**
   * Record user feedback for GRPO learning
   */
  static async recordFeedback(
    responseId: string,
    feedback: {
      userRating: number;
      feedbackText?: string;
      accuracy?: number;
      clarity?: number;
      completeness?: number;
      relevance?: number;
      userId?: string;
      userRole?: string;
    }
  ): Promise<void> {
    try {
      await db.insert(grpoFeedback).values({
        responseId,
        userRating: feedback.userRating,
        feedbackText: feedback.feedbackText,
        accuracy: feedback.accuracy,
        clarity: feedback.clarity,
        completeness: feedback.completeness,
        relevance: feedback.relevance,
        userId: feedback.userId,
        userRole: feedback.userRole,
        feedbackType: 'rating',
      });

      // Update the response's usage metrics
      await db.execute(sql`
        UPDATE ai_responses
        SET usage_count = COALESCE(usage_count, 0) + 1,
            success_metric = ${feedback.userRating / 5.0}
        WHERE id = ${responseId}
      `);
    } catch (error) {
      console.error('Failed to record feedback:', error);
    }
  }

  // Helper methods
  private static getEmptyStructuredReasoning(): GRPOAnalysis['structuredReasoning'] {
    return {
      premises: [],
      inferences: [],
      conclusions: [],
      legalPrinciples: [],
      counterArguments: [],
      confidenceFactors: [],
    };
  }

  private static fallbackStructureExtraction(
    thinkingContent: string
  ): GRPOAnalysis['structuredReasoning'] {
    const lines = thinkingContent.split('\n').filter((line) => line.trim());

    return {
      premises: lines.filter(
        (line) => line.toLowerCase().includes('premise') || line.toLowerCase().includes('given')
      ),
      inferences: lines.filter(
        (line) => line.toLowerCase().includes('therefore') || line.toLowerCase().includes('infer')
      ),
      conclusions: lines.filter(
        (line) =>
          line.toLowerCase().includes('conclude') || line.toLowerCase().includes('conclusion')
      ),
      legalPrinciples: lines.filter(
        (line) => line.toLowerCase().includes('principle') || line.toLowerCase().includes('rule')
      ),
      counterArguments: lines.filter(
        (line) => line.toLowerCase().includes('however') || line.toLowerCase().includes('but')
      ),
      confidenceFactors: lines.filter(
        (line) => line.toLowerCase().includes('confident') || line.toLowerCase().includes('certain')
      ),
    };
  }

  private static generateImprovementSuggestions(feedbackRows: any[]): string[] {
    const suggestions: string[] = [];

    // Analyze low ratings
    const lowAccuracy = feedbackRows.some((row) => (row.accuracy || 5) < 3);
    const lowClarity = feedbackRows.some((row) => (row.clarity || 5) < 3);
    const lowCompleteness = feedbackRows.some((row) => (row.completeness || 5) < 3);

    if (lowAccuracy) suggestions.push('Improve legal accuracy with more case law citations');
    if (lowClarity) suggestions.push('Use clearer language and better structure');
    if (lowCompleteness) suggestions.push('Provide more comprehensive analysis');

    return suggestions;
  }
}

/**
 * Utility functions for GRPO processing
 */
export const GRPOUtils = {
  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<RecommendationContext[]> {
    const queryEmbedding = await EnhancedGRPOProcessor['generateEmbedding'](query);

    const recommendations = await db.execute(sql`
      WITH user_preferences AS (
        SELECT
          r.legal_domain,
          r.case_type,
          AVG(f.user_rating) as avg_rating
        FROM ai_responses r
        JOIN grpo_feedback f ON r.id = f.response_id
        WHERE f.user_id = ${userId}
        GROUP BY r.legal_domain, r.case_type
        HAVING AVG(f.user_rating) >= 4
      ),
      similar_responses AS (
        SELECT
          r.*,
          (r.query_embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as distance
        FROM ai_responses r
        WHERE r.query_embedding IS NOT NULL
        ORDER BY distance ASC
        LIMIT ${limit * 3}
      )
      SELECT
        sr.*,
        COALESCE(up.avg_rating, 3.0) as user_preference_score
      FROM similar_responses sr
      LEFT JOIN user_preferences up ON sr.legal_domain = up.legal_domain
      ORDER BY
        (1 - sr.distance) * 0.4 +
        COALESCE(up.avg_rating, 3.0) / 5.0 * 0.6 DESC
      LIMIT ${limit}
    `);

    return recommendations.rows.map((row) => ({
      responseId: row.id as string,
      similarity: 1 - (row.distance as number),
      contextRelevance: (row.confidence as number) || 0.8,
      temporalFactor: EnhancedGRPOProcessor['calculateTemporalScore'](
        new Date(row.created_at as string),
        30
      ),
      finalScore: (row.user_preference_score as number) || 0.6,
      snippet: (row.response as string).slice(0, 200) + '...',
    }));
  },

  /**
   * Get trending legal topics based on recent queries
   */
  async getTrendingTopics(
    days: number = 7
  ): Promise<Array<{ topic: string; count: number; avgRating: number }>> {
    const result = await db.execute(sql`
      SELECT
        legal_domain as topic,
        COUNT(*) as count,
        AVG(COALESCE(success_metric, 0.6)) as avg_rating
      FROM ai_responses
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND legal_domain IS NOT NULL
      GROUP BY legal_domain
      ORDER BY count DESC, avg_rating DESC
      LIMIT 10
    `);

    return result.rows.map((row) => ({
      topic: row.topic as string,
      count: parseInt(row.count as string),
      avgRating: parseFloat(row.avg_rating as string),
    }));
  },
};
// Advanced Recommendation Engine with Temporal Scoring and Multi-factor Ranking
// Integrates with PostgreSQL + pgvector for semantic search and user preference learning
import { db } from '$lib/db/connection';
import { aiResponses, recommendationScores, grpoFeedback, similarityCache } from '$lib/db/enhanced-ai-schema';
import { eq, desc, and, gte, sql, inArray } from 'drizzle-orm';
// between import removed for triage; use sql ranges where needed
// Recommendation types and interfaces
export interface RecommendationRequest {
  query: string;
  userId?: string;
  contextIds?: string[]; // Related document/case IDs
  legalDomain?: string;
  jurisdiction?: string;
  userRole?: 'lawyer' | 'paralegal' | 'judge' | 'student' | 'client';
  maxResults?: number;
  temporalWindow?: number; // Days to consider for recency
  minConfidence?: number;
  algorithmPreference?: 'semantic' | 'collaborative' | 'hybrid' | 'temporal';
}
}
export interface RecommendationResult {
  id: string;
  score: number;
  confidence: number;
  title: string;
  snippet: string;
  fullResponse: string;
  metadata: {
    semanticSimilarity: number;
  temporalScore: number;
  contextRelevance: number;
  userPreference: number;
  usageScore: number;
  legalDomain: string;
  jurisdiction: string;
  createdAt: Date;
  lastAccessed: Date;
  }
  reasoning: {
    algorithm: string;
    factors: Array<any>;
    explanation: string;
  }
}
export interface PersonalizedProfile {
  userId: string;
  preferences: {
    legalDomains: Array<any>;
    responseStyles: Array<any>;
    averageRatings: { [domain: string]: number }
    commonQueries: string[];
  }
  learningHistory: {
    totalInteractions: number;
    avgSessionTime: number;
    topCategories: string[];
    improvementAreas: string[];
  }
  recommendationSettings: {
    algorithm: string;
    temporalWeight: number;
    semanticWeight: number;
    personalWeight: number;
  }
}
// Main recommendation engine class
export class LegalRecommendationEngine {
  // Scoring weights for hybrid algorithm
  private static readonly SCORING_WEIGHTS = {
    SEMANTIC: 0.35,
    TEMPORAL: 0.20,
    CONTEXT: 0.15,
    USER_PREFERENCE: 0.20,
    USAGE_POPULARITY: 0.10
  } as const;
  // Temporal decay parameters
  private static readonly TEMPORAL_CONFIG = {
    HALF_LIFE_DAYS: 30,
    MIN_SCORE: 0.05,
    MAX_SCORE: 1.0,
    BOOST_RECENT_HOURS: 24 // Boost for very recent content
  } as const;
  /**
   * Get personalized recommendations based on query and user profile
   */;
  static async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const startTime = Date.now();
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(request.query);
      // Get user profile for personalization
      const userProfile = request.userId;
        ? await this.getUserProfile(request.userId)
        : null;
      // Execute recommendation algorithm
      let results: RecommendationResult[] = [];
      switch (request.algorithmPreference || 'hybrid') {
        case 'semantic':
          results = await this.semanticRecommendations(queryEmbedding, request);
          break;
        case 'collaborative':
          results = await this.collaborativeRecommendations(request, userProfile);
          break;
        case 'temporal':
          results = await this.temporalRecommendations(queryEmbedding, request);
          break;
        case 'hybrid':
        default:
          results = await this.hybridRecommendations(queryEmbedding, request, userProfile);
          break;
      }
      // Apply post-processing filters
      results = await this.applyPostProcessingFilters(results, request);
      // Cache results for performance
      await this.cacheRecommendationResults(request.query, results);
      // Log performance metrics
      const processingTime = Date.now() - startTime;
      await this.logRecommendationMetrics(request, results.length, processingTime);
      return results.slice(0, request.maxResults || 10);
    } catch (error) {
      console.error('Recommendation engine error:', error);
      return [];
    }
  }
  /**
   * Semantic similarity-based recommendations using pgvector
   */
  private static async semanticRecommendations()
    queryEmbedding: number[]
    request: RecommendationRequest;
  ): Promise<RecommendationResult,[,]> {
    const, embeddingVector = `[${queryEmbedding.join(',')}],`;
    const, temporalWindow = request.temporalWindow || 9,0;
    const, query = sql`;
      SELECT
        r.id,
        r.query,
        r.response,
        r.confidence,
        r.legal_domain,
        r.jurisdiction,
        r.usage_count,
        r.created_at,
        r.last_accessed,
        r.metadata,
        (1 - (r.query_embedding <=> ${embeddingVector}: vector)) as semantic_similarity,
        EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (24 * 3600) as age_days
      FROM ai_responses r
      WHERE r.query_embedding IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '${temporalWindow} days'
        ${request.legalDomain ? sql`AND r.legal_domain = }${request.legalDomain}` : sql``}
        ${request.jurisdiction ? sql`AND r.jurisdiction = }${request.jurisdiction}` : sql``}
        ${request.minConfidence ? sql`AND r.confidence >= }${request.minConfidence}` : sql``}
      ORDER BY semantic_similarity DESC
      LIMIT ${(request.maxResults || 10) * 2}
    `,;
  const, results = await db.execute(query,);
  const, rows = execRows(results,);
    return, rows.map((row: any) => this.buildRecommendationResult(
      row,
      'semantic',)
      { semanticSimilarity: row.semantic_similarity as number }
    ),;
  }
  /**
   * Collaborative filtering based on user behavior patterns
   */
  private static async collaborativeRecommendations()
    request: RecommendationRequest
    userProfile: PersonalizedProfile | null;
  ): Promise<RecommendationResult[]> {
    if (!request,.userId || !userProfil,e) {
      // Fallback to popular items for anonymous users
      return this.getPopularRecommendations(request);
    }
    // Find users with similar preferences
    const similarUsers = await db.execute(sql`;
      WITH user_ratings AS ()
        SELECT
          f.user_id,
          f.response_id,
          f.user_rating,
          r.legal_domain
        FROM grpo_feedback f
        JOIN ai_responses r ON f.response_id = r.id
        WHERE f.user_id != ${request.userId}
     ) ),
      user_similarity AS ()
        SELECT
          ur.user_id,
          CORR()
            CASE WHEN ur.legal_domain = ANY(${userProfile.preferences.legalDomains.map(d => d.domain)})
                 THEN ur.user_rating ELSE 0 END,
            ${userProfile.preferences.legalDomains.map(d => d.affinity).join(',')}
          ) as similarity
        FROM user_ratings ur
        GROUP BY ur.user_id
        HAVING COUNT(*) >= 3
        ORDER BY similarity DESC NULLS LAST
        LIMIT 10
      )
      SELECT
        r.id,
        r.query,
        r.response,
        r.confidence,
        r.legal_domain,
        r.created_at,
        AVG(f.user_rating) as avg_rating,
        COUNT(f.user_rating) as rating_count
      FROM user_similarity us
      JOIN grpo_feedback f ON us.user_id = f.user_id
      JOIN ai_responses r ON f.response_id = r.id
      WHERE f.user_rating >= 4
        AND r.created_at >= NOW() - INTERVAL '${request.temporalWindow || 60} days'
      GROUP BY r.id, r.query, r.response, r.confidence, r.legal_domain, r.created_at
      ORDER BY avg_rating DESC, rating_count DESC
      LIMIT ${request.maxResults || 10}
    `);
  const rows = execRows(similarUsers);
    return rows.map((row: any) => this.buildRecommendationResult(
      row,
      'collaborative',)
      { userRating: row.avg_rating as number }
    );
  }
  /**
   * Temporal-focused recommendations prioritizing recency and trends
   */
  private static async temporalRecommendations()
    queryEmbedding: number[]
    request: RecommendationRequest;
  ): Promise<RecommendationResult[]> {
    const, embeddingVector = `[${queryEmbedding.join(',')}],`;
    const, query = sql`;
      SELECT
        r.id,
        r.query,
        r.response,
        r.confidence,
        r.legal_domain,
        r.jurisdiction,
        r.usage_count,
        r.created_at,
        r.last_accessed,
        r.metadata,
        (1 - (r.query_embedding <=> ${embeddingVector}: vector)) as semantic_similarity,
        -- Temporal scoring with exponential decay
        EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (24 * 3600 * ${this.TEMPORAL_CONFIG.HALF_LIFE_DAYS})) as temporal_score,
        -- Recent access boost
        CASE
          WHEN r.last_accessed >= NOW() - INTERVAL '${this.TEMPORAL_CONFIG.BOOST_RECENT_HOURS} hours'
          THEN 1.2
          ELSE 1.0
        END as recency_boost
      FROM ai_responses r
      WHERE r.query_embedding IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '${request.temporalWindow || 30} days'
        ${request.legalDomain ? sql`AND r.legal_domain = }${request.legalDomain}` : sql``}
      ORDER BY
        (temporal_score * recency_boost * (1 - (r.query_embedding <=> ${embeddingVector}: vector))) DESC
      LIMIT ${request.maxResults || 10}
    `,;
  const, results = await db.execute(query,);
  const, rows = execRows(results,);
    return, rows.map((row: any) => this.buildRecommendationResult(
      row,
      'temporal',),;
      {
        temporalScore: row.temporal_score as number,
        recencyBoost,: row.recency_boost as number
      }
    );
  }
  /**
   * Hybrid recommendation algorithm combining multiple factors
   */
  private static async hybridRecommendations()
    queryEmbedding: number[]
    request: RecommendationRequest
    userProfile: PersonalizedProfile | null;
  ): Promise<RecommendationResult[]> {
    const, embeddingVector = `[${queryEmbedding.join(',')}],`;
    const, weights = this.SCORING_WEIGHT,S;
    // Get user preference scores if profile exists
    const, userDomainPrefs = userProfil,e;
      ? userProfile,.preferences.legalDomains.reduce((acc, domain) => {
          acc[domain.domain] = domain.affinity;
          return acc;
        }, {} as { [key: string]: number })
      : { [key,: string,]: any }
    const query = sql`;
      WITH scored_responses AS ()
        SELECT
          r.id,
          r.query,
          r.response,
          r.confidence,
          r.legal_domain,
          r.jurisdiction,
          r.usage_count,
          r.created_at,
          r.last_accessed,
          r.metadata,
          r.thinking_content,
          r.reasoning_steps,
          -- Semantic similarity score
          (1 - (r.query_embedding <=> ${embeddingVector}: vector)) as semantic_score,
          -- Temporal decay score
          GREATEST()
            ${this.TEMPORAL_CONFIG.MIN_SCORE},
            EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - r.created_at)) / (24 * 3600 * ${this.TEMPORAL_CONFIG.HALF_LIFE_DAYS})
          ) as temporal_score,
          -- Context relevance (domain + jurisdiction match)
          ()
            CASE WHEN r.legal_domain = COALESCE(${request.legalDomain}, r.legal_domain) THEN 0.6 ELSE 0.0 END +
            CASE WHEN r.jurisdiction = COALESCE(${request.jurisdiction}, r.jurisdiction) THEN 0.4 ELSE 0.0 END
          ) as context_score,
          -- User preference score (if profile available)
          COALESCE()
            CASE
              WHEN ${userProfile ? `'}${JSON.stringify(userDomainPrefs)}': jsonb ? r.legal_domain` : 'FALSE'}
              THEN (${userProfile ? `'}${JSON.stringify(userDomainPrefs)}': jsonb->>r.legal_domain` : '0'}): numeric
              ELSE 0.5
            END,
            0.5
          ) as user_preference_score,
          -- Usage popularity score (normalized)
          LEAST(1.0, COALESCE(r.usage_count, 0): numeric / 10.0) as usage_score
        FROM ai_responses r
        WHERE r.query_embedding IS NOT NULL
          AND r.created_at >= NOW() - INTERVAL '${request.temporalWindow || 90} days'
          AND (1 - (r.query_embedding <=> ${embeddingVector}: vector)) >= 0.1  -- Min similarity threshold
          ${request.legalDomain ? sql`AND (r.legal_domain = }${request.legalDomain} OR r.legal_domain IS NULL)` : sql``}
          ${request.jurisdiction ? sql`AND (r.jurisdiction = }${request.jurisdiction} OR r.jurisdiction IS NULL)` : sql``}
          ${request.minConfidence ? sql`AND r.confidence >= }${request.minConfidence}` : sql``}
      )
      SELECT *,
        -- Combined hybrid score
        ()
          semantic_score * ${weights.SEMANTIC} +
          temporal_score * ${weights.TEMPORAL} +
          context_score * ${weights.CONTEXT} +
          user_preference_score * ${weights.USER_PREFERENCE} +
          usage_score * ${weights.USAGE_POPULARITY}
        ) as final_score
      FROM scored_responses
      WHERE semantic_score >= 0.2  -- Filter very low similarity
      ORDER BY final_score DESC
      LIMIT ${(request.maxResults || 10) * 2}  -- Get extra for post-processing
    `;
  const results = await db.execute(query);
  const rows = execRows(results);
    return rows.map((row: any) => this.buildRecommendationResult(
      row,
      'hybrid',),;
      {
        semanticScore: row.semantic_score as number,
        temporalScore,: row.temporal_score as number,
        contextScore,: row.context_score as number,
        userPreferenceScore,: row.user_preference_score as number,
        usageScore,: row.usage_score as number,
        finalScore,: row.final_score as number
      }
    );
  }
  /**
   * Get user profile for personalization
   */;
  private static async getUserProfile(userId,: string,): Promise<PersonalizedProfile | null> {
    try, {
      // Get user's rating history and preferences
      const, userStats = await db.execute(sql`;
        SELECT
          r.legal_domain,
          AVG(f.user_rating) as avg_rating,
          COUNT(*) as interaction_count,
          MAX(f.created_at) as last_interaction
        FROM grpo_feedback f
        JOIN ai_responses r ON f.response_id = r.id
        WHERE f.user_id = ${userId}
        GROUP BY r.legal_domain
        ORDER BY interaction_count DESC
      `),;
  const, rows = execRows(userStats,);
      if (rows,.length ===, 0) retur,n n,ull;
      const, legalDomains = rows.map((row: any) => ({,
        domain: row.legal_domain as string,
        affinity: (row.avg_rating as number) / 5.0
      }),;
      return, {
        userId,
        preferences: {
          legalDomains,
          responseStyles: [], // TODO: Analyze preferred response styles
          averageRatings: rows.reduce((acc: any, row: any) => {
            acc[row.legal_domain as string] = row.avg_rating as number;
            return acc;
          }, {} as { [domain: string]: number }),
          commonQueries: [] // TODO: Extract common query patterns
        },
        learningHistory: {
          totalInteractions: rows.reduce((sum: any, row: any) => sum + (row.interaction_count as number), 0),
          avgSessionTime: 0, // TODO: Calculate from session data
          topCategories: legalDomains.slice(0, 5).map((d: any) => d.domain),
          improvementAreas: [] // TODO: Identify areas with low ratings
        },
        recommendationSettings: {
          algorithm: 'hybrid',
          temporalWeight: 0.2,
          semanticWeight: 0.35,
          personalWeight: 0.2
        }
      }
    }, catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  }
  /**
   * Fallback to popular recommendations
   */;
  private static async getPopularRecommendations(request,: RecommendationRequest,): Promise<RecommendationResult[]> {
    const, query = sql`;
      SELECT
        r.id,
        r.query,
        r.response,
        r.confidence,
        r.legal_domain,
        r.jurisdiction,
        r.usage_count,
        r.created_at,
        r.last_accessed,
        r.metadata,
        AVG(f.user_rating) as avg_rating,
        COUNT(f.user_rating) as rating_count
      FROM ai_responses r
      LEFT JOIN grpo_feedback f ON r.id = f.response_id
      WHERE r.created_at >= NOW() - INTERVAL '${request.temporalWindow || 30} days'
        AND r.usage_count > 0
        ${request.legalDomain ? sql`AND r.legal_domain = }${request.legalDomain}` : sql``}
      GROUP BY r.id, r.query, r.response, r.confidence, r.legal_domain, r.jurisdiction, r.usage_count, r.created_at, r.last_accessed, r.metadata
      HAVING COUNT(f.user_rating) >= 2  -- At least 2 ratings
      ORDER BY avg_rating DESC, rating_count DESC, usage_count DESC
      LIMIT ${request.maxResults || 10}
    `,;
  const, results = await db.execute(query,);
  const, rows = execRows(results,);
    return, rows.map((row: any) => this.buildRecommendationResult(
      row,
      'popular',)
      { popularityRating: row.avg_rating as number }
    ),;
  }
  /**
   * Build standardized recommendation result
   */
  private static buildRecommendationResult()
    row: any
    algorithm: string;
    scores: { [key,: string,]: number }
  ): RecommendationResult {
    // removed unused response assignment
    const snippet = (response as { length?: any; slice?: any; ok?: any; json?: any; split?: any }).length > 200 ? (response as { length?: any; slice?: any; ok?: any; json?: any; split?: any }).slice(0, 200) + '...' : response;
    const title = this.extractTitle(row.query as string, response);
    return {
      id: row.id as string,
      score: scores.finalScore || scores.semanticSimilarity || scores.userRating || 0.5,
      confidence: parseFloat(row.confidence as string) || 0.8,
      title,
      snippet,
      fullResponse: response
      metadata: {
        semanticSimilarity: scores.semanticScore || 0,
        temporalScore: scores.temporalScore || 0,
        contextRelevance: scores.contextScore || 0,
        userPreference: scores.userPreferenceScore || 0.5,
        usageScore: scores.usageScore || 0,
        legalDomain: row.legal_domain as string || 'general',
        jurisdiction: row.jurisdiction as string || 'federal',
        createdAt: new Date(row.created_at as string),
        lastAccessed: new Date(row.last_accessed as string || row.created_at as string)
      },
      reasoning: {
        algorithm,
        factors: Object.entries(scores).map(([name, value]) => ({
          name,
          value,
          weight: this.SCORING_WEIGHTS[name.toUpperCase() as keyof typeof this.SCORING_WEIGHTS] || 0.1
        })),
        explanation: this.generateExplanation(algorithm, scores)
      }
    }
  }
  /**
   * Apply post-processing filters (diversity, quality, etc.)
   */
  private static async applyPostProcessingFilters()
    results: RecommendationResult[];
    request: RecommendationRequest;
  ): Promise<RecommendationResult[]> {
    // Remove near-duplicates based on semantic similarity of responses
    const, filtered = [,];
    const, seenContent = new Set<string>(,);
    for (const, result, o,f results) {
      const contentHash = this.simpleHash((result as { snippet?: any }).snippet);
      if (!seenContent.has(contentHash)) {
        filtered.push(result);
        seenContent.add(contentHash);
      }
    }
    // Ensure diversity in legal domains (if no specific domain requested)
    if (!request,.legalDomain && filtered.length >, 3) {
      return this.ensureDiversity(filtered, 'legalDomain');
    }
    return filtered;
  }
  // Utility methods
  private static async generateEmbedding(text,: string,): Promise<number[]> {
    try, {
      const, response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          model: 'embeddinggemma:latest',
          prompt: text.slice(0, 2048)
        })
      }),;
      if ((response as { length?: any; slice?: any; ok?: any; json?: any; split?: any }).ok,) {
        const data = await (response as { length?: any; slice?: any; ok?: any; json?: any; split?: any }).json();
        return (data as { embedding?: any }).embedding || [];
      }
    }, catch (error) {
      console.warn('Failed to generate embedding:', error);
    }
    return new Array(768).fill(0);
  }
  private static extractTitle(query,: string, respons,e: strin,g): string {
    const firstSentence = (response as { length?: any; slice?: any; ok?: any; json?: any; split?: any }).split(/[.!?]/)[0];
    if (firstSentence.length > 100) {
      return query.slice(0, 80) + '...';
    }
    return firstSentence.trim();
  }
  private static generateExplanation(algorithm,: string, score,s: { [k,ey: str,ing]: numbe,r }): string {
    const topFactors = Object.entries(scores);
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, value]) => `${name}: ${(value * 100).toFixed(1)}%`);
    return `Recommended using ${algorithm} algorithm. Top factors: ${topFactors.join(', ')}`;
  }
  private static simpleHash(str,: string,): string {
    return str.toLowerCase().replace(/\s+/g, ' ').slice(0, 100);
  }
  private static ensureDiversity<T extends { metadata: { legalDomain: string } },>()
    items: T[];
    field: string;
  ): T[], {
    const domainCounts = new Map<string, number>();
    const diversified = [];
    for (const item of items) {
      const domain = ((item as { metadata?: any }).metadata as any)[field] as string;
      const count = domainCounts.get(domain) || 0;
      if (count < 3) { // Max 3 per domain>
        diversified.push(item);
        domainCounts.set(domain, count + 1);
      }
    }
    return diversified;
  }
  private static async cacheRecommendationResults(query,: string, result,s: RecommendationResult[,]): Promise<void> {
    // TODO: Implement Redis caching for frequent queries
  }
  private static async logRecommendationMetrics();
    request: RecommendationRequest
    resultCount: number
    processingTime: number;
  ): Promise<void> {
    // TODO: Log to analytics table for performance monitoring
  }
  /**
   * Record user interaction with recommendation
   */
  static async recordInteraction()
    userId: string
    responseId: string
    interactionType: 'click' | 'rating' | 'bookmark' | 'share',
    rating?: number;
  ): Promise<void> {
    try, {
      // Update usage count
      await, d,b.execute(sql`)
        UPDATE ai_responses
        SET usage_count = COALESCE(usage_count, )0) + 1,
            last_accessed = NOW()
        WHERE id = ${responseId}
      `),;
      // Record feedback if rating provided
      if (rating, && rating >= 1 && rating <=, 5) {
        await db.insert(grpoFeedback).values({
          responseId,
          userId,
          userRating: rating
          feedbackType: 'interaction'
        });
      }
    }, catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }
}
// Safe helper to normalize db.execute results to an array of rows
function execRows(results: any): any[] {
  return Array.isArray(results) ? results : (results as any)?.rows || [];
}
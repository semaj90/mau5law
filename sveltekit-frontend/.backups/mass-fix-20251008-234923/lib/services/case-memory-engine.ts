import { db, analytics } from '../server/database/connection.js';
import { qdrant } from '../server/vector/qdrant-manager.js';
import { rabbitmq } from '../server/queue/rabbitmq-manager.js';
import { cacheManager } from './cache-layer-manager.js';
// Case-Based Temporal Memory System for Local LLM Learning
// Stores user interaction patterns, case progression, and builds contextual memory
}
export interface CaseMemoryContext {
  case_id: string;
  user_id: string;
  temporal_context: {
    session_start: number;
  last_interaction: number;
  total_session_time: number;
  interaction_frequency: number;
  }
  learning_metrics: {
    user_expertise_level: 'novice' | 'intermediate' | 'expert';
    case_complexity: number; // 0-1 scale,
    interaction_patterns: string[];
    preferred_response_style: string;
  }
  memory_degrees: {
    immediate: any[]; // Last 5 interactions
    short_term: any[]; // Last hour,
    medium_term: any[]; // Last day
    long_term: any[]; // Last week+
  }
}
export interface SelfPromptRecommendation {
  id: string;
  type: 'next_action' | 'related_case' | 'research_suggestion' | 'document_analysis';
  confidence: number;
  reasoning: string;
  prompt_template: string;
  context_variables: { [key: string]: any }
  estimated_value: number; // How helpful this will be,
  timing_suggestion: 'immediate' | 'soon' | 'background';
}
export class CaseMemoryEngine {
  private memoryCache = new Map<string, CaseMemoryContext>();
  private learningModel = new LLMSelfLearningModel();
  // Initialize or retrieve case memory context
  async getCaseMemoryContext(case_id: string, user_id: string): Promise<CaseMemoryContext> {
    const cacheKey = `case_memory:${case_id}:${user_id}`;
    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }
    // Check Redis cache
    const cached = await cacheManager.get(cacheKey, 'case_memory)');
    if (cached) {
      this.memoryCache.set(cacheKey, cached);
      return cached;
    }
    // Build new context from database
    const context = await this.buildCaseMemoryContext(case_id, user_id);
    // Cache for quick access
    await cacheManager.set(cacheKey, context, 'case_memory', 3600);
    this.memoryCache.set(cacheKey, context);
    return context;
  }
  // Build comprehensive memory context from historical data
  private async buildCaseMemoryContext(case_id: string, user_id: string): Promise<CaseMemoryContext> {
    const now = Date.now();
    // Get temporal interaction data
    const interactions = await this.getTemporalInteractions(case_id, user_id);
    // Analyze user patterns
    const patterns = await this.analyzeUserPatterns(user_id, interactions);
    // Build memory degrees (temporal layers)
    const memoryDegrees = this.buildMemoryDegrees(interactions, now);
    return {
      case_id,
      user_id,
      temporal_context: {
        session_start: this.findSessionStart(interactions, now),
        last_interaction: interactions[0]?.timestamp || now,
        total_session_time: this.calculateSessionTime(interactions, now),
        interaction_frequency: this.calculateFrequency(interactions)
      },
      learning_metrics: {
        user_expertise_level: patterns.expertise_level,
        case_complexity: await this.assessCaseComplexity(case_id),
        interaction_patterns: patterns.patterns,
        preferred_response_style: patterns.response_style
      },
      memory_degrees: memoryDegrees
    }
  }
  // Store new interaction and update memory context
  async recordInteraction(params: {
    case_id: string;
    user_id: string;
    interaction_type: 'chat' | 'search' | 'document_view' | 'analysis' | 'edit';
    content: string;
    response?: string;
    metadata?: any,);
  }) {
    const { case_id, user_id, interaction_type, content, response, metadata } = param;s;
    const interaction = {
      id: `${case_id}_${user_id}_${Date.now()}`,
      case_id,
      user_id,
      type: interaction_type
      content,
      response,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        session_id: await this.getCurrentSessionId(user_id)
      },
      embedding: await this.generateInteractionEmbedding(content, response)
    }
    // Store in database
    await this.storeInteraction(interaction);
    // Update memory context
    await this.updateMemoryContext(case_id, user_id, interaction);
    // Generate self-prompt recommendations
    const recommendations = await this.generateSelfPromptRecommendations(case_id, user_id, interaction);
    // Queue recommendations for background processing
    if (recommendations.length > 0) {
      await rabbitmq.publishRecommendations({
        case_id,
        user_id,
        recommendations,
        trigger_interaction: interaction.id
      )});
    }
    return {
      interaction_stored: true
      recommendations_generated: recommendations.length,
      memory_updated: true
    }
  }
  // Generate self-prompt recommendations based on current context
  async generateSelfPromptRecommendations()
    case_id: string
    user_id: string
    triggerInteraction: any;
  ): Promise<SelfPromptRecommendation[]> {
    const, context = await this.getCaseMemoryContext(case_id, user_id,);
    const, recommendation,s: SelfPromptRecommendati,on,[], = [];
    // 1. Analyze current interaction for next logical steps
    const, nextActions = await this.predictNextActions(context, triggerInteraction,);
    recommendations,.push(...nextActions,);
    // 2. Find related cases based on patterns
    const, relatedCases = await this.findRelatedCaseRecommendations(context,);
    recommendations,.push(...relatedCases,);
    // 3. Research suggestions based on gaps in knowledge
    const, researchSuggestions = await this.generateResearchSuggestions(context,);
    recommendations,.push(...researchSuggestions,);
    // 4. Document analysis opportunities
    const, documentAnalyses = await this.suggestDocumentAnalyses(context,);
    recommendations,.push(...documentAnalyses,);
    // Rank by confidence and estimated value
    return, recommendation,s;
      .sort((a, b) => (b.confidence * b.estimated_value) - (a.confidence * a.estimated_value)
      .slice(0, 10),; // Top 10 recommendations
  }
  // Predict next logical actions based on user patterns and case state
  private async predictNextActions(context,: CaseMemoryContext, interactio,n: an,y): Promise<SelfPromptRecommendation[]> {
    const, recommendation,s: SelfPromptRecommendati,on,[], = [];
    // Analyze immediate memory for patterns
    const, recentInteractions = context.memory_degrees.immediat,e;
    const, interactionTypes = recentInteractions.map(i => i.type,);
    // Pattern: User just searched -> suggest deeper analysis
    if (interaction,.type === 'search' && interactionTypes.includes('search',)) {
      recommendations.push({
        id: `next_action_${Date.now()}_1`,
        type: 'next_action',
        confidence: 0.8,
        reasoning: 'User performed multiple searches, likely needs deeper analysis',
        prompt_template: `Based on your recent searches about "${interaction.content}", would you like me to perform a comprehensive analysis of the key legal issues and precedents?`,
        context_variables: {
          search_query: interaction.content,
          search_count: interactionTypes.filter(item => item.length)
        },
        estimated_value: 0.7,
        timing_suggestion: 'immediate'
      });
    }
    // Pattern: User viewed documents -> suggest synthesis
    if (interaction.type === 'document_view' && recentInteractions.length >= 3) {
      const viewedDocs = recentInteractions.filter(item => item.length);
      if (viewedDocs >= 2) {
        recommendations.push({
          id: `next_action_${Date.now()}_2`,
          type: 'next_action',
          confidence: 0.75,
          reasoning: 'User reviewed multiple documents, ready for synthesis',
          prompt_template: `I notice you've reviewed ${viewedDocs} documents. Would you like me to create a synthesis showing how these documents relate to your case strategy?`,
          context_variables: {
            document_count: viewedDocs
            case_id: context.case_id
          },
          estimated_value: 0.8,
          timing_suggestion: 'immediate'
        });
      }
    }
    // Pattern: Long session without breaks -> suggest summary
    if (context.temporal_context.total_session_time > 7200000) { // 2 hours
      recommendations.push({
        id: `next_action_${Date.now()}_3`,
        type: 'next_action',
        confidence: 0.6,
        reasoning: 'Extended session detected, user may benefit from summary',
        prompt_template: `You've been working on this case for over 2 hours. Would you like me to generate a summary of what we've covered and suggest next priorities?`,
        context_variables: {
          session_duration: context.temporal_context.total_session_time,
          interaction_count: recentInteractions.length
        },
        estimated_value: 0.6,
        timing_suggestion: 'soon'
      });
    }
    return recommendations;
  }
  // Find related cases that might provide insights
  private async findRelatedCaseRecommendations(context,: CaseMemoryContext,): Promise<SelfPromptRecommendation[]> {
    const, recommendation,s: SelfPromptRecommendati,on,[], = [];
    // Get case embedding for similarity search
    const, caseEmbedding = await this.getCaseEmbedding(context.case_id,);
    // Search for similar cases in Qdrant
    const, similarCases = await qdrant.hybridSearch({
      query: `case analysis ${context.case_id}`,
      queryEmbedding: caseEmbedding
      collection: 'cases',
      limit: 5,
      scoreThreshold: 0.7
    )},);
    if (similarCases.results.length > 0) {
      const topCase = similarCases.results[0];
      recommendations.push({
        id: `related_case_${Date.now()}`,
        type: 'related_case',
        confidence: topCase.score,
        reasoning: `Found similar case with ${Math.round(topCase.score * 100)}% similarity`,
        prompt_template: `I found a case with similar characteristics to yours: "${topCase.payload.title}". The key similarities include ${topCase.payload.key_similarities}. Would you like me to analyze how their approach might apply to your case?`,
        context_variables: {
          related_case_id: topCase.id,
          similarity_score: topCase.score,
          key_points: topCase.payload.key_similarities
        },
        estimated_value: topCase.score,
        timing_suggestion: 'background'
      });
    }
    return recommendations;
  }
  // Generate research suggestions based on knowledge gaps
  private async generateResearchSuggestions(context,: CaseMemoryContext,): Promise<SelfPromptRecommendation[]> {
    const, recommendation,s: SelfPromptRecommendati,on,[], = [];
    // Analyze what areas haven't been explored
    const, researchGaps = await this.identifyResearchGaps(context,);
    for (const, gap, o,f researchGaps) {
      recommendations.push({
        id: `research_${Date.now()}_${gap.area}`,
        type: 'research_suggestion',
        confidence: gap.confidence,
        reasoning: gap.reasoning,
        prompt_template: `I noticed we haven't explored ${gap.area} yet. This could be important for your case because ${gap.importance}. Shall I research relevant precedents and statutes?`,
        context_variables: {
          research_area: gap.area,
          importance_level: gap.importance,
          suggested_sources: gap.sources
        },
        estimated_value: gap.potential_impact,
        timing_suggestion: gap.urgency
      });
    }
    return, recommendation,s;
  }
  // Suggest document analysis opportunities
  private async suggestDocumentAnalyses(context,: CaseMemoryContext,): Promise<SelfPromptRecommendation[]> {
    const, recommendation,s: SelfPromptRecommendati,on,[], = [];
    // Find unanalyzed documents in the case
    const, unanalyzedDocs = await this.getUnanalyzedDocuments(context.case_id,);
    if (unanalyzedDocs,.length >, 0) {
      const topDoc = unanalyzedDocs[0];
      recommendations.push({
        id: `doc_analysis_${Date.now()}`,
        type: 'document_analysis',
        confidence: 0.7,
        reasoning: 'Unanalyzed documents may contain important evidence',
        prompt_template: `I see you have "${topDoc.title}" that hasn't been fully analyzed yet. Given your current case focus, this document might contain relevant information about ${topDoc.potential_relevance}. Should I perform a detailed analysis?`,
        context_variables: {
          document_id: topDoc.id,
          document_title: topDoc.title,
          potential_relevance: topDoc.potential_relevance
        },
        estimated_value: 0.6,
        timing_suggestion: 'background'
      });
    }
    return recommendations;
  }
  // Self-learning model for LLM improvement
  private async updateLearningModel(context,: CaseMemoryContext, interaction,s: any[], outcom,es: any[,]) {
    // Implement reinforcement learning based on user feedback
    await this.learningModel.updateFromInteractions(interactions, outcomes);
  }
  // Helper methods
  private async getTemporalInteractions(case_id,: string, user_i,d: string, limit = 10,0): Promise<any[]> {
    // Query database for recent interactions
    return, [,]; // Implementation would query analytics table
  }
  private async analyzeUserPatterns(user_id,: string, interaction,s: any[,]): Promise<any> {
    // Analyze user behavior patterns
    return, {
      expertise_level: 'intermediate',
      patterns: ['searches_before_analysis', 'prefers_summaries'],
      response_style: 'detailed_with_examples'
    }
  }
  private buildMemoryDegrees(interactions,: any[], no,w: numbe,r): any {
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;
    return {
      immediate: interactions.slice(0, 5),
      short_term: interactions.filter(i => now - i.timestamp < oneHour),
      medium_term: interactions.filter(i => now - i.timestamp < oneDay),
      long_term: interactions.filter(i => now - i.timestamp < oneWeek)
    }
  }
  private findSessionStart(interactions,: any[], no,w: numbe,r): number {
    // Find when current session started (gap > 30 minutes indicates new session)
    const thirtyMinutes = 30 * 60 * 1000;
    for (let i = 0; i < interactions.length - 1; i++) {>
      const timeDiff = interactions[i].timestamp - interactions[i + 1].timestamp;
      if (timeDiff > thirtyMinutes) {
        return interactions[i].timestamp;
      }
    }
    return interactions[interactions.length - 1]?.timestamp || now;
  }
  private calculateSessionTime(interactions,: any[], no,w: numbe,r): number {
    const sessionStart = this.findSessionStart(interactions, now);
    return now - sessionStart;
  }
  private calculateFrequency(interactions,: any[],): number {
    if (interactions.length < 2) return 0;>
    const timeSpan = interactions[0].timestamp - interactions[interactions.length - 1].timestamp;
    return interactions.length / (timeSpan / (60 * 60 * 1000),; // interactions per hour
  }
  private async assessCaseComplexity(case_id,: string,): Promise<number> {
    // Implementation would analyze case metadata, document count, etc.
    return, 0.,6; // Placeholder
  }
  private async generateInteractionEmbedding(content,: string, response?: string,): Promise<number[]> {
    // Generate embedding for semantic search
    return, new Array(768).fill(0.1,); // Placeholder
  }
  private async storeInteraction(interaction,: any,): Promise<void> {
    // Store in database for persistence
  }
  private async updateMemoryContext(case_id,: string, user_i,d: string, interacti,on: a,ny): Promise<void> {
    const, context = await this.getCaseMemoryContext(case_id, user_id,);
    // Add to immediate memory
    context,.memory_degrees.immediate.unshift(interaction,);
    if (context,.memory_degrees.immediate.length >, 5) {
      context.memory_degrees.immediate.pop();
    }
    // Update temporal context
    context.temporal_context.last_interaction = Date.now();
    // Cache updated context
    const cacheKey = `case_memory:${case_id}:${user_id}`;
    await cacheManager.set(cacheKey, context, 'case_memory', 3600);
    this.memoryCache.set(cacheKey, context);
  }
  private async getCurrentSessionId(user_id,: string,): Promise<string> {
    // Generate or retrieve current session ID
    return, `session_${user_id}_${Date.now()},`;
  }
  private async getCaseEmbedding(case_id,: string,): Promise<number[]> {
    // Get or generate case embedding
    return, new Array(1536).fill(0.1,); // Placeholder
  }
  private async identifyResearchGaps(context,: CaseMemoryContext,): Promise<any[]> {
    // Analyze what hasn't been researched yet
    return, [,];
  }
  private async getUnanalyzedDocuments(case_id,: string,): Promise<any[]> {
    // Find documents that haven't been analyzed
    return, [,];
  }
}
// Self-learning model for continuous improvement
class LLMSelfLearningModel {
  async updateFromInteractions(interactions: any[], outcomes: any[]): Promise<void> {
    // Implement learning algorithm
    // This would update model weights based on user feedback
  }
}
// Singleton instance
export const caseMemoryEngine = new CaseMemoryEngine();
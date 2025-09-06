
// lib/server/ai/feedback-loop.ts
// Machine learning feedback loop for continuous improvement of AI synthesis

import { logger } from './logger';

export interface FeedbackData {
  requestId: string;
  userId: string;
  rating: number; // 1-5 stars
  feedback?: string;
  improvedResponse?: string;
}

export interface InteractionData {
  requestId: string;
  query: string;
  result: any;
  userId: string;
  timestamp: Date;
}

export interface LearningMetrics {
  queryPatterns: Map<string, number>;
  sourcePreferences: Map<string, number>;
  strategyEffectiveness: Map<string, number>;
  userSatisfaction: Map<string, number>;
}

class FeedbackLoop {
  private learningMetrics: LearningMetrics;
  private feedbackQueue: FeedbackData[] = [];
  private interactionHistory: Map<string, InteractionData> = new Map();
  private modelWeights: Map<string, number> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.learningMetrics = {
      queryPatterns: new Map(),
      sourcePreferences: new Map(),
      strategyEffectiveness: new Map(),
      userSatisfaction: new Map()
    };
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('[FeedbackLoop] Initializing feedback loop system...');
      
      // Load existing model weights from database
      await this.loadModelWeights();
      
      // Start periodic processing of feedback
      this.processingInterval = setInterval(() => {
        this.processFeedbackBatch();
      }, 60000); // Process every minute
      
      // Load historical metrics
      await this.loadHistoricalMetrics();
      
      logger.info('[FeedbackLoop] Feedback loop initialized successfully');
    } catch (error: any) {
      logger.error('[FeedbackLoop] Initialization failed:', error);
    }
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(interaction: InteractionData): Promise<void> {
    try {
      // Store interaction for later analysis
      this.interactionHistory.set(interaction.requestId, interaction);
      
      // Extract patterns from query
      this.analyzeQueryPattern(interaction.query);
      
      // Track strategy usage
      if (interaction.result?.metadata?.strategies) {
        for (const strategy of interaction.result.metadata.strategies) {
          const count = this.learningMetrics.strategyEffectiveness.get(strategy) || 0;
          this.learningMetrics.strategyEffectiveness.set(strategy, count + 1);
        }
      }
      
      // Store in database for persistence
      await this.persistInteraction(interaction);
      
      logger.debug(`[FeedbackLoop] Recorded interaction ${interaction.requestId}`);
    } catch (error: any) {
      logger.error('[FeedbackLoop] Failed to record interaction:', error);
    }
  }

  /**
   * Process user feedback to improve future responses
   */
  async processFeedback(feedback: FeedbackData): Promise<void> {
    try {
      // Add to processing queue
      this.feedbackQueue.push(feedback);
      
      // Get original interaction
      const interaction = this.interactionHistory.get(feedback.requestId);
      
      if (interaction) {
        // Update satisfaction metrics
        const userId = feedback.userId;
        const currentSatisfaction = this.learningMetrics.userSatisfaction.get(userId) || 0;
        const newSatisfaction = (currentSatisfaction * 0.9) + (feedback.rating * 0.1); // Weighted average
        this.learningMetrics.userSatisfaction.set(userId, newSatisfaction);
        
        // Learn from positive feedback
        if (feedback.rating >= 4) {
          await this.reinforcePositivePatterns(interaction, feedback);
        }
        
        // Learn from negative feedback
        if (feedback.rating <= 2) {
          await this.adjustNegativePatterns(interaction, feedback);
        }
        
        // Process improved response if provided
        if (feedback.improvedResponse) {
          await this.learnFromImprovement(interaction, feedback.improvedResponse);
        }
      }
      
      // Persist feedback
      await this.persistFeedback(feedback);
      
      logger.info(`[FeedbackLoop] Processed feedback for ${feedback.requestId}: rating ${feedback.rating}`);
    } catch (error: any) {
      logger.error('[FeedbackLoop] Failed to process feedback:', error);
    }
  }

  /**
   * Get optimized weights for synthesis based on learning
   */
  getOptimizedWeights(query: string, userId: string): Map<string, number> {
    const weights = new Map<string, number>();
    
    // Base weights
    weights.set('relevance', 0.4);
    weights.set('diversity', 0.2);
    weights.set('authority', 0.2);
    weights.set('recency', 0.1);
    weights.set('user_preference', 0.1);
    
    // Adjust based on user satisfaction
    const userSatisfaction = this.learningMetrics.userSatisfaction.get(userId);
    if (userSatisfaction !== undefined) {
      if (userSatisfaction < 3) {
        // Low satisfaction - increase diversity and authority
        weights.set('diversity', 0.3);
        weights.set('authority', 0.3);
      } else if (userSatisfaction > 4) {
        // High satisfaction - maintain current balance
        // Could also personalize based on past preferences
      }
    }
    
    // Adjust based on query patterns
    const queryFeatures = this.extractQueryFeatures(query);
    if ((queryFeatures as any).isComplexLegal) {
      weights.set('authority', 0.35);
      weights.set('relevance', 0.35);
    }
    if ((queryFeatures as any).isResearch) {
      weights.set('diversity', 0.35);
    }
    
    // Apply learned model weights
    for (const [key, value] of this.modelWeights) {
      if (weights.has(key)) {
        const current = weights.get(key) || 0;
        weights.set(key, current * value); // Multiply by learned weight
      }
    }
    
    // Normalize weights to sum to 1
    const sum = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    for (const [key, value] of weights) {
      weights.set(key, value / sum);
    }
    
    return weights;
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(userId: string): Promise<any> {
    try {
      // Get user's interaction history
      const userInteractions = Array.from(this.interactionHistory.values())
        .filter(i => i.userId === userId)
        .slice(-20); // Last 20 interactions
      
      // Analyze patterns
      const patterns = {
        commonTopics: this.extractCommonTopics(userInteractions),
        preferredStrategies: this.getPreferredStrategies(userInteractions),
        averageComplexity: this.calculateAverageComplexity(userInteractions),
        peakUsageTimes: this.findPeakUsageTimes(userInteractions)
      };
      
      // Generate recommendations
      const recommendations = {
        suggestedStrategies: this.suggestStrategies(patterns),
        recommendedSources: this.recommendSources(patterns),
        optimizationTips: this.generateOptimizationTips(patterns),
        personalizedSettings: {
          defaultMaxSources: patterns.averageComplexity > 0.7 ? 15 : 10,
          defaultDiversityLambda: patterns.preferredStrategies.includes('diverse') ? 0.6 : 0.4,
          enableAdvancedFeatures: patterns.averageComplexity > 0.8
        }
      };
      
      return recommendations;
    } catch (error: any) {
      logger.error('[FeedbackLoop] Failed to get personalized recommendations:', error);
      return null;
    }
  }

  /**
   * Get feedback statistics
   */
  getStats(): unknown {
    const totalFeedback = this.feedbackQueue.length;
    const averageRating = this.calculateAverageRating();
    const satisfactionByUser = Array.from(this.learningMetrics.userSatisfaction.entries());
    const topStrategies = this.getTopStrategies();
    
    return {
      totalFeedback,
      averageRating,
      queueSize: this.feedbackQueue.length,
      interactionCount: this.interactionHistory.size,
      userSatisfaction: satisfactionByUser.slice(0, 10), // Top 10 users
      topStrategies,
      modelWeights: Array.from(this.modelWeights.entries()),
      metrics: {
        queryPatterns: this.learningMetrics.queryPatterns.size,
        sourcePreferences: this.learningMetrics.sourcePreferences.size,
        strategyEffectiveness: Array.from(this.learningMetrics.strategyEffectiveness.entries())
      }
    };
  }

  // === PRIVATE HELPER METHODS ===

  private async loadModelWeights(): Promise<void> {
    try {
      // Load from database if available (using Drizzle ORM)
      // TODO: Replace with proper Drizzle query when feedbackModel schema is available
      const weights = null; // Stub for now
      
      if (weights && weights.weights) {
        this.modelWeights = new Map(Object.entries(weights.weights as any));
        logger.info('[FeedbackLoop] Loaded model weights from database');
      } else {
        // Initialize with default weights
        this.modelWeights.set('relevance', 1.0);
        this.modelWeights.set('diversity', 1.0);
        this.modelWeights.set('authority', 1.0);
        this.modelWeights.set('recency', 1.0);
      }
    } catch (error: any) {
      logger.warn('[FeedbackLoop] Failed to load model weights:', error);
      // Use defaults
      this.modelWeights.set('relevance', 1.0);
      this.modelWeights.set('diversity', 1.0);
      this.modelWeights.set('authority', 1.0);
      this.modelWeights.set('recency', 1.0);
    }
  }

  private async loadHistoricalMetrics(): Promise<void> {
    try {
      // Load recent interactions from database
      // TODO: Replace with Drizzle query
      const recentInteractions = [] as any[]; // Stub for now
      // Previous query parameters: { take: 100, orderBy: { createdAt: 'desc' } }
      
      for (const interaction of recentInteractions) {
        this.analyzeQueryPattern(interaction.query);
      }
      
      logger.info(`[FeedbackLoop] Loaded ${recentInteractions.length} historical interactions`);
    } catch (error: any) {
      logger.warn('[FeedbackLoop] Failed to load historical metrics:', error);
    }
  }

  private analyzeQueryPattern(query: string): void {
    // Extract key phrases and patterns
    const words = query.toLowerCase().split(/\s+/);
    const bigrams = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    
    // Update pattern frequencies
    for (const bigram of bigrams) {
      const count = this.learningMetrics.queryPatterns.get(bigram) || 0;
      this.learningMetrics.queryPatterns.set(bigram, count + 1);
    }
  }

  private async reinforcePositivePatterns(
    interaction: InteractionData,
    feedback: FeedbackData
  ): Promise<void> {
    // Increase weights for strategies that led to high satisfaction
    if (interaction.result?.metadata?.strategies) {
      for (const strategy of interaction.result.metadata.strategies) {
        const currentWeight = this.modelWeights.get(strategy) || 1.0;
        this.modelWeights.set(strategy, currentWeight * 1.05); // 5% increase
      }
    }
    
    // Track successful source types
    if (interaction.result?.retrievedContext?.sources) {
      for (const source of interaction.result.retrievedContext.sources) {
        const sourceType = source.type;
        const count = this.learningMetrics.sourcePreferences.get(sourceType) || 0;
        this.learningMetrics.sourcePreferences.set(sourceType, count + 1);
      }
    }
  }

  private async adjustNegativePatterns(
    interaction: InteractionData,
    feedback: FeedbackData
  ): Promise<void> {
    // Decrease weights for strategies that led to low satisfaction
    if (interaction.result?.metadata?.strategies) {
      for (const strategy of interaction.result.metadata.strategies) {
        const currentWeight = this.modelWeights.get(strategy) || 1.0;
        this.modelWeights.set(strategy, currentWeight * 0.95); // 5% decrease
      }
    }
    
    // Learn from specific feedback
    if (feedback.feedback) {
      // Parse feedback for actionable insights
      const feedbackLower = feedback.feedback.toLowerCase();
      
      if (feedbackLower.includes('not relevant')) {
        const relevanceWeight = this.modelWeights.get('relevance') || 1.0;
        this.modelWeights.set('relevance', relevanceWeight * 1.1);
      }
      
      if (feedbackLower.includes('too similar') || feedbackLower.includes('redundant')) {
        const diversityWeight = this.modelWeights.get('diversity') || 1.0;
        this.modelWeights.set('diversity', diversityWeight * 1.1);
      }
    }
  }

  private async learnFromImprovement(
    interaction: InteractionData,
    improvedResponse: string
  ): Promise<void> {
    // Analyze differences between original and improved response
    // This would involve NLP analysis in production
    logger.info('[FeedbackLoop] Learning from improved response for', interaction.requestId);
    
    // For now, just log the improvement
    // TODO: Replace with Drizzle insert
    // await db.insert(feedbackImprovement).values({
    //   requestId: interaction.requestId,
    //   originalQuery: interaction.query,
    //   improvedResponse,
    //   userId: interaction.userId
    // }).catch(err => logger.warn('[FeedbackLoop] Failed to save improvement:', err));
    
    logger.info('[FeedbackLoop] Improvement recorded (stub)', {
      requestId: interaction.requestId,
      improvedResponse: improvedResponse.substring(0, 100) + '...'
    });
  }

  private async persistInteraction(interaction: InteractionData): Promise<void> {
    try {
      // TODO: Replace with Drizzle insert  
      // await db.insert(aiInteraction).values({
      //   requestId: interaction.requestId,
      //   query: interaction.query,
      //   result: interaction.result,
      //   userId: interaction.userId,
      //   timestamp: interaction.timestamp
      // });
      
      logger.debug('[FeedbackLoop] Interaction persisted (stub)', {
        requestId: interaction.requestId,
        userId: interaction.userId
      });
    } catch (error: any) {
      logger.warn('[FeedbackLoop] Failed to persist interaction:', error);
    }
  }

  private async persistFeedback(feedback: FeedbackData): Promise<void> {
    try {
      // TODO: Replace with Drizzle insert
      // await db.insert(feedback).values({
      //   requestId: feedback.requestId,
      //   userId: feedback.userId,
      //   rating: feedback.rating,
      //   feedback: feedback.feedback,
      //   improvedResponse: feedback.improvedResponse
      // });
      
      logger.debug('[FeedbackLoop] Feedback persisted (stub)', {
        requestId: feedback.requestId,
        rating: feedback.rating
      });
    } catch (error: any) {
      logger.warn('[FeedbackLoop] Failed to persist feedback:', error);
    }
  }

  private async processFeedbackBatch(): Promise<void> {
    if (this.feedbackQueue.length === 0) return;
    
    try {
      const batch = this.feedbackQueue.splice(0, 10); // Process up to 10 at a time
      
      // Update model weights based on batch
      await this.updateModelWeights(batch);
      
      // Save updated weights to database
      await this.saveModelWeights();
      
      logger.info(`[FeedbackLoop] Processed batch of ${batch.length} feedback items`);
    } catch (error: any) {
      logger.error('[FeedbackLoop] Batch processing failed:', error);
    }
  }

  private async updateModelWeights(batch: FeedbackData[]): Promise<void> {
    // Calculate adjustment factors based on feedback batch
    const avgRating = batch.reduce((sum, f) => sum + f.rating, 0) / batch.length;
    
    if (avgRating < 3) {
      // Overall poor performance - adjust weights more aggressively
      logger.info('[FeedbackLoop] Low average rating, adjusting weights aggressively');
    }
    
    // Normalize weights to prevent drift
    const sum = Array.from(this.modelWeights.values()).reduce((a, b) => a + b, 0);
    for (const [key, value] of this.modelWeights) {
      this.modelWeights.set(key, value / sum * this.modelWeights.size);
    }
  }

  private async saveModelWeights(): Promise<void> {
    try {
      const weightsObject = Object.fromEntries(this.modelWeights);
      
      // TODO: Replace with Drizzle upsert
      // await db.insert(feedbackModel).values({}).onConflictDoUpdate({});
      
      logger.info('[FeedbackLoop] Model weights saved (stub)');
      
      // Previous upsert logic:
      // where: { id: 'current' },
      // update: { weights: weightsObject, updatedAt: new Date() },
      // create: { id: 'current', weights: weightsObject, active: true }
    } catch (error: any) {
      logger.warn('[FeedbackLoop] Failed to save model weights:', error);
    }
  }

  private extractQueryFeatures(query: string): unknown {
    const features = {
      isComplexLegal: false,
      isResearch: false,
      isProcedural: false,
      hasCase: false,
      hasStatute: false
    };
    
    const queryLower = query.toLowerCase();
    
    // Check for complexity indicators
    if (queryLower.includes('precedent') || queryLower.includes('jurisdiction') || 
        queryLower.includes('constitutional')) {
      features.isComplexLegal = true;
    }
    
    // Check for research indicators
    if (queryLower.includes('research') || queryLower.includes('analyze') || 
        queryLower.includes('compare')) {
      features.isResearch = true;
    }
    
    // Check for procedural questions
    if (queryLower.includes('how to') || queryLower.includes('process') || 
        queryLower.includes('file')) {
      features.isProcedural = true;
    }
    
    // Check for case references
    if (queryLower.includes('case') || queryLower.includes('v.') || 
        queryLower.includes('versus')) {
      features.hasCase = true;
    }
    
    // Check for statute references
    if (queryLower.includes('statute') || queryLower.includes('§') || 
        queryLower.includes('section')) {
      features.hasStatute = true;
    }
    
    return features;
  }

  private extractCommonTopics(interactions: InteractionData[]): string[] {
    const topicCounts = new Map<string, number>();
    
    for (const interaction of interactions) {
      const topics = this.extractTopics(interaction.query);
      for (const topic of topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
    
    // Return top 5 topics
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private extractTopics(query: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const keywords = ['contract', 'tort', 'criminal', 'property', 'constitutional',
                     'corporate', 'tax', 'employment', 'family', 'immigration'];
    
    const found = [];
    const queryLower = query.toLowerCase();
    
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        found.push(keyword);
      }
    }
    
    return found;
  }

  private getPreferredStrategies(interactions: InteractionData[]): string[] {
    const strategyCounts = new Map<string, number>();
    
    for (const interaction of interactions) {
      if (interaction.result?.metadata?.strategies) {
        for (const strategy of interaction.result.metadata.strategies) {
          strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
        }
      }
    }
    
    return Array.from(strategyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strategy]) => strategy);
  }

  private calculateAverageComplexity(interactions: InteractionData[]): number {
    if (interactions.length === 0) return 0.5;
    
    const complexities = interactions
      .map(i => i.result?.processedQuery?.complexity || 0.5)
      .filter(c => c > 0);
    
    return complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  }

  private findPeakUsageTimes(interactions: InteractionData[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    for (const interaction of interactions) {
      const hour = new Date(interaction.timestamp).getHours();
      hourCounts[hour]++;
    }
    
    // Find top 3 hours
    const indexed = hourCounts.map((count, hour) => ({ hour, count }));
    indexed.sort((a, b) => b.count - a.count);
    
    return indexed.slice(0, 3).map(item => item.hour);
  }

  private suggestStrategies(patterns: any): string[] {
    const suggestions = [];
    
    if (patterns.averageComplexity > 0.8) {
      suggestions.push('Enable cross-encoder reranking for better precision');
      suggestions.push('Increase source count to 15 for comprehensive coverage');
    }
    
    if (patterns.commonTopics.includes('contract')) {
      suggestions.push('Use contract-specific search filters');
    }
    
    if (!patterns.preferredStrategies.includes('mmr_diversification')) {
      suggestions.push('Try MMR diversification for more varied perspectives');
    }
    
    return suggestions;
  }

  private recommendSources(patterns: any): string[] {
    const recommendations = [];
    
    for (const topic of patterns.commonTopics) {
      switch (topic) {
        case 'contract':
          recommendations.push('Westlaw Contract Library');
          break;
        case 'criminal':
          recommendations.push('Criminal Law Reporter');
          break;
        case 'tax':
          recommendations.push('Tax Court Memoranda');
          break;
      }
    }
    
    return recommendations.slice(0, 5);
  }

  private generateOptimizationTips(patterns: any): string[] {
    const tips = [];
    
    if (patterns.averageComplexity < 0.3) {
      tips.push('Your queries are simple - try asking more detailed questions');
    }
    
    if (patterns.preferredStrategies.length < 2) {
      tips.push('Experiment with different search strategies for better results');
    }
    
    const peakHour = patterns.peakUsageTimes[0];
    if (peakHour >= 9 && peakHour <= 17) {
      tips.push('Consider using advanced caching during business hours');
    }
    
    return tips;
  }

  private calculateAverageRating(): number {
    if (this.feedbackQueue.length === 0) return 0;
    
    const sum = this.feedbackQueue.reduce((total, f) => total + f.rating, 0);
    return sum / this.feedbackQueue.length;
  }

  private getTopStrategies(): Array<[string, number]> {
    return Array.from(this.learningMetrics.strategyEffectiveness.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    // Process remaining feedback
    if (this.feedbackQueue.length > 0) {
      await this.processFeedbackBatch();
    }
    
    // Save current state
    await this.saveModelWeights();
    
    logger.info('[FeedbackLoop] Shutdown complete');
  }
}

// Export singleton instance
export const feedbackLoop = new FeedbackLoop();
;
// Types are already exported as interfaces above


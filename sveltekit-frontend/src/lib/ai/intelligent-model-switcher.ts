/**
 * Intelligent Model Switching System
 * Automatically switches between models based on user intent, learning patterns, and performance
 * Integrates CUDA cache optimizer, parallel cache, and user learning for optimal UX
 */

import { cudaCacheMemoryOptimizer } from './cuda-cache-memory-optimizer.js';
import { unifiedClientLLMOrchestrator } from './unified-client-llm-orchestrator.js';
import { parallelCacheOrchestrator } from '$lib/cache/parallel-cache-orchestrator.js';
import { browser } from '$app/environment';

export interface ModelSwitchDecision {
  shouldSwitch: boolean;
  targetModel: string;
  currentModel: string;
  confidence: number;
  reason: string;
  estimatedImprovement: {
    speedGain: number; // percentage
    qualityGain: number; // percentage
    userSatisfactionGain: number; // percentage
  };
  switchCost: {
    timeMs: number;
    memoryMB: number;
    cpuUsage: number;
  };
}

export interface UserLearningProfile {
  userId: string;
  sessionId: string;
  learningPhase: 'exploration' | 'specialization' | 'optimization' | 'mastery';
  preferredModels: Map<string, number>; // intent_category -> model_preference_score
  responseTimePreference: 'speed' | 'quality' | 'balanced';
  domainExpertise: Map<string, number>; // domain -> expertise_level (0-1)
  queryPatterns: {
    avgQueryLength: number;
    commonIntents: string[];
    peakUsageHours: number[];
    taskComplexityPreference: number; // 0-1
  };
  satisfactionHistory: Array<{
    modelUsed: string;
    query: string;
    satisfactionScore: number; // 1-5
    timestamp: number;
  }>;
  adaptationRate: number; // How quickly to adapt to new patterns
}

export interface FastUXOptimization {
  prefetchedModels: string[];
  precomputedSwitches: Map<string, string>; // query_pattern -> optimal_model
  contextualPredictions: Array<{
    nextLikelyIntent: string;
    probability: number;
    suggestedModel: string;
  }>;
  didYouMeanCache: Map<string, string[]>; // query -> suggestions
  userIntentShortcuts: Map<string, string>; // shortcut -> full_query
}

class IntelligentModelSwitcher {
  private userProfiles = new Map<string, UserLearningProfile>();
  private fastUXOptimizations = new Map<string, FastUXOptimization>();
  private switchHistory: Array<{
    userId: string;
    fromModel: string;
    toModel: string;
    reason: string;
    performance: number;
    userSatisfaction: number;
    timestamp: number;
  }> = [];
  
  // Learning and adaptation
  private adaptationThreshold = 0.7; // Switch if confidence > 70%
  private learningEnabled = true;
  private minDataPoints = 5; // Minimum interactions before adaptation
  
  // Performance monitoring
  private performanceMonitor = {
    totalSwitches: 0,
    successfulSwitches: 0,
    avgSwitchTime: 0,
    userSatisfactionImprovement: 0
  };

  constructor() {
    this.initializeIntelligentSwitcher();
  }

  /**
   * Main entry point: Determine if model should switch and execute if needed
   */
  async executeIntelligentSwitch(
    query: string,
    currentModel: string,
    userContext: {
      userId: string;
      sessionId: string;
      previousQueries?: string[];
      userFeedback?: number; // 1-5 rating of last response
    }
  ): Promise<{
    switchExecuted: boolean;
    finalModel: string;
    decision: ModelSwitchDecision;
    fastUXOptimizations: string[];
    userLearningUpdates: string[];
    didYouMeanSuggestions: string[];
    processingTime: number;
  }> {
    const startTime = performance.now();

    try {
      // Step 1: Get or create user learning profile
      const userProfile = await this.getUserLearningProfile(userContext.userId, userContext.sessionId);
      
      // Step 2: Optimize using CUDA cache memory optimizer
      const optimizationResult = await cudaCacheMemoryOptimizer.optimizeModelSelection(query, userContext);
      
      // Step 3: Make switching decision using learned patterns
      const switchDecision = await this.makeModelSwitchDecision(
        query,
        currentModel,
        optimizationResult.recommendedModel,
        userProfile,
        optimizationResult
      );
      
      // Step 4: Execute switch if beneficial
      let switchExecuted = false;
      let finalModel = currentModel;
      
      if (switchDecision.shouldSwitch) {
        const switchResult = await this.executeModelSwitch(
          currentModel,
          switchDecision.targetModel,
          userContext
        );
        
        if (switchResult.success) {
          switchExecuted = true;
          finalModel = switchDecision.targetModel;
          
          // Record successful switch
          this.recordSwitchEvent(userContext.userId, currentModel, finalModel, switchDecision.reason, 1.0);
        }
      }
      
      // Step 5: Update user learning profile
      const learningUpdates = await this.updateUserLearning(
        userProfile,
        query,
        finalModel,
        optimizationResult.userIntentPrediction,
        userContext.userFeedback
      );
      
      // Step 6: Prepare fast UX optimizations for next interactions
      const fastUXOptimizations = await this.prepareFastUXOptimizations(userProfile, query);
      
      const processingTime = performance.now() - startTime;
      
      // Log performance
      console.log(`🧠 Intelligent switch completed in ${processingTime.toFixed(2)}ms`);
      console.log(`🔄 Switch executed: ${switchExecuted} (${currentModel} -> ${finalModel})`);
      console.log(`💡 Confidence: ${switchDecision.confidence.toFixed(2)}, Reason: ${switchDecision.reason}`);
      
      return {
        switchExecuted,
        finalModel,
        decision: switchDecision,
        fastUXOptimizations,
        userLearningUpdates: learningUpdates,
        didYouMeanSuggestions: optimizationResult.didYouMeanSuggestions,
        processingTime
      };

    } catch (error) {
      console.error('❌ Intelligent model switcher failed:', error);
      
      return {
        switchExecuted: false,
        finalModel: currentModel,
        decision: {
          shouldSwitch: false,
          targetModel: currentModel,
          currentModel,
          confidence: 0,
          reason: 'error_fallback',
          estimatedImprovement: { speedGain: 0, qualityGain: 0, userSatisfactionGain: 0 },
          switchCost: { timeMs: 0, memoryMB: 0, cpuUsage: 0 }
        },
        fastUXOptimizations: [],
        userLearningUpdates: [],
        didYouMeanSuggestions: [],
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Make intelligent switching decision based on learned patterns
   */
  private async makeModelSwitchDecision(
    query: string,
    currentModel: string,
    recommendedModel: string,
    userProfile: UserLearningProfile,
    optimizationResult: any
  ): Promise<ModelSwitchDecision> {
    
    // Don't switch if already using recommended model
    if (currentModel === recommendedModel) {
      return {
        shouldSwitch: false,
        targetModel: currentModel,
        currentModel,
        confidence: 1.0,
        reason: 'already_optimal',
        estimatedImprovement: { speedGain: 0, qualityGain: 0, userSatisfactionGain: 0 },
        switchCost: { timeMs: 0, memoryMB: 0, cpuUsage: 0 }
      };
    }

    // Calculate expected improvements
    const improvements = this.calculateExpectedImprovements(
      currentModel,
      recommendedModel,
      userProfile,
      optimizationResult
    );
    
    // Calculate switch costs
    const switchCost = await this.calculateSwitchCost(currentModel, recommendedModel);
    
    // Determine if switch is beneficial
    const netBenefit = this.calculateNetBenefit(improvements, switchCost, userProfile);
    const shouldSwitch = netBenefit > 0 && optimizationResult.confidence > this.adaptationThreshold;
    
    // Generate reason for decision
    let reason = 'insufficient_benefit';
    if (shouldSwitch) {
      if (improvements.speedGain > 20) reason = 'significant_speed_improvement';
      else if (improvements.qualityGain > 15) reason = 'significant_quality_improvement';
      else if (improvements.userSatisfactionGain > 10) reason = 'user_satisfaction_optimization';
      else reason = 'overall_performance_gain';
    } else if (optimizationResult.confidence <= this.adaptationThreshold) {
      reason = 'low_confidence_prediction';
    } else if (switchCost.timeMs > 500) {
      reason = 'high_switch_cost';
    }

    return {
      shouldSwitch,
      targetModel: recommendedModel,
      currentModel,
      confidence: optimizationResult.confidence,
      reason,
      estimatedImprovement: improvements,
      switchCost
    };
  }

  /**
   * Execute model switch with monitoring and fallback
   */
  private async executeModelSwitch(
    fromModel: string,
    toModel: string,
    userContext: any
  ): Promise<{ success: boolean; switchTime: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      console.log(`🔄 Executing switch: ${fromModel} -> ${toModel}`);
      
      // Use unified orchestrator to perform the switch
      const switchResult = await unifiedClientLLMOrchestrator.sendWorkerMessage(
        unifiedClientLLMOrchestrator.activeWorkers.get('llama-rl')!,
        {
          type: 'SWITCH_MODEL',
          data: {
            targetModel: toModel,
            userContext
          }
        }
      );
      
      const switchTime = performance.now() - startTime;
      
      if (switchResult.success) {
        // Update performance monitoring
        this.performanceMonitor.totalSwitches++;
        this.performanceMonitor.successfulSwitches++;
        this.performanceMonitor.avgSwitchTime = 
          (this.performanceMonitor.avgSwitchTime + switchTime) / 2;
        
        console.log(`✅ Model switch completed in ${switchTime.toFixed(2)}ms`);
        return { success: true, switchTime };
      } else {
        throw new Error(switchResult.error || 'Switch failed');
      }
      
    } catch (error) {
      console.error(`❌ Model switch failed: ${fromModel} -> ${toModel}`, error);
      return {
        success: false,
        switchTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Get or create user learning profile
   */
  private async getUserLearningProfile(userId: string, sessionId: string): Promise<UserLearningProfile> {
    const profileKey = `${userId}:${sessionId}`;
    
    if (this.userProfiles.has(profileKey)) {
      return this.userProfiles.get(profileKey)!;
    }
    
    // Create new profile or load from storage
    const profile: UserLearningProfile = {
      userId,
      sessionId,
      learningPhase: 'exploration',
      preferredModels: new Map([
        ['legal_analysis', 0.8], // Prefer legal models for legal tasks
        ['chat', 0.6],
        ['research', 0.7]
      ]),
      responseTimePreference: 'balanced',
      domainExpertise: new Map([
        ['legal', 0.5], // Start with moderate legal knowledge
        ['general', 0.6]
      ]),
      queryPatterns: {
        avgQueryLength: 50,
        commonIntents: ['chat'],
        peakUsageHours: [9, 10, 14, 15], // Business hours
        taskComplexityPreference: 0.5
      },
      satisfactionHistory: [],
      adaptationRate: 0.1 // Moderate adaptation rate
    };
    
    this.userProfiles.set(profileKey, profile);
    
    // Try to load existing profile from cache
    try {
      const cachedProfile = await parallelCacheOrchestrator.executeParallel({
        id: `user-profile:${profileKey}`,
        type: 'context',
        priority: 'normal',
        keys: [`user_profile:${profileKey}`]
      });
      
      if (cachedProfile.success && cachedProfile.cacheResults.length > 0) {
        const savedProfile = cachedProfile.cacheResults[0].data;
        Object.assign(profile, savedProfile);
        console.log(`📚 Loaded existing user profile for ${userId}`);
      }
    } catch (error) {
      console.warn('Failed to load user profile from cache:', error);
    }
    
    return profile;
  }

  /**
   * Update user learning based on interactions and feedback
   */
  private async updateUserLearning(
    profile: UserLearningProfile,
    query: string,
    modelUsed: string,
    userIntent: any,
    userFeedback?: number
  ): Promise<string[]> {
    const updates: string[] = [];
    
    try {
      // Update query patterns
      profile.queryPatterns.avgQueryLength = 
        (profile.queryPatterns.avgQueryLength + query.length) / 2;
      
      if (!profile.queryPatterns.commonIntents.includes(userIntent.intentCategory)) {
        profile.queryPatterns.commonIntents.push(userIntent.intentCategory);
        updates.push(`added_intent_${userIntent.intentCategory}`);
      }
      
      // Update peak usage hours
      const currentHour = new Date().getHours();
      if (!profile.queryPatterns.peakUsageHours.includes(currentHour)) {
        profile.queryPatterns.peakUsageHours.push(currentHour);
        profile.queryPatterns.peakUsageHours.sort((a, b) => a - b);
        if (profile.queryPatterns.peakUsageHours.length > 8) {
          profile.queryPatterns.peakUsageHours = profile.queryPatterns.peakUsageHours.slice(-6);
        }
        updates.push(`updated_peak_hours`);
      }
      
      // Update model preferences based on intent
      const currentPreference = profile.preferredModels.get(userIntent.intentCategory) || 0.5;
      const newPreference = currentPreference + (profile.adaptationRate * (userFeedback ? (userFeedback - 3) / 2 : 0.1));
      profile.preferredModels.set(userIntent.intentCategory, Math.max(0.1, Math.min(1.0, newPreference)));
      updates.push(`updated_preference_${userIntent.intentCategory}`);
      
      // Update domain expertise
      if (userIntent.domainSpecificity > 0.6) {
        const domain = 'legal'; // Simplified - would extract actual domain
        const currentExpertise = profile.domainExpertise.get(domain) || 0.5;
        const expertiseBoost = userIntent.complexity * 0.05;
        profile.domainExpertise.set(domain, Math.min(1.0, currentExpertise + expertiseBoost));
        updates.push(`expertise_boost_${domain}`);
      }
      
      // Record satisfaction if provided
      if (userFeedback) {
        profile.satisfactionHistory.push({
          modelUsed,
          query,
          satisfactionScore: userFeedback,
          timestamp: Date.now()
        });
        
        // Keep only recent 50 satisfaction scores
        if (profile.satisfactionHistory.length > 50) {
          profile.satisfactionHistory = profile.satisfactionHistory.slice(-30);
        }
        
        updates.push(`recorded_satisfaction_${userFeedback}`);
      }
      
      // Update learning phase based on interaction count
      const interactionCount = profile.satisfactionHistory.length;
      if (interactionCount > 20 && profile.learningPhase === 'exploration') {
        profile.learningPhase = 'specialization';
        updates.push('phase_specialization');
      } else if (interactionCount > 50 && profile.learningPhase === 'specialization') {
        profile.learningPhase = 'optimization';
        updates.push('phase_optimization');
      } else if (interactionCount > 100 && profile.learningPhase === 'optimization') {
        profile.learningPhase = 'mastery';
        updates.push('phase_mastery');
      }
      
      // Adjust adaptation rate based on learning phase
      switch (profile.learningPhase) {
        case 'exploration':
          profile.adaptationRate = 0.15; // High adaptation
          break;
        case 'specialization':
          profile.adaptationRate = 0.1; // Moderate adaptation
          break;
        case 'optimization':
          profile.adaptationRate = 0.05; // Low adaptation
          break;
        case 'mastery':
          profile.adaptationRate = 0.02; // Very low adaptation
          break;
      }
      
      // Cache updated profile
      await parallelCacheOrchestrator.storeParallel(
        `user_profile:${profile.userId}:${profile.sessionId}`,
        profile,
        {
          tier: 'l2',
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          priority: 'normal',
          type: 'user_profile'
        }
      );
      
      return updates;
      
    } catch (error) {
      console.error('Failed to update user learning:', error);
      return ['update_failed'];
    }
  }

  /**
   * Prepare fast UX optimizations for next interactions
   */
  private async prepareFastUXOptimizations(profile: UserLearningProfile, currentQuery: string): Promise<string[]> {
    const optimizations: string[] = [];
    
    try {
      const profileKey = `${profile.userId}:${profile.sessionId}`;
      let fastUX = this.fastUXOptimizations.get(profileKey);
      
      if (!fastUX) {
        fastUX = {
          prefetchedModels: [],
          precomputedSwitches: new Map(),
          contextualPredictions: [],
          didYouMeanCache: new Map(),
          userIntentShortcuts: new Map()
        };
        this.fastUXOptimizations.set(profileKey, fastUX);
      }
      
      // Prefetch likely next models based on user patterns
      const likelyModels = this.predictNextLikelyModels(profile);
      fastUX.prefetchedModels = likelyModels;
      optimizations.push(`prefetched_${likelyModels.length}_models`);
      
      // Generate contextual predictions
      fastUX.contextualPredictions = this.generateContextualPredictions(profile, currentQuery);
      optimizations.push(`generated_${fastUX.contextualPredictions.length}_predictions`);
      
      // Update user shortcuts based on common patterns
      this.updateUserShortcuts(profile, fastUX);
      optimizations.push('updated_shortcuts');
      
      return optimizations;
      
    } catch (error) {
      console.error('Failed to prepare fast UX optimizations:', error);
      return ['optimization_failed'];
    }
  }

  // Helper methods for calculations
  private calculateExpectedImprovements(
    currentModel: string,
    recommendedModel: string,
    userProfile: UserLearningProfile,
    optimizationResult: any
  ): { speedGain: number; qualityGain: number; userSatisfactionGain: number } {
    // Simplified calculation - would use actual performance data
    const speedGain = currentModel === 'llama-rl' && recommendedModel === 'gemma270m' ? 25 : 10;
    const qualityGain = currentModel === 'gemma270m' && recommendedModel === 'llama-rl' ? 20 : 5;
    const userSatisfactionGain = optimizationResult.confidence * 15;
    
    return { speedGain, qualityGain, userSatisfactionGain };
  }

  private async calculateSwitchCost(fromModel: string, toModel: string): Promise<{
    timeMs: number;
    memoryMB: number;
    cpuUsage: number;
  }> {
    // Estimated switch costs - would measure actual performance
    const switchCosts = {
      'gemma270m->llama-rl': { timeMs: 200, memoryMB: 1024, cpuUsage: 60 },
      'llama-rl->gemma270m': { timeMs: 100, memoryMB: -1024, cpuUsage: 40 },
      'gemma270m->legal-bert': { timeMs: 50, memoryMB: -512, cpuUsage: 20 },
      'legal-bert->gemma270m': { timeMs: 80, memoryMB: 512, cpuUsage: 30 }
    };
    
    const key = `${fromModel}->${toModel}`;
    return switchCosts[key] || { timeMs: 150, memoryMB: 0, cpuUsage: 50 };
  }

  private calculateNetBenefit(
    improvements: { speedGain: number; qualityGain: number; userSatisfactionGain: number },
    switchCost: { timeMs: number; memoryMB: number; cpuUsage: number },
    userProfile: UserLearningProfile
  ): number {
    // Weight benefits based on user preferences
    let benefit = 0;
    
    if (userProfile.responseTimePreference === 'speed') {
      benefit += improvements.speedGain * 2;
    } else if (userProfile.responseTimePreference === 'quality') {
      benefit += improvements.qualityGain * 2;
    } else {
      benefit += (improvements.speedGain + improvements.qualityGain) / 2;
    }
    
    benefit += improvements.userSatisfactionGain;
    
    // Subtract costs
    const timeCost = switchCost.timeMs > 200 ? 10 : 0;
    const memoryCost = Math.abs(switchCost.memoryMB) > 1000 ? 5 : 0;
    const cpuCost = switchCost.cpuUsage > 70 ? 5 : 0;
    
    return benefit - timeCost - memoryCost - cpuCost;
  }

  private predictNextLikelyModels(profile: UserLearningProfile): string[] {
    const predictions: string[] = [];
    
    // Based on common intents
    profile.queryPatterns.commonIntents.forEach(intent => {
      const preference = profile.preferredModels.get(intent);
      if (preference && preference > 0.6) {
        if (intent === 'legal_analysis') predictions.push('llama-rl', 'legal-bert');
        else if (intent === 'chat') predictions.push('gemma270m');
        else if (intent === 'research') predictions.push('llama-rl');
      }
    });
    
    // Remove duplicates and return top 3
    return [...new Set(predictions)].slice(0, 3);
  }

  private generateContextualPredictions(profile: UserLearningProfile, currentQuery: string): Array<{
    nextLikelyIntent: string;
    probability: number;
    suggestedModel: string;
  }> {
    // Simplified prediction based on patterns
    return [
      { nextLikelyIntent: 'legal_analysis', probability: 0.6, suggestedModel: 'llama-rl' },
      { nextLikelyIntent: 'chat', probability: 0.3, suggestedModel: 'gemma270m' },
      { nextLikelyIntent: 'research', probability: 0.1, suggestedModel: 'llama-rl' }
    ];
  }

  private updateUserShortcuts(profile: UserLearningProfile, fastUX: FastUXOptimization): void {
    // Create shortcuts for common query patterns
    const shortcuts = new Map([
      ['legal', 'legal analysis question'],
      ['contract', 'contract review assistance'],
      ['research', 'legal research query'],
      ['help', 'general assistance request']
    ]);
    
    fastUX.userIntentShortcuts = shortcuts;
  }

  private recordSwitchEvent(
    userId: string,
    fromModel: string,
    toModel: string,
    reason: string,
    performance: number
  ): void {
    this.switchHistory.push({
      userId,
      fromModel,
      toModel,
      reason,
      performance,
      userSatisfaction: 0.8, // Would track actual satisfaction
      timestamp: Date.now()
    });
    
    // Keep only recent 1000 switches
    if (this.switchHistory.length > 1000) {
      this.switchHistory = this.switchHistory.slice(-500);
    }
  }

  private async initializeIntelligentSwitcher(): Promise<void> {
    console.log('🧠 Initializing Intelligent Model Switcher...');
    
    // Initialize CUDA optimizer
    await cudaCacheMemoryOptimizer.initializeModelProfiles();
    
    console.log('✅ Intelligent Model Switcher initialized');
  }

  /**
   * Get switcher performance statistics
   */
  async getPerformanceStats(): Promise<{
    totalSwitches: number;
    successRate: number;
    avgSwitchTime: number;
    userSatisfactionImprovement: number;
    activeUserProfiles: number;
    learningPhaseDistribution: Record<string, number>;
  }> {
    const learningPhases = Array.from(this.userProfiles.values())
      .map(profile => profile.learningPhase);
    
    const phaseDistribution = learningPhases.reduce((acc, phase) => {
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSwitches: this.performanceMonitor.totalSwitches,
      successRate: this.performanceMonitor.totalSwitches > 0 
        ? this.performanceMonitor.successfulSwitches / this.performanceMonitor.totalSwitches 
        : 0,
      avgSwitchTime: this.performanceMonitor.avgSwitchTime,
      userSatisfactionImprovement: this.performanceMonitor.userSatisfactionImprovement,
      activeUserProfiles: this.userProfiles.size,
      learningPhaseDistribution: phaseDistribution
    };
  }
}

// Export singleton instance
export const intelligentModelSwitcher = new IntelligentModelSwitcher();
export default intelligentModelSwitcher;
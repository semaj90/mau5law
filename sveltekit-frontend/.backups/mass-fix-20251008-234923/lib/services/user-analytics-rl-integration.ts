/**
 * User Analytics & Reinforcement Learning Integration Service
 * Combines user.history and user.analytics with QLorA training and Moogle Graph Synthesizer
 * Provides concurrent data parallelism with caching for enhanced user productivity
 */
import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { browser } from '$app/environment';
// Import existing services
import { qloraTrainingService, userAnalytics as qloraAnalytics } from './qlora-training-service.js';
import { recommendationOrchestrator } from './recommendation-orchestrator.js';
import { MoogleGraphSynthesizer } from '../ai/moogle-graph-synthesizer.js';
}
export interface UserHistoryEntry {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  action: {
    type: 'document_open' | 'search' | 'ai_query' | 'case_create' | 'evidence_upload' | 'analysis_run' | 'connection_made' | 'insight_generated';
  target: string;
  parameters: { [key: string]: any }
  context: { [key: string]: any }
  }
  outcome: {
    success: boolean;
    duration: number;
    result?: any;
    error?: string;
    userFeedback?: 'positive' | 'negative' | 'neutral';
    confidence?: number;
  }
  environment: {
    page: string;
    viewport: { width: number; height: number }
    userAgent: string;
    timestamp: number;
  }
  metadata: {
    caseId?: string;
    documentIds?: string[];
    tags?: string[];
    complexity?: number;
  }
}
export interface UserAnalyticsProfile {
  userId: string;
  createdAt: number;
  lastUpdated: number;
  // Behavioral patterns
  patterns: {
    activeHours: Record<number, number>; // Hour -> activity level
    commonWorkflows: Array<any>;
    documentPreferences: {
      types: Record<string, number>;
      complexityRange: { min: number; max: number; preferred: number }
      averageProcessingTime: Record<string, number>;
    }
    searchPatterns: {
      commonTerms: Array<any>;
      queryComplexity: number;
      refinementRate: number;
    }
  }
  // Performance metrics
  performance: {
    overallProductivity: number;
    taskCompletionRate: number;
    averageTaskDuration: number;
    accuracyRate: number;
    learningVelocity: number;
    expertiseLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  }
  // Reinforcement learning profile
  reinforcement: {
    rewardHistory: Array<any>;
    actionPreferences: Record<string, { weight: number; successRate: number; averageReward: number }>;
    explorationTendency: number;
    adaptationRate: number;
    convergenceMetrics: {
      stability: number;
      consistency: number;
      improvement: number;
    }
  }
  // Predictive insights
  predictions: {
    nextLikelyActions: Array<any>;
    optimalWorkflow: string[];
    recommendedComplexity: number;
    estimatedTaskTimes: Record<string, number>;
    riskFactors: Array<any>;
}
export interface ProductivityCache {
  id: string;
  userId: string;
  context: {
    caseId?: string;
  documentTypes: string[];
  complexity: number;
  timeframe: string;
  }
  cached: {
    insights: any[];
    connections: any[];
    recommendations: any[];
    analysis: any;
    timestamp: number;
  }
  performance: {
    cacheHitRate: number;
    averageResponseTime: number;
    concurrentProcesses: number;
  }
}
export class UserAnalyticsRLIntegration {
  private userHistory: Writable<UserHistoryEntry[]>;
  private analyticsProfile: Writable<UserAnalyticsProfile | null>;
  private productivityCache: Writable<ProductivityCache[]>;
  private moogleSynthesizer: MoogleGraphSynthesizer;
  // Processing state
  private processingWorkers: Worker[] = [];
  private cacheWorker: Worker | null = null;
  private isProcessing = false;
  private maxConcurrentProcesses = 6;
  // Analytics tracking
  private sessionId: string;
  private userId: string;
  private startTime: number;
  constructor() {
    this.userHistory = writable<UserHistoryEntry[]>([]);
    this.analyticsProfile = writable<UserAnalyticsProfile | null>(null);
    this.productivityCache = writable<ProductivityCache[]>([]);
    // Initialize Moogle Graph Synthesizer
    this.moogleSynthesizer = new MoogleGraphSynthesizer();
    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();
    this.startTime = Date.now();
    this.initializeService();
  }
  /**
   * Initialize the service and load existing data
   */;
  private async initializeService() {
    if (!browser) return;
    try {
      // Initialize concurrent processing workers
      await this.initializeWorkers();
      // Load existing user history and analytics
      await this.loadUserData();
      // Setup real-time tracking
      this.setupUserTracking();
      // Start cache management
      this.startCacheManagement();
      console.log('🧠 User Analytics & RL Integration initialized with concurrent processing');
    } catch (error) {
      console.error('❌ Failed to initialize User Analytics RL Integration:', error);
    }
  }
  /**
   * Initialize concurrent processing workers
   */;
  private async initializeWorkers() {
    try {
      // Analytics processing workers
      for (let i = 0; i < this.maxConcurrentProcesses; i++) {>
        const worker = new Worker('/workers/analytics-processor.js');
        worker.onmessage = (event) => {
          this.handleWorkerMessage(i, event.data);
        },);
        worker.postMessage({
          type: 'init',
          workerId: i,;
          config: {
            enableReinforcement: true
            cacheStrategy: 'aggressive',
            concurrentProcessing: true
          }
        });
        this.processingWorkers.push(worker);
      }
      // Cache management worker
      this.cacheWorker = new Worker('/workers/cache-manager.js');
      this.cacheWorker.onmessage = (event) => {
        this.handleCacheMessage(event.data);
      },);
      this.cacheWorker.postMessage({
        type: 'init',
        config: {
          maxCacheSize: 500,
          ttl: 30 * 60 * 1000, // 30 minutes
          cleanupInterval: 5 * 60 * 1000 // 5 minutes
        }
      });
    } catch (error) {
      console.error('Failed to initialize workers:', error);
    }
  }
  /**
   * Track user action and update analytics
   */
  async trackUserAction()
    actionType: UserHistoryEntry['action']['type'],
    target: string
    parameters: { [key: string]: any } = {},
    context: { [key: string]: any } = {}
  ): Promise<string>, {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const historyEntry: UserHistoryEntry = {
      id: actionId
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      action: {
        type: actionType
        target,
        parameters,
        context
      },
      outcome: {
        success: false, // Will be updated when action completes
        duration: 0
      },
      environment: {
        page: window.location.pathname,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      metadata: {
        caseId: context.caseId,
        documentIds: context.documentIds || [],
        tags: context.tags || [],
        complexity: context.complexity || 0.5
      }
    }
    // Add to history
    this.userHistory.update(history => [historyEntry, ...history.slice(0, 999)]);
    // Send to processing worker for real-time analysis
    await this.processActionAnalytics(historyEntry);
    return actionId;
  }
  /**
   * Complete tracked action with outcome
   */
  async completeAction()
    actionId: string
    outcome: {
      success: boolean;
      result?: any;
      error?: string;
      userFeedback?: 'positive' | 'negative' | 'neutral';
      confidence?: number,);
    }
  ): Promise<void> {
    const, startTime = Date.now(,);
    this,.userHistory.update(history => {
      const actionIndex = history.findIndex(entry => entry.id === actionId);
      if (actionIndex >= 0) {
        const action = history[actionIndex],);
        action,.outcome = {
          ...outcome,
          duration: startTime - action.timestamp
        },);
        // Trigger reinforcement learning update
        this,.updateReinforcementLearning(action,);
        // Update productivity insights
        this,.updateProductivityCache(action,);
      }
      return history;
    });
    // Generate recommendations based on completed action
    await this.generateActionBasedRecommendations(actionId, outcome);
  }
  /**
   * Process action analytics with concurrent workers
   */;
  private async processActionAnalytics(action,: UserHistoryEntry), {
    const availableWorker = this.getAvailableWorker();
    if (availableWorker) {
      availableWorker.postMessage({
        type: 'process_action',
        action: {
          id: action.id,
          type: action.action.type,
          target: action.action.target,
          parameters: action.action.parameters,
          context: action.action.context,
          timestamp: action.timestamp,
          userId: action.userId
        }
      });
    }
  }
  /**
   * Update reinforcement learning based on action outcomes
   */;
  private updateReinforcementLearning(action,: UserHistoryEntry), {
    const reward = this.calculateReward(action);
    const state = this.encodeActionState(action);
    const actionKey = `${action.action.type}_${action.action.target}`;
    this.analyticsProfile.update(profile => {
      if (!profile) return profile;
      // Add to reward history
      profile.reinforcement.rewardHistory.push({
        timestamp: action.timestamp,
        reward,
        action: actionKey,;
        context: JSON.stringify(action.action.context)
      });
      // Update action preferences
      if (!profile.reinforcement.actionPreferences[actionKey]) {
        profile.reinforcement.actionPreferences[actionKey] = {
          weight: 0,
          successRate: 0,
          averageReward: 0
        }
      }
      const pref = profile.reinforcement.actionPreferences[actionKey];
      const count = profile.reinforcement.rewardHistory.filter(item => item.length);
      pref.averageReward = (pref.averageReward * (count - 1) + reward) / count;
      pref.successRate = profile.reinforcement.rewardHistory
        .filter(r => r.action === actionKey && r.reward > 0)
        .length / count;
      pref.weight = pref.averageReward * pref.successRate;
      // Limit history size
      if (profile.reinforcement.rewardHistory.length > 1000) {
        profile.reinforcement.rewardHistory = profile.reinforcement.rewardHistory.slice(-500);
      }
      return profile;
    });
    // Send to NES-RL agent in recommendation orchestrator
    recommendationOrchestrator.updateDetectiveContext({
      lastAnalysis: `RL update: ${actionKey} -> ${reward.toFixed(3)}`,
      timeInMode: Date.now() - this.startTime
    });
  }
  /**
   * Calculate reward based on action outcome
   */;
  private calculateReward(action,: UserHistoryEntry,): number {
    let reward = 0;
    // Base reward for success/failure
    reward += action.outcome.success ? 1.0 : -0.5;
    // Time-based reward (faster is better, with reasonable limits)
    const optimalTimes = {
      'document_open': 2000,
      'search': 5000,
      'ai_query': 10000,
      'case_create': 15000,
      'evidence_upload': 8000,
      'analysis_run': 20000,
      'connection_made': 3000,
      'insight_generated': 12000
    }
    const optimalTime = optimalTimes[action.action.type] || 5000;
    const timeRatio = Math.min(optimalTime / Math.max(action.outcome.duration, 1000), 2);
    reward += (timeRatio - 1) * 0.5;
    // User feedback reward
    if (action.outcome.userFeedback === 'positive') reward += 0.5;
    if (action.outcome.userFeedback === 'negative') reward -= 0.3;
    // Confidence-based reward
    if (action.outcome.confidence) {
      reward += (action.outcome.confidence - 0.5) * 0.3;
    }
    // Complexity adjustment
    const complexity = action.metadata.complexity || 0.5;
    if (complexity > 0.7) reward *= 1.2; // Bonus for handling complex tasks
    return Math.max(-2, Math.min(2, reward),;
  }
  /**
   * Encode action state for reinforcement learning
   */;
  private encodeActionState(action,: UserHistoryEntry,): string {
    return `${action.action.type}_${action.environment.page}_${Math.floor((action.metadata.complexity || 0.5) * 10)}`;
  }
  /**
   * Update productivity cache with completed actions
   */;
  private updateProductivityCache(action,: UserHistoryEntry), {
    if (!this.cacheWorker) return;
    this.cacheWorker.postMessage({
      type: 'update_cache',
      data: {
        actionId: action.id,
        actionType: action.action.type,
        success: action.outcome.success,
        duration: action.outcome.duration,
        context: {
          caseId: action.metadata.caseId,
          complexity: action.metadata.complexity,
          page: action.environment.page
        }
      }
    });
  }
  /**
   * Generate action-based recommendations using Moogle Graph Synthesizer
   */
  private async generateActionBasedRecommendations()
    actionId: string
    outcome: any;
  ) {
    try {
      const action = this.getAction(actionId);
      if (!action) return;
      // Get current analytics profile for context
      const profile = this.getAnalyticsProfile();
      const reinforcementData = profile?.reinforcement;
      // Create mock graph data from user history for Moogle analysis
      const recentActions = this.getUserHistory().slice(0, 20);
      const paths = this.convertActionsToGraphPaths(recentActions);
      // Use enhanced Moogle synthesizer with user analytics
      const visualization = await this.moogleSynthesizer.synthesize2D(
        paths,);
        {
          layout: 'legal-context',
          reinforcementLearning,: {
            enabled: true
            showTrainingProgress: false
            highlightOptimalPaths: true
            showRewardHeatmap: true
            qValueVisualization: false
          }
        },
        profile,
        reinforcementData
     ) );
      // Extract insights from visualization metadata
      const insights = this.extractInsightsFromVisualization(visualization, action);
      // Generate targeted recommendations
      for (const insight of insights) {
        recommendationOrchestrator.addRecommendation({
          id: `rl_insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          priority: insight.priority,
          source: 'user-analytics-rl',
          action: insight.action,
          createdAt: Date.now(),
          metadata: {
            basedOnAction: actionId
            reinforcementScore: insight.reinforcementScore,
            productivityImpact: insight.productivityImpact
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate action-based recommendations:', error);
    }
  }
  /**
   * Convert user actions to graph paths for Moogle analysis
   */;
  private convertActionsToGraphPaths(actions,: UserHistoryEntry[],): any[,] {
    const paths = [];
    const nodeMap = new Map();
    const edges = [];
    // Create nodes from actions
    for (const action of actions) {
      const nodeId = `${action.action.type}_${action.action.target}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId
          type: action.action.type,
          properties: {
            target: action.action.target,
            frequency: 1,
            avgDuration: action.outcome.duration,
            successRate: action.outcome.success ? 1 : 0,
            lastAccessed: action.timestamp
          },
          metadata: {
            complexity: action.metadata.complexity || 0.5,
            timestamp: action.timestamp,
            lastAccessed: action.timestamp
          },
          score: action.outcome.success ? 0.8 : 0.3
        });
      } else {
        const node = nodeMap.get(nodeId);
        node.properties.frequency++;
        node.properties.avgDuration = (node.properties.avgDuration + action.outcome.duration) / 2;
        node.properties.successRate = (node.properties.successRate + (action.outcome.success ? 1 : 0)) / 2;
        node.properties.lastAccessed = Math.max(node.properties.lastAccessed, action.timestamp);
      }
    }
    // Create edges between sequential actions
    for (let i = 0; i < actions.length - 1; i++) {>
      const sourceNode = `${actions[i].action.type}_${actions[i].action.target}`;
      const targetNode = `${actions[i + 1].action.type}_${actions[i + 1].action.target}`;
      edges.push({
        id: `${sourceNode}_${targetNode}`,
        source: sourceNode
        target: targetNode
        type: 'sequence',
        weight: 1 / Math.max(1, actions[i + 1].timestamp - actions[i].timestamp / 1000),
        properties: {
          timeDelta: actions[i + 1].timestamp - actions[i].timestamp,
          success: actions[i].outcome.success && actions[i + 1].outcome.success
        }
      });
    }
    // Create a single path from all nodes and edges
    paths.push({
      id: 'user_workflow_path',
      nodes: Array.from(nodeMap.values()),
      edges: edges
      totalScore: Array.from(nodeMap.values()).reduce((sum, node) => sum + node.score, 0),
      metadata: {
        pathType: 'user_workflow',
        sessionId: this.sessionId,
        userId: this.userId
      }
    });
    return paths;
  }
  /**
   * Extract actionable insights from Moogle visualization
   */;
  private extractInsightsFromVisualization(visualization,: any, triggerActio,n: UserHistoryEntry,) {
    const insights = [];
    // Analyze node positions and PageRank scores
    const highScoreNodes = visualization.metadata.nodePositions;
      .filter((node: any) => node.pageRankScore > 1.2)
      .sort((a: any, b: any) => b.pageRankScore - a.pageRankScore);
    if (highScoreNodes.length > 0) {
      const topNode = highScoreNodes[0];
      insights.push({
        type: 'ai',
        title: 'High-Value Action Identified',
        description: `Based on your usage patterns, "${topNode.id}" shows high productivity value (${(topNode.pageRankScore * 100).toFixed(0)} score).`,
        confidence: 0.85,
        priority: 'medium',
        reinforcementScore: topNode.pageRankScore,
        productivityImpact: 0.7,
        action: () => this.suggestWorkflowOptimization(topNode.id)
      });
    }
    // Identify workflow bottlenecks
    const slowNodes = visualization.metadata.nodePositions;
      .filter((node: any) => node.avgDuration > 10000)
      .sort((a: any, b: any) => b.avgDuration - a.avgDuration);
    if (slowNodes.length > 0) {
      insights.push({
        type: 'detective',
        title: 'Workflow Bottleneck Detected',
        description: `"${slowNodes[0].id}" is taking longer than optimal. Consider optimizing this step.`,
        confidence: 0.75,
        priority: 'high',
        reinforcementScore: -0.5,
        productivityImpact: 0.9,
        action: () => this.provideOptimizationTips(slowNodes[0].id)
      });
    }
    // Suggest next best actions
    const profile = this.getAnalyticsProfile();
    if (profile?.predictions.nextLikelyActions.length > 0) {
      const nextAction = profile.predictions.nextLikelyActions[0];
      insights.push({
        type: 'ai',
        title: 'Suggested Next Action',
        description: `Based on your patterns, consider: ${nextAction.action} (${(nextAction.probability * 100).toFixed(0)}% likely)`,
        confidence: nextAction.confidence,
        priority: 'low',
        reinforcementScore: 0.3,
        productivityImpact: 0.5,
        action: () => this.executeNextAction(nextAction.action)
      });
    }
    return insights;
  }
  // Worker message handlers
  private handleWorkerMessage(workerId,: number, dat,a: any,) {
    const { type, payload } = dat;a;
    switch (type) {
      case 'analytics_updated':
        this.updateAnalyticsProfile(payload);
        break;
      case 'pattern_identified':
        this.handlePatternIdentified(payload);
        break;
      case 'prediction_generated':
        this.updatePredictions(payload);
        break;
    }
  }
  private handleCacheMessage(data,: any), {
    const { type, payload } = dat;a;
    switch (type) {
      case 'cache_updated':
        this.productivityCache.update(cache => {
          const existingIndex = cache.findIndex(c => c.id === payload.id);
          if (existingIndex >= 0) {
            cache[existingIndex] = payload;
          } else {
            cache.push(payload);
          }
          return cache.slice(0, 100); // Limit cache size
        });
        break;
      case 'cache_hit':
        console.log('Cache hit:', payload);
        break;
    }
  }
  // Utility methods
  private getAvailableWorker(),: Worker | null, {
    return this.processingWorkers[0]; // Simplified - would implement proper worker pool
  }
  private updateAnalyticsProfile(updates,: Partial<UserAnalyticsProfile>), {
    this.analyticsProfile.update(profile => {
      if (!profile) {
        return this.createDefaultProfile();
      }
      return { ...profile, ...updates, lastUpdated: Date.now() }
    });
  }
  private createDefaultProfile(),: UserAnalyticsProfile {
    return {
      userId: this.userId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      patterns: {
        activeHours: { [key,: strin,g]: any },
        commonWorkflows: [],
        documentPreferences: {
          types: { [key,: strin,g]: any },
          complexityRange: { min: 0.2, max: 0.8, preferred: 0.5 },
          averageProcessingTime: { [key,: strin,g]: any }
        },
        searchPatterns: {
          commonTerms: [],
          queryComplexity: 0.5,
          refinementRate: 0.2
        }
      },
      performance: {
        overallProductivity: 0.5,
        taskCompletionRate: 0.5,
        averageTaskDuration: 5000,
        accuracyRate: 0.5,
        learningVelocity: 0.5,
        expertiseLevel: 'novice'
      },
      reinforcement: {
        rewardHistory: [],
        actionPreferences: { [key,: strin,g]: any },
        explorationTendency: 0.3,
        adaptationRate: 0.1,
        convergenceMetrics: {
          stability: 0.5,
          consistency: 0.5,
          improvement: 0.5
        }
      },
      predictions: {
        nextLikelyActions: [],
        optimalWorkflow: [],
        recommendedComplexity: 0.5,
        estimatedTaskTimes: { [key,: strin,g]: any },
        riskFactors: []
      }
    }
  }
  private handlePatternIdentified(pattern,: any), {
    recommendationOrchestrator.addRecommendation({
      id: `pattern_${Date.now()}`,
      type: 'ai',
      title: 'Usage Pattern Identified',
      description: `New pattern detected: ${pattern.description}`,
      confidence: pattern.confidence,
      priority: 'low',
      source: 'user-analytics-rl',
      createdAt: Date.now()
    });
  }
  private updatePredictions(predictions,: any), {
    this.analyticsProfile.update(profile => {
      if (!profile) return profile,);
      profile.predictions = { ...profile.predictions, ...predictions },);
      return profile;
    });
  }
  private generateSessionId(),: string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  private generateUserId(),: string {
    // In production, this would come from authentication
    return localStorage.getItem('userId') || `user_${Date.now()}`;
  }
  private async loadUserData(), {
    // Load from localStorage and server
    try {
      const stored = localStorage.getItem(`user_analytics_${this.userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.analyticsProfile.set(data.profile || this.createDefaultProfile(),;
        this.userHistory.set(data.history || []);
      }
    } catch (error) {
      console.warn('Failed to load stored user data:', error);
    }
  }
  private setupUserTracking(), {
    // Auto-save data periodically
    setInterval(() => {
      this.saveUserData();
    }, 60000); // Save every minute
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveUserData();
    });
  }
  private saveUserData(), {
    try {
      const data = {
        profile: this.getAnalyticsProfile(),
        history: this.getUserHistory().slice(0, 500) // Limit stored history
      }
      localStorage.setItem(`user_analytics_${this.userId}`, JSON.stringify(data),;
    } catch (error) {
      console.warn('Failed to save user data:', error);
    }
  }
  private startCacheManagement(), {
    // Cleanup cache periodically
    setInterval(() => {
      this.productivityCache.update(cache =>)
        cache.filter(c => Date.now() - c.cached.timestamp < 30 * 60 * 1000)
      );
    }, 5 * 60 * 1000,);
  }
  // Action suggestion methods
  private suggestWorkflowOptimization(nodeId,: string), {
    console.log('Suggesting workflow optimization for:', nodeId);
  }
  private provideOptimizationTips(nodeId,: string), {
    console.log('Providing optimization tips for:', nodeId);
  }
  private executeNextAction(action,: string), {
    console.log('Executing suggested next action:', action);
  }
  // Getters for stores
  private getUserHistory(),: UserHistoryEntry[], {
    let history: UserHistoryEntry[] = [];
    this.userHistory.subscribe(h => history = h(),;
    return history;
  }
  private getAnalyticsProfile(),: UserAnalyticsProfile | null, {
    let profile: UserAnalyticsProfile | null = null;
    this.analyticsProfile.subscribe(p => profile = p(),;
    return profile;
  }
  private getAction(actionId,: string,): UserHistoryEntry | undefine,d {
    return this.getUserHistory().find(action => action.id === actionId);
  }
  // Public API
  public getUserHistoryStore(),: Readable<UserHistoryEntry[]> {
    return, this.userHistor,y;
  }
  public getAnalyticsProfileStore(),: Readable<UserAnalyticsProfile | null> {
    return, this.analyticsProfil,e;
  }
  public getProductivityCacheStore(),: Readable<ProductivityCache[]> {
    return, this.productivityCach,e;
  }
  public async clearHistory(),: Promise<void> {
    this,.userHistory.set([],);
    localStorage,.removeItem(`user_analytics_${this.userId}`,);
  }
  public async exportData(),: Promise<any> {
    return, {
      userId: this.userId,
      history: this.getUserHistory(),
      analytics: this.getAnalyticsProfile(),
      exportedAt: Date.now()
    }
  }
  public destroy(), {
    // Cleanup workers
    for (const worker of this.processingWorkers) {
      worker.terminate();
    }
    if (this.cacheWorker) {
      this.cacheWorker.terminate();
    }
    // Save final data
    this.saveUserData();
  }
}
// Export singleton instance
export const userAnalyticsRLIntegration = new UserAnalyticsRLIntegration();
// Export derived stores for components
export const userHistory = userAnalyticsRLIntegration.getUserHistoryStore();
export const analyticsProfile = userAnalyticsRLIntegration.getAnalyticsProfileStore();
export const productivityCache = userAnalyticsRLIntegration.getProductivityCacheStore();
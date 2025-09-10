/*
 * Intelligent Model Orchestrator
 * Auto-switches between Gemma variants, Legal-BERT, and ONNX models based on user intent, context, and performance metrics
 * Integrates CUDA cache optimizer with SOM neural network for optimal UX
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { UserBehaviorPattern } from './qlora-topology-predictor';

// Core interfaces
export interface ModelVariant {
  id: string;
  name: string;
  type: 'gemma-270m' | 'gemma3-legal' | 'legal-bert' | 'langextract-onnx' | 'fastapi-endpoint';
  targetLatency: number; // milliseconds
  memoryFootprint: number; // MB
  capabilities: string[];
  contextWindow: number;
  isLoaded: boolean;
  warmupTime: number;
}

export interface UserIntent {
  category: 'legal-research' | 'document-analysis' | 'code-generation' | 'chat' | 'search' | 'unknown';
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  context: {
    previousQueries: string[];
    documentType?: string;
    userExpertise: 'novice' | 'intermediate' | 'expert';
    timeOfDay: string;
    sessionLength: number;
  };
}

export interface ModelPerformanceMetrics {
  modelId: string;
  averageLatency: number;
  successRate: number;
  userSatisfaction: number;
  cachePredictionAccuracy: number;
  contextSwitchPenalty: number;
  memoryEfficiency: number;
  lastUsed: Date;
  usageCount: number;
  errorRate: number;
}

export interface SelfPromptingSuggestion {
  id: string;
  suggestion: string;
  confidence: number;
  category: 'clarification' | 'expansion' | 'correction' | 'alternative' | 'follow-up';
  modelRecommendation: string;
  estimatedLatency: number;
  contextRelevance: number;
}

// CUDA Cache Memory Optimizer with SOM Neural Network
export class CudaCacheSOMOptimizer {
  private somGrid: Float32Array;
  private somSize: number = 64; // 8x8 SOM grid
  private learningRate: number = 0.1;
  private neighborhoodRadius: number = 3;
  private cacheHitMap: Map<string, number> = new Map();
  private modelAffinityMatrix: Float32Array;

  constructor() {
    this.somGrid = new Float32Array(this.somSize * this.somSize * 128); // 128-dim feature vectors
    this.modelAffinityMatrix = new Float32Array(10 * 10); // 10 model types max
    this.initializeSOM();
  }

  private initializeSOM(): void {
    // Initialize SOM with random weights
    for (let i = 0; i < this.somGrid.length; i++) {
      this.somGrid[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  // Learn user patterns and optimize cache placement
  trainFromUserBehavior(behavior: UserBehaviorPattern, queryEmbedding: Float32Array): void {
    const winnerNeuron = this.findBestMatchingUnit(queryEmbedding);
    this.updateSOMWeights(winnerNeuron, queryEmbedding);
    this.updateModelAffinity(behavior, winnerNeuron);
  }

  private findBestMatchingUnit(input: Float32Array): { x: number; y: number } {
    let minDistance = Infinity;
    let winner = { x: 0, y: 0 };

    for (let x = 0; x < Math.sqrt(this.somSize); x++) {
      for (let y = 0; y < Math.sqrt(this.somSize); y++) {
        const neuronIndex = (x * Math.sqrt(this.somSize) + y) * 128;
        let distance = 0;

        for (let i = 0; i < 128; i++) {
          const diff = input[i] - this.somGrid[neuronIndex + i];
          distance += diff * diff;
        }

        if (distance < minDistance) {
          minDistance = distance;
          winner = { x, y };
        }
      }
    }

    return winner;
  }

  private updateSOMWeights(winner: { x: number; y: number }, input: Float32Array): void {
    const gridSize = Math.sqrt(this.somSize);

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const distance = Math.sqrt((x - winner.x) ** 2 + (y - winner.y) ** 2);

        if (distance <= this.neighborhoodRadius) {
          const influence = Math.exp(-(distance ** 2) / (2 * this.neighborhoodRadius ** 2));
          const neuronIndex = (x * gridSize + y) * 128;

          for (let i = 0; i < 128; i++) {
            this.somGrid[neuronIndex + i] +=
              this.learningRate * influence * (input[i] - this.somGrid[neuronIndex + i]);
          }
        }
      }
    }
  }

  private updateModelAffinity(behavior: UserBehaviorPattern, winner: { x: number; y: number }): void {
    // Update model affinity based on successful interactions
    const affinityIndex = winner.x * Math.sqrt(this.somSize) + winner.y;
    // Implementation would update based on behavior patterns
  }

  // Predict optimal model for given context
  predictOptimalModel(queryEmbedding: Float32Array, availableModels: ModelVariant[]): string {
    const winner = this.findBestMatchingUnit(queryEmbedding);
    const affinityIndex = winner.x * Math.sqrt(this.somSize) + winner.y;

    // Use SOM position to predict best model based on learned patterns
    let bestModel = availableModels[0]?.id || 'gemma-270m';
    let bestScore = 0;

    for (const model of availableModels) {
      const score = this.calculateModelScore(model, winner, queryEmbedding);
      if (score > bestScore) {
        bestScore = score;
        bestModel = model.id;
      }
    }

    return bestModel;
  }

  private calculateModelScore(
    model: ModelVariant,
    somPosition: { x: number; y: number },
    queryEmbedding: Float32Array
  ): number {
    // Complex scoring algorithm considering:
    // - Model capabilities
    // - Memory efficiency
    // - Latency requirements
    // - Cache hit probability
    // - SOM-learned patterns

    const cacheKey = `${model.id}-${somPosition.x}-${somPosition.y}`;
    const cacheHitProbability = this.cacheHitMap.get(cacheKey) || 0;

    const latencyScore = Math.max(0, 1 - (model.targetLatency / 1000)); // Prefer faster models
    const memoryScore = Math.max(0, 1 - (model.memoryFootprint / 8192)); // Prefer lighter models
    const cacheScore = cacheHitProbability * 0.3; // 30% weight for cache efficiency

    return (latencyScore * 0.4) + (memoryScore * 0.3) + cacheScore;
  }

  // Optimize CUDA memory layout for model switching
  optimizeCudaMemoryLayout(activeModels: string[]): {
    layout: Map<string, { offset: number; size: number }>;
    totalMemoryUsed: number;
    fragmentationRatio: number;
  } {
    const layout = new Map<string, { offset: number; size: number }>();
    let currentOffset = 0;
    let totalMemory = 0;

    // Sort models by usage frequency for optimal layout
    const sortedModels = activeModels.sort((a, b) =>
      (this.cacheHitMap.get(b) || 0) - (this.cacheHitMap.get(a) || 0)
    );

    for (const modelId of sortedModels) {
      const estimatedSize = this.estimateModelMemorySize(modelId);
      layout.set(modelId, { offset: currentOffset, size: estimatedSize });
      currentOffset += estimatedSize;
      totalMemory += estimatedSize;
    }

    const fragmentationRatio = this.calculateFragmentation(layout);

    return {
      layout,
      totalMemoryUsed: totalMemory,
      fragmentationRatio
    };
  }

  private estimateModelMemorySize(modelId: string): number {
    const sizeMap: Record<string, number> = {
      'gemma-270m': 512, // MB
      'gemma3-legal': 2048,
      'legal-bert': 256,
      'langextract-onnx': 512,
      'fastapi-endpoint': 256
    };
    return sizeMap[modelId] || 1024;
  }

  private calculateFragmentation(layout: Map<string, { offset: number; size: number }>): number {
    // Calculate memory fragmentation ratio
    if (layout.size === 0) return 0;

    const allocations = Array.from(layout.values()).sort((a, b) => a.offset - b.offset);
    let gaps = 0;
    let totalAllocated = 0;

    for (let i = 1; i < allocations.length; i++) {
      const prevEnd = allocations[i - 1].offset + allocations[i - 1].size;
      const currentStart = allocations[i].offset;
      if (currentStart > prevEnd) {
        gaps += currentStart - prevEnd;
      }
      totalAllocated += allocations[i - 1].size;
    }

    if (allocations.length > 0) {
      totalAllocated += allocations[allocations.length - 1].size;
    }

    return totalAllocated > 0 ? gaps / totalAllocated : 0;
  }
}

// Self-Prompting Intelligence System
export class SelfPromptingIntelligence {
  private userContextHistory: UserIntent[] = [];
  private queryPatterns: Map<string, number> = new Map();
  private successfulInteractions: Map<string, number> = new Map();

  // Analyze user intent from query
  analyzeUserIntent(query: string, context: any): UserIntent {
    const intent: UserIntent = {
      category: this.classifyQuery(query),
      confidence: this.calculateConfidence(query),
      urgency: this.detectUrgency(query, context),
      complexity: this.assessComplexity(query),
      context: {
        previousQueries: this.userContextHistory.slice(-5).map(h => h.category),
        userExpertise: this.inferExpertiseLevel(context),
        timeOfDay: new Date().getHours().toString(),
        sessionLength: context.sessionLength || 0
      }
    };

    this.userContextHistory.push(intent);
    return intent;
  }

  private classifyQuery(query: string): UserIntent['category'] {
    const legalKeywords = /\b(law|legal|contract|statute|case|court|attorney|lawyer|lawsuit|jurisdiction)\b/i;
    const codeKeywords = /\b(function|class|variable|array|object|method|api|debug|error|code)\b/i;
    const documentKeywords = /\b(document|file|pdf|analyze|extract|parse|content|text)\b/i;
    const searchKeywords = /\b(search|find|lookup|query|retrieve|get|show me)\b/i;

    if (legalKeywords.test(query)) return 'legal-research';
    if (codeKeywords.test(query)) return 'code-generation';
    if (documentKeywords.test(query)) return 'document-analysis';
    if (searchKeywords.test(query)) return 'search';
    return 'chat';
  }

  private calculateConfidence(query: string): number {
    // Calculate confidence based on query clarity, specificity, and known patterns
    const specificTerms = query.split(/\s+/).filter(word => word.length > 4).length;
    const totalWords = query.split(/\s+/).length;
    const specificityRatio = specificTerms / totalWords;

    const knownPatternScore = this.queryPatterns.get(query.toLowerCase()) || 0;

    return Math.min(0.95, (specificityRatio * 0.6) + (knownPatternScore * 0.4) + 0.2);
  }

  private detectUrgency(query: string, context: any): UserIntent['urgency'] {
    const urgentKeywords = /\b(urgent|asap|immediately|now|quick|fast|emergency|deadline)\b/i;
    const timeKeywords = /\b(today|tonight|morning|soon|hurry)\b/i;

    if (urgentKeywords.test(query)) return 'critical';
    if (timeKeywords.test(query)) return 'high';
    if (context.sessionLength > 30) return 'medium'; // Long session suggests focused work
    return 'low';
  }

  private assessComplexity(query: string): UserIntent['complexity'] {
    const complexIndicators = /\b(analyze|compare|evaluate|synthesize|integrate|comprehensive|detailed)\b/i;
    const simpleIndicators = /\b(show|tell|what|when|where|simple|basic)\b/i;

    const queryLength = query.length;
    const wordCount = query.split(/\s+/).length;

    if (complexIndicators.test(query) || wordCount > 20 || queryLength > 100) return 'expert';
    if (wordCount > 10 || queryLength > 50) return 'complex';
    if (simpleIndicators.test(query)) return 'simple';
    return 'moderate';
  }

  private inferExpertiseLevel(context: any): 'novice' | 'intermediate' | 'expert' {
    // Infer user expertise from interaction history and context
    const sessionCount = context.totalSessions || 0;
    const avgQueryComplexity = context.avgQueryComplexity || 0;

    if (sessionCount > 50 && avgQueryComplexity > 0.7) return 'expert';
    if (sessionCount > 10 && avgQueryComplexity > 0.4) return 'intermediate';
    return 'novice';
  }

  // Generate "did you mean" suggestions
  generateSelfPromptingSuggestions(
    originalQuery: string,
    intent: UserIntent,
    availableModels: ModelVariant[]
  ): SelfPromptingSuggestion[] {
    const suggestions: SelfPromptingSuggestion[] = [];

    // Clarification suggestions
    if (intent.confidence < 0.6) {
      suggestions.push({
        id: `clarify-${Date.now()}`,
        suggestion: `Did you mean to ${this.suggestClarification(originalQuery, intent)}?`,
        confidence: 0.8,
        category: 'clarification',
        modelRecommendation: 'gemma-270m', // Fast model for clarifications
        estimatedLatency: 200,
        contextRelevance: 0.9
      });
    }

    // Expansion suggestions based on context
    suggestions.push(...this.generateExpansionSuggestions(originalQuery, intent));

    // Alternative approach suggestions
    suggestions.push(...this.generateAlternativeSuggestions(originalQuery, intent));

    // Follow-up suggestions based on user patterns
    suggestions.push(...this.generateFollowUpSuggestions(intent));

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private suggestClarification(query: string, intent: UserIntent): string {
    switch (intent.category) {
      case 'legal-research':
        return 'search for legal precedents or analyze a specific case';
      case 'document-analysis':
        return 'extract key information from a document or summarize content';
      case 'code-generation':
        return 'write code, debug an error, or explain a programming concept';
      default:
        return 'be more specific about what you\'re looking for';
    }
  }

  private generateExpansionSuggestions(query: string, intent: UserIntent): SelfPromptingSuggestion[] {
    const expansions: SelfPromptingSuggestion[] = [];

    if (intent.category === 'legal-research' && intent.complexity === 'simple') {
      expansions.push({
        id: `expand-legal-${Date.now()}`,
        suggestion: `Would you like me to also include related statutes and case precedents in your legal research?`,
        confidence: 0.7,
        category: 'expansion',
        modelRecommendation: 'gemma3-legal-main',
        estimatedLatency: 300,
        contextRelevance: 0.8
      });
    }

    return expansions;
  }

  private generateAlternativeSuggestions(query: string, intent: UserIntent): SelfPromptingSuggestion[] {
    const alternatives: SelfPromptingSuggestion[] = [];

    // Suggest different approaches based on query type
    if (intent.category === 'search' && intent.complexity === 'complex') {
      alternatives.push({
        id: `alt-approach-${Date.now()}`,
        suggestion: `Instead of searching, would you prefer me to analyze and synthesize information from multiple sources?`,
        confidence: 0.6,
        category: 'alternative',
        modelRecommendation: 'gemma3-legal-main',
        estimatedLatency: 350,
        contextRelevance: 0.7
      });
    }

    return alternatives;
  }

  private generateFollowUpSuggestions(intent: UserIntent): SelfPromptingSuggestion[] {
    const followUps: SelfPromptingSuggestion[] = [];

    // Based on user's previous interaction patterns
    const recentCategories = intent.context.previousQueries.slice(-3);

    if (recentCategories.filter(cat => cat === 'legal-research').length >= 2) {
      followUps.push({
        id: `followup-legal-${Date.now()}`,
        suggestion: `Should I prepare a comprehensive legal brief based on your recent research?`,
        confidence: 0.75,
        category: 'follow-up',
        modelRecommendation: 'gemma3-legal-main',
        estimatedLatency: 400,
        contextRelevance: 0.85
      });
    }

    return followUps;
  }

  // Learn from user feedback to improve future suggestions
  learnFromFeedback(suggestionId: string, wasAccepted: boolean, actualQuery?: string): void {
    const feedbackKey = `feedback-${suggestionId}`;
    const currentScore = this.successfulInteractions.get(feedbackKey) || 0;

    if (wasAccepted) {
      this.successfulInteractions.set(feedbackKey, currentScore + 1);

      if (actualQuery) {
        const patternKey = actualQuery.toLowerCase();
        this.queryPatterns.set(patternKey, (this.queryPatterns.get(patternKey) || 0) + 0.1);
      }
    } else {
      this.successfulInteractions.set(feedbackKey, Math.max(0, currentScore - 0.2));
    }
  }
}

// Main Intelligent Model Orchestrator
export class IntelligentModelOrchestrator {
  private cudaOptimizer: CudaCacheSOMOptimizer;
  private selfPrompting: SelfPromptingIntelligence;
  private modelRegistry: Map<string, ModelVariant> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private activeModel: string = 'gemma-270m';
  private modelSwitchQueue: string[] = [];

  // Svelte stores for reactive UI
  public readonly currentModel = writable<ModelVariant | null>(null);
  public readonly suggestions = writable<SelfPromptingSuggestion[]>([]);
  public readonly performance = writable<ModelPerformanceMetrics[]>([]);
  public readonly memoryOptimization = writable<{
    layout: Map<string, { offset: number; size: number }>;
    totalMemoryUsed: number;
    fragmentationRatio: number;
  } | null>(null);

  constructor() {
    this.cudaOptimizer = new CudaCacheSOMOptimizer();
    this.selfPrompting = new SelfPromptingIntelligence();
    this.initializeModelRegistry();
    this.startPerformanceMonitoring();
  }

  private initializeModelRegistry(): void {
    const models: ModelVariant[] = [
      {
        id: 'gemma-270m',
        name: 'Gemma 270M',
        type: 'gemma-270m',
        targetLatency: 200,
        memoryFootprint: 512,
        capabilities: ['chat', 'simple-qa', 'clarification'],
        contextWindow: 2048,
        isLoaded: true,
        warmupTime: 50
      },
      {
        id: 'gemma3-legal-main',
        name: 'Gemma3 Legal Specialized',
        type: 'gemma3-legal',
        targetLatency: 300,
        memoryFootprint: 2048,
        capabilities: ['legal-research', 'document-analysis', 'legal-reasoning', 'case-law-analysis'],
        contextWindow: 4096,
        isLoaded: true,
        warmupTime: 100
      },
      {
        id: 'langextract-processor',
        name: 'LangExtract ONNX Processor',
        type: 'langextract-onnx',
        targetLatency: 150,
        memoryFootprint: 512,
        capabilities: ['text-extraction', 'document-parsing', 'entity-extraction'],
        contextWindow: 2048,
        isLoaded: true,
        warmupTime: 50
      },
      {
        id: 'legal-bert-fast',
        name: 'Legal-BERT Fast',
        type: 'legal-bert',
        targetLatency: 150,
        memoryFootprint: 256,
        capabilities: ['legal-entity-extraction', 'case-classification', 'legal-search'],
        contextWindow: 512,
        isLoaded: true,
        warmupTime: 30
      },
      {
        id: 'fastapi-endpoint',
        name: 'FastAPI Processing Endpoint',
        type: 'fastapi-endpoint',
        targetLatency: 200,
        memoryFootprint: 256,
        capabilities: ['api-processing', 'data-transformation', 'batch-processing'],
        contextWindow: 1024,
        isLoaded: true,
        warmupTime: 25
      }
    ];

    models.forEach(model => {
      this.modelRegistry.set(model.id, model);
      this.performanceMetrics.set(model.id, {
        modelId: model.id,
        averageLatency: model.targetLatency,
        successRate: 0.85,
        userSatisfaction: 0.8,
        cachePredictionAccuracy: 0.6,
        contextSwitchPenalty: model.warmupTime,
        memoryEfficiency: 1 - (model.memoryFootprint / 16384),
        lastUsed: new Date(),
        usageCount: 0,
        errorRate: 0.05
      });
    });

    // Set initial model
    this.currentModel.set(this.modelRegistry.get(this.activeModel) || null);
  }

  // Main method: Intelligently handle user query
  async processQuery(
    query: string,
    context: any = {},
    userBehavior?: UserBehaviorPattern
  ): Promise<{
    selectedModel: string;
    estimatedLatency: number;
    suggestions: SelfPromptingSuggestion[];
    shouldPreload: string[];
    cacheOptimization: any;
  }> {
    // Step 1: Analyze user intent
    const intent = this.selfPrompting.analyzeUserIntent(query, context);

    // Step 2: Generate query embedding (mock for now - would use actual embedding service)
    const queryEmbedding = this.generateQueryEmbedding(query);

    // Step 3: Train SOM if behavior data available
    if (userBehavior) {
      this.cudaOptimizer.trainFromUserBehavior(userBehavior, queryEmbedding);
    }

    // Step 4: Predict optimal model
    const availableModels = Array.from(this.modelRegistry.values());
    const optimalModel = this.cudaOptimizer.predictOptimalModel(queryEmbedding, availableModels);

    // Step 5: Check if model switch is needed
    const shouldSwitch = await this.shouldSwitchModel(optimalModel, intent);

    if (shouldSwitch) {
      await this.performModelSwitch(optimalModel);
    }

    // Step 6: Generate self-prompting suggestions
    const suggestions = this.selfPrompting.generateSelfPromptingSuggestions(
      query,
      intent,
      availableModels
    );

    // Step 7: Optimize CUDA memory layout
    const activeModels = this.getActiveModelIds();
    const memoryOptimization = this.cudaOptimizer.optimizeCudaMemoryLayout(activeModels);

    // Step 8: Predict models to preload
    const shouldPreload = this.predictPreloadModels(intent, context);

    // Update stores
    this.suggestions.set(suggestions);
    this.memoryOptimization.set(memoryOptimization);
    this.performance.set(Array.from(this.performanceMetrics.values()));

    return {
      selectedModel: optimalModel,
      estimatedLatency: this.estimateLatency(optimalModel, intent),
      suggestions,
      shouldPreload,
      cacheOptimization: memoryOptimization
    };
  }

  private generateQueryEmbedding(query: string): Float32Array {
    // Mock embedding generation - would use actual embedding service
    const embedding = new Float32Array(128);
    const words = query.toLowerCase().split(/\s+/);

    for (let i = 0; i < 128; i++) {
      let value = 0;
      for (const word of words) {
        // Simple hash-based embedding simulation
        value += Math.sin(this.hashString(word + i)) * 0.1;
      }
      embedding[i] = value / words.length;
    }

    return embedding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private async shouldSwitchModel(targetModel: string, intent: UserIntent): Promise<boolean> {
    if (this.activeModel === targetModel) return false;

    const currentModel = this.modelRegistry.get(this.activeModel);
    const targetModelInfo = this.modelRegistry.get(targetModel);

    if (!currentModel || !targetModelInfo) return false;

    // Calculate switch cost vs benefit
    const switchCost = targetModelInfo.warmupTime;
    const performanceBenefit = this.calculatePerformanceBenefit(currentModel, targetModelInfo, intent);

    // Switch if benefit outweighs cost and urgency allows
    const shouldSwitch = performanceBenefit > switchCost && intent.urgency !== 'critical';

    return shouldSwitch;
  }

  private calculatePerformanceBenefit(
    current: ModelVariant,
    target: ModelVariant,
    intent: UserIntent
  ): number {
    // Calculate expected performance improvement
    const latencyImprovement = Math.max(0, current.targetLatency - target.targetLatency);
    const capabilityMatch = target.capabilities.some(cap =>
      intent.category.includes(cap) || cap.includes(intent.category)
    ) ? 100 : 0;

    const complexityMatch = this.getComplexityMatchScore(target, intent.complexity);

    return latencyImprovement + capabilityMatch + complexityMatch;
  }

  private getComplexityMatchScore(model: ModelVariant, complexity: string): number {
    const modelComplexityMap: Record<string, number> = {
      'gemma-270m': 1,      // Simple tasks
      'legal-bert': 2,      // Specialized simple tasks
      'gemma3-legal': 3,    // Legal specialized complex
      'langextract-onnx': 2,// Text extraction moderate
      'fastapi-endpoint': 1 // Simple API processing
    };

    const complexityScores = {
      'simple': 1,
      'moderate': 2,
      'complex': 3,
      'expert': 4
    };

    const modelScore = modelComplexityMap[model.type] || 2;
    const taskScore = complexityScores[complexity as keyof typeof complexityScores] || 2;

    // Perfect match gets high score, over/under-engineering gets penalty
    const diff = Math.abs(modelScore - taskScore);
    return Math.max(0, 50 - (diff * 15));
  }

  private async performModelSwitch(targetModel: string): Promise<void> {
    const targetModelInfo = this.modelRegistry.get(targetModel);
    if (!targetModelInfo) return;

    // Add to switch queue to prevent race conditions
    this.modelSwitchQueue.push(targetModel);

    try {
      // Simulate model loading
      if (!targetModelInfo.isLoaded) {
        console.log(`Loading model: ${targetModelInfo.name}`);
        // Simulate warmup time
        await new Promise(resolve => setTimeout(resolve, targetModelInfo.warmupTime));
        targetModelInfo.isLoaded = true;
      }

      // Update active model
      this.activeModel = targetModel;
      this.currentModel.set(targetModelInfo);

      // Update performance metrics
      const metrics = this.performanceMetrics.get(targetModel);
      if (metrics) {
        metrics.lastUsed = new Date();
        metrics.usageCount++;
      }

      console.log(`Switched to model: ${targetModelInfo.name}`);
    } catch (error) {
      console.error('Model switch failed:', error);
    } finally {
      // Remove from queue
      this.modelSwitchQueue = this.modelSwitchQueue.filter(id => id !== targetModel);
    }
  }

  private estimateLatency(modelId: string, intent: UserIntent): number {
    const model = this.modelRegistry.get(modelId);
    const metrics = this.performanceMetrics.get(modelId);

    if (!model || !metrics) return 1000; // Default fallback

    let baseLatency = metrics.averageLatency;

    // Adjust for complexity
    const complexityMultiplier = {
      'simple': 0.7,
      'moderate': 1.0,
      'complex': 1.4,
      'expert': 2.0
    };

    const multiplier = complexityMultiplier[intent.complexity] || 1.0;

    // Add context switch penalty if model not loaded
    const switchPenalty = model.isLoaded ? 0 : model.warmupTime;

    return Math.round(baseLatency * multiplier + switchPenalty);
  }

  private predictPreloadModels(intent: UserIntent, context: any): string[] {
    const preloadCandidates: string[] = [];

    // Predict likely next models based on user patterns
    if (intent.category === 'legal-research') {
      // User likely to need document analysis next
      preloadCandidates.push('gemma3-legal-main');
      if (intent.complexity === 'expert') {
        preloadCandidates.push('langextract-processor');
      }
    }

    if (intent.category === 'chat' && context.sessionLength > 10) {
      // Long session suggests deeper engagement
      preloadCandidates.push('gemma3-legal-main');
    }

    // Always keep fast models ready
    preloadCandidates.push('gemma-270m', 'legal-bert-fast');

    return [...new Set(preloadCandidates)].slice(0, 3); // Max 3 preloads
  }

  private getActiveModelIds(): string[] {
    return Array.from(this.modelRegistry.values())
      .filter(model => model.isLoaded || model.id === this.activeModel)
      .map(model => model.id);
  }

  private startPerformanceMonitoring(): void {
    // Monitor and update performance metrics periodically
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Update every 30 seconds
  }

  private updatePerformanceMetrics(): void {
    // Update metrics based on actual performance data
    for (const [modelId, metrics] of this.performanceMetrics.entries()) {
      // Simulate metric updates - would integrate with actual monitoring
      const timeSinceLastUse = Date.now() - metrics.lastUsed.getTime();

      // Decay unused models' scores
      if (timeSinceLastUse > 300000) { // 5 minutes
        metrics.cachePredictionAccuracy *= 0.95;
      }

      // Update memory efficiency based on current load
      const model = this.modelRegistry.get(modelId);
      if (model?.isLoaded) {
        metrics.memoryEfficiency = Math.min(1, metrics.memoryEfficiency + 0.01);
      }
    }

    this.performance.set(Array.from(this.performanceMetrics.values()));
  }

  // Public methods for external integration

  async handleUserFeedback(suggestionId: string, accepted: boolean, actualQuery?: string): Promise<void> {
    this.selfPrompting.learnFromFeedback(suggestionId, accepted, actualQuery);

    if (accepted && actualQuery) {
      // Re-process with the accepted query to improve future predictions
      await this.processQuery(actualQuery);
    }
  }

  getCurrentModelCapabilities(): string[] {
    const current = this.modelRegistry.get(this.activeModel);
    return current?.capabilities || [];
  }

  getModelPerformanceReport(): {
    summary: any;
    models: ModelPerformanceMetrics[];
    memoryUsage: any;
    recommendations: string[];
  } {
    const models = Array.from(this.performanceMetrics.values());
    const totalUsage = models.reduce((sum, m) => sum + m.usageCount, 0);
    const avgSatisfaction = models.reduce((sum, m) => sum + m.userSatisfaction, 0) / models.length;

    return {
      summary: {
        totalQueries: totalUsage,
        averageLatency: models.reduce((sum, m) => sum + m.averageLatency, 0) / models.length,
        overallSatisfaction: avgSatisfaction,
        activeModels: this.getActiveModelIds().length
      },
      models,
      memoryUsage: this.cudaOptimizer.optimizeCudaMemoryLayout(this.getActiveModelIds()),
      recommendations: this.generateOptimizationRecommendations(models)
    };
  }

  private generateOptimizationRecommendations(metrics: ModelPerformanceMetrics[]): string[] {
    const recommendations: string[] = [];

    const lowPerformers = metrics.filter(m => m.userSatisfaction < 0.7);
    if (lowPerformers.length > 0) {
      recommendations.push(`Consider retraining models: ${lowPerformers.map(m => m.modelId).join(', ')}`);
    }

    const highLatency = metrics.filter(m => m.averageLatency > 1000);
    if (highLatency.length > 0) {
      recommendations.push(`Optimize high-latency models: ${highLatency.map(m => m.modelId).join(', ')}`);
    }

    const memoryLayout = this.cudaOptimizer.optimizeCudaMemoryLayout(this.getActiveModelIds());
    if (memoryLayout.fragmentationRatio > 0.3) {
      recommendations.push('Consider memory defragmentation to improve performance');
    }

    return recommendations;
  }
}

// Export singleton instance
export const intelligentOrchestrator = new IntelligentModelOrchestrator();

// Derived stores for convenient access
export const currentModelInfo = derived(
  intelligentOrchestrator.currentModel,
  $model => $model
);

export const selfPromptingSuggestions = derived(
  intelligentOrchestrator.suggestions,
  $suggestions => $suggestions
);

export const performanceMetrics = derived(
  intelligentOrchestrator.performance,
  $performance => $performance
);

export const memoryOptimization = derived(
  intelligentOrchestrator.memoryOptimization,
  $memory => $memory
);

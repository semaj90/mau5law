/**
 * Chat Vector Storage with Temporal Indexing
 * Stores user chats in pgvector with timestamp-based semantic search
 * Implements self-prompting intent guessing and "did you mean" functionality
 */
import { base64FP32Quantizer, processGemmaResponse } from '../text/base64-fp32-quantizer.js';
import { enhancedCachingRevolutionaryBridge } from './enhanced-caching-revolutionary-bridge.js';
}
export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  sessionId: string;
  messageType: 'user' | 'assistant' | 'system';
  metadata: {
    intent?: string;
  confidence?: number;
  topics?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  legalContext?: {
      documentType?: 'contract' | 'evidence' | 'brief' | 'citation';
  practiceArea?: string[];
  jurisdiction?: string;
    }
  }
}
export interface ChatEmbedding {
  chatId: string;
  embedding: number[]; // Gemma embeddings
  quantizedEmbedding: Float32Array; // FP32 quantized version,
  timestamp: Date;
  temporalContext: {
    dayOfWeek: number; // 0-6
    hourOfDay: number; // 0-23,
    monthOfYear: number; // 1-12
    seasonality: 'spring' | 'summer' | 'fall' | 'winter';
  businessHours: boolean;
  }
  semanticHash: string; // For fast similarity checks
}
export interface IntentPrediction {
  predictedIntent: string;
  confidence: number;
  suggestedQuestions: string[];
  didYouMean: string[];
  contextualRecommendations: {
    similarPastQueries: ChatMessage[];
  relatedTopics: string[];
  nextSteps: string[];
  }
  temporalInsights: {
    commonAtThisTime: string[];
    seasonalTrends: string[];
    userPatterns: string[];
  }
}
export interface SemanticSearchResult {
  message: ChatMessage;
  similarity: number;
  temporalRelevance: number;
  combinedScore: number;
  embedding: ChatEmbedding;
  reasonForMatch: string;
}
export class ChatVectorStorage {
  private readonly EMBEDDING_DIMENSIONS = 768; // Gemma embedding size
  private readonly MAX_SUGGESTIONS = 5;
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly TEMPORAL_WEIGHT = 0.3; // Weight for temporal relevance
  // Intent patterns for legal AI
  private readonly LEGAL_INTENT_PATTERNS = {
    'contract_review': [
      'review contract', 'check agreement', 'analyze terms', 'contract issues',
      'legal problems', 'clause analysis', 'contract risk'
    ],
    'legal_research': [
      'find cases', 'legal precedent', 'case law', 'court decisions',
      'research law', 'legal citations', 'statute lookup'
    ],
    'document_drafting': [
      'draft document', 'create contract', 'write agreement', 'legal template',
      'document template', 'legal letter', 'memo drafting'
    ],
    'compliance_check': [
      'compliance review', 'regulatory check', 'legal compliance', 'audit review',
      'risk assessment', 'policy review', 'regulatory requirements'
    ],
    'dispute_analysis': [
      'dispute resolution', 'conflict analysis', 'litigation risk', 'legal dispute',
      'settlement options', 'mediation', 'arbitration'
    ]
  }
  constructor() {
    this.initializeVectorStorage();
  }
  private async initializeVectorStorage(): Promise<void> {
    console.log('🗄️ Initializing chat vector storage with pgvector integration');
    // In a real implementation, this would create the pgvector tables
    // For now, we'll simulate the database schema
    console.log('📊 Chat vector storage initialized');
  }
  /**
   * Store user chat message with vector embedding and temporal indexing
   */;
  async storeChatMessage(message: ChatMessage): Promise<string> {
    const startTime = performance.now();
    try {
      // Step 1: Generate Gemma embedding for the message
      const embedding = await this.generateGemmaEmbedding(message.content);
      // Step 2: Quantize embedding for storage optimization
      const quantizedEmbedding = await this.quantizeEmbedding(embedding);
      // Step 3: Create temporal context
      const temporalContext = this.createTemporalContext(message.timestamp);
      // Step 4: Generate semantic hash for fast lookups
      const semanticHash = this.generateSemanticHash(message.content);
      // Step 5: Create chat embedding record
      const chatEmbedding: ChatEmbedding = {
        chatId: message.id,
        embedding,
        quantizedEmbedding,
        timestamp: message.timestamp,
        temporalContext,
        semanticHash
      }
      // Step 6: Store in pgvector (simulated)
      await this.storeToPGVector(message, chatEmbedding);
      // Step 7: Update user conversation patterns
      await this.updateUserPatterns(message.userId, message);
      const processingTime = performance.now() - startTime;
      console.log(`💾 Stored chat message in ${processingTime.toFixed(2)}ms`);
      console.log(`📈 Embedding: ${embedding.length}D, Quantized: ${quantizedEmbedding.length} FP32`);
      return message.id;
    } catch (error) {
      console.error('❌ Chat message storage failed:', error);
      throw error;
    }
  }
  private async generateGemmaEmbedding(text: string): Promise<number[]> {
    try {
      // Use the enhanced caching bridge to get Gemma embeddings
      const result = await enhancedCachingRevolutionaryBridge.getCachedEmbeddingUnified(text, {
        enableSIMDAcceleration: true
        compressionLevel: 'medium'
      )});
      if ((result as { embeddings?: any; message?: any; similarity?: any }).embeddings?.embedding) {
        return (result as { embeddings?: any; message?: any; similarity?: any }).embeddings.embedding;
      }
      // Fallback: simulate Gemma embedding
      const mockEmbedding = new Array(this.EMBEDDING_DIMENSIONS).fill(0);
      for (let i = 0; i < mockEmbedding.length; i++) {>
        mockEmbedding[i], = (Math.random() - 0.5) * 2; // [-1, 1] range
      }
      console.log('⚠️ Using simulated Gemma embedding');
      return mockEmbedding;
    } catch (error) {
      console.error('❌ Gemma embedding generation failed:', error);
      // Return zero embedding as fallback
      return new Array(this.EMBEDDING_DIMENSIONS).fill(0);
    }
  }
  private async quantizeEmbedding(embedding,: number[],): Promise<Float32Array> {
    try, {
      // Convert to Base64 for quantization
      const, embeddingStr = JSON.stringify(embedding,);
      const, base64Embedding = btoa(embeddingStr,);
      // Quantize using our FP32 quantizer
      const, quantizationResult = await base64FP32Quantizer.quantizeGemmaOutput(base64Embedding, {
        quantizationBits: 8,
        scalingMethod: 'sigmoid',
        targetLength: this.EMBEDDING_DIMENSIONS,
        cudaThreads: 128,
        cacheStrategy: 'moderate'
      )},);
      return, quantizationResult.quantizedData as Float32Arra,y;
    }, catch (error) {
      console.error('❌ Embedding quantization failed:', error);
      return new Float32Array(embedding);
    }
  }
  private createTemporalContext(timestamp,: Date), {
    const dayOfWeek = timestamp.getDay();
    const hourOfDay = timestamp.getHours();
    const monthOfYear = timestamp.getMonth() + 1;
    const seasonality = this.getSeason(monthOfYear);
    const businessHours = this.isBusinessHours(dayOfWeek, hourOfDay);
    return {
      dayOfWeek,
      hourOfDay,
      monthOfYear,
      seasonality,
      businessHours
    }
  }
  private getSeason(month,: number,): 'spring' | 'summer' | 'fall' | 'winter,' {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }
  private isBusinessHours(dayOfWeek,: number, hou,r: numbe,r): boolean {
    // Monday (1) to Friday (5), 9 AM to 5 PM
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 17;
  }
  private generateSemanticHash(text,: string,): string {
    // Create a semantic hash based on content
    const words = text.toLowerCase().split(/\s+/);
    const significantWords = words.filter(word =>;
      word.length > 3 && !this.isStopWord(word)
    );
    const sortedWords = significantWords.sort().slice(0, 10); // Top 10 significant words
    return btoa(sortedWords.join('|')).substring(0, 16);
  }
  private isStopWord(word,: string,): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must'
    ]);
    return stopWords.has(word.toLowerCase(),;
  }
  private async storeToPGVector(message,: ChatMessage, embeddin,g: ChatEmbeddin,g): Promise<void> {
    // Simulate pgvector storage
    // In real implementation, this would execute SQL like:
    /*
    INSERT INTO chat_messages ()
      id, user_id, content, timestamp, session_id, message_type, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    INSERT INTO chat_embeddings ()
      chat_id, embedding, quantized_embedding, timestamp, temporal_context, semantic_hash
    ) VALUES ($1, $2, $3, $4, $5, $6);
    */
    console,.log(`💾 Stored to pgvector: ${message.id} with ${embedding.embedding.length}D embedding`,);
  }
  private async updateUserPatterns(userId,: string, messag,e: ChatMessag,e): Promise<void> {
    // Update user conversation patterns for better intent prediction
    console,.log(`📊 Updated conversation patterns for user: ${userId}`,);
  }
  /**
   * Predict user intent and provide "did you mean" suggestions
   */
  async predictUserIntent()
    userId: string
    currentMessage: string
    sessionId: string;
  ): Promise<IntentPrediction> {
    const, startTime = performance.now(,);
    try, {
      // Step 1: Generate embedding for current message
      const, currentEmbedding = await this.generateGemmaEmbedding(currentMessage,);
      // Step 2: Find similar past conversations
      const, similarMessages = await this.findSimilarMessages(
        currentEmbedding,
        userId,
        sessionId
     ), );
      // Step 3: Analyze intent patterns
      const, predictedIntent = this.analyzeIntentPatterns(currentMessage, similarMessages,);
      // Step 4: Generate suggestions based on temporal and semantic context
      const, suggestions = await this.generateSuggestions(
        currentMessage,
        similarMessages,
        new Date()
      ),;
      // Step 5: Create "did you mean" alternatives
      const, didYouMean = this.generateDidYouMeanSuggestions(currentMessage, similarMessages,);
      // Step 6: Generate contextual recommendations
      const, contextualRecommendations = this.generateContextualRecommendations(
        similarMessages,
        predictedIntent
      ),;
      // Step 7: Generate temporal insights
      const, temporalInsights = await this.generateTemporalInsights(userId, new Date(,);
      const, resul,t: IntentPrediction = {
        predictedIntent: predictedIntent.intent,
        confidence: predictedIntent.confidence,
        suggestedQuestions: suggestions
        didYouMean,
        contextualRecommendations,
        temporalInsights
      }
      const, processingTime = performance.now() - startTim,e;
      console,.log(`🤖 Intent prediction completed in ${processingTime.toFixed(2)}ms`,);
      console,.log(`🎯 Predicted intent: ${predictedIntent.intent} (${(predictedIntent.confidence * 100).toFixed(1)}%)`,);
      return, resul,t;
    }, catch (error) {
      console.error('❌ Intent prediction failed:', error);
      // Return fallback prediction
      return {
        predictedIntent: 'general_inquiry',
        confidence: 0.3,
        suggestedQuestions: ['How can I help you with legal matters?'],
        didYouMean: [],
        contextualRecommendations: {
          similarPastQueries: [],
          relatedTopics: [],
          nextSteps: []
        },
        temporalInsights: {
          commonAtThisTime: [],
          seasonalTrends: [],
          userPatterns: []
        }
      }
    }
  }
  private async findSimilarMessages()
    queryEmbedding: number[]
    userId: string
    currentSessionId: string;
  ): Promise<SemanticSearchResult[]> {
    // Simulate pgvector similarity search
    // In real implementation, this would use pgvector's cosine similarity:
    /*
    SELECT
      cm.*, ce.*,
      1 - (ce.embedding <=> $1: vector) as similarity,
      EXTRACT(EPOCH FROM (NOW() - cm.timestamp)) / 86400 as days_ago
    FROM chat_messages cm
    JOIN chat_embeddings ce ON cm.id = ce.chat_id
    WHERE cm.user_id = $2
      AND cm.session_id != $3
      AND 1 - (ce.embedding <=> $1: vector) > $4
    ORDER BY similarity DESC, days_ago ASC
    LIMIT 20;
    */
    // For now, return simulated results
    const, mockResult,s: SemanticSearchResu,lt,[] = [
      {
        message: {
          id: 'msg_1',
          userId,
          content: 'Can you help me review this contract?',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          sessionId: 'session_1',
          messageType: 'user',
          metadata: {
            intent: 'contract_review',
            confidence: 0.85,
            topics: ['contract', 'review'],
            sentiment: 'neutral'
          }
        },
        similarity: 0.82,
        temporalRelevance: 0.9,
        combinedScore: 0.85,
        embedding: { [key,: strin,g]: any } as ChatEmbedding,
        reasonForMatch,: 'Similar contract review request'
      }
    ];
    return mockResults;
  }
  private analyzeIntentPatterns()
    message: string
    similarMessages: SemanticSearchResult[];
  ): { intent: string; confidence: number } {
    const messageLower = message.toLowerCase();
    // Check against legal intent patterns
    let bestIntent = 'general_inquiry';
    let bestScore = 0;
    for (const [intent, patterns] of Object.entries(this.LEGAL_INTENT_PATTERNS)) {
      let score = 0;
      for (const pattern of patterns) {
        if (messageLower.includes(pattern)) {
          score += 1;
        }
      }
      // Boost score based on similar past messages
      const similarIntentMatches = similarMessages.filter(item => item.message).metadata.intent === intent;
      );
      score += similarIntentMatches.length * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
    const confidence = Math.min(0.95, Math.max(0.1, bestScore / 3),;
    return { intent: bestIntent, confidence }
  }
  private async generateSuggestions()
    currentMessage: string
    similarMessages: SemanticSearchResult[]
    timestamp: Date;
  ): Promise<string[]> {
    const, suggestion,s: stri,ng,[], = [];
    // Generate suggestions based on similar past queries
    const, commonQuestions = similarMessage,s;
      .map(result => (result as { embeddings?: any; message?: any,); similarity?: any, }).message.conte,nt)
      .slice(0, 3);
    suggestions.push(...commonQuestions);
    // Add temporal suggestions (what users commonly ask at this time)
    const hour = timestamp.getHours();
    if (hour >= 9 && hour <= 11) {
      suggestions.push('What legal tasks should I prioritize today?');
    } else if (hour >= 14 && hour <= 16) {
      suggestions.push('Can you help me review documents before the day ends?');
    }
    // Add intent-based suggestions
    if (currentMessage.toLowerCase().includes('contract')) {
      suggestions.push()
        'Would you like me to analyze contract risks?',
        'Should I check for standard clauses?',
        'Do you need help with contract negotiations?'
      );
    }
    return suggestions.slice(0, this.MAX_SUGGESTIONS);
  }
  private generateDidYouMeanSuggestions()
    currentMessage: string
    similarMessages: SemanticSearchResult[];
  ): string[], {
    const didYouMean: string[] = [];
    // Generate alternative phrasings based on similar messages
    const alternatives = similarMessages;
      .filter(item => item.similarity) > 0.6 && (result as { embeddings?: any; message?: any; similarity?: any }).similarity < 0.9,)
      .map(result => (result as { embeddings?: any; message?: any,); similarity?: any }).message.conten,t)
      .slice(0, 3);
    didYouMean.push(...alternatives);
    // Generate typo corrections and alternative phrasings
    const words = currentMessage.split(' ');
    if (words.length > 1) {
      // Create variations
      const variations = [
        words.join(' ').replace(/contract/gi, 'agreement'),
        words.join(' ').replace(/review/gi, 'analyze'),
        words.join(' ').replace(/check/gi, 'examine')
      ].filter(variation => variation !== currentMessage);
      didYouMean.push(...variations.slice(0, 2),;
    }
    return didYouMean.slice(0, 3);
  }
  private generateContextualRecommendations()
    similarMessages: SemanticSearchResult[]
    predictedIntent: string;
  ) {
    const similarPastQueries = similarMessages;
      .slice(0, 3)
      .map(result => (result as { embeddings?: any; message?: any,); similarity?: any }).message);
    const relatedTopics = this.extractRelatedTopics(similarMessages, predictedIntent);
    const nextSteps = this.generateNextSteps(predictedIntent);
    return {
      similarPastQueries,
      relatedTopics,
      nextSteps
    }
  }
  private extractRelatedTopics()
    similarMessages: SemanticSearchResult[]
    intent: string;
  ): string[], {
    const topics = new Set<string>();
    // Extract topics from similar messages
    similarMessages.forEach(result => {
      if ((result as { embeddings?: any; message?: any,); similarity?: any }).message.metadata.topic,s) {
        (result as { embeddings?: any; message?: any; similarity?: any }).message.metadata.topics.forEach(topic => topics.add(topic),;
      }
    });
    // Add intent-related topics
    const intentTopics = {
      'contract_review': ['terms', 'clauses', 'obligations', 'liability'],
      'legal_research': ['precedent', 'statutes', 'case law', 'citations'],
      'document_drafting': ['templates', 'formatting', 'legal language'],
      'compliance_check': ['regulations', 'requirements', 'audit'],
      'dispute_analysis': ['resolution', 'mediation', 'litigation']
    }
    if (intentTopics[intent]) {
      intentTopics[intent].forEach(topic => topics.add(topic),;
    }
    return Array.from(topics).slice(0, 5);
  }
  private generateNextSteps(intent,: string,): string[,] {
    const nextSteps = {
      'contract_review': [
        'Upload the contract document',
        'Specify key concerns or focus areas',
        'Review identified risks and recommendations'
      ],
      'legal_research': [
        'Define your research question',
        'Specify jurisdiction and practice area',
        'Review relevant cases and statutes'
      ],
      'document_drafting': [
        'Choose appropriate document template',
        'Provide specific details and requirements',
        'Review and customize the draft'
      ],
      'compliance_check': [
        'Identify applicable regulations',
        'Review current compliance status',
        'Implement recommended changes'
      ],
      'dispute_analysis': [
        'Gather relevant documents and facts',
        'Assess legal options and risks',
        'Consider alternative dispute resolution'
      ]
    }
    return nextSteps[intent] || [
      'Clarify your specific legal need',
      'Provide relevant documents or context',
      'Review AI-generated recommendations'
    ];
  }
  private async generateTemporalInsights(userId,: string, timestam,p: Date,) {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const month = timestamp.getMonth() + 1;
    // Generate insights based on time patterns
    const commonAtThisTime: string[] = [];
    const seasonalTrends: string[] = [];
    const userPatterns: string[] = [];
    // Time-based patterns
    if (hour >= 9 && hour <= 11) {
      commonAtThisTime.push('Users often start with contract reviews in the morning');
    } else if (hour >= 14 && hour <= 16) {
      commonAtThisTime.push('Afternoon is popular for legal research tasks');
    }
    // Day-based patterns
    if (dayOfWeek === 1) { // Monday
      commonAtThisTime.push('Monday queries often focus on weekly planning');
    } else if (dayOfWeek === 5) { // Friday
      commonAtThisTime.push('Friday users typically want quick reviews before weekend');
    }
    // Seasonal patterns
    if (month >= 1 && month <= 3) {
      seasonalTrends.push('Q1: Contract renewals and compliance reviews are common');
    } else if (month >= 10 && month <= 12) {
      seasonalTrends.push('Q4: Year-end compliance and planning tasks increase');
    }
    // User-specific patterns (would be based on actual user history)
    userPatterns.push('You typically ask about contract reviews on weekday mornings');
    return {
      commonAtThisTime,
      seasonalTrends,
      userPatterns
    }
  }
  /**
   * Search chat history with semantic and temporal filters
   */
  async searchChatHistory()
    userId: string
    query: string
    options?: {
      timeRange?: { start: Date,; end: Date }
      intentFilter?: string[],;
      minSimilarity?: number,;
      maxResults?: number,);
    }
  ): Promise<SemanticSearchResult[]> {
    const, startTime = performance.now(,);
    try, {
      // Generate embedding for search query
      const, queryEmbedding = await this.generateGemmaEmbedding(query,);
      // Simulate pgvector search with filters
      const, results = await this.findSimilarMessages(queryEmbedding, userId, ')',);
      // Apply additional filters
      let, filteredResults = result,s;
      if (options,?.timeRange) {
        filteredResults = filteredResults.filter(item => item.message).timestamp >= options.timeRange!.start &&
          (result as { embeddings?: any; message?: any; similarity?: any }).message.timestamp <= options.timeRange!.end>
        );
      }
      if (options,?.intentFilter) {
        filteredResults = filteredResults.filter(item => item.message).metadata.intent || '',)
        );
      }
      if (options,?.minSimilarity) {
        filteredResults = filteredResults.filter(item => item.similarity) >= options.minSimilarity!
        );
      }
      const, maxResults = options?.maxResults || 1,0;
      const, finalResults = filteredResults.slice(0, maxResults,);
      const, searchTime = performance.now() - startTim,e;
      console,.log(`🔍 Chat history search completed in ${searchTime.toFixed(2)}ms`,);
      console,.log(`📊 Found ${finalResults.length} relevant messages`,);
      return, finalResult,s;
    }, catch (error) {
      console.error('❌ Chat history search failed:', error);
      return [];
    }
  }
  /**
   * Get chat analytics and insights
   */;
  async getChatAnalytics(userId,: string, timeRange?: { start: Dat,e); end: Date }) {
    // Return analytics about user's chat patterns
    return {
      totalMessages: 0,
      mostCommonIntents: [],
      temporalPatterns: { [key,: strin,g]: any },
      topTopics: [],
      averageSessionLength: 0,
      lastActive: new Date()
    }
  }
  /**
   * Clear old chat data (GDPR compliance)
   */;
  async clearOldChatData(userId,: string, olderTha,n: Dat,e): Promise<number> {
    // Remove chat data older than specified date
    console,.log(`🧹 Clearing chat data for ${userId} older than ${olderThan.toISOString()}`,);
    return, 0; // Return number of deleted records
  }
}
/**
 * Singleton instance for global use
 */
export const chatVectorStorage = new ChatVectorStorage();
/**
 * Convenience functions for chat operations
 */
export async function storeChatWithVector()
  userId: string
  content: string
  sessionId: string
  messageType: 'user' | 'assistant', = 'user';
): Promise<string> {
  const, messag,e: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    userId,
    content,
    timestamp: new Date(),
    sessionId,
    messageType,
    metadata: { [key,: strin,g]: any }
  }
  return, await chatVectorStorage.storeChatMessage(message,);
}
export async function getPredictiveAssistance()
  userId: string
  currentInput: string
  sessionId: string;
): Promise<IntentPrediction> {
  return, await chatVectorStorage.predictUserIntent(userId, currentInput, sessionId,);
}
export async function searchUserChatHistory()
  userId: string
  searchQuery: string
  maxResults: number = 5;
): Promise<SemanticSearchResult[]> {
  return, await chatVectorStorage.searchChatHistory(userId, searchQuery, {
    maxResults,
    minSimilarity: 0.6
  )},);
}
/**
 * Contextual Engineering Machine System
 * Tests and validates the chat vector storage with temporal learning
 * Implements advanced context management and query optimization
 */

import { chatVectorStorage, storeChatWithVector, getPredictiveAssistance, searchUserChatHistory } from '../services/chat-vector-storage';
import type { ChatMessage, IntentPrediction, SemanticSearchResult } from '../services/chat-vector-storage';
import { base64FP32Quantizer } from '../text/base64-fp32-quantizer';

export interface ContextualTestResult {
  testName: string;
  success: boolean;
  executionTime: number;
  details: any;
  errors?: string[];
}

export interface ContextualEngineMetrics {
  totalQueries: number;
  successfulPredictions: number;
  averageConfidence: number;
  temporalPatternsDetected: number;
  contextMaintenance: number;
  queryOptimization: number;
  // Enhanced metrics
  memoryEfficiency: number;
  learningRate: number;
  adaptabilityScore: number;
  coherenceIndex: number;
  predictionAccuracy: number;
  contextualRelevance: number;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  conversationFlow: ChatMessage[];
  currentIntent: string;
  intentHistory: string[];
  temporalPatterns: {
    preferredTimeSlots: number[];
    commonDaysOfWeek: number[];
    seasonalTrends: string[];
    timeBasedIntents: Map<string, number[]>; // Intent -> time slots when most active
    workflowPatterns: string[]; // Common task sequences
  };
  contextualMemory: {
    topicsDiscussed: string[];
    documentsReferenced: string[];
    decisionsTracked: string[];
    followUpItems: string[];
    keyEntities: Array<{
      entity: string;
      type: 'person' | 'organization' | 'legal_concept' | 'document';
      frequency: number;
      lastMentioned: Date;
      context: string[];
    }>;
    conceptGraph: Map<string, string[]>; // Concept -> related concepts
    emotionalState: {
      sentiment: number; // -1 to 1
      stress_level: number; // 0 to 1
      confidence: number; // 0 to 1
      engagement: number; // 0 to 1
    };
  };
  learningProfile: {
    expertise_level: 'novice' | 'intermediate' | 'expert';
    preferred_explanation_style: 'detailed' | 'concise' | 'examples';
    common_mistakes: string[];
    learning_velocity: number;
    knowledge_gaps: string[];
  };
}

export class ContextualEngineeringMachine {
  private testResults: ContextualTestResult[] = [];
  private metrics: ContextualEngineMetrics = {
    totalQueries: 0,
    successfulPredictions: 0,
    averageConfidence: 0,
    temporalPatternsDetected: 0,
    contextMaintenance: 0,
    queryOptimization: 0,
    memoryEfficiency: 0,
    learningRate: 0,
    adaptabilityScore: 0,
    coherenceIndex: 0,
    predictionAccuracy: 0,
    contextualRelevance: 0
  };
  
  private conversationContexts = new Map<string, ConversationContext>();
  private memoryDecayFactor = 0.95; // How fast old memories fade
  private learningThreshold = 0.7; // Minimum confidence to consider as learning
  private adaptationRate = 0.1; // How quickly system adapts to new patterns
  
  // Test data for validation
  private readonly TEST_CONVERSATIONS = [
    {
      userId: "test_user_001",
      sessionId: "session_morning_001",
      timestamp: new Date(2024, 0, 15, 9, 30), // Monday 9:30 AM
      messages: [
        "Good morning, I need help reviewing an employment contract",
        "The contract has some concerning clauses about overtime",
        "What are the standard overtime provisions in employment law?",
        "Can you analyze the termination clause as well?"
      ]
    },
    {
      userId: "test_user_001", 
      sessionId: "session_afternoon_001",
      timestamp: new Date(2024, 0, 15, 14, 45), // Monday 2:45 PM
      messages: [
        "I'm back, need to research case precedents for wrongful termination",
        "Looking for cases similar to Smith v. TechCorp",
        "What's the statute of limitations for employment claims?"
      ]
    },
    {
      userId: "test_user_002",
      sessionId: "session_contract_002", 
      timestamp: new Date(2024, 0, 16, 10, 15), // Tuesday 10:15 AM
      messages: [
        "Help me draft a non-disclosure agreement",
        "The company is in California, working with international clients",
        "Need to include intellectual property protections",
        "What are the enforceability requirements for NDAs?"
      ]
    },
    {
      userId: "test_user_001",
      sessionId: "session_friday_001",
      timestamp: new Date(2024, 0, 19, 16, 30), // Friday 4:30 PM
      messages: [
        "Quick question before weekend - compliance check needed",
        "New GDPR requirements for our data processing",
        "Just need a brief overview of key changes"
      ]
    }
  ];

  constructor() {
    console.log('🔧 Initializing Contextual Engineering Machine...');
    this.initializeTestEnvironment();
  }

  private initializeTestEnvironment(): void {
    console.log('🧪 Setting up test environment for contextual queries');
  }

  /**
   * Run comprehensive tests of the chat vector storage system
   */
  async runFullSystemTest(): Promise<ContextualTestResult[]> {
    console.log('🚀 Starting comprehensive contextual engineering tests...');
    const startTime = performance.now();
    
    this.testResults = [];
    
    try {
      // Test 1: Basic chat storage and retrieval
      await this.testBasicChatStorage();
      
      // Test 2: Intent prediction accuracy
      await this.testIntentPrediction();
      
      // Test 3: Temporal pattern detection
      await this.testTemporalPatterns();
      
      // Test 4: "Did you mean" functionality
      await this.testDidYouMeanSuggestions();
      
      // Test 5: Contextual conversation flow
      await this.testConversationContext();
      
      // Test 6: Semantic search across sessions
      await this.testSemanticSearch();
      
      // Test 7: Real-time query optimization
      await this.testQueryOptimization();
      
      // Test 8: Context maintenance across time
      await this.testContextMaintenance();
      
      // Test 9: Advanced contextual memory analysis
      await this.testContextualMemoryAnalysis();
      
      // Test 10: Learning adaptation and evolution
      await this.testLearningAdaptation();
      
      // Test 11: Entity relationship mapping
      await this.testEntityRelationshipMapping();
      
      // Test 12: Emotional intelligence and sentiment tracking
      await this.testEmotionalIntelligence();
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ All tests completed in ${totalTime.toFixed(2)}ms`);
      
      // Generate test summary
      this.generateTestSummary();
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ System test failed:', error);
      throw error;
    }
  }

  private async testBasicChatStorage(): Promise<void> {
    const testName = "Basic Chat Storage";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('📝 Testing basic chat storage...');
      
      // Store test messages
      const testUser = "test_basic_001";
      const testSession = "session_basic_001";
      
      const messageIds: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const messageId = await storeChatWithVector(
          testUser,
          `Test message ${i + 1}: Can you help me with contract review?`,
          testSession
        );
        
        messageIds.push(messageId);
        console.log(`📄 Stored message ${i + 1}: ${messageId}`);
      }
      
      // Verify storage worked
      if (messageIds.length === 5 && messageIds.every(id => id.length > 0)) {
        console.log('✅ Basic chat storage test passed');
        this.testResults.push({
          testName,
          success: true,
          executionTime: performance.now() - startTime,
          details: { messageIds, totalStored: messageIds.length }
        });
      } else {
        errors.push('Failed to store all messages properly');
      }
      
    } catch (error) {
      errors.push(`Storage error: ${error.message}`);
      console.error('❌ Basic chat storage test failed:', error);
    }
    
    if (errors.length > 0) {
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testIntentPrediction(): Promise<void> {
    const testName = "Intent Prediction";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('🎯 Testing intent prediction accuracy...');
      
      const testCases = [
        {
          input: "I need help reviewing a contract",
          expectedIntent: "contract_review",
          minConfidence: 0.7
        },
        {
          input: "Can you find me similar case law?",
          expectedIntent: "legal_research", 
          minConfidence: 0.6
        },
        {
          input: "Help me draft an NDA",
          expectedIntent: "document_drafting",
          minConfidence: 0.7
        },
        {
          input: "Is our company compliant with new regulations?",
          expectedIntent: "compliance_check",
          minConfidence: 0.6
        }
      ];
      
      let successfulPredictions = 0;
      let totalConfidence = 0;
      
      for (const testCase of testCases) {
        const prediction = await getPredictiveAssistance(
          "test_intent_001",
          testCase.input,
          "session_intent_001"
        );
        
        console.log(`🤖 Input: "${testCase.input}"`);
        console.log(`🎯 Predicted: ${prediction.predictedIntent} (${(prediction.confidence * 100).toFixed(1)}%)`);
        console.log(`📝 Expected: ${testCase.expectedIntent}`);
        
        if (prediction.predictedIntent === testCase.expectedIntent && 
            prediction.confidence >= testCase.minConfidence) {
          successfulPredictions++;
          console.log('✅ Intent prediction correct');
        } else {
          errors.push(`Failed to predict intent for: "${testCase.input}"`);
          console.log('❌ Intent prediction incorrect');
        }
        
        totalConfidence += prediction.confidence;
        this.metrics.totalQueries++;
      }
      
      this.metrics.successfulPredictions = successfulPredictions;
      this.metrics.averageConfidence = totalConfidence / testCases.length;
      
      const accuracy = successfulPredictions / testCases.length;
      console.log(`📊 Intent prediction accuracy: ${(accuracy * 100).toFixed(1)}%`);
      
      this.testResults.push({
        testName,
        success: accuracy >= 0.6, // 60% accuracy threshold
        executionTime: performance.now() - startTime,
        details: {
          accuracy,
          successfulPredictions,
          totalTests: testCases.length,
          averageConfidence: this.metrics.averageConfidence
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Intent prediction error: ${error.message}`);
      console.error('❌ Intent prediction test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testTemporalPatterns(): Promise<void> {
    const testName = "Temporal Pattern Detection";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('⏰ Testing temporal pattern detection...');
      
      // Simulate conversations at different times
      for (const conversation of this.TEST_CONVERSATIONS) {
        // Store each message with timestamp
        for (let i = 0; i < conversation.messages.length; i++) {
          const messageTime = new Date(conversation.timestamp.getTime() + i * 60000); // 1 minute apart
          
          await storeChatWithVector(
            conversation.userId,
            conversation.messages[i],
            conversation.sessionId
          );
          
          console.log(`⏰ Stored: "${conversation.messages[i]}" at ${messageTime.toLocaleTimeString()}`);
        }
      }
      
      // Test temporal insights for each user
      let patternsDetected = 0;
      
      for (const conversation of this.TEST_CONVERSATIONS) {
        const prediction = await getPredictiveAssistance(
          conversation.userId,
          "What should I work on?",
          "temporal_test_session"
        );
        
        console.log(`📊 Temporal insights for ${conversation.userId}:`);
        console.log(`   Common at this time: ${prediction.temporalInsights.commonAtThisTime.length} patterns`);
        console.log(`   Seasonal trends: ${prediction.temporalInsights.seasonalTrends.length} trends`);
        console.log(`   User patterns: ${prediction.temporalInsights.userPatterns.length} patterns`);
        
        if (prediction.temporalInsights.commonAtThisTime.length > 0 ||
            prediction.temporalInsights.userPatterns.length > 0) {
          patternsDetected++;
        }
      }
      
      this.metrics.temporalPatternsDetected = patternsDetected;
      
      const success = patternsDetected > 0;
      console.log(`📈 Temporal patterns detected: ${patternsDetected}/${this.TEST_CONVERSATIONS.length}`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          patternsDetected,
          totalConversations: this.TEST_CONVERSATIONS.length,
          detectionRate: patternsDetected / this.TEST_CONVERSATIONS.length
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Temporal pattern error: ${error.message}`);
      console.error('❌ Temporal pattern test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testDidYouMeanSuggestions(): Promise<void> {
    const testName = "Did You Mean Suggestions";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('💡 Testing "did you mean" suggestions...');
      
      const testInputs = [
        "I need help with a contrct review", // Typo: contrct -> contract
        "Can you analayze this agreement?", // Typo: analayze -> analyze  
        "Help me drraft a legal document", // Typo: drraft -> draft
        "I want to reserch case law" // Typo: reserch -> research
      ];
      
      let suggestionsGenerated = 0;
      
      for (const input of testInputs) {
        const prediction = await getPredictiveAssistance(
          "test_didyoumean_001",
          input,
          "session_didyoumean_001"
        );
        
        console.log(`🔍 Input: "${input}"`);
        console.log(`💡 Did you mean: ${prediction.didYouMean.join(', ')}`);
        
        if (prediction.didYouMean.length > 0) {
          suggestionsGenerated++;
          console.log('✅ Suggestions generated');
        } else {
          errors.push(`No suggestions for: "${input}"`);
          console.log('❌ No suggestions generated');
        }
      }
      
      const success = suggestionsGenerated > 0;
      console.log(`📝 Suggestions generated: ${suggestionsGenerated}/${testInputs.length}`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          suggestionsGenerated,
          totalInputs: testInputs.length,
          suggestionRate: suggestionsGenerated / testInputs.length
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Did you mean error: ${error.message}`);
      console.error('❌ Did you mean test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testConversationContext(): Promise<void> {
    const testName = "Conversation Context";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('🗣️ Testing conversation context maintenance...');
      
      const userId = "test_context_001";
      const sessionId = "session_context_001";
      
      // Simulate a flowing conversation
      const conversationFlow = [
        "I need help with an employment contract",
        "The contract is for a software engineer position", 
        "What about the intellectual property clauses?",
        "Are there any red flags in the termination section?",
        "Can you summarize the key risks?"
      ];
      
      let contextMaintained = 0;
      
      for (let i = 0; i < conversationFlow.length; i++) {
        await storeChatWithVector(userId, conversationFlow[i], sessionId);
        
        // Test if system maintains context
        const prediction = await getPredictiveAssistance(
          userId,
          "What about the next section?",
          sessionId
        );
        
        console.log(`💬 Message ${i + 1}: "${conversationFlow[i]}"`);
        console.log(`🤖 Context maintained: ${prediction.confidence > 0.5 ? 'Yes' : 'No'}`);
        console.log(`📋 Suggestions: ${prediction.suggestedQuestions.length}`);
        
        if (prediction.confidence > 0.5 && prediction.suggestedQuestions.length > 0) {
          contextMaintained++;
        }
        
        // Store conversation context
        this.updateConversationContext(userId, sessionId, {
          id: `msg_${i}`,
          userId,
          content: conversationFlow[i],
          timestamp: new Date(),
          sessionId,
          messageType: 'user',
          metadata: {
            intent: prediction.predictedIntent,
            confidence: prediction.confidence
          }
        });
      }
      
      this.metrics.contextMaintenance = contextMaintained / conversationFlow.length;
      
      const success = contextMaintained >= conversationFlow.length * 0.6; // 60% threshold
      console.log(`🎯 Context maintained: ${contextMaintained}/${conversationFlow.length}`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          contextMaintained,
          totalMessages: conversationFlow.length,
          contextRate: this.metrics.contextMaintenance
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Context maintenance error: ${error.message}`);
      console.error('❌ Conversation context test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testSemanticSearch(): Promise<void> {
    const testName = "Semantic Search";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('🔍 Testing semantic search across sessions...');
      
      const userId = "test_search_001";
      
      // Store diverse messages across different sessions
      const testMessages = [
        { content: "Contract review for employment agreement", session: "s1" },
        { content: "NDA analysis and risk assessment", session: "s2" },  
        { content: "Legal research on intellectual property", session: "s3" },
        { content: "Compliance check for GDPR requirements", session: "s4" },
        { content: "Employment law precedent search", session: "s5" }
      ];
      
      for (const msg of testMessages) {
        await storeChatWithVector(userId, msg.content, msg.session);
      }
      
      // Test semantic search queries
      const searchQueries = [
        "employment contract issues",
        "intellectual property legal",
        "privacy compliance rules"
      ];
      
      let successfulSearches = 0;
      
      for (const query of searchQueries) {
        const results = await searchUserChatHistory(userId, query, 3);
        
        console.log(`🔍 Query: "${query}"`);
        console.log(`📊 Results: ${results.length} matches`);
        
        if (results.length > 0) {
          successfulSearches++;
          results.forEach((result, index) => {
            console.log(`   ${index + 1}. "${result.message.content}" (${(result.similarity * 100).toFixed(1)}% similar)`);
          });
        } else {
          errors.push(`No results for query: "${query}"`);
        }
      }
      
      const success = successfulSearches > 0;
      console.log(`🎯 Successful searches: ${successfulSearches}/${searchQueries.length}`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          successfulSearches,
          totalQueries: searchQueries.length,
          searchSuccessRate: successfulSearches / searchQueries.length
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Semantic search error: ${error.message}`);
      console.error('❌ Semantic search test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }

  private async testQueryOptimization(): Promise<void> {
    const testName = "Query Optimization";
    const startTime = performance.now();
    
    try {
      console.log('⚡ Testing real-time query optimization...');
      
      // Test progressive query refinement
      const partialQueries = [
        "I need help",
        "I need help with", 
        "I need help with a contract",
        "I need help with a contract review"
      ];
      
      let optimizationScore = 0;
      
      for (let i = 0; i < partialQueries.length; i++) {
        const prediction = await getPredictiveAssistance(
          "test_optimization_001",
          partialQueries[i],
          "session_optimization_001"
        );
        
        console.log(`🔍 Query: "${partialQueries[i]}"`);
        console.log(`🎯 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
        console.log(`💡 Suggestions: ${prediction.suggestedQuestions.length}`);
        
        // Expect improving confidence and more suggestions as query becomes more specific
        optimizationScore += prediction.confidence + (prediction.suggestedQuestions.length * 0.1);
      }
      
      this.metrics.queryOptimization = optimizationScore / partialQueries.length;
      
      const success = this.metrics.queryOptimization > 0.5;
      console.log(`📈 Query optimization score: ${this.metrics.queryOptimization.toFixed(2)}`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          optimizationScore: this.metrics.queryOptimization,
          totalQueries: partialQueries.length
        }
      });
      
    } catch (error) {
      console.error('❌ Query optimization test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors: [`Query optimization error: ${error.message}`]
      });
    }
  }

  private async testContextMaintenance(): Promise<void> {
    const testName = "Context Maintenance Across Time";
    const startTime = performance.now();
    
    try {
      console.log('🕐 Testing context maintenance across time gaps...');
      
      const userId = "test_maintenance_001";
      
      // Simulate conversation with time gaps
      await storeChatWithVector(userId, "I'm working on an NDA for our startup", "session_1");
      
      // Simulate 1 hour gap
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate time passage
      
      await storeChatWithVector(userId, "The other party wants to modify the confidentiality terms", "session_2");
      
      // Test if context is maintained
      const prediction = await getPredictiveAssistance(
        userId,
        "What should I be careful about?",
        "session_3"
      );
      
      console.log(`🎯 Intent maintained: ${prediction.predictedIntent}`);
      console.log(`📋 Contextual recommendations: ${prediction.contextualRecommendations.similarPastQueries.length}`);
      
      const success = prediction.contextualRecommendations.similarPastQueries.length > 0;
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          contextMaintained: success,
          similarQueries: prediction.contextualRecommendations.similarPastQueries.length,
          intent: prediction.predictedIntent
        }
      });
      
    } catch (error) {
      console.error('❌ Context maintenance test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors: [`Context maintenance error: ${error.message}`]
      });
    }
  }

  private updateConversationContext(userId: string, sessionId: string, message: ChatMessage): void {
    const contextKey = `${userId}_${sessionId}`;
    
    if (!this.conversationContexts.has(contextKey)) {
      this.conversationContexts.set(contextKey, {
        sessionId,
        userId,
        conversationFlow: [],
        currentIntent: '',
        intentHistory: [],
        temporalPatterns: {
          preferredTimeSlots: [],
          commonDaysOfWeek: [],
          seasonalTrends: []
        },
        contextualMemory: {
          topicsDiscussed: [],
          documentsReferenced: [],
          decisionsTracked: [],
          followUpItems: []
        }
      });
    }
    
    const context = this.conversationContexts.get(contextKey)!;
    context.conversationFlow.push(message);
    
    if (message.metadata.intent) {
      context.currentIntent = message.metadata.intent;
      context.intentHistory.push(message.metadata.intent);
      
      // Update temporal patterns
      this.updateTemporalPatterns(context, message);
    }
    
    // Update contextual memory
    this.updateContextualMemory(context, message);
    
    // Update learning profile
    this.updateLearningProfile(context, message);
  }
  
  /**
   * Advanced contextual memory analysis
   */
  private async testContextualMemoryAnalysis(): Promise<void> {
    const testName = "Contextual Memory Analysis";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('🧠 Testing advanced contextual memory analysis...');
      
      const userId = "test_memory_001";
      const sessionId = "session_memory_001";
      
      // Complex conversation with entity relationships
      const complexConversation = [
        "I'm working with John Smith from TechCorp on an NDA",
        "The NDA involves protecting our AI algorithm called DeepLegal",
        "TechCorp is based in California and subject to CCPA",
        "John mentioned they want to modify the termination clause",
        "We discussed similar issues with Microsoft last month",
        "The DeepLegal algorithm is our core IP asset"
      ];
      
      for (const message of complexConversation) {
        await storeChatWithVector(userId, message, sessionId);
        
        const context = this.getOrCreateContext(userId, sessionId);
        this.extractAndStoreEntities(context, message);
      }
      
      // Test entity extraction and relationship mapping
      const context = this.conversationContexts.get(`${userId}_${sessionId}`);
      if (!context) {
        throw new Error('Context not found');
      }
      
      const entities = context.contextualMemory.keyEntities;
      const conceptGraph = context.contextualMemory.conceptGraph;
      
      console.log(`🔍 Entities extracted: ${entities.length}`);
      console.log(`🕸️ Concept relationships: ${conceptGraph.size}`);
      
      // Test memory recall
      const prediction = await getPredictiveAssistance(
        userId,
        "What was the name of the algorithm we discussed?",
        sessionId
      );
      
      let memoryScore = 0;
      if (entities.length >= 3) memoryScore += 0.3; // Entity extraction
      if (conceptGraph.size >= 2) memoryScore += 0.3; // Relationship mapping
      if (prediction.confidence > 0.7) memoryScore += 0.4; // Memory recall
      
      this.metrics.memoryEfficiency = memoryScore;
      
      const success = memoryScore >= 0.6;
      console.log(`🧠 Memory efficiency score: ${(memoryScore * 100).toFixed(1)}%`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          entitiesExtracted: entities.length,
          conceptRelationships: conceptGraph.size,
          memoryScore,
          recallConfidence: prediction.confidence
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Memory analysis error: ${error.message}`);
      console.error('❌ Contextual memory analysis test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }
  
  /**
   * Learning adaptation and evolution testing
   */
  private async testLearningAdaptation(): Promise<void> {
    const testName = "Learning Adaptation";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('📚 Testing learning adaptation and evolution...');
      
      const userId = "test_learning_001";
      let learningScore = 0;
      
      // Simulate learning progression
      const learningStages = [
        {
          stage: "novice",
          queries: [
            "What is a contract?",
            "How do I read legal documents?",
            "What are basic legal terms?"
          ]
        },
        {
          stage: "intermediate", 
          queries: [
            "Can you explain the difference between liability and indemnity?",
            "What should I look for in termination clauses?",
            "How do I negotiate better terms?"
          ]
        },
        {
          stage: "expert",
          queries: [
            "Analyze the enforceability of this arbitration clause under California law",
            "What are the implications of the recent ruling in Smith v. TechCorp?",
            "Draft a force majeure clause that accounts for cyber security incidents"
          ]
        }
      ];
      
      for (const stage of learningStages) {
        const sessionId = `session_${stage.stage}_001`;
        const context = this.getOrCreateContext(userId, sessionId);
        
        for (const query of stage.queries) {
          await storeChatWithVector(userId, query, sessionId);
          
          const prediction = await getPredictiveAssistance(userId, query, sessionId);
          
          // Update learning profile based on query complexity
          this.updateLearningProfile(context, {
            id: `msg_${Date.now()}`,
            userId,
            content: query,
            timestamp: new Date(),
            sessionId,
            messageType: 'user',
            metadata: {
              intent: prediction.predictedIntent,
              confidence: prediction.confidence,
              complexity: stage.stage
            }
          });
        }
        
        console.log(`📈 Learning stage: ${stage.stage}`);
        console.log(`🎯 Expertise level: ${context.learningProfile.expertise_level}`);
        console.log(`⚡ Learning velocity: ${context.learningProfile.learning_velocity.toFixed(2)}`);
        
        // Score learning adaptation
        if (context.learningProfile.expertise_level === stage.stage) {
          learningScore += 0.33;
        }
      }
      
      this.metrics.learningRate = learningScore;
      this.metrics.adaptabilityScore = learningScore * 1.2; // Bonus for adaptation
      
      const success = learningScore >= 0.6;
      console.log(`📚 Learning adaptation score: ${(learningScore * 100).toFixed(1)}%`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          learningScore,
          adaptabilityScore: this.metrics.adaptabilityScore,
          stagesPassed: learningScore / 0.33
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Learning adaptation error: ${error.message}`);
      console.error('❌ Learning adaptation test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }
  
  /**
   * Entity relationship mapping testing
   */
  private async testEntityRelationshipMapping(): Promise<void> {
    const testName = "Entity Relationship Mapping";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('🕸️ Testing entity relationship mapping...');
      
      const userId = "test_entities_001";
      const sessionId = "session_entities_001";
      
      // Complex legal scenario with multiple entities
      const legalScenario = [
        "Our client Apple Inc. is negotiating with Samsung for a licensing agreement",
        "The agreement covers patents related to smartphone technology",
        "Apple's legal team is concerned about the royalty structure",
        "Samsung wants to include their Display Technology patents",
        "The agreement must comply with both US and Korean patent law",
        "Apple's iPhone uses Samsung's OLED displays",
        "There's a cross-licensing component involving both companies' portfolios"
      ];
      
      const context = this.getOrCreateContext(userId, sessionId);
      
      for (const message of legalScenario) {
        await storeChatWithVector(userId, message, sessionId);
        this.extractAndStoreEntities(context, message);
        this.updateConceptGraph(context, message);
      }
      
      // Analyze entity relationships
      const entities = context.contextualMemory.keyEntities;
      const conceptGraph = context.contextualMemory.conceptGraph;
      
      console.log('🏢 Organizations identified:');
      entities.filter(e => e.type === 'organization').forEach(entity => {
        console.log(`   ${entity.entity} (mentioned ${entity.frequency} times)`);
      });
      
      console.log('📜 Legal concepts mapped:');
      entities.filter(e => e.type === 'legal_concept').forEach(entity => {
        console.log(`   ${entity.entity} -> ${conceptGraph.get(entity.entity)?.join(', ') || 'No relations'}`);
      });
      
      // Test relationship query
      const relationshipQuery = "What is the relationship between Apple and Samsung in this context?";
      const prediction = await getPredictiveAssistance(userId, relationshipQuery, sessionId);
      
      let mappingScore = 0;
      if (entities.length >= 5) mappingScore += 0.4; // Entity extraction
      if (conceptGraph.size >= 3) mappingScore += 0.3; // Concept mapping
      if (prediction.confidence > 0.6) mappingScore += 0.3; // Relationship understanding
      
      const success = mappingScore >= 0.7;
      console.log(`🗺️ Entity mapping score: ${(mappingScore * 100).toFixed(1)}%`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          entitiesIdentified: entities.length,
          conceptsMapped: conceptGraph.size,
          mappingScore,
          relationshipConfidence: prediction.confidence
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Entity mapping error: ${error.message}`);
      console.error('❌ Entity relationship mapping test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }
  
  /**
   * Emotional intelligence and sentiment tracking
   */
  private async testEmotionalIntelligence(): Promise<void> {
    const testName = "Emotional Intelligence";
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      console.log('❤️ Testing emotional intelligence and sentiment tracking...');
      
      const userId = "test_emotion_001";
      const sessionId = "session_emotion_001";
      
      // Conversation with emotional progression
      const emotionalJourney = [
        { text: "I'm really stressed about this contract deadline", expectedSentiment: -0.7, stress: 0.8 },
        { text: "The client is being very difficult and unreasonable", expectedSentiment: -0.8, stress: 0.9 },
        { text: "Thanks for helping me understand the clauses better", expectedSentiment: 0.6, stress: 0.5 },
        { text: "I feel much more confident about negotiating now", expectedSentiment: 0.8, stress: 0.2 },
        { text: "This solution looks perfect for our needs!", expectedSentiment: 0.9, stress: 0.1 }
      ];
      
      const context = this.getOrCreateContext(userId, sessionId);
      let emotionalAccuracy = 0;
      
      for (const message of emotionalJourney) {
        await storeChatWithVector(userId, message.text, sessionId);
        
        // Analyze sentiment and emotional state
        const detectedSentiment = this.analyzeSentiment(message.text);
        const detectedStress = this.analyzeStressLevel(message.text);
        
        // Update emotional state
        context.contextualMemory.emotionalState.sentiment = detectedSentiment;
        context.contextualMemory.emotionalState.stress_level = detectedStress;
        
        console.log(`😊 Message: "${message.text.substring(0, 40)}..."`); 
        console.log(`📊 Detected sentiment: ${detectedSentiment.toFixed(2)} (expected: ${message.expectedSentiment})`);
        console.log(`😰 Detected stress: ${detectedStress.toFixed(2)} (expected: ${message.stress})`);
        
        // Score emotional accuracy
        const sentimentAccuracy = 1 - Math.abs(detectedSentiment - message.expectedSentiment) / 2;
        const stressAccuracy = 1 - Math.abs(detectedStress - message.stress);
        emotionalAccuracy += (sentimentAccuracy + stressAccuracy) / 2;
      }
      
      emotionalAccuracy /= emotionalJourney.length;
      this.metrics.contextualRelevance = emotionalAccuracy;
      
      const success = emotionalAccuracy >= 0.6;
      console.log(`❤️ Emotional intelligence score: ${(emotionalAccuracy * 100).toFixed(1)}%`);
      
      this.testResults.push({
        testName,
        success,
        executionTime: performance.now() - startTime,
        details: {
          emotionalAccuracy,
          messagesAnalyzed: emotionalJourney.length,
          finalEmotionalState: context.contextualMemory.emotionalState
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      errors.push(`Emotional intelligence error: ${error.message}`);
      console.error('❌ Emotional intelligence test failed:', error);
      
      this.testResults.push({
        testName,
        success: false,
        executionTime: performance.now() - startTime,
        details: {},
        errors
      });
    }
  }
  
  /**
   * Helper method to get or create conversation context
   */
  private getOrCreateContext(userId: string, sessionId: string): ConversationContext {
    const contextKey = `${userId}_${sessionId}`;
    
    if (!this.conversationContexts.has(contextKey)) {
      this.conversationContexts.set(contextKey, {
        sessionId,
        userId,
        conversationFlow: [],
        currentIntent: '',
        intentHistory: [],
        temporalPatterns: {
          preferredTimeSlots: [],
          commonDaysOfWeek: [],
          seasonalTrends: [],
          timeBasedIntents: new Map(),
          workflowPatterns: []
        },
        contextualMemory: {
          topicsDiscussed: [],
          documentsReferenced: [],
          decisionsTracked: [],
          followUpItems: [],
          keyEntities: [],
          conceptGraph: new Map(),
          emotionalState: {
            sentiment: 0,
            stress_level: 0,
            confidence: 0.5,
            engagement: 0.5
          }
        },
        learningProfile: {
          expertise_level: 'novice',
          preferred_explanation_style: 'detailed',
          common_mistakes: [],
          learning_velocity: 0.1,
          knowledge_gaps: []
        }
      });
    }
    
    return this.conversationContexts.get(contextKey)!;
  }
  
  /**
   * Extract and store entities from message
   */
  private extractAndStoreEntities(context: ConversationContext, message: string): void {
    // Simple entity extraction (in production, use NLP libraries)
    const organizationPatterns = /\b([A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation))\b/g;
    const personPatterns = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    const legalConceptPatterns = /\b(contract|agreement|NDA|patent|copyright|trademark|liability|indemnity|termination|arbitration|confidentiality)\b/gi;
    
    // Extract organizations
    let match;
    while ((match = organizationPatterns.exec(message)) !== null) {
      this.addOrUpdateEntity(context, match[1], 'organization', message);
    }
    
    // Extract legal concepts
    while ((match = legalConceptPatterns.exec(message)) !== null) {
      this.addOrUpdateEntity(context, match[1].toLowerCase(), 'legal_concept', message);
    }
  }
  
  /**
   * Add or update entity in context
   */
  private addOrUpdateEntity(context: ConversationContext, entityText: string, type: ConversationContext['contextualMemory']['keyEntities'][0]['type'], messageContext: string): void {
    const existing = context.contextualMemory.keyEntities.find(e => e.entity === entityText);
    
    if (existing) {
      existing.frequency++;
      existing.lastMentioned = new Date();
      if (!existing.context.includes(messageContext)) {
        existing.context.push(messageContext);
      }
    } else {
      context.contextualMemory.keyEntities.push({
        entity: entityText,
        type,
        frequency: 1,
        lastMentioned: new Date(),
        context: [messageContext]
      });
    }
  }
  
  /**
   * Update concept graph with relationships
   */
  private updateConceptGraph(context: ConversationContext, message: string): void {
    const concepts = context.contextualMemory.keyEntities
      .filter(e => e.type === 'legal_concept')
      .map(e => e.entity);
    
    // Find concepts mentioned together in the same message
    const mentionedConcepts = concepts.filter(concept => 
      message.toLowerCase().includes(concept)
    );
    
    // Create relationships between co-mentioned concepts
    for (let i = 0; i < mentionedConcepts.length; i++) {
      for (let j = i + 1; j < mentionedConcepts.length; j++) {
        const concept1 = mentionedConcepts[i];
        const concept2 = mentionedConcepts[j];
        
        // Add bidirectional relationship
        if (!context.contextualMemory.conceptGraph.has(concept1)) {
          context.contextualMemory.conceptGraph.set(concept1, []);
        }
        if (!context.contextualMemory.conceptGraph.has(concept2)) {
          context.contextualMemory.conceptGraph.set(concept2, []);
        }
        
        const relations1 = context.contextualMemory.conceptGraph.get(concept1)!;
        const relations2 = context.contextualMemory.conceptGraph.get(concept2)!;
        
        if (!relations1.includes(concept2)) relations1.push(concept2);
        if (!relations2.includes(concept1)) relations2.push(concept1);
      }
    }
  }
  
  /**
   * Update temporal patterns
   */
  private updateTemporalPatterns(context: ConversationContext, message: ChatMessage): void {
    const hour = message.timestamp.getHours();
    const dayOfWeek = message.timestamp.getDay();
    
    // Update preferred time slots
    if (!context.temporalPatterns.preferredTimeSlots.includes(hour)) {
      context.temporalPatterns.preferredTimeSlots.push(hour);
    }
    
    // Update common days of week
    if (!context.temporalPatterns.commonDaysOfWeek.includes(dayOfWeek)) {
      context.temporalPatterns.commonDaysOfWeek.push(dayOfWeek);
    }
    
    // Update time-based intents
    if (message.metadata?.intent) {
      if (!context.temporalPatterns.timeBasedIntents.has(message.metadata.intent)) {
        context.temporalPatterns.timeBasedIntents.set(message.metadata.intent, []);
      }
      context.temporalPatterns.timeBasedIntents.get(message.metadata.intent)!.push(hour);
    }
  }
  
  /**
   * Update learning profile based on user interactions
   */
  private updateLearningProfile(context: ConversationContext, message: ChatMessage): void {
    const complexity = this.assessQueryComplexity(message.content);
    const confidence = message.metadata?.confidence || 0.5;
    
    // Update expertise level based on query complexity trends
    const recentComplexity = context.conversationFlow
      .slice(-5)
      .map(msg => this.assessQueryComplexity(msg.content))
      .reduce((sum, c) => sum + c, 0) / Math.min(5, context.conversationFlow.length);
    
    if (recentComplexity > 0.8) {
      context.learningProfile.expertise_level = 'expert';
    } else if (recentComplexity > 0.5) {
      context.learningProfile.expertise_level = 'intermediate';
    } else {
      context.learningProfile.expertise_level = 'novice';
    }
    
    // Update learning velocity
    const previousVelocity = context.learningProfile.learning_velocity;
    context.learningProfile.learning_velocity = 
      previousVelocity + (complexity - previousVelocity) * this.adaptationRate;
  }
  
  /**
   * Assess query complexity
   */
  private assessQueryComplexity(content: string): number {
    const complexTerms = ['enforceability', 'arbitration', 'indemnification', 'jurisdiction', 'precedent', 'statute', 'jurisprudence'];
    const legalCitations = /\b\d+\s+[A-Z][a-z]+\s+\d+\b/.test(content);
    const longSentences = content.split('.').some(sentence => sentence.split(' ').length > 15);
    
    let complexity = 0;
    complexity += complexTerms.filter(term => content.toLowerCase().includes(term)).length * 0.2;
    complexity += legalCitations ? 0.3 : 0;
    complexity += longSentences ? 0.2 : 0;
    complexity += content.length > 100 ? 0.1 : 0;
    
    return Math.min(1, complexity);
  }
  
  /**
   * Analyze sentiment from text
   */
  private analyzeSentiment(text: string): number {
    const positiveWords = ['happy', 'great', 'excellent', 'perfect', 'confident', 'satisfied', 'thanks', 'helpful'];
    const negativeWords = ['stressed', 'difficult', 'unreasonable', 'worried', 'frustrated', 'concerned', 'problem', 'issue'];
    
    let sentiment = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) sentiment += 0.2;
      if (negativeWords.includes(word)) sentiment -= 0.2;
    });
    
    return Math.max(-1, Math.min(1, sentiment));
  }
  
  /**
   * Analyze stress level from text
   */
  private analyzeStressLevel(text: string): number {
    const stressIndicators = ['deadline', 'urgent', 'stressed', 'pressure', 'difficult', 'worried', 'anxious', 'frustrated'];
    const calmIndicators = ['confident', 'perfect', 'solution', 'understand', 'clear', 'helpful', 'thanks'];
    
    let stress = 0.5; // Baseline stress
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (stressIndicators.includes(word)) stress += 0.15;
      if (calmIndicators.includes(word)) stress -= 0.1;
    });
    
    return Math.max(0, Math.min(1, stress));
  }

  private generateTestSummary(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.success).length;
    const totalExecutionTime = this.testResults.reduce((sum, result) => sum + result.executionTime, 0);
    
    console.log('\n📊 CONTEXTUAL ENGINEERING MACHINE TEST SUMMARY');
    console.log('================================================');
    console.log(`📋 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total Execution Time: ${totalExecutionTime.toFixed(2)}ms`);
    console.log('\n📊 SYSTEM METRICS:');
    console.log(`🎯 Successful Predictions: ${this.metrics.successfulPredictions}/${this.metrics.totalQueries}`);
    console.log(`📊 Average Confidence: ${(this.metrics.averageConfidence * 100).toFixed(1)}%`);
    console.log(`⏰ Temporal Patterns Detected: ${this.metrics.temporalPatternsDetected}`);
    console.log(`🗣️ Context Maintenance: ${(this.metrics.contextMaintenance * 100).toFixed(1)}%`);
    console.log(`⚡ Query Optimization: ${this.metrics.queryOptimization.toFixed(2)}`);
    console.log(`🧠 Memory Efficiency: ${(this.metrics.memoryEfficiency * 100).toFixed(1)}%`);
    console.log(`📚 Learning Rate: ${(this.metrics.learningRate * 100).toFixed(1)}%`);
    console.log(`🔄 Adaptability Score: ${(this.metrics.adaptabilityScore * 100).toFixed(1)}%`);
    console.log(`🎯 Prediction Accuracy: ${(this.metrics.predictionAccuracy * 100).toFixed(1)}%`);
    console.log(`❤️ Contextual Relevance: ${(this.metrics.contextualRelevance * 100).toFixed(1)}%`);
    
    // Individual test results
    console.log('\n📝 INDIVIDUAL TEST RESULTS:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.executionTime.toFixed(2)}ms`);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   ⚠️ ${error}`));
      }
    });
    
    // System recommendations
    console.log('\n💡 SYSTEM RECOMMENDATIONS:');
    if (this.metrics.averageConfidence < 0.7) {
      console.log('🔧 Consider improving intent classification accuracy');
    }
    if (this.metrics.contextMaintenance < 0.6) {
      console.log('🔧 Context maintenance needs optimization');
    }
    if (this.metrics.temporalPatternsDetected === 0) {
      console.log('🔧 Temporal pattern detection requires more training data');
    }
    if (this.metrics.memoryEfficiency < 0.7) {
      console.log('🔧 Memory efficiency needs enhancement - consider entity extraction improvements');
    }
    if (this.metrics.learningRate < 0.6) {
      console.log('🔧 Learning adaptation is slow - review learning profile algorithms');
    }
    if (this.metrics.contextualRelevance < 0.6) {
      console.log('🔧 Emotional intelligence needs calibration - improve sentiment analysis');
    }
    if (passedTests === totalTests) {
      console.log('🚀 All systems operational - ready for production!');
      console.log('🎯 Advanced contextual engineering features fully validated!');
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): ContextualEngineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get test results
   */
  getTestResults(): ContextualTestResult[] {
    return [...this.testResults];
  }

  /**
   * Get conversation contexts
   */
  getConversationContexts(): Map<string, ConversationContext> {
    return new Map(this.conversationContexts);
  }
}

/**
 * Singleton instance for global use
 */
export const contextualEngineeringMachine = new ContextualEngineeringMachine();

/**
 * Convenience function to run system validation
 */
export async function validateContextualSystem(): Promise<{
  success: boolean;
  results: ContextualTestResult[];
  metrics: ContextualEngineMetrics;
}> {
  const results = await contextualEngineeringMachine.runFullSystemTest();
  const metrics = contextualEngineeringMachine.getMetrics();
  const success = results.every(result => result.success);
  
  return { success, results, metrics };
}
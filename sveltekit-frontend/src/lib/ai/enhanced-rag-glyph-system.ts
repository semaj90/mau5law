/**
 * Enhanced RAG from Compressed Glyphs System
 *
 * Implements retrieval-augmented generation using compressed 7-bit glyph representations
 * for instantaneous context retrieval and enhanced prompting. Integrates with the LOD
 * cache engine and vector metadata auto-encoder for topology-aware semantic understanding
 * with predictive analytics for optimal content retrieval.
 */

import { lodCacheEngine, type LODCacheEntry } from './lod-cache-engine.js';
import { vectorMetadataAutoEncoder, type EncodedVectorMetadata } from './vector-metadata-auto-encoder.js';
import { simdTextTilingEngine } from './simd-text-tiling-engine.js';
import { ollamaService } from '$lib/server/ai/ollama-service.js';

// Glyph-based RAG configuration
interface GlyphRAGConfig {
  glyph_context_window: number;          // Number of glyphs to include in context
  semantic_clustering_threshold: number; // Threshold for semantic similarity
  topology_weight: number;               // Weight for topology-aware retrieval
  predictive_boost: number;              // Boost for predictive suggestions
  compression_preference: 'speed' | 'quality' | 'balanced';
  rag_strategy: 'glyph_first' | 'semantic_first' | 'hybrid' | 'adaptive';
  context_synthesis: 'linear' | 'hierarchical' | 'neural' | 'graph_based';
  response_optimization: 'coherence' | 'relevance' | 'creativity' | 'accuracy';
}

// Glyph representation for enhanced context
interface GlyphContext {
  glyph_id: string;
  compressed_representation: Uint8Array; // 7-byte glyph encoding
  visual_signature: string;              // SVG or visual representation
  semantic_summary: string;              // Human-readable semantic meaning
  contextual_weight: number;             // Relevance weight for this context
  topology_position: Float32Array;       // Position in semantic topology
  retrieval_metadata: {
    source_entry_id: string;
    lod_level: string;
    extraction_confidence: number;
    semantic_clusters: number[];
    related_glyphs: string[];
  };
}

// Enhanced RAG response with glyph context
interface GlyphRAGResponse {
  // Standard RAG response
  response: string;
  confidence: number;
  processing_time: number;

  // Glyph-enhanced context
  glyph_context: GlyphContext[];
  context_synthesis: {
    primary_glyphs: string[];            // Most relevant glyphs
    semantic_clusters: number[];         // Clusters represented
    topology_connections: Array<{        // Structural relationships
      from_glyph: string;
      to_glyph: string;
      relationship_type: string;
      strength: number;
    }>;
    predictive_insights: string[];       // Predicted follow-up queries
  };

  // Visual context representation
  visual_context: {
    glyph_constellation_svg: string;     // Visual arrangement of glyphs
    semantic_heatmap_svg: string;        // Semantic density visualization
    topology_graph_svg: string;         // Relationship graph
    compression_statistics: {
      original_context_size: number;
      compressed_context_size: number;
      compression_ratio: number;
      semantic_preservation: number;
    };
  };

  // Performance metrics
  performance_metrics: {
    glyph_retrieval_time: number;
    context_synthesis_time: number;
    llm_processing_time: number;
    total_pipeline_time: number;
    glyphs_processed: number;
    cache_hit_rate: number;
    semantic_accuracy_score: number;
  };
}

// Query analysis for optimal glyph selection
interface QueryAnalysis {
  query_type: 'factual' | 'analytical' | 'creative' | 'procedural' | 'comparative';
  semantic_intent: string[];
  context_requirements: string[];
  optimal_lod_level: string;
  predicted_response_length: number;
  complexity_score: number;
  topic_categories: string[];
}

class EnhancedRAGGlyphSystem {
  private config: GlyphRAGConfig;
  private glyphCache: Map<string, GlyphContext> = new Map();
  private contextSynthesizer: GlyphContextSynthesizer;
  private visualGenerator: GlyphVisualGenerator;
  private topologyNavigator: GlyphTopologyNavigator;
  private predictiveAnalyzer: GlyphPredictiveAnalyzer;
  private responseOptimizer: GlyphResponseOptimizer;

  // Performance tracking
  private performanceStats = {
    total_queries_processed: 0,
    average_response_time: 0,
    cache_hit_rate: 0,
    semantic_accuracy_scores: [] as number[],
    compression_ratios: [] as number[]
  };

  constructor(customConfig?: Partial<GlyphRAGConfig>) {
    this.config = {
      glyph_context_window: 20,
      semantic_clustering_threshold: 0.75,
      topology_weight: 0.3,
      predictive_boost: 0.2,
      compression_preference: 'balanced',
      rag_strategy: 'adaptive',
      context_synthesis: 'graph_based',
      response_optimization: 'relevance',
      ...customConfig
    };

    this.contextSynthesizer = new GlyphContextSynthesizer(this.config);
    this.visualGenerator = new GlyphVisualGenerator(this.config);
    this.topologyNavigator = new GlyphTopologyNavigator(this.config);
    this.predictiveAnalyzer = new GlyphPredictiveAnalyzer(this.config);
    this.responseOptimizer = new GlyphResponseOptimizer(this.config);

    console.log('🔮 Enhanced RAG Glyph System initialized with 7-bit compression + topology awareness');
  }

  /**
   * Main RAG pipeline: Query → Glyph Retrieval → Context Synthesis → Enhanced Response
   */
  async generateWithGlyphRAG(
    query: string,
    options: {
      max_glyphs?: number;
      force_lod_level?: string;
      include_visual_context?: boolean;
      optimize_for?: 'speed' | 'accuracy' | 'creativity';
      enable_predictive?: boolean;
      context_history?: string[];
    } = {}
  ): Promise<GlyphRAGResponse> {
    console.log(`🔮 Processing RAG query with glyph compression: "${query}"`);

    const startTime = Date.now();
    const pipelineMetrics = {
      glyph_retrieval_time: 0,
      context_synthesis_time: 0,
      llm_processing_time: 0,
      glyphs_processed: 0,
      cache_hits: 0
    };

    try {
      // Phase 1: Analyze query to determine optimal retrieval strategy
      const queryAnalysis = await this.analyzeQuery(query, options.context_history);
      console.log(`📊 Query analysis: ${queryAnalysis.query_type}, complexity: ${queryAnalysis.complexity_score.toFixed(2)}`);

      // Phase 2: Retrieve relevant glyphs using multi-strategy approach
      const glyphRetrievalStart = Date.now();
      const relevantGlyphs = await this.retrieveRelevantGlyphs(
        query,
        queryAnalysis,
        options.max_glyphs || this.config.glyph_context_window,
        options.force_lod_level
      );
      pipelineMetrics.glyph_retrieval_time = Date.now() - glyphRetrievalStart;
      pipelineMetrics.glyphs_processed = relevantGlyphs.length;

      // Phase 3: Synthesize glyph context using topology-aware methods
      const contextSynthesisStart = Date.now();
      const synthesizedContext = await this.contextSynthesizer.synthesizeGlyphContext(
        relevantGlyphs,
        query,
        queryAnalysis
      );
      pipelineMetrics.context_synthesis_time = Date.now() - contextSynthesisStart;

      // Phase 4: Generate visual context representations (if requested)
      let visualContext = null;
      if (options.include_visual_context !== false) {
        visualContext = await this.visualGenerator.generateVisualContext(
          relevantGlyphs,
          synthesizedContext,
          queryAnalysis
        );
      }

      // Phase 5: Build enhanced prompt with glyph context
      const enhancedPrompt = await this.buildGlyphEnhancedPrompt(
        query,
        synthesizedContext,
        queryAnalysis,
        options.context_history
      );

      // Phase 6: Generate response using LLM with enhanced context
      const llmProcessingStart = Date.now();
      const llmResponse = await this.generateLLMResponse(
        enhancedPrompt,
        queryAnalysis,
        options.optimize_for || this.config.response_optimization
      );
      pipelineMetrics.llm_processing_time = Date.now() - llmProcessingStart;

      // Phase 7: Optimize response based on glyph context
      const optimizedResponse = await this.responseOptimizer.optimizeResponse(
        llmResponse,
        synthesizedContext,
        queryAnalysis
      );

      // Phase 8: Generate predictive insights (if enabled)
      let predictiveInsights: any[] = [];
      if (options.enable_predictive !== false) {
        predictiveInsights = await this.predictiveAnalyzer.generateInsights(
          query,
          relevantGlyphs,
          synthesizedContext,
          optimizedResponse
        );
      }

      // Phase 9: Assemble complete RAG response
      const totalPipelineTime = Date.now() - startTime;

      const glyphRAGResponse: GlyphRAGResponse = {
        response: optimizedResponse.text,
        confidence: optimizedResponse.confidence,
        processing_time: totalPipelineTime,
        glyph_context: relevantGlyphs,
        context_synthesis: {
          primary_glyphs: synthesizedContext.primary_glyphs,
          semantic_clusters: synthesizedContext.semantic_clusters,
          topology_connections: synthesizedContext.topology_connections,
          predictive_insights: predictiveInsights
        },
        visual_context: visualContext || this.createDefaultVisualContext(relevantGlyphs),
        performance_metrics: {
          ...pipelineMetrics,
          total_pipeline_time: totalPipelineTime,
          cache_hit_rate: pipelineMetrics.cache_hits / pipelineMetrics.glyphs_processed,
          semantic_accuracy_score: optimizedResponse.semantic_accuracy || 0.85
        }
      };

      // Phase 10: Update performance statistics
      this.updatePerformanceStats(glyphRAGResponse);

      console.log(`✅ Glyph RAG complete: ${totalPipelineTime}ms, ${pipelineMetrics.glyphs_processed} glyphs, ${optimizedResponse.text.length} chars`);

      return glyphRAGResponse;

    } catch (error: any) {
      console.error('Enhanced RAG processing error:', error);

      // Return fallback response with error information
      return {
        response: `I encountered an error while processing your query: ${error.message}. Please try rephrasing your question.`,
        confidence: 0.1,
        processing_time: Date.now() - startTime,
        glyph_context: [],
        context_synthesis: {
          primary_glyphs: [],
          semantic_clusters: [],
          topology_connections: [],
          predictive_insights: []
        },
        visual_context: this.createErrorVisualContext(error.message),
        performance_metrics: {
          glyph_retrieval_time: 0,
          context_synthesis_time: 0,
          llm_processing_time: 0,
          total_pipeline_time: Date.now() - startTime,
          glyphs_processed: 0,
          cache_hit_rate: 0,
          semantic_accuracy_score: 0
        }
      };
    }
  }

  /**
   * Analyze query to determine optimal retrieval and synthesis strategy
   */
  private async analyzeQuery(query: string, contextHistory?: string[]): Promise<QueryAnalysis> {
    const queryLength = query.length;
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    const analyticalWords = ['analyze', 'compare', 'explain', 'evaluate', 'assess'];
    const creativeWords = ['create', 'generate', 'design', 'imagine', 'brainstorm'];
    const proceduralWords = ['steps', 'process', 'procedure', 'how to', 'tutorial'];

    // Determine query type
    let queryType: QueryAnalysis['query_type'] = 'factual';
    if (analyticalWords.some(word => query.toLowerCase().includes(word))) {
      queryType = 'analytical';
    } else if (creativeWords.some(word => query.toLowerCase().includes(word))) {
      queryType = 'creative';
    } else if (proceduralWords.some(word => query.toLowerCase().includes(word))) {
      queryType = 'procedural';
    } else if (query.toLowerCase().includes('compare') || query.toLowerCase().includes('versus')) {
      queryType = 'comparative';
    }

    // Extract semantic intent
    const semanticIntent = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 5);

    // Determine context requirements
    const contextRequirements = [];
    if (queryType === 'analytical') contextRequirements.push('detailed_analysis', 'supporting_evidence');
    if (queryType === 'creative') contextRequirements.push('inspirational_content', 'diverse_examples');
    if (queryType === 'procedural') contextRequirements.push('step_by_step', 'practical_examples');
    if (queryType === 'comparative') contextRequirements.push('multiple_perspectives', 'contrast_data');
    if (queryLength > 100) contextRequirements.push('comprehensive_context');

    // Determine optimal LOD level based on query complexity
    let optimalLodLevel = 'tile';
    if (queryLength > 200 || queryType === 'analytical') optimalLodLevel = 'section';
    if (queryLength > 500 || queryType === 'comparative') optimalLodLevel = 'document';
    if (queryLength < 50) optimalLodLevel = 'glyph';

    // Calculate complexity score
    const complexityFactors = [
      queryLength / 100,
      semanticIntent.length / 10,
      contextRequirements.length / 5,
      questionWords.filter(word => query.toLowerCase().includes(word)).length / 5
    ];
    const complexityScore = Math.min(1.0, complexityFactors.reduce((a, b) => a + b, 0) / complexityFactors.length);

    // Extract topic categories (simplified)
    const topicCategories = [];
    if (query.includes('legal') || query.includes('law') || query.includes('contract')) topicCategories.push('legal');
    if (query.includes('technical') || query.includes('technology') || query.includes('software')) topicCategories.push('technical');
    if (query.includes('business') || query.includes('finance') || query.includes('market')) topicCategories.push('business');
    if (query.includes('medical') || query.includes('health') || query.includes('treatment')) topicCategories.push('medical');
    if (topicCategories.length === 0) topicCategories.push('general');

    // Predict response length based on query characteristics
    let predictedResponseLength = 200; // Base length
    if (queryType === 'analytical') predictedResponseLength *= 2;
    if (queryType === 'procedural') predictedResponseLength *= 1.5;
    if (queryType === 'creative') predictedResponseLength *= 1.3;
    if (complexityScore > 0.7) predictedResponseLength *= 1.4;

    return {
      query_type: queryType,
      semantic_intent: semanticIntent,
      context_requirements: contextRequirements,
      optimal_lod_level: optimalLodLevel,
      predicted_response_length: predictedResponseLength,
      complexity_score: complexityScore,
      topic_categories: topicCategories
    };
  }

  /**
   * Retrieve relevant glyphs using multi-strategy approach
   */
  private async retrieveRelevantGlyphs(
    query: string,
    queryAnalysis: QueryAnalysis,
    maxGlyphs: number,
    forceLodLevel?: string
  ): Promise<GlyphContext[]> {
    const retrievalStrategies = this.determineRetrievalStrategies(queryAnalysis);
    const allCandidateGlyphs = new Map<string, GlyphContext>();

    // Strategy 1: Vector similarity search using auto-encoder
    if (retrievalStrategies.includes('vector_similarity')) {
      const vectorResults = await vectorMetadataAutoEncoder.retrieveWithGlyphRAG(query, {
        max_results: Math.floor(maxGlyphs * 0.6),
        lod_preference: (forceLodLevel as any) || queryAnalysis.optimal_lod_level,
        similarity_threshold: this.config.semantic_clustering_threshold
      });

      for (const result of vectorResults.results) {
        const glyphContext = await this.convertToGlyphContext(result, 'vector_similarity');
        allCandidateGlyphs.set(glyphContext.glyph_id, glyphContext);
      }
    }

    // Strategy 2: LOD cache direct retrieval
    if (retrievalStrategies.includes('lod_direct')) {
      const lodResults = await lodCacheEngine.retrieveWithEnhancedRAG(query, {
        lod_preference: (forceLodLevel as any) || queryAnalysis.optimal_lod_level,
        max_results: Math.floor(maxGlyphs * 0.4),
        topology_filtering: true
      });

      for (const result of lodResults.results) {
        const glyphContext = await this.convertLODToGlyphContext(result.entry, 'lod_direct');
        allCandidateGlyphs.set(glyphContext.glyph_id, glyphContext);
      }
    }

    // Strategy 3: Topology-aware navigation
    if (retrievalStrategies.includes('topology_navigation') && allCandidateGlyphs.size > 0) {
      const seedGlyphs = Array.from(allCandidateGlyphs.values()).slice(0, 3);
      const topologyGlyphs = await this.topologyNavigator.exploreTopologySpace(
        seedGlyphs,
        query,
        Math.floor(maxGlyphs * 0.3)
      );

      for (const glyph of topologyGlyphs) {
        allCandidateGlyphs.set(glyph.glyph_id, glyph);
      }
    }

    // Strategy 4: Predictive suggestions
    if (retrievalStrategies.includes('predictive') && allCandidateGlyphs.size > 0) {
      const predictiveGlyphs = await this.predictiveAnalyzer.suggestRelevantGlyphs(
        query,
        Array.from(allCandidateGlyphs.values()),
        Math.floor(maxGlyphs * 0.2)
      );

      for (const glyph of predictiveGlyphs) {
        if (!allCandidateGlyphs.has(glyph.glyph_id)) {
          glyph.contextual_weight *= this.config.predictive_boost;
          allCandidateGlyphs.set(glyph.glyph_id, glyph);
        }
      }
    }

    // Rank and select final glyphs
    const rankedGlyphs = Array.from(allCandidateGlyphs.values())
      .sort((a, b) => b.contextual_weight - a.contextual_weight)
      .slice(0, maxGlyphs);

    console.log(`📊 Retrieved ${rankedGlyphs.length} glyphs using strategies: ${retrievalStrategies.join(', ')}`);

    return rankedGlyphs;
  }

  private determineRetrievalStrategies(queryAnalysis: QueryAnalysis): string[] {
    const strategies = ['vector_similarity']; // Always include vector similarity

    if (this.config.rag_strategy === 'adaptive' || this.config.rag_strategy === 'hybrid') {
      strategies.push('lod_direct');

      if (queryAnalysis.complexity_score > 0.6) {
        strategies.push('topology_navigation');
      }

      if (queryAnalysis.query_type !== 'factual') {
        strategies.push('predictive');
      }
    } else if (this.config.rag_strategy === 'glyph_first') {
      strategies.unshift('lod_direct');
    } else if (this.config.rag_strategy === 'semantic_first') {
      strategies.push('topology_navigation');
    }

    return strategies;
  }

  /**
   * Convert vector search result to glyph context
   */
  private async convertToGlyphContext(
    result: any,
    retrievalMethod: string
  ): Promise<GlyphContext> {
    const glyphId = `glyph-${result.entry_id}-${Date.now()}`;

    // Extract compressed representation from result
    const compressedRep = new Uint8Array(7);
    if (result.glyph_summary && result.glyph_summary.visual_representation) {
      // Parse visual representation to compressed bytes
      const visualData = result.glyph_summary.visual_representation;
      for (let i = 0; i < 7; i++) {
        compressedRep[i] = (visualData.charCodeAt(i % visualData.length) * (i + 1)) & 0x7F;
      }
    } else {
      // Generate synthetic compressed representation
      for (let i = 0; i < 7; i++) {
        compressedRep[i] = (Math.random() * 127) & 0x7F;
      }
    }

    return {
      glyph_id: glyphId,
      compressed_representation: compressedRep,
      visual_signature: result.svg_visualization || this.generateDefaultSVG(compressedRep),
      semantic_summary: result.glyph_summary?.semantic_summary || 'Relevant context from vector search',
      contextual_weight: result.relevance_score || 0.5,
      topology_position: new Float32Array([result.vector_similarity || 0.5, Math.random(), Math.random()]),
      retrieval_metadata: {
        source_entry_id: result.entry_id,
        lod_level: result.lod_match || 'tile',
        extraction_confidence: result.predictive_confidence || 0.7,
        semantic_clusters: [0, 1, 2], // Would extract from actual metadata
        related_glyphs: []
      }
    };
  }

  /**
   * Convert LOD cache entry to glyph context
   */
  private async convertLODToGlyphContext(
    lodEntry: LODCacheEntry,
    retrievalMethod: string
  ): Promise<GlyphContext> {
    const glyphId = `glyph-lod-${lodEntry.id}`;

    return {
      glyph_id: glyphId,
      compressed_representation: lodEntry.compressed_data.tile, // Use tile-level compression
      visual_signature: lodEntry.svg_summaries.tile,
      semantic_summary: `Context from ${lodEntry.lod_level}: ${lodEntry.original_text.slice(0, 100)}...`,
      contextual_weight: lodEntry.cache_metadata.retrieval_priority * lodEntry.cache_metadata.prediction_confidence,
      topology_position: lodEntry.vector_metadata.topology_features.slice(0, 3),
      retrieval_metadata: {
        source_entry_id: lodEntry.id,
        lod_level: lodEntry.lod_level,
        extraction_confidence: lodEntry.cache_metadata.prediction_confidence,
        semantic_clusters: lodEntry.vector_metadata.semantic_clusters,
        related_glyphs: lodEntry.vector_metadata.context_anchors.slice(0, 3)
      }
    };
  }

  /**
   * Build enhanced prompt with glyph context
   */
  private async buildGlyphEnhancedPrompt(
    query: string,
    synthesizedContext: any,
    queryAnalysis: QueryAnalysis,
    contextHistory?: string[]
  ): Promise<string> {
    const contextParts = [
      '# Enhanced Context from Compressed Glyphs',
      '',
      '## Primary Context Glyphs:'
    ];

    // Add primary glyph contexts
    synthesizedContext.primary_glyphs.slice(0, 5).forEach((glyphId: string, index: number) => {
      const glyph = synthesizedContext.glyph_map.get(glyphId);
      if (glyph) {
        contextParts.push(`${index + 1}. **${glyph.semantic_summary}**`);
        contextParts.push(`   - Compressed: ${Array.from(glyph.compressed_representation).map((b: unknown) => (b as number).toString(16)).join('')}`);
        contextParts.push(`   - Weight: ${glyph.contextual_weight.toFixed(2)}`);
        contextParts.push(`   - Source: ${glyph.retrieval_metadata.lod_level} level`);
        contextParts.push('');
      }
    });

    // Add semantic clustering information
    if (synthesizedContext.semantic_clusters.length > 0) {
      contextParts.push('## Semantic Clusters:');
      synthesizedContext.semantic_clusters.forEach((cluster: number, index: number) => {
        contextParts.push(`- Cluster ${cluster}: ${synthesizedContext.cluster_summaries[cluster] || 'Related concepts'}`);
      });
      contextParts.push('');
    }

    // Add topology connections if available
    if (synthesizedContext.topology_connections.length > 0) {
      contextParts.push('## Concept Relationships:');
      synthesizedContext.topology_connections.slice(0, 3).forEach((connection: any) => {
        contextParts.push(`- ${connection.relationship_type}: ${connection.from_glyph} → ${connection.to_glyph} (strength: ${connection.strength.toFixed(2)})`);
      });
      contextParts.push('');
    }

    // Add conversation history if available
    if (contextHistory && contextHistory.length > 0) {
      contextParts.push('## Recent Context:');
      contextHistory.slice(-3).forEach((context, index) => {
        contextParts.push(`${index + 1}. ${context}`);
      });
      contextParts.push('');
    }

    // Add query-specific instructions
    contextParts.push('## Query Analysis:');
    contextParts.push(`- Type: ${queryAnalysis.query_type}`);
    contextParts.push(`- Complexity: ${queryAnalysis.complexity_score.toFixed(2)}`);
    contextParts.push(`- Intent: ${queryAnalysis.semantic_intent.join(', ')}`);
    contextParts.push(`- Requirements: ${queryAnalysis.context_requirements.join(', ')}`);
    contextParts.push('');

    contextParts.push('## User Query:');
    contextParts.push(query);
    contextParts.push('');

    // Add response guidance based on query type
    contextParts.push('## Response Guidance:');
    if (queryAnalysis.query_type === 'analytical') {
      contextParts.push('- Provide detailed analysis using the compressed glyph context');
      contextParts.push('- Reference specific context elements with evidence');
    } else if (queryAnalysis.query_type === 'creative') {
      contextParts.push('- Use the glyph context as inspiration for creative solutions');
      contextParts.push('- Combine concepts from different semantic clusters');
    } else if (queryAnalysis.query_type === 'procedural') {
      contextParts.push('- Structure response as clear, actionable steps');
      contextParts.push('- Use compressed context to provide relevant examples');
    } else {
      contextParts.push('- Answer directly using the most relevant glyph contexts');
      contextParts.push('- Maintain coherence across semantic clusters');
    }

    return contextParts.join('\n');
  }

  /**
   * Generate response using LLM with enhanced context
   */
  private async generateLLMResponse(
    enhancedPrompt: string,
    queryAnalysis: QueryAnalysis,
    optimization: string
  ): Promise<{
    text: string;
    confidence: number;
    semantic_accuracy?: number;
  }> {
    try {
      // Use the existing Ollama service for response generation
      const response = await ollamaService.generate(enhancedPrompt, {
        system: this.buildSystemPrompt(queryAnalysis, optimization),
        options: {
          temperature: this.getTemperatureForOptimization(optimization),
          num_predict: Math.min(2048, queryAnalysis.predicted_response_length * 2),
          top_k: optimization === 'creativity' ? 40 : 20,
          top_p: optimization === 'accuracy' ? 0.8 : 0.9
        }
      });

      if (response.response) {
        return {
          text: response.response,
          confidence: 0.85, // Would calculate based on response characteristics
          semantic_accuracy: 0.87 // Would calculate based on context alignment
        };
      } else {
        throw new Error('No response generated from LLM');
      }

    } catch (error) {
      console.error('LLM response generation failed:', error);

      // Fallback response based on glyph context
      return {
        text: 'I have relevant context from compressed glyphs, but encountered an issue generating a complete response. Please try rephrasing your question.',
        confidence: 0.3,
        semantic_accuracy: 0.4
      };
    }
  }

  private buildSystemPrompt(queryAnalysis: QueryAnalysis, optimization: string): string {
    const baseParts = [
      'You are an AI assistant with access to compressed glyph-based context.',
      'Each glyph represents 7-bit compressed semantic information with visual and contextual metadata.',
      'Use the provided glyph context to enhance your responses with relevant, compressed knowledge.'
    ];

    if (optimization === 'accuracy') {
      baseParts.push('Prioritize factual accuracy and cite specific glyph contexts when possible.');
    } else if (optimization === 'creativity') {
      baseParts.push('Use glyph contexts as creative inspiration, combining concepts in novel ways.');
    } else if (optimization === 'coherence') {
      baseParts.push('Maintain logical flow and coherence across different glyph contexts.');
    } else {
      baseParts.push('Balance accuracy, creativity, and coherence in your response.');
    }

    if (queryAnalysis.complexity_score > 0.7) {
      baseParts.push('This is a complex query requiring detailed analysis of multiple glyph contexts.');
    }

    if (queryAnalysis.topic_categories.includes('legal')) {
      baseParts.push('Pay special attention to legal terminology and precision in context interpretation.');
    }

    return baseParts.join(' ');
  }

  private getTemperatureForOptimization(optimization: string): number {
    switch (optimization) {
      case 'accuracy': return 0.3;
      case 'creativity': return 0.9;
      case 'coherence': return 0.5;
      default: return 0.7;
    }
  }

  /**
   * Helper methods
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];
    return stopWords.includes(word.toLowerCase());
  }

  private generateDefaultSVG(compressed: Uint8Array): string {
    const hue = (compressed[0] / 127) * 360;
    const saturation = 50 + (compressed[1] / 127) * 40;
    const lightness = 40 + (compressed[2] / 127) * 30;

    return `<svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="hsl(${hue}, ${saturation}%, ${lightness}%)" opacity="0.8"/>
      <text x="12" y="16" text-anchor="middle" font-size="10" fill="white">G</text>
    </svg>`;
  }

  private createDefaultVisualContext(glyphs: GlyphContext[]) {
    return {
      glyph_constellation_svg: `<svg width="400" height="300"><g>${glyphs.slice(0, 10).map((g, i) =>
        `<circle cx="${40 + i * 36}" cy="150" r="15" fill="hsl(${i * 36}, 70%, 60%)" opacity="0.7"/>`
      ).join('')}</g></svg>`,
      semantic_heatmap_svg: '<svg width="200" height="200"><rect width="200" height="200" fill="url(#heatmap)"/></svg>',
      topology_graph_svg: '<svg width="300" height="300"><g><!-- Topology visualization --></g></svg>',
      compression_statistics: {
        original_context_size: glyphs.length * 1000,
        compressed_context_size: glyphs.length * 7,
        compression_ratio: 142.8,
        semantic_preservation: 0.9
      }
    };
  }

  private createErrorVisualContext(errorMessage: string) {
    return {
      glyph_constellation_svg: '<svg width="400" height="300"><text x="200" y="150" text-anchor="middle" fill="red">Error in visualization</text></svg>',
      semantic_heatmap_svg: '<svg width="200" height="200"><rect width="200" height="200" fill="#ffcccc"/></svg>',
      topology_graph_svg: '<svg width="300" height="300"><text x="150" y="150" text-anchor="middle" fill="red">Topology unavailable</text></svg>',
      compression_statistics: {
        original_context_size: 0,
        compressed_context_size: 0,
        compression_ratio: 0,
        semantic_preservation: 0
      }
    };
  }

  private updatePerformanceStats(response: GlyphRAGResponse) {
    this.performanceStats.total_queries_processed++;
    this.performanceStats.average_response_time =
      (this.performanceStats.average_response_time * (this.performanceStats.total_queries_processed - 1) +
       response.processing_time) / this.performanceStats.total_queries_processed;

    this.performanceStats.cache_hit_rate =
      (this.performanceStats.cache_hit_rate * (this.performanceStats.total_queries_processed - 1) +
       response.performance_metrics.cache_hit_rate) / this.performanceStats.total_queries_processed;

    this.performanceStats.semantic_accuracy_scores.push(response.performance_metrics.semantic_accuracy_score);
    if (this.performanceStats.semantic_accuracy_scores.length > 100) {
      this.performanceStats.semantic_accuracy_scores = this.performanceStats.semantic_accuracy_scores.slice(-100);
    }

    this.performanceStats.compression_ratios.push(response.visual_context.compression_statistics.compression_ratio);
    if (this.performanceStats.compression_ratios.length > 100) {
      this.performanceStats.compression_ratios = this.performanceStats.compression_ratios.slice(-100);
    }
  }

  // Public API methods
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      average_semantic_accuracy: this.performanceStats.semantic_accuracy_scores.reduce((a, b) => a + b, 0) /
                                 Math.max(1, this.performanceStats.semantic_accuracy_scores.length),
      average_compression_ratio: this.performanceStats.compression_ratios.reduce((a, b) => a + b, 0) /
                                Math.max(1, this.performanceStats.compression_ratios.length)
    };
  }

  updateConfig(newConfig: Partial<GlyphRAGConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Glyph RAG config updated');
  }

  clearCache() {
    this.glyphCache.clear();
    console.log('🗑️ Glyph RAG cache cleared');
  }
}

// Supporting classes for specialized glyph processing
class GlyphContextSynthesizer {
  constructor(private config: GlyphRAGConfig) {}

  async synthesizeGlyphContext(glyphs: GlyphContext[], query: string, queryAnalysis: QueryAnalysis) {
    const glyphMap = new Map<string, GlyphContext>();
    glyphs.forEach(glyph => glyphMap.set(glyph.glyph_id, glyph));

    // Extract primary glyphs (highest weight)
    const primaryGlyphs = glyphs
      .sort((a, b) => b.contextual_weight - a.contextual_weight)
      .slice(0, 5)
      .map(g => g.glyph_id);

    // Group by semantic clusters
    const semanticClusters = [...new Set(glyphs.flatMap(g => g.retrieval_metadata.semantic_clusters))];

    // Create topology connections
    const topologyConnections = [];
    for (let i = 0; i < Math.min(glyphs.length, 10); i++) {
      for (let j = i + 1; j < Math.min(glyphs.length, 10); j++) {
        const similarity = this.calculateGlyphSimilarity(glyphs[i], glyphs[j]);
        if (similarity > 0.5) {
          topologyConnections.push({
            from_glyph: glyphs[i].glyph_id,
            to_glyph: glyphs[j].glyph_id,
            relationship_type: this.determineRelationshipType(glyphs[i], glyphs[j]),
            strength: similarity
          });
        }
      }
    }

    // Generate cluster summaries
    const clusterSummaries: Record<number, string> = {};
    semanticClusters.forEach(cluster => {
      const clusterGlyphs = glyphs.filter(g => g.retrieval_metadata.semantic_clusters.includes(cluster));
      clusterSummaries[cluster] = this.generateClusterSummary(clusterGlyphs, query);
    });

    return {
      glyph_map: glyphMap,
      primary_glyphs: primaryGlyphs,
      semantic_clusters: semanticClusters,
      topology_connections: topologyConnections,
      cluster_summaries: clusterSummaries,
      synthesis_quality: this.calculateSynthesisQuality(glyphs, topologyConnections)
    };
  }

  private calculateGlyphSimilarity(glyph1: GlyphContext, glyph2: GlyphContext): number {
    // Calculate similarity based on compressed representations
    let similarity = 0;
    for (let i = 0; i < Math.min(glyph1.compressed_representation.length, glyph2.compressed_representation.length); i++) {
      const diff = Math.abs(glyph1.compressed_representation[i] - glyph2.compressed_representation[i]);
      similarity += 1 - (diff / 127);
    }
    return similarity / Math.min(glyph1.compressed_representation.length, glyph2.compressed_representation.length);
  }

  private determineRelationshipType(glyph1: GlyphContext, glyph2: GlyphContext): string {
    const types = ['semantic_similar', 'contextual_related', 'structural_connected', 'topical_linked'];

    // Simple heuristic based on source and LOD level
    if (glyph1.retrieval_metadata.lod_level === glyph2.retrieval_metadata.lod_level) {
      return 'structural_connected';
    }

    const sharedClusters = glyph1.retrieval_metadata.semantic_clusters
      .filter(c => glyph2.retrieval_metadata.semantic_clusters.includes(c));

    if (sharedClusters.length > 0) {
      return 'semantic_similar';
    }

    return types[Math.floor(Math.random() * types.length)];
  }

  private generateClusterSummary(clusterGlyphs: GlyphContext[], query: string): string {
    if (clusterGlyphs.length === 0) return 'Empty cluster';

    const summaryParts = clusterGlyphs.slice(0, 3).map(g =>
      g.semantic_summary.split('.')[0] || g.semantic_summary.slice(0, 50)
    );

    return `Related concepts: ${summaryParts.join(', ')}`;
  }

  private calculateSynthesisQuality(glyphs: GlyphContext[], connections: any[]): number {
    const glyphQuality = glyphs.reduce((sum, g) => sum + g.contextual_weight, 0) / glyphs.length;
    const connectionDensity = connections.length / Math.max(1, glyphs.length);
    const diversityScore = new Set(glyphs.map(g => g.retrieval_metadata.lod_level)).size / 5;

    return (glyphQuality * 0.5 + connectionDensity * 0.3 + diversityScore * 0.2);
  }
}

class GlyphVisualGenerator {
  constructor(private config: GlyphRAGConfig) {}

  async generateVisualContext(glyphs: GlyphContext[], synthesizedContext: any, queryAnalysis: QueryAnalysis) {
    const constellationSVG = await this.generateGlyphConstellation(glyphs);
    const heatmapSVG = await this.generateSemanticHeatmap(glyphs, synthesizedContext);
    const topologyGraphSVG = await this.generateTopologyGraph(synthesizedContext.topology_connections);

    const compressionStats = this.calculateCompressionStatistics(glyphs);

    return {
      glyph_constellation_svg: constellationSVG,
      semantic_heatmap_svg: heatmapSVG,
      topology_graph_svg: topologyGraphSVG,
      compression_statistics: compressionStats
    };
  }

  private async generateGlyphConstellation(glyphs: GlyphContext[]): Promise<string> {
    const width = 800;
    const height = 600;

    let elements = [`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];

    glyphs.slice(0, 20).forEach((glyph, index) => {
      const angle = (index / glyphs.length) * 2 * Math.PI;
      const radius = 150 + glyph.contextual_weight * 100;
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius;

      const hue = (glyph.compressed_representation[0] / 127) * 360;
      const size = 8 + glyph.contextual_weight * 12;

      elements.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="hsl(${hue}, 70%, 60%)" opacity="0.8"/>`);
      elements.push(`<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8" fill="white">${index + 1}</text>`);
    });

    elements.push('</svg>');
    return elements.join('');
  }

  private async generateSemanticHeatmap(glyphs: GlyphContext[], synthesizedContext: any): Promise<string> {
    const size = 400;
    const cellSize = size / 20;

    let elements = [`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`];

    // Create grid-based heatmap
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const glyphIndex = (x + y * 20) % glyphs.length;
        const glyph = glyphs[glyphIndex];

        if (glyph) {
          const intensity = glyph.contextual_weight;
          const hue = (glyph.compressed_representation[0] / 127) * 360;
          const opacity = 0.3 + intensity * 0.7;

          elements.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}"
                        fill="hsl(${hue}, 60%, 50%)" opacity="${opacity}"/>`);
        }
      }
    }

    elements.push('</svg>');
    return elements.join('');
  }

  private async generateTopologyGraph(connections: any[]): Promise<string> {
    const width = 600;
    const height = 400;

    let elements = [`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];

    // Simple force-directed layout simulation
    const nodePositions = new Map<string, {x: number, y: number}>();
    const allNodes = new Set<string>();

    connections.forEach(conn => {
      allNodes.add(conn.from_glyph);
      allNodes.add(conn.to_glyph);
    });

    // Assign random positions
    Array.from(allNodes).forEach((node, index) => {
      const angle = (index / allNodes.size) * 2 * Math.PI;
      const radius = 100;
      nodePositions.set(node, {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius
      });
    });

    // Draw connections
    connections.slice(0, 10).forEach(conn => {
      const fromPos = nodePositions.get(conn.from_glyph);
      const toPos = nodePositions.get(conn.to_glyph);

      if (fromPos && toPos) {
        const strokeWidth = 1 + conn.strength * 3;
        elements.push(`<line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}"
                      stroke="rgba(100, 100, 100, 0.6)" stroke-width="${strokeWidth}"/>`);
      }
    });

    // Draw nodes
    nodePositions.forEach((pos, nodeId) => {
      elements.push(`<circle cx="${pos.x}" cy="${pos.y}" r="8" fill="hsl(220, 60%, 50%)" opacity="0.8"/>`);
      elements.push(`<text x="${pos.x}" y="${pos.y + 3}" text-anchor="middle" font-size="6" fill="white">G</text>`);
    });

    elements.push('</svg>');
    return elements.join('');
  }

  private calculateCompressionStatistics(glyphs: GlyphContext[]) {
    const originalSize = glyphs.reduce((sum, g) => sum + (g.semantic_summary.length * 2), 0); // Estimate original size
    const compressedSize = glyphs.length * 7; // 7 bytes per glyph

    return {
      original_context_size: originalSize,
      compressed_context_size: compressedSize,
      compression_ratio: originalSize / compressedSize,
      semantic_preservation: 0.9 // Estimated
    };
  }
}

class GlyphTopologyNavigator {
  constructor(private config: GlyphRAGConfig) {}

  async exploreTopologySpace(seedGlyphs: GlyphContext[], query: string, maxGlyphs: number): Promise<GlyphContext[]> {
    const exploredGlyphs: GlyphContext[] = [];

    // Simple topology exploration - would be more sophisticated in production
    for (const seedGlyph of seedGlyphs.slice(0, 3)) {
      const relatedGlyphs = await this.findTopologicallyRelated(seedGlyph, query, maxGlyphs / 3);
      exploredGlyphs.push(...relatedGlyphs);
    }

    return exploredGlyphs.slice(0, maxGlyphs);
  }

  private async findTopologicallyRelated(seedGlyph: GlyphContext, query: string, maxGlyphs: number): Promise<GlyphContext[]> {
    // Simulate finding topologically related glyphs
    const relatedGlyphs: GlyphContext[] = [];

    for (let i = 0; i < maxGlyphs; i++) {
      const relatedId = `topology-${seedGlyph.glyph_id}-${i}`;
      const related = await this.generateRelatedGlyph(seedGlyph, relatedId, i);
      relatedGlyphs.push(related);
    }

    return relatedGlyphs;
  }

  private async generateRelatedGlyph(seedGlyph: GlyphContext, relatedId: string, index: number): Promise<GlyphContext> {
    // Generate synthetic related glyph
    const compressedRep = new Uint8Array(7);
    for (let i = 0; i < 7; i++) {
      compressedRep[i] = (seedGlyph.compressed_representation[i] + (index * 10) + Math.random() * 20) & 0x7F;
    }

    return {
      glyph_id: relatedId,
      compressed_representation: compressedRep,
      visual_signature: seedGlyph.visual_signature.replace(/hsl\(\d+,/, `hsl(${(index * 60) % 360},`),
      semantic_summary: `Related to: ${seedGlyph.semantic_summary.slice(0, 50)}... (topology distance: ${index + 1})`,
      contextual_weight: Math.max(0.1, seedGlyph.contextual_weight - (index * 0.1)),
      topology_position: new Float32Array([
        seedGlyph.topology_position[0] + (Math.random() - 0.5) * 0.2,
        seedGlyph.topology_position[1] + (Math.random() - 0.5) * 0.2,
        seedGlyph.topology_position[2] + (Math.random() - 0.5) * 0.2
      ]),
      retrieval_metadata: {
        source_entry_id: seedGlyph.retrieval_metadata.source_entry_id,
        lod_level: seedGlyph.retrieval_metadata.lod_level,
        extraction_confidence: Math.max(0.3, seedGlyph.retrieval_metadata.extraction_confidence - (index * 0.1)),
        semantic_clusters: seedGlyph.retrieval_metadata.semantic_clusters,
        related_glyphs: [seedGlyph.glyph_id]
      }
    };
  }
}

class GlyphPredictiveAnalyzer {
  constructor(private config: GlyphRAGConfig) {}

  async generateInsights(
    query: string,
    glyphs: GlyphContext[],
    synthesizedContext: any,
    response: any
  ): Promise<string[]> {
    const insights = [];

    // Extract predictive insights from glyph patterns
    const topGlyphs = glyphs.slice(0, 5);
    const commonTerms = this.extractCommonTerms(topGlyphs);

    insights.push(`Related topics: ${commonTerms.slice(0, 3).join(', ')}`);

    if (synthesizedContext.topology_connections.length > 0) {
      const strongestConnection = synthesizedContext.topology_connections[0];
      insights.push(`Strong conceptual link: ${strongestConnection.relationship_type}`);
    }

    const clustersUsed = synthesizedContext.semantic_clusters;
    if (clustersUsed.length > 1) {
      insights.push(`Multi-domain query spanning ${clustersUsed.length} concept areas`);
    }

    // Predict potential follow-up queries
    insights.push(`Potential follow-up: "How does this relate to ${commonTerms[0]}?"`);
    insights.push(`Exploration suggestion: "What are the implications for ${commonTerms[1]}?"`);

    return insights;
  }

  async suggestRelevantGlyphs(
    query: string,
    existingGlyphs: GlyphContext[],
    maxGlyphs: number
  ): Promise<GlyphContext[]> {
    // Simple predictive glyph suggestion - would use ML model in production
    const suggestedGlyphs: GlyphContext[] = [];

    for (let i = 0; i < maxGlyphs; i++) {
      const baseGlyph = existingGlyphs[i % existingGlyphs.length];
      const suggestedId = `predictive-${baseGlyph.glyph_id}-${i}`;

      const suggested = await this.generatePredictiveGlyph(baseGlyph, suggestedId, query);
      suggestedGlyphs.push(suggested);
    }

    return suggestedGlyphs;
  }

  private extractCommonTerms(glyphs: GlyphContext[]): string[] {
    const termFreq = new Map<string, number>();

    glyphs.forEach(glyph => {
      const terms = glyph.semantic_summary.toLowerCase().split(/\s+/)
        .filter(term => term.length > 3 && !this.isStopWord(term));

      terms.forEach(term => {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      });
    });

    return Array.from(termFreq.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);
  }

  private async generatePredictiveGlyph(baseGlyph: GlyphContext, predictiveId: string, query: string): Promise<GlyphContext> {
    // Generate predictive glyph based on base glyph and query
    const compressedRep = new Uint8Array(7);
    for (let i = 0; i < 7; i++) {
      const queryInfluence = query.charCodeAt(i % query.length) / 127;
      compressedRep[i] = ((baseGlyph.compressed_representation[i] + queryInfluence * 30) % 127) & 0x7F;
    }

    return {
      glyph_id: predictiveId,
      compressed_representation: compressedRep,
      visual_signature: baseGlyph.visual_signature,
      semantic_summary: `Predictive context related to: "${query}"`,
      contextual_weight: baseGlyph.contextual_weight * 0.8, // Slightly lower weight for predictive
      topology_position: baseGlyph.topology_position,
      retrieval_metadata: {
        source_entry_id: baseGlyph.retrieval_metadata.source_entry_id,
        lod_level: baseGlyph.retrieval_metadata.lod_level,
        extraction_confidence: 0.6, // Lower confidence for predictive
        semantic_clusters: baseGlyph.retrieval_metadata.semantic_clusters,
        related_glyphs: [baseGlyph.glyph_id]
      }
    };
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'would', 'could', 'should'];
    return stopWords.includes(word.toLowerCase());
  }
}

class GlyphResponseOptimizer {
  constructor(private config: GlyphRAGConfig) {}

  async optimizeResponse(
    llmResponse: any,
    synthesizedContext: any,
    queryAnalysis: QueryAnalysis
  ): Promise<{
    text: string;
    confidence: number;
    semantic_accuracy: number;
  }> {
    let optimizedText = llmResponse.text;

    // Apply optimization based on configuration
    switch (this.config.response_optimization) {
      case 'coherence':
        optimizedText = await this.optimizeForCoherence(optimizedText, synthesizedContext);
        break;
      case 'relevance':
        optimizedText = await this.optimizeForRelevance(optimizedText, queryAnalysis);
        break;
      case 'creativity':
        optimizedText = await this.optimizeForCreativity(optimizedText, synthesizedContext);
        break;
      case 'accuracy':
        optimizedText = await this.optimizeForAccuracy(optimizedText, synthesizedContext);
        break;
    }

    return {
      text: optimizedText,
      confidence: Math.min(1.0, llmResponse.confidence * 1.1),
      semantic_accuracy: this.calculateSemanticAccuracy(optimizedText, synthesizedContext)
    };
  }

  private async optimizeForCoherence(text: string, context: any): Promise<string> {
    // Add coherence improvements - would implement sophisticated text processing
    return text.replace(/\n\n/g, '\n\n**Key Point:** ').trim();
  }

  private async optimizeForRelevance(text: string, queryAnalysis: QueryAnalysis): Promise<string> {
    // Enhance relevance - would implement relevance scoring and optimization
    const relevanceMarkers = queryAnalysis.semantic_intent.slice(0, 3);
    let enhanced = text;

    relevanceMarkers.forEach(marker => {
      if (enhanced.toLowerCase().includes(marker)) {
        enhanced = enhanced.replace(new RegExp(`\\b${marker}\\b`, 'gi'), `**${marker}**`);
      }
    });

    return enhanced;
  }

  private async optimizeForCreativity(text: string, context: any): Promise<string> {
    // Add creative enhancements
    return `💡 **Creative Insight:** ${text}\n\n*This response synthesizes ${context.primary_glyphs?.length || 0} compressed knowledge glyphs.*`;
  }

  private async optimizeForAccuracy(text: string, context: any): Promise<string> {
    // Add accuracy annotations
    const accuracy = `📊 **Context Sources:** ${context.primary_glyphs?.length || 0} glyphs, ${context.semantic_clusters?.length || 0} semantic clusters\n\n`;
    return accuracy + text;
  }

  private calculateSemanticAccuracy(text: string, context: any): number {
    // Simple heuristic - would implement sophisticated semantic analysis
    const contextTerms = context.cluster_summaries ?
      Object.values(context.cluster_summaries).join(' ').toLowerCase().split(/\s+/) : [];

    const textTerms = text.toLowerCase().split(/\s+/);
    const overlap = contextTerms.filter(term => textTerms.includes(term)).length;

    return Math.min(1.0, overlap / Math.max(1, contextTerms.length));
  }
}

// Export singleton instance
export const enhancedRAGGlyphSystem = new EnhancedRAGGlyphSystem();
export type { GlyphRAGConfig, GlyphContext, GlyphRAGResponse, QueryAnalysis };
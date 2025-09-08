/**
 * Enhanced Recommendation Worker
 * Background processing for legal document recommendations with QLoRA integration
 */

// Import configurations for AI integration
const AI_CONFIG = {
  endpoints: {
    qloraAnalysis: '/api/qlora-analysis',
    predictiveAssets: '/api/predictive-assets',
    contextSwitch: '/api/context-switch',
    rlFeedback: '/api/rl-feedback'
  },
  thresholds: {
    confidenceMinimum: 0.3,
    highConfidenceThreshold: 0.8,
    criticalPriorityThreshold: 0.9
  },
  features: {
    enableQLoRAEnhancement: true,
    enablePredictiveAssets: true,
    enableContextSwitching: true,
    enableFeedbackLearning: true
  }
};

// Enhanced message handling with QLoRA integration
self.addEventListener('message', function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'GENERATE_RECOMMENDATIONS':
        handleEnhancedRecommendations(data);
        break;
      case 'TRAIN_FROM_FEEDBACK':
        handleFeedbackTraining(data);
        break;
      case 'UPDATE_CONTEXT':
        handleContextUpdate(data);
        break;
      case 'PREDICT_ASSETS':
        handleAssetPrediction(data);
        break;
      case 'PING':
        self.postMessage({ type: 'PONG', timestamp: Date.now() });
        break;
      default:
        self.postMessage({ type: 'ERROR', message: `Unknown message type: ${type}` });
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', message: error.message, stack: error.stack });
  }
});

// Enhanced recommendation generation with QLoRA integration
async function handleEnhancedRecommendations(data) {
  const { query, documents = [], context = {}, userProfile = {} } = data;
  
  try {
    // Step 1: Use predictive asset engine for context-aware recommendations
    let predictedAssets = [];
    if (AI_CONFIG.features.enablePredictiveAssets) {
      predictedAssets = await generatePredictiveAssets(query, context, userProfile);
    }
    
    // Step 2: Enhanced document scoring with QLoRA analysis
    let enhancedDocuments = documents;
    if (AI_CONFIG.features.enableQLoRAEnhancement) {
      enhancedDocuments = await enhanceDocumentsWithQLoRA(documents, query, predictedAssets);
    }
    
    // Step 3: Generate recommendations with confidence scoring
    const recommendations = await generateEnhancedRecommendations(
      enhancedDocuments, 
      query, 
      context, 
      predictedAssets
    );
    
    // Step 4: Apply feedback learning if available
    let learnedRecommendations = recommendations;
    if (AI_CONFIG.features.enableFeedbackLearning) {
      learnedRecommendations = await applyFeedbackLearning(recommendations, userProfile);
    }
    
    // Step 5: Context switching for optimal model selection
    let optimizedRecommendations = learnedRecommendations;
    if (AI_CONFIG.features.enableContextSwitching) {
      optimizedRecommendations = await optimizeWithContextSwitching(
        learnedRecommendations, 
        query, 
        context
      );
    }
    
    self.postMessage({
      type: 'RECOMMENDATIONS_COMPLETE',
      recommendations: optimizedRecommendations,
      query,
      context,
      predictedAssets,
      performance: {
        totalProcessingTime: Date.now() - data.startTime,
        enhancedCount: optimizedRecommendations.length,
        averageConfidence: calculateAverageConfidence(optimizedRecommendations),
        highConfidenceCount: optimizedRecommendations.filter(r => r.confidence > AI_CONFIG.thresholds.highConfidenceThreshold).length
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Enhanced recommendation generation failed:', error);
    // Fallback to basic recommendations
    const fallbackRecommendations = await generateFallbackRecommendations(documents, query);
    
    self.postMessage({
      type: 'RECOMMENDATIONS_COMPLETE',
      recommendations: fallbackRecommendations,
      query,
      error: error.message,
      fallback: true,
      timestamp: Date.now()
    });
  }
}

// Generate predictive assets using HMM + SOM integration
async function generatePredictiveAssets(query, context, userProfile) {
  try {
    const response = await fetch(AI_CONFIG.endpoints.predictiveAssets, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context,
        userProfile,
        requestId: generateRequestId(),
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Predictive assets API failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.predictedAssets || [];
    
  } catch (error) {
    console.warn('Predictive assets generation failed, using fallback:', error.message);
    return generateFallbackPredictiveAssets(query, context);
  }
}

// Enhance documents with QLoRA analysis
async function enhanceDocumentsWithQLoRA(documents, query, predictedAssets) {
  try {
    const response = await fetch(AI_CONFIG.endpoints.qloraAnalysis, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: documents.slice(0, 50), // Limit for performance
        query,
        predictedAssets,
        analysisType: 'recommendation_enhancement',
        requestId: generateRequestId()
      })
    });
    
    if (!response.ok) {
      throw new Error(`QLoRA analysis failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.enhancedDocuments || documents;
    
  } catch (error) {
    console.warn('QLoRA enhancement failed, using original documents:', error.message);
    return documents;
  }
}

// Generate enhanced recommendations with advanced scoring
async function generateEnhancedRecommendations(documents, query, context, predictedAssets) {
  return documents.map((doc, index) => {
    // Base scoring
    const keywordSimilarity = calculateKeywordSimilarity(query, doc);
    const contextRelevance = calculateContextRelevance(doc, context);
    const predictiveScore = calculatePredictiveScore(doc, predictedAssets);
    
    // Composite confidence score
    const confidence = (keywordSimilarity * 0.4 + contextRelevance * 0.3 + predictiveScore * 0.3);
    
    // Determine priority based on confidence and document type
    const priority = determinePriority(confidence, doc);
    
    // Determine recommendation type
    const type = determineRecommendationType(doc, context);
    
    return {
      id: doc.id || `rec_${index}_${Date.now()}`,
      title: doc.title || `Document ${index + 1}`,
      description: doc.description || doc.summary || 'Legal document recommendation',
      confidence: Math.min(Math.max(confidence, 0), 1),
      priority,
      type,
      score: confidence * 100,
      relevance: contextRelevance,
      reason: generateEnhancedReason(query, doc, keywordSimilarity, contextRelevance, predictiveScore),
      context: context.currentPage || 'general',
      query,
      metadata: {
        keywordSimilarity,
        contextRelevance,
        predictiveScore,
        processingTimestamp: Date.now(),
        enhancementApplied: true
      }
    };
  })
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 15);
}

// Apply feedback learning to recommendations
async function applyFeedbackLearning(recommendations, userProfile) {
  try {
    const response = await fetch(AI_CONFIG.endpoints.rlFeedback, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      return recommendations; // Fallback to unmodified recommendations
    }
    
    const feedbackData = await response.json();
    const { patterns, adjustments } = feedbackData;
    
    return recommendations.map(rec => {
      // Apply learning adjustments based on historical feedback
      let adjustedConfidence = rec.confidence;
      
      // Check for similar patterns in feedback history
      const similarFeedback = patterns.filter(p => 
        p.type === rec.type && 
        p.similarity > 0.7 &&
        p.context === rec.context
      );
      
      if (similarFeedback.length > 0) {
        const avgFeedbackScore = similarFeedback.reduce((sum, f) => sum + f.score, 0) / similarFeedback.length;
        // Blend original confidence with learned feedback (weighted 70/30)
        adjustedConfidence = (rec.confidence * 0.7) + (avgFeedbackScore * 0.3);
      }
      
      return {
        ...rec,
        confidence: Math.min(Math.max(adjustedConfidence, 0), 1),
        learningApplied: true,
        feedbackInfluence: similarFeedback.length
      };
    });
    
  } catch (error) {
    console.warn('Feedback learning failed:', error.message);
    return recommendations;
  }
}

// Optimize with context switching
async function optimizeWithContextSwitching(recommendations, query, context) {
  try {
    const response = await fetch(AI_CONFIG.endpoints.contextSwitch, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendations: recommendations.slice(0, 10), // Limit for performance
        query,
        context,
        optimizationType: 'recommendation_ranking',
        requestId: generateRequestId()
      })
    });
    
    if (!response.ok) {
      return recommendations; // Fallback
    }
    
    const result = await response.json();
    return result.optimizedRecommendations || recommendations;
    
  } catch (error) {
    console.warn('Context switching optimization failed:', error.message);
    return recommendations;
  }
}

// New handlers for additional worker capabilities
async function handleFeedbackTraining(data) {
  const { feedbackId, feedback, recommendation, context } = data;
  
  try {
    // Process feedback for immediate learning
    const trainingResponse = await fetch(AI_CONFIG.endpoints.rlFeedback, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackId,
        feedback,
        recommendation,
        context,
        trainingMode: 'immediate',
        timestamp: Date.now()
      })
    });
    
    const result = await trainingResponse.json();
    
    self.postMessage({
      type: 'FEEDBACK_TRAINING_COMPLETE',
      success: trainingResponse.ok,
      result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    self.postMessage({
      type: 'FEEDBACK_TRAINING_ERROR',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

async function handleContextUpdate(data) {
  const { newContext, userState } = data;
  
  try {
    // Update context in predictive asset engine
    const updateResponse = await fetch(AI_CONFIG.endpoints.predictiveAssets, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextUpdate: newContext,
        userState,
        updateType: 'context_switch',
        timestamp: Date.now()
      })
    });
    
    const result = await updateResponse.json();
    
    self.postMessage({
      type: 'CONTEXT_UPDATE_COMPLETE',
      success: updateResponse.ok,
      updatedContext: result.context,
      timestamp: Date.now()
    });
    
  } catch (error) {
    self.postMessage({
      type: 'CONTEXT_UPDATE_ERROR',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

async function handleAssetPrediction(data) {
  const { query, context, userProfile, predictionType } = data;
  
  try {
    const predictedAssets = await generatePredictiveAssets(query, context, userProfile);
    
    self.postMessage({
      type: 'ASSET_PREDICTION_COMPLETE',
      predictedAssets,
      predictionType,
      confidence: calculateAverageConfidence(predictedAssets),
      timestamp: Date.now()
    });
    
  } catch (error) {
    self.postMessage({
      type: 'ASSET_PREDICTION_ERROR',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// Utility functions
function calculateKeywordSimilarity(query, doc) {
  if (!query || !doc.content) return 0.1;
  
  const queryWords = query.toLowerCase().split(/\s+/);
  const docContent = (doc.content || doc.title || doc.description || '').toLowerCase();
  const matchCount = queryWords.filter(word => docContent.includes(word)).length;
  
  return Math.min(matchCount / queryWords.length, 1);
}

function calculateContextRelevance(doc, context) {
  if (!context || !doc) return 0.5;
  
  let relevance = 0.5;
  
  // Page context matching
  if (context.currentPage && doc.category) {
    if (context.currentPage.includes(doc.category)) relevance += 0.2;
  }
  
  // User role context
  if (context.userRole && doc.targetRoles) {
    if (doc.targetRoles.includes(context.userRole)) relevance += 0.2;
  }
  
  // Time context
  if (context.urgency && doc.priority) {
    if (context.urgency === 'high' && doc.priority === 'critical') relevance += 0.1;
  }
  
  return Math.min(relevance, 1);
}

function calculatePredictiveScore(doc, predictedAssets) {
  if (!predictedAssets || predictedAssets.length === 0) return 0.3;
  
  const matchingAssets = predictedAssets.filter(asset => 
    asset.documentId === doc.id || 
    asset.category === doc.category ||
    (asset.keywords && doc.keywords && 
     asset.keywords.some(k => doc.keywords.includes(k)))
  );
  
  if (matchingAssets.length === 0) return 0.2;
  
  const avgPredictionScore = matchingAssets.reduce((sum, asset) => 
    sum + (asset.confidence || 0.5), 0
  ) / matchingAssets.length;
  
  return Math.min(avgPredictionScore, 1);
}

function determinePriority(confidence, doc) {
  if (confidence >= AI_CONFIG.thresholds.criticalPriorityThreshold) return 'critical';
  if (confidence >= AI_CONFIG.thresholds.highConfidenceThreshold) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function determineRecommendationType(doc, context) {
  if (doc.type) return doc.type;
  
  // Determine based on content and context
  const content = (doc.content || doc.title || doc.description || '').toLowerCase();
  
  if (content.includes('evidence') || content.includes('exhibit')) return 'evidence';
  if (content.includes('legal') || content.includes('law') || content.includes('court')) return 'legal';
  if (content.includes('detective') || content.includes('investigation')) return 'detective';
  
  return 'ai'; // Default to AI-generated recommendation
}

function generateEnhancedReason(query, doc, keywordSim, contextRel, predictiveScore) {
  const reasons = [];
  
  if (keywordSim > 0.7) reasons.push('Strong keyword similarity');
  if (contextRel > 0.7) reasons.push('High contextual relevance');
  if (predictiveScore > 0.7) reasons.push('Predicted user interest');
  if (doc.priority === 'critical') reasons.push('Critical document priority');
  
  if (reasons.length === 0) {
    return 'Potentially relevant document';
  }
  
  return reasons.join(' • ');
}

function calculateAverageConfidence(items) {
  if (!items || items.length === 0) return 0;
  const sum = items.reduce((acc, item) => acc + (item.confidence || 0), 0);
  return sum / items.length;
}

function generateFallbackRecommendations(documents, query) {
  return documents.slice(0, 10).map((doc, index) => ({
    id: doc.id || `fallback_${index}`,
    title: doc.title || `Document ${index + 1}`,
    description: doc.description || 'Fallback recommendation',
    confidence: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
    priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    type: doc.type || 'legal',
    score: Math.random() * 60 + 20,
    relevance: Math.random() * 0.6 + 0.2,
    reason: 'Fallback recommendation logic',
    fallback: true
  }));
}

function generateFallbackPredictiveAssets(query, context) {
  return [
    {
      id: 'fallback_asset_1',
      category: 'legal',
      confidence: 0.4,
      keywords: query ? query.split(' ') : ['legal'],
      reason: 'Fallback predictive asset'
    }
  ];
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Keep worker alive
self.addEventListener('install', function(e) {
  console.log('Enhanced Recommendation Worker installed with QLoRA integration');
});

self.addEventListener('activate', function(e) {
  console.log('Enhanced Recommendation Worker activated');
});
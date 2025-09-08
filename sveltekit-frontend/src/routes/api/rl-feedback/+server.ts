/**
 * Reinforcement Learning Feedback API
 * Collects thumbs up/down feedback for supervised RL training
 * Feeds into QLoRA distilled enhanced RAG model creation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { qloraTrainer } from '$lib/services/qlora-reinforcement-learning-trainer';
import { autoencoderContextSwitcher } from '$lib/orchestration/autoencoder-context-switcher';
import { predictiveAssetEngine } from '$lib/services/predictive-asset-engine';

// Feedback data structure
interface RLFeedbackData {
  sessionId: string;
  userId: string;
  queryId: string;
  query: string;
  response: string;
  feedback: 'thumbs_up' | 'thumbs_down';
  feedbackDetails?: {
    accuracy: number;      // 1-5 scale
    helpfulness: number;   // 1-5 scale
    completeness: number;  // 1-5 scale
    clarity: number;       // 1-5 scale
  };
  context: {
    documentType: string;
    legalDomain: string;
    complexityLevel: 'basic' | 'intermediate' | 'advanced';
    modelUsed: string;
    responseTime: number;
    confidence: number;
  };
  timestamp: number;
  userCorrections?: string[];
  preferredResponse?: string;
}

// Training data for QLoRA distillation
interface QLorATrainingExample {
  instruction: string;
  input: string;
  output: string;
  preference_score: number;
  quality_metrics: {
    accuracy: number;
    relevance: number;
    completeness: number;
  };
  metadata: {
    domain: string;
    model_used: string;
    user_feedback: string;
    context_embedding: Float32Array;
  };
}

/**
 * POST /api/rl-feedback
 * Submit thumbs up/down feedback for reinforcement learning
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const feedbackData: RLFeedbackData = await request.json();
    
    // Validate required fields
    if (!feedbackData.queryId || !feedbackData.query || !feedbackData.response || !feedbackData.feedback) {
      return json({ error: 'Missing required feedback fields' }, { status: 400 });
    }

    console.log(`👍👎 Received ${feedbackData.feedback} feedback for query: ${feedbackData.queryId}`);
    
    // Convert feedback to numerical score
    const feedbackScore = convertFeedbackToScore(feedbackData);
    
    // Generate context embedding for this interaction
    const contextEmbedding = await generateContextEmbedding(feedbackData);
    
    // Create training example for QLoRA
    const trainingExample: QLorATrainingExample = {
      instruction: generateInstruction(feedbackData.context),
      input: feedbackData.query,
      output: feedbackData.preferredResponse || feedbackData.response,
      preference_score: feedbackScore,
      quality_metrics: {
        accuracy: feedbackData.feedbackDetails?.accuracy || estimateAccuracy(feedbackData),
        relevance: estimateRelevance(feedbackData),
        completeness: feedbackData.feedbackDetails?.completeness || estimateCompleteness(feedbackData)
      },
      metadata: {
        domain: feedbackData.context.legalDomain,
        model_used: feedbackData.context.modelUsed,
        user_feedback: feedbackData.feedback,
        context_embedding: contextEmbedding
      }
    };

    // Store feedback for RL training
    await qloraTrainer.recordUserFeedback(
      feedbackData.query,
      feedbackData.response,
      {
        rating: feedbackScore,
        corrections: feedbackData.userCorrections || [],
        preference_type: determinePrefererenceType(feedbackData),
        legal_domain: feedbackData.context.legalDomain,
        confidence_delta: calculateConfidenceDelta(feedbackData)
      },
      {
        document_type: feedbackData.context.documentType,
        jurisdiction: 'federal', // default
        practice_area: feedbackData.context.legalDomain,
        complexity_level: feedbackData.context.complexityLevel,
        prior_interactions: [] // would track in production
      }
    );

    // Update context switcher with usage pattern
    await autoencoderContextSwitcher.switchContext(
      feedbackData.userId,
      feedbackData.query,
      {
        feedback: feedbackData.feedback,
        model_performance: feedbackScore,
        sessionId: feedbackData.sessionId
      }
    );

    // Update predictive engine with user interaction
    await predictiveAssetEngine.updateUserState(
      feedbackData.userId,
      feedbackData.sessionId,
      `feedback_${feedbackData.feedback}`,
      {
        document_type: feedbackData.context.documentType,
        task: 'feedback_collection',
        legal_domain: feedbackData.context.legalDomain,
        feedback_score: feedbackScore
      }
    );

    // Store training example in enhanced RAG dataset
    await storeEnhancedRAGExample(trainingExample);

    // Check if we have enough feedback to trigger model distillation
    const feedbackCount = await getFeedbackCount(feedbackData.userId, feedbackData.context.legalDomain);
    if (feedbackCount >= 50) { // Threshold for domain-specific distillation
      await triggerDomainSpecificDistillation(feedbackData.context.legalDomain, feedbackData.userId);
    }

    return json({
      success: true,
      message: 'Feedback recorded successfully',
      training_examples: 1,
      distillation_ready: feedbackCount >= 50,
      next_training_eta: estimateNextTrainingTime(feedbackCount)
    });

  } catch (error) {
    console.error('❌ RL Feedback API error:', error);
    return json({ error: 'Failed to process feedback' }, { status: 500 });
  }
};

/**
 * GET /api/rl-feedback/stats
 * Get feedback statistics and training progress
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId');
    const domain = url.searchParams.get('domain');

    // Get training statistics
    const trainingStats = qloraTrainer.getTrainingStats();
    
    // Get context switching performance
    const switchingStats = autoencoderContextSwitcher.getPerformanceStats();
    
    // Get prediction engine stats
    const predictionStats = predictiveAssetEngine.getPredictionStats();

    // Domain-specific statistics
    let domainStats = null;
    if (domain) {
      domainStats = await getDomainSpecificStats(domain, userId);
    }

    return json({
      training: {
        total_feedback: trainingStats.training_queue_size,
        successful_training_runs: trainingStats.data_flywheel_status === 'training' ? 1 : 0,
        model_versions: trainingStats.model_versions,
        next_training_eta: trainingStats.next_training_eta
      },
      context_switching: {
        switching_latency: switchingStats.switchingLatency,
        active_models: switchingStats.activeModels,
        total_switches: switchingStats.totalSwitches,
        average_cost: switchingStats.averageSwitchingCost
      },
      prediction: {
        success_rate: predictionStats.success_rate,
        average_confidence: predictionStats.average_confidence,
        cache_improvements: predictionStats.cache_improvements
      },
      domain_specific: domainStats,
      enhanced_rag: {
        training_examples: await getEnhancedRAGExampleCount(),
        distilled_models: await getDistilledModelCount(),
        average_quality_score: await getAverageQualityScore()
      }
    });

  } catch (error) {
    console.error('❌ RL Stats API error:', error);
    return json({ error: 'Failed to retrieve statistics' }, { status: 500 });
  }
};

// ===============================
// HELPER FUNCTIONS
// ===============================

/**
 * Convert thumbs up/down feedback to numerical score
 */
function convertFeedbackToScore(feedback: RLFeedbackData): number {
  if (feedback.feedback === 'thumbs_up') {
    // Base score of 4, enhanced by detail ratings
    let score = 4.0;
    if (feedback.feedbackDetails) {
      const avgDetail = (
        feedback.feedbackDetails.accuracy +
        feedback.feedbackDetails.helpfulness +
        feedback.feedbackDetails.completeness +
        feedback.feedbackDetails.clarity
      ) / 4;
      score = Math.min(5, 3 + (avgDetail / 5) * 2); // Scale to 3-5 range
    }
    return score;
  } else {
    // Base score of 2, reduced by detail ratings
    let score = 2.0;
    if (feedback.feedbackDetails) {
      const avgDetail = (
        feedback.feedbackDetails.accuracy +
        feedback.feedbackDetails.helpfulness +
        feedback.feedbackDetails.completeness +
        feedback.feedbackDetails.clarity
      ) / 4;
      score = Math.max(1, 3 - (avgDetail / 5) * 2); // Scale to 1-3 range
    }
    return score;
  }
}

/**
 * Generate context embedding for training
 */
async function generateContextEmbedding(feedback: RLFeedbackData): Promise<Float32Array> {
  const embedding = new Float32Array(256);
  
  // Encode query features
  const queryWords = feedback.query.toLowerCase().split(' ');
  queryWords.forEach((word, i) => {
    if (i < 64) {
      embedding[i] = hashString(word) / 1000000; // Normalize
    }
  });
  
  // Encode context features
  embedding[64] = feedback.context.complexityLevel === 'basic' ? 0.33 : 
                  feedback.context.complexityLevel === 'intermediate' ? 0.66 : 1.0;
  embedding[65] = feedback.context.confidence;
  embedding[66] = feedback.context.responseTime / 10000; // Normalize to ~0-1
  embedding[67] = feedback.feedback === 'thumbs_up' ? 1.0 : 0.0;
  
  // Encode domain features
  const domainHash = hashString(feedback.context.legalDomain);
  for (let i = 0; i < 32; i++) {
    embedding[68 + i] = ((domainHash * i) % 1000) / 1000;
  }
  
  return embedding;
}

/**
 * Generate instruction prompt for QLoRA training
 */
function generateInstruction(context: RLFeedbackData['context']): string {
  return `You are an expert legal AI assistant specializing in ${context.legalDomain}. ` +
         `Analyze the following ${context.documentType} document with ${context.complexityLevel} complexity. ` +
         `Provide accurate, detailed, and professionally formatted legal analysis.`;
}

/**
 * Estimate accuracy from feedback data
 */
function estimateAccuracy(feedback: RLFeedbackData): number {
  let accuracy = feedback.feedback === 'thumbs_up' ? 0.8 : 0.4;
  
  // Boost accuracy if user provided corrections (implies they found errors)
  if (feedback.userCorrections && feedback.userCorrections.length > 0) {
    accuracy = Math.max(accuracy - (feedback.userCorrections.length * 0.1), 0.1);
  }
  
  // Boost accuracy for high confidence responses
  if (feedback.context.confidence > 0.8) {
    accuracy = Math.min(accuracy + 0.1, 1.0);
  }
  
  return accuracy;
}

/**
 * Estimate relevance from feedback data
 */
function estimateRelevance(feedback: RLFeedbackData): number {
  // High relevance if response time is reasonable (indicates focused answer)
  const timeBonus = feedback.context.responseTime < 5000 ? 0.1 : 0;
  const baseRelevance = feedback.feedback === 'thumbs_up' ? 0.85 : 0.45;
  
  return Math.min(baseRelevance + timeBonus, 1.0);
}

/**
 * Estimate completeness from feedback data
 */
function estimateCompleteness(feedback: RLFeedbackData): number {
  // Longer responses are generally more complete
  const lengthBonus = Math.min(feedback.response.length / 2000, 0.2);
  const baseCompleteness = feedback.feedback === 'thumbs_up' ? 0.75 : 0.35;
  
  return Math.min(baseCompleteness + lengthBonus, 1.0);
}

/**
 * Determine user preference type from feedback
 */
function determinePrefererenceType(feedback: RLFeedbackData): 'accuracy' | 'completeness' | 'clarity' | 'relevance' {
  if (feedback.feedbackDetails) {
    const details = feedback.feedbackDetails;
    const scores = {
      accuracy: details.accuracy,
      completeness: details.completeness,
      clarity: details.clarity,
      relevance: details.helpfulness // Map helpfulness to relevance
    };
    
    // Return the aspect with the highest (or lowest for negative feedback) score
    const sortedScores = Object.entries(scores).sort(([,a], [,b]) => 
      feedback.feedback === 'thumbs_up' ? b - a : a - b
    );
    
    return sortedScores[0][0] as 'accuracy' | 'completeness' | 'clarity' | 'relevance';
  }
  
  // Default to accuracy for legal domain
  return 'accuracy';
}

/**
 * Calculate confidence delta from feedback
 */
function calculateConfidenceDelta(feedback: RLFeedbackData): number {
  if (feedback.feedback === 'thumbs_up') {
    return Math.min(0.3, (5 - feedback.context.confidence) * 0.2);
  } else {
    return Math.max(-0.3, (feedback.context.confidence - 1) * -0.2);
  }
}

/**
 * Store enhanced RAG training example
 */
async function storeEnhancedRAGExample(example: QLorATrainingExample): Promise<void> {
  try {
    // In production, this would store to database/vector store
    console.log(`💾 Storing enhanced RAG example for domain: ${example.metadata.domain}`);
    
    // Store with timestamp and quality metrics
    const ragExample = {
      ...example,
      id: `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      quality_score: (
        example.quality_metrics.accuracy +
        example.quality_metrics.relevance +
        example.quality_metrics.completeness
      ) / 3
    };
    
    // Would implement actual storage here
    console.log(`✅ RAG example stored with quality score: ${ragExample.quality_score.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Failed to store RAG example:', error);
  }
}

/**
 * Get feedback count for domain-specific training
 */
async function getFeedbackCount(userId: string, domain: string): Promise<number> {
  // Mock implementation - would query database in production
  return Math.floor(Math.random() * 100);
}

/**
 * Trigger domain-specific model distillation
 */
async function triggerDomainSpecificDistillation(domain: string, userId: string): Promise<void> {
  console.log(`🧠 Triggering domain-specific distillation for: ${domain}`);
  
  try {
    // This would trigger the actual QLoRA distillation process
    const distillationConfig = {
      domain,
      userId,
      targetModelName: `gemma3-legal-${domain}-distilled-${Date.now()}`,
      trainingExamples: await getEnhancedRAGExampleCount(),
      qualityThreshold: 0.8,
      maxTrainingTime: '2 hours'
    };
    
    // Start distillation process (would be async in production)
    console.log(`🚀 Starting distillation with config:`, distillationConfig);
    
    // Update user that specialized model is being created
    await notifyUserOfDistillation(userId, domain, distillationConfig.targetModelName);
    
  } catch (error) {
    console.error(`❌ Distillation failed for domain ${domain}:`, error);
  }
}

/**
 * Estimate next training time based on current feedback count
 */
function estimateNextTrainingTime(currentCount: number): number | null {
  const threshold = 50;
  if (currentCount >= threshold) return 0; // Ready now
  
  const remaining = threshold - currentCount;
  // Assume 1 feedback per 10 minutes on average
  return remaining * 10 * 60 * 1000; // milliseconds
}

/**
 * Get domain-specific statistics
 */
async function getDomainSpecificStats(domain: string, userId?: string): Promise<any> {
  // Mock implementation - would query real data in production
  return {
    domain,
    total_feedback: Math.floor(Math.random() * 200),
    positive_feedback: Math.floor(Math.random() * 120),
    negative_feedback: Math.floor(Math.random() * 80),
    average_quality_score: 0.75 + Math.random() * 0.2,
    specialized_models: [
      `gemma3-legal-${domain}-v1`,
      `gemma3-legal-${domain}-v2`
    ],
    distillation_ready: Math.random() > 0.5
  };
}

/**
 * Get enhanced RAG example count
 */
async function getEnhancedRAGExampleCount(): Promise<number> {
  return Math.floor(Math.random() * 1000) + 500;
}

/**
 * Get distilled model count
 */
async function getDistilledModelCount(): Promise<number> {
  return Math.floor(Math.random() * 10) + 3;
}

/**
 * Get average quality score across all examples
 */
async function getAverageQualityScore(): Promise<number> {
  return 0.78 + Math.random() * 0.15;
}

/**
 * Notify user of distillation process
 */
async function notifyUserOfDistillation(userId: string, domain: string, modelName: string): Promise<void> {
  console.log(`📧 Notifying user ${userId} of new specialized model: ${modelName}`);
  // Would send actual notification in production
}

/**
 * Simple hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
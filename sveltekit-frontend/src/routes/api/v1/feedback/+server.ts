import type { RequestHandler } from './$types.js';

/**
 * Feedback Loop API Endpoint
 * Provides rating collection, user pattern analysis, and training data management
 */

import { feedbackLoopService } from '$lib/services/feedback-loop-service';
import { URL } from "url";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action');
    const data = await request.json();

    switch (action) {
      case 'rate': {
        const {
          userId,
          sessionId,
          interactionId,
          ratingType,
          score,
          feedback,
          context,
          metadata
        } = data;

        // Validate required fields
        if (!userId || !sessionId || !interactionId || !ratingType || score === undefined) {
          return json({ 
            error: 'Missing required fields: userId, sessionId, interactionId, ratingType, score' 
          }, { status: 400 });
        }

        // Validate score range
        if (score < 1 || score > 5) {
          return json({ 
            error: 'Score must be between 1 and 5' 
          }, { status: 400 });
        }

        const ratingId = await feedbackLoopService.collectRating({
          userId,
          sessionId,
          interactionId,
          ratingType,
          score,
          feedback,
          context: context || {},
          metadata: metadata || {}
        });

        return json({ 
          success: true, 
          ratingId,
          message: 'Rating collected successfully' 
        });
      }

      case 'batch_rate': {
        const { ratings } = data;
        
        if (!Array.isArray(ratings)) {
          return json({ 
            error: 'Ratings must be an array' 
          }, { status: 400 });
        }

        const results = [];
        for (const rating of ratings) {
          try {
            const ratingId = await feedbackLoopService.collectRating(rating);
            results.push({ success: true, ratingId, rating: rating.interactionId });
          } catch (error: any) {
            results.push({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
              rating: rating.interactionId 
            });
          }
        }

        return json({ 
          success: true, 
          results,
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        });
      }

      default:
        return json({ 
          error: 'Invalid action. Supported actions: rate, batch_rate' 
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Feedback API Error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');

    switch (action) {
      case 'recommendations': {
        if (!userId) {
          return json({ 
            error: 'userId parameter is required for recommendations' 
          }, { status: 400 });
        }

        const recommendations = await feedbackLoopService.getUserRecommendations(userId);
        return json({ 
          success: true, 
          data: recommendations 
        });
      }

      case 'metrics': {
        const metrics = await feedbackLoopService.getFeedbackMetrics();
        return json({ 
          success: true, 
          data: metrics 
        });
      }

      case 'health': {
        return json({
          success: true,
          service: 'feedback-loop',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          features: [
            'rating_collection',
            'user_pattern_analysis',
            'adaptive_learning',
            'personalized_recommendations',
            'training_data_generation',
            'continuous_improvement'
          ]
        });
      }

      default:
        return json({ 
          error: 'Invalid action. Supported actions: recommendations, metrics, health' 
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Feedback API Error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
};
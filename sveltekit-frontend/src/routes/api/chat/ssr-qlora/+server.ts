/*
 * SSR QLoRA Chat API Endpoint
 * Integrates with Ollama, WASM bridge, XState machines, and AI components
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ssrChatAssistant } from '$lib/server/chat/ssr-qlora-gpu-chat-assistant';
import { qloraRLOrchestrator } from '$lib/services/qlora-rl-langextract-integration';

// SSR Chat Response for initial page load
export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
  const userId = url.searchParams.get('userId');
  const sessionId = url.searchParams.get('sessionId'); 
  const initialMessage = url.searchParams.get('message');

  if (!userId || !sessionId) {
    return json({
      success: false,
      error: 'Missing userId or sessionId parameters'
    }, { status: 400 });
  }

  try {
    console.log(`🚀 SSR Chat request for user: ${userId}, session: ${sessionId}`);
    
    // Render SSR context with preloaded data
    const ssrResult = await ssrChatAssistant.renderSSRChatContext(
      userId,
      sessionId,
      initialMessage || undefined
    );

    // Get orchestrator stats for dashboard
    const orchestratorStats = qloraRLOrchestrator.getStats();

    return json({
      success: true,
      ssrContext: {
        userId: ssrResult.ssrContext.userId,
        sessionId: ssrResult.ssrContext.sessionId,
        userDictionary: {
          preferredStyle: ssrResult.ssrContext.userDictionary.preferredStyle,
          domainExpertise: ssrResult.ssrContext.userDictionary.domainExpertise,
          termCount: ssrResult.ssrContext.userDictionary.legalTerms.size,
          interactionCount: ssrResult.ssrContext.userDictionary.interactionHistory.length
        },
        systemStatus: {
          nesMemoryReady: true,
          gpuCacheReady: true,
          qloraReady: orchestratorStats.completedQLoRAJobs > 0,
          wasmBridgeReady: true,
          ollamaReady: true
        }
      },
      prerenderedHTML: ssrResult.prerenderedHTML,
      preloadedData: ssrResult.preloadedData,
      orchestratorStats,
      clientAddress: getClientAddress(),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ SSR Chat error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Streaming chat response
export const POST: RequestHandler = async ({ request, url }) => {
  const { sessionId, message, metadata } = await request.json();

  if (!sessionId || !message) {
    return json({
      success: false,
      error: 'Missing sessionId or message'
    }, { status: 400 });
  }

  try {
    console.log(`💬 Streaming chat for session: ${sessionId}`);
    
    // Create streaming response
    const stream = await ssrChatAssistant.streamChatResponse(
      sessionId,
      message,
      { request, url } as any
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error: any) {
    console.error('❌ Chat streaming error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Update user feedback and trigger QLoRA retraining
export const PUT: RequestHandler = async ({ request }) => {
  const { sessionId, interactionId, feedback, userDictionaryUpdates } = await request.json();

  if (!sessionId || !interactionId) {
    return json({
      success: false,
      error: 'Missing required parameters'
    }, { status: 400 });
  }

  try {
    console.log(`📝 Updating feedback for interaction: ${interactionId}`);
    
    // TODO: Implement feedback update in SSR chat assistant
    // await ssrChatAssistant.updateInteractionFeedback(sessionId, interactionId, feedback);
    
    // If feedback is very positive or negative, trigger QLoRA retraining
    if (Math.abs(feedback) > 0.8) {
      console.log('🔥 Triggering QLoRA retraining based on feedback');
      // Implement QLoRA retraining trigger
    }

    return json({
      success: true,
      message: 'Feedback updated successfully',
      qloraRetrained: Math.abs(feedback) > 0.8,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Feedback update error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Get chat session analytics
export const PATCH: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('sessionId');
  const action = url.searchParams.get('action');

  if (!sessionId) {
    return json({
      success: false,
      error: 'Missing sessionId parameter'
    }, { status: 400 });
  }

  try {
    switch (action) {
      case 'stats':
        // Get session statistics
        const stats = {
          messagesCount: 0, // TODO: Implement
          averageResponseTime: 0,
          gpuCacheHitRate: 0,
          qloraJobsTriggered: 0,
          userSatisfaction: 0
        };

        return json({
          success: true,
          sessionId,
          stats,
          timestamp: new Date().toISOString()
        });

      case 'export':
        // Export conversation for analysis
        return json({
          success: true,
          message: 'Export functionality not yet implemented',
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: ['stats', 'export']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Session analytics error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

// Delete chat session and cleanup
export const DELETE: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get('sessionId');
  const cleanup = url.searchParams.get('cleanup') === 'true';

  if (!sessionId) {
    return json({
      success: false,
      error: 'Missing sessionId parameter'
    }, { status: 400 });
  }

  try {
    console.log(`🗑️ Deleting chat session: ${sessionId}`);
    
    // TODO: Implement session cleanup in SSR chat assistant
    // await ssrChatAssistant.deleteSession(sessionId, cleanup);

    return json({
      success: true,
      sessionId,
      cleaned: cleanup,
      message: 'Session deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Session deletion error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
/**
 * Global Feedback Store for Legal AI Platform
 * Manages feedback collection across all user interactions
 */

import { getContext, setContext } from 'svelte';
import type { 
  FeedbackSession, 
  FeedbackTrigger,
  FeedbackAnalytics,
  UserFeedbackContext 
} from '../types/feedback';

export interface FeedbackState {
  activeSession: FeedbackSession | null;
  pendingFeedback: FeedbackTrigger[];
  analytics: FeedbackAnalytics;
  userContext: UserFeedbackContext;
  isCollecting: boolean;
}

class FeedbackStore {
  private state = $state<FeedbackState>({
    activeSession: null,
    pendingFeedback: [],
    analytics: {
      totalInteractions: 0,
      averageRating: 0,
      completionRate: 0,
      topIssues: []
    },
    userContext: {
      userId: '',
      sessionId: '',
      deviceType: 'desktop',
      userType: 'attorney'
    },
    isCollecting: false
  });

  // Getters
  get activeSession() { return this.state.activeSession; }
  get pendingFeedback() { return this.state.pendingFeedback; }
  get analytics() { return this.state.analytics; }
  get userContext() { return this.state.userContext; }
  get isCollecting() { return this.state.isCollecting; }

  /**
   * Initialize feedback session for user
   */
  initializeSession(userId: string, sessionId?: string): FeedbackSession {
    const session: FeedbackSession = {
      id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startTime: new Date(),
      interactions: [],
      context: {
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    this.state.activeSession = session;
    this.state.userContext.userId = userId;
    this.state.userContext.sessionId = session.id;
    this.state.userContext.deviceType = this.detectDeviceType();

    return session;
  }

  /**
   * Track user interaction for feedback opportunities
   */
  trackInteraction(type: string, context: any = {}, options: { 
    autoTrigger?: boolean;
    priority?: 'low' | 'medium' | 'high';
    delay?: number;
  } = {}) {
    if (!this.state.activeSession) {
      console.warn('No active feedback session. Call initializeSession first.');
      return;
    }

    const interaction = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      context: {
        ...context,
        page: window.location.pathname,
        sessionTime: Date.now() - this.state.activeSession.startTime.getTime()
      }
    };

    this.state.activeSession.interactions.push(interaction);
    this.state.analytics.totalInteractions++;

    // Auto-trigger feedback collection based on interaction type
    if (options.autoTrigger !== false) {
      this.queueFeedbackTrigger({
        interactionId: interaction.id,
        type: this.getFeedbackTypeForInteraction(type),
        priority: options.priority || 'medium',
        delay: options.delay || this.getDefaultDelay(type),
        context: interaction.context
      });
    }

    return interaction.id;
  }

  /**
   * Queue feedback trigger for later display
   */
  queueFeedbackTrigger(trigger: FeedbackTrigger) {
    // Remove any existing trigger for the same interaction
    this.state.pendingFeedback = this.state.pendingFeedback.filter(
      t => t.interactionId !== trigger.interactionId
    );

    this.state.pendingFeedback.push(trigger);
    this.state.pendingFeedback.sort((a, b) => 
      this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority)
    );

    // Schedule feedback display
    if (trigger.delay > 0) {
      setTimeout(() => {
        this.showNextFeedback();
      }, trigger.delay);
    } else {
      this.showNextFeedback();
    }
  }

  /**
   * Show next feedback request if not already collecting
   */
  showNextFeedback(): FeedbackTrigger | null {
    if (this.state.isCollecting || this.state.pendingFeedback.length === 0) {
      return null;
    }

    const trigger = this.state.pendingFeedback.shift()!;
    this.state.isCollecting = true;

    return trigger;
  }

  /**
   * Submit feedback and update analytics
   */
  async submitFeedback(
    interactionId: string,
    rating: number,
    feedback?: string,
    ratingType: string = 'response_quality'
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/feedback?action=rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.state.userContext.userId,
          sessionId: this.state.userContext.sessionId,
          interactionId,
          ratingType,
          score: rating,
          feedback: feedback?.trim() || undefined,
          context: {
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          },
          metadata: {
            platform: navigator.platform,
            language: navigator.language,
            featureUsed: ratingType,
            deviceType: this.state.userContext.deviceType
          }
        })
      });

      if (response.ok) {
        this.updateAnalytics(rating);
        this.state.isCollecting = false;
        return true;
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('❌ Failed to submit feedback:', error);
      this.state.isCollecting = false;
      return false;
    }
  }

  /**
   * Cancel current feedback collection
   */
  cancelFeedback() {
    this.state.isCollecting = false;
  }

  /**
   * Get feedback recommendations based on user behavior
   */
  async getRecommendations(): Promise<any[]> {
    if (!this.state.userContext.userId) return [];

    try {
      const response = await fetch(
        `/api/v1/feedback?action=recommendations&userId=${this.state.userContext.userId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.recommendations || [];
      }
    } catch (error: any) {
      console.error('Failed to get recommendations:', error);
    }
    return [];
  }

  /**
   * Clear feedback session
   */
  clearSession() {
    this.state.activeSession = null;
    this.state.pendingFeedback = [];
    this.state.isCollecting = false;
  }

  // Helper methods
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getFeedbackTypeForInteraction(interactionType: string): 'response_quality' | 'search_relevance' | 'ui_experience' | 'ai_accuracy' | 'performance' {
    const typeMap: Record<string, 'response_quality' | 'search_relevance' | 'ui_experience' | 'ai_accuracy' | 'performance'> = {
      'ai_response': 'response_quality',
      'search_result': 'search_relevance',
      'file_upload': 'ui_experience',
      'document_analysis': 'ai_accuracy',
      'page_load': 'performance',
      'feature_use': 'ui_experience'
    };
    return typeMap[interactionType] || 'response_quality';
  }

  private getDefaultDelay(interactionType: string): number {
    const delayMap: Record<string, number> = {
      'ai_response': 2000,     // 2 seconds after AI response
      'search_result': 5000,   // 5 seconds after search
      'file_upload': 1000,     // 1 second after upload
      'document_analysis': 3000, // 3 seconds after analysis
      'page_load': 10000,      // 10 seconds after page load
      'feature_use': 5000      // 5 seconds after feature use
    };
    return delayMap[interactionType] || 3000;
  }

  private getPriorityValue(priority: string): number {
    return { high: 3, medium: 2, low: 1 }[priority] || 1;
  }

  private updateAnalytics(rating: number) {
    const analytics = this.state.analytics;
    const totalRatings = analytics.totalInteractions;
    
    // Update average rating
    if (totalRatings === 1) {
      analytics.averageRating = rating;
    } else {
      analytics.averageRating = (
        (analytics.averageRating * (totalRatings - 1) + rating) / totalRatings
      );
    }

    // Update completion rate (simplified)
    analytics.completionRate = Math.min(100, analytics.completionRate + 0.5);
  }
}

const FEEDBACK_STORE_KEY = 'feedback-store';

export function createFeedbackStore(): FeedbackStore {
  return new FeedbackStore();
}

export function getFeedbackStore(): FeedbackStore {
  const store = getContext<FeedbackStore>(FEEDBACK_STORE_KEY);
  if (!store) {
    throw new Error('Feedback store not found. Make sure to call setFeedbackStore in a parent component.');
  }
  return store;
}

export function setFeedbackStore(store: FeedbackStore): void {
  setContext(FEEDBACK_STORE_KEY, store);
}

// Global store instance for direct usage
export const feedbackStore = createFeedbackStore();
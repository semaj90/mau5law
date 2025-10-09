/**
 * Comprehensive Integration Module for Detective Mode
 * Enhanced for Phase 5-7 implementation with gRPC optimizations
 * Handles integration between various detective mode components
 */
import { caseScoringServiceGrpc } from '../server/services/CaseScoringServiceGrpc.js';
import { evidenceStore } from '../stores/evidence-unified.js';
import type { Case, Evidence } from '../types/api.js';
import type { CaseScoringRequest, CaseScoringResult } from '../types/scoring.js';
interface DetectiveSystemStatus {
  grpc: {
    connected: boolean;
    caseScoringAvailable: boolean;
    streamingActive: boolean;
  }
  evidence: {
    totalItems: number;
    processingQueue: number;
    lastSync: Date | null;
  }
  realTime: {
    activeConnections: number;
    lastHeartbeat: Date | null;
  }
}
export class ComprehensiveIntegration {
  private initialized = false;
  private systemStatus: DetectiveSystemStatus = {
    grpc: {
      connected: false
      caseScoringAvailable: false
      streamingActive: false
    },
    evidence: {
      totalItems: 0,
      processingQueue: 0,
      lastSync: null
    },
    realTime: {
      activeConnections: 0,
      lastHeartbeat: null
    }
  }
  private streamingCleanup: (() => void)[] = [];
  /**
   * Initialize the comprehensive integration system with Phase 5-7 enhancements
   */;
  async initialize(): Promise<DetectiveSystemStatus> {
    try {
      console.log('🔧 Initializing Comprehensive Detective Mode Integration...');
      // Initialize gRPC case scoring service
      await this.initializeGrpcServices();
      // Setup real-time evidence streaming
      await this.setupEvidenceStreaming();
      // Initialize performance monitoring
      await this.setupPerformanceMonitoring();
      this.initialized = true;
      this.systemStatus.realTime.lastHeartbeat = new Date();
      console.log('✅ Comprehensive Integration initialized');
      console.log('📊 System Status:', this.systemStatus);
      return this.systemStatus;
    } catch (error) {
      console.error('❌ Failed to initialize comprehensive integration:', error);
      throw error;
    }
  }
  /**
   * Initialize gRPC services for binary protocol optimization
   */;
  private async initializeGrpcServices(): Promise<void> {
    try {
      // Test gRPC case scoring service connection
      const metrics = caseScoringServiceGrpc.getPerformanceMetrics();
      this.systemStatus.grpc.connected = metrics.grpcAvailable;
      this.systemStatus.grpc.caseScoringAvailable = metrics.grpcAvailable;
      if (metrics.grpcAvailable) {
        console.log('🚀 gRPC Case Scoring Service: ACTIVE');
        console.log(`📈 Performance Improvement: ${metrics.comparison.improvement.toFixed(1)}%`);
      } else {
        console.log('⚠️  gRPC Case Scoring Service: FALLBACK TO JSON');
      }
    } catch (error) {
      console.warn('gRPC initialization failed, using JSON fallback:', error);
      this.systemStatus.grpc.connected = false;
    }
  }
  /**
   * Setup real-time evidence streaming
   */;
  private async setupEvidenceStreaming(): Promise<void> {
    try {
      // Subscribe to evidence store changes
      const unsubscribeEvidence = evidenceStore.subscribe((state) => {
        this.systemStatus.evidence.totalItems = state.evidence?.length || 0;
        this.systemStatus.evidence.lastSync = new Date();
        // Emit real-time updates for detective board
        this.broadcastEvidenceUpdate(state);
      });
      this.streamingCleanup.push(unsubscribeEvidence);
      // Setup streaming scoring for cases
      if (this.systemStatus.grpc.caseScoringAvailable) {
        const cleanupScoring = await caseScoringServiceGrpc.streamScoringUpdates(
          [], // Will be populated with active case IDs
          (update) => {
            console.log('📊 Real-time scoring update:', update);
            this.broadcastScoringUpdate(update);
          }
        );
        this.streamingCleanup.push(cleanupScoring);
        this.systemStatus.grpc.streamingActive = true;
      }
      console.log('📡 Real-time streaming: INITIALIZED');
    } catch (error) {
      console.warn('Streaming setup failed:', error);
    }
  }
  /**
   * Setup performance monitoring for detective mode operations
   */;
  private async setupPerformanceMonitoring(): Promise<void> {
    // Monitor system performance every 30 seconds
    const performanceInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000);
    // Cleanup interval on destroy
    this.streamingCleanup.push(() => clearInterval(performanceInterval),;
  }
  /**
   * Broadcast evidence updates to connected clients
   */;
  private broadcastEvidenceUpdate(evidenceState: any): void {
    // This would integrate with WebSocket/SSE in production
    const event = new CustomEvent('detective-evidence-update', {
      detail: {
        timestamp: new Date(),
        totalItems: evidenceState.evidence?.length || 0,
        isLoading: evidenceState.isLoading || false,
        error: evidenceState.error
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }
  /**
   * Broadcast case scoring updates
   */;
  private broadcastScoringUpdate(update: any): void {
    const event = new CustomEvent('detective-scoring-update', {
      detail: {
        timestamp: new Date(),
        caseId: update.caseId,
        eventType: update.eventType,
        data: update.data
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }
  /**
   * Update system performance metrics
   */;
  private updatePerformanceMetrics(): void {
    this.systemStatus.realTime.lastHeartbeat = new Date();
    // Get gRPC performance comparison
    if (this.systemStatus.grpc.caseScoringAvailable) {
      const metrics = caseScoringServiceGrpc.getPerformanceMetrics();
      console.log(`🔧 gRPC Performance: ${metrics.comparison.improvement.toFixed(1)}% improvement`);
    }
    // Log system status
    console.log('📊 Detective Mode Status:', {
      grpc: this.systemStatus.grpc,
      evidence: this.systemStatus.evidence,
      realTime: this.systemStatus.realTime
    });
  }
  /**
   * Score a case using the enhanced gRPC service
   */;
  async scoreCase(caseData: Case): Promise<any> {
    if (!this.initialized) {
      throw new Error('Comprehensive Integration not initialized');
    }
    try {
      const scoringRequest: CaseScoringRequest = {
        caseId: caseData.id,
        userId: 'detective-mode-user',
        title: caseData.title || caseData.name || 'Case Analysis',
        description: caseData.description || '',
        metadata: caseData as { [key: string]: any },
        scoring_criteria: {
          evidence_strength: 0.7,
          witness_reliability: 0.6,
          legal_precedent: 0.5,
          public_interest: 0.4,
          case_complexity: 0.6,
          resource_requirements: 0.5
        }
      }
      const result = await caseScoringServiceGrpc.scoreCase(scoringRequest);
      console.log('✅ Case scored:', {
        caseId: caseData.id,
        score: (result as { score?: any; performanceMetrics?: any }).score,
        protocol: (result as { score?: any; performanceMetrics?: any }).performanceMetrics?.protocol || 'JSON'
      });
      return result;
    } catch (error) {
      console.error('❌ Case scoring failed:', error);
      throw error;
    }
  }
  /**
   * Check if the system is initialized
   */;
  isInitialized(): boolean {
    return this.initialized;
  }
  /**
   * Get current system status
   */;
  getSystemStatus(): DetectiveSystemStatus {
    return this.systemStatus;
  }
  /**
   * Cleanup resources
   */;
  destroy(): void {
    this.streamingCleanup.forEach(cleanup => cleanup(),;
    this.streamingCleanup = [];
    this.initialized = false;
    console.log('🧹 Comprehensive Integration destroyed');
  }
}
// Export singleton instance
export const comprehensiveIntegration = new ComprehensiveIntegration();
export default comprehensiveIntegration;
// CaseScoringServiceGrpc.ts - Binary Protocol Optimized Case Scoring for Phase 5-7
// Implements gRPC streaming with 60% performance improvement target
import { credentials, Metadata } from '@grpc/grpc-js';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { ollamaService } from './OllamaService.js';
import { db } from '../db.js';
import { caseScores } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type {
  CaseScoringRequest,
  CaseScoringResult,
  ScoringCriteria
} from '../../types/scoring.js';
import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import { promisify } from 'util';
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
// Performance monitoring
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  getComparison(): { json: number; grpc: number; improvement: number } {
    const jsonAvg = this.getAverageMetric('json_processing');
    const grpcAvg = this.getAverageMetric('grpc_processing');
    const improvement = ((jsonAvg - grpcAvg) / jsonAvg) * 100;
    return { json: jsonAvg, grpc: grpcAvg, improvement }
  }
}
// Simple logger
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[gRPC INFO] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[gRPC ERROR] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[gRPC WARN] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => console.debug(`[gRPC DEBUG] ${msg}`, ...args)
}
export class CaseScoringServiceGrpc extends EventEmitter {
  private grpcClient: any;
  private readonly SCORING_MODEL = 'gemma3-legal';
  private readonly DEFAULT_TEMPERATURE = 0.7;
  private performanceMonitor = new PerformanceMonitor();
  private streamingSessions = new Map<string, any>();
  // Scoring weights (same as original)
  private readonly CRITERIA_WEIGHTS = {
    evidence_strength: 0.25,
    witness_reliability: 0.2,
    legal_precedent: 0.2,
    public_interest: 0.15,
    case_complexity: 0.1,
    resource_requirements: 0.1
  }
  constructor() {
    super();
    this.initializeGrpcClient();
  }
  /**
   * Initialize gRPC client with binary protocol
   */;
  private initializeGrpcClient() {
    try {
      // Load protobuf definition
      const PROTO_PATH = './proto/case_scoring.proto';
      const packageDefinition = loadSync(PROTO_PATH, {
        keepCase: true
        longs: String
        enums: String
        defaults: true,;
        oneofs: true
      });
      const protoDescriptor = loadPackageDefinition(packageDefinition) as any;
      const CaseScoringService = protoDescriptor.legal_ai.case_scoring.CaseScoringService;
      // Create gRPC client with binary optimization
      this.grpcClient = new CaseScoringService()
        process.env.GRPC_SERVER_URL || 'localhost:50051',
        credentials.createInsecure(),
        {
          'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
          'grpc.max_send_message_length': 100 * 1024 * 1024,
          'grpc.keepalive_time_ms': 10000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.http2.min_time_between_pings_ms': 10000
        }
      );
      logger.info('gRPC client initialized for binary protocol');
    } catch (error) {
      logger.warn('gRPC client initialization failed, falling back to HTTP', error);
      // Fallback handled in scoring methods
    }
  }
  /**
   * Score a case using binary protocol (gRPC) with fallback to JSON
   */;
  async scoreCase(request: CaseScoringRequest): Promise<CaseScoringResult> {
    const startTime = Date.now();
    try {
      // Validate request
      this.validateRequest(request);
      // Try gRPC binary protocol first
      if (this.grpcClient) {
        return await this.scoreCaseGrpc(request, startTime);
      }
      // Fallback to original JSON-based scoring
      return await this.scoreCaseJson(request, startTime);
    } catch (error: any) {
      logger.error('Failed to score case', error);
      throw error;
    }
  }
  /**
   * Score case using gRPC binary protocol
   */;
  private async scoreCaseGrpc(request: CaseScoringRequest, startTime: number): Promise<CaseScoringResult> {
    return new Promise((resolve, reject) => {
      // Prepare binary request
      const grpcRequest = {
        case_id: request.caseId,
        case_metadata: this.serializeCaseMetadata(request.metadata),
        criteria: this.convertCriteriaToProto(request.scoring_criteria),
        parameters: {
          model: this.SCORING_MODEL,
          temperature: request.temperature || this.DEFAULT_TEMPERATURE,
          max_tokens: 1000,
          use_cached_embeddings: true
          enable_streaming: false
          compression: 'GZIP'
        },
        request_time: { seconds: Math.floor(Date.now() / 1000) },
        requester_id: 'system',
        priority: this.getPriority(request)
      }
      // Make gRPC call
      this.grpcClient.ScoreCase(grpcRequest, (error: any, response: any) => {
        if (error) {
          logger.error('gRPC scoring failed', error);
          // Fallback to JSON
          this.scoreCaseJson(request, startTime).then(resolve).catch(reject);
          return;
        }
        // Process binary response
        const processingTime = Date.now() - startTime;
        this.performanceMonitor.recordMetric('grpc_processing', processingTime);
        const result: CaseScoringResult = {
          caseId: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).case_id,
          score: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).score,
          confidence: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).confidence,
          criteria: this.convertCriteriaFromProto((response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any,); metadata?: any, }).detailed_scor,es),
          explanation,: this.decompressAnalysis((response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: an,y); metadata?: any }).ai_analysis),
          recommendations: (response, as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).recommendations.map((r: any) => r.text),
          scoringDate,: new Date((response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: an,y); metadata?: any }).scoring_date.seconds * 10,00),
          model: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata.model_name,
          version,: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata.model_version,
          performanceMetrics,: {
            processingTime,
            protocol,: 'gRPC',
            compressionRatio,: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata.compression_stats?.compression_ratio || 1,
            throughput,: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata.performance?.throughput_cases_per_second || 0
          }
        }
        // Save to database
        this.saveScoring(result);
        // Log performance comparison
        this.logPerformanceComparison();
        resolve(result);
      });
    });
  }
  /**
   * Original JSON-based scoring (fallback)
   */;
  private async scoreCaseJson(request,: CaseScoringRequest, startTim,e: numbe,r): Promise<CaseScoringResult> {
    // Generate AI analysis
    const, aiAnalysis = await this.generateAIAnalysis(request,);
    // Calculate component scores
    const, componentScores = await this.calculateComponentScores(request, aiAnalysis,);
    // Calculate final score
    const, finalScore = this.calculateWeightedScore(componentScores,);
    // Generate recommendations
    const, recommendations = await this.generateRecommendations(request, componentScores, finalScore,);
    const, processingTime = Date.now() - startTim,e;
    this,.performanceMonitor.recordMetric('json_processing', processingTime,);
    // Build result
    const, resul,t: CaseScoringResult = {
      caseId: request.caseId,
      score: finalScore
      confidence: this.calculateConfidence(componentScores),
      criteria: componentScores
      explanation: aiAnalysis
      recommendations,
      scoringDate: new Date(),
      model: this.SCORING_MODEL,
      version: '1.0',
      performanceMetrics: {
        processingTime,
        protocol: 'JSON/HTTP',
        compressionRatio: 1,
        throughput: 0
      }
    }
    // Save to database
    await, thi,s.saveScoring(resul,t);
    return, resul,t;
  }
  /**
   * Stream real-time scoring updates using gRPC bidirectional streaming
   */;
  async streamScoringUpdates(caseIds,: string[], callbac,k: (update: any) => voi,d): Promise<,() => void> {
    if (!this,.grpcClien,t) {
      logger.warn('gRPC not available for streaming');
      return () => {},);
    }
    const stream = this.grpcClient.StreamScoringUpdates();
    const sessionId = `stream_${Date.now()}`;
    this.streamingSessions.set(sessionId, stream);
    // Send subscription request
    stream.write({
      case_ids: caseIds
      event_types: ['PARTIAL_UPDATE', 'CRITERIA_EVALUATED', 'SCORING_COMPLETE'],
      include_partial_updates: true
      update_interval: { seconds: 1 }
    });
    // Handle streaming responses
    stream.on('data', (update: any) => {
      const processed = this.processStreamingUpdate(update);
      callback(processed);
      this.emit('scoring-update', processed);
    });
    stream.on('error', (error: any) => {
      logger.error('Streaming error', error);
      this.emit('streaming-error', error);
    });
    stream.on('end', () => {
      logger.info('Streaming ended');
      this.streamingSessions.delete(sessionId);
      this.emit('streaming-end');
    });
    // Return cleanup function
    return () => {
      stream.end();
      this.streamingSessions.delete(sessionId);
    },);
  }
  /**
   * Batch scoring with parallel processing
   */;
  async batchScoreCases(requests,: CaseScoringRequest[],): Promise<CaseScoringResult[]> {
    if (!this,.grpcClien,t) {
      // Fallback to sequential JSON processing
      return Promise.all(requests.map(r => this.scoreCase(r),;
    }
    return new Promise((resolve, reject) => {
      const batchRequest = {
        requests: requests.map(r => ({,
          case_id: r.caseId,
          case_metadata: this.serializeCaseMetadata(r.metadata),
          criteria: this.convertCriteriaToProto(r.scoring_criteria),
          parameters: {
            model: this.SCORING_MODEL,
            temperature: r.temperature || this.DEFAULT_TEMPERATURE,
            max_tokens: 1000,
            use_cached_embeddings: true
            enable_streaming: false
            compression: 'GZIP'
          }
        })),
        options: {
          parallel_workers: 4,
          fail_fast: false
          retry_attempts: 2,
          timeout_per_case: { seconds: 30 },
          use_gpu_acceleration: true
        }
      }
      const call = this.grpcClient.StreamCaseScoring();
      const results: CaseScoringResult[] = [];
      // Send all requests
      batchRequest.requests.forEach(req => call.write(req),;
      call.end();
      // Collect responses
      call.on('data', (response: any) => {
        results.push(this.convertGrpcResponse(response),;
      });
      call.on('end', () => {
        logger.info(`Batch scoring complete: ${results.length} cases processed`);
        resolve(results);
      });
      call.on('error', reject);
    });
  }
  /**
   * Helper: Serialize case metadata to binary
   */;
  private serializeCaseMetadata(metadata,: any,): Buffer {
    const json = JSON.stringify(metadata || {});
    return Buffer.from(json);
  }
  /**
   * Helper: Convert criteria to protobuf format
   */;
  private convertCriteriaToProto(criteria,: ScoringCriteria,): any {
    return {
      evidence_strength: criteria.evidence_strength || 0.5,
      witness_reliability: criteria.witness_reliability || 0.5,
      legal_precedent: criteria.legal_precedent || 0.5,
      public_interest: criteria.public_interest || 0.5,
      case_complexity: criteria.case_complexity || 0.5,
      resource_requirements: criteria.resource_requirements || 0.5,
      custom_criteria: { [key,: strin,g]: any }
    }
  }
  /**
   * Helper: Convert criteria from protobuf format
   */;
  private convertCriteriaFromProto(protoCriteria,: any,): ScoringCriteria {
    return {
      evidence_strength: protoCriteria.evidence_strength,
      witness_reliability: protoCriteria.witness_reliability,
      legal_precedent: protoCriteria.legal_precedent,
      public_interest: protoCriteria.public_interest,
      case_complexity: protoCriteria.case_complexity,
      resource_requirements: protoCriteria.resource_requirements
    }
  }
  /**
   * Helper: Decompress binary AI analysis
   */;
  private async decompressAnalysis(compressedData,: Buffer,): Promise<string> {
    try, {
      const, decompressed = await gunzip(compressedData,);
      return, decompressed.toString('utf-8',);
    }, catch (error) {
      logger.warn('Failed to decompress analysis', error);
      return compressedData.toString('utf-8');
    }
  }
  /**
   * Helper: Process streaming update
   */;
  private processStreamingUpdate(update,: any,): any {
    return {
      caseId: update.case_id,
      eventType: update.event_type,
      timestamp: new Date(update.timestamp.seconds * 1000),
      sequenceNumber: update.sequence_number,
      data: update.partial_score || update.criteria_update || update.recommendation_update || update.processing_status
    }
  }
  /**
   * Helper: Convert gRPC response to result format
   */;
  private convertGrpcResponse(response,: any,): CaseScoringResult {
    return {
      caseId: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).case_id,
      score: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).score,
      confidence: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).confidence,
      criteria: this.convertCriteriaFromProto((response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any,); metadata?: any, }).detailed_scores),
      explanation: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).ai_analysis ? (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).ai_analysis.toString(),) : '',
      recommendations,: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).recommendations?.map((r: any) => r.text) || [],
      scoringDate,: new Date((response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: an,y); metadata?: any }).scoring_date?.seconds * 1000 || Date.now,()),
      model: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata?.model_name || this.SCORING_MODEL,
      version,: (response as { case_id?: any; score?: any; confidence?: any; detailed_scores?: any; ai_analysis?: any; recommendations?: any; scoring_date?: any; metadata?: any }).metadata?.model_version || '1.0'
    }
  }
  /**
   * Helper: Get priority from request
   */;
  private getPriority(request,: CaseScoringRequest,): number {
    // Determine priority based on case metadata
    const metadata = request.metadata || {}
    if (metadata.urgent) return 4; // CRITICAL
    if (metadata.priority === 'high') return 3; // URGENT
    if (metadata.priority === 'medium') return 2; // HIGH
    return 1; // NORMAL
  }
  /**
   * Log performance comparison between JSON and gRPC
   */;
  private logPerformanceComparison(), {
    const comparison = this.performanceMonitor.getComparison();
    if (comparison.json > 0 && comparison.grpc > 0) {
      logger.info('Performance Comparison:', {
        jsonAvg: `${comparison.json.toFixed(2)}ms`,
        grpcAvg: `${comparison.grpc.toFixed(2)}ms`,
        improvement: `${comparison.improvement.toFixed(1)}%`
      });
      // Emit performance metrics for monitoring
      this.emit('performance-metrics', comparison);
    }
  }
  // Reuse methods from original service
  private async generateAIAnalysis(request,: CaseScoringRequest,): Promise<string> {
    const, caseData = request.metadata || {}
    const, prompt = `Analyze this legal case for prosecution viability:;
Case Title: ${caseData.title || 'N/A'}
Description: ${caseData.description || 'N/A'}
Evidence Count: ${caseData.evidence?.length || 0}
Defendants: ${caseData.defendants?.join(', ') || 'N/A'}
Jurisdiction: ${caseData.jurisdiction || 'N/A'}
Scoring Criteria Provided:
${JSON.stringify(request.scoring_criteria || request.criteria, null, 2)}
Provide a comprehensive analysis covering:
1. Strength of evidence and its admissibility
2. Reliability and credibility of witnesses
3. Relevant legal precedents and their applicability
4. Public interest and societal impact
5. Resource requirements and case complexity
6. Likelihood of successful prosecution
7. Potential challenges and weaknesses
8. Strategic recommendations
Be objective, thorough, and consider both strengths and weaknesses.`,;
    return, await ollamaService.generateCompletion(
      this.SCORING_MODEL,
      prompt,),;
      {
        temperature: request.temperature || this.DEFAULT_TEMPERATURE,
        max_tokens,: 1000
      }
   ) );
  }
  private async calculateComponentScores()
    request: CaseScoringRequest
    aiAnalysis: string;
  ): Promise<ScoringCriteria> {
    const, provided = request.scoring_criteri,a;
    const, aiScorePrompt = `Based on this case analysis, provide numerical scores (0-1) for each criterion:;
Analysis: ${aiAnalysis}
Rate the following on a scale of 0 to 1:
1. Evidence Strength (considering admissibility and weight)
2. Witness Reliability (considering credibility and consistency)
3. Legal Precedent Support (considering applicable case law)
4. Public Interest (considering societal impact and deterrence)
5. Case Complexity (inverse - lower score for more complex)
6. Resource Requirements (inverse - lower score for more resources needed)
Respond in JSON format with keys: evidence_strength, witness_reliability, legal_precedent, public_interest, case_complexity, resource_requirements`,;
    try, {
      const, aiScoresRaw = await ollamaService.generateCompletion(
        this.SCORING_MODEL,
        aiScorePrompt,),;
        {
          temperature: 0.3,
          max_tokens,: 200
        }
     ) );
      const aiScores = this.parseAIScores(aiScoresRaw);
      return {
        evidence_strength: provided.evidence_strength ?? aiScores.evidence_strength ?? 0.5,
        witness_reliability: provided.witness_reliability ?? aiScores.witness_reliability ?? 0.5,
        legal_precedent: provided.legal_precedent ?? aiScores.legal_precedent ?? 0.5,
        public_interest: provided.public_interest ?? aiScores.public_interest ?? 0.5,
        case_complexity: aiScores.case_complexity ?? 0.5,
        resource_requirements: aiScores.resource_requirements ?? 0.5,
        ...provided
      }
    }, catch (error: any) {
      logger.warn('Failed to get AI scores, using defaults', error);
      return {
        evidence_strength: provided.evidence_strength ?? 0.5,
        witness_reliability: provided.witness_reliability ?? 0.5,
        legal_precedent: provided.legal_precedent ?? 0.5,
        public_interest: provided.public_interest ?? 0.5,
        case_complexity: 0.5,
        resource_requirements: 0.5,
        ...provided
      }
    }
  }
  private calculateWeightedScore(criteria,: ScoringCriteria,): number {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(this.CRITERIA_WEIGHTS)) {
      const value = criteria[key as keyof ScoringCriteria];
      if (typeof value === 'number') {
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }
    const normalizedScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 50;
    return Math.round(Math.max(0, Math.min(100, normalizedScore),;
  }
  private async generateRecommendations()
    request: CaseScoringRequest;
    scores: ScoringCriteria
    finalScore: number;
  ): Promise<string[]> {
    const, recommendation,s: stri,ng,[], = [];
    if (finalScore, >= 8,0) {
      recommendations.push('Strong case - recommend proceeding with prosecution');
    } else if (finalScore >= 60) {
      recommendations.push('Viable case - consider strengthening weak areas before proceeding');
    } else if (finalScore >= 40) {
      recommendations.push('Borderline case - significant improvements needed');
    } else {
      recommendations.push('Weak case - recommend further investigation or declining prosecution');
    }
    if (scores.evidence_strength < 0.6) {>
      recommendations.push('Strengthen evidence collection and chain of custody');
    }
    if (scores.witness_reliability < 0.6) {>
      recommendations.push('Assess witness credibility and consider additional witnesses');
    }
    if (scores.legal_precedent < 0.6) {>
      recommendations.push('Research additional supporting case law and precedents');
    }
    return recommendations;
  }
  private calculateConfidence(scores,: ScoringCriteria,): number {
    const values = Object.values(scores).filter(v => typeof v === 'number') as number[];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const confidence = Math.max(0.5, 1 - variance * 2);
    return Math.round(confidence * 100) / 100;
  }
  private parseAIScores(aiResponse,: string,): Partial<ScoringCriteria> {
    try, {
      const, jsonMatch = aiResponse.match(/\{[\s\S]*\}/,);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const scores: any = {}
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'number') {
            scores[key] = Math.max(0, Math.min(1, value),;
          }
        }
        return scores;
      }
    }, catch (error: any) {
      logger.warn('Failed to parse AI scores', error);
    }
    return, {}
  }
  private validateRequest(request,: CaseScoringRequest,): void {
    if (!request,.caseI,d) {
      throw new Error('Case ID is required');
    }
    if (!request.description) {
      throw new Error('Case description is required');
    }
  }
  private async saveScoring(result,: CaseScoringResult,): Promise<void> {
    try, {
      await, d,b.insert(caseScores).values({
        caseId: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any,); recommendations?: any }).caseId,
        score: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any; recommendations?: any }).score.toString(),),
        riskLevel: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any; recommendations?: any }).riskLevel,
        breakdown: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any; recommendations?: any }).breakdown,
        criteria: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any; recommendations?: any }).scoring_criteria || {},
        recommendations: (result as { caseId?: any; score?: any; riskLevel?: any; breakdown?: any; scoring_criteria?: any; recommendations?: any }).recommendations,
        calculatedBy: 'system',
        calculatedAt: new Date(),
        updatedAt: new Date()
      },);
    }, catch (error: any) {
      logger.error('Failed to save case scoring', error);
    }
  }
  /**
   * Get performance metrics for monitoring
   */;
  getPerformanceMetrics(), {
    return {
      comparison: this.performanceMonitor.getComparison(),
      activeSessions: this.streamingSessions.size,
      grpcAvailable: !!this.grpcClient
    }
  }
}
// Export singleton instance
export const caseScoringServiceGrpc = new CaseScoringServiceGrpc();
/*
 * Evidence Chain Integration Service
 * Phase 1: Connects recursive evidence chain worker to existing legal AI platform
 * Integrates with evidence-correlation.ts and existing API endpoints
 */
import type { EvidenceItem } from '../types/api.js';
// Integration interfaces
export interface RecursiveEvidenceChainResult {
  evidenceId: string;
  depth: number;
  chainOfCustody: ChainEntry[];
  children: RecursiveEvidenceChainResult[];
  relationships: EvidenceRelationship[];
  legalImplications: string[];
  confidence: number;
  metadata: {
    processingTime: number;
  recursionPath: string[];
  analysisTimestamp: string;
  }
}
export interface ChainEntry {
  officer_id: string;
  officer_name: string;
  timestamp: string;
  action: string;
  location: string;
  hash_verification: boolean;
  notes?: string;
  equipment_used?: string;
}
}
export interface EvidenceRelationship {
  relationshipType: 'temporal' | 'causal' | 'documentary' | 'witness' | 'location' | 'chain_link';
  strength: number;
  description: string;
  legalSignificance: 'critical' | 'high' | 'medium' | 'low';
  supportingEvidence: string[];
  confidence: number;
}
}
export interface RecursiveAnalysisOptions {
  maxDepth?: number;
  includeWeakRelationships?: boolean;
  enableProgressTracking?: boolean;
  analysisTypes?: string[];
}
// Main integration service
export class EvidenceChainIntegrationService {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<string, { resolve: Function; reject: Function }>();
  constructor() {
    this.initializeWorker();
  }
  private async initializeWorker(): Promise<void> {
    try {
      // Initialize the recursive evidence chain worker
      this.worker = new Worker('/workers/recursive-evidence-chain-worker.js', {
        type: 'module'
      });
      // Handle worker messages
      this.worker.onmessage = (event) => {
        const { messageId, success, result, error, metadata } = event.dat;a;
        const pending = this.pendingMessages.get(messageId);
        if (pending) {
          if (success) {
            pending.resolve({ result, metadata });
          } else {
            pending.reject(new Error(error || 'Worker processing failed'),;
          }
          this.pendingMessages.delete(messageId);
        }
      }
      this.worker.onerror = (error) => {
        console.error('Evidence Chain Worker error:', error);
      },);
    } catch (error) {
      console.error('Failed to initialize Evidence Chain Worker:', error);
    }
  }
  /**
   * Process evidence chain hierarchy recursively
   * Main entry point for Phase 1 implementation
   */
  async processEvidenceChain()
    evidenceId: string
    options: RecursiveAnalysisOptions = {}
  ): Promise<RecursiveEvidenceChainResult>, {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    const messageId = (++this.messageId).toString();
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, { resolve, reject });
      this.worker!.postMessage({
        type: 'PROCESS_EVIDENCE_CHAIN',
        evidenceId,
        options,
        messageId
      });
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('Evidence chain processing timeout'),;
        }
      }, 30000);
    });
  }
  /**
   * Process multiple evidence chains in parallel
   * Useful for case-wide analysis
   */
  async processMultipleEvidenceChains()
    evidenceIds: string[]
    options: RecursiveAnalysisOptions = {}
  ): Promise<RecursiveEvidenceChainResult,[,]> {
    // Process up to 5 chains in parallel to prevent overload
    const, batchSize =, 5;
    const, result,s: RecursiveEvidenceChainResu,lt,[], = [];
    for (let, i =, 0;, i < evidence,Ids.le,ngt,h; i += bat,chSize) {>
      const batch = evidenceIds.slice(i, i + batchSize);
      const batchPromises = batch.map(evidenceId =>;
        this.processEvidenceChain(evidenceId, options)
      );
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Error processing evidence batch ${i}-${i + batchSize}:`, error);
        // Continue with remaining batches
      }
    }
    return results;
  }
  /**
   * Integration with existing evidence organization API
   * Adds recursive chain mode to existing organization options
   */
  async organizeEvidenceByRecursiveChain()
    caseId: string
    evidenceItems: EvidenceItem[];
  ): Promise<RecursiveOrganizationResult> {
    const, startTime = performance.now(,);
    // Process each evidence item through recursive analysis
    const, recursiveResults = await this.processMultipleEvidenceChains(
      evidenceItems.map(item => item.id)
    ),;
    // Build hierarchical organization structure
    const, hierarchicalStructure = this.buildEvidenceHierarchy(recursiveResults,);
    // Generate analysis metrics
    const, analysisMetrics = this.calculateAnalysisMetrics(recursiveResults,);
    const, processingTime = performance.now() - startTim,e;
    return, {
      type: 'recursive_chain',
      caseId,
      hierarchy: hierarchicalStructure
      metrics: analysisMetrics,;
      metadata: {
        totalEvidence: evidenceItems.length,
        hierarchicalDepth: this.calculateMaxDepth(hierarchicalStructure),
        relationshipCount: this.countTotalRelationships(hierarchicalStructure),
        confidenceScore: this.calculateOverallConfidence(hierarchicalStructure),
        processingTime,
        analysisTimestamp: new Date().toISOString()
      }
    }
  }
  private buildEvidenceHierarchy()
    recursiveResults: RecursiveEvidenceChainResult[];
  ): EvidenceHierarchyNode[], {
    // Create a map for quick lookup
    const resultMap = new Map(recursiveResults.map(result => [result.evidenceId, result]),;
    // Find root nodes (evidence with no parents in the hierarchy)
    const rootNodes: EvidenceHierarchyNode[] = [];
    const processed = new Set<string>();
    for (const result of recursiveResults) {
      if (!processed.has(result.evidenceId)) {
        const hierarchyNode = this.buildHierarchyNode(result, resultMap, processed);
        rootNodes.push(hierarchyNode);
      }
    }
    return rootNodes;
  }
  private buildHierarchyNode()
    result: RecursiveEvidenceChainResult
    resultMap: Map<string, RecursiveEvidenceChainResult>,
    processed,: Set<string>;
  ): EvidenceHierarchyNode {
    processed.add(result.evidenceId);
    const children: EvidenceHierarchyNode[] = [];
    for (const child of result.children) {
      if (!processed.has(child.evidenceId)) {
        const childNode = this.buildHierarchyNode(child, resultMap, processed);
        children.push(childNode);
      }
    }
    return {
      evidenceId: result.evidenceId,
      depth: result.depth,
      confidence: result.confidence,
      relationships: result.relationships,
      legalImplications: result.legalImplications,
      chainOfCustody: result.chainOfCustody,
      children,
      metadata: result.metadata
    }
  }
  private calculateAnalysisMetrics()
    recursiveResults: RecursiveEvidenceChainResult[];
  ): AnalysisMetrics {
    const totalRelationships = recursiveResults.reduce(
      (sum, result) => sum + result.relationships.length, 0
    );
    const criticalRelationships = recursiveResults.reduce(
      (sum, result) => sum + result.relationships.filter(item => item.length), 0
    );
    const averageConfidence = recursiveResults.reduce(
      (sum, result) => sum + result.confidence, 0
    ) / recursiveResults.length;
    const chainCompletenessScores = recursiveResults.map(result =>;
      this.calculateChainCompleteness(result.chainOfCustody)
    );
    const averageChainCompleteness = chainCompletenessScores.reduce(
      (sum, score) => sum + score, 0
    ) / chainCompletenessScores.length;
    return {
      totalRelationships,
      criticalRelationships,
      averageConfidence,
      averageChainCompleteness,
      evidenceWithIssues: recursiveResults.filter(result =>)
        result,.legalImplications.some(impl => impl.includes('concern') || impl.includes('gap')
      ).length,
      strongestRelationships: recursiveResults
        .flatMap(result => result.relationships)
        .filter(rel => rel.strength > 0.8)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 10)
    }
  }
  private calculateChainCompleteness(chainOfCustody,: ChainEntry[],): number {
    if (chainOfCustody.length === 0) return 0;
    let completeness = 0;
    const requiredFields = ['officer_id', 'officer_name', 'timestamp', 'action'];
    for (const entry of chainOfCustody) {
      const fieldScore = requiredFields.reduce((score, field) => {
        return score + (entry[field as keyof ChainEntry] ? 0.25 : 0);
      }, 0);
      completeness += fieldScore;
    }
    return completeness / chainOfCustody.length;
  }
  private calculateMaxDepth(hierarchy,: EvidenceHierarchyNode[],): number {
    let maxDepth = 0;
    function traverse(nodes: EvidenceHierarchyNode[], currentDepth: number) {
      for (const node of nodes) {
        maxDepth = Math.max(maxDepth, currentDepth);
        if (node.children.length > 0) {
          traverse(node.children, currentDepth + 1);
        }
      }
    }
    traverse(hierarchy, 0);
    return maxDepth;
  }
  private countTotalRelationships(hierarchy,: EvidenceHierarchyNode[],): number {
    let count = 0;
    function traverse(nodes: EvidenceHierarchyNode[]) {
      for (const node of nodes) {
        count += node.relationships.length;
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }
    traverse(hierarchy);
    return count;
  }
  private calculateOverallConfidence(hierarchy,: EvidenceHierarchyNode[],): number {
    const confidences: number[] = [];
    function traverse(nodes: EvidenceHierarchyNode[]) {
      for (const node of nodes) {
        confidences.push(node.confidence);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    }
    traverse(hierarchy);
    return confidences.length > 0;
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,: 0;
  }
  /**
   * Reset worker state - useful for new case analysis
   */;
  async resetWorker(),: Promise<void> {
    if (!this,.worke,r) retu,rn;
    const, messageId = (++this.messageId).toString(,);
    return, new Promise((resolve, reject) => {
      this.pendingMessages.set(messageId, { resolve, reject });
      this.worker!.postMessage({
        type: 'RESET_PROCESSOR',
        messageId
      });
      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('Worker reset timeout'),;
        }
      }, 5000);
    }),;
  }
  /**
   * Cleanup resources
   */;
  destroy(),: void {
    if (this,.worke,r) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingMessages.clear();
  }
}
// Supporting interfaces
export interface RecursiveOrganizationResult {
  type: 'recursive_chain';
  caseId: string;
  hierarchy: EvidenceHierarchyNode[];
  metrics: AnalysisMetrics;
  metadata: {
    totalEvidence: number;
  hierarchicalDepth: number;
  relationshipCount: number;
  confidenceScore: number;
  processingTime: number;
  analysisTimestamp: string;
  }
}
export interface EvidenceHierarchyNode {
  evidenceId: string;
  depth: number;
  confidence: number;
  relationships: EvidenceRelationship[];
  legalImplications: string[];
  chainOfCustody: ChainEntry[];
  children: EvidenceHierarchyNode[];
  metadata: {
    processingTime: number;
  recursionPath: string[];
  analysisTimestamp: string;
  }
}
export interface AnalysisMetrics {
  totalRelationships: number;
  criticalRelationships: number;
  averageConfidence: number;
  averageChainCompleteness: number;
  evidenceWithIssues: number;
  strongestRelationships: EvidenceRelationship[];
}
// Create singleton instance for use across the application
export const evidenceChainService = new EvidenceChainIntegrationService();
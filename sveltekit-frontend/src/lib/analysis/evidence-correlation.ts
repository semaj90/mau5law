/*
 * Advanced Evidence Correlation Engine
 * Sophisticated analysis of evidence relationships and patterns
 */

import { z } from 'zod';
import type { EvidenceItem } from '../types/api';

// Correlation analysis schemas
const CorrelationAnalysisSchema = z.object({
  evidenceIds: z.array(z.string().uuid()),
  analysisType: z
    .enum(['temporal', 'semantic', 'entity', 'causal', 'comprehensive'])
    .default('comprehensive'),
  confidenceThreshold: z.number().min(0).max(1).default(0.6),
  includeWeakCorrelations: z.boolean().default(false),
  timeWindow: z
    .object({
      unit: z.enum(['hours', 'days', 'weeks', 'months']),
      value: z.number().positive(),
    })
    .optional(),
});

const PatternDetectionSchema = z.object({
  evidenceIds: z.array(z.string().uuid()),
  patternTypes: z.array(z.enum(['sequence', 'cluster', 'anomaly', 'trend', 'cycle'])),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  includeMetadata: z.boolean().default(true),
});

// Correlation types and interfaces
interface CorrelationResult {
  evidenceA: string;
  evidenceB: string;
  correlationType: 'temporal' | 'semantic' | 'entity' | 'causal' | 'location';
  strength: number;
  confidence: number;
  description: string;
  supportingFactors: string[];
  implications: string[];
  visualData?: CorrelationVisualization;
}

interface CorrelationVisualization {
  type: 'timeline' | 'network' | 'heatmap' | 'scatter';
  data: any;
  layout: {
    nodes?: NetworkNode[];
    edges?: NetworkEdge[];
    timeline?: TimelineEvent[];
  };
}

interface NetworkNode {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
  metadata: Record<string, any>;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
  label?: string;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  duration?: number;
  type: string;
  description: string;
  evidenceIds: string[];
}

interface PatternMatch {
  patternId: string;
  patternType: 'sequence' | 'cluster' | 'anomaly' | 'trend' | 'cycle';
  confidence: number;
  evidenceIds: string[];
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  legalImplications: string[];
  visualization?: PatternVisualization;
}

interface PatternVisualization {
  type: string;
  data: any;
  highlights: string[];
}

interface EntityRelationship {
  entityA: string;
  entityB: string;
  relationship: string;
  confidence: number;
  evidenceBasis: string[];
  legalSignificance: string;
}

interface CausalChain {
  chainId: string;
  events: CausalEvent[];
  strength: number;
  legalTheory: string;
  supportingEvidence: string[];
}

interface CausalEvent {
  eventId: string;
  description: string;
  timestamp: Date;
  causality: 'cause' | 'effect' | 'mediating';
  evidenceId: string;
}

// Advanced Evidence Correlation Engine
export class EvidenceCorrelationEngine {
  // Main correlation analysis
  static analyzeCorrelations(
    evidence: EvidenceItem[],
    analysisType: string,
    confidenceThreshold: number
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        const evidenceA = evidence[i];
        const evidenceB = evidence[j];

        // Temporal correlation
        if (analysisType === 'temporal' || analysisType === 'comprehensive') {
          const temporalCorr = this.analyzeTemporalCorrelation(evidenceA, evidenceB);
          if (temporalCorr.confidence >= confidenceThreshold) {
            correlations.push(temporalCorr);
          }
        }

        // Semantic correlation
        if (analysisType === 'semantic' || analysisType === 'comprehensive') {
          const semanticCorr = this.analyzeSemanticCorrelation(evidenceA, evidenceB);
          if (semanticCorr.confidence >= confidenceThreshold) {
            correlations.push(semanticCorr);
          }
        }

        // Entity correlation
        if (analysisType === 'entity' || analysisType === 'comprehensive') {
          const entityCorr = this.analyzeEntityCorrelation(evidenceA, evidenceB);
          if (entityCorr.confidence >= confidenceThreshold) {
            correlations.push(entityCorr);
          }
        }

        // Causal correlation
        if (analysisType === 'causal' || analysisType === 'comprehensive') {
          const causalCorr = this.analyzeCausalCorrelation(evidenceA, evidenceB);
          if (causalCorr.confidence >= confidenceThreshold) {
            correlations.push(causalCorr);
          }
        }
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength);
  }

  // Temporal correlation analysis
  static analyzeTemporalCorrelation(
    evidenceA: EvidenceItem,
    evidenceB: EvidenceItem
  ): CorrelationResult {
    const timeA = new Date(evidenceA.uploadedAt);
    const timeB = new Date(evidenceB.uploadedAt);
    const timeDiff = Math.abs(timeA.getTime() - timeB.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Stronger correlation for evidence closer in time
    const strength = Math.max(0, 1 - daysDiff / 30); // 30-day window
    const confidence = strength > 0.3 ? 0.8 : 0.4;

    let description = '';
    let implications: string[] = [];

    if (daysDiff < 1) {
      description = 'Evidence created within the same day';
      implications = ['Potential coordinated activity', 'Same event or incident'];
    } else if (daysDiff < 7) {
      description = `Evidence created within ${Math.round(daysDiff)} days`;
      implications = ['Related activities or follow-up actions', 'Sequence of events'];
    } else {
      description = `Evidence created ${Math.round(daysDiff)} days apart`;
      implications = ['Potentially unrelated timing', 'Different phases of case'];
    }

    return {
      evidenceA: evidenceA.id,
      evidenceB: evidenceB.id,
      correlationType: 'temporal',
      strength,
      confidence,
      description,
      supportingFactors: [`Time difference: ${daysDiff.toFixed(1)} days`],
      implications,
      visualData: {
        type: 'timeline',
        data: { timeA, timeB, timeDiff },
        layout: {
          timeline: [
            {
              id: evidenceA.id,
              timestamp: timeA,
              type: evidenceA.type,
              description: evidenceA.filename,
              evidenceIds: [evidenceA.id],
            },
            {
              id: evidenceB.id,
              timestamp: timeB,
              type: evidenceB.type,
              description: evidenceB.filename,
              evidenceIds: [evidenceB.id],
            },
          ],
        },
      },
    };
  }

  // Semantic correlation analysis
  static analyzeSemanticCorrelation(
    evidenceA: EvidenceItem,
    evidenceB: EvidenceItem
  ): CorrelationResult {
    const tagsA = evidenceA.aiAnalysis?.tags || [];
    const tagsB = evidenceB.aiAnalysis?.tags || [];
    const lawsA = evidenceA.aiAnalysis?.legalImplications || [];
    const lawsB = evidenceB.aiAnalysis?.legalImplications || [];

    // Calculate tag overlap
    const tagOverlap = this.calculateJaccardSimilarity(tagsA, tagsB);
    const lawOverlap = this.calculateJaccardSimilarity(lawsA, lawsB);

    const strength = (tagOverlap + lawOverlap) / 2;
    const confidence = strength > 0.5 ? 0.9 : 0.6;

    const commonTags = tagsA.filter((tag: string) => tagsB.includes(tag));
    const commonLaws = lawsA.filter((law: string) => lawsB.includes(law));

    return {
      evidenceA: evidenceA.id,
      evidenceB: evidenceB.id,
      correlationType: 'semantic',
      strength,
      confidence,
      description: `Semantic similarity: ${(strength * 100).toFixed(0)}%`,
      supportingFactors: [
        `Common tags: ${commonTags.join(', ') || 'None'}`,
        `Common legal areas: ${commonLaws.join(', ') || 'None'}`,
      ],
      implications: [
        strength > 0.7 ? 'Highly related content' : 'Moderately related content',
        'Similar legal implications',
        'Potential for joint analysis',
      ],
    };
  }

  // Entity correlation analysis
  static analyzeEntityCorrelation(
    evidenceA: EvidenceItem,
    evidenceB: EvidenceItem
  ): CorrelationResult {
    // Extract entities from filenames and analysis (simplified)
    const entitiesA = this.extractEntitiesFromEvidence(evidenceA);
    const entitiesB = this.extractEntitiesFromEvidence(evidenceB);

    const entityOverlap = this.calculateJaccardSimilarity(entitiesA, entitiesB);
    const strength = entityOverlap;
    const confidence = entityOverlap > 0.3 ? 0.85 : 0.5;

    const commonEntities = entitiesA.filter((entity) => entitiesB.includes(entity));

    return {
      evidenceA: evidenceA.id,
      evidenceB: evidenceB.id,
      correlationType: 'entity',
      strength,
      confidence,
      description: `Shared entities: ${commonEntities.length}`,
      supportingFactors: [`Common entities: ${commonEntities.join(', ') || 'None'}`],
      implications: [
        commonEntities.length > 0
          ? 'Involves same parties or objects'
          : 'Different entities involved',
        'Potential witness overlap',
        'Shared jurisdiction or venue',
      ],
    };
  }

  // Causal correlation analysis
  static analyzeCausalCorrelation(
    evidenceA: EvidenceItem,
    evidenceB: EvidenceItem
  ): CorrelationResult {
    const timeA = new Date(evidenceA.uploadedAt);
    const timeB = new Date(evidenceB.uploadedAt);

    // Determine temporal sequence
    const isSequential = Math.abs(timeA.getTime() - timeB.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
    const earlier = timeA < timeB ? evidenceA : evidenceB;
    const later = timeA < timeB ? evidenceB : evidenceA;

    // Analyze content for causal indicators
    const causalStrength = this.detectCausalRelationship(earlier, later);
    const strength = isSequential ? causalStrength : causalStrength * 0.5;
    const confidence = strength > 0.4 ? 0.75 : 0.4;

    return {
      evidenceA: evidenceA.id,
      evidenceB: evidenceB.id,
      correlationType: 'causal',
      strength,
      confidence,
      description: strength > 0.6 ? 'Strong causal relationship' : 'Potential causal relationship',
      supportingFactors: [
        `Sequential timing: ${isSequential ? 'Yes' : 'No'}`,
        `Causal indicators present: ${strength > 0.4 ? 'Yes' : 'No'}`,
      ],
      implications: [
        'Potential cause-and-effect relationship',
        'Chain of events evidence',
        'Timeline reconstruction support',
      ],
    };
  }

  // Pattern detection
  static detectPatterns(evidence: EvidenceItem[], patternTypes: string[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    if (patternTypes.includes('sequence')) {
      patterns.push(...this.detectSequencePatterns(evidence));
    }

    if (patternTypes.includes('cluster')) {
      patterns.push(...this.detectClusterPatterns(evidence));
    }

    if (patternTypes.includes('anomaly')) {
      patterns.push(...this.detectAnomalyPatterns(evidence));
    }

    if (patternTypes.includes('trend')) {
      patterns.push(...this.detectTrendPatterns(evidence));
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  // Sequence pattern detection
  static detectSequencePatterns(evidence: EvidenceItem[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Sort by time
    const sortedEvidence = [...evidence].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

    // Look for sequential patterns
    for (let i = 0; i < sortedEvidence.length - 2; i++) {
      const sequence = sortedEvidence.slice(i, i + 3);
      const sequenceStrength = this.analyzeSequenceStrength(sequence);

      if (sequenceStrength > 0.6) {
        patterns.push({
          patternId: `sequence_${i}`,
          patternType: 'sequence',
          confidence: sequenceStrength,
          evidenceIds: sequence.map((e) => e.id),
          description: `Sequential pattern: ${sequence.map((e) => e.filename).join(' → ')}`,
          significance: sequenceStrength > 0.8 ? 'high' : 'medium',
          legalImplications: [
            'Establishes chronological order',
            'Supports chain of events theory',
            'Timeline evidence for case narrative',
          ],
        });
      }
    }

    return patterns;
  }

  // Cluster pattern detection
  static detectClusterPatterns(evidence: EvidenceItem[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Group evidence by time windows
    const timeWindows = this.groupEvidenceByTimeWindows(evidence, 24); // 24-hour windows

    for (const [window, evidenceGroup] of Object.entries(timeWindows)) {
      if (evidenceGroup.length >= 3) {
        const clusterStrength = this.analyzeClusterStrength(evidenceGroup);

        patterns.push({
          patternId: `cluster_${window}`,
          patternType: 'cluster',
          confidence: clusterStrength,
          evidenceIds: evidenceGroup.map((e) => e.id),
          description: `Evidence cluster: ${evidenceGroup.length} items in ${window}`,
          significance: evidenceGroup.length > 5 ? 'high' : 'medium',
          legalImplications: [
            'Concentrated activity period',
            'Potential coordinated actions',
            'Critical time period identification',
          ],
        });
      }
    }

    return patterns;
  }

  // Anomaly pattern detection
  static detectAnomalyPatterns(evidence: EvidenceItem[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Detect time gaps
    const sortedEvidence = [...evidence].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

    for (let i = 0; i < sortedEvidence.length - 1; i++) {
      const timeGap =
        new Date(sortedEvidence[i + 1].uploadedAt).getTime() -
        new Date(sortedEvidence[i].uploadedAt).getTime();
      const daysGap = timeGap / (1000 * 60 * 60 * 24);

      if (daysGap > 14) {
        // Significant gap
        patterns.push({
          patternId: `anomaly_gap_${i}`,
          patternType: 'anomaly',
          confidence: Math.min(0.9, daysGap / 30),
          evidenceIds: [sortedEvidence[i].id, sortedEvidence[i + 1].id],
          description: `Significant time gap: ${Math.round(daysGap)} days`,
          significance: daysGap > 30 ? 'high' : 'medium',
          legalImplications: [
            'Missing evidence period',
            'Potential evidence destruction',
            'Case timeline gap requiring explanation',
          ],
        });
      }
    }

    return patterns;
  }

  // Trend pattern detection
  static detectTrendPatterns(evidence: EvidenceItem[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Analyze volume trends over time
    const monthlyVolume = this.calculateMonthlyEvidenceVolume(evidence);
    const trend = this.analyzeTrend(monthlyVolume);

    if (Math.abs(trend.slope) > 0.5) {
      patterns.push({
        patternId: 'volume_trend',
        patternType: 'trend',
        confidence: Math.min(0.9, Math.abs(trend.slope)),
        evidenceIds: evidence.map((e) => e.id),
        description: `Evidence volume trend: ${trend.direction} (${trend.slope > 0 ? 'increasing' : 'decreasing'})`,
        significance: Math.abs(trend.slope) > 1 ? 'high' : 'medium',
        legalImplications: [
          trend.slope > 0 ? 'Escalating situation' : 'De-escalating situation',
          'Activity pattern analysis',
          'Case development timeline',
        ],
      });
    }

    return patterns;
  }

  // Network analysis for entity relationships
  static buildEvidenceNetwork(
    evidence: EvidenceItem[],
    correlations: CorrelationResult[]
  ): {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    communities: string[][];
    centralNodes: string[];
  } {
    const nodes: NetworkNode[] = evidence.map((e) => ({
      id: e.id,
      label: e.filename,
      type: e.type,
      size: (e.aiAnalysis?.prosecutionScore || 0.5) * 100,
      color: this.getNodeColor(e.type),
      metadata: {
        uploadDate: e.uploadedAt,
        prosecutionScore: e.aiAnalysis?.prosecutionScore,
        relevantLaws: e.aiAnalysis?.relevantLaws,
      },
    }));

    const edges: NetworkEdge[] = correlations.map((corr) => ({
      source: corr.evidenceA,
      target: corr.evidenceB,
      weight: corr.strength,
      type: corr.correlationType,
      label: `${corr.correlationType} (${(corr.strength * 100).toFixed(0)}%)`,
    }));

    // Detect communities using simple clustering
    const communities = this.detectCommunities(nodes, edges);

    // Find central nodes (high degree)
    const centralNodes = this.findCentralNodes(nodes, edges);

    return { nodes, edges, communities, centralNodes };
  }

  // Helper methods
  static calculateJaccardSimilarity(setA: string[], setB: string[]): number {
    const a = new Set(setA.map((s) => s.toLowerCase()));
    const b = new Set(setB.map((s) => s.toLowerCase()));
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  static extractEntitiesFromEvidence(evidence: EvidenceItem): string[] {
    const entities: string[] = [];

    // Extract from filename
    const nameEntities = evidence.filename.match(/[A-Z][a-z]+/g) || [];
    entities.push(...nameEntities);

    // Extract from AI analysis if available
    if (evidence.aiAnalysis?.suggestedTags) {
      entities.push(...evidence.aiAnalysis.suggestedTags);
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  static detectCausalRelationship(earlier: EvidenceItem, later: EvidenceItem): number {
    // Simplified causal detection based on content analysis
    const causalWords = ['because', 'due to', 'resulted in', 'caused', 'led to', 'triggered'];
    const summary = later.aiAnalysis?.summary || '';

    const causalCount = causalWords.filter((word) =>
      summary.toLowerCase().includes(word.toLowerCase())
    ).length;

    return Math.min(1, causalCount * 0.3);
  }

  static analyzeSequenceStrength(sequence: EvidenceItem[]): number {
    let strength = 0.5; // Base strength

    // Check time intervals
    const intervals = [];
    for (let i = 0; i < sequence.length - 1; i++) {
      const timeA = new Date(sequence[i].uploadedAt);
      const timeB = new Date(sequence[i + 1].uploadedAt);
      intervals.push(timeB.getTime() - timeA.getTime());
    }

    // Regular intervals increase strength
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
      intervals.length;

    const regularityScore = 1 - Math.sqrt(variance) / avgInterval;
    strength += regularityScore * 0.3;

    return Math.min(1, strength);
  }

  static analyzeClusterStrength(evidenceGroup: EvidenceItem[]): number {
    // Analyze semantic similarity within cluster
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < evidenceGroup.length; i++) {
      for (let j = i + 1; j < evidenceGroup.length; j++) {
        const tagsA = evidenceGroup[i].aiAnalysis?.suggestedTags || [];
        const tagsB = evidenceGroup[j].aiAnalysis?.suggestedTags || [];
        totalSimilarity += this.calculateJaccardSimilarity(tagsA, tagsB);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  static groupEvidenceByTimeWindows(
    evidence: EvidenceItem[],
    windowHours: number
  ): Record<string, EvidenceItem[]> {
    const windows: Record<string, EvidenceItem[]> = {};

    evidence.forEach((e) => {
      const date = new Date(e.uploadedAt);
      const windowStart = new Date(date);
      windowStart.setHours(Math.floor(date.getHours() / windowHours) * windowHours, 0, 0, 0);
      const windowKey = windowStart.toISOString();

      if (!windows[windowKey]) {
        windows[windowKey] = [];
      }
      windows[windowKey].push(e);
    });

    return windows;
  }

  static calculateMonthlyEvidenceVolume(
    evidence: EvidenceItem[]
  ): { month: string; count: number }[] {
    const monthlyCounts: Record<string, number> = {};

    evidence.forEach((e) => {
      const date = new Date(e.uploadedAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthlyCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  static analyzeTrend(data: { month: string; count: number }[]): {
    slope: number;
    direction: string;
  } {
    if (data.length < 2) return { slope: 0, direction: 'flat' };

    // Simple linear regression
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.count, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.count, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'flat';

    return { slope, direction };
  }

  static getNodeColor(type: string): string {
    const colors = {
      document: '#3B82F6',
      image: '#10B981',
      video: '#F59E0B',
      audio: '#8B5CF6',
      other: '#6B7280',
    };
    return colors[type as keyof typeof colors] || colors.other;
  }

  static detectCommunities(nodes: NetworkNode[], edges: NetworkEdge[]): string[][] {
    // Simplified community detection using connected components
    const communities: string[][] = [];
    const visited = new Set<string>();

    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        const community = this.exploreComponent(node.id, edges, visited);
        if (community.length > 1) {
          communities.push(community);
        }
      }
    });

    return communities;
  }

  static exploreComponent(nodeId: string, edges: NetworkEdge[], visited: Set<string>): string[] {
    const component: string[] = [nodeId];
    visited.add(nodeId);

    const connectedEdges = edges.filter((e) => e.source === nodeId || e.target === nodeId);
    connectedEdges.forEach((edge) => {
      const nextNode = edge.source === nodeId ? edge.target : edge.source;
      if (!visited.has(nextNode)) {
        component.push(...this.exploreComponent(nextNode, edges, visited));
      }
    });

    return component;
  }

  static findCentralNodes(nodes: NetworkNode[], edges: NetworkEdge[]): string[] {
    const degrees = new Map<string, number>();

    nodes.forEach((node) => degrees.set(node.id, 0));

    edges.forEach((edge) => {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    });

    const avgDegree = Array.from(degrees.values()).reduce((sum, d) => sum + d, 0) / degrees.size;

    return Array.from(degrees.entries())
      .filter(([_, degree]) => degree > avgDegree * 1.5)
      .map(([nodeId, _]) => nodeId);
  }
}

// Export correlation analysis functions
export {
  CorrelationAnalysisSchema,
  PatternDetectionSchema,
  type CorrelationResult,
  type PatternMatch,
  type NetworkNode,
  type NetworkEdge,
  type EntityRelationship,
  type CausalChain
};

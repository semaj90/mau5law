/*
 * Unified Evidence Analysis API
 * Integrates all four advanced features: Vector Search, Strategy Engine, WASM Processing, Evidence Correlation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { AdvancedSimilarityEngine } from '../vector/similarity-engine';
import { LegalStrategyEngine } from '../strategy/strategy-engine';
import { WasmLegalProcessor } from '$lib/wasm/legal-processor';
import { EvidenceCorrelationEngine } from '$lib/analysis/evidence-correlation';

// Local alias when the imported type is a namespace or complex — treat as any for iterative fixes
type EvidenceItemImported = any;

// Local minimal EvidenceItem shape used for the mock DB and iterative typing fixes
type EvidenceItemLocal = {
  id: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
  aiAnalysis?: any;
};

// Helper to produce an Error-like payload acceptable to SvelteKit `error()` calls
function makeErrorBody(err: unknown) {
  if (err instanceof z.ZodError) {
    return { message: 'Invalid request parameters', details: err.errors } as any;
  }
  if (err instanceof Error) {
    return { message: err.message } as any;
  }
  return { message: String(err) } as any;
}

// Unified analysis request schema
const UnifiedAnalysisSchema = z.object({
  evidenceIds: z.array(z.string().uuid()),
  analysisScope: z.object({
    vectorSimilarity: z.boolean().default(true),
    strategyRecommendations: z.boolean().default(true),
    wasmProcessing: z.boolean().default(false), // Computationally expensive
    correlationAnalysis: z.boolean().default(true)
  }),
  parameters: z.object({
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    strategyType: z.enum(['evidence-driven', 'settlement', 'aggressive', 'comprehensive']).default('comprehensive'),
    correlationConfidence: z.number().min(0).max(1).default(0.6),
    includeVisualization: z.boolean().default(true)
  }),
  context: z.object({
    caseType: z.string().optional(),
    jurisdiction: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    clientObjectives: z.array(z.string()).optional()
  }).optional()
});

interface UnifiedAnalysisResult {
  analysisId: string;
  timestamp: Date;
  evidenceCount: number;

  // Vector similarity results
  vectorAnalysis?: {
    similarityGroups: Array<{
      groupId: string;
      evidenceIds: string[];
      averageSimilarity: number;
      keyThemes: string[];
    }>;
    outliers: string[];
    recommendedActions: string[];
  };

  // Strategy recommendations
  strategyAnalysis?: {
    primaryStrategy: string;
    alternativeStrategies: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
      mitigations: string[];
    };
    outcomeProjections: Array<{
      scenario: string;
      probability: number;
      description: string;
    }>;
  };

  // WASM processing results
  wasmAnalysis?: {
    processedEvidence: Array<{
      evidenceId: string;
      entities: string[];
      citations: string[];
      readabilityScore: number;
      fingerprint: string;
    }>;
    crossDocumentSimilarity: Array<{
      evidenceA: string;
      evidenceB: string;
      similarity: number;
    }>;
    qualityMetrics: {
      averageReadability: number;
      uniqueDocuments: number;
      duplicateGroups: Array<string[]>;
    };
  };

  // Correlation analysis
  correlationAnalysis?: {
    correlations: Array<{
      evidenceA: string;
      evidenceB: string;
      type: string;
      strength: number;
      legalImplication: string;
    }>;
    patterns: Array<{
      type: string;
      description: string;
      significance: string;
      evidenceIds: string[];
    }>;
    networkAnalysis: {
      centralEvidence: string[];
      communities: Array<string[]>;
      weakLinks: Array<{
        evidenceA: string;
        evidenceB: string;
        reason: string;
      }>;
    };
  };

  // Unified insights
  unifiedInsights: {
    keyFindings: string[];
    criticalGaps: string[];
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      rationale: string;
      estimatedImpact: string;
    }>;
    visualizations: Array<{
      type: 'timeline' | 'network' | 'similarity-matrix' | 'strategy-tree';
      title: string;
      data: any;
      insights: string[];
    }>;
  };

  // Performance metrics
  performance: {
    processingTimeMs: number;
    vectorSearchMs?: number;
    strategyAnalysisMs?: number;
    wasmProcessingMs?: number;
    correlationAnalysisMs?: number;
    totalEvidenceProcessed: number;
    memoryUsageMb: number;
  };
}

// Mock evidence database (replace with actual database calls)
const mockEvidenceDatabase: EvidenceItemLocal[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    filename: 'contract-breach-email.pdf',
    size: 156000,
    type: 'document',
    uploadedAt: '2024-01-15T10:30:00Z',
    aiAnalysis: {
      summary: 'Email chain discussing contract breach and potential remedies',
      suggestedTags: ['contract', 'breach', 'remedies', 'commercial'],
      relevantLaws: ['Contract Law', 'Commercial Code'],
      prosecutionScore: 0.85,
      defenseScore: 0.35,
      keyEntities: ['ABC Corp', 'John Smith', 'Master Service Agreement'],
      timeline: [
        { date: '2024-01-10', event: 'Initial breach notification' },
        { date: '2024-01-12', event: 'Response from defendant' }
      ]
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    filename: 'financial-records-Q4.xlsx',
    size: 89000,
    type: 'document',
    uploadedAt: '2024-01-16T14:20:00Z',
    aiAnalysis: {
      summary: 'Financial records showing damages from contract breach',
      suggestedTags: ['financial', 'damages', 'quarterly', 'commercial'],
      relevantLaws: ['Contract Law', 'Commercial Damages'],
      prosecutionScore: 0.92,
      defenseScore: 0.25,
      keyEntities: ['ABC Corp', 'Q4 2023', 'Revenue Loss'],
      timeline: [
        { date: '2024-01-01', event: 'Q4 period start' },
        { date: '2024-01-15', event: 'Damage calculation completed' }
      ]
    }
  }
];

export const POST: RequestHandler = async ({ params, request }) => {
  const startTime = Date.now();
  let vectorSearchTime = 0;
  let strategyTime = 0;
  let wasmTime = 0;
  let correlationTime = 0;

  try {
    const requestData = await request.json();
    const analysisRequest = UnifiedAnalysisSchema.parse(requestData);

    // Get evidence items
    const evidence = mockEvidenceDatabase.filter(e =>
      analysisRequest.evidenceIds.includes(e.id)
    );

    if (evidence.length === 0) {
      throw error(404, new Error('No evidence found for provided IDs'));
    }

    const result: UnifiedAnalysisResult = {
      analysisId: `unified_${Date.now()}`,
      timestamp: new Date(),
      evidenceCount: evidence.length,
      unifiedInsights: {
        keyFindings: [],
        criticalGaps: [],
        recommendations: [],
        visualizations: []
      },
      performance: {
        processingTimeMs: 0,
        totalEvidenceProcessed: evidence.length,
        memoryUsageMb: 0
      }
    };

    // 1. Vector Similarity Analysis
    if (analysisRequest.analysisScope.vectorSimilarity) {
      const vectorStart = Date.now();

      const similarityResults = await AdvancedSimilarityEngine.performSimilaritySearch({
        query: 'comprehensive evidence analysis',
        evidenceIds: analysisRequest.evidenceIds,
        algorithms: ['semantic', 'legal', 'temporal', 'contextual'],
        clustering: true,
        threshold: analysisRequest.parameters.similarityThreshold,
      });

      // Process similarity results into groups
      const similarityGroups =
        similarityResults.clusters?.map((cluster: any, index: number) => ({
          groupId: `cluster_${index}`,
          evidenceIds: cluster.evidenceIds,
          averageSimilarity: cluster.coherenceScore,
          keyThemes: cluster.themes || [],
        })) || [];

      const outliers = evidence
        .filter((e) => !similarityGroups.some((g: any) => (g?.evidenceIds || []).includes(e.id)))
        .map((e) => e.id);

      result.vectorAnalysis = {
        similarityGroups,
        outliers,
        recommendedActions: [
          similarityGroups.length > 1
            ? 'Multiple evidence themes identified - consider separate analysis tracks'
            : 'Evidence shows unified theme',
          outliers.length > 0
            ? `${outliers.length} outlier documents require special attention`
            : 'All evidence shows strong correlation',
          'Use clustering results to optimize case presentation structure',
        ],
      };

      vectorSearchTime = Date.now() - vectorStart;
      result.performance.vectorSearchMs = vectorSearchTime;
    }

    // 2. Strategy Analysis
    if (analysisRequest.analysisScope.strategyRecommendations) {
      const strategyStart = Date.now();

      const strategyResults = await LegalStrategyEngine.generateStrategy({
        evidenceIds: analysisRequest.evidenceIds,
        strategyType: analysisRequest.parameters.strategyType,
        caseContext: analysisRequest.context || {},
        includeRiskAssessment: true,
        generateAlternatives: true,
      });

      result.strategyAnalysis = {
        primaryStrategy: strategyResults.primaryApproach?.name || '',
        alternativeStrategies: (strategyResults.alternativeApproaches || []).map(
          (a: any) => a?.name || ''
        ),
        riskAssessment: {
          level: strategyResults.riskAssessment?.overallRisk || 'medium',
          factors: strategyResults.riskAssessment?.riskFactors || [],
          mitigations: strategyResults.riskAssessment?.mitigationStrategies || [],
        },
        outcomeProjections: strategyResults.outcomeProjections || [],
      };

      strategyTime = Date.now() - strategyStart;
      result.performance.strategyAnalysisMs = strategyTime;
    }

    // 3. WASM Processing (optional - computationally expensive)
    if (analysisRequest.analysisScope.wasmProcessing) {
      const wasmStart = Date.now();

      const wasmProcessor = new WasmLegalProcessor();
      await wasmProcessor.initialize();

      const processedResults: Array<{
        evidenceId: string;
        entities: string[];
        citations: string[];
        readabilityScore: number;
        fingerprint: string;
      }> = await Promise.all(
        evidence.map(async (e) => {
          const analysis: any = await wasmProcessor.processDocument({
            content: `Mock content for ${e.filename}`,
            metadata: { filename: e.filename, type: e.type }
          } as any);

          return {
            evidenceId: e.id,
            entities: (analysis?.entities as string[]) || [],
            citations: (analysis?.citations as string[]) || [],
            readabilityScore: (analysis?.readabilityScore as number) || 0,
            fingerprint: (analysis?.fingerprint as string) || '',
          };
        })
      );

      // Calculate cross-document similarity
      const crossSimilarity: Array<{ evidenceA: string; evidenceB: string; similarity: number }> =
        [];
      for (let i = 0; i < processedResults.length; i++) {
        for (let j = i + 1; j < processedResults.length; j++) {
          const simScore = await wasmProcessor.calculateSimilarity(
            processedResults[i].fingerprint,
            processedResults[j].fingerprint
          );
          crossSimilarity.push({
            evidenceA: processedResults[i].evidenceId,
            evidenceB: processedResults[j].evidenceId,
            similarity: simScore,
          });
        }
      }

      // Quality metrics
      const readabilityScores = processedResults.map((r) => r.readabilityScore);
      const averageReadability =
        readabilityScores.reduce((sum, score) => sum + score, 0) / readabilityScores.length;

      // Detect duplicates (similarity > 0.9)
      const duplicateGroups: string[][] = [];
      const processed = new Set();
      crossSimilarity.forEach((sim) => {
        if (
          (sim as any).similarity > 0.9 &&
          !processed.has((sim as any).evidenceA) &&
          !processed.has((sim as any).evidenceB)
        ) {
          duplicateGroups.push([(sim as any).evidenceA, (sim as any).evidenceB]);
          processed.add((sim as any).evidenceA);
          processed.add((sim as any).evidenceB);
        }
      });

      result.wasmAnalysis = {
        processedEvidence: processedResults,
        crossDocumentSimilarity: crossSimilarity,
        qualityMetrics: {
          averageReadability,
          uniqueDocuments: evidence.length - duplicateGroups.length,
          duplicateGroups,
        },
      };

      wasmTime = Date.now() - wasmStart;
      result.performance.wasmProcessingMs = wasmTime;
    }

    // 4. Correlation Analysis
    if (analysisRequest.analysisScope.correlationAnalysis) {
      const correlationStart = Date.now();

      // Analyze correlations
      const correlations = EvidenceCorrelationEngine.analyzeCorrelations(
        evidence as any as EvidenceItemImported[],
        'comprehensive',
        analysisRequest.parameters.correlationConfidence
      );

      // Detect patterns
      const patterns = EvidenceCorrelationEngine.detectPatterns(
        evidence as any as EvidenceItemImported[],
        ['sequence', 'cluster', 'anomaly', 'trend']
      );

      // Build network analysis
      const networkAnalysis = EvidenceCorrelationEngine.buildEvidenceNetwork(
        evidence as any as EvidenceItemImported[],
        correlations
      );

      // Identify weak links (low correlation evidence)
      const weakLinks = evidence
        .filter(e => !correlations.some(c => c.evidenceA === e.id || c.evidenceB === e.id))
        .map(e => ({
          evidenceA: e.id,
          evidenceB: 'isolated',
          reason: 'No significant correlations found with other evidence'
        }));

      result.correlationAnalysis = {
        correlations: correlations.map(c => ({
          evidenceA: c.evidenceA,
          evidenceB: c.evidenceB,
          type: c.correlationType,
          strength: c.strength,
          legalImplication: c.implications[0] || 'Requires further analysis'
        })),
        patterns: patterns.map(p => ({
          type: p.patternType,
          description: p.description,
          significance: p.significance,
          evidenceIds: p.evidenceIds
        })),
        networkAnalysis: {
          centralEvidence: networkAnalysis.centralNodes,
          communities: networkAnalysis.communities,
          weakLinks
        }
      };

      correlationTime = Date.now() - correlationStart;
      result.performance.correlationAnalysisMs = correlationTime;
    }

    // Generate Unified Insights
    const keyFindings = [];
    const criticalGaps = [];
    const recommendations = [];
    const visualizations = [];

    // Consolidate findings from all analyses
    if (result.vectorAnalysis) {
      keyFindings.push(`Identified ${result.vectorAnalysis.similarityGroups.length} distinct evidence themes`);
      if ((result.vectorAnalysis.outliers || []).length > 0) {
        criticalGaps.push(`${(result.vectorAnalysis.outliers || []).length} pieces of evidence lack thematic connection`);
      }

      // Timeline visualization
      visualizations.push({
        type: 'timeline' as const,
        title: 'Evidence Timeline with Similarity Clustering',
        data: {
          events: evidence.map(e => ({
            id: e.id,
            date: e.uploadedAt,
            title: e.filename,
            cluster: result.vectorAnalysis?.similarityGroups.find((g: any) => (g?.evidenceIds || []).includes(e.id))?.groupId
          }))
        },
        insights: ['Timeline shows evidence clustering patterns', 'Potential coordination of activities visible']
      });
    }

    if (result.strategyAnalysis) {
      keyFindings.push(`Primary strategy recommendation: ${result.strategyAnalysis.primaryStrategy}`);
      keyFindings.push(`Risk level assessed as: ${result.strategyAnalysis.riskAssessment.level}`);

      recommendations.push({
        priority: 'high' as const,
        action: `Implement ${result.strategyAnalysis.primaryStrategy} strategy`,
        rationale: `Analysis shows this approach optimizes case strengths`,
        estimatedImpact: 'Significant improvement in case outcome probability'
      });

      // Strategy tree visualization
      visualizations.push({
        type: 'strategy-tree' as const,
        title: 'Legal Strategy Decision Tree',
        data: {
          primary: result.strategyAnalysis.primaryStrategy,
          alternatives: result.strategyAnalysis.alternativeStrategies,
          outcomes: result.strategyAnalysis.outcomeProjections
        },
        insights: ['Multiple viable strategies identified', 'Risk mitigation options available']
      });
    }

    if (result.wasmAnalysis) {
      keyFindings.push(`Document quality: ${result.wasmAnalysis.qualityMetrics.averageReadability.toFixed(1)}/10 readability`);
      if (result.wasmAnalysis.qualityMetrics.duplicateGroups.length > 0) {
        criticalGaps.push(`Duplicate documents detected: ${result.wasmAnalysis.qualityMetrics.duplicateGroups.length} groups`);
      }
    }

    if (result.correlationAnalysis) {
      keyFindings.push(`Found ${result.correlationAnalysis.correlations.length} significant evidence correlations`);
      keyFindings.push(`Detected ${result.correlationAnalysis.patterns.length} evidence patterns`);

      if (result.correlationAnalysis.networkAnalysis.centralEvidence.length > 0) {
        recommendations.push({
          priority: 'high' as const,
          action: 'Focus case narrative on central evidence pieces',
          rationale: 'Network analysis identifies key evidence with high connectivity',
          estimatedImpact: 'Strengthens overall case coherence and impact'
        });
      }

      // Network visualization
      visualizations.push({
        type: 'network' as const,
        title: 'Evidence Correlation Network',
        data: {
          nodes: evidence.map(e => ({ id: e.id, label: e.filename })),
          edges: result.correlationAnalysis.correlations.map(c => ({
            source: c.evidenceA,
            target: c.evidenceB,
            weight: c.strength,
            type: c.type
          }))
        },
        insights: ['Evidence network shows connection patterns', 'Central nodes identified for case focus']
      });
    }

    // Add general recommendations
    if (criticalGaps.length === 0) {
      keyFindings.push('Evidence set appears comprehensive with good coverage');
    } else {
      recommendations.push({
        priority: 'medium' as const,
        action: 'Address identified evidence gaps',
        rationale: 'Strengthening weak areas will improve case robustness',
        estimatedImpact: 'Enhanced case completeness and reduced vulnerability'
      });
    }

    result.unifiedInsights = {
      keyFindings,
      criticalGaps,
      recommendations: recommendations.sort((a, b) =>
        a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
      ),
      visualizations
    };

    // Calculate final performance metrics
    const totalTime = Date.now() - startTime;
    result.performance.processingTimeMs = totalTime;
    result.performance.memoryUsageMb = process.memoryUsage().heapUsed / 1024 / 1024;

    return json(result);

  } catch (err) {
    console.error('Unified analysis error:', err);

    if (err instanceof z.ZodError) {
      throw error(400, new Error(JSON.stringify(makeErrorBody(err))));
    }

    throw error(500, new Error(JSON.stringify(makeErrorBody(err))));
  }
};

// GET endpoint for analysis status and capabilities
export const GET: RequestHandler = async ({ url }) => {
  const capabilities = {
    vectorSimilarity: {
      available: true,
      algorithms: ['semantic', 'legal', 'temporal', 'contextual'],
      features: ['clustering', 'outlier-detection', 'multi-dimensional-scoring']
    },
    strategyRecommendations: {
      available: true,
      types: ['evidence-driven', 'settlement', 'aggressive', 'comprehensive'],
      features: ['risk-assessment', 'outcome-projections', 'precedent-analysis']
    },
    wasmProcessing: {
      available: true,
      features: ['document-extraction', 'entity-detection', 'citation-parsing', 'similarity-calculation'],
      performance: 'high-performance-client-side'
    },
    correlationAnalysis: {
      available: true,
      types: ['temporal', 'semantic', 'entity', 'causal'],
      features: ['pattern-detection', 'network-analysis', 'anomaly-detection']
    },
    unifiedAnalysis: {
      available: true,
      features: ['cross-feature-insights', 'comprehensive-recommendations', 'visualization-generation']
    }
  };

  const status = {
    timestamp: new Date().toISOString(),
    systemHealth: 'operational',
    availableFeatures: Object.keys(capabilities).length,
    version: '1.0.0'
  };

  return json({ capabilities, status });
};

/*
 * Evidence Organization API Route
 * POST /api/v1/evidence/organize/[caseId] - Organize evidence for a case
 * Supports multiple organization modes with AI clustering using Gemma embeddings
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { EvidenceCRUDService } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// Organization request schema
const OrganizationRequestSchema = z.object({
  organizationMode: z.enum(['category', 'timeline', 'priority', 'ai_clusters', 'chain_custody']),
  filters: z.object({
    evidenceType: z.string().optional(),
    dateRange: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional()
  }).optional(),
  aiClusteringParams: z.object({
    minClusterSize: z.number().min(1).default(2),
    maxClusters: z.number().min(1).max(20).default(10),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    method: z.enum(['kmeans', 'hierarchical', 'dbscan']).default('kmeans')
  }).optional(),
  includeAnalytics: z.boolean().default(true)
});

/*
 * POST /api/v1/evidence/organize/[caseId]
 * Organize evidence for a specific case using various methods
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    const { caseId } = params;
    if (!caseId) {
      return error(
        400,
        makeHttpErrorPayload({ message: 'Case ID is required', code: 'MISSING_CASE_ID' })
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      organizationMode,
      filters = {},
      aiClusteringParams = {},
      includeAnalytics
    } = OrganizationRequestSchema.parse(body);

    // Create evidence service
    const evidenceService = new EvidenceCRUDService(locals.user.id);

    // Get evidence for the case
    const evidenceResult = await evidenceService.listByCase(caseId, {
      page: 1,
      limit: 1000,
      ...(filters && { filters })
    });

    if (!evidenceResult || !evidenceResult.data) {
      return error(
        500,
        makeHttpErrorPayload({
          message: 'Failed to retrieve evidence',
          code: 'EVIDENCE_FETCH_FAILED',
          details: 'Service returned invalid response'
        })
      );
    }

    const evidence = evidenceResult.data;

    // Organize evidence based on mode
    let organizationStructure;
    let analytics = {};

    switch (organizationMode) {
      case 'category':
        organizationStructure = await organizeByCategory(evidence);
        break;
      case 'timeline':
        organizationStructure = await organizeByTimeline(evidence);
        break;
      case 'priority':
        organizationStructure = await organizeByPriority(evidence);
        break;
      case 'ai_clusters':
        organizationStructure = await organizeByAIClusters(evidence, aiClusteringParams);
        break;
      case 'chain_custody':
        organizationStructure = await organizeByChainOfCustody(evidence);
        break;
      default:
        organizationStructure = await organizeByCategory(evidence);
    }

    // Generate analytics if requested
    if (includeAnalytics) {
      analytics = generateOrganizationAnalytics(evidence, organizationStructure);
    }

    return json({
      success: true,
      data: {
        caseId,
        organizationMode,
        structure: organizationStructure,
        analytics,
        metadata: {
          totalEvidence: evidence.length,
          organizedAt: new Date().toISOString(),
          organizationMethod: organizationMode,
          filtersApplied: filters
        }
      },
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
        action: 'evidence_organized'
      }
    });

  } catch (err: any) {
    console.error('Error organizing evidence:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid organization request',
          code: 'INVALID_DATA',
          details: err.errors
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to organize evidence',
        code: 'ORGANIZATION_FAILED',
        details: err.message
      })
    );
  }
};

/**
 * Organize evidence by category
 */
async function organizeByCategory(evidence: any[]) {
  const categories = {};

  evidence.forEach(item => {
    const category = item.evidenceType || 'uncategorized';
    if (!categories[category]) {
      categories[category] = {
        name: category,
        displayName: formatCategoryName(category),
        evidence: [],
        count: 0,
        priority: calculateCategoryPriority(category)
      };
    }
    categories[category].evidence.push(item);
    categories[category].count++;
  });

  return {
    type: 'category',
    categories: Object.values(categories).sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0)),
    metadata: {
      totalCategories: Object.keys(categories).length,
      method: 'evidence_type_classification'
    }
  };
}

/**
 * Organize evidence by timeline
 */
async function organizeByTimeline(evidence: any[]) {
  const timelineEvidence = evidence
    .filter(item => item.collected_at || item.uploaded_at || item.incident_date)
    .sort((a, b) => {
      const dateA = new Date(a.collected_at || a.uploaded_at || a.incident_date);
      const dateB = new Date(b.collected_at || b.uploaded_at || b.incident_date);
      return dateB.getTime() - dateA.getTime();
    });

  // Group by time periods
  const periods = {};
  timelineEvidence.forEach(item => {
    const date = new Date(item.collected_at || item.uploaded_at || item.incident_date);
    const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const periodLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!periods[periodKey]) {
      periods[periodKey] = {
        key: periodKey,
        label: periodLabel,
        evidence: [],
        count: 0,
        startDate: date,
        endDate: date
      };
    }

    periods[periodKey].evidence.push(item);
    periods[periodKey].count++;

    if (date < periods[periodKey].startDate) periods[periodKey].startDate = date;
    if (date > periods[periodKey].endDate) periods[periodKey].endDate = date;
  });

  const uncategorized = evidence.filter(item => 
    !item.collected_at && !item.uploaded_at && !item.incident_date
  );

  return {
    type: 'timeline',
    periods: Object.values(periods).sort((a, b) => b.startDate.getTime() - a.startDate.getTime()),
    uncategorized,
    metadata: {
      totalPeriods: Object.keys(periods).length,
      timelineSpan: calculateTimelineSpan(Object.values(periods)),
      uncategorizedCount: uncategorized.length
    }
  };
}

/**
 * Organize evidence by priority
 */
async function organizeByPriority(evidence: any[]) {
  const priorities = {
    critical: { name: 'Critical', evidence: [], color: '#dc2626', weight: 4 },
    high: { name: 'High', evidence: [], color: '#ea580c', weight: 3 },
    medium: { name: 'Medium', evidence: [], color: '#d97706', weight: 2 },
    low: { name: 'Low', evidence: [], color: '#65a30d', weight: 1 },
    unknown: { name: 'Unknown', evidence: [], color: '#6b7280', weight: 0 }
  };

  evidence.forEach(item => {
    const priority = item.metadata?.priority || 
                    calculateEvidencePriority(item) || 
                    'unknown';

    if (priorities[priority]) {
      priorities[priority].evidence.push(item);
    } else {
      priorities.unknown.evidence.push(item);
    }
  });

  // Add counts and filter empty priorities
  const nonEmptyPriorities = Object.values(priorities).filter(priority => {
    priority.count = priority.evidence.length;
    return priority.count > 0;
  });

  return {
    type: 'priority',
    priorities: nonEmptyPriorities.sort((a, b) => b.weight - a.weight),
    metadata: {
      priorityDistribution: nonEmptyPriorities.map(p => ({
        level: p.name.toLowerCase(),
        count: p.count,
        percentage: (p.count / evidence.length * 100).toFixed(1)
      }))
    }
  };
}

/**
 * Organize evidence using AI clustering with Gemma embeddings
 */
async function organizeByAIClusters(evidence: any[], clusteringParams: any) {
  try {
    // Step 1: Get or generate embeddings for all evidence
    const evidenceWithEmbeddings = await getEvidenceEmbeddings(evidence);

    // Step 2: Generate clusters using MCP server
    const clusters = await generateAIClusters(evidenceWithEmbeddings, clusteringParams);

    // Step 3: Enhance clusters with metadata
    const enhancedClusters = await enhanceClusters(clusters);

    return {
      type: 'ai_clusters',
      clusters: enhancedClusters,
      metadata: {
        totalClusters: enhancedClusters.length,
        clusteringMethod: 'gemma_embeddings',
        parameters: clusteringParams,
        averageClusterSize: enhancedClusters.length > 0 
          ? (evidence.length / enhancedClusters.length).toFixed(1)
          : 0,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('AI clustering failed:', error);
    
    // Fallback to category organization
    console.log('Falling back to category organization');
    return await organizeByCategory(evidence);
  }
}

/**
 * Organize evidence by chain of custody
 */
async function organizeByChainOfCustody(evidence: any[]) {
  const custodyChains = {};

  evidence.forEach(item => {
    const custody = item.chain_of_custody || [];
    const chainId = custody.length > 0 ? custody[0].officer_id || 'unknown' : 'no_chain';
    const chainStatus = validateChainOfCustody(custody);

    if (!custodyChains[chainId]) {
      custodyChains[chainId] = {
        id: chainId,
        officer: custody[0]?.officer_name || 'Unknown Officer',
        evidence: [],
        status: chainStatus,
        completeness: 0
      };
    }

    custodyChains[chainId].evidence.push({
      ...item,
      custodyStatus: chainStatus,
      custodySteps: custody.length
    });
  });

  // Calculate completeness and metrics for each chain
  Object.values(custodyChains).forEach(chain => {
    const completeChains = chain.evidence.filter(e => e.custodyStatus === 'complete').length;
    chain.completeness = (completeChains / chain.evidence.length) * 100;
    chain.count = chain.evidence.length;
    chain.averageSteps = chain.evidence.reduce((sum, e) => sum + e.custodySteps, 0) / chain.evidence.length;
  });

  return {
    type: 'chain_custody',
    chains: Object.values(custodyChains).sort((a, b) => b.completeness - a.completeness),
    metadata: {
      totalChains: Object.keys(custodyChains).length,
      overallCompleteness: evidence.filter(e => 
        validateChainOfCustody(e.chain_of_custody) === 'complete'
      ).length / evidence.length * 100,
      custodyStatistics: calculateCustodyStatistics(evidence)
    }
  };
}

/**
 * Get embeddings for evidence using MCP server
 */
async function getEvidenceEmbeddings(evidence: any[]) {
  const evidenceWithEmbeddings = [];

  for (const item of evidence) {
    try {
      // Check if embeddings already exist
      if (item.metadata?.aiAnalysis?.embeddingVector) {
        evidenceWithEmbeddings.push({
          ...item,
          embedding: item.metadata.aiAnalysis.embeddingVector
        });
        continue;
      }

      // Generate new embeddings using MCP server
      const response = await fetch('http://localhost:3002/mcp/evidence-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId: item.id,
          content: item.title + ' ' + (item.description || ''),
          useGemmaEmbeddings: true,
          analysisType: 'embedding_generation'
        })
      });

      if (response.ok) {
        const analysis = await response.json();
        evidenceWithEmbeddings.push({
          ...item,
          embedding: analysis.embedding || null
        });
      } else {
        evidenceWithEmbeddings.push({ ...item, embedding: null });
      }
    } catch (error) {
      console.warn(`Failed to get embedding for evidence ${item.id}:`, error);
      evidenceWithEmbeddings.push({ ...item, embedding: null });
    }
  }

  return evidenceWithEmbeddings;
}

/**
 * Generate AI clusters using MCP server
 */
async function generateAIClusters(evidenceWithEmbeddings: any[], params: any) {
  try {
    const response = await fetch('http://localhost:3002/mcp/cluster-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence: evidenceWithEmbeddings
          .filter(e => e.embedding)
          .map(e => ({
            id: e.id,
            title: e.title,
            type: e.evidenceType,
            description: e.description,
            embedding: e.embedding
          })),
        clusteringParams: {
          minClusterSize: params.minClusterSize || 2,
          maxClusters: params.maxClusters || 10,
          similarityThreshold: params.similarityThreshold || 0.7,
          method: params.method || 'kmeans'
        }
      })
    });

    if (response.ok) {
      const clusterData = await response.json();
      return clusterData.clusters || [];
    }
  } catch (error) {
    console.error('MCP clustering failed:', error);
  }

  // Fallback: Simple similarity clustering
  return performSimpleClustering(evidenceWithEmbeddings);
}

/**
 * Enhance clusters with additional metadata
 */
async function enhanceClusters(clusters: any[]) {
  return clusters.map((cluster, index) => ({
    id: `cluster_${index}`,
    name: cluster.name || `Cluster ${index + 1}`,
    description: cluster.description || generateClusterDescription(cluster.evidence),
    evidence: cluster.evidence,
    count: cluster.evidence.length,
    similarity: cluster.averageSimilarity || 0.8,
    keywords: cluster.keywords || extractClusterKeywords(cluster.evidence),
    color: getClusterColor(index),
    centroid: cluster.centroid,
    coherence: calculateClusterCoherence(cluster.evidence)
  }));
}

/**
 * Generate organization analytics
 */
function generateOrganizationAnalytics(evidence: any[], structure: any) {
  const analytics = {
    totalEvidence: evidence.length,
    organizationEfficiency: 0,
    coverage: 0,
    qualityScore: 0,
    recommendations: []
  };

  // Calculate metrics based on organization type
  switch (structure.type) {
    case 'category':
      analytics.organizationEfficiency = structure.categories.length > 0 
        ? (evidence.length - (structure.categories.find(c => c.name === 'uncategorized')?.count || 0)) / evidence.length
        : 0;
      analytics.coverage = (structure.categories.length / Math.max(getUniqueEvidenceTypes(evidence).length, 1)) * 100;
      break;

    case 'ai_clusters':
      const totalClustered = structure.clusters.reduce((sum, cluster) => sum + cluster.count, 0);
      analytics.organizationEfficiency = totalClustered / evidence.length;
      analytics.coverage = structure.clusters.length > 0 ? 100 : 0;
      analytics.qualityScore = structure.clusters.reduce((sum, cluster) => sum + (cluster.similarity || 0), 0) / structure.clusters.length;
      break;

    case 'chain_custody':
      const completeChains = evidence.filter(e => validateChainOfCustody(e.chain_of_custody) === 'complete').length;
      analytics.organizationEfficiency = completeChains / evidence.length;
      analytics.coverage = (structure.chains.length / Math.max(evidence.length, 1)) * 100;
      break;
  }

  // Generate recommendations
  analytics.recommendations = generateRecommendations(evidence, structure, analytics);

  return analytics;
}

/**
 * Utility functions
 */
function formatCategoryName(category: string): string {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function calculateCategoryPriority(category: string): number {
  const priorities = {
    'physical_evidence': 10,
    'digital_evidence': 9,
    'document': 8,
    'testimony': 7,
    'photograph': 6,
    'video': 6,
    'audio': 5,
    'other': 1
  };
  return priorities[category] || 3;
}

function calculateEvidencePriority(evidence: any): string {
  // AI-based priority calculation
  if (evidence.metadata?.aiAnalysis?.importance > 0.8) return 'critical';
  if (evidence.metadata?.aiAnalysis?.importance > 0.6) return 'high';
  if (evidence.metadata?.aiAnalysis?.importance > 0.4) return 'medium';

  // Type-based priority
  if (evidence.evidenceType === 'physical_evidence') return 'high';
  if (evidence.evidenceType === 'digital_evidence') return 'high';
  if (evidence.evidenceType === 'testimony') return 'medium';

  return 'low';
}

function validateChainOfCustody(custody: any[]): string {
  if (!custody || custody.length === 0) return 'missing';

  const requiredFields = ['officer_id', 'timestamp', 'action'];
  const hasAllFields = custody.every(entry => 
    requiredFields.every(field => entry[field])
  );

  const isChronological = custody.every((entry, index) => {
    if (index === 0) return true;
    return new Date(entry.timestamp) >= new Date(custody[index - 1].timestamp);
  });

  if (hasAllFields && isChronological) return 'complete';
  if (hasAllFields) return 'incomplete';
  return 'invalid';
}

function calculateTimelineSpan(periods: any[]): any {
  if (periods.length === 0) return null;
  
  const allDates = periods.flatMap(p => [p.startDate, p.endDate]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  return {
    start: minDate.toISOString(),
    end: maxDate.toISOString(),
    durationDays: Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
  };
}

function calculateCustodyStatistics(evidence: any[]): any {
  const statuses = { complete: 0, incomplete: 0, missing: 0, invalid: 0 };
  
  evidence.forEach(item => {
    const status = validateChainOfCustody(item.chain_of_custody);
    statuses[status]++;
  });

  return {
    statusDistribution: statuses,
    totalWithCustody: evidence.filter(e => e.chain_of_custody?.length > 0).length,
    averageCustodySteps: evidence.reduce((sum, e) => sum + (e.chain_of_custody?.length || 0), 0) / evidence.length
  };
}

function performSimpleClustering(evidenceWithEmbeddings: any[]) {
  // Simple fallback clustering by evidence type
  const clusters = {};
  
  evidenceWithEmbeddings.forEach(item => {
    const type = item.evidenceType || 'other';
    if (!clusters[type]) {
      clusters[type] = {
        evidence: [],
        name: formatCategoryName(type),
        averageSimilarity: 0.5
      };
    }
    clusters[type].evidence.push(item);
  });

  return Object.values(clusters);
}

function generateClusterDescription(evidence: any[]): string {
  const types = [...new Set(evidence.map(e => e.evidenceType))];
  return `Contains ${evidence.length} items of types: ${types.join(', ')}`;
}

function extractClusterKeywords(evidence: any[]): string[] {
  const allText = evidence.map(e => (e.title + ' ' + (e.description || '')).toLowerCase()).join(' ');
  const words = allText.split(/\s+/).filter(word => word.length > 3);
  const wordCounts = {};

  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function getClusterColor(index: number): string {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
  return colors[index % colors.length];
}

function calculateClusterCoherence(evidence: any[]): number {
  // Simple coherence calculation based on evidence type diversity
  const types = new Set(evidence.map(e => e.evidenceType));
  return Math.max(0, 1 - (types.size / evidence.length));
}

function getUniqueEvidenceTypes(evidence: any[]): string[] {
  return [...new Set(evidence.map(e => e.evidenceType).filter(Boolean))];
}

function generateRecommendations(evidence: any[], structure: any, analytics: any): string[] {
  const recommendations = [];

  if (analytics.organizationEfficiency < 0.7) {
    recommendations.push('Consider improving evidence categorization for better organization');
  }

  if (structure.type === 'chain_custody' && analytics.organizationEfficiency < 0.8) {
    recommendations.push('Some evidence items are missing complete chain of custody documentation');
  }

  if (structure.type === 'ai_clusters' && analytics.qualityScore < 0.6) {
    recommendations.push('AI clustering quality is low - consider manual categorization or additional evidence analysis');
  }

  const uncategorized = evidence.filter(e => !e.evidenceType || e.evidenceType === 'other').length;
  if (uncategorized > evidence.length * 0.2) {
    recommendations.push('High number of uncategorized evidence - review and classify remaining items');
  }

  return recommendations;
}
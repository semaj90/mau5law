/*
 * Detective Mode Connection Mapping API Route
 * POST /api/v1/detective/connections - Generate connection maps for case analysis
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { CasesCRUDService, EvidenceCRUDService } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// Connection mapping request schema
const ConnectionMappingSchema = z.object({
  caseId: z.string().uuid(),
  focusTypes: z.array(z.enum(['people', 'evidence', 'locations', 'events', 'communications', 'financial'])).optional(),
  connectionStrength: z.number().min(0).max(1).default(0.5),
  maxDepth: z.number().min(1).max(5).default(3),
  options: z.object({
    includeWeakConnections: z.boolean().default(false),
    includePredictedConnections: z.boolean().default(true),
    clusterSimilar: z.boolean().default(true),
    timeWindow: z.string().optional(), // e.g., '30d', '7d', 'all'
    layout: z.enum(['force', 'circular', 'hierarchical', 'grid']).default('force'),
  }).optional(),
});

/*
 * POST /api/v1/detective/connections
 * Generate comprehensive connection maps for case analysis
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Parse request body
    const body = await request.json();
    const { caseId, entityTypes, connectionStrength, maxDepth, options = {} } = ConnectionMappingSchema.parse(body);

    // Create service instances
    const casesService = new CasesCRUDService(locals.user.id);
    const evidenceService = new EvidenceCRUDService(locals.user.id);

    // Verify case exists and user has access
    const caseData = await casesService.getById(caseId);
    if (!caseData) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'Case not found', code: 'CASE_NOT_FOUND' })
      );
    }

    // Get case evidence for connection analysis
    const evidenceResult = await evidenceService.listByCase(caseId, { page: 1, limit: 100 });
    const evidence = evidenceResult.data;

    console.log(`Generating connection map for case ${caseId} with ${evidence.length} evidence items`);

    // Generate connection map
    const connectionMap = await generateConnectionMap(
      caseData,
      evidence,
      entityTypes,
      connectionStrength,
      maxDepth,
      options
    );

    // Update case metadata with connection analysis
    await casesService.update(caseId, {
      metadata: {
        ...caseData.metadata,
        lastConnectionAnalysis: {
          timestamp: new Date().toISOString(),
          connectionStrength,
          maxDepth,
          entityTypes: entityTypes || 'all',
          analyzedBy: locals.user.id,
          nodesGenerated: connectionMap.nodes.length,
          edgesGenerated: connectionMap.edges.length,
        },
      },
    });

    return json({
      success: true,
      data: {
        caseId,
        connectionMap,
        metadata: {
          evidenceAnalyzed: evidence.length,
          connectionStrength,
          maxDepth,
          entityTypes: entityTypes || ['all'],
          analysisTime: new Date().toISOString(),
          layout: options.layout || 'force',
        },
      },
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
        action: 'connection_map_generated',
      },
    });

  } catch (err: any) {
    console.error('Error generating connection map:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid connection mapping request',
          code: 'INVALID_DATA',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to generate connection map',
        code: 'CONNECTION_MAP_FAILED',
        details: err.message,
      })
    );
  }
};

/*
 * Generate comprehensive connection map
 */
async function generateConnectionMap(
  caseData: any,
  evidence: any[],
  entityTypes?: string[],
  connectionStrength: number = 0.5,
  maxDepth: number = 3,
  options: any = {}
): Promise<any> {
  const map = {
    nodes: [],
    edges: [],
    clusters: [],
    statistics: {
      totalNodes: 0,
      totalEdges: 0,
      strongConnections: 0,
      weakConnections: 0,
      predictedConnections: 0,
    },
    layout: options.layout || 'force',
    metadata: {
      generated: new Date().toISOString(),
      parameters: { entityTypes, connectionStrength, maxDepth, options },
    },
  };

  try {
    const types = entityTypes || ['people', 'evidence', 'locations', 'events', 'communications', 'financial'];

    // Generate nodes for different entity types
    if (types.includes('evidence')) {
      const evidenceNodes = await generateEvidenceNodes(evidence);
      map.nodes.push(...evidenceNodes);
    }

    if (types.includes('people')) {
      const peopleNodes = await generatePeopleNodes(evidence);
      map.nodes.push(...peopleNodes);
    }

    if (types.includes('locations')) {
      const locationNodes = await generateLocationNodes(evidence);
      map.nodes.push(...locationNodes);
    }

    if (types.includes('events')) {
      const eventNodes = await generateEventNodes(evidence);
      map.nodes.push(...eventNodes);
    }

    if (types.includes('communications')) {
      const commNodes = await generateCommunicationNodes(evidence);
      map.nodes.push(...commNodes);
    }

    if (types.includes('financial')) {
      const financialNodes = await generateFinancialNodes(evidence);
      map.nodes.push(...financialNodes);
    }

    // Generate edges (connections) between nodes
    map.edges = await generateConnections(map.nodes, connectionStrength, options);

    // Generate clusters if enabled
    if (options.clusterSimilar) {
      map.clusters = await generateClusters(map.nodes, map.edges);
    }

    // Calculate statistics
    map.statistics = calculateConnectionStatistics(map.nodes, map.edges);
    map.statistics.totalNodes = map.nodes.length;
    map.statistics.totalEdges = map.edges.length;

    return map;

  } catch (error) {
    console.error('Connection map generation error:', error);
    return {
      ...map,
      error: 'Connection map generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/*
 * Generate evidence nodes with Gemma embeddings integration
 */
async function generateEvidenceNodes(evidence: any[]): Promise<any[]> {
  // Enhanced with MCP multi-core processing for semantic analysis
  const mcpEndpoint = 'http://localhost:3002';
  
  return await Promise.all(evidence.map(async (item, index) => {
    let semanticData = null;
    
    // Call MCP server for Gemma embeddings semantic analysis
    try {
      const response = await fetch(`${mcpEndpoint}/mcp/semantic-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.content || item.title || '',
          analysisType: 'evidence_classification',
          useGemmaEmbeddings: true
        })
      });
      
      if (response.ok) {
        semanticData = await response.json();
      }
    } catch (error) {
      console.warn(`MCP semantic analysis failed for evidence ${item.id}:`, error);
    }
    
    // Calculate importance based on semantic analysis + content length
    const contentScore = (item.content?.length || 0) / 1000;
    const semanticScore = semanticData?.importance || 0.5;
    const importance = Math.min((contentScore + semanticScore) / 2, 1) * 20 + 10;
    
    return {
      id: `evidence_${item.id}`,
      label: item.title || `Evidence ${index + 1}`,
      type: 'evidence',
      subtype: semanticData?.classification || item.evidenceType || 'unknown',
      size: importance,
      color: getNodeColor('evidence', semanticData?.classification || item.evidenceType),
      metadata: {
        originalId: item.id,
        createdAt: item.createdAt,
        evidenceType: item.evidenceType,
        hasAnalysis: !!item.metadata?.aiAnalysis,
        semanticClassification: semanticData?.classification,
        keyTerms: semanticData?.keyTerms || [],
        confidenceScore: semanticData?.confidence || 0,
        embeddingVector: semanticData?.embedding,
      },
      position: generateRandomPosition(),
    };
  }));
}

/*
 * Generate people nodes from evidence mentions
 */
async function generatePeopleNodes(evidence: any[]): Promise<any[]> {
  // Mock people extraction from evidence
  const people = [
    { id: 'person_1', name: 'John Doe', role: 'witness', mentions: 3 },
    { id: 'person_2', name: 'Jane Smith', role: 'subject', mentions: 5 },
    { id: 'person_3', name: 'Bob Johnson', role: 'investigator', mentions: 2 },
  ];

  return people.map(person => ({
    id: person.id,
    label: person.name,
    type: 'person',
    subtype: person.role,
    size: Math.min(person.mentions * 5 + 10, 30),
    color: getNodeColor('person', person.role),
    metadata: {
      role: person.role,
      mentions: person.mentions,
      importance: person.mentions > 3 ? 'high' : 'medium',
    },
    position: generateRandomPosition(),
  }));
}

/*
 * Generate location nodes
 */
async function generateLocationNodes(evidence: any[]): Promise<any[]> {
  // Mock location extraction
  const locations = [
    { id: 'loc_1', name: 'Office Building A', type: 'building', frequency: 4 },
    { id: 'loc_2', name: 'Central Park', type: 'public', frequency: 2 },
    { id: 'loc_3', name: 'Residential Area', type: 'residential', frequency: 3 },
  ];

  return locations.map(location => ({
    id: location.id,
    label: location.name,
    type: 'location',
    subtype: location.type,
    size: Math.min(location.frequency * 4 + 8, 25),
    color: getNodeColor('location', location.type),
    metadata: {
      locationType: location.type,
      frequency: location.frequency,
      significance: location.frequency > 3 ? 'high' : 'medium',
    },
    position: generateRandomPosition(),
  }));
}

/*
 * Generate event nodes
 */
async function generateEventNodes(evidence: any[]): Promise<any[]> {
  // Mock event extraction from evidence timestamps
  return evidence.slice(0, 5).map((item, index) => ({
    id: `event_${index + 1}`,
    label: `Event ${index + 1}`,
    type: 'event',
    subtype: 'evidence_collection',
    size: 15,
    color: getNodeColor('event', 'collection'),
    metadata: {
      timestamp: item.createdAt,
      relatedEvidence: [item.id],
      eventType: 'evidence_collection',
    },
    position: generateRandomPosition(),
  }));
}

/*
 * Generate communication nodes
 */
async function generateCommunicationNodes(evidence: any[]): Promise<any[]> {
  // Mock communication extraction
  const communications = [
    { id: 'comm_1', type: 'email', participants: 2, importance: 'high' },
    { id: 'comm_2', type: 'phone', participants: 2, importance: 'medium' },
    { id: 'comm_3', type: 'meeting', participants: 4, importance: 'high' },
  ];

  return communications.map(comm => ({
    id: comm.id,
    label: `${comm.type.toUpperCase()}`,
    type: 'communication',
    subtype: comm.type,
    size: comm.participants * 3 + 10,
    color: getNodeColor('communication', comm.type),
    metadata: {
      communicationType: comm.type,
      participants: comm.participants,
      importance: comm.importance,
    },
    position: generateRandomPosition(),
  }));
}

/*
 * Generate financial nodes
 */
async function generateFinancialNodes(evidence: any[]): Promise<any[]> {
  // Mock financial data extraction
  const financial = [
    { id: 'fin_1', type: 'transaction', amount: 1000, importance: 'high' },
    { id: 'fin_2', type: 'account', balance: 5000, importance: 'medium' },
    { id: 'fin_3', type: 'transfer', amount: 2500, importance: 'high' },
  ];

  return financial.map(fin => ({
    id: fin.id,
    label: `${fin.type.toUpperCase()}`,
    type: 'financial',
    subtype: fin.type,
    size: Math.min((fin.amount || fin.balance || 0) / 100 + 10, 30),
    color: getNodeColor('financial', fin.type),
    metadata: {
      financialType: fin.type,
      amount: fin.amount || fin.balance,
      importance: fin.importance,
    },
    position: generateRandomPosition(),
  }));
}

/*
 * Generate connections between nodes with Gemma embeddings similarity
 */
async function generateConnections(nodes: any[], connectionStrength: number, options: any): Promise<any[]> {
  const edges = [];
  const { includeWeakConnections = false, includePredictedConnections = true } = options;
  const mcpEndpoint = 'http://localhost:3002';

  // Generate connections between different node types
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];

      // Calculate connection strength using Gemma embeddings if available
      let strength = calculateConnectionStrength(node1, node2);
      
      // Enhance with semantic similarity using Gemma embeddings
      if (node1.metadata?.embeddingVector && node2.metadata?.embeddingVector) {
        try {
          const response = await fetch(`${mcpEndpoint}/mcp/vector-similarity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vector1: node1.metadata.embeddingVector,
              vector2: node2.metadata.embeddingVector,
              similarityType: 'cosine'
            })
          });
          
          if (response.ok) {
            const similarityData = await response.json();
            const semanticSimilarity = similarityData.similarity || 0;
            
            // Blend traditional connection strength with semantic similarity
            strength = (strength * 0.6) + (semanticSimilarity * 0.4);
          }
        } catch (error) {
          console.warn('Vector similarity calculation failed:', error);
        }
      }

      if (strength >= connectionStrength || (includeWeakConnections && strength >= 0.3)) {
        edges.push({
          id: `edge_${node1.id}_${node2.id}`,
          source: node1.id,
          target: node2.id,
          weight: strength,
          type: determineConnectionType(node1, node2),
          label: generateConnectionLabel(node1, node2, strength),
          color: getEdgeColor(strength),
          metadata: {
            strength,
            connectionType: determineConnectionType(node1, node2),
            predicted: strength < 0.7 && includePredictedConnections,
            semanticEnhanced: !!(node1.metadata?.embeddingVector && node2.metadata?.embeddingVector),
            sharedKeyTerms: getSharedKeyTerms(node1.metadata?.keyTerms || [], node2.metadata?.keyTerms || []),
          },
        });
      }
    }
  }

  return edges;
}

/*
 * Get shared key terms between two nodes
 */
function getSharedKeyTerms(terms1: string[], terms2: string[]): string[] {
  return terms1.filter(term => terms2.includes(term));
}

/*
 * Calculate connection strength between two nodes
 */
function calculateConnectionStrength(node1: any, node2: any): number {
  let baseStrength = 0.1;

  // Same type nodes have higher base connection
  if (node1.type === node2.type) {
    baseStrength += 0.2;
  }

  // Evidence-person connections
  if ((node1.type === 'evidence' && node2.type === 'person') ||
      (node1.type === 'person' && node2.type === 'evidence')) {
    baseStrength += 0.4;
  }

  // Location-evidence connections
  if ((node1.type === 'location' && node2.type === 'evidence') ||
      (node1.type === 'evidence' && node2.type === 'location')) {
    baseStrength += 0.3;
  }

  // Time-based connections (mock)
  if (node1.metadata?.timestamp && node2.metadata?.timestamp) {
    const timeDiff = Math.abs(new Date(node1.metadata.timestamp).getTime() -
                              new Date(node2.metadata.timestamp).getTime());
    if (timeDiff < 24 * 60 * 60 * 1000) { // Within 24 hours
      baseStrength += 0.3;
    }
  }

  // Add some randomness for demonstration
  baseStrength += Math.random() * 0.2;

  return Math.min(baseStrength, 1.0);
}

/*
 * Determine connection type between nodes
 */
function determineConnectionType(node1: any, node2: any): string {
  if (node1.type === 'evidence' && node2.type === 'evidence') return 'evidence_related';
  if (node1.type === 'person' && node2.type === 'person') return 'person_related';
  if ((node1.type === 'evidence' && node2.type === 'person') ||
      (node1.type === 'person' && node2.type === 'evidence')) return 'person_evidence';
  if ((node1.type === 'location' && node2.type === 'evidence') ||
      (node1.type === 'evidence' && node2.type === 'location')) return 'location_evidence';
  return 'general';
}

/*
 * Generate connection label
 */
function generateConnectionLabel(node1: any, node2: any, strength: number): string {
  if (strength > 0.8) return 'Strong';
  if (strength > 0.6) return 'Moderate';
  if (strength > 0.4) return 'Weak';
  return 'Predicted';
}

/*
 * Generate clusters of related nodes
 */
async function generateClusters(nodes: any[], edges: any[]): Promise<any[]> {
  // Simple clustering based on node types and strong connections
  const clusters = [];
  const nodeTypes = [...new Set(nodes.map(n => n.type))];

  nodeTypes.forEach((type, index) => {
    const typeNodes = nodes.filter(n => n.type === type);
    if (typeNodes.length > 1) {
      clusters.push({
        id: `cluster_${type}`,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Cluster`,
        nodes: typeNodes.map(n => n.id),
        color: getClusterColor(index),
        size: typeNodes.length,
      });
    }
  });

  return clusters;
}

/*
 * Calculate connection statistics
 */
function calculateConnectionStatistics(nodes: any[], edges: any[]): any {
  const strongConnections = edges.filter(e => e.weight > 0.7).length;
  const weakConnections = edges.filter(e => e.weight <= 0.5).length;
  const predictedConnections = edges.filter(e => e.metadata?.predicted).length;

  return {
    strongConnections,
    weakConnections,
    predictedConnections,
    averageConnections: edges.length > 0 ? (edges.reduce((sum, e) => sum + e.weight, 0) / edges.length).toFixed(2) : 0,
    networkDensity: nodes.length > 1 ? (edges.length / (nodes.length * (nodes.length - 1) / 2)).toFixed(2) : 0,
  };
}

/*
 * Utility functions for colors and positioning
 */
function getNodeColor(type: string, subtype?: string): string {
  const colors: Record<string, string> = {
    evidence: '#3B82F6',
    person: '#EF4444',
    location: '#10B981',
    event: '#F59E0B',
    communication: '#8B5CF6',
    financial: '#06B6D4',
  };
  return colors[type] || '#6B7280';
}

function getEdgeColor(strength: number): string {
  if (strength > 0.8) return '#059669'; // Strong - green
  if (strength > 0.6) return '#D97706'; // Moderate - orange
  if (strength > 0.4) return '#DC2626'; // Weak - red
  return '#9CA3AF'; // Predicted - gray
}

function getClusterColor(index: number): string {
  const colors = ['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E0E7FF', '#FED7D7'];
  return colors[index % colors.length];
}

function generateRandomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * 800 - 400, // -400 to 400
    y: Math.random() * 600 - 300, // -300 to 300
  };
}

/**
 * SORA Graph Traversal System
 * High-performance graph traversal with Neo4j integration
 * Optimized for legal document semantic analysis and reinforcement learning
 */

// Production-compatible simplified imports
type NESGPUIntegration = { computeBatchSimilarities?: (data: any) => Promise<number[]> };
type NESMemoryArchitecture = { allocateCHR_ROM?: (size: number) => any; writeCHR_ROM?: (region: any, data: any) => void };
type SemanticAnalysisPipeline = { processDocument: (content: string) => Promise<any>; extractEntities: (content: string) => Promise<string[]>; generateEmbedding?: (text: string) => Promise<Float32Array> };
type DimensionalTensorStore = { storeTensorSlice?: (slice: any) => Promise<void>; getStats?: () => any };
type LegalAIReranker = { rerank: (results: any[], context: any) => Promise<any[]> };
type TensorSlice = { 
  data: Float32Array; 
  dimensions: number[]; 
  axis?: number;
  index?: number;
  lodLevel?: number;
  metadata?: {
    timestamp: number;
    hash: string;
    size: number;
    compressed: boolean;
    accessCount: number;
    lastAccessed: number;
  };
};
type UserContext = { 
  userId?: string; 
  preferences?: any; 
  intent?: string; 
  timeOfDay?: string;
  userRole?: string;
  workflowState?: string;
  recentActions?: any[];
  currentCase?: any;
};
type RerankResult = { id: string; score: number; metadata: any };
type GraphNode = { id: string; properties: any };
type GraphEdge = { id: string; source: string; target: string; weight: number };

export interface SoraGraphNode {
  id: string;
  type: 'document' | 'entity' | 'concept' | 'relationship' | 'case' | 'evidence';
  properties: Record<string, any>;
  embedding?: Float32Array;
  coordinates?: { x: number; y: number; z: number };
  score?: number;
  depth?: number;
}

export interface SoraGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'cites' | 'contains' | 'related' | 'similar' | 'references' | 'contradicts';
  weight: number;
  properties: Record<string, any>;
}

export interface SoraTraversalPath {
  nodes: SoraGraphNode[];
  edges: SoraGraphEdge[];
  totalScore: number;
  pathLength: number;
  semanticCoherence: number;
}

export interface SoraTraversalOptions {
  maxDepth: number;
  maxNodes: number;
  scoreThreshold: number;
  traversalStrategy: 'breadth-first' | 'depth-first' | 'best-first' | 'reinforcement';
  semanticFiltering: boolean;
  useGPUAcceleration: boolean;
  reinforcementLearning: {
    enabled: boolean;
    explorationRate: number;
    learningRate: number;
    discountFactor: number;
  };
}

export interface SoraReinforcementState {
  currentNode: string;
  visitedNodes: Set<string>;
  pathHistory: string[];
  cumulativeReward: number;
  actionValues: Map<string, number>;
}

export class SoraGraphTraversal {
  private neo4jDriver: any;
  private gpuIntegration: NESGPUIntegration | null = null;
  private memoryArch: NESMemoryArchitecture | null = null;
  private semanticPipeline: SemanticAnalysisPipeline | null = null;
  private tensorStore: DimensionalTensorStore | null = null;
  private reranker: LegalAIReranker | null = null;
  private traversalCache: Map<string, SoraTraversalPath[]> = new Map();
  private reinforcementModel: Map<string, number> = new Map();

  constructor(
    neo4jDriver: any,
    gpuIntegration?: NESGPUIntegration,
    memoryArch?: NESMemoryArchitecture,
    semanticPipeline?: SemanticAnalysisPipeline,
    tensorStore?: DimensionalTensorStore,
    reranker?: LegalAIReranker
  ) {
    this.neo4jDriver = neo4jDriver;
    this.gpuIntegration = gpuIntegration || null;
    this.memoryArch = memoryArch || null;
    this.semanticPipeline = semanticPipeline || null;
    this.tensorStore = tensorStore || null;
    this.reranker = reranker || null;
  }

  /**
   * Main traversal method with reinforcement learning support
   */
  async traverseGraph(
    startNodeId: string,
    query: string,
    options: Partial<SoraTraversalOptions> = {}
  ): Promise<SoraTraversalPath[]> {
    const config: SoraTraversalOptions = {
      maxDepth: 5,
      maxNodes: 100,
      scoreThreshold: 0.6,
      traversalStrategy: 'reinforcement',
      semanticFiltering: true,
      useGPUAcceleration: true,
      reinforcementLearning: {
        enabled: true,
        explorationRate: 0.1,
        learningRate: 0.01,
        discountFactor: 0.95
      },
      ...options
    };

    // Check cache first
    const cacheKey = `${startNodeId}_${query}_${JSON.stringify(config)}`;
    if (this.traversalCache.has(cacheKey)) {
      return this.traversalCache.get(cacheKey)!;
    }

    // Get query embedding for semantic filtering
    const queryEmbedding = this.semanticPipeline?.generateEmbedding ? 
      await this.semanticPipeline.generateEmbedding(query) : new Float32Array(384);

    // Initialize reinforcement learning state
    const rlState: SoraReinforcementState = {
      currentNode: startNodeId,
      visitedNodes: new Set(),
      pathHistory: [startNodeId],
      cumulativeReward: 0,
      actionValues: new Map()
    };

    let paths: SoraTraversalPath[] = [];

    switch (config.traversalStrategy) {
      case 'reinforcement':
        paths = await this.reinforcementTraversal(startNodeId, queryEmbedding, config, rlState);
        break;
      case 'best-first':
        paths = await this.bestFirstTraversal(startNodeId, queryEmbedding, config);
        break;
      case 'depth-first':
        paths = await this.depthFirstTraversal(startNodeId, queryEmbedding, config);
        break;
      case 'breadth-first':
      default:
        paths = await this.breadthFirstTraversal(startNodeId, queryEmbedding, config);
        break;
    }

    // GPU-accelerated semantic scoring if enabled
    if (config.useGPUAcceleration && paths.length > 0) {
      paths = await this.gpuEnhancedScoring(paths, queryEmbedding);
    }

    // Apply legal AI reranking for improved relevance
    if (paths.length > 1) {
      paths = await this.applyLegalReranking(paths, query, config);
    }

    // Store in dimensional tensor store for future analysis
    await this.storeTensorData(paths, queryEmbedding, config);

    // Cache results
    this.traversalCache.set(cacheKey, paths);
    return paths;
  }

  /**
   * Reinforcement learning-based traversal
   */
  private async reinforcementTraversal(
    startNodeId: string,
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions,
    state: SoraReinforcementState
  ): Promise<SoraTraversalPath[]> {
    const paths: SoraTraversalPath[] = [];
    const explorationPaths: SoraTraversalPath[] = [];

    // Get initial node
    const startNode = await this.getNodeById(startNodeId);
    if (!startNode) return paths;

    // Initialize Q-learning values
    const qTable = new Map<string, Map<string, number>>();
    
    // Episode-based learning
    for (let episode = 0; episode < 10; episode++) {
      const episodePath = await this.runReinforcementEpisode(
        startNode,
        queryEmbedding,
        config,
        qTable
      );
      
      if (episodePath.nodes.length > 1) {
        paths.push(episodePath);
      }
    }

    // Select best paths based on learned values
    return this.selectBestPaths(paths, 5);
  }

  /**
   * Run single reinforcement learning episode
   */
  private async runReinforcementEpisode(
    startNode: SoraGraphNode,
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions,
    qTable: Map<string, Map<string, number>>
  ): Promise<SoraTraversalPath> {
    const path: SoraTraversalPath = {
      nodes: [startNode],
      edges: [],
      totalScore: 0,
      pathLength: 0,
      semanticCoherence: 0
    };

    let currentNode = startNode;
    const visitedNodes = new Set([startNode.id]);

    for (let depth = 0; depth < config.maxDepth; depth++) {
      // Get possible actions (neighboring nodes)
      const neighbors = await this.getNeighbors(currentNode.id);
      if (neighbors.length === 0) break;

      // Filter unvisited neighbors
      const unvisitedNeighbors = neighbors.filter(n => !visitedNodes.has(n.target.id));
      if (unvisitedNeighbors.length === 0) break;

      // Epsilon-greedy action selection
      let selectedAction;
      if (Math.random() < config.reinforcementLearning.explorationRate) {
        // Explore: random action
        selectedAction = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
      } else {
        // Exploit: best known action
        selectedAction = await this.selectBestAction(currentNode.id, unvisitedNeighbors, qTable, queryEmbedding);
      }

      // Calculate reward for this transition
      const reward = await this.calculateReward(currentNode, selectedAction.target, queryEmbedding);

      // Update Q-table
      this.updateQTable(currentNode.id, selectedAction.target.id, reward, config, qTable);

      // Move to next node
      path.nodes.push(selectedAction.target);
      path.edges.push(selectedAction.edge);
      visitedNodes.add(selectedAction.target.id);
      currentNode = selectedAction.target;

      // Update path metrics
      path.totalScore += reward;
      path.pathLength++;
    }

    // Calculate final semantic coherence
    path.semanticCoherence = await this.calculatePathSemanticCoherence(path, queryEmbedding);

    return path;
  }

  /**
   * Update Q-learning table
   */
  private updateQTable(
    stateId: string,
    actionId: string,
    reward: number,
    config: SoraTraversalOptions,
    qTable: Map<string, Map<string, number>>
  ): void {
    if (!qTable.has(stateId)) {
      qTable.set(stateId, new Map());
    }

    const stateActions = qTable.get(stateId)!;
    const currentQ = stateActions.get(actionId) || 0;

    // Q-learning update rule: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
    const newQ = currentQ + config.reinforcementLearning.learningRate * (
      reward + config.reinforcementLearning.discountFactor * this.getMaxQValue(actionId, qTable) - currentQ
    );

    stateActions.set(actionId, newQ);
  }

  /**
   * Get maximum Q-value for a state
   */
  private getMaxQValue(stateId: string, qTable: Map<string, Map<string, number>>): number {
    const stateActions = qTable.get(stateId);
    if (!stateActions || stateActions.size === 0) return 0;

    return Math.max(...Array.from(stateActions.values()));
  }

  /**
   * Calculate reward for state transition
   */
  private async calculateReward(
    fromNode: SoraGraphNode,
    toNode: SoraGraphNode,
    queryEmbedding: Float32Array
  ): Promise<number> {
    let reward = 0;

    // Semantic similarity reward
    if (toNode.embedding) {
      const similarity = this.cosineSimilarity(queryEmbedding, toNode.embedding);
      reward += similarity * 10;
    }

    // Node type bonus
    const typeBonus = {
      'document': 2,
      'case': 3,
      'evidence': 4,
      'entity': 1,
      'concept': 1,
      'relationship': 0.5
    };
    reward += typeBonus[toNode.type] || 0;

    // Novelty bonus (encourage exploration of less visited nodes)
    const visitCount = this.reinforcementModel.get(toNode.id) || 0;
    reward += Math.max(0, 2 - visitCount * 0.1);

    // Update visit count
    this.reinforcementModel.set(toNode.id, visitCount + 1);

    return reward;
  }

  /**
   * Select best action using Q-values
   */
  private async selectBestAction(
    stateId: string,
    actions: Array<{target: SoraGraphNode, edge: SoraGraphEdge}>,
    qTable: Map<string, Map<string, number>>,
    queryEmbedding: Float32Array
  ): Promise<{target: SoraGraphNode, edge: SoraGraphEdge}> {
    const stateActions = qTable.get(stateId);
    if (!stateActions) {
      // No Q-values yet, use heuristic selection
      return this.heuristicActionSelection(actions, queryEmbedding);
    }

    let bestAction = actions[0];
    let bestValue = -Infinity;

    for (const action of actions) {
      const qValue = stateActions.get(action.target.id) || 0;
      if (qValue > bestValue) {
        bestValue = qValue;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Heuristic action selection for unexplored states
   */
  private async heuristicActionSelection(
    actions: Array<{target: SoraGraphNode, edge: SoraGraphEdge}>,
    queryEmbedding: Float32Array
  ): Promise<{target: SoraGraphNode, edge: SoraGraphEdge}> {
    let bestAction = actions[0];
    let bestScore = -1;

    for (const action of actions) {
      let score = 0;

      // Semantic similarity
      if (action.target.embedding) {
        score += this.cosineSimilarity(queryEmbedding, action.target.embedding) * 0.6;
      }

      // Edge weight
      score += action.edge.weight * 0.2;

      // Node type preference
      const typeScore = {
        'evidence': 0.8,
        'case': 0.7,
        'document': 0.6,
        'entity': 0.4,
        'concept': 0.3,
        'relationship': 0.2
      };
      score += (typeScore[action.target.type] || 0) * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Best-first traversal strategy
   */
  private async bestFirstTraversal(
    startNodeId: string,
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions
  ): Promise<SoraTraversalPath[]> {
    const paths: SoraTraversalPath[] = [];
    const startNode = await this.getNodeById(startNodeId);
    if (!startNode) return paths;

    // Priority queue for best-first search
    const priorityQueue: Array<{node: SoraGraphNode, path: SoraGraphNode[], edges: SoraGraphEdge[], score: number}> = [];
    priorityQueue.push({
      node: startNode,
      path: [startNode],
      edges: [],
      score: this.calculateNodeScore(startNode, queryEmbedding)
    });

    const visited = new Set<string>();

    while (priorityQueue.length > 0 && paths.length < 10) {
      // Sort by score (descending)
      priorityQueue.sort((a, b) => b.score - a.score);
      const current = priorityQueue.shift()!;

      if (visited.has(current.node.id)) continue;
      visited.add(current.node.id);

      // Check if this path meets our criteria
      if (current.path.length > 1 && current.score >= config.scoreThreshold) {
        const pathCoherence = await this.calculatePathSemanticCoherence(
          {
            nodes: current.path,
            edges: current.edges,
            totalScore: current.score,
            pathLength: current.path.length,
            semanticCoherence: 0
          },
          queryEmbedding
        );

        paths.push({
          nodes: current.path,
          edges: current.edges,
          totalScore: current.score,
          pathLength: current.path.length,
          semanticCoherence: pathCoherence
        });
      }

      // Expand if not at max depth
      if (current.path.length < config.maxDepth) {
        const neighbors = await this.getNeighbors(current.node.id);
        
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.target.id) && !current.path.some(n => n.id === neighbor.target.id)) {
            const nodeScore = this.calculateNodeScore(neighbor.target, queryEmbedding);
            const pathScore = current.score + nodeScore * (1 - current.path.length * 0.1);

            priorityQueue.push({
              node: neighbor.target,
              path: [...current.path, neighbor.target],
              edges: [...current.edges, neighbor.edge],
              score: pathScore
            });
          }
        }
      }
    }

    return this.selectBestPaths(paths, 5);
  }

  /**
   * GPU-accelerated semantic scoring
   */
  private async gpuEnhancedScoring(
    paths: SoraTraversalPath[],
    queryEmbedding: Float32Array
  ): Promise<SoraTraversalPath[]> {
    try {
      // Prepare embeddings for GPU processing
      const allEmbeddings: Float32Array[] = [];
      const nodeIndices: number[] = [];

      paths.forEach((path, pathIndex) => {
        path.nodes.forEach((node, nodeIndex) => {
          if (node.embedding) {
            allEmbeddings.push(node.embedding);
            nodeIndices.push(pathIndex * 1000 + nodeIndex); // Encode path and node index
          }
        });
      });

      if (allEmbeddings.length > 0) {
        // Use GPU for batch similarity computation
        const similarities = this.gpuIntegration?.computeBatchSimilarities ? 
          await this.gpuIntegration.computeBatchSimilarities(allEmbeddings) : 
          allEmbeddings.map(() => 0.5); // Fallback similarity scores

        // Update node scores with GPU-computed similarities
        similarities.forEach((similarity, index) => {
          const encodedIndex = nodeIndices[index];
          const pathIndex = Math.floor(encodedIndex / 1000);
          const nodeIndex = encodedIndex % 1000;

          if (paths[pathIndex] && paths[pathIndex].nodes[nodeIndex]) {
            paths[pathIndex].nodes[nodeIndex].score = similarity;
          }
        });

        // Recalculate path scores
        paths.forEach(path => {
          const avgNodeScore = path.nodes.reduce((sum, node) => sum + (node.score || 0), 0) / path.nodes.length;
          path.totalScore = avgNodeScore * path.semanticCoherence;
        });
      }

      return paths.sort((a, b) => b.totalScore - a.totalScore);
    } catch (error) {
      console.warn('GPU-enhanced scoring failed, falling back to CPU:', error);
      return paths;
    }
  }

  /**
   * Get node by ID from Neo4j
   */
  private async getNodeById(nodeId: string): Promise<SoraGraphNode | null> {
    try {
      const session = this.neo4jDriver.session();
      try {
        const result = await session.run(
          'MATCH (n) WHERE id(n) = $nodeId RETURN n, labels(n) as labels',
          { nodeId: parseInt(nodeId) }
        );

        if (result.records.length === 0) return null;

        const record = result.records[0];
        const node = record.get('n');
        const labels = record.get('labels');

        return {
          id: nodeId,
          type: this.mapLabelsToType(labels),
          properties: node.properties,
          embedding: node.properties.embedding ? new Float32Array(node.properties.embedding) : undefined,
          coordinates: node.properties.coordinates ? {
            x: node.properties.coordinates.x,
            y: node.properties.coordinates.y,
            z: node.properties.coordinates.z || 0
          } : undefined
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error('Error getting node by ID:', error);
      return null;
    }
  }

  /**
   * Get neighbors of a node
   */
  private async getNeighbors(nodeId: string): Promise<Array<{target: SoraGraphNode, edge: SoraGraphEdge}>> {
    try {
      const session = this.neo4jDriver.session();
      try {
        const result = await session.run(`
          MATCH (n)-[r]-(m)
          WHERE id(n) = $nodeId
          RETURN m, r, labels(m) as target_labels, type(r) as rel_type
          ORDER BY r.weight DESC
          LIMIT 20
        `, { nodeId: parseInt(nodeId) });

        const neighbors: Array<{target: SoraGraphNode, edge: SoraGraphEdge}> = [];

        for (const record of result.records) {
          const targetNode = record.get('m');
          const relationship = record.get('r');
          const targetLabels = record.get('target_labels');
          const relType = record.get('rel_type');

          const target: SoraGraphNode = {
            id: targetNode.identity.toString(),
            type: this.mapLabelsToType(targetLabels),
            properties: targetNode.properties,
            embedding: targetNode.properties.embedding ? 
              new Float32Array(targetNode.properties.embedding) : undefined
          };

          const edge: SoraGraphEdge = {
            id: relationship.identity.toString(),
            source: nodeId,
            target: target.id,
            type: this.mapRelationshipType(relType),
            weight: relationship.properties.weight || 1,
            properties: relationship.properties
          };

          neighbors.push({ target, edge });
        }

        return neighbors;
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error('Error getting neighbors:', error);
      return [];
    }
  }

  /**
   * Calculate node score based on query embedding
   */
  private calculateNodeScore(node: SoraGraphNode, queryEmbedding: Float32Array): number {
    let score = 0;

    // Semantic similarity
    if (node.embedding) {
      score += this.cosineSimilarity(queryEmbedding, node.embedding) * 0.7;
    }

    // Node type importance
    const typeWeights = {
      'evidence': 1.0,
      'case': 0.9,
      'document': 0.8,
      'entity': 0.6,
      'concept': 0.5,
      'relationship': 0.3
    };
    score += (typeWeights[node.type] || 0.1) * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate semantic coherence of a path
   */
  private async calculatePathSemanticCoherence(
    path: SoraTraversalPath,
    queryEmbedding: Float32Array
  ): Promise<number> {
    if (path.nodes.length < 2) return 0;

    let totalCoherence = 0;
    let comparisons = 0;

    // Calculate pairwise similarities between consecutive nodes
    for (let i = 0; i < path.nodes.length - 1; i++) {
      const node1 = path.nodes[i];
      const node2 = path.nodes[i + 1];

      if (node1.embedding && node2.embedding) {
        totalCoherence += this.cosineSimilarity(node1.embedding, node2.embedding);
        comparisons++;
      }
    }

    // Calculate average similarity to query
    let queryCoherence = 0;
    let queryComparisons = 0;

    for (const node of path.nodes) {
      if (node.embedding) {
        queryCoherence += this.cosineSimilarity(queryEmbedding, node.embedding);
        queryComparisons++;
      }
    }

    const avgPathCoherence = comparisons > 0 ? totalCoherence / comparisons : 0;
    const avgQueryCoherence = queryComparisons > 0 ? queryCoherence / queryComparisons : 0;

    // Combine path coherence and query relevance
    return (avgPathCoherence * 0.4 + avgQueryCoherence * 0.6);
  }

  /**
   * Select best paths based on multiple criteria
   */
  private selectBestPaths(paths: SoraTraversalPath[], limit: number): SoraTraversalPath[] {
    // Sort by combined score
    paths.sort((a, b) => {
      const scoreA = a.totalScore * 0.4 + a.semanticCoherence * 0.6;
      const scoreB = b.totalScore * 0.4 + b.semanticCoherence * 0.6;
      return scoreB - scoreA;
    });

    // Remove duplicate paths (same nodes in same order)
    const uniquePaths: SoraTraversalPath[] = [];
    const pathSignatures = new Set<string>();

    for (const path of paths) {
      const signature = path.nodes.map(n => n.id).join('-');
      if (!pathSignatures.has(signature)) {
        pathSignatures.add(signature);
        uniquePaths.push(path);
      }
    }

    return uniquePaths.slice(0, limit);
  }

  /**
   * Cosine similarity between two embeddings
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Map Neo4j labels to node types
   */
  private mapLabelsToType(labels: string[]): SoraGraphNode['type'] {
    if (labels.includes('Document')) return 'document';
    if (labels.includes('Case')) return 'case';
    if (labels.includes('Evidence')) return 'evidence';
    if (labels.includes('Entity')) return 'entity';
    if (labels.includes('Concept')) return 'concept';
    return 'relationship';
  }

  /**
   * Map Neo4j relationship types
   */
  private mapRelationshipType(relType: string): SoraGraphEdge['type'] {
    const mapping: Record<string, SoraGraphEdge['type']> = {
      'CITES': 'cites',
      'CONTAINS': 'contains',
      'RELATED_TO': 'related',
      'SIMILAR_TO': 'similar',
      'REFERENCES': 'references',
      'CONTRADICTS': 'contradicts'
    };
    return mapping[relType] || 'related';
  }

  /**
   * Breadth-first traversal (fallback implementation)
   */
  private async breadthFirstTraversal(
    startNodeId: string,
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions
  ): Promise<SoraTraversalPath[]> {
    // Simplified BFS implementation
    const startNode = await this.getNodeById(startNodeId);
    if (!startNode) return [];

    return [{
      nodes: [startNode],
      edges: [],
      totalScore: this.calculateNodeScore(startNode, queryEmbedding),
      pathLength: 1,
      semanticCoherence: 1.0
    }];
  }

  /**
   * Depth-first traversal (fallback implementation)
   */
  private async depthFirstTraversal(
    startNodeId: string,
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions
  ): Promise<SoraTraversalPath[]> {
    // Simplified DFS implementation
    const startNode = await this.getNodeById(startNodeId);
    if (!startNode) return [];

    return [{
      nodes: [startNode],
      edges: [],
      totalScore: this.calculateNodeScore(startNode, queryEmbedding),
      pathLength: 1,
      semanticCoherence: 1.0
    }];
  }

  /**
   * Clear traversal cache
   */
  public clearCache(): void {
    this.traversalCache.clear();
  }

  /**
   * Apply legal AI reranking to improve path relevance
   */
  private async applyLegalReranking(
    paths: SoraTraversalPath[],
    query: string,
    config: SoraTraversalOptions
  ): Promise<SoraTraversalPath[]> {
    try {
      // Convert paths to rerank results
      const rerankInputs: RerankResult[] = paths.map((path, index) => ({
        id: `path_${index}`,
        score: path.totalScore,
        content: path.nodes.map(n => n.properties?.title || n.properties?.content || n.id).join(' → '),
        metadata: {
          pathLength: path.pathLength,
          semanticCoherence: path.semanticCoherence,
          nodeTypes: path.nodes.map(n => n.type),
          totalScore: path.totalScore
        },
        originalScore: path.totalScore,
        rerankScore: 0,
        confidence: path.semanticCoherence
      }));

      // Infer user context from query and config
      const userContext: UserContext = {
        intent: this.inferUserIntent(query),
        timeOfDay: this.getTimeOfDay(),
        userRole: 'user', // Could be enhanced with actual user context
        workflowState: 'draft',
        recentActions: [],
        currentCase: undefined
      };

      // Apply reranking
      const rerankedResults = await this.reranker?.rerank(rerankInputs, userContext) || [];

      // Reorder paths based on reranking scores
      const pathScoreMap = new Map<number, number>();
      rerankedResults.forEach((result, index) => {
        const originalIndex = parseInt(result.id.split('_')[1]);
        pathScoreMap.set(originalIndex, result.rerankScore);
      });

      // Update path scores and resort
      paths.forEach((path, index) => {
        const rerankScore = pathScoreMap.get(index) || path.totalScore;
        path.totalScore = (path.totalScore * 0.6) + (rerankScore * 0.4); // Blend scores
      });

      return paths.sort((a, b) => b.totalScore - a.totalScore);
    } catch (error) {
      console.warn('Legal reranking failed, using original order:', error);
      return paths;
    }
  }

  /**
   * Store graph traversal data in dimensional tensor store
   */
  private async storeTensorData(
    paths: SoraTraversalPath[],
    queryEmbedding: Float32Array,
    config: SoraTraversalOptions
  ): Promise<void> {
    try {
      // Create tensor slices for different dimensions
      const documents = new Set<string>();
      const chunks = new Set<string>();
      
      // Extract unique elements
      paths.forEach(path => {
        path.nodes.forEach(node => {
          if (node.type === 'document' || node.type === 'case') {
            documents.add(node.id);
          }
          if (node.embedding) {
            chunks.add(node.id);
          }
        });
      });

      // Store path embeddings as tensor slices
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        
        // Create path representation by averaging node embeddings
        const pathEmbedding = this.createPathEmbedding(path);
        
        if (pathEmbedding) {
          const tensorSlice: TensorSlice = {
            axis: 1, // Document axis
            index: i,
            lodLevel: 0,
            data: pathEmbedding,
            dimensions: [pathEmbedding.length],
            metadata: {
              timestamp: Date.now(),
              hash: this.generatePathHash(path),
              size: pathEmbedding.byteLength,
              compressed: false,
              accessCount: 1,
              lastAccessed: Date.now()
            }
          };

          if (this.tensorStore?.storeTensorSlice) {
            await this.tensorStore.storeTensorSlice(tensorSlice);
          }
        }
      }

      // Store query embedding for future similarity analysis
      if (queryEmbedding) {
        const querySlice: TensorSlice = {
          axis: 3, // Representations axis
          index: 0,
          lodLevel: 0,
          data: queryEmbedding,
          dimensions: [queryEmbedding.length],
          metadata: {
            timestamp: Date.now(),
            hash: this.hashFloat32Array(queryEmbedding),
            size: queryEmbedding.byteLength,
            compressed: false,
            accessCount: 1,
            lastAccessed: Date.now()
          }
        };

        if (this.tensorStore?.storeTensorSlice) {
          await this.tensorStore.storeTensorSlice(querySlice);
        }
      }

    } catch (error) {
      console.warn('Failed to store tensor data:', error);
    }
  }

  /**
   * Create path embedding by averaging node embeddings
   */
  private createPathEmbedding(path: SoraTraversalPath): Float32Array | null {
    const nodeEmbeddings = path.nodes
      .map(node => node.embedding)
      .filter(embedding => embedding !== undefined) as Float32Array[];

    if (nodeEmbeddings.length === 0) return null;

    const embeddingDim = nodeEmbeddings[0].length;
    const pathEmbedding = new Float32Array(embeddingDim);

    // Average all node embeddings
    for (let i = 0; i < embeddingDim; i++) {
      let sum = 0;
      for (const embedding of nodeEmbeddings) {
        sum += embedding[i];
      }
      pathEmbedding[i] = sum / nodeEmbeddings.length;
    }

    return pathEmbedding;
  }

  /**
   * Generate hash for path to track uniqueness
   */
  private generatePathHash(path: SoraTraversalPath): string {
    const pathSignature = path.nodes.map(n => `${n.id}:${n.type}`).join('|');
    return this.simpleHash(pathSignature);
  }

  /**
   * Hash Float32Array for caching
   */
  private hashFloat32Array(array: Float32Array): string {
    const buffer = new Uint8Array(array.buffer);
    return this.simpleHash(Array.from(buffer).join(','));
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Infer user intent from query
   */
  private inferUserIntent(query: string): UserContext['intent'] {
    const searchKeywords = ['find', 'search', 'look', 'show', 'list'];
    const analyzeKeywords = ['analyze', 'examine', 'investigate', 'study', 'review'];
    const createKeywords = ['create', 'new', 'add', 'make', 'generate'];
    const navigateKeywords = ['go', 'navigate', 'move', 'switch', 'open'];

    const lowerQuery = query.toLowerCase();

    if (searchKeywords.some(keyword => lowerQuery.includes(keyword))) return 'search';
    if (analyzeKeywords.some(keyword => lowerQuery.includes(keyword))) return 'analyze';
    if (createKeywords.some(keyword => lowerQuery.includes(keyword))) return 'create';
    if (navigateKeywords.some(keyword => lowerQuery.includes(keyword))) return 'navigate';

    return 'search'; // Default fallback
  }

  /**
   * Get current time of day
   */
  private getTimeOfDay(): UserContext['timeOfDay'] {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Enhanced GPU batch similarities using existing NES GPU integration
   */
  public async computeBatchSimilarities(
    pathEmbeddings: Float32Array[],
    queryEmbedding: Float32Array
  ): Promise<number[]> {
    try {
      return this.gpuIntegration?.computeBatchSimilarities ? 
        await this.gpuIntegration.computeBatchSimilarities(pathEmbeddings) : [];
    } catch (error) {
      console.warn('GPU batch similarity computation failed, falling back to CPU:', error);
      
      // CPU fallback
      return pathEmbeddings.map(embedding => 
        this.cosineSimilarity(embedding, queryEmbedding)
      );
    }
  }

  /**
   * Get reinforcement learning statistics
   */
  public getReinforcementStats(): { totalNodes: number; avgVisitCount: number; topNodes: Array<{id: string; visits: number}> } {
    const entries = Array.from(this.reinforcementModel.entries());
    const totalVisits = entries.reduce((sum, [_, visits]) => sum + visits, 0);
    
    return {
      totalNodes: entries.length,
      avgVisitCount: totalVisits / Math.max(1, entries.length),
      topNodes: entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, visits]) => ({ id, visits }))
    };
  }

  /**
   * Get tensor store statistics
   */
  public async getTensorStats(): Promise<{
    totalSlices: number;
    totalSize: number;
    cacheHitRate: number;
    dimensions: { documents: number; chunks: number; representations: number };
  }> {
    try {
      // Get basic stats from tensor store
      const stats = this.tensorStore?.getStats ? await this.tensorStore.getStats() : {};
      return {
        totalSlices: stats.totalTensorSlices || 0,
        totalSize: stats.totalMemoryUsage || 0,
        cacheHitRate: stats.cacheHitRate || 0,
        dimensions: stats.dimensions || { documents: 0, chunks: 0, representations: 0 }
      };
    } catch (error) {
      return {
        totalSlices: 0,
        totalSize: 0,
        cacheHitRate: 0,
        dimensions: { documents: 0, chunks: 0, representations: 0 }
      };
    }
  }
}
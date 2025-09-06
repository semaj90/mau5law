/**
 * Advanced GPU Memory Layout - "Graph on Texture"
 * 
 * Implements spatial locality optimization for graph data on GPU:
 * - Connected nodes stored contiguously for cache performance
 * - Storage textures for 4x4 ranking/variance matrices  
 * - Level of Detail (LOD) streaming system
 * - Breadth-First Search layout for optimal memory access patterns
 */

import { textureStreamer } from './texture-streaming';
import { db, type GraphNode, type GraphEdge } from '../db/dexie-integration';

// ============================================================================
// GPU DATA STRUCTURES
// ============================================================================

export interface GPUNodeData {
  position: [number, number, number]; // vec3<f32> layout coordinates
  metadata: [number, number, number, number]; // vec4<f32> packed metadata
  rankingMatrixIndex: number; // u32 index into ranking texture
  varianceMatrixIndex: number; // u32 index into variance texture
  neighborOffset: number; // u32 offset into adjacency buffer
  neighborCount: number; // u32 count of neighbors
}

export interface GPUAdjacencyData {
  nodeIds: Uint32Array; // Flattened adjacency list
  offsets: Uint32Array; // Starting positions for each node
}

export interface GPUTextureData {
  rankingTexture: GPUTexture; // rgba32float - 4x4 matrices as 4 pixels
  varianceTexture: GPUTexture; // rgba32float - variance matrices
  nodeDataBuffer: GPUBuffer; // Storage buffer for node data
  adjacencyBuffer: GPUBuffer; // Storage buffer for adjacency lists
}

export interface LODLevel {
  level: number;
  bounds: { x: number; y: number; width: number; height: number };
  nodeCount: number;
  loaded: boolean;
  gpuData?: GPUTextureData;
}

// ============================================================================
// SPATIAL LAYOUT ALGORITHMS
// ============================================================================

class GraphSpatialLayout {
  private nodePositions = new Map<string, { x: number; y: number; z?: number }>();
  private nodeOrder: string[] = []; // BFS-ordered nodes for cache locality
  
  /**
   * Breadth-First Search layout for optimal cache performance
   * Connected nodes will be adjacent in memory
   */
  async computeBFSLayout(
    nodes: GraphNode[], 
    edges: GraphEdge[]
  ): Promise<Map<string, number>> {
    // Build adjacency map
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.nodeId, []);
    }
    
    for (const edge of edges) {
      adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
      adjacency.get(edge.toNodeId)?.push(edge.fromNodeId);
    }

    // BFS traversal starting from highest-confidence node
    const visited = new Set<string>();
    const queue: string[] = [];
    const layoutOrder: string[] = [];
    
    // Find starting node (highest confidence)
    const startNode = nodes.reduce((max, node) => 
      node.metadata.confidence > max.metadata.confidence ? node : max
    );
    
    queue.push(startNode.nodeId);
    visited.add(startNode.nodeId);
    
    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      layoutOrder.push(currentNode);
      
      // Add unvisited neighbors to queue (sorted by confidence for deterministic order)
      const neighbors = adjacency.get(currentNode) || [];
      const unvisitedNeighbors = neighbors
        .filter(neighbor => !visited.has(neighbor))
        .map(neighbor => ({
          id: neighbor,
          confidence: nodes.find(n => n.nodeId === neighbor)?.metadata.confidence || 0
        }))
        .sort((a, b) => b.confidence - a.confidence) // High confidence first
        .map(n => n.id);
        
      for (const neighbor of unvisitedNeighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    // Add any disconnected nodes
    for (const node of nodes) {
      if (!visited.has(node.nodeId)) {
        layoutOrder.push(node.nodeId);
      }
    }
    
    this.nodeOrder = layoutOrder;
    
    // Return memory layout map (nodeId -> buffer index)
    const layoutMap = new Map<string, number>();
    layoutOrder.forEach((nodeId, index) => {
      layoutMap.set(nodeId, index);
    });
    
    return layoutMap;
  }

  /**
   * Force-directed layout for visual positioning
   * Uses Fruchterman-Reingold algorithm
   */
  async computeForceDirectedLayout(
    nodes: GraphNode[], 
    edges: GraphEdge[],
    iterations = 500
  ): Promise<void> {
    const width = 1000;
    const height = 1000;
    const k = Math.sqrt((width * height) / nodes.length);
    const c = 0.01; // Cooling factor
    
    // Initialize random positions
    for (const node of nodes) {
      this.nodePositions.set(node.nodeId, {
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0
      });
    }
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      for (const node of nodes) {
        forces.set(node.nodeId, { x: 0, y: 0 });
      }
      
      // Repulsive forces between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          const pos1 = this.nodePositions.get(node1.nodeId)!;
          const pos2 = this.nodePositions.get(node2.nodeId)!;
          
          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
          
          const force = (k * k) / distance;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          forces.get(node1.nodeId)!.x += fx;
          forces.get(node1.nodeId)!.y += fy;
          forces.get(node2.nodeId)!.x -= fx;
          forces.get(node2.nodeId)!.y -= fy;
        }
      }
      
      // Attractive forces for connected nodes
      for (const edge of edges) {
        const pos1 = this.nodePositions.get(edge.fromNodeId)!;
        const pos2 = this.nodePositions.get(edge.toNodeId)!;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        const force = (distance * distance) / k;
        const fx = (dx / distance) * force * edge.weight;
        const fy = (dy / distance) * force * edge.weight;
        
        forces.get(edge.fromNodeId)!.x -= fx;
        forces.get(edge.fromNodeId)!.y -= fy;
        forces.get(edge.toNodeId)!.x += fx;
        forces.get(edge.toNodeId)!.y += fy;
      }
      
      // Apply forces with cooling
      const temperature = Math.max(0.1, 1.0 - (iter / iterations));
      for (const node of nodes) {
        const pos = this.nodePositions.get(node.nodeId)!;
        const force = forces.get(node.nodeId)!;
        
        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 0.1;
        const limitedDisplacement = Math.min(displacement, temperature * c * k);
        
        pos.x += (force.x / displacement) * limitedDisplacement;
        pos.y += (force.y / displacement) * limitedDisplacement;
        
        // Keep within bounds
        pos.x = Math.max(0, Math.min(width, pos.x));
        pos.y = Math.max(0, Math.min(height, pos.y));
      }
    }
    
    console.log('✅ Force-directed layout computed');
  }
  
  getNodePosition(nodeId: string) {
    return this.nodePositions.get(nodeId);
  }
  
  getOrderedNodes(): string[] {
    return [...this.nodeOrder];
  }
}

// ============================================================================
// GPU TEXTURE MANAGER
// ============================================================================

export class GraphTextureManager {
  private device: GPUDevice | null = null;
  private spatialLayout = new GraphSpatialLayout();
  private lodLevels: LODLevel[] = [];
  private currentViewport = { x: 0, y: 0, width: 1000, height: 1000 };
  
  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not available');
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('WebGPU adapter not found');
    }
    
    this.device = await adapter.requestDevice({
      requiredFeatures: [],
      requiredLimits: {
        maxBufferSize: 512 * 1024 * 1024, // 512MB
        maxStorageBufferBindingSize: 256 * 1024 * 1024, // 256MB
        maxTextureDimension2D: 8192
      }
    });
    
    console.log('✅ Graph Texture Manager initialized');
  }

  /**
   * Load graph data with optimal memory layout
   */
  async loadGraphData(bounds?: { x: number; y: number; width: number; height: number }): Promise<void> {
    if (!this.device) await this.initialize();
    
    // Load nodes and edges from database
    const nodes = bounds 
      ? await db.getGraphNodesByRegion(bounds).then(result => result || [])
      : await db.getGraphNodes().then(result => result || []);
      
    const edges = await db.graphEdges.toArray();
    
    if (nodes.length === 0) {
      console.warn('No graph nodes found');
      return;
    }
    
    // Compute spatial layout for cache optimization
    console.log('Computing spatial layout for', nodes.length, 'nodes...');
    await this.spatialLayout.computeForceDirectedLayout(nodes, edges);
    const memoryLayout = await this.spatialLayout.computeBFSLayout(nodes, edges);
    
    // Create GPU data structures
    const gpuData = await this.createGPUDataStructures(nodes, edges, memoryLayout);
    
    // Create LOD level
    const lodLevel: LODLevel = {
      level: 0,
      bounds: bounds || { x: 0, y: 0, width: 1000, height: 1000 },
      nodeCount: nodes.length,
      loaded: true,
      gpuData
    };
    
    this.lodLevels.push(lodLevel);
    
    console.log(`✅ Loaded ${nodes.length} nodes with optimal GPU layout`);
  }

  /**
   * Create GPU data structures with spatial locality
   */
  private async createGPUDataStructures(
    nodes: GraphNode[],
    edges: GraphEdge[],
    memoryLayout: Map<string, number>
  ): Promise<GPUTextureData> {
    if (!this.device) throw new Error('WebGPU device not initialized');

    // Sort nodes by memory layout order for cache performance
    const orderedNodes = nodes.sort((a, b) => {
      const orderA = memoryLayout.get(a.nodeId) || 0;
      const orderB = memoryLayout.get(b.nodeId) || 0;
      return orderA - orderB;
    });

    // ========================================================================
    // 1. CREATE NODE DATA BUFFER (Storage Buffer)
    // ========================================================================
    
    const nodeDataArray = new Float32Array(orderedNodes.length * 8); // 8 floats per node
    let nodeIndex = 0;
    
    for (const node of orderedNodes) {
      const position = this.spatialLayout.getNodePosition(node.nodeId) || { x: 0, y: 0, z: 0 };
      const baseIdx = nodeIndex * 8;
      
      // Position (vec3<f32>)
      nodeDataArray[baseIdx + 0] = position.x;
      nodeDataArray[baseIdx + 1] = position.y;
      nodeDataArray[baseIdx + 2] = position.z || 0;
      
      // Metadata packed into vec4<f32>
      nodeDataArray[baseIdx + 3] = node.metadata.confidence;
      nodeDataArray[baseIdx + 4] = this.encodeDocumentType(node.metadata.documentType || '');
      nodeDataArray[baseIdx + 5] = node.metadata.lastUpdated.getTime() / 1000; // Unix timestamp
      nodeDataArray[baseIdx + 6] = 0; // Reserved for future use
      
      // Matrix indices (will be set when creating textures)
      nodeDataArray[baseIdx + 7] = nodeIndex; // Use node index as matrix index
      
      nodeIndex++;
    }
    
    const nodeDataBuffer = this.device.createBuffer({
      size: nodeDataArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    
    new Float32Array(nodeDataBuffer.getMappedRange()).set(nodeDataArray);
    nodeDataBuffer.unmap();

    // ========================================================================
    // 2. CREATE ADJACENCY BUFFER (Storage Buffer)
    // ========================================================================
    
    const adjacencyList: number[] = [];
    const nodeOffsets = new Uint32Array(orderedNodes.length);
    
    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i];
      const neighbors = edges
        .filter(edge => edge.fromNodeId === node.nodeId || edge.toNodeId === node.nodeId)
        .map(edge => edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId)
        .map(neighborId => memoryLayout.get(neighborId) || 0)
        .filter((value, index, arr) => arr.indexOf(value) === index); // Remove duplicates
      
      nodeOffsets[i] = adjacencyList.length;
      adjacencyList.push(neighbors.length);
      adjacencyList.push(...neighbors);
    }
    
    const adjacencyData = new Uint32Array(adjacencyList);
    const adjacencyBuffer = this.device.createBuffer({
      size: adjacencyData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    
    new Uint32Array(adjacencyBuffer.getMappedRange()).set(adjacencyData);
    adjacencyBuffer.unmap();

    // ========================================================================
    // 3. CREATE RANKING MATRIX TEXTURE (rgba32float)
    // ========================================================================
    
    // Each 4x4 matrix needs 4 pixels (4 rows × 4 RGBA components)
    const matrixTextureSize = Math.ceil(Math.sqrt(orderedNodes.length));
    const rankingTextureData = new Float32Array(matrixTextureSize * matrixTextureSize * 4 * 4); // 4 pixels per matrix
    
    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i];
      const matrix = node.rankingMatrix || new Array(16).fill(0);
      
      // Calculate texture coordinates for this matrix
      const matricesPerRow = Math.floor(matrixTextureSize / 2); // 2x2 matrix of pixels per matrix
      const matrixRow = Math.floor(i / matricesPerRow);
      const matrixCol = i % matricesPerRow;
      
      // Each matrix occupies a 2x2 block of pixels
      for (let row = 0; row < 4; row++) {
        const pixelY = matrixRow * 2 + Math.floor(row / 2);
        const pixelX = matrixCol * 2 + (row % 2);
        const pixelIndex = (pixelY * matrixTextureSize + pixelX) * 4;
        
        // Pack 4 matrix elements into RGBA channels
        const matrixRowStart = row * 4;
        rankingTextureData[pixelIndex + 0] = matrix[matrixRowStart + 0];
        rankingTextureData[pixelIndex + 1] = matrix[matrixRowStart + 1];
        rankingTextureData[pixelIndex + 2] = matrix[matrixRowStart + 2];
        rankingTextureData[pixelIndex + 3] = matrix[matrixRowStart + 3];
      }
    }
    
    const rankingTexture = this.device.createTexture({
      size: { width: matrixTextureSize, height: matrixTextureSize },
      format: 'rgba32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST
    });
    
    this.device.queue.writeTexture(
      { texture: rankingTexture },
      rankingTextureData,
      { bytesPerRow: matrixTextureSize * 16, rowsPerImage: matrixTextureSize },
      { width: matrixTextureSize, height: matrixTextureSize }
    );

    // ========================================================================
    // 4. CREATE VARIANCE MATRIX TEXTURE (rgba32float)
    // ========================================================================
    
    const varianceTextureData = new Float32Array(matrixTextureSize * matrixTextureSize * 4 * 4);
    
    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i];
      const matrix = node.varianceMatrix || new Array(16).fill(0);
      
      // Same layout as ranking matrix
      const matricesPerRow = Math.floor(matrixTextureSize / 2);
      const matrixRow = Math.floor(i / matricesPerRow);
      const matrixCol = i % matricesPerRow;
      
      for (let row = 0; row < 4; row++) {
        const pixelY = matrixRow * 2 + Math.floor(row / 2);
        const pixelX = matrixCol * 2 + (row % 2);
        const pixelIndex = (pixelY * matrixTextureSize + pixelX) * 4;
        
        const matrixRowStart = row * 4;
        varianceTextureData[pixelIndex + 0] = matrix[matrixRowStart + 0];
        varianceTextureData[pixelIndex + 1] = matrix[matrixRowStart + 1];
        varianceTextureData[pixelIndex + 2] = matrix[matrixRowStart + 2];
        varianceTextureData[pixelIndex + 3] = matrix[matrixRowStart + 3];
      }
    }
    
    const varianceTexture = this.device.createTexture({
      size: { width: matrixTextureSize, height: matrixTextureSize },
      format: 'rgba32float',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST
    });
    
    this.device.queue.writeTexture(
      { texture: varianceTexture },
      varianceTextureData,
      { bytesPerRow: matrixTextureSize * 16, rowsPerImage: matrixTextureSize },
      { width: matrixTextureSize, height: matrixTextureSize }
    );

    return {
      rankingTexture,
      varianceTexture,
      nodeDataBuffer,
      adjacencyBuffer
    };
  }

  /**
   * Stream new data based on viewport changes (LOD system)
   */
  async updateViewport(bounds: { x: number; y: number; width: number; height: number }): Promise<void> {
    this.currentViewport = bounds;
    
    // Check if we need to load new data
    const needsNewData = !this.lodLevels.some(level => 
      level.bounds.x <= bounds.x &&
      level.bounds.y <= bounds.y &&
      level.bounds.x + level.bounds.width >= bounds.x + bounds.width &&
      level.bounds.y + level.bounds.height >= bounds.y + bounds.height
    );
    
    if (needsNewData) {
      console.log('Loading new LOD data for viewport:', bounds);
      await this.loadGraphData(bounds);
    }
  }

  /**
   * Create compute shader for graph traversal
   */
  createGraphTraversalShader(): string {
    return `
      struct NodeData {
        position: vec3<f32>,
        metadata: vec4<f32>,
        matrix_index: f32,
        neighbor_offset: f32,
        neighbor_count: f32,
        padding: f32,
      }

      @group(0) @binding(0) var<storage, read> node_data: array<NodeData>;
      @group(0) @binding(1) var<storage, read> adjacency: array<u32>;
      @group(0) @binding(2) var ranking_texture: texture_storage_2d<rgba32float, read>;
      @group(0) @binding(3) var variance_texture: texture_storage_2d<rgba32float, read>;
      @group(0) @binding(4) var<storage, read_write> results: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let node_index = global_id.x;
        if (node_index >= arrayLength(&node_data)) {
          return;
        }

        let node = node_data[node_index];
        
        // Read 4x4 ranking matrix from texture
        let matrix_coord = vec2<u32>(u32(node.matrix_index) % 256u, u32(node.matrix_index) / 256u);
        let ranking_row0 = textureLoad(ranking_texture, matrix_coord * 2u);
        let ranking_row1 = textureLoad(ranking_texture, matrix_coord * 2u + vec2<u32>(1u, 0u));
        let ranking_row2 = textureLoad(ranking_texture, matrix_coord * 2u + vec2<u32>(0u, 1u));
        let ranking_row3 = textureLoad(ranking_texture, matrix_coord * 2u + vec2<u32>(1u, 1u));
        
        // Read variance matrix
        let variance_row0 = textureLoad(variance_texture, matrix_coord * 2u);
        let variance_row1 = textureLoad(variance_texture, matrix_coord * 2u + vec2<u32>(1u, 0u));
        let variance_row2 = textureLoad(variance_texture, matrix_coord * 2u + vec2<u32>(0u, 1u));
        let variance_row3 = textureLoad(variance_texture, matrix_coord * 2u + vec2<u32>(1u, 1u));
        
        // Calculate confidence score using both matrices
        let confidence = node.metadata.x; // Base confidence
        let variance_factor = (variance_row0.x + variance_row1.y + variance_row2.z + variance_row3.w) / 4.0;
        let adjusted_confidence = confidence * (1.0 - variance_factor * 0.1);
        
        // Store result
        results[node_index] = adjusted_confidence;
      }
    `;
  }

  private encodeDocumentType(documentType: string): number {
    const typeMap: Record<string, number> = {
      'contract': 1.0,
      'brief': 2.0, 
      'motion': 3.0,
      'pleading': 4.0,
      'evidence': 5.0,
      'citation': 6.0
    };
    return typeMap[documentType] || 0.0;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      lodLevels: this.lodLevels.length,
      totalNodes: this.lodLevels.reduce((sum, level) => sum + level.nodeCount, 0),
      memoryUsage: this.lodLevels.reduce((sum, level) => {
        if (!level.gpuData) return sum;
        // Rough calculation of GPU memory usage
        return sum + (level.nodeCount * 32) + (1024 * 1024 * 2); // Node data + textures
      }, 0),
      currentViewport: this.currentViewport
    };
  }

  /**
   * Cleanup GPU resources
   */
  async cleanup(): Promise<void> {
    for (const level of this.lodLevels) {
      if (level.gpuData) {
        level.gpuData.rankingTexture.destroy();
        level.gpuData.varianceTexture.destroy();
        level.gpuData.nodeDataBuffer.destroy();
        level.gpuData.adjacencyBuffer.destroy();
      }
    }
    
    this.lodLevels.length = 0;
    console.log('✅ Graph Texture Manager cleaned up');
  }
}

// Export singleton instance
export const graphTextureManager = new GraphTextureManager();
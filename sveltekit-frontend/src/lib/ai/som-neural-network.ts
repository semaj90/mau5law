/**
 * Self-Organizing Map (SOM) Neural Network for Graph Decomposition
 * Integrates with TensorFlow.js and GPU acceleration for legal graph analysis
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';
import { MultiLayerCache } from '../services/multiLayerCache';

export interface SOMConfig {
  gridSize: { width: number; height: number };
  learningRate: number;
  neighborhoodRadius: number;
  epochs: number;
  enableGPU: boolean;
  decayRate: number;
  inputDimension: number;
}

export interface SOMNode {
  position: { x: number; y: number };
  weights: Float32Array;
  activationLevel: number;
  legalContext: {
    conceptType: 'case' | 'statute' | 'regulation' | 'precedent' | 'mixed';
    importance: number;
    jurisdiction: string;
    practiceArea: string[];
  };
}

export interface SOMDecomposition {
  clusters: SOMCluster[];
  topologyMap: Float32Array;
  legalConcepts: LegalConceptMapping[];
  decompositionQuality: number;
  processingTime: number;
  convergenceHistory: number[];
}

export interface SOMCluster {
  id: string;
  centroid: Float32Array;
  nodes: string[];
  legalSignificance: number;
  conceptSimilarity: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface LegalConceptMapping {
  conceptId: string;
  somPosition: { x: number; y: number };
  legalTerms: string[];
  citationNetwork: string[];
  importance: number;
}

export interface SOMTrainingMetrics {
  epoch: number;
  quantizationError: number;
  topographicError: number;
  neighborhoodSize: number;
  learningRate: number;
  convergenceRate: number;
}

export class SOMNeuralNetwork {
  private config: SOMConfig;
  private somGrid: SOMNode[][];
  private inputTensor: tf.Tensor | null = null;
  private weightTensor: tf.Tensor | null = null;
  private trainingHistory: SOMTrainingMetrics[] = [];
  private isInitialized = false;
  private gpuBackend: 'webgl' | 'webgpu' | 'cpu' = 'cpu';
  private cache: MultiLayerCache | null = null;

  constructor(config: SOMConfig) {
    this.config = {
      gridSize: config.gridSize || { width: 10, height: 10 },
      learningRate: config.learningRate || 0.1,
      neighborhoodRadius: config.neighborhoodRadius || 2.0,
      epochs: config.epochs || 100,
      enableGPU: config.enableGPU !== undefined ? config.enableGPU : true,
      decayRate: config.decayRate || 0.99,
      inputDimension: config.inputDimension || 384
    };

    this.somGrid = [];
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      this.cache = new MultiLayerCache();
      // Cache doesn't need explicit initialization
    } catch (error) {
      console.warn('Failed to initialize SOM cache:', error);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Set up TensorFlow.js backend
      if (this.config.enableGPU) {
        try {
          await tf.setBackend('webgpu');
          this.gpuBackend = 'webgpu';
          console.log('SOM: WebGPU backend initialized');
        } catch {
          try {
            await tf.setBackend('webgl');
            this.gpuBackend = 'webgl';
            console.log('SOM: WebGL backend initialized');
          } catch {
            await tf.setBackend('cpu');
            this.gpuBackend = 'cpu';
            console.log('SOM: CPU backend fallback');
          }
        }
      } else {
        await tf.setBackend('cpu');
        this.gpuBackend = 'cpu';
      }

      await tf.ready();
      this.initializeSOMGrid();
      this.isInitialized = true;
      
      console.log(`SOM Neural Network initialized: ${this.config.gridSize.width}x${this.config.gridSize.height} grid, ${this.gpuBackend} backend`);
    } catch (error) {
      console.error('Failed to initialize SOM Neural Network:', error);
      throw error;
    }
  }

  private initializeSOMGrid(): void {
    const { width, height } = this.config.gridSize;
    this.somGrid = [];

    for (let x = 0; x < width; x++) {
      this.somGrid[x] = [];
      for (let y = 0; y < height; y++) {
        const weights = new Float32Array(this.config.inputDimension);
        // Initialize with small random values
        for (let i = 0; i < this.config.inputDimension; i++) {
          weights[i] = (Math.random() - 0.5) * 0.1;
        }

        this.somGrid[x][y] = {
          position: { x, y },
          weights,
          activationLevel: 0,
          legalContext: {
            conceptType: 'mixed',
            importance: 0,
            jurisdiction: 'unknown',
            practiceArea: []
          }
        };
      }
    }

    // Create weight tensor for GPU computation
    const flatWeights = this.somGrid.flat().flatMap(node => Array.from(node.weights));
    this.weightTensor = tf.tensor2d(
      flatWeights, 
      [width * height, this.config.inputDimension]
    );
  }

  async train(inputData: number[][]): Promise<SOMDecomposition> {
    if (!this.isInitialized) {
      throw new Error('SOM not initialized. Call initialize() first.');
    }

    const cacheKey = `som_training_${JSON.stringify(this.config)}_${JSON.stringify(inputData).slice(0, 200)}`;
    
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<SOMDecomposition>(cacheKey);
      if (cached) {
        console.log('SOM: Using cached training result');
        return cached;
      }
    }

    console.log(`Starting SOM training: ${inputData.length} samples, ${this.config.epochs} epochs`);
    const startTime = performance.now();

    // Prepare input tensor
    this.inputTensor = tf.tensor2d(inputData);
    this.trainingHistory = [];

    let currentLearningRate = this.config.learningRate;
    let currentNeighborhoodRadius = this.config.neighborhoodRadius;

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const epochStartTime = performance.now();
      
      // Shuffle input data for each epoch
      const shuffledIndices = this.shuffleArray([...Array(inputData.length).keys()]);
      
      let totalQuantizationError = 0;
      let totalTopographicError = 0;

      for (const sampleIndex of shuffledIndices) {
        const inputSample = inputData[sampleIndex];
        
        // Find Best Matching Unit (BMU)
        const bmu = await this.findBestMatchingUnit(inputSample);
        
        // Calculate quantization error
        const quantError = this.calculateDistance(inputSample, this.somGrid[bmu.x][bmu.y].weights);
        totalQuantizationError += quantError;

        // Update BMU and neighborhood
        await this.updateNeighborhood(bmu, inputSample, currentLearningRate, currentNeighborhoodRadius);
        
        // Calculate topographic error (simplified)
        const topError = this.calculateTopographicError(bmu, inputSample);
        totalTopographicError += topError;
      }

      // Record training metrics
      const avgQuantError = totalQuantizationError / inputData.length;
      const avgTopError = totalTopographicError / inputData.length;
      const convergenceRate = epoch > 0 ? 
        Math.abs(this.trainingHistory[epoch - 1].quantizationError - avgQuantError) / avgQuantError : 1.0;

      this.trainingHistory.push({
        epoch,
        quantizationError: avgQuantError,
        topographicError: avgTopError,
        neighborhoodSize: currentNeighborhoodRadius,
        learningRate: currentLearningRate,
        convergenceRate
      });

      // Decay parameters
      currentLearningRate *= this.config.decayRate;
      currentNeighborhoodRadius *= this.config.decayRate;

      // Log progress
      if (epoch % 10 === 0 || epoch === this.config.epochs - 1) {
        const epochTime = performance.now() - epochStartTime;
        console.log(`SOM Epoch ${epoch}: QE=${avgQuantError.toFixed(4)}, TE=${avgTopError.toFixed(4)}, LR=${currentLearningRate.toFixed(4)}, Time=${epochTime.toFixed(2)}ms`);
      }

      // Early stopping check
      if (epoch > 10 && convergenceRate < 0.001) {
        console.log(`SOM converged at epoch ${epoch}`);
        break;
      }
    }

    // Generate decomposition result
    const decomposition = await this.generateDecomposition(inputData);
    const processingTime = performance.now() - startTime;
    
    const result: SOMDecomposition = {
      ...decomposition,
      processingTime,
      convergenceHistory: this.trainingHistory.map(h => h.quantizationError)
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, result, { type: "document", ttl: 3600 });
    }

    console.log(`SOM training completed in ${processingTime.toFixed(2)}ms`);
    return result;
  }

  private async findBestMatchingUnit(inputSample: number[]): Promise<{ x: number; y: number }> {
    if (this.gpuBackend !== 'cpu' && this.weightTensor) {
      // GPU-accelerated BMU finding
      return this.findBMUGPU(inputSample);
    } else {
      // CPU fallback
      return this.findBMUCPU(inputSample);
    }
  }

  private async findBMUGPU(inputSample: number[]): Promise<{ x: number; y: number }> {
    const inputTensor = tf.tensor1d(inputSample);
    
    // Calculate distances using GPU
    const distances = tf.tidy(() => {
      const expandedInput = inputTensor.expandDims(0).tile([this.weightTensor!.shape[0], 1]);
      const diff = tf.sub(this.weightTensor!, expandedInput);
      const squaredDiff = tf.square(diff);
      return tf.sum(squaredDiff, 1);
    });

    // Find minimum distance index
    const minIndex = await tf.argMin(distances).data();
    const flatIndex = minIndex[0];
    
    // Convert flat index back to 2D coordinates
    const width = this.config.gridSize.width;
    const x = Math.floor(flatIndex / width);
    const y = flatIndex % width;

    inputTensor.dispose();
    distances.dispose();

    return { x, y };
  }

  private findBMUCPU(inputSample: number[]): { x: number; y: number } {
    let minDistance = Infinity;
    let bmuX = 0, bmuY = 0;

    for (let x = 0; x < this.config.gridSize.width; x++) {
      for (let y = 0; y < this.config.gridSize.height; y++) {
        const distance = this.calculateDistance(inputSample, this.somGrid[x][y].weights);
        if (distance < minDistance) {
          minDistance = distance;
          bmuX = x;
          bmuY = y;
        }
      }
    }

    return { x: bmuX, y: bmuY };
  }

  private calculateDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private async updateNeighborhood(
    bmu: { x: number; y: number }, 
    inputSample: number[], 
    learningRate: number, 
    neighborhoodRadius: number
  ): Promise<void> {
    const { width, height } = this.config.gridSize;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const distance = Math.sqrt((x - bmu.x) ** 2 + (y - bmu.y) ** 2);
        
        if (distance <= neighborhoodRadius) {
          // Calculate neighborhood function (Gaussian)
          const influence = Math.exp(-(distance ** 2) / (2 * neighborhoodRadius ** 2));
          const effectiveLearningRate = learningRate * influence;

          // Update weights
          const nodeWeights = this.somGrid[x][y].weights;
          for (let i = 0; i < nodeWeights.length; i++) {
            nodeWeights[i] += effectiveLearningRate * (inputSample[i] - nodeWeights[i]);
          }

          // Update activation level and legal context
          this.somGrid[x][y].activationLevel = influence;
          await this.updateLegalContext(x, y, inputSample, influence);
        }
      }
    }

    // Update GPU weight tensor if using GPU backend
    if (this.gpuBackend !== 'cpu') {
      await this.updateWeightTensor();
    }
  }

  private async updateLegalContext(x: number, y: number, inputSample: number[], influence: number): Promise<void> {
    const node = this.somGrid[x][y];
    
    // Update importance based on activation
    node.legalContext.importance = Math.max(node.legalContext.importance, influence);
    
    // Infer legal concept type based on weight patterns (simplified heuristic)
    const avgWeight = inputSample.reduce((sum, val) => sum + val, 0) / inputSample.length;
    
    if (avgWeight > 0.5) {
      node.legalContext.conceptType = 'case';
    } else if (avgWeight > 0.3) {
      node.legalContext.conceptType = 'statute';
    } else if (avgWeight > 0.1) {
      node.legalContext.conceptType = 'regulation';
    } else if (avgWeight > -0.1) {
      node.legalContext.conceptType = 'precedent';
    } else {
      node.legalContext.conceptType = 'mixed';
    }

    // Update practice areas based on clustering (simplified)
    if (influence > 0.7) {
      node.legalContext.practiceArea.push('primary-focus');
    } else if (influence > 0.3) {
      node.legalContext.practiceArea.push('secondary-relevance');
    }
  }

  private async updateWeightTensor(): Promise<void> {
    if (!this.weightTensor) return;

    const flatWeights = this.somGrid.flat().flatMap(node => Array.from(node.weights));
    const newWeightTensor = tf.tensor2d(
      flatWeights, 
      [this.config.gridSize.width * this.config.gridSize.height, this.config.inputDimension]
    );

    this.weightTensor.dispose();
    this.weightTensor = newWeightTensor;
  }

  private calculateTopographicError(bmu: { x: number; y: number }, inputSample: number[]): number {
    // Simplified topographic error calculation
    const neighbors = this.getNeighbors(bmu.x, bmu.y, 1);
    let minNeighborDistance = Infinity;

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(inputSample, this.somGrid[neighbor.x][neighbor.y].weights);
      minNeighborDistance = Math.min(minNeighborDistance, distance);
    }

    const bmuDistance = this.calculateDistance(inputSample, this.somGrid[bmu.x][bmu.y].weights);
    return bmuDistance > minNeighborDistance ? 1 : 0;
  }

  private getNeighbors(x: number, y: number, radius: number): { x: number; y: number }[] {
    const neighbors: { x: number; y: number }[] = [];
    const { width, height } = this.config.gridSize;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private async generateDecomposition(inputData: number[][]): Promise<Omit<SOMDecomposition, 'processingTime' | 'convergenceHistory'>> {
    const clusters = await this.identifyClusters();
    const topologyMap = this.generateTopologyMap();
    const legalConcepts = this.extractLegalConcepts(inputData);
    const decompositionQuality = this.calculateDecompositionQuality();

    return {
      clusters,
      topologyMap,
      legalConcepts,
      decompositionQuality
    };
  }

  private async identifyClusters(): Promise<SOMCluster[]> {
    const clusters: SOMCluster[] = [];
    const { width, height } = this.config.gridSize;
    const visited = Array(width).fill(null).map(() => Array(height).fill(false));

    let clusterId = 0;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if (!visited[x][y] && this.somGrid[x][y].activationLevel > 0.1) {
          const cluster = await this.floodFillCluster(x, y, visited, `cluster_${clusterId++}`);
          if (cluster.nodes.length > 1) {
            clusters.push(cluster);
          }
        }
      }
    }

    return clusters;
  }

  private async floodFillCluster(
    startX: number, 
    startY: number, 
    visited: boolean[][], 
    clusterId: string
  ): Promise<SOMCluster> {
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const clusterNodes: string[] = [];
    let minX = startX, minY = startY, maxX = startX, maxY = startY;
    const centroid = new Float32Array(this.config.inputDimension);
    let totalImportance = 0;

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      
      if (visited[x][y]) continue;
      visited[x][y] = true;

      clusterNodes.push(`node_${x}_${y}`);
      
      // Update bounding box
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      // Accumulate centroid
      const nodeWeights = this.somGrid[x][y].weights;
      for (let i = 0; i < centroid.length; i++) {
        centroid[i] += nodeWeights[i];
      }
      totalImportance += this.somGrid[x][y].legalContext.importance;

      // Add neighboring nodes with similar activation
      const neighbors = this.getNeighbors(x, y, 1);
      for (const neighbor of neighbors) {
        if (!visited[neighbor.x][neighbor.y]) {
          const currentActivation = this.somGrid[x][y].activationLevel;
          const neighborActivation = this.somGrid[neighbor.x][neighbor.y].activationLevel;
          
          // Similar activation threshold
          if (Math.abs(currentActivation - neighborActivation) < 0.2 && neighborActivation > 0.1) {
            queue.push(neighbor);
          }
        }
      }
    }

    // Normalize centroid
    for (let i = 0; i < centroid.length; i++) {
      centroid[i] /= clusterNodes.length;
    }

    return {
      id: clusterId,
      centroid,
      nodes: clusterNodes,
      legalSignificance: totalImportance / clusterNodes.length,
      conceptSimilarity: this.calculateClusterSimilarity(clusterNodes),
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      }
    };
  }

  private calculateClusterSimilarity(nodes: string[]): number {
    if (nodes.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [, x1, y1] = nodes[i].split('_').map(Number);
        const [, x2, y2] = nodes[j].split('_').map(Number);
        
        const weights1 = this.somGrid[x1][y1].weights;
        const weights2 = this.somGrid[x2][y2].weights;
        
        const distance = this.calculateDistance(weights1, weights2);
        const similarity = 1 / (1 + distance); // Convert distance to similarity
        
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  private generateTopologyMap(): Float32Array {
    const { width, height } = this.config.gridSize;
    const topologyMap = new Float32Array(width * height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const index = x * height + y;
        topologyMap[index] = this.somGrid[x][y].activationLevel;
      }
    }

    return topologyMap;
  }

  private extractLegalConcepts(inputData: number[][]): LegalConceptMapping[] {
    const concepts: LegalConceptMapping[] = [];
    const { width, height } = this.config.gridSize;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const node = this.somGrid[x][y];
        
        if (node.activationLevel > 0.2) {
          concepts.push({
            conceptId: `concept_${x}_${y}`,
            somPosition: { x, y },
            legalTerms: this.inferLegalTerms(node),
            citationNetwork: this.inferCitationNetwork(node),
            importance: node.legalContext.importance
          });
        }
      }
    }

    return concepts.sort((a, b) => b.importance - a.importance);
  }

  private inferLegalTerms(node: SOMNode): string[] {
    const terms: string[] = [];
    
    // Infer terms based on legal context and weights (simplified)
    switch (node.legalContext.conceptType) {
      case 'case':
        terms.push('case law', 'judicial decision', 'legal precedent');
        break;
      case 'statute':
        terms.push('statutory law', 'legislation', 'code section');
        break;
      case 'regulation':
        terms.push('administrative law', 'regulatory provision', 'agency rule');
        break;
      case 'precedent':
        terms.push('binding precedent', 'stare decisis', 'authoritative ruling');
        break;
      default:
        terms.push('legal concept', 'jurisprudential principle');
    }

    return terms;
  }

  private inferCitationNetwork(node: SOMNode): string[] {
    // Simplified citation network inference
    const citations: string[] = [];
    const neighbors = this.getNeighbors(node.position.x, node.position.y, 2);
    
    for (const neighbor of neighbors) {
      const neighborNode = this.somGrid[neighbor.x][neighbor.y];
      if (neighborNode.activationLevel > 0.1) {
        citations.push(`cite_${neighbor.x}_${neighbor.y}`);
      }
    }

    return citations;
  }

  private calculateDecompositionQuality(): number {
    const latestMetrics = this.trainingHistory[this.trainingHistory.length - 1];
    if (!latestMetrics) return 0;

    // Quality based on quantization error and topographic error
    const quantizationQuality = 1 / (1 + latestMetrics.quantizationError);
    const topographicQuality = 1 - latestMetrics.topographicError;
    
    return (quantizationQuality + topographicQuality) / 2;
  }

  async getDecomposition(): Promise<SOMDecomposition | null> {
    if (!this.isInitialized || this.trainingHistory.length === 0) {
      return null;
    }

    const decomposition = await this.generateDecomposition([]);
    return {
      ...decomposition,
      processingTime: 0, // Already computed
      convergenceHistory: this.trainingHistory.map(h => h.quantizationError)
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getTrainingHistory(): SOMTrainingMetrics[] {
    return [...this.trainingHistory];
  }

  getSOMGrid(): SOMNode[][] {
    return this.somGrid.map(row => row.map(node => ({...node})));
  }

  cleanup(): void {
    this.inputTensor?.dispose();
    this.weightTensor?.dispose();
    this.cache?.clear();
    console.log('SOM Neural Network cleaned up');
  }
}
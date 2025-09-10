import { EventEmitter } from "events";

/**
 * Redis-Compatible Self-Organizing Map Cache System
 * Advanced memory management with machine learning clustering
 */


// === Neural Network Self-Organizing Map for Cache Intelligence ===
export interface SOMNode {
  weights: Float64Array;
  activation: number;
  cluster_id: number;
  access_count: number;
  last_update: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  created_at: number;
  access_count: number;
  size: number;
  som_cluster: number;
  priority_score: number;
  metadata: {
    content_type: 'json' | 'string' | 'buffer' | 'object';
    compression_ratio?: number;
    access_pattern: 'frequent' | 'burst' | 'linear' | 'random';
    ai_relevance: number; // 0-1 score
  };
}

class SelfOrganizingMap {
  private nodes: SOMNode[][] = [];
  private width: number;
  private height: number;
  private learning_rate: number;
  private neighborhood_radius: number;
  private feature_dimensions: number;
  private training_iterations: number;

  constructor(
    width = 20, 
    height = 20, 
    feature_dimensions = 8,
    initial_learning_rate = 0.1,
    initial_radius = 5
  ) {
    this.width = width;
    this.height = height;
    this.feature_dimensions = feature_dimensions;
    this.learning_rate = initial_learning_rate;
    this.neighborhood_radius = initial_radius;
    this.training_iterations = 0;
    
    this.initializeNodes();
  }

  private initializeNodes(): void {
    this.nodes = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({
        weights: new Float64Array(this.feature_dimensions).map(() => Math.random()),
        activation: 0,
        cluster_id: Math.floor(Math.random() * 10),
        access_count: 0,
        last_update: Date.now()
      }))
    );
  }

  private calculateDistance(weights1: Float64Array, weights2: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < weights1.length; i++) {
      sum += Math.pow(weights1[i] - weights2[i], 2);
    }
    return Math.sqrt(sum);
  }

  private findBestMatchingUnit(input: Float64Array): { x: number; y: number; distance: number } {
    let bestX = 0;
    let bestY = 0;
    let minDistance = Infinity;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const distance = this.calculateDistance(input, this.nodes[y][x].weights);
        if (distance < minDistance) {
          minDistance = distance;
          bestX = x;
          bestY = y;
        }
      }
    }

    return { x: bestX, y: bestY, distance: minDistance };
  }

  private updateWeights(input: Float64Array, bmu: { x: number; y: number }): void {
    const time_constant = this.training_iterations / 1000;
    const current_learning_rate = this.learning_rate * Math.exp(-time_constant);
    const current_radius = this.neighborhood_radius * Math.exp(-time_constant);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const distance_to_bmu = Math.sqrt(
          Math.pow(x - bmu.x, 2) + Math.pow(y - bmu.y, 2)
        );

        if (distance_to_bmu <= current_radius) {
          const influence = Math.exp(-Math.pow(distance_to_bmu, 2) / (2 * Math.pow(current_radius, 2)));
          
          for (let i = 0; i < this.feature_dimensions; i++) {
            this.nodes[y][x].weights[i] += 
              current_learning_rate * influence * (input[i] - this.nodes[y][x].weights[i]);
          }
          
          this.nodes[y][x].activation = influence;
          this.nodes[y][x].access_count++;
          this.nodes[y][x].last_update = Date.now();
        }
      }
    }
  }

  train(input: Float64Array): { cluster: number; confidence: number } {
    const bmu = this.findBestMatchingUnit(input);
    this.updateWeights(input, bmu);
    this.training_iterations++;

    const cluster_id = bmu.y * this.width + bmu.x;
    const confidence = 1 / (1 + bmu.distance); // Convert distance to confidence

    return { cluster: cluster_id, confidence };
  }

  getClusterStats(): {
    total_clusters: number;
    active_clusters: number;
    avg_activation: number;
    training_iterations: number;
  } {
    let active_count = 0;
    let total_activation = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const node = this.nodes[y][x];
        if (node.access_count > 0) active_count++;
        total_activation += node.activation;
      }
    }

    return {
      total_clusters: this.width * this.height,
      active_clusters: active_count,
      avg_activation: total_activation / (this.width * this.height),
      training_iterations: this.training_iterations
    };
  }
}

// === Advanced Redis-Compatible Cache with SOM Intelligence ===
export class RedisSOMapCache extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private som: SelfOrganizingMap;
  private max_memory: number;
  private current_memory: number = 0;
  private compression_enabled: boolean;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0,
    total_operations: 0
  };

  constructor(options: {
    max_memory?: number; // In bytes
    som_width?: number;
    som_height?: number;
    compression_enabled?: boolean;
  } = {}) {
    super();
    
    this.max_memory = options.max_memory || 512 * 1024 * 1024; // 512MB default
    this.compression_enabled = options.compression_enabled ?? true;
    this.som = new SelfOrganizingMap(
      options.som_width || 15,
      options.som_height || 15,
      8 // feature dimensions
    );

    this.startPeriodicOptimization();
  }

  private extractFeatures(key: string, value: any, metadata?: Partial<CacheEntry['metadata']>): Float64Array {
    const key_hash = this.hashString(key);
    const value_size = this.calculateSize(value);
    const content_complexity = this.analyzeContentComplexity(value);
    const temporal_locality = Date.now() / 1000000000; // Normalized timestamp
    const access_pattern_score = this.getAccessPatternScore(metadata?.access_pattern || 'random');
    const ai_relevance = metadata?.ai_relevance || 0;
    const compression_benefit = this.estimateCompressionBenefit(value);
    const key_similarity = this.calculateKeySimilarity(key);

    return new Float64Array([
      key_hash,
      Math.log(value_size + 1) / 10, // Normalized log size
      content_complexity,
      temporal_locality,
      access_pattern_score,
      ai_relevance,
      compression_benefit,
      key_similarity
    ]);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  }

  private calculateSize(value: any): number {
    if (typeof value === 'string') return value.length * 2;
    if (value instanceof Buffer) return value.length;
    if (typeof value === 'object') return JSON.stringify(value).length * 2;
    return 8;
  }

  private analyzeContentComplexity(value: any): number {
    if (typeof value === 'string') {
      const unique_chars = new Set(value).size;
      return Math.min(unique_chars / 256, 1);
    }
    if (typeof value === 'object') {
      const json_str = JSON.stringify(value);
      const unique_chars = new Set(json_str).size;
      return Math.min(unique_chars / 256, 1);
    }
    return 0.5;
  }

  private getAccessPatternScore(pattern: string): number {
    const patterns = { frequent: 1.0, burst: 0.8, linear: 0.6, random: 0.4 };
    return patterns[pattern as keyof typeof patterns] || 0.4;
  }

  private estimateCompressionBenefit(value: any): number {
    if (typeof value === 'string' && value.length > 100) {
      const repetition_ratio = this.calculateRepetitionRatio(value);
      return repetition_ratio;
    }
    if (typeof value === 'object') {
      const json_str = JSON.stringify(value);
      if (json_str.length > 100) {
        return this.calculateRepetitionRatio(json_str);
      }
    }
    return 0;
  }

  private calculateRepetitionRatio(str: string): number {
    const chunks = str.match(/.{1,4}/g) || [];
    const unique_chunks = new Set(chunks).size;
    return 1 - (unique_chunks / chunks.length);
  }

  private calculateKeySimilarity(key: string): number {
    const existing_keys = Array.from(this.cache.keys());
    if (existing_keys.length === 0) return 0;

    let max_similarity = 0;
    for (const existing_key of existing_keys.slice(-10)) { // Check last 10 keys
      const similarity = this.levenshteinSimilarity(key, existing_key);
      max_similarity = Math.max(max_similarity, similarity);
    }
    return max_similarity;
  }

  private levenshteinSimilarity(a: string, b: string): number {
    const matrix: number[][] = [];
    const len_a = a.length;
    const len_b = b.length;

    for (let i = 0; i <= len_b; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len_a; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len_b; i++) {
      for (let j = 1; j <= len_a; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const max_len = Math.max(len_a, len_b);
    return max_len === 0 ? 1 : 1 - (matrix[len_b][len_a] / max_len);
  }

  private compressValue(value: any): { compressed: any; ratio: number; type: string } {
    if (!this.compression_enabled) {
      return { compressed: value, ratio: 1, type: 'none' };
    }

    if (typeof value === 'string' && value.length > 100) {
      // Simple run-length encoding for demonstration
      const compressed = this.runLengthEncode(value);
      const ratio = value.length / compressed.length;
      this.stats.compressions++;
      return { compressed, ratio, type: 'rle' };
    }

    if (typeof value === 'object') {
      const json_str = JSON.stringify(value);
      if (json_str.length > 100) {
        const compressed = this.runLengthEncode(json_str);
        const ratio = json_str.length / compressed.length;
        this.stats.compressions++;
        return { compressed: JSON.parse(this.runLengthDecode(compressed)), ratio, type: 'json-rle' };
      }
    }

    return { compressed: value, ratio: 1, type: 'none' };
  }

  private runLengthEncode(str: string): string {
    let result = '';
    let i = 0;
    while (i < str.length) {
      let count = 1;
      while (i + count < str.length && str[i] === str[i + count]) {
        count++;
      }
      result += str[i] + (count > 1 ? count.toString() : '');
      i += count;
    }
    return result;
  }

  private runLengthDecode(str: string): string {
    let result = '';
    let i = 0;
    while (i < str.length) {
      const char = str[i];
      let count = '';
      i++;
      while (i < str.length && !isNaN(parseInt(str[i]))) {
        count += str[i];
        i++;
      }
      const repeat_count = count ? parseInt(count) : 1;
      result += char.repeat(repeat_count);
    }
    return result;
  }

  private calculatePriorityScore(features: Float64Array, som_result: { cluster: number; confidence: number }): number {
    // Weighted combination of features and SOM results
    const feature_score = features[4] * 0.3 + features[5] * 0.4 + features[6] * 0.2 + som_result.confidence * 0.1;
    return Math.min(Math.max(feature_score, 0), 1);
  }

  // === Redis-Compatible API ===
  async set(
    key: string, 
    value: any, 
    options: {
      ttl?: number;
      metadata?: Partial<CacheEntry['metadata']>;
    } = {}
  ): Promise<boolean> {
    this.stats.total_operations++;

    const features = this.extractFeatures(key, value, options.metadata);
    const som_result = this.som.train(features);
    const { compressed, ratio, type } = this.compressValue(value);
    const size = this.calculateSize(compressed);
    const priority_score = this.calculatePriorityScore(features, som_result);

    // Memory pressure management
    if (this.current_memory + size > this.max_memory) {
      await this.intelligentEviction(size);
    }

    const entry: CacheEntry = {
      key,
      value: compressed,
      ttl: options.ttl || 300000, // 5 minutes default
      created_at: Date.now(),
      access_count: 1,
      size,
      som_cluster: som_result.cluster,
      priority_score,
      metadata: {
        content_type: this.detectContentType(value),
        compression_ratio: ratio,
        access_pattern: options.metadata?.access_pattern || 'random',
        ai_relevance: options.metadata?.ai_relevance || 0,
        ...options.metadata
      }
    };

    this.cache.set(key, entry);
    this.current_memory += size;

    this.emit('set', { key, size, cluster: som_result.cluster, confidence: som_result.confidence });
    return true;
  }

  async get(key: string): Promise<any> {
    this.stats.total_operations++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return null;
    }

    // TTL check
    if (Date.now() - entry.created_at > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.emit('expire', key);
      return null;
    }

    // Update access patterns
    entry.access_count++;
    const features = this.extractFeatures(key, entry.value, entry.metadata);
    const som_result = this.som.train(features);
    entry.som_cluster = som_result.cluster;
    entry.priority_score = this.calculatePriorityScore(features, som_result);

    this.stats.hits++;
    this.emit('hit', { key, access_count: entry.access_count, cluster: som_result.cluster });

    // Decompress if needed
    if (entry.metadata.compression_ratio && entry.metadata.compression_ratio > 1) {
      if (typeof entry.value === 'string') {
        return this.runLengthDecode(entry.value);
      }
    }

    return entry.value;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.current_memory -= entry.size;
      this.cache.delete(key);
      this.emit('delete', { key, size: entry.size });
      return true;
    }
    return false;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.created_at <= entry.ttl) {
      return true;
    }
    return false;
  }

  async keys(pattern?: string): Promise<string[]> {
    const all_keys = Array.from(this.cache.keys());
    if (!pattern) return all_keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return all_keys.filter((key: any) => regex.test(key));
  }

  async flushAll(): Promise<boolean> {
    const count = this.cache.size;
    this.cache.clear();
    this.current_memory = 0;
    this.emit('flush', count);
    return true;
  }

  private async intelligentEviction(needed_space: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority score (lower = evict first)
    entries.sort(([, a], [, b]) => a.priority_score - b.priority_score);
    
    let freed_space = 0;
    const evicted_keys: string[] = [];
    
    for (const [key, entry] of entries) {
      if (freed_space >= needed_space) break;
      
      this.cache.delete(key);
      this.current_memory -= entry.size;
      freed_space += entry.size;
      evicted_keys.push(key);
    }
    
    this.stats.evictions += evicted_keys.length;
    this.emit('eviction', { keys: evicted_keys, freed_space });
  }

  private detectContentType(value: any): CacheEntry['metadata']['content_type'] {
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value)) return 'buffer';
    if (typeof value === 'object') return 'object';
    return 'json';
  }

  private startPeriodicOptimization(): void {
    setInterval(() => {
      this.performOptimization();
    }, 60000); // Every minute
  }

  private performOptimization(): void {
    // Remove expired entries
    const now = Date.now();
    const expired_keys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.created_at > entry.ttl) {
        expired_keys.push(key);
      }
    }
    
    expired_keys.forEach((key: any) => this.delete(key));
    
    // Retrain SOM with recent access patterns
    const recent_entries = Array.from(this.cache.values())
      .filter((entry: any) => entry.access_count > 1)
      .slice(-100); // Last 100 accessed items
    
    for (const entry of recent_entries) {
      const features = this.extractFeatures(entry.key, entry.value, entry.metadata);
      this.som.train(features);
    }
    
    this.emit('optimization', {
      expired_removed: expired_keys.length,
      som_retrained: recent_entries.length
    });
  }

  getStats() {
    return {
      ...this.stats,
      memory: {
        current: this.current_memory,
        max: this.max_memory,
        utilization: (this.current_memory / this.max_memory) * 100
      },
      cache: {
        size: this.cache.size,
        hit_rate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100
      },
      som: this.som.getClusterStats(),
      compression: {
        enabled: this.compression_enabled,
        compressions_performed: this.stats.compressions
      }
    };
  }

  // === Neural Network Analysis Methods ===
  async analyzeAccessPatterns(): Promise<{
    clusters: Array<{ id: number; patterns: string[]; confidence: number }>;
    recommendations: string[];
  }> {
    const som_stats = this.som.getClusterStats();
    const entries_by_cluster = new Map<number, CacheEntry[]>();
    
    // Group entries by SOM cluster
    for (const entry of this.cache.values()) {
      if (!entries_by_cluster.has(entry.som_cluster)) {
        entries_by_cluster.set(entry.som_cluster, []);
      }
      entries_by_cluster.get(entry.som_cluster)!.push(entry);
    }
    
    const clusters = Array.from(entries_by_cluster.entries()).map(([id, entries]) => ({
      id,
      patterns: entries.map((e: any) => e.metadata.access_pattern),
      confidence: entries.reduce((sum, e) => sum + e.priority_score, 0) / entries.length
    }));
    
    const recommendations = this.generateRecommendations(clusters, som_stats);
    
    return { clusters, recommendations };
  }

  private generateRecommendations(
    clusters: Array<{ id: number; patterns: string[]; confidence: number }>,
    som_stats: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (som_stats.active_clusters < som_stats.total_clusters * 0.3) {
      recommendations.push('Consider reducing SOM size - many clusters are unused');
    }
    
    const hit_rate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    if (hit_rate < 70) {
      recommendations.push('Hit rate is low - consider increasing cache size or TTL');
    }
    
    if (this.current_memory > this.max_memory * 0.9) {
      recommendations.push('Memory usage is high - consider more aggressive eviction');
    }
    
    const high_confidence_clusters = clusters.filter((c: any) => c.confidence > 0.8);
    if (high_confidence_clusters.length > 0) {
      recommendations.push(`${high_confidence_clusters.length} clusters show high confidence - good cache organization`);
    }
    
    return recommendations;
  }
}

// === Factory and Helper Functions ===
export function createRedisSOMapCache(options?: {
  max_memory?: number;
  som_width?: number;
  som_height?: number;
  compression_enabled?: boolean;
}): RedisSOMapCache {
  return new RedisSOMapCache(options);
}

export function createDockerOptimizedCache(): RedisSOMapCache {
  return new RedisSOMapCache({
    max_memory: 256 * 1024 * 1024, // 256MB for Docker optimization
    som_width: 12,
    som_height: 12,
    compression_enabled: true
  });
}

export function create70GBDevCache(): RedisSOMapCache {
  return new RedisSOMapCache({
    max_memory: 2 * 1024 * 1024 * 1024, // 2GB for 70GB dev environment
    som_width: 20,
    som_height: 20,
    compression_enabled: true
  });
}
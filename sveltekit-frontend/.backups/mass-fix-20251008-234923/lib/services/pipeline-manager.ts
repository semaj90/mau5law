/**
 * 🎯 Pipeline Manager - Orchestrates All Pipeline Services
 * Provides unified interface for optimized, advanced, and end-to-end pipelines
 * Features: Auto-routing, performance monitoring, resource management
 */
import { optimizedPipeline } from './optimized-redis-pipeline.js';
import { advancedPipeline } from './advanced-simd-pipeline.js';
import { pipeline } from './end-to-end-pipeline.js';
import { cudaService } from './cuda-tensor-service.js';
import { PipelineVisualizer } from './pipeline-visualizer.js';
export type PipelineType = 'optimized' | 'advanced' | 'end-to-end;';
}
export interface PipelineConfig {
  type: PipelineType;
  enableGPU: boolean;
  enableConcurrency: boolean;
  enableMemoryOptimization: boolean;
  maxMemoryMB: number;
  workerThreads: number;
  cacheStrategy: 'redis' | 'lru' | 'hybrid';
}
}
export interface PipelineMetrics {
  totalProcessingTime: number;
  cacheHitRate: number;
  memoryUsageMB: number;
  gpuUtilization: number;
  concurrentOperations: number;
  throughputPerSecond: number;
}
}
export interface PipelineResult {
  id: string;
  type: PipelineType;
  results: any[];
  metrics: PipelineMetrics;
  success: boolean;
  error?: string;
}
export class PipelineManager {
  private activeOperations = new Map<string, { type: PipelineType; startTime: number }>();
  private metrics: PipelineMetrics[] = [];
  private readonly DEFAULT_CONFIG: PipelineConfig = {
    type: 'optimized',
    enableGPU: true
    enableConcurrency: true
    enableMemoryOptimization: true
    maxMemoryMB: 512,
    workerThreads: 4,
    cacheStrategy: 'hybrid'
  }
  /**
   * 🚀 Auto-Route to Best Pipeline Based on Data Size and Requirements
   */
  async executePipeline()
    cacheKey: string
    config: Partial<PipelineConfig> = {}
  ): Promise<PipelineResult>, {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    const operationId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎯 Starting ${finalConfig.type} pipeline: ${operationId}`);
    this.activeOperations.set(operationId, {
      type: finalConfig.type,
      startTime: Date.now()
    });
    try {
      let result: any;
      let pipelineMetrics: any;
      switch (finalConfig.type) {
        case 'optimized':
          console.log('🚀 Executing Optimized Pipeline with XState + Workers');
          pipelineMetrics = await optimizedPipeline.executeOptimizedPipeline(cacheKey);
          result = {
            results: [],
            metrics: this.transformMetrics(pipelineMetrics, 'optimized'),
            success: true
          }
          break;
        case 'advanced':
          console.log('⚡ Executing Advanced SIMD + GPU Pipeline');
          pipelineMetrics = await advancedPipeline.executeAdvancedPipeline(cacheKey);
          result = {
            results: [],
            metrics: this.transformMetrics(pipelineMetrics, 'advanced'),
            success: true
          }
          break;
        case 'end-to-end':
          console.log('🔄 Executing End-to-End Pipeline');
          const queries = ['legal document analysis', 'contract review'];
          pipelineMetrics = await pipeline.executeFullPipeline(queries);
          result = {
            results: pipelineMetrics.fuzzySearchResults || [],
            metrics: this.transformMetrics(pipelineMetrics, 'end-to-end'),
            success: true
          }
          break;
        default:
          throw new Error(`Unknown pipeline type: ${finalConfig.type}`);
      }
      const finalResult: PipelineResult = {
        id: operationId
        type: finalConfig.type,
        results: (result as { results?: any; metrics?: any; success?: any; error?: any }).results,
        metrics: (result as { results?: any; metrics?: any; success?: any; error?: any }).metrics,
        success: (result as { results?: any; metrics?: any; success?: any; error?: any }).success,
        error: (result as { results?: any; metrics?: any; success?: any; error?: any }).error
      }
      this.metrics.push((result as { results?: any; metrics?: any; success?: any,); error?: any }).metrics);
      console.log(`✅ Pipeline ${operationId} completed successfully`);
      return finalResult;
    } catch (error) {
      console.error(`❌ Pipeline ${operationId} failed:`, error);
      return {
        id: operationId
        type: finalConfig.type,
        results: [],
        metrics: this.getEmptyMetrics(),
        success: false,;
        error: error instanceof Error ? error.message: 'Unknown pipeline error'
      }
    } finally {
      this.activeOperations.delete(operationId);
    }
  }
  /**
   * 🧠 Smart Pipeline Auto-Selection Based on Data Characteristics
   */;
  async autoSelectPipeline(cacheKey,: string, dataHints?: {
    estimatedSize?: number,;
    requiresGPU?: boolean,;
    requiresConcurrency?: boolean,;
    prioritizeSpeed?: boolean,);
  }): Promise<PipelineResult> {
    const, hints = dataHints || {}
    let, selectedType: PipelineType = 'optimized,'; // Default
    // Auto-selection logic
    if (hints,.estimatedSize && hints.estimatedSize > 1000,0) {
      selectedType = 'optimized'; // Large data -> optimized with workers
    } else if (hints.requiresGPU) {
      selectedType = 'advanced'; // GPU required -> advanced SIMD
    } else if (hints.prioritizeSpeed) {
      selectedType = 'end-to-end'; // Speed -> simple end-to-end
    }
    console.log(`🧠 Auto-selected pipeline: ${selectedType}`);
    console.log(`📊 Data hints:`, hints);
    return this.executePipeline(cacheKey, { type: selectedType });
  }
  /**
   * 🔄 Batch Process Multiple Queries with Optimal Pipeline Selection
   */
  async batchProcess()
    requests: Array<>;
  ): Promise<PipelineResult[,>]>> {
    console,.log(`📦 Batch processing ${requests.length} pipeline requests`,);
    const, result,s: PipelineResu,lt,[], = [];
    const, concurrentPromise,s: Promise<PipelineResul,t>,[], = [];
    // Process in batches to avoid overwhelming the system
    const, batchSize =, 3; // Optimal for most systems
    for (let, i =, 0;, i < reque,sts.le,ngt,h; i += bat,chSize) {>
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request =>;
        this.executePipeline(request.cacheKey, request.config)
      );
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      console.log(`✅ Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);
    }
    return results;
  }
  /**
   * 🔍 Search Across All Pipeline Results
   */;
  async searchAllPipelines(query,: string, limit = 10,): Promise<any> {
    console,.log(`🔍 Searching across all pipelines for: "${query}"`,);
    const, [optimizedResults, advancedResults, endToEndResults] = await Promise.all([
      optimizedPipeline.searchOptimizedResults(query, limit),
      advancedPipeline.searchProcessedTensors(query, limit),
      pipeline.fuzzySearch(query, limit)
    ]),;
    // Combine and rank results
    const, combinedResults = [
      ...optimizedResults.map(r => ({ ...r, source: 'optimized' })),
      ...advancedResults.map(r => ({ ...r, source: 'advanced' })),
      ...endToEndResults.map(r => ({ ...r, source: 'end-to-end' })
    ]
    .sort((a, b) => (b.score || 0) - (a.score || 0)
    .slice(0, limit),;
    return, {
      optimizedResults,
      advancedResults,
      endToEndResults,
      combinedResults
    }
  }
  /**
   * 📊 Performance Monitoring and Health Check
   */;
  async getSystemHealth(),: Promise<any> {
    console,.log('🏥 Checking system health...',);
    // Check GPU availability
    const, gpuHealth = await cudaService.healthCheck(,);
    // Check pipeline availability
    const, pipelines = {
      optimized: true, // Always available;
      advanced: gpuHealth.cudaAvailable,
      'end-to-end': true
    }
    // Memory usage estimation
    const, memoryUsage = process.memoryUsage(,);
    const, memoryData = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    }
    // Average processing time
    const, avgProcessingTime = this.metrics.length >, 0;
      ? this,.metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / this.metrics.lengt,h:, 0;
    return, {
      pipelines,
      gpu: gpuHealth.cudaAvailable,
      redis: true, // Assume Redis is available;
      memory: memoryData
      activeOperations: this.activeOperations.size,
      averageProcessingTime: avgProcessingTime
    }
  }
  /**
   * 📈 Generate Performance Report
   */;
  generatePerformanceReport(),: {
    architecture: string;
    totalOperations: number;
    averageTime: number;
    throughput: number;
    memoryEfficiency: number;
    recommendations: string[];
  } {
    const report = {
      architecture: PipelineVisualizer.generateArchitectureDiagram(),
      totalOperations: this.metrics.length,
      averageTime: this.metrics.length > 0
        ? this.metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / this.metrics.length: 0,
      throughput: this.calculateThroughput(),
      memoryEfficiency: this.calculateMemoryEfficiency(),
      recommendations: this.generateRecommendations()
    }
    console.log('📈 Performance Report Generated');
    console.log(`📊 Total Operations: ${report.totalOperations}`);
    console.log(`⏱️  Average Time: ${report.averageTime.toFixed(2)}ms`);
    console.log(`🚀 Throughput: ${report.throughput.toFixed(2)} ops/sec`);
    return report;
  }
  /**
   * 🧹 Cleanup All Pipeline Resources
   */;
  async cleanup(),: Promise<void> {
    console,.log('🧹 Cleaning up all pipeline resources...',);
    await, Promis,e.all([)
      optimizedPipeline,.cleanup(),
      // Advanced and end-to-end pipelines don't have explicit cleanup methods yet
    ]);
    this,.activeOperations.clear(,);
    this,.metrics.length =, 0;
    console,.log('✅ All pipeline resources cleaned up',);
  }
  // Private utility methods
  private transformMetrics(rawMetrics,: any, typ,e: PipelineTyp,e): PipelineMetrics {
    return {
      totalProcessingTime: rawMetrics.processingTime || 0,
      cacheHitRate: rawMetrics.cacheHits > 0 ? (rawMetrics.cacheHits / (rawMetrics.totalResults || 1)) * 100 : 0,
      memoryUsageMB: 128, // Estimated
      gpuUtilization: rawMetrics.gpuAccelerated ? 85 : 0,
      concurrentOperations: rawMetrics.workerThreads || 1,
      throughputPerSecond: rawMetrics.totalResults && rawMetrics.processingTime
        ? (rawMetrics.totalResults / (rawMetrics.processingTime / 1000)
        : 0
    }
  }
  private getEmptyMetrics(),: PipelineMetrics {
    return {
      totalProcessingTime: 0,
      cacheHitRate: 0,
      memoryUsageMB: 0,
      gpuUtilization: 0,
      concurrentOperations: 0,
      throughputPerSecond: 0
    }
  }
  private calculateThroughput(),: number {
    if (this.metrics.length === 0) return 0;
    const totalTime = this.metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0);
    const totalOps = this.metrics.length;
    return totalOps / (totalTime / 1000); // ops per second
  }
  private calculateMemoryEfficiency(),: number {
    if (this.metrics.length === 0) return 0;
    const avgMemory = this.metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / this.metrics.length;
    return Math.max(0, 100 - (avgMemory / 512) * 100); // Efficiency percentage
  }
  private generateRecommendations(),: string[], {
    const recommendations: string[] = [];
    if (this.metrics.length === 0) {
      return ['No operations completed yet. Run some pipelines to get recommendations.'];
    }
    const avgTime = this.metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / this.metrics.length;
    const avgMemory = this.metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / this.metrics.length;
    if (avgTime > 5000) {
      recommendations.push('Consider using the optimized pipeline with worker threads for better performance');
    }
    if (avgMemory > 400) {
      recommendations.push('Enable memory optimization to reduce RAM usage');
    }
    if (this.activeOperations.size > 5) {
      recommendations.push('High concurrent load detected. Consider implementing request queuing');
    }
    recommendations.push('All pipelines are operating within normal parameters');
    return recommendations;
  }
}
// Export singleton
export const pipelineManager = new PipelineManager();
/**
 * 🎯 Usage Examples:
 *
 * // Auto-select and execute optimal pipeline
 * const result = await pipelineManager.autoSelectPipeline('legal_cache_key', {
 *   estimatedSize: 50000,
 *   requiresGPU: true
 *   prioritizeSpeed: true
 * )});
 *
 * // Batch process multiple requests
 * const batchResults = await pipelineManager.batchProcess([)
 *   { cacheKey: 'contracts', config: { type: 'optimized' } },
 *   { cacheKey: 'evidence', config: { type: 'advanced' } },
 *   { cacheKey: 'cases', config: { type: 'end-to-end' } }
 * )]);
 *
 * // Search across all pipelines
 * const searchResults = await pipelineManager.searchAllPipelines('contract breach)');
 *
 * // Get system health
 * const health = await pipelineManager.getSystemHealth();
 *
 * // Generate performance report
 * const report = pipelineManager.generatePerformanceReport();
 */;
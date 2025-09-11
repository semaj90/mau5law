/**
 * MCP Multi-Core Server Integration
 * Interfaces with the MCP multi-core server for distributed AI processing
 * Provides load balancing and parallel execution across multiple worker cores
 */

import { logger } from '$lib/server/ai/logger.js';

export interface MCPWorkerCore {
  id: string;
  port: number;
  status: 'online' | 'offline' | 'busy' | 'error';
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  models: string[];
  lastHeartbeat: number;
  processingQueue: number;
  averageResponseTime: number;
}

export interface MCPTask {
  id: string;
  type: 'embedding' | 'generation' | 'analysis' | 'search' | 'workflow';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: any;
  assignedCore?: string;
  startTime?: number;
  estimatedDuration?: number;
}

export interface MCPResponse {
  success: boolean;
  taskId: string;
  coreId: string;
  result: any;
  processingTime: number;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    cacheHit: boolean;
    gpuAccelerated: boolean;
  };
}

export class MCPMultiCoreClient {
  private cores = new Map<string, MCPWorkerCore>();
  private activeTasks = new Map<string, MCPTask>();
  private baseUrl: string;
  private healthCheckInterval: number | null = null;
  private loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'capability-based' = 'least-loaded';

  constructor(baseUrl: string = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.initializeClient();
  }

  private async initializeClient() {
    logger.info('[MCP Multi-Core] Initializing client...');
    
    try {
      await this.discoverCores();
      this.startHealthChecking();
      
      logger.info(`[MCP Multi-Core] Client initialized with ${this.cores.size} cores`);
    } catch (error) {
      logger.error('[MCP Multi-Core] Initialization failed:', error);
    }
  }

  /**
   * Discover available worker cores from the MCP server
   */
  private async discoverCores(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cores/status`);
      if (!response.ok) {
        throw new Error(`MCP server not available: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear existing cores
      this.cores.clear();
      
      // Add discovered cores
      if (data.cores && Array.isArray(data.cores)) {
        for (const coreData of data.cores) {
          const core: MCPWorkerCore = {
            id: coreData.id,
            port: coreData.port,
            status: coreData.status || 'online',
            capabilities: coreData.capabilities || [],
            currentLoad: coreData.currentLoad || 0,
            maxLoad: coreData.maxLoad || 10,
            models: coreData.models || [],
            lastHeartbeat: Date.now(),
            processingQueue: coreData.processingQueue || 0,
            averageResponseTime: coreData.averageResponseTime || 1000,
          };
          
          this.cores.set(core.id, core);
        }
      }
      
      logger.info(`[MCP Multi-Core] Discovered ${this.cores.size} worker cores`);
    } catch (error) {
      logger.error('[MCP Multi-Core] Core discovery failed:', error);
      throw error;
    }
  }

  /**
   * Start periodic health checking of worker cores
   */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkCoreHealth();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check health of all worker cores
   */
  private async checkCoreHealth(): Promise<void> {
    const healthPromises = Array.from(this.cores.values()).map(async (core) => {
      try {
        const response = await fetch(`${this.baseUrl}/api/cores/${core.id}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          const healthData = await response.json();
          core.status = healthData.status || 'online';
          core.currentLoad = healthData.currentLoad || 0;
          core.processingQueue = healthData.processingQueue || 0;
          core.averageResponseTime = healthData.averageResponseTime || core.averageResponseTime;
          core.lastHeartbeat = Date.now();
        } else {
          core.status = 'error';
        }
      } catch (error) {
        core.status = 'offline';
        logger.warn(`[MCP Multi-Core] Core ${core.id} health check failed:`, error);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Submit a task to the most appropriate worker core
   */
  async submitTask(task: MCPTask): Promise<MCPResponse> {
    const startTime = Date.now();
    task.startTime = startTime;
    
    try {
      // Select optimal core for the task
      const selectedCore = this.selectOptimalCore(task);
      if (!selectedCore) {
        throw new Error('No available worker cores for task processing');
      }

      task.assignedCore = selectedCore.id;
      this.activeTasks.set(task.id, task);

      logger.info(`[MCP Multi-Core] Submitting task ${task.id} to core ${selectedCore.id}`);

      // Submit to selected core
      const response = await fetch(`${this.baseUrl}/api/cores/${selectedCore.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          type: task.type,
          priority: task.priority,
          payload: task.payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Core processing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      // Update core metrics
      selectedCore.currentLoad = Math.max(0, selectedCore.currentLoad - 1);
      selectedCore.averageResponseTime = 
        (selectedCore.averageResponseTime * 0.9) + (processingTime * 0.1);

      // Remove from active tasks
      this.activeTasks.delete(task.id);

      const mcpResponse: MCPResponse = {
        success: true,
        taskId: task.id,
        coreId: selectedCore.id,
        result: result.data || result.result || result,
        processingTime,
        metadata: {
          model: result.model || 'unknown',
          tokens: result.tokens || 0,
          cacheHit: result.cacheHit || false,
          gpuAccelerated: result.gpuAccelerated || false,
        },
      };

      logger.info(`[MCP Multi-Core] Task ${task.id} completed in ${processingTime}ms`);
      return mcpResponse;

    } catch (error) {
      // Clean up on error
      this.activeTasks.delete(task.id);
      
      logger.error(`[MCP Multi-Core] Task ${task.id} failed:`, error);
      
      return {
        success: false,
        taskId: task.id,
        coreId: task.assignedCore || 'unknown',
        result: null,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Select the optimal worker core for a given task
   */
  private selectOptimalCore(task: MCPTask): MCPWorkerCore | null {
    const availableCores = Array.from(this.cores.values())
      .filter(core => 
        core.status === 'online' && 
        core.currentLoad < core.maxLoad &&
        this.coreSupportsTask(core, task)
      );

    if (availableCores.length === 0) {
      return null;
    }

    switch (this.loadBalancingStrategy) {
      case 'least-loaded':
        return availableCores.reduce((best, current) => 
          (current.currentLoad / current.maxLoad) < (best.currentLoad / best.maxLoad) ? current : best
        );

      case 'capability-based':
        // Prefer cores with specific capabilities for the task type
        const capableCores = availableCores.filter(core => 
          core.capabilities.includes(task.type) || core.capabilities.includes('all')
        );
        return capableCores.length > 0 
          ? capableCores.reduce((best, current) => 
              current.averageResponseTime < best.averageResponseTime ? current : best
            )
          : availableCores[0];

      case 'round-robin':
      default:
        // Simple round-robin selection
        const sortedCores = availableCores.sort((a, b) => a.lastHeartbeat - b.lastHeartbeat);
        return sortedCores[0];
    }
  }

  /**
   * Check if a core supports a given task type
   */
  private coreSupportsTask(core: MCPWorkerCore, task: MCPTask): boolean {
    if (core.capabilities.includes('all')) {
      return true;
    }
    
    return core.capabilities.includes(task.type) || 
           core.capabilities.length === 0; // If no specific capabilities, assume it supports all
  }

  /**
   * Submit multiple tasks in parallel
   */
  async submitParallelTasks(tasks: MCPTask[]): Promise<MCPResponse[]> {
    logger.info(`[MCP Multi-Core] Submitting ${tasks.length} parallel tasks`);
    
    const taskPromises = tasks.map(task => this.submitTask(task));
    const results = await Promise.allSettled(taskPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          taskId: tasks[index].id,
          coreId: 'unknown',
          result: null,
          processingTime: 0,
          error: result.reason instanceof Error ? result.reason.message : 'Parallel task failed',
        };
      }
    });
  }

  /**
   * Get status of all worker cores
   */
  getCoreStatus(): MCPWorkerCore[] {
    return Array.from(this.cores.values());
  }

  /**
   * Get active task count
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const cores = Array.from(this.cores.values());
    const onlineCores = cores.filter(core => core.status === 'online');
    
    return {
      totalCores: cores.length,
      onlineCores: onlineCores.length,
      totalLoad: cores.reduce((sum, core) => sum + core.currentLoad, 0),
      totalCapacity: cores.reduce((sum, core) => sum + core.maxLoad, 0),
      averageResponseTime: onlineCores.length > 0 
        ? onlineCores.reduce((sum, core) => sum + core.averageResponseTime, 0) / onlineCores.length
        : 0,
      activeTasks: this.activeTasks.size,
      loadBalancingStrategy: this.loadBalancingStrategy,
    };
  }

  /**
   * Set load balancing strategy
   */
  setLoadBalancingStrategy(strategy: 'round-robin' | 'least-loaded' | 'capability-based') {
    this.loadBalancingStrategy = strategy;
    logger.info(`[MCP Multi-Core] Load balancing strategy set to: ${strategy}`);
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Cancel any active tasks
    this.activeTasks.clear();
    this.cores.clear();
    
    logger.info('[MCP Multi-Core] Client disconnected');
  }
}

// Export singleton instance
export const mcpMultiCore = new MCPMultiCoreClient();
export default mcpMultiCore;
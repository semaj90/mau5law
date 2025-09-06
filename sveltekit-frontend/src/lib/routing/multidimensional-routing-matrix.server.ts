/**
 * @file Defines a data structure for routing cognitive tasks based on multiple dimensions.
 * This is a server-only module with '.server.ts' extension.
 */

interface Route {
  tool: string;
  cost: number;
  latency: number; // in ms
  quality: number; // 0-1 score
  throughput: number; // requests per second
  reliability: number; // 0-1 score
}

interface RouteConstraints {
  optimizeFor: 'cost' | 'latency' | 'quality' | 'throughput' | 'reliability';
  maxCost?: number;
  maxLatency?: number;
  minQuality?: number;
  minThroughput?: number;
  minReliability?: number;
}

class MultidimensionalRoutingMatrix {
  private matrix: Map<string, Route[]> = new Map();
  private isInitialized = false;
  private efficiencyScore = 0.92; // Mock efficiency score
  private routingHistory: Array<{
    task: string;
    route: Route;
    timestamp: number;
    success: boolean;
  }> = [];

  constructor() {
    console.log("MultidimensionalRoutingMatrix (server-only) instance created.");
  }

  /**
   * Initializes the matrix, loading routing data from a source.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log("Initializing Multidimensional Routing Matrix (server-only)...");
    
    // In a real implementation, this would load a configuration file,
    // query a database, or get data from a service discovery endpoint.
    await this.loadProductionData();
    this.isInitialized = true;
    console.log("Multidimensional Routing Matrix (server-only) initialized.");
  }

  private async loadProductionData(): Promise<void> {
    // Simulate loading from external source
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Legal Document Analysis Routes
    this.matrix.set('analyze_legal_document', [
      { 
        tool: 'legal-document-analyzer-grpc', 
        cost: 0.05, 
        latency: 500, 
        quality: 0.95,
        throughput: 100,
        reliability: 0.98
      },
      { 
        tool: 'legal-document-analyzer-rest-api', 
        cost: 0.02, 
        latency: 1500, 
        quality: 0.85,
        throughput: 50,
        reliability: 0.95
      },
      { 
        tool: 'legal-document-analyzer-quic', 
        cost: 0.08, 
        latency: 200, 
        quality: 0.97,
        throughput: 200,
        reliability: 0.99
      }
    ]);

    // Vector Search Routes
    this.matrix.set('vector_search', [
      {
        tool: 'postgresql-pgvector',
        cost: 0.01,
        latency: 100,
        quality: 0.90,
        throughput: 500,
        reliability: 0.99
      },
      {
        tool: 'qdrant-vector-db',
        cost: 0.03,
        latency: 50,
        quality: 0.95,
        throughput: 1000,
        reliability: 0.97
      },
      {
        tool: 'redis-vector-search',
        cost: 0.02,
        latency: 30,
        quality: 0.85,
        throughput: 800,
        reliability: 0.98
      }
    ]);

    // Evidence Processing Routes
    this.matrix.set('process_evidence', [
      {
        tool: 'tesseract-ocr-wasm',
        cost: 0.001, // Client-side processing
        latency: 2000,
        quality: 0.80,
        throughput: 10,
        reliability: 0.95
      },
      {
        tool: 'gpu-accelerated-ocr',
        cost: 0.10,
        latency: 300,
        quality: 0.95,
        throughput: 100,
        reliability: 0.98
      },
      {
        tool: 'cloud-vision-api',
        cost: 0.15,
        latency: 800,
        quality: 0.98,
        throughput: 200,
        reliability: 0.99
      }
    ]);

    // Case Management Routes
    this.matrix.set('case_management', [
      {
        tool: 'postgresql-direct',
        cost: 0.005,
        latency: 50,
        quality: 0.95,
        throughput: 1000,
        reliability: 0.99
      },
      {
        tool: 'neo4j-graph-queries',
        cost: 0.02,
        latency: 200,
        quality: 0.98,
        throughput: 300,
        reliability: 0.97
      }
    ]);
  }

  /**
   * Finds the optimal route for a given task based on constraints.
   */
  getOptimalRoute(task: string, constraints: RouteConstraints): Route | undefined {
    const routes = this.matrix.get(task);
    if (!routes || routes.length === 0) return undefined;

    // Filter routes based on hard constraints
    const viableRoutes = routes.filter(route => {
      return (
        (!constraints.maxCost || route.cost <= constraints.maxCost) &&
        (!constraints.maxLatency || route.latency <= constraints.maxLatency) &&
        (!constraints.minQuality || route.quality >= constraints.minQuality) &&
        (!constraints.minThroughput || route.throughput >= constraints.minThroughput) &&
        (!constraints.minReliability || route.reliability >= constraints.minReliability)
      );
    });

    if (viableRoutes.length === 0) return undefined;

    // Sort by optimization preference
    const sortedRoutes = viableRoutes.sort((a, b) => {
      switch (constraints.optimizeFor) {
        case 'cost':
          return a.cost - b.cost;
        case 'latency':
          return a.latency - b.latency;
        case 'quality':
          return b.quality - a.quality; // Higher is better
        case 'throughput':
          return b.throughput - a.throughput; // Higher is better
        case 'reliability':
          return b.reliability - a.reliability; // Higher is better
        default:
          // Multi-criteria optimization (weighted score)
          const scoreA = this.calculateRouteScore(a);
          const scoreB = this.calculateRouteScore(b);
          return scoreB - scoreA;
      }
    });

    const selectedRoute = sortedRoutes[0];
    
    // Record routing decision for learning
    this.recordRoutingDecision(task, selectedRoute, true);
    
    return selectedRoute;
  }

  /**
   * Calculate a multi-criteria score for a route
   */
  private calculateRouteScore(route: Route): number {
    // Normalize and weight different factors
    const normalizedCost = 1 - (route.cost / 0.20); // Assuming max cost of 0.20
    const normalizedLatency = 1 - (route.latency / 3000); // Assuming max latency of 3000ms
    const normalizedQuality = route.quality;
    const normalizedThroughput = route.throughput / 1000; // Normalize by max expected throughput
    const normalizedReliability = route.reliability;

    // Weighted combination (adjust weights based on priorities)
    return (
      normalizedCost * 0.15 +
      normalizedLatency * 0.25 +
      normalizedQuality * 0.25 +
      normalizedThroughput * 0.20 +
      normalizedReliability * 0.15
    );
  }

  /**
   * Record a routing decision for learning and analytics
   */
  private recordRoutingDecision(task: string, route: Route, success: boolean): void {
    this.routingHistory.push({
      task,
      route,
      timestamp: Date.now(),
      success
    });

    // Keep only recent history (last 1000 decisions)
    if (this.routingHistory.length > 1000) {
      this.routingHistory = this.routingHistory.slice(-1000);
    }

    // Update efficiency score based on recent decisions
    this.updateEfficiencyScore();
  }

  /**
   * Update efficiency score based on recent routing decisions
   */
  private updateEfficiencyScore(): void {
    const recentDecisions = this.routingHistory.slice(-100); // Last 100 decisions
    if (recentDecisions.length === 0) return;

    const successRate = recentDecisions.filter(d => d.success).length / recentDecisions.length;
    const averageLatency = recentDecisions.reduce((sum, d) => sum + d.route.latency, 0) / recentDecisions.length;
    const averageQuality = recentDecisions.reduce((sum, d) => sum + d.route.quality, 0) / recentDecisions.length;

    // Calculate efficiency score (0-1)
    const latencyScore = Math.max(0, 1 - (averageLatency / 2000)); // 2000ms as baseline
    this.efficiencyScore = (successRate * 0.4) + (latencyScore * 0.3) + (averageQuality * 0.3);
  }

  /**
   * Get current routing efficiency score
   */
  getEfficiencyScore(): number {
    return Math.round(this.efficiencyScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get routing statistics and analytics
   */
  getRoutingStats(): {
    totalRoutes: number;
    totalDecisions: number;
    efficiencyScore: number;
    routeDistribution: Record<string, number>;
    averageLatencyByTool: Record<string, number>;
  } {
    const totalRoutes = Array.from(this.matrix.values()).reduce((sum, routes) => sum + routes.length, 0);
    const routeDistribution: Record<string, number> = {};
    const latencyByTool: Record<string, number[]> = {};

    // Analyze routing history
    for (const decision of this.routingHistory) {
      const tool = decision.route.tool;
      routeDistribution[tool] = (routeDistribution[tool] || 0) + 1;
      
      if (!latencyByTool[tool]) {
        latencyByTool[tool] = [];
      }
      latencyByTool[tool].push(decision.route.latency);
    }

    // Calculate average latencies
    const averageLatencyByTool: Record<string, number> = {};
    for (const [tool, latencies] of Object.entries(latencyByTool)) {
      averageLatencyByTool[tool] = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    }

    return {
      totalRoutes,
      totalDecisions: this.routingHistory.length,
      efficiencyScore: this.efficiencyScore,
      routeDistribution,
      averageLatencyByTool
    };
  }

  /**
   * Get all available routes for a specific task
   */
  getAvailableRoutes(task: string): Route[] {
    return this.matrix.get(task) || [];
  }

  /**
   * Add or update routes for a task
   */
  updateRoutes(task: string, routes: Route[]): void {
    this.matrix.set(task, routes);
    console.log(`Updated routes for task: ${task}, count: ${routes.length}`);
  }

  /**
   * Health check - verify all routes are accessible
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    availableRoutes: number;
    totalRoutes: number;
    issues: string[];
  }> {
    let availableRoutes = 0;
    let totalRoutes = 0;
    const issues: string[] = [];

    for (const [task, routes] of this.matrix.entries()) {
      totalRoutes += routes.length;
      
      // In a real implementation, you'd ping each route/service
      // For now, simulate some unavailable routes
      const availableCount = Math.floor(routes.length * 0.9); // 90% availability
      availableRoutes += availableCount;
      
      if (availableCount < routes.length) {
        issues.push(`${task}: ${routes.length - availableCount} routes unavailable`);
      }
    }

    const availabilityRatio = totalRoutes > 0 ? availableRoutes / totalRoutes : 1;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (availabilityRatio < 0.7) {
      status = 'unhealthy';
    } else if (availabilityRatio < 0.9) {
      status = 'degraded';
    }

    return {
      status,
      availableRoutes,
      totalRoutes,
      issues
    };
  }
}

// Export a singleton instance for use across the server
export const multidimensionalRoutingMatrix = new MultidimensionalRoutingMatrix();

// Also export the class type if needed for dependency injection
export { MultidimensionalRoutingMatrix };
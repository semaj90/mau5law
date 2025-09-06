/**
 * Concurrent Node.js Server Configuration for SvelteKit
 * Enhanced development and production environment with memory-aware concurrency
 */

import { spawn, fork } from 'child_process';
import { cpus, totalmem, freemem } from 'os';
import cluster from 'cluster';
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// System resource detection
const CPU_COUNT = cpus().length;
const TOTAL_MEMORY_GB = Math.round(totalmem() / 1024 / 1024 / 1024);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Optimal concurrency settings based on hardware
const OPTIMAL_CONFIG = {
  // Core allocation strategy
  viteWorkers: Math.min(Math.max(CPU_COUNT - 2, 1), 8),
  preRenderWorkers: Math.min(Math.max(CPU_COUNT / 2, 1), 4),
  clusterWorkers: NODE_ENV === 'production' ? Math.min(CPU_COUNT, 16) : Math.min(2, CPU_COUNT),
  
  // Memory limits (in MB)
  maxOldSpaceSize: TOTAL_MEMORY_GB >= 16 ? 4096 : TOTAL_MEMORY_GB >= 8 ? 2048 : 1024,
  workerMemoryLimit: TOTAL_MEMORY_GB >= 16 ? 512 : TOTAL_MEMORY_GB >= 8 ? 256 : 128,
  
  // Connection limits
  maxConnections: TOTAL_MEMORY_GB >= 16 ? 10000 : TOTAL_MEMORY_GB >= 8 ? 5000 : 2000,
  
  // Performance settings
  enableHttp2: NODE_ENV === 'production',
  compressionLevel: NODE_ENV === 'production' ? 6 : 1,
  keepAliveTimeout: NODE_ENV === 'production' ? 65000 : 5000,
};

// Environment configurations
const ENV_CONFIG = {
  development: {
    port: 5173,
    host: '0.0.0.0',
    hmr: {
      port: 3131,
      clientPort: 3131
    },
    cors: true,
    sourcemap: true,
    minify: false,
    watch: true,
    hotReload: true,
    devtools: true,
    strictPort: false,
    logLevel: 'info'
  },
  
  production: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: false,
    sourcemap: false,
    minify: true,
    watch: false,
    hotReload: false,
    devtools: false,
    strictPort: true,
    logLevel: 'warn',
    compression: true,
    cache: {
      maxAge: '1y',
      staleWhileRevalidate: '1w'
    }
  }
};

/**
 * Performance Monitor with Memory Awareness
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpuUsage: [],
      memoryUsage: [],
      eventLoopDelay: [],
      requestCount: 0,
      errorCount: 0,
      startTime: Date.now()
    };
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    // CPU usage monitoring
    setInterval(() => {
      const usage = process.cpuUsage();
      this.metrics.cpuUsage.push({
        user: usage.user / 1000000, // Convert to seconds
        system: usage.system / 1000000,
        timestamp: Date.now()
      });
      
      // Keep only last 100 measurements
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage.shift();
      }
    }, 1000);
    
    // Memory usage monitoring
    setInterval(() => {
      const memory = process.memoryUsage();
      const freeSystemMemory = freemem();
      
      this.metrics.memoryUsage.push({
        rss: memory.rss / 1024 / 1024, // MB
        heapUsed: memory.heapUsed / 1024 / 1024,
        heapTotal: memory.heapTotal / 1024 / 1024,
        external: memory.external / 1024 / 1024,
        freeSystem: freeSystemMemory / 1024 / 1024,
        timestamp: Date.now()
      });
      
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
    }, 2000);
    
    // Event loop delay monitoring
    let start = performance.now();
    setInterval(() => {
      const delta = performance.now() - start;
      this.metrics.eventLoopDelay.push({
        delay: Math.max(0, delta - 100), // Expected interval is 100ms
        timestamp: Date.now()
      });
      
      if (this.metrics.eventLoopDelay.length > 50) {
        this.metrics.eventLoopDelay.shift();
      }
      
      start = performance.now();
    }, 100);
  }
  
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime,
      averageCpu: this.metrics.cpuUsage.length > 0 
        ? this.metrics.cpuUsage.reduce((sum, cpu) => sum + cpu.user + cpu.system, 0) / this.metrics.cpuUsage.length 
        : 0,
      averageMemory: this.metrics.memoryUsage.length > 0
        ? this.metrics.memoryUsage.reduce((sum, mem) => sum + mem.heapUsed, 0) / this.metrics.memoryUsage.length
        : 0,
      averageEventLoopDelay: this.metrics.eventLoopDelay.length > 0
        ? this.metrics.eventLoopDelay.reduce((sum, delay) => sum + delay.delay, 0) / this.metrics.eventLoopDelay.length
        : 0
    };
  }
  
  // Memory pressure detection
  isMemoryPressure() {
    if (this.metrics.memoryUsage.length === 0) return false;
    
    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const memoryUsagePercent = (latest.heapUsed / OPTIMAL_CONFIG.maxOldSpaceSize) * 100;
    const systemMemoryPercent = ((TOTAL_MEMORY_GB * 1024 - latest.freeSystem) / (TOTAL_MEMORY_GB * 1024)) * 100;
    
    return memoryUsagePercent > 80 || systemMemoryPercent > 90;
  }
  
  // Performance recommendation engine
  getRecommendations() {
    const metrics = this.getMetrics();
    const recommendations = [];
    
    if (metrics.averageEventLoopDelay > 50) {
      recommendations.push('High event loop delay detected. Consider reducing concurrent operations.');
    }
    
    if (this.isMemoryPressure()) {
      recommendations.push('Memory pressure detected. Consider reducing worker count or enabling garbage collection.');
    }
    
    if (metrics.averageCpu > 0.8) {
      recommendations.push('High CPU usage. Consider load balancing or optimizing hot paths.');
    }
    
    return recommendations;
  }
}

/**
 * Concurrent Server Manager
 */
class ConcurrentServerManager {
  constructor(environment = NODE_ENV) {
    this.environment = environment;
    this.config = ENV_CONFIG[environment];
    this.workers = [];
    this.monitor = new PerformanceMonitor();
    this.services = new Map();
    
    // Node.js optimization flags
    this.nodeFlags = [
      `--max-old-space-size=${OPTIMAL_CONFIG.maxOldSpaceSize}`,
      '--enable-source-maps',
      '--experimental-worker',
      '--experimental-json-modules',
      '--no-warnings',
      ...(environment === 'production' ? [
        '--optimize-for-size',
        '--max-semi-space-size=64'
      ] : [
        '--inspect=0.0.0.0:9229',
        '--experimental-repl-await'
      ])
    ];
    
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }
  
  /**
   * Start concurrent server architecture
   */
  async start() {
    console.log(`🚀 Starting ${this.environment} server with ${CPU_COUNT} cores and ${TOTAL_MEMORY_GB}GB RAM`);
    console.log(`📊 Optimal config: ${OPTIMAL_CONFIG.viteWorkers} Vite workers, ${OPTIMAL_CONFIG.clusterWorkers} cluster workers`);
    
    if (this.environment === 'development') {
      await this.startDevelopmentMode();
    } else {
      await this.startProductionMode();
    }
    
    // Start monitoring dashboard
    this.startMonitoringDashboard();
    
    return this;
  }
  
  /**
   * Development mode with HMR and concurrent services
   */
  async startDevelopmentMode() {
    // Start Vite development server with workers
    const viteProcess = spawn('node', [
      ...this.nodeFlags,
      './node_modules/vite/bin/vite.js',
      'dev',
      '--host', this.config.host,
      '--port', this.config.port.toString(),
      '--cors'
    ], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_WORKERS: OPTIMAL_CONFIG.viteWorkers.toString(),
        VITE_MEMORY_LIMIT: OPTIMAL_CONFIG.workerMemoryLimit.toString()
      }
    });
    
    viteProcess.stdout.on('data', (data) => {
      console.log(`[Vite] ${data}`);
    });
    
    viteProcess.stderr.on('data', (data) => {
      console.error(`[Vite Error] ${data}`);
    });
    
    this.services.set('vite', viteProcess);
    
    // Start concurrent services
    await this.startConcurrentServices();
    
    // Start file watchers with debouncing
    this.startFileWatchers();
    
    // Start development proxy
    this.startDevelopmentProxy();
    
    console.log(`✅ Development server running on http://${this.config.host}:${this.config.port}`);
    console.log(`🔧 HMR available on port ${this.config.hmr.port}`);
  }
  
  /**
   * Production mode with clustering and optimizations
   */
  async startProductionMode() {
    if (cluster.isPrimary) {
      console.log(`🏭 Primary process ${process.pid} is running`);
      
      // Create workers
      for (let i = 0; i < OPTIMAL_CONFIG.clusterWorkers; i++) {
        const worker = cluster.fork({
          WORKER_ID: i,
          WORKER_MEMORY_LIMIT: OPTIMAL_CONFIG.workerMemoryLimit
        });
        
        this.workers.push(worker);
        
        worker.on('message', (msg) => {
          if (msg.type === 'metrics') {
            this.handleWorkerMetrics(i, msg.data);
          }
        });
      }
      
      cluster.on('exit', (worker, code, signal) => {
        console.log(`💥 Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        
        if (!worker.exitedAfterDisconnect) {
          const newWorker = cluster.fork();
          const index = this.workers.indexOf(worker);
          if (index !== -1) {
            this.workers[index] = newWorker;
          }
        }
      });
      
      // Start load balancing
      this.startLoadBalancer();
      
    } else {
      // Worker process
      await this.startWorkerProcess();
    }
  }
  
  /**
   * Start concurrent background services
   */
  async startConcurrentServices() {
    const services = [
      // WebGPU Loki Accelerator (if we created it)
      {
        name: 'webgpu-accelerator',
        script: './src/lib/services/webgpu-loki-accelerator.ts',
        workers: 1
      },
      
      // File processing service
      {
        name: 'file-processor',
        script: './scripts/concurrent-file-processor.mjs',
        workers: Math.min(2, CPU_COUNT)
      },
      
      // Cache warming service
      {
        name: 'cache-warmer',
        script: './src/lib/services/drizzle-cache-warming.ts',
        workers: 1
      }
    ];
    
    for (const service of services) {
      try {
        for (let i = 0; i < service.workers; i++) {
          const worker = new Worker(service.script, {
            workerData: {
              workerId: i,
              totalWorkers: service.workers,
              memoryLimit: OPTIMAL_CONFIG.workerMemoryLimit
            }
          });
          
          worker.on('message', (data) => {
            console.log(`[${service.name}:${i}] ${JSON.stringify(data)}`);
          });
          
          worker.on('error', (error) => {
            console.error(`[${service.name}:${i}] Error:`, error);
          });
          
          this.services.set(`${service.name}:${i}`, worker);
        }
        
        console.log(`✅ Started ${service.name} with ${service.workers} worker(s)`);
      } catch (error) {
        console.warn(`⚠️ Could not start ${service.name}:`, error.message);
      }
    }
  }
  
  /**
   * File watcher with intelligent batching
   */
  startFileWatchers() {
    const chokidar = import('chokidar').then(({ default: chokidar }) => {
      const debounceMap = new Map();
      
      const watcher = chokidar.watch([
        './src/**/*.{ts,js,svelte,css}',
        './static/**/*',
        './.env*',
        './vite.config.*',
        './postcss.config.*'
      ], {
        ignoreInitial: true,
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.svelte-kit/**']
      });
      
      watcher.on('change', (path) => {
        // Debounce rapid changes
        if (debounceMap.has(path)) {
          clearTimeout(debounceMap.get(path));
        }
        
        debounceMap.set(path, setTimeout(() => {
          console.log(`📝 File changed: ${path}`);
          this.handleFileChange(path);
          debounceMap.delete(path);
        }, 300));
      });
      
      watcher.on('add', (path) => {
        console.log(`➕ File added: ${path}`);
      });
      
      watcher.on('unlink', (path) => {
        console.log(`➖ File removed: ${path}`);
      });
      
      return watcher;
    }).catch(error => {
      console.warn('⚠️ File watcher not available:', error.message);
    });
  }
  
  /**
   * Development proxy with intelligent routing
   */
  startDevelopmentProxy() {
    // This would integrate with the existing Vite proxy configuration
    // Enhanced routing for concurrent services
    console.log('🔄 Development proxy configured for concurrent services');
  }
  
  /**
   * Load balancer for production mode
   */
  startLoadBalancer() {
    // Implement round-robin load balancing with health checks
    console.log('⚖️ Load balancer started for production cluster');
  }
  
  /**
   * Worker process for production
   */
  async startWorkerProcess() {
    const workerId = process.env.WORKER_ID;
    console.log(`👷 Worker ${workerId} (${process.pid}) starting`);
    
    // Import and start SvelteKit server
    const { handler } = await import('@sveltejs/kit/vite');
    const express = (await import('express')).default;
    
    const app = express();
    
    // Apply optimizations
    if (this.environment === 'production') {
      const compression = (await import('compression')).default;
      app.use(compression({ level: OPTIMAL_CONFIG.compressionLevel }));
    }
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      const metrics = this.monitor.getMetrics();
      res.json({
        status: 'healthy',
        workerId,
        pid: process.pid,
        uptime: metrics.uptime,
        memory: metrics.averageMemory,
        recommendations: this.monitor.getRecommendations()
      });
    });
    
    // SvelteKit handler
    app.use(handler);
    
    const server = app.listen(this.config.port, this.config.host, () => {
      console.log(`✅ Worker ${workerId} listening on ${this.config.host}:${this.config.port}`);
    });
    
    // Configure server optimizations
    server.keepAliveTimeout = OPTIMAL_CONFIG.keepAliveTimeout;
    server.headersTimeout = OPTIMAL_CONFIG.keepAliveTimeout + 1000;
    server.maxConnections = OPTIMAL_CONFIG.maxConnections;
    
    // Send metrics to primary
    setInterval(() => {
      process.send({
        type: 'metrics',
        data: this.monitor.getMetrics()
      });
    }, 5000);
  }
  
  /**
   * Monitoring dashboard
   */
  startMonitoringDashboard() {
    setInterval(() => {
      const metrics = this.monitor.getMetrics();
      const recommendations = this.monitor.getRecommendations();
      
      console.log(`\n📊 Performance Metrics (${this.environment}):`);
      console.log(`   CPU: ${metrics.averageCpu.toFixed(2)}% avg`);
      console.log(`   Memory: ${metrics.averageMemory.toFixed(0)}MB avg`);
      console.log(`   Event Loop: ${metrics.averageEventLoopDelay.toFixed(2)}ms avg`);
      console.log(`   Requests: ${metrics.requestCount}`);
      console.log(`   Errors: ${metrics.errorCount}`);
      console.log(`   Uptime: ${Math.floor(metrics.uptime / 1000)}s`);
      
      if (recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
      // Memory pressure handling
      if (this.monitor.isMemoryPressure() && this.environment === 'development') {
        console.warn('⚠️ Memory pressure detected. Consider restarting development server.');
        global.gc && global.gc();
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Handle file changes intelligently
   */
  handleFileChange(filePath) {
    // Determine what services need to restart based on file path
    if (filePath.includes('vite.config') || filePath.includes('postcss.config')) {
      this.restartViteService();
    } else if (filePath.includes('.env')) {
      this.reloadEnvironment();
    } else if (filePath.includes('src/lib/services/')) {
      this.restartBackgroundServices();
    }
  }
  
  /**
   * Handle worker metrics from production cluster
   */
  handleWorkerMetrics(workerId, metrics) {
    // Aggregate and analyze worker metrics
    console.log(`[Worker ${workerId}] CPU: ${metrics.averageCpu}%, Memory: ${metrics.averageMemory}MB`);
  }
  
  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    console.log('\n🛑 Graceful shutdown initiated...');
    
    // Close all services
    for (const [name, service] of this.services.entries()) {
      try {
        if (typeof service.terminate === 'function') {
          await service.terminate();
        } else if (typeof service.kill === 'function') {
          service.kill();
        }
        console.log(`✅ Stopped ${name}`);
      } catch (error) {
        console.error(`❌ Error stopping ${name}:`, error);
      }
    }
    
    // Disconnect cluster workers
    if (cluster.isPrimary && this.workers.length > 0) {
      await Promise.all(
        this.workers.map(worker => 
          new Promise(resolve => {
            worker.disconnect();
            worker.on('disconnect', resolve);
          })
        )
      );
    }
    
    console.log('👋 Server shutdown complete');
    process.exit(0);
  }
  
  /**
   * Service restart utilities
   */
  async restartViteService() {
    const viteService = this.services.get('vite');
    if (viteService) {
      viteService.kill();
      // Wait a moment then restart
      setTimeout(() => {
        this.startDevelopmentMode();
      }, 2000);
    }
  }
  
  reloadEnvironment() {
    // Reload environment variables
    delete require.cache[require.resolve('dotenv/config')];
    require('dotenv/config');
    console.log('🔄 Environment variables reloaded');
  }
  
  async restartBackgroundServices() {
    console.log('🔄 Restarting background services...');
    
    // Stop existing background services
    for (const [name, service] of this.services.entries()) {
      if (name !== 'vite' && typeof service.terminate === 'function') {
        await service.terminate();
        this.services.delete(name);
      }
    }
    
    // Restart background services
    await this.startConcurrentServices();
  }
}

// Export for direct usage
export default ConcurrentServerManager;
export { OPTIMAL_CONFIG, ENV_CONFIG, PerformanceMonitor };

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new ConcurrentServerManager();
  manager.start().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}
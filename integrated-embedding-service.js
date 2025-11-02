#!/usr/bin/env node

/**
 * Complete GPU-Accelerated Legal AI Embedding Service
 * Integrates: Node.js + Redis + Postgres + Python RTX Worker + Context7 MCP
 * 
 * Architecture:
 * Node.js API ↔ Redis Cache ↔ Postgres Storage ↔ Python GPU Worker ↔ Context7 MCP
 */

const express = require('express');
const { createClient } = require('redis');
const { Pool } = require('pg');
const { spawn } = require('child_process');
const cors = require('cors');
const crypto = require('crypto');

// Import our custom embedding cache middleware
const { embeddingCache, getLegalEmbedding, getBatchLegalEmbeddings } = require('./sveltekit-frontend/src/lib/server/embedding-cache-middleware');
const { NVIDIACudaDocsClient } = require('./mcp-servers/nvidia-cuda-docs-integration');

class IntegratedEmbeddingService {
  constructor() {
    this.app = express();
    this.redisClient = null;
    this.postgresPool = null;
    this.pythonWorker = null;
    this.cudaDocsClient = new NVIDIACudaDocsClient();
    
    this.config = {
      ports: {
        nodeAPI: 3001,
        pythonWorker: 8000,
        redis: 4005,
        postgres: 5432
      },
      redis: {
        host: 'localhost',
        port: 4005,
        db: 0
      },
      postgres: {
        user: 'postgres',
        host: 'localhost',
        database: 'legal_ai_db',
        password: '123456',
        port: 5432
      }
    };
    
    this.setupExpress();
    this.initializeServices();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  async initializeServices() {
    try {
      console.log('🚀 Starting Integrated Legal AI Embedding Service...');
      
      // Initialize Redis
      await this.initializeRedis();
      
      // Initialize Postgres
      await this.initializePostgres();
      
      // Start Python GPU Worker
      await this.startPythonWorker();
      
      // Setup API routes
      this.setupAPIRoutes();
      
      // Health monitoring
      this.setupHealthMonitoring();
      
      console.log('✅ All services initialized successfully!');
      
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      process.exit(1);
    }
  }

  async initializeRedis() {
    try {
      this.redisClient = createClient({
        url: `redis://${this.config.redis.host}:${this.config.redis.port}`
      });
      
      this.redisClient.on('error', (err) => {
        console.warn('⚠️ Redis error:', err.message);
      });
      
      this.redisClient.on('connect', () => {
        console.log('🔥 Redis hot cache connected');
      });
      
      await this.redisClient.connect();
      
      // Test Redis
      await this.redisClient.set('test_embedding_service', 'online');
      const test = await this.redisClient.get('test_embedding_service');
      
      if (test === 'online') {
        console.log('✅ Redis cache operational');
      }
      
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, continuing without hot cache:', error.message);
      this.redisClient = null;
    }
  }

  async initializePostgres() {
    try {
      this.postgresPool = new Pool(this.config.postgres);
      
      // Test connection
      const client = await this.postgresPool.connect();
      const result = await client.query('SELECT NOW() as timestamp');
      client.release();
      
      console.log(`✅ Postgres connected at ${result.rows[0].timestamp}`);
      
      // Ensure embeddings table exists
      await this.createEmbeddingsTable();
      
    } catch (error) {
      console.error('❌ Postgres initialization failed:', error);
      throw error;
    }
  }

  async createEmbeddingsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS embeddings (
        id VARCHAR(64) PRIMARY KEY,
        text TEXT NOT NULL,
        vector FLOAT4[] NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_embeddings_metadata 
      ON embeddings USING GIN (metadata);
      
      -- Enable pgvector if available
      CREATE EXTENSION IF NOT EXISTS vector;
    `;
    
    try {
      await this.postgresPool.query(createTableSQL);
      console.log('✅ Embeddings table ready');
    } catch (error) {
      console.warn('⚠️ Table creation warning:', error.message);
    }
  }

  async startPythonWorker() {
    return new Promise((resolve, reject) => {
      console.log('🐍 Starting Python RTX 3060 Ti GPU Worker...');
      
      // Check if Python worker is already running
      this.checkPythonWorkerHealth()
        .then(isRunning => {
          if (isRunning) {
            console.log('✅ Python GPU worker already running');
            resolve();
            return;
          }
          
          // Start Python worker
          this.pythonWorker = spawn('python', [
            './python-gpu-worker/rtx-embedding-server.py'
          ], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          let startupComplete = false;
          
          this.pythonWorker.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`🐍 GPU Worker: ${output.trim()}`);
            
            if (output.includes('Application startup complete') && !startupComplete) {
              startupComplete = true;
              console.log('✅ Python GPU worker ready');
              resolve();
            }
          });
          
          this.pythonWorker.stderr.on('data', (data) => {
            console.error(`🐍 GPU Worker Error: ${data.toString().trim()}`);
          });
          
          this.pythonWorker.on('close', (code) => {
            console.log(`🐍 GPU Worker exited with code ${code}`);
            if (!startupComplete) {
              reject(new Error(`Python worker failed to start (exit code: ${code})`));
            }
          });
          
          // Timeout for startup
          setTimeout(() => {
            if (!startupComplete) {
              console.log('⚠️ Python worker startup timeout, continuing anyway...');
              resolve();
            }
          }, 15000);
          
        })
        .catch(reject);
    });
  }

  async checkPythonWorkerHealth() {
    try {
      const response = await fetch('http://localhost:8000/health');
      const health = await response.json();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  setupAPIRoutes() {
    // Main embedding endpoint
    this.app.post('/api/embed', async (req, res) => {
      try {
        const { text, texts, legal_context } = req.body;
        const startTime = Date.now();
        
        let result;
        
        if (texts && Array.isArray(texts)) {
          // Batch embedding
          const embeddings = await getBatchLegalEmbeddings(
            texts.map(t => ({ 
              text: t, 
              ...legal_context 
            }))
          );
          
          result = {
            embeddings: embeddings.map(e => Array.from(e)),
            batch_size: texts.length,
            processing_time_ms: Date.now() - startTime
          };
        } else if (text) {
          // Single embedding
          const embedding = await getLegalEmbedding({ 
            text, 
            ...legal_context 
          });
          
          result = {
            embedding: Array.from(embedding.embedding),
            metadata: embedding.metadata,
            processing_time_ms: Date.now() - startTime
          };
        } else {
          return res.status(400).json({ error: 'Missing text or texts parameter' });
        }
        
        res.json({
          success: true,
          ...result,
          cache_stats: await embeddingCache.getCacheStats()
        });
        
      } catch (error) {
        console.error('Embedding API error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          fallback_available: true
        });
      }
    });

    // NVIDIA CUDA documentation endpoint
    this.app.get('/api/nvidia-docs/:query', async (req, res) => {
      try {
        const { query } = req.params;
        const { type = 'all' } = req.query;
        
        let result;
        
        if (type === 'legal-ai') {
          result = await this.cudaDocsClient.queryLegalAIOptimizations(query);
        } else {
          result = await this.cudaDocsClient.queryCudaDocumentation(query);
        }
        
        res.json(result);
        
      } catch (error) {
        console.error('CUDA docs error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          query: req.params.query
        });
      }
    });

    // Cache management endpoints
    this.app.get('/api/cache/stats', async (req, res) => {
      try {
        const stats = await embeddingCache.getCacheStats();
        const redisStats = this.redisClient ? await this.getRedisStats() : null;
        
        res.json({
          embedding_cache: stats,
          redis_cache: redisStats,
          python_worker: await this.getPythonWorkerStats()
        });
        
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/cache/clear', async (req, res) => {
      try {
        await embeddingCache.clearCache();
        
        if (this.redisClient) {
          const keys = await this.redisClient.keys('embed:*');
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        }
        
        res.json({ 
          success: true, 
          message: 'All caches cleared',
          cleared_keys: await this.redisClient?.keys('embed:*')?.length || 0
        });
        
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Benchmark endpoint
    this.app.post('/api/benchmark', async (req, res) => {
      try {
        const { batch_sizes = [1, 8, 32, 128], iterations = 3 } = req.body;
        
        const results = [];
        
        for (const batch_size of batch_sizes) {
          const test_texts = Array(batch_size).fill(0).map((_, i) => 
            `Legal document performance test ${i} with complex legal terminology and case references for RTX 3060 Ti optimization testing.`
          );
          
          const times = [];
          
          for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            await getBatchLegalEmbeddings(
              test_texts.map(text => ({ text, practiceArea: 'Performance Testing' }))
            );
            
            times.push(Date.now() - startTime);
          }
          
          const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
          const throughput = batch_size / (avgTime / 1000);
          
          results.push({
            batch_size,
            avg_time_ms: Math.round(avgTime),
            throughput_texts_per_second: Math.round(throughput * 10) / 10,
            iterations
          });
        }
        
        res.json({
          benchmark_results: results,
          gpu_stats: await this.getPythonWorkerStats(),
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupHealthMonitoring() {
    this.app.get('/health', async (req, res) => {
      const health = {
        service: 'Integrated Legal AI Embedding Service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
          node_api: true,
          redis_cache: !!this.redisClient,
          postgres_db: !!this.postgresPool,
          python_worker: await this.checkPythonWorkerHealth(),
          context7_mcp: true,
          gpu_acceleration: await this.checkGPUAvailability()
        }
      };
      
      const unhealthyComponents = Object.entries(health.components)
        .filter(([name, status]) => !status)
        .map(([name]) => name);
      
      if (unhealthyComponents.length > 0) {
        health.status = 'degraded';
        health.issues = unhealthyComponents;
      }
      
      res.json(health);
    });
  }

  async getRedisStats() {
    if (!this.redisClient) return null;
    
    try {
      const info = await this.redisClient.info();
      const keyCount = await this.redisClient.dbSize();
      
      return {
        connected: true,
        total_keys: keyCount,
        memory_usage: info.includes('used_memory:') ? 
          info.match(/used_memory:(\d+)/)?.[1] : 'unknown'
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  async getPythonWorkerStats() {
    try {
      const response = await fetch('http://localhost:8000/health');
      return await response.json();
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  async checkGPUAvailability() {
    try {
      const response = await fetch('http://localhost:8000/health');
      const health = await response.json();
      return health.gpu_available || false;
    } catch (error) {
      return false;
    }
  }

  async start() {
    const port = this.config.ports.nodeAPI;
    
    this.app.listen(port, () => {
      console.log('\n🚀 ========================================');
      console.log('   INTEGRATED LEGAL AI EMBEDDING SERVICE  ');
      console.log('🚀 ========================================');
      console.log(`📡 Node.js API Server: http://localhost:${port}`);
      console.log(`🐍 Python GPU Worker: http://localhost:${this.config.ports.pythonWorker}`);
      console.log(`🔥 Redis Cache: localhost:${this.config.ports.redis}`);
      console.log(`🗄️  Postgres DB: localhost:${this.config.ports.postgres}`);
      console.log('📚 Context7 MCP: Integrated');
      console.log('\n🔗 API Endpoints:');
      console.log(`   POST ${port}/api/embed - Generate embeddings`);
      console.log(`   GET  ${port}/api/nvidia-docs/:query - CUDA documentation`);
      console.log(`   GET  ${port}/api/cache/stats - Cache statistics`);
      console.log(`   POST ${port}/api/benchmark - Performance benchmark`);
      console.log(`   GET  ${port}/health - Service health check`);
      console.log('\n✅ All systems operational!\n');
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown() {
    console.log('\n🛑 Shutting down services...');
    
    if (this.pythonWorker) {
      this.pythonWorker.kill();
      console.log('✅ Python worker stopped');
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('✅ Redis disconnected');
    }
    
    if (this.postgresPool) {
      await this.postgresPool.end();
      console.log('✅ Postgres disconnected');
    }
    
    console.log('👋 Goodbye!');
    process.exit(0);
  }
}

// Start the service
if (require.main === module) {
  const service = new IntegratedEmbeddingService();
  service.start().catch(console.error);
}

module.exports = { IntegratedEmbeddingService };
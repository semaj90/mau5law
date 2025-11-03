#!/usr/bin/env node
/**
 * Phase 43 GPU-Accelerated Embedding Analyzer
 * 
 * Features:
 * - Streams JSON logs in 1k-10k chunks
 * - Redis tensor cache (avoids redundant GPU calls)
 * - embeddinggemma:latest via Ollama
 * - Qdrant vector storage with tags
 * - Progress bars for 20min+ batches
 * - Resumable processing with checkpoints
 * - JSONL output for LLM consumption
 * 
 * Usage:
 *   node scripts/phase43-ai-analyzer.mjs <log-file> [--batch-size 1000] [--resume]
 */

import { createReadStream } from 'fs';
import { appendFileSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { createClient } from 'redis';
import { QdrantClient } from '@qdrant/js-client-rest';
import PQueue from 'p-queue';
import cliProgress from 'cli-progress';
import { createHash } from 'crypto';

// Configuration
const config = {
  batchSize: parseInt(process.env.BATCH_SIZE || '1000', 10),
  concurrency: parseInt(process.env.CONCURRENCY || '8', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  embeddingModel: 'embeddinggemma:latest',
  embeddingDim: 384, // Memory-optimized dimension
  cacheTTL: 7 * 24 * 60 * 60, // 7 days
  outputDir: 'logs/phase43',
  collectionName: 'error_embeddings'
};

// Parse CLI arguments
const args = parseArgs();
config.batchSize = args.batchSize || config.batchSize;

class GPUEmbeddingAnalyzer {
  constructor() {
    this.redis = null;
    this.qdrant = null;
    this.queue = new PQueue({ concurrency: config.concurrency });
    this.stats = {
      total: 0,
      processed: 0,
      cached: 0,
      embedded: 0,
      errors: 0,
      startTime: Date.now()
    };
    this.checkpoint = null;
    this.progressBar = null;
  }

  async initialize() {
    console.log('🚀 Phase 43 GPU Embedding Analyzer Initializing...\n');
    
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    this.redis = createClient({ url: config.redisUrl });
    await this.redis.connect();
    console.log('✅ Redis connected');
    
    // Connect to Qdrant
    console.log('📡 Connecting to Qdrant...');
    this.qdrant = new QdrantClient({ url: config.qdrantUrl });
    
    // Ensure collection exists
    await this.ensureQdrantCollection();
    console.log('✅ Qdrant collection ready');
    
    // Create output directory
    const { mkdirSync } = await import('fs');
    mkdirSync(config.outputDir, { recursive: true });
    
    // Load checkpoint if resuming
    if (args.resume) {
      this.loadCheckpoint();
    }
    
    console.log('\n⚙️  Configuration:');
    console.log(`  • Batch Size: ${config.batchSize}`);
    console.log(`  • Concurrency: ${config.concurrency}`);
    console.log(`  • Model: ${config.embeddingModel}`);
    console.log(`  • Cache TTL: ${config.cacheTTL / 86400} days\n`);
  }

  async ensureQdrantCollection() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === config.collectionName);
      
      if (!exists) {
        console.log(`📝 Creating Qdrant collection: ${config.collectionName}`);
        await this.qdrant.createCollection(config.collectionName, {
          vectors: {
            size: config.embeddingDim, // 384 dimensions
            distance: 'Cosine'
          }
        });
        
        // Create payload indexes for fast filtering
        await this.qdrant.createPayloadIndex(config.collectionName, {
          field_name: 'error_code',
          field_schema: 'keyword'
        });
        
        await this.qdrant.createPayloadIndex(config.collectionName, {
          field_name: 'file',
          field_schema: 'keyword'
        });
      }
    } catch (error) {
      console.error('⚠️  Qdrant collection setup error:', error.message);
    }
  }

  async processLogFile(logPath) {
    console.log(`📄 Processing log file: ${logPath}\n`);
    
    // Count total lines
    const totalLines = await this.countLines(logPath);
    this.stats.total = totalLines;
    
    console.log(`📊 Total lines to process: ${totalLines.toLocaleString()}\n`);
    
    // Initialize progress bar
    this.progressBar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: '{label} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}/s'
    }, cliProgress.Presets.shades_classic);
    
    const mainBar = this.progressBar.create(totalLines, 0, { label: 'Processing', speed: 0 });
    const cacheBar = this.progressBar.create(totalLines, 0, { label: 'Cache Hits', speed: 0 });
    const embedBar = this.progressBar.create(totalLines, 0, { label: 'Embeddings', speed: 0 });
    
    // Stream and batch process
    const fileStream = createReadStream(logPath, { encoding: 'utf8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let batch = [];
    let batchNum = 0;
    
    for await (const line of rl) {
      if (!line.trim()) continue;
      
      batch.push(line);
      
      if (batch.length >= config.batchSize) {
        await this.processBatch(batch, batchNum, { mainBar, cacheBar, embedBar });
        batch = [];
        batchNum++;
        
        // Save checkpoint
        this.saveCheckpoint();
      }
    }
    
    // Process remaining lines
    if (batch.length > 0) {
      await this.processBatch(batch, batchNum, { mainBar, cacheBar, embedBar });
    }
    
    this.progressBar.stop();
    
    // Final summary
    this.printSummary();
  }

  async processBatch(lines, batchNum, bars) {
    const batchStartTime = Date.now();
    const batchResults = [];
    
    const tasks = lines.map((line, i) => 
      this.queue.add(async () => {
        try {
          const result = await this.processLine(line, batchNum * config.batchSize + i);
          
          if (result.cached) {
            this.stats.cached++;
            bars.cacheBar.increment();
          } else if (result.embedded) {
            this.stats.embedded++;
            bars.embedBar.increment();
          }
          
          this.stats.processed++;
          bars.mainBar.increment();
          
          // Update speed
          const elapsed = (Date.now() - this.stats.startTime) / 1000;
          const speed = Math.round(this.stats.processed / elapsed);
          bars.mainBar.update(this.stats.processed, { speed });
          
          return result;
        } catch (error) {
          this.stats.errors++;
          return { error: error.message };
        }
      })
    );
    
    const results = await Promise.all(tasks);
    batchResults.push(...results.filter(r => !r.error));
    
    // Write batch to JSONL
    const batchFile = `${config.outputDir}/batch-${String(batchNum).padStart(5, '0')}.jsonl`;
    const batchData = batchResults.map(r => JSON.stringify(r)).join('\n') + '\n';
    appendFileSync(batchFile, batchData);
    
    // Write progress log
    const progressEntry = {
      batchNum,
      timestamp: new Date().toISOString(),
      processed: this.stats.processed,
      cached: this.stats.cached,
      embedded: this.stats.embedded,
      errors: this.stats.errors,
      batchTime: Date.now() - batchStartTime
    };
    
    appendFileSync(
      `${config.outputDir}/progress.log.json`,
      JSON.stringify(progressEntry) + '\n'
    );
  }

  async processLine(line, index) {
    // Generate stable ID from line content
    const id = this.generateId(line, index);
    
    // Check Redis cache
    const cached = await this.getCachedEmbedding(id);
    if (cached) {
      return {
        id,
        cached: true,
        summary: cached.summary,
        timestamp: cached.timestamp
      };
    }
    
    // Parse and summarize line
    const parsed = this.parseLine(line, index);
    const summary = this.summarize(parsed);
    
    // Generate embedding
    const embedding = await this.getEmbedding(summary);
    
    // Cache in Redis
    await this.cacheEmbedding(id, {
      summary,
      vector: embedding,
      metadata: parsed
    });
    
    // Store in Qdrant
    await this.storeInQdrant(id, embedding, {
      ...parsed,
      summary
    });
    
    return {
      id,
      embedded: true,
      summary,
      file: parsed.file,
      line: parsed.line,
      errorCode: parsed.errorCode,
      timestamp: new Date().toISOString()
    };
  }

  generateId(line, index) {
    const hash = createHash('sha256').update(line).digest('hex');
    return `err-${hash.substring(0, 16)}`;
  }

  async getCachedEmbedding(id) {
    try {
      const data = await this.redis.hGetAll(`ai:embedding:${id}`);
      if (data && data.vector) {
        return {
          summary: data.summary,
          vector: JSON.parse(data.vector),
          timestamp: data.timestamp
        };
      }
    } catch (error) {
      // Cache miss
    }
    return null;
  }

  async cacheEmbedding(id, data) {
    await this.redis.hSet(`ai:embedding:${id}`, {
      summary: data.summary,
      vector: JSON.stringify(data.vector),
      timestamp: new Date().toISOString(),
      file: data.metadata.file || '',
      line: data.metadata.line || '',
      errorCode: data.metadata.errorCode || ''
    });
    
    // Set expiry
    await this.redis.expire(`ai:embedding:${id}`, config.cacheTTL);
  }

  async getEmbedding(text) {
    try {
      const response = await fetch(`${config.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.embeddingModel,
          prompt: text.substring(0, 2048) // Limit to model context
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error.message);
      // Return zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  async storeInQdrant(id, vector, payload) {
    try {
      await this.qdrant.upsert(config.collectionName, {
        points: [{
          id,
          vector,
          payload: {
            file: payload.file || '',
            line: payload.line || 0,
            error_code: payload.errorCode || '',
            error_message: payload.errorMessage || '',
            summary: payload.summary || '',
            tags: payload.tags || [],
            timestamp: new Date().toISOString()
          }
        }]
      });
    } catch (error) {
      console.error('Qdrant upsert failed:', error.message);
    }
  }

  parseLine(line, index) {
    // Extract error information from log line
    const fileMatch = line.match(/([^:\s]+\.(ts|svelte|js|mjs)):(\d+):(\d+)/);
    const errorCodeMatch = line.match(/TS(\d+)/);
    const errorMessageMatch = line.match(/Error:\s*(.+?)(?:\(|$)/);
    
    return {
      index,
      file: fileMatch ? fileMatch[1] : '',
      line: fileMatch ? parseInt(fileMatch[3], 10) : 0,
      column: fileMatch ? parseInt(fileMatch[4], 10) : 0,
      errorCode: errorCodeMatch ? `TS${errorCodeMatch[1]}` : '',
      errorMessage: errorMessageMatch ? errorMessageMatch[1].trim() : line.substring(0, 200),
      raw: line,
      tags: this.extractTags(line)
    };
  }

  extractTags(line) {
    const tags = [];
    
    if (line.includes('expected')) tags.push('syntax-error');
    if (line.includes('TS1005')) tags.push('missing-token');
    if (line.includes('TS2304')) tags.push('cannot-find-name');
    if (line.includes('.svelte')) tags.push('svelte-file');
    if (line.includes('.ts')) tags.push('typescript-file');
    if (line.includes('import')) tags.push('import-related');
    if (line.includes('type')) tags.push('type-related');
    
    return tags;
  }

  summarize(parsed) {
    if (parsed.errorCode && parsed.errorMessage) {
      return `${parsed.errorCode}: ${parsed.errorMessage} in ${parsed.file}:${parsed.line}`;
    }
    return parsed.raw.substring(0, 512);
  }

  async countLines(filePath) {
    let count = 0;
    const fileStream = createReadStream(filePath, { encoding: 'utf8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      if (line.trim()) count++;
    }
    
    return count;
  }

  saveCheckpoint() {
    const checkpointData = {
      stats: this.stats,
      timestamp: new Date().toISOString(),
      config
    };
    
    writeFileSync(
      `${config.outputDir}/checkpoint.json`,
      JSON.stringify(checkpointData, null, 2)
    );
  }

  loadCheckpoint() {
    const checkpointPath = `${config.outputDir}/checkpoint.json`;
    if (existsSync(checkpointPath)) {
      const data = JSON.parse(readFileSync(checkpointPath, 'utf8'));
      this.stats = data.stats;
      console.log(`✅ Resumed from checkpoint: ${this.stats.processed} lines processed`);
    }
  }

  printSummary() {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    const speed = Math.round(this.stats.processed / duration);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║            PHASE 43 EMBEDDING ANALYSIS COMPLETE        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('📊 Statistics:');
    console.log(`  • Total lines: ${this.stats.total.toLocaleString()}`);
    console.log(`  • Processed: ${this.stats.processed.toLocaleString()}`);
    console.log(`  • Cache hits: ${this.stats.cached.toLocaleString()} (${Math.round(this.stats.cached / this.stats.processed * 100)}%)`);
    console.log(`  • New embeddings: ${this.stats.embedded.toLocaleString()}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`\n⏱️  Performance:`);
    console.log(`  • Duration: ${Math.round(duration)}s (${(duration / 60).toFixed(1)} min)`);
    console.log(`  • Speed: ${speed} lines/sec`);
    console.log(`\n📁 Output:`);
    console.log(`  • Batches: ${config.outputDir}/batch-*.jsonl`);
    console.log(`  • Progress: ${config.outputDir}/progress.log.json`);
    console.log(`  • Checkpoint: ${config.outputDir}/checkpoint.json`);
    console.log('\n✅ Ready for LLM consumption or Phase 44 tensor operations\n');
  }

  async cleanup() {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

function parseArgs() {
  const args = {
    logFile: process.argv[2] || 'svelte-check-fronten1d.log',
    batchSize: null,
    resume: false
  };
  
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === '--batch-size' && process.argv[i + 1]) {
      args.batchSize = parseInt(process.argv[++i], 10);
    } else if (process.argv[i] === '--resume') {
      args.resume = true;
    }
  }
  
  return args;
}

// Main execution
async function main() {
  const analyzer = new GPUEmbeddingAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.processLogFile(args.logFile);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await analyzer.cleanup();
  }
}

main();


/**
 * Specialized Worker System - Event-Driven "Hive Programming"
 * Implements RabbitMQ-based job distribution for AI services
 * Jobs: SUMMARIZE_DOCUMENT, GET_CASE_LAW, GENERATE_EMBEDDING
 */

import { EventEmitter } from 'events';

// Lazy-import amqplib at runtime so this module can be loaded in non-Node builds (e.g. SvelteKit client).
let amqp: any = null;

export interface SpecializedJob {
  id: string;
  type: 'SUMMARIZE_DOCUMENT' | 'GET_CASE_LAW' | 'GENERATE_EMBEDDING' | 'ANALYZE_EVIDENCE' | 'LEGAL_RESEARCH';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeout: number; // milliseconds
  retryCount: number;
  createdAt: Date;
  metadata: {
    caseId?: string;
    userId?: string;
    source?: string;
    confidential?: boolean;
  };
}

export interface WorkerResult {
  jobId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  processingTime: number;
  workerInfo: {
    id: string;
    type: string;
    version: string;
    capabilities: string[];
  };
}

export interface WorkerStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queuedJobs: number;
  activeWorkers: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdate: Date;
}

/**
 * Central Job Orchestrator - The "Queen Bee"
 * Manages job distribution and worker coordination
 */
export class JobOrchestrator extends EventEmitter {
  private connection: any | null = null;
  private channel: any | null = null;
  private workers: Map<string, SpecializedWorker> = new Map();
  private jobQueue: Map<string, SpecializedJob> = new Map();
  private results: Map<string, WorkerResult> = new Map();
  private stats: WorkerStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    queuedJobs: 0,
    activeWorkers: 0,
    systemHealth: 'healthy',
    lastUpdate: new Date()
  };

  constructor(private rabbitmqUrl: string = 'amqp://localhost') {
    super();
  }

  async initialize(): Promise<void> {
    try {
      // dynamically import amqplib to avoid bundling Node-only libs into browser builds
      if (!amqp) {
        const mod = await import('amqplib');
        amqp = mod;
      }

      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare queues for different job types
      await this.channel.assertQueue('summarization_jobs', { durable: true });
      await this.channel.assertQueue('case_law_jobs', { durable: true });
      await this.channel.assertQueue('embedding_jobs', { durable: true });
      await this.channel.assertQueue('analysis_jobs', { durable: true });
      await this.channel.assertQueue('research_jobs', { durable: true });
      await this.channel.assertQueue('job_results', { durable: true });

      // Set up result listener
      await this.setupResultListener();

      console.log('🏗️ Job Orchestrator initialized with RabbitMQ');
      this.emit('initialized');
    } catch (error: any) {
      console.error('Failed to initialize Job Orchestrator:', error);
      throw error;
    }
  }

  async submitJob(job: Omit<SpecializedJob, 'id' | 'createdAt'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: SpecializedJob = {
      ...job,
      id: jobId,
      createdAt: new Date()
    };

    this.jobQueue.set(jobId, fullJob);
    this.stats.totalJobs++;
    this.stats.queuedJobs++;

    const queueName = this.getQueueForJobType(job.type);

    if (this.channel) {
      await this.channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(fullJob)),
        {
          persistent: true,
          priority: this.getPriorityNumber(job.priority)
        }
      );

      console.log(`📤 Job ${jobId} (${job.type}) submitted to queue ${queueName}`);
      this.emit('jobSubmitted', { jobId, type: job.type });
    }

    return jobId;
  }

  async getJobResult(jobId: string): Promise<WorkerResult | null> {
    return this.results.get(jobId) || null;
  }

  async waitForJobResult(jobId: string, timeout: number = 30000): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job ${jobId} timed out after ${timeout}ms`));
      }, timeout);

      const checkResult = () => {
        const result = this.results.get(jobId);
        if (result) {
          clearTimeout(timeoutId);
          resolve(result);
        } else {
          setTimeout(checkResult, 100);
        }
      };

      checkResult();
    });
  }

  getStats(): WorkerStats {
    this.stats.lastUpdate = new Date();
    this.stats.activeWorkers = this.workers.size;
    this.stats.queuedJobs = this.jobQueue.size - this.results.size;

    // Calculate system health
    const errorRate = this.stats.totalJobs > 0 ? this.stats.failedJobs / this.stats.totalJobs : 0;
    if (errorRate > 0.2) {
      this.stats.systemHealth = 'critical';
    } else if (errorRate > 0.1 || this.stats.activeWorkers === 0) {
      this.stats.systemHealth = 'degraded';
    } else {
      this.stats.systemHealth = 'healthy';
    }

    return { ...this.stats };
  }

  registerWorker(worker: SpecializedWorker): void {
    this.workers.set(worker.getId(), worker);
    this.emit('workerRegistered', { workerId: worker.getId(), type: worker.getType() });
  }

  private async setupResultListener(): Promise<void> {
    if (!this.channel) return;

    await this.channel.consume('job_results', (msg) => {
      if (msg) {
        try {
          const result: WorkerResult = JSON.parse(msg.content.toString());
          this.results.set(result.jobId, result);

          if (result.success) {
            this.stats.completedJobs++;
          } else {
            this.stats.failedJobs++;
          }

          // Update average processing time
          const totalProcessingTime = Array.from(this.results.values())
            .reduce((sum, r) => sum + r.processingTime, 0);
          this.stats.averageProcessingTime = totalProcessingTime / this.results.size;

          console.log(`📥 Job ${result.jobId} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          this.emit('jobCompleted', result);

          this.channel?.ack(msg);
        } catch (error: any) {
          console.error('Error processing job result:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  private getQueueForJobType(type: SpecializedJob['type']): string {
    const queueMap: Record<SpecializedJob['type'], string> = {
      'SUMMARIZE_DOCUMENT': 'summarization_jobs',
      'GET_CASE_LAW': 'case_law_jobs',
      'GENERATE_EMBEDDING': 'embedding_jobs',
      'ANALYZE_EVIDENCE': 'analysis_jobs',
      'LEGAL_RESEARCH': 'research_jobs'
    };
    return queueMap[type];
  }

  private getPriorityNumber(priority: string): number {
    const priorityMap = { 'low': 1, 'medium': 5, 'high': 8, 'urgent': 10 };
    return priorityMap[priority as keyof typeof priorityMap] || 1;
  }

  async dispose(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

/**
 * Base Specialized Worker - Individual "Bee" in the Hive
 */
export abstract class SpecializedWorker extends EventEmitter {
  protected workerId: string;
  protected workerType: string;
  protected capabilities: string[] = [];
  protected version: string = '1.0.0';
  protected isProcessing: boolean = false;
  protected connection: any | null = null;
  protected channel: any | null = null;

  protected rabbitmqUrl: string;

  constructor(
    workerId: string,
    workerType: string,
    capabilities: string[] = [],
    rabbitmqUrl: string = 'amqp://localhost'
  ) {
    super();
    this.workerId = workerId;
    this.workerType = workerType;
    this.capabilities = capabilities;
    this.rabbitmqUrl = rabbitmqUrl;
  }

  async initialize(): Promise<void> {
    try {
      // dynamically import amqplib to avoid bundling Node-only libs into browser builds
      if (!amqp) {
        const mod = await import('amqplib');
        amqp = mod;
      }

      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      console.log(`🐝 Worker ${this.workerId} (${this.workerType}) initialized`);
      this.emit('initialized');
    } catch (error: any) {
      console.error(`Failed to initialize worker ${this.workerId}:`, error);
      throw error;
    }
  }

  async startProcessing(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Worker not initialized');
    }

    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.prefetch(1); // Process one job at a time

    console.log(`🔄 Worker ${this.workerId} listening on queue: ${queueName}`);

    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        this.isProcessing = true;
        const startTime = Date.now();

        try {
          const job: SpecializedJob = JSON.parse(msg.content.toString());
          console.log(`⚙️ Worker ${this.workerId} processing job ${job.id}`);

          const result = await this.processJob(job);
          const processingTime = Date.now() - startTime;

          const workerResult: WorkerResult = {
            jobId: job.id,
            success: true,
            data: result,
            processingTime,
            workerInfo: {
              id: this.workerId,
              type: this.workerType,
              version: this.version,
              capabilities: this.capabilities
            }
          };

          await this.sendResult(workerResult);
          this.channel?.ack(msg);

          console.log(`✅ Worker ${this.workerId} completed job ${job.id} in ${processingTime}ms`);
          this.emit('jobCompleted', { jobId: job.id, processingTime });

        } catch (error: any) {
          const processingTime = Date.now() - startTime;
          let jobId = 'unknown';
          try {
            jobId = JSON.parse(msg.content.toString()).id;
          } catch {
            /* ignore */
          }
          const errorResult: WorkerResult = {
            jobId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime,
            workerInfo: {
              id: this.workerId,
              type: this.workerType,
              version: this.version,
              capabilities: this.capabilities
            }
          };

          await this.sendResult(errorResult);
          this.channel?.ack(msg);

          console.error(`❌ Worker ${this.workerId} failed to process job:`, error);
          this.emit('jobFailed', { error: errorResult.error, processingTime });
        } finally {
          this.isProcessing = false;
        }
      }
    });
  }

  protected abstract processJob(job: SpecializedJob): Promise<any>;

  private async sendResult(result: WorkerResult): Promise<void> {
    if (this.channel) {
      await this.channel.sendToQueue(
        'job_results',
        Buffer.from(JSON.stringify(result)),
        { persistent: true }
      );
    }
  }

  getId(): string { return this.workerId; }
  getType(): string { return this.workerType; }
  getCapabilities(): string[] { return [...this.capabilities]; }
  isIdle(): boolean { return !this.isProcessing; }

  async dispose(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

/**
 * Document Summarization Worker
 */
export class DocumentSummarizationWorker extends SpecializedWorker {
  constructor(workerId: string, rabbitmqUrl?: string) {
    super(workerId, 'DocumentSummarizer', ['summarization', 'nlp', 'legal-docs'], rabbitmqUrl);
  }

  protected async processJob(job: SpecializedJob): Promise<any> {
    if (job.type !== 'SUMMARIZE_DOCUMENT') {
      throw new Error(`Invalid job type: ${job.type}`);
    }

    const { document, options = {} } = job.payload;

    // TODO: Integrate with your local LLM (Ollama/Gemma3-legal)
    // This is a placeholder implementation
    const summary = await this.generateSummary(document.content, options);

    return {
      documentId: document.id,
      summary,
      keyPoints: this.extractKeyPoints(document.content),
      confidence: 0.85,
      processingModel: 'gemma3-legal',
      metadata: {
        originalLength: document.content.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / document.content.length
      }
    };
  }

  private async generateSummary(content: string, options: any): Promise<string> {
    // Placeholder for LLM integration
    const words = content.split(' ');
    const summaryLength = Math.min(options.maxLength || 200, Math.floor(words.length * 0.3));
    return words.slice(0, summaryLength).join(' ') + '...';
  }

  private extractKeyPoints(content: string): string[] {
    // Placeholder for key point extraction
    const sentences = content.split(/[.!?]+/);
    return sentences.slice(0, 5).map((s: any) => s.trim()).filter((s: any) => s.length > 10);
  }
}

/**
 * Case Law Research Worker
 */
export class CaseLawWorker extends SpecializedWorker {
  constructor(workerId: string, rabbitmqUrl?: string) {
    super(workerId, 'CaseLawResearcher', ['legal-research', 'case-law', 'precedent-analysis'], rabbitmqUrl);
  }

  protected async processJob(job: SpecializedJob): Promise<any> {
    if (job.type !== 'GET_CASE_LAW') {
      throw new Error(`Invalid job type: ${job.type}`);
    }

    const { query, jurisdiction, dateRange, maxResults = 10 } = job.payload;

    // TODO: Integrate with legal databases (Westlaw, LexisNexis, etc.)
    const cases = await this.searchCaseLaw(query, { jurisdiction, dateRange, maxResults });

    return {
      query,
      totalFound: cases.length,
      cases,
      searchMetadata: {
        jurisdiction,
        dateRange,
        searchTime: new Date(),
        relevanceThreshold: 0.7
      }
    };
  }

  private async searchCaseLaw(query: string, options: any): Promise<any[]> {
    // Placeholder for case law search — use the query to compute a deterministic relevance and include it in the returned data
    const q = typeof query === 'string' ? query : String(query || '');
    const baseRelevance = 0.5;
    const lengthBoost = Math.min(0.45, q.length / 200); // longer queries get a small boost
    const relevanceScore = Math.max(0, Math.min(1, baseRelevance + lengthBoost));

  // Return a small set of mocked cases that reference the query so the parameter is read
    return [
      {
        id: 'case_001',
        title: `Sample v. Legal Case — matched for "${q.slice(0, 60)}"`,
        citation: '123 F.3d 456 (9th Cir. 2023)',
        jurisdiction: options.jurisdiction || 'Federal',
        court: '9th Circuit Court of Appeals',
        date: '2023-03-15',
        relevanceScore,
        summary: `A sample legal case generated for query "${q}". This is placeholder data for testing.`,
        keyHoldings: ['Sample holding 1', 'Sample holding 2'],
        precedentialValue: 'binding'
      }
    ];
  }
}

/**
 * Embedding Generation Worker
 */
export class EmbeddingWorker extends SpecializedWorker {
  constructor(workerId: string, rabbitmqUrl?: string) {
    super(workerId, 'EmbeddingGenerator', ['embeddings', 'vector-search', 'semantic-analysis'], rabbitmqUrl);
  }

  protected async processJob(job: SpecializedJob): Promise<any> {
    if (job.type !== 'GENERATE_EMBEDDING') {
      throw new Error(`Invalid job type: ${job.type}`);
    }

    const { text, model = 'nomic-embed-text', options = {} } = job.payload;

    // TODO: Integrate with your embedding service (Ollama)
    const embedding = await this.generateEmbedding(text, model, options);

    return {
      text: options.includeText ? text : undefined,
      embedding,
      dimensions: embedding.length,
      model,
      metadata: {
        textLength: text.length
      }
    };
  }

  private async generateEmbedding(text: string, model: string, options: any): Promise<number[]> {
    // Deterministic pseudo-embedding generator for testing (keeps behavior reproducible)
    const input = `${String(text || '')}|${String(model || '')}`;
    const dimensions = options.dimensions || 384;

    // simple hash to seed a deterministic pseudo-random generator
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const chr = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // convert to 32bit int
    }
    const seed = Math.abs(hash) || 1;

    const seededRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    const embedding = new Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = seededRandom(i) * 2 - 1;
    }

    return embedding;
  }
}

// Factory function for creating the orchestrator with common workers
export async function createSpecializedWorkerSystem(
  rabbitmqUrl: string = 'amqp://localhost'
): Promise<{
  orchestrator: JobOrchestrator;
  workers: SpecializedWorker[];
}> {
  const orchestrator = new JobOrchestrator(rabbitmqUrl);
  await orchestrator.initialize();

  const workers = [
    new DocumentSummarizationWorker('summarizer_001', rabbitmqUrl),
    new CaseLawWorker('caselaw_001', rabbitmqUrl),
    new EmbeddingWorker('embedding_001', rabbitmqUrl)
  ];

  // Initialize all workers
  for (const worker of workers) {
    await worker.initialize();
    orchestrator.registerWorker(worker);
  }

  // Start processing
  await workers[0].startProcessing('summarization_jobs');
  await workers[1].startProcessing('case_law_jobs');
  await workers[2].startProcessing('embedding_jobs');

  console.log('🏗️ Specialized Worker System fully initialized');

  return { orchestrator, workers };
}
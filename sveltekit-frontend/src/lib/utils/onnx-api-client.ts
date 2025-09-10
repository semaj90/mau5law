/**
 * ONNX API Client
 * Provides a simple interface to test and interact with the Legal-BERT ONNX endpoints
 */

export interface ONNXApiOptions {
  timeout?: number;
  retries?: number;
  baseUrl?: string;
}

export class ONNXApiClient {
  private baseUrl: string;
  private defaultOptions: ONNXApiOptions;

  constructor(options: ONNXApiOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultOptions = {
      timeout: 30000,
      retries: 2,
      ...options
    };
  }

  /**
   * Extract legal entities from text
   */
  async extractEntities(text: string, options: ONNXApiOptions = {}): Promise<any> {
    return this.makeRequest('/api/legal/onnx/extract-entities', {
      text,
      options: { ...this.defaultOptions, ...options }
    });
  }

  /**
   * Classify legal document
   */
  async classifyDocument(text: string, options: ONNXApiOptions = {}): Promise<any> {
    return this.makeRequest('/api/legal/onnx/classify-document', {
      text,
      options: { ...this.defaultOptions, ...options }
    });
  }

  /**
   * Generate embeddings for legal text
   */
  async generateEmbeddings(text: string, options: ONNXApiOptions = {}): Promise<any> {
    return this.makeRequest('/api/legal/onnx/generate-embeddings', {
      text,
      options: { ...this.defaultOptions, ...options }
    });
  }

  /**
   * Process multiple tasks in batch
   */
  async batchProcess(tasks: Array<{ id: string; type: string; text: string }>, options: ONNXApiOptions = {}): Promise<any> {
    return this.makeRequest('/api/legal/onnx/batch-process', {
      tasks,
      options: { ...this.defaultOptions, ...options }
    });
  }

  /**
   * Process multiple requests in parallel
   */
  async parallelProcess(requests: Array<{ id: string; type: string; payload: any }>, options: ONNXApiOptions = {}): Promise<any> {
    const promises = requests.map(async (req) => {
      switch (req.type) {
        case 'extract-entities':
          return this.extractEntities(req.payload.text, options);
        case 'classify-document':
          return this.classifyDocument(req.payload.text, options);
        case 'generate-embeddings':
          return this.generateEmbeddings(req.payload.text, options);
        default:
          throw new Error(`Unknown request type: ${req.type}`);
      }
    });

    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;

    return {
      success: true,
      results: results.map((r, i) => ({
        requestId: requests[i].id,
        success: r.status === 'fulfilled',
        result: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason?.message : null
      })),
      totalTime,
      parallelExecution: true
    };
  }

  /**
   * Test all ONNX endpoints with sample data
   */
  async runTests(): Promise<{ success: boolean; results: any[]; summary: any }> {
    const testData = {
      contractText: "This is a legal contract between ABC Corporation and John Doe, executed on January 15, 2024, in the Superior Court of California.",
      courtDecision: "The defendant is hereby found guilty as charged. The court orders restitution in the amount of $50,000.",
      legalBrief: "Plaintiff respectfully submits this brief in support of motion for summary judgment. The legal precedent clearly establishes..."
    };

    const tests = [
      {
        name: 'Entity Extraction - Contract',
        test: () => this.extractEntities(testData.contractText)
      },
      {
        name: 'Entity Extraction - Court Decision',
        test: () => this.extractEntities(testData.courtDecision)
      },
      {
        name: 'Document Classification - Contract',
        test: () => this.classifyDocument(testData.contractText)
      },
      {
        name: 'Document Classification - Court Decision',
        test: () => this.classifyDocument(testData.courtDecision)
      },
      {
        name: 'Embeddings Generation - Legal Brief',
        test: () => this.generateEmbeddings(testData.legalBrief)
      },
      {
        name: 'Batch Processing',
        test: () => this.batchProcess([
          { id: 'task1', type: 'extract-entities', text: testData.contractText },
          { id: 'task2', type: 'classify-document', text: testData.courtDecision },
          { id: 'task3', type: 'generate-embeddings', text: testData.legalBrief }
        ])
      }
    ];

    const results = [];
    let successCount = 0;
    const startTime = Date.now();

    console.log('🧪 Running ONNX API tests...');

    for (const test of tests) {
      console.log(`⏳ Running: ${test.name}`);
      
      try {
        const testStartTime = Date.now();
        const result = await test.test();
        const testTime = Date.now() - testStartTime;
        
        results.push({
          name: test.name,
          success: true,
          result,
          time: testTime
        });
        
        successCount++;
        console.log(`✅ ${test.name} completed in ${testTime}ms`);
        
      } catch (error: any) {
        results.push({
          name: test.name,
          success: false,
          error: error.message,
          time: 0
        });
        
        console.error(`❌ ${test.name} failed:`, error.message);
      }
    }

    const totalTime = Date.now() - startTime;
    
    const summary = {
      totalTests: tests.length,
      successful: successCount,
      failed: tests.length - successCount,
      successRate: (successCount / tests.length) * 100,
      totalTime,
      averageTime: totalTime / tests.length
    };

    console.log(`📊 Test Summary: ${successCount}/${tests.length} passed (${summary.successRate.toFixed(1)}%) in ${totalTime}ms`);

    return {
      success: successCount === tests.length,
      results,
      summary
    };
  }

  /**
   * Performance benchmark
   */
  async benchmark(text: string, iterations: number = 10): Promise<any> {
    console.log(`⚡ Running performance benchmark with ${iterations} iterations...`);
    
    const benchmarks = {
      entityExtraction: [],
      classification: [],
      embeddings: []
    };

    // Entity extraction benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.extractEntities(text);
      benchmarks.entityExtraction.push(Date.now() - start);
    }

    // Classification benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.classifyDocument(text);
      benchmarks.classification.push(Date.now() - start);
    }

    // Embeddings benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.generateEmbeddings(text);
      benchmarks.embeddings.push(Date.now() - start);
    }

    const calculateStats = (times: number[]) => ({
      min: Math.min(...times),
      max: Math.max(...times),
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    });

    return {
      iterations,
      textLength: text.length,
      entityExtraction: calculateStats(benchmarks.entityExtraction),
      classification: calculateStats(benchmarks.classification),
      embeddings: calculateStats(benchmarks.embeddings)
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(endpoint: string, body: any, retries: number = 0): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.defaultOptions.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      if (retries < (this.defaultOptions.retries || 0)) {
        console.warn(`Request failed, retrying... (${retries + 1}/${this.defaultOptions.retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1))); // Exponential backoff
        return this.makeRequest(endpoint, body, retries + 1);
      }
      
      throw error;
    }
  }
}

// Export default instance
export const onnxApiClient = new ONNXApiClient();

// Example usage function
export async function testONNXIntegration() {
  try {
    console.log('🚀 Testing ONNX Legal-BERT integration...');
    
    const client = new ONNXApiClient();
    const testResults = await client.runTests();
    
    if (testResults.success) {
      console.log('✅ All ONNX tests passed!');
      
      // Run performance benchmark
      const benchmark = await client.benchmark(
        "This is a sample legal contract for performance testing purposes.",
        5
      );
      
      console.log('📊 Performance Benchmark Results:');
      console.log('Entity Extraction:', benchmark.entityExtraction);
      console.log('Classification:', benchmark.classification);
      console.log('Embeddings:', benchmark.embeddings);
      
    } else {
      console.error('❌ Some ONNX tests failed:', testResults.summary);
    }
    
    return testResults;
    
  } catch (error) {
    console.error('❌ ONNX integration test failed:', error);
    throw error;
  }
}
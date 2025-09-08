/**
 * SIMD JSON Benchmarking API Endpoint
 * Provides comprehensive performance testing for SIMD vs standard JSON parsing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  benchmarkJSONParsing,
  getSIMDStatus,
  simdMetrics,
  readBodyFastWithMetrics 
} from '$lib/simd/simd-json-integration.js';

// GET: Run various benchmark scenarios
export const GET: RequestHandler = async ({ url }) => {
  try {
    const scenario = url.searchParams.get('scenario') || 'standard';
    const iterations = parseInt(url.searchParams.get('iterations') || '1000');
    const size = url.searchParams.get('size') || 'medium';
    
    const startTime = performance.now();
    
    switch (scenario) {
      case 'standard':
        // Standard benchmark with default test data
        const standardBench = await benchmarkJSONParsing(iterations);
        
        return json({
          success: true,
          scenario: 'standard',
          data: {
            ...standardBench,
            iterations,
            totalTestTime: performance.now() - startTime
          }
        });
        
      case 'legal_document':
        // Benchmark with legal document-like payload
        const legalDoc = {
          documentId: 'doc-' + Date.now(),
          content: 'A' + 'x'.repeat(50000), // 50KB content
          metadata: {
            title: 'Complex Legal Agreement',
            parties: ['Party A Corp', 'Party B LLC', 'Party C Trust'],
            clauses: Array.from({ length: 200 }, (_, i) => ({
              id: `clause-${i}`,
              type: i % 5 === 0 ? 'termination' : 'standard',
              text: 'Legal clause text content here '.repeat(20),
              entities: ['date', 'party', 'amount', 'jurisdiction'],
              riskLevel: Math.random() > 0.7 ? 'high' : 'low'
            }))
          },
          analysis: {
            sentiment: Math.random(),
            complexity: Math.random(),
            entities: Array.from({ length: 50 }, (_, i) => ({
              text: `Entity ${i}`,
              type: ['person', 'organization', 'date', 'money'][i % 4],
              confidence: Math.random()
            })),
            embeddings: Array.from({ length: 768 }, () => Math.random()),
            similarCases: Array.from({ length: 20 }, (_, i) => ({
              id: `case-${i}`,
              similarity: Math.random(),
              title: `Similar Case ${i}`
            }))
          }
        };
        
        const legalBenchmark = await benchmarkCustomPayload(legalDoc, iterations);
        
        return json({
          success: true,
          scenario: 'legal_document',
          data: {
            ...legalBenchmark,
            payloadSize: `${Math.round(JSON.stringify(legalDoc).length / 1024)}KB`,
            iterations
          }
        });
        
      case 'vector_operations':
        // Benchmark with vector/tensor data
        const vectorData = {
          operation: 'similarity_compute',
          queryVector: Array.from({ length: 1536 }, () => Math.random()),
          candidateVectors: Array.from({ length: 1000 }, () => 
            Array.from({ length: 1536 }, () => Math.random())
          ),
          metadata: {
            algorithm: 'cosine',
            threshold: 0.8,
            timestamp: Date.now()
          },
          results: Array.from({ length: 1000 }, () => Math.random())
        };
        
        const vectorBenchmark = await benchmarkCustomPayload(vectorData, iterations);
        
        return json({
          success: true,
          scenario: 'vector_operations',
          data: {
            ...vectorBenchmark,
            payloadSize: `${Math.round(JSON.stringify(vectorData).length / 1024)}KB`,
            vectorDimensions: 1536,
            vectorCount: 1000,
            iterations
          }
        });
        
      case 'rabbitmq_message':
        // Benchmark with RabbitMQ message payload
        const rabbitMessage = {
          jobId: 'job-' + Date.now(),
          type: 'wasm_tensor_processing',
          priority: 2,
          payload: {
            documents: Array.from({ length: 50 }, (_, i) => ({
              id: `doc-${i}`,
              content: 'Document content here '.repeat(100),
              metadata: {
                source: 'legal_database',
                confidence: Math.random(),
                processed: false
              }
            })),
            processingPipeline: [
              'document-analysis',
              'entity-extraction', 
              'wasm_vector_operations',
              'similarity_compute',
              'legal-classification'
            ],
            batchVectors: Array.from({ length: 100 }, () =>
              Array.from({ length: 768 }, () => Math.random())
            )
          },
          metadata: {
            userId: 'user-123',
            timestamp: Date.now(),
            source: 'api_endpoint',
            priority: 'high',
            expectedDuration: 30000
          }
        };
        
        const rabbitBenchmark = await benchmarkCustomPayload(rabbitMessage, iterations);
        
        return json({
          success: true,
          scenario: 'rabbitmq_message',
          data: {
            ...rabbitBenchmark,
            payloadSize: `${Math.round(JSON.stringify(rabbitMessage).length / 1024)}KB`,
            iterations
          }
        });
        
      case 'cache_operations':
        // Benchmark with cache entry payload
        const cacheEntries = Array.from({ length: 100 }, (_, i) => ({
          key: `cache-key-${i}`,
          data: {
            embeddings: Array.from({ length: 384 }, () => Math.random()),
            metadata: {
              created: Date.now(),
              hits: Math.floor(Math.random() * 100),
              lastAccess: Date.now(),
              source: 'vector_computation'
            },
            similarityResults: Array.from({ length: 50 }, () => ({
              id: `result-${Math.random()}`,
              score: Math.random(),
              metadata: { type: 'legal_doc' }
            }))
          },
          ttl: 30 * 60 * 1000,
          tags: ['legal', 'embeddings', 'cached', 'wasm_processed']
        }));
        
        const cacheBenchmark = await benchmarkCustomPayload({ entries: cacheEntries }, iterations);
        
        return json({
          success: true,
          scenario: 'cache_operations',
          data: {
            ...cacheBenchmark,
            payloadSize: `${Math.round(JSON.stringify({ entries: cacheEntries }).length / 1024)}KB`,
            entriesCount: cacheEntries.length,
            iterations
          }
        });
        
      case 'comparison':
        // Run all scenarios for comparison
        const scenarios = ['legal_document', 'vector_operations', 'rabbitmq_message', 'cache_operations'];
        const comparisonResults: any = {};
        
        for (const testScenario of scenarios) {
          const response = await fetch(`/api/benchmark/simd-json?scenario=${testScenario}&iterations=${Math.min(iterations, 500)}`);
          const result = await response.json();
          comparisonResults[testScenario] = result.data;
        }
        
        return json({
          success: true,
          scenario: 'comparison',
          data: {
            scenarios: comparisonResults,
            summary: {
              totalTests: scenarios.length,
              avgSpeedup: Object.values(comparisonResults).reduce((sum: number, result: any) => 
                sum + (result.speedup || 1), 0) / scenarios.length,
              totalTestTime: performance.now() - startTime
            }
          }
        });
        
      case 'system_info':
        // Return system and SIMD status information
        const simdStatus = getSIMDStatus();
        const stats = simdMetrics.getStats();
        
        return json({
          success: true,
          scenario: 'system_info',
          data: {
            simd: simdStatus,
            metrics: stats,
            system: {
              platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
              hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'unknown',
              memory: typeof performance !== 'undefined' && (performance as any).memory ? {
                used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
              } : null
            }
          }
        });
        
      default:
        return json({
          success: false,
          error: `Unknown benchmark scenario: ${scenario}`,
          availableScenarios: [
            'standard', 'legal_document', 'vector_operations', 
            'rabbitmq_message', 'cache_operations', 'comparison', 'system_info'
          ]
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ SIMD JSON Benchmark Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'Benchmark failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

// POST: Load testing with configurable parameters
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await readBodyFastWithMetrics(request);
    const { 
      testType = 'load',
      duration = 10000, // 10 seconds
      concurrency = 10,
      payloadSize = 'medium',
      scenario = 'mixed'
    } = body;
    
    const startTime = performance.now();
    
    switch (testType) {
      case 'load':
        // Run sustained load test
        const loadResults = await runLoadTest(duration, concurrency, payloadSize, scenario);
        
        return json({
          success: true,
          testType: 'load',
          data: {
            ...loadResults,
            configuration: { duration, concurrency, payloadSize, scenario },
            totalTestTime: performance.now() - startTime
          }
        });
        
      case 'stress':
        // Gradually increase load until failure
        const stressResults = await runStressTest(duration, payloadSize);
        
        return json({
          success: true,
          testType: 'stress',
          data: {
            ...stressResults,
            configuration: { duration, payloadSize },
            totalTestTime: performance.now() - startTime
          }
        });
        
      case 'spike':
        // Sudden traffic spikes
        const spikeResults = await runSpikeTest(concurrency * 5, payloadSize);
        
        return json({
          success: true,
          testType: 'spike',
          data: {
            ...spikeResults,
            configuration: { peakConcurrency: concurrency * 5, payloadSize },
            totalTestTime: performance.now() - startTime
          }
        });
        
      default:
        return json({
          success: false,
          error: `Unknown test type: ${testType}`,
          availableTypes: ['load', 'stress', 'spike']
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ SIMD JSON Load Test Error:', error);
    
    return json({
      success: false,
      error: {
        message: error.message || 'Load test failed',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
};

/**
 * Benchmark custom payload
 */
async function benchmarkCustomPayload(payload: any, iterations: number): Promise<any> {
  const testData = JSON.stringify(payload);
  
  // Standard JSON.parse benchmark
  const standardStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    JSON.parse(testData);
  }
  const standardTime = performance.now() - standardStart;
  
  // SIMD JSON benchmark (simulated for now)
  const simdStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    JSON.parse(testData); // TODO: Replace with actual SIMD when available
  }
  const simdTime = performance.now() - simdStart;
  
  return {
    standard: {
      totalTime: standardTime,
      avgTime: standardTime / iterations,
      parsesPerSecond: (iterations / standardTime) * 1000
    },
    simd: {
      totalTime: simdTime, 
      avgTime: simdTime / iterations,
      parsesPerSecond: (iterations / simdTime) * 1000
    },
    speedup: simdTime > 0 ? standardTime / simdTime : 1,
    payloadBytes: testData.length
  };
}

/**
 * Run load test
 */
async function runLoadTest(duration: number, concurrency: number, payloadSize: string, scenario: string): Promise<any> {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    responseTimes: [] as number[],
    throughput: 0
  };
  
  const endTime = Date.now() + duration;
  const workers: Promise<void>[] = [];
  
  // Generate test payload based on size
  const payload = generateTestPayload(payloadSize, scenario);
  const testData = JSON.stringify(payload);
  
  // Spawn concurrent workers
  for (let i = 0; i < concurrency; i++) {
    const worker = (async () => {
      while (Date.now() < endTime) {
        const start = performance.now();
        
        try {
          JSON.parse(testData); // Simulate parsing operation
          const responseTime = performance.now() - start;
          
          results.totalRequests++;
          results.successfulRequests++;
          results.responseTimes.push(responseTime);
          results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
          results.minResponseTime = Math.min(results.minResponseTime, responseTime);
          
        } catch (error) {
          results.failedRequests++;
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    })();
    
    workers.push(worker);
  }
  
  await Promise.all(workers);
  
  // Calculate final metrics
  results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length || 0;
  results.throughput = (results.successfulRequests / duration) * 1000; // requests per second
  
  return {
    ...results,
    payloadSize: `${Math.round(testData.length / 1024)}KB`,
    testDuration: duration,
    concurrency
  };
}

/**
 * Run stress test
 */
async function runStressTest(maxDuration: number, payloadSize: string): Promise<any> {
  const results = {
    maxConcurrency: 0,
    breakingPoint: 0,
    totalRequests: 0,
    phases: [] as any[]
  };
  
  const payload = generateTestPayload(payloadSize, 'mixed');
  const testData = JSON.stringify(payload);
  
  let concurrency = 1;
  let phaseStartTime = Date.now();
  
  while (Date.now() - phaseStartTime < maxDuration) {
    const phaseResults = await runConcurrentParsing(testData, concurrency, 1000);
    
    results.phases.push({
      concurrency,
      avgResponseTime: phaseResults.avgTime,
      successRate: phaseResults.successRate,
      throughput: phaseResults.throughput
    });
    
    if (phaseResults.successRate < 0.95) { // 95% success threshold
      results.breakingPoint = concurrency;
      break;
    }
    
    results.maxConcurrency = concurrency;
    results.totalRequests += phaseResults.totalRequests;
    
    concurrency = Math.min(concurrency * 2, 100); // Cap at 100
  }
  
  return results;
}

/**
 * Run spike test
 */
async function runSpikeTest(peakConcurrency: number, payloadSize: string): Promise<any> {
  const payload = generateTestPayload(payloadSize, 'mixed');
  const testData = JSON.stringify(payload);
  
  // Normal load baseline
  const baselineResults = await runConcurrentParsing(testData, 5, 1000);
  
  // Spike load
  const spikeResults = await runConcurrentParsing(testData, peakConcurrency, 1000);
  
  // Recovery phase
  const recoveryResults = await runConcurrentParsing(testData, 5, 1000);
  
  return {
    baseline: baselineResults,
    spike: spikeResults,
    recovery: recoveryResults,
    spikeImpact: {
      responseTimeDegradation: spikeResults.avgTime / baselineResults.avgTime,
      throughputImpact: spikeResults.throughput / baselineResults.throughput,
      recoveryTime: recoveryResults.avgTime / baselineResults.avgTime
    }
  };
}

/**
 * Run concurrent parsing test
 */
async function runConcurrentParsing(testData: string, concurrency: number, iterations: number): Promise<any> {
  const results = {
    totalRequests: iterations * concurrency,
    successfulRequests: 0,
    responseTimes: [] as number[],
    avgTime: 0,
    throughput: 0,
    successRate: 0
  };
  
  const startTime = performance.now();
  const workers: Promise<void>[] = [];
  
  for (let i = 0; i < concurrency; i++) {
    const worker = (async () => {
      for (let j = 0; j < iterations; j++) {
        const parseStart = performance.now();
        
        try {
          JSON.parse(testData);
          const parseTime = performance.now() - parseStart;
          results.responseTimes.push(parseTime);
          results.successfulRequests++;
        } catch (error) {
          // Failed parse
        }
      }
    })();
    
    workers.push(worker);
  }
  
  await Promise.all(workers);
  
  const totalTime = performance.now() - startTime;
  results.avgTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length || 0;
  results.throughput = (results.successfulRequests / totalTime) * 1000;
  results.successRate = results.successfulRequests / results.totalRequests;
  
  return results;
}

/**
 * Generate test payload based on size and scenario
 */
function generateTestPayload(size: string, scenario: string): any {
  const sizeMultiplier = {
    small: 1,
    medium: 10,
    large: 100,
    xlarge: 1000
  }[size] || 10;
  
  const baseItems = 10 * sizeMultiplier;
  const vectorDim = scenario === 'vector_operations' ? 768 : 128;
  
  return {
    scenario,
    timestamp: Date.now(),
    items: Array.from({ length: baseItems }, (_, i) => ({
      id: `item-${i}`,
      data: scenario === 'vector_operations' 
        ? Array.from({ length: vectorDim }, () => Math.random())
        : `Sample data item ${i} with content`.repeat(size === 'large' ? 100 : 10),
      metadata: {
        created: Date.now(),
        processed: Math.random() > 0.5,
        confidence: Math.random()
      }
    }))
  };
}
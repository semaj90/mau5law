
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, iterations = 100 } = await request.json();
    
    if (action === 'benchmark') {
      const results = {
        memory: { total: 0, avg: 0, iterations: 0 },
        redis: { total: 0, avg: 0, iterations: 0 },
        qdrant: { total: 0, avg: 0, iterations: 0 },
        overall: { total: 0, avg: 0 }
      };
      
      const testData = {
        timestamp: new Date().toISOString(),
        data: new Array(100).fill(0).map((_, i) => ({ id: i, value: Math.random() })),
        metadata: { type: 'performance-test', size: 'medium' }
      };
      
      console.log(`Starting performance benchmark with ${iterations} iterations...`);
      const overallStart = Date.now();
      
      // Test iterations
      for (let i = 0; i < iterations; i++) {
        const key = `perf-test-${i}`;
        
        // Set data
        const setStart = Date.now();
        await cacheManager.set(key, testData, 'performance', 60);
        const setTime = Date.now() - setStart;
        
        // Get data
        const getStart = Date.now();
        const retrieved = await cacheManager.get(key, 'performance');
        const getTime = Date.now() - getStart;
        
        const totalTime = setTime + getTime;
        
        // Categorize by expected cache layer (simplified)
        if (totalTime < 5) {
          results.memory.total += totalTime;
          results.memory.iterations++;
        } else if (totalTime < 50) {
          results.redis.total += totalTime;
          results.redis.iterations++;
        } else {
          results.qdrant.total += totalTime;
          results.qdrant.iterations++;
        }
        
        results.overall.total += totalTime;
        
        // Verify data integrity
        if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testData)) {
          console.warn(`Data integrity issue at iteration ${i}`);
        }
      }
      
      const overallTime = Date.now() - overallStart;
      
      // Calculate averages
      results.memory.avg = results.memory.iterations > 0 ? results.memory.total / results.memory.iterations : 0;
      results.redis.avg = results.redis.iterations > 0 ? results.redis.total / results.redis.iterations : 0;
      results.qdrant.avg = results.qdrant.iterations > 0 ? results.qdrant.total / results.qdrant.iterations : 0;
      results.overall.avg = results.overall.total / iterations;
      
      return json({
        success: true,
        benchmark: {
          iterations,
          totalTime: overallTime,
          avgTimePerOp: overallTime / iterations,
          opsPerSecond: (iterations * 1000) / overallTime,
          results,
          layerStats: cacheManager.getLayerStats()
        }
      });
    }
    
    if (action === 'stress-test') {
      const concurrency = 10;
      const opsPerWorker = Math.floor(iterations / concurrency);
      
      console.log(`Starting stress test: ${concurrency} workers, ${opsPerWorker} ops each`);
      
      const stressStart = Date.now();
      const workers = [];
      
      for (let w = 0; w < concurrency; w++) {
        const workerPromise = (async (workerId: number) => {
          const workerResults = { success: 0, errors: 0, totalTime: 0 };
          
          for (let i = 0; i < opsPerWorker; i++) {
            try {
              const key = `stress-${workerId}-${i}`;
              const data = { workerId, iteration: i, timestamp: Date.now() };
              
              const opStart = Date.now();
              await cacheManager.set(key, data, 'stress', 30);
              const retrieved = await cacheManager.get(key, 'stress');
              const opTime = Date.now() - opStart;
              
              workerResults.totalTime += opTime;
              
              if (retrieved && retrieved.workerId === workerId) {
                workerResults.success++;
              } else {
                workerResults.errors++;
              }
            } catch (error: any) {
              workerResults.errors++;
            }
          }
          
          return workerResults;
        })(w);
        
        workers.push(workerPromise);
      }
      
      const workerResults = await Promise.all(workers);
      const stressTime = Date.now() - stressStart;
      
      const totals = workerResults.reduce((acc, result) => ({
        success: acc.success + result.success,
        errors: acc.errors + result.errors,
        totalTime: acc.totalTime + result.totalTime
      }), { success: 0, errors: 0, totalTime: 0 });
      
      return json({
        success: true,
        stressTest: {
          concurrency,
          totalOperations: concurrency * opsPerWorker,
          duration: stressTime,
          opsPerSecond: (totals.success * 1000) / stressTime,
          successRate: (totals.success / (totals.success + totals.errors)) * 100,
          results: totals,
          layerStats: cacheManager.getLayerStats()
        }
      });
    }
    
    return json({ success: false, error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Performance test error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
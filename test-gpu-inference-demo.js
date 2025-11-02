/**
 * Test Script for GPU Inference Demo
 * Tests the complete inference pipeline end-to-end
 */

const BASE_URL = 'http://localhost:5173';

async function testGPUInferenceDemo() {
  console.log('🎮 Testing GPU Inference Demo Pipeline...\n');

  try {
    // Test 1: Health Check All Engines
    console.log('1️⃣ Testing Engine Health Checks...');
    const engines = ['webgpu', 'ollama', 'vllm', 'fastembed'];
    const healthResults = {};
    
    for (const engine of engines) {
      try {
        const response = await fetch(`${BASE_URL}/demo/gpu-inference/api/health/${engine}`);
        const health = await response.json();
        healthResults[engine] = { status: response.ok ? 'online' : 'offline', ...health };
        console.log(`   ${health.engine}: ${response.ok ? '✅ Online' : '❌ Offline'} (${health.responseTime}ms)`);
      } catch (error) {
        healthResults[engine] = { status: 'error', error: error.message };
        console.log(`   ${engine}: ❌ Error - ${error.message}`);
      }
    }

    // Test 2: Create Session
    console.log('\n2️⃣ Creating New Session...');
    const sessionResponse = await fetch(`${BASE_URL}/demo/gpu-inference/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionName: 'Test Session - ' + new Date().toISOString(),
        userId: 'test-user',
        engineUsed: 'auto'
      })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Failed to create session: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    console.log(`   ✅ Session created: ${session.id}`);

    // Test 3: Test Inference with Different Engines
    console.log('\n3️⃣ Testing Inference Engines...');
    const testQueries = [
      { query: 'What are the key elements of a valid contract?', engine: 'auto' },
      { query: 'Analyze legal risks in mergers and acquisitions', engine: 'webgpu' },
      { query: 'Test GPU vector embedding generation', engine: 'fastembed' },
      { query: 'Generate legal analysis using CUDA acceleration', engine: 'vllm' },
      { query: 'Process contract terms with Ollama', engine: 'ollama' }
    ];

    const inferenceResults = [];
    
    for (const { query, engine } of testQueries) {
      console.log(`   Testing ${engine.toUpperCase()}: "${query.slice(0, 50)}..."`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}/demo/gpu-inference/api/inference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            message: query,
            engine,
            generateEmbedding: true
          })
        });

        const result = await response.json();
        const responseTime = Date.now() - startTime;
        
        if (result.success) {
          inferenceResults.push({
            engine,
            query: query.slice(0, 50) + '...',
            responseTime: result.responseTime || responseTime,
            actualEngine: result.engineUsed,
            tokensGenerated: result.tokensGenerated || 0,
            cacheHit: result.cacheHit || false,
            hasEmbedding: !!result.embedding
          });
          
          console.log(`     ✅ Success (${result.responseTime || responseTime}ms) - Engine: ${result.engineUsed} - Cache: ${result.cacheHit ? 'Hit' : 'Miss'}`);
          if (result.embedding) {
            console.log(`     🧮 Generated ${result.embedding.length}-dim embedding`);
          }
        } else {
          console.log(`     ❌ Failed: ${result.error || 'Unknown error'}`);
          inferenceResults.push({
            engine,
            error: result.error || 'Unknown error',
            responseTime
          });
        }
      } catch (error) {
        console.log(`     ❌ Network Error: ${error.message}`);
        inferenceResults.push({
          engine,
          error: error.message
        });
      }
    }

    // Test 4: Get Session Data
    console.log('\n4️⃣ Retrieving Session Data...');
    try {
      const sessionDataResponse = await fetch(`${BASE_URL}/demo/gpu-inference/api/session?id=${session.id}`);
      if (sessionDataResponse.ok) {
        const sessionData = await sessionDataResponse.json();
        console.log(`   ✅ Session retrieved: ${sessionData.sessionName}`);
        console.log(`   📊 Created: ${new Date(sessionData.createdAt).toLocaleString()}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to retrieve session: ${error.message}`);
    }

    // Summary Report
    console.log('\n📊 GPU Inference Demo Test Results:');
    console.log('=====================================');
    
    console.log('\n🏥 Engine Health:');
    for (const [engine, health] of Object.entries(healthResults)) {
      console.log(`   ${engine.padEnd(10)}: ${health.status.toUpperCase().padEnd(8)} ${health.responseTime ? '(' + health.responseTime + 'ms)' : ''}`);
    }

    console.log('\n⚡ Inference Performance:');
    const successful = inferenceResults.filter(r => !r.error);
    const failed = inferenceResults.filter(r => r.error);
    
    console.log(`   Successful: ${successful.length}/${inferenceResults.length}`);
    console.log(`   Failed: ${failed.length}/${inferenceResults.length}`);
    
    if (successful.length > 0) {
      const avgResponseTime = successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length;
      const cacheHits = successful.filter(r => r.cacheHit).length;
      const withEmbeddings = successful.filter(r => r.hasEmbedding).length;
      
      console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
      console.log(`   Cache Hit Rate: ${Math.round((cacheHits / successful.length) * 100)}%`);
      console.log(`   Generated Embeddings: ${withEmbeddings}/${successful.length}`);
    }

    console.log('\n🚀 Demo URL: http://localhost:5173/demo/gpu-inference');
    console.log('\n✅ GPU Inference Demo Test Complete!');

    if (successful.length === inferenceResults.length) {
      console.log('🎉 All tests passed! Demo is fully functional.');
    } else {
      console.log('⚠️  Some tests failed. Check engine status and configurations.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure SvelteKit is running: npm run dev');
    console.log('   2. Check PostgreSQL connection: postgresql://postgres:123456@localhost:5432/legal_ai_db');
    console.log('   3. Run database migration: psql -d legal_ai_db -f src/lib/db/migrations/create-gpu-inference-tables.sql');
    console.log('   4. Check GPU inference worker services are running');
  }
}

// Run the test
testGPUInferenceDemo().catch(console.error);
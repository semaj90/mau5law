#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost';

async function testEndpoint(name, port, path = '/health') {
  try {
    const url = `${BASE_URL}:${port}${path}`;
    console.log(`\n📡 Testing ${name} (${url})...`);

    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: HTTP ${response.status}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Service: ${data.service}`);
      return true;
    } else {
      console.log(`❌ ${name}: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testPhase72Parse() {
  try {
    console.log(`\n🚀 Testing Phase 72 Parse Endpoint...`);

    const response = await fetch('http://localhost:8089/phase72/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Phase 72 Parse: HTTP ${response.status}`);
      console.log(`   Errors found: ${data.count}`);
      return true;
    } else {
      console.log(`❌ Phase 72 Parse: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Phase 72 Parse: ${error.message}`);
    return false;
  }
}

async function testWebSocketService(port, serviceName) {
  try {
    console.log(`\n📡 Testing ${serviceName} WebSocket Service (${port})...`);

    const response = await fetch(`http://localhost:${port}/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${serviceName}: HTTP ${response.status}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Service: ${data.service}`);
      return true;
    } else {
      console.log(`❌ ${serviceName}: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${serviceName}: ${error.message}`);
    return false;
  }
}

async function testGPUPhase72() {
  try {
    console.log(`\n🚀 Testing GPU Phase 72 Error Vectorization...`);

    const payload = {
      errors: [
        "TypeError: Cannot read property of undefined",
        "ReferenceError: x is not defined",
        "SyntaxError: Unexpected token"
      ]
    };

    const response = await fetch('http://localhost:8089/phase72/vectorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ GPU Phase 72: HTTP ${response.status}`);
      console.log(`   Embeddings: ${data.embeddings?.length || 0} vectors`);
      console.log(`   Dimension: ${data.dimension}`);
      console.log(`   GPU Used: ${data.gpu_used}`);
      console.log(`   Latency: ${data.latency_ms}ms`);
      return true;
    } else {
      console.log(`❌ GPU Phase 72: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ GPU Phase 72: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DEPLOYMENT ENDPOINT TESTS');
  console.log('═══════════════════════════════════════════════════════════════');

  const results = [];

  // Test RAG/KAG Endpoints
  console.log('\n📋 STEP 2: TEST RAG/KAG ENDPOINTS');
  results.push(await testEndpoint('Phase 72 Ingest Service', 8089));
  results.push(await testEndpoint('QUIC Bridge (HTTP Fallback)', 8101));

  // Test WebSocket Services (spawned by orchestrator)
  console.log('\n📋 STEP 2B: TEST WEBSOCKET SERVICES');
  results.push(await testWebSocketService(5173, 'RAG Service'));
  results.push(await testWebSocketService(5174, 'Chat Service'));

  // Test Phase 72 Parse
  console.log('\n📋 STEP 3: TEST PHASE 72 ERROR PARSING');
  results.push(await testPhase72Parse());

  // Test GPU Phase 72 (if available)
  console.log('\n📋 STEP 4: TEST GPU PHASE 72 ERROR CLUSTERING');
  results.push(await testGPUPhase72());

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ TESTS COMPLETE: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);

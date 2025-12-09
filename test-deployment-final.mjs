#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost';

async function testEndpoint(name, port, path = '/health') {
  try {
    const url = `${BASE_URL}:${port}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: HTTP ${response.status}`);
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
    const response = await fetch('http://localhost:8089/phase72/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Phase 72 Parse Endpoint: HTTP ${response.status} (${data.count} errors)`);
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

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('PHASE 14 DEPLOYMENT - ENDPOINT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];

  console.log('📋 STEP 2: TEST RAG/KAG ENDPOINTS\n');
  console.log('Testing Phase 72 Ingest Service (8089)...');
  results.push(await testEndpoint('Phase 72 Ingest Service', 8089));

  console.log('Testing QUIC Bridge (8101 - HTTP Fallback)...');
  results.push(await testEndpoint('QUIC Bridge', 8101));

  console.log('Testing WebSocket Services (5173-5199)...');
  results.push(await testEndpoint('RAG WebSocket Service', 5173));

  console.log('\n📋 STEP 3: TEST PHASE 72 ENDPOINTS\n');
  console.log('Testing Phase 72 Parse Endpoint...');
  results.push(await testPhase72Parse());

  console.log('\n═══════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ ENDPOINT VERIFICATION: ${passed}/${total} passed\n`);

  if (passed === total) {
    console.log('✅ ALL ENDPOINTS OPERATIONAL - READY FOR DEPLOYMENT\n');
  } else {
    console.log(`⚠️  ${total - passed} endpoint(s) not responding\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(passed >= 3 ? 0 : 1);
}

main().catch(console.error);

// Integration Test for WebSocket, QUIC, and WebTransport
// Tests the complete real-time communication stack

import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Legal AI Real-Time Communication Integration Test\n');
console.log('=' .repeat(70));

// Test Results
const results = {
  websocketOrchestrator: { status: 'pending', details: null },
  enhancedRAGService: { status: 'pending', details: null },
  quicBridge: { status: 'pending', details: null },
  caddyProxy: { status: 'pending', details: null },
  autoDiscovery: { status: 'pending', details: null },
  latencyTest: { status: 'pending', details: null }
};

// Helper function to print test result
function printResult(testName, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASSED' : 'FAILED';
  console.log(`${icon} ${testName}: ${status}`);
  if (details) {
    console.log(`   ${details}`);
  }
  results[testName.replace(/\s+/g, '')] = { status: passed ? 'passed' : 'failed', details };
}

// Test 1: WebSocket Orchestrator Health
async function testWebSocketOrchestrator() {
  console.log('\n📋 Test 1: WebSocket Orchestrator Service Registry');
  console.log('-'.repeat(70));

  try {
    const registryPath = join(__dirname, 'sveltekit-frontend', '.ws-registry.json');

    if (!fs.existsSync(registryPath)) {
      printResult('websocketOrchestrator', false, 'Registry file not found. Run ws-orchestrator first.');
      return false;
    }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`   Found ${registry.length} WebSocket services:`);

    registry.forEach(service => {
      console.log(`   - ${service.name}: port ${service.port}, endpoint ${service.endpoint}`);
    });

    const hasEnhancedRAG = registry.some(s => s.name === 'enhanced-rag');
    if (hasEnhancedRAG) {
      printResult('websocketOrchestrator', true, `${registry.length} services registered, enhanced-rag found`);
      return true;
    } else {
      printResult('websocketOrchestrator', false, 'enhanced-rag service not found in registry');
      return false;
    }
  } catch (error) {
    printResult('websocketOrchestrator', false, error.message);
    return false;
  }
}

// Test 2: Enhanced RAG WebSocket Connection
async function testEnhancedRAGService() {
  console.log('\n🔌 Test 2: Enhanced RAG WebSocket Connection');
  console.log('-'.repeat(70));

  return new Promise(async (resolve) => {
    try {
      const registryPath = join(__dirname, 'sveltekit-frontend', '.ws-registry.json');
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const enhancedRAG = registry.find(s => s.name === 'enhanced-rag');

      if (!enhancedRAG) {
        printResult('enhancedRAGService', false, 'enhanced-rag not in registry');
        resolve(false);
        return;
      }

      const wsUrl = `ws://localhost:${enhancedRAG.port}${enhancedRAG.endpoint}`;
      console.log(`   Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      let connected = false;

      ws.on('open', () => {
        console.log('   ✅ WebSocket connection established');
        connected = true;

        // Send test legal search request
        const request = {
          type: 'legal_search',
          query: 'patent infringement case law',
          context: { jurisdiction: 'US' }
        };
        console.log('   📤 Sending test query:', request.query);
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        console.log('   📨 Received response:');
        console.log(`      Status: ${response.status}`);
        console.log(`      Type: ${response.type}`);
        if (response.results) {
          console.log(`      Results: ${response.results.length} items`);
        }

        printResult('enhancedRAGService', true, `WebSocket working, received ${response.type} response`);
        ws.close();
        resolve(true);
      });

      ws.on('error', (error) => {
        if (!connected) {
          printResult('enhancedRAGService', false, `Connection error: ${error.message}`);
          resolve(false);
        }
      });

      ws.on('close', () => {
        if (!connected) {
          printResult('enhancedRAGService', false, 'Connection closed before test completed');
          resolve(false);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!connected) {
          ws.close();
          printResult('enhancedRAGService', false, 'Connection timeout');
          resolve(false);
        }
      }, 10000);

    } catch (error) {
      printResult('enhancedRAGService', false, error.message);
      resolve(false);
    }
  });
}

// Test 3: QUIC Bridge Service
async function testQUICBridge() {
  console.log('\n⚡ Test 3: QUIC Bridge Service');
  console.log('-'.repeat(70));

  try {
    // Test HTTP fallback endpoint first
    console.log('   Testing HTTP fallback (port 8101)...');
    const fallbackResponse = await fetch('http://localhost:8101/health');

    if (!fallbackResponse.ok) {
      printResult('quicBridge', false, `HTTP fallback failed: ${fallbackResponse.status}`);
      return false;
    }

    const health = await fallbackResponse.json();
    console.log(`   Service: ${health.service}`);
    console.log(`   Protocol: ${health.protocol}`);
    console.log(`   Status: ${health.status}`);

    if (health.capabilities) {
      console.log(`   Capabilities: ${health.capabilities.join(', ')}`);
    }

    printResult('quicBridge', true, `QUIC bridge healthy (${health.protocol})`);
    return true;

  } catch (error) {
    printResult('quicBridge', false, `Service not running: ${error.message}`);
    console.log('   💡 Start QUIC bridge with: go run go-services/quic-bridge/main.go');
    return false;
  }
}

// Test 4: Caddy Proxy Integration
async function testCaddyProxy() {
  console.log('\n🌐 Test 4: Caddy Proxy to QUIC Bridge');
  console.log('-'.repeat(70));

  try {
    console.log('   Testing Caddy proxy route (/quic-health)...');
    const response = await fetch('http://localhost:5178/quic-health');

    if (!response.ok) {
      printResult('caddyProxy', false, `Proxy failed: ${response.status}`);
      return false;
    }

    const health = await response.json();
    console.log(`   ✅ Caddy → QUIC Bridge: ${health.status}`);
    console.log(`   Protocol: ${health.protocol}`);

    printResult('caddyProxy', true, 'Caddy proxy working');
    return true;

  } catch (error) {
    printResult('caddyProxy', false, `Caddy not running: ${error.message}`);
    console.log('   💡 Start Caddy with: caddy run --config sveltekit-frontend/Caddyfile.development');
    return false;
  }
}

// Test 5: Auto-Discovery Mechanism
async function testAutoDiscovery() {
  console.log('\n🔍 Test 5: Auto-Discovery Mechanism');
  console.log('-'.repeat(70));

  try {
    // Check .env.local file
    const envPath = join(__dirname, 'sveltekit-frontend', '.env.local');

    if (!fs.existsSync(envPath)) {
      printResult('autoDiscovery', false, '.env.local not found');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('   ✅ .env.local file exists');

    // Check for enhanced-rag environment variables
    if (envContent.includes('VITE_WS_enhanced-rag')) {
      console.log('   ✅ Enhanced RAG environment variables configured');
    }

    // Check Caddyfile.ws
    const caddyPath = join(__dirname, 'Caddyfile.ws');

    if (!fs.existsSync(caddyPath)) {
      printResult('autoDiscovery', false, 'Caddyfile.ws not generated');
      return false;
    }

    const caddyContent = fs.readFileSync(caddyPath, 'utf8');
    console.log('   ✅ Caddyfile.ws generated');

    if (caddyContent.includes('@enhanced-rag')) {
      console.log('   ✅ Enhanced RAG Caddy route configured');
    }

    printResult('autoDiscovery', true, 'Auto-discovery system working');
    return true;

  } catch (error) {
    printResult('autoDiscovery', false, error.message);
    return false;
  }
}

// Test 6: Latency Measurements
async function testLatency() {
  console.log('\n⏱️  Test 6: Latency Measurements');
  console.log('-'.repeat(70));

  return new Promise(async (resolve) => {
    try {
      const registryPath = join(__dirname, 'sveltekit-frontend', '.ws-registry.json');
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const enhancedRAG = registry.find(s => s.name === 'enhanced-rag');

      if (!enhancedRAG) {
        printResult('latencyTest', false, 'enhanced-rag not available for latency test');
        resolve(false);
        return;
      }

      const wsUrl = `ws://localhost:${enhancedRAG.port}${enhancedRAG.endpoint}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        const iterations = 5;
        let currentIteration = 0;
        const latencies = [];

        function sendPing() {
          if (currentIteration >= iterations) {
            // Calculate statistics
            const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const min = Math.min(...latencies);
            const max = Math.max(...latencies);

            console.log(`   Latency measurements (${iterations} iterations):`);
            console.log(`      Average: ${avg.toFixed(2)}ms`);
            console.log(`      Min: ${min.toFixed(2)}ms`);
            console.log(`      Max: ${max.toFixed(2)}ms`);

            const passed = avg < 100; // Accept under 100ms for local connection
            printResult('latencyTest', passed, `Avg latency: ${avg.toFixed(2)}ms`);

            ws.close();
            resolve(passed);
            return;
          }

          const startTime = performance.now();
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

          ws.once('message', () => {
            const latency = performance.now() - startTime;
            latencies.push(latency);
            console.log(`   Ping ${currentIteration + 1}: ${latency.toFixed(2)}ms`);
            currentIteration++;
            setTimeout(sendPing, 100);
          });
        }

        sendPing();
      });

      ws.on('error', (error) => {
        printResult('latencyTest', false, error.message);
        resolve(false);
      });

      setTimeout(() => {
        ws.close();
        printResult('latencyTest', false, 'Timeout');
        resolve(false);
      }, 15000);

    } catch (error) {
      printResult('latencyTest', false, error.message);
      resolve(false);
    }
  });
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Integration Tests...\n');

  const test1 = await testWebSocketOrchestrator();
  const test2 = test1 ? await testEnhancedRAGService() : false;
  const test3 = await testQUICBridge();
  const test4 = test3 ? await testCaddyProxy() : false;
  const test5 = test1 ? await testAutoDiscovery() : false;
  const test6 = test2 ? await testLatency() : false;

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));

  const totalTests = 6;
  const passedTests = [test1, test2, test3, test4, test5, test6].filter(Boolean).length;

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed\n`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Real-time communication stack is operational.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.\n');

    if (!test1) {
      console.log('💡 Start WebSocket orchestrator:');
      console.log('   cd go-services/ws-orchestrator && go run main.go\n');
    }

    if (!test3) {
      console.log('💡 Start QUIC bridge:');
      console.log('   cd go-services/quic-bridge && go run main.go\n');
    }

    if (!test4) {
      console.log('💡 Start Caddy:');
      console.log('   cd sveltekit-frontend && caddy run --config Caddyfile.development\n');
    }
  }

  // Write results to file
  const resultsPath = join(__dirname, 'test-results-integration.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📄 Test results saved to: ${resultsPath}\n`);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

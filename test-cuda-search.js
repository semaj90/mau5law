#!/usr/bin/env node

/**
 * Test script for CUDA Search Service integration
 * Tests the /search endpoint with Ollama and pgvector
 */

import https from 'https';
import http from 'http';

const CUDA_SERVICE_URL = 'http://localhost:8096';
const OLLAMA_URL = 'http://localhost:11434';

// Test queries for legal domain
const testQueries = [
    'contract termination clause',
    'precedent case law criminal defense',
    'evidence chain custody requirements',
    'intellectual property licensing terms',
    'employment discrimination statute'
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Make HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Test CUDA service health
async function testCudaHealth() {
    colorLog('blue', '\n🔧 Testing CUDA Service Health...');

    try {
        const response = await makeRequest(`${CUDA_SERVICE_URL}/api/v1/health`);

        if (response.status === 200) {
            colorLog('green', '✅ CUDA Service is healthy');
            colorLog('cyan', `   GPU Model: ${response.data.gpu_model}`);
            colorLog('cyan', `   CUDA Cores: ${response.data.cuda_cores}`);
            colorLog('cyan', `   Tensor Cores: ${response.data.tensor_cores}`);
            colorLog('cyan', `   Memory: ${response.data.memory_gb}GB`);
            return true;
        } else {
            colorLog('red', `❌ CUDA Service health check failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        colorLog('red', `❌ CUDA Service connection failed: ${error.message}`);
        return false;
    }
}

// Test Ollama service
async function testOllamaHealth() {
    colorLog('blue', '\n🤖 Testing Ollama Service...');

    try {
        const response = await makeRequest(`${OLLAMA_URL}/api/tags`);

        if (response.status === 200) {
            colorLog('green', '✅ Ollama Service is healthy');

            if (response.data.models && response.data.models.length > 0) {
                colorLog('cyan', `   Available models: ${response.data.models.length}`);

                const gemmaModel = response.data.models.find(m =>
                    m.name.includes('gemma') && m.name.includes('legal')
                );

                if (gemmaModel) {
                    colorLog('green', `   ✅ Found legal model: ${gemmaModel.name}`);
                } else {
                    colorLog('yellow', '   ⚠️  No Gemma3:legal-latest model found');
                    colorLog('yellow', '   Available models:');
                    response.data.models.forEach(model => {
                        colorLog('yellow', `     - ${model.name}`);
                    });
                }
            }
            return true;
        } else {
            colorLog('red', `❌ Ollama health check failed: ${response.status}`);
            return false;
        }
    } catch (error) {
        colorLog('red', `❌ Ollama connection failed: ${error.message}`);
        return false;
    }
}

// Test search endpoint
async function testSearchEndpoint(query, limit = 3) {
    colorLog('magenta', `\n🔍 Testing search: "${query}"`);

    const requestBody = JSON.stringify({
        q: query,
        limit: limit
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        },
        body: requestBody
    };

    try {
        const startTime = Date.now();
        const response = await makeRequest(`${CUDA_SERVICE_URL}/api/v1/search`, options);
        const duration = Date.now() - startTime;

        if (response.status === 200) {
            colorLog('green', `✅ Search completed in ${duration}ms`);
            colorLog('cyan', `   Query: ${response.data.query}`);
            colorLog('cyan', `   Results: ${response.data.count}/${response.data.limit}`);

            if (response.data.results && response.data.results.length > 0) {
                response.data.results.forEach((result, index) => {
                    const similarity = (1 - result.score).toFixed(3);
                    colorLog('yellow', `   ${index + 1}. ID: ${result.id} (similarity: ${similarity})`);

                    if (result.payload) {
                        const preview = result.payload.substring(0, 100);
                        colorLog('yellow', `      Payload: ${preview}${result.payload.length > 100 ? '...' : ''}`);
                    }
                });
            } else {
                colorLog('yellow', '   ⚠️  No results found');
            }

            return true;
        } else {
            colorLog('red', `❌ Search failed: ${response.status}`);
            if (response.data.error) {
                colorLog('red', `   Error: ${response.data.error}`);
            }
            return false;
        }
    } catch (error) {
        colorLog('red', `❌ Search request failed: ${error.message}`);
        return false;
    }
}

// Main test function
async function runTests() {
    colorLog('cyan', '🚀 CUDA Legal AI Search Integration Tests');
    colorLog('cyan', '=========================================\n');

    let allTestsPassed = true;

    // Test service health
    const cudaHealthy = await testCudaHealth();
    const ollamaHealthy = await testOllamaHealth();

    if (!cudaHealthy || !ollamaHealthy) {
        colorLog('red', '\n❌ Prerequisites failed - skipping search tests');
        process.exit(1);
    }

    // Test search functionality
    colorLog('blue', '\n📋 Running Search Tests...');

    for (const query of testQueries) {
        const success = await testSearchEndpoint(query);
        if (!success) {
            allTestsPassed = false;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    colorLog('cyan', '\n=========================================');
    if (allTestsPassed) {
        colorLog('green', '🎉 All tests passed successfully!');
        colorLog('green', '✅ CUDA Search Service is fully operational');
        colorLog('cyan', '\n🌐 Frontend test page: http://localhost:5173/cuda-search');
    } else {
        colorLog('red', '❌ Some tests failed');
        colorLog('yellow', '⚠️  Check service logs for details');
    }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(error => {
        colorLog('red', `\n💥 Test runner error: ${error.message}`);
        process.exit(1);
    });
}

export { testCudaHealth, testOllamaHealth, testSearchEndpoint };
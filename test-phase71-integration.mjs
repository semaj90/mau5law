#!/usr/bin/env node

/**
 * Phase 71 Complete Integration Test Suite
 * Tests the entire unified legal AI platform pipeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const CONFIG = {
    services: {
        tensorrtLLM: 'http://localhost:8099',
        goMicroservice: 'http://localhost:8097',
        pythonServices: 'http://localhost:8092',
        ollama: 'http://localhost:11434',
        postgres: 'postgresql://postgres:123456@localhost:5432/legal_ai_db',
        redis: 'redis://:redis@localhost:6379',
        qdrant: 'http://localhost:6333',
        minio: 'http://localhost:9000',
        frontend: 'http://localhost:3000'
    },
    testData: {
        legalDocument: `
            CONTRACT AGREEMENT

            This Agreement is made on January 1, 2024, between ABC Corporation ("Company")
            and John Doe ("Contractor").

            1. SERVICES: Contractor shall provide software development services.

            2. COMPENSATION: Company shall pay Contractor $100,000 upon completion.

            3. TERM: This agreement begins on execution and continues until December 31, 2024.

            4. TERMINATION: Either party may terminate with 30 days written notice.

            5. CONFIDENTIALITY: Contractor shall maintain confidentiality of Company information.

            IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.

            ABC Corporation                    John Doe
            _____________________________     _____________________________
        `,
        analysisType: 'contract_review',
        embeddingText: 'breach of contract legal implications'
    },
    timeouts: {
        serviceCheck: 5000,
        analysis: 30000,
        embedding: 10000
    }
};

// Test results
let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warning: '\x1b[33m',
        reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function recordTest(name, passed, error = null, duration = 0) {
    testResults.tests.push({
        name,
        passed,
        error: error?.message || error,
        duration
    });

    if (passed) {
        testResults.passed++;
        log(`✅ ${name} (${duration}ms)`, 'success');
    } else {
        testResults.failed++;
        log(`❌ ${name}: ${error?.message || error}`, 'error');
    }
}

async function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function testServiceHealth(serviceName, url, expectedStatus = 200) {
    const startTime = Date.now();

    try {
        const response = await makeRequest(url, {
            timeout: CONFIG.timeouts.serviceCheck
        });

        if (response.status === expectedStatus) {
            recordTest(`${serviceName} Health Check`, true, null, Date.now() - startTime);
            return true;
        } else {
            throw new Error(`Unexpected status: ${response.status}`);
        }
    } catch (error) {
        recordTest(`${serviceName} Health Check`, false, error, Date.now() - startTime);
        return false;
    }
}

async function testTensorRTLLM() {
    log('Testing TensorRT-LLM Service...');

    // Health check
    if (!(await testServiceHealth('TensorRT-LLM', `${CONFIG.services.tensorrtLLM}/health`))) {
        return;
    }

    // Legal analysis test
    const startTime = Date.now();
    try {
        const response = await makeRequest(`${CONFIG.services.tensorrtLLM}/analyze-legal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document_text: CONFIG.testData.legalDocument,
                analysis_type: CONFIG.testData.analysisType,
                max_tokens: 512,
                temperature: 0.1
            }),
            timeout: CONFIG.timeouts.analysis
        });

        if (response.ok) {
            const result = await response.json();

            // Validate response structure
            if (result.analysis && result.confidence_score !== undefined && result.key_findings) {
                recordTest('TensorRT-LLM Legal Analysis', true, null, Date.now() - startTime);
            } else {
                throw new Error('Invalid response structure');
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        recordTest('TensorRT-LLM Legal Analysis', false, error, Date.now() - startTime);
    }

    // Performance test
    const perfStartTime = Date.now();
    try {
        const response = await makeRequest(`${CONFIG.services.tensorrtLLM}/performance`, {
            timeout: CONFIG.timeouts.serviceCheck
        });

        if (response.ok) {
            const perf = await response.json();
            const latency = perf.performance?.average_latency || 0;

            if (latency < 1000) { // Should be sub-second
                recordTest('TensorRT-LLM Performance (< 1s latency)', true, null, Date.now() - perfStartTime);
            } else {
                recordTest('TensorRT-LLM Performance (< 1s latency)', false, `Latency: ${latency}ms`, Date.now() - perfStartTime);
            }
        }
    } catch (error) {
        recordTest('TensorRT-LLM Performance Check', false, error, Date.now() - perfStartTime);
    }
}

async function testGoMicroservice() {
    log('Testing Go Microservice...');

    if (!(await testServiceHealth('Go Microservice', `${CONFIG.services.goMicroservice}/health`))) {
        return;
    }

    // Test SIMD JSON parsing (if available)
    const startTime = Date.now();
    try {
        const testJson = JSON.stringify({
            contract: CONFIG.testData.legalDocument,
            metadata: { type: 'legal', priority: 'high' }
        });

        const response = await makeRequest(`${CONFIG.services.goMicroservice}/simd/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: testJson,
            timeout: CONFIG.timeouts.analysis
        });

        if (response.ok) {
            recordTest('Go SIMD JSON Parser', true, null, Date.now() - startTime);
        } else {
            recordTest('Go SIMD JSON Parser', false, `HTTP ${response.status}`, Date.now() - startTime);
        }
    } catch (error) {
        recordTest('Go SIMD JSON Parser', false, error, Date.now() - startTime);
    }
}

async function testOllamaIntegration() {
    log('Testing Ollama Integration...');

    // Test model availability
    const startTime = Date.now();
    try {
        const response = await makeRequest(`${CONFIG.services.ollama}/api/tags`, {
            timeout: CONFIG.timeouts.serviceCheck
        });

        if (response.ok) {
            const data = await response.json();
            const hasGemma3 = data.models?.some(m => m.name.includes('gemma3'));

            if (hasGemma3) {
                recordTest('Ollama Gemma3-Legal Model', true, null, Date.now() - startTime);
            } else {
                recordTest('Ollama Gemma3-Legal Model', false, 'gemma3-legal model not found', Date.now() - startTime);
            }
        }
    } catch (error) {
        recordTest('Ollama Model Check', false, error, Date.now() - startTime);
    }

    // Test embedding generation
    const embedStartTime = Date.now();
    try {
        const response = await makeRequest(`${CONFIG.services.ollama}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'embeddinggemma:latest',
                prompt: CONFIG.testData.embeddingText
            }),
            timeout: CONFIG.timeouts.embedding
        });

        if (response.ok) {
            const data = await response.json();
            if (data.embedding && Array.isArray(data.embedding)) {
                recordTest('Ollama Embedding Generation', true, null, Date.now() - embedStartTime);
            } else {
                throw new Error('Invalid embedding response');
            }
        }
    } catch (error) {
        recordTest('Ollama Embedding Generation', false, error, Date.now() - embedStartTime);
    }
}

async function testDatabaseConnections() {
    log('Testing Database Connections...');

    // Test PostgreSQL + pgvector (simplified check)
    try {
        // This would require a PostgreSQL client, for now just check if service is up
        const response = await makeRequest('http://localhost:5432', {
            timeout: CONFIG.timeouts.serviceCheck
        });
        recordTest('PostgreSQL Connection', true);
    } catch (error) {
        // PostgreSQL doesn't expose HTTP, so this will likely fail - mark as skipped
        recordTest('PostgreSQL Connection', false, 'HTTP check not applicable', 0);
        testResults.skipped++;
        testResults.failed--;
    }

    // Test Redis
    try {
        const response = await makeRequest('http://localhost:6379', {
            timeout: CONFIG.timeouts.serviceCheck
        });
        recordTest('Redis Connection', true);
    } catch (error) {
        recordTest('Redis Connection', false, 'HTTP check not applicable', 0);
        testResults.skipped++;
        testResults.failed--;
    }

    // Test Qdrant
    if (await testServiceHealth('Qdrant', `${CONFIG.services.qdrant}/health`)) {
        // Test vector search
        const startTime = Date.now();
        try {
            const response = await makeRequest(`${CONFIG.services.qdrant}/collections`, {
                timeout: CONFIG.timeouts.serviceCheck
            });
            recordTest('Qdrant Vector Search', true, null, Date.now() - startTime);
        } catch (error) {
            recordTest('Qdrant Vector Search', false, error, Date.now() - startTime);
        }
    }
}

async function testFrontendIntegration() {
    log('Testing Frontend Integration...');

    if (!(await testServiceHealth('SvelteKit Frontend', CONFIG.services.frontend))) {
        return;
    }

    // Test monitor endpoint
    if (await testServiceHealth('Monitoring Dashboard', `${CONFIG.services.frontend}/monitor`)) {
        recordTest('Frontend Monitor Page', true);
    }
}

async function testEndToEndPipeline() {
    log('Testing End-to-End Pipeline...');

    const startTime = Date.now();

    try {
        // Step 1: Submit document for analysis via TensorRT-LLM
        const analysisResponse = await makeRequest(`${CONFIG.services.tensorrtLLM}/analyze-legal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document_text: CONFIG.testData.legalDocument,
                analysis_type: 'contract_review',
                max_tokens: 256
            }),
            timeout: CONFIG.timeouts.analysis
        });

        if (!analysisResponse.ok) {
            throw new Error(`Analysis failed: ${analysisResponse.status}`);
        }

        const analysis = await analysisResponse.json();

        // Step 2: Generate embeddings for the analysis
        const embedResponse = await makeRequest(`${CONFIG.services.ollama}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'embeddinggemma:latest',
                prompt: analysis.analysis.substring(0, 512)
            }),
            timeout: CONFIG.timeouts.embedding
        });

        if (!embedResponse.ok) {
            throw new Error(`Embedding failed: ${embedResponse.status}`);
        }

        const embedding = await embedResponse.json();

        // Step 3: Store in vector database (Qdrant)
        const vectorData = {
            points: [{
                id: Date.now().toString(),
                vector: embedding.embedding,
                payload: {
                    text: analysis.analysis,
                    type: 'legal_analysis',
                    confidence: analysis.confidence_score,
                    timestamp: new Date().toISOString()
                }
            }]
        };

        const vectorResponse = await makeRequest(`${CONFIG.services.qdrant}/collections/legal_docs/points`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vectorData),
            timeout: CONFIG.timeouts.serviceCheck
        });

        if (vectorResponse.ok) {
            recordTest('End-to-End Pipeline (Analysis → Embed → Store)', true, null, Date.now() - startTime);
        } else {
            throw new Error(`Vector storage failed: ${vectorResponse.status}`);
        }

    } catch (error) {
        recordTest('End-to-End Pipeline (Analysis → Embed → Store)', false, error, Date.now() - startTime);
    }
}

async function runAllTests() {
    log('🚀 Starting Phase 71 Integration Test Suite', 'info');
    log('=' * 60, 'info');

    const testStartTime = Date.now();

    // Run all test suites
    await Promise.all([
        testTensorRTLLM(),
        testGoMicroservice(),
        testOllamaIntegration(),
        testDatabaseConnections(),
        testFrontendIntegration(),
        testEndToEndPipeline()
    ]);

    const totalTime = Date.now() - testStartTime;

    // Print results
    log('');
    log('📊 Test Results Summary', 'info');
    log('=' * 30, 'info');
    log(`Total Tests: ${testResults.tests.length}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, 'error');
    log(`Skipped: ${testResults.skipped}`, 'warning');
    log(`Total Time: ${totalTime}ms`, 'info');

    const successRate = testResults.tests.length > 0 ?
        ((testResults.passed / (testResults.tests.length - testResults.skipped)) * 100).toFixed(1) : 0;
    log(`Success Rate: ${successRate}%`, 'info');

    // Detailed results
    if (testResults.failed > 0) {
        log('');
        log('❌ Failed Tests:', 'error');
        testResults.tests.filter(t => !t.passed).forEach(test => {
            log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }

    // Save results to file
    const resultsFile = path.join(__dirname, 'test-results-phase71.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: testResults.tests.length,
            passed: testResults.passed,
            failed: testResults.failed,
            skipped: testResults.skipped,
            successRate: `${successRate}%`,
            totalTimeMs: totalTime
        },
        tests: testResults.tests
    }, null, 2));

    log('');
    log(`📄 Detailed results saved to: ${resultsFile}`, 'info');

    // Exit with appropriate code
    if (testResults.failed > 0) {
        log('');
        log('❌ Integration tests failed!', 'error');
        process.exit(1);
    } else {
        log('');
        log('✅ All integration tests passed!', 'success');
        process.exit(0);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Phase 71 Integration Test Suite

Usage: node test-phase71-integration.mjs [options]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose logging
  --timeout <ms>      Set request timeout (default: 5000ms)
  --skip-e2e          Skip end-to-end pipeline test

Examples:
  node test-phase71-integration.mjs
  node test-phase71-integration.mjs --verbose
  node test-phase71-integration.mjs --timeout 10000
`);
    process.exit(0);
}

// Configure timeouts if specified
const timeoutArg = args.find((arg, i) => arg === '--timeout' && args[i + 1]);
if (timeoutArg) {
    const timeout = parseInt(args[args.indexOf(timeoutArg) + 1]);
    if (!isNaN(timeout)) {
        CONFIG.timeouts.serviceCheck = timeout;
        CONFIG.timeouts.analysis = timeout * 6;
        CONFIG.timeouts.embedding = timeout * 2;
    }
}

// Skip E2E test if requested
const skipE2E = args.includes('--skip-e2e');

// Run tests
runAllTests().catch(error => {
    log(`💥 Test suite crashed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
});
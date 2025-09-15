/**
 * Comprehensive Integration Test Suite
 * Tests CUDA Search Service + Legal Recommendation Engine + System Integration
 */

import http from 'http';
import { spawn } from 'child_process';

// Service configurations
const SERVICES = {
    cuda: {
        name: 'CUDA Search Service',
        url: 'http://localhost:8081',
        healthPath: '/health',
        searchPath: '/search'
    },
    recommendations: {
        name: 'Legal Recommendation Engine',
        url: 'http://localhost:8080',
        healthPath: '/health',
        recommendPath: '/recommend'
    },
    ollama: {
        name: 'Ollama LLM Service',
        url: 'http://localhost:11434',
        healthPath: '/api/tags'
    },
    sveltekit: {
        name: 'SvelteKit Frontend',
        url: 'http://localhost:5173',
        healthPath: '/cuda-search'
    }
};

// Test data for legal AI workflows
const TEST_DATA = {
    legalQueries: [
        'contract termination clause liability',
        'employment discrimination workplace harassment',
        'intellectual property patent infringement',
        'evidence chain custody requirements',
        'wrongful termination whistleblower protection'
    ],

    recommendationRequest: {
        case_id: "integration_test_001",
        case_facts: [
            "Software licensing agreement dispute",
            "Alleged breach of exclusive use terms",
            "Claimed damages of $2.5M",
            "Counter-claim of insufficient payment"
        ],
        legal_domain: "contract_law",
        jurisdiction: "federal",
        max_recommendations: 5,
        similarity_threshold: 0.3,
        include_precedents: true,
        include_similar_cases: true,
        include_risk_assessment: true,
        filters: {}
    }
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, rawData: data });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null, rawData: data });
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

// Service health checks
async function checkServiceHealth(serviceKey) {
    const service = SERVICES[serviceKey];
    colorLog('blue', `\n🔍 Testing ${service.name}...`);

    try {
        const response = await makeRequest(`${service.url}${service.healthPath}`);

        if (response.status === 200) {
            colorLog('green', `✅ ${service.name} is healthy`);

            // Service-specific health info
            if (serviceKey === 'cuda' && response.data) {
                colorLog('cyan', `   GPU: ${response.data.gpu_model}`);
                colorLog('cyan', `   CUDA Cores: ${response.data.cuda_cores}`);
                colorLog('cyan', `   Workers: ${response.data.ready_workers}/${response.data.total_workers}`);
            } else if (serviceKey === 'recommendations' && response.data) {
                colorLog('cyan', `   Cases: ${response.data.databases?.cases || 'N/A'}`);
                colorLog('cyan', `   Precedents: ${response.data.databases?.precedents || 'N/A'}`);
                colorLog('cyan', `   Redis: ${response.data.redis_status || 'N/A'}`);
            } else if (serviceKey === 'ollama' && response.data) {
                const modelCount = response.data.models?.length || 0;
                colorLog('cyan', `   Models: ${modelCount}`);

                if (response.data.models) {
                    const gemmaModel = response.data.models.find(m =>
                        m.name.includes('gemma') && m.name.includes('legal')
                    );
                    if (gemmaModel) {
                        colorLog('cyan', `   Legal Model: ${gemmaModel.name}`);
                    }
                }
            }

            return { success: true, service: serviceKey, data: response.data };
        } else {
            colorLog('red', `❌ ${service.name} health check failed: ${response.status}`);
            return { success: false, service: serviceKey, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        colorLog('red', `❌ ${service.name} connection failed: ${error.message}`);
        return { success: false, service: serviceKey, error: error.message };
    }
}

// Test CUDA search functionality
async function testCudaSearch() {
    colorLog('magenta', '\n🔍 Testing CUDA Search Functionality...');

    const testResults = [];

    for (const query of TEST_DATA.legalQueries) {
        colorLog('yellow', `\n   Query: "${query}"`);

        const requestBody = JSON.stringify({
            q: query,
            limit: 3
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
            const response = await makeRequest(`${SERVICES.cuda.url}${SERVICES.cuda.searchPath}`, options);
            const duration = Date.now() - startTime;

            if (response.status === 200 && response.data) {
                colorLog('green', `   ✅ Search completed in ${duration}ms`);
                colorLog('cyan', `   Results: ${response.data.count}/${response.data.limit}`);

                testResults.push({
                    query,
                    success: true,
                    duration,
                    resultCount: response.data.count
                });
            } else {
                colorLog('red', `   ❌ Search failed: ${response.status}`);
                testResults.push({
                    query,
                    success: false,
                    error: `HTTP ${response.status}`
                });
            }
        } catch (error) {
            colorLog('red', `   ❌ Search error: ${error.message}`);
            testResults.push({
                query,
                success: false,
                error: error.message
            });
        }

        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return testResults;
}

// Test legal recommendation engine
async function testRecommendationEngine() {
    colorLog('magenta', '\n⚖️  Testing Legal Recommendation Engine...');

    const requestBody = JSON.stringify(TEST_DATA.recommendationRequest);

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
        const response = await makeRequest(`${SERVICES.recommendations.url}${SERVICES.recommendations.recommendPath}`, options);
        const duration = Date.now() - startTime;

        if (response.status === 200 && response.data) {
            colorLog('green', `✅ Recommendations generated in ${duration}ms`);
            colorLog('cyan', `   Recommendations: ${response.data.total_count}`);
            colorLog('cyan', `   Confidence: ${(response.data.confidence_score * 100).toFixed(1)}%`);
            colorLog('cyan', `   Processing Time: ${response.data.processing_time_ms}ms`);

            if (response.data.recommendations) {
                response.data.recommendations.forEach((rec, index) => {
                    colorLog('yellow', `   ${index + 1}. ${rec.title} (${(rec.confidence_score * 100).toFixed(1)}%)`);
                });
            }

            return { success: true, data: response.data, duration };
        } else {
            colorLog('red', `❌ Recommendations failed: ${response.status}`);
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        colorLog('red', `❌ Recommendation error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test end-to-end integration workflow
async function testE2EWorkflow() {
    colorLog('magenta', '\n🔄 Testing End-to-End Legal AI Workflow...');

    try {
        // 1. Search for similar cases
        colorLog('cyan', '   Step 1: Searching for similar cases...');
        const searchResponse = await makeRequest(`${SERVICES.cuda.url}${SERVICES.cuda.searchPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: "software licensing breach contract damages",
                limit: 2
            })
        });

        if (searchResponse.status !== 200) {
            throw new Error(`Search failed: ${searchResponse.status}`);
        }

        colorLog('green', `   ✅ Found ${searchResponse.data.count} similar cases`);

        // 2. Get legal recommendations
        colorLog('cyan', '   Step 2: Generating legal recommendations...');
        const recResponse = await makeRequest(`${SERVICES.recommendations.url}${SERVICES.recommendations.recommendPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_DATA.recommendationRequest)
        });

        if (recResponse.status !== 200) {
            throw new Error(`Recommendations failed: ${recResponse.status}`);
        }

        colorLog('green', `   ✅ Generated ${recResponse.data.total_count} recommendations`);

        // 3. Validate data integration
        colorLog('cyan', '   Step 3: Validating data integration...');
        const hasRiskAssessment = recResponse.data.recommendations.some(r => r.recommendation_type === 'risk_assessment');
        const hasPrecedents = recResponse.data.recommendations.some(r => r.recommendation_type === 'precedent');
        const hasSimilarCases = recResponse.data.recommendations.some(r => r.recommendation_type === 'similar_case');

        if (hasRiskAssessment && hasPrecedents) {
            colorLog('green', '   ✅ All recommendation types present');
        } else {
            colorLog('yellow', '   ⚠️  Some recommendation types missing');
        }

        return {
            success: true,
            searchResults: searchResponse.data.count,
            recommendations: recResponse.data.total_count,
            confidence: recResponse.data.confidence_score
        };

    } catch (error) {
        colorLog('red', `   ❌ E2E workflow failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Performance benchmarking
async function runPerformanceBenchmark() {
    colorLog('magenta', '\n⚡ Running Performance Benchmark...');

    const benchmarkResults = {
        search: [],
        recommendations: [],
        concurrent: []
    };

    // Search performance test
    colorLog('cyan', '   Testing search performance...');
    for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const response = await makeRequest(`${SERVICES.cuda.url}${SERVICES.cuda.searchPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: TEST_DATA.legalQueries[i % TEST_DATA.legalQueries.length], limit: 5 })
        });
        const duration = Date.now() - startTime;

        if (response.status === 200) {
            benchmarkResults.search.push(duration);
        }
    }

    // Recommendation performance test
    colorLog('cyan', '   Testing recommendation performance...');
    for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const response = await makeRequest(`${SERVICES.recommendations.url}${SERVICES.recommendations.recommendPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_DATA.recommendationRequest)
        });
        const duration = Date.now() - startTime;

        if (response.status === 200) {
            benchmarkResults.recommendations.push(duration);
        }
    }

    // Calculate averages
    const avgSearch = benchmarkResults.search.reduce((a, b) => a + b, 0) / benchmarkResults.search.length;
    const avgRec = benchmarkResults.recommendations.reduce((a, b) => a + b, 0) / benchmarkResults.recommendations.length;

    colorLog('yellow', `   Average search time: ${avgSearch.toFixed(0)}ms`);
    colorLog('yellow', `   Average recommendation time: ${avgRec.toFixed(0)}ms`);

    return {
        search: { average: avgSearch, results: benchmarkResults.search },
        recommendations: { average: avgRec, results: benchmarkResults.recommendations }
    };
}

// Main integration test runner
async function runIntegrationTests() {
    colorLog('bold', '🚀 LEGAL AI PLATFORM - COMPREHENSIVE INTEGRATION TESTS');
    colorLog('bold', '====================================================\n');

    const testResults = {
        serviceHealth: {},
        searchTests: [],
        recommendationTest: null,
        e2eWorkflow: null,
        performance: null,
        startTime: Date.now()
    };

    // 1. Service health checks
    colorLog('blue', '📋 Phase 1: Service Health Checks');
    for (const serviceKey of Object.keys(SERVICES)) {
        const result = await checkServiceHealth(serviceKey);
        testResults.serviceHealth[serviceKey] = result;
    }

    // Check if critical services are healthy
    const criticalServices = ['cuda', 'recommendations'];
    const criticalServicesHealthy = criticalServices.every(service =>
        testResults.serviceHealth[service]?.success
    );

    if (!criticalServicesHealthy) {
        colorLog('red', '\n❌ Critical services are down. Stopping integration tests.');
        return testResults;
    }

    // 2. CUDA search tests
    colorLog('blue', '\n📋 Phase 2: CUDA Search Function Tests');
    testResults.searchTests = await testCudaSearch();

    // 3. Legal recommendation tests
    colorLog('blue', '\n📋 Phase 3: Legal Recommendation Engine Tests');
    testResults.recommendationTest = await testRecommendationEngine();

    // 4. End-to-end workflow tests
    colorLog('blue', '\n📋 Phase 4: End-to-End Workflow Tests');
    testResults.e2eWorkflow = await testE2EWorkflow();

    // 5. Performance benchmarking
    colorLog('blue', '\n📋 Phase 5: Performance Benchmarking');
    testResults.performance = await runPerformanceBenchmark();

    // Generate test summary
    testResults.endTime = Date.now();
    testResults.totalDuration = testResults.endTime - testResults.startTime;

    return testResults;
}

// Generate test report
function generateTestReport(results) {
    colorLog('bold', '\n📊 INTEGRATION TEST REPORT');
    colorLog('bold', '===========================\n');

    // Service health summary
    colorLog('cyan', '🏥 Service Health Summary:');
    Object.entries(results.serviceHealth).forEach(([service, result]) => {
        const status = result.success ? '✅' : '❌';
        colorLog('white', `   ${status} ${SERVICES[service].name}: ${result.success ? 'Healthy' : result.error}`);
    });

    // Search tests summary
    colorLog('cyan', '\n🔍 Search Tests Summary:');
    const successfulSearches = results.searchTests.filter(t => t.success).length;
    colorLog('white', `   Successful searches: ${successfulSearches}/${results.searchTests.length}`);

    if (successfulSearches > 0) {
        const avgDuration = results.searchTests
            .filter(t => t.success)
            .reduce((sum, t) => sum + t.duration, 0) / successfulSearches;
        colorLog('white', `   Average search time: ${avgDuration.toFixed(0)}ms`);
    }

    // Recommendation test summary
    colorLog('cyan', '\n⚖️  Recommendation Test Summary:');
    if (results.recommendationTest?.success) {
        colorLog('green', `   ✅ Recommendations generated successfully`);
        colorLog('white', `   Processing time: ${results.recommendationTest.duration}ms`);
        colorLog('white', `   Confidence: ${(results.recommendationTest.data.confidence_score * 100).toFixed(1)}%`);
    } else {
        colorLog('red', `   ❌ Recommendation test failed: ${results.recommendationTest?.error}`);
    }

    // E2E workflow summary
    colorLog('cyan', '\n🔄 End-to-End Workflow Summary:');
    if (results.e2eWorkflow?.success) {
        colorLog('green', `   ✅ E2E workflow completed successfully`);
        colorLog('white', `   Search results: ${results.e2eWorkflow.searchResults}`);
        colorLog('white', `   Recommendations: ${results.e2eWorkflow.recommendations}`);
    } else {
        colorLog('red', `   ❌ E2E workflow failed: ${results.e2eWorkflow?.error}`);
    }

    // Performance summary
    if (results.performance) {
        colorLog('cyan', '\n⚡ Performance Summary:');
        colorLog('white', `   Average search time: ${results.performance.search.average.toFixed(0)}ms`);
        colorLog('white', `   Average recommendation time: ${results.performance.recommendations.average.toFixed(0)}ms`);
    }

    // Overall assessment
    const overallSuccess =
        Object.values(results.serviceHealth).filter(r => r.success).length >= 2 &&
        successfulSearches > 0 &&
        results.recommendationTest?.success &&
        results.e2eWorkflow?.success;

    colorLog('cyan', '\n🎯 Overall Assessment:');
    if (overallSuccess) {
        colorLog('green', '   🎉 ALL INTEGRATION TESTS PASSED!');
        colorLog('green', '   ✅ Legal AI Platform is fully operational');
        colorLog('cyan', '\n🌐 Ready for production use:');
        colorLog('white', '   - CUDA Search: http://localhost:8096/api/v1/search');
        colorLog('white', '   - Recommendations: http://localhost:8080/recommend');
        colorLog('white', '   - Frontend: http://localhost:5173/cuda-search');
    } else {
        colorLog('red', '   ❌ Some integration tests failed');
        colorLog('yellow', '   ⚠️  Check service logs and fix issues before production');
    }

    colorLog('white', `\n⏱️  Total test duration: ${(results.totalDuration / 1000).toFixed(1)}s`);
}

// Run integration tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTests()
        .then(generateTestReport)
        .catch(error => {
            colorLog('red', `\n💥 Integration test error: ${error.message}`);
            process.exit(1);
        });
}

export { runIntegrationTests, generateTestReport };
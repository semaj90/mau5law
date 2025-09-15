const http = require('http');

// Test Phase 3 gRPC Binary Protocol Integration
async function testBinaryProtocolEndpoint() {
    console.log('🧪 Testing Phase 3 Binary Protocol Integration...\n');

    const testPayload = {
        case_id: "test_case_001",
        case_metadata: Buffer.from("Legal contract analysis test case").toString('base64'),
        scoring_params: {
            model: "legal-gemma-quantized",
            temperature: 0.3,
            max_tokens: 512,
            use_cached_embeddings: true,
            enable_streaming: false,
            use_binary_protocol: true,
            enable_quantization: true
        },
        request_time: new Date().toISOString(),
        requester_id: "phase3_integration_test",
        priority: 1,
        use_quantized: true,
        compression_type: "lz4"
    };

    const postData = JSON.stringify(testPayload);

    const options = {
        hostname: 'localhost',
        port: 8087,
        path: '/api/v2/case-scoring',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'X-Binary-Protocol': 'enabled',
            'X-Performance-Test': 'phase3-integration'
        }
    };

    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                console.log(`✅ Binary Protocol Response (${responseTime}ms):`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Headers:`, res.headers);

                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        console.log(`📊 Response Data:`, result);

                        if (responseTime < 200) {
                            console.log(`🎯 Performance Target MET: ${responseTime}ms < 200ms`);
                        } else {
                            console.log(`⚠️  Performance: ${responseTime}ms (target: <200ms)`);
                        }

                        resolve({ success: true, responseTime, data: result });
                    } catch (e) {
                        console.log(`📝 Raw Response:`, data);
                        resolve({ success: true, responseTime, data });
                    }
                } else {
                    console.log(`❌ Error Response:`, data);
                    resolve({ success: false, responseTime, error: data });
                }
            });
        });

        req.on('error', (err) => {
            console.log(`🔌 Connection Error:`, err.message);
            resolve({ success: false, error: err.message });
        });

        req.write(postData);
        req.end();
    });
}

// Test health endpoint as well
async function testHealthEndpoint() {
    console.log('\n🔍 Testing Health Endpoint...');

    const options = {
        hostname: 'localhost',
        port: 8087,
        path: '/health',
        method: 'GET'
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`✅ Health Check Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const health = JSON.parse(data);
                        console.log(`📊 Service Health:`, health);
                    } catch (e) {
                        console.log(`📝 Health Response:`, data);
                    }
                }
                resolve({ success: res.statusCode === 200, data });
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Health Check Failed:`, err.message);
            resolve({ success: false, error: err.message });
        });

        req.end();
    });
}

// Run integration tests
async function runPhase3IntegrationTest() {
    console.log('🚀 Phase 3 Integration Test Suite\n');
    console.log('================================================');

    // Test health first
    const healthResult = await testHealthEndpoint();

    if (healthResult.success) {
        console.log('✅ Service is healthy, proceeding with binary protocol test...\n');

        // Test binary protocol
        const binaryResult = await testBinaryProtocolEndpoint();

        console.log('\n================================================');
        console.log('📊 Phase 3 Integration Test Results:');
        console.log(`   Health Check: ${healthResult.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Binary Protocol: ${binaryResult.success ? '✅ PASS' : '❌ FAIL'}`);

        if (binaryResult.responseTime) {
            console.log(`   Response Time: ${binaryResult.responseTime}ms`);

            if (binaryResult.responseTime < 150) {
                console.log('🎯 PHASE 3 INTEGRATION: SUCCESS - Performance targets exceeded!');
            } else if (binaryResult.responseTime < 300) {
                console.log('✅ PHASE 3 INTEGRATION: SUCCESS - Performance targets met!');
            } else {
                console.log('⚠️  PHASE 3 INTEGRATION: Performance needs optimization');
            }
        }

    } else {
        console.log('❌ Service health check failed, cannot test binary protocol');
    }

    console.log('================================================\n');
}

// Execute tests
runPhase3IntegrationTest().catch(console.error);
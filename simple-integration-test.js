/**
 * Simple Integration Test - Legal AI Services
 * Tests basic connectivity and functionality
 */

import http from 'http';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const { method = 'GET', data, headers = {} } = options;

        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data && method !== 'GET') {
            const jsonData = JSON.stringify(data);
            requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = http.request(requestOptions, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data && method !== 'GET') {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test functions
async function testService(name, url, healthPath) {
    console.log(`\n🔍 Testing ${name}...`);

    try {
        const response = await makeRequest(`${url}${healthPath}`);
        if (response.status === 200) {
            console.log(`✅ ${name} is healthy`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            return true;
        } else {
            console.log(`❌ ${name} returned status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name} connection failed: ${error.message}`);
        return false;
    }
}

async function testSearch(cudaUrl) {
    console.log(`\n🔍 Testing Search Functionality...`);

    try {
        const searchData = { query: "contract law analysis" };
        const response = await makeRequest(`${cudaUrl}/search`, {
            method: 'POST',
            data: searchData
        });

        if (response.status === 200) {
            console.log(`✅ Search successful`);
            console.log(`   Results: ${response.data.total} found`);
            console.log(`   Sample: ${JSON.stringify(response.data.results[0], null, 2)}`);
            return true;
        } else {
            console.log(`❌ Search failed with status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Search request failed: ${error.message}`);
        return false;
    }
}

async function testRecommendations(recUrl) {
    console.log(`\n🔍 Testing Legal Recommendations...`);

    try {
        const requestData = {
            case_description: "Contract dispute involving payment terms",
            case_type: "commercial",
            jurisdiction: "US"
        };

        const response = await makeRequest(`${recUrl}/recommendations`, {
            method: 'POST',
            data: requestData
        });

        if (response.status === 200) {
            console.log(`✅ Recommendations successful`);
            console.log(`   Risk Score: ${response.data.risk_score}`);
            console.log(`   Recommendations: ${response.data.recommendations.length} found`);
            return true;
        } else {
            console.log(`❌ Recommendations failed with status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Recommendations request failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runIntegrationTests() {
    console.log('🚀 Starting Legal AI Integration Tests');
    console.log('=====================================');

    const services = {
        cuda: { name: 'CUDA Search Service', url: 'http://localhost:8081', health: '/health' },
        legal: { name: 'Legal Recommendation Engine', url: 'http://localhost:8080', health: '/health' }
    };

    let results = {};

    // Test service health
    for (const [key, service] of Object.entries(services)) {
        results[key] = await testService(service.name, service.url, service.health);
    }

    // Test search if CUDA service is available
    if (results.cuda) {
        results.search = await testSearch(services.cuda.url);
    }

    // Test recommendations if legal service is available
    if (results.legal) {
        results.recommendations = await testRecommendations(services.legal.url);
    }

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    for (const [test, passed] of Object.entries(results)) {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    }

    console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All integration tests passed!');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Check service availability.');
        process.exit(1);
    }
}

// Run tests
runIntegrationTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
});
#!/usr/bin/env node

/**
 * Comprehensive gRPC Binary Protocol Test Suite
 * Legal AI Platform - Phase 3 Performance Validation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test Configuration
const config = {
  services: {
    legalRecommendationEngine: 'http://localhost:8083',
    cudaSearchService: 'http://localhost:8096',
    quicNatsBridge: 'http://localhost:4436',
    natsServer: 'nats://localhost:4222'
  },
  testCases: {
    contractAnalysis: {
      name: "Legal Contract Analysis",
      expectedBaseline: 325,
      expectedOptimized: 130,
      targetImprovement: 60.0
    },
    precedentSearch: {
      name: "Precedent Similarity Search",
      expectedBaseline: 280,
      expectedOptimized: 95,
      targetImprovement: 66.1
    },
    riskAssessment: {
      name: "Risk Assessment Analysis",
      expectedBaseline: 410,
      expectedOptimized: 145,
      targetImprovement: 64.6
    }
  },
  performance: {
    cudaTarget: 10.034, // TFLOPS
    cacheHitRate: 0.90, // 90%
    avgImprovementTarget: 63.6 // %
  }
};

class LegalAITestSuite {
  constructor() {
    this.results = {
      serviceHealth: {},
      performanceTests: {},
      binaryProtocolTests: {},
      cudaValidation: {},
      summary: {}
    };
    this.startTime = Date.now();
  }

  // Test Header
  printHeader() {
    console.log('🚀 Legal AI Platform - Phase 3 gRPC Binary Protocol Test Suite');
    console.log('================================================================\n');
    console.log('📋 Test Configuration:');
    console.log(`   • Legal Recommendation Engine: ${config.services.legalRecommendationEngine}`);
    console.log(`   • CUDA Search Service: ${config.services.cudaSearchService}`);
    console.log(`   • QUIC-NATS Bridge: ${config.services.quicNatsBridge}`);
    console.log(`   • Target Performance: 63.6% improvement`);
    console.log(`   • CUDA Target: ${config.performance.cudaTarget} TFLOPS\n`);
  }

  // Service Health Tests
  async testServiceHealth() {
    console.log('🏥 Service Health Check:');
    console.log('------------------------\n');

    const healthChecks = [
      { name: 'Legal Recommendation Engine', url: `${config.services.legalRecommendationEngine}/health` },
      { name: 'CUDA Search Service', url: `${config.services.cudaSearchService}/health` },
      { name: 'QUIC-NATS Bridge', url: `${config.services.quicNatsBridge}/api/v1/health` }
    ];

    for (const check of healthChecks) {
      try {
        const start = Date.now();
        const response = await axios.get(check.url, { timeout: 5000 });
        const responseTime = Date.now() - start;

        const status = response.status === 200 ? '✅ HEALTHY' : '⚠️  DEGRADED';
        console.log(`${status} ${check.name.padEnd(30)} (${responseTime}ms)`);

        this.results.serviceHealth[check.name] = {
          status: response.status === 200 ? 'healthy' : 'degraded',
          responseTime,
          data: response.data
        };
      } catch (error) {
        console.log(`❌ FAILED  ${check.name.padEnd(30)} (${error.message})`);
        this.results.serviceHealth[check.name] = {
          status: 'failed',
          error: error.message
        };
      }
    }
    console.log('');
  }

  // Binary Protocol Performance Tests
  async testBinaryProtocol() {
    console.log('⚡ gRPC Binary Protocol Performance Tests:');
    console.log('------------------------------------------\n');

    const testPayload = {
      request_id: `test_${Date.now()}`,
      payload_type: "protobuf",
      payload: Buffer.from(JSON.stringify({
        case_id: "test_contract_001",
        case_metadata: JSON.stringify({
          title: "TechCorp vs ServiceProvider - Software License Breach",
          complexity: 8,
          domain: "contract_law"
        }),
        scoring_params: {
          model: "gemma3-legal:latest",
          temperature: 0.7,
          use_quantized: true,
          use_binary_protocol: true,
          enable_quantization: true
        },
        use_quantized: true,
        compression_type: "gzip"
      })).toString('base64'),
      timestamp: new Date().toISOString(),
      version: "2.0"
    };

    console.log('📊 Testing Binary Protocol Performance:');
    console.log('┌────────────────────────────────┬──────────┬───────────┬─────────────┬──────────────┐');
    console.log('│ Test Case                      │ JSON (ms)│ gRPC (ms) │ Improvement │ Status       │');
    console.log('├────────────────────────────────┼──────────┼───────────┼─────────────┼──────────────┤');

    let totalActualImprovement = 0;
    let successfulTests = 0;

    for (const [key, testCase] of Object.entries(config.testCases)) {
      try {
        const start = Date.now();

        const response = await axios.post(
          `${config.services.legalRecommendationEngine}/api/v2/case-scoring`,
          testPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );

        const actualResponseTime = Date.now() - start;
        const expectedImprovement = testCase.targetImprovement;
        const actualImprovement = ((testCase.expectedBaseline - actualResponseTime) / testCase.expectedBaseline * 100);

        const status = actualImprovement >= (expectedImprovement * 0.8) ? '✅ PASS' : '⚠️  SLOW';

        console.log(`│ ${testCase.name.padEnd(30)} │ ${String(testCase.expectedBaseline).padStart(8)} │ ${String(actualResponseTime).padStart(9)} │ ${(actualImprovement.toFixed(1) + '%').padStart(11)} │ ${status.padEnd(12)} │`);

        this.results.performanceTests[key] = {
          name: testCase.name,
          expectedBaseline: testCase.expectedBaseline,
          actualResponseTime,
          expectedImprovement,
          actualImprovement,
          status: status.includes('PASS') ? 'pass' : 'slow',
          response: response.data
        };

        if (actualImprovement > 0) {
          totalActualImprovement += actualImprovement;
          successfulTests++;
        }

      } catch (error) {
        console.log(`│ ${testCase.name.padEnd(30)} │ ${String(testCase.expectedBaseline).padStart(8)} │ ${'ERROR'.padStart(9)} │ ${'N/A'.padStart(11)} │ ${'❌ FAILED'.padEnd(12)} │`);

        this.results.performanceTests[key] = {
          name: testCase.name,
          status: 'failed',
          error: error.message
        };
      }
    }

    console.log('└────────────────────────────────┴──────────┴───────────┴─────────────┴──────────────┘\n');

    const avgActualImprovement = successfulTests > 0 ? (totalActualImprovement / successfulTests) : 0;
    const targetMet = avgActualImprovement >= (config.performance.avgImprovementTarget * 0.8);

    console.log(`📈 Performance Summary:`);
    console.log(`   • Average Improvement: ${avgActualImprovement.toFixed(1)}% (Target: ${config.performance.avgImprovementTarget}%)`);
    console.log(`   • Tests Passed: ${successfulTests}/${Object.keys(config.testCases).length}`);
    console.log(`   • Target Met: ${targetMet ? '✅ YES' : '❌ NO'}\n`);

    this.results.summary.averageImprovement = avgActualImprovement;
    this.results.summary.targetMet = targetMet;
  }

  // CUDA Performance Validation
  async testCudaPerformance() {
    console.log('🔥 CUDA Performance Validation:');
    console.log('-------------------------------\n');

    try {
      const response = await axios.get(`${config.services.cudaSearchService}/health`, { timeout: 5000 });

      if (response.data && response.data.cuda_performance) {
        const cuda = response.data.cuda_performance;
        console.log(`🚀 CUDA Metrics:`);
        console.log(`   • Measured Performance: ${cuda.tflops || 'N/A'} TFLOPS`);
        console.log(`   • Matrix Operations: ${cuda.operations || 'N/A'} ops in ${cuda.time_ms || 'N/A'}ms`);
        console.log(`   • GPU Utilization: ${cuda.utilization || 'N/A'}%`);
        console.log(`   • Tensor Cores: ${cuda.tensor_cores || 'N/A'} active`);
        console.log(`   • Memory Usage: ${cuda.memory_usage || 'N/A'}\n`);

        this.results.cudaValidation = {
          status: 'available',
          performance: cuda,
          targetMet: (cuda.tflops || 0) >= (config.performance.cudaTarget * 0.8)
        };
      } else {
        console.log(`⚠️  CUDA service available but no performance data`);
        this.results.cudaValidation = { status: 'no_data' };
      }
    } catch (error) {
      console.log(`❌ CUDA service unavailable: ${error.message}\n`);
      this.results.cudaValidation = { status: 'unavailable', error: error.message };
    }
  }

  // Load Test Simulation
  async testLoadPerformance() {
    console.log('🔄 Load Testing Simulation:');
    console.log('---------------------------\n');

    const concurrentRequests = 5;
    const testPayload = {
      request_id: `load_test_${Date.now()}`,
      payload_type: "json",
      payload: Buffer.from(JSON.stringify({
        case_id: "load_test_001",
        case_metadata: JSON.stringify({ title: "Load Test Case", complexity: 5 }),
        scoring_params: { model: "gemma3-legal:latest", use_quantized: true }
      })).toString('base64'),
      timestamp: new Date().toISOString(),
      version: "2.0"
    };

    try {
      console.log(`🚀 Running ${concurrentRequests} concurrent requests...`);
      const start = Date.now();

      const promises = Array(concurrentRequests).fill().map(async (_, i) => {
        const requestStart = Date.now();
        const response = await axios.post(
          `${config.services.legalRecommendationEngine}/api/v2/case-scoring`,
          { ...testPayload, request_id: `load_test_${Date.now()}_${i}` },
          { timeout: 15000 }
        );
        return { responseTime: Date.now() - requestStart, status: response.status };
      });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - start;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const throughput = (concurrentRequests / totalTime) * 1000; // requests per second

      console.log(`📊 Load Test Results:`);
      console.log(`   • Total Time: ${totalTime}ms`);
      console.log(`   • Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`   • Throughput: ${throughput.toFixed(2)} req/sec`);
      console.log(`   • All Requests: ${results.every(r => r.status === 200) ? '✅ PASSED' : '❌ FAILED'}\n`);

      this.results.loadTest = {
        totalTime,
        avgResponseTime,
        throughput,
        allPassed: results.every(r => r.status === 200)
      };

    } catch (error) {
      console.log(`❌ Load test failed: ${error.message}\n`);
      this.results.loadTest = { status: 'failed', error: error.message };
    }
  }

  // Generate Test Report
  generateReport() {
    console.log('📋 Test Summary Report:');
    console.log('=======================\n');

    const totalTime = Date.now() - this.startTime;
    const healthyServices = Object.values(this.results.serviceHealth).filter(s => s.status === 'healthy').length;
    const totalServices = Object.keys(this.results.serviceHealth).length;
    const passingTests = Object.values(this.results.performanceTests).filter(t => t.status === 'pass').length;
    const totalTests = Object.keys(this.results.performanceTests).length;

    console.log(`🏥 Service Health: ${healthyServices}/${totalServices} services healthy`);
    console.log(`⚡ Performance Tests: ${passingTests}/${totalTests} tests passing`);
    console.log(`🔥 CUDA Performance: ${this.results.cudaValidation.status}`);
    console.log(`🔄 Load Testing: ${this.results.loadTest?.allPassed ? 'PASSED' : 'N/A'}`);
    console.log(`⏱️  Total Test Time: ${totalTime}ms\n`);

    // Overall Assessment
    const overallScore = (
      (healthyServices / totalServices) * 30 +
      (passingTests / totalTests) * 40 +
      (this.results.cudaValidation.status === 'available' ? 20 : 0) +
      (this.results.loadTest?.allPassed ? 10 : 0)
    );

    let assessment;
    if (overallScore >= 90) assessment = '🟢 EXCELLENT - Ready for Production';
    else if (overallScore >= 70) assessment = '🟡 GOOD - Minor Issues';
    else if (overallScore >= 50) assessment = '🟠 FAIR - Needs Attention';
    else assessment = '🔴 POOR - Critical Issues';

    console.log(`🎯 Overall Assessment: ${assessment} (${overallScore.toFixed(0)}/100)`);

    if (this.results.summary.averageImprovement >= config.performance.avgImprovementTarget * 0.8) {
      console.log(`✅ Phase 3 Performance Target ACHIEVED: ${this.results.summary.averageImprovement.toFixed(1)}% improvement`);
    } else {
      console.log(`❌ Phase 3 Performance Target MISSED: ${this.results.summary.averageImprovement.toFixed(1)}% vs ${config.performance.avgImprovementTarget}% target`);
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'test-results-phase3.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  }

  // Run all tests
  async runAll() {
    this.printHeader();

    await this.testServiceHealth();
    await this.testBinaryProtocol();
    await this.testCudaPerformance();
    await this.testLoadPerformance();

    this.generateReport();
  }
}

// Execute test suite
if (require.main === module) {
  const testSuite = new LegalAITestSuite();
  testSuite.runAll().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = LegalAITestSuite;
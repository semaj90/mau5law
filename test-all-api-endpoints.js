#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Tests all discovered API endpoints from the Legal AI Platform
 * Uses k-means clustering data to organize tests by service
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiBaseUrl: 'http://localhost:8095',
  timeout: 10000, // 10 seconds
  retries: 3,
  parallel: 5, // Test 5 endpoints simultaneously
  outputFile: 'api-test-results.json',
  logFile: 'api-test-log.txt'
};

// API Service Clusters (from our k-means analysis)
const API_CLUSTERS = {
  'authentication': {
    icon: '🔐',
    endpoints: [],
    priority: 'high'
  },
  'legal-services': {
    icon: '⚖️',
    endpoints: [],
    priority: 'critical'
  },
  'ai-services': {
    icon: '🧠',
    endpoints: [],
    priority: 'high'
  },
  'search-services': {
    icon: '🔍',
    endpoints: [],
    priority: 'critical'
  },
  'file-services': {
    icon: '📁',
    endpoints: [],
    priority: 'medium'
  },
  'monitoring': {
    icon: '📊',
    endpoints: [],
    priority: 'high'
  },
  'testing': {
    icon: '🧪',
    endpoints: [],
    priority: 'low'
  },
  'infrastructure': {
    icon: '🏗️',
    endpoints: [],
    priority: 'medium'
  },
  'gpu-services': {
    icon: '🖥️',
    endpoints: [],
    priority: 'high'
  },
  'other': {
    icon: '🔌',
    endpoints: [],
    priority: 'medium'
  }
};

// Known API endpoints to test (expandable list)
const KNOWN_ENDPOINTS = [
  // Legal AI Core Services
  { path: '/api/v1/health', method: 'GET', service: 'monitoring', expected: 200 },
  { path: '/api/v1/search', method: 'GET', service: 'search-services', expected: 200, params: '?q=test&limit=5' },
  { path: '/api/v1/legal/cases', method: 'GET', service: 'legal-services', expected: 200 },
  { path: '/api/v1/evidence/upload', method: 'POST', service: 'file-services', expected: [200, 405] },
  { path: '/api/v1/ai/chat', method: 'POST', service: 'ai-services', expected: [200, 405] },
  { path: '/api/v1/embeddings/generate', method: 'POST', service: 'ai-services', expected: [200, 405] },
  { path: '/api/v1/gpu/status', method: 'GET', service: 'gpu-services', expected: 200 },

  // CUDA Services
  { path: '/api/v1/cuda/metrics', method: 'GET', service: 'gpu-services', expected: 200 },

  // Authentication
  { path: '/api/auth/status', method: 'GET', service: 'authentication', expected: 200 },
  { path: '/api/v1/auth/validate', method: 'GET', service: 'authentication', expected: [200, 401] },

  // Infrastructure
  { path: '/api/cache/status', method: 'GET', service: 'infrastructure', expected: 200 },
  { path: '/api/database/health', method: 'GET', service: 'infrastructure', expected: 200 },

  // Testing endpoints
  { path: '/api/test/ping', method: 'GET', service: 'testing', expected: 200 },
  { path: '/api/v1/test/health', method: 'GET', service: 'testing', expected: 200 },

  // Vector services
  { path: '/api/vector/health', method: 'GET', service: 'search-services', expected: 200 },
  { path: '/api/v1/vector/search', method: 'POST', service: 'search-services', expected: [200, 405] },
];

class APITester {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      byService: {},
      startTime: new Date(),
      endTime: null
    };
    this.logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'w' });

    // Populate clusters with known endpoints
    this.populateClusters();
  }

  populateClusters() {
    KNOWN_ENDPOINTS.forEach(endpoint => {
      if (API_CLUSTERS[endpoint.service]) {
        API_CLUSTERS[endpoint.service].endpoints.push(endpoint);
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    this.logStream.write(logMessage + '\n');
  }

  async testEndpoint(endpoint) {
    const url = `${CONFIG.apiBaseUrl}${endpoint.path}${endpoint.params || ''}`;
    const testResult = {
      ...endpoint,
      url,
      status: null,
      responseTime: null,
      error: null,
      timestamp: new Date().toISOString(),
      passed: false
    };

    try {
      this.log(`Testing ${endpoint.method} ${url}`, 'INFO');

      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

      const options = {
        method: endpoint.method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Tester/1.0'
        }
      };

      // Add test payload for POST requests
      if (endpoint.method === 'POST') {
        if (endpoint.service === 'ai-services' && endpoint.path.includes('chat')) {
          options.body = JSON.stringify({
            messages: [{ role: 'user', content: 'test message' }]
          });
        } else if (endpoint.service === 'ai-services' && endpoint.path.includes('embedding')) {
          options.body = JSON.stringify({
            text: 'test document for embedding',
            model: 'embeddinggemma:latest'
          });
        } else if (endpoint.service === 'search-services') {
          options.body = JSON.stringify({
            query: 'test search',
            limit: 5
          });
        } else if (endpoint.service === 'file-services') {
          options.body = JSON.stringify({
            filename: 'test.txt',
            content: 'test file content'
          });
        } else {
          options.body = JSON.stringify({ test: true });
        }
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      testResult.status = response.status;
      testResult.responseTime = Date.now() - startTime;

      // Check if status is expected
      const expectedStatuses = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
      testResult.passed = expectedStatuses.includes(response.status);

      if (testResult.passed) {
        this.log(`✅ ${endpoint.method} ${endpoint.path} - ${response.status} (${testResult.responseTime}ms)`, 'PASS');
      } else {
        this.log(`❌ ${endpoint.method} ${endpoint.path} - Expected ${endpoint.expected}, got ${response.status}`, 'FAIL');
      }

    } catch (error) {
      testResult.error = error.message;
      testResult.responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        this.log(`⏱️ ${endpoint.method} ${endpoint.path} - Timeout after ${CONFIG.timeout}ms`, 'TIMEOUT');
      } else {
        this.log(`💥 ${endpoint.method} ${endpoint.path} - Error: ${error.message}`, 'ERROR');
      }
    }

    return testResult;
  }

  async testServiceCluster(serviceName, cluster) {
    this.log(`\n🔍 Testing ${serviceName} service (${cluster.endpoints.length} endpoints)`, 'SERVICE');

    const serviceResults = [];

    // Test endpoints in batches for this service
    for (let i = 0; i < cluster.endpoints.length; i += CONFIG.parallel) {
      const batch = cluster.endpoints.slice(i, i + CONFIG.parallel);
      const batchPromises = batch.map(endpoint => this.testEndpoint(endpoint));
      const batchResults = await Promise.all(batchPromises);
      serviceResults.push(...batchResults);
    }

    // Update service summary
    const passed = serviceResults.filter(r => r.passed).length;
    const failed = serviceResults.filter(r => !r.passed && r.status !== null).length;
    const errors = serviceResults.filter(r => r.error !== null).length;

    this.summary.byService[serviceName] = {
      total: serviceResults.length,
      passed,
      failed,
      errors,
      icon: cluster.icon,
      priority: cluster.priority
    };

    this.log(`${cluster.icon} ${serviceName}: ${passed}/${serviceResults.length} passed`, 'SUMMARY');

    return serviceResults;
  }

  async runAllTests() {
    this.log('🚀 Starting API endpoint testing...', 'START');
    this.log(`Testing ${KNOWN_ENDPOINTS.length} endpoints across ${Object.keys(API_CLUSTERS).length} services`, 'INFO');

    // Test services by priority
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const servicesByPriority = {};

    // Group services by priority
    Object.entries(API_CLUSTERS).forEach(([name, cluster]) => {
      if (cluster.endpoints.length > 0) {
        if (!servicesByPriority[cluster.priority]) {
          servicesByPriority[cluster.priority] = [];
        }
        servicesByPriority[cluster.priority].push([name, cluster]);
      }
    });

    // Test in priority order
    for (const priority of priorityOrder) {
      if (servicesByPriority[priority]) {
        this.log(`\n📋 Testing ${priority.toUpperCase()} priority services`, 'PRIORITY');

        for (const [serviceName, cluster] of servicesByPriority[priority]) {
          const serviceResults = await this.testServiceCluster(serviceName, cluster);
          this.results.push(...serviceResults);
        }
      }
    }

    this.summary.endTime = new Date();
    this.summary.total = this.results.length;
    this.summary.passed = this.results.filter(r => r.passed).length;
    this.summary.failed = this.results.filter(r => !r.passed && r.status !== null).length;
    this.summary.errors = this.results.filter(r => r.error !== null).length;

    await this.generateReport();
  }

  async generateReport() {
    this.log('\n📊 Generating test report...', 'REPORT');

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('🧪 API ENDPOINT TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Endpoints: ${this.summary.total}`);
    console.log(`✅ Passed: ${this.summary.passed}`);
    console.log(`❌ Failed: ${this.summary.failed}`);
    console.log(`💥 Errors: ${this.summary.errors}`);
    console.log(`📈 Success Rate: ${((this.summary.passed / this.summary.total) * 100).toFixed(1)}%`);
    console.log(`⏱️ Test Duration: ${(this.summary.endTime - this.summary.startTime) / 1000}s`);

    // Service breakdown
    console.log('\n📋 Service Breakdown:');
    Object.entries(this.summary.byService).forEach(([service, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`${stats.icon} ${service}: ${stats.passed}/${stats.total} (${successRate}%) - Priority: ${stats.priority}`);
    });

    // Detailed JSON report
    const report = {
      summary: this.summary,
      results: this.results,
      clusters: API_CLUSTERS,
      config: CONFIG,
      generated: new Date().toISOString()
    };

    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
    this.log(`📄 Detailed report saved to ${CONFIG.outputFile}`, 'REPORT');

    // Failed endpoints
    const failedEndpoints = this.results.filter(r => !r.passed);
    if (failedEndpoints.length > 0) {
      console.log('\n❌ Failed Endpoints:');
      failedEndpoints.forEach(endpoint => {
        console.log(`  ${endpoint.method} ${endpoint.path} - Status: ${endpoint.status || 'ERROR'} - ${endpoint.error || 'Unexpected status'}`);
      });
    }

    this.logStream.end();

    return report;
  }
}

// CLI execution
async function main() {
  console.log('🧪 Legal AI Platform - API Endpoint Tester');
  console.log('Testing all discovered API endpoints...\n');

  const tester = new APITester();

  try {
    await tester.runAllTests();

    // Exit with error code if tests failed
    const hasFailures = tester.summary.failed > 0 || tester.summary.errors > 0;
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  }
}

// Export for use as module
export { APITester, API_CLUSTERS, KNOWN_ENDPOINTS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
#!/usr/bin/env node
/**
 * Memory Optimization Validation Script
 * Tests and validates the comprehensive memory optimization system
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class MemoryOptimizationValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0,
        score: 0
      }
    };
  }

  async validate() {
    console.log('🧠 Starting Memory Optimization Validation...\n');

    await this.validateFileStructure();
    await this.validateOptimizationComponents();
    await this.validateDockerConfiguration();
    await this.validateAPIEndpoints();
    await this.validatePerformanceMetrics();
    await this.generateReport();

    return this.results;
  }

  async validateFileStructure() {
    console.log('📁 Validating file structure...');
    
    const requiredFiles = [
      'src/lib/optimization/index.ts',
      'src/lib/optimization/neural-memory-manager.ts',
      'src/lib/optimization/comprehensive-orchestrator.ts',
      'src/lib/optimization/advanced-memory-optimizer.ts',
      'src/lib/optimization/json-wasm-optimizer.ts',
      'src/lib/optimization/ultra-json-processor.ts'
    ];

    const requiredDirs = [
      'src/lib/optimization',
      'src/lib/services',
      'src/routes/api'
    ];

    // Check required files
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        this.addResult('file_check', file, 'exists', 'pass');
      } catch (error) {
        this.addResult('file_check', file, 'missing', 'fail');
      }
    }

    // Check required directories
    for (const dir of requiredDirs) {
      try {
        const stat = await fs.stat(dir);
        if (stat.isDirectory()) {
          this.addResult('dir_check', dir, 'exists', 'pass');
        }
      } catch (error) {
        this.addResult('dir_check', dir, 'missing', 'fail');
      }
    }
  }

  async validateOptimizationComponents() {
    console.log('🔧 Validating optimization components...');

    // Test TypeScript compilation
    try {
      const { stdout, stderr } = await execAsync('npm run check 2>&1');
      if (stderr && stderr.includes('error')) {
        this.addResult('typescript', 'compilation', 'errors found', 'fail');
      } else {
        this.addResult('typescript', 'compilation', 'clean', 'pass');
      }
    } catch (error) {
      this.addResult('typescript', 'compilation', 'failed', 'fail');
    }

    // Test imports
    try {
      const indexContent = await fs.readFile('src/lib/optimization/index.ts', 'utf-8');
      const hasNeuralManager = indexContent.includes('NeuralMemoryManager');
      const hasOrchestrator = indexContent.includes('ComprehensiveOptimizationOrchestrator');
      const hasJSONProcessor = indexContent.includes('UltraHighPerformanceJSONProcessor');

      this.addResult('imports', 'NeuralMemoryManager', hasNeuralManager ? 'exported' : 'missing', hasNeuralManager ? 'pass' : 'fail');
      this.addResult('imports', 'ComprehensiveOptimizationOrchestrator', hasOrchestrator ? 'exported' : 'missing', hasOrchestrator ? 'pass' : 'fail');
      this.addResult('imports', 'UltraHighPerformanceJSONProcessor', hasJSONProcessor ? 'exported' : 'missing', hasJSONProcessor ? 'pass' : 'fail');
    } catch (error) {
      this.addResult('imports', 'optimization_index', 'read error', 'fail');
    }

    // Test optimization suite factory
    try {
      const indexContent = await fs.readFile('src/lib/optimization/index.ts', 'utf-8');
      const hasFactory = indexContent.includes('createOptimizationSuite');
      const hasMonitor = indexContent.includes('PerformanceMonitor');
      const hasQuickOps = indexContent.includes('quickOptimization');

      this.addResult('factory', 'createOptimizationSuite', hasFactory ? 'available' : 'missing', hasFactory ? 'pass' : 'fail');
      this.addResult('factory', 'PerformanceMonitor', hasMonitor ? 'available' : 'missing', hasMonitor ? 'pass' : 'fail');
      this.addResult('factory', 'quickOptimization', hasQuickOps ? 'available' : 'missing', hasQuickOps ? 'pass' : 'fail');
    } catch (error) {
      this.addResult('factory', 'optimization_factory', 'read error', 'fail');
    }
  }

  async validateDockerConfiguration() {
    console.log('🐳 Validating Docker configuration...');

    // Check if memory-optimized docker-compose exists
    try {
      await fs.access('../docker-compose.memory-optimized.yml');
      this.addResult('docker', 'memory-optimized-compose', 'exists', 'pass');
    } catch (error) {
      this.addResult('docker', 'memory-optimized-compose', 'missing', 'fail');
    }

    // Check Docker containers status
    try {
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Status}}" 2>/dev/null || echo "No containers"');
      
      const expectedContainers = [
        'legal-ai-postgres-optimized',
        'legal-ai-redis-optimized',
        'legal-ai-qdrant-optimized',
        'legal-ai-ollama-optimized',
        'legal-ai-neo4j-optimized'
      ];

      expectedContainers.forEach(containerName => {
        const isRunning = stdout.includes(containerName) && stdout.includes('Up');
        this.addResult('docker_containers', containerName, isRunning ? 'running' : 'not running', isRunning ? 'pass' : 'warning');
      });
    } catch (error) {
      this.addResult('docker', 'container_status', 'check failed', 'warning');
    }

    // Check memory limits
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\\t{{.MemUsage}}" 2>/dev/null || echo "No stats"');
      
      if (stdout.includes('legal-ai')) {
        this.addResult('docker', 'memory_stats', 'available', 'pass');
      } else {
        this.addResult('docker', 'memory_stats', 'unavailable', 'warning');
      }
    } catch (error) {
      this.addResult('docker', 'memory_stats', 'check failed', 'warning');
    }
  }

  async validateAPIEndpoints() {
    console.log('🌐 Validating API endpoints...');

    // Check if API routes exist
    const apiRoutes = [
      'src/routes/api/memory/neural/+server.ts',
      'src/routes/api/health/+server.ts'
    ];

    for (const route of apiRoutes) {
      try {
        await fs.access(route);
        this.addResult('api_routes', route, 'exists', 'pass');
      } catch (error) {
        this.addResult('api_routes', route, 'missing', 'warning');
      }
    }

    // Test development server availability (if running)
    try {
      const testUrls = [
        'http://localhost:5173/health',
        'http://localhost:5174/health'
      ];

      for (const url of testUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            this.addResult('dev_server', url, 'responding', 'pass');
            break;
          }
        } catch (error) {
          this.addResult('dev_server', url, 'not responding', 'warning');
        }
      }
    } catch (error) {
      this.addResult('dev_server', 'health_check', 'unavailable', 'warning');
    }
  }

  async validatePerformanceMetrics() {
    console.log('📊 Validating performance metrics...');

    // Check if monitoring components exist
    const monitoringFiles = [
      'src/lib/services/memory-monitoring.service.ts',
      'src/lib/services/cache-layer-manager.ts',
      'src/lib/components/MemoryMonitor.svelte'
    ];

    for (const file of monitoringFiles) {
      try {
        await fs.access(file);
        this.addResult('monitoring', file, 'exists', 'pass');
      } catch (error) {
        this.addResult('monitoring', file, 'missing', 'warning');
      }
    }

    // Check optimization test files
    const testFiles = [
      'src/lib/tests/memory-optimization.test.ts',
      'validate-memory-optimization.mjs'
    ];

    for (const file of testFiles) {
      try {
        await fs.access(file);
        this.addResult('testing', file, 'exists', 'pass');
      } catch (error) {
        this.addResult('testing', file, 'missing', 'warning');
      }
    }

    // Validate package.json has required dependencies
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps = ['vitest', '@testing-library/svelte'];
      requiredDeps.forEach(dep => {
        const exists = deps[dep] !== undefined;
        this.addResult('dependencies', dep, exists ? 'installed' : 'missing', exists ? 'pass' : 'warning');
      });
    } catch (error) {
      this.addResult('dependencies', 'package.json', 'read error', 'fail');
    }
  }

  async generateReport() {
    console.log('\n📋 Generating validation report...\n');

    // Calculate summary
    this.results.tests.forEach(test => {
      switch (test.status) {
        case 'pass':
          this.results.summary.passed++;
          break;
        case 'fail':
          this.results.summary.failed++;
          break;
        case 'warning':
          this.results.summary.warnings++;
          break;
      }
    });

    const total = this.results.summary.passed + this.results.summary.failed + this.results.summary.warnings;
    this.results.summary.score = total > 0 ? Math.round((this.results.summary.passed / total) * 100) : 0;

    // Print summary
    console.log('='.repeat(60));
    console.log('MEMORY OPTIMIZATION VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    console.log(`📊 Score: ${this.results.summary.score}%`);
    console.log('='.repeat(60));

    // Print detailed results
    const categories = [...new Set(this.results.tests.map(t => t.category))];
    
    categories.forEach(category => {
      const categoryTests = this.results.tests.filter(t => t.category === category);
      const categoryPassed = categoryTests.filter(t => t.status === 'pass').length;
      const categoryTotal = categoryTests.length;
      
      console.log(`\n📂 ${category.toUpperCase()} (${categoryPassed}/${categoryTotal})`);
      console.log('-'.repeat(40));
      
      categoryTests.forEach(test => {
        const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${test.test}: ${test.message}`);
      });
    });

    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('-'.repeat(40));

    if (this.results.summary.failed > 0) {
      console.log('❌ Critical issues found - fix failed tests before deployment');
    }

    if (this.results.summary.warnings > 0) {
      console.log('⚠️  Some components missing - consider implementing for full functionality');
    }

    if (this.results.summary.score >= 80) {
      console.log('✅ System ready for memory optimization deployment!');
    } else if (this.results.summary.score >= 60) {
      console.log('🔧 System partially ready - address critical issues');
    } else {
      console.log('🚨 System not ready - significant setup required');
    }

    // Next steps
    console.log('\n🚀 NEXT STEPS');
    console.log('-'.repeat(40));
    
    if (this.results.summary.score >= 80) {
      console.log('1. Run: npm run dev');
      console.log('2. Navigate to: http://localhost:5173/memory-dashboard');
      console.log('3. Start Docker: docker-compose -f docker-compose.memory-optimized.yml up -d');
      console.log('4. Monitor performance and optimize as needed');
    } else {
      console.log('1. Fix failed tests (❌)');
      console.log('2. Address missing components (⚠️)');
      console.log('3. Re-run validation: node validate-memory-optimization.mjs');
      console.log('4. Deploy once score > 80%');
    }

    // Save detailed report
    await this.saveReport();
  }

  async saveReport() {
    const reportPath = `memory-optimization-validation-${Date.now()}.json`;
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n💾 Detailed report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not save report: ${error.message}`);
    }
  }

  addResult(category, test, message, status) {
    this.results.tests.push({
      category,
      test,
      message,
      status, // 'pass', 'fail', 'warning'
      timestamp: new Date().toISOString()
    });
  }
}

// Performance benchmarking
class PerformanceBenchmark {
  static async runQuickBenchmark() {
    console.log('\n⚡ Running quick performance benchmark...\n');

    const results = {
      memoryBaseline: process.memoryUsage(),
      startTime: performance.now(),
      operations: []
    };

    // Test JSON processing
    const jsonTestData = { test: 'data', array: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() })) };
    
    const jsonStart = performance.now();
    const jsonString = JSON.stringify(jsonTestData);
    const jsonParsed = JSON.parse(jsonString);
    const jsonEnd = performance.now();
    
    results.operations.push({
      name: 'JSON Processing',
      time: jsonEnd - jsonStart,
      size: jsonString.length,
      throughput: (jsonString.length / 1024 / 1024) / ((jsonEnd - jsonStart) / 1000) // MB/s
    });

    // Test memory allocation
    const memoryStart = performance.now();
    const testArrays = [];
    for (let i = 0; i < 100; i++) {
      testArrays.push(new Array(10000).fill(Math.random()));
    }
    const memoryEnd = performance.now();
    
    results.operations.push({
      name: 'Memory Allocation',
      time: memoryEnd - memoryStart,
      operations: 100,
      throughput: 100 / ((memoryEnd - memoryStart) / 1000) // ops/s
    });

    // Test clustering simulation
    const clusterStart = performance.now();
    const points = Array.from({ length: 1000 }, () => 
      Array.from({ length: 10 }, () => Math.random())
    );
    
    // Simple clustering simulation
    const clusters = [];
    for (let i = 0; i < 5; i++) {
      clusters.push({
        centroid: Array.from({ length: 10 }, () => Math.random()),
        points: points.slice(i * 200, (i + 1) * 200)
      });
    }
    const clusterEnd = performance.now();
    
    results.operations.push({
      name: 'Clustering Simulation',
      time: clusterEnd - clusterStart,
      points: 1000,
      clusters: 5,
      throughput: 1000 / ((clusterEnd - clusterStart) / 1000) // points/s
    });

    results.totalTime = performance.now() - results.startTime;
    results.memoryAfter = process.memoryUsage();
    results.memoryDelta = {
      heapUsed: results.memoryAfter.heapUsed - results.memoryBaseline.heapUsed,
      heapTotal: results.memoryAfter.heapTotal - results.memoryBaseline.heapTotal,
      external: results.memoryAfter.external - results.memoryBaseline.external
    };

    // Print results
    console.log('📊 PERFORMANCE BENCHMARK RESULTS');
    console.log('-'.repeat(50));
    
    results.operations.forEach(op => {
      console.log(`${op.name}:`);
      console.log(`  Time: ${op.time.toFixed(2)}ms`);
      if (op.throughput) {
        const unit = op.name.includes('JSON') ? 'MB/s' : op.name.includes('Memory') ? 'ops/s' : 'points/s';
        console.log(`  Throughput: ${op.throughput.toFixed(2)} ${unit}`);
      }
      console.log('');
    });

    console.log(`Total Time: ${results.totalTime.toFixed(2)}ms`);
    console.log(`Memory Delta: ${(results.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    
    return results;
  }
}

// Main execution
async function main() {
  const validator = new MemoryOptimizationValidator();
  
  try {
    // Run validation
    const validationResults = await validator.validate();
    
    // Run benchmark if validation passes
    if (validationResults.summary.score >= 60) {
      await PerformanceBenchmark.runQuickBenchmark();
    }
    
    // Exit with appropriate code
    const exitCode = validationResults.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Memory Optimization Validation Script

Usage:
  node validate-memory-optimization.mjs [options]

Options:
  --help, -h     Show this help message
  --benchmark    Run only performance benchmark
  --quiet        Suppress detailed output

Examples:
  node validate-memory-optimization.mjs
  node validate-memory-optimization.mjs --benchmark
`);
  process.exit(0);
}

if (process.argv.includes('--benchmark')) {
  PerformanceBenchmark.runQuickBenchmark().then(() => process.exit(0));
} else {
  main();
}
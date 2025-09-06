#!/usr/bin/env zx

/**
 * Context7 MCP Enhanced TypeScript Checking with Google zx
 * Integrates with PM2, concurrently, and Go SIMD parser
 * Uses zx for elegant shell scripting and better process management
 */

import 'zx/globals'

// Configure zx
$.verbose = true
$.shell = 'powershell'

const CONFIG = {
  memory: '--max-old-space-size=6144',
  timeout: {
    ultraFast: 30000,
    fast: 120000,
    standard: 180000,
    goSIMD: 60000
  },
  goSIMD: {
    host: 'localhost',
    port: 8081,
    endpoints: {
      health: '/health',
      parse: '/simd/parse',
      status: '/simd/status'
    }
  },
  output: {
    json: 'typecheck-report-zx.json',
    txt: 'typecheck-report-zx.txt',
    pm2Logs: 'pm2-typecheck.log'
  }
};

// Enhanced report structure
let unifiedReport = {
  timestamp: new Date().toISOString(),
  toolchain: {
    zx: true,
    pm2: false,
    concurrently: true,
    goSIMD: false
  },
  summary: {
    totalMethods: 4, // Added Go SIMD method
    completedMethods: 0,
    totalDuration: 0,
    totalErrors: 0,
    overallStatus: 'pending'
  },
  methods: {
    ultraFast: { status: 'pending', duration: 0, errors: [] },
    contextFast: { status: 'pending', duration: 0, errors: [] },
    standardIncremental: { status: 'pending', duration: 0, errors: [] },
    goSIMD: { status: 'pending', duration: 0, errors: [] }
  },
  processManagement: {
    pm2Processes: [],
    concurrentlyJobs: [],
    goSIMDConnection: null
  },
  recommendations: []
};

// Color output helpers
const colors = {
  success: (text) => chalk.green(text),
  error: (text) => chalk.red(text),
  warning: (text) => chalk.yellow(text),
  info: (text) => chalk.blue(text),
  highlight: (text) => chalk.magenta(text)
};

console.log(colors.highlight('🚀 Context7 MCP Enhanced TypeScript Checking with Google zx\n'));

// PM2 Integration
async function setupPM2() {
  console.log(colors.info('🔧 Setting up PM2 process management...'));
  
  try {
    // Check if PM2 is running
    await $`pm2 ping`;
    console.log(colors.success('✅ PM2 daemon is running'));
    
    // Create PM2 ecosystem file
    const ecosystem = {
      apps: [{
        name: 'typecheck-monitor',
        script: './check-zx-enhanced.mjs',
        args: 'monitor',
        watch: false,
        env: {
          NODE_OPTIONS: CONFIG.memory
        }
      }, {
        name: 'go-simd-parser',
        script: '../go-microservice/simd-server.go',
        watch: false,
        interpreter: 'go',
        interpreter_args: 'run'
      }]
    };
    
    await fs.writeFile('ecosystem.config.json', JSON.stringify(ecosystem, null, 2));
    console.log(colors.success('✅ PM2 ecosystem configured'));
    
    unifiedReport.toolchain.pm2 = true;
    return true;
    
  } catch (error) {
    console.log(colors.warning(`⚠️ PM2 setup failed: ${error.message}`));
    return false;
  }
}

// Go SIMD Parser Integration
async function connectGoSIMD() {
  console.log(colors.info('🔗 Connecting to Go SIMD parser...'));
  const startTime = Date.now();
  
  try {
    // Check if Go SIMD server is running
    const healthCheck = await fetch(`http://${CONFIG.goSIMD.host}:${CONFIG.goSIMD.port}${CONFIG.goSIMD.endpoints.health}`);
    
    if (!healthCheck.ok) {
      throw new Error('Go SIMD server not responding');
    }
    
    const healthData = await healthCheck.json();
    console.log(colors.success(`✅ Connected to Go SIMD parser: ${JSON.stringify(healthData)}`));
    
    const duration = Date.now() - startTime;
    unifiedReport.methods.goSIMD = {
      status: 'connected',
      duration,
      errors: [],
      serverInfo: healthData
    };
    
    unifiedReport.toolchain.goSIMD = true;
    return healthData;
    
  } catch (error) {
    console.log(colors.warning(`⚠️ Go SIMD connection failed: ${error.message}`));
    
    // Try to start Go SIMD server
    try {
      console.log(colors.info('🚀 Starting Go SIMD server...'));
      const goProcess = $`cd ../go-microservice && go run simd-server.go`.nothrow();
      
      // Give it time to start
      await sleep(3000);
      
      // Retry connection
      const retryCheck = await fetch(`http://${CONFIG.goSIMD.host}:${CONFIG.goSIMD.port}${CONFIG.goSIMD.endpoints.health}`);
      
      if (retryCheck.ok) {
        const retryData = await retryCheck.json();
        console.log(colors.success(`✅ Go SIMD server started: ${JSON.stringify(retryData)}`));
        unifiedReport.toolchain.goSIMD = true;
        return retryData;
      }
      
    } catch (startError) {
      console.log(colors.error(`❌ Failed to start Go SIMD server: ${startError.message}`));
    }
    
    const duration = Date.now() - startTime;
    unifiedReport.methods.goSIMD = {
      status: 'failed',
      duration,
      errors: [{ message: error.message, category: 'connection' }],
      serverInfo: null
    };
    
    return null;
  }
}

// Enhanced TypeScript checking with zx
async function ultraFastCheckZX() {
  console.log(colors.info('\n⚡ Method 1: Ultra-Fast Check (zx + TypeScript)'));
  const startTime = Date.now();
  
  try {
    // Using zx for elegant command execution
    await $`npx tsc --noEmit --skipLibCheck --incremental`.timeout(CONFIG.timeout.ultraFast);
    
    const duration = Date.now() - startTime;
    unifiedReport.methods.ultraFast = {
      status: 'passed',
      duration,
      errors: [],
      tool: 'zx'
    };
    
    console.log(colors.success(`✅ Ultra-fast check completed in ${duration}ms`));
    return { success: true, duration, errors: [] };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errors = parseZXError(error);
    
    unifiedReport.methods.ultraFast = {
      status: 'failed',
      duration,
      errors,
      tool: 'zx',
      errorDetails: error.message
    };
    
    console.log(colors.error(`❌ Ultra-fast check failed in ${duration}ms`));
    return { success: false, duration, errors };
  }
}

// Concurrently Integration
async function concurrentlyCheckZX() {
  console.log(colors.info('\n⚡ Method 2: Concurrently + zx Check'));
  const startTime = Date.now();
  
  try {
    // Use concurrently for parallel execution
    const result = await $`npx concurrently --kill-others-on-fail --prefix-colors "blue,green" --names "TS,Svelte" "npx tsc --noEmit --skipLibCheck --incremental" "npx svelte-check --threshold error --output human --no-tsconfig"`.timeout(CONFIG.timeout.fast);
    
    const duration = Date.now() - startTime;
    const errors = parseConcurrentlyOutput(result.stdout);
    
    unifiedReport.methods.contextFast = {
      status: errors.length === 0 ? 'passed' : 'failed',
      duration,
      errors,
      tool: 'concurrently + zx',
      output: result.stdout
    };
    
    console.log(colors.success(`✅ Concurrently check completed in ${duration}ms (${errors.length} errors)`));
    return { success: errors.length === 0, duration, errors };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errors = parseZXError(error);
    
    unifiedReport.methods.contextFast = {
      status: 'failed',
      duration,
      errors,
      tool: 'concurrently + zx',
      errorDetails: error.message
    };
    
    console.log(colors.error(`❌ Concurrently check failed in ${duration}ms`));
    return { success: false, duration, errors };
  }
}

// Go SIMD Enhanced Parsing
async function goSIMDAnalysis() {
  console.log(colors.info('\n⚡ Method 4: Go SIMD Enhanced Analysis'));
  const startTime = Date.now();
  
  if (!unifiedReport.toolchain.goSIMD) {
    console.log(colors.warning('⚠️ Go SIMD not available, skipping analysis'));
    return { success: false, duration: 0, errors: [] };
  }
  
  try {
    // Send TypeScript files for SIMD analysis
    const tsFiles = await glob('src/**/*.{ts,tsx}');
    console.log(colors.info(`🔍 Analyzing ${tsFiles.length} TypeScript files with Go SIMD...`));
    
    const analysisData = {
      files: tsFiles.slice(0, 10), // Limit for demo
      analysisType: 'typescript-errors',
      includePerformance: true
    };
    
    const response = await fetch(`http://${CONFIG.goSIMD.host}:${CONFIG.goSIMD.port}${CONFIG.goSIMD.endpoints.parse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisData)
    });
    
    if (!response.ok) {
      throw new Error(`Go SIMD API returned ${response.status}`);
    }
    
    const results = await response.json();
    const duration = Date.now() - startTime;
    
    unifiedReport.methods.goSIMD = {
      status: 'completed',
      duration,
      errors: results.errors || [],
      performance: results.performance || {},
      filesAnalyzed: results.filesAnalyzed || tsFiles.length,
      tool: 'go-simd-parser'
    };
    
    console.log(colors.success(`✅ Go SIMD analysis completed in ${duration}ms`));
    console.log(colors.highlight(`📊 Performance: ${JSON.stringify(results.performance, null, 2)}`));
    
    return { success: true, duration, errors: results.errors || [] };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    unifiedReport.methods.goSIMD = {
      status: 'failed',
      duration,
      errors: [{ message: error.message, category: 'go-simd' }],
      tool: 'go-simd-parser'
    };
    
    console.log(colors.error(`❌ Go SIMD analysis failed: ${error.message}`));
    return { success: false, duration, errors: [] };
  }
}

// Standard incremental with zx improvements
async function standardIncrementalZX() {
  console.log(colors.info('\n⚡ Method 3: Standard Incremental (zx Enhanced)'));
  const startTime = Date.now();
  
  try {
    // Phase-by-phase with zx
    console.log(colors.info('📋 Phase 1: SvelteKit sync'));
    await $`npx svelte-kit sync`.timeout(30000);
    
    console.log(colors.info('📋 Phase 2: TypeScript check'));
    await $`npx tsc --noEmit --skipLibCheck --incremental`.timeout(60000);
    
    console.log(colors.info('📋 Phase 3: Svelte check'));
    const svelteResult = await $`npx svelte-check --threshold error --output human`.timeout(90000);
    
    const duration = Date.now() - startTime;
    const errors = parseSvelteOutput(svelteResult.stdout);
    
    unifiedReport.methods.standardIncremental = {
      status: errors.length === 0 ? 'passed' : 'failed',
      duration,
      errors,
      tool: 'zx',
      phases: ['svelte-kit sync', 'tsc', 'svelte-check']
    };
    
    console.log(colors.success(`✅ Standard incremental completed in ${duration}ms`));
    return { success: errors.length === 0, duration, errors };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errors = parseZXError(error);
    
    unifiedReport.methods.standardIncremental = {
      status: 'failed',
      duration,
      errors,
      tool: 'zx',
      errorDetails: error.message
    };
    
    console.log(colors.error(`❌ Standard incremental failed in ${duration}ms`));
    return { success: false, duration, errors };
  }
}

// Error parsing helpers
function parseZXError(error) {
  // Parse zx ProcessOutput errors
  if (error.stderr) {
    return [{ message: error.stderr, category: 'process', tool: 'zx' }];
  }
  return [{ message: error.message, category: 'unknown', tool: 'zx' }];
}

function parseConcurrentlyOutput(output) {
  // Parse concurrently output for errors
  const errors = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.includes('Error') && (line.includes('[TS]') || line.includes('[Svelte]'))) {
      errors.push({
        message: line.trim(),
        category: line.includes('[TS]') ? 'typescript' : 'svelte',
        tool: 'concurrently'
      });
    }
  }
  
  return errors;
}

function parseSvelteOutput(output) {
  // Parse svelte-check output
  const errors = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.includes('Error') && line.includes('.svelte')) {
      const match = line.match(/([^\\]+\.svelte):(\d+):(\d+)\s+Error:\s+(.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4],
          category: 'svelte',
          tool: 'svelte-check'
        });
      }
    }
  }
  
  return errors;
}

// Write enhanced reports
async function writeEnhancedReports() {
  try {
    // JSON Report
    await fs.writeFile(CONFIG.output.json, JSON.stringify(unifiedReport, null, 2));
    
    // Enhanced TXT Report
    const txtReport = `
Context7 MCP Enhanced TypeScript Check Report (zx + PM2 + Go SIMD)
Generated: ${unifiedReport.timestamp}

=== TOOLCHAIN ===
Google zx: ${unifiedReport.toolchain.zx ? '✅' : '❌'}
PM2: ${unifiedReport.toolchain.pm2 ? '✅' : '❌'}
Concurrently: ${unifiedReport.toolchain.concurrently ? '✅' : '❌'}  
Go SIMD Parser: ${unifiedReport.toolchain.goSIMD ? '✅' : '❌'}

=== SUMMARY ===
Total Methods: ${unifiedReport.summary.totalMethods}
Completed Methods: ${unifiedReport.summary.completedMethods}
Total Duration: ${unifiedReport.summary.totalDuration}ms
Total Errors: ${unifiedReport.summary.totalErrors}
Overall Status: ${unifiedReport.summary.overallStatus}

=== METHOD RESULTS ===
Ultra-Fast Check (zx): ${unifiedReport.methods.ultraFast.status} (${unifiedReport.methods.ultraFast.duration}ms)
Context7 Fast (concurrently): ${unifiedReport.methods.contextFast.status} (${unifiedReport.methods.contextFast.duration}ms)
Standard Incremental (zx): ${unifiedReport.methods.standardIncremental.status} (${unifiedReport.methods.standardIncremental.duration}ms)
Go SIMD Analysis: ${unifiedReport.methods.goSIMD.status} (${unifiedReport.methods.goSIMD.duration}ms)

=== PERFORMANCE INSIGHTS ===
${unifiedReport.methods.goSIMD.performance ? JSON.stringify(unifiedReport.methods.goSIMD.performance, null, 2) : 'Go SIMD analysis not available'}

=== PROCESS MANAGEMENT ===
PM2 Processes: ${unifiedReport.processManagement.pm2Processes.length}
Concurrently Jobs: ${unifiedReport.processManagement.concurrentlyJobs.length}
Go SIMD Connection: ${unifiedReport.processManagement.goSIMDConnection ? 'Connected' : 'Not connected'}
`;
    
    await fs.writeFile(CONFIG.output.txt, txtReport);
    
    console.log(colors.success(`\n📄 Enhanced reports written:`));
    console.log(colors.info(`   - ${CONFIG.output.json} (Full JSON with toolchain info)`));
    console.log(colors.info(`   - ${CONFIG.output.txt} (Enhanced summary with performance)`));
    
  } catch (error) {
    console.log(colors.error(`💥 Failed to write reports: ${error.message}`));
  }
}

// Main execution
async function main() {
  const globalStartTime = Date.now();
  
  try {
    // Setup toolchain
    const pm2Ready = await setupPM2();
    const goSIMDReady = await connectGoSIMD();
    
    // Run all methods concurrently
    console.log(colors.highlight('\n⏱️ Running all enhanced checks concurrently...\n'));
    
    const [ultraResult, concurrentlyResult, standardResult, goSIMDResult] = await Promise.allSettled([
      ultraFastCheckZX(),
      concurrentlyCheckZX(),
      standardIncrementalZX(),
      goSIMDAnalysis()
    ]);
    
    // Update summary
    const totalDuration = Date.now() - globalStartTime;
    const completedMethods = [ultraResult, concurrentlyResult, standardResult, goSIMDResult]
      .filter(r => r.status === 'fulfilled').length;
    
    unifiedReport.summary.completedMethods = completedMethods;
    unifiedReport.summary.totalDuration = totalDuration;
    unifiedReport.summary.overallStatus = completedMethods === 4 ? 'completed' : 'partial';
    
    // Write reports
    await writeEnhancedReports();
    
    // Final summary
    console.log(colors.highlight(`\n🎉 Enhanced unified check completed in ${totalDuration}ms`));
    console.log(colors.success(`📊 Results: ${completedMethods}/4 methods completed`));
    
    if (pm2Ready) {
      console.log(colors.info('💡 PM2 ecosystem ready. Run: pm2 start ecosystem.config.json'));
    }
    
    if (goSIMDReady) {
      console.log(colors.info('⚡ Go SIMD parser integration active'));
    }
    
    // Exit with appropriate code
    const hasFailures = [ultraResult, concurrentlyResult, standardResult, goSIMDResult]
      .some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.log(colors.error(`💥 Enhanced check failed: ${error.message}`));
    process.exit(1);
  }
}

// Handle different run modes
if (argv.monitor) {
  console.log(colors.info('👀 Running in PM2 monitor mode...'));
  setInterval(main, 60000); // Run every minute
} else {
  main().catch(console.error);
}
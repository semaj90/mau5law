#!/usr/bin/env node

/**
 * Context7 MCP Unified TypeScript Checking System
 * Merges all 3 checking methods with synchronized output to JSON/TXT reports
 * Uses parallel processing with concurrency coordination
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

// Configuration
const CONFIG = {
  memory: '--max-old-space-size=6144',
  timeout: {
    ultraFast: 30000,    // 30s for TypeScript only
    fast: 120000,        // 2m for parallel processing  
    standard: 180000     // 3m for full incremental check
  },
  output: {
    json: 'typecheck-report.json',
    txt: 'typecheck-report.txt',
    errors: 'typecheck-errors.json'
  }
};

// Report structure
let unifiedReport = {
  timestamp: new Date().toISOString(),
  summary: {
    totalMethods: 3,
    completedMethods: 0,
    totalDuration: 0,
    totalErrors: 0,
    overallStatus: 'pending'
  },
  methods: {
    ultraFast: { status: 'pending', duration: 0, errors: [] },
    contextFast: { status: 'pending', duration: 0, errors: [] },
    standardIncremental: { status: 'pending', duration: 0, errors: [] }
  },
  errorCategories: {
    legacyReactiveStatements: [],
    missingTypeScriptSyntax: [],
    legacyComponentPatterns: [],
    identifierConflicts: [],
    other: []
  },
  recommendations: []
};

const timeout = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
);

const runCommand = async (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, NODE_OPTIONS: CONFIG.memory },
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);
  });
};

const withTimeout = (promise, ms, methodName) => {
  return Promise.race([
    promise,
    timeout(ms).catch(() => ({ 
      code: 124, 
      stdout: '', 
      stderr: `${methodName} timed out after ${ms}ms` 
    }))
  ]);
};

// Parse errors from output
const parseErrors = (output, methodName) => {
  const errors = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.includes('Error') && line.includes('.svelte')) {
      const errorMatch = line.match(/([^\\]+\.svelte):(\d+):(\d+)\s*\[31mError\[39m:\s*(.+)/);
      if (errorMatch) {
        const [, file, lineNum, colNum, message] = errorMatch;
        errors.push({
          file: file.replace(/.*[\\\/]/, ''), // Just filename
          line: parseInt(lineNum),
          column: parseInt(colNum),
          message: message.trim(),
          method: methodName,
          category: categorizeError(message)
        });
      }
    }
  }
  
  return errors;
};

// Categorize errors for analysis
const categorizeError = (message) => {
  if (message.includes('$:') && message.includes('runes mode')) {
    return 'legacyReactiveStatements';
  } else if (message.includes('lang="ts"') || message.includes('Unexpected token')) {
    return 'missingTypeScriptSyntax';
  } else if (message.includes('$$restProps') || message.includes('$Props')) {
    return 'legacyComponentPatterns';
  } else if (message.includes('already been declared') || message.includes('redeclare')) {
    return 'identifierConflicts';
  }
  return 'other';
};

// Method 1: Ultra-Fast Check (TypeScript only)
async function ultraFastCheck() {
  console.log('\n⚡ Method 1: Context7 Ultra-Fast Check (TypeScript Only)');
  const startTime = Date.now();
  
  try {
    const result = await withTimeout(
      runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', '--incremental']),
      CONFIG.timeout.ultraFast,
      'Ultra-Fast Check'
    );
    
    const duration = Date.now() - startTime;
    const success = result.code === 0;
    
    unifiedReport.methods.ultraFast = {
      status: success ? 'passed' : 'failed',
      duration,
      errors: success ? [] : parseErrors(result.stderr, 'ultraFast'),
      output: result.stdout + result.stderr
    };
    
    console.log(`${success ? '✅' : '❌'} Ultra-fast check completed in ${duration}ms`);
    return { success, duration, errors: unifiedReport.methods.ultraFast.errors };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    unifiedReport.methods.ultraFast = {
      status: 'error',
      duration,
      errors: [],
      output: error.message
    };
    console.log(`💥 Ultra-fast check failed: ${error.message}`);
    return { success: false, duration, errors: [] };
  }
}

// Method 2: Context7 Fast Check (Parallel Processing)
async function contextFastCheck() {
  console.log('\n⚡ Method 2: Context7 Fast Check (Parallel Processing)');
  const startTime = Date.now();
  
  try {
    // Run TypeScript and Svelte checks concurrently
    const [tsResult, svelteResult] = await Promise.all([
      withTimeout(
        runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', '--incremental', '--assumeChangesOnlyAffectDirectDependencies']),
        CONFIG.timeout.fast / 2,
        'TypeScript Fast'
      ),
      withTimeout(
        runCommand('npx', ['svelte-check', '--threshold', 'error', '--output', 'human', '--diagnostic-sources', 'svelte', '--no-tsconfig']),
        CONFIG.timeout.fast / 2,
        'Svelte Fast'
      )
    ]);
    
    const duration = Date.now() - startTime;
    const success = tsResult.code === 0 && svelteResult.code === 0;
    const allErrors = [
      ...parseErrors(tsResult.stderr, 'contextFast-ts'),
      ...parseErrors(svelteResult.stderr, 'contextFast-svelte')
    ];
    
    unifiedReport.methods.contextFast = {
      status: success ? 'passed' : 'failed',
      duration,
      errors: allErrors,
      output: {
        typescript: tsResult.stdout + tsResult.stderr,
        svelte: svelteResult.stdout + svelteResult.stderr
      }
    };
    
    console.log(`${success ? '✅' : '❌'} Context7 fast check completed in ${duration}ms (${allErrors.length} errors)`);
    return { success, duration, errors: allErrors };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    unifiedReport.methods.contextFast = {
      status: 'error',
      duration,
      errors: [],
      output: error.message
    };
    console.log(`💥 Context7 fast check failed: ${error.message}`);
    return { success: false, duration, errors: [] };
  }
}

// Method 3: Standard Incremental Check
async function standardIncrementalCheck() {
  console.log('\n⚡ Method 3: Standard Incremental Check');
  const startTime = Date.now();
  
  try {
    // Phase-by-phase execution
    const phases = [
      { name: 'SvelteKit Sync', cmd: ['svelte-kit', 'sync'], timeout: 30000 },
      { name: 'TypeScript Check', cmd: ['tsc', '--noEmit', '--skipLibCheck', '--incremental'], timeout: 60000 },
      { name: 'Svelte Check', cmd: ['svelte-check', '--threshold', 'error', '--output', 'human'], timeout: 90000 }
    ];
    
    let allOutput = '';
    let allErrors = [];
    let phaseFailed = false;
    
    for (const phase of phases) {
      console.log(`📋 ${phase.name}...`);
      const phaseResult = await withTimeout(
        runCommand('npx', phase.cmd),
        phase.timeout,
        phase.name
      );
      
      allOutput += `\n=== ${phase.name} ===\n${phaseResult.stdout}\n${phaseResult.stderr}\n`;
      
      if (phaseResult.code !== 0) {
        phaseFailed = true;
        allErrors.push(...parseErrors(phaseResult.stderr, 'standardIncremental'));
      }
    }
    
    const duration = Date.now() - startTime;
    const success = !phaseFailed;
    
    unifiedReport.methods.standardIncremental = {
      status: success ? 'passed' : 'failed',
      duration,
      errors: allErrors,
      output: allOutput
    };
    
    console.log(`${success ? '✅' : '❌'} Standard incremental check completed in ${duration}ms (${allErrors.length} errors)`);
    return { success, duration, errors: allErrors };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    unifiedReport.methods.standardIncremental = {
      status: 'error',
      duration,
      errors: [],
      output: error.message
    };
    console.log(`💥 Standard incremental check failed: ${error.message}`);
    return { success: false, duration, errors: [] };
  }
}

// Generate recommendations based on results
const generateRecommendations = () => {
  const recommendations = [];
  const { ultraFast, contextFast, standardIncremental } = unifiedReport.methods;
  
  // Performance recommendations
  if (contextFast.duration < standardIncremental.duration) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: `Use Context7 fast check (${contextFast.duration}ms) instead of standard check (${standardIncremental.duration}ms) for ${Math.round((standardIncremental.duration - contextFast.duration) / contextFast.duration * 100)}% speed improvement`
    });
  }
  
  // Error fix recommendations
  const totalErrors = unifiedReport.summary.totalErrors;
  if (totalErrors > 0) {
    recommendations.push({
      type: 'errors',
      priority: 'medium',
      message: `Fix ${totalErrors} identified errors systematically, starting with legacy reactive statements`
    });
  }
  
  // TypeScript-only option
  if (ultraFast.status === 'passed') {
    recommendations.push({
      type: 'development',
      priority: 'low',
      message: `Use ultra-fast check (${ultraFast.duration}ms) for quick TypeScript validation during development`
    });
  }
  
  unifiedReport.recommendations = recommendations;
};

// Consolidate all errors and categorize
const consolidateErrors = () => {
  const allErrors = [
    ...unifiedReport.methods.ultraFast.errors,
    ...unifiedReport.methods.contextFast.errors,
    ...unifiedReport.methods.standardIncremental.errors
  ];
  
  // Remove duplicates based on file + line + message
  const uniqueErrors = allErrors.filter((error, index, arr) => 
    arr.findIndex(e => e.file === error.file && e.line === error.line && e.message === error.message) === index
  );
  
  // Categorize errors
  uniqueErrors.forEach(error => {
    unifiedReport.errorCategories[error.category].push(error);
  });
  
  unifiedReport.summary.totalErrors = uniqueErrors.length;
};

// Write reports to files
const writeReports = async () => {
  try {
    // JSON Report
    await fs.writeFile(
      CONFIG.output.json,
      JSON.stringify(unifiedReport, null, 2)
    );
    
    // TXT Report (Human-readable)
    const txtReport = `
Context7 MCP Unified TypeScript Check Report
Generated: ${unifiedReport.timestamp}

=== SUMMARY ===
Total Methods: ${unifiedReport.summary.totalMethods}
Completed Methods: ${unifiedReport.summary.completedMethods}
Total Duration: ${unifiedReport.summary.totalDuration}ms
Total Errors: ${unifiedReport.summary.totalErrors}
Overall Status: ${unifiedReport.summary.overallStatus}

=== METHOD RESULTS ===
Ultra-Fast Check: ${unifiedReport.methods.ultraFast.status} (${unifiedReport.methods.ultraFast.duration}ms)
Context7 Fast Check: ${unifiedReport.methods.contextFast.status} (${unifiedReport.methods.contextFast.duration}ms)  
Standard Incremental: ${unifiedReport.methods.standardIncremental.status} (${unifiedReport.methods.standardIncremental.duration}ms)

=== ERROR CATEGORIES ===
Legacy Reactive Statements: ${unifiedReport.errorCategories.legacyReactiveStatements.length}
Missing TypeScript Syntax: ${unifiedReport.errorCategories.missingTypeScriptSyntax.length}
Legacy Component Patterns: ${unifiedReport.errorCategories.legacyComponentPatterns.length}
Identifier Conflicts: ${unifiedReport.errorCategories.identifierConflicts.length}
Other: ${unifiedReport.errorCategories.other.length}

=== RECOMMENDATIONS ===
${unifiedReport.recommendations.map(r => `${r.priority.toUpperCase()}: ${r.message}`).join('\n')}
`;
    
    await fs.writeFile(CONFIG.output.txt, txtReport);
    
    // Errors-only JSON for processing
    const errorsOnly = {
      timestamp: unifiedReport.timestamp,
      totalErrors: unifiedReport.summary.totalErrors,
      categories: unifiedReport.errorCategories,
      allErrors: [
        ...unifiedReport.methods.ultraFast.errors,
        ...unifiedReport.methods.contextFast.errors,
        ...unifiedReport.methods.standardIncremental.errors
      ]
    };
    
    await fs.writeFile(
      CONFIG.output.errors,
      JSON.stringify(errorsOnly, null, 2)
    );
    
    console.log(`\n📄 Reports written to:`);
    console.log(`   - ${CONFIG.output.json} (Full JSON report)`);
    console.log(`   - ${CONFIG.output.txt} (Human-readable summary)`);
    console.log(`   - ${CONFIG.output.errors} (Errors-only JSON)`);
    
  } catch (error) {
    console.error('💥 Failed to write reports:', error.message);
  }
};

// Main unified checking function
async function main() {
  console.log('🚀 Context7 MCP Unified TypeScript Checking System\n');
  console.log('Running all 3 methods with synchronized output...\n');
  
  const globalStartTime = Date.now();
  
  try {
    // Run all methods concurrently for maximum efficiency
    console.log('⏱️ Running all checks concurrently...');
    
    const [ultraResult, contextResult, standardResult] = await Promise.allSettled([
      ultraFastCheck(),
      contextFastCheck(), 
      standardIncrementalCheck()
    ]);
    
    // Update summary
    const totalDuration = Date.now() - globalStartTime;
    const completedMethods = [ultraResult, contextResult, standardResult]
      .filter(r => r.status === 'fulfilled').length;
    
    unifiedReport.summary.completedMethods = completedMethods;
    unifiedReport.summary.totalDuration = totalDuration;
    unifiedReport.summary.overallStatus = completedMethods === 3 ? 'completed' : 'partial';
    
    // Consolidate results
    consolidateErrors();
    generateRecommendations();
    
    // Write all reports
    await writeReports();
    
    // Final summary
    console.log(`\n🎉 Unified check completed in ${totalDuration}ms`);
    console.log(`📊 Results: ${completedMethods}/3 methods completed, ${unifiedReport.summary.totalErrors} errors found`);
    
    // Exit with appropriate code
    const hasErrors = unifiedReport.summary.totalErrors > 0;
    const hasFailures = [ultraResult, contextResult, standardResult]
      .some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    process.exit(hasErrors || hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Unified check failed:', error.message);
    unifiedReport.summary.overallStatus = 'failed';
    await writeReports();
    process.exit(1);
  }
}

// Set memory optimization
process.env.NODE_OPTIONS = CONFIG.memory;

main().catch(console.error);
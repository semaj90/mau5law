#!/usr/bin/env node

/**
 * Context7 MCP Ultra-Fast TypeScript Checking
 * Optimized for large SvelteKit projects with performance bottlenecks
 * Uses parallel processing and selective file checking
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, relative } from 'path';

const runCommand = async (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let output = '';
    child.stdout?.on('data', (data) => output += data.toString());
    child.stderr?.on('data', (data) => output += data.toString());

    child.on('close', (code) => {
      resolve({ code, output });
    });

    child.on('error', reject);
  });
};

async function fastTypeScriptCheck() {
  console.log('⚡ Context7 Fast TypeScript Check');
  
  const { code, output } = await runCommand('npx', [
    'tsc', 
    '--noEmit', 
    '--skipLibCheck',
    '--incremental',
    '--assumeChangesOnlyAffectDirectDependencies'
  ]);

  if (code !== 0) {
    console.log('❌ TypeScript errors found:');
    console.log(output);
    return false;
  }
  
  console.log('✅ TypeScript check passed');
  return true;
}

async function lightweightSvelteCheck() {
  console.log('⚡ Lightweight Svelte Check (Syntax Only)');
  
  // Only check for critical syntax errors, skip intensive type checking
  const { code, output } = await runCommand('npx', [
    'svelte-check',
    '--threshold', 'error',
    '--output', 'human',
    '--diagnostic-sources', 'svelte',
    '--no-tsconfig'
  ]);

  if (code !== 0) {
    console.log('❌ Svelte syntax errors found:');
    console.log(output);
    return false;
  }

  console.log('✅ Svelte syntax check passed');
  return true;
}

async function main() {
  console.log('🚀 Context7 MCP Ultra-Fast Check Strategy\n');
  
  // Set performance environment
  process.env.NODE_OPTIONS = '--max-old-space-size=6144';
  
  const startTime = Date.now();
  
  try {
    // Run checks in parallel for maximum speed
    const [tsResult, svelteResult] = await Promise.all([
      fastTypeScriptCheck(),
      lightweightSvelteCheck()
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (tsResult && svelteResult) {
      console.log(`\n🎉 All checks passed in ${duration}s!`);
      process.exit(0);
    } else {
      console.log(`\n❌ Checks failed in ${duration}s`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fast check failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
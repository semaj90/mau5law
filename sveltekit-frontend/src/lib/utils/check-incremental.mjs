#!/usr/bin/env node

/**
 * Incremental TypeScript checking script to avoid hanging
 * Uses separate phases for different file types
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const timeout = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), ms)
);

const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', reject);
  });
};

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    timeout(ms)
  ]);
};

async function main() {
  console.log('🚀 Starting Context7 MCP-optimized TypeScript checking...\n');

  try {
    // Phase 1: Sync SvelteKit
    console.log('📋 Phase 1: SvelteKit sync');
    await withTimeout(
      runCommand('npx', ['svelte-kit', 'sync']),
      30000 // 30 second timeout
    );
    console.log('✅ SvelteKit sync completed\n');

    // Phase 2: Check TypeScript files only (no Svelte)
    console.log('📋 Phase 2: TypeScript files check');
    await withTimeout(
      runCommand('npx', ['tsc', '--noEmit', '--skipLibCheck', '--incremental']),
      60000 // 60 second timeout
    );
    console.log('✅ TypeScript check completed\n');

    // Phase 3: Quick Svelte check (errors only)
    console.log('📋 Phase 3: Svelte files check (errors only)');
    await withTimeout(
      runCommand('npx', ['svelte-check', '--threshold', 'error', '--output', 'human']),
      90000 // 90 second timeout
    );
    console.log('✅ Svelte check completed\n');

    console.log('🎉 All checks passed successfully!');
    process.exit(0);

  } catch (error) {
    if (error.message === 'Timeout') {
      console.error('❌ Check timed out. There may be performance issues.');
      console.error('💡 Try running individual phases manually:');
      console.error('   npx svelte-kit sync');
      console.error('   npx tsc --noEmit --skipLibCheck');
      console.error('   npx svelte-check --threshold error');
    } else {
      console.error('❌ Check failed:', error.message);
    }
    process.exit(1);
  }
}

// Set higher memory limit
process.env.NODE_OPTIONS = '--max-old-space-size=8192';

main().catch(console.error);
#!/usr/bin/env node

/**
 * System Integration Test - Native Windows Legal AI Platform
 * Tests: UI Libraries, XState, Ollama Gemma3-Legal, Database Connection
 * Platform: Native Windows (No Docker)
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 YoRHa Legal AI Platform - System Integration Test');
console.log('='repeat(60));

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logStep(step, status, message = '') {
  const symbols = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
  console.log(`${symbols[status]} ${step}${message ? ': ' + message : ''}`);
  
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else if (status === 'warn') results.warnings++;
}

// Test 1: Package Dependencies
console.log('\n📦 Testing Package Dependencies...');

try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  
  // Check Melt UI
  if (packageJson.dependencies.melt === '^0.39.0') {
    logStep('Melt UI v0.39.0 (Svelte 5 compatible)', 'pass');
  } else {
    logStep('Melt UI version', 'fail', `Expected ^0.39.0, got ${packageJson.dependencies.melt || 'not found'}`);
  }
  
  // Check Bits UI
  if (packageJson.dependencies['bits-ui'] === '^2.9.4') {
    logStep('Bits UI v2.9.4 (Latest Svelte 5)', 'pass');
  } else {
    logStep('Bits UI version', 'fail', `Expected ^2.9.4, got ${packageJson.dependencies['bits-ui'] || 'not found'}`);
  }
  
  // Check UnoCSS
  if (packageJson.devDependencies.unocss === '^66.4.2') {
    logStep('UnoCSS v66.4.2', 'pass');
  } else {
    logStep('UnoCSS version', 'warn', `Expected ^66.4.2, got ${packageJson.devDependencies.unocss || 'not found'}`);
  }
  
  // Check XState
  if (packageJson.dependencies.xstate && packageJson.dependencies['@xstate/svelte']) {
    logStep('XState + Svelte integration', 'pass');
  } else {
    logStep('XState integration', 'fail', 'Missing XState or @xstate/svelte');
  }
  
} catch (error) {
  logStep('Package.json reading', 'fail', error.message);
}

// Test 2: Component Files
console.log('\n🧩 Testing Component Files...');

const criticalFiles = [
  'src/lib/components/AIAssistant.svelte',
  'src/lib/components/ui/EnhancedButton.svelte',
  'src/lib/components/ui/Button.svelte',
  'src/lib/services/ollama-gemma3-service.ts',
  'src/routes/yorha-terminal/+page.svelte',
  'uno.config.ts',
  'vite.config.ts'
];

criticalFiles.forEach(file => {
  if (existsSync(join(__dirname, file))) {
    logStep(`${file}`, 'pass');
  } else {
    logStep(`${file}`, 'fail', 'File not found');
  }
});

// Test 3: TypeScript Compilation
console.log('\n🔧 Testing TypeScript Compilation...');

try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe', timeout: 60000 });
  logStep('TypeScript compilation', 'pass');
} catch (error) {
  logStep('TypeScript compilation', 'fail', 'Compilation errors detected');
  console.log('  Run `npm run check` for details');
}

// Test 4: Svelte Check
console.log('\n🎯 Testing Svelte Components...');

try {
  const output = execSync('npx svelte-check --threshold error', { 
    stdio: 'pipe', 
    timeout: 90000,
    encoding: 'utf8' 
  });
  
  if (output.includes('0 errors')) {
    logStep('Svelte components', 'pass');
  } else {
    logStep('Svelte components', 'warn', 'Some warnings detected');
  }
} catch (error) {
  logStep('Svelte components', 'fail', 'Component errors detected');
}

// Test 5: Ollama Service Connection
console.log('\n🤖 Testing Ollama Service...');

try {
  const ollamaResponse = execSync('curl -s http://localhost:11434/api/tags', { 
    stdio: 'pipe',
    timeout: 10000,
    encoding: 'utf8'
  });
  
  const models = JSON.parse(ollamaResponse);
  if (models && models.models) {
    const hasGemma3Legal = models.models.some(m => 
      m.name.includes('gemma3-legal') || (m.name.includes('gemma3') && m.name.includes('legal'))
    );
    
    if (hasGemma3Legal) {
      logStep('Ollama + Gemma3-Legal model', 'pass');
    } else {
      logStep('Gemma3-Legal model', 'fail', 'Model not found. Run: ollama pull gemma3-legal:latest');
      console.log('  Available models:', models.models.map(m => m.name).join(', '));
    }
  } else {
    logStep('Ollama service response', 'fail', 'Invalid response format');
  }
} catch (error) {
  logStep('Ollama service', 'fail', 'Service not running. Start with: ollama serve');
}

// Test 6: Build Process
console.log('\n🏗️ Testing Build Process...');

try {
  execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
  logStep('Production build', 'pass');
} catch (error) {
  logStep('Production build', 'fail', 'Build errors detected');
}

// Test 7: XState Integration
console.log('\n⚡ Testing XState Integration...');

try {
  const aiAssistantContent = readFileSync(join(__dirname, 'src/lib/components/AIAssistant.svelte'), 'utf8');
  
  if (aiAssistantContent.includes('createMachine') && aiAssistantContent.includes('useMachine')) {
    logStep('XState machine integration', 'pass');
  } else {
    logStep('XState machine integration', 'fail', 'Missing XState implementation');
  }
  
  if (aiAssistantContent.includes('gemma3-legal:latest')) {
    logStep('Gemma3-Legal model reference', 'pass');
  } else {
    logStep('Gemma3-Legal model reference', 'warn', 'Model reference not found');
  }
} catch (error) {
  logStep('AIAssistant component analysis', 'fail', error.message);
}

// Test 8: Windows Native Setup
console.log('\n🪟 Testing Windows Native Setup...');

try {
  // Check for Docker references (should be none)
  const viteConfig = readFileSync(join(__dirname, 'vite.config.ts'), 'utf8');
  if (!viteConfig.includes('docker') && !viteConfig.includes('container')) {
    logStep('No Docker dependencies', 'pass');
  } else {
    logStep('Docker references found', 'warn', 'Should be native Windows only');
  }
  
  // Check for native Windows optimizations
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  if (packageJson.scripts['dev:windows'] || packageJson.scripts.dev) {
    logStep('Windows development scripts', 'pass');
  } else {
    logStep('Windows development scripts', 'warn', 'Consider adding Windows-specific scripts');
  }
} catch (error) {
  logStep('Windows native setup check', 'fail', error.message);
}

// Results Summary
console.log('\n' + '='repeat(60));
console.log('📊 SYSTEM INTEGRATION TEST RESULTS');
console.log('='repeat(60));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️ Warnings: ${results.warnings}`);

if (results.failed === 0) {
  console.log('\n🎉 SUCCESS: System is ready for production!');
  console.log('\n🚀 Next Steps:');
  console.log('  1. Start Ollama: ollama serve');
  console.log('  2. Pull model: ollama pull gemma3-legal:latest');
  console.log('  3. Start dev: npm run dev:full');
  console.log('  4. Access YoRHa Terminal: http://localhost:5173/yorha-terminal');
} else {
  console.log('\n🔧 ISSUES DETECTED: Please fix the failed tests before proceeding.');
  process.exit(1);
}

console.log('\n' + '='repeat(60));
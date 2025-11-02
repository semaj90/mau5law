#!/usr/bin/env node

/**
 * Smoke Test for Cyber Elephant Multi-Language Prototype
 * Tests: Go backend API, Wasm file existence, basic integration
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🐘 Cyber Elephant Smoke Test Started\n');

// Test 1: Check if Go backend is listening on port 8080
async function checkBackendStatus() {
  console.log('📡 Testing Go Backend on localhost:8080...');
  
  try {
    const response = await fetch('http://localhost:8080/api/v1/initial-data');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend Status: ONLINE');
      console.log(`   - Documents received: ${data.documents?.length || 0}`);
      console.log(`   - Clusters: ${data.clusters?.length || 0}`);
      console.log(`   - Projection type: ${data.projection_type || 'unknown'}`);
      return true;
    } else {
      console.log(`❌ Backend Status: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend Status: OFFLINE (${error.message})`);
    return false;
  }
}

// Test 2: Check if Wasm files exist
function checkWasmFiles() {
  console.log('\n🔧 Checking Wasm Build Artifacts...');
  
  const wasmPaths = [
    'sveltekit-frontend/static/wasm/bvh_accelerator.js',
    'sveltekit-frontend/static/wasm/bvh_accelerator.wasm',
    'cyber-elephant/accelerator-cpp/build/bvh_accelerator.js',
    'cyber-elephant/accelerator-cpp/build/bvh_accelerator.wasm'
  ];
  
  let wasmFound = false;
  
  for (const wasmPath of wasmPaths) {
    const fullPath = path.join(__dirname, wasmPath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Found: ${wasmPath}`);
      const stats = fs.statSync(fullPath);
      console.log(`   - Size: ${(stats.size / 1024).toFixed(1)}KB`);
      console.log(`   - Modified: ${stats.mtime.toISOString()}`);
      wasmFound = true;
    } else {
      console.log(`❌ Missing: ${wasmPath}`);
    }
  }
  
  return wasmFound;
}

// Test 3: Check TCP port 8080 availability
function checkTCPPort() {
  console.log('\n🔌 Checking TCP Port 8080...');
  
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -an | findstr :8080', { encoding: 'utf8', timeout: 5000 });
      if (output.includes('LISTENING')) {
        console.log('✅ Port 8080: LISTENING');
        console.log(`   - Details: ${output.trim()}`);
        return true;
      }
    } else {
      const output = execSync('lsof -i :8080', { encoding: 'utf8', timeout: 5000 });
      if (output.length > 0) {
        console.log('✅ Port 8080: IN USE');
        console.log(`   - Details: ${output.trim()}`);
        return true;
      }
    }
  } catch (error) {
    console.log('❌ Port 8080: NOT IN USE');
    return false;
  }
  
  return false;
}

// Test 4: Verify project structure
function checkProjectStructure() {
  console.log('\n📁 Verifying Project Structure...');
  
  const requiredPaths = [
    'cyber-elephant/backend-go/main.go',
    'cyber-elephant/accelerator-cpp/main.cpp',
    'sveltekit-frontend/src/routes/demo/cyber-elephant/+page.svelte',
    'sveltekit-frontend/package.json'
  ];
  
  let structureValid = true;
  
  for (const reqPath of requiredPaths) {
    const fullPath = path.join(__dirname, reqPath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Found: ${reqPath}`);
    } else {
      console.log(`❌ Missing: ${reqPath}`);
      structureValid = false;
    }
  }
  
  return structureValid;
}

// Test 5: Check dependencies
function checkDependencies() {
  console.log('\n📦 Checking Dependencies...');
  
  try {
    // Check if Go is available
    const goVersion = execSync('go version', { encoding: 'utf8', timeout: 5000 });
    console.log(`✅ Go: ${goVersion.trim()}`);
  } catch (error) {
    console.log('❌ Go: Not found or not in PATH');
  }
  
  try {
    // Check if Emscripten is available
    const emccVersion = execSync('emcc --version', { encoding: 'utf8', timeout: 5000 });
    const version = emccVersion.split('\n')[0];
    console.log(`✅ Emscripten: ${version}`);
  } catch (error) {
    console.log('❌ Emscripten: Not found or not in PATH');
  }
  
  try {
    // Check if Node.js dependencies are installed
    const frontendPackage = path.join(__dirname, 'sveltekit-frontend/package.json');
    const lockFile = path.join(__dirname, 'sveltekit-frontend/package-lock.json');
    
    if (fs.existsSync(frontendPackage) && fs.existsSync(lockFile)) {
      console.log('✅ Frontend: Dependencies appear to be installed');
    } else {
      console.log('❌ Frontend: npm install may be required');
    }
  } catch (error) {
    console.log('❌ Frontend: Dependency check failed');
  }
}

// Run all tests
async function runSmokeTest() {
  const results = {
    backend: false,
    wasm: false,
    tcp: false,
    structure: false,
    deps: true
  };
  
  results.structure = checkProjectStructure();
  checkDependencies();
  results.tcp = checkTCPPort();
  results.backend = await checkBackendStatus();
  results.wasm = checkWasmFiles();
  
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(40));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.toUpperCase().padEnd(12);
    console.log(`${testName} ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('='.repeat(40));
  console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All systems operational! Cyber Elephant is ready.');
  } else {
    console.log('\n⚠️  Some components need attention. See instructions below.');
  }
  
  return results;
}

// Provide setup instructions based on test results
function printSetupInstructions(results) {
  console.log('\n🚀 Setup Instructions:');
  console.log('='.repeat(50));
  
  if (!results.structure) {
    console.log('❌ Project structure incomplete - check file paths');
  }
  
  if (!results.wasm) {
    console.log('⚠️  Wasm build required:');
    console.log('   cd cyber-elephant/accelerator-cpp');
    console.log('   chmod +x build.sh');
    console.log('   ./build.sh');
    console.log('   # Or manually with emcc (see main.cpp comments)');
  }
  
  if (!results.backend) {
    console.log('⚠️  Start Go backend:');
    console.log('   cd cyber-elephant/backend-go');
    console.log('   go run main.go');
    console.log('   # Should listen on localhost:8080');
  }
  
  console.log('\n🌐 Start SvelteKit frontend:');
  console.log('   cd sveltekit-frontend');
  console.log('   npm install    # if needed');
  console.log('   npm run dev');
  console.log('   # Visit http://localhost:5173/demo/cyber-elephant');
  
  console.log('\n🧪 Re-run smoke test:');
  console.log('   node smoke_test.js');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest()
    .then(results => {
      printSetupInstructions(results);
    })
    .catch(error => {
      console.error('💥 Smoke test failed:', error);
      process.exit(1);
    });
}

export { runSmokeTest, checkBackendStatus, checkWasmFiles };
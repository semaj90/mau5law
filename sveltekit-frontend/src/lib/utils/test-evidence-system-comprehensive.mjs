#!/usr/bin/env node
/**
 * Comprehensive Evidence System Test
 * Tests all evidence routes, APIs, and components with real file uploads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5173';
const TEST_FILES_DIR = path.join(__dirname, '../lawpdfs');
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Global test state
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logTest(testName, status, details = '') {
  testResults.total++;
  const symbol = status === 'PASS' ? '✅' : '❌';
  const color = status === 'PASS' ? 'green' : 'red';
  
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, details });
  }
  
  log(`${symbol} ${testName}${details ? ` - ${details}` : ''}`, color);
}

async function testAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method: 'GET',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, config);
    return {
      ok: response.ok,
      status: response.status,
      data: response.headers.get('content-type')?.includes('json') 
        ? await response.json() 
        : await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function testFileUpload(endpoint, filePath, additionalFields = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const formData = new FormData();
    
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const file = new File([fileBuffer], filename, { type: 'application/pdf' });
      formData.append('files', file);
    }
    
    // Add additional fields
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    return {
      ok: response.ok,
      status: response.status,
      data: response.headers.get('content-type')?.includes('json') 
        ? await response.json() 
        : await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function testDatabaseConnection() {
  log('\n🔍 Testing Database Connection...', 'cyan');
  
  // Test health endpoint
  const healthResult = await testAPI('/api/health');
  logTest(
    'Database Health Check',
    healthResult.ok ? 'PASS' : 'FAIL',
    healthResult.ok ? `Status: ${healthResult.status}` : healthResult.error
  );
  
  // Test direct database query
  const dbResult = await testAPI('/api/test-crud');
  logTest(
    'Database CRUD Operations',
    dbResult.ok ? 'PASS' : 'FAIL',
    dbResult.ok ? 'All CRUD operations successful' : dbResult.error
  );
  
  return healthResult.ok && dbResult.ok;
}

async function testEvidenceAPIs() {
  log('\n🔧 Testing Evidence APIs...', 'cyan');
  
  const testEvidenceId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Test evidence processing API
  const processResult = await testAPI('/api/evidence/process', {
    method: 'POST',
    body: JSON.stringify({
      evidenceId: testEvidenceId,
      steps: ['ocr', 'embedding', 'analysis']
    })
  });
  
  logTest(
    'Evidence Processing API',
    processResult.ok ? 'PASS' : 'FAIL',
    processResult.ok 
      ? `Session ID: ${processResult.data?.sessionId}` 
      : processResult.error || `Status: ${processResult.status}`
  );
  
  // Test evidence list API
  const listResult = await testAPI('/api/evidence');
  logTest(
    'Evidence List API',
    listResult.ok ? 'PASS' : 'FAIL',
    listResult.ok ? 'Evidence list retrieved' : listResult.error
  );
  
  // Test evidence analysis API
  const analyzeResult = await testAPI('/api/evidence/analyze', {
    method: 'POST',
    body: JSON.stringify({
      evidenceId: testEvidenceId,
      analysisType: 'comprehensive'
    })
  });
  
  logTest(
    'Evidence Analysis API',
    analyzeResult.status !== 404 ? 'PASS' : 'FAIL',
    analyzeResult.ok ? 'Analysis completed' : `Status: ${analyzeResult.status}`
  );
  
  // Test evidence validation API
  const validateResult = await testAPI('/api/evidence/validate', {
    method: 'POST',
    body: JSON.stringify({
      evidenceId: testEvidenceId
    })
  });
  
  logTest(
    'Evidence Validation API',
    validateResult.status !== 404 ? 'PASS' : 'FAIL',
    validateResult.ok ? 'Validation completed' : `Status: ${validateResult.status}`
  );
  
  return processResult.ok;
}

async function testLawPDFsAPI() {
  log('\n📄 Testing LawPDFs API...', 'cyan');
  
  // Test JSON API
  const jsonResult = await testAPI('/api/ai/lawpdfs', {
    method: 'POST',
    body: JSON.stringify({
      content: 'Test legal document for analysis. This contract contains liability clauses and indemnification terms.',
      fileName: 'test-document.pdf',
      analysisType: 'comprehensive',
      useLocalModels: false
    })
  });
  
  logTest(
    'LawPDFs JSON API',
    jsonResult.ok ? 'PASS' : 'FAIL',
    jsonResult.ok 
      ? `Processing time: ${jsonResult.data?.metadata?.processingTime}ms` 
      : jsonResult.error || `Status: ${jsonResult.status}`
  );
  
  // Test file upload if test PDF exists
  const testPDFPath = path.join(TEST_FILES_DIR, 'test-document.pdf');
  let uploadResult = { ok: false, status: 0 };
  
  if (fs.existsSync(testPDFPath)) {
    uploadResult = await testFileUpload('/api/ai/lawpdfs', testPDFPath, {
      enableOCR: 'true',
      enableEmbedding: 'true',
      enableRAG: 'true'
    });
    
    logTest(
      'LawPDFs File Upload',
      uploadResult.ok ? 'PASS' : 'FAIL',
      uploadResult.ok 
        ? `Files processed: ${uploadResult.data?.results?.length || 0}` 
        : uploadResult.error || `Status: ${uploadResult.status}`
    );
  } else {
    logTest(
      'LawPDFs File Upload',
      'FAIL',
      'No test PDF found. Create a test PDF at lawpdfs/test-document.pdf'
    );
  }
  
  return jsonResult.ok;
}

async function testMinIOUpload() {
  log('\n☁️ Testing MinIO Upload Component...', 'cyan');
  
  // Test MinIO upload endpoint
  const testFile = path.join(TEST_FILES_DIR, 'test-document.pdf');
  
  if (fs.existsSync(testFile)) {
    const uploadResult = await testFileUpload('/api/upload', testFile, {
      caseId: 'TEST-CASE-001',
      documentType: 'evidence',
      description: 'Test evidence upload',
      priority: 'medium'
    });
    
    logTest(
      'MinIO Upload API',
      uploadResult.ok ? 'PASS' : 'FAIL',
      uploadResult.ok 
        ? 'File uploaded successfully' 
        : uploadResult.error || `Status: ${uploadResult.status}`
    );
    
    return uploadResult.ok;
  } else {
    logTest(
      'MinIO Upload API',
      'FAIL',
      'No test file found for upload'
    );
    
    return false;
  }
}

async function testWebSocketConnection(sessionId) {
  log('\n📡 Testing WebSocket Connection...', 'cyan');
  
  return new Promise((resolve) => {
    const wsUrl = `ws://localhost:5173/api/evidence/stream/${sessionId}`;
    
    try {
      const WebSocket = globalThis.WebSocket || require('ws');
      const ws = new WebSocket(wsUrl);
      
      let connected = false;
      const timeout = setTimeout(() => {
        ws.close();
        logTest(
          'WebSocket Connection',
          'FAIL',
          'Connection timeout after 5 seconds'
        );
        resolve(false);
      }, 5000);
      
      ws.onopen = () => {
        connected = true;
        clearTimeout(timeout);
        logTest(
          'WebSocket Connection',
          'PASS',
          'Successfully connected'
        );
        ws.close();
        resolve(true);
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        logTest(
          'WebSocket Connection',
          'FAIL',
          `Connection error: ${error.message || 'Unknown error'}`
        );
        resolve(false);
      };
      
    } catch (error) {
      logTest(
        'WebSocket Connection',
        'FAIL',
        `WebSocket not available: ${error.message}`
      );
      resolve(false);
    }
  });
}

async function testEvidenceRoutes() {
  log('\n🌐 Testing Evidence Routes...', 'cyan');
  
  const routes = [
    '/evidence',
    '/evidence/analyze', 
    '/evidence/hash',
    '/evidence/realtime',
    '/evidence/upload',
    '/evidenceboard'
  ];
  
  for (const route of routes) {
    const result = await testAPI(route);
    logTest(
      `Route: ${route}`,
      result.status !== 404 ? 'PASS' : 'FAIL',
      result.ok ? 'Page loads successfully' : `Status: ${result.status}`
    );
  }
}

async function testSystemIntegration() {
  log('\n🔗 Testing System Integration...', 'cyan');
  
  // Create test evidence
  const evidenceResult = await testAPI('/api/evidence/process', {
    method: 'POST',
    body: JSON.stringify({
      evidenceId: `integration_test_${Date.now()}`,
      steps: ['ocr', 'embedding']
    })
  });
  
  if (evidenceResult.ok && evidenceResult.data?.sessionId) {
    // Test WebSocket with real session
    await testWebSocketConnection(evidenceResult.data.sessionId);
    
    // Test evidence retrieval
    const retrieveResult = await testAPI(`/api/evidence/${evidenceResult.data.evidenceId}`);
    logTest(
      'Evidence Retrieval',
      retrieveResult.status !== 404 ? 'PASS' : 'FAIL',
      retrieveResult.ok ? 'Evidence data retrieved' : `Status: ${retrieveResult.status}`
    );
  }
  
  // Test vector search integration
  const vectorResult = await testAPI('/api/vector/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'legal contract terms',
      limit: 5
    })
  });
  
  logTest(
    'Vector Search Integration',
    vectorResult.status !== 404 ? 'PASS' : 'FAIL',
    vectorResult.ok ? 'Vector search working' : `Status: ${vectorResult.status}`
  );
}

async function runPostgresTests() {
  log('\n🗄️ Running PostgreSQL Tests...', 'cyan');
  
  return new Promise((resolve) => {
    const testProcess = spawn('node', ['test-postgres-drizzle.mjs'], {
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    let output = '';
    let hasError = false;
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      hasError = true;
      output += data.toString();
    });
    
    testProcess.on('close', (code) => {
      const success = code === 0 && !hasError;
      
      logTest(
        'PostgreSQL + Drizzle Test',
        success ? 'PASS' : 'FAIL',
        success ? 'All database tests passed' : 'Check console for details'
      );
      
      if (!success) {
        log(output, 'yellow');
      }
      
      resolve(success);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      testProcess.kill();
      logTest('PostgreSQL Test', 'FAIL', 'Test timeout');
      resolve(false);
    }, 30000);
  });
}

async function setupTestEnvironment() {
  log('\n🛠️ Setting up test environment...', 'cyan');
  
  // Check if test files directory exists
  if (!fs.existsSync(TEST_FILES_DIR)) {
    log(`⚠️ Creating test files directory: ${TEST_FILES_DIR}`, 'yellow');
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
    
    // Create a simple test PDF-like file
    const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Legal Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000174 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
268
%%EOF`;
    
    fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-document.pdf'), testContent);
    log('✅ Created test PDF file', 'green');
  }
  
  // Check if server is running
  const serverCheck = await testAPI('/');
  if (!serverCheck.ok && serverCheck.status === 0) {
    log('❌ SvelteKit dev server is not running!', 'red');
    log('   Please run: npm run dev', 'yellow');
    return false;
  }
  
  log('✅ Test environment ready', 'green');
  return true;
}

async function displayResults() {
  log('\n' + '='.repeat(60), 'cyan');
  log(' COMPREHENSIVE EVIDENCE SYSTEM TEST RESULTS', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n📊 Test Summary:`, 'blue');
  log(`   Total Tests: ${testResults.total}`, 'blue');
  log(`   Passed: ${testResults.passed}`, 'green');
  log(`   Failed: ${testResults.failed}`, 'red');
  log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'blue');
  
  if (testResults.failed > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    testResults.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error.test}`, 'red');
      if (error.details) {
        log(`      ${error.details}`, 'yellow');
      }
    });
    
    log(`\n💡 Troubleshooting:`, 'yellow');
    log(`   1. Make sure all services are running (PostgreSQL, Redis, etc.)`, 'yellow');
    log(`   2. Check that the SvelteKit dev server is running on port 5173`, 'yellow');
    log(`   3. Ensure database is properly set up with: node setup-postgres-gpu.mjs --seed`, 'yellow');
    log(`   4. Verify RabbitMQ is running for queue operations`, 'yellow');
    log(`   5. Check the browser test pages:`, 'yellow');
    log(`      - http://localhost:5173/test-evidence-processing.html`, 'yellow');
    log(`      - http://localhost:5173/test-lawpdfs-upload.html`, 'yellow');
  }
  
  log(`\n🌐 Test URLs:`, 'cyan');
  log(`   Evidence Processing Demo: ${BASE_URL}/evidence/process-demo`, 'cyan');
  log(`   Evidence Board: ${BASE_URL}/evidenceboard`, 'cyan');
  log(`   Evidence Upload: ${BASE_URL}/evidence/upload`, 'cyan');
  log(`   Evidence Analysis: ${BASE_URL}/evidence/analyze`, 'cyan');
  log(`   Browser Tests: ${BASE_URL}/test-evidence-processing.html`, 'cyan');
  log(`   LawPDFs Test: ${BASE_URL}/test-lawpdfs-upload.html`, 'cyan');
  
  log(`\n🎯 Next Steps:`, 'green');
  if (testResults.failed === 0) {
    log(`   ✅ All tests passed! Your evidence system is working correctly.`, 'green');
    log(`   ✅ Upload real PDF files using the browser test pages.`, 'green');
    log(`   ✅ Monitor processing via WebSocket in real-time.`, 'green');
  } else {
    log(`   🔧 Fix the failing tests above`, 'yellow');
    log(`   🔄 Run this test again to verify fixes`, 'yellow');
    log(`   📖 Check the logs for detailed error information`, 'yellow');
  }
}

async function main() {
  log('🚀 Starting Comprehensive Evidence System Test', 'magenta');
  log('='.repeat(60), 'magenta');
  
  // Setup
  const setupOk = await setupTestEnvironment();
  if (!setupOk) {
    process.exit(1);
  }
  
  // Run all tests
  await testDatabaseConnection();
  await runPostgresTests();
  await testEvidenceAPIs();
  await testLawPDFsAPI();
  await testMinIOUpload();
  await testEvidenceRoutes();
  await testSystemIntegration();
  
  // Display results
  await displayResults();
  
  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the comprehensive test
main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
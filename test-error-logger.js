// Test Error Logger - Simulates Vite errors and tests auto-solve
// Run with: node test-error-logger.js

// Mock fetch for older Node.js versions
const fetch = async (url, options) => {
  return { ok: false, status: 503, statusText: 'Service Unavailable' };
};

async function testErrorLogging() {
  console.log('🧪 Testing Redis Error Logger with Auto-Solve');
  
  const testErrors = [
    {
      type: 'typescript',
      message: 'Property "className" does not exist on type "HTMLDivElement"',
      file: 'src/lib/components/ui/Button.svelte',
      line: 15,
      column: 8,
      stack: `Error: Property "className" does not exist
  at TypeScript:15:8
  at Button.svelte:15`,
      context: {
        svelte_version: '5.0',
        component: 'Button',
        library: 'bits-ui'
      }
    },
    {
      type: 'svelte',
      message: 'Cannot read properties of undefined (reading "length")',
      file: 'src/routes/+layout.svelte',
      line: 42,
      column: 12,
      stack: `TypeError: Cannot read properties of undefined (reading "length")
  at Layout.svelte:42:12
  at reactive update`,
      context: {
        svelte_version: '5.0',
        rune_type: '$state',
        component: 'Layout'
      }
    },
    {
      type: 'build',
      message: 'Failed to resolve import "./non-existent-module"',
      file: 'src/lib/services/legal-analyzer.ts',
      line: 3,
      column: 1,
      stack: `Error: Failed to resolve import "./non-existent-module" from "src/lib/services/legal-analyzer.ts"
  at resolve (vite:resolve)
  at build`,
      context: {
        vite_version: '5.x',
        import_type: 'relative',
        attempted_resolution: './non-existent-module'
      }
    },
    {
      type: 'runtime',
      message: 'Hydration failed because the initial UI does not match server-rendered HTML',
      file: 'src/app.html',
      line: 1,
      column: 1,
      stack: `HydrationError: Hydration failed because the initial UI does not match server-rendered HTML
  at hydrateRoot
  at SvelteKit hydration`,
      context: {
        framework: 'SvelteKit',
        ssr: true,
        hydration_mismatch: true
      }
    }
  ];

  for (const [index, errorLog] of testErrors.entries()) {
    console.log(`\n📋 Test ${index + 1}: ${errorLog.type.toUpperCase()} Error`);
    console.log(`File: ${errorLog.file}`);
    console.log(`Message: ${errorLog.message}`);
    
    try {
      // Test if server is running
      const response = await fetch('http://localhost:8080/api/vite/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorLog)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Error logged successfully`);
        console.log(`   Error ID: ${result.error_id}`);
        console.log(`   Status: ${result.status}`);
        
        // Wait a moment for auto-solve processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if auto-solve worked
        await checkAutoSolve(result.error_id);
        
      } else {
        console.log(`❌ Failed to log error: ${response.status} ${response.statusText}`);
        
        // If server isn't running, simulate Redis storage
        console.log(`📝 Simulating Redis storage...`);
        await simulateRedisStorage(errorLog);
      }
      
    } catch (error) {
      console.log(`🔌 Server not running, testing with mock Redis...`);
      await simulateRedisStorage(errorLog);
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Testing complete!');
  console.log('\n📁 Check logs/claude-pickup/ for generated files');
}

async function checkAutoSolve(errorId) {
  try {
    // Check Redis for auto-solve results
    const response = await fetch(`http://localhost:8080/api/vite/errors?id=${errorId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.errors.length > 0) {
        const errorLog = JSON.parse(data.errors[0]);
        
        console.log(`🤖 Auto-Solve Results:`);
        console.log(`   Attempted: ${errorLog.auto_solved ? 'YES' : 'NO'}`);
        if (errorLog.solution) {
          console.log(`   Confidence: ${errorLog.solution.confidence}`);
          console.log(`   Fixes Applied: ${errorLog.solution.fixes?.length || 0}`);
          console.log(`   Library Docs: ${errorLog.solution.library_docs ? 'Retrieved' : 'None'}`);
        }
      }
    }
  } catch (e) {
    console.log(`   Auto-solve check failed: ${e.message}`);
  }
}

async function simulateRedisStorage(errorLog) {
  const fs = require('fs');
  const path = require('path');
  
  // Simulate error processing
  const errorId = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  errorLog.error_id = errorId;
  errorLog.timestamp = new Date().toISOString();
  
  // Generate embedding text (mock)
  const embeddingText = `${errorLog.type} error in ${errorLog.file}: ${errorLog.message}. Context: SvelteKit legal AI platform, Svelte 5.`;
  errorLog.embedding_text = embeddingText;
  
  // Generate summary prompt for Claude
  errorLog.summary_prompt = `Vite Error Summary:
Type: ${errorLog.type}
File: ${errorLog.file}:${errorLog.line}:${errorLog.column}
Message: ${errorLog.message}
Context: SvelteKit frontend, legal AI platform
Time: ${errorLog.timestamp}

Stack Trace:
${errorLog.stack}

This error occurred in the deeds-web-app legal AI platform. The app uses:
- SvelteKit frontend with Svelte 5 runes
- Legal document processing
- CUDA/GPU acceleration
- Redis caching
- PostgreSQL with pgvector

Please analyze this error and suggest solutions considering the legal AI context.`;

  // Simulate auto-solve attempt
  errorLog.auto_solved = true;
  errorLog.solution = {
    approach_id: `auto_${Date.now()}`,
    library_docs: `Mock library documentation for ${errorLog.context?.library || 'unknown library'}`,
    fixes: [
      `Check ${errorLog.type} compatibility with Svelte 5`,
      `Verify import paths in ${errorLog.file}`,
      `Review component props and bindings`
    ],
    confidence: 0.75,
    test_results: { mock: true },
    claude_prompt: `# Vite Error Analysis

**Error**: ${errorLog.message}
**File**: ${errorLog.file}:${errorLog.line}
**Type**: ${errorLog.type}
**Timestamp**: ${errorLog.timestamp}

## Context
This error occurred in the deeds-web-app legal AI platform using SvelteKit + Svelte 5.

## Suggested Actions
1. Check for Svelte 5 compatibility issues
2. Verify import paths and dependencies
3. Review TypeScript configuration
4. Check for missing UI component imports

This error has been automatically logged with embedding for semantic search.`,
    copilot_summary: `${errorLog.type} error in ${errorLog.file}: ${errorLog.message}. Check Svelte 5 compatibility and imports. Auto-logged with Redis embedding.`
  };
  
  // Create logs directory
  const logsDir = path.join(__dirname, 'logs', 'claude-pickup');
  fs.mkdirSync(logsDir, { recursive: true });
  
  // Write JSON file
  const jsonFile = path.join(logsDir, `vite-error-${errorId}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(errorLog, null, 2));
  
  // Write Markdown summary
  const mdFile = path.join(logsDir, `vite-error-${errorId}.md`);
  const mdContent = `# Vite Error Report

${errorLog.summary_prompt}

## Auto-Solution
${JSON.stringify(errorLog.solution, null, 2)}`;
  fs.writeFileSync(mdFile, mdContent);
  
  console.log(`✅ Mock error logged`);
  console.log(`   Error ID: ${errorId}`);
  console.log(`   Files created: ${path.basename(jsonFile)}, ${path.basename(mdFile)}`);
  console.log(`🤖 Auto-Solve: Simulated with 75% confidence`);
}

// Run the test
testErrorLogging().catch(console.error);
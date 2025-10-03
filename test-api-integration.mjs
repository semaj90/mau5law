#!/usr/bin/env node

/**
 * Test API Integration - Demonstrates complete wiring:
 * LiteLLM (AI) + MCP Server (Tools) + PostgreSQL (Data)
 */

const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`
};

function log(message, color = 'blue') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const colorFn = colors[color] || colors.blue;
  console.log(colorFn(`[${timestamp}] ${message}`));
}

async function testMCPTools() {
  log('=== Testing MCP Tools API ===', 'yellow');

  // Test 1: List available tools
  log('📋 Test 1: List available MCP tools...', 'cyan');
  const toolsResponse = await fetch('http://localhost:3002/mcp/tools');
  const tools = await toolsResponse.json();
  log(`✅ Found ${tools.tools.length} tools:`, 'green');
  tools.tools.forEach(tool => {
    log(`   - ${tool.name}: ${tool.description}`, 'blue');
  });

  // Test 2: Search legal documents
  log('\n📋 Test 2: Search legal documents...', 'cyan');
  const searchResponse = await fetch('http://localhost:3002/mcp/tools/search_legal_documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'contract',
      limit: 5
    })
  });
  const searchResults = await searchResponse.json();
  if (searchResults.success) {
    log(`✅ Found ${searchResults.count} documents for "contract"`, 'green');
  } else {
    log(`⚠️ Search result: ${searchResults.error || 'No results'}`, 'yellow');
  }

  // Test 3: Analyze contract (if exists)
  log('\n📋 Test 3: Analyze contract...', 'cyan');
  const contractResponse = await fetch('http://localhost:3002/mcp/tools/analyze_contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_id: 'test-contract-123'
    })
  });
  const contractAnalysis = await contractResponse.json();
  if (contractAnalysis.success) {
    log(`✅ Contract analyzed:`, 'green');
    log(`   Key terms: ${contractAnalysis.analysis.key_terms.join(', ')}`, 'blue');
    log(`   Risks: ${contractAnalysis.analysis.risk_factors.length}`, 'blue');
  } else {
    log(`⚠️ Analysis result: ${contractAnalysis.error}`, 'yellow');
  }
}

async function testLiteLLMProxy() {
  log('\n=== Testing LiteLLM Proxy ===', 'yellow');

  // Test 1: List models
  log('📋 Test 1: List available models...', 'cyan');
  try {
    const modelsResponse = await fetch('http://localhost:4000/v1/models', {
      headers: { 'Authorization': 'Bearer sk-1234' }
    });
    const models = await modelsResponse.json();
    log(`✅ Available models:`, 'green');
    models.data.forEach(model => {
      log(`   - ${model.id}`, 'blue');
    });
  } catch (error) {
    log(`⚠️ LiteLLM not available: ${error.message}`, 'yellow');
  }

  // Test 2: AI completion
  log('\n📋 Test 2: Test AI completion...', 'cyan');
  try {
    const chatResponse = await fetch('http://localhost:4000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-1234'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          { role: 'user', content: 'What are the key elements of a legal contract?' }
        ]
      })
    });
    const chatResult = await chatResponse.json();
    if (chatResult.choices) {
      log(`✅ AI Response:`, 'green');
      log(`   ${chatResult.choices[0].message.content.substring(0, 200)}...`, 'blue');
    }
  } catch (error) {
    log(`⚠️ AI completion error: ${error.message}`, 'yellow');
  }
}

async function testUnifiedEndpoint() {
  log('\n=== Testing Unified API Endpoint ===', 'yellow');

  log('📋 Test: AI chat with automatic tool execution...', 'cyan');
  try {
    const response = await fetch('http://localhost:3002/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Search for contract documents' }
        ],
        use_tools: true
      })
    });
    const result = await response.json();

    log(`✅ Unified response:`, 'green');
    log(`   Tool calls: ${result.tool_calls.length}`, 'blue');
    if (result.tool_calls.length > 0) {
      result.tool_calls.forEach(call => {
        log(`   - ${call.tool}: ${call.result.count || 0} results`, 'magenta');
      });
    }
    if (result.ai_response) {
      log(`   AI: ${result.ai_response.substring(0, 100)}...`, 'cyan');
    }
  } catch (error) {
    log(`⚠️ Unified endpoint error: ${error.message}`, 'yellow');
  }
}

async function testHealthChecks() {
  log('\n=== Health Checks ===', 'yellow');

  // MCP Server
  try {
    const mcpHealth = await fetch('http://localhost:3002/mcp/health');
    const mcpStatus = await mcpHealth.json();
    log(`✅ MCP Server: ${mcpStatus.status}`, 'green');
    log(`   Workers: ${mcpStatus.workers}`, 'blue');
    log(`   Redis: ${mcpStatus.redis}`, 'blue');
    log(`   PostgreSQL: ${mcpStatus.postgres}`, 'blue');
    log(`   SIMD: ${mcpStatus.simd}`, 'blue');
  } catch (error) {
    log(`❌ MCP Server: Not running`, 'red');
  }

  // LiteLLM Proxy
  try {
    const litellmHealth = await fetch('http://localhost:4000/health', {
      headers: { 'Authorization': 'Bearer sk-1234' }
    });
    log(`✅ LiteLLM Proxy: Running`, 'green');
  } catch (error) {
    log(`❌ LiteLLM Proxy: Not running`, 'red');
  }
}

async function main() {
  log('🚀 Starting API Integration Tests...', 'cyan');
  log('', 'blue');

  await testHealthChecks();
  await testMCPTools();
  await testLiteLLMProxy();
  await testUnifiedEndpoint();

  log('\n=== API Integration Tests Complete ===', 'yellow');
  log('📊 Summary:', 'cyan');
  log('   - MCP Tools: Provides legal document search, contract analysis', 'blue');
  log('   - LiteLLM: Routes AI requests to Ollama gemma3-legal', 'blue');
  log('   - Unified API: Combines tools + AI in single endpoint', 'blue');
  log('', 'blue');
  log('🎯 Architecture:', 'cyan');
  log('   SvelteKit → /api/ai/chat → MCP Server → PostgreSQL + LiteLLM', 'magenta');
  log('', 'blue');
}

main().catch(error => {
  log(`❌ Test error: ${error.message}`, 'red');
  process.exit(1);
});

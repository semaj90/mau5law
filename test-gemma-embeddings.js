// Test script for Gemma embeddings with pgvector GPU acceleration

import { PGVECTOR_CONFIG, getDatabaseUrl, getEmbeddingModel, getCudaServiceUrl } from './pgvector-gpu-config.js';

async function testGemmaEmbeddings() {
  console.log('Testing Gemma embeddings with pgvector GPU acceleration...\n');

  // Test 1: Check Ollama service
  console.log('1. Checking Ollama service...');
  try {
    const ollamaResponse = await fetch(`${PGVECTOR_CONFIG.ollama.url}/api/tags`);
    const models = await ollamaResponse.json();
    console.log('   Available models:', models.models?.map(m => m.name).join(', ') || 'None');

    // Check if embeddinggemma is available
    const hasGemma = models.models?.some(m => m.name.includes('embeddinggemma'));
    if (!hasGemma) {
      console.log('   WARNING: embeddinggemma not found. Pulling model...');
      await fetch(`${PGVECTOR_CONFIG.ollama.url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'embeddinggemma:latest' })
      });
    }
  } catch (error) {
    console.error('   ERROR: Ollama service not available:', error.message);
  }

  // Test 2: Generate embedding with Gemma
  console.log('\n2. Generating embedding with Gemma...');
  const testText = "Legal document about intellectual property rights and patent infringement cases.";

  try {
    const embedResponse = await fetch(`${PGVECTOR_CONFIG.ollama.url}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: getEmbeddingModel(),
        input: testText
      })
    });

    const embedResult = await embedResponse.json();
    if (embedResult.embeddings && embedResult.embeddings[0]) {
      console.log(`   Success! Generated ${embedResult.embeddings[0].length}-dimensional embedding`);
      console.log(`   First 5 values: [${embedResult.embeddings[0].slice(0, 5).join(', ')}...]`);
    } else {
      console.error('   ERROR: No embedding returned');
    }
  } catch (error) {
    console.error('   ERROR: Failed to generate embedding:', error.message);
  }

  // Test 3: Check CUDA service
  console.log('\n3. Checking CUDA service...');
  try {
    const cudaHealth = await fetch(getCudaServiceUrl('health'));
    const health = await cudaHealth.json();
    console.log(`   GPU Model: ${health.gpu_model}`);
    console.log(`   CUDA Cores: ${health.cuda_cores}`);
    console.log(`   Tensor Cores: ${health.tensor_cores}`);
    console.log(`   Memory: ${health.memory_gb}GB`);
    console.log(`   Status: ${health.status}`);
  } catch (error) {
    console.error('   ERROR: CUDA service not available:', error.message);
  }

  // Test 4: Perform vector search
  console.log('\n4. Testing vector search with GPU acceleration...');
  try {
    const searchResponse = await fetch(getCudaServiceUrl('search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: "patent litigation and intellectual property disputes",
        limit: 5
      })
    });

    const searchResults = await searchResponse.json();
    console.log(`   Found ${searchResults.count || 0} results`);
    if (searchResults.results && searchResults.results.length > 0) {
      searchResults.results.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Score: ${result.score.toFixed(4)} - ID: ${result.id}`);
      });
    }
  } catch (error) {
    console.error('   ERROR: Search failed:', error.message);
  }

  console.log('\n5. Configuration Summary:');
  console.log('   Database URL:', getDatabaseUrl());
  console.log('   Embedding Model:', getEmbeddingModel());
  console.log('   Vector Dimensions:', PGVECTOR_CONFIG.database.vector.dimensions);
  console.log('   Index Method:', PGVECTOR_CONFIG.database.vector.indexMethod);
  console.log('   GPU Optimization: Enabled');

  console.log('\nTest complete!');
}

// Run the test
testGemmaEmbeddings().catch(console.error);
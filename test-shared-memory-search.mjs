// test-shared-memory-search.mjs
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3002';

async function testSharedMemorySearch() {
  console.log('🧪 Testing Shared Memory Search Pipeline...\n');

  try {
    // 1. Initialize shared index
    console.log('1. Initializing shared memory index...');
    const initResponse = await fetch(`${SERVER_URL}/mcp/simd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'init_shared_index',
        data: { name: 'embeddings' }
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Init failed: ${initResponse.status}`);
    }

    const initResult = await initResponse.json();
    console.log('✅ Shared index initialized:', initResult);

    // 2. Test shared memory search
    console.log('\n2. Testing shared memory search...');
    const testEmbedding = new Array(384).fill(0).map(() => Math.random() - 0.5);

    const searchResponse = await fetch(`${SERVER_URL}/search/shared`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedding: testEmbedding,
        topK: 5
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const searchResult = await searchResponse.json();
    console.log('✅ Shared memory search results:', searchResult);

    // 3. Compare with regular vector search
    console.log('\n3. Comparing with regular vector search...');
    const vectorSearchResponse = await fetch(`${SERVER_URL}/vector-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedding: testEmbedding,
        limit: 5
      })
    });

    if (vectorSearchResponse.ok) {
      const vectorResult = await vectorSearchResponse.json();
      console.log('✅ Regular vector search results:', vectorResult);
    } else {
      console.log('⚠️ Regular vector search not available');
    }

    console.log('\n🎉 Shared memory search test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSharedMemorySearch();
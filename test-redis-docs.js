// Test script to verify Redis documentation API
const fetch = require('node-fetch');

async function testRedisDocsAPI() {
  try {
    // Test IORedis documentation
    const response = await fetch('http://localhost:5173/api/mcp/context72/get-library-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context7CompatibleLibraryID: '/ioredis/ioredis',
        topic: 'connection-patterns',
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ IORedis docs API working');
      console.log('Metadata:', data.metadata);
      console.log('Content preview:', data.content.substring(0, 200) + '...');
      console.log('Snippets count:', data.snippets?.length || 0);
    } else {
      console.log('❌ API not responding, status:', response.status);
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message);
    console.log('Make sure the SvelteKit dev server is running on port 5173');
  }
}

testRedisDocsAPI();
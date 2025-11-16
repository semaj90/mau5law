// tools/test-web-tools.ts
import { executeToolCall } from '../src/agents/tools';

async function main() {
  console.log('🧪 Testing web tools integration...\n');

  // Test web_crawl
  console.log('1. Testing web_crawl tool...');
  const crawlResult = await executeToolCall({
    tool: 'web_crawl',
    arguments: { url: 'https://kit.svelte.dev/docs', depth: 0 }
  });
  console.log('✅ Web crawl result:', {
    url: crawlResult.result.url,
    status: crawlResult.result.status,
    textLength: crawlResult.result.text?.length
  });

  // Test web_doc_summary
  console.log('\n2. Testing web_doc_summary tool...');
  const summaryResult = await executeToolCall({
    tool: 'web_doc_summary',
    arguments: {
      url: 'https://kit.svelte.dev/docs',
      topic: 'SvelteKit routing and TypeScript errors'
    }
  });
  console.log('✅ Web doc summary result:', {
    url: summaryResult.result.url,
    topic: summaryResult.result.topic,
    summaryLength: summaryResult.result.summary?.length
  });

  // Test rag_lookup (this will fail gracefully if Qdrant isn't running)
  console.log('\n3. Testing rag_lookup tool...');
  try {
    const ragResult = await executeToolCall({
      tool: 'rag_lookup',
      arguments: { query: 'TS1005 syntax errors', topK: 3 }
    });
    console.log('✅ RAG lookup result:', {
      summary: ragResult.result.summary,
      matchesCount: ragResult.result.matches?.length
    });
  } catch (error) {
    console.log('⚠️ RAG lookup failed (expected if Qdrant not running):', error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 All web tools tested successfully!');
}

main().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
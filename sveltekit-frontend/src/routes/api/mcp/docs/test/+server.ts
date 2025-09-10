import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  getMessageQueueRedisBestPractices,
  getRabbitMQDocs, 
  getAllRedisDocs,
  getRedisErrorHandling,
  getNodeRedisAdvancedFeatures
} from '$lib/mcp-rabbitmq-redis-docs.js';

export const GET: RequestHandler = async ({ url, fetch }) => {
  try {
    console.log('🔍 Testing MCP library documentation access...');
    
    const topic = url.searchParams.get('topic');
    const results: any = {
      timestamp: new Date().toISOString(),
      success: [],
      errors: []
    };

    // Test 1: Message Queue + Redis Best Practices
    try {
      const practices = await getMessageQueueRedisBestPractices(fetch);
      results.success.push({
        test: 'Message Queue + Redis Best Practices',
        metadata: practices.metadata,
        contentLength: practices.content.length,
        snippetCount: practices.snippets?.length || 0
      });
      console.log('✅ Message Queue + Redis Best Practices loaded');
    } catch (error: any) {
      results.errors.push({
        test: 'Message Queue + Redis Best Practices',
        error: error.message
      });
      console.error('❌ Message Queue + Redis Best Practices failed:', error.message);
    }

    // Test 2: RabbitMQ Integration Patterns
    try {
      const rabbitDocs = await getRabbitMQDocs(topic || 'integration-patterns', fetch);
      results.success.push({
        test: 'RabbitMQ Integration Patterns',
        metadata: rabbitDocs.metadata,
        contentLength: rabbitDocs.content.length,
        snippetCount: rabbitDocs.snippets?.length || 0
      });
      console.log('✅ RabbitMQ Integration Patterns loaded');
    } catch (error: any) {
      results.errors.push({
        test: 'RabbitMQ Integration Patterns',
        error: error.message
      });
      console.error('❌ RabbitMQ Integration Patterns failed:', error.message);
    }

    // Test 3: Redis Error Handling
    try {
      const errorHandling = await getRedisErrorHandling(fetch);
      results.success.push({
        test: 'Redis Error Handling',
        metadata: errorHandling.metadata,
        contentLength: errorHandling.content.length,
        snippetCount: errorHandling.snippets?.length || 0
      });
      console.log('✅ Redis Error Handling patterns loaded');
    } catch (error: any) {
      results.errors.push({
        test: 'Redis Error Handling',
        error: error.message
      });
      console.error('❌ Redis Error Handling failed:', error.message);
    }

    // Test 4: Node Redis Advanced Features
    try {
      const nodeRedis = await getNodeRedisAdvancedFeatures(fetch);
      results.success.push({
        test: 'Node Redis Advanced Features',
        metadata: nodeRedis.metadata,
        contentLength: nodeRedis.content.length,
        snippetCount: nodeRedis.snippets?.length || 0
      });
      console.log('✅ Node Redis Advanced Features loaded');
    } catch (error: any) {
      results.errors.push({
        test: 'Node Redis Advanced Features',
        error: error.message
      });
      console.error('❌ Node Redis Advanced Features failed:', error.message);
    }

    // Test 5: All Redis Documentation (comprehensive test)
    try {
      const allRedis = await getAllRedisDocs(fetch);
      results.success.push({
        test: 'All Redis Documentation',
        libraries: Object.keys(allRedis),
        totalContent: Object.values(allRedis).reduce((acc, doc) => acc + doc.content.length, 0),
        totalSnippets: Object.values(allRedis).reduce((acc, doc) => acc + (doc.snippets?.length || 0), 0)
      });
      console.log('✅ All Redis Documentation loaded');
    } catch (error: any) {
      results.errors.push({
        test: 'All Redis Documentation',
        error: error.message
      });
      console.error('❌ All Redis Documentation failed:', error.message);
    }

    return json({
      status: results.errors.length === 0 ? 'success' : 'partial',
      message: `MCP Documentation Test completed. ${results.success.length} successful, ${results.errors.length} errors`,
      results,
      mcpEndpoint: '/api/mcp/context72/get-library-docs',
      availableTopics: [
        'integration-patterns',
        'error-handling',
        'connection-patterns',
        'pub-sub',
        'transactions',
        'advanced-features',
        'typescript'
      ]
    });

  } catch (error: any) {
    console.error('❌ MCP Documentation test failed:', error);
    return json({
      status: 'error',
      message: `MCP Documentation test failed: ${error.message}`,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
};
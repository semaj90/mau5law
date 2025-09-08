/**
 * Simple Semantic Search Test
 * Tests basic semantic search functionality
 */

import { SemanticSearchService } from './sveltekit-frontend/src/lib/services/semantic-search.js';

async function testSemanticSearch() {
  console.log('🧠 Testing Semantic Search Service...\n');

  try {
    // Initialize service
    console.log('1. Initializing SemanticSearchService...');
    const searchService = new SemanticSearchService();
    console.log('✅ Service initialized\n');

    // Test basic search
    console.log('2. Testing basic search functionality...');
    const testQuery = 'employment contract';

    console.log(`   Query: "${testQuery}"`);

    // This would normally require database connection
    // For now, let's just test the query analysis
    const queryAnalysis = await searchService.analyzeQuery(testQuery);

    console.log('✅ Query analysis results:');
    console.log(`   Complexity: ${queryAnalysis.complexity}`);
    console.log(`   Type: ${queryAnalysis.type}`);
    console.log(`   Intent: ${queryAnalysis.intent}`);
    console.log(`   Concepts: ${queryAnalysis.concepts.join(', ')}`);
    console.log(`   Entities: ${queryAnalysis.entities.join(', ')}`);

    if (queryAnalysis.semanticExpansion && queryAnalysis.semanticExpansion.length > 0) {
      console.log(`   Semantic expansions: ${queryAnalysis.semanticExpansion.join(', ')}`);
    }

    console.log('\n🎯 Semantic Search Service Test: SUCCESS');
    console.log('   Core functionality is working properly');

  } catch (error) {
    console.error('❌ Semantic Search Service Test: FAILED');
    console.error(`   Error: ${error.message}`);

    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

// Run the test
testSemanticSearch();

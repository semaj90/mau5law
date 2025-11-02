/**
 * Test Enhanced Neo4j Search Integration
 * Demonstrates all search capabilities with real services
 */

import EnhancedNeo4jSearchIntegration from './enhanced-neo4j-search-integration.js';

async function testEnhancedSearch() {
  console.log('🚀 Testing Enhanced Neo4j Search Integration...\n');

  const searchEngine = new EnhancedNeo4jSearchIntegration();

  try {
    // Initialize all services
    await searchEngine.initialize();

    // Demonstrate comprehensive search capabilities
    await searchEngine.demonstrateSearchCapabilities();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedSearch();
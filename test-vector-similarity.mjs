#!/usr/bin/env node

/**
 * Test Vector Similarity Search with pgvector Integration
 * Creates proper 1536-dimensional embeddings and tests similarity search
 */

async function generateMockEmbedding(text) {
  // Use text content to create deterministic but varied embeddings
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding = [];

  for (let i = 0; i < 1536; i++) {
    // Create deterministic but realistic-looking embedding values
    const value = Math.sin(seed + i * 0.1) * Math.cos(seed + i * 0.05);
    embedding.push(Number(value.toFixed(6)));
  }

  return embedding;
}

async function testVectorSimilaritySearch() {
  console.log('🔍 Testing Vector Similarity Search with pgvector');
  console.log('================================================\n');

  const testQueries = [
    'contract agreement liability terms',
    'employment salary benefits',
    'lease rental property tenant',
    'license software intellectual property'
  ];

  for (const [index, query] of testQueries.entries()) {
    console.log(`Test ${index + 1}: "${query}"`);

    try {
      // Generate embedding for query
      const queryEmbedding = await generateMockEmbedding(query);
      console.log(`✓ Generated ${queryEmbedding.length}D embedding`);

      // Prepare request body
      const body = JSON.stringify({
        queryEmbedding,
        options: {
          limit: 3,
          threshold: 0.5,
          metric: 'cosine'
        }
      });

      // Make request to similarity search endpoint
      const response = await fetch('http://localhost:5173/api/pgvector/test?action=search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✓ Search successful - found ${result.results?.length || 0} matches`);
        console.log(`  Response time: ${result.responseTime}`);

        if (result.results && result.results.length > 0) {
          result.results.forEach((match, i) => {
            console.log(`  Match ${i + 1}: ${match.metadata?.title || match.document_id}`);
            console.log(`    Similarity: ${match.similarity?.toFixed(4) || 'N/A'}`);
            console.log(`    Type: ${match.metadata?.type || 'Unknown'}`);
          });
        }
      } else {
        console.log(`✗ Search failed: ${result.error}`);
      }

    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }

    console.log('---\n');
  }
}

async function testConnectionFirst() {
  console.log('🔌 Testing pgvector connection...');

  try {
    const response = await fetch('http://localhost:5173/api/pgvector/test?action=connection');
    const result = await response.json();

    if (result.success) {
      console.log('✓ pgvector connection successful');
      console.log(`  PostgreSQL version: ${result.postgresVersion}`);
      console.log(`  pgvector version: ${result.pgvectorVersion}`);
      return true;
    } else {
      console.log(`✗ Connection failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log(`✗ Connection error: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 pgvector Integration Test Suite');
  console.log('==================================\n');

  // Test connection first
  const connectionOk = await testConnectionFirst();
  if (!connectionOk) {
    console.log('❌ Cannot proceed without working pgvector connection');
    process.exit(1);
  }

  console.log('\n');

  // Run similarity search tests
  await testVectorSimilaritySearch();

  console.log('🎯 Test suite completed!');
}

main().catch(console.error);

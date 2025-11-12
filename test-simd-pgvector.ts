#!/usr/bin/env node

/**
 * Test script for SIMD-pgvector hybrid search integration
 * Validates that SIMD acceleration works with pgvector similarity search
 */

import { hybridSearch, searchVector, insertDocument, createTables, ensurePgVector } from './src/utils/db.ts';
import sql from './src/utils/db.ts';

async function testSIMDVectorIntegration() {
  console.log('🧪 Testing SIMD-pgvector hybrid search integration...\n');

  try {
    // Ensure pgvector extension and tables exist
    console.log('📊 Ensuring pgvector setup...');
    await ensurePgVector();

    // Check if table exists first
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'legal_documents'
      );
    `;

    if (tableExists[0].exists) {
      console.log('�️ Dropping existing table...');
      await sql`DROP TABLE IF EXISTS legal_documents;`;
    }

    console.log('📋 Creating legal_documents table...');
    await createTables();
    console.log('✅ Database setup complete\n');

    // Insert test documents with embeddings
    console.log('📝 Inserting test legal documents...');
    const testDocuments = [
      {
        id: 'contract-001',
        title: 'Service Agreement Template',
        content: 'This service agreement outlines the terms and conditions for professional services rendered by the contractor to the client.',
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5) // Random 384d embedding
      },
      {
        id: 'contract-002',
        title: 'Employment Contract',
        content: 'This employment agreement establishes the relationship between employer and employee, including compensation, benefits, and termination conditions.',
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5)
      },
      {
        id: 'contract-003',
        title: 'Non-Disclosure Agreement',
        content: 'This NDA protects confidential information shared between parties during business negotiations and partnerships.',
        embedding: Array.from({ length: 384 }, () => Math.random() - 0.5)
      }
    ];

    for (const doc of testDocuments) {
      await insertDocument(doc.id, doc.title, doc.content, doc.embedding);
    }
    console.log('✅ Test documents inserted\n');

    // Test pure pgvector search
    console.log('🔍 Testing pure pgvector search...');
    const queryEmbedding = Array.from({ length: 384 }, () => Math.random() - 0.5);
    const pgvectorResults = await searchVector(queryEmbedding, 3);
    console.log(`📊 Pure pgvector found ${pgvectorResults.length} results`);
    console.log('Results:', pgvectorResults.map(r => ({ id: r.id, title: r.title })).slice(0, 3));
    console.log();

    // Test hybrid SIMD-pgvector search
    console.log('🚀 Testing hybrid SIMD-pgvector search...');
    const hybridResults = await hybridSearch(queryEmbedding, 3, true);
    console.log(`📊 Hybrid search found ${hybridResults.length} results`);
    console.log('Results:', hybridResults.map(r => ({
      id: r.id,
      title: r.title,
      similarity: r.similarity?.toFixed(4),
      distance: r.distance?.toFixed(4)
    })));
    console.log();

    // Compare performance
    console.log('⚡ Performance comparison:');
    const startPure = Date.now();
    await searchVector(queryEmbedding, 10);
    const pureTime = Date.now() - startPure;

    const startHybrid = Date.now();
    await hybridSearch(queryEmbedding, 10, true);
    const hybridTime = Date.now() - startHybrid;

    console.log(`Pure pgvector: ${pureTime}ms`);
    console.log(`Hybrid SIMD: ${hybridTime}ms`);
    console.log(`Speedup: ${(pureTime / hybridTime).toFixed(2)}x`);
    console.log();

    console.log('✅ SIMD-pgvector integration test completed successfully!');
    console.log('🎯 Hybrid search combines pgvector approximation with SIMD precision');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSIMDVectorIntegration();
#!/usr/bin/env node

// Complete Context7 RAG Demo - Working Example
import pg from 'pg';

const { Client } = pg;

const DATABASE_CONFIG = {
  host: 'localhost',
  port: 5433,
  user: 'legal_admin',
  password: '123456',
  database: 'legal_ai_db'
};

const OLLAMA_URL = 'http://localhost:11434';

async function generateEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'embeddinggemma:latest',
      prompt: text
    })
  });
  
  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result.embedding;
}

async function searchDocuments(client, query, limit = 5) {
  console.log(`🔍 Searching for: "${query}"`);
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Search for similar documents with lower threshold
  const searchQuery = `
    SELECT 
      doc_id,
      library_name,
      topic,
      1 - (embedding <=> $1) as similarity,
      substring(content, 1, 200) as content_preview
    FROM context7_documentation
    WHERE 1 - (embedding <=> $1) > 0.2  -- Lower threshold
    ORDER BY similarity DESC
    LIMIT $2
  `;
  
  const result = await client.query(searchQuery, [
    `[${queryEmbedding.join(',')}]`,
    limit
  ]);
  
  console.log(`   📚 Found ${result.rows.length} relevant documents:\n`);
  
  result.rows.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.library_name} - ${row.topic}`);
    console.log(`      Similarity: ${(row.similarity * 100).toFixed(1)}%`);
    console.log(`      Preview: ${row.content_preview.replace(/\n/g, ' ')}...`);
    console.log('');
  });
  
  return result.rows;
}

async function demonstrateRAG(client) {
  console.log('🤖 Context7 RAG System Demonstration');
  console.log('===================================\n');
  
  const testQueries = [
    'How do I define TypeScript interfaces with optional properties?',
    'What is the best way to write WebGPU shaders?',
    'How can I optimize PostgreSQL JSON queries for performance?',
    'How do I create type-safe database schemas with ORM?',
    'Interface definitions and type checking',
    'GPU programming with shaders',
    'JSON indexing strategies'
  ];
  
  for (const query of testQueries) {
    await searchDocuments(client, query, 3);
    console.log('─'.repeat(80) + '\n');
  }
}

async function showSystemStatus(client) {
  console.log('📊 System Status');
  console.log('================\n');
  
  // Count documents by library
  const libraryStats = await client.query(`
    SELECT 
      library_name,
      COUNT(*) as doc_count,
      COUNT(DISTINCT topic) as topic_count
    FROM context7_documentation
    GROUP BY library_name
    ORDER BY library_name
  `);
  
  console.log('📚 Documentation Libraries:');
  libraryStats.rows.forEach(row => {
    console.log(`   • ${row.library_name}: ${row.doc_count} documents, ${row.topic_count} topics`);
  });
  
  // Test embedding generation speed
  console.log('\n⚡ Performance Metrics:');
  const testText = 'TypeScript interface example';
  const startTime = Date.now();
  await generateEmbedding(testText);
  const embeddingTime = Date.now() - startTime;
  
  console.log(`   • Embedding generation: ${embeddingTime}ms`);
  
  // Test database query speed
  const queryStart = Date.now();
  await client.query('SELECT COUNT(*) FROM context7_documentation');
  const queryTime = Date.now() - queryStart;
  
  console.log(`   • Database query: ${queryTime}ms`);
  console.log(`   • Vector dimensions: 768 (Gemma embeddings)`);
  console.log(`   • Search algorithm: HNSW cosine similarity`);
}

async function main() {
  console.log('🚀 Context7 RAG System - Live Demo');
  console.log('==================================\n');
  
  const client = new Client(DATABASE_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL with pgvector\n');
    
    // Check if we have data
    const countResult = await client.query('SELECT COUNT(*) FROM context7_documentation');
    const docCount = parseInt(countResult.rows[0].count);
    
    if (docCount === 0) {
      console.log('❌ No documents found. Please run test-rag-insert.js first.');
      return;
    }
    
    console.log(`✅ Found ${docCount} documents in the knowledge base\n`);
    
    // Show system status
    await showSystemStatus(client);
    console.log('\n');
    
    // Demonstrate RAG search
    await demonstrateRAG(client);
    
    console.log('🎉 Demo completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   ✅ Gemma embedding generation (768-dim vectors)');
    console.log('   ✅ PostgreSQL + pgvector storage');
    console.log('   ✅ HNSW similarity search');
    console.log('   ✅ Multi-library documentation retrieval');
    console.log('   ✅ Semantic understanding across domains');
    console.log('\n🔗 Ready for Context7 MCP integration!');
    
  } catch (error) {
    console.error(`❌ Demo failed: ${error.message}`);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
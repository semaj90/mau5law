#!/usr/bin/env node

// Direct Database Test for PostgreSQL + pgvector
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, serial, text, timestamp, vector } from 'drizzle-orm/pg-core';
import { eq, desc, sql } from 'drizzle-orm';
import pkg from 'pg';
const { Client } = pkg;

// Define test tables
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  userId: serial('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 768 }),
  caseId: serial('case_id').references(() => cases.id),
  createdAt: timestamp('created_at').defaultNow()
});

async function testDatabase() {
  console.log('🧪 Starting Direct Database Test...\n');
  
  try {
    // Connect to PostgreSQL
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'legal_ai_db',
      user: 'legal_ai_user',
      password: '123456'
    });
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    const db = drizzle(client);
    
    // Test 1: Create a test user
    console.log('\n📋 Test 1: Creating test user...');
    const testUser = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password_123'
    }).returning();
    
    console.log('✅ User created:', testUser[0]);
    
    // Test 2: Create a test case
    console.log('\n📋 Test 2: Creating test case...');
    const testCase = await db.insert(cases).values({
      title: 'Playwright Test Case',
      description: 'Test case created by automated testing',
      userId: testUser[0].id
    }).returning();
    
    console.log('✅ Case created:', testCase[0]);
    
    // Test 3: Generate and store embedding
    console.log('\n📋 Test 3: Creating vector embedding...');
    
    // Generate a test embedding (768 dimensions for nomic-embed-text)
    const testEmbedding = Array(768).fill(0).map(() => (Math.random() - 0.5) * 2);
    
    // Call our embedding API to get a real embedding
    let realEmbedding = testEmbedding;
    try {
      const embedResponse = await fetch('http://localhost:8093/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['This is a legal document about contract law and evidence procedures'],
          model: 'nomic-embed-text'
        })
      });
      
      if (embedResponse.ok) {
        const embedData = await embedResponse.json();
        if (embedData.vectors && embedData.vectors.length > 0) {
          realEmbedding = embedData.vectors[0];
          console.log('✅ Generated real embedding via API');
        }
      }
    } catch (error) {
      console.log('⚠️ Using mock embedding (API not available)');
    }
    
    const testEmbeddingRecord = await db.insert(embeddings).values({
      content: 'Legal document about contract law and evidence procedures',
      embedding: realEmbedding,
      caseId: testCase[0].id
    }).returning();
    
    console.log('✅ Embedding stored:', { 
      id: testEmbeddingRecord[0].id, 
      dimensions: realEmbedding.length,
      content_preview: testEmbeddingRecord[0].content.substring(0, 50) + '...'
    });
    
    // Test 4: Vector similarity search
    console.log('\n📋 Test 4: Testing vector similarity search...');
    
    // Create a query vector (similar to the stored one)
    const queryVector = realEmbedding.map(v => v + (Math.random() - 0.5) * 0.1);
    
    const similarityResults = await db.execute(sql`
      SELECT 
        id, 
        content,
        case_id,
        1 - (embedding <=> ${queryVector}::vector) AS similarity
      FROM embeddings
      WHERE 1 - (embedding <=> ${queryVector}::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `);
    
    console.log('✅ Vector similarity search results:');
    similarityResults.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Similarity: ${(row.similarity * 100).toFixed(2)}% - ${row.content.substring(0, 50)}...`);
    });
    
    // Test 5: Verify pgvector functions work
    console.log('\n📋 Test 5: Testing pgvector operations...');
    
    const vectorOpsResult = await db.execute(sql`
      SELECT 
        '${realEmbedding}::vector <-> ${queryVector}::vector' as euclidean_distance,
        '${realEmbedding}::vector <=> ${queryVector}::vector' as cosine_distance,
        '${realEmbedding}::vector <#> ${queryVector}::vector' as inner_product
    `);
    
    console.log('✅ pgvector operations:');
    console.log('   Euclidean distance:', vectorOpsResult.rows[0].euclidean_distance);
    console.log('   Cosine distance:', vectorOpsResult.rows[0].cosine_distance);  
    console.log('   Inner product:', vectorOpsResult.rows[0].inner_product);
    
    // Test 6: Clean up test data
    console.log('\n📋 Test 6: Cleaning up test data...');
    
    await db.delete(embeddings).where(eq(embeddings.caseId, testCase[0].id));
    await db.delete(cases).where(eq(cases.id, testCase[0].id));
    await db.delete(users).where(eq(users.id, testUser[0].id));
    
    console.log('✅ Test data cleaned up');
    
    await client.end();
    console.log('\n🎉 All database tests passed successfully!');
    
    return {
      success: true,
      tests_passed: 6,
      user_created: testUser[0],
      case_created: testCase[0],
      embedding_stored: testEmbeddingRecord[0],
      similarity_results: similarityResults.rows.length,
      pgvector_operational: true
    };
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return {
      success: false,
      error: error.message,
      pgvector_operational: false
    };
  }
}

// Run the test
testDatabase().then(result => {
  console.log('\n📊 Test Summary:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
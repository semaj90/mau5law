#!/usr/bin/env node
/**
 * Phase 79: Knowledge Base Database Setup
 *
 * Creates PostgreSQL table for knowledge base metadata
 * Ensures Qdrant collection for vector storage exists
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/legal_ai_db');
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

async function setupDatabase() {
  console.log('🔧 Setting up Knowledge Base...\n');

  try {
    // Create PostgreSQL table for metadata
    console.log('1️⃣  Creating PostgreSQL table...');
    await sql`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        doc_name VARCHAR(255) NOT NULL,
        chunk_idx INTEGER NOT NULL,
        content TEXT NOT NULL,
        source VARCHAR(100),
        embedding_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('   ✅ Table created\n');

    // Create index on embedding_id for fast lookups
    console.log('2️⃣  Creating indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_embedding_id ON knowledge_base(embedding_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_doc_name ON knowledge_base(doc_name);
      CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_base(source);
    `;
    console.log('   ✅ Indexes created\n');

    // Ensure Qdrant collection
    console.log('3️⃣  Checking Qdrant collection...');
    try {
      const collection = await qdrant.getCollection('knowledge_base');
      console.log(`   ℹ️  Collection exists: ${collection.points_count} vectors\n`);
    } catch {
      console.log('   📝 Creating collection...');
      await qdrant.createCollection('knowledge_base', {
        vectors: {
          size: 768,
          distance: 'Cosine'
        }
      });
      console.log('   ✅ Collection created\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Knowledge Base Setup Complete\n');
    console.log('📊 Stats:');
    console.log('   PostgreSQL: legal_ai_db.knowledge_base');
    console.log('   Qdrant: knowledge_base collection (768-dim, Cosine)');
    console.log('   Status: Ready for document ingestion\n');

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

setupDatabase();

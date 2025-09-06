/**
 * Database Setup Script for Unified Vector Systems
 * Ensures all required tables, indexes, and extensions are properly configured
 */

import { db } from './drizzle';
import { sql } from 'drizzle-orm';

export interface DatabaseSetupResult {
  success: boolean;
  steps: Array<{
    step: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: string;
}

export async function setupDatabase(): Promise<DatabaseSetupResult> {
  console.log('🚀 Setting up database for Unified Vector Systems...');
  
  const steps: DatabaseSetupResult['steps'] = [];
  
  try {
    // Step 1: Enable required extensions
    console.log('Step 1: Enabling PostgreSQL extensions...');
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`);
      steps.push({ step: 'Enable extensions', success: true });
    } catch (error: any) {
      steps.push({ step: 'Enable extensions', success: false, error: error.message });
    }

    // Step 2: Create core tables for vector operations
    console.log('Step 2: Creating vector tables...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS embedding_cache (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          text_hash TEXT UNIQUE NOT NULL,
          embedding vector(768) NOT NULL,
          model TEXT NOT NULL DEFAULT 'nomic-embed-text',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 1
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS vector_metadata (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          document_id TEXT UNIQUE NOT NULL,
          collection_name TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          content_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      steps.push({ step: 'Create vector tables', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create vector tables', success: false, error: error.message });
    }

    // Step 3: Create legal document tables
    console.log('Step 3: Creating legal document tables...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS legal_documents (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          document_type TEXT CHECK (document_type IN ('CONTRACT', 'CASE_LAW', 'STATUTE', 'EVIDENCE', 'PRECEDENT', 'REGULATION')),
          embedding vector(768),
          metadata JSONB DEFAULT '{}'::jsonb,
          pagerank_score DECIMAL(10,6) DEFAULT 1.0,
          positive_votes INTEGER DEFAULT 0,
          negative_votes INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS document_relationships (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          from_document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
          to_document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
          relationship_type TEXT NOT NULL CHECK (relationship_type IN ('cites', 'references', 'contradicts', 'supports')),
          weight DECIMAL(5,3) DEFAULT 1.0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(from_document_id, to_document_id, relationship_type)
        )
      `);

      steps.push({ step: 'Create legal document tables', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create legal document tables', success: false, error: error.message });
    }

    // Step 4: Create glyph and visualization tables
    console.log('Step 4: Creating glyph and visualization tables...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS generated_glyphs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          evidence_id TEXT NOT NULL,
          prompt TEXT NOT NULL,
          style TEXT NOT NULL,
          dimensions INTEGER[] NOT NULL,
          image_url TEXT,
          tensor_data BYTEA,
          metadata JSONB DEFAULT '{}'::jsonb,
          generation_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS som_clusters (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          cluster_id TEXT NOT NULL,
          node_position POINT NOT NULL,
          weights vector(768) NOT NULL,
          pattern_count INTEGER DEFAULT 0,
          activation_count INTEGER DEFAULT 0,
          last_activation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          associated_documents TEXT[] DEFAULT ARRAY[]::TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      steps.push({ step: 'Create glyph and visualization tables', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create glyph and visualization tables', success: false, error: error.message });
    }

    // Step 5: Create user and session tracking tables
    console.log('Step 5: Creating user and session tables...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          query_text TEXT,
          results_count INTEGER DEFAULT 0,
          processing_time_ms INTEGER DEFAULT 0,
          confidence_score DECIMAL(5,3) DEFAULT 0,
          components_used TEXT[] DEFAULT ARRAY[]::TEXT[],
          feedback_score INTEGER CHECK (feedback_score IN (-1, 0, 1)),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS recommendation_patterns (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id TEXT NOT NULL,
          pattern_features vector(50) NOT NULL,
          som_node_id TEXT,
          pattern_metadata JSONB DEFAULT '{}'::jsonb,
          success_rating DECIMAL(3,2) DEFAULT 0.5,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      steps.push({ step: 'Create user and session tables', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create user and session tables', success: false, error: error.message });
    }

    // Step 6: Create performance monitoring tables
    console.log('Step 6: Creating performance monitoring tables...');
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS system_performance (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          component_name TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          processing_time_ms INTEGER NOT NULL,
          memory_usage_mb INTEGER,
          gpu_utilization DECIMAL(5,2),
          cache_hit_ratio DECIMAL(5,3),
          error_count INTEGER DEFAULT 0,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      steps.push({ step: 'Create performance monitoring tables', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create performance monitoring tables', success: false, error: error.message });
    }

    // Step 7: Create essential indexes
    console.log('Step 7: Creating database indexes...');
    try {
      // Vector similarity indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_embedding_cache_vector 
        ON embedding_cache USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_legal_documents_vector 
        ON legal_documents USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
      `);

      // Text search indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_legal_documents_content_gin 
        ON legal_documents USING gin (to_tsvector('english', content))
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_legal_documents_metadata_gin 
        ON legal_documents USING gin (metadata)
      `);

      // Performance indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash 
        ON embedding_cache (text_hash)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_vector_metadata_document_id 
        ON vector_metadata (document_id)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
        ON user_sessions (user_id, created_at)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_system_performance_component 
        ON system_performance (component_name, recorded_at)
      `);

      steps.push({ step: 'Create database indexes', success: true });
    } catch (error: any) {
      steps.push({ step: 'Create database indexes', success: false, error: error.message });
    }

    // Step 8: Insert sample data for testing
    console.log('Step 8: Inserting sample data...');
    try {
      // Insert sample legal documents
      await db.execute(sql`
        INSERT INTO legal_documents (id, title, content, document_type, metadata)
        VALUES 
          ('sample_contract_1', 'Employment Contract Template', 
           'This employment agreement is entered into between Company and Employee. The Employee agrees to work full-time and maintain confidentiality of all company information.',
           'CONTRACT', 
           '{"category": "employment", "jurisdiction": "US", "complexity": "standard"}'::jsonb),
          ('sample_case_1', 'Contract Dispute - Smith v. Johnson',
           'In this case, the court found that ambiguous contract terms must be interpreted in favor of the non-drafting party. The plaintiff successfully argued that the termination clause was unclear.',
           'CASE_LAW',
           '{"court": "Superior Court", "year": 2023, "precedent_value": "high"}'::jsonb),
          ('sample_statute_1', 'Employment Standards Act Section 12',
           'An employer must provide written notice of termination or pay in lieu thereof. The notice period depends on length of employment and position level.',
           'STATUTE',
           '{"jurisdiction": "Canada", "section": "12", "last_amended": "2023"}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `);

      // Insert sample document relationships
      await db.execute(sql`
        INSERT INTO document_relationships (from_document_id, to_document_id, relationship_type, weight)
        VALUES 
          ('sample_contract_1', 'sample_case_1', 'references', 0.8),
          ('sample_case_1', 'sample_statute_1', 'cites', 0.9),
          ('sample_contract_1', 'sample_statute_1', 'supports', 0.7)
        ON CONFLICT (from_document_id, to_document_id, relationship_type) DO NOTHING
      `);

      steps.push({ step: 'Insert sample data', success: true });
    } catch (error: any) {
      steps.push({ step: 'Insert sample data', success: false, error: error.message });
    }

    console.log('✅ Database setup completed successfully!');

    return {
      success: steps.every(step => step.success),
      steps,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    return {
      success: false,
      steps: [...steps, { step: 'Overall setup', success: false, error: error.message }],
      timestamp: new Date().toISOString()
    };
  }
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  extensionsEnabled: boolean;
  indexesReady: boolean;
  sampleDataPresent: boolean;
}> {
  try {
    // Check connection
    await db.execute(sql`SELECT 1`);
    const connected = true;

    // Check if main tables exist
    const tablesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name IN ('legal_documents', 'embedding_cache', 'vector_metadata', 'som_clusters')
    `);
    const tablesExist = Number(tablesResult.rows[0].count) >= 4;

    // Check if vector extension is enabled
    const extensionsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'vector'
    `);
    const extensionsEnabled = Number(extensionsResult.rows[0].count) > 0;

    // Check if indexes exist
    const indexesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM pg_indexes 
      WHERE indexname LIKE 'idx_%' AND tablename LIKE '%legal_documents%' OR tablename LIKE '%embedding_cache%'
    `);
    const indexesReady = Number(indexesResult.rows[0].count) > 0;

    // Check if sample data exists
    const sampleDataResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM legal_documents WHERE id LIKE 'sample_%'
    `);
    const sampleDataPresent = Number(sampleDataResult.rows[0].count) > 0;

    return {
      connected,
      tablesExist,
      extensionsEnabled,
      indexesReady,
      sampleDataPresent
    };

  } catch (error) {
    return {
      connected: false,
      tablesExist: false,
      extensionsEnabled: false,
      indexesReady: false,
      sampleDataPresent: false
    };
  }
}

export async function getDatabaseStats(): Promise<{
  documentCount: number;
  embeddingCacheSize: number;
  glyphCount: number;
  sessionCount: number;
  performanceRecords: number;
}> {
  try {
    const results = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM legal_documents`),
      db.execute(sql`SELECT COUNT(*) as count FROM embedding_cache`),
      db.execute(sql`SELECT COUNT(*) as count FROM generated_glyphs`),
      db.execute(sql`SELECT COUNT(*) as count FROM user_sessions`),
      db.execute(sql`SELECT COUNT(*) as count FROM system_performance`)
    ]);

    return {
      documentCount: Number(results[0].rows[0].count),
      embeddingCacheSize: Number(results[1].rows[0].count),
      glyphCount: Number(results[2].rows[0].count),
      sessionCount: Number(results[3].rows[0].count),
      performanceRecords: Number(results[4].rows[0].count)
    };

  } catch (error) {
    return {
      documentCount: 0,
      embeddingCacheSize: 0,
      glyphCount: 0,
      sessionCount: 0,
      performanceRecords: 0
    };
  }
}
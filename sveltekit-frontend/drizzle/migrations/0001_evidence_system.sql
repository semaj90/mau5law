-- Evidence System Schema Migration
-- Creates tables for evidence files, chunks, and embeddings
-- Includes pgvector extension and HNSW indexes for semantic search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Evidence Files Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  minio_path VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  processing_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  processing_error TEXT,
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Evidence Files Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_files_case_id ON evidence_files(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_status ON evidence_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_files_case_status ON evidence_files(case_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_evidence_files_created_at ON evidence_files(created_at DESC);

-- ============================================================================
-- Evidence Chunks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  section_title VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Evidence Chunks Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_evidence_id ON evidence_chunks(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_page_number ON evidence_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_evidence_page ON evidence_chunks(evidence_id, page_number);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_fulltext
ON evidence_chunks USING gin(to_tsvector('english', content));

-- ============================================================================
-- Evidence Embeddings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES evidence_chunks(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  embedding_model VARCHAR(100) DEFAULT 'legal-bert',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Evidence Embeddings Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_chunk_id ON evidence_embeddings(chunk_id);

-- HNSW index for vector similarity search (fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_embedding_hnsw
ON evidence_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- Verify Schema
-- ============================================================================

-- List all created tables
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('evidence_files', 'evidence_chunks', 'evidence_embeddings')
ORDER BY tablename;

-- List all created indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('evidence_files', 'evidence_chunks', 'evidence_embeddings')
ORDER BY tablename, indexname;

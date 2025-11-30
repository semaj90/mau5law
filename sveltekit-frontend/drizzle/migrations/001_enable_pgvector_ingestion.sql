-- Migration: Enable pgvector and create enhanced ingestion schema
-- PostgreSQL 17 + pgvector extension
-- Run with: psql -U legal_admin -d legal_ai_db -f drizzle/migrations/001_enable_pgvector_ingestion.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enums
CREATE TYPE IF NOT EXISTS processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'queued');
CREATE TYPE IF NOT EXISTS chunk_level AS ENUM ('sentence', 'paragraph', 'page', 'section', 'document');

-- Ingested documents table
CREATE TABLE IF NOT EXISTS ingested_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File metadata
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  content_hash VARCHAR(64) NOT NULL UNIQUE,

  -- MinIO storage
  minio_object VARCHAR(500) NOT NULL,
  minio_bucket VARCHAR(100) NOT NULL DEFAULT 'legal-documents',
  minio_url TEXT,

  -- OCR & Processing
  needs_ocr BOOLEAN DEFAULT FALSE NOT NULL,
  ocr_status processing_status DEFAULT 'pending',
  ocr_completed_at TIMESTAMPTZ,
  ocr_metadata JSONB,

  -- Content
  extracted_text TEXT,
  text_length INTEGER,

  -- Embeddings
  embedding_status processing_status DEFAULT 'pending',
  embedding_model VARCHAR(100),
  embedding_completed_at TIMESTAMPTZ,

  -- Qdrant mirror
  qdrant_id UUID,
  qdrant_collection VARCHAR(100) DEFAULT 'legal_documents',
  last_synced_to_qdrant TIMESTAMPTZ,

  -- References
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}' NOT NULL,
  processing_errors JSONB DEFAULT '[]' NOT NULL,

  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Document chunks with pgvector embeddings (384 dimensions for embeddinggemma)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document reference
  document_id UUID NOT NULL REFERENCES ingested_documents(id) ON DELETE CASCADE,

  -- Chunk metadata
  chunk_index INTEGER NOT NULL,
  level chunk_level DEFAULT 'paragraph' NOT NULL,
  text TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  tokens INTEGER NOT NULL,

  -- Vector embedding (384 dimensions for embeddinggemma:latest)
  embedding vector(384) NOT NULL,
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'embeddinggemma:latest',

  -- Position in document
  start_position INTEGER,
  end_position INTEGER,
  page_number INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}' NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Embedding cache for deduplication
CREATE TABLE IF NOT EXISTS embedding_cache_enhanced (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash VARCHAR(64) NOT NULL UNIQUE,
  text TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  model VARCHAR(100) NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 384,
  hit_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- OCR processing queue
CREATE TABLE IF NOT EXISTS ocr_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ingested_documents(id) ON DELETE CASCADE,
  status processing_status DEFAULT 'queued' NOT NULL,
  priority INTEGER DEFAULT 5 NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  error TEXT,
  result JSONB,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Vector search logs
CREATE TABLE IF NOT EXISTS vector_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  query_embedding vector(384),
  results_count INTEGER NOT NULL,
  top_result_id UUID,
  top_similarity REAL,
  search_duration_ms INTEGER,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Document summaries
CREATE TABLE IF NOT EXISTS document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ingested_documents(id) ON DELETE CASCADE,
  summary_type VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]' NOT NULL,
  model VARCHAR(100) NOT NULL,
  confidence REAL,
  generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ingested_docs_content_hash ON ingested_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_ingested_docs_case_id ON ingested_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_ingested_docs_uploaded_by ON ingested_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_ingested_docs_ocr_status ON ingested_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_ingested_docs_embedding_status ON ingested_documents(embedding_status);
CREATE INDEX IF NOT EXISTS idx_ingested_docs_created_at ON ingested_documents(created_at);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_text_hash ON document_chunks(text_hash);

-- HNSW index for fast vector similarity search (cosine distance)
-- This is the KEY index for pgvector performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_text_hash ON embedding_cache_enhanced(text_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_model ON embedding_cache_enhanced(model);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_last_used ON embedding_cache_enhanced(last_used_at);

CREATE INDEX IF NOT EXISTS idx_ocr_queue_document_id ON ocr_processing_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_status ON ocr_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_priority ON ocr_processing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_created_at ON ocr_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_vector_search_logs_user_id ON vector_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vector_search_logs_created_at ON vector_search_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_summaries_type ON document_summaries(summary_type);

-- Verification query
SELECT
  'pgvector enabled' as status,
  (SELECT count(*) FROM ingested_documents) as total_documents,
  (SELECT count(*) FROM document_chunks) as total_chunks;

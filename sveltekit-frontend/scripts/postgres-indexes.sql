-- PostgreSQL Indexes for Evidence System
-- Run this script to create all necessary indexes for optimal performance

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Evidence Files Indexes
-- ============================================================================

-- Index for case-scoped queries
CREATE INDEX IF NOT EXISTS idx_evidence_files_case_id
ON evidence_files(case_id);

-- Index for processing status filtering
CREATE INDEX IF NOT EXISTS idx_evidence_files_status
ON evidence_files(processing_status);

-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_evidence_files_uploaded_by
ON evidence_files(uploaded_by);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_evidence_files_case_status
ON evidence_files(case_id, processing_status);

-- ============================================================================
-- Evidence Chunks Indexes
-- ============================================================================

-- Index for chunk retrieval by evidence
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_evidence_id
ON evidence_chunks(evidence_id);

-- Index for page-based queries
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_page_number
ON evidence_chunks(page_number);

-- Composite index for evidence + page queries
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_evidence_page
ON evidence_chunks(evidence_id, page_number);

-- ============================================================================
-- Evidence Embeddings Indexes
-- ============================================================================

-- Index for chunk-based queries
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_chunk_id
ON evidence_embeddings(chunk_id);

-- HNSW index for vector similarity search (fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_embedding_hnsw
ON evidence_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (if HNSW is not available)
-- CREATE INDEX IF NOT EXISTS idx_evidence_embeddings_embedding_ivfflat
-- ON evidence_embeddings USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- ============================================================================
-- Full-Text Search Indexes
-- ============================================================================

-- Full-text search on evidence chunks
CREATE INDEX IF NOT EXISTS idx_evidence_chunks_fulltext
ON evidence_chunks USING gin(to_tsvector('english', content));

-- ============================================================================
-- Performance Optimization Indexes
-- ============================================================================

-- Index for recent uploads
CREATE INDEX IF NOT EXISTS idx_evidence_files_created_at
ON evidence_files(created_at DESC);

-- Index for metadata queries
CREATE INDEX IF NOT EXISTS idx_evidence_files_metadata_gin
ON evidence_files USING gin(metadata jsonb_path_ops);

-- ============================================================================
-- Verify Indexes
-- ============================================================================

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

-- Database Indexes Optimization for Legal AI Platform
-- Optimized for Gemma embeddings, detective connections, and case management performance
-- PostgreSQL with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- CORE ENTITY INDEXES
-- =============================================================================

-- Cases table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_user_id_status 
ON cases (user_id, status) 
WHERE status IN ('active', 'pending', 'investigating');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_created_at_desc 
ON cases (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_updated_at_desc 
ON cases (updated_at DESC);

-- JSONB metadata index for cases (for detective analysis metadata)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_metadata_gin 
ON cases USING gin (metadata jsonb_path_ops);

-- Full-text search on case titles and descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_search_gin 
ON cases USING gin (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =============================================================================
-- EVIDENCE INDEXES FOR DETECTIVE CONNECTIONS
-- =============================================================================

-- Evidence table composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_case_user_type 
ON evidence (case_id, user_id, evidence_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_case_created 
ON evidence (case_id, created_at DESC);

-- JSONB metadata index for AI analysis (Gemma embeddings results)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_metadata_gin 
ON evidence USING gin (metadata jsonb_path_ops);

-- Specific JSONB paths for AI analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_ai_analysis_classification 
ON evidence USING gin ((metadata -> 'aiAnalysis' -> 'classification'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_ai_analysis_entities 
ON evidence USING gin ((metadata -> 'aiAnalysis' -> 'entities'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_ai_analysis_key_terms 
ON evidence USING gin ((metadata -> 'aiAnalysis' -> 'keyTerms'));

-- Vector similarity index for Gemma embeddings (if stored in evidence table)
-- Note: Adjust dimension (768) based on your Gemma model
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_embedding_hnsw 
ON evidence USING hnsw ((metadata -> 'aiAnalysis' -> 'embeddingVector')::vector(768)) 
WITH (m = 16, ef_construction = 64);

-- Alternative cosine similarity index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_embedding_cosine 
ON evidence USING hnsw ((metadata -> 'aiAnalysis' -> 'embeddingVector')::vector(768) vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Full-text search on evidence content and titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_search_gin 
ON evidence USING gin (to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Evidence importance score index (for detective visualization sizing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_importance_score 
ON evidence ((metadata -> 'aiAnalysis' -> 'importance')::numeric) 
WHERE (metadata -> 'aiAnalysis' -> 'importance') IS NOT NULL;

-- =============================================================================
-- LEGAL DOCUMENTS INDEXES (for MinIO integration)
-- =============================================================================

-- Legal documents table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_case_id 
ON legal_documents (case_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_user_id 
ON legal_documents (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_type_status 
ON legal_documents (document_type, processing_status);

-- JSONB metadata index for legal document metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_metadata_gin 
ON legal_documents USING gin (metadata jsonb_path_ops);

-- MinIO object path index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_minio_path 
ON legal_documents (minio_bucket, minio_object_key);

-- Document processing status for pipeline tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_processing_status 
ON legal_documents (processing_status, created_at DESC) 
WHERE processing_status IN ('pending', 'processing', 'failed');

-- =============================================================================
-- CONNECTION ANALYSIS PERFORMANCE INDEXES
-- =============================================================================

-- Evidence connections table (if you create one for caching detective connections)
-- This would store pre-computed connections between evidence items
CREATE TABLE IF NOT EXISTS evidence_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_evidence_id UUID NOT NULL,
    target_evidence_id UUID NOT NULL,
    connection_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_evidence_id, target_evidence_id, connection_type)
);

-- Indexes for evidence connections table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_source 
ON evidence_connections (source_evidence_id, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_target 
ON evidence_connections (target_evidence_id, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_type_strength 
ON evidence_connections (connection_type, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_metadata_gin 
ON evidence_connections USING gin (metadata jsonb_path_ops);

-- =============================================================================
-- USER BEHAVIOR ANALYTICS INDEXES (for XState typing machine)
-- =============================================================================

-- User sessions table for typing behavior analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    case_id UUID,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    typing_analytics JSONB,
    contextual_prompts JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_case 
ON user_sessions (user_id, case_id, session_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_analytics_gin 
ON user_sessions USING gin (typing_analytics jsonb_path_ops);

-- =============================================================================
-- MCP MULTI-CORE PROCESSING INDEXES
-- =============================================================================

-- Processing queue table for MCP jobs
CREATE TABLE IF NOT EXISTS mcp_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 5,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    worker_id VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for MCP processing queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_status_priority 
ON mcp_processing_queue (status, priority DESC, created_at ASC) 
WHERE status IN ('pending', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_worker_status 
ON mcp_processing_queue (worker_id, status) 
WHERE status = 'processing';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_job_type_status 
ON mcp_processing_queue (job_type, status, created_at DESC);

-- =============================================================================
-- GEMMA EMBEDDINGS CACHE INDEXES
-- =============================================================================

-- Embeddings cache table for Gemma model results
CREATE TABLE IF NOT EXISTS embeddings_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of content
    model_name VARCHAR(100) NOT NULL DEFAULT 'embeddinggemma:latest',
    embedding_vector vector(768), -- Adjust dimension for your model
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for embeddings cache
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_hash_model 
ON embeddings_cache (content_hash, model_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_vector_hnsw 
ON embeddings_cache USING hnsw (embedding_vector vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_last_accessed 
ON embeddings_cache (last_accessed ASC) 
WHERE last_accessed < NOW() - INTERVAL '30 days'; -- For cleanup

-- =============================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- =============================================================================

-- Optimize PostgreSQL settings for vector operations and JSONB
-- These should be added to postgresql.conf

-- Memory settings for vector operations
-- shared_buffers = 256MB (adjust based on available RAM)
-- work_mem = 64MB (for sorting and hash operations)
-- effective_cache_size = 1GB (adjust based on total RAM)

-- Vector extension settings
-- max_parallel_workers_per_gather = 4
-- max_parallel_workers = 8

-- JSONB optimization
-- gin_pending_list_limit = 4MB

-- =============================================================================
-- MAINTENANCE AND CLEANUP
-- =============================================================================

-- Function to clean up old embeddings cache entries
CREATE OR REPLACE FUNCTION cleanup_old_embeddings_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM embeddings_cache 
    WHERE last_accessed < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update evidence connection strengths based on new analysis
CREATE OR REPLACE FUNCTION update_connection_strengths()
RETURNS VOID AS $$
BEGIN
    -- Update connection strengths based on latest AI analysis
    UPDATE evidence_connections ec
    SET strength = GREATEST(
        ec.strength,
        COALESCE(
            vector_cosine_distance(
                (SELECT (metadata -> 'aiAnalysis' -> 'embeddingVector')::vector(768) 
                 FROM evidence WHERE id = ec.source_evidence_id),
                (SELECT (metadata -> 'aiAnalysis' -> 'embeddingVector')::vector(768) 
                 FROM evidence WHERE id = ec.target_evidence_id)
            ),
            0
        )
    )
    WHERE EXISTS (
        SELECT 1 FROM evidence e1 
        WHERE e1.id = ec.source_evidence_id 
        AND e1.metadata -> 'aiAnalysis' -> 'embeddingVector' IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 FROM evidence e2 
        WHERE e2.id = ec.target_evidence_id 
        AND e2.metadata -> 'aiAnalysis' -> 'embeddingVector' IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MONITORING QUERIES
-- =============================================================================

-- Query to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query to monitor JSONB query performance
CREATE OR REPLACE VIEW jsonb_query_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query ILIKE '%metadata%' 
   OR query ILIKE '%jsonb%'
ORDER BY total_time DESC;

-- Performance monitoring for vector operations
CREATE OR REPLACE VIEW vector_operation_stats AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query ILIKE '%vector%' 
   OR query ILIKE '%hnsw%'
   OR query ILIKE '%cosine%'
ORDER BY mean_time DESC;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_cases_metadata_gin IS 'JSONB index for detective analysis metadata and case information';
COMMENT ON INDEX idx_evidence_metadata_gin IS 'JSONB index for AI analysis results including Gemma embeddings';
COMMENT ON INDEX idx_evidence_embedding_hnsw IS 'HNSW index for fast vector similarity search with Gemma embeddings';
COMMENT ON INDEX idx_evidence_search_gin IS 'Full-text search index for evidence content and titles';
COMMENT ON INDEX idx_evidence_connections_source IS 'Index for fast detective connection lookups by source evidence';
COMMENT ON INDEX idx_mcp_queue_status_priority IS 'Index for MCP worker job queue processing order';
COMMENT ON INDEX idx_embeddings_cache_vector_hnsw IS 'Vector similarity index for cached Gemma embeddings';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Verify all indexes were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Database optimization indexes created successfully for Legal AI Platform';
    RAISE NOTICE 'Indexes optimized for: Gemma embeddings, detective connections, case management';
    RAISE NOTICE 'Vector similarity search, JSONB queries, and MCP multi-core processing';
    RAISE NOTICE 'Remember to run ANALYZE after bulk data loads to update statistics';
END $$;
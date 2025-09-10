-- Database Indexes Optimization for Legal AI Platform (Fixed for actual schema)
-- Optimized for Gemma embeddings, detective connections, and case management performance
-- PostgreSQL with pgvector extension - Aligned with existing schema

-- =============================================================================
-- ADDITIONAL EVIDENCE INDEXES FOR DETECTIVE CONNECTIONS
-- =============================================================================

-- Evidence table composite indexes for existing schema
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_case_type_collected 
ON evidence (case_id, evidence_type, collected_at DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_case_uploaded 
ON evidence (case_id, uploaded_at DESC);

-- Evidence admissibility and confidentiality for legal analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_admissible_confidentiality 
ON evidence (is_admissible, confidentiality_level, case_id) 
WHERE is_admissible = true;

-- Enhanced JSONB indexes for existing ai_analysis column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_ai_analysis_gin 
ON evidence USING gin (ai_analysis jsonb_path_ops);

-- Chain of custody tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_chain_custody_gin 
ON evidence USING gin (chain_of_custody jsonb_path_ops);

-- Tags for evidence categorization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_tags_gin 
ON evidence USING gin (tags jsonb_path_ops);

-- AI tags for machine learning classification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_ai_tags_gin 
ON evidence USING gin (ai_tags jsonb_path_ops);

-- File-based evidence indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_file_info 
ON evidence (evidence_type, file_type, mime_type) 
WHERE file_url IS NOT NULL;

-- Hash index for duplicate detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_hash 
ON evidence (hash) 
WHERE hash IS NOT NULL;

-- Vector indexes for existing embedding columns (384 dimensions)
-- These appear to already exist, but let's ensure they're optimized
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_title_embedding_hnsw 
ON evidence USING hnsw (title_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64)
WHERE title_embedding IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_content_embedding_hnsw 
ON evidence USING hnsw (content_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64)
WHERE content_embedding IS NOT NULL;

-- =============================================================================
-- ENHANCED CASES INDEXES FOR EXISTING SCHEMA
-- =============================================================================

-- Case priority and status for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_priority_status_created 
ON cases (priority, status, created_at DESC);

-- Danger score for risk assessment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_danger_score_desc 
ON cases (danger_score DESC) 
WHERE danger_score > 0;

-- Estimated value for financial analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_estimated_value_desc 
ON cases (estimated_value DESC NULLS LAST) 
WHERE estimated_value IS NOT NULL;

-- Lead prosecutor assignment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_lead_prosecutor 
ON cases (lead_prosecutor, status) 
WHERE lead_prosecutor IS NOT NULL;

-- Case type and category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_type_category_status 
ON cases (case_type, category, status);

-- AI summary search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_ai_summary_gin 
ON cases USING gin (to_tsvector('english', COALESCE(ai_summary, ''))) 
WHERE ai_summary IS NOT NULL;

-- AI tags for machine learning
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_ai_tags_gin 
ON cases USING gin (ai_tags jsonb_path_ops);

-- Assigned team tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_assigned_team_gin 
ON cases USING gin (assigned_team jsonb_path_ops);

-- =============================================================================
-- LEGAL DOCUMENTS TABLE INDEXES
-- =============================================================================

-- Legal documents table exists, let's optimize it
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_case_evidence 
ON legal_documents (case_id, evidence_id) 
WHERE case_id IS NOT NULL;

-- Document processing status if it exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_created_at_desc 
ON legal_documents (created_at DESC);

-- =============================================================================
-- CONNECTION ANALYSIS PERFORMANCE INDEXES
-- =============================================================================

-- Evidence connections table (create if not exists)
CREATE TABLE IF NOT EXISTS evidence_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    shared_entities JSONB DEFAULT '[]',
    shared_terms JSONB DEFAULT '[]',
    temporal_proximity INTEGER, -- minutes between collection times
    spatial_proximity DECIMAL(10,6), -- distance if location data available
    semantic_similarity DECIMAL(3,2), -- vector similarity score
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_evidence_connection UNIQUE(source_evidence_id, target_evidence_id, connection_type)
);

-- Indexes for evidence connections table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_source_strength 
ON evidence_connections (source_evidence_id, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_target_strength 
ON evidence_connections (target_evidence_id, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_type_strength 
ON evidence_connections (connection_type, strength DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_semantic_similarity 
ON evidence_connections (semantic_similarity DESC) 
WHERE semantic_similarity IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_metadata_gin 
ON evidence_connections USING gin (metadata jsonb_path_ops);

-- Shared entities and terms for connection analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_shared_entities 
ON evidence_connections USING gin (shared_entities jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_connections_shared_terms 
ON evidence_connections USING gin (shared_terms jsonb_path_ops);

-- =============================================================================
-- USER BEHAVIOR ANALYTICS INDEXES (for XState typing machine)
-- =============================================================================

-- User sessions table for typing behavior analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITHOUT TIME ZONE,
    typing_analytics JSONB DEFAULT '{}',
    contextual_prompts JSONB DEFAULT '[]',
    user_engagement VARCHAR(20) DEFAULT 'medium',
    typing_speed INTEGER DEFAULT 0, -- characters per minute
    total_interactions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_case_start 
ON user_sessions (case_id, session_start DESC) 
WHERE case_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_analytics_gin 
ON user_sessions USING gin (typing_analytics jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_engagement 
ON user_sessions (user_engagement, session_start DESC);

-- =============================================================================
-- MCP MULTI-CORE PROCESSING INDEXES
-- =============================================================================

-- Processing queue table for MCP jobs
CREATE TABLE IF NOT EXISTS mcp_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 5,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    worker_id VARCHAR(50),
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for MCP processing queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_status_priority 
ON mcp_processing_queue (status, priority DESC, created_at ASC) 
WHERE status IN ('pending', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_worker_status 
ON mcp_processing_queue (worker_id, status) 
WHERE worker_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_job_type_status 
ON mcp_processing_queue (job_type, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcp_queue_completed 
ON mcp_processing_queue (completed_at DESC) 
WHERE status = 'completed';

-- =============================================================================
-- GEMMA EMBEDDINGS CACHE INDEXES
-- =============================================================================

-- Embeddings cache table for Gemma model results
CREATE TABLE IF NOT EXISTS embeddings_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of content
    model_name VARCHAR(100) NOT NULL DEFAULT 'embeddinggemma:latest',
    embedding_vector vector(384), -- Match existing schema dimension
    text_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_content_model UNIQUE (content_hash, model_name)
);

-- Indexes for embeddings cache
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_vector_hnsw 
ON embeddings_cache USING hnsw (embedding_vector vector_cosine_ops) 
WITH (m = 16, ef_construction = 64)
WHERE embedding_vector IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_last_accessed 
ON embeddings_cache (last_accessed ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_cache_model 
ON embeddings_cache (model_name, created_at DESC);

-- =============================================================================
-- SPECIALIZED INDEXES FOR DETECTIVE ANALYSIS
-- =============================================================================

-- Detective analysis table (might already exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detective_analysis_case_created 
ON detective_analysis (case_id, created_at DESC);

-- AI recommendations for cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_recommendations_case_confidence 
ON ai_recommendations (case_id, confidence DESC);

-- Case timeline for temporal analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_case_timeline_case_event_time 
ON case_timeline (case_id, event_time DESC);

-- Persons of interest
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persons_interest_case_role 
ON persons_of_interest (case_id, role);

-- =============================================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function to calculate evidence connections using vector similarity
CREATE OR REPLACE FUNCTION calculate_evidence_connections(
    case_id_param UUID,
    similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS INTEGER AS $$
DECLARE
    connection_count INTEGER;
BEGIN
    -- Calculate connections based on content embedding similarity
    INSERT INTO evidence_connections (
        source_evidence_id,
        target_evidence_id,
        connection_type,
        strength,
        semantic_similarity,
        metadata
    )
    SELECT DISTINCT
        e1.id,
        e2.id,
        'semantic_similarity',
        GREATEST(
            1 - (e1.content_embedding <=> e2.content_embedding),
            1 - (e1.title_embedding <=> e2.title_embedding)
        ),
        1 - (e1.content_embedding <=> e2.content_embedding),
        jsonb_build_object(
            'calculation_method', 'vector_cosine_distance',
            'calculated_at', NOW()
        )
    FROM evidence e1
    CROSS JOIN evidence e2
    WHERE e1.case_id = case_id_param
        AND e2.case_id = case_id_param
        AND e1.id < e2.id  -- Avoid duplicates and self-connections
        AND e1.content_embedding IS NOT NULL
        AND e2.content_embedding IS NOT NULL
        AND (
            1 - (e1.content_embedding <=> e2.content_embedding) >= similarity_threshold
            OR 1 - (e1.title_embedding <=> e2.title_embedding) >= similarity_threshold
        )
    ON CONFLICT (source_evidence_id, target_evidence_id, connection_type) 
    DO UPDATE SET 
        strength = EXCLUDED.strength,
        semantic_similarity = EXCLUDED.semantic_similarity,
        updated_at = NOW();
    
    GET DIAGNOSTICS connection_count = ROW_COUNT;
    RETURN connection_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old cache entries
CREATE OR REPLACE FUNCTION cleanup_old_cache_entries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up embeddings cache older than 30 days and not accessed recently
    DELETE FROM embeddings_cache 
    WHERE last_accessed < NOW() - INTERVAL '30 days'
        AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up completed MCP jobs older than 7 days
    DELETE FROM mcp_processing_queue 
    WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update evidence embeddings from cache
CREATE OR REPLACE FUNCTION update_evidence_embeddings_from_cache()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update evidence content embeddings from cache
    UPDATE evidence e
    SET content_embedding = ec.embedding_vector,
        updated_at = NOW()
    FROM embeddings_cache ec
    WHERE e.title IS NOT NULL
        AND e.content_embedding IS NULL
        AND ec.content_hash = encode(sha256(e.title::bytea), 'hex')
        AND ec.embedding_vector IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MAINTENANCE SCHEDULED TASKS
-- =============================================================================

-- Create a simple maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation VARCHAR(100) NOT NULL,
    result_count INTEGER,
    execution_time INTERVAL,
    status VARCHAR(20) DEFAULT 'success',
    details TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Function to log maintenance operations
CREATE OR REPLACE FUNCTION log_maintenance_operation(
    operation_name VARCHAR(100),
    result_count INTEGER DEFAULT NULL,
    execution_time INTERVAL DEFAULT NULL,
    operation_status VARCHAR(20) DEFAULT 'success',
    operation_details TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO maintenance_log (operation, result_count, execution_time, status, details)
    VALUES (operation_name, result_count, execution_time, operation_status, operation_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for evidence connection statistics
CREATE OR REPLACE VIEW evidence_connection_stats AS
SELECT 
    ec.connection_type,
    COUNT(*) as total_connections,
    AVG(ec.strength) as avg_strength,
    MAX(ec.strength) as max_strength,
    COUNT(CASE WHEN ec.strength > 0.8 THEN 1 END) as strong_connections,
    COUNT(CASE WHEN ec.semantic_similarity IS NOT NULL THEN 1 END) as semantic_connections
FROM evidence_connections ec
GROUP BY ec.connection_type
ORDER BY total_connections DESC;

-- View for case analysis readiness
CREATE OR REPLACE VIEW case_analysis_readiness AS
SELECT 
    c.id,
    c.case_number,
    c.title,
    c.status,
    COUNT(e.id) as evidence_count,
    COUNT(CASE WHEN e.content_embedding IS NOT NULL THEN 1 END) as embedded_evidence,
    COUNT(CASE WHEN e.ai_analysis != '{}' THEN 1 END) as analyzed_evidence,
    COUNT(ec.id) as connection_count,
    CASE 
        WHEN COUNT(e.id) = 0 THEN 'no_evidence'
        WHEN COUNT(CASE WHEN e.content_embedding IS NOT NULL THEN 1 END) = 0 THEN 'no_embeddings'
        WHEN COUNT(ec.id) = 0 THEN 'no_connections'
        ELSE 'ready'
    END as analysis_status
FROM cases c
LEFT JOIN evidence e ON c.id = e.case_id
LEFT JOIN evidence_connections ec ON e.id = ec.source_evidence_id OR e.id = ec.target_evidence_id
GROUP BY c.id, c.case_number, c.title, c.status
ORDER BY evidence_count DESC;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Analyze tables to update statistics
ANALYZE cases;
ANALYZE evidence;
ANALYZE evidence_connections;
ANALYZE embeddings_cache;
ANALYZE mcp_processing_queue;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced database optimization completed successfully';
    RAISE NOTICE 'Optimized for existing schema with 384-dimension vectors';
    RAISE NOTICE 'Added detective connection analysis, MCP processing, and Gemma embeddings cache';
    RAISE NOTICE 'Created performance monitoring views and maintenance functions';
    RAISE NOTICE 'Use calculate_evidence_connections(case_id) to generate semantic connections';
END $$;
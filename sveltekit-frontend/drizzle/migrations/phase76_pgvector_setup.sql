-- ═══════════════════════════════════════════════════════════════════════
-- Phase 76 Level 2: pgvector Migration
-- Semantic Error Cache & Knowledge Graph Tables
-- ═══════════════════════════════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ───────────────────────────────────────────────────────────────────────
-- Error Vectors Table
-- Stores error signatures and their embeddings for semantic similarity search
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_vectors (
    id SERIAL PRIMARY KEY,
    signature TEXT NOT NULL,
    error_code TEXT,
    file_pattern TEXT,
    embedding vector(768),  -- 768-dimension for embeddinggemma
    fix TEXT NOT NULL,
    fix_confidence FLOAT DEFAULT 0.0,
    applied_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    provider TEXT,  -- ollama, gemini, claude, openai
    model TEXT,
    tokens_used INTEGER DEFAULT 0
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_error_vectors_embedding
ON error_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for file pattern lookup
CREATE INDEX IF NOT EXISTS idx_error_vectors_file_pattern
ON error_vectors (file_pattern);

-- Index for error code lookup
CREATE INDEX IF NOT EXISTS idx_error_vectors_error_code
ON error_vectors (error_code);

-- ───────────────────────────────────────────────────────────────────────
-- Knowledge Documents Table
-- Stores documentation and knowledge base entries
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    minio_key TEXT,  -- Reference to full content in MinIO
    summary TEXT,
    entities JSONB,
    embedding vector(768),
    doc_type TEXT,  -- 'documentation', 'error_pattern', 'code_example'
    source TEXT,    -- 'svelte', 'typescript', 'sveltekit', 'drizzle'
    version TEXT,   -- e.g., 'svelte5', 'typescript5.7'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_embedding
ON knowledge_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for doc_type and source lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_type_source
ON knowledge_documents (doc_type, source);

-- ───────────────────────────────────────────────────────────────────────
-- Error-File Correlations (Knowledge Graph Edges)
-- Tracks which errors commonly occur in which file patterns
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_file_correlations (
    id SERIAL PRIMARY KEY,
    error_signature TEXT NOT NULL,
    file_pattern TEXT NOT NULL,
    route_path TEXT,
    occurrence_count INTEGER DEFAULT 1,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    typical_fix TEXT,

    UNIQUE(error_signature, file_pattern)
);

CREATE INDEX IF NOT EXISTS idx_error_file_correlations_signature
ON error_file_correlations (error_signature);

CREATE INDEX IF NOT EXISTS idx_error_file_correlations_file
ON error_file_correlations (file_pattern);

-- ───────────────────────────────────────────────────────────────────────
-- Semantic Cache Hits (Analytics)
-- Tracks cache hit rates for optimization
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS semantic_cache_hits (
    id SERIAL PRIMARY KEY,
    cache_key TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    last_hit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    avg_latency_ms FLOAT DEFAULT 0.0,
    source TEXT  -- 'redis', 'qdrant', 'postgres'
);

CREATE INDEX IF NOT EXISTS idx_cache_hits_key
ON semantic_cache_hits (cache_key);

-- ───────────────────────────────────────────────────────────────────────
-- Helper Functions
-- ───────────────────────────────────────────────────────────────────────

-- Function to find similar errors using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_errors(
    query_embedding vector(768),
    similarity_threshold FLOAT DEFAULT 0.85,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    id INTEGER,
    signature TEXT,
    fix TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ev.id,
        ev.signature,
        ev.fix,
        1 - (ev.embedding <=> query_embedding) AS similarity
    FROM error_vectors ev
    WHERE 1 - (ev.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY ev.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to update error vector success rate
CREATE OR REPLACE FUNCTION update_fix_success(
    error_id INTEGER,
    was_successful BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE error_vectors
    SET
        applied_count = applied_count + 1,
        success_rate = (success_rate * (applied_count - 1) + (CASE WHEN was_successful THEN 1.0 ELSE 0.0 END)) / applied_count,
        updated_at = NOW()
    WHERE id = error_id;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert error-file correlation
CREATE OR REPLACE FUNCTION upsert_error_correlation(
    p_error_signature TEXT,
    p_file_pattern TEXT,
    p_route_path TEXT DEFAULT NULL,
    p_typical_fix TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO error_file_correlations (error_signature, file_pattern, route_path, typical_fix)
    VALUES (p_error_signature, p_file_pattern, p_route_path, p_typical_fix)
    ON CONFLICT (error_signature, file_pattern) DO UPDATE
    SET
        occurrence_count = error_file_correlations.occurrence_count + 1,
        last_seen = NOW(),
        route_path = COALESCE(EXCLUDED.route_path, error_file_correlations.route_path),
        typical_fix = COALESCE(EXCLUDED.typical_fix, error_file_correlations.typical_fix);
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────
-- Grant permissions (adjust user as needed)
-- ───────────────────────────────────────────────────────────────────────
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO legal_admin;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO legal_admin;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO legal_admin;

-- ═══════════════════════════════════════════════════════════════════════
-- Migration Complete
-- ═══════════════════════════════════════════════════════════════════════

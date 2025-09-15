-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table optimized for GPU operations
CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) UNIQUE,
    content TEXT,
    embedding vector(768),  -- Gemma embeddings are 768 dimensions
    embedding_gemma vector(768),  -- Store Gemma-specific embeddings
    metadata JSONB,
    payload TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create GPU-optimized indexes using HNSW (Hierarchical Navigable Small World)
-- HNSW is better for GPU acceleration than IVFFlat
CREATE INDEX IF NOT EXISTS embeddings_hnsw_idx
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS embeddings_gemma_hnsw_idx
ON embeddings
USING hnsw (embedding_gemma vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index on metadata for fast filtering
CREATE INDEX IF NOT EXISTS embeddings_metadata_idx
ON embeddings
USING gin (metadata);

-- Create index on task_id for lookups
CREATE INDEX IF NOT EXISTS embeddings_task_id_idx
ON embeddings (task_id);

-- Legal documents table with vector embeddings
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    title TEXT,
    content TEXT,
    document_type VARCHAR(100),
    embedding vector(768),  -- Document embedding
    embedding_gemma vector(768),  -- Gemma-specific embedding
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- GPU-optimized indexes for legal documents
CREATE INDEX IF NOT EXISTS legal_docs_hnsw_idx
ON legal_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128);

CREATE INDEX IF NOT EXISTS legal_docs_gemma_hnsw_idx
ON legal_documents
USING hnsw (embedding_gemma vector_cosine_ops)
WITH (m = 24, ef_construction = 128);

CREATE INDEX IF NOT EXISTS legal_docs_metadata_idx
ON legal_documents
USING gin (metadata);

-- Case embeddings for similarity search
CREATE TABLE IF NOT EXISTS case_embeddings (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) UNIQUE NOT NULL,
    case_title TEXT,
    case_summary TEXT,
    embedding vector(768),
    embedding_gemma vector(768),
    jurisdiction VARCHAR(100),
    court_level VARCHAR(50),
    decision_date DATE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- GPU-optimized indexes for cases
CREATE INDEX IF NOT EXISTS case_embeddings_hnsw_idx
ON case_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 200);

CREATE INDEX IF NOT EXISTS case_embeddings_gemma_hnsw_idx
ON case_embeddings
USING hnsw (embedding_gemma vector_cosine_ops)
WITH (m = 32, ef_construction = 200);

-- Function for GPU-accelerated similarity search
CREATE OR REPLACE FUNCTION search_similar_gemma(
    query_embedding vector(768),
    search_table text,
    limit_count int DEFAULT 10
)
RETURNS TABLE(
    id int,
    content text,
    metadata jsonb,
    similarity float
) AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT
            id,
            content,
            metadata,
            1 - (embedding_gemma <=> $1) as similarity
        FROM %I
        ORDER BY embedding_gemma <=> $1
        LIMIT $2
    ', search_table)
    USING query_embedding, limit_count;
END;
$$ LANGUAGE plpgsql;

-- Performance tuning for GPU operations
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO legal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO legal_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO legal_admin;
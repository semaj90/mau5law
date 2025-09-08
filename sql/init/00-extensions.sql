-- Create extensions needed for Legal AI platform
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- Verify vector extension
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Set up vector operations functions
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index optimization function
CREATE OR REPLACE FUNCTION create_vector_indexes()
RETURNS void AS $$
BEGIN
    -- Create HNSW indexes for vector columns where they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_vectors_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_document_vectors_embedding_hnsw ON document_vectors 
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_case_summary_vectors_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_case_summary_vectors_embedding_hnsw ON case_summary_vectors 
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_evidence_vectors_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_evidence_vectors_embedding_hnsw ON evidence_vectors 
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_query_vectors_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_query_vectors_embedding_hnsw ON query_vectors 
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vector_embeddings_embedding_hnsw') THEN
        CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding_hnsw ON vector_embeddings 
        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute index creation
SELECT create_vector_indexes();
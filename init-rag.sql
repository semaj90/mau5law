-- RAG Service Database Schema
-- Created: November 23, 2025

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- RAG Documents Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    user_id UUID NOT NULL,
    minio_path VARCHAR(512) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- pdf, image, scan, tiff
    file_size_bytes BIGINT NOT NULL,
    page_count INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_documents_case_id ON rag_documents(case_id);
CREATE INDEX idx_rag_documents_user_id ON rag_documents(user_id);
CREATE INDEX idx_rag_documents_created_at ON rag_documents(created_at DESC);

-- ============================================================================
-- RAG Chunks Table (Text + Embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    case_id UUID,
    chunk_index INT NOT NULL,
    text TEXT NOT NULL,
    embedding vector(512),
    metadata JSONB, -- DocTags, coordinates, page_num, table_info
    fallback BOOLEAN DEFAULT false, -- true if Tesseract was used
    privacy VARCHAR(20) DEFAULT 'private', -- public, private
    scope VARCHAR(50), -- 'global' or 'case:id'
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id) ON DELETE SET NULL
);

-- Create IVFFlat index for vector similarity search
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_rag_chunks_case_id ON rag_chunks(case_id);
CREATE INDEX idx_rag_chunks_scope ON rag_chunks(scope);
CREATE INDEX idx_rag_chunks_privacy ON rag_chunks(privacy);
CREATE INDEX idx_rag_chunks_document_id ON rag_chunks(document_id);
CREATE INDEX idx_rag_chunks_fallback ON rag_chunks(fallback);

-- ============================================================================
-- RAG Entities Table (Extracted Entities)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL,
    document_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- person, statute, agency, case_ref, concept
    entity_text VARCHAR(255) NOT NULL,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB, -- Additional entity metadata
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_entities_chunk_id ON rag_entities(chunk_id);
CREATE INDEX idx_rag_entities_document_id ON rag_entities(document_id);
CREATE INDEX idx_rag_entities_type ON rag_entities(entity_type);
CREATE INDEX idx_rag_entities_text ON rag_entities(entity_text);

-- ============================================================================
-- RAG Processing Jobs Table (Track Document Processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, processing, completed, failed
    parser_used VARCHAR(50), -- granite-docling, tesseract
    error_message TEXT,
    processing_time_ms INT,
    chunks_created INT,
    entities_extracted INT,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_processing_jobs_document_id ON rag_processing_jobs(document_id);
CREATE INDEX idx_rag_processing_jobs_status ON rag_processing_jobs(status);
CREATE INDEX idx_rag_processing_jobs_created_at ON rag_processing_jobs(created_at DESC);

-- ============================================================================
-- RAG Tables Metadata (Extracted Tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL,
    document_id UUID NOT NULL,
    table_index INT,
    table_html TEXT,
    table_markdown TEXT,
    row_count INT,
    column_count INT,
    confidence FLOAT,
    metadata JSONB, -- Table structure info
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_tables_chunk_id ON rag_tables(chunk_id);
CREATE INDEX idx_rag_tables_document_id ON rag_tables(document_id);

-- ============================================================================
-- RAG Signatures/Seals (Evidence Analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_id UUID,
    signature_type VARCHAR(50), -- signature, seal, stamp
    image_path VARCHAR(512),
    embedding vector(512),
    confidence FLOAT,
    matched_signatures INT DEFAULT 0, -- Count of matches across documents
    metadata JSONB, -- Coordinates, size, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id) ON DELETE SET NULL
);

CREATE INDEX idx_rag_signatures_document_id ON rag_signatures(document_id);
CREATE INDEX idx_rag_signatures_type ON rag_signatures(signature_type);
CREATE INDEX idx_rag_signatures_embedding ON rag_signatures USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- RAG Search Cache (Query Results Cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    case_id UUID,
    results JSONB NOT NULL,
    result_count INT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_search_cache_query_hash ON rag_search_cache(query_hash);
CREATE INDEX idx_rag_search_cache_case_id ON rag_search_cache(case_id);
CREATE INDEX idx_rag_search_cache_expires_at ON rag_search_cache(expires_at);

-- ============================================================================
-- RAG Fallback Retry Queue (Track Tesseract Fallbacks for Retry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_fallback_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (chunk_id) REFERENCES rag_chunks(id) ON DELETE CASCADE
);

CREATE INDEX idx_rag_fallback_queue_next_retry_at ON rag_fallback_queue(next_retry_at);
CREATE INDEX idx_rag_fallback_queue_document_id ON rag_fallback_queue(document_id);

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO legal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO legal_admin;

-- ============================================================================
-- Create Views for Common Queries
-- ============================================================================

-- View: Recent Documents
CREATE OR REPLACE VIEW rag_recent_documents AS
SELECT
    d.id,
    d.case_id,
    d.original_filename,
    d.document_type,
    d.file_size_bytes,
    d.created_at,
    COUNT(c.id) as chunk_count,
    COUNT(e.id) as entity_count
FROM rag_documents d
LEFT JOIN rag_chunks c ON d.id = c.document_id
LEFT JOIN rag_entities e ON c.id = e.chunk_id
GROUP BY d.id, d.case_id, d.original_filename, d.document_type, d.file_size_bytes, d.created_at
ORDER BY d.created_at DESC;

-- View: Processing Status
CREATE OR REPLACE VIEW rag_processing_status AS
SELECT
    status,
    COUNT(*) as count,
    AVG(processing_time_ms) as avg_time_ms,
    MAX(processing_time_ms) as max_time_ms
FROM rag_processing_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- View: Fallback Documents (Tesseract Used)
CREATE OR REPLACE VIEW rag_fallback_documents AS
SELECT
    d.id,
    d.original_filename,
    COUNT(c.id) as fallback_chunk_count,
    COUNT(CASE WHEN c.fallback = false THEN 1 END) as parsed_chunk_count
FROM rag_documents d
LEFT JOIN rag_chunks c ON d.id = c.document_id
WHERE EXISTS (SELECT 1 FROM rag_chunks WHERE document_id = d.id AND fallback = true)
GROUP BY d.id, d.original_filename;

-- ============================================================================
-- Create Stored Procedures
-- ============================================================================

-- Procedure: Mark Chunks for Retry (Fallback Retry)
CREATE OR REPLACE FUNCTION mark_chunks_for_retry(
    p_document_id UUID,
    p_retry_interval INTERVAL DEFAULT '1 hour'
)
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO rag_fallback_queue (document_id, chunk_id, next_retry_at)
    SELECT
        c.document_id,
        c.id,
        NOW() + p_retry_interval
    FROM rag_chunks c
    WHERE c.document_id = p_document_id
    AND c.fallback = true
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Clean Expired Cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM rag_search_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Trigger: Update rag_documents.updated_at
CREATE OR REPLACE FUNCTION update_rag_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rag_documents_updated_at
BEFORE UPDATE ON rag_documents
FOR EACH ROW
EXECUTE FUNCTION update_rag_documents_timestamp();

-- ============================================================================
-- Create Maintenance Jobs
-- ============================================================================

-- Clean expired cache daily
SELECT cron.schedule('clean-rag-cache', '0 0 * * *', 'SELECT clean_expired_cache()');

-- ============================================================================
-- Insert Sample Data (Optional)
-- ============================================================================

-- Sample document type enum values
INSERT INTO rag_documents (case_id, user_id, minio_path, original_filename, document_type, file_size_bytes, page_count)
VALUES
    (NULL, '00000000-0000-0000-0000-000000000001', 'evidence/sample.pdf', 'sample.pdf', 'pdf', 1024000, 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verify Installation
-- ============================================================================

-- Check all tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'rag_%'
ORDER BY table_name;

-- Check pgvector extension
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- ============================================================================
-- End of RAG Schema
-- ============================================================================

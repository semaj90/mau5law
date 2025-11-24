-- Initialize Legal AI Production Database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS legal;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT USAGE ON SCHEMA ai TO ai_user;
GRANT USAGE ON SCHEMA legal TO ai_user;
GRANT USAGE ON SCHEMA audit TO ai_user;

-- Create AI embeddings table
CREATE TABLE IF NOT EXISTS ai.embeddings (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimensions
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create legal documents table
CREATE TABLE IF NOT EXISTS legal.documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    document_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    effective_date DATE,
    metadata JSONB,
    embedding_id INTEGER REFERENCES ai.embeddings(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI processing queue table
CREATE TABLE IF NOT EXISTS ai.processing_queue (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    worker_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.api_calls (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id VARCHAR(255),
    ip_address INET,
    request_payload JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON ai.embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_id ON ai.embeddings(content_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON legal.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_jurisdiction ON legal.documents(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON ai.processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON ai.processing_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_api_calls_endpoint ON audit.api_calls(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_calls_created_at ON audit.api_calls(created_at DESC);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION ai.cosine_similarity(a vector, b vector)
RETURNS float8
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
    SELECT 1 - (a <=> b);
$$;

-- Create function to find similar documents
CREATE OR REPLACE FUNCTION legal.find_similar_documents(query_embedding vector, match_threshold float DEFAULT 0.7, match_count int DEFAULT 10)
RETURNS TABLE(
    id integer,
    title varchar(500),
    content text,
    document_type varchar(100),
    jurisdiction varchar(100),
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        d.id,
        d.title,
        d.content,
        d.document_type,
        d.jurisdiction,
        ai.cosine_similarity(query_embedding, e.embedding) as similarity
    FROM legal.documents d
    JOIN ai.embeddings e ON d.embedding_id = e.id
    WHERE ai.cosine_similarity(query_embedding, e.embedding) > match_threshold
    ORDER BY ai.cosine_similarity(query_embedding, e.embedding) DESC
    LIMIT match_count;
$$;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO ai_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA legal TO ai_user;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO ai_user;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai TO ai_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA legal TO ai_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO ai_user;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_embeddings_updated_at BEFORE UPDATE ON ai.embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON legal.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processing_queue_updated_at BEFORE UPDATE ON ai.processing_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
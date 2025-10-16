-- PostgreSQL Initialization Script for Legal AI Platform
-- Runs automatically when PostgreSQL container starts
-- Creates all necessary tables, indexes, and extensions

-- ============================================
-- Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For full-text search

-- ============================================
-- Embeddings Table (Primary Vector Store)
-- ============================================

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  vector vector(768),
  document_id TEXT NOT NULL,
  chunk_id TEXT,
  embedding_type VARCHAR(50) DEFAULT 'legal_context',
  model_used VARCHAR(100) DEFAULT 'embeddings:gemma:latest',
  metadata JSONB DEFAULT '{}',
  confidentiality_level VARCHAR(50) DEFAULT 'standard',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT content_not_empty CHECK (LENGTH(content) > 0),
  CONSTRAINT vector_dimension CHECK ((vector IS NULL) OR (array_length(vector::float4[], 1) = 768))
);

-- HNSW Index for vector similarity (cosine distance)
CREATE INDEX IF NOT EXISTS embeddings_vector_cosine_idx
ON embeddings
USING hnsw (vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Additional indexes for query optimization
CREATE INDEX IF NOT EXISTS embeddings_document_id_idx ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS embeddings_embedding_type_idx ON embeddings(embedding_type);
CREATE INDEX IF NOT EXISTS embeddings_created_at_idx ON embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS embeddings_confidentiality_idx ON embeddings(confidentiality_level);

-- Full-text search index
CREATE INDEX IF NOT EXISTS embeddings_content_trgm_idx
ON embeddings USING gin (content gin_trgm_ops);

-- ============================================
-- Document Chunks Table
-- ============================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  document_id TEXT NOT NULL,
  title VARCHAR(500),
  chunk_number INTEGER,
  total_chunks INTEGER,
  confidentiality_level VARCHAR(50) DEFAULT 'standard',
  embedding_model VARCHAR(100) DEFAULT 'embeddings:gemma:latest',
  embedding_dimension INTEGER DEFAULT 768,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chunk_ordering CHECK (chunk_number > 0 AND total_chunks > 0)
);

-- Indexes on document chunks
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_created_at_idx ON document_chunks(created_at DESC);
CREATE INDEX IF NOT EXISTS document_chunks_confidentiality_idx ON document_chunks(confidentiality_level);

-- ============================================
-- Vector Search Audit Table
-- ============================================

CREATE TABLE IF NOT EXISTS vector_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT,
  query_embedding vector(768),
  results_count INTEGER,
  execution_time_ms INTEGER,
  source_provider VARCHAR(50),
  similarity_threshold FLOAT8 DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS vector_search_queries_created_at_idx ON vector_search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS vector_search_queries_provider_idx ON vector_search_queries(source_provider);

-- ============================================
-- AI Service Health Metrics
-- ============================================

CREATE TABLE IF NOT EXISTS ai_service_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,  -- 'latency', 'error_rate', 'throughput', etc.
  metric_value FLOAT8 NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS ai_service_metrics_service_name_idx ON ai_service_metrics(service_name);
CREATE INDEX IF NOT EXISTS ai_service_metrics_timestamp_idx ON ai_service_metrics(timestamp DESC);

-- ============================================
-- LLM Conversation History
-- ============================================

CREATE TABLE IF NOT EXISTS llm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title VARCHAR(255),
  model_used VARCHAR(100),
  temperature FLOAT8 DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 512,
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS llm_conversations_user_id_idx ON llm_conversations(user_id);
CREATE INDEX IF NOT EXISTS llm_conversations_created_at_idx ON llm_conversations(created_at DESC);

-- ============================================
-- LLM Messages in Conversation
-- ============================================

CREATE TABLE IF NOT EXISTS llm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES llm_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,  -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model_used VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS llm_messages_conversation_id_idx ON llm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS llm_messages_created_at_idx ON llm_messages(created_at DESC);

-- ============================================
-- Document Processing Queue
-- ============================================

CREATE TABLE IF NOT EXISTS document_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  file_path TEXT,
  file_size BIGINT,
  file_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS document_queue_status_idx ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS document_queue_document_id_idx ON document_processing_queue(document_id);
CREATE INDEX IF NOT EXISTS document_queue_created_at_idx ON document_processing_queue(created_at DESC);

-- ============================================
-- Vector Store Performance Analytics
-- ============================================

CREATE TABLE IF NOT EXISTS vector_store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  service_provider VARCHAR(50) NOT NULL,  -- 'pgvector', 'qdrant'
  total_searches BIGINT DEFAULT 0,
  total_indexes BIGINT DEFAULT 0,
  avg_search_latency_ms FLOAT8 DEFAULT 0,
  avg_index_latency_ms FLOAT8 DEFAULT 0,
  cache_hit_rate FLOAT8 DEFAULT 0,
  total_vectors BIGINT DEFAULT 0,
  storage_size_mb BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_provider CHECK (service_provider IN ('pgvector', 'qdrant', 'hybrid'))
);

CREATE UNIQUE INDEX IF NOT EXISTS vector_store_analytics_unique_idx
ON vector_store_analytics(date, service_provider);

-- ============================================
-- Rights and Grants
-- ============================================

-- Grant all permissions to the application user
GRANT ALL ON ALL TABLES IN SCHEMA public TO legal_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO legal_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO legal_admin;

-- Create read-only role for analytics
CREATE ROLE legal_reader WITH LOGIN PASSWORD 'legal_reader_pass';
GRANT CONNECT ON DATABASE legal_ai_db TO legal_reader;
GRANT USAGE ON SCHEMA public TO legal_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO legal_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO legal_reader;

-- ============================================
-- Utility Functions
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER embeddings_update_trigger BEFORE UPDATE ON embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_chunks_update_trigger BEFORE UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER llm_conversations_update_trigger BEFORE UPDATE ON llm_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_queue_update_trigger BEFORE UPDATE ON document_processing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to perform similarity search
CREATE OR REPLACE FUNCTION similarity_search(
  query_vector vector,
  match_limit int DEFAULT 10,
  similarity_threshold float8 DEFAULT 0.0
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float8,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.content,
    1 - (embeddings.vector <=> query_vector) as similarity,
    embeddings.metadata
  FROM embeddings
  WHERE embeddings.vector IS NOT NULL
    AND (1 - (embeddings.vector <=> query_vector)) > similarity_threshold
  ORDER BY embeddings.vector <=> query_vector
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Sample Data (Optional)
-- ============================================

-- Uncomment to add sample data during initialization
-- INSERT INTO embeddings (content, document_id, embedding_type, metadata)
-- VALUES (
--   'Contract: Payment Terms and Conditions',
--   'doc-sample-001',
--   'legal_context',
--   jsonb_build_object('type', 'contract', 'source', 'sample')
-- );

-- ============================================
-- Verification
-- ============================================

-- Verify all tables were created successfully
DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';

  RAISE NOTICE 'Successfully created % tables', table_count;
END $$;

-- Show pgvector version
SELECT pgvector_version();

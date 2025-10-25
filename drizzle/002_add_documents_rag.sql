-- Enable pgvector (extension) and create a documents table for RAG
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags JSONB DEFAULT '[]',
  embedding VECTOR(768),
  source_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- hnsw index using pgvector (vector_cosine_ops)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'documents_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX documents_embedding_hnsw ON documents USING hnsw (embedding vector_cosine_ops)';
  END IF;
END$$;

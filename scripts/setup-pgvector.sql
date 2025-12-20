-- scripts/setup-pgvector.sql
-- Phase 76 Level 2: Structured Memory Layer
-- Enables pgvector extension and creates schema for error patterns and document references

-- 1. Enable the Vector Extension (Must be done as superuser usually)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Error Pattern Table (Structured Memory)
CREATE TABLE IF NOT EXISTS error_patterns (
  id SERIAL PRIMARY KEY,
  signature TEXT NOT NULL,         -- e.g. "svelte-check: non_reactive_update"
  file_path TEXT,                  -- e.g. "src/routes/+page.svelte"
  fix_summary TEXT,                -- e.g. "Use $state() rune"
  embedding vector(768),           -- The semantic meaning
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create a MinIO Reference Table (Deep Storage Link)
CREATE TABLE IF NOT EXISTS doc_references (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE,
  minio_key TEXT,                  -- s3://phase76-summaries/svelte_5_runes.json
  embedding vector(768)
);

-- 4. Create an HNSW Index for fast searching (Cosine Similarity)
CREATE INDEX IF NOT EXISTS idx_error_patterns_embedding
  ON error_patterns USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_doc_references_embedding
  ON doc_references USING hnsw (embedding vector_cosine_ops);

-- 5. Create index on signature for quick lookups
CREATE INDEX IF NOT EXISTS idx_error_patterns_signature
  ON error_patterns(signature);

-- 6. Create index on file_path for filtering
CREATE INDEX IF NOT EXISTS idx_error_patterns_file_path
  ON error_patterns(file_path);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 76 Level 2 schema created successfully!';
  RAISE NOTICE 'Tables: error_patterns, doc_references';
  RAISE NOTICE 'Indexes: HNSW vector indexes for fast similarity search';
END $$;

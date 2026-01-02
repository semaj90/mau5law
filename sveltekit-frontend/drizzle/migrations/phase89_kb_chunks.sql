-- Phase 89: Knowledge Base Chunks Table (pgvector mirror)
-- Mirrors Qdrant collections with PostgreSQL hybrid search (vector + BM25)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base chunks table
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id TEXT NOT NULL,
  source TEXT NOT NULL,             -- 'code' | 'docs' | 'ui' | 'errors'
  path TEXT,                        -- file path or URL
  section TEXT,                     -- function name, route, component
  chunk_index INTEGER NOT NULL,
  chunk_id TEXT UNIQUE NOT NULL,    -- Globally unique chunk ID
  text TEXT NOT NULL,
  embedding vector(768),            -- embeddinggemma:latest dimension
  tags TEXT[] DEFAULT '{}',
  cluster_id INTEGER,
  metadata JSONB DEFAULT '{}',      -- Flexible metadata storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hybrid search
CREATE INDEX IF NOT EXISTS kb_chunks_source_idx ON kb_chunks(source);
CREATE INDEX IF NOT EXISTS kb_chunks_doc_id_idx ON kb_chunks(doc_id);
CREATE INDEX IF NOT EXISTS kb_chunks_path_idx ON kb_chunks(path);
CREATE INDEX IF NOT EXISTS kb_chunks_cluster_idx ON kb_chunks(cluster_id);

-- Full-text search index (BM25)
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks
  USING GIN (to_tsvector('english', text));

-- GIN index for tags
CREATE INDEX IF NOT EXISTS kb_chunks_tags_idx ON kb_chunks USING GIN (tags);

-- HNSW index for vector similarity
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx ON kb_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function for hybrid search (vector + BM25 rerank)
CREATE OR REPLACE FUNCTION hybrid_search_kb(
  query_embedding vector(768),
  query_text TEXT,
  filter_source TEXT DEFAULT NULL,
  top_k INTEGER DEFAULT 20,
  vector_weight FLOAT DEFAULT 0.7
) RETURNS TABLE (
  id UUID,
  doc_id TEXT,
  source TEXT,
  path TEXT,
  section TEXT,
  text TEXT,
  cos_sim FLOAT,
  bm25_score FLOAT,
  hybrid_score FLOAT,
  tags TEXT[],
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.doc_id,
    kb.source,
    kb.path,
    kb.section,
    kb.text,
    (1 - (kb.embedding <=> query_embedding)) AS cos_sim,
    ts_rank_cd(
      to_tsvector('english', kb.text),
      websearch_to_tsquery('english', query_text)
    ) AS bm25_score,
    (
      (1 - (kb.embedding <=> query_embedding)) * vector_weight +
      ts_rank_cd(to_tsvector('english', kb.text), websearch_to_tsquery('english', query_text)) * (1 - vector_weight)
    ) AS hybrid_score,
    kb.tags,
    kb.metadata
  FROM kb_chunks kb
  WHERE (filter_source IS NULL OR kb.source = filter_source)
  ORDER BY hybrid_score DESC
  LIMIT top_k;
END;
$$ LANGUAGE plpgsql;

-- ACE runs table (execution DAG for training data)
CREATE TABLE IF NOT EXISTS ace_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT UNIQUE NOT NULL,
  batch_name TEXT NOT NULL,         -- 'set_corruption', 'dbscan_clustering', etc.
  files_changed INTEGER DEFAULT 0,
  edits INTEGER DEFAULT 0,
  check_errors_before INTEGER,
  check_errors_after INTEGER,
  top_causes JSONB DEFAULT '[]',    -- Array of error patterns
  next_actions JSONB DEFAULT '[]',  -- Recommended next steps
  execution_time_ms FLOAT,
  llm_summary TEXT,                 -- Generated summary from gemma3-legal
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ACE runs
CREATE INDEX IF NOT EXISTS ace_runs_batch_idx ON ace_runs(batch_name);
CREATE INDEX IF NOT EXISTS ace_runs_created_idx ON ace_runs(created_at DESC);

-- Function to log ACE run
CREATE OR REPLACE FUNCTION log_ace_run(
  p_run_id TEXT,
  p_batch_name TEXT,
  p_files_changed INTEGER,
  p_edits INTEGER,
  p_errors_before INTEGER,
  p_errors_after INTEGER,
  p_top_causes JSONB,
  p_next_actions JSONB,
  p_exec_time FLOAT,
  p_summary TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ace_runs (
    run_id, batch_name, files_changed, edits,
    check_errors_before, check_errors_after,
    top_causes, next_actions, execution_time_ms, llm_summary
  ) VALUES (
    p_run_id, p_batch_name, p_files_changed, p_edits,
    p_errors_before, p_errors_after,
    p_top_causes, p_next_actions, p_exec_time, p_summary
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- View for recent ACE runs with metrics
CREATE OR REPLACE VIEW ace_recent_runs AS
SELECT
  run_id,
  batch_name,
  files_changed,
  edits,
  check_errors_before,
  check_errors_after,
  (check_errors_before - check_errors_after) AS errors_fixed,
  CASE
    WHEN check_errors_before > 0 THEN
      ROUND(((check_errors_before - check_errors_after)::FLOAT / check_errors_before * 100), 2)
    ELSE 0
  END AS improvement_pct,
  execution_time_ms,
  created_at
FROM ace_runs
ORDER BY created_at DESC
LIMIT 50;

COMMENT ON TABLE kb_chunks IS 'pgvector mirror of Qdrant knowledge base collections';
COMMENT ON TABLE ace_runs IS 'ACE execution DAG for training data and replay';
COMMENT ON FUNCTION hybrid_search_kb IS 'Hybrid vector + BM25 search with reranking';

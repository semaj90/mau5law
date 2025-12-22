-- Phase 78: Create error_cluster_embeddings table with 768 dimensions
-- This matches the actual output from embeddinggemma:latest (768d)

CREATE TABLE IF NOT EXISTS error_cluster_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id text NOT NULL UNIQUE REFERENCES error_clusters(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT 'embeddinggemma:latest',
  dimensions integer NOT NULL DEFAULT 768,
  embedding vector(768) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS error_cluster_embeddings_cluster_id_idx
  ON error_cluster_embeddings(cluster_id);

CREATE INDEX IF NOT EXISTS error_cluster_embeddings_embedding_cosine_idx
  ON error_cluster_embeddings USING hnsw (embedding vector_cosine_ops);

-- Comment for documentation
COMMENT ON TABLE error_cluster_embeddings IS
  'Phase 78: Stores 768-dimensional embeddings for error clusters using embeddinggemma:latest model';

-- Verify table was created
\d+ error_cluster_embeddings

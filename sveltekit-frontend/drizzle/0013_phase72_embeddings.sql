-- Phase 72: Add embedding column for GPU-accelerated semantic clustering
-- Migration: 0013_phase72_embeddings.sql

DO $$
BEGIN
  -- Add embedding column if it doesn't exist (vector type for pgvector)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phase72_error' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE phase72_error ADD COLUMN embedding vector(384);
    COMMENT ON COLUMN phase72_error.embedding IS 'embeddinggemma vector for semantic similarity';
  END IF;

  -- Add occurrence tracking columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phase72_error' AND column_name = 'occurrence_count'
  ) THEN
    ALTER TABLE phase72_error ADD COLUMN occurrence_count INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'phase72_error' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE phase72_error ADD COLUMN last_seen TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS phase72_error_embedding_idx
ON phase72_error USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS phase72_error_last_seen_idx
ON phase72_error (last_seen DESC);

-- Create index for occurrence tracking
CREATE INDEX IF NOT EXISTS phase72_error_occurrence_idx
ON phase72_error (occurrence_count DESC);

COMMENT ON TABLE phase72_error IS 'Phase 72: AST Error Brain with GPU embeddings';

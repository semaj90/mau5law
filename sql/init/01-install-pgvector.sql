-- Install pgvector extension
-- This script runs automatically when Postgres container starts

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

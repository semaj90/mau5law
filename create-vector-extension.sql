-- Create pgvector extension for legal_ai_db
-- Run this after installing the pgvector files

\echo '🚀 Creating pgvector extension...'

-- Create the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension was created
\echo '✅ Checking extension status...'
SELECT 
    extname as "Extension Name",
    extversion as "Version",
    extrelocatable as "Relocatable"
FROM pg_extension 
WHERE extname = 'vector';

-- Test vector functionality
\echo '🧪 Testing vector functionality...'

-- Create a test table with vector column
DROP TABLE IF EXISTS test_vectors;
CREATE TABLE test_vectors (
    id SERIAL PRIMARY KEY,
    name TEXT,
    embedding vector(3)  -- 3-dimensional for testing
);

-- Insert test data
INSERT INTO test_vectors (name, embedding) VALUES
    ('test1', '[1,2,3]'),
    ('test2', '[4,5,6]'),
    ('test3', '[7,8,9]');

-- Test vector similarity search
\echo '🔍 Testing similarity search...'
SELECT 
    name,
    embedding,
    embedding <=> '[2,3,4]' as distance
FROM test_vectors 
ORDER BY embedding <=> '[2,3,4]' 
LIMIT 2;

-- Test vector operations
\echo '📊 Testing vector operations...'
SELECT 
    name,
    embedding,
    embedding <-> '[2,3,4]' as l2_distance,
    embedding <#> '[2,3,4]' as max_inner_product,
    embedding <=> '[2,3,4]' as cosine_distance
FROM test_vectors;

-- Create index for performance
\echo '🏗️ Creating vector index...'
CREATE INDEX test_vectors_embedding_idx ON test_vectors 
USING ivfflat (embedding vector_l2_ops) WITH (lists = 1);

-- Show available vector operators
\echo '🔧 Available vector operators:'
SELECT 
    oprname,
    oprleft::regtype,
    oprright::regtype,
    oprresult::regtype
FROM pg_operator 
WHERE oprname IN ('<->', '<#>', '<=>') 
ORDER BY oprname;

-- Clean up test table
DROP TABLE test_vectors;

\echo '✅ pgvector extension test completed successfully!'
\echo '🎉 Your PostgreSQL 17 now supports vector operations!'
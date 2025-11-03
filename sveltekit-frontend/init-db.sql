-- Initialize PostgreSQL database with pgvector extension -- This script runs when the PostgreSQL container starts --
Enable pgvector extension CREATE EXTENSION IF NOT EXISTS vector; -- Create case_memories table for context-aware AI
memory CREATE TABLE IF NOT EXISTS case_memories ( id SERIAL PRIMARY KEY, case_id VARCHAR(255) NOT NULL, memory_json
JSONB NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL ); -- Create
indexes for performance CREATE INDEX IF NOT EXISTS case_memories_case_id_idx ON case_memories(case_id); CREATE INDEX IF
NOT EXISTS case_memories_updated_at_idx ON case_memories(updated_at); CREATE INDEX IF NOT EXISTS
case_memories_memory_json_gin_idx ON case_memories USING GIN (memory_json); -- Create memory_interactions table for
vector search CREATE TABLE IF NOT EXISTS memory_interactions ( id VARCHAR(255) PRIMARY KEY, user_id VARCHAR(255) NOT
NULL, case_id VARCHAR(255) NOT NULL, session_id VARCHAR(255) NOT NULL, type VARCHAR(100) NOT NULL, content TEXT NOT
NULL, response TEXT, embedding VECTOR(768), metadata JSONB, importance FLOAT DEFAULT 1.0, decay FLOAT DEFAULT 1.0,
created_at TIMESTAMP DEFAULT NOW(), accessed_at TIMESTAMP DEFAULT NOW() ); -- Create indexes for vector search
performance CREATE INDEX IF NOT EXISTS memory_interactions_case_id_idx ON memory_interactions(case_id); CREATE INDEX IF
NOT EXISTS memory_interactions_user_id_idx ON memory_interactions(user_id); CREATE INDEX IF NOT EXISTS
memory_interactions_session_id_idx ON memory_interactions(session_id); CREATE INDEX IF NOT EXISTS
memory_interactions_created_at_idx ON memory_interactions(created_at); CREATE INDEX IF NOT EXISTS
memory_interactions_embedding_idx ON memory_interactions USING ivfflat (embedding vector_cosine_ops); -- Create evidence
table for legal documents CREATE TABLE IF NOT EXISTS evidence ( id SERIAL PRIMARY KEY, case_id VARCHAR(255) NOT NULL,
document_id VARCHAR(255) NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, embedding VECTOR(768), metadata JSONB,
file_path TEXT, file_type VARCHAR(100), file_size BIGINT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP
DEFAULT NOW() ); -- Create indexes for evidence search CREATE INDEX IF NOT EXISTS evidence_case_id_idx ON
evidence(case_id); CREATE INDEX IF NOT EXISTS evidence_document_id_idx ON evidence(document_id); CREATE INDEX IF NOT
EXISTS evidence_embedding_idx ON evidence USING ivfflat (embedding vector_cosine_ops); CREATE INDEX IF NOT EXISTS
evidence_metadata_gin_idx ON evidence USING GIN (metadata); -- Create cases table CREATE TABLE IF NOT EXISTS cases ( id
VARCHAR(255) PRIMARY KEY, title TEXT NOT NULL, description TEXT, status VARCHAR(100) DEFAULT 'active', metadata JSONB,
created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() ); -- Create users table CREATE TABLE IF NOT
EXISTS users ( id VARCHAR(255) PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, role
VARCHAR(100) DEFAULT 'user', metadata JSONB, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW() );
-- Insert sample data INSERT INTO cases (id, title, description, status) VALUES ('case-001', 'Sample Legal Case', 'A
sample legal case for testing', 'active') ON CONFLICT (id) DO NOTHING; INSERT INTO users (id, email, name, role) VALUES
('user-001', 'test@example.com', 'Test User', 'admin') ON CONFLICT (id) DO NOTHING; -- Grant permissions GRANT ALL
PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO
postgres;

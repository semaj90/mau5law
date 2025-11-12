-- Create the user role if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'legal_admin') THEN

      CREATE ROLE legal_admin LOGIN PASSWORD '123456';
   END IF;
END
$do$;

-- Grant necessary privileges
ALTER ROLE legal_admin CREATEDB;

-- Create the database if it doesn't exist and set the owner
-- Note: This part needs to be run by a superuser (like the default 'postgres' user)
-- It's best handled by environment variables in docker-compose, but we can ensure ownership here.
\c postgres;
CREATE DATABASE legal_ai_db OWNER legal_admin;
GRANT ALL PRIVILEGES ON DATABASE legal_ai_db TO legal_admin;

-- Switch to the legal_ai_db database
\c legal_ai_db;

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create legal documents table with vector embeddings
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    embedding vector(384), -- 384 dimensions for legal document embeddings
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_legal_documents_embedding ON legal_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_legal_documents_metadata ON legal_documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_legal_documents_created_at ON legal_documents (created_at);

-- Create user sessions table for caching
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- Create MCP context table for AI agent memory
CREATE TABLE IF NOT EXISTS mcp_context (
    id SERIAL PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    observations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for MCP context
CREATE INDEX IF NOT EXISTS idx_mcp_context_entity_name ON mcp_context (entity_name);
CREATE INDEX IF NOT EXISTS idx_mcp_context_entity_type ON mcp_context (entity_type);

-- Create MCP relations table
CREATE TABLE IF NOT EXISTS mcp_relations (
    id SERIAL PRIMARY KEY,
    from_entity TEXT NOT NULL,
    to_entity TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for MCP relations
CREATE INDEX IF NOT EXISTS idx_mcp_relations_from_entity ON mcp_relations (from_entity);
CREATE INDEX IF NOT EXISTS idx_mcp_relations_to_entity ON mcp_relations (to_entity);
CREATE INDEX IF NOT EXISTS idx_mcp_relations_type ON mcp_relations (relation_type);

-- Grant permissions to legal_admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO legal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO legal_admin;

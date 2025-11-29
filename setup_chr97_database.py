#!/usr/bin/env python3
"""
CHR97 Database Setup - Consolidated PostgreSQL with pgvector
Creates partitioned schemas for legal AI data consolidation
"""

import psycopg2
import sys
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_chr97_database():
    """Setup consolidated CHR97 database with pgvector partitioning"""

    # Connect to default postgres database first to create our database
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="postgres",
            user="postgres",
            password="password"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Create database if it doesn't exist
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'legal_db'")
        if not cursor.fetchone():
            cursor.execute("CREATE DATABASE legal_db")
            print("✅ Database legal_db created")

        cursor.close()
        conn.close()

        # Now connect to our database
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="legal_db",
            user="postgres",
            password="password"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("🔧 Setting up CHR97 Consolidated Database...")

        # Enable pgvector extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        print("✅ pgvector extension enabled")

        # Create partitioned schemas
        schemas = [
            "chr97_documents",    # Document metadata and content
            "chr97_embeddings",   # Vector embeddings (replaces Qdrant)
            "chr97_cache",        # Pattern cache (complements Redis)
            "chr97_metadata",     # Citations, tags, relationships
            "chr97_agent",        # Agent state and timelines
        ]

        for schema in schemas:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema};")
            print(f"✅ Schema {schema} created")

        # Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chr97_documents.legal_documents (
                id SERIAL PRIMARY KEY,
                doc_id VARCHAR(255) UNIQUE NOT NULL,
                content TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON chr97_documents.legal_documents (doc_id);
            CREATE INDEX IF NOT EXISTS idx_documents_metadata ON chr97_documents.legal_documents USING GIN (metadata);
        """)

        # Note: Partitioning removed for simplicity - can add later if needed

        # Embeddings table with pgvector (replaces Qdrant functionality)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chr97_embeddings.document_embeddings (
                id SERIAL PRIMARY KEY,
                doc_id VARCHAR(255) NOT NULL,
                embedding vector(768),  -- Adjust dimension as needed
                chunk_text TEXT,
                chunk_index INTEGER,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES chr97_documents.legal_documents(doc_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_embeddings_doc_id ON chr97_embeddings.document_embeddings (doc_id);
            CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON chr97_embeddings.document_embeddings USING ivfflat (embedding vector_cosine_ops);
        """)

        # Pattern cache table (CHR-ROM patterns)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chr97_cache.pattern_cache (
                cache_key VARCHAR(512) PRIMARY KEY,
                pattern_data TEXT NOT NULL,
                pattern_type VARCHAR(100),
                ttl_seconds INTEGER DEFAULT 3600,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cache_key ON chr97_cache.pattern_cache (cache_key);
            CREATE INDEX IF NOT EXISTS idx_cache_type ON chr97_cache.pattern_cache (pattern_type);
        """)

        # Citations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chr97_metadata.citations (
                id SERIAL PRIMARY KEY,
                citation_text TEXT NOT NULL,
                doc_id VARCHAR(255),
                relevance_score FLOAT,
                is_saved BOOLEAN DEFAULT FALSE,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES chr97_documents.legal_documents(doc_id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_citations_saved ON chr97_metadata.citations (is_saved, relevance_score DESC);
            CREATE INDEX IF NOT EXISTS idx_citations_doc ON chr97_metadata.citations (doc_id);
        """)

        # Agent state table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chr97_agent.agent_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                current_state JSONB,
                timeline JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_agent_user ON chr97_agent.agent_sessions (user_id);
        """)

        # Create views for easy access
        cursor.execute("""
            CREATE OR REPLACE VIEW chr97_documents.all_documents AS
            SELECT * FROM chr97_documents.legal_documents;
        """)

        cursor.execute("""
            CREATE OR REPLACE VIEW chr97_embeddings.all_embeddings AS
            SELECT * FROM chr97_embeddings.document_embeddings;
        """)

        print("✅ CHR97 database schema created successfully")
        print("🎯 Ready for vector operations with pgvector")
        print("🚀 Consolidated: Documents + Embeddings + Cache + Metadata + Agent state")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    setup_chr97_database()
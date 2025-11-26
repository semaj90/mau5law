-- Legal AI Platform Database Schema
-- PostgreSQL 17 with pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Documents table for storing legal documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    document_type VARCHAR(100),
    source VARCHAR(200),
    external_id VARCHAR(200) UNIQUE,
    file_path VARCHAR(1000),
    mime_type VARCHAR(100),
    file_size BIGINT,
    checksum VARCHAR(128),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    indexed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Document chunks for semantic search
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768), -- Adjust dimension based on your embedding model
    token_count INTEGER,
    page_number INTEGER,
    section VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- Evidence extraction results
CREATE TABLE IF NOT EXISTS evidence_extractions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    evidence_type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2),
    bounding_box JSONB, -- For OCR/image evidence
    page_number INTEGER,
    position_start INTEGER,
    position_end INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal cases and precedents
CREATE TABLE IF NOT EXISTS legal_cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(200) UNIQUE,
    title VARCHAR(1000) NOT NULL,
    court VARCHAR(200),
    jurisdiction VARCHAR(200),
    decision_date DATE,
    summary TEXT,
    full_text TEXT,
    outcome VARCHAR(500),
    judges TEXT[], -- Array of judge names
    lawyers JSONB, -- Plaintiff/defendant lawyers
    citations TEXT[], -- Cited cases
    keywords TEXT[],
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-document relationships
CREATE TABLE IF NOT EXISTS case_documents (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES legal_cases(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100), -- 'cited', 'related', 'precedent', etc.
    relevance_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_id, document_id, relationship_type)
);

-- User sessions and queries
CREATE TABLE IF NOT EXISTS user_queries (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(200),
    user_id VARCHAR(200),
    query_text TEXT NOT NULL,
    query_type VARCHAR(50) DEFAULT 'search',
    filters JSONB DEFAULT '{}',
    result_count INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query results cache
CREATE TABLE IF NOT EXISTS query_results (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES user_queries(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,4),
    rank_position INTEGER,
    result_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Authority relationships (graph data)
CREATE TABLE IF NOT EXISTS authority_relationships (
    id SERIAL PRIMARY KEY,
    source_id INTEGER, -- Can reference documents, cases, or entities
    source_type VARCHAR(50), -- 'document', 'case', 'entity'
    target_id INTEGER,
    target_type VARCHAR(50),
    relationship_type VARCHAR(100) NOT NULL,
    confidence DECIMAL(3,2),
    evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_id, source_type, target_id, target_type, relationship_type)
);

-- Named entities extracted from documents
CREATE TABLE IF NOT EXISTS named_entities (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'person', 'organization', 'location', 'date', etc.
    entity_text VARCHAR(500) NOT NULL,
    confidence DECIMAL(3,2),
    position_start INTEGER,
    position_end INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing jobs queue
CREATE TABLE IF NOT EXISTS processing_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    payload JSONB DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_external_id ON documents(external_id);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_evidence_document ON evidence_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_extractions(evidence_type);

CREATE INDEX IF NOT EXISTS idx_cases_court ON legal_cases(court);
CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction ON legal_cases(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_cases_date ON legal_cases(decision_date);
CREATE INDEX IF NOT EXISTS idx_cases_embedding ON legal_cases USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_case_docs_case ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_docs_document ON case_documents(document_id);

CREATE INDEX IF NOT EXISTS idx_queries_session ON user_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_queries_created ON user_queries(created_at);

CREATE INDEX IF NOT EXISTS idx_query_results_query ON query_results(query_id);
CREATE INDEX IF NOT EXISTS idx_query_results_document ON query_results(document_id);

CREATE INDEX IF NOT EXISTS idx_authority_source ON authority_relationships(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_authority_target ON authority_relationships(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_authority_type ON authority_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_entities_document ON named_entities(document_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON named_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_text ON named_entities(entity_text);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON processing_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON processing_jobs(priority DESC, created_at ASC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_documents_content_gin ON documents USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_documents_title_gin ON documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_cases_summary_gin ON legal_cases USING gin(to_tsvector('english', summary));
CREATE INDEX IF NOT EXISTS idx_cases_full_text_gin ON legal_cases USING gin(to_tsvector('english', full_text));

-- JSONB indexes for metadata
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_evidence_metadata ON evidence_extractions USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_entities_metadata ON named_entities USING gin(metadata);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON legal_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_authority_updated_at BEFORE UPDATE ON authority_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW document_search_view AS
SELECT
    d.id,
    d.title,
    d.content,
    d.document_type,
    d.source,
    d.created_at,
    d.metadata,
    COUNT(dc.id) as chunk_count,
    COUNT(ee.id) as evidence_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
LEFT JOIN evidence_extractions ee ON d.id = ee.document_id
GROUP BY d.id, d.title, d.content, d.document_type, d.source, d.created_at, d.metadata;

CREATE OR REPLACE VIEW case_analysis_view AS
SELECT
    lc.id,
    lc.case_number,
    lc.title,
    lc.court,
    lc.jurisdiction,
    lc.decision_date,
    lc.outcome,
    lc.summary,
    COUNT(cd.id) as related_documents,
    array_agg(DISTINCT cd.relationship_type) as relationship_types
FROM legal_cases lc
LEFT JOIN case_documents cd ON lc.id = cd.case_id
GROUP BY lc.id, lc.case_number, lc.title, lc.court, lc.jurisdiction, lc.decision_date, lc.outcome, lc.summary;

-- Insert some sample data for testing
INSERT INTO documents (title, content, document_type, source) VALUES
('Sample Contract Agreement', 'This is a sample contract for testing purposes...', 'contract', 'test_data'),
('Legal Brief Example', 'Sample legal brief with case analysis...', 'brief', 'test_data')
ON CONFLICT (external_id) DO NOTHING;

-- Sample processing job
INSERT INTO processing_jobs (job_type, payload) VALUES
('document_ingestion', '{"document_id": 1, "priority": "high"}'),
('evidence_extraction', '{"document_id": 1, "models": ["yolo_seal", "ocr_docling"]}')
ON CONFLICT DO NOTHING;
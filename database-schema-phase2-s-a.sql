-- Phase 2 Sprint S-A: Citation Management Database Schema
-- Add tables for citation management and statute search history

-- Saved citations table
CREATE TABLE IF NOT EXISTS saved_citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    citation_text VARCHAR(500) NOT NULL,
    statute_code VARCHAR(100),
    statute_title VARCHAR(255),
    statute_section VARCHAR(100),
    statute_subsection VARCHAR(100),
    statute_url VARCHAR(500),
    source_type VARCHAR(50), -- 'statute', 'case_law', 'regulation', 'manual'
    source_document_id UUID REFERENCES document_metadata(id) ON DELETE SET NULL,
    page_number INTEGER,
    context_text TEXT, -- surrounding text for context
    relevance_score FLOAT DEFAULT 0.0,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb, -- array of tags
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Statute search history table
CREATE TABLE IF NOT EXISTS statute_search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(500) NOT NULL,
    statute_code VARCHAR(100),
    statute_title VARCHAR(255),
    results_count INTEGER DEFAULT 0,
    search_type VARCHAR(50), -- 'keyword', 'code', 'title'
    filters JSONB DEFAULT '{}'::jsonb, -- search filters applied
    created_at TIMESTAMP DEFAULT NOW()
);

-- Citation collections table (for organizing citations)
CREATE TABLE IF NOT EXISTS citation_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- for UI display
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Citation tags table
CREATE TABLE IF NOT EXISTS citation_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_color VARCHAR(20),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tag_name)
);

-- Junction table: citations to collections
CREATE TABLE IF NOT EXISTS collection_citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES citation_collections(id) ON DELETE CASCADE,
    citation_id UUID NOT NULL REFERENCES saved_citations(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, citation_id)
);

-- Citation audit log table
CREATE TABLE IF NOT EXISTS citation_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    citation_id UUID REFERENCES saved_citations(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'tagged', 'shared'
    action_details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_citations_user_id ON saved_citations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_citations_case_id ON saved_citations(case_id);
CREATE INDEX IF NOT EXISTS idx_saved_citations_statute_code ON saved_citations(statute_code);
CREATE INDEX IF NOT EXISTS idx_saved_citations_created_at ON saved_citations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_citations_tags ON saved_citations USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_statute_search_history_user_id ON statute_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_statute_search_history_statute_code ON statute_search_history(statute_code);
CREATE INDEX IF NOT EXISTS idx_statute_search_history_created_at ON statute_search_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citation_collections_user_id ON citation_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_citation_collections_is_public ON citation_collections(is_public);

CREATE INDEX IF NOT EXISTS idx_citation_tags_user_id ON citation_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_citation_tags_tag_name ON citation_tags(tag_name);

CREATE INDEX IF NOT EXISTS idx_collection_citations_collection_id ON collection_citations(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_citations_citation_id ON collection_citations(citation_id);

CREATE INDEX IF NOT EXISTS idx_citation_audit_log_user_id ON citation_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_citation_audit_log_citation_id ON citation_audit_log(citation_id);
CREATE INDEX IF NOT EXISTS idx_citation_audit_log_created_at ON citation_audit_log(created_at DESC);

-- Full-text search index for citations
CREATE INDEX IF NOT EXISTS idx_saved_citations_fts ON saved_citations USING GIN(
    to_tsvector('english', citation_text || ' ' || COALESCE(statute_title, '') || ' ' || COALESCE(context_text, ''))
);

-- Create views for common queries

-- View: User's recent citations
CREATE OR REPLACE VIEW user_recent_citations AS
SELECT
    sc.id,
    sc.user_id,
    sc.citation_text,
    sc.statute_code,
    sc.statute_title,
    sc.source_type,
    sc.created_at,
    COUNT(DISTINCT cc.collection_id) as collection_count,
    COUNT(DISTINCT ct.id) as tag_count
FROM saved_citations sc
LEFT JOIN collection_citations cc ON sc.id = cc.citation_id
LEFT JOIN citation_tags ct ON sc.id = ANY(sc.tags)
GROUP BY sc.id, sc.user_id, sc.citation_text, sc.statute_code, sc.statute_title, sc.source_type, sc.created_at
ORDER BY sc.created_at DESC;

-- View: Citation statistics by user
CREATE OR REPLACE VIEW citation_statistics AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(DISTINCT sc.id) as total_citations,
    COUNT(DISTINCT sc.case_id) as cases_with_citations,
    COUNT(DISTINCT sc.statute_code) as unique_statutes,
    COUNT(DISTINCT cc.collection_id) as total_collections,
    MAX(sc.created_at) as last_citation_date
FROM users u
LEFT JOIN saved_citations sc ON u.id = sc.user_id
LEFT JOIN collection_citations cc ON sc.id = cc.citation_id
GROUP BY u.id, u.email;

-- View: Most used statutes
CREATE OR REPLACE VIEW most_used_statutes AS
SELECT
    sc.statute_code,
    sc.statute_title,
    COUNT(*) as usage_count,
    COUNT(DISTINCT sc.user_id) as user_count,
    AVG(sc.relevance_score) as avg_relevance
FROM saved_citations sc
WHERE sc.statute_code IS NOT NULL
GROUP BY sc.statute_code, sc.statute_title
ORDER BY usage_count DESC;

-- Grants (if using role-based access)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON saved_citations TO app_user;
-- GRANT SELECT, INSERT ON statute_search_history TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON citation_collections TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON citation_tags TO app_user;
-- GRANT SELECT, INSERT, DELETE ON collection_citations TO app_user;
-- GRANT SELECT, INSERT ON citation_audit_log TO app_user;

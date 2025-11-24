-- Citation Tags, Evidence Tags, RAG Index Metadata, and Audit Log Migration
-- Adds support for editable citation tags, tag-aware RAG search, and audit logging

-- ============================================================================
-- Citation Tags Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS citation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  description TEXT,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  base_weight INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(name, jurisdiction)
);

-- Citation Tags Indexes
CREATE INDEX IF NOT EXISTS idx_citation_tags_jurisdiction ON citation_tags(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_citation_tags_name_jurisdiction ON citation_tags(name, jurisdiction);

-- ============================================================================
-- Evidence Tags M2M Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES citation_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(evidence_id, tag_id)
);

-- Evidence Tags Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_tag_id ON evidence_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_evidence_tag ON evidence_tags(evidence_id, tag_id);

-- ============================================================================
-- RAG Index Metadata Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_index_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES evidence_chunks(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  tag_weight INTEGER DEFAULT 1 NOT NULL,
  jurisdiction VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- RAG Index Metadata Indexes
CREATE INDEX IF NOT EXISTS idx_rag_index_metadata_chunk_id ON rag_index_metadata(chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_index_metadata_evidence_id ON rag_index_metadata(evidence_id);
CREATE INDEX IF NOT EXISTS idx_rag_index_metadata_jurisdiction ON rag_index_metadata(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_rag_index_metadata_tags ON rag_index_metadata USING gin(tags);

-- ============================================================================
-- Audit Log Table (Immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NOT NULL,
  operation VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type_id ON audit_log(resource_type, resource_id);

-- ============================================================================
-- Verify Schema
-- ============================================================================

-- List all created tables
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'evidence_files',
  'evidence_chunks',
  'evidence_embeddings',
  'citation_tags',
  'evidence_tags',
  'rag_index_metadata',
  'audit_log'
)
ORDER BY tablename;

-- List all created indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'evidence_files',
  'evidence_chunks',
  'evidence_embeddings',
  'citation_tags',
  'evidence_tags',
  'rag_index_metadata',
  'audit_log'
)
ORDER BY tablename, indexname;


-- Phase 89: Timeline & Audit Tables
-- Creates PostgreSQL tables for Qdrant event tracking and fix audit trail

-- 1. Timeline of all Qdrant vector operations
CREATE TABLE IF NOT EXISTS phase89_vector_events (
    event_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation VARCHAR(50) NOT NULL,  -- 'upsert', 'update', 'delete', 'create_collection'
    collection VARCHAR(255) NOT NULL,
    point_id VARCHAR(255),
    actor VARCHAR(100) DEFAULT 'system',  -- 'user', 'agentic', 'system'
    payload JSONB,  -- Full payload for audit
    note_text TEXT,  -- Human-readable description (embedded for semantic search)
    note_embedding VECTOR(768),  -- Embedding of note_text
    tags TEXT[],  -- Searchable tags: ['phase89', 'error_fix', 'cache_update']
    ref VARCHAR(255),  -- Reference ID (file_path, error_id, etc.)
    metadata JSONB,  -- Additional context
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for timeline queries
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_timestamp ON phase89_vector_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_collection ON phase89_vector_events(collection);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_operation ON phase89_vector_events(operation);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_actor ON phase89_vector_events(actor);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_ref ON phase89_vector_events(ref);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_tags ON phase89_vector_events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_payload ON phase89_vector_events USING GIN(payload);

-- Vector index for semantic timeline search
CREATE INDEX IF NOT EXISTS idx_phase89_vector_events_embedding ON phase89_vector_events
USING ivfflat (note_embedding vector_cosine_ops) WITH (lists = 100);

-- 2. Fix attempts audit trail (all agentic + manual fixes)
CREATE TABLE IF NOT EXISTS phase89_fix_attempts (
    attempt_id SERIAL PRIMARY KEY,
    file_path VARCHAR(500) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    original_code TEXT,
    generated_fix TEXT,
    fix_explanation TEXT,
    sources_used JSONB,  -- Array of source IDs/URLs
    confidence_score FLOAT,
    llm_provider VARCHAR(50),
    llm_model VARCHAR(100),
    generation_method VARCHAR(50),  -- 'agentic', 'manual', 'auto-approved'
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    applied_by VARCHAR(100),
    success BOOLEAN,
    error_after_fix TEXT,
    reverted BOOLEAN DEFAULT FALSE,
    reverted_at TIMESTAMPTZ,
    reverted_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fix queries
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_file ON phase89_fix_attempts(file_path);
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_error_type ON phase89_fix_attempts(error_type);
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_timestamp ON phase89_fix_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_applied ON phase89_fix_attempts(applied);
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_success ON phase89_fix_attempts(success) WHERE success IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_phase89_fix_attempts_sources ON phase89_fix_attempts USING GIN(sources_used);

-- 3. Cache hit tracking (semantic cache reuse metrics)
CREATE TABLE IF NOT EXISTS phase89_cache_hits (
    hit_id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_embedding VECTOR(768),
    cache_key VARCHAR(255) NOT NULL,
    cache_source VARCHAR(50),  -- 'redis', 'qdrant'
    hit_score FLOAT,  -- Similarity score for semantic cache
    reused BOOLEAN DEFAULT TRUE,
    ttl_seconds INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cache analytics
CREATE INDEX IF NOT EXISTS idx_phase89_cache_hits_key ON phase89_cache_hits(cache_key);
CREATE INDEX IF NOT EXISTS idx_phase89_cache_hits_source ON phase89_cache_hits(cache_source);
CREATE INDEX IF NOT EXISTS idx_phase89_cache_hits_timestamp ON phase89_cache_hits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase89_cache_hits_reused ON phase89_cache_hits(reused);

-- Vector index for semantic cache lookup
CREATE INDEX IF NOT EXISTS idx_phase89_cache_hits_embedding ON phase89_cache_hits
USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

-- Analytics views
CREATE OR REPLACE VIEW phase89_recent_timeline AS
SELECT
    event_id,
    timestamp,
    operation,
    collection,
    actor,
    note_text,
    tags,
    ref
FROM phase89_vector_events
ORDER BY timestamp DESC
LIMIT 100;

CREATE OR REPLACE VIEW phase89_fix_success_rate AS
SELECT
    error_type,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE applied) as applied_count,
    COUNT(*) FILTER (WHERE success) as success_count,
    ROUND(AVG(confidence_score), 2) as avg_confidence,
    COUNT(DISTINCT file_path) as unique_files
FROM phase89_fix_attempts
GROUP BY error_type
ORDER BY total_attempts DESC;

CREATE OR REPLACE VIEW phase89_cache_performance AS
SELECT
    cache_source,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE reused) as cache_hits,
    ROUND(AVG(hit_score), 3) as avg_similarity,
    COUNT(*) FILTER (WHERE NOT reused) as cache_misses
FROM phase89_cache_hits
GROUP BY cache_source, hour
ORDER BY hour DESC
LIMIT 24;

-- Helper function: Log Qdrant event
CREATE OR REPLACE FUNCTION log_qdrant_event(
    p_operation VARCHAR,
    p_collection VARCHAR,
    p_point_id VARCHAR DEFAULT NULL,
    p_actor VARCHAR DEFAULT 'system',
    p_payload JSONB DEFAULT NULL,
    p_note_text TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_ref VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    new_event_id INTEGER;
BEGIN
    INSERT INTO phase89_vector_events (
        operation, collection, point_id, actor, payload, note_text, tags, ref
    ) VALUES (
        p_operation, p_collection, p_point_id, p_actor, p_payload, p_note_text, p_tags, p_ref
    ) RETURNING event_id INTO new_event_id;

    RETURN new_event_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get recent changes for a file
CREATE OR REPLACE FUNCTION get_file_timeline(p_file_path VARCHAR, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    timestamp TIMESTAMPTZ,
    operation VARCHAR,
    collection VARCHAR,
    note_text TEXT,
    actor VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.timestamp,
        e.operation,
        e.collection,
        e.note_text,
        e.actor
    FROM phase89_vector_events e
    WHERE e.ref = p_file_path
    ORDER BY e.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Sample seed event
INSERT INTO phase89_vector_events (operation, collection, point_id, actor, note_text, tags, ref)
VALUES (
    'init',
    'phase89_timeline_cards',
    'system_init',
    'system',
    'Phase 89 timeline system initialized with timeline tracking, fix audit trail, and cache analytics',
    ARRAY['phase89', 'system', 'init'],
    'system'
) ON CONFLICT DO NOTHING;

-- Grant permissions (adjust user as needed)
-- GRANT SELECT, INSERT, UPDATE ON phase89_vector_events TO legal_admin;
-- GRANT SELECT, INSERT, UPDATE ON phase89_fix_attempts TO legal_admin;
-- GRANT SELECT, INSERT ON phase89_cache_hits TO legal_admin;

COMMENT ON TABLE phase89_vector_events IS 'Timeline of all Qdrant vector operations for semantic query of "what changed"';
COMMENT ON TABLE phase89_fix_attempts IS 'Audit trail of all fix attempts (agentic + manual) with provenance';
COMMENT ON TABLE phase89_cache_hits IS 'Semantic cache hit metrics for performance analysis';

-- ═══════════════════════════════════════════════════════════════════
-- Phase 89: VLM Timeline Tables (1024d Multimodal Embeddings)
-- ═══════════════════════════════════════════════════════════════════
--
-- Adds support for Gemma-3 VLM 1024-dimensional multimodal embeddings
-- alongside existing 768d Ollama embeddings (backward compatible)
--
-- Features:
-- - phase89_vector_events_vlm: 1024d embeddings with seal + layout
-- - phase89_unified_timeline: View combining both 768d and 1024d events
-- - Dual-embedding semantic search support
--
-- Author: ACE (Agentic Code Evolution)
-- Date: 2026-01-02
-- ═══════════════════════════════════════════════════════════════════

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════
-- Table: phase89_vector_events_vlm (1024d Multimodal)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS phase89_vector_events_vlm (
    event_id            SERIAL PRIMARY KEY,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation           VARCHAR(50) NOT NULL,           -- 'upsert', 'update', 'delete', 'seal_detection', etc.
    collection          VARCHAR(255) NOT NULL,          -- Qdrant collection name
    point_id            VARCHAR(255),                   -- Vector point ID
    actor               VARCHAR(100) DEFAULT 'system',  -- 'system', 'user', 'agentic', 'yolo_detector'

    -- Event description and embedding (1024d)
    note_text           TEXT,                           -- Human-readable description
    note_embedding      VECTOR(1024),                   -- 1024d VLM embedding (text + vision + layout + seal)

    -- Tagging and references
    tags                TEXT[],                         -- ['seal_detection', 'notary', 'high_confidence']
    ref                 VARCHAR(255),                   -- file_path, document_id, etc.

    -- Payload and metadata
    payload             JSONB,                          -- Full payload for audit trail
    metadata            JSONB,                          -- Additional context

    -- Multimodal-specific fields
    modality            VARCHAR(50) DEFAULT 'text',     -- 'text', 'image', 'multimodal'
    seal_confidence     FLOAT DEFAULT 0.0,              -- YOLO seal detection confidence (0.0-1.0)
    layout_boxes        JSONB,                          -- DocLing layout bounding boxes

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- Indexes for phase89_vector_events_vlm
-- ═══════════════════════════════════════════════════════════════════

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_phase89_vlm_timestamp
    ON phase89_vector_events_vlm (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_collection
    ON phase89_vector_events_vlm (collection);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_operation
    ON phase89_vector_events_vlm (operation);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_actor
    ON phase89_vector_events_vlm (actor);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_ref
    ON phase89_vector_events_vlm (ref);

-- Array and JSONB indexes
CREATE INDEX IF NOT EXISTS idx_phase89_vlm_tags
    ON phase89_vector_events_vlm USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_payload
    ON phase89_vector_events_vlm USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_metadata
    ON phase89_vector_events_vlm USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_layout_boxes
    ON phase89_vector_events_vlm USING GIN (layout_boxes);

-- Multimodal-specific indexes
CREATE INDEX IF NOT EXISTS idx_phase89_vlm_modality
    ON phase89_vector_events_vlm (modality);

CREATE INDEX IF NOT EXISTS idx_phase89_vlm_seal_confidence
    ON phase89_vector_events_vlm (seal_confidence DESC);

-- Vector similarity index (IVFFlat for 1024d)
CREATE INDEX IF NOT EXISTS idx_phase89_vlm_embedding
    ON phase89_vector_events_vlm
    USING ivfflat (note_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ═══════════════════════════════════════════════════════════════════
-- Unified Timeline View (768d + 1024d)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW phase89_unified_timeline AS
SELECT
    event_id,
    timestamp,
    operation,
    collection,
    point_id,
    actor,
    note_text,
    tags,
    ref,
    payload,
    metadata,
    '768d' as embedding_type,
    768 as embedding_dimension,
    NULL::VARCHAR(50) as modality,
    NULL::FLOAT as seal_confidence,
    NULL::JSONB as layout_boxes,
    created_at
FROM phase89_vector_events

UNION ALL

SELECT
    event_id,
    timestamp,
    operation,
    collection,
    point_id,
    actor,
    note_text,
    tags,
    ref,
    payload,
    metadata,
    '1024d' as embedding_type,
    1024 as embedding_dimension,
    modality,
    seal_confidence,
    layout_boxes,
    created_at
FROM phase89_vector_events_vlm

ORDER BY timestamp DESC;

-- ═══════════════════════════════════════════════════════════════════
-- Analytics Views
-- ═══════════════════════════════════════════════════════════════════

-- Multimodal event breakdown
CREATE OR REPLACE VIEW phase89_vlm_modality_stats AS
SELECT
    modality,
    COUNT(*) as event_count,
    AVG(seal_confidence) as avg_seal_confidence,
    MAX(timestamp) as latest_event,
    MIN(timestamp) as first_event
FROM phase89_vector_events_vlm
GROUP BY modality
ORDER BY event_count DESC;

-- High-confidence seal detections
CREATE OR REPLACE VIEW phase89_vlm_high_confidence_seals AS
SELECT
    event_id,
    timestamp,
    collection,
    point_id,
    note_text,
    seal_confidence,
    layout_boxes,
    ref,
    payload
FROM phase89_vector_events_vlm
WHERE modality IN ('image', 'multimodal')
  AND seal_confidence >= 0.8
ORDER BY seal_confidence DESC, timestamp DESC;

-- Recent multimodal events
CREATE OR REPLACE VIEW phase89_vlm_recent_multimodal AS
SELECT
    event_id,
    timestamp,
    operation,
    collection,
    note_text,
    modality,
    seal_confidence,
    tags,
    ref
FROM phase89_vector_events_vlm
WHERE modality = 'multimodal'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- ═══════════════════════════════════════════════════════════════════
-- Helper Functions
-- ═══════════════════════════════════════════════════════════════════

-- Function: Search timeline across both tables
CREATE OR REPLACE FUNCTION search_unified_timeline(
    query_text TEXT,
    search_limit INT DEFAULT 10,
    min_similarity FLOAT DEFAULT 0.7
) RETURNS TABLE (
    event_id INT,
    timestamp TIMESTAMPTZ,
    operation VARCHAR(50),
    collection VARCHAR(255),
    note_text TEXT,
    similarity FLOAT,
    embedding_type VARCHAR(10),
    modality VARCHAR(50)
) AS $$
BEGIN
    -- This is a template function
    -- Actual semantic search must be done via application code with embeddings
    RAISE NOTICE 'Use timeline logger search_timeline() method for semantic search';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: Get document seal timeline
CREATE OR REPLACE FUNCTION get_document_seal_timeline(
    doc_ref VARCHAR(255),
    event_limit INT DEFAULT 20
) RETURNS TABLE (
    event_id INT,
    timestamp TIMESTAMPTZ,
    operation VARCHAR(50),
    seal_confidence FLOAT,
    layout_boxes JSONB,
    note_text TEXT,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.event_id,
        v.timestamp,
        v.operation,
        v.seal_confidence,
        v.layout_boxes,
        v.note_text,
        v.tags
    FROM phase89_vector_events_vlm v
    WHERE v.ref = doc_ref
      AND v.modality IN ('image', 'multimodal')
    ORDER BY v.timestamp DESC
    LIMIT event_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- Migration Summary
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Phase 89: VLM Timeline Tables Migration Complete';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  ✅ phase89_vector_events_vlm (1024d multimodal)';
    RAISE NOTICE '  ✅ 11 indexes (timestamp, collection, tags, vector, seal_confidence)';
    RAISE NOTICE '  ✅ phase89_unified_timeline view (768d + 1024d combined)';
    RAISE NOTICE '  ✅ 3 analytics views (modality stats, high confidence seals, recent)';
    RAISE NOTICE '  ✅ 2 helper functions (search, document timeline)';
    RAISE NOTICE '';
    RAISE NOTICE 'Backward Compatible:';
    RAISE NOTICE '  ✅ Existing phase89_vector_events (768d) unchanged';
    RAISE NOTICE '  ✅ Applications can use either table or unified view';
    RAISE NOTICE '';
    RAISE NOTICE 'Use Cases:';
    RAISE NOTICE '  🔍 Text-only events → 768d (Ollama, fast)';
    RAISE NOTICE '  🖼️  Multimodal events → 1024d (VLM, text + vision + layout + seal)';
    RAISE NOTICE '  📊 Unified queries → phase89_unified_timeline view';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

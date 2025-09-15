-- ===================================================================
-- Enhanced Database Schema for Bitmap HMM-SOM + Gemma Integration
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. BEHAVIORAL STATES TABLE (Core HMM-SOM Integration)
-- ===================================================================

CREATE TABLE IF NOT EXISTS behavioral_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- SOM Integration
    som_bitmap BYTEA NOT NULL,                    -- 32-byte compressed bitmap
    som_position_x INTEGER NOT NULL,              -- SOM grid X coordinate
    som_position_y INTEGER NOT NULL,              -- SOM grid Y coordinate
    som_confidence REAL NOT NULL DEFAULT 0.0,     -- SOM clustering confidence

    -- User Behavior Data
    user_action TEXT NOT NULL,                    -- 'viewing_dashboard', 'reading_document', etc.
    action_context JSONB,                         -- Additional context data
    asset_types TEXT[] NOT NULL DEFAULT '{}',     -- Predicted asset types

    -- Learning Metrics
    confidence REAL NOT NULL DEFAULT 0.0,         -- Prediction confidence (0-1)
    frequency INTEGER NOT NULL DEFAULT 1,         -- How often this state occurs
    success_rate REAL NOT NULL DEFAULT 0.5,       -- Historical prediction accuracy

    -- Semantic Links (Gemma Integration)
    semantic_context_id UUID,                     -- Link to semantic embeddings
    gemma_embedding VECTOR(768),                  -- Direct Gemma embedding storage
    embedding_hash TEXT,                          -- Quick hash for embedding comparison

    -- Temporal Data
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_activations INTEGER DEFAULT 1,

    -- Performance Tracking
    avg_prediction_time_ms REAL DEFAULT 0.0,
    cache_hit_rate REAL DEFAULT 0.0,

    CONSTRAINT behavioral_states_som_pos_check
        CHECK (som_position_x >= 0 AND som_position_y >= 0),
    CONSTRAINT behavioral_states_confidence_check
        CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- ===================================================================
-- 2. STATE TRANSITIONS TABLE (HMM Transition Matrix)
-- ===================================================================

CREATE TABLE IF NOT EXISTS state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transition Definition
    from_state_id UUID NOT NULL REFERENCES behavioral_states(id) ON DELETE CASCADE,
    to_state_id UUID NOT NULL REFERENCES behavioral_states(id) ON DELETE CASCADE,

    -- Probability & Performance
    probability REAL NOT NULL DEFAULT 0.1,       -- Transition probability (0-1)
    confidence REAL NOT NULL DEFAULT 0.0,        -- Confidence in this transition
    avg_time_ms INTEGER NOT NULL DEFAULT 2000,   -- Average time for this transition

    -- Prediction Data
    assets_predicted TEXT[] DEFAULT '{}',         -- Assets to preload for this transition
    conditions JSONB DEFAULT '{}',               -- Conditions that trigger this transition

    -- Learning Metrics
    success_count INTEGER DEFAULT 0,             -- Successful predictions
    failure_count INTEGER DEFAULT 0,             -- Failed predictions
    last_prediction_at TIMESTAMP WITH TIME ZONE,

    -- Performance Optimization
    priority_weight REAL DEFAULT 1.0,            -- Weight for prediction ordering
    cache_strategy TEXT DEFAULT 'conservative',   -- 'aggressive', 'conservative', 'adaptive'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT state_transitions_probability_check
        CHECK (probability >= 0.0 AND probability <= 1.0),
    CONSTRAINT state_transitions_different_states
        CHECK (from_state_id != to_state_id)
);

-- ===================================================================
-- 3. SEMANTIC CONTEXTS TABLE (Gemma Embeddings Hub)
-- ===================================================================

CREATE TABLE IF NOT EXISTS semantic_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Content & Embeddings
    content_text TEXT NOT NULL,
    content_hash TEXT NOT NULL UNIQUE,           -- SHA-256 of content for deduplication
    gemma_embedding VECTOR(768) NOT NULL,        -- Primary Gemma embedding
    nomic_embedding VECTOR(768),                 -- Fallback nomic-embed-text embedding

    -- Legal Domain Classification
    legal_domain TEXT,                           -- 'contracts', 'case_law', 'statutes', etc.
    document_type TEXT,                          -- 'brief', 'evidence', 'motion', etc.
    complexity_score REAL DEFAULT 0.0,          -- Text complexity (0-1)

    -- Behavioral Links
    linked_behavior_states UUID[],               -- Array of linked behavioral state IDs
    usage_frequency INTEGER DEFAULT 0,          -- How often this context is accessed

    -- Performance Tracking
    embedding_generation_time_ms INTEGER,       -- Time to generate embeddings
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 4. PREDICTIVE CACHE TABLE (CHR-ROM Pattern Storage)
-- ===================================================================

CREATE TABLE IF NOT EXISTS predictive_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Cache Key & Data
    cache_key TEXT NOT NULL UNIQUE,
    cache_data BYTEA,                            -- Compressed asset data
    svg_pattern TEXT,                            -- CHR-ROM style visual pattern

    -- Prediction Context
    source_state_id UUID REFERENCES behavioral_states(id),
    predicted_for_states UUID[],                 -- Which states this cache serves
    asset_type TEXT NOT NULL,                    -- Type of cached asset

    -- Quality & Performance
    quality_tier TEXT NOT NULL DEFAULT '8-BIT_NES', -- '8-BIT_NES', '16-BIT_SNES', '64-BIT_N64'
    compression_ratio REAL,                      -- Original size / compressed size
    access_speed_ms REAL,                        -- Average access time

    -- Lifecycle Management
    priority INTEGER DEFAULT 50,                 -- Cache priority (0-100)
    ttl_seconds INTEGER DEFAULT 300,             -- Time to live
    hit_count INTEGER DEFAULT 0,                 -- Cache hit counter
    miss_count INTEGER DEFAULT 0,                -- Cache miss counter

    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_hit_at TIMESTAMP WITH TIME ZONE
);

-- ===================================================================
-- 5. PERFORMANCE METRICS TABLE (System Learning)
-- ===================================================================

CREATE TABLE IF NOT EXISTS prediction_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Prediction Session
    session_id UUID NOT NULL,
    user_id TEXT,                                -- User identifier (if available)
    prediction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prediction Data
    predicted_state_id UUID REFERENCES behavioral_states(id),
    actual_outcome TEXT,                         -- What actually happened
    prediction_confidence REAL,                 -- Confidence when prediction was made

    -- Performance Metrics
    prediction_accuracy REAL,                   -- How accurate was this prediction (0-1)
    response_time_ms INTEGER,                   -- Time from prediction to outcome
    cache_effectiveness REAL,                  -- How effective was the cache preloading

    -- System State
    system_fps REAL,                           -- System performance at prediction time
    memory_usage_mb INTEGER,                   -- Memory usage
    gpu_utilization REAL,                      -- GPU utilization (if available)

    -- Learning Feedback
    reinforcement_signal REAL,                 -- Positive/negative learning signal
    model_updated BOOLEAN DEFAULT FALSE,        -- Whether model was updated based on this

    -- Context
    browser_context JSONB,                     -- Browser state during prediction
    legal_workflow_stage TEXT,                 -- Which legal workflow stage

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ===================================================================

-- Behavioral States Indexes
CREATE INDEX idx_behavioral_states_som_position ON behavioral_states(som_position_x, som_position_y);
CREATE INDEX idx_behavioral_states_action ON behavioral_states(user_action);
CREATE INDEX idx_behavioral_states_confidence ON behavioral_states(confidence DESC);
CREATE INDEX idx_behavioral_states_frequency ON behavioral_states(frequency DESC);
CREATE INDEX idx_behavioral_states_semantic_context ON behavioral_states(semantic_context_id);

-- SOM Bitmap search (for similar state detection)
CREATE INDEX idx_behavioral_states_bitmap_hash ON behavioral_states USING hash(encode(som_bitmap, 'hex'));

-- Gemma Embedding Vector Search (cosine similarity)
CREATE INDEX idx_behavioral_states_gemma_embedding_cosine
    ON behavioral_states USING ivfflat (gemma_embedding vector_cosine_ops)
    WITH (lists = 100);

-- State Transitions Indexes
CREATE INDEX idx_state_transitions_from_state ON state_transitions(from_state_id);
CREATE INDEX idx_state_transitions_probability ON state_transitions(probability DESC);
CREATE INDEX idx_state_transitions_success_rate
    ON state_transitions((success_count::real / NULLIF(success_count + failure_count, 0)) DESC);

-- Semantic Contexts Indexes
CREATE INDEX idx_semantic_contexts_content_hash ON semantic_contexts(content_hash);
CREATE INDEX idx_semantic_contexts_legal_domain ON semantic_contexts(legal_domain);

-- Gemma embedding vector search
CREATE INDEX idx_semantic_contexts_gemma_embedding_cosine
    ON semantic_contexts USING ivfflat (gemma_embedding vector_cosine_ops)
    WITH (lists = 200);

-- Nomic embedding vector search (fallback)
CREATE INDEX idx_semantic_contexts_nomic_embedding_cosine
    ON semantic_contexts USING ivfflat (nomic_embedding vector_cosine_ops)
    WITH (lists = 200) WHERE nomic_embedding IS NOT NULL;

-- Predictive Cache Indexes
CREATE INDEX idx_predictive_cache_key ON predictive_cache(cache_key);
CREATE INDEX idx_predictive_cache_asset_type ON predictive_cache(asset_type);
CREATE INDEX idx_predictive_cache_quality_tier ON predictive_cache(quality_tier);
CREATE INDEX idx_predictive_cache_priority ON predictive_cache(priority DESC);
CREATE INDEX idx_predictive_cache_expires_at ON predictive_cache(expires_at);

-- Performance Metrics Indexes
CREATE INDEX idx_prediction_metrics_session ON prediction_metrics(session_id);
CREATE INDEX idx_prediction_metrics_timestamp ON prediction_metrics(prediction_timestamp DESC);
CREATE INDEX idx_prediction_metrics_accuracy ON prediction_metrics(prediction_accuracy DESC);

-- ===================================================================
-- FUNCTIONS FOR BITMAP SIMILARITY
-- ===================================================================

-- Function to calculate bitmap similarity (Hamming distance)
CREATE OR REPLACE FUNCTION bitmap_similarity(bitmap1 BYTEA, bitmap2 BYTEA)
RETURNS REAL AS $$
DECLARE
    i INTEGER;
    byte1 INTEGER;
    byte2 INTEGER;
    bit_pos INTEGER;
    matches INTEGER := 0;
    total_bits INTEGER;
BEGIN
    -- Ensure bitmaps are same length
    IF length(bitmap1) != length(bitmap2) THEN
        RETURN 0.0;
    END IF;

    total_bits := length(bitmap1) * 8;

    -- Compare each byte
    FOR i IN 0..length(bitmap1)-1 LOOP
        byte1 := get_byte(bitmap1, i);
        byte2 := get_byte(bitmap2, i);

        -- Compare each bit in the byte
        FOR bit_pos IN 0..7 LOOP
            IF (byte1 >> bit_pos) & 1 = (byte2 >> bit_pos) & 1 THEN
                matches := matches + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN matches::REAL / total_bits::REAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================================================
-- VIEWS FOR EASY ACCESS
-- ===================================================================

-- View: High-confidence behavioral states with semantic context
CREATE VIEW high_confidence_behavioral_states AS
SELECT
    bs.*,
    sc.content_text,
    sc.legal_domain,
    sc.document_type,
    (bs.confidence * bs.success_rate) AS combined_score
FROM behavioral_states bs
LEFT JOIN semantic_contexts sc ON bs.semantic_context_id = sc.id
WHERE bs.confidence > 0.7 AND bs.frequency > 5
ORDER BY combined_score DESC;

-- View: Active state transitions with performance metrics
CREATE VIEW active_state_transitions AS
SELECT
    st.*,
    bs_from.user_action AS from_action,
    bs_to.user_action AS to_action,
    (st.success_count::real / NULLIF(st.success_count + st.failure_count, 0)) AS success_rate,
    bs_to.asset_types AS predicted_assets
FROM state_transitions st
JOIN behavioral_states bs_from ON st.from_state_id = bs_from.id
JOIN behavioral_states bs_to ON st.to_state_id = bs_to.id
WHERE st.probability > 0.1
ORDER BY st.probability DESC, success_rate DESC;

-- View: Predictive cache performance
CREATE VIEW cache_performance_summary AS
SELECT
    asset_type,
    quality_tier,
    COUNT(*) AS total_entries,
    AVG(hit_count) AS avg_hits,
    AVG(access_speed_ms) AS avg_speed_ms,
    SUM(hit_count) / NULLIF(SUM(hit_count + miss_count), 0) AS hit_rate
FROM predictive_cache
WHERE expires_at > NOW()
GROUP BY asset_type, quality_tier
ORDER BY hit_rate DESC;

-- ===================================================================
-- SAMPLE DATA INSERTION
-- ===================================================================

-- Sample behavioral states
INSERT INTO behavioral_states (
    som_bitmap, som_position_x, som_position_y, som_confidence,
    user_action, asset_types, confidence, frequency
) VALUES
(
    decode('0000000000000001000000000000000000000000000000000000000000000000', 'hex'),
    0, 0, 0.95,
    'viewing_dashboard',
    ARRAY['dashboard_widgets', 'status_indicators'],
    0.92, 150
),
(
    decode('0000000000000002000000000000000000000000000000000000000000000000', 'hex'),
    1, 0, 0.89,
    'reading_document',
    ARRAY['document_viewer', 'annotation_tools'],
    0.87, 200
),
(
    decode('0000000000000004000000000000000000000000000000000000000000000000', 'hex'),
    2, 0, 0.91,
    'analyzing_evidence',
    ARRAY['evidence_canvas', 'relationship_graph'],
    0.89, 75
);

-- Sample semantic contexts with dummy embeddings
INSERT INTO semantic_contexts (
    content_text, content_hash, gemma_embedding, legal_domain
) VALUES
(
    'Legal dashboard overview showing case status and pending tasks',
    sha256('Legal dashboard overview showing case status and pending tasks'),
    array_fill(0.1, ARRAY[768])::vector,
    'general'
),
(
    'Contract document analysis with clause identification and risk assessment',
    sha256('Contract document analysis with clause identification and risk assessment'),
    array_fill(0.2, ARRAY[768])::vector,
    'contracts'
);

-- Link behavioral states to semantic contexts
UPDATE behavioral_states
SET semantic_context_id = (SELECT id FROM semantic_contexts WHERE legal_domain = 'general' LIMIT 1)
WHERE user_action = 'viewing_dashboard';

-- ===================================================================
-- UTILITY FUNCTIONS
-- ===================================================================

-- Function to find similar behavioral states by bitmap
CREATE OR REPLACE FUNCTION find_similar_behavioral_states(
    target_bitmap BYTEA,
    similarity_threshold REAL DEFAULT 0.8,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
    state_id UUID,
    user_action TEXT,
    similarity_score REAL,
    confidence REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.id,
        bs.user_action,
        bitmap_similarity(bs.som_bitmap, target_bitmap) AS similarity_score,
        bs.confidence
    FROM behavioral_states bs
    WHERE bitmap_similarity(bs.som_bitmap, target_bitmap) >= similarity_threshold
    ORDER BY similarity_score DESC, bs.confidence DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get next predicted states
CREATE OR REPLACE FUNCTION get_predicted_next_states(
    current_state_id UUID,
    confidence_threshold REAL DEFAULT 0.1
)
RETURNS TABLE(
    next_state_id UUID,
    next_action TEXT,
    probability REAL,
    avg_time_ms INTEGER,
    predicted_assets TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.to_state_id,
        bs.user_action,
        st.probability,
        st.avg_time_ms,
        st.assets_predicted
    FROM state_transitions st
    JOIN behavioral_states bs ON st.to_state_id = bs.id
    WHERE st.from_state_id = current_state_id
      AND st.probability >= confidence_threshold
    ORDER BY st.probability DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE behavioral_states IS 'Core table storing SOM-clustered behavioral states with bitmap compression';
COMMENT ON TABLE state_transitions IS 'HMM transition matrix with prediction probabilities and asset recommendations';
COMMENT ON TABLE semantic_contexts IS 'Gemma embeddings hub linking behavioral patterns to semantic understanding';
COMMENT ON TABLE predictive_cache IS 'CHR-ROM style predictive cache for ultra-fast asset delivery';
COMMENT ON TABLE prediction_metrics IS 'Performance tracking and reinforcement learning feedback';
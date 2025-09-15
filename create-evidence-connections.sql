-- Create evidence_connections table for tracking relationships between evidence items
CREATE TABLE IF NOT EXISTS evidence_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    shared_entities JSONB DEFAULT '[]',
    shared_terms JSONB DEFAULT '[]',
    temporal_proximity INTEGER, -- minutes between collection times
    spatial_proximity DECIMAL(10,6), -- distance if location data available
    semantic_similarity DECIMAL(3,2), -- vector similarity score
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(source_evidence_id, target_evidence_id, connection_type)
);

-- Create indexes for efficient querying
CREATE INDEX idx_evidence_connections_source ON evidence_connections(source_evidence_id);
CREATE INDEX idx_evidence_connections_target ON evidence_connections(target_evidence_id);
CREATE INDEX idx_evidence_connections_type ON evidence_connections(connection_type);
CREATE INDEX idx_evidence_connections_strength ON evidence_connections(strength);

-- Add comment
COMMENT ON TABLE evidence_connections IS 'Stores relationships between evidence items for recursive chain processing';
-- Create timeline_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    actor_id UUID,
    actor_name VARCHAR(255),
    position INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (case_id) REFERENCES yorha_cases(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_case_id ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON timeline_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(type);

-- Create search index for cases
CREATE INDEX IF NOT EXISTS idx_cases_search ON yorha_cases USING GIN(
    to_tsvector('english', COALESCE(case_number, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Create search index for evidence
CREATE INDEX IF NOT EXISTS idx_evidence_search ON yorha_evidence_nodes USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Create search index for messages
CREATE INDEX IF NOT EXISTS idx_messages_search ON yorha_chat_messages USING GIN(
    to_tsvector('english', COALESCE(content, ''))
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO legal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO legal_admin;

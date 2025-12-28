-- Phase 86: Create ts_errors table for autonomous error tracking
-- Run with: docker exec -i phase66-postgres psql -U user -d legal < scripts/phase86-setup-database.sql

-- Drop existing table if any
DROP TABLE IF EXISTS ts_errors CASCADE;

-- Create ts_errors table
CREATE TABLE ts_errors (
    id SERIAL PRIMARY KEY,
    error_code VARCHAR(10) NOT NULL,  -- e.g. "TS1005"
    file_path TEXT NOT NULL,           -- Relative path to file
    line_number INTEGER,               -- Line where error occurs
    column_number INTEGER,             -- Column where error occurs
    error_message TEXT NOT NULL,       -- Full error message
    impact_score FLOAT DEFAULT 1.0,    -- 1-10 score of error severity
    status VARCHAR(20) DEFAULT 'open', -- open, fixed, ignored
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_ts_errors_status ON ts_errors(status);
CREATE INDEX idx_ts_errors_impact ON ts_errors(impact_score DESC);
CREATE INDEX idx_ts_errors_code ON ts_errors(error_code);
CREATE INDEX idx_ts_errors_file ON ts_errors(file_path);

-- Insert sample errors for testing (real errors from the codebase)
INSERT INTO ts_errors (error_code, file_path, line_number, column_number, error_message, impact_score, status) VALUES
-- High-impact errors (complex patterns)
('TS2345', 'src/lib/services/knowledge-search/ACPToolRegistry.ts', 142, 15, 'Argument of type ''{ query: string; topK: number; threshold: number; }'' is not assignable to parameter of type ''KnowledgeSearchParams''.', 8.5, 'open'),
('TS2339', 'src/lib/services/knowledge-search/ACPToolRegistry.ts', 165, 20, 'Property ''results'' does not exist on type ''{ success: boolean; error?: string; }''.', 7.8, 'open'),
('TS1005', 'src/lib/services/knowledge-search/ACPToolRegistry.ts', 98, 5, ''','' expected.', 6.2, 'open'),

-- Medium-impact errors (common patterns)
('TS2304', 'src/lib/utils/error-logger.ts', 23, 10, 'Cannot find name ''ProcessedError''.', 5.5, 'open'),
('TS7006', 'src/routes/api/chat/+server.ts', 45, 30, 'Parameter ''message'' implicitly has an ''any'' type.', 4.0, 'open'),

-- Low-impact errors (simple fixes)
('TS2322', 'src/lib/components/ChatMessage.svelte.ts', 12, 5, 'Type ''string'' is not assignable to type ''number''.', 3.0, 'open'),
('TS2307', 'src/routes/dashboard/+page.svelte.ts', 8, 20, 'Cannot find module ''./utils/format''.', 2.5, 'open');

-- Show results
SELECT
    id,
    error_code,
    LEFT(file_path, 50) as file,
    line_number as line,
    impact_score,
    status
FROM ts_errors
ORDER BY impact_score DESC;

-- Phase 78 (Cutlass) Error Tracking Tables
-- Supports error collection, analysis, and automated fix suggestions

-- Create route_health table for tracking route error states
CREATE TABLE IF NOT EXISTS route_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL UNIQUE,
  file_path TEXT,
  error_state TEXT NOT NULL DEFAULT 'healthy',
  recent_error_count INTEGER NOT NULL DEFAULT 0,
  last_error_cluster_id TEXT,
  last_error_message_short TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on route_path for unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS route_health_route_path_idx ON route_health(route_path);

-- Create error_events table for logging individual error occurrences
CREATE TABLE IF NOT EXISTS error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL,
  file_path TEXT NOT NULL,
  ts_code TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  cluster_id TEXT,
  meta_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error_events
CREATE INDEX IF NOT EXISTS error_events_route_path_idx ON error_events(route_path);
CREATE INDEX IF NOT EXISTS error_events_cluster_id_idx ON error_events(cluster_id);
CREATE INDEX IF NOT EXISTS error_events_created_at_idx ON error_events(created_at);
CREATE INDEX IF NOT EXISTS error_events_ts_code_idx ON error_events(ts_code);

-- Create error_suggestions table for AI-generated or manual fix suggestions
CREATE TABLE IF NOT EXISTS error_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL,
  error_event_id UUID REFERENCES error_events(id) ON DELETE SET NULL,
  cluster_id TEXT,
  summary TEXT NOT NULL,
  patch TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  created_by_user_id TEXT,
  applied_by_user_id TEXT,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error_suggestions
CREATE INDEX IF NOT EXISTS error_suggestions_route_path_idx ON error_suggestions(route_path);
CREATE INDEX IF NOT EXISTS error_suggestions_applied_idx ON error_suggestions(applied);
CREATE INDEX IF NOT EXISTS error_suggestions_created_at_idx ON error_suggestions(created_at);
CREATE INDEX IF NOT EXISTS error_suggestions_cluster_id_idx ON error_suggestions(cluster_id);

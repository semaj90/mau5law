-- Migration: Error Brain Diffs Table
-- Date: 2025-01-14
-- Phase 27: Error Brain diff generation and application tracking

-- Create error_brain_diffs table
CREATE TABLE IF NOT EXISTS error_brain_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run identifier (links to error brain run)
  run_id text NOT NULL,

  -- File being patched
  file_path text NOT NULL,

  -- Hash guards
  before_sha256 text NOT NULL,
  after_sha256 text NOT NULL,

  -- Unified diff text
  diff_text text NOT NULL,

  -- Metrics
  lines_changed integer NOT NULL,
  confidence real NOT NULL,

  -- Metadata
  reason text NOT NULL,
  rule_id text NOT NULL,

  -- Application status
  applied text NOT NULL DEFAULT 'pending' CHECK (applied IN ('pending', 'applied', 'failed', 'rolled_back')),
  applied_at timestamptz,

  -- Validation results (if applied)
  validation_status text CHECK (validation_status IN ('passed', 'failed', 'regression')),
  error_count_before integer,
  error_count_after integer,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS error_brain_diffs_run_id_idx ON error_brain_diffs(run_id);
CREATE INDEX IF NOT EXISTS error_brain_diffs_file_path_idx ON error_brain_diffs(file_path);
CREATE INDEX IF NOT EXISTS error_brain_diffs_applied_idx ON error_brain_diffs(applied);
CREATE INDEX IF NOT EXISTS error_brain_diffs_created_at_idx ON error_brain_diffs(created_at);

-- Composite index for run + file queries
CREATE INDEX IF NOT EXISTS error_brain_diffs_run_file_idx ON error_brain_diffs(run_id, file_path);

-- Comment on table
COMMENT ON TABLE error_brain_diffs IS 'Phase 27: Error Brain diff generation and application tracking with validation results';

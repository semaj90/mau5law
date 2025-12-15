-- Phase 9: Error Brain Analysis & Patch Verification
-- Creates error_brain_analysis table and extends route_error_patches with verification fields

-- Create error_brain_analysis table
CREATE TABLE IF NOT EXISTS error_brain_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_path TEXT NOT NULL,
    suggestions JSONB NOT NULL,
    selected_suggestion_index INTEGER,
    phase TEXT NOT NULL DEFAULT 'analyzing',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error_brain_analysis
CREATE INDEX IF NOT EXISTS error_brain_analysis_route_path_idx ON error_brain_analysis(route_path);
CREATE INDEX IF NOT EXISTS error_brain_analysis_created_at_idx ON error_brain_analysis(created_at);
CREATE INDEX IF NOT EXISTS error_brain_analysis_phase_idx ON error_brain_analysis(phase);

-- Add columns to route_error_patches for Phase 9
ALTER TABLE route_error_patches
ADD COLUMN IF NOT EXISTS analysis_id UUID,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_message TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS route_error_patches_analysis_id_idx ON route_error_patches(analysis_id);
CREATE INDEX IF NOT EXISTS route_error_patches_verification_status_idx ON route_error_patches(verification_status);

-- Add foreign key constraint (optional, can be set to ON DELETE SET NULL)
ALTER TABLE route_error_patches
ADD CONSTRAINT IF NOT EXISTS route_error_patches_analysis_id_fk
FOREIGN KEY (analysis_id) REFERENCES error_brain_analysis(id) ON DELETE SET NULL;

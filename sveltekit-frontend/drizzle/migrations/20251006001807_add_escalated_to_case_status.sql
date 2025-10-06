-- Add value to enum case_status
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'escalated';

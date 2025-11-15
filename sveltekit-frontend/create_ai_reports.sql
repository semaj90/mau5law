CREATE TABLE IF NOT EXISTS ai_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid,
    created_by integer,
    report_type varchar(100) NOT NULL,
    summary text,
    full_report text,
    generated_at timestamp DEFAULT now() NOT NULL,
    metadata jsonb,
    created_at timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);

ALTER TABLE ai_reports ADD CONSTRAINT ai_reports_created_by_users_id_fk
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
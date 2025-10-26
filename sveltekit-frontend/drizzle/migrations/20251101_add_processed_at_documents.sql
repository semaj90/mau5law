-- Migration: add processed_at column to documents table if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='documents' AND column_name='processed_at'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN processed_at timestamp without time zone;
    RAISE NOTICE 'Added processed_at column to documents';
  ELSE
    RAISE NOTICE 'processed_at already exists on documents';
  END IF;
END$$;

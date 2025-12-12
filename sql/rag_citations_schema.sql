BEGIN;

-- 1) Add missing columns to existing citation_tags table
ALTER TABLE public.citation_tags
ADD COLUMN IF NOT EXISTS namespace text NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS synonyms text[] NOT NULL DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update existing unique constraint to include namespace
ALTER TABLE public.citation_tags DROP CONSTRAINT IF EXISTS citation_tags_name_jurisdiction_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_citation_tags_unique
  ON public.citation_tags (namespace, name, COALESCE(jurisdiction, ''));

-- Add trigram index for name searches
CREATE INDEX IF NOT EXISTS idx_citation_tags_name_trgm
  ON public.citation_tags USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_citation_tags_synonyms_gin
  ON public.citation_tags USING gin (synonyms);

CREATE INDEX IF NOT EXISTS idx_citation_tags_namespace
  ON public.citation_tags (namespace);

CREATE INDEX IF NOT EXISTS idx_citation_tags_jurisdiction
  ON public.citation_tags (jurisdiction);

CREATE INDEX IF NOT EXISTS idx_citation_tags_name_trgm
  ON public.citation_tags USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_citation_tags_synonyms_gin
  ON public.citation_tags USING gin (synonyms);

CREATE INDEX IF NOT EXISTS idx_citation_tags_namespace
  ON public.citation_tags (namespace);

CREATE INDEX IF NOT EXISTS idx_citation_tags_jurisdiction
  ON public.citation_tags (jurisdiction);

-- 2) Map tags to evidence_files (many-to-many)
CREATE TABLE IF NOT EXISTS public.evidence_tag_links (
  evidence_id   uuid NOT NULL REFERENCES public.evidence_files(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES public.citation_tags(id) ON DELETE CASCADE,
  source        text NOT NULL DEFAULT 'system',  -- 'system' | 'user' | 'ai' | 'import'
  confidence    real NOT NULL DEFAULT 1.0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evidence_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_tag_links_evidence_id
  ON public.evidence_tag_links (evidence_id);

CREATE INDEX IF NOT EXISTS idx_evidence_tag_links_tag_id
  ON public.evidence_tag_links (tag_id);

-- 3) Map tags to chunks (more precise for retrieval + citations)
CREATE TABLE IF NOT EXISTS public.chunk_tag_links (
  chunk_id      uuid NOT NULL REFERENCES public.evidence_chunks(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES public.citation_tags(id) ON DELETE CASCADE,
  source        text NOT NULL DEFAULT 'system',
  confidence    real NOT NULL DEFAULT 1.0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_chunk_tag_links_chunk_id
  ON public.chunk_tag_links (chunk_id);

CREATE INDEX IF NOT EXISTS idx_chunk_tag_links_tag_id
  ON public.chunk_tag_links (tag_id);

-- 4) Optional: store normalized citations extracted from chunks (statutes / case cites)
-- If you already have public.citations table, this will NOT conflict. It's chunk-level linking.
CREATE TABLE IF NOT EXISTS public.chunk_citations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id      uuid NOT NULL REFERENCES public.evidence_chunks(id) ON DELETE CASCADE,
  cite_text     text NOT NULL,                    -- raw cite string found
  cite_type     text NOT NULL DEFAULT 'unknown',   -- 'case' | 'statute' | 'reg' | 'rule' | 'other'
  jurisdiction  text,
  normalized    text,                             -- canonical form if you can normalize it
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunk_citations_chunk_id
  ON public.chunk_citations (chunk_id);

CREATE INDEX IF NOT EXISTS idx_chunk_citations_cite_text_trgm
  ON public.chunk_citations USING gin (cite_text gin_trgm_ops);

-- 5) Qdrant mapping (helps debugging + dedupe)
-- Only create if you don't already have this concept elsewhere.
CREATE TABLE IF NOT EXISTS public.rag_chunk_index (
  chunk_id        uuid PRIMARY KEY REFERENCES public.evidence_chunks(id) ON DELETE CASCADE,
  collection      text NOT NULL DEFAULT 'phase72_evidence_embeddings',
  point_id        text NOT NULL,                   -- Qdrant point id (string/uuid)
  embedding_model text NOT NULL DEFAULT 'embeddinggemma:latest',
  indexed_at      timestamptz NOT NULL DEFAULT now(),
  payload_hash    text,                            -- optional: hash(payload) for change detection
  UNIQUE (collection, point_id)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunk_index_collection
  ON public.rag_chunk_index (collection);

-- 6) Helper function: upsert tag by (namespace,name,jurisdiction)
CREATE OR REPLACE FUNCTION public.upsert_citation_tag(
  p_namespace text,
  p_name text,
  p_jurisdiction text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.citation_tags (namespace, name, jurisdiction, description, updated_at)
  VALUES (COALESCE(p_namespace,'general'), p_name, p_jurisdiction, p_description, now())
  ON CONFLICT (namespace, name, COALESCE(jurisdiction,''))
  DO UPDATE SET
    description = COALESCE(EXCLUDED.description, public.citation_tags.description),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

COMMIT;
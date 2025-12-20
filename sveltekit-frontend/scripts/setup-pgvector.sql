-- Phase 76: PostgreSQL Vector Storage Schema
-- Purpose: Structured memory for error patterns with semantic embeddings

-- 1. Enable the Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Error Pattern Table (Structured Memory)
CREATE TABLE IF NOT EXISTS error_patterns (
    id SERIAL PRIMARY KEY,
    signature TEXT NOT NULL,         -- e.g. "svelte-check: non_reactive_update"
    file_path TEXT,                  -- e.g. "src/routes/+page.svelte"
    error_code TEXT,                 -- e.g. "TS1128", "svelte(a11y-click-events-have-key-events)"
    fix_summary TEXT,                -- e.g. "Use $state() rune instead of let"
    fix_code TEXT,                   -- Actual code to apply
    embedding vector(768),           -- The semantic meaning (768-dim for embeddinggemma)
    occurrences INTEGER DEFAULT 1,   -- How many times we've seen this
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Documentation References (Deep Storage Link)
CREATE TABLE IF NOT EXISTS doc_references (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE,
    title TEXT,
    minio_key TEXT,                  -- s3://phase76-summaries/svelte_5_runes.json
    doc_type TEXT,                   -- 'migration', 'api', 'guide', 'changelog'
    framework TEXT,                  -- 'svelte', 'sveltekit', 'typescript'
    version TEXT,                    -- '5.0', '2.0', '5.6'
    embedding vector(768),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Migration Patterns (Svelte 4 → 5 specific)
CREATE TABLE IF NOT EXISTS migration_patterns (
    id SERIAL PRIMARY KEY,
    old_syntax TEXT NOT NULL,        -- "on:change"
    new_syntax TEXT NOT NULL,        -- "onchange"
    pattern_type TEXT,               -- 'event', 'reactivity', 'component', 'lifecycle'
    context TEXT,                    -- Where this applies
    warning_message TEXT,            -- What error this causes
    auto_fixable BOOLEAN DEFAULT true,
    confidence REAL DEFAULT 1.0,     -- 0.0-1.0 how confident we are in the fix
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. HNSW Indexes for fast vector search
CREATE INDEX IF NOT EXISTS error_patterns_embedding_idx
    ON error_patterns USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS doc_references_embedding_idx
    ON doc_references USING hnsw (embedding vector_cosine_ops);

-- 6. Regular indexes for common queries
CREATE INDEX IF NOT EXISTS error_patterns_signature_idx ON error_patterns(signature);
CREATE INDEX IF NOT EXISTS error_patterns_file_path_idx ON error_patterns(file_path);
CREATE INDEX IF NOT EXISTS doc_references_url_idx ON doc_references(url);
CREATE INDEX IF NOT EXISTS doc_references_framework_idx ON doc_references(framework);
CREATE INDEX IF NOT EXISTS migration_patterns_old_syntax_idx ON migration_patterns(old_syntax);

-- 7. Insert known Svelte 4 → 5 migration patterns
INSERT INTO migration_patterns (old_syntax, new_syntax, pattern_type, context, warning_message, auto_fixable, confidence) VALUES
    ('on:change', 'onchange', 'event', 'Event handlers in Svelte 5', 'Event attribute is deprecated in runes mode', true, 1.0),
    ('on:input', 'oninput', 'event', 'Event handlers in Svelte 5', 'Event attribute is deprecated in runes mode', true, 1.0),
    ('on:click', 'onclick', 'event', 'Event handlers in Svelte 5', 'Event attribute is deprecated in runes mode', true, 1.0),
    ('on:submit', 'onsubmit', 'event', 'Event handlers in Svelte 5', 'Event attribute is deprecated in runes mode', true, 1.0),
    ('let variable =', 'let variable = $state(', 'reactivity', 'Reactive state in Svelte 5', 'Variable is updated but not reactive', true, 0.8),
    ('$: computed =', 'let computed = $derived(', 'reactivity', 'Reactive computations in Svelte 5', 'Reactive statement is deprecated in runes mode', true, 0.9),
    ('beforeUpdate', '$effect.pre', 'lifecycle', 'Lifecycle hooks in Svelte 5', 'beforeUpdate is deprecated in runes mode', true, 0.7),
    ('afterUpdate', '$effect', 'lifecycle', 'Lifecycle hooks in Svelte 5', 'afterUpdate is deprecated in runes mode', true, 0.7),
    ('export let prop', 'let { prop } = $props()', 'component', 'Component props in Svelte 5', 'Component prop should use $props() rune', true, 0.9)
ON CONFLICT DO NOTHING;

-- 8. Create a view for easy querying
CREATE OR REPLACE VIEW migration_fixes AS
SELECT
    ep.signature,
    ep.file_path,
    ep.error_code,
    mp.old_syntax,
    mp.new_syntax,
    mp.pattern_type,
    ep.fix_summary,
    mp.auto_fixable,
    mp.confidence,
    ep.occurrences,
    ep.last_seen
FROM error_patterns ep
LEFT JOIN migration_patterns mp
    ON ep.fix_summary ILIKE '%' || mp.old_syntax || '%'
WHERE ep.created_at > NOW() - INTERVAL '7 days'
ORDER BY ep.occurrences DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 76 PostgreSQL Vector Storage Schema Created Successfully';
    RAISE NOTICE 'Tables: error_patterns, doc_references, migration_patterns';
    RAISE NOTICE 'Indexes: HNSW vector indexes + standard indexes created';
    RAISE NOTICE '% migration patterns loaded', (SELECT COUNT(*) FROM migration_patterns);
END $$;

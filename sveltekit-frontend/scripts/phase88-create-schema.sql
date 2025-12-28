-- Phase 88: Agentic Error Analysis Map - PostgreSQL Schema
-- Database: legal (5434) - Phase 87 portable stack
-- User: user / Pass: pass

-- ============================================================
-- Knowledge Graph Nodes
-- ============================================================
-- Stores: files, symbols, errors, docs, patterns
CREATE TABLE IF NOT EXISTS kg_nodes (
  id TEXT PRIMARY KEY,                 -- file:<path> | sym:<file>:<name> | err:<id> | doc:<id> | pat:<hash>
  kind TEXT NOT NULL,                  -- 'file' | 'symbol' | 'error' | 'doc' | 'pattern'
  label TEXT NOT NULL,                 -- Display name (filename, symbol name, error message, etc.)
  meta JSONB DEFAULT '{}'::jsonb,      -- { path, line, col, code, severity, exports, imports, pattern_id, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kg_nodes_kind_idx ON kg_nodes(kind);
CREATE INDEX IF NOT EXISTS kg_nodes_label_idx ON kg_nodes(label);
CREATE INDEX IF NOT EXISTS kg_nodes_meta_idx ON kg_nodes USING gin(meta);

-- ============================================================
-- Knowledge Graph Edges
-- ============================================================
-- Stores relationships: imports, exports, errors, proximity
CREATE TABLE IF NOT EXISTS kg_edges (
  id BIGSERIAL PRIMARY KEY,
  from_id TEXT NOT NULL,                        -- Source node id
  to_id TEXT NOT NULL,                          -- Target node id
  type TEXT NOT NULL,                           -- 'FILE_IMPORTS_FILE' | 'FILE_EXPORTS_SYMBOL' | 'ERROR_IN_FILE' | 'ERROR_NEAR_SYMBOL' | 'SIMILAR_TO' | 'FIXES_ERROR'
  weight REAL DEFAULT 1.0,                      -- Edge strength (similarity score, error count, etc.)
  evidence JSONB DEFAULT '{}'::jsonb,           -- { line, col, snippet, fix_confidence, kb_source, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kg_edges_from_idx ON kg_edges(from_id);
CREATE INDEX IF NOT EXISTS kg_edges_to_idx ON kg_edges(to_id);
CREATE INDEX IF NOT EXISTS kg_edges_type_idx ON kg_edges(type);
CREATE INDEX IF NOT EXISTS kg_edges_from_to_type_idx ON kg_edges(from_id, to_id, type);

-- ============================================================
-- File Index (AST metadata cache)
-- ============================================================
-- Stores ts-morph parsing results for faster graph rebuilds
CREATE TABLE IF NOT EXISTS file_index (
  file_path TEXT PRIMARY KEY,
  file_hash TEXT NOT NULL,                      -- SHA-256 of file content (for cache invalidation)
  kind TEXT NOT NULL,                           -- 'route' | 'lib' | 'component' | 'util' | 'config' | 'test'
  exports JSONB DEFAULT '[]'::jsonb,            -- [{name, kind, line}]
  imports JSONB DEFAULT '[]'::jsonb,            -- [{source, specifiers: [{name, alias}], line}]
  symbols JSONB DEFAULT '[]'::jsonb,            -- [{name, kind, line, scope}]
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS file_index_hash_idx ON file_index(file_hash);
CREATE INDEX IF NOT EXISTS file_index_kind_idx ON file_index(kind);

-- ============================================================
-- Error Clusters (pattern detection)
-- ============================================================
-- Stores error pattern classifications from /classify endpoint
CREATE TABLE IF NOT EXISTS error_clusters (
  id BIGSERIAL PRIMARY KEY,
  pattern_id TEXT NOT NULL UNIQUE,              -- 'missing_semicolon' | 'missing_import' | 'ts1005_brace' | etc.
  label TEXT NOT NULL,                          -- Human-readable pattern name
  heuristics JSONB DEFAULT '[]'::jsonb,         -- [{rule, regex, code}] for deterministic classification
  example_errors TEXT[] DEFAULT '{}',           -- Array of error IDs that match this pattern
  fix_template TEXT,                            -- Optional: auto-fix template
  kb_tags TEXT[] DEFAULT '{}',                  -- Tags for KB retrieval (e.g., ['typescript', 'syntax'])
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_clusters_pattern_idx ON error_clusters(pattern_id);
CREATE INDEX IF NOT EXISTS error_clusters_kb_tags_idx ON error_clusters USING gin(kb_tags);

-- ============================================================
-- Initial Pattern Seeds
-- ============================================================
-- Common TypeScript error patterns (pre-seeded for classification)
INSERT INTO error_clusters (pattern_id, label, heuristics, kb_tags, fix_template)
VALUES 
  ('ts1005_missing_brace', 'Missing curly brace', 
   '[{"rule": "TS1005", "regex": "\\\\} expected"}]'::jsonb, 
   ARRAY['typescript', 'syntax'], 
   'Add closing brace at line {line}'),
   
  ('ts1128_missing_declaration', 'Missing declaration or statement', 
   '[{"rule": "TS1128", "regex": "Declaration or statement expected"}]'::jsonb, 
   ARRAY['typescript', 'syntax'], 
   'Check for missing statement at line {line}'),
   
  ('ts1109_missing_expression', 'Missing expression after unary operator', 
   '[{"rule": "TS1109", "regex": "Expression expected"}]'::jsonb, 
   ARRAY['typescript', 'operators'], 
   'Add expression after operator at line {line}'),
   
  ('ts2305_missing_import', 'Missing module import', 
   '[{"rule": "TS2305", "regex": "has no exported member"}]'::jsonb, 
   ARRAY['typescript', 'imports', 'modules'], 
   'Import {module} from correct source'),
   
  ('ts2322_type_mismatch', 'Type assignment mismatch', 
   '[{"rule": "TS2322", "regex": "not assignable to type"}]'::jsonb, 
   ARRAY['typescript', 'types'], 
   'Fix type mismatch at line {line}'),
   
  ('svelte_binding_invalid', 'Invalid Svelte binding', 
   '[{"regex": "bind: directive"}]'::jsonb, 
   ARRAY['svelte', 'bindings'], 
   'Use valid bind:property syntax'),
   
  ('svelte5_rune_migration', 'Svelte 5 rune migration needed', 
   '[{"regex": "export let|\\\\$:|onMount"}]'::jsonb, 
   ARRAY['svelte5', 'runes', 'migration'], 
   'Migrate to $state(), $derived(), $effect()')
ON CONFLICT (pattern_id) DO NOTHING;

-- ============================================================
-- Utility Functions
-- ============================================================

-- Get all errors for a file
CREATE OR REPLACE FUNCTION get_file_errors(file_path TEXT)
RETURNS TABLE (
  error_id TEXT,
  message TEXT,
  line INTEGER,
  code TEXT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id as error_id,
    n.label as message,
    (n.meta->>'line')::INTEGER as line,
    n.meta->>'code' as code,
    n.meta->>'severity' as severity
  FROM kg_nodes n
  JOIN kg_edges e ON e.from_id = n.id
  WHERE e.type = 'ERROR_IN_FILE'
    AND e.to_id = 'file:' || file_path
    AND n.kind = 'error'
  ORDER BY (n.meta->>'line')::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Get error density by directory
CREATE OR REPLACE FUNCTION get_error_density()
RETURNS TABLE (
  directory TEXT,
  file_count BIGINT,
  error_count BIGINT,
  density NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH file_errors AS (
    SELECT 
      split_part(n.meta->>'path', '/', 3) as dir,  -- Assumes 'src/routes/...' or 'src/lib/...'
      n.id as file_id,
      COUNT(e.id) as errors
    FROM kg_nodes n
    LEFT JOIN kg_edges e ON e.to_id = n.id AND e.type = 'ERROR_IN_FILE'
    WHERE n.kind = 'file'
    GROUP BY n.id, n.meta->>'path'
  )
  SELECT 
    dir as directory,
    COUNT(DISTINCT file_id) as file_count,
    SUM(errors) as error_count,
    ROUND((SUM(errors)::NUMERIC / NULLIF(COUNT(DISTINCT file_id), 0)), 2) as density
  FROM file_errors
  WHERE dir IS NOT NULL AND dir != ''
  GROUP BY dir
  ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Find similar errors (for pattern clustering)
CREATE OR REPLACE FUNCTION find_similar_errors(error_id TEXT, threshold REAL DEFAULT 0.7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  similar_error_id TEXT,
  similarity REAL,
  message TEXT,
  file TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id as similar_error_id,
    e.weight as similarity,
    n.label as message,
    n.meta->>'file' as file
  FROM kg_edges e
  JOIN kg_nodes n ON e.to_id = n.id
  WHERE e.from_id = error_id
    AND e.type = 'SIMILAR_TO'
    AND e.weight >= threshold
    AND n.kind = 'error'
  ORDER BY e.weight DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Indexes for Performance
-- ============================================================

-- GiST index for JSONB path queries (if needed for complex meta queries)
-- Uncomment if you need to query nested JSONB paths frequently:
-- CREATE INDEX IF NOT EXISTS kg_nodes_meta_path_idx ON kg_nodes USING gist(meta jsonb_path_ops);

-- Partial index for active errors (no 'resolved' flag)
CREATE INDEX IF NOT EXISTS kg_nodes_active_errors_idx 
  ON kg_nodes(kind, label) 
  WHERE kind = 'error' AND (meta->>'resolved')::boolean IS NOT TRUE;

-- ============================================================
-- Permissions (optional, if using multiple roles)
-- ============================================================

-- Grant read-write to 'user' (Phase 87 default user)
-- GRANT ALL ON kg_nodes, kg_edges, file_index, error_clusters TO "user";
-- GRANT USAGE, SELECT ON SEQUENCE kg_edges_id_seq, error_clusters_id_seq TO "user";

-- ============================================================
-- Schema Complete
-- ============================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Schema verification:';
  RAISE NOTICE '  kg_nodes: % rows', (SELECT COUNT(*) FROM kg_nodes);
  RAISE NOTICE '  kg_edges: % rows', (SELECT COUNT(*) FROM kg_edges);
  RAISE NOTICE '  file_index: % rows', (SELECT COUNT(*) FROM file_index);
  RAISE NOTICE '  error_clusters: % patterns seeded', (SELECT COUNT(*) FROM error_clusters);
  RAISE NOTICE 'Phase 88 schema ready!';
END;
$$;

# RAG/KAG Rules for API Endpoint Generation

## KAG Hard Rules (Knowledge-Augmented Generation)

### 1. Authentication
```
IF endpoint.category = 'auth' THEN
  APPLY: Check session existence
  APPLY: Validate credentials format
  APPLY: Return 401 if unauthorized
```

### 2. Data Access
```
IF endpoint.category = 'data' THEN
  APPLY: Check user session
  APPLY: Validate payload schema
  APPLY: Apply row-level security
  APPLY: Return 404 if not found
```

### 3. AI/LLM
```
IF endpoint.category = 'ai' THEN
  APPLY: Rate limiting check
  APPLY: Validate prompt length
  APPLY: Call Ollama/LLM service
  APPLY: Store embeddings in pgvector
```

### 4. Caching
```
IF endpoint.category = 'cache' THEN
  APPLY: Check Redis first
  APPLY: Set appropriate TTL
  APPLY: Invalidate on mutations
```

## RAG Retrieval Patterns

When generating an endpoint, retrieve:
1. Similar endpoint implementations from same category
2. Common error handling patterns
3. Standard validation schemas
4. Typical response shapes

## Integration with pgvector

Store these with embeddings:
- Endpoint comments + purpose
- Implementation code
- Error patterns
- Successful fixes

Query by:
- Semantic similarity (route/purpose)
- Category matching
- Error code occurrence

---

## Knowledge Base Files (RAG/KAG/DAG Sources)

### AI Agent Instructions
| File | Purpose | Agent |
|------|---------|-------|
| `copilot.md` | Primary Copilot context | GitHub Copilot |
| `claude.md` | Primary Claude context | Claude/Cursor |
| `gemini.md` | Primary Gemini context | Gemini |
| `docs/COPILOT.md` | Extended Copilot docs (VS Code tasks, logging) | GitHub Copilot |
| `docs/CLAUDE.md` | Extended Claude docs (GPU env, logging) | Claude |
| `docs/GEMINI.md` | Extended Gemini docs (FastMCP, Phase 72) | Gemini |

### Domain Knowledge
| File | Purpose |
|------|---------|
| `CLAUDE_RAG_KAG_RULES.md` | This file - RAG/KAG endpoint rules |
| `COPILOT_ERROR_FIXING_GUIDE.md` | Error pattern database |
| `COPILOT_ENDPOINT_PATTERNS.md` | API endpoint templates |
| `docs/DRIZZLE_MIGRATIONS.md` | Database migration best practices |

### Cross-Reference Rule
```
WHEN editing database-related code:
  RETRIEVE: docs/CLAUDE.md#drizzle-orm-0.44
  RETRIEVE: docs/GEMINI.md#drizzle-orm-0.44
  APPLY: "No Data Loss" Workflow
```

---

## 🗄️ Database Migration Rules (Drizzle ORM 0.44)

### KAG Hard Rules for Schema Changes
```
IF action = 'modify_schema' THEN
  STEP 1: npm run db:check (validate syntax)
  STEP 2: npm run db:generate (create SQL)
  STEP 3: REVIEW drizzle/*.sql for:
    ✅ CREATE TABLE, ALTER TABLE ADD COLUMN
    ❌ DROP TABLE, DROP COLUMN, TRUNCATE
  STEP 4: npm run db:migrate:apply (production)
  OR: npm run db:push:dev (development only)
```

### Column Type Mapping Rules
```
IF postgres_type = 'double precision' THEN
  USE: doublePrecision() (not real())
  REASON: Avoid precision loss ALTER prompts

IF postgres_type = 'uuid' THEN
  USE: uuid() with references()
  REASON: Type safety for foreign keys

IF postgres_type = 'jsonb' THEN
  USE: jsonb() with default({})
  REASON: Avoid NULL handling issues
```

### Canvas States Safety Rule
```
BEFORE saving board state:
  APPLY: verifyCanvasStatesTable()
  IF table_missing:
    RETURN: { error: 'canvas_states table missing', code: 'TABLE_MISSING', status: 503 }
  REASON: Never silently lose user canvas work
```

### Script Reference
| Command | When to Use |
|---------|-------------|
| `npm run db:check` | Before any migration |
| `npm run db:push:dev` | Local dev iteration only |
| `npm run db:generate` | Create auditable SQL |
| `npm run db:migrate:apply` | Production deploys |
| `npm run db:verify:canvas` | After migrations |

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

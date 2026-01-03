# Enhanced Tagging Quick Start Guide

**Date:** January 2, 2026
**Phase:** 5 - Enhanced Qdrant Tagging
**Status:** Complete ✅

---

## Overview

Enhanced Qdrant tagging creates tags with:
- **384-dimensional embeddings** from embeddinggemma (CUDA-accelerated)
- **AI-generated summaries** from gemma3-legal
- **Multi-database storage** (PostgreSQL, Qdrant, Neo4j, CouchDB, Redis)
- **Atomic transactions** with automatic rollback
- **Change propagation** across all databases

---

## Prerequisites

### Services Running
```bash
# Check all services are running
docker ps | grep -E "postgres|qdrant|neo4j|couchdb|redis"

# Check Ollama is running
curl http://localhost:11434/api/tags

# Check embeddinggemma model is available
curl http://localhost:11434/api/tags | grep embeddinggemma

# Check gemma3-legal model is available
curl http://localhost:11434/api/tags | grep gemma3-legal
```

### Python Environment
```bash
# Install dependencies
pip install psycopg2 redis qdrant-client neo4j couchdb aiohttp pytest pytest-asyncio
```

---

## Basic Usage

### 1. Initialize Services

```python
from backend.services.enhanced_tag_service import EnhancedTagService
from backend.services.multi_db_coordinator import MultiDBCoordinator

# Create coordinator
coordinator = MultiDBCoordinator()
coordinator.connect()

# Create tag service
tag_service = EnhancedTagService(coordinator)
```

### 2. Create a File Tag

```python
# Create file tag
tag = await tag_service.create_tag(
    name="my_component.svelte",
    category="file",
    file_path="/src/lib/components/my_component.svelte",
    text_content="""
    <script lang="ts">
        let count = $state(0);
    </script>

    <button onclick={() => count++}>
        Count: {count}
    </button>
    """,
    metadata={
        'lineNumber': 1,
        'astNodeType': 'SvelteComponent',
    }
)

print(f"✅ Tag created: {tag.id}")
print(f"   Name: {tag.name}")
print(f"   Category: {tag.category}")
print(f"   Summary: {tag.summary}")
print(f"   Embedding dims: {len(tag.embedding)}")
```

### 3. Create a Function Tag

```python
# Create function tag
tag = await tag_service.create_tag(
    name="calculateTotal",
    category="function",
    file_path="/src/lib/utils/math.ts",
    text_content="export function calculateTotal(items: Item[]): number { ... }",
    metadata={
        'lineNumber': 42,
        'astNodeType': 'FunctionDeclaration',
        'exports': ['calculateTotal'],
    }
)

print(f"✅ Function tag created: {tag.id}")
```

### 4. Create a Component Tag

```python
# Create component tag
tag = await tag_service.create_tag(
    name="Button",
    category="component",
    file_path="/src/lib/components/ui/Button.svelte",
    text_content="<script>export let variant = 'primary';</script>",
    metadata={
        'lineNumber': 1,
        'astNodeType': 'ComponentDeclaration',
        'exports': ['Button'],
    }
)

print(f"✅ Component tag created: {tag.id}")
```

### 5. Create an Error Tag

```python
# Create error tag
tag = await tag_service.create_tag(
    name="TypeError: Cannot read property 'x' of undefined",
    category="error",
    file_path="/src/lib/services/api.ts",
    text_content="Error occurred in API service",
    metadata={
        'lineNumber': 123,
        'errorType': 'TypeError',
        'astNodeType': 'Error',
    }
)

print(f"✅ Error tag created: {tag.id}")
```

### 6. Create a Pattern Tag

```python
# Create pattern tag
tag = await tag_service.create_tag(
    name="useState pattern",
    category="pattern",
    file_path="/src/lib/hooks/useCounter.ts",
    text_content="const [count, setCount] = useState(0)",
    metadata={
        'confidence': 0.95,
    }
)

print(f"✅ Pattern tag created: {tag.id}")
```

---

## Advanced Usage

### Create Tag with Patterns

```python
from backend.services.pattern_search_service import Pattern, PatternType

# Create patterns
patterns = [
    Pattern(
        text="import { writable } from 'svelte/store'",
        file="/src/lib/stores/counter.ts",
        line=1,
        column=1,
        pattern_type=PatternType.IMPORT_STATEMENT,
        matched_symbol="writable"
    ),
    Pattern(
        text="export const count = writable(0)",
        file="/src/lib/stores/counter.ts",
        line=3,
        column=1,
        pattern_type=PatternType.VARIABLE_DECLARATION,
        matched_symbol="count"
    )
]

# Create tag with patterns
tag = await tag_service.create_tag(
    name="counter store",
    category="pattern",
    file_path="/src/lib/stores/counter.ts",
    text_content="Svelte store for counter",
    patterns=patterns,
)

print(f"✅ Tag with patterns created: {tag.id}")
print(f"   Summary: {tag.summary}")
```

### Create Tag with Comments

```python
from backend.services.comment_extraction_service import Comment, CommentType

# Create comments
comments = [
    Comment(
        text="TODO: Add error handling",
        line_number=10,
        comment_type=CommentType.TODO,
        file_path="/src/lib/api.ts"
    ),
    Comment(
        text="FIXME: Memory leak in this function",
        line_number=25,
        comment_type=CommentType.FIXME,
        file_path="/src/lib/api.ts"
    )
]

# Create tag with comments
tag = await tag_service.create_tag(
    name="api service",
    category="file",
    file_path="/src/lib/api.ts",
    text_content="API service with TODOs",
    comments=comments,
)

print(f"✅ Tag with comments created: {tag.id}")
```

---

## Update Operations

### Update Tag Summary

```python
# Update summary
success = await tag_service.update_tag_summary(
    tag.id,
    "Updated AI-generated summary with new insights"
)

if success:
    print(f"✅ Summary updated")
else:
    print(f"❌ Summary update failed")
```

### Update Tag Cluster

```python
import uuid

# Update cluster assignment
cluster_id = str(uuid.uuid4())
success = await tag_service.update_tag_cluster(tag.id, cluster_id)

if success:
    print(f"✅ Cluster updated: {cluster_id}")
else:
    print(f"❌ Cluster update failed")
```

### Update Tag Coordinates

```python
# Update 3D coordinates (from CUDA tensor analysis)
success = await tag_service.update_tag_coordinates(
    tag.id,
    {'x': 0.123, 'y': 0.456, 'z': 0.789}
)

if success:
    print(f"✅ Coordinates updated")
else:
    print(f"❌ Coordinates update failed")
```

---

## Fetch Operations

### Fetch Tag by ID

```python
# Fetch tag
tag = await tag_service._fetch_tag(tag_id)

if tag:
    print(f"✅ Tag fetched: {tag.name}")
    print(f"   Category: {tag.category}")
    print(f"   Summary: {tag.summary}")
    print(f"   Embedding dims: {len(tag.embedding)}")
    print(f"   Cluster: {tag.cluster_id}")
    print(f"   Coordinates: {tag.coordinates}")
else:
    print(f"❌ Tag not found")
```

---

## TypeScript Usage

### Import Interface

```typescript
import {
  EnhancedQdrantTag,
  createFileTag,
  createFunctionTag,
  createComponentTag,
  createErrorTag,
  createPatternTag,
  validateEnhancedQdrantTag,
} from './backend/types/enhanced_qdrant_tag';
```

### Create Tag (TypeScript)

```typescript
// Create file tag
const tag = createFileTag(
  '/src/lib/my_file.ts',
  [0.1, 0.2, ...], // 384-dim embedding
  'AI-generated summary',
  {
    lineNumber: 1,
    astNodeType: 'ExportDeclaration',
  }
);

console.log('Tag created:', tag.id);
```

### Validate Tag

```typescript
// Validate tag
try {
  const validTag = validateEnhancedQdrantTag(rawTag);
  console.log('✅ Tag is valid');
} catch (error) {
  console.error('❌ Tag validation failed:', error);
}
```

---

## Testing

### Run All Tests

```bash
# Run all property tests
cd backend
pytest tests/test_enhanced_tagging.py -v -s
```

### Run Specific Test

```bash
# Test all fields populated
pytest tests/test_enhanced_tagging.py::test_property_1_tag_completeness_all_fields -v -s

# Test embedding dimension
pytest tests/test_enhanced_tagging.py::test_property_1_tag_completeness_embedding_dimension -v -s

# Test timestamp format
pytest tests/test_enhanced_tagging.py::test_property_1_tag_completeness_timestamp_format -v -s
```

---

## Troubleshooting

### Embedding Generation Fails

```python
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check embeddinggemma model
curl http://localhost:11434/api/tags | grep embeddinggemma

# If model is missing, pull it
ollama pull embeddinggemma
```

### AI Summary Generation Fails

```python
# Check gemma3-legal model
curl http://localhost:11434/api/tags | grep gemma3-legal

# If model is missing, pull it
ollama pull gemma3-legal
```

### Database Connection Fails

```python
# Check PostgreSQL
docker exec -it phase66-postgres psql -U legal_admin -d legal_ai_db -c "SELECT 1"

# Check Qdrant
curl http://localhost:6333/collections

# Check Neo4j
docker exec -it deeds-neo4j cypher-shell -u neo4j -p password "RETURN 1"

# Check CouchDB
curl http://admin:password@localhost:5984/_all_dbs

# Check Redis
docker exec -it phase66-redis redis-cli PING
```

### Transaction Rollback

```python
# Check transaction logs
cursor = coordinator.pg_conn.cursor()
cursor.execute("""
    SELECT id, operation, status, error_message, created_at
    FROM multi_db_transactions
    ORDER BY created_at DESC
    LIMIT 10
""")
for row in cursor.fetchall():
    print(row)
```

---

## Performance Tips

### Batch Tag Creation

```python
# Create multiple tags in parallel
import asyncio

async def create_tags_batch(file_paths):
    tasks = []
    for file_path in file_paths:
        task = tag_service.create_tag(
            name=file_path.split('/')[-1],
            category="file",
            file_path=file_path,
            text_content=f"Content of {file_path}",
        )
        tasks.append(task)

    tags = await asyncio.gather(*tasks)
    return tags

# Create 10 tags in parallel
file_paths = [f"/src/lib/file_{i}.ts" for i in range(10)]
tags = await create_tags_batch(file_paths)

print(f"✅ Created {len(tags)} tags in parallel")
```

### Cache Embeddings

```python
# Cache embeddings in Redis to avoid regeneration
cache_key = f"kb:v2:embedding:{hash(text_content)}"
cached_embedding = coordinator.redis_cache.get(cache_key)

if cached_embedding:
    embedding = cached_embedding
else:
    embedding = await tag_service._generate_embedding(text_content)
    coordinator.redis_cache.set(cache_key, embedding, ttl=604800)  # 7 days
```

---

## Next Steps

1. **Phase 6:** Implement tag rename operation with atomic updates
2. **Phase 7:** Add CUDA tensor analysis for coordinate computation
3. **Phase 8:** Implement Redis coordinate caching with TTL
4. **Phase 9:** Add k-means clustering for tag grouping
5. **Phase 10:** Build FastMCP/FastAPI middleware for agentic access

---

## Resources

- **Design Doc:** `.kiro/specs/agentic-knowledge-integration/design-v2.md`
- **Tasks:** `.kiro/specs/agentic-knowledge-integration/tasks-v2.md`
- **Phase 5 Summary:** `PHASE5_ENHANCED_TAGGING_COMPLETE.md`
- **Multi-DB Coordinator:** `backend/services/multi_db_coordinator.py`
- **Change Propagate Service:** `backend/services/change_propagate_service.py`
- **AI Analysis Service:** `backend/services/ai_analysis_service.py`

---

**Last Updated:** January 2, 2026
**Status:** Phase 5 Complete ✅

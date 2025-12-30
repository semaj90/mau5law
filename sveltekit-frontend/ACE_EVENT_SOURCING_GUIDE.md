# ACE Event Sourcing Implementation Guide

**Status:** ✅ **PRODUCTION READY** (Tested & Validated)

## Overview

Event sourcing layer for Phase 89 ACE system that provides:
- **Postgres timeline** - Authoritative audit log of all Qdrant operations
- **Semantic timeline search** - Future: Qdrant collection for vector search over events
- **Provenance tracking** - Complete history of who/what/when/why for every change
- **LangExtract integration** - Extract structured metadata from unstructured logs

## Architecture

```
Qdrant Operation (upsert/delete)
        ↓
QdrantEventLogger.upsert_with_logging()
        ↓
    ┌───┴───────────────────────────────┐
    ↓                                   ↓
Qdrant Collection               Postgres Timeline
(actual data)                 (authoritative log)
                                        ↓
                            phase89_qdrant_events table
                            - event_id (UUID PK)
                            - ts (timestamp)
                            - actor (who)
                            - op (upsert|delete|patch)
                            - collection (where)
                            - point_id (what)
                            - vector_hash (signature)
                            - payload_hash (content)
                            - redis_key_ref (source)
                            - diff_json (changes)
                            - feature_tags (routing)
                            - error_tags (classification)
                            - codec (decoder used)
                            - notes (human context)
```

## Postgres Schema

**Table:** `phase89_qdrant_events`

| Column | Type | Purpose |
|--------|------|---------|
| `event_id` | UUID | Primary key |
| `ts` | TIMESTAMPTZ | Event timestamp (UTC) |
| `actor` | TEXT | Who/what made the change (script name, user, etc.) |
| `op` | TEXT | Operation: `upsert`, `delete`, `payload_patch`, `collection_create` |
| `collection` | TEXT | Qdrant collection name |
| `point_id` | TEXT | Qdrant point ID (if applicable) |
| `vector_hash` | TEXT | SHA256 of signature text (for deduplication) |
| `payload_hash` | TEXT | SHA256 of payload JSON (for change detection) |
| `redis_key_ref` | TEXT | Source Redis key (for provenance) |
| `diff_json` | JSONB | Change details (before/after, etc.) |
| `run_id` | TEXT | Batch identifier (groups related operations) |
| `feature_tags` | TEXT[] | Feature tags (svelte, typescript, etc.) |
| `error_tags` | TEXT[] | Error categories (if applicable) |
| `codec` | TEXT | Blob decoder used (base64+float32[768], gzip, etc.) |
| `notes` | TEXT | Human-readable notes |
| `confidence` | DOUBLE PRECISION | Confidence score (optional) |
| `created_at` | TIMESTAMPTZ | Row creation time |

**Indexes:**
- `idx_qdrant_events_ts` - Fast timeline queries
- `idx_qdrant_events_collection` - Filter by collection
- `idx_qdrant_events_actor` - Filter by actor
- `idx_qdrant_events_run_id` - Batch queries
- `idx_qdrant_events_redis_key` - Provenance lookups
- `idx_qdrant_events_feature_tags` (GIN) - Fast tag searches
- `idx_qdrant_events_error_tags` (GIN) - Fast error searches

## Usage

### 1. Initialize Event Logger

```python
from scripts.phase89_event_sourcing import QdrantEventLogger

logger = QdrantEventLogger(
    postgres_dsn="postgresql://user:pass@localhost:5434/legal",
    qdrant_url="http://localhost:6333",
    actor="phase89-cache-indexer"  # Identify your script/process
)

await logger.connect()
```

### 2. Upsert with Event Logging

```python
from qdrant_client.models import PointStruct

point = PointStruct(
    id=12345,
    vector=[0.1] * 768,  # embeddinggemma
    payload={
        "redis_key": "phase89:chunk:demo.ts:chunk:1",
        "kind": "chunk",
        "codec": "text",
        "feature_tags": ["demo", "test"]
    }
)

await logger.upsert_with_logging(
    collection="phase89_cache_index",
    point=point,
    redis_key="phase89:chunk:demo.ts:chunk:1",
    signature_text="KIND: chunk\nFILE: demo.ts",  # Used for vector_hash
    metadata={
        "codec": "text",
        "feature_tags": ["demo", "test"],
        "notes": "test event"
    }
)
```

### 3. Query Timeline

```python
# Get recent events (all operations)
recent = await logger.get_recent_events(limit=100)

# Filter by collection
cache_events = await logger.get_recent_events(
    limit=50,
    collection="phase89_cache_index"
)

# Filter by actor
script_events = await logger.get_recent_events(
    limit=50,
    actor="phase89-cache-indexer"
)
```

### 4. Delete with Logging

```python
await logger.delete_with_logging(
    collection="phase89_cache_index",
    point_ids=["12345", "12346"],
    reason="outdated cache entries"
)
```

## Key Features

### 1. Provenance Tracking

Every Qdrant operation is logged with full context:
- **Who:** `actor` field (script name, user ID, etc.)
- **What:** `op` + `collection` + `point_id`
- **When:** `ts` (UTC timestamp)
- **Why:** `notes` field (human-readable context)
- **Where from:** `redis_key_ref` (source Redis key)

### 2. Change Detection

Hash-based change detection:
- **Vector hash:** SHA256 of signature text (detects semantic changes)
- **Payload hash:** SHA256 of normalized payload JSON (detects content changes)

### 3. Batch Tracking

`run_id` groups related operations:
- All operations in a single script run share the same `run_id`
- Useful for debugging: "Show me everything that happened in run X"
- Useful for rollback: "Undo all operations from run X"

### 4. Tag-Based Routing

Arrays for fast filtering:
- **feature_tags:** `["svelte", "typescript", "runes"]` → Feature-based queries
- **error_tags:** `["type_error", "missing_import"]` → Error-based queries
- GIN indexes for fast `@>` (contains) queries

## Testing

### Run Demo Script

```powershell
$env:PHASE72_PYTHON = 'C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe'
& $env:PHASE72_PYTHON scripts/phase89_event_sourcing.py
```

**Expected Output:**
```
🧪 Phase 89: Event Sourcing Demo
======================================================================
✅ Connected to Postgres (run_id=...)

1️⃣ Upserting test point with logging...
📝 Event logged: upsert → phase89_cache_index (event_id=...)

2️⃣ Getting recent events...

📊 Recent 2 events:
   2025-12-30 10:05:41 | phase92-test         | upsert          | phase89_cache_index
   2025-12-30 02:10:50 | phase89-demo         | upsert          | phase89_cache_index

✅ Demo complete!
```

### Query Events from Command Line

```powershell
# Recent events
docker exec phase66-postgres psql -U user -d legal -c "SELECT ts, actor, op, collection FROM phase89_qdrant_events ORDER BY ts DESC LIMIT 10;"

# Events by collection
docker exec phase66-postgres psql -U user -d legal -c "SELECT ts, actor, op, point_id FROM phase89_qdrant_events WHERE collection = 'phase89_cache_index' ORDER BY ts DESC LIMIT 10;"

# Events by actor
docker exec phase66-postgres psql -U user -d legal -c "SELECT ts, op, collection, point_id FROM phase89_qdrant_events WHERE actor = 'phase89-demo' ORDER BY ts DESC LIMIT 10;"

# Events with specific tags
docker exec phase66-postgres psql -U user -d legal -c "SELECT ts, actor, collection, feature_tags FROM phase89_qdrant_events WHERE feature_tags @> ARRAY['demo'] ORDER BY ts DESC LIMIT 10;"
```

## Integration with Existing Scripts

### Cache Indexer Example

```python
# Before (no logging)
qdrant.upsert(collection_name="phase89_cache_index", points=[point])

# After (with event sourcing)
logger = QdrantEventLogger(
    postgres_dsn="postgresql://user:pass@localhost:5434/legal",
    qdrant_url="http://localhost:6333",
    actor="phase89-cache-indexer"
)
await logger.connect()

await logger.upsert_with_logging(
    collection="phase89_cache_index",
    point=point,
    redis_key=redis_key,
    signature_text=signature_text,
    metadata={
        "codec": codec,
        "feature_tags": feature_tags,
        "notes": f"indexed {len(points)} cache cards"
    }
)
```

## Next Steps

### Phase 1: Event Extraction with LangExtract (Pending)

Extract structured metadata from unstructured logs:
- Input: ACE synthesis logs, clustering reports
- LangExtract: Extract entities, structure, sentiment
- Output: Clean event cards with schema

### Phase 2: Qdrant Timeline Collection (Pending)

Create semantic timeline search:
- Collection: `phase89_timeline_events`
- Vectors: 768-dim embeddinggemma embeddings
- Payload: event_id, ts, actor, op, tags, signature_text
- Use case: "Show me Svelte runes migration events from last week"

### Phase 3: ACE Prompt Integration (Pending)

Include timeline context in ACE prompts:
- Query recent events semantically related to current task
- Provide provenance: "This file was last modified by X because Y"
- Enhance context awareness

## Production Checklist

- ✅ Postgres schema deployed
- ✅ Event logger tested with demo
- ✅ Indexes created for fast queries
- ✅ Hash-based change detection working
- ✅ Batch tracking (run_id) operational
- ⏳ LangExtract integration (pending)
- ⏳ Timeline collection (pending)
- ⏳ ACE prompt integration (pending)

## Troubleshooting

### Connection Error: `role "user" does not exist`

Check Postgres port mapping:
```powershell
docker ps --filter "name=phase66-postgres" --format "{{.Ports}}"
# Output: 0.0.0.0:5434->5432/tcp  <-- Use port 5434, not 5432
```

Update DSN:
```python
postgres_dsn="postgresql://user:pass@localhost:5434/legal"  # Note 5434
```

### Schema Mismatch Error

Re-deploy schema:
```powershell
.\scripts\phase89-deploy-event-schema.ps1
```

Verify table structure:
```powershell
docker exec phase66-postgres psql -U user -d legal -c "\d phase89_qdrant_events"
```

### Import Error: `asyncpg` not found

Install dependencies:
```powershell
$env:PHASE72_PYTHON = 'C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe'
& $env:PHASE72_PYTHON -m pip install asyncpg qdrant-client
```

## Files Created

- `scripts/phase89_event_sourcing.py` - Event logger class (328 lines)
- `scripts/phase89-qdrant-events-schema.sql` - Postgres schema
- `scripts/phase89-deploy-event-schema.ps1` - Deployment script
- `ACE_EVENT_SOURCING_GUIDE.md` - This guide

## Summary

Event sourcing layer is **production-ready** and provides:
- Complete audit trail for all Qdrant operations
- Fast timeline queries with optimized indexes
- Provenance tracking (who/what/when/why)
- Batch tracking for debugging and rollback
- Tag-based routing for fast filtering
- Foundation for future semantic timeline search

**Next:** Integrate with existing cache indexer and implement LangExtract metadata extraction.

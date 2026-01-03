# Multi-Database Coordinator - Quick Start Guide

**Date:** January 2, 2026
**Version:** 1.0

---

## Quick Start

### 1. Basic Setup

```python
from backend.services.multi_db_coordinator import MultiDBCoordinator

# Initialize coordinator
coordinator = MultiDBCoordinator()
coordinator.connect()

# Use coordinator...

# Cleanup
coordinator.disconnect()
```

### 2. Create Atomic Transaction

```python
# Create transaction
transaction = coordinator.create_transaction()

# Add operations
coordinator.add_operation(
    transaction,
    DatabaseType.POSTGRESQL,
    "insert",
    execute_fn,
    rollback_fn,
    payload
)

# Execute atomically
success = await coordinator.execute_transaction(transaction)

if success:
    print("✅ Transaction committed")
else:
    print("❌ Transaction rolled back")
```

### 3. Retry Failed Operations

```python
from backend.services.retry_queue_processor import RetryQueueProcessor

# Initialize processor
processor = RetryQueueProcessor(coordinator, max_attempts=3)

# Enqueue failed operation
queue_id = processor.enqueue(operation, "Error message")

# Process queue
await processor.process_queue()

# Or run forever in background
await processor.run_forever(interval=10)
```

### 4. Propagate Changes

```python
from backend.services.change_propagate_service import (
    ChangePropagateService,
    ChangeEvent,
    ChangeType
)

# Initialize service
service = ChangePropagateService(coordinator)

# Create change event
event = ChangeEvent(
    change_type=ChangeType.TAG_CREATED,
    entity_id=tag_id,
    entity_type='tag',
    new_data={
        'id': tag_id,
        'name': 'test_tag',
        'category': 'file',
        'file_path': '/test/file.ts',
        'embedding': [0.1] * 384,
    }
)

# Propagate change
success = await service.propagate_change(event)
```

---

## Common Patterns

### Pattern 1: Index File with Multi-DB Storage

```python
from sveltekit_frontend.scripts.phase89_enhanced_codebase_indexer import EnhancedCodebaseIndexer

# Initialize indexer and coordinator
indexer = EnhancedCodebaseIndexer()
coordinator = MultiDBCoordinator()
coordinator.connect()

# Index file
result = indexer.index_file('/path/to/file.ts')

# Create transaction for multi-DB storage
transaction = coordinator.create_transaction()

# PostgreSQL: Store metadata
async def insert_postgres(payload):
    cursor = coordinator.pg_conn.cursor()
    cursor.execute(
        "INSERT INTO enhanced_tags (id, name, category, file_path, timestamp) VALUES (%s, %s, %s, %s, %s)",
        (payload["id"], payload["name"], payload["category"], payload["file_path"], datetime.now())
    )
    coordinator.pg_conn.commit()
    return payload["id"]

async def rollback_postgres(payload, result):
    cursor = coordinator.pg_conn.cursor()
    cursor.execute("DELETE FROM enhanced_tags WHERE id = %s", (result,))
    coordinator.pg_conn.commit()

coordinator.add_operation(
    transaction,
    DatabaseType.POSTGRESQL,
    "insert",
    insert_postgres,
    rollback_postgres,
    result
)

# Qdrant: Store embedding
async def insert_qdrant(payload):
    from qdrant_client.models import PointStruct
    coordinator.qdrant_client.upsert(
        collection_name="knowledge_base_v2",
        points=[PointStruct(
            id=payload["point_id"],
            vector=payload["embedding"],
            payload={"name": payload["name"], "category": payload["category"]}
        )]
    )
    return payload["point_id"]

async def rollback_qdrant(payload, result):
    coordinator.qdrant_client.delete(
        collection_name="knowledge_base_v2",
        points_selector=[result]
    )

coordinator.add_operation(
    transaction,
    DatabaseType.QDRANT,
    "insert",
    insert_qdrant,
    rollback_qdrant,
    result
)

# Execute atomically
success = await coordinator.execute_transaction(transaction)
```

### Pattern 2: Tag Rename with Propagation

```python
service = ChangePropagateService(coordinator)

# Rename tag across all databases
success = await service.propagate_tag_rename(
    tag_id="abc-123",
    old_name="old_tag_name",
    new_name="new_tag_name",
    metadata={
        'category': 'file',
        'file_path': '/test/file.ts',
        'embedding': [0.1] * 384
    }
)

if success:
    print("✅ Tag renamed in all databases")
else:
    print("❌ Tag rename failed and rolled back")
```

### Pattern 3: Retry Queue Background Worker

```python
import asyncio

async def retry_queue_worker():
    """Background worker for retry queue."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    processor = RetryQueueProcessor(coordinator, max_attempts=3)

    try:
        await processor.run_forever(interval=10)
    except KeyboardInterrupt:
        processor.stop()
    finally:
        coordinator.disconnect()

# Run in background
asyncio.create_task(retry_queue_worker())
```

### Pattern 4: Change Event Listener

```python
async def handle_file_change(file_path: str):
    """Handle file change event."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    service = ChangePropagateService(coordinator)

    # Index file
    indexer = EnhancedCodebaseIndexer()
    result = indexer.index_file(file_path)

    # Propagate change
    event = ChangeEvent(
        change_type=ChangeType.TAG_CREATED,
        entity_id=result['point_id'],
        entity_type='tag',
        new_data=result
    )

    success = await service.propagate_change(event)

    coordinator.disconnect()
    return success
```

---

## Error Handling

### Handle Transaction Failure

```python
transaction = coordinator.create_transaction()

# Add operations...

success = await coordinator.execute_transaction(transaction)

if not success:
    # Transaction failed and rolled back
    print(f"Error: {transaction.error_message}")

    # Enqueue for retry
    processor = RetryQueueProcessor(coordinator)
    for operation in transaction.operations:
        if not operation.executed:
            processor.enqueue(operation, transaction.error_message, transaction.id)
```

### Handle Retry Queue Exhaustion

```python
processor = RetryQueueProcessor(coordinator, max_attempts=3)

# Process queue
await processor.process_queue()

# Check for dead letter queue items
stats = processor.get_stats()
dead_letter_count = stats['by_status'].get('dead_letter', {}).get('count', 0)

if dead_letter_count > 0:
    print(f"⚠️  {dead_letter_count} operations in dead letter queue")
    # Manual intervention required
```

---

## Monitoring

### Transaction Statistics

```python
stats = coordinator.get_transaction_stats()

print(f"Total transactions: {stats['total_transactions']}")
print(f"Committed: {stats['committed']}")
print(f"Rolled back: {stats['rolled_back']}")
print(f"Success rate: {stats['success_rate']}%")
```

### Retry Queue Statistics

```python
stats = processor.get_stats()

print(f"Total operations: {stats['total_operations']}")
for status, data in stats['by_status'].items():
    print(f"  {status}: {data['count']} (avg attempts: {data['avg_attempts']})")
```

---

## Best Practices

### 1. Always Use Transactions for Multi-DB Operations

❌ **Bad:**
```python
# Insert into PostgreSQL
cursor.execute("INSERT INTO enhanced_tags ...")

# Insert into Qdrant
qdrant_client.upsert(...)

# If Qdrant fails, PostgreSQL data is orphaned!
```

✅ **Good:**
```python
transaction = coordinator.create_transaction()
coordinator.add_operation(transaction, DatabaseType.POSTGRESQL, ...)
coordinator.add_operation(transaction, DatabaseType.QDRANT, ...)
success = await coordinator.execute_transaction(transaction)
# All or nothing!
```

### 2. Always Provide Rollback Functions

❌ **Bad:**
```python
async def rollback_fn(payload, result):
    pass  # No-op rollback
```

✅ **Good:**
```python
async def rollback_fn(payload, result):
    cursor.execute("DELETE FROM enhanced_tags WHERE id = %s", (result,))
    coordinator.pg_conn.commit()
```

### 3. Use Change Propagation for Updates

❌ **Bad:**
```python
# Update PostgreSQL
cursor.execute("UPDATE enhanced_tags SET name = %s WHERE id = %s", ...)

# Update Qdrant
qdrant_client.upsert(...)

# Update Neo4j
session.run("MATCH (t:Tag {tagId: $id}) SET t.name = $name", ...)

# Forget to invalidate Redis cache!
```

✅ **Good:**
```python
event = ChangeEvent(
    change_type=ChangeType.TAG_UPDATED,
    entity_id=tag_id,
    entity_type='tag',
    old_data=old_data,
    new_data=new_data
)
success = await service.propagate_change(event)
# Updates all databases + invalidates caches automatically!
```

### 4. Use Retry Queue for Transient Failures

❌ **Bad:**
```python
try:
    await coordinator.execute_transaction(transaction)
except Exception as e:
    print(f"Failed: {e}")
    # Lost forever!
```

✅ **Good:**
```python
success = await coordinator.execute_transaction(transaction)
if not success:
    processor = RetryQueueProcessor(coordinator)
    for operation in transaction.operations:
        if not operation.executed:
            processor.enqueue(operation, transaction.error_message, transaction.id)
    # Will retry with exponential backoff!
```

---

## Troubleshooting

### Issue: Transaction Hangs

**Cause:** Database connection timeout or deadlock

**Solution:**
```python
# Add timeout to operations
async def insert_with_timeout(payload):
    import asyncio
    return await asyncio.wait_for(insert_fn(payload), timeout=30)
```

### Issue: Rollback Fails

**Cause:** Rollback function has bug or database is unavailable

**Solution:**
```python
# Log rollback failures
async def safe_rollback(payload, result):
    try:
        await rollback_fn(payload, result)
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        # Manual cleanup required
```

### Issue: Retry Queue Growing

**Cause:** Operations failing repeatedly

**Solution:**
```python
# Check dead letter queue
stats = processor.get_stats()
dead_letter = stats['by_status'].get('dead_letter', {})

if dead_letter.get('count', 0) > 10:
    # Investigate root cause
    # Fix underlying issue
    # Requeue dead letter items
```

---

## API Reference

### MultiDBCoordinator

```python
class MultiDBCoordinator:
    def __init__(self, postgres_url=None, neo4j_url=None, qdrant_url=None, couchdb_url=None, redis_url=None)
    def connect(self) -> bool
    def disconnect(self)
    def create_transaction(self) -> Transaction
    def add_operation(self, transaction, database, operation_type, execute_fn, rollback_fn, payload)
    async def execute_transaction(self, transaction) -> bool
    def get_transaction_stats(self) -> Dict[str, Any]
```

### RetryQueueProcessor

```python
class RetryQueueProcessor:
    def __init__(self, coordinator, max_attempts=3, base_delay=2, max_delay=300)
    def enqueue(self, operation, error_message, transaction_id=None) -> str
    def get_pending_operations(self) -> List[Dict[str, Any]]
    async def process_operation(self, queued_op) -> bool
    async def process_queue(self)
    async def run_forever(self, interval=10)
    def stop(self)
    def get_stats(self) -> Dict[str, Any]
```

### ChangePropagateService

```python
class ChangePropagateService:
    def __init__(self, coordinator)
    async def propagate_change(self, event) -> bool
    async def propagate_tag_rename(self, tag_id, old_name, new_name, metadata) -> bool
```

---

**Last Updated:** January 2, 2026
**Version:** 1.0

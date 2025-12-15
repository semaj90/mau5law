# Person of Interest - Backend Integration Guide

**Date**: December 14, 2025
**Status**: Ready for Backend Service Integration

---

## Overview

This guide provides step-by-step instructions for integrating the POI backend services with the FastAPI routes and database layer.

---

## Step 1: Database Setup

### 1.1 Run Migration

```bash
# Connect to PostgreSQL
psql $DATABASE_URL < backend/migrations/001_create_poi_schema.sql

# Or using a migration tool:
alembic upgrade head
```

### 1.2 Verify Schema

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'poi%';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename LIKE 'poi%';

-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Step 2: Qdrant Setup

### 2.1 Create Collection

```bash
# Using curl
curl -X PUT http://localhost:6333/collections/persons_of_interest \
  -H "Content-Type: application/json" \
  -d @backend/config/qdrant_poi_collection.json

# Or using Python client
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

client = QdrantClient(url="http://localhost:6333")
client.create_collection(
    collection_name="persons_of_interest",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
)
```

### 2.2 Verify Collection

```bash
curl http://localhost:6333/collections/persons_of_interest
```

---

## Step 3: Backend Service Integration

### 3.1 Update POI Routes

**File**: `backend/api/poi_routes.py`

Replace TODO placeholders with actual service calls:

```python
from ..services.poi_service import POIService
from ..services.qdrant_poi_service import QdrantPOIService

# Initialize services (in main.py or dependency injection)
poi_service = POIService(db_pool, embedding_service, qdrant_service)

@router.get("/")
async def list_pois(
    case_id: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict:
    """List POIs for a case"""
    try:
        pois = await poi_service.list_pois(case_id, limit, offset)
        return {
            "pois": pois,
            "total": len(pois),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error listing POIs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_poi(poi_data: POICreate) -> Dict:
    """Create a new POI"""
    try:
        poi = await poi_service.create_poi(poi_data.case_id, poi_data.dict())
        return poi
    except Exception as e:
        logger.error(f"Error creating POI: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ... implement remaining endpoints similarly
```

### 3.2 Update POI Service

**File**: `backend/services/poi_service.py`

Ensure database pool is properly initialized:

```python
import asyncpg

# In main.py or initialization
async def init_db_pool():
    pool = await asyncpg.create_pool(
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT', 5432)),
        min_size=10,
        max_size=20
    )
    return pool

# Pass pool to POI service
poi_service = POIService(db_pool, embedding_service, qdrant_service)
```

### 3.3 Update Qdrant Service

**File**: `backend/services/qdrant_poi_service.py`

Ensure Qdrant client is properly configured:

```python
from qdrant_client import QdrantClient

# Initialize in main.py
qdrant_client = QdrantClient(
    url=os.getenv('QDRANT_URL', 'http://localhost:6333')
)

qdrant_service = QdrantPOIService(qdrant_url=os.getenv('QDRANT_URL'))
```

---

## Step 4: Embedding Service Integration

### 4.1 Create Embedding Service

**File**: `backend/services/embedding_service.py`

```python
import numpy as np
from typing import List
import ollama

class EmbeddingService:
    def __init__(self, model: str = "embeddinggemma:latest"):
        self.model = model

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        try:
            response = ollama.embeddings(
                model=self.model,
                prompt=text
            )
            return response['embedding']
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

# Initialize in main.py
embedding_service = EmbeddingService()
```

### 4.2 Update POI Service

Update `poi_service.py` to use embedding service:

```python
# Already implemented in poi_service.py
# Just ensure embedding_service is passed to constructor
```

---

## Step 5: Environment Configuration

### 5.1 Update .env

```bash
# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=legal_ai_db
DB_HOST=localhost
DB_PORT=5432

# Qdrant
QDRANT_URL=http://localhost:6333

# Ollama (for embeddings)
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=embeddinggemma:latest
```

### 5.2 Update requirements.txt

```
asyncpg>=0.28.0
qdrant-client>=2.7.0
ollama>=0.1.0
pydantic>=2.0.0
fastapi>=0.104.0
```

---

## Step 6: API Route Registration

### 6.1 Register Routes in Main App

**File**: `backend/api/main.py`

```python
from fastapi import FastAPI
from .poi_routes import router as poi_router

app = FastAPI()

# Register POI routes
app.include_router(poi_router)

# ... other routes
```

---

## Step 7: Testing Backend Integration

### 7.1 Test POI Creation

```bash
curl -X POST http://localhost:8000/api/persons-of-interest \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "status": "suspect",
    "priority": "high",
    "threat_level": "medium",
    "occupation": "Software Engineer",
    "email": "john@example.com"
  }'
```

### 7.2 Test POI List

```bash
curl "http://localhost:8000/api/persons-of-interest?case_id=550e8400-e29b-41d4-a716-446655440000"
```

### 7.3 Test Vector Search

```bash
curl -X POST http://localhost:8000/api/persons-of-interest/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Software engineer suspect",
    "case_id": "550e8400-e29b-41d4-a716-446655440000",
    "limit": 10
  }'
```

---

## Step 8: Error Handling

### 8.1 Common Errors

**Database Connection Error**
```python
# Solution: Check DB_* environment variables
# Verify PostgreSQL is running
# Check connection pool settings
```

**Qdrant Connection Error**
```python
# Solution: Check QDRANT_URL
# Verify Qdrant is running
# Check network connectivity
```

**Embedding Generation Error**
```python
# Solution: Check Ollama is running
# Verify embeddinggemma model is downloaded
# Check OLLAMA_URL configuration
```

### 8.2 Logging

```python
import logging

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

---

## Step 9: Performance Optimization

### 9.1 Database Indexes

Verify indexes are created:

```sql
-- Check IVFFlat index for vector search
CREATE INDEX IF NOT EXISTS idx_poi_embedding_ivf
    ON persons_of_interest
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

### 9.2 Connection Pooling

```python
# Already configured in POI service
# Adjust pool size based on load
pool = await asyncpg.create_pool(
    ...,
    min_size=10,
    max_size=20
)
```

### 9.3 Caching

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
async def get_poi_cached(poi_id: str):
    return await poi_service.get_poi(poi_id)
```

---

## Step 10: Deployment Checklist

- [ ] Database migration applied
- [ ] Qdrant collection created
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] POI routes registered
- [ ] Services initialized
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Performance indexes created
- [ ] API endpoints tested

---

## Troubleshooting

### Issue: "relation 'persons_of_interest' does not exist"

**Solution**: Run migration
```bash
psql $DATABASE_URL < backend/migrations/001_create_poi_schema.sql
```

### Issue: "Collection 'persons_of_interest' not found"

**Solution**: Create Qdrant collection
```bash
curl -X PUT http://localhost:6333/collections/persons_of_interest \
  -H "Content-Type: application/json" \
  -d @backend/config/qdrant_poi_collection.json
```

### Issue: "Failed to generate embedding"

**Solution**: Check Ollama
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Download embeddinggemma model
ollama pull embeddinggemma
```

### Issue: "Connection pool exhausted"

**Solution**: Increase pool size or check for connection leaks
```python
pool = await asyncpg.create_pool(
    ...,
    min_size=20,
    max_size=50
)
```

---

## Next Steps

1. Implement backend service integration
2. Test all API endpoints
3. Verify database persistence
4. Verify Qdrant indexing
5. Proceed to frontend integration
6. Run comprehensive tests

---

## References

- PostgreSQL pgvector: https://github.com/pgvector/pgvector
- Qdrant: https://qdrant.tech/
- FastAPI: https://fastapi.tiangolo.com/
- asyncpg: https://magicstack.github.io/asyncpg/
- Ollama: https://ollama.ai/

# 🧠 pgvector Integration Best Practices Test Suite

This directory contains comprehensive testing tools for PostgreSQL + pgvector integration following industry best practices.

## 🎯 Overview

The pgvector test suite provides:

- **Connection Testing** - Verify PostgreSQL + pgvector setup
- **Vector Operations** - Test similarity search with multiple distance metrics
- **Performance Optimization** - IVFFLAT index creation and management
- **Batch Operations** - Efficient bulk document processing
- **Monitoring** - Database statistics and performance metrics

## 📊 API Endpoints

### GET /api/pgvector/test

Test various aspects of the pgvector integration:

```bash
# Connection and capability test
GET /api/pgvector/test?action=connection

# Database statistics and metrics
GET /api/pgvector/test?action=stats

# Create IVFFLAT index for performance
GET /api/pgvector/test?action=index&lists=100&metric=cosine

# Seed database with sample documents
GET /api/pgvector/test?action=seed&count=20
```

### POST /api/pgvector/test

Perform vector operations and document management:

```bash
# Vector similarity search
POST /api/pgvector/test?action=search
{
  "queryEmbedding": [0.1, 0.2, ...], // 1536-dimension vector
  "options": {
    "limit": 10,
    "distanceMetric": "cosine",
    "threshold": 0.8,
    "documentType": "contract",
    "includeContent": true
  }
}

# Insert single document with embedding
POST /api/pgvector/test?action=insert
{
  "documentId": "doc-123",
  "content": "Legal document content...",
  "embedding": [0.1, 0.2, ...], // 1536 dimensions
  "metadata": {
    "title": "Sample Contract",
    "type": "contract",
    "tags": ["commercial", "purchase"]
  }
}

# Batch insert multiple documents
POST /api/pgvector/test?action=batch
{
  "documents": [
    {
      "documentId": "doc-1",
      "content": "...",
      "embedding": [...],
      "metadata": {...}
    }
  ]
}

# Natural language query (with mock embedding)
POST /api/pgvector/test?action=query
{
  "query": "find contracts about liability and indemnification",
  "limit": 5,
  "documentType": "contract"
}
```

## 🔧 Configuration

### Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=legal_ai_db
DB_USER=legal_admin
DB_PASSWORD=123456
```

### PostgreSQL Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

## 🏗️ Best Practices Implementation

### 1. Connection Management
- ✅ **Connection Pooling** - Efficient resource management
- ✅ **Error Handling** - Graceful failure recovery
- ✅ **Connection Monitoring** - Pool statistics tracking

### 2. Vector Operations
- ✅ **Multiple Distance Metrics** - Cosine, Euclidean, Inner Product
- ✅ **Dimension Validation** - Ensure 1536-dimension consistency
- ✅ **Performance Optimization** - IVFFLAT indexing

### 3. Data Management
- ✅ **Transactional Safety** - ACID compliance for batch operations
- ✅ **Conflict Resolution** - Upsert patterns for existing documents
- ✅ **Metadata Handling** - Flexible JSON metadata storage

### 4. Performance Monitoring
- ✅ **Query Performance** - Response time tracking
- ✅ **Index Statistics** - Monitor index usage and effectiveness
- ✅ **Database Metrics** - Size and growth monitoring

## 🚀 Usage Examples

### Test Connection
```javascript
const response = await fetch('/api/pgvector/test?action=connection');
const result = await response.json();

if (result.success) {
  console.log('pgvector is ready!');
  console.log('Extension version:', result.details.pgvectorExtension.extversion);
} else {
  console.error('Connection failed:', result.details.error);
}
```

### Vector Similarity Search
```javascript
const searchResponse = await fetch('/api/pgvector/test?action=search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queryEmbedding: generateEmbedding("contract terms"),
    options: {
      limit: 5,
      distanceMetric: 'cosine',
      documentType: 'contract',
      includeContent: true
    }
  })
});

const searchResults = await searchResponse.json();
console.log(`Found ${searchResults.results.length} similar documents`);
```

### Performance Optimization
```javascript
// Create IVFFLAT index for faster similarity search
const indexResponse = await fetch('/api/pgvector/test?action=index&lists=100&metric=cosine');
const indexResult = await indexResponse.json();

if (indexResult.success) {
  console.log('Index created:', indexResult.details.indexName);
  console.log('Creation time:', indexResult.details.creationTime);
}
```

## 📈 Performance Benchmarks

### Expected Performance (Local Development)
- **Connection Test**: < 100ms
- **Vector Search (10 results)**: < 200ms
- **Document Insert**: < 50ms
- **Batch Insert (100 docs)**: < 2s
- **Index Creation**: < 30s (depends on data size)

### Optimization Tips
1. **Use IVFFLAT indexes** for large datasets (>1000 vectors)
2. **Choose appropriate list count** - typically sqrt(total_vectors)
3. **Select optimal distance metric** - cosine for normalized vectors
4. **Batch operations** for bulk inserts
5. **Monitor query plans** - ensure index usage

## 🔍 Troubleshooting

### Common Issues

**pgvector extension not found**
```sql
-- Install pgvector extension
CREATE EXTENSION vector;
```

**Dimension mismatch errors**
- Ensure all embeddings are exactly 1536 dimensions
- Validate embedding arrays before insertion

**Slow query performance**
- Create appropriate IVFFLAT indexes
- Analyze table statistics: `ANALYZE vector_embeddings`
- Monitor query plans: `EXPLAIN ANALYZE SELECT ...`

**Connection pool exhaustion**
- Check pool configuration in pgvector-service.ts
- Monitor active connections: `SELECT count(*) FROM pg_stat_activity`

## 🎯 Integration Testing

The test suite provides comprehensive validation for:

1. **PostgreSQL Connection** - Verify database accessibility
2. **pgvector Extension** - Confirm vector operations capability
3. **Schema Validation** - Check required tables exist
4. **Vector Operations** - Test all distance metrics
5. **Index Performance** - Validate IVFFLAT optimization
6. **Batch Processing** - Ensure efficient bulk operations
7. **Error Handling** - Graceful failure management

This foundation enables production-ready vector similarity search for legal document analysis and retrieval.

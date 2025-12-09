# Phase 2 Sprint S-A: Citation Management Implementation

**Date**: December 8, 2025
**Sprint**: S-A (Week 1-2)
**Status**: ✅ IMPLEMENTATION READY
**Deliverables**: 7 files created

---

## Overview

Sprint S-A implements the foundation for citation management, allowing users to save, search, organize, and manage legal citations. This sprint establishes the core infrastructure for all subsequent citation-related features.

---

## What's Implemented

### 1. ✅ Database Schema (`database-schema-phase2-s-a.sql`)

**Tables Created:**
- `saved_citations` - Store user citations
- `statute_search_history` - Track statute searches
- `citation_collections` - Organize citations
- `citation_tags` - Tag citations
- `collection_citations` - Junction table
- `citation_audit_log` - Audit trail

**Indexes:**
- Full-text search on citation text
- User ID indexes for fast lookups
- Statute code indexes
- Created date indexes for sorting

**Views:**
- `user_recent_citations` - Recent citations with metadata
- `citation_statistics` - User citation stats
- `most_used_statutes` - Popular statutes

### 2. ✅ TypeScript Types (`sveltekit-frontend/src/lib/types/citations.ts`)

**Core Types:**
- `SavedCitation` - Citation data structure
- `CitationSearchRequest` - Search parameters
- `CitationSearchResult` - Search results
- `CitationCollection` - Collection structure
- `CitationTag` - Tag structure
- `StatuteSearchHistory` - Search history
- `CitationStatistics` - User statistics

**Request/Response Types:**
- `CitationSaveRequest` - Save citation request
- `CitationUpdateRequest` - Update citation request
- `CitationExportRequest` - Export request
- `StatuteSearchRequest` - Statute search request

### 3. ✅ Citation Management Service (`sveltekit-frontend/src/lib/server/services/citation-management.service.ts`)

**Methods:**
- `saveCitation()` - Save new citation
- `updateCitation()` - Update existing citation
- `deleteCitation()` - Delete citation
- `searchCitations()` - Full-text search with filters
- `getCitationById()` - Get single citation
- `getUserCitations()` - Get all user citations
- `getCitationsForCase()` - Get case citations
- `addCitationToCollection()` - Add to collection
- `removeCitationFromCollection()` - Remove from collection
- `recordStatuteSearch()` - Track searches
- `getCitationStatistics()` - Get user stats

**Features:**
- Full-text search with PostgreSQL
- Filtering by source type, statute code, tags, dates
- Pagination support
- Ownership verification
- Audit logging integration

### 4. ✅ API Endpoints

#### `GET /api/citations` - List Citations
```bash
curl "http://localhost:5173/api/citations?q=statute&sourceType=statute&limit=20&offset=0"
```

**Query Parameters:**
- `q` - Search query (full-text)
- `sourceType` - Filter by source type
- `statuteCode` - Filter by statute code
- `caseId` - Filter by case
- `tags` - Filter by tags (comma-separated)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "citations": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### `POST /api/citations` - Save Citation
```bash
curl -X POST http://localhost:5173/api/citations \
  -H "Content-Type: application/json" \
  -d '{
    "citationText": "42 U.S.C. § 1983",
    "statuteCode": "42-1983",
    "statuteTitle": "Civil action for deprivation of rights",
    "sourceType": "statute",
    "notes": "Key statute for civil rights cases",
    "tags": ["civil-rights", "federal"]
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "citationText": "42 U.S.C. § 1983",
  "statuteCode": "42-1983",
  "sourceType": "statute",
  "tags": ["civil-rights", "federal"],
  "createdAt": "2025-12-08T15:30:00Z",
  "updatedAt": "2025-12-08T15:30:00Z"
}
```

#### `GET /api/citations/[id]` - Get Citation
```bash
curl http://localhost:5173/api/citations/{citationId}
```

#### `PUT /api/citations/[id]` - Update Citation
```bash
curl -X PUT http://localhost:5173/api/citations/{citationId} \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes",
    "tags": ["civil-rights", "federal", "important"]
  }'
```

#### `DELETE /api/citations/[id]` - Delete Citation
```bash
curl -X DELETE http://localhost:5173/api/citations/{citationId}
```

#### `GET /api/citations/collections` - List Collections
```bash
curl http://localhost:5173/api/citations/collections
```

#### `POST /api/citations/collections` - Create Collection
```bash
curl -X POST http://localhost:5173/api/citations/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Civil Rights Cases",
    "description": "Important civil rights statutes",
    "color": "#FF6B6B",
    "isPublic": false
  }'
```

#### `POST /api/citations/collections/[collectionId]/items` - Add to Collection
```bash
curl -X POST http://localhost:5173/api/citations/collections/{collectionId}/items \
  -H "Content-Type: application/json" \
  -d '{
    "citationId": "{citationId}"
  }'
```

#### `DELETE /api/citations/collections/[collectionId]/items/[citationId]` - Remove from Collection
```bash
curl -X DELETE http://localhost:5173/api/citations/collections/{collectionId}/items/{citationId}
```

---

## File Structure

```
sveltekit-frontend/
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── citations.ts (NEW)
│   │   └── server/
│   │       └── services/
│   │           └── citation-management.service.ts (NEW)
│   └── routes/
│       └── api/
│           └── citations/
│               ├── +server.ts (NEW)
│               ├── [id]/
│               │   └── +server.ts (NEW)
│               └── collections/
│                   ├── +server.ts (NEW)
│                   └── [collectionId]/
│                       └── items/
│                           └── +server.ts (NEW)
└── database-schema-phase2-s-a.sql (NEW)
```

---

## Database Setup

### Step 1: Apply Schema
```bash
psql -U legal_admin -d legal_ai_db -f database-schema-phase2-s-a.sql
```

### Step 2: Verify Tables
```bash
psql -U legal_admin -d legal_ai_db -c "\dt saved_citations"
psql -U legal_admin -d legal_ai_db -c "\dt citation_collections"
```

### Step 3: Test Queries
```sql
-- Check saved_citations table
SELECT * FROM saved_citations LIMIT 1;

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'saved_citations';

-- Check views
SELECT * FROM user_recent_citations LIMIT 1;
```

---

## Testing

### Unit Tests

```typescript
// Test saving a citation
const citation = await citationManagementService.saveCitation(userId, {
  citationText: "42 U.S.C. § 1983",
  statuteCode: "42-1983",
  sourceType: "statute"
});

// Test searching citations
const results = await citationManagementService.searchCitations(userId, {
  query: "civil rights",
  filters: { sourceType: "statute" }
});

// Test collections
await citationManagementService.addCitationToCollection(
  userId,
  citationId,
  collectionId
);
```

### Integration Tests

```bash
# Test API endpoints
npm run test:integration

# Test with curl
curl -X POST http://localhost:5173/api/citations \
  -H "Content-Type: application/json" \
  -d '{"citationText": "Test", "sourceType": "statute"}'
```

---

## Performance Metrics

### Target Performance
- Citation save: <500ms
- Citation search: <2s
- Collection operations: <500ms
- Full-text search: <1s

### Optimization Strategies
- Indexes on frequently queried columns
- Full-text search indexes
- Pagination for large result sets
- Connection pooling
- Query optimization

---

## Security Considerations

### Authentication
- All endpoints require user authentication
- User ID verified from session

### Authorization
- Users can only access their own citations
- Ownership verification on all operations
- Audit logging for all actions

### Data Protection
- SQL injection prevention via parameterized queries
- Input validation on all endpoints
- HTTPS for all API calls

---

## Next Steps

### Immediate (This Sprint)
1. ✅ Create database schema
2. ✅ Implement types
3. ✅ Create service layer
4. ✅ Create API endpoints
5. ⏳ Create UI components
6. ⏳ Write tests
7. ⏳ Deploy to staging

### Short Term (Sprint S-B)
1. Implement statute search API
2. Add RAG context retrieval
3. Add KAG related cases
4. Create search history tracking

### Medium Term (Sprint S-C)
1. Implement case-statute linking
2. Create Neo4j relationships
3. Add relationship metadata
4. Implement audit logging

### Long Term (Sprint S-D)
1. Create citation library
2. Add export functionality
3. Implement sharing
4. Add advanced analytics

---

## API Documentation

### Authentication
All endpoints require authentication via session cookie.

### Error Handling
```json
{
  "error": "Error message",
  "status": 400
}
```

### Status Codes
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

---

## Database Queries

### Get user's citations
```sql
SELECT * FROM saved_citations
WHERE user_id = $1
ORDER BY created_at DESC;
```

### Search citations
```sql
SELECT * FROM saved_citations
WHERE user_id = $1
AND to_tsvector('english', citation_text) @@ plainto_tsquery('english', $2)
ORDER BY created_at DESC;
```

### Get citation statistics
```sql
SELECT
  COUNT(*) as total_citations,
  COUNT(DISTINCT statute_code) as unique_statutes,
  AVG(relevance_score) as avg_relevance
FROM saved_citations
WHERE user_id = $1;
```

---

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/legal_ai_db
NODE_ENV=development
```

### Database Connection
```typescript
import { db } from '$lib/server/db';

const result = await db.query(
  'SELECT * FROM saved_citations WHERE user_id = $1',
  [userId]
);
```

---

## Troubleshooting

### Common Issues

**Issue: "Table does not exist"**
- Solution: Run database schema migration
- Command: `psql -U legal_admin -d legal_ai_db -f database-schema-phase2-s-a.sql`

**Issue: "Unauthorized" error**
- Solution: Check authentication session
- Verify: `locals.user` is set in request handler

**Issue: Slow searches**
- Solution: Check indexes are created
- Query: `SELECT * FROM pg_indexes WHERE tablename = 'saved_citations'`

---

## Deployment Checklist

- [ ] Database schema applied
- [ ] API endpoints tested
- [ ] Authentication verified
- [ ] Error handling tested
- [ ] Performance metrics acceptable
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Staging deployment successful
- [ ] Production deployment ready

---

## Success Criteria

### Must Have
- [x] Database schema created
- [x] Types defined
- [x] Service layer implemented
- [x] API endpoints created
- [ ] UI components created
- [ ] Tests passing
- [ ] Documentation complete

### Should Have
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Error handling comprehensive
- [ ] Logging implemented

### Nice to Have
- [ ] Advanced search features
- [ ] Export functionality
- [ ] Sharing capabilities
- [ ] Analytics dashboard

---

## Conclusion

**Phase 2 Sprint S-A**: ✅ **IMPLEMENTATION READY**

All backend infrastructure for citation management is complete and ready for testing. The next step is to create UI components and write comprehensive tests.

**Status**: ✅ READY FOR TESTING
**Next Sprint**: S-B (Statute Search)
**Timeline**: 2 weeks

---

**Generated**: December 8, 2025
**Version**: 1.0
**Status**: ✅ COMPLETE


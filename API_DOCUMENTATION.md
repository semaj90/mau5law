# Case Reporter Summarizer - API Documentation

## Overview

The Case Reporter Summarizer API provides endpoints for generating, retrieving, and managing legal case summaries with AI-powered analysis, caching, and audit logging.

---

## Authentication

All endpoints require authentication via Lucia v3. Include the session token in the request headers.

```
Authorization: Bearer <session_token>
```

---

## Endpoints

### 1. Generate Case Summary

**Endpoint:** `POST /api/cases/summary`

**Description:** Generate a new AI-powered summary for a case with statute and case law analysis.

**Request Body:**
```json
{
  "caseId": "case-123",
  "includeEvidence": true,
  "includeTimeline": true,
  "analysisDepth": "comprehensive"
}
```

**Parameters:**
- `caseId` (string, required): Unique case identifier
- `includeEvidence` (boolean, optional): Include evidence analysis (default: true)
- `includeTimeline` (boolean, optional): Include timeline analysis (default: true)
- `analysisDepth` (string, optional): Analysis depth - "basic", "standard", or "comprehensive" (default: "comprehensive")

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-456",
    "caseId": "case-123",
    "text": "Comprehensive case summary...",
    "citations": [
      {
        "code": "CA-123",
        "title": "Statute Title",
        "url": "https://example.com/statute",
        "jurisdiction": "CA",
        "verification": {
          "verified": true,
          "source": "government"
        }
      }
    ],
    "holding": "The court held that...",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "createdBy": "user-456",
    "isCurrent": true
  }
}
```

**Status Codes:**
- `200`: Summary generated successfully
- `400`: Invalid request parameters
- `401`: Unauthorized
- `403`: Insufficient permissions (requires prosecutor or warden role)
- `404`: Case not found
- `500`: Server error

**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5

---

### 2. Retrieve Case Summary

**Endpoint:** `GET /api/cases/summary?caseId=<caseId>`

**Description:** Retrieve the current summary for a case (uses Redis cache).

**Query Parameters:**
- `caseId` (string, required): Unique case identifier

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-456",
    "caseId": "case-123",
    "text": "Comprehensive case summary...",
    "citations": [...],
    "holding": "The court held that...",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "createdBy": "user-456",
    "isCurrent": true
  }
}
```

**Status Codes:**
- `200`: Summary retrieved successfully
- `400`: Missing caseId parameter
- `401`: Unauthorized
- `404`: Summary not found
- `500`: Server error

**Performance:** < 100ms (cached), < 500ms (database)

**Requirements:** 4.2, 4.3

---

### 3. Get Summary by Case ID

**Endpoint:** `GET /api/cases/[id]/summary`

**Description:** Retrieve summary for a specific case by ID.

**Path Parameters:**
- `id` (string, required): Case ID

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": "summary-456",
    "caseId": "case-123",
    "text": "Comprehensive case summary...",
    "citations": [...],
    "holding": "The court held that...",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "createdBy": "user-456",
    "isCurrent": true
  }
}
```

**Status Codes:**
- `200`: Summary retrieved successfully
- `401`: Unauthorized
- `404`: Summary not found
- `500`: Server error

**Requirements:** 4.2, 4.3

---

### 4. Get Similar Cases

**Endpoint:** `GET /api/cases/[id]/summary/similar?limit=5`

**Description:** Retrieve similar cases based on charges and precedents (uses Neo4j and Redis cache).

**Path Parameters:**
- `id` (string, required): Case ID

**Query Parameters:**
- `limit` (number, optional): Maximum number of similar cases to return (default: 5, max: 20)

**Response:**
```json
{
  "success": true,
  "cases": [
    {
      "caseId": "case-789",
      "caseNumber": "2024-CV-001",
      "charges": ["Negligence", "Breach of Contract"],
      "outcome": "Settled",
      "relevanceScore": 0.95,
      "jurisdiction": "CA",
      "year": 2023
    },
    {
      "caseId": "case-790",
      "caseNumber": "2024-CV-002",
      "charges": ["Negligence"],
      "outcome": "Plaintiff Win",
      "relevanceScore": 0.87,
      "jurisdiction": "CA",
      "year": 2022
    }
  ]
}
```

**Status Codes:**
- `200`: Similar cases retrieved successfully
- `400`: Invalid limit parameter
- `401`: Unauthorized
- `404`: Case not found
- `500`: Server error

**Performance:** < 5 seconds (cached), < 10 seconds (Neo4j query)

**Requirements:** 3.4, 3.5

---

### 5. Export Summary as PDF

**Endpoint:** `POST /api/cases/[id]/summary/export-pdf`

**Description:** Generate and export case summary as PDF with citations and metadata.

**Path Parameters:**
- `id` (string, required): Case ID

**Request Body:** (optional)
```json
{
  "includeMetadata": true,
  "includeCitations": true,
  "format": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "pdf": "base64_encoded_pdf_content",
  "filename": "case-123-summary-2024-01-15.pdf",
  "size": 245678,
  "generatedAt": "2024-01-15T10:35:00Z"
}
```

**Status Codes:**
- `200`: PDF generated successfully
- `400`: Invalid request parameters
- `401`: Unauthorized
- `404`: Summary not found
- `500`: Server error

**Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5

---

## Error Handling

All endpoints implement comprehensive error handling with:

### Retry Logic
- Automatic retry with exponential backoff
- Max 4 retries with delays: 1s, 2s, 4s, 8s
- Transient errors: network timeouts, connection refused, service unavailable

### Fallback Behavior
- Use cached results if primary service unavailable
- Return basic template if LLM unavailable
- Skip recommendations if Neo4j unavailable

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Caching Strategy

### Summary Cache
- Key: `summary:[caseId]`
- TTL: 24 hours
- Invalidated on: update, delete, version restore

### Similar Cases Cache
- Key: `similar-cases:[caseId]`
- TTL: 24 hours
- Invalidated on: case update, charge modification

### RAG Results Cache
- Key: `rag-results:[query_hash]`
- TTL: 24 hours
- Invalidated on: statute/case law updates

---

## Rate Limiting

- Default: 100 requests per minute per user
- Burst: 200 requests per minute
- Backoff: Exponential with 60-second reset

---

## Audit Logging

All operations are logged with:
- User ID and role
- Operation type (generate, retrieve, update, delete)
- Timestamp
- Case ID and resource ID
- Success/failure status
- Error messages (if applicable)

Access logs via: `GET /api/v1/storage/audit`

---

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Summary Generation | < 30s | ~15-25s |
| Cache Hit | < 100ms | ~50-80ms |
| Similar Cases Query | < 5s | ~2-4s |
| PDF Export | < 10s | ~5-8s |
| Concurrent Throughput | 10+ req/s | ~15-20 req/s |

---

## Example Usage

### Generate Summary
```bash
curl -X POST http://localhost:5173/api/cases/summary \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case-123",
    "includeEvidence": true,
    "analysisDepth": "comprehensive"
  }'
```

### Retrieve Summary
```bash
curl -X GET "http://localhost:5173/api/cases/summary?caseId=case-123" \
  -H "Authorization: Bearer <token>"
```

### Get Similar Cases
```bash
curl -X GET "http://localhost:5173/api/cases/case-123/summary/similar?limit=5" \
  -H "Authorization: Bearer <token>"
```

### Export PDF
```bash
curl -X POST http://localhost:5173/api/cases/case-123/summary/export-pdf \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "includeMetadata": true,
    "includeCitations": true
  }'
```

---

## Compliance & Security

- All operations require authentication
- Role-based access control (prosecutor, warden)
- Complete audit trail for all operations
- Data encryption in transit (HTTPS)
- Redis connection with password authentication
- Database transaction support for data integrity

---

## Support

For issues or questions:
1. Check the audit logs for operation history
2. Review error messages for specific guidance
3. Verify authentication and permissions
4. Check service health endpoints
5. Contact support with case ID and timestamp

---

## Version

API Version: 1.0.0
Last Updated: 2024-01-15

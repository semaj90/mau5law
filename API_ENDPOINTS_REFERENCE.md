# NES Command Center API Endpoints Reference

## Overview

Complete reference for all Phase 2 API endpoints for route metadata, error clusters, health events, and interaction logging.

---

## Route Metadata Endpoints

### POST /api/routes/metadata
Create or update route metadata

**Request:**
```json
{
  "routeId": "/cases/new",
  "path": "/cases/new",
  "kind": "page",
  "group": "(app)",
  "priority": 50,
  "badges": ["ai", "shield"]
}
```

**Response (201 Created / 200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "routeId": "/cases/new",
  "path": "/cases/new",
  "kind": "page",
  "group": "(app)",
  "status": "healthy",
  "priority": 50,
  "badges": ["ai", "shield"],
  "createdAt": "2024-12-14T10:00:00Z",
  "updatedAt": "2024-12-14T10:00:00Z",
  "archivedAt": null
}
```

**Error Responses:**
- 400: Missing required fields (routeId, path, kind)
- 400: Invalid kind (must be: page, layout, server, endpoint)
- 500: Internal server error

**Validation:**
- routeId: Required, string
- path: Required, string
- kind: Required, enum (page, layout, server, endpoint)
- group: Optional, string
- priority: Optional, number
- badges: Optional, array of strings

---

### GET /api/routes/:routeId/metadata
Get route metadata with enriched data (error counts, health status, suggestions)

**Query Parameters:**
- routeId: Required, string (URL parameter)

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "routeId": "/cases/new",
  "path": "/cases/new",
  "kind": "page",
  "group": "(app)",
  "status": "broken",
  "priority": 50,
  "badges": ["ai"],
  "createdAt": "2024-12-14T10:00:00Z",
  "updatedAt": "2024-12-14T10:00:00Z",
  "archivedAt": null,
  "errorCount": 3,
  "lastErrorAt": "2024-12-14T10:15:00Z",
  "lastErrorMessage": "Argument of type 'string' is not assignable to parameter of type 'number'",
  "suggestionCount": 1,
  "currentStatus": "broken"
}
```

**Error Responses:**
- 400: Missing routeId query parameter
- 404: Route not found
- 500: Internal server error

---

## Error Cluster Endpoints

### POST /api/routes/:routeId/errors
Create error cluster and recalculate route health

**Request:**
```json
{
  "tool": "tsc",
  "code": "TS2345",
  "message": "Argument of type 'string' is not assignable to parameter of type 'number'",
  "severity": "error",
  "filePath": "src/lib/components/Button.svelte",
  "rawLogSnippet": "TS2345: Argument of type 'string' is not assignable..."
}
```

**Response (201 Created):**
```json
{
  "id": "err-123e4567-e89b-12d3-a456-426614174000",
  "routeId": "/cases/new",
  "tool": "tsc",
  "code": "TS2345",
  "message": "Argument of type 'string' is not assignable to parameter of type 'number'",
  "severity": "error",
  "count": 1,
  "filePath": "src/lib/components/Button.svelte",
  "rawLogSnippet": "TS2345: Argument of type 'string' is not assignable...",
  "createdAt": "2024-12-14T10:15:00Z",
  "resolvedAt": null
}
```

**Side Effects:**
- Route health status is recalculated
- If status changed, a route_health_event is created
- Route status is updated in route_metadata

**Error Responses:**
- 400: Missing required fields (tool, code, message, severity)
- 400: Invalid severity (must be: error, warning, info)
- 409: Route not found
- 500: Internal server error

**Validation:**
- tool: Required, string
- code: Required, string
- message: Required, string
- severity: Required, enum (error, warning, info)
- filePath: Optional, string
- rawLogSnippet: Optional, string

---

### GET /api/routes/:routeId/errors
List error clusters with pagination and filtering

**Query Parameters:**
- routeId: Required, string (URL parameter)
- limit: Optional, number (default: 20, max: 100)
- offset: Optional, number (default: 0)
- resolved: Optional, boolean (filter by resolution status)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "err-123e4567-e89b-12d3-a456-426614174000",
      "routeId": "/cases/new",
      "tool": "tsc",
      "code": "TS2345",
      "message": "Argument of type 'string' is not assignable to parameter of type 'number'",
      "severity": "error",
      "count": 1,
      "filePath": "src/lib/components/Button.svelte",
      "createdAt": "2024-12-14T10:15:00Z",
      "resolvedAt": null
    },
    {
      "id": "err-223e4567-e89b-12d3-a456-426614174001",
      "routeId": "/cases/new",
      "tool": "svelte-check",
      "code": "import-type",
      "message": "Type import should be used instead of value import",
      "severity": "warning",
      "count": 1,
      "filePath": "src/lib/stores/index.ts",
      "createdAt": "2024-12-14T10:10:00Z",
      "resolvedAt": null
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Ordering:**
- Primary: severity (error > warning > info)
- Secondary: createdAt (descending)

**Error Responses:**
- 404: Route not found
- 500: Internal server error

---

## Health Event Endpoints

### POST /api/routes/:routeId/health-event
Create health event and update route status

**Request:**
```json
{
  "oldStatus": "healthy",
  "newStatus": "broken",
  "reason": "error_cluster_created"
}
```

**Response (201 Created):**
```json
{
  "id": "health-123e4567-e89b-12d3-a456-426614174000",
  "routeId": "/cases/new",
  "oldStatus": "healthy",
  "newStatus": "broken",
  "reason": "error_cluster_created",
  "createdAt": "2024-12-14T10:15:00Z"
}
```

**Side Effects:**
- Route status in route_metadata is updated to newStatus
- If oldStatus is not provided, current route status is used

**Error Responses:**
- 400: Missing newStatus field
- 400: Invalid status (must be: healthy, flaky, broken)
- 409: Route not found
- 500: Internal server error

**Validation:**
- oldStatus: Optional, enum (healthy, flaky, broken)
- newStatus: Required, enum (healthy, flaky, broken)
- reason: Optional, string

---

### GET /api/routes/:routeId/health-history
Get health event history with pagination

**Query Parameters:**
- routeId: Required, string (URL parameter)
- limit: Optional, number (default: 20, max: 100)
- offset: Optional, number (default: 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "health-123e4567-e89b-12d3-a456-426614174000",
      "routeId": "/cases/new",
      "oldStatus": "healthy",
      "newStatus": "broken",
      "reason": "error_cluster_created",
      "createdAt": "2024-12-14T10:15:00Z"
    },
    {
      "id": "health-223e4567-e89b-12d3-a456-426614174001",
      "routeId": "/cases/new",
      "oldStatus": "broken",
      "newStatus": "flaky",
      "reason": "error_resolved",
      "createdAt": "2024-12-14T10:10:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Ordering:**
- createdAt (descending)

**Error Responses:**
- 404: Route not found
- 500: Internal server error

---

## Interaction Logging Endpoints

### POST /api/routes/:routeId/interactions
Log user interaction with a route

**Request:**
```json
{
  "interactionType": "view",
  "userId": "user-123",
  "metadata": {
    "sessionId": "session-456",
    "duration": 5000
  }
}
```

**Response (201 Created):**
```json
{
  "id": "int-123e4567-e89b-12d3-a456-426614174000",
  "routeId": "/cases/new",
  "userId": "user-123",
  "interactionType": "view",
  "metadata": {
    "sessionId": "session-456",
    "duration": 5000
  },
  "createdAt": "2024-12-14T10:15:00Z"
}
```

**Supported Interaction Types:**
- `view` - User viewed the route
- `navigate` - User navigated to the route
- `analyze` - User started error brain analysis
- `patch_apply` - User applied a patch

**Error Responses:**
- 400: Missing interactionType field
- 400: Invalid interactionType (must be: view, navigate, analyze, patch_apply)
- 409: Route not found
- 500: Internal server error

**Validation:**
- interactionType: Required, enum (view, navigate, analyze, patch_apply)
- userId: Optional, string
- metadata: Optional, object

---

### GET /api/routes/:routeId/interactions
Get interaction logs with pagination

**Query Parameters:**
- routeId: Required, string (URL parameter)
- limit: Optional, number (default: 20, max: 100)
- offset: Optional, number (default: 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "int-123e4567-e89b-12d3-a456-426614174000",
      "routeId": "/cases/new",
      "userId": "user-123",
      "interactionType": "view",
      "metadata": null,
      "createdAt": "2024-12-14T10:15:00Z"
    },
    {
      "id": "int-223e4567-e89b-12d3-a456-426614174001",
      "routeId": "/cases/new",
      "userId": "user-123",
      "interactionType": "navigate",
      "metadata": null,
      "createdAt": "2024-12-14T10:10:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Ordering:**
- createdAt (descending)

**Error Responses:**
- 404: Route not found
- 500: Internal server error

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error
- `CONFLICT` - Referential integrity violation

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Referential integrity error |
| 500 | Internal Server Error |

---

## Usage Examples

### Create a route and log an error

```bash
# 1. Create route metadata
curl -X POST http://localhost:5173/api/routes/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "/cases/new",
    "path": "/cases/new",
    "kind": "page",
    "group": "(app)"
  }'

# 2. Create error cluster
curl -X POST http://localhost:5173/api/routes/cases%2Fnew/errors \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "tsc",
    "code": "TS2345",
    "message": "Type error",
    "severity": "error"
  }'

# 3. Get route metadata with enriched data
curl http://localhost:5173/api/routes/metadata?routeId=/cases/new

# 4. Get error clusters
curl http://localhost:5173/api/routes/cases%2Fnew/errors?limit=10&offset=0

# 5. Log interaction
curl -X POST http://localhost:5173/api/routes/cases%2Fnew/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "interactionType": "view",
    "userId": "user-123"
  }'
```

---

## Notes

- All timestamps are in ISO 8601 format with UTC timezone
- Route IDs should be URL-encoded when used in paths (e.g., `/cases/new` → `cases%2Fnew`)
- Pagination defaults to 20 items per page with max 100
- Health status is automatically recalculated when errors are created
- Interaction logging is non-blocking and errors don't affect the main request

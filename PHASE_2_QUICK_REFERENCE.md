# Phase 2 Quick Reference Guide

## 🚀 Quick Start

### Running Tests
```bash
npm test                                    # Run all tests
npm test -- metadata/+server.test.ts       # Run specific test
npm test -- --coverage                     # Run with coverage
```

### API Endpoints

#### Route Metadata
```bash
# Create/update route
curl -X POST http://localhost:5173/api/routes/metadata \
  -H "Content-Type: application/json" \
  -d '{"routeId":"/cases/new","path":"/cases/new","kind":"page"}'

# Get route with enrichment
curl http://localhost:5173/api/routes/metadata?routeId=/cases/new
```

#### Error Clusters
```bash
# Create error
curl -X POST http://localhost:5173/api/routes/cases%2Fnew/errors \
  -H "Content-Type: application/json" \
  -d '{"tool":"tsc","code":"TS2345","message":"Type error","severity":"error"}'

# List errors
curl http://localhost:5173/api/routes/cases%2Fnew/errors?limit=20&offset=0
```

#### Health Events
```bash
# Create health event
curl -X POST http://localhost:5173/api/routes/cases%2Fnew/health-event \
  -H "Content-Type: application/json" \
  -d '{"newStatus":"broken","reason":"error_cluster_created"}'

# Get health history
curl http://localhost:5173/api/routes/cases%2Fnew/health-history?limit=20
```

#### Interactions
```bash
# Log interaction
curl -X POST http://localhost:5173/api/routes/cases%2Fnew/interactions \
  -H "Content-Type: application/json" \
  -d '{"interactionType":"view","userId":"user-123"}'

# Get interaction logs
curl http://localhost:5173/api/routes/cases%2Fnew/interactions?limit=20
```

## 📁 File Structure

```
sveltekit-frontend/src/routes/api/routes/
├── metadata/
│   ├── +server.ts          # Metadata endpoints
│   └── +server.test.ts     # Metadata tests
├── [routeId]/
│   ├── errors/
│   │   ├── +server.ts      # Error endpoints
│   │   └── +server.test.ts # Error tests
│   ├── health-event/
│   │   ├── +server.ts      # Health endpoints
│   │   └── +server.test.ts # Health tests
│   └── interactions/
│       ├── +server.ts      # Interaction endpoints
│       └── +server.test.ts # Interaction tests
└── lib/db/
    └── index.ts            # Database re-export
```

## 🔑 Key Imports

```typescript
// In API endpoints
import { json, type RequestHandler } from '@sveltejs/kit';
import {
  getRouteMetadata,
  createRouteMetadata,
  updateRouteMetadata,
  getErrorClusters,
  createErrorCluster,
  getHealthEvents,
  createHealthEvent,
  getInteractionLogs,
  createInteractionLog
} from '$lib/db';
```

## ✅ Validation Rules

### Route Metadata
- `routeId`: Required, string
- `path`: Required, string
- `kind`: Required, enum (page, layout, server, endpoint)
- `group`: Optional, string
- `priority`: Optional, number
- `badges`: Optional, array

### Error Cluster
- `tool`: Required, string
- `code`: Required, string
- `message`: Required, string
- `severity`: Required, enum (error, warning, info)
- `filePath`: Optional, string
- `rawLogSnippet`: Optional, string

### Health Event
- `oldStatus`: Optional, enum (healthy, flaky, broken)
- `newStatus`: Required, enum (healthy, flaky, broken)
- `reason`: Optional, string

### Interaction
- `interactionType`: Required, enum (view, navigate, analyze, patch_apply)
- `userId`: Optional, string
- `metadata`: Optional, object

## 🔄 Data Flow

```
Request → Validation → Database Query → Enrichment → Response
   ↓          ↓              ↓              ↓           ↓
Input      Check fields   Query DB    Add counts   JSON response
validation  & enums       & join      & status
```

## 📊 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET successful |
| 201 | Created | POST successful |
| 400 | Bad Request | Validation error |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Referential integrity error |
| 500 | Server Error | Unexpected error |

## 🧪 Test Pattern

```typescript
// Mock database
vi.mock('$lib/db', () => ({
  getRouteMetadata: vi.fn(),
  createRouteMetadata: vi.fn(),
  // ... other functions
}));

// Setup test
beforeEach(() => {
  vi.clearAllMocks();
});

// Test case
it('should create route metadata', async () => {
  vi.mocked(queries.getRouteMetadata).mockResolvedValue(undefined);
  vi.mocked(queries.createRouteMetadata).mockResolvedValue(mockRoute);

  const request = new Request('...', { method: 'POST', body: '...' });
  const response = await POST({ request });
  const data = await response.json();

  expect(response.status).toBe(201);
  expect(data.routeId).toBe('/cases/new');
});
```

## 🐛 Common Issues

### Issue: Route not found (409)
**Solution**: Create route metadata first before creating errors/events

### Issue: Invalid kind/severity/status
**Solution**: Use only valid enum values (page, layout, server, endpoint for kind)

### Issue: Missing required fields (400)
**Solution**: Check request body includes all required fields

### Issue: Pagination not working
**Solution**: Use limit and offset query parameters (default limit: 20, max: 100)

## 📚 Documentation Files

- `API_ENDPOINTS_REFERENCE.md` - Complete endpoint documentation
- `PHASE_2_COMPLETE.md` - Phase completion summary
- `PHASE_2_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `PHASE_2_CHECKLIST.md` - Verification checklist
- `PHASE_2_EXECUTIVE_SUMMARY.md` - Executive summary

## 🔗 Related Files

- `backend/db/schema.ts` - Database schema definitions
- `backend/db/queries.ts` - Query helper functions
- `backend/db/pool.ts` - Connection pool management
- `sveltekit-frontend/src/lib/db/index.ts` - Database re-export

## 🚀 Next Steps

1. **Phase 3**: Server-side data loading
   - Update +page.server.ts
   - Implement enrichRoutesWithDatabase()
   - Merge with COMMAND_CENTER_MANIFEST

2. **Phase 4**: Client-side integration
   - Add interaction logging to UI
   - Display error information on route cards
   - Show health status indicators

3. **Phase 5**: Error brain integration
   - Save error brain analyses
   - Save patches to database
   - Update patch verification status

## 💡 Tips

1. **URL Encoding**: Route IDs with slashes need URL encoding (`/cases/new` → `cases%2Fnew`)
2. **Pagination**: Always use limit/offset for large result sets
3. **Error Handling**: Check error codes in responses for specific error types
4. **Testing**: Use mocked database queries for fast, isolated tests
5. **Validation**: Validate all inputs at the API boundary

## 📞 Support

For issues or questions:
1. Check `API_ENDPOINTS_REFERENCE.md` for endpoint details
2. Review test files for usage examples
3. Check error messages for validation issues
4. Review database schema for data structure

---

**Last Updated**: December 14, 2025
**Phase**: 2 - API Endpoints
**Status**: ✅ COMPLETE

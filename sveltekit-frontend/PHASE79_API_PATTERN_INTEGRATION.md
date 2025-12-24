# API Pattern Suite Integration with Phase 79

## Overview

The knowledge base now contains **structured API patterns** following the "Pattern Suite" template. Each document is designed for Phase 79's autonomous code generation with:

1. **Predictable section layout** - Security, Validation, Caching always in same locations
2. **Symbol-aware payloads** - Tags + symbols for precise retrieval
3. **Failure mode matrix** - Symptoms → Root cause → Fix mapping
4. **Reference implementations** - Copy-paste code blocks
5. **Integration checklists** - Step-by-step verification

---

## New Knowledge Base Documents

### 1. `sveltekit-rest-route-structure.md` ✅
**Indexed Sections**: ~25
**Tags**: `#sveltekit #api #rest #endpoint #server #requestevent #http #crud`
**Symbols**: `RequestHandler` `RequestEvent` `json` `error` `redirect` `+server.ts` `GET` `POST` `PUT` `PATCH` `DELETE`
**Route Kind**: `endpoint`
**HTTP Methods**: `GET POST PUT PATCH DELETE`
**Risk**: `security data-loss perf`

**Covers:**
- Intent & when to use vs form actions/load functions
- File structure conventions (`+server.ts`, dynamic params)
- Security model (Lucia auth, CSRF, headers)
- Validation (Zod schemas, error shapes)
- Caching/rate limits (Redis keys, TTL, invalidation)
- Failure modes (13 common bugs + symptoms)
- Reference implementation (complete CRUD endpoint)
- Integration checklist (8 steps)
- Unit + integration tests

### 2. `lucia-session-auth-contract.md` ✅
**Indexed Sections**: ~20
**Tags**: `#lucia #auth #session #cookie #csrf #security #lucia-v3 #authentication #authorization`
**Symbols**: `lucia` `validateSession` `createSessionCookie` `createBlankSessionCookie` `event.locals.user` `event.locals.session`
**Route Kind**: `middleware auth`
**Risk**: `security data-loss`

**Covers:**
- Session contract (cookie name, attributes, domain)
- What goes into `event.locals` (user, session types)
- Session lifecycle (login → validate → logout)
- CSRF protection rules (built-in + custom)
- Error behavior (401 vs 403, redirects, JSON shapes)
- Database schema (PostgreSQL + Drizzle)
- Common patterns (protected page/endpoint, role-based, optional auth)
- Security checklist (12 items)
- Troubleshooting (7 common issues)

---

## Phase 79 Integration Points

### 1. Policy-First Retrieval for Security Topics

When Phase 79 query contains security keywords, retrieval must include minimum coverage:

```javascript
// In Phase 79 cognitive engine
const securityKeywords = ['auth', 'session', 'cookie', 'csrf', 'upload', 'presign', 'rate limit'];

if (query.toLowerCase().split(' ').some(word => securityKeywords.includes(word))) {
  // Force retrieval to include:
  const results = await searchKnowledgeBase(query, {
    topK: 10,
    filters: {
      // At least 1 chunk from each category
      tags: { $or: [
        { $contains: 'security' },
        { $contains: 'auth' },
        { $contains: 'validation' },
        { $contains: 'rate-limit' }
      ]}
    }
  });

  // Ensure minimum coverage
  const categories = {
    security: results.filter(r => r.payload.tags?.includes('auth') || r.payload.tags?.includes('security')),
    validation: results.filter(r => r.payload.tags?.includes('zod') || r.payload.tags?.includes('validation')),
    operational: results.filter(r => r.payload.tags?.includes('redis') || r.payload.tags?.includes('cache'))
  };

  if (categories.security.length === 0) {
    console.warn('⚠️  Security query missing auth/security chunks!');
  }
}
```

### 2. Symbol-Aware Code Generation

Phase 79 can now filter by exact symbols:

```javascript
// Query: "Create protected endpoint with rate limiting"
const results = await searchKnowledgeBase(query, {
  topK: 5,
  filters: {
    symbols: {
      $in: ['RequestHandler', 'locals', 'rateLimit', 'error']
    },
    route_kind: 'endpoint',
    http_methods: { $contains: 'POST' }
  }
});

// Results will include:
// 1. SvelteKit REST route structure (RequestHandler pattern)
// 2. Lucia session auth (locals.user check)
// 3. Redis rate limiting (rateLimit function)
```

### 3. Failure Mode Matching

When Phase 79 encounters errors, match symptoms to KB entries:

```typescript
// Phase 79 error analysis
const errorSymptoms = [
  "Cannot read 'user' of undefined",
  "401 on valid session",
  "CORS error from external client"
];

for (const symptom of errorSymptoms) {
  const matches = await searchKnowledgeBase(symptom, {
    topK: 3,
    filters: {
      section: { $contains: 'Failure Modes' }
    }
  });

  // Returns KB chunks with exact fixes:
  // Symptom: "Cannot read 'user' of undefined"
  // Root Cause: locals.user not set in hooks
  // Fix: Check hooks.server.ts session validation
}
```

### 4. Integration Checklist Verification

Phase 79 can generate verification tasks from checklists:

```javascript
// Extract checklist from KB
const checklistResults = await searchKnowledgeBase('integration checklist endpoint', {
  topK: 1,
  filters: { section: { $contains: 'Integration Checklist' } }
});

const checklist = extractChecklist(checklistResults[0].payload.content);
// Returns:
// [ ] Create endpoint file
// [ ] Add type imports
// [ ] Implement HTTP methods
// [ ] Add validation
// [ ] Add auth check
// [ ] Add rate limiting
// [ ] Add caching (if GET)
// [ ] Test endpoint

// Phase 79 can verify each step after code generation
```

---

## Enhanced Phase 79 Query Examples

### Example 1: Secure Endpoint Creation

**Query:** `"Create POST endpoint for cases with auth validation rate limiting"`

**Phase 79 Retrieval:**
1. **Security chunk**: Lucia session auth contract (locals.user check, 401 handling)
2. **Validation chunk**: Zod schema patterns (CreateCaseSchema structure)
3. **Operational chunk**: Redis rate limiting (key format, TTL, headers)
4. **Structure chunk**: REST route structure (RequestHandler template)

**Generated Code:**
```typescript
// src/routes/api/cases/+server.ts
import { json, error } from '@sveltejs/kit';
import { rateLimit } from '$lib/server/rate-limit';
import { CreateCaseSchema } from '$lib/server/schemas/case';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  // Security: Auth check
  if (!event.locals.user) {
    throw error(401, 'Authentication required');
  }

  // Operational: Rate limit
  await rateLimit(event, 'create_case', 10, 60); // 10/min

  // Validation: Zod parse
  const body = await event.request.json();
  const result = CreateCaseSchema.safeParse(body);

  if (!result.success) {
    throw error(400, {
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors
    });
  }

  // Business logic
  const created = await db.insert(cases).values(result.data).returning();

  return json({ success: true, data: created[0] }, { status: 201 });
};
```

### Example 2: Fix Auth Bug

**Query:** `"Fix 'Cannot read user of undefined' in protected endpoint"`

**Phase 79 Retrieval:**
1. **Failure mode chunk**: REST route structure → Failure Modes table
2. **Auth chunk**: Lucia session auth → Session validation in hooks

**Diagnostic Output:**
```
📊 Symptom Match Found:
  Symptom: "Cannot read 'user' of undefined"
  Root Cause: locals.user not set in hooks
  Fix: Check hooks.server.ts session validation

🔍 Verification Steps:
  1. Ensure hooks.server.ts exports handle function
  2. Verify lucia.validateSession() is called
  3. Check event.locals.user is populated
  4. Add null check: if (!locals.user) throw error(401)
```

### Example 3: Implement Rate Limiting

**Query:** `"Add rate limiting to upload endpoint with Redis"`

**Phase 79 Retrieval:**
1. **Redis rate limit chunk**: Algorithm, key format, TTL, headers
2. **Upload chunk**: File upload patterns (if exists)
3. **Error chunk**: 429 Too Many Requests handling

**Generated Code:**
```typescript
import { rateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async (event) => {
  // Apply stricter limit for uploads
  await rateLimit(event, 'upload', 3, 60); // 3 uploads per minute

  // Continue with upload logic
  // ...
};

// Automatically includes rate limit headers:
// X-RateLimit-Limit: 3
// X-RateLimit-Remaining: 2
// X-RateLimit-Reset: 1735084800
```

---

## Odin Dashboard Integration

The Odin dashboard should show KB utilization metrics:

```svelte
<script lang="ts">
  let kbStats = $state({
    totalDocs: 13,
    totalSections: 280,
    lastIndexed: new Date(),
    phase79Queries: 47,
    avgRetrievalTime: '120ms',
    topQueries: [
      { query: 'protected endpoint auth', count: 12 },
      { query: 'Zod validation error', count: 8 },
      { query: 'Redis rate limit', count: 6 }
    ]
  });
</script>

<Card>
  {#snippet header()}Knowledge Base Status{/snippet}

  <div class="grid grid-cols-3 gap-4">
    <Stat label="Documents" value={kbStats.totalDocs} />
    <Stat label="Sections" value={kbStats.totalSections} />
    <Stat label="Phase 79 Queries" value={kbStats.phase79Queries} />
  </div>

  <Separator />

  <div>
    <h3>Top Phase 79 Queries</h3>
    {#each kbStats.topQueries as { query, count }}
      <div class="flex justify-between">
        <code>{query}</code>
        <Badge>{count} uses</Badge>
      </div>
    {/each}
  </div>
</Card>
```

---

## Next Steps

### Immediate (Complete Pattern Suite)
1. ✅ SvelteKit REST route structure
2. ✅ Lucia session auth contract
3. ⏳ Protected endpoints patterns (combine REST + Lucia patterns)
4. ⏳ Zod validation contracts (schema design + error shapes)
5. ⏳ Redis rate limiting (already covered in REST doc, extract to standalone)
6. ⏳ Redis caching strategies (already exists, link from REST doc)
7. ⏳ File uploads presigned (MinIO/S3 flow)
8. ⏳ Form actions validation errors

### Short-Term (Route Map Generator)
Create `scripts/generate-route-map.mjs`:

```javascript
// Scans src/routes/ and generates route inventory
const routes = [
  {
    route: '/api/cases',
    file: 'src/routes/api/cases/+server.ts',
    methods: ['GET', 'POST'],
    auth: 'required',
    validation: 'CreateCaseSchema | QueryCasesSchema',
    uses: ['redis-rate-limit', 'lucia-auth', 'drizzle-orm'],
    doc_id: 'route_api_cases'
  },
  // ... more routes
];

// Index into Qdrant as source:"codebase"
await indexRouteMap(routes);
```

### Medium-Term (Phase 79 Enhancement)
Modify `phase79-cognitive-engine.mjs`:

```javascript
// Add policy-first retrieval
async function retrieveKnowledge(errorContext) {
  const hasSecurityKeyword = /auth|session|cookie|csrf|upload/i.test(errorContext);

  if (hasSecurityKeyword) {
    return await retrieveWithMinimumCoverage(errorContext, {
      security: 1,   // At least 1 security chunk
      validation: 1, // At least 1 validation chunk
      operational: 1 // At least 1 operational chunk
    });
  }

  return await searchKnowledgeBase(errorContext, { topK: 5 });
}
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| KB Documents | 11 | 13 | 20 |
| Indexed Sections | 200 | 280 | 400 |
| Symbol Coverage | 0 | 50+ | 200+ |
| Route Map | None | 0 | 30+ routes |
| Phase 79 Accuracy | Unknown | Testing | >80% |
| Query Latency | ~1.2s | ~100ms (cached) | <200ms |

---

## Testing the Integration

```bash
# 1. Query for security pattern
npm run kb:query -- "protected endpoint Lucia session"

# Should return:
# - Lucia session auth contract (session validation)
# - REST route structure (auth check pattern)
# - Protected endpoint examples

# 2. Query for validation pattern
npm run kb:query -- "Zod schema validation error shape"

# Should return:
# - REST route structure (validation section)
# - Zod schema examples
# - Error response format

# 3. Query for operational pattern
npm run kb:query -- "Redis rate limit key format TTL"

# Should return:
# - REST route structure (rate limiting section)
# - Redis caching patterns (key design)
# - Rate limit headers

# 4. Test Phase 79 integration
npm run phase79:engine

# Phase 79 should now:
# - Retrieve structured patterns for security queries
# - Include minimum coverage (security + validation + operational)
# - Generate code following Pattern Suite templates
# - Link KB chunks used in reasoning
```

---

**Status**: ✅ Foundation complete with 2 comprehensive Pattern Suite documents
**Next**: Complete remaining 6 documents + route map generator
**Ready for**: Phase 79 testing with structured API knowledge

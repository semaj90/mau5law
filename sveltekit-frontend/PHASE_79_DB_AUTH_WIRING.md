# Phase 79: Database & Auth Wiring - Complete Guide

## 🎯 Objective
Ensure ALL components, pages, layouts, and API endpoints are:
1. ✅ Connected to `legal_ai_db` (via `DATABASE_URL`)
2. ✅ Using Lucia v3 session authentication
3. ✅ Following security patterns from knowledge base (1091 policies)

---

## 📊 Current Status

### Route Analysis (113 total routes)
- **Compliant**: 6/113 (5.3%)
- **Need Auth Wiring**: 26 routes
- **Need DB Wiring**: 28 routes
- **Need Validation**: 47 routes

### Database Configuration ✅
- **Database**: `legal_ai_db`
- **Connection**: `postgresql://legal_admin:123456@localhost:5432/legal_ai_db`
- **ORM**: Drizzle
- **File**: `src/lib/server/db/index.ts` (UPDATED)

### Authentication ✅
- **System**: Lucia v3
- **Adapter**: DrizzlePostgreSQLAdapter
- **Cookie**: `auth_session`
- **File**: `src/lib/server/lucia.ts`
- **Hooks**: `src/hooks.server.ts`

---

## 🔧 Implementation Patterns

### 1. Protected Page (Server Load)
**File**: `src/routes/(app)/*/+page.server.ts`

```typescript
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // 1. Lucia v3 Authentication Check
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // 2. Database Query (legal_ai_db)
  const data = await db.query.yourTable.findMany({
    where: eq(yourTable.userId, locals.user.id)
  });

  return {
    user: locals.user,
    data
  };
};
```

### 2. Protected API Endpoint
**File**: `src/routes/api/*/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { z } from 'zod';
import type { RequestHandler } from './$types';

// Input validation schema
const Schema = z.object({
  field: z.string()
});

export const POST: RequestHandler = async ({ locals, request }) => {
  // 1. Authentication Check
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validation (Zod)
  const body = await request.json();
  const result = Schema.safeParse(body);

  if (!result.success) {
    return json({
      error: 'Validation Failed',
      details: result.error.flatten()
    }, { status: 400 });
  }

  // 3. Database Operation (legal_ai_db)
  const data = await db.insert(yourTable).values({
    userId: locals.user.id,
    ...result.data
  }).returning();

  return json({ success: true, data });
};
```

### 3. Layout Server (Session Propagation)
**File**: `src/routes/(app)/+layout.server.ts`

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Propagate user session to all child routes
  return {
    user: locals.user,
    session: locals.session
  };
};
```

---

## 🚀 Quick Start Commands

### 1. Activate Phase 79 Environment
```powershell
Copy-Item .env.phase79 .env -Force
```

### 2. Validate All Routes
```powershell
node scripts/validate-db-auth-wiring.mjs
```

### 3. Check Database Connection
```powershell
node -e "import('$lib/server/db').then(({DB_CONNECTION_STRING}) => console.log('DB:', DB_CONNECTION_STRING))"
```

### 4. Verify Lucia v3 Setup
```powershell
node scripts/test-lucia-auth.mjs
```

---

## 📋 Routes Requiring Immediate Attention

### High Priority (User-Facing Pages)
1. `/cases` → Add auth check + DB query
2. `/cases/:id` → Add auth check + DB query
3. `/evidence` → Add auth check + DB query
4. `/chat/:id` → Add auth check + DB query
5. `/dashboard` → Add auth check + DB query

### Medium Priority (API Endpoints)
1. `/api/cases` → Add auth + validation + DB
2. `/api/evidence` → Add auth + validation + DB
3. `/api/chat` → Add auth + validation + DB
4. `/api/analysis` → Add auth + validation + DB

### Low Priority (Admin/Debug)
1. `/api/auth/debug` → Add DB logging
2. `/api/auth/session` → Add DB session lookup

---

## 🔍 Validation Checklist

For each route, verify:

- [ ] **Authentication**: `locals.user` checked (if protected)
- [ ] **Database**: `import { db } from '$lib/server/db'` present
- [ ] **Validation**: Zod schemas for input (if endpoint)
- [ ] **Redirect**: `throw redirect(302, '/login')` on auth fail
- [ ] **Error Handling**: Try/catch with proper error responses
- [ ] **TypeScript**: Correct types from `./$types`

---

## 🎯 Success Metrics

### Target: 100% Compliant Routes
- **Current**: 6/113 (5.3%)
- **Goal**: 113/113 (100%)

### Compliance Requirements
1. Protected routes MUST check `locals.user`
2. All DB queries MUST use `legal_ai_db` connection
3. All endpoints MUST validate input with Zod
4. All errors MUST be logged to database

---

## 🛠️ Automated Fixes

### Run Auto-Fixer (When Available)
```powershell
node scripts/apply-db-auth-fixes.mjs
```

This will:
1. Add missing auth checks to protected routes
2. Add missing DB imports
3. Add Zod validation schemas to endpoints
4. Update type imports

---

## 📚 Knowledge Base References

The validation uses policies from the Phase 79 knowledge base:

- `protected-endpoints.md` → Auth patterns
- `zod-validation.md` → Input validation
- `lucia-session-auth-contract.md` → Session handling
- `sveltekit-rest-route-structure.md` → Route conventions

Total: **1091 indexed policies** available for context.

---

## 🎉 Completion Criteria

All routes must:
1. ✅ Connect to `legal_ai_db`
2. ✅ Use Lucia v3 authentication (where required)
3. ✅ Validate inputs with Zod (endpoints)
4. ✅ Follow security patterns from knowledge base
5. ✅ Pass `validate-db-auth-wiring.mjs` check

**Target**: 113/113 compliant routes (100%)

# Phase 80: Production Database & Validation - Completion Guide

**Status:** 🔄 75% Complete (3/4 milestones)

## ✅ Completed Infrastructure

### 1. Database Schema (100% ✅)
- **File:** `src/lib/server/db/schema-chat.ts`
- **Tables Created:**
  - `chat_messages`: Persistent chat history (id, chatId, userId, role, content, timestamp, migratedFrom, metadata)
  - `chat_metadata`: Chat-level data (chatId, userId, title, messageCount, lastMessageAt)
- **Indexes:** chatId, userId, timestamp, migratedFrom
- **Integration:** Exported from `schema.ts` for use across app

### 2. Migration Implementation (100% ✅)
- **File:** `src/routes/api/chat/migrate/+server.ts`
- **Features:**
  - Actual database inserts (no TODO placeholders)
  - Creates/updates chat metadata
  - Returns `{ migratedCount, messageIds, chatCount }`
  - Error handling and logging
- **Status:** Production-ready

### 3. Validation Library (100% ✅)
- **File:** `src/lib/validation/schemas.ts` (2100+ lines)
- **Schemas Available:**
  - **Pagination:** `paginationSchema`, `paginatedResponseSchema()`
  - **Cases:** `createCaseSchema`, `updateCaseSchema`, `caseIdSchema`
  - **Evidence:** `createEvidenceSchema`, `updateEvidenceSchema`, `evidenceTypeEnum`
  - **Chat:** `chatMessageSchema`, `chatMigrationSchema`, `chatMetadataSchema`
  - **Auth:** `loginSchema`, `registerSchema`, `passwordResetSchema`
  - **Documents:** `documentUploadSchema`, `documentMetadataSchema`
  - **RAG:** `ragQuerySchema`, `vectorSearchSchema`, `knowledgeBaseQuerySchema`
  - **Analytics:** `analyticsQuerySchema`, `reportGenerationSchema`
- **Utilities:**
  - `validateSchema(schema, data)` - Generic validation helper
  - `formatValidationErrors(error)` - Zod error formatter
  - Type-safe response builders

### 4. Validation Application (0% ⏳)
- **Target:** 47 API endpoints
- **Script Created:** `scripts/apply-api-validation.mjs`
- **Status:** Manual implementation recommended

---

## 🚀 Next Steps: Apply Validation to API Endpoints

### Prerequisites
1. **Database Migration**
   ```bash
   cd sveltekit-frontend
   npx drizzle-kit push:pg
   ```

   **Verify Tables:**
   ```sql
   -- Connect to legal_ai_db
   \c legal_ai_db
   \dt chat*
   -- Should show: chat_messages, chat_metadata
   ```

2. **Test Migration Endpoint**
   ```bash
   # Start dev server
   npm run dev

   # Test migration (in another terminal)
   curl -X POST http://localhost:5175/api/chat/migrate \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"test"}],"chatId":"test-123"}'
   ```

### Validation Application Strategy

#### 🎯 Priority 1: Core Chat Routes (5 endpoints)
```typescript
// Example: POST /api/chat/+server.ts
import { chatMessageSchema, formatValidationErrors } from '$lib/validation/schemas';
import { error } from '@sveltejs/kit';

export async function POST({ request }) {
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = chatMessageSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, {
			message: 'Validation failed',
			errors: formatValidationErrors(validation.error)
		});
	}

	const { message, chatId, sessionId } = validation.data;
	// ... rest of handler
}
```

**Files to Update:**
- ✅ `/api/chat/migrate/+server.ts` (already validated)
- ⏳ `/api/chat/+server.ts`
- ⏳ `/api/chat/[id]/+server.ts`
- ⏳ `/api/chat/history/+server.ts`
- ⏳ `/api/chat/export/+server.ts`

#### 🎯 Priority 2: Case Management (12 endpoints)
**Schema:** `createCaseSchema`, `updateCaseSchema`, `caseIdSchema`

**Files:**
- `/api/cases/+server.ts` (POST, GET)
- `/api/cases/[id]/+server.ts` (GET, PUT, DELETE)
- `/api/cases/[id]/evidence/+server.ts` (POST, GET)
- `/api/cases/[id]/timeline/+server.ts` (GET)
- `/api/cases/[id]/summary/+server.ts` (GET)
- `/api/cases/search/+server.ts` (POST)
- `/api/cases/export/+server.ts` (POST)

#### 🎯 Priority 3: Evidence Management (8 endpoints)
**Schema:** `createEvidenceSchema`, `updateEvidenceSchema`

**Files:**
- `/api/evidence/+server.ts` (POST, GET)
- `/api/evidence/[id]/+server.ts` (GET, PUT, DELETE)
- `/api/evidence/[id]/analysis/+server.ts` (POST)
- `/api/evidence/upload/+server.ts` (POST)
- `/api/evidence/batch/+server.ts` (POST)

#### 🎯 Priority 4: Document Processing (10 endpoints)
**Schema:** `documentUploadSchema`, `documentMetadataSchema`

**Files:**
- `/api/documents/upload/+server.ts`
- `/api/documents/[id]/+server.ts`
- `/api/documents/[id]/extract/+server.ts`
- `/api/documents/[id]/analyze/+server.ts`
- `/api/documents/batch/+server.ts`
- `/api/documents/search/+server.ts`
- `/api/documents/ocr/+server.ts`
- `/api/documents/export/+server.ts`

#### 🎯 Priority 5: RAG & Knowledge (8 endpoints)
**Schema:** `ragQuerySchema`, `vectorSearchSchema`, `knowledgeBaseQuerySchema`

**Files:**
- `/api/rag/query/+server.ts`
- `/api/rag/embed/+server.ts`
- `/api/rag/search/+server.ts`
- `/api/knowledge/search/+server.ts`
- `/api/knowledge/add/+server.ts`
- `/api/knowledge/update/+server.ts`
- `/api/knowledge/delete/+server.ts`
- `/api/knowledge/batch/+server.ts`

#### 🎯 Priority 6: Auth & User Management (4 endpoints)
**Schema:** `loginSchema`, `registerSchema`, `passwordResetSchema`

**Files:**
- `/api/auth/login/+server.ts`
- `/api/auth/register/+server.ts`
- `/api/auth/reset-password/+server.ts`
- `/api/auth/verify-email/+server.ts`

---

## 📋 Validation Checklist Template

For each endpoint:

```typescript
// ✅ 1. Import schema and utilities
import { yourSchema, formatValidationErrors } from '$lib/validation/schemas';
import { error } from '@sveltejs/kit';

// ✅ 2. Add validation before DB operations
export async function POST({ request, locals }) {
	// Parse JSON safely
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	// Validate with Zod
	const validation = yourSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, {
			message: 'Validation failed',
			errors: formatValidationErrors(validation.error)
		});
	}

	// ✅ 3. Use validated data
	const validatedData = validation.data;

	// ✅ 4. Proceed with DB operations
	// Use validatedData instead of raw body
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests for Schemas
```typescript
// src/lib/validation/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { chatMessageSchema, createCaseSchema } from '../schemas';

describe('Chat Message Schema', () => {
	it('validates correct message', () => {
		const result = chatMessageSchema.safeParse({
			message: 'Hello',
			chatId: 'chat-123',
			sessionId: 'session-456'
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty message', () => {
		const result = chatMessageSchema.safeParse({
			message: '',
			chatId: 'chat-123'
		});
		expect(result.success).toBe(false);
	});
});
```

### 2. Integration Tests for Endpoints
```typescript
// tests/api/chat.spec.ts
import { test, expect } from '@playwright/test';

test('POST /api/chat validates input', async ({ request }) => {
	// Valid request
	const response = await request.post('/api/chat', {
		data: {
			message: 'Test message',
			chatId: 'chat-123'
		}
	});
	expect(response.status()).toBe(200);

	// Invalid request (missing message)
	const invalid = await request.post('/api/chat', {
		data: { chatId: 'chat-123' }
	});
	expect(invalid.status()).toBe(400);
	const body = await invalid.json();
	expect(body.errors).toBeDefined();
});
```

### 3. End-to-End Flow Test
```typescript
// tests/e2e/chat-migration.spec.ts
test('anonymous chat migration flow', async ({ page }) => {
	// 1. Use chat anonymously
	await page.goto('/chat');
	await page.fill('textarea', 'Test message');
	await page.click('button:has-text("Send")');

	// 2. Login
	await page.click('text=Login to save your chat');
	await page.fill('[name=email]', 'test@example.com');
	await page.fill('[name=password]', 'password123');
	await page.click('button:has-text("Login")');

	// 3. Verify migration
	await page.waitForSelector('text=Chat saved!');

	// 4. Check database
	// (use API test helper to verify DB contains message)
});
```

---

## 📊 Progress Tracking

### Current Status
```
Total Endpoints: 47
├─ ✅ Validated: 1 (2.1%)
│  └─ /api/chat/migrate
├─ 🔄 In Progress: 0
└─ ⏳ Remaining: 46 (97.9%)
   ├─ Chat: 4
   ├─ Cases: 12
   ├─ Evidence: 8
   ├─ Documents: 10
   ├─ RAG/Knowledge: 8
   └─ Auth: 4
```

### Update Command
```bash
node scripts/apply-api-validation.mjs        # Check current state
node scripts/apply-api-validation.mjs --apply  # Auto-apply (where possible)
```

---

## 🎯 Success Criteria

### Phase 80 Complete When:
- [x] Database schema created and migrated
- [x] Migration endpoint implements actual DB operations
- [x] Comprehensive validation library created
- [ ] All 47 API endpoints use Zod validation
- [ ] Unit tests cover all schemas (80%+ coverage)
- [ ] Integration tests cover critical flows
- [ ] Documentation updated with validation patterns

### Quality Gates:
1. **No raw `request.json()` usage** - Always validate first
2. **Consistent error format** - Use `formatValidationErrors()`
3. **Type safety** - Use validated data types (e.g., `validation.data`)
4. **400 responses** - All validation failures return proper error structure
5. **Test coverage** - Each schema has unit tests

---

## 📚 Reference Examples

### Example 1: Simple POST Validation
```typescript
// /api/cases/+server.ts
import { createCaseSchema, formatValidationErrors } from '$lib/validation/schemas';
import { error, json } from '@sveltejs/kit';
import { db, cases } from '$lib/server/db/schema';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) throw error(401, 'Unauthorized');

	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = createCaseSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, {
			message: 'Validation failed',
			errors: formatValidationErrors(validation.error)
		});
	}

	const { title, description, caseType } = validation.data;

	const [newCase] = await db.insert(cases).values({
		userId: session.user.userId,
		title,
		description,
		caseType
	}).returning();

	return json({ case: newCase });
}
```

### Example 2: Pagination with Validation
```typescript
// /api/cases/search/+server.ts
import { paginationSchema, formatValidationErrors } from '$lib/validation/schemas';
import { error, json } from '@sveltejs/kit';
import { db, cases } from '$lib/server/db/schema';

export async function GET({ url, locals }) {
	const session = await locals.auth();
	if (!session?.user) throw error(401, 'Unauthorized');

	const params = Object.fromEntries(url.searchParams);
	const validation = paginationSchema.safeParse(params);

	if (!validation.success) {
		throw error(400, {
			message: 'Invalid pagination',
			errors: formatValidationErrors(validation.error)
		});
	}

	const { page, pageSize, sortBy, sortOrder } = validation.data;
	const offset = (page - 1) * pageSize;

	const results = await db.select()
		.from(cases)
		.where(eq(cases.userId, session.user.userId))
		.limit(pageSize)
		.offset(offset)
		.orderBy(sortOrder === 'asc' ? asc(cases[sortBy]) : desc(cases[sortBy]));

	const [{ count }] = await db.select({ count: sql`count(*)` })
		.from(cases)
		.where(eq(cases.userId, session.user.userId));

	return json({
		data: results,
		meta: {
			page,
			pageSize,
			total: count,
			totalPages: Math.ceil(count / pageSize)
		}
	});
}
```

### Example 3: File Upload with Validation
```typescript
// /api/documents/upload/+server.ts
import { documentUploadSchema, formatValidationErrors } from '$lib/validation/schemas';
import { error, json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file');
	const caseId = formData.get('caseId');
	const description = formData.get('description');

	const validation = documentUploadSchema.safeParse({
		file,
		caseId,
		description
	});

	if (!validation.success) {
		throw error(400, {
			message: 'Invalid upload data',
			errors: formatValidationErrors(validation.error)
		});
	}

	const validatedData = validation.data;
	// Proceed with file upload...
}
```

---

## 🔗 Related Documentation
- **Schema Reference:** `src/lib/validation/schemas.ts`
- **Database Schema:** `src/lib/server/db/schema-chat.ts`
- **Migration Guide:** `PHASE_79_80_MIGRATION.md`
- **Auth Guide:** `src/lib/services/anonymous-session-manager.ts` (docstring)

---

## 📞 Support

If you encounter issues:
1. Check schema definitions in `schemas.ts`
2. Verify database connection in `.env`
3. Test validation in isolation:
   ```typescript
   import { yourSchema } from '$lib/validation/schemas';
   console.log(yourSchema.safeParse(testData));
   ```
4. Review error messages from `formatValidationErrors()`

---

**Last Updated:** Phase 80 Completion
**Next Review:** After all 47 endpoints validated

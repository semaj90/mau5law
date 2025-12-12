# Next Steps: Task 2.5 or Task 2.3

**Date**: December 11, 2025
**Current Status**: Task 2.6 ✅ Complete
**Spec**: `evidence-crud-rag-integration`

---

## 🎯 Choose Your Next Task

### ⭐ RECOMMENDED: Task 2.5 - RAG Index Sync Service

**Why This First**:
- Completes the RAG pipeline end-to-end
- Enables automatic index updates when evidence changes
- Foundation for tag-based search to work properly
- Smaller scope (2-3 hours)

**What to Build**:
Create `sveltekit-frontend/src/lib/server/rag-sync.ts` with:

1. **`addEvidenceToRagIndex()`**
   - Takes evidence file metadata
   - Chunks the document
   - Generates embeddings
   - Stores in Qdrant with tags metadata

2. **`updateRagIndexTags()`**
   - Takes evidence ID and new tags
   - Updates Qdrant point payload
   - Recalculates tag weights

3. **`removeEvidenceFromRagIndex()`**
   - Takes evidence ID
   - Deletes all chunks from Qdrant

4. **`regenerateEvidenceEmbeddings()`**
   - Takes evidence ID
   - Re-chunks document
   - Regenerates embeddings
   - Updates Qdrant

**Files to Create**:
```
sveltekit-frontend/src/lib/server/rag-sync.ts
```

**Files to Update**:
```
sveltekit-frontend/src/routes/api/yorha/evidence/nodes/+server.ts (when created)
sveltekit-frontend/src/routes/api/yorha/evidence/nodes/[id]/+server.ts (when created)
```

**Requirements Covered**: 7.1, 7.2, 7.3, 7.4, 7.5

---

### Alternative: Task 2.3 - Evidence CRUD Routes

**Why This**:
- Enables evidence management UI
- Required for testing RAG sync
- Larger scope (3-4 hours)

**What to Build**:

#### File 1: `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/+server.ts`

**GET Handler**:
```typescript
export async function GET({ url }) {
  // Parse query params: page, limit, jurisdiction, file_type, processing_status
  // Query evidence_files table with filters
  // Return paginated results
}
```

**POST Handler**:
```typescript
export async function POST({ request }) {
  // Parse multipart/form-data
  // Validate file (type, size)
  // Upload to MinIO
  // Create evidence_files record
  // Trigger RAG index sync (Task 2.5)
  // Return evidence ID
}
```

#### File 2: `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/[id]/+server.ts`

**PATCH Handler**:
```typescript
export async function PATCH({ params, request }) {
  // Parse evidence ID from params
  // Parse update fields from body
  // Validate changes
  // Update evidence_files record
  // If tags changed, trigger RAG index update (Task 2.5)
  // Log audit trail
  // Return updated evidence
}
```

**DELETE Handler**:
```typescript
export async function DELETE({ params }) {
  // Parse evidence ID from params
  // Delete from MinIO
  // Delete evidence_files record
  // Trigger RAG index removal (Task 2.5)
  // Log audit trail
  // Return success
}
```

**Requirements Covered**: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3

---

## 📋 Implementation Checklist

### For Task 2.5 (RAG Index Sync)

- [ ] Create `sveltekit-frontend/src/lib/server/rag-sync.ts`
- [ ] Implement `addEvidenceToRagIndex(evidenceId, metadata)`
- [ ] Implement `updateRagIndexTags(evidenceId, tags)`
- [ ] Implement `removeEvidenceFromRagIndex(evidenceId)`
- [ ] Implement `regenerateEvidenceEmbeddings(evidenceId)`
- [ ] Add comprehensive logging
- [ ] Add error handling
- [ ] Test with Qdrant collection
- [ ] Update tasks.md to mark complete

### For Task 2.3 (Evidence CRUD)

- [ ] Create `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/+server.ts`
- [ ] Implement GET handler (list with pagination)
- [ ] Implement POST handler (create with file upload)
- [ ] Create `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/[id]/+server.ts`
- [ ] Implement PATCH handler (update metadata)
- [ ] Implement DELETE handler (remove evidence)
- [ ] Add validation for all inputs
- [ ] Add audit logging
- [ ] Test all CRUD operations
- [ ] Update tasks.md to mark complete

---

## 🧪 Testing Strategy

### For Task 2.5

**Test 1: Add Evidence to Index**
```typescript
const result = await addEvidenceToRagIndex('evidence-123', {
  fileName: 'test.pdf',
  caseId: 'case-123',
  jurisdiction: 'CA',
  tags: ['child-abuse', 'statute-273']
});
// Verify chunks added to Qdrant
```

**Test 2: Update Tags**
```typescript
await updateRagIndexTags('evidence-123', ['child-abuse', 'statute-273', 'new-tag']);
// Verify Qdrant payload updated
```

**Test 3: Remove Evidence**
```typescript
await removeEvidenceFromRagIndex('evidence-123');
// Verify chunks removed from Qdrant
```

### For Task 2.3

**Test 1: Create Evidence**
```powershell
$form = @{
  file = Get-Item "test.pdf"
  jurisdiction = "CA"
  caseId = "case-123"
}
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes" `
  -Method POST -Form $form
```

**Test 2: List Evidence**
```powershell
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes?jurisdiction=CA&page=1&limit=10"
```

**Test 3: Update Evidence**
```powershell
$body = @{ tags = @("child-abuse", "statute-273") } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes/evidence-123" `
  -Method PATCH -Body $body -ContentType "application/json"
```

**Test 4: Delete Evidence**
```powershell
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes/evidence-123" `
  -Method DELETE
```

---

## 📚 Reference Documentation

### Spec Files
- `.kiro/specs/evidence-crud-rag-integration/requirements.md`
- `.kiro/specs/evidence-crud-rag-integration/design.md`
- `.kiro/specs/evidence-crud-rag-integration/tasks.md`

### Implementation Files
- `sveltekit-frontend/src/lib/server/rag-query.ts` (Task 2.6 - reference)
- `sveltekit-frontend/src/lib/server/embedding-service.ts` (embedding generation)
- `sveltekit-frontend/drizzle/schema.ts` (database schema)

### Session Documentation
- `PHASE_6_1_SESSION_CONTINUATION_SUMMARY.md` (this session)
- `TASK_2_6_COMPLETE.md` (Task 2.6 completion)
- `TEST_TAG_JURISDICTION_FILTERING.md` (test guide)

---

## 🚀 Quick Start Commands

### Start Development Server
```powershell
cd sveltekit-frontend
npm run dev
```

### Verify Services
```powershell
# PostgreSQL
$env:PGPASSWORD = "123456"
psql -U legal_admin -h localhost -d legal_ai_db -c "SELECT COUNT(*) FROM evidence_files;"

# Qdrant
curl http://localhost:6333/collections/phase72_evidence_embeddings

# Ollama
curl http://localhost:11434/api/tags
```

### Test Context-Chat
```powershell
$body = @{
  message = "Test RAG pipeline"
  sessionId = "test"
  userId = "test"
  tags = @("child-abuse")
  jurisdiction = "CA"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5176/api/ai/yorha/context-chat" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -TimeoutSec 180
```

---

## 💡 Decision Guide

**Choose Task 2.5 if**:
- You want to complete the RAG pipeline
- You want smaller, focused work
- You want to enable automatic index updates

**Choose Task 2.3 if**:
- You want to enable evidence management UI
- You're ready for larger scope work
- You want to test the full CRUD flow

**Recommendation**: Start with Task 2.5 to complete the RAG pipeline, then move to Task 2.3 for CRUD operations.

---

**Ready to continue!** Choose your task and start implementing. 🚀

# Quick Start: Task 2.3 - Evidence CRUD Routes

**Next Task**: Task 2.3
**Estimated Time**: 3-4 hours
**Status**: Ready to implement

---

## 🎯 Goal

Implement full CRUD operations for evidence files with automatic RAG synchronization.

---

## 📋 Files to Create

### 1. List & Create Route
**File**: `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/+server.ts`

**Handlers**: GET (list), POST (create)

### 2. Update & Delete Route
**File**: `sveltekit-frontend/src/routes/api/yorha/evidence/nodes/[id]/+server.ts`

**Handlers**: PATCH (update), DELETE (remove)

---

## 🔧 Implementation Guide

### GET Handler - List Evidence

```typescript
import { sql } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const fileType = url.searchParams.get('fileType');
  const status = url.searchParams.get('status');

  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions = [];
  if (jurisdiction) conditions.push(sql`metadata->>'jurisdiction' = ${jurisdiction}`);
  if (fileType) conditions.push(sql`file_type = ${fileType}`);
  if (status) conditions.push(sql`processing_status = ${status}`);

  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  // Query evidence
  const evidence = await sql`
    SELECT id, case_id, filename, file_size, file_type,
           processing_status, chunk_count, metadata, created_at
    FROM evidence_files
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  // Get total count
  const countResult = await sql`
    SELECT COUNT(*) as total
    FROM evidence_files
    ${whereClause}
  `;

  return json({
    evidence,
    pagination: {
      page,
      limit,
      total: parseInt(countResult[0].total),
      pages: Math.ceil(parseInt(countResult[0].total) / limit)
    }
  });
}
```

---

### POST Handler - Create Evidence

```typescript
import { sql } from '$lib/server/db';
import { addEvidenceToRagIndex } from '$lib/server/rag-sync';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const caseId = formData.get('caseId') as string;
  const jurisdiction = formData.get('jurisdiction') as string;
  const userId = formData.get('userId') as string; // From session

  // Validate
  if (!file || !caseId || !jurisdiction) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Upload to MinIO (implement this)
  const minioPath = `lawpdfs/cases/${caseId}/${file.name}`;
  // await uploadToMinio(file, minioPath);

  // Create evidence record
  const evidenceResult = await sql`
    INSERT INTO evidence_files (
      case_id, filename, file_size, file_type, minio_path,
      uploaded_by, processing_status, metadata
    ) VALUES (
      ${caseId}, ${file.name}, ${file.size}, ${file.type},
      ${minioPath}, ${userId}, 'pending',
      ${JSON.stringify({ jurisdiction })}
    )
    RETURNING id
  `;

  const evidenceId = evidenceResult[0].id;

  // Chunk document (implement this)
  // await chunkDocument(evidenceId, file);

  // Add to RAG index
  const ragResult = await addEvidenceToRagIndex(evidenceId, {
    userId,
    logAudit: true
  });

  if (!ragResult.success) {
    console.error('Failed to index evidence:', ragResult.message);
  }

  return json({ id: evidenceId, message: 'Evidence created successfully' });
}
```

---

### PATCH Handler - Update Evidence

```typescript
import { sql } from '$lib/server/db';
import { updateRagIndexTags } from '$lib/server/rag-sync';
import { json } from '@sveltejs/kit';

export async function PATCH({ params, request }) {
  const evidenceId = params.id;
  const body = await request.json();
  const { tags, metadata, userId } = body;

  // Update evidence record
  await sql`
    UPDATE evidence_files
    SET metadata = ${JSON.stringify(metadata)},
        updated_at = NOW()
    WHERE id = ${evidenceId}
  `;

  // If tags changed, update evidence_tags and RAG index
  if (tags) {
    // Delete existing tags
    await sql`
      DELETE FROM evidence_tags
      WHERE evidence_id = ${evidenceId}
    `;

    // Insert new tags
    for (const tagName of tags) {
      // Get or create tag
      const tagResult = await sql`
        INSERT INTO citation_tags (name, jurisdiction)
        VALUES (${tagName}, ${metadata.jurisdiction})
        ON CONFLICT (name, jurisdiction) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;

      // Link to evidence
      await sql`
        INSERT INTO evidence_tags (evidence_id, tag_id)
        VALUES (${evidenceId}, ${tagResult[0].id})
      `;
    }

    // Update RAG index
    const ragResult = await updateRagIndexTags(evidenceId, tags, {
      userId,
      logAudit: true
    });

    if (!ragResult.success) {
      console.error('Failed to update RAG index:', ragResult.message);
    }
  }

  return json({ message: 'Evidence updated successfully' });
}
```

---

### DELETE Handler - Remove Evidence

```typescript
import { sql } from '$lib/server/db';
import { removeEvidenceFromRagIndex } from '$lib/server/rag-sync';
import { json } from '@sveltejs/kit';

export async function DELETE({ params, request }) {
  const evidenceId = params.id;
  const body = await request.json();
  const { userId } = body;

  // Remove from RAG index first
  const ragResult = await removeEvidenceFromRagIndex(evidenceId, {
    userId,
    logAudit: true
  });

  if (!ragResult.success) {
    console.error('Failed to remove from RAG index:', ragResult.message);
  }

  // Delete from MinIO (implement this)
  // await deleteFromMinio(minioPath);

  // Delete evidence record (cascade will handle chunks, embeddings, etc.)
  await sql`
    DELETE FROM evidence_files
    WHERE id = ${evidenceId}
  `;

  return json({ message: 'Evidence deleted successfully' });
}
```

---

## 🧪 Test Commands

### Test GET (List)
```powershell
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes?jurisdiction=CA&page=1&limit=10"
```

### Test POST (Create)
```powershell
$form = @{
  file = Get-Item "test.pdf"
  caseId = "case-123"
  jurisdiction = "CA"
  userId = "user-123"
}
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes" -Method POST -Form $form
```

### Test PATCH (Update)
```powershell
$body = @{
  tags = @("child-abuse", "statute-273")
  metadata = @{ jurisdiction = "CA" }
  userId = "user-123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes/evidence-123" `
  -Method PATCH -Body $body -ContentType "application/json"
```

### Test DELETE (Remove)
```powershell
$body = @{ userId = "user-123" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5176/api/yorha/evidence/nodes/evidence-123" `
  -Method DELETE -Body $body -ContentType "application/json"
```

---

## ✅ Checklist

- [ ] Create `+server.ts` for list & create
- [ ] Implement GET handler with pagination
- [ ] Implement POST handler with file upload
- [ ] Create `[id]/+server.ts` for update & delete
- [ ] Implement PATCH handler with tag sync
- [ ] Implement DELETE handler with RAG cleanup
- [ ] Add validation for all inputs
- [ ] Add error handling
- [ ] Test all CRUD operations
- [ ] Update tasks.md to mark complete

---

## 📚 Reference

- **RAG Sync API**: `sveltekit-frontend/src/lib/server/rag-sync.ts`
- **Database Schema**: `sveltekit-frontend/drizzle/schema/evidence.ts`
- **Spec**: `.kiro/specs/evidence-crud-rag-integration/`

---

**Ready to implement!** Start with the GET handler and work your way through. 🚀

# Phase 6: Evidence Board - Ready-to-Paste Code

**Status**: Ready to implement
**Estimated Time**: 4-6 hours
**Components**: 4 files to create

---

## Overview

Phase 6 builds the Evidence Board UI using Svelte 5 + Superforms + Zod.

**Files to Create**:
1. `src/routes/evidence-board/+page.svelte` - Main page
2. `src/routes/evidence-board/+page.server.ts` - Server logic
3. `src/lib/components/EvidenceCard.svelte` - Card component
4. `src/lib/schemas/evidence.ts` - Zod schemas

---

## 1. Zod Schema

**File**: `src/lib/schemas/evidence.ts`

```typescript
import { z } from 'zod';

export const evidenceSchema = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid().optional(),
  evidence_type: z.enum(['document', 'image', 'audio', 'video', 'other']),
  file_type: z.string().min(1, 'File type required'),
  file_url: z.string().url('Invalid URL'),
  file_name: z.string().min(1, 'File name required'),
  file_size: z.number().positive('File size must be positive'),
  mime_type: z.string().min(1, 'MIME type required'),
  hash: z.string().optional(),
  tags: z.array(z.string()).default([]),
  ai_summary: z.string().optional(),
  ai_tags: z.array(z.string()).default([]),
  uploaded_by: z.string().uuid().optional(),
  uploaded_at: z.date().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.date().optional(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const evidenceUploadSchema = z.object({
  evidence_type: z.enum(['document', 'image', 'audio', 'video', 'other']),
  file: z.instanceof(File).refine((file) => file.size > 0, 'File is required'),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export type EvidenceUpload = z.infer<typeof evidenceUploadSchema>;
```

---

## 2. Evidence Card Component

**File**: `src/lib/components/EvidenceCard.svelte`

```svelte
<script lang="ts">
  import type { Evidence } from '$lib/schemas/evidence';
  import { formatDistanceToNow } from 'date-fns';

  interface Props {
    evidence: Evidence;
    onAskAI?: (evidence: Evidence) => void;
    onDelete?: (id: string) => void;
  }

  let { evidence, onAskAI, onDelete }: Props = $props();

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };
</script>

<div class="evidence-card">
  <div class="card-header">
    <div class="title-section">
      <h3>{evidence.file_name}</h3>
      <span class="evidence-type">{evidence.evidence_type}</span>
    </div>
    <div class="actions">
      {#if onAskAI}
        <button class="btn-ask-ai" onclick={() => onAskAI?.(evidence)}>
          Ask AI
        </button>
      {/if}
      {#if onDelete}
        <button class="btn-delete" onclick={() => onDelete?.(evidence.id || '')}>
          Delete
        </button>
      {/if}
    </div>
  </div>

  {#if evidence.ai_summary}
    <div class="summary">
      <h4>AI Summary</h4>
      <p>{evidence.ai_summary}</p>
    </div>
  {/if}

  <div class="metadata">
    <div class="meta-item">
      <span class="label">File Type:</span>
      <span class="value">{evidence.file_type}</span>
    </div>
    <div class="meta-item">
      <span class="label">Size:</span>
      <span class="value">{formatFileSize(evidence.file_size)}</span>
    </div>
    <div class="meta-item">
      <span class="label">Uploaded:</span>
      <span class="value">{formatDate(evidence.uploaded_at)}</span>
    </div>
  </div>

  {#if evidence.tags && evidence.tags.length > 0}
    <div class="tags">
      <h4>Tags</h4>
      <div class="tag-list">
        {#each evidence.tags as tag}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if evidence.ai_tags && evidence.ai_tags.length > 0}
    <div class="ai-tags">
      <h4>AI Tags</h4>
      <div class="tag-list">
        {#each evidence.ai_tags as tag}
          <span class="ai-tag">{tag}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if evidence.file_url}
    <div class="file-link">
      <a href={evidence.file_url} target="_blank" rel="noopener noreferrer">
        View File →
      </a>
    </div>
  {/if}
</div>

<style>
  .evidence-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s;
  }

  .evidence-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .title-section {
    flex: 1;
  }

  .title-section h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .evidence-type {
    display: inline-block;
    padding: 2px 8px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .btn-ask-ai,
  .btn-delete {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-ask-ai {
    background: #007bff;
    color: white;
  }

  .btn-ask-ai:hover {
    background: #0056b3;
  }

  .btn-delete {
    background: #dc3545;
    color: white;
  }

  .btn-delete:hover {
    background: #c82333;
  }

  .summary {
    margin-bottom: 12px;
    padding: 8px;
    background: #f9f9f9;
    border-left: 3px solid #007bff;
  }

  .summary h4 {
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .summary p {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
  }

  .metadata {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
    font-size: 12px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
  }

  .meta-item .label {
    font-weight: 600;
    color: #666;
  }

  .meta-item .value {
    color: #333;
  }

  .tags,
  .ai-tags {
    margin-bottom: 12px;
  }

  .tags h4,
  .ai-tags h4 {
    margin: 0 0 6px 0;
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag,
  .ai-tag {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  .tag {
    background: #e3f2fd;
    color: #1976d2;
  }

  .ai-tag {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  .file-link {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
  }

  .file-link a {
    color: #007bff;
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
  }

  .file-link a:hover {
    text-decoration: underline;
  }
</style>
```



---

## 3. Evidence Board Server

**File**: `src/routes/evidence-board/+page.server.ts`

```typescript
import { sql } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { evidenceUploadSchema } from '$lib/schemas/evidence';

export const load: PageServerLoad = async ({ locals }) => {
  const session = locals.session as any;
  const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';

  if (!isDevBypass && !session?.user?.id) {
    return { evidence: [], form: null };
  }

  const userId = isDevBypass ? 'dev-user-001' : session.user.id;

  try {
    // Fetch all evidence for this user
    const evidence = await sql`
      SELECT
        id, case_id, evidence_type, file_type, file_url, file_name,
        file_size, mime_type, hash, tags, ai_summary, ai_tags,
        uploaded_by, uploaded_at, created_by, created_at
      FROM evidence
      WHERE uploaded_by = ${userId} OR created_by = ${userId}
      ORDER BY created_at DESC
    `;

    const form = await superValidate(zod(evidenceUploadSchema));

    return {
      evidence: evidence || [],
      form,
    };
  } catch (err) {
    console.error('Failed to load evidence:', err);
    return {
      evidence: [],
      form: await superValidate(zod(evidenceUploadSchema)),
    };
  }
};

export const actions: Actions = {
  upload: async ({ request, locals }) => {
    const session = locals.session as any;
    const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';

    if (!isDevBypass && !session?.user?.id) {
      return fail(401, { message: 'Unauthorized' });
    }

    const userId = isDevBypass ? 'dev-user-001' : session.user.id;

    const form = await superValidate(request, zod(evidenceUploadSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      // TODO: Upload file to MinIO/storage
      // For now, just save metadata

      const evidenceId = crypto.randomUUID();
      const now = new Date();

      await sql`
        INSERT INTO evidence (
          id, evidence_type, file_type, file_url, file_name,
          file_size, mime_type, tags, uploaded_by, uploaded_at, created_by, created_at
        )
        VALUES (
          ${evidenceId}, ${form.data.evidence_type}, 'application/octet-stream',
          ${'file://' + evidenceId}, ${form.data.file.name},
          ${form.data.file.size}, ${form.data.file.type},
          ${JSON.stringify(form.data.tags)}, ${userId}, ${now}, ${userId}, ${now}
        )
      `;

      return { form, success: true, evidenceId };
    } catch (err) {
      console.error('Upload failed:', err);
      return fail(500, { form, message: 'Upload failed' });
    }
  },

  delete: async ({ request, locals }) => {
    const session = locals.session as any;
    const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';

    if (!isDevBypass && !session?.user?.id) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const evidenceId = formData.get('id') as string;

    try {
      await sql`
        DELETE FROM evidence
        WHERE id = ${evidenceId}
      `;

      return { success: true };
    } catch (err) {
      console.error('Delete failed:', err);
      return fail(500, { message: 'Delete failed' });
    }
  },

  askAI: async ({ request, locals }) => {
    const session = locals.session as any;
    const isDevBypass = process.env.DEV_BYPASS_AUTH === 'true';

    if (!isDevBypass && !session?.user?.id) {
      return fail(401, { message: 'Unauthorized' });
    }

    const userId = isDevBypass ? 'dev-user-001' : session.user.id;
    const formData = await request.formData();
    const evidenceId = formData.get('evidenceId') as string;

    try {
      // Fetch evidence
      const [evidence] = await sql`
        SELECT ai_summary, tags, ai_tags FROM evidence WHERE id = ${evidenceId}
      `;

      if (!evidence) {
        return fail(404, { message: 'Evidence not found' });
      }

      // Call context-chat API with evidence context
      const response = await fetch('http://localhost:5173/api/ai/yorha/context-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: `Analyze this evidence: ${evidence.ai_summary}`,
          evidenceIds: [evidenceId],
        }),
      });

      const result = await response.json();
      return { success: true, result };
    } catch (err) {
      console.error('Ask AI failed:', err);
      return fail(500, { message: 'Ask AI failed' });
    }
  },
};
```



---

## 4. Evidence Board Page

**File**: `src/routes/evidence-board/+page.svelte`

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod } from 'sveltekit-superforms/adapters';
  import { evidenceUploadSchema } from '$lib/schemas/evidence';
  import EvidenceCard from '$lib/components/EvidenceCard.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const form = superForm(data.form, {
    validators: zod(evidenceUploadSchema),
  });

  const { form: formData, enhance, errors } = form;

  let evidence = $state(data.evidence || []);
  let selectedFile = $state<File | null>(null);
  let tags = $state<string[]>([]);
  let tagInput = $state('');
  let loading = $state(false);
  let aiResponse = $state<any>(null);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    selectedFile = input.files?.[0] || null;
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      tags = [...tags, tagInput.trim()];
      tagInput = '';
    }
  };

  const removeTag = (tag: string) => {
    tags = tags.filter((t) => t !== tag);
  };

  const handleAskAI = async (ev: Evidence) => {
    loading = true;
    aiResponse = null;

    try {
      const formData = new FormData();
      formData.append('evidenceId', ev.id || '');

      const response = await fetch('?/askAI', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.data?.result) {
        aiResponse = result.data.result;
      }
    } catch (err) {
      console.error('Ask AI failed:', err);
    } finally {
      loading = false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this evidence?')) return;

    try {
      const formData = new FormData();
      formData.append('id', id);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        evidence = evidence.filter((e) => e.id !== id);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };
</script>

<div class="evidence-board">
  <header class="board-header">
    <h1>Evidence Board</h1>
    <p>Manage and analyze case evidence</p>
  </header>

  <div class="board-content">
    <!-- Upload Section -->
    <section class="upload-section">
      <h2>Upload Evidence</h2>

      <form method="POST" action="?/upload" use:enhance class="upload-form">
        <div class="form-group">
          <label for="file">Select File</label>
          <input
            type="file"
            id="file"
            name="file"
            onchange={handleFileSelect}
            required
          />
          {#if selectedFile}
            <p class="file-info">Selected: {selectedFile.name}</p>
          {/if}
          {#if $errors.file}
            <p class="error">{$errors.file}</p>
          {/if}
        </div>

        <div class="form-group">
          <label for="evidence_type">Evidence Type</label>
          <select id="evidence_type" name="evidence_type" bind:value={$formData.evidence_type}>
            <option value="document">Document</option>
            <option value="image">Image</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="other">Other</option>
          </select>
          {#if $errors.evidence_type}
            <p class="error">{$errors.evidence_type}</p>
          {/if}
        </div>

        <div class="form-group">
          <label for="tags">Tags</label>
          <div class="tag-input">
            <input
              type="text"
              id="tags"
              placeholder="Add tag and press Enter"
              bind:value={tagInput}
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <button type="button" onclick={addTag}>Add</button>
          </div>
          {#if tags.length > 0}
            <div class="tag-list">
              {#each tags as tag}
                <span class="tag">
                  {tag}
                  <button type="button" onclick={() => removeTag(tag)}>×</button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Evidence'}
        </button>
      </form>
    </section>

    <!-- Evidence Grid -->
    <section class="evidence-section">
      <h2>Evidence ({evidence.length})</h2>

      {#if evidence.length === 0}
        <p class="empty-state">No evidence uploaded yet</p>
      {:else}
        <div class="evidence-grid">
          {#each evidence as ev (ev.id)}
            <EvidenceCard
              {evidence: ev}
              onAskAI={() => handleAskAI(ev)}
              onDelete={() => handleDelete(ev.id || '')}
            />
          {/each}
        </div>
      {/if}
    </section>

    <!-- AI Response Section -->
    {#if aiResponse}
      <section class="ai-response-section">
        <h2>AI Analysis</h2>
        <div class="ai-response">
          <p>{aiResponse.answer}</p>
          {#if aiResponse.keywords}
            <div class="keywords">
              <h4>Keywords</h4>
              <div class="keyword-list">
                {#each aiResponse.keywords as kw}
                  <span class="keyword">{kw}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if aiResponse.suggestions}
            <div class="suggestions">
              <h4>Follow-up Questions</h4>
              <ul>
                {#each aiResponse.suggestions as sugg}
                  <li>{sugg.query}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .evidence-board {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .board-header {
    margin-bottom: 30px;
  }

  .board-header h1 {
    margin: 0 0 8px 0;
    font-size: 28px;
  }

  .board-header p {
    margin: 0;
    color: #666;
  }

  .board-content {
    display: grid;
    gap: 30px;
  }

  section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  section h2 {
    margin: 0 0 16px 0;
    font-size: 18px;
  }

  .upload-form {
    display: grid;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    margin-bottom: 6px;
    font-weight: 600;
    font-size: 14px;
  }

  .form-group input,
  .form-group select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .file-info {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
  }

  .error {
    margin-top: 4px;
    color: #dc3545;
    font-size: 12px;
  }

  .tag-input {
    display: flex;
    gap: 8px;
  }

  .tag-input input {
    flex: 1;
  }

  .tag-input button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #e3f2fd;
    border-radius: 4px;
    font-size: 12px;
  }

  .tag button {
    background: none;
    border: none;
    color: #1976d2;
    cursor: pointer;
    font-size: 16px;
    padding: 0;
  }

  .btn-primary {
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .ai-response-section {
    background: #f9f9f9;
  }

  .ai-response {
    display: grid;
    gap: 16px;
  }

  .ai-response p {
    line-height: 1.6;
  }

  .keywords,
  .suggestions {
    display: grid;
    gap: 8px;
  }

  .keywords h4,
  .suggestions h4 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .keyword-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .keyword {
    display: inline-block;
    padding: 4px 8px;
    background: #e3f2fd;
    border-radius: 4px;
    font-size: 12px;
    color: #1976d2;
  }

  .suggestions ul {
    margin: 0;
    padding-left: 20px;
  }

  .suggestions li {
    margin: 4px 0;
    font-size: 14px;
  }
</style>
```

---

## Implementation Steps

1. **Create Zod Schema**
   - Copy `evidence.ts` to `src/lib/schemas/`
   - Defines Evidence type and upload validation

2. **Create Evidence Card Component**
   - Copy `EvidenceCard.svelte` to `src/lib/components/`
   - Displays individual evidence with metadata and actions

3. **Create Evidence Board Server**
   - Copy `+page.server.ts` to `src/routes/evidence-board/`
   - Handles loading, uploading, deleting, and AI analysis

4. **Create Evidence Board Page**
   - Copy `+page.svelte` to `src/routes/evidence-board/`
   - Main UI with upload form and evidence grid

5. **Test**
   - Navigate to `http://localhost:5173/evidence-board`
   - Upload test evidence
   - Click "Ask AI" to test integration

---

## Next Steps

- [ ] Create all 4 files
- [ ] Test upload functionality
- [ ] Test "Ask AI" button
- [ ] Verify database persistence
- [ ] Add file storage (MinIO integration)
- [ ] Add Docling processing on upload
- [ ] Add keyword extraction on upload


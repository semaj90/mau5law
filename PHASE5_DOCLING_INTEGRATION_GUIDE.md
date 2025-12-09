# Phase 5: Granite-Docling Integration Guide

**Status**: Ready to Implement
**Date**: December 8, 2025
**Priority**: High
**Estimated Time**: 4-6 hours

---

## Overview

Integrate Granite-Docling-258M with MinIO image bucket and contextual chat to enable:
- OCR + layout-aware text extraction from images/PDFs
- Keyword extraction from extracted text
- Multimodal embeddings (text + image)
- Enhanced contextual chat with document analysis
- Evidence Board integration with image references

---

## Current State

✅ **Already Installed**:
- `docling`, `docling-ibm-models`, `docling-parse`
- `rapidocr`, `pypdfium2`
- YOLO doc layout model: `sveltekit-frontend/models/yolo-doc.onnx`
- Python environment configured

✅ **Already Implemented** (Task 3):
- MinIO client with `uploadChatImage()` function
- Keyword extractor with Ollama + fallback
- Enhanced contextual chat with suggestions
- Terminal page server with file processing

⏳ **To Implement** (Phase 5):
- `docling.ts` helper for document analysis
- `python/docling_analyze.py` Python bridge
- Terminal upload handler wiring
- Context chat enrichment with Docling results
- Evidence Board UI integration

---

## Step 1: Create docling.ts Helper

**File**: `sveltekit-frontend/src/lib/server/docling.ts`

```typescript
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { writeFile, readFile, unlink } from 'node:fs/promises';

export type DoclingBlock = {
  type: 'paragraph' | 'heading' | 'table' | 'list' | 'equation';
  text: string;
  page: number;
  bbox?: [number, number, number, number];
};

export type DoclingResult = {
  fullText: string;
  blocks: DoclingBlock[];
};

type AnalyzeArgs = {
  fileBuffer: Buffer;
  mimeType: string;
};

export async function analyzeDocumentWithDocling(
  args: AnalyzeArgs
): Promise<DoclingResult> {
  const { fileBuffer, mimeType } = args;
  const id = randomUUID();

  const tmpInput = join(tmpdir(), `docling-${id}`);
  const tmpOutput = join(tmpdir(), `docling-${id}.json`);

  await writeFile(tmpInput, fileBuffer);

  // Python helper script that wraps DocumentConverter+Granite-Docling
  const pyScript = join(process.cwd(), 'python', 'docling_analyze.py');

  const result = await new Promise<DoclingResult>((resolve, reject) => {
    const proc = spawn('python', [pyScript, tmpInput, tmpOutput, mimeType], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', async (code) => {
      try {
        if (code !== 0) {
          return reject(
            new Error(`Docling exited with ${code}: ${stderr || 'no stderr'}`)
          );
        }
        const raw = await readFile(tmpOutput, 'utf8');
        const parsed = JSON.parse(raw) as DoclingResult;
        resolve(parsed);
      } catch (err) {
        reject(err);
      } finally {
        // best-effort cleanup
        unlink(tmpInput).catch(() => {});
        unlink(tmpOutput).catch(() => {});
      }
    });
  });

  return result;
}
```

---

## Step 2: Create Python Bridge

**File**: `python/docling_analyze.py`

```python
import sys
import json
from docling.document_converter import DocumentConverter
from docling.models import DoclingModel

def main():
    if len(sys.argv) < 4:
        print("Usage: docling_analyze.py input_path output_path mime_type", file=sys.stderr)
        sys.exit(1)

    input_path, output_path, mime_type = sys.argv[1:4]

    converter = DocumentConverter(
        model=DoclingModel.from_pretrained("ibm-granite/granite-docling-258M")
    )

    doc = converter.convert(input_path)

    blocks = []
    full_text_parts = []

    for page_idx, page in enumerate(doc.pages):
        for block in page.blocks:
            text = block.to_text().strip()
            if not text:
                continue
            full_text_parts.append(text)
            blocks.append({
                "type": str(block.category.name).lower(),
                "text": text,
                "page": page_idx + 1,
                "bbox": getattr(block, "bbox", None),
            })

    result = {
        "fullText": "\n\n".join(full_text_parts),
        "blocks": blocks,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

if __name__ == "__main__":
    main()
```

---

## Step 3: Extend MinIO Client

**File**: `sveltekit-frontend/src/lib/server/minio-client.ts`

Add to existing file (already has `uploadChatImage`):

```typescript
/**
 * Get presigned URL for chat image (for Evidence Board display)
 */
export async function getChatImageUrl(objectName: string): Promise<string> {
  const client = getMinioClient();
  try {
    const url = await client.presignedGetObject(
      AI_CHAT_IMAGES_BUCKET,
      objectName,
      24 * 60 * 60 // 24 hours
    );
    return url;
  } catch (err) {
    console.error('Failed to get presigned URL:', err);
    return `minio://${AI_CHAT_IMAGES_BUCKET}/${objectName}`;
  }
}
```

---

## Step 4: Update Terminal Upload Handler

**File**: `sveltekit-frontend/src/routes/terminal/+page.server.ts`

Update the chat action to use Docling:

```typescript
import { analyzeDocumentWithDocling } from '$lib/server/docling';

// In the chat action, replace the processDocument call with:

try {
  const result = await analyzeDocumentWithDocling({
    fileBuffer,
    mimeType: file.type
  });

  // Extract keywords from Docling output
  let keywords: string[] = [];
  let keyPhrases: string[] = [];
  try {
    const keywordResult = await extractKeywords(result.fullText, 'evidence');
    keywords = keywordResult.keywords;
    keyPhrases = keywordResult.keyPhrases;
  } catch (err) {
    console.warn('Keyword extraction failed:', err);
  }

  processedFiles.push({
    filename: file.name,
    text: result.fullText,
    method: 'docling',
    engines: ['granite-docling-258m', 'yolo', 'rapidocr'],
    metadata: {
      blocks: result.blocks,
      blockCount: result.blocks.length
    },
    keywords,
    keyPhrases
  });

  console.log(`Processed ${file.name} with Docling: ${result.blocks.length} blocks`);

  // If it's an image, also store in ai_chat_images bucket
  if (isImage) {
    try {
      const imageRes = await uploadChatImage({
        caseId: validCaseId,
        chatTurnId,
        file
      });
      chatImages.push(imageRes);
      console.log(`Chat image stored: ${imageRes.objectName}`);
    } catch (imgErr) {
      console.warn('Failed to store chat image:', imgErr);
    }
  }
} catch (error) {
  console.error(`Docling processing failed for ${file.name}:`, error);
  // Fallback to basic upload
  // ... existing fallback code
}
```

---

## Step 5: Enhance Context Chat

**File**: `sveltekit-frontend/src/routes/api/ai/yorha/context-chat/+server.ts`

Add helper function and enhance response:

```typescript
import { extractKeywordsFromText } from '$lib/server/keyword-extractor';

function buildSuggestionsFromKeywords(
  keywords: string[],
  keyPhrases: string[]
): string[] {
  const base = [...keywords.slice(0, 3), ...keyPhrases.slice(0, 2)];
  const unique = [...new Set(base)];
  return unique.map((k) => `Show me more evidence about: ${k}`);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { message, caseId, evidenceImages } = await request.json();

  const trimmed = String(message ?? '').trim();
  if (!trimmed) {
    return json({ error: 'Empty message' }, { status: 400 });
  }

  // 1) Keywords from user question
  const kw = await extractKeywordsFromText(trimmed);

  // 2) Retrieve relevant artifacts for this case
  const artifacts = await findRelevantArtifacts({
    caseId,
    keywords: kw.keywords
  });

  const contextText = artifacts.map((a) => a.textSnippet).join('\n\n');

  // 3) Ask Gemma-3 legal using RAG context
  const llmResult = await callGemma3Legal({
    question: trimmed,
    context: contextText
  });

  const suggestions = buildSuggestionsFromKeywords(
    kw.keywords,
    kw.keyPhrases
  );

  return json({
    answer: llmResult.answer,
    keywords: kw.keywords,
    keyPhrases: kw.keyPhrases,
    suggestions,
    citations: artifacts.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      imageUrl: a.imageUrl // NEW: from MinIO
    })),
    latencyMs: llmResult.latencyMs
  });
};
```

---

## Step 6: Optional Database Schema

**File**: `sveltekit-frontend/drizzle/20251209_add_docling_to_artifacts.sql`

Non-breaking migration to persist Docling results:

```sql
-- Add Docling metadata to artifacts table
ALTER TABLE contextual_artifacts
  ADD COLUMN IF NOT EXISTS docling_blocks jsonb,
  ADD COLUMN IF NOT EXISTS keywords text[],
  ADD COLUMN IF NOT EXISTS key_phrases text[],
  ADD COLUMN IF NOT EXISTS image_bucket text,
  ADD COLUMN IF NOT EXISTS image_key text;

-- Create index for keyword search
CREATE INDEX IF NOT EXISTS idx_artifacts_keywords
  ON contextual_artifacts USING gin(keywords);
```

---

## Step 7: Evidence Board Integration

**Update Evidence Card Type**:

```typescript
type EvidenceItem = {
  id: string;
  title: string;
  type: 'video' | 'document' | 'photo' | 'note';
  summary: string;
  x: number;
  y: number;
  // NEW: Docling + MinIO fields
  imageBucket?: string;
  imageKey?: string;
  imageUrl?: string;
  keywords?: string[];
  keyPhrases?: string[];
  doclingBlocks?: any[];
};
```

**Add "Ask AI" Button to Evidence Card**:

```svelte
<button
  class="text-[10px] font-mono uppercase border px-2 py-0.5"
  on:click={() => askAiAboutEvidence(item)}
>
  ask ai
</button>

<script>
  async function askAiAboutEvidence(item: EvidenceItem) {
    const res = await fetch('/api/ai/yorha/context-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `Analyze this evidence in context of the case.`,
        caseId: $page.params.caseId,
        evidenceId: item.id,
        evidenceText: item.summary,
        evidenceImages: item.imageKey
          ? [{ bucket: item.imageBucket, key: item.imageKey }]
          : []
      })
    });

    const data = await res.json();
    // Show data.answer + data.keywords + data.suggestions in AI panel
    showAiAnalysis(data);
  }
</script>
```

---

## Implementation Checklist

### Phase 5a: Core Docling Integration
- [ ] Create `sveltekit-frontend/src/lib/server/docling.ts`
- [ ] Create `python/docling_analyze.py`
- [ ] Test Docling analysis with sample PDF/image
- [ ] Verify YOLO model loads correctly
- [ ] Verify Granite-Docling model downloads

### Phase 5b: Terminal Upload Wiring
- [ ] Update terminal page server to use `analyzeDocumentWithDocling`
- [ ] Test image upload → MinIO storage
- [ ] Test document processing → text extraction
- [ ] Test keyword extraction from Docling output
- [ ] Verify chat images stored in `ai_chat_images` bucket

### Phase 5c: Context Chat Enhancement
- [ ] Update context-chat endpoint with keyword extraction
- [ ] Add suggestion generation
- [ ] Test full chat flow with uploaded documents
- [ ] Verify keywords passed to LLM context
- [ ] Verify suggestions displayed in UI

### Phase 5d: Evidence Board Integration
- [ ] Update Evidence Card type with image/keyword fields
- [ ] Add "Ask AI" button to evidence cards
- [ ] Wire button to context-chat endpoint
- [ ] Test Evidence Board → AI Chat flow
- [ ] Verify image references work

### Phase 5e: Database (Optional)
- [ ] Create migration for Docling metadata
- [ ] Update artifact save logic
- [ ] Test persistence of keywords/images
- [ ] Verify search by keywords works

---

## Testing Strategy

### Unit Tests
```typescript
// Test Docling analysis
test('analyzeDocumentWithDocling extracts text', async () => {
  const buffer = await readFile('test.pdf');
  const result = await analyzeDocumentWithDocling({
    fileBuffer: buffer,
    mimeType: 'application/pdf'
  });
  expect(result.fullText).toBeTruthy();
  expect(result.blocks.length).toBeGreaterThan(0);
});

// Test keyword extraction from Docling output
test('keywords extracted from Docling text', async () => {
  const result = await extractKeywords('contract with liability clause');
  expect(result.keywords).toContain('contract');
});
```

### Integration Tests
```typescript
// Test full upload flow
test('upload image → Docling → keywords → chat', async () => {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('message', 'Analyze this');

  const response = await actions.chat({ request: { formData } });

  expect(response.success).toBe(true);
  expect(response.keywords).toBeDefined();
  expect(response.chatImages).toBeDefined();
});
```

### Manual Testing
1. Upload PDF → verify text extracted correctly
2. Upload image → verify OCR works
3. Check keywords extracted from Docling output
4. Verify chat response includes keywords
5. Test Evidence Board "Ask AI" button
6. Verify image URLs work in Evidence Board

---

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Docling analysis (PDF) | 2-5s | Depends on page count |
| Docling analysis (image) | 1-2s | Faster than PDF |
| Keyword extraction | 500-1000ms | Ollama inference |
| Chat response | 2-5s | LLM inference |
| **Total flow** | ~5-12s | Acceptable for UI |

---

## Environment Variables

Add to `.env.phase14`:

```bash
# Docling Configuration
DOCLING_MODEL=ibm-granite/granite-docling-258M
YOLO_MODEL_PATH=sveltekit-frontend/models/yolo-doc.onnx

# MinIO AI Chat Images
MINIO_AI_CHAT_IMAGES_BUCKET=ai-chat-images
```

---

## Troubleshooting

### Docling Model Download Fails
```bash
# Manually download model
python -c "from docling.models import DoclingModel; DoclingModel.from_pretrained('ibm-granite/granite-docling-258M')"
```

### YOLO Model Not Found
```bash
# Verify model exists
ls sveltekit-frontend/models/yolo-doc.onnx

# If missing, reinstall docling
pip install --upgrade docling-ibm-models
```

### Python Script Fails
```bash
# Test Python script directly
python python/docling_analyze.py test.pdf output.json application/pdf

# Check stderr for errors
```

### Memory Issues
- Docling is CPU-bound, not GPU-heavy
- Should run fine on RTX 3060 Ti alongside Gemma-3
- If issues, reduce batch size or process one file at a time

---

## Next Steps After Phase 5

### Phase 6: LangExtract + KAG Synthesis
- Extract language patterns from Docling output
- Build knowledge graph from entities
- Generate "did you mean" recommendations

### Phase 7: Neo4j Integration
- Store artifacts + keywords in Neo4j
- Query for related cases
- Find precedents and connections

### Phase 8: Performance Optimization
- TensorRT/ONNX conversion for Docling
- Caching of Docling results
- Batch processing of multiple documents

---

## Files to Create/Modify

### Create
- `sveltekit-frontend/src/lib/server/docling.ts` (NEW)
- `python/docling_analyze.py` (NEW)
- `sveltekit-frontend/drizzle/20251209_add_docling_to_artifacts.sql` (NEW, optional)

### Modify
- `sveltekit-frontend/src/routes/terminal/+page.server.ts`
- `sveltekit-frontend/src/routes/api/ai/yorha/context-chat/+server.ts`
- Evidence Board component (UI)

### Already Done (Task 3)
- `sveltekit-frontend/src/lib/server/minio-client.ts` ✅
- `sveltekit-frontend/src/lib/server/keyword-extractor.ts` ✅
- `sveltekit-frontend/src/lib/server/llm/contextual-chat.ts` ✅

---

## Estimated Timeline

- **Phase 5a** (Docling setup): 1-2 hours
- **Phase 5b** (Terminal wiring): 1-2 hours
- **Phase 5c** (Context chat): 1 hour
- **Phase 5d** (Evidence Board): 1-2 hours
- **Phase 5e** (Database, optional): 30 min
- **Testing**: 1-2 hours

**Total**: 4-6 hours for full implementation

---

## Success Criteria

✅ Docling analysis works on PDFs and images
✅ Text extracted correctly with layout awareness
✅ Keywords extracted from Docling output
✅ Chat response includes keywords and suggestions
✅ Evidence Board displays images and keywords
✅ "Ask AI" button works on evidence cards
✅ All tests pass
✅ No performance degradation

---

## Status

**Ready to Implement**: All dependencies installed, all prerequisites met.

**Next Action**: Start with Phase 5a - create `docling.ts` and `docling_analyze.py`.

---

**Last Updated**: December 8, 2025
**Status**: Ready for Implementation

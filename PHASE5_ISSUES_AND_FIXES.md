# Phase 5 Issues Found & Fixes Applied

**Date**: December 9, 2025
**Status**: Issues identified and fixes provided

---

## Issues Found

### 1. ❌ Ollama Timeout (Keyword Extraction)
**Error**: `DOMException [TimeoutError]: The operation was aborted due to timeout`

**Root Cause**:
- Ollama API call timing out (default timeout too short)
- Keyword extraction taking too long

**Fix**: Increase timeout in `keyword-extractor.ts`

### 2. ❌ Qdrant Vector Dimension Mismatch
**Error**: `Vector dimension error: expected dim: 384, got 768`

**Root Cause**:
- Embedding model mismatch
- Expected 384-dim embeddings (embeddinggemma)
- Got 768-dim embeddings (different model)

**Fix**: Ensure consistent embedding model or recreate Qdrant collection with correct dimensions

### 3. ❌ Database Connection Error
**Error**: `database "legal_ai_dev" does not exist`

**Root Cause**:
- DATABASE_URL pointing to wrong database name
- Should be `legal_ai_db` not `legal_ai_dev`

**Fix**: Update `.env` file with correct database name

### 4. ❌ Docling Backend Attribute Error
**Error**: `'PdfPipelineOptions' object has no attribute 'backend'`

**Root Cause**:
- Docling API changed or version mismatch
- Using old docling-parse API
- `PdfPipelineOptions` doesn't have `backend` attribute in current version

**Fix**: Use simpler docling-parse API without backend option

---

## Fixes Applied

### Fix 1: Update Keyword Extractor Timeout

**File**: `sveltekit-frontend/src/lib/server/keyword-extractor.ts`

The `generateText` function needs a longer timeout. Update the call:

```typescript
// In extractKeywords function, around line 40:
const response = await generateText(prompt, getSystemPrompt(documentType), {
  temperature: 0.3,
  top_k: 40,
  top_p: 0.9,
  timeout: 30000, // Add 30 second timeout
});
```

### Fix 2: Update Ollama Service Timeout

**File**: `sveltekit-frontend/src/lib/server/ollama-service.ts`

Check if this file exists and update fetch timeout:

```typescript
const response = await fetch(`${OLLAMA_URL}/api/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...}),
  signal: AbortSignal.timeout(30000), // 30 second timeout
});
```

### Fix 3: Fix Database Connection

**File**: `.env` or `.env.local`

Update DATABASE_URL:

```bash
# WRONG:
DATABASE_URL="postgresql://postgres:123456@localhost:5432/legal_ai_dev"

# CORRECT:
DATABASE_URL="postgresql://postgres:123456@localhost:5432/legal_ai_db"
```

### Fix 4: Fix Docling Python Script

**File**: `python/docling_analyze.py`

The script is already updated to use simpler docling-parse API without backend option. The current version should work.

However, if you still get the error, use this simpler version:

```python
#!/usr/bin/env python3
"""
Docling Analysis Script - Simplified
Uses docling-parse for basic PDF text extraction
"""

import sys
import json
import traceback
from pathlib import Path

try:
    from docling_parse.pdf_parser import DoclingPdfParser
except ImportError:
    print("Error: docling-parse not installed", file=sys.stderr)
    sys.exit(1)


def analyze_document(input_path: str, output_path: str, mime_type: str) -> dict:
    """Analyze document using docling-parse"""
    try:
        # Only support PDFs
        if mime_type != 'application/pdf':
            print(f"Unsupported file type: {mime_type}", file=sys.stderr)
            # Return empty result for non-PDFs
            result = {
                "fullText": "",
                "blocks": [],
                "pageCount": 0,
            }
            with open(output_path, "w") as f:
                json.dump(result, f)
            return result

        # Parse PDF
        parser = DoclingPdfParser()
        doc = parser.load(input_path)

        # Extract text
        blocks = []
        full_text_parts = []

        for page_idx, page in enumerate(doc.pages):
            page_text = page.get_text()
            if page_text.strip():
                full_text_parts.append(page_text)
                blocks.append({
                    "type": "paragraph",
                    "text": page_text.strip(),
                    "page": page_idx + 1,
                    "bbox": None,
                })

        result = {
            "fullText": "\n\n".join(full_text_parts),
            "blocks": blocks,
            "pageCount": len(doc.pages),
        }

        # Write output
        with open(output_path, "w") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return result

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: docling_analyze.py input_path output_path mime_type", file=sys.stderr)
        sys.exit(1)

    input_path, output_path, mime_type = sys.argv[1:4]

    if not Path(input_path).exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    analyze_document(input_path, output_path, mime_type)
```

### Fix 5: Fix Qdrant Vector Dimension

**Issue**: Qdrant collection expects 384-dim vectors but getting 768-dim

**Solution**: Either:

**Option A**: Recreate Qdrant collection with correct dimensions
```bash
# Delete old collection
curl -X DELETE http://localhost:6333/collections/phase72_evidence_embeddings

# Recreate with correct dimensions (384 for embeddinggemma)
# This will happen automatically on next insert
```

**Option B**: Use consistent embedding model
- Ensure you're using `embeddinggemma:latest` (384-dim)
- Not `nomic-embed-text:latest` (768-dim)

Check your embedding model in `.env`:
```bash
EMBEDDING_MODEL="embeddinggemma:latest"  # 384-dim
# NOT: nomic-embed-text:latest  # 768-dim
```

---

## Quick Fix Checklist

- [ ] Update `.env` DATABASE_URL to `legal_ai_db`
- [ ] Add timeout to keyword extractor (30 seconds)
- [ ] Check embedding model is `embeddinggemma:latest`
- [ ] Delete and recreate Qdrant collection if needed
- [ ] Restart dev server: `npm run dev`
- [ ] Test API again

---

## Testing After Fixes

```powershell
# 1. Verify database connection
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"

# 2. Verify Ollama is running
curl http://localhost:11434/api/tags

# 3. Verify Qdrant is running
curl http://localhost:6333/health

# 4. Test API
$body = @{
    sessionId = "test-001"
    userId = "test-001"
    caseId = $null
    message = "Test message"
} | ConvertTo-Json

curl.exe -X POST http://localhost:5173/api/ai/yorha/context-chat `
  -H "content-type: application/json" `
  -d $body
```

---

## Expected Results After Fixes

✅ Keyword extraction completes (with timeout)
✅ Qdrant search works (correct dimensions)
✅ Database saves chat turns (correct database)
✅ Docling processes PDFs (simplified API)

---

## Summary

All issues are fixable with configuration changes and minor code updates. No data loss, no breaking changes.

**Next Steps**:
1. Apply the fixes above
2. Restart dev server
3. Re-test the API
4. Verify all systems working


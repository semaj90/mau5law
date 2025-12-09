# Task 3 Complete: Next Phase Implementation Guide

## Current Status
✅ **COMPLETE** - MinIO image bucket + keyword extraction + enhanced chat responses

All files compile with 0 errors and 0 warnings. Ready for testing and next phases.

---

## What Was Accomplished

### Phase 1: MinIO Integration ✅
- Fixed import issues in minio-client.ts
- `uploadChatImage()` function working for ai_chat_images bucket
- `getChatImageUrl()` function for presigned URLs
- Images stored with structure: `chat-images/[caseId]/[chatTurnId]/[uuid].ext`

### Phase 2: Keyword Extraction ✅
- Terminal page server collects keywords from all processed files
- Keywords extracted via `extractKeywords()` from keyword-extractor.ts
- Fallback heuristic extraction if Ollama unavailable
- Returns: keywords, keyPhrases, entities, topics, confidence

### Phase 3: Enhanced Chat Responses ✅
- Keywords passed to LLM in system prompt
- Suggestions generated based on keywords and key phrases
- Response includes: content, keywords, keyPhrases, suggestions, chatImages
- Backward compatible with existing code

---

## Response Structure (New)

```typescript
{
  success: true,
  chatTurnId: string,
  llmReply: string,                    // LLM response
  keywords: string[],                  // Extracted keywords
  keyPhrases: string[],                // Extracted key phrases
  suggestions: string[],               // "Did you mean" suggestions
  uploadedCount: number,               // Files uploaded to MinIO
  processedCount: number,              // Files processed
  chatImages: string[]                 // URLs of uploaded images
}
```

---

## Next Phases (Not Yet Implemented)

### Phase 4: Database Schema Enhancement (Optional, Non-Breaking)

**Goal**: Persist keywords and suggestions in database

**Files to Update**:
- `sveltekit-frontend/drizzle/schema-contextual-chat.ts`

**Changes**:
```typescript
// Add to chat_turns table
image_urls: text('image_urls').array(),           // URLs from ai_chat_images
extracted_keywords: text('extracted_keywords').array(),
suggestions: text('suggestions').array()
```

**Migration**:
```sql
-- Create migration file: 20251208_add_keywords_to_chat_turns.sql
ALTER TABLE chat_turns ADD COLUMN image_urls TEXT[] DEFAULT '{}';
ALTER TABLE chat_turns ADD COLUMN extracted_keywords TEXT[] DEFAULT '{}';
ALTER TABLE chat_turns ADD COLUMN suggestions TEXT[] DEFAULT '{}';
```

**Terminal Server Update**:
```typescript
// In chat action, after getting chatResult:
await sql`UPDATE chat_turns SET
  image_urls = ${chatImages.map(img => img.url)},
  extracted_keywords = ${allKeywords},
  suggestions = ${chatResult.suggestions}
WHERE id = ${chatTurnId}`;
```

---

### Phase 5: Docling Integration with Granite-Docling-258M

**Goal**: Enhanced document processing with IBM Granite model

**Status**: Granite-Docling already installed, just needs wiring

**Files to Update**:
- `sveltekit-frontend/src/lib/server/docling.ts`

**Current Implementation** (if exists):
```typescript
// Check what's currently in docling.ts
// Likely uses default model or needs update
```

**Required Update**:
```typescript
import { DocumentConverter, DoclingModel } from 'docling';

export async function processWithDocling(filePath: string) {
  const converter = DocumentConverter(
    model=DoclingModel.from_pretrained("ibm-granite/granite-docling-258M")
  );

  const result = converter.convert(filePath);
  return {
    text: result.document.export_to_markdown(),
    metadata: result.metadata,
    layout: result.document.layout_analysis
  };
}
```

**Verification**:
- YOLO model should be at: `sveltekit-frontend/models/yolo-doc.onnx`
- Python packages installed: `docling`, `docling-ibm-models`, `RapidOCR`
- Run: `setup-document-processing.bat` if not already done

**Integration Point**:
- Already called in terminal page server's `processDocument()` function
- Just needs the model configuration update

---

### Phase 6: LangExtract + RAG/KAG Synthesis

**Goal**: Implement "did you mean" recommendations via language extraction

**Components**:
1. **LangExtract**: Extract language patterns and relationships
2. **RAG Query**: Search for similar cases/documents
3. **KAG Synthesis**: Generate recommendations from knowledge graph

**Files to Create**:
- `sveltekit-frontend/src/lib/server/langextract-service.ts`
- `sveltekit-frontend/src/lib/server/kag-synthesis.ts`

**Implementation Outline**:
```typescript
// langextract-service.ts
export async function extractLanguagePatterns(text: string) {
  // Extract:
  // - Legal terminology
  // - Relationships (party A vs party B)
  // - Obligations and rights
  // - Temporal references
  // - Monetary amounts
  return {
    terms: string[],
    relationships: Array<{from: string, to: string, type: string}>,
    obligations: string[],
    dates: string[],
    amounts: string[]
  };
}

// kag-synthesis.ts
export async function synthesizeRecommendations(
  keywords: string[],
  patterns: LanguagePatterns,
  caseId?: string
) {
  // Query Neo4j for similar cases
  // Query Qdrant for similar documents
  // Synthesize recommendations
  return {
    relatedCases: string[],
    relatedDocuments: string[],
    recommendations: string[]
  };
}
```

**Integration Point**:
- Call in `contextualChat()` after generating initial suggestions
- Enhance suggestions with synthesized recommendations

---

### Phase 7: Neo4j Graph Analysis

**Goal**: Discover relationships between entities and cases

**Components**:
1. **Entity Extraction**: Extract people, organizations, locations
2. **Relationship Discovery**: Find connections between entities
3. **Graph Queries**: Find related cases and precedents

**Files to Create**:
- `sveltekit-frontend/src/lib/server/neo4j-analysis.ts`

**Implementation Outline**:
```typescript
export async function analyzeEntityRelationships(
  keywords: string[],
  entities: Entity[],
  caseId?: string
) {
  // Query Neo4j for:
  // - Related entities
  // - Connected cases
  // - Precedents
  // - Similar fact patterns
  return {
    relatedEntities: Entity[],
    connectedCases: Case[],
    precedents: Case[],
    similarPatterns: string[]
  };
}
```

---

### Phase 8: Performance Optimization

**Goal**: Optimize for production deployment

**Tasks**:
1. **TensorRT/ONNX Conversion**: Convert Granite-Docling to TensorRT
2. **Caching**: Cache keyword extraction results
3. **Batch Processing**: Process multiple documents in parallel
4. **Model Quantization**: Reduce model size for faster inference

**Files to Create**:
- `sveltekit-frontend/src/lib/server/model-optimization.ts`
- `sveltekit-frontend/scripts/convert-granite-docling-trt.py`

---

## Implementation Priority

1. **High Priority** (Recommended Next):
   - Phase 4: Database Schema (quick, enables persistence)
   - Phase 5: Docling Integration (already installed, just needs wiring)

2. **Medium Priority** (Enhances Functionality):
   - Phase 6: LangExtract + KAG Synthesis (better recommendations)
   - Phase 7: Neo4j Analysis (relationship discovery)

3. **Low Priority** (Performance):
   - Phase 8: Performance Optimization (for production scale)

---

## Testing Strategy

### Unit Tests
```typescript
// Test keyword extraction
test('extractKeywords returns keywords', async () => {
  const result = await extractKeywords('contract with liability clause');
  expect(result.keywords).toContain('contract');
  expect(result.keywords).toContain('liability');
});

// Test suggestion generation
test('generateSuggestions creates contextual suggestions', () => {
  const suggestions = generateSuggestions(['contract'], ['liability clause'], {});
  expect(suggestions.length).toBeGreaterThan(0);
  expect(suggestions[0]).toContain('contract');
});
```

### Integration Tests
```typescript
// Test full chat flow
test('chat action returns keywords and suggestions', async () => {
  const formData = new FormData();
  formData.append('message', 'Analyze this contract');
  formData.append('files', contractFile);

  const response = await actions.chat({ request: { formData } });

  expect(response.success).toBe(true);
  expect(response.keywords).toBeDefined();
  expect(response.suggestions).toBeDefined();
  expect(response.chatImages).toBeDefined();
});
```

### Manual Testing
1. Upload image → verify in ai_chat_images bucket
2. Upload document → verify keywords extracted
3. Check chat response includes suggestions
4. Verify database updates (when Phase 4 implemented)

---

## Configuration Checklist

- [ ] OLLAMA_URL set correctly
- [ ] LLM_MODEL set to gemma3-legal:latest
- [ ] MINIO_ENDPOINT configured
- [ ] MINIO_ACCESS_KEY configured
- [ ] MINIO_SECRET_KEY configured
- [ ] DATABASE_URL configured
- [ ] MINIO_AI_CHAT_IMAGES_BUCKET set (or using default: ai-chat-images)

---

## Deployment Checklist

- [ ] All files compile (0 errors, 0 warnings)
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Database migrations run (if Phase 4 implemented)
- [ ] MinIO buckets created
- [ ] Ollama service running
- [ ] LLM model loaded
- [ ] Environment variables set

---

## Quick Start for Next Phase

### To Implement Phase 4 (Database Schema):
```bash
# 1. Create migration file
touch sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql

# 2. Add schema changes
# 3. Update terminal page server to save keywords
# 4. Run migration
npm run db:migrate

# 5. Test
npm run test
```

### To Implement Phase 5 (Docling Integration):
```bash
# 1. Check current docling.ts implementation
cat sveltekit-frontend/src/lib/server/docling.ts

# 2. Update to use Granite-Docling-258M
# 3. Verify YOLO model exists
ls sveltekit-frontend/models/yolo-doc.onnx

# 4. Test document processing
npm run test -- docling
```

---

## Files Ready for Next Phase

✅ **sveltekit-frontend/src/lib/server/minio-client.ts** - Ready
✅ **sveltekit-frontend/src/lib/server/keyword-extractor.ts** - Ready
✅ **sveltekit-frontend/src/lib/server/llm/contextual-chat.ts** - Ready
✅ **sveltekit-frontend/src/routes/terminal/+page.server.ts** - Ready

📋 **To Create**:
- `sveltekit-frontend/drizzle/20251208_add_keywords_to_chat_turns.sql` (Phase 4)
- `sveltekit-frontend/src/lib/server/langextract-service.ts` (Phase 6)
- `sveltekit-frontend/src/lib/server/kag-synthesis.ts` (Phase 6)
- `sveltekit-frontend/src/lib/server/neo4j-analysis.ts` (Phase 7)

---

## Status Summary

| Phase | Task | Status | Priority |
|-------|------|--------|----------|
| 1 | MinIO Integration | ✅ Complete | - |
| 2 | Keyword Extraction | ✅ Complete | - |
| 3 | Enhanced Chat | ✅ Complete | - |
| 4 | Database Schema | ⏳ Ready | High |
| 5 | Docling Integration | ⏳ Ready | High |
| 6 | LangExtract + KAG | 📋 Planned | Medium |
| 7 | Neo4j Analysis | 📋 Planned | Medium |
| 8 | Performance Opt | 📋 Planned | Low |

---

## Questions & Support

For implementation questions, refer to:
- `GEMMA3_VLM_IMPLEMENTATION_GUIDE.md` - Complete implementation reference
- `GEMMA3_VLM_DEPLOYMENT_SUMMARY.md` - Deployment overview
- `TASK3_CHANGES_SUMMARY.md` - Detailed changes made

---

**Last Updated**: December 8, 2025
**Status**: Ready for Phase 4 Implementation

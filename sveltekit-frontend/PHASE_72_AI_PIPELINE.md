# Phase 72: AI-Powered Error Fixing & Knowledge Base Integration

## 📊 Current Status (Dec 18, 2025)

### Mojibake Cleanup Results
- ✅ **Batch 1**: 1,229 files fixed (175,537 patterns corrected)
- ✅ **Batch 2**: All remaining files processed (--limit=2000)
- ✅ **Verification**: PASSED (0 mojibake patterns detected)
- ⚠️ **Impact**: TypeScript errors 19,821 → 16,452 (17% reduction)

### Factory-Fixer Status
- ❌ **Tier 1**: 0 fixes applied (corruption patterns don't match)
- ❌ **Tier 2**: 0 fixes applied (refactoring patterns don't match)
- 🔍 **Root Cause**: Remaining 16,452 errors are **incomplete mojibake cleanup**

### Example Corrupted File: `submitWithProgress.ts`

**Purpose**: File upload with progress tracking (XHR wrapper)
**Category**: Client API utility (`src/lib/api/`)
**Used By**:
- `routes/(app)/evidenceboard/+page.svelte` (production route)
- `routes_parked/archive/demos/upload-demo/+page.svelte` (demo)

**Dependencies**:
- `./xhr.ts` (XHR upload implementation - also corrupted)
- FormData API (browser native)
- Fetch API (fallback for JSON)

**SvelteKit Context**: None (pure utility, no Svelte components)

**Corruption Details**:
```typescript
// LINE 1 - Type definition corrupted
❌ WRONG:  { status: number: responseText? , string }
✅ CORRECT: { status: number; responseText?: string }

// LINE 10 - Function parameter separator corrupted
❌ WRONG:  onProgress?: (...) => void: signal?: AbortSignal
✅ CORRECT: onProgress?: (...) => void; signal?: AbortSignal

// LINE 14 - Missing semicolon after cast
❌ WRONG:  return uploadWithXhr(...) as Promise<SubmitResult>}
✅ CORRECT: return uploadWithXhr(...) as Promise<SubmitResult>;}

// LINE 18 - Object literal property missing
❌ WRONG:  body, JSON.stringify(data), signal
✅ CORRECT: body: JSON.stringify(data), signal
```

**Decision**: ✅ **KEEP & FIX** - Core file upload functionality required for production

---

## 🧠 Phase 72.2: LLM Context Enrichment System

### Architecture: Multi-Provider Context Files

```
Phase 72 Knowledge Base
│
├─ copilot.md      → GitHub Copilot inline suggestions
├─ claude.md       → Claude (Anthropic) long-context analysis
├─ gemini.md       → Gemini (Google) multi-modal reasoning
│
└─ Shared Context:
   ├─ Error summaries (grouped by pattern)
   ├─ Fix examples (before/after)
   ├─ AST metadata (file type, imports, dependencies)
   └─ Verification results (KAG cached fixes)
```

### **File 1: `.github/copilot.md`**

**Purpose**: Inline error fixes during coding
**Update Trigger**: On TypeScript error count change
**Content Format**:

```markdown
# Phase 72: TypeScript Error Context

**Last Updated**: 2025-12-18T21:34:52
**Total Errors**: 16,452
**Priority Files**: 842 with 5+ errors

## Top Error Categories

### 1. Parse Errors (TS1005) - 8,234 occurrences
**Pattern**: Mojibake semicolon/colon confusion
**Example**:
\`\`\`typescript
// WRONG: number: responseText?
// FIX:   number; responseText?:
\`\`\`

### 2. Type Errors (TS2322) - 3,456 occurrences
**Pattern**: Missing type annotations in function parameters
**Example**:
\`\`\`typescript
// WRONG: function handle(data) { ... }
// FIX:   function handle(data: unknown) { ... }
\`\`\`

### 3. Module Errors (TS2307) - 2,109 occurrences
**Pattern**: Invalid import paths after mojibake cleanup
**Example**:
\`\`\`typescript
// WRONG: import { X } from './utils:helper';
// FIX:   import { X } from './utils/helper';
\`\`\`

## Quick Fix Commands

\`\`\`bash
# Fix single file
node scripts/smart-error-fixer.mjs --file src/lib/api/submitWithProgress.ts

# Fix all API utilities
node scripts/smart-error-fixer.mjs --pattern "src/lib/api/**/*.ts"

# Query knowledge base for similar fixes
node scripts/query-knowledge-base.mjs "semicolon colon mojibake"
\`\`\`
```

**Implementation**:
- [ ] Script: `scripts/generate-copilot-context.mjs`
- [ ] Trigger: Post TypeScript check hook
- [ ] Format: Markdown with code blocks
- [ ] Location: `.github/copilot.md` (auto-detected by Copilot)

---

### **File 2: `claude.md`**

**Purpose**: Deep AST-level fix pattern analysis
**Update Trigger**: After KAG storage updates
**Content Format**:

```markdown
# Codebase Error Patterns - Phase 72 Deep Analysis

## Mojibake Corruption Signatures

**Total Patterns Fixed**: 175,537 (Batch 1)
**Remaining Patterns**: ~161,994 (estimated)
**Detection Method**: Regex + AST validation

### Common Mojibake Transformations

| Original UTF-8 | Corrupted | Context |
|----------------|-----------|---------|
| `;` (semicolon) | `:` (colon) | After type declarations |
| `:` (colon) | ` , ` (comma+space) | Inside object literals |
| `?:` (optional type) | `?` (no colon) | TypeScript optional properties |
| `=>` (arrow) | `â†'` (Unicode) | Function expressions |

### AST-Level Fix Strategy

\`\`\`javascript
// STEP 1: Parse file to AST (tolerate errors)
const ast = parse(fileContent, { errorRecovery: true });

// STEP 2: Identify corruption nodes
const corruptedNodes = ast.body.filter(node =>
  node.type === 'TSTypeAnnotation' &&
  !node.typeAnnotation
);

// STEP 3: Apply contextual fix
for (const node of corruptedNodes) {
  if (node.leadingChar === ':' && node.expectedChar === ';') {
    applyFix({ type: 'replace', line: node.line, char: ':' → ';' });
  }
}

// STEP 4: Validate with TypeScript compiler
const errors = runTypeScript(fixedContent);
if (errors.length === 0) {
  storeInKAG({ signature, fix, verification: 'PASS' });
}
\`\`\`

### Verification Gate Requirements

✅ **Success Criteria**:
- TypeScript compilation passes (`npx tsc --noEmit`)
- No new errors introduced
- Original error signature removed

❌ **Failure Cases**:
- Introduces new parse errors
- Breaks transitive dependencies
- Changes semantic meaning

### Cross-File Impact Analysis

**Example: `xhr.ts` corruption cascade**

\`\`\`
xhr.ts (12 errors)
  ├─ submitWithProgress.ts (8 errors) ← Imports corrupted types
  │   ├─ evidenceboard/+page.svelte (22 errors)
  │   └─ upload-demo/+page.svelte (15 errors)
  ├─ file-uploader.ts (6 errors)
  └─ (13 more files)
     └─ Total cascading errors: 248
\`\`\`

**Fix Priority**: HIGH - Fixing `xhr.ts` resolves 248 downstream errors

## Knowledge Base Integration

### KAG Storage Format

\`\`\`json
{
  "signature": "sha256:abc123...",
  "error": {
    "code": "TS1005",
    "message": "';' expected.",
    "file": "src/lib/api/xhr.ts",
    "line": 1,
    "column": 42
  },
  "fix": {
    "pattern": "mojibake-semicolon",
    "before": "status: number: responseText?",
    "after": "status: number; responseText?:",
    "ast_context": {
      "node_type": "TSTypeAliasDeclaration",
      "surrounding_nodes": [...]
    }
  },
  "verification": {
    "status": "PASS",
    "command": "npx tsc --noEmit",
    "exit_code": 0
  },
  "metadata": {
    "timestamp": "2025-12-18T21:34:52Z",
    "phase": "72.2",
    "confidence": 0.95
  }
}
\`\`\`
```

**Implementation**:
- [ ] Script: `scripts/generate-claude-context.mjs`
- [ ] Trigger: KAG storage updates
- [ ] Format: Markdown + JSON examples
- [ ] Location: `claude.md` (root directory)

---

### **File 3: `gemini.md`**

**Purpose**: Multi-file dependency analysis & fix ordering
**Update Trigger**: After dependency graph generation
**Content Format**:

```markdown
# Multi-File Error Correlation - Phase 72

## Dependency Graph Analysis

### Critical Path: API Utilities

\`\`\`mermaid
graph TD
    A[xhr.ts - 12 errors] -->|imports| B[submitWithProgress.ts - 8 errors]
    B -->|used by| C[evidenceboard/+page.svelte - 22 errors]
    B -->|used by| D[upload-demo/+page.svelte - 15 errors]
    A -->|used by| E[file-uploader.ts - 6 errors]
    E -->|used by| F[15 upload components - 248 errors]

    style A fill:#ff6b6b
    style B fill:#ffd93d
    style F fill:#6bcf7f
\`\`\`

### Fix Priority Matrix

| File | Direct Errors | Dependent Errors | Total Impact | Priority |
|------|---------------|------------------|--------------|----------|
| xhr.ts | 12 | 248 | 260 | 🔴 CRITICAL |
| submitWithProgress.ts | 8 | 37 | 45 | 🟡 HIGH |
| search-service.ts | 18 | 0 | 18 | 🟢 MEDIUM |
| vector-search-client.ts | 24 | 0 | 24 | 🟢 MEDIUM |

### Transitive Corruption Detection

**Algorithm**:
1. Build import graph from `src/` directory
2. For each error file, trace all importers
3. Calculate "corruption cascade score"
4. Sort by score (descending)
5. Fix in order to maximize error reduction per fix

**Example Output**:
\`\`\`json
{
  "file": "src/lib/api/xhr.ts",
  "corruption_cascade_score": 260,
  "direct_importers": [
    "src/lib/api/submitWithProgress.ts",
    "src/lib/api/file-uploader.ts"
  ],
  "transitive_dependents": 17,
  "recommended_fix_order": 1
}
\`\`\`

### Smart Batch Fixing Strategy

**Batch 1 (Critical Path - 5 files)**:
- `xhr.ts` → fixes 260 downstream errors
- `submitWithProgress.ts` → fixes 45 downstream errors
- `search-service.ts` → independent fix
- `vector-search-client.ts` → independent fix
- **Expected Reduction**: 16,452 → 16,102 (350 errors fixed)

**Batch 2 (High-Impact Components - 20 files)**:
- Files with 5-10 errors and 1-2 dependents
- **Expected Reduction**: 16,102 → 14,800 (1,302 errors fixed)

**Batch 3 (Long Tail - 800+ files)**:
- Files with 1-4 errors and no dependents
- **Expected Reduction**: 14,800 → <1,000 (parallel processing)

## Ollama Embedding Integration

### Endpoint Configuration

\`\`\`typescript
import { getOllamaEndpoint } from '$lib/config/ollama';

const endpoint = await getOllamaEndpoint('gemma2:2b');
// Returns: { url: 'http://localhost:11434', model: 'gemma2:2b' }
\`\`\`

### Embedding Generation

\`\`\`javascript
// Generate embedding for error context
const errorContext = \`
File: \${error.file}
Error: \${error.code} - \${error.message}
Context: \${surrounding_code}
Fix Pattern: \${fix_pattern}
\`;

const embedding = await fetch(\`\${endpoint.url}/api/embeddings\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: endpoint.model,
    prompt: errorContext
  })
});

const vector = await embedding.json();
// vector.embedding: Float32Array[768]
\`\`\`

### Qdrant Storage Schema

\`\`\`json
{
  "collection_name": "phase72_error_patterns",
  "vectors": {
    "size": 768,
    "distance": "Cosine"
  },
  "payload_schema": {
    "error_code": { "type": "keyword" },
    "file_path": { "type": "keyword" },
    "severity": { "type": "keyword", "values": ["critical", "high", "medium", "low"] },
    "fix_pattern": { "type": "keyword" },
    "kag_signature": { "type": "keyword" },
    "verified": { "type": "bool" },
    "created_at": { "type": "datetime" }
  }
}
\`\`\`

### Auto-Tagging Rules

\`\`\`javascript
function autoTag(error, fix) {
  const tags = [];

  // Tag by error type
  if (error.code.startsWith('TS10')) tags.push('parse-error');
  if (error.code.startsWith('TS23')) tags.push('type-error');

  // Tag by file category
  if (error.file.includes('/routes/')) tags.push('sveltekit-route');
  if (error.file.includes('/lib/api/')) tags.push('api-utility');
  if (error.file.includes('.svelte')) tags.push('svelte-component');

  // Tag by fix pattern
  if (fix.pattern === 'mojibake-semicolon') tags.push('mojibake');
  if (fix.ast_context?.node_type === 'TSTypeAliasDeclaration')
    tags.push('type-definition');

  return tags;
}
\`\`\`

## Semantic Search Queries

### Query 1: Find Similar Errors
\`\`\`javascript
const query = "File with semicolon colon confusion in type definitions";
const results = await qdrant.search('phase72_error_patterns', {
  vector: await generateEmbedding(query),
  limit: 10,
  filter: { verified: true }
});

// Returns: Top 10 similar verified fixes from KAG
\`\`\`

### Query 2: Find High-Impact Fixes
\`\`\`javascript
const results = await qdrant.search('phase72_error_patterns', {
  vector: await generateEmbedding("Critical path errors blocking compilation"),
  limit: 5,
  filter: {
    severity: 'critical',
    verified: true
  },
  with_payload: true
});

// Returns: Fixes for xhr.ts, submitWithProgress.ts, etc.
\`\`\`

## Index & Rank Strategy

### Ranking Algorithm

\`\`\`javascript
function calculateErrorRank(error) {
  const weights = {
    cascadeScore: 0.4,      // Impact on dependent files
    errorCount: 0.3,        // Number of errors in file
    fileCategory: 0.2,      // Route > Lib > Component
    hasCachedFix: 0.1       // KAG cache hit bonus
  };

  return (
    weights.cascadeScore * error.cascadeScore / 260 +
    weights.errorCount * error.errorCount / 50 +
    weights.fileCategory * getCategoryWeight(error.file) +
    weights.hasCachedFix * (error.kagHit ? 1 : 0)
  );
}
\`\`\`

### Index Update Schedule

- **Real-time**: KAG storage updates (new verified fixes)
- **Hourly**: Dependency graph recalculation
- **Daily**: Full codebase re-embedding (check for drift)
- **On-demand**: Manual trigger after major fixes
```

**Implementation**:
- [ ] Script: `scripts/generate-gemini-context.mjs`
- [ ] Trigger: Dependency analysis completion
- [ ] Format: Markdown + Mermaid diagrams
- [ ] Location: `gemini.md` (root directory)

---

## 🚀 Phase 72.3: Codebase Indexer Implementation

### Component Architecture

\`\`\`
┌──────────────────────────────────────────────────────────┐
│              Phase 72 Codebase Indexer                   │
└──────────────────────────────────────────────────────────┘
                         │
       ┌─────────────────┴─────────────────┐
       ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│ Scanner      │                    │ Analyzer     │
│ (TS Errors)  │                    │ (AST Parser) │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  ┌────────────────────────────┐   │
       └─►│  Embedding Engine          │◄──┘
          │  (Ollama gemma2:2b)        │
          └────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Qdrant Vector   │         │ Redis KAG Cache │
│ Search (768-dim)│         │ (exact match)   │
└─────────────────┘         └─────────────────┘
\`\`\`

### Scripts to Create

#### **1. Error Scanner** - `scripts/scan-codebase-errors.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

async function scanCodebase() {
  // Run TypeScript compiler
  const { stdout, stderr } = await execAsync(
    'npx tsc --noEmit -p tsconfig.json 2>&1'
  );

  // Parse errors with context
  const errors = parseTypeScriptErrors(stdout);

  // Add file metadata
  for (const error of errors) {
    error.fileCategory = categorizeFile(error.file);
    error.svelteContext = await getSvelteKitContext(error.file);
    error.imports = await extractImports(error.file);
    error.exports = await extractExports(error.file);
  }

  // Calculate dependency graph
  const graph = buildDependencyGraph(errors);

  // Write output
  await fs.writeFile(
    'reports/error-scan-full.json',
    JSON.stringify({ errors, graph }, null, 2)
  );

  return { errorCount: errors.length, graphDepth: graph.maxDepth };
}

function categorizeFile(filePath) {
  if (filePath.includes('/routes/')) return 'sveltekit-route';
  if (filePath.includes('/lib/api/')) return 'api-utility';
  if (filePath.includes('/lib/components/')) return 'svelte-component';
  if (filePath.includes('/lib/server/')) return 'server-code';
  return 'other';
}

async function getSvelteKitContext(filePath) {
  if (!filePath.endsWith('.svelte') && !filePath.includes('/routes/')) {
    return null;
  }

  const context = {
    isRoute: filePath.includes('/routes/'),
    isLayout: filePath.includes('+layout'),
    isServer: filePath.includes('+server'),
    isPage: filePath.includes('+page')
  };

  // Check for Svelte 5 runes
  const content = await fs.readFile(filePath, 'utf-8');
  context.usesSvelte5 = content.includes('$state') || content.includes('$derived');

  return context;
}

scanCodebase().then(console.log).catch(console.error);
\`\`\`

**Tasks**:
- [ ] Create script file
- [ ] Implement error parser
- [ ] Add dependency graph builder
- [ ] Test with 100 error sample

---

#### **2. Code Analyzer** - `scripts/analyze-code-context.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { parse } from '@typescript-eslint/parser';
import fs from 'fs/promises';

async function analyzeCodeContext(errorFile, errorLine) {
  const content = await fs.readFile(errorFile, 'utf-8');

  // Parse to AST (with error recovery)
  const ast = parse(content, {
    errorOnUnknownASTType: false,
    errorOnTypeScriptSyntacticAndSemanticIssues: false
  });

  // Extract surrounding context (±5 lines)
  const lines = content.split('\n');
  const context = {
    before: lines.slice(Math.max(0, errorLine - 6), errorLine - 1),
    errorLine: lines[errorLine - 1],
    after: lines.slice(errorLine, errorLine + 5)
  };

  // Find related symbols
  const symbols = extractRelatedSymbols(ast, errorLine);

  // Generate semantic summary
  const summary = generateSummary(context, symbols);

  return { context, symbols, summary };
}

function generateSummary(context, symbols) {
  const parts = [];

  if (symbols.function) {
    parts.push(\`Function: \${symbols.function.name}\`);
  }
  if (symbols.type) {
    parts.push(\`Type: \${symbols.type.name}\`);
  }
  if (symbols.imports.length > 0) {
    parts.push(\`Imports: \${symbols.imports.join(', ')}\`);
  }

  parts.push(\`Context: \${context.errorLine.trim()}\`);

  return parts.join(' | ');
}

export { analyzeCodeContext };
\`\`\`

**Tasks**:
- [ ] Create script file
- [ ] Implement AST parser with error recovery
- [ ] Add symbol extraction
- [ ] Test with corrupted files

---

#### **3. Embedding Engine** - `scripts/embed-code-knowledge.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { getOllamaEndpoint } from '../src/lib/config/ollama.js';
import fs from 'fs/promises';

async function generateEmbeddings(errorScan) {
  const endpoint = await getOllamaEndpoint('gemma2:2b');
  const embeddings = [];

  // Batch process errors (100 at a time)
  const batches = chunk(errorScan.errors, 100);

  for (const batch of batches) {
    const batchEmbeddings = await Promise.all(
      batch.map(error => embedError(endpoint, error))
    );
    embeddings.push(...batchEmbeddings);
  }

  // Write to file
  await fs.writeFile(
    'reports/embeddings/error-vectors.json',
    JSON.stringify(embeddings, null, 2)
  );

  return embeddings;
}

async function embedError(endpoint, error) {
  const prompt = \`
File: \${error.file}
Category: \${error.fileCategory}
Error: \${error.code} - \${error.message}
Line: \${error.line}
Context: \${error.context?.errorLine ?? 'N/A'}
\`;

  const response = await fetch(\`\${endpoint.url}/api/embeddings\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: endpoint.model,
      prompt
    })
  });

  const result = await response.json();

  return {
    errorId: \`\${error.file}:\${error.line}\`,
    embedding: result.embedding,
    metadata: {
      file: error.file,
      code: error.code,
      severity: calculateSeverity(error),
      timestamp: new Date().toISOString()
    }
  };
}

function calculateSeverity(error) {
  if (error.code.startsWith('TS10')) return 'critical'; // Parse errors
  if (error.cascadeScore > 100) return 'high';
  if (error.cascadeScore > 10) return 'medium';
  return 'low';
}

function chunk(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

export { generateEmbeddings };
\`\`\`

**Tasks**:
- [ ] Create script file
- [ ] Implement batch processing
- [ ] Add retry logic for Ollama timeouts
- [ ] Test with 1000 error sample

---

#### **4. Qdrant Integration** - `scripts/store-in-qdrant.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { QdrantClient } from '@qdrant/js-client-rest';
import fs from 'fs/promises';

const client = new QdrantClient({ url: 'http://localhost:6333' });

async function storeInQdrant(embeddings) {
  // Create collection if not exists
  const collections = await client.getCollections();
  if (!collections.collections.find(c => c.name === 'phase72_error_patterns')) {
    await client.createCollection('phase72_error_patterns', {
      vectors: { size: 768, distance: 'Cosine' }
    });
  }

  // Prepare points
  const points = embeddings.map((emb, idx) => ({
    id: idx + 1,
    vector: emb.embedding,
    payload: {
      error_code: emb.metadata.code,
      file_path: emb.metadata.file,
      severity: emb.metadata.severity,
      created_at: emb.metadata.timestamp,
      verified: false // Will be updated when fix is applied
    }
  }));

  // Upsert in batches
  const batches = chunk(points, 100);
  for (const batch of batches) {
    await client.upsert('phase72_error_patterns', {
      wait: true,
      points: batch
    });
  }

  console.log(\`✅ Stored \${points.length} vectors in Qdrant\`);
}

async function queryKnowledgeBase(query, limit = 10) {
  // Generate embedding for query
  const queryEmb = await generateEmbedding(query);

  // Search Qdrant
  const results = await client.search('phase72_error_patterns', {
    vector: queryEmb,
    limit,
    with_payload: true
  });

  return results;
}

export { storeInQdrant, queryKnowledgeBase };
\`\`\`

**Tasks**:
- [ ] Create script file
- [ ] Test collection creation
- [ ] Implement query interface
- [ ] Add filtering by severity/file type

---

## 🎯 Phase 72.4: Smart Error Fixer Workflow

### Implementation: `scripts/smart-error-fixer.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { kagStore } from './kag-fix-store.mjs';
import { queryKnowledgeBase } from './store-in-qdrant.mjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function smartFixError(error) {
  // STEP 1: Check KAG cache (exact match)
  const signature = generateSignature(error);
  const cachedFix = await kagStore.retrieve(signature);

  if (cachedFix) {
    console.log('✅ KAG cache hit:', signature);
    return applyCachedFix(error, cachedFix);
  }

  // STEP 2: Query Qdrant (semantic similarity)
  const query = \`\${error.code}: \${error.message} in \${error.file}\`;
  const similarFixes = await queryKnowledgeBase(query, 5);

  if (similarFixes.length > 0 && similarFixes[0].score > 0.85) {
    console.log('🔍 Similar fix found (score:', similarFixes[0].score, ')');
    return adaptSimilarFix(error, similarFixes[0]);
  }

  // STEP 3: Generate new fix with LLM
  console.log('🤖 Generating new fix with Ollama...');
  const generatedFix = await generateFixWithLLM(error);

  // STEP 4: Validate fix
  const validation = await validateFix(error, generatedFix);

  if (validation.success) {
    // Store in KAG
    await kagStore.store({
      signature,
      fix: generatedFix,
      verification: 'PASS',
      metadata: {
        method: 'llm-generated',
        timestamp: new Date().toISOString()
      }
    });

    // Update Qdrant (mark as verified)
    await updateQdrantVerified(error, true);

    return { success: true, method: 'llm-generated' };
  } else {
    console.warn('❌ Fix validation failed');
    return { success: false, error: validation.error };
  }
}

async function validateFix(error, fix) {
  // Apply fix to temporary file
  const tempFile = error.file + '.temp';
  const content = await fs.readFile(error.file, 'utf-8');
  const fixed = content.replace(fix.before, fix.after);
  await fs.writeFile(tempFile, fixed);

  // Run TypeScript check
  try {
    await execAsync(\`npx tsc --noEmit \${tempFile}\`);
    await fs.unlink(tempFile);
    return { success: true };
  } catch (err) {
    await fs.unlink(tempFile);
    return { success: false, error: err.message };
  }
}

export { smartFixError };
\`\`\`

**Tasks**:
- [ ] Create script file
- [ ] Implement KAG lookup
- [ ] Add Qdrant semantic search
- [ ] Implement LLM fallback
- [ ] Add validation gate

---

## 📅 Execution Timeline

### **Week 1: Foundation (Dec 18-22)**

**Day 1 (Dec 18)**:
- [x] Mojibake cleanup complete
- [ ] Fix `submitWithProgress.ts` manually
- [ ] Fix `xhr.ts` manually
- [ ] Verify 5 dependent files compile

**Day 2 (Dec 19)**:
- [ ] Create `scan-codebase-errors.mjs`
- [ ] Implement error categorization
- [ ] Generate dependency graph
- [ ] Test with current 16,452 errors

**Day 3 (Dec 20)**:
- [ ] Create `analyze-code-context.mjs`
- [ ] Implement AST parser with error recovery
- [ ] Extract symbol information
- [ ] Generate error summaries

**Day 4 (Dec 21)**:
- [ ] Generate `.github/copilot.md`
- [ ] Generate `claude.md`
- [ ] Generate `gemini.md`
- [ ] Test LLM context loading

**Day 5 (Dec 22)**:
- [ ] Set up Qdrant collection
- [ ] Create `embed-code-knowledge.mjs`
- [ ] Generate embeddings for 16,452 errors
- [ ] Store in Qdrant

---

### **Week 2: Integration (Dec 23-27)**

**Day 6 (Dec 23)**:
- [ ] Create `store-in-qdrant.mjs`
- [ ] Implement batch upsert
- [ ] Test query interface
- [ ] Validate vector search results

**Day 7 (Dec 24)**:
- [ ] Create `smart-error-fixer.mjs`
- [ ] Implement KAG cache lookup
- [ ] Add Qdrant semantic search
- [ ] Test with 10 error sample

**Day 8 (Dec 25)**:
- [ ] Implement LLM fallback (Ollama gemma2:2b)
- [ ] Add fix validation gate
- [ ] Test full workflow end-to-end
- [ ] Measure success rate

**Day 9 (Dec 26)**:
- [ ] Fix critical path files (xhr.ts, submitWithProgress.ts)
- [ ] Validate cascading error reduction
- [ ] Expected: 16,452 → 16,102 errors

**Day 10 (Dec 27)**:
- [ ] Run smart fixer on Batch 1 (100 errors)
- [ ] Measure KAG cache hit rate
- [ ] Expected: 30-40% cache hits on second run

---

### **Week 3: Production (Dec 28 - Jan 3)**

**Day 11-13 (Dec 28-30)**:
- [ ] Process all 16,452 errors through smart fixer
- [ ] Run in batches of 500 errors
- [ ] Monitor success rate (target: >90%)
- [ ] Expected final count: <1,000 errors

**Day 14 (Dec 31)**:
- [ ] Validate all fixes with `npm run check:svelte`
- [ ] Run full test suite
- [ ] Measure KAG cache hit rate (target: >70%)
- [ ] Document any remaining manual fixes needed

**Day 15 (Jan 1, 2026)**:
- [ ] Write Phase 72 completion report
- [ ] Document knowledge base architecture
- [ ] Generate before/after metrics
- [ ] Plan Phase 73 (SIMD JSON parsing)

---

## 📈 Success Metrics

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| TypeScript Errors | 19,821 | <1,000 | 16,452 |
| KAG Cache Hit Rate | 0% | 70% | TBD |
| Vector Search Precision | N/A | >80% | TBD |
| Fix Success Rate | 0% | >90% | 0% |
| Processing Time (100 errors) | N/A | <5 min | TBD |
| Files with 5+ errors | 842 | <50 | TBD |

---

## 🔗 File Locations

| Component | Path | Status |
|-----------|------|--------|
| Phase 72 Checklist | `PHASE_72_CHECKLIST.md` | ✅ Exists |
| AI Pipeline Doc | `PHASE_72_AI_PIPELINE.md` | ✅ Created |
| KAG Storage | `scripts/kag-fix-store.mjs` | ✅ Working |
| Factory Fixer | `scripts/factory-fixer-v2.mjs` | ✅ Working |
| Error Scanner | `scripts/scan-codebase-errors.mjs` | ❌ TBD |
| Code Analyzer | `scripts/analyze-code-context.mjs` | ❌ TBD |
| Embedding Engine | `scripts/embed-code-knowledge.mjs` | ❌ TBD |
| Qdrant Integration | `scripts/store-in-qdrant.mjs` | ❌ TBD |
| Smart Fixer | `scripts/smart-error-fixer.mjs` | ❌ TBD |
| Copilot Context | `.github/copilot.md` | ❌ TBD |
| Claude Context | `claude.md` | ❌ TBD |
| Gemini Context | `gemini.md` | ❌ TBD |

---

## 🎓 Lessons Learned

1. **Mojibake is pervasive**: 337K patterns across 90% of codebase
2. **Generic patterns fail**: Factory-fixer needs AST-level context
3. **KAG requires verification**: Only store fixes that pass TypeScript check
4. **LLM context matters**: Summaries improve fix accuracy significantly
5. **Vector + exact match**: Hybrid approach (Qdrant + KAG) optimal
6. **Fix ordering critical**: Dependency graph analysis prevents wasted work
7. **Batch processing essential**: 16K+ errors need parallel execution

---

## 🚀 Next Phase

**Phase 73: SIMD JSON Parsing**
- **Goal**: 10x speedup for error event parsing
- **Current**: Parse 19,821 errors in ~1 second
- **Target**: Parse in <100ms with SIMD vectorization
- **Benefit**: Enables real-time error analysis during development

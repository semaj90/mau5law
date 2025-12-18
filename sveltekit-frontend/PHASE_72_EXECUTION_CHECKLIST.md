# Phase 72: Smart Error Fixing - Execution Checklist

## 🎯 Objective
Build AI-powered error fixing system using KAG cache (Redis), Qdrant vector search, and Ollama LLMs

## 📊 Current Status (Dec 18, 2025 13:46)

### ✅ Completed
- [x] Mojibake cleanup: 1,229 files, 175,537 patterns fixed
- [x] Redis server running on port 4005 (PID: 20780)
- [x] Fixed `xhr.ts` and `submitWithProgress.ts` (8 errors resolved)
- [x] TypeScript errors: 19,821 → 16,444 (3,377 fixed)
- [x] Phase 72 AI pipeline documentation created

### ⚠️ Pending
- [ ] Redis KAG keys: 0 (need to populate)
- [ ] Qdrant vector store: Not configured
- [ ] LLM context files: Not created
- [ ] Error scanner: Not implemented
- [ ] Smart fixer: Not implemented

---

## 🔧 Part 1: Infrastructure Setup (30 mins)

### Task 1.1: Verify Ollama Models ✓
**Purpose**: Confirm required models are installed
**Models Needed**:
- `gemma3-legal:latest` - Legal analysis & error understanding
- `embeddinggemma:latest` - Error pattern embeddings (768-dim)
- `gemma2:2b` - Fast fallback for simple fixes

**Commands**:
\`\`\`powershell
# Check installed models
ollama list

# Pull if missing
ollama pull gemma3-legal:latest
ollama pull embeddinggemma:latest
ollama pull gemma2:2b
\`\`\`

**Verification**:
- [ ] `gemma3-legal:latest` installed
- [ ] `embeddinggemma:latest` installed
- [ ] `gemma2:2b` installed

---

### Task 1.2: Configure Ollama Endpoint
**File**: `src/lib/config/ollama.ts` (or create if missing)

**Purpose**: Centralized Ollama endpoint configuration with model routing

\`\`\`typescript
// src/lib/config/ollama.ts
export interface OllamaEndpoint {
  url: string;
  model: string;
  timeout: number;
}

export interface OllamaConfig {
  baseUrl: string;
  models: {
    legal: string;          // gemma3-legal:latest
    embedding: string;      // embeddinggemma:latest
    fastFix: string;        // gemma2:2b
  };
  timeout: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  models: {
    legal: 'gemma3-legal:latest',
    embedding: 'embeddinggemma:latest',
    fastFix: 'gemma2:2b'
  },
  timeout: 30000 // 30 seconds
};

/**
 * Get Ollama endpoint for specific use case
 * @param useCase - 'legal' | 'embedding' | 'fastFix'
 */
export async function getOllamaEndpoint(
  useCase: 'legal' | 'embedding' | 'fastFix' = 'fastFix'
): Promise<OllamaEndpoint> {
  const config = DEFAULT_CONFIG;
  const model = config.models[useCase];

  // Verify Ollama is running
  try {
    const response = await fetch(\`\${config.baseUrl}/api/tags\`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(\`Ollama not responding: \${response.status}\`);
    }

    const data = await response.json();
    const modelExists = data.models?.some((m: any) =>
      m.name === model || m.name.startsWith(model.split(':')[0])
    );

    if (!modelExists) {
      console.warn(\`[Ollama] Model \${model} not found, using fallback\`);
      // Fallback to gemma2:2b if specific model missing
      return {
        url: config.baseUrl,
        model: config.models.fastFix,
        timeout: config.timeout
      };
    }

    return {
      url: config.baseUrl,
      model,
      timeout: config.timeout
    };
  } catch (error) {
    console.error('[Ollama] Connection failed:', error);
    throw new Error('Ollama service unavailable');
  }
}

/**
 * Generate embedding using embeddinggemma:latest
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const endpoint = await getOllamaEndpoint('embedding');

  const response = await fetch(\`\${endpoint.url}/api/embeddings\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: endpoint.model,
      prompt: text
    }),
    signal: AbortSignal.timeout(endpoint.timeout)
  });

  if (!response.ok) {
    throw new Error(\`Embedding generation failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Generate text with gemma3-legal:latest
 */
export async function generateLegalAnalysis(
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const endpoint = await getOllamaEndpoint('legal');

  const response = await fetch(\`\${endpoint.url}/api/generate\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: endpoint.model,
      prompt,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 2048
      },
      stream: false
    }),
    signal: AbortSignal.timeout(endpoint.timeout)
  });

  if (!response.ok) {
    throw new Error(\`Legal analysis failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.response;
}
\`\`\`

**Tasks**:
- [ ] Create `src/lib/config/ollama.ts`
- [ ] Test `getOllamaEndpoint('embedding')`
- [ ] Test `generateEmbedding()` with sample text
- [ ] Test `generateLegalAnalysis()` with sample prompt

---

### Task 1.3: Setup Qdrant Collection
**Purpose**: Vector storage for error pattern embeddings

**Script**: `scripts/setup-qdrant-phase72.mjs`

\`\`\`javascript
#!/usr/bin/env node
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: 'http://localhost:6333' });

async function setupQdrantCollection() {
  const collectionName = 'phase72_error_patterns';

  // Check if collection exists
  const collections = await client.getCollections();
  const exists = collections.collections.some(c => c.name === collectionName);

  if (exists) {
    console.log(\`✅ Collection '\${collectionName}' already exists\`);
    return;
  }

  // Create collection with embeddinggemma dimensions (768)
  await client.createCollection(collectionName, {
    vectors: {
      size: 768,          // embeddinggemma:latest dimension
      distance: 'Cosine'
    }
  });

  // Create payload index for fast filtering
  await client.createPayloadIndex(collectionName, {
    field_name: 'error_code',
    field_schema: 'keyword'
  });

  await client.createPayloadIndex(collectionName, {
    field_name: 'severity',
    field_schema: 'keyword'
  });

  await client.createPayloadIndex(collectionName, {
    field_name: 'verified',
    field_schema: 'bool'
  });

  console.log(\`✅ Created collection '\${collectionName}' with 768-dim vectors\`);
  console.log('✅ Created indexes: error_code, severity, verified');
}

setupQdrantCollection()
  .then(() => console.log('\\n🎉 Qdrant setup complete'))
  .catch(console.error);
\`\`\`

**Tasks**:
- [ ] Install: `npm install @qdrant/js-client-rest`
- [ ] Create script: `scripts/setup-qdrant-phase72.mjs`
- [ ] Run: `node scripts/setup-qdrant-phase72.mjs`
- [ ] Verify collection created

---

## 📝 Part 2: LLM Context Files (45 mins)

### Task 2.1: Generate Copilot Context
**File**: `.github/copilot.md`
**Purpose**: Inline suggestions during coding

**Script**: `scripts/generate-copilot-context.mjs`

\`\`\`javascript
#!/usr/bin/env node
import fs from 'fs/promises';
import { generateEmbedding } from '../src/lib/config/ollama.js';

async function generateCopilotContext() {
  // Load current errors
  const errorsRaw = await fs.readFile('reports/latest/errors.jsonl', 'utf-8');
  const errors = errorsRaw.split('\\n').filter(Boolean).map(JSON.parse);

  // Group by error code
  const byCode = {};
  for (const error of errors) {
    if (!byCode[error.code]) byCode[error.code] = [];
    byCode[error.code].push(error);
  }

  // Get top 5 error types
  const topCodes = Object.entries(byCode)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5);

  // Generate context
  const sections = [];
  sections.push('# Phase 72: TypeScript Error Context');
  sections.push('');
  sections.push(\`**Last Updated**: \${new Date().toISOString()}\`);
  sections.push(\`**Total Errors**: \${errors.length}\`);
  sections.push(\`**Ollama Models**: gemma3-legal:latest, embeddinggemma:latest\`);
  sections.push('');
  sections.push('## Top Error Categories');
  sections.push('');

  for (const [code, codeErrors] of topCodes) {
    sections.push(\`### \${codeErrors.length}x \${code}\`);
    sections.push(\`**Pattern**: \${codeErrors[0].message}\`);

    // Show example
    const example = codeErrors[0];
    sections.push('**Example**:');
    sections.push('');
    sections.push(\`File: \${example.file}:\${example.line}\`);
    sections.push(\`\\\`\\\`\\\`typescript\`);
    sections.push(\`// Error: \${example.message}\`);
    sections.push(\`\\\`\\\`\\\`\`);
    sections.push('');
  }

  // Write file
  await fs.mkdir('.github', { recursive: true });
  await fs.writeFile('.github/copilot.md', sections.join('\\n'));
  console.log('✅ Generated .github/copilot.md');
}

generateCopilotContext().catch(console.error);
\`\`\`

**Tasks**:
- [ ] Create `scripts/generate-copilot-context.mjs`
- [ ] Run script
- [ ] Verify `.github/copilot.md` created
- [ ] Test Copilot uses context

---

### Task 2.2: Generate Claude Context
**File**: `claude.md`
**Purpose**: Deep AST analysis patterns

**Script**: `scripts/generate-claude-context.mjs`

\`\`\`javascript
#!/usr/bin/env node
import fs from 'fs/promises';

async function generateClaudeContext() {
  const sections = [];

  sections.push('# Phase 72: Error Pattern Analysis for Claude');
  sections.push('');
  sections.push('## Codebase Context');
  sections.push('');
  sections.push('**Framework**: SvelteKit 2.0');
  sections.push('**TypeScript**: 5.x with strict mode');
  sections.push('**Status**: Post-mojibake cleanup (175K patterns fixed)');
  sections.push('**Remaining Errors**: ~16,444 (primarily parse errors)');
  sections.push('');
  sections.push('## Common Mojibake Patterns');
  sections.push('');
  sections.push('| Before | After | Context |');
  sections.push('|--------|-------|---------|');
  sections.push('| \`number: responseText?\` | \`number; responseText?:\` | Type separator confusion |');
  sections.push('| \`onProgress?: (...) => void: signal\` | \`onProgress?: (...) => void; signal\` | Parameter separator |');
  sections.push('| \`body, JSON.stringify(data)\` | \`body: JSON.stringify(data)\` | Object literal property |');
  sections.push('');
  sections.push('## Fix Strategy');
  sections.push('');
  sections.push('1. **Parse errors (TS1005, TS1128)**: Mojibake cleanup');
  sections.push('2. **Type errors (TS2322)**: Add type annotations');
  sections.push('3. **Module errors (TS2307)**: Fix import paths');
  sections.push('');
  sections.push('## KAG Storage Format');
  sections.push('');
  sections.push('```json');
  sections.push('{');
  sections.push('  "signature": "sha256:...",');
  sections.push('  "error": { "code": "TS1005", "file": "...", "line": 10 },');
  sections.push('  "fix": { "pattern": "mojibake-semicolon", "before": "...", "after": "..." },');
  sections.push('  "verification": { "status": "PASS", "exit_code": 0 }');
  sections.push('}');
  sections.push('```');

  await fs.writeFile('claude.md', sections.join('\\n'));
  console.log('✅ Generated claude.md');
}

generateClaudeContext().catch(console.error);
\`\`\`

**Tasks**:
- [ ] Create `scripts/generate-claude-context.mjs`
- [ ] Run script
- [ ] Verify `claude.md` created

---

### Task 2.3: Generate Gemini Context
**File**: `gemini.md`
**Purpose**: Multi-file dependency analysis

**Script**: `scripts/generate-gemini-context.mjs`

\`\`\`javascript
#!/usr/bin/env node
import fs from 'fs/promises';

async function generateGeminiContext() {
  const sections = [];

  sections.push('# Phase 72: Multi-File Correlation for Gemini');
  sections.push('');
  sections.push('## Critical Path Files');
  sections.push('');
  sections.push('### Fixed (Dec 18, 2025)');
  sections.push('- ✅ \`xhr.ts\` (12 errors → 0)');
  sections.push('- ✅ \`submitWithProgress.ts\` (8 errors → 0)');
  sections.push('');
  sections.push('### High Priority (5+ dependents)');
  sections.push('- \`search-service.ts\` (18 errors, 3 dependents)');
  sections.push('- \`vector-search-client.ts\` (24 errors, 2 dependents)');
  sections.push('');
  sections.push('## Embedding Strategy');
  sections.push('');
  sections.push('**Model**: embeddinggemma:latest (768-dim)');
  sections.push('**Storage**: Qdrant collection \`phase72_error_patterns\`');
  sections.push('**Batch Size**: 100 errors per request');
  sections.push('');
  sections.push('## Auto-Tagging Rules');
  sections.push('');
  sections.push('```javascript');
  sections.push('function autoTag(error) {');
  sections.push('  const tags = [];');
  sections.push('  if (error.code.startsWith("TS10")) tags.push("parse-error");');
  sections.push('  if (error.file.includes("/routes/")) tags.push("sveltekit-route");');
  sections.push('  if (error.file.includes("/lib/api/")) tags.push("api-utility");');
  sections.push('  return tags;');
  sections.push('}');
  sections.push('```');

  await fs.writeFile('gemini.md', sections.join('\\n'));
  console.log('✅ Generated gemini.md');
}

generateGeminiContext().catch(console.error);
\`\`\`

**Tasks**:
- [ ] Create `scripts/generate-gemini-context.mjs`
- [ ] Run script
- [ ] Verify `gemini.md` created

---

## 🔍 Part 3: Error Scanner & Analyzer (60 mins)

### Task 3.1: Enhanced Error Scanner
**File**: `scripts/scan-codebase-errors.mjs`

**Features**:
- Run TypeScript compiler
- Parse errors with file context
- Categorize by SvelteKit type (route/layout/server/component)
- Extract imports/exports for dependency graph
- Generate error summaries with `gemma3-legal:latest`

**Implementation**: See PHASE_72_AI_PIPELINE.md Section "Phase 72.3: Codebase Indexer"

**Tasks**:
- [ ] Create `scripts/scan-codebase-errors.mjs`
- [ ] Implement error categorization
- [ ] Add SvelteKit context detection
- [ ] Build dependency graph
- [ ] Test with current 16,444 errors
- [ ] Output: `reports/error-scan-full.json`

---

### Task 3.2: Code Context Analyzer
**File**: `scripts/analyze-code-context.mjs`

**Features**:
- Parse file to AST (with error recovery)
- Extract ±5 lines around error
- Find related symbols (functions, types, imports)
- Generate semantic summary

**Tasks**:
- [ ] Create `scripts/analyze-code-context.mjs`
- [ ] Implement AST parser with `@typescript-eslint/parser`
- [ ] Add error recovery mode
- [ ] Extract surrounding code context
- [ ] Test with corrupted files

---

## 🧠 Part 4: Embedding & Vector Storage (45 mins)

### Task 4.1: Generate Embeddings
**File**: `scripts/embed-code-knowledge.mjs`

**Features**:
- Use `embeddinggemma:latest` via `getOllamaEndpoint('embedding')`
- Batch process 100 errors at a time
- Calculate severity (critical/high/medium/low)
- Output: `reports/embeddings/error-vectors.json`

**Tasks**:
- [ ] Create `scripts/embed-code-knowledge.mjs`
- [ ] Implement batch processing
- [ ] Add retry logic for timeouts
- [ ] Test with 1000 error sample
- [ ] Verify 768-dim vectors generated

---

### Task 4.2: Store in Qdrant
**File**: `scripts/store-in-qdrant.mjs`

**Features**:
- Upsert vectors in batches of 100
- Add metadata (error_code, severity, file_path)
- Auto-tag by file category
- Create payload indexes

**Tasks**:
- [ ] Create `scripts/store-in-qdrant.mjs`
- [ ] Implement batch upsert
- [ ] Add auto-tagging function
- [ ] Test with embeddings from Task 4.1
- [ ] Verify vectors searchable

---

## 🤖 Part 5: Smart Error Fixer (90 mins)

### Task 5.1: Implement Smart Fixer
**File**: `scripts/smart-error-fixer.mjs`

**Workflow**:
1. **KAG Cache Lookup** (Redis) - Exact match by signature
2. **Vector Search** (Qdrant) - Semantic similarity (threshold: 0.85)
3. **LLM Fallback** (Ollama gemma3-legal:latest) - Generate new fix
4. **Validation** - Run `npx tsc --noEmit` on temp file
5. **Store Success** - Save to KAG + update Qdrant verified flag

**Tasks**:
- [ ] Create `scripts/smart-error-fixer.mjs`
- [ ] Implement KAG lookup
- [ ] Add Qdrant semantic search
- [ ] Implement LLM fix generation
- [ ] Add validation gate
- [ ] Test with 10 error sample

---

### Task 5.2: Batch Processing Pipeline
**File**: `scripts/run-phase72-pipeline.mjs`

**Features**:
- Process errors in batches of 100
- Track success/failure rates
- Generate progress reports
- Auto-retry failed fixes

**Tasks**:
- [ ] Create `scripts/run-phase72-pipeline.mjs`
- [ ] Implement batch orchestration
- [ ] Add progress tracking
- [ ] Generate completion report
- [ ] Test with 500 error batch

---

## 📊 Part 6: Validation & Metrics (30 mins)

### Task 6.1: Measure KAG Cache Hit Rate
**Script**: `scripts/measure-kag-performance.mjs`

\`\`\`javascript
#!/usr/bin/env node
import Redis from 'ioredis';

const redis = new Redis({ host: '127.0.0.1', port: 4005 });

async function measureKagPerformance() {
  const keys = await redis.keys('phase72:kag:fix:*');
  console.log(\`\\n📊 KAG Performance Metrics\`);
  console.log(\`Total cached fixes: \${keys.length}\`);

  // Get stats
  const stats = await redis.get('phase72:kag:stats');
  if (stats) {
    const parsed = JSON.parse(stats);
    console.log(\`Cache hits: \${parsed.hits}\`);
    console.log(\`Cache misses: \${parsed.misses}\`);
    console.log(\`Hit rate: \${((parsed.hits / (parsed.hits + parsed.misses)) * 100).toFixed(1)}%\`);
  }

  await redis.quit();
}

measureKagPerformance().catch(console.error);
\`\`\`

**Tasks**:
- [ ] Create `scripts/measure-kag-performance.mjs`
- [ ] Run after first batch
- [ ] Run after second batch (measure cache hits)
- [ ] Target: >70% hit rate on second run

---

### Task 6.2: Generate Completion Report
**Script**: `scripts/generate-phase72-report.mjs`

**Metrics to Track**:
- TypeScript errors: Before → After
- KAG cache size & hit rate
- Qdrant vector count
- Fix success rate
- Processing time
- Files with 5+ errors (before/after)

**Tasks**:
- [ ] Create `scripts/generate-phase72-report.mjs`
- [ ] Generate final metrics
- [ ] Export to `reports/PHASE_72_COMPLETE.md`

---

## 🎯 Execution Order

### Day 1 (Today - Dec 18)
1. ✅ Part 1.1: Verify Ollama models (10 min)
2. ⏳ Part 1.2: Configure Ollama endpoint (20 min)
3. ⏳ Part 1.3: Setup Qdrant collection (10 min)
4. ⏳ Part 2.1: Generate copilot.md (15 min)
5. ⏳ Part 2.2: Generate claude.md (15 min)
6. ⏳ Part 2.3: Generate gemini.md (15 min)

**Total**: ~90 minutes

### Day 2 (Dec 19)
1. Part 3.1: Enhanced error scanner (40 min)
2. Part 3.2: Code context analyzer (20 min)
3. Part 4.1: Generate embeddings (30 min)
4. Part 4.2: Store in Qdrant (15 min)

**Total**: ~105 minutes

### Day 3 (Dec 20)
1. Part 5.1: Smart error fixer (60 min)
2. Part 5.2: Batch pipeline (30 min)
3. Test with 100 error sample (15 min)

**Total**: ~105 minutes

### Day 4-5 (Dec 21-22)
1. Process all 16,444 errors in batches
2. Measure KAG cache hit rate
3. Generate completion report
4. Document lessons learned

---

## 📈 Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| TypeScript Errors | <1,000 | 16,444 |
| KAG Cache Hits | >70% | 0% |
| Vector Search Precision | >80% | N/A |
| Fix Success Rate | >90% | 0% |
| Processing Time (100 errors) | <5 min | N/A |

---

## 🔗 Key File Locations

| Component | Path | Status |
|-----------|------|--------|
| Ollama Config | `src/lib/config/ollama.ts` | ❌ TBD |
| Copilot Context | `.github/copilot.md` | ❌ TBD |
| Claude Context | `claude.md` | ❌ TBD |
| Gemini Context | `gemini.md` | ❌ TBD |
| Error Scanner | `scripts/scan-codebase-errors.mjs` | ❌ TBD |
| Embedder | `scripts/embed-code-knowledge.mjs` | ❌ TBD |
| Qdrant Setup | `scripts/setup-qdrant-phase72.mjs` | ❌ TBD |
| Smart Fixer | `scripts/smart-error-fixer.mjs` | ❌ TBD |
| Pipeline | `scripts/run-phase72-pipeline.mjs` | ❌ TBD |

---

## 🚀 Quick Start (Next 30 Minutes)

\`\`\`powershell
# 1. Verify Ollama models
ollama list

# 2. Create Ollama config
# Create src/lib/config/ollama.ts (see Task 1.2)

# 3. Setup Qdrant
npm install @qdrant/js-client-rest
node scripts/setup-qdrant-phase72.mjs

# 4. Generate LLM context files
node scripts/generate-copilot-context.mjs
node scripts/generate-claude-context.mjs
node scripts/generate-gemini-context.mjs

# 5. Test embedding generation
node -e "import('./src/lib/config/ollama.js').then(m => m.generateEmbedding('test error').then(console.log))"
\`\`\`

---

## 📝 Notes

**Ollama Model Changes**:
- ✅ `gemma3-legal:latest` - Legal analysis (replaces gemma2:2b for complex errors)
- ✅ `embeddinggemma:latest` - Embeddings (768-dim, optimized for code)
- ✅ `gemma2:2b` - Fast fixes (fallback for simple patterns)

**Redis Docker Alternative**:
\`\`\`powershell
# If Redis native crashes, use Docker:
docker run -d -p 4005:6379 --name phase66-redis redis/redis-stack:latest
\`\`\`

**Why Syntax Errors Persist**:
1. **Incomplete mojibake cleanup**: `mojibake-cleanup.mjs` missed edge cases
2. **Missing imports**: Some files have circular dependencies
3. **Type corruption**: `unknown satisfies` patterns need manual review
4. **Fast MCP + Agentic Tool**: Phase 73 will automate with AST transformations

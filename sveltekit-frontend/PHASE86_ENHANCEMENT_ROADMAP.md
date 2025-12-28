# Phase 86: Production-Ready Autonomous Error Fixing

## ✅ Status: Server Running (10 Tools Available)

**FastMCP Server**: `http://127.0.0.1:3002`
**Phase 87 Pipeline**: 100 errors ingested, 55,561 vectors across 15 Qdrant collections

---

## 🎯 Phase 86 Enhancement Roadmap

### 1️⃣ Add Preflight Health Checks ⏳ PENDING
**Goal**: Make Phase86 resilient to server restarts
**Implementation**: `scripts/phase86-autonomous-loop.mjs`

```javascript
let cachedTools = null;
let cachedHealthTimestamp = 0;

async function ensureMcpReady(retries = 3, backoffMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const healthRes = await fetch('http://127.0.0.1:3002/health', {
        signal: AbortSignal.timeout(5000)
      });
      const health = await healthRes.json();

      const toolsRes = await fetch('http://127.0.0.1:3002/tools');
      const toolsData = await toolsRes.json();

      cachedTools = toolsData.tools;
      cachedHealthTimestamp = Date.now();

      console.log(`✅ MCP Ready: ${cachedTools.length} tools`);
      return true;
    } catch (e) {
      if (i < retries - 1) {
        const delay = backoffMs * Math.pow(2, i); // Exponential backoff
        console.warn(`⏳ MCP not ready, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new Error('❌ MCP server unavailable after retries');
}

// Call before every autonomous cycle
await ensureMcpReady();
```

**Invariant**: Phase86 NEVER depends on terminal state - always verifies server programmatically.

---

### 2️⃣ Add Structured Tools (read_file + ripgrep) 🔨 IN PROGRESS
**Goal**: Enable precise code context retrieval

#### read_file with Line Ranges
**File**: `scripts/fastmcp-server.mjs` (line 112)

**Current Code**:
```javascript
async function readFile(args) {
  const { filepath } = args;
  const fs = await import('fs/promises');
  const content = await fs.readFile(filepath, 'utf-8');
  return { content: [{ type: "text", text: content }] };
}
```

**Enhanced Code**:
```javascript
async function readFile(args) {
  const { filepath, startLine, endLine } = args;
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(filepath, 'utf-8');

    // If no line range specified, return full file
    if (!startLine && !endLine) {
      return {
        content: [{ type: "text", text: content }],
        totalLines: content.split('\n').length
      };
    }

    // Extract line range
    const lines = content.split('\n');
    const start = Math.max(0, (startLine || 1) - 1); // 1-indexed to 0-indexed
    const end = Math.min(lines.length, endLine || lines.length);

    const snippet = lines.slice(start, end).join('\n');

    return {
      content: [{ type: "text", text: snippet }],
      startLine: start + 1,
      endLine: end,
      totalLines: lines.length
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}
```

**Usage**:
```javascript
// Get 40 lines around error (line 100, ±20)
const context = await callAgent('read_file', {
  filepath: './src/routes/+page.svelte',
  startLine: 80,
  endLine: 120
});
```

#### ripgrep with Symbol Search
**File**: `scripts/fastmcp-server.mjs` (line 215)

**Current Code**: Unknown (need to check implementation)

**Enhanced Code**:
```javascript
async function ripgrep(args) {
  const { pattern, globs = [], maxResults = 100, cwd = process.cwd() } = args;
  const { execSync } = await import('child_process');

  try {
    const globArgs = globs.length > 0
      ? globs.map(g => `-g "${g}"`).join(' ')
      : '';

    const cmd = `rg --json --max-count ${maxResults} ${globArgs} "${pattern}" "${cwd}"`;
    const stdout = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

    const matches = [];
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'match') {
          matches.push({
            file: parsed.data.path.text,
            line: parsed.data.line_number,
            column: parsed.data.submatches[0]?.start || 0,
            text: parsed.data.lines.text.trim()
          });
        }
      } catch (e) {
        // Skip malformed JSON lines
      }
    }

    return {
      matches,
      count: matches.length,
      truncated: matches.length === maxResults
    };
  } catch (error) {
    // ripgrep exits with code 1 if no matches found
    if (error.status === 1) {
      return { matches: [], count: 0, truncated: false };
    }
    throw new Error(`Ripgrep failed: ${error.message}`);
  }
}
```

**Usage**:
```javascript
// Find all Svelte 5 runes usage
const results = await callAgent('ripgrep', {
  pattern: '\\$state\\(',
  globs: ['*.svelte', '*.ts'],
  maxResults: 50
});
```

---

### 3️⃣ Implement RAG-First Loop ⏳ PENDING
**Goal**: Deterministic retrieval order for optimal fix quality

**File**: `scripts/phase86-autonomous-loop.mjs` (or create new)

**Pipeline**:
```
┌─────────────────┐
│ 1. Postgres     │  SELECT * FROM ts_errors WHERE status='open'
│    Priority Q   │  ORDER BY impact_score DESC LIMIT 1
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. read_file    │  Get ±40 lines around error location
│    Context      │  filepath, startLine: line-40, endLine: line+40
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Qdrant       │  Embed [code + error + filepath]
│    Semantic     │  Search: phase72_ast_knowledge_base
│    Search       │  TopK: 8, threshold: 0.7
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. pgvector     │  SELECT ... FROM error_embeddings
│    HNSW Index   │  WHERE 1 - (embedding <=> $1) > 0.75
│                 │  ORDER BY similarity DESC LIMIT 10
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. KAG Graph    │  SELECT * FROM knowledge_graph
│    Expansion    │  WHERE source_id = $errorId OR target_id = $errorId
│                 │  Fetch connected patterns
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Generate Fix │  Combine: code context + top patterns + graph links
│    Smallest     │  Constraint: Max 30 lines, 1 file
│    Patch        │  Prefer: Single-line fixes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Verify       │  callAgent('run_command', {
│    TSC + Diff   │    command: 'npx tsc --noEmit --pretty false'
│                 │  })
│                 │  Compare error counts: before vs after
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Update KB    │  If successful:
│    Postgres +   │  - INSERT INTO fix_attempts (success=true)
│    Qdrant       │  - UPDATE knowledge_graph (confidence += 0.1)
│                 │  - Embed successful patch → Qdrant
└─────────────────┘
```

**Implementation**:
```javascript
async function ragFirstFixCycle() {
  await ensureMcpReady(); // Preflight check

  // 1. Get highest priority error
  const pgRes = await callAgent('postgres_query', {
    query: `SELECT id, file, line, code, message, impact_score
            FROM ts_errors
            WHERE status = 'open'
            ORDER BY impact_score DESC
            LIMIT 1`
  });

  if (pgRes.result.rows.length === 0) {
    console.log('🎉 No open errors!');
    return { done: true };
  }

  const error = pgRes.result.rows[0];
  console.log(`🎯 Fixing: ${error.code} in ${error.file}:${error.line}`);

  // 2. Get code context (±40 lines)
  const contextRes = await callAgent('read_file', {
    filepath: error.file,
    startLine: Math.max(1, error.line - 40),
    endLine: error.line + 40
  });

  const codeContext = contextRes.result.content[0].text;

  // 3. Qdrant semantic search
  const qdrantRes = await callAgent('qdrant_search', {
    collection: 'phase72_ast_knowledge_base',
    query: `${codeContext}\n\nError: ${error.code} - ${error.message}\nFile: ${error.file}`,
    topK: 8,
    scoreThreshold: 0.7
  });

  const topPatterns = qdrantRes.result.results;

  // 4. pgvector HNSW search
  const pgvectorRes = await callAgent('postgres_query', {
    query: `SELECT pattern, fix_template, confidence, example_files
            FROM error_embeddings
            WHERE 1 - (embedding <=> (
              SELECT embedding FROM ts_errors WHERE id = $1
            )) > 0.75
            ORDER BY embedding <=> (
              SELECT embedding FROM ts_errors WHERE id = $1
            ) ASC
            LIMIT 10`,
    params: [error.id]
  });

  const similarErrors = pgvectorRes.result.rows;

  // 5. Knowledge graph expansion
  const kgRes = await callAgent('postgres_query', {
    query: `SELECT * FROM knowledge_graph
            WHERE source_id = $1 OR target_id = $1
            ORDER BY confidence DESC`,
    params: [error.id]
  });

  const graphLinks = kgRes.result.rows;

  // 6. Generate fix (combine all context)
  const fixPrompt = `
Fix this TypeScript error with the SMALLEST possible patch (max 30 lines):

**Error**: ${error.code} - ${error.message}
**Location**: ${error.file}:${error.line}

**Code Context**:
\`\`\`typescript
${codeContext}
\`\`\`

**Top Similar Patterns** (Qdrant):
${topPatterns.map(p => `- ${p.payload.pattern} (score: ${p.score})`).join('\n')}

**Similar Fixes** (pgvector HNSW):
${similarErrors.map(e => `- Pattern: ${e.pattern}\n  Fix: ${e.fix_template}`).join('\n\n')}

**Related Errors** (KAG):
${graphLinks.map(l => `- ${l.relationship}: ${l.target_pattern}`).join('\n')}

Return ONLY a unified diff patch. Prefer single-line fixes.
`;

  // Call LLM agent (Gemma3 via Ollama)
  const fixRes = await callAgent('llm_generate', {
    prompt: fixPrompt,
    maxTokens: 500,
    temperature: 0.1 // Low temperature for deterministic fixes
  });

  const patch = fixRes.result.text;

  // 7. Apply patch + verify
  await callAgent('write_file', {
    filepath: error.file,
    content: applyPatch(codeContext, patch) // Apply unified diff
  });

  const tscRes = await callAgent('run_command', {
    command: 'npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS"'
  });

  const newErrorCount = parseInt(tscRes.result.stdout.trim());
  const oldErrorCount = await getErrorCount(); // From Postgres

  // 8. Update knowledge bases
  if (newErrorCount < oldErrorCount) {
    console.log(`✅ Fixed! Errors: ${oldErrorCount} → ${newErrorCount}`);

    await callAgent('postgres_query', {
      query: `INSERT INTO fix_attempts
              (error_id, patch, success, error_delta, timestamp)
              VALUES ($1, $2, true, $3, NOW())`,
      params: [error.id, patch, oldErrorCount - newErrorCount]
    });

    // Update graph confidence
    await callAgent('postgres_query', {
      query: `UPDATE knowledge_graph
              SET confidence = LEAST(confidence + 0.1, 1.0)
              WHERE source_id = $1`,
      params: [error.id]
    });

    // Embed successful patch → Qdrant
    await callAgent('qdrant_upsert', {
      collection: 'successful_fixes',
      points: [{
        id: `fix_${error.id}_${Date.now()}`,
        vector: await embed(patch),
        payload: {
          errorCode: error.code,
          patch,
          file: error.file,
          timestamp: new Date().toISOString()
        }
      }]
    });

    return { success: true, errorDelta: oldErrorCount - newErrorCount };
  } else {
    console.log(`❌ Fix worsened errors: ${oldErrorCount} → ${newErrorCount}`);

    // Rollback
    await callAgent('run_command', {
      command: 'git restore .'
    });

    // Log failed attempt
    await callAgent('postgres_query', {
      query: `INSERT INTO fix_attempts
              (error_id, patch, success, error_delta, timestamp)
              VALUES ($1, $2, false, $3, NOW())`,
      params: [error.id, patch, newErrorCount - oldErrorCount]
    });

    return { success: false, errorDelta: newErrorCount - oldErrorCount };
  }
}
```

---

### 4️⃣ Scale Embeddings (100 → 10,000) 🔥 HIGH PRIORITY
**Goal**: Increase retrieval coverage from 0.3% to 30% of error corpus

**Current State**:
- **Ingested**: 100 errors (phase87-ingest-error-corpus.mjs)
- **Total Corpus**: 33,599 TypeScript errors
- **Coverage**: 0.3%

**Target State**:
- **Phase 1**: 10,000 errors (30% coverage)
- **Phase 2**: 33,599 errors (100% coverage)

**File**: `scripts/phase87-ingest-error-corpus.mjs`

**Changes**:
```javascript
// Remove sample limit
const BATCH_SIZE = 1000; // Process 1000 at a time
const TARGET_ERRORS = 10000; // Phase 1 target

// Prioritize high-impact error codes
const PRIORITY_CODES = ['TS1005', 'TS1128', 'TS1109', 'TS2307', 'TS2345'];

const query = `
  SELECT id, file, line, column, code, message, context, impact_score
  FROM ts_errors
  WHERE status = 'open'
  AND code IN (${PRIORITY_CODES.map((_, i) => `$${i + 1}`).join(',')})
  ORDER BY impact_score DESC
  LIMIT ${TARGET_ERRORS}
`;

const errors = await pg.query(query, PRIORITY_CODES);

// Batch embed + upsert to Qdrant
for (let i = 0; i < errors.rows.length; i += BATCH_SIZE) {
  const batch = errors.rows.slice(i, i + BATCH_SIZE);

  console.log(`📦 Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(errors.rows.length / BATCH_SIZE)}`);

  const points = await Promise.all(batch.map(async (error) => {
    const embedding = await embed(`${error.code}: ${error.message}\n${error.context}`);

    return {
      id: `error_${error.id}`,
      vector: embedding,
      payload: {
        errorId: error.id,
        code: error.code,
        message: error.message,
        file: error.file,
        line: error.line,
        impactScore: error.impact_score
      }
    };
  }));

  await qdrant.upsert('phase87_error_corpus', { points });

  // Also store in pgvector for HNSW hybrid search
  for (const point of points) {
    await pg.query(`
      INSERT INTO error_embeddings (error_id, embedding, indexed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (error_id) DO UPDATE SET embedding = $2, indexed_at = NOW()
    `, [point.payload.errorId, point.vector]);
  }
}
```

**Command**:
```bash
node scripts/phase87-ingest-error-corpus.mjs --target 10000 --codes TS1005,TS1128,TS1109,TS2307,TS2345
```

**Expected Impact**:
- ✅ 100x more retrieval candidates
- ✅ Better coverage of rare error patterns
- ✅ HNSW index scales to 10k vectors (optimal performance)

---

### 5️⃣ Fix "Pattern: undefined" in Knowledge Graph 🐛 BUG FIX
**Goal**: Replace undefined pattern extraction with deterministic labels

**Current Issue**:
```
Pattern: undefined
Pattern: undefined
Pattern: undefined
```

**Root Cause**: Pattern extraction from error messages is unreliable

**Solution**: Use **deterministic pattern labeling** based on error code + message structure

**File**: `scripts/phase87-knowledge-sync.mjs` or knowledge graph builder

**Pattern Rules**:
```javascript
const PATTERN_RULES = {
  TS1005: (message) => {
    if (message.includes("','")) return 'missing-comma';
    if (message.includes("';'")) return 'missing-semicolon';
    if (message.includes("'>'")) return 'colon-in-generic';
    if (message.includes("')'")) return 'missing-closing-paren';
    if (message.includes("'{'")) return 'missing-opening-brace';
    return 'missing-delimiter';
  },

  TS1128: (message) => {
    if (message.includes('Declaration or statement')) return 'unterminated-declaration';
    if (message.includes('expression')) return 'unterminated-expression';
    return 'unterminated-statement';
  },

  TS1109: (message) => {
    if (message.includes('closing tag')) return 'dangling-jsx-expression';
    if (message.includes('template')) return 'dangling-template-expression';
    return 'dangling-expression';
  },

  TS2307: (message) => {
    const match = message.match(/Cannot find module '([^']+)'/);
    if (match) {
      const moduleName = match[1];
      if (moduleName.startsWith('.')) return 'missing-local-import';
      if (moduleName.startsWith('$')) return 'missing-svelte-alias';
      return 'missing-npm-package';
    }
    return 'module-not-found';
  },

  TS2345: (message) => {
    if (message.includes('undefined')) return 'type-undefined-mismatch';
    if (message.includes('null')) return 'type-null-mismatch';
    if (message.includes('string')) return 'type-string-mismatch';
    if (message.includes('number')) return 'type-number-mismatch';
    return 'type-argument-mismatch';
  }
};

function extractPattern(errorCode, message) {
  const rule = PATTERN_RULES[errorCode];
  if (!rule) {
    return `${errorCode}-unknown`;
  }
  return `${errorCode}:${rule(message)}`;
}
```

**Usage in Knowledge Graph**:
```javascript
await pg.query(`
  INSERT INTO knowledge_graph (source_id, target_id, relationship, pattern, confidence)
  VALUES ($1, $2, $3, $4, $5)
`, [
  error.id,
  relatedError.id,
  'causes',
  extractPattern(error.code, error.message), // ✅ Deterministic!
  0.8
]);
```

**Expected Output**:
```
Pattern: TS1005:missing-comma
Pattern: TS1128:unterminated-declaration
Pattern: TS2307:missing-svelte-alias
```

---

### 6️⃣ Add Budget Constraints 🛡️ SAFETY
**Goal**: Prevent runaway autonomous fixing

**File**: `scripts/phase86-autonomous-loop.mjs`

**Constraints**:
```javascript
const BUDGET = {
  maxFilesPerIteration: 1,         // Only fix 1 file at a time
  maxLinesPerPatch: 30,            // Prefer small surgical fixes
  stopIfWorsens: true,             // Rollback if error count increases
  maxIterations: 100,              // Stop after 100 fixes
  maxConsecutiveFailures: 5,       // Stop if 5 fixes fail in a row
  minConfidenceThreshold: 0.85,    // Only apply high-confidence fixes
  requireHumanApprovalAbove: 50    // Ask for approval if patch > 50 lines
};

let consecutiveFailures = 0;

async function autonomousLoop() {
  for (let i = 0; i < BUDGET.maxIterations; i++) {
    console.log(`\n🔄 Iteration ${i + 1}/${BUDGET.maxIterations}`);

    const result = await ragFirstFixCycle();

    if (result.done) {
      console.log('🎉 All errors fixed!');
      break;
    }

    // Check budget constraints
    if (result.success) {
      consecutiveFailures = 0;
      console.log(`✅ Success! ${result.errorDelta} errors fixed`);
    } else {
      consecutiveFailures++;
      console.log(`❌ Failed. Consecutive failures: ${consecutiveFailures}`);

      if (consecutiveFailures >= BUDGET.maxConsecutiveFailures) {
        console.log('🛑 Too many consecutive failures. Stopping.');
        break;
      }

      if (BUDGET.stopIfWorsens && result.errorDelta > 0) {
        console.log('🛑 Error count increased. Stopping.');
        break;
      }
    }

    // Rate limiting (don't hammer the system)
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

### 7️⃣ Production Readiness Checklist ✅ VALIDATION

- [ ] **Preflight checks**: Health + tools with retry/backoff
- [ ] **read_file**: Line range support (startLine, endLine)
- [ ] **ripgrep**: Pattern search with globs + maxResults
- [ ] **RAG-first loop**: Postgres → read_file → Qdrant → pgvector → KAG → fix → verify
- [ ] **Embeddings**: 10,000 errors ingested (TS1005, TS1128, TS1109 priority)
- [ ] **Knowledge graph**: Deterministic pattern labels (no more "undefined")
- [ ] **Budget constraints**: Max 1 file, max 30 lines, stop if worsens, max 100 iterations
- [ ] **Logging**: Structured JSON logs for all fix attempts
- [ ] **Rollback**: Git restore on failed fixes
- [ ] **Confidence threshold**: Only apply fixes with >0.85 confidence

---

## 📊 Current Metrics (Phase 87 Baseline)

| Metric                | Value           |
|-----------------------|-----------------|
| Errors Ingested       | 100             |
| Qdrant Collections    | 15              |
| Total Vectors         | 55,561          |
| Postgres Tables       | 4 (ts_errors, error_embeddings, knowledge_graph, fix_attempts) |
| HNSW Index Params     | m=16, ef_construction=64 |
| Embedding Model       | embeddinggemma:latest (768D) |
| pgvector Similarity   | Cosine distance (1 - <=> operator) |
| Knowledge Graph Links | 10              |

---

## 🚀 Next Steps

1. **Run tool tests** to validate current FastMCP state
2. **Implement read_file line ranges** (30 min)
3. **Add preflight checks** to Phase86 (15 min)
4. **Fix "Pattern: undefined"** with deterministic labels (30 min)
5. **Scale embeddings to 10k** (2-3 hours - embedding time)
6. **Implement RAG-first loop** (1-2 hours)
7. **Add budget constraints** (30 min)
8. **Test full autonomous cycle** with 10 errors
9. **Scale to 100 errors** if successful
10. **Scale to 10k errors** (production deployment)

---

**Status**: Ready to implement Phase86 enhancements. Server is running, Phase87 pipeline is operational.

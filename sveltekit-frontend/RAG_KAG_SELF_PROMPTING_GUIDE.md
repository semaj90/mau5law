# Phase 72 - RAG/KAG Integration with Self-Prompting

Complete LangChain-style contextual prompt engineering system for AST knowledge base analysis.

## 🏗️ Architecture

```
AST Analysis → Knowledge Base Graph → RAG/KAG Integration → Self-Prompting Agent → Recommendations
     ↓                    ↓                     ↓                      ↓                  ↓
2,242 files      nodes/edges/trees       Qdrant vectors        Tool calling         Actionable fixes
```

## 📦 Components Created

### 1. **rag-kag-ast-integrator.mjs** - Knowledge Base Loader
Embeds AST knowledge base into Qdrant for semantic search.

**Features:**
- Load Tree Adapter format (`project-knowledge-base.tree.json`)
- Generate embeddings for code structure (files + metadata)
- Create semantic clusters for RAG context
- Self-prompting recommendations engine
- LangChain-style contextual prompt engineering

**Usage:**
```bash
# Load knowledge base into RAG/KAG
node scripts/rag-kag-ast-integrator.mjs --kb project-knowledge-base.tree.json

# Load + generate recommendations automatically
node scripts/rag-kag-ast-integrator.mjs --auto-recommendations
```

**What it does:**
1. Loads AST knowledge base (nodes, edges, clusters)
2. Creates Qdrant collection: `phase72_ast_knowledge_base`
3. Generates embeddings for each file:
   ```
   File: src/lib/services/auth.ts
   Type: file
   Imports: 12
   Exports: 5
   Symbols: 23
   Errors: 8
   ```
4. Embeds semantic clusters (directories)
5. **Self-prompts Ollama** to analyze patterns:
   - High error files (>50 errors)
   - High import files (>10 imports - tight coupling)
   - Large clusters (>20 files - potential for splitting)
6. Generates recommendations in `ast-rag-recommendations.md`

**Output:**
- Embeddings in Qdrant (`phase72_ast_knowledge_base` collection)
- Recommendations saved to `reports/latest/ast-rag-recommendations.md`

---

### 2. **contextual-prompt-engineer.mjs** - Self-Prompting Agent
LangChain-style agent with tool calling and iterative refinement.

**Features:**
- **Tool 1:** Query knowledge base (semantic search)
- **Tool 2:** Search errors (find similar patterns)
- **Tool 3:** Analyze clusters (semantic groupings)
- **Self-reflection:** Validate recommendations
- **Memory:** Track tool calls + previous suggestions

**Usage:**
```bash
# Single iteration
node scripts/contextual-prompt-engineer.mjs --task "Fix circular dependencies"

# Multiple iterations with refinement
node scripts/contextual-prompt-engineer.mjs --task "Reduce high error files" --iterations 3
```

**Agent Workflow:**
```
Phase 1: Gather Context
   ↓
   Tool: Query KB ("Fix circular dependencies")
   Tool: Search Errors ("circular reference")
   Tool: Analyze Clusters
   ↓
Phase 2: Generate Recommendations
   ↓
   Ollama (gemma3-legal) → 3-5 recommendations
   ↓
Phase 3: Self-Reflection
   ↓
   Validate assumptions
   Identify missing context
   Assess risks
   ↓
[Repeat if iterations > 1]
```

**Output:**
- `contextual-prompt-engineering-results.md` with:
  - Recommendations per iteration
  - Self-reflections
  - Tool call history
  - Agent memory summary

---

## 🚀 Complete Pipeline

### Step 1: Generate AST Knowledge Base
```bash
# Analyze entire project (2,242 files)
node scripts/ast-error-analyzer.mjs --graph project-knowledge-base.json

# Generates 5 formats:
# - project-knowledge-base.json (complete)
# - project-knowledge-base.cypher (Neo4j)
# - project-knowledge-base.d3.json (D3.js)
# - project-knowledge-base.dot (Graphviz)
# - project-knowledge-base.tree.json (Tree Adapter - for RAG/KAG)
```

**Status:** ⏳ Currently running (processing src/lib/api/* files)

---

### Step 2: Load into RAG/KAG System
```bash
# Embed knowledge base into Qdrant
node scripts/rag-kag-ast-integrator.mjs --kb project-knowledge-base.tree.json --auto-recommendations
```

**What happens:**
1. Creates Qdrant collection: `phase72_ast_knowledge_base`
2. Embeds all 2,242 files (file metadata + context)
3. Embeds semantic clusters (directory groupings)
4. Self-prompts Ollama to analyze patterns
5. Generates recommendations

**Output:**
- Qdrant vectors: `http://localhost:6333/collections/phase72_ast_knowledge_base`
- Recommendations: `reports/latest/ast-rag-recommendations.md`

---

### Step 3: Self-Prompting Contextual Engineering
```bash
# Run agent with specific task
node scripts/contextual-prompt-engineer.mjs \
  --task "Prioritize fixing files with >100 errors" \
  --iterations 2
```

**What happens:**
1. **Iteration 1:**
   - Query KB for high-error files
   - Search similar errors
   - Analyze clusters
   - Generate 3-5 recommendations
   - Self-reflect on assumptions

2. **Iteration 2:**
   - Use reflection from Iteration 1
   - Refine query based on feedback
   - Re-analyze with new context
   - Generate improved recommendations

**Output:**
- `contextual-prompt-engineering-results.md` with:
  - All iterations
  - Self-reflections
  - Tool call history

---

## 🧠 LangChain-Style Features

### Tool Calling
```javascript
// Agent has 3 tools available:
const tools = [
  toolQueryKnowledgeBase,  // Semantic search in AST knowledge base
  toolSearchErrors,        // Find similar errors via embeddings
  toolAnalyzeClusters      // Analyze semantic groupings
];

// Agent calls tools dynamically based on task
const kbResults = await toolQueryKnowledgeBase("Fix circular deps", 10);
const errorResults = await toolSearchErrors("circular reference", 10);
const clusters = await toolAnalyzeClusters();
```

### Self-Reflection
```javascript
// After generating recommendations, agent reflects:
const reflection = await ollama.chat({
  messages: [
    { role: 'system', content: 'You are a critical reviewer' },
    { role: 'user', content: 'Review your recommendation: ...' }
  ]
});

// Reflection guides next iteration
agentMemory.reflections.push(reflection);
```

### Memory
```javascript
// Agent maintains context across iterations:
const agentMemory = {
  toolCalls: [
    { tool: 'queryKnowledgeBase', query: '...', resultCount: 10 },
    { tool: 'searchErrors', query: '...', resultCount: 5 }
  ],
  reflections: [
    "Need more context on import graph",
    "Should analyze cluster size distribution"
  ],
  recommendations: [ /* all iterations */ ]
};
```

---

## 📊 Integration with Phase 72 Pipeline

```
Phase 72 Pipeline (Complete):

1. Generate errors.jsonl           ✅ Done (16,436 errors)
   └─ npm run check:ultra-fast

2. Generate embeddings              ⏳ 6.8% (Ollama embeddinggemma)
   └─ node scripts/embed-errors-batch-optimized.mjs

3. AST analysis                     ⏳ Running (2,242 files)
   └─ node scripts/ast-error-analyzer.mjs

4. RAG/KAG integration              🔄 Ready (waiting for AST)
   └─ node scripts/rag-kag-ast-integrator.mjs

5. Self-prompting recommendations   🔄 Ready
   └─ node scripts/contextual-prompt-engineer.mjs

6. Apply fixes                      🔄 Future
   └─ node scripts/fixer-agent-phase73.mjs
```

---

## 🎯 Example Tasks for Self-Prompting Agent

### Task 1: Fix Circular Dependencies
```bash
node scripts/contextual-prompt-engineer.mjs \
  --task "Identify and resolve circular dependencies in import graph" \
  --iterations 2
```

**Expected workflow:**
1. Query KB for files with circular deps
2. Search errors for "circular reference"
3. Analyze cluster structure
4. Recommend: Extract shared code to new module
5. Reflect: Validate no new cycles introduced

---

### Task 2: Reduce High-Error Files
```bash
node scripts/contextual-prompt-engineer.mjs \
  --task "Prioritize fixing files with >100 TypeScript errors" \
  --iterations 3
```

**Expected workflow:**
1. Query KB for high-error files
2. Search for similar error patterns
3. Analyze cluster membership
4. Recommend: Group errors by type (imports, types, syntax)
5. Reflect: Ensure fixes don't break dependencies
6. Iterate: Refine based on reflection

---

### Task 3: Refactor Large Clusters
```bash
node scripts/contextual-prompt-engineer.mjs \
  --task "Suggest splitting large clusters (>50 files) into smaller modules" \
  --iterations 1
```

**Expected workflow:**
1. Query KB for large clusters
2. Analyze file dependencies within cluster
3. Recommend: Split by domain/feature
4. Provide module boundary suggestions

---

## 📈 Expected Results

### After RAG/KAG Integration:
```
✅ RAG/KAG Integration Complete!

📊 Summary:
   Nodes embedded: 2,242
   Clusters processed: 87
   Recommendations: 1
   Self-prompt iterations: 1
   Duration: 12.4 minutes

🔍 Query your knowledge base:
   curl -X POST http://localhost:6333/collections/phase72_ast_knowledge_base/points/search \
     -d '{"vector": [...], "limit": 10}'
```

### After Self-Prompting Agent:
```
✅ Contextual Prompt Engineering Complete!

📊 Summary:
   Iterations: 3
   Tool calls: 9 (3 KB queries, 3 error searches, 3 cluster analyses)
   Recommendations: 3
   Reflections: 2

📄 Results: reports/latest/contextual-prompt-engineering-results.md
```

---

## 🔧 VS Code Tasks (Coming Next)

Will add tasks to `.vscode/tasks.json`:

1. **Phase 72: RAG/KAG Integration**
   ```json
   {
     "label": "🧠 Phase 72: RAG/KAG Integration",
     "command": "node scripts/rag-kag-ast-integrator.mjs --auto-recommendations"
   }
   ```

2. **Phase 72: Self-Prompting Agent**
   ```json
   {
     "label": "🤖 Phase 72: Self-Prompting Agent",
     "command": "node scripts/contextual-prompt-engineer.mjs --task '${input:agentTask}' --iterations 2"
   }
   ```

3. **Phase 72: Full RAG Pipeline**
   ```json
   {
     "label": "🚀 Phase 72: Full RAG Pipeline",
     "dependsOn": [
       "📝 Phase 72: Generate errors.jsonl",
       "🧠 Phase 72: Generate Embeddings",
       "🔍 AST: Full Project Analysis",
       "🧠 Phase 72: RAG/KAG Integration",
       "🤖 Phase 72: Self-Prompting Agent"
     ]
   }
   ```

---

## 📚 Documentation

- **AST_ANALYZER_GUIDE.md** - Complete guide to AST analysis
- **KNOWLEDGE_BASE_FORMATS.md** - Export format reference (520 lines)
- **THIS FILE** - RAG/KAG integration guide

---

## 🎓 Key Concepts

### What is RAG/KAG?
**RAG (Retrieval-Augmented Generation):**
- Retrieve relevant context from knowledge base
- Augment LLM prompt with context
- Generate more accurate responses

**KAG (Knowledge-Augmented Generation):**
- Use structured knowledge graphs
- Traverse relationships (imports, dependencies)
- Generate recommendations based on graph patterns

### What is Self-Prompting?
**Self-prompting = LangChain-style agent pattern:**
1. Agent generates initial recommendation
2. Agent reviews its own output (self-reflection)
3. Agent identifies gaps or assumptions
4. Agent refines recommendation with new context
5. Repeat until confident or max iterations

**Benefits:**
- Higher accuracy (catch errors before applying)
- Better explainability (reasoning chain visible)
- Adaptive (learns from own mistakes)

---

## 🔗 Next Steps

1. ✅ **AST Analysis Complete** - Wait for 2,242 files to finish
2. 🔄 **Run RAG/KAG Integration** - Embed knowledge base
3. 🔄 **Test Self-Prompting Agent** - Example tasks
4. 🔄 **Create VS Code Tasks** - Easy access
5. 🔄 **Integrate with Fixer Agent** - Apply recommendations automatically

---

**Status:** Ready to run once AST analysis completes! 🚀

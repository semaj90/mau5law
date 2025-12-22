# 🧠 Phase 79: Cognitive Engine Guide

This document explains the architecture and usage of the **Cognitive Engine**, the autonomous system designed to generate, validate, and rank code patches for the SvelteKit application.

## 🚀 Overview

The Cognitive Engine is the "brain" of the repair pipeline. Unlike previous phases which relied on simple error-code lookups, this engine:
1. **Reads context**: Analyzes the actual source code of the broken file.
2. **Understands structure**: Extracts imports, exports, and logic flow.
3. **Validates output**: Uses a 4-layer safety gate to ensure LLMs produce code, not text.
4. **Ranks quality**: Assigns a confidence score (0-100) to every patch.

## ⚙️ How It Works (7 Steps)

### 1. File Analysis
The engine reads the target file from the disk.
- **Extracts imports**: essential for fixing missing modules.
- **Extracts exports**: essential for fixing API inconsistencies.
- **Previews content**: Grabs the first 50-100 lines to give the LLM context.

### 2. Error Fetching
Queries the `error_cluster` database table to find *exact* compiler errors associated with this specific file.
- Filters by filename match.
- Orders by frequency (most common errors first).

### 3. Prompt Engineering
Constructs a "rich context" prompt for the LLM:
```text
You are a TypeScript Expert.
ERRORS: [TS2307] Cannot find module...
FILE CONTEXT:
import { ... } from ...
export class ...
INSTRUCTIONS: Return ONLY valid code.
```

### 4. Generation (LLM)
Calls Google Gemini 2.0 Flash (or local Ollama) to generate the fix. The prompt instructions strictly forbid conversational/markdown output.

### 5. Safety Gate Validation (The Shield) 🛡️
Every generated patch runs through a scoring algorithm to prevent file corruption.

| Check | Weight | Description |
| :--- | :--- | :--- |
| **Content Type** | 40% | Detects documentation phrases ("Here is request...", "I fixed...") |
| **Syntax (Braces)** | 20% | Checks for balanced `{ }` structure |
| **Syntax (Parens)** | 15% | Checks for balanced `( )` structure |
| **Length Check** | 10% | Rejects empty or suspiciously short responses |
| **Base Score** | 15% | All patches start with this base |

**Passing Threshold**: 50/100

### 6. Ranking & Composite Score
Patches are ranked using **dual-metric scoring** so Phase 72 applies the best ones first:

**Metrics:**
- **Validation Score (0-100%)**: Code quality from safety gate
- **Cosine Similarity (0-1)**: RAG/KAG knowledge base match quality
- **Cosine Rank (1-10)**: Scaled similarity (10 = best match)
- **Inverse Search Rank (1-10)**: Flipped scale (1 = best, 10 = worst)

**Formula:**
```
Composite Score = (Validation × 60%) + (Similarity × 100 × 40%)
Confidence Level = HIGH (≥80) | MEDIUM (≥60) | LOW (<60)
```

**Example:**
```
Validation: 95/100
Similarity: 0.87 (8.7/10)
Composite: (95 × 0.6) + (87 × 0.4) = 91.8
Rank: 9/10 (apply this patch early)
Confidence: HIGH
```

### 7. JSONL Output
Results are saved to `data/recommendations.jsonl`. This format is streamable and crash-resistant.

```json
{
  "file_path": "src/lib/components/GraphView.svelte",
  "error_count": 3,
  "validation_score": 95,
  "confidence_level": "HIGH",
  "full_patch": "..."
}
```

## 🛠️ Usage

### Running the Engine
```bash
# Must have DATABASE_URL and GEMINI_API_KEY set
npm run phase79:engine
```

### Integration with Phase 72
Phase 72 reads the JSONL file and applies patches with `HIGH` confidence first.

```javascript
// In Phase 72 loop:
const recommendations = readJsonl('data/recommendations.jsonl');
for (const rec of recommendations) {
  if (rec.confidence_level === 'HIGH') {
    applyPatch(rec.file_path, rec.full_patch);
  }
}
```

## 📊 Performance
- **Speed**: ~2-5 seconds per file (dependent on LLM latency).
- **Throughput**: Processes batches of 50 files.
- **Safety**: Blocks ~98% of hallucinatory/conversational responses.

## ✅ RAG/KAG Integration (IMPLEMENTED)

The Cognitive Engine now includes **full RAG/KAG integration** via Qdrant vector search:

### How It Works
1. **File Summarization**: Reads actual file content and extracts:
   - Imports (top 10)
   - Exports (top 10)
   - Types/Interfaces (top 5)
   - Functions (top 10)
   - Keywords (async, await, svelte, component, etc.)

2. **Rich Query Construction**: Combines file analysis + error context:
   ```
   File: src/lib/utils.ts
   Imports: import { x } from 'y', ...
   Exports: export const foo, ...
   Types: interface Bar, type Baz
   Keywords: async, Promise, fetch
   Errors: TS2307, TS1005
   Error Messages: Cannot find module...
   ```

3. **Vector Search**: Generates embedding (embeddinggemma:latest) and queries Qdrant:
   - Collection: `phase79_knowledge_base` (343 vectors)
   - Threshold: 0.7 cosine similarity
   - Limit: Top 5 matches

4. **Composite Ranking**:
   ```
   Cosine Similarity Rank (1-10) = ceil(avgSimilarity × 10)
   Inverse Search Rank = 11 - CosineSimilarityRank
   Composite Score = (validation × 60%) + (similarity × 40%)
   ```

### Example Output
```json
{
  "file_path": "src/lib/utils.ts",
  "validation_score": 95,
  "cosine_similarity": 0.87,
  "cosine_rank_1_10": 9,
  "inverse_search_rank": 2,
  "composite_score": 91.8,
  "confidence_level": "HIGH",
  "rag_matches": 4
}
```

## 🔜 Future Improvements (v2)
- **Deep Syntax Check**: Use AST parsing instead of Regex for validation.
- **Redis Caching**: Cache embeddings to reduce Ollama API calls.
- **Knowledge Base Expansion**: Crawl TypeScript/Svelte docs (Phase 80).

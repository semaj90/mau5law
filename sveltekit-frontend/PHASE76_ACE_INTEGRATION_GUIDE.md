# Phase 76: ACE Multi-Collection Integration Guide

## Overview

This guide explains how to update `phase76-ace-prompt-engineer.mjs` to query **both** Qdrant collections:
1. `phase72_error_patterns` - Error embeddings (53,227 points)
2. `phase76_knowledge_base` - Documentation embeddings (5+ points)

---

## Benefits

### Before (Single Collection)
- ✅ Queries error patterns only
- ❌ No access to documentation knowledge
- ❌ Limited context for complex fixes

### After (Dual Collection)
- ✅ Queries error patterns (what's broken)
- ✅ Queries documentation (how to fix it)
- ✅ Combined context = better solutions
- ✅ Cites official docs in responses

---

## Implementation

### Step 1: Update CONFIG

Add knowledge base collection config:

```javascript
// In CONFIG object
qdrant: {
	url: process.env.QDRANT_URL || 'http://localhost:6333',
	errorCollection: 'phase72_error_patterns',  // Existing
	knowledgeCollection: 'phase76_knowledge_base',  // NEW!
	topK: 10,
	scoreThreshold: 0.7,
	knowledgeThreshold: 0.5  // Lower threshold for docs
}
```

### Step 2: Update performRAGRetrieval()

Query both collections in parallel:

```javascript
async performRAGRetrieval() {
	console.log(chalk.cyan('   📚 Step 1: RAG Retrieval (Semantic Search)'));

	try {
		// Generate embedding for the task query
		const embedding = await this.generateEmbedding(this.task);

		// Query BOTH collections in parallel
		const [errorResults, knowledgeResults] = await Promise.all([
			this.queryQdrantCollection(CONFIG.qdrant.errorCollection, embedding, CONFIG.qdrant.topK, CONFIG.qdrant.scoreThreshold),
			this.queryQdrantCollection(CONFIG.qdrant.knowledgeCollection, embedding, CONFIG.qdrant.topK, CONFIG.qdrant.knowledgeThreshold)
		]);

		console.log(chalk.green(`   ✅ Found ${errorResults.length} error patterns, ${knowledgeResults.length} documentation sources\n`));

		return {
			errors: errorResults,
			knowledge: knowledgeResults
		};

	} catch (error) {
		console.log(chalk.yellow(`   ⚠️  RAG error: ${error.message}, using fallback`));
		return { errors: this.fallbackRAGRetrieval(), knowledge: [] };
	}
}
```

### Step 3: Create queryQdrantCollection() Helper

Reusable collection query method:

```javascript
async queryQdrantCollection(collection, embedding, limit, scoreThreshold) {
	const searchUrl = `${CONFIG.qdrant.url}/collections/${collection}/points/search`;

	try {
		const response = await fetch(searchUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				vector: embedding,
				limit: limit,
				score_threshold: scoreThreshold,
				with_payload: true
			})
		});

		if (!response.ok) {
			console.log(chalk.yellow(`   ⚠️  ${collection} query failed`));
			return [];
		}

		const data = await response.json();
		return data.result || [];

	} catch (error) {
		console.warn(chalk.yellow(`   ⚠️  ${collection} error: ${error.message}`));
		return [];
	}
}
```

### Step 4: Update buildContextualPrompt()

Include documentation knowledge in prompts:

```javascript
buildContextualPrompt(ragResults, kagResults) {
	let prompt = `# ACE Contextual Error Fix Request\n\n`;
	prompt += `**Task**: ${this.task}\n\n`;

	// Error patterns from RAG
	if (ragResults.errors && ragResults.errors.length > 0) {
		prompt += `## Similar Error Patterns (from codebase)\n\n`;
		ragResults.errors.forEach((result, idx) => {
			prompt += `${idx + 1}. **${result.payload.file}** (${(result.score * 100).toFixed(1)}% match)\n`;
			prompt += `   - Error: ${result.payload.message}\n`;
			prompt += `   - Category: ${result.payload.category}\n\n`;
		});
	}

	// Documentation knowledge (NEW!)
	if (ragResults.knowledge && ragResults.knowledge.length > 0) {
		prompt += `## Official Documentation (from knowledge base)\n\n`;
		ragResults.knowledge.forEach((result, idx) => {
			prompt += `${idx + 1}. **${result.payload.title}** (${(result.score * 100).toFixed(1)}% relevance)\n`;
			prompt += `   - Source: ${result.payload.url}\n`;
			prompt += `   - Summary: ${result.payload.summary}\n\n`;
		});
	}

	// KAG results
	if (kagResults.categories && kagResults.categories.length > 0) {
		prompt += `## Related Error Categories (from knowledge graph)\n\n`;
		kagResults.categories.forEach(cat => {
			prompt += `- ${cat.category} (${cat.count} instances)\n`;
		});
		prompt += `\n`;
	}

	// Instructions
	prompt += `## Instructions\n\n`;
	prompt += `Based on the error patterns, documentation, and knowledge graph:\n`;
	prompt += `1. Identify the root cause\n`;
	prompt += `2. Propose a solution citing official documentation\n`;
	prompt += `3. Provide TypeScript/SvelteKit code examples\n`;
	prompt += `4. Estimate fix confidence (0-100%)\n\n`;

	return prompt;
}
```

### Step 5: Update Logging

Show knowledge base results:

```javascript
// In execute() method after performRAGRetrieval()
console.log(chalk.cyan('   📚 Step 1: RAG Retrieval (Semantic Search)'));
const ragResults = await this.performRAGRetrieval();
console.log(chalk.green(`   ✅ Found ${ragResults.errors.length} error patterns, ${ragResults.knowledge.length} docs\n`));
```

---

## Example Output

### Before (Error Patterns Only)
```
📚 Step 1: RAG Retrieval (Semantic Search)
✅ Found 5 relevant errors/entities

# Similar Error Patterns
1. src/lib/services/evidence-service.ts (85.2% match)
   - Error: Type 'Evidence | null' is not assignable...
```

### After (Error Patterns + Documentation)
```
📚 Step 1: RAG Retrieval (Semantic Search)
✅ Found 5 error patterns, 2 documentation sources

# Similar Error Patterns
1. src/lib/services/evidence-service.ts (85.2% match)
   - Error: Type 'Evidence | null' is not assignable...

# Official Documentation
1. TypeScript: Documentation - TypeScript 5.6 (69.7% relevance)
   - Source: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html
   - Summary: TypeScript 5.6 introduces stricter checks...
```

---

## Complete Code Changes

### File: `scripts/phase76-ace-prompt-engineer.mjs`

```javascript
// 1. Update CONFIG
const CONFIG = {
	// ... existing config ...
	qdrant: {
		url: process.env.QDRANT_URL || 'http://localhost:6333',
		errorCollection: 'phase72_error_patterns',
		knowledgeCollection: 'phase76_knowledge_base',  // ADD THIS
		topK: 10,
		scoreThreshold: 0.7,
		knowledgeThreshold: 0.5  // ADD THIS
	},
	// ... rest of config ...
};

// 2. Add queryQdrantCollection() method
async queryQdrantCollection(collection, embedding, limit, scoreThreshold) {
	const searchUrl = `${CONFIG.qdrant.url}/collections/${collection}/points/search`;

	try {
		const response = await fetch(searchUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				vector: embedding,
				limit: limit,
				score_threshold: scoreThreshold,
				with_payload: true
			})
		});

		if (!response.ok) return [];

		const data = await response.json();
		return data.result || [];

	} catch (error) {
		return [];
	}
}

// 3. Update performRAGRetrieval()
async performRAGRetrieval() {
	console.log(chalk.cyan('   📚 Step 1: RAG Retrieval (Semantic Search)'));

	try {
		const embedding = await this.generateEmbedding(this.task);

		const [errorResults, knowledgeResults] = await Promise.all([
			this.queryQdrantCollection(
				CONFIG.qdrant.errorCollection,
				embedding,
				CONFIG.qdrant.topK,
				CONFIG.qdrant.scoreThreshold
			),
			this.queryQdrantCollection(
				CONFIG.qdrant.knowledgeCollection,
				embedding,
				CONFIG.qdrant.topK,
				CONFIG.qdrant.knowledgeThreshold
			)
		]);

		console.log(chalk.green(`   ✅ Found ${errorResults.length} error patterns, ${knowledgeResults.length} docs\n`));

		return {
			errors: errorResults.map(r => ({
				score: r.score,
				file: r.payload.file,
				message: r.payload.message,
				category: r.payload.category
			})),
			knowledge: knowledgeResults.map(r => ({
				score: r.score,
				title: r.payload.title,
				url: r.payload.url,
				summary: r.payload.summary
			}))
		};

	} catch (error) {
		console.log(chalk.yellow(`   ⚠️  RAG error: ${error.message}`));
		return { errors: this.fallbackRAGRetrieval(), knowledge: [] };
	}
}

// 4. Update buildContextualPrompt()
buildContextualPrompt(ragResults, kagResults) {
	let prompt = `# ACE Contextual Error Fix Request\n\n`;
	prompt += `**Task**: ${this.task}\n\n`;

	// Error patterns
	if (ragResults.errors && ragResults.errors.length > 0) {
		prompt += `## Similar Error Patterns\n\n`;
		ragResults.errors.forEach((result, idx) => {
			prompt += `${idx + 1}. **${result.file}** (${(result.score * 100).toFixed(1)}% match)\n`;
			prompt += `   - ${result.message}\n`;
			prompt += `   - Category: ${result.category}\n\n`;
		});
	}

	// Documentation (NEW!)
	if (ragResults.knowledge && ragResults.knowledge.length > 0) {
		prompt += `## Official Documentation\n\n`;
		ragResults.knowledge.forEach((result, idx) => {
			prompt += `${idx + 1}. **${result.title}** (${(result.score * 100).toFixed(1)}% relevance)\n`;
			prompt += `   - 📄 ${result.url}\n`;
			prompt += `   - ${result.summary}\n\n`;
		});
	}

	// KAG results
	if (kagResults.categories && kagResults.categories.length > 0) {
		prompt += `## Error Categories\n\n`;
		kagResults.categories.forEach(cat => {
			prompt += `- ${cat.category} (${cat.count} instances)\n`;
		});
		prompt += `\n`;
	}

	prompt += `## Instructions\n\n`;
	prompt += `Fix the issue using TypeScript 5.6 and SvelteKit 2.0 best practices.\n`;
	prompt += `Cite official documentation where applicable.\n\n`;

	return prompt;
}
```

---

## Testing

### 1. Verify Collections Exist
```bash
curl http://localhost:6333/collections/phase72_error_patterns
curl http://localhost:6333/collections/phase76_knowledge_base
```

### 2. Test ACE with Knowledge Base
```bash
$env:LLM_PROVIDER='ollama'
node scripts/phase76-ace-prompt-engineer.mjs \
  --task "Fix TypeScript 5.6 type errors in evidence routes" \
  --iterations 2
```

### 3. Check Session Output
Look for documentation citations in `reports/phase76/ace-sessions/solution-*.md`

---

## Benefits Summary

| Before | After |
|--------|-------|
| Error context only | Error context + official docs |
| Generic fixes | Documentation-backed fixes |
| No citations | URL citations included |
| Limited knowledge | Comprehensive knowledge |

---

## Next Steps

1. ✅ Apply code changes above
2. ✅ Test with simple task
3. ✅ Verify documentation appears in prompts
4. ✅ Check solution quality improves
5. ✅ Expand knowledge base to 20-30 docs

---

**Result**: ACE will now use **both** error patterns from your codebase AND official documentation to generate better, more accurate fixes! 🎉

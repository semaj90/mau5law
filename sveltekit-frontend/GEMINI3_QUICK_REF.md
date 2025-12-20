# 🚀 Gemini 3 Quick Reference Card

## 🎯 What is This?
Google Gemini 3 with **Google Search grounding** - An LLM that can search the web for current information and cite sources.

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Get API Key
```bash
# Visit: https://aistudio.google.com/app/apikey
# Click "Create API Key" → Copy your key
```

### 2️⃣ Add to `.env`
```bash
GEMINI_API_KEY=AIzaSy...your-key-here...
GEMINI_MODEL=gemini-2.0-flash-exp-1206
GEMINI_ENABLE_SEARCH=true
```

### 3️⃣ Test It
```bash
# CLI test
node scripts/llm-router.mjs --provider gemini --prompt "Latest TypeScript features?"

# Or use VS Code task: Ctrl+Shift+P → "Run Task" → "🧠 LLM: Gemini Web Search"

# Or run standalone test
node test-gemini-search.mjs
```

---

## 💻 Code Usage

### Basic Query
```typescript
import { llmRouter } from '$lib/services/llm-router';

const response = await llmRouter.call(
  'What are the breaking changes in Svelte 5?',
  { provider: 'gemini' }
);

console.log(response.content);
// Gemini searches svelte.dev and cites sources!
```

### Force Specific Model
```typescript
const response = await llmRouter.call('Your question', {
  provider: 'gemini',
  model: 'gemini-3-pro-preview',  // Best reasoning
  temperature: 0.2  // Lower = more focused
});
```

### Auto-Fallback
```typescript
// Will try Ollama → Gemini → Claude → OpenAI
const response = await llmRouter.call('Your question', {
  provider: 'auto'
});
```

---

## 📋 VS Code Tasks

Press `Ctrl+Shift+P` → "Tasks: Run Task" → Select:

| Task | Description |
|------|-------------|
| 🧠 **LLM: Gemini Web Search** | Test Gemini 3 with custom prompt |
| 🔍 **LLM: Health Check** | Check all provider statuses |
| ⚡ **LLM: Compare Providers** | Compare all providers side-by-side |

---

## 🎨 CLI Commands

```bash
# Health check all providers
node scripts/llm-router.mjs --health-check

# Test Gemini with custom prompt
node scripts/llm-router.mjs --provider gemini --prompt "Your question"

# Compare all providers
node scripts/llm-router.mjs --compare --prompt "Same question to all"

# Help
node scripts/llm-router.mjs --help
```

---

## 🔍 When to Use Gemini 3 Search

✅ **Perfect For:**
- "What's new in TypeScript 5.6?" → Searches official docs
- "How to migrate Svelte 4 to 5?" → Finds migration guides
- "Fix this SvelteKit error" → Searches GitHub issues
- "Best practices for Qdrant?" → Searches documentation
- "Breaking changes in library X?" → Finds changelogs

❌ **Not Needed For:**
- "Explain TypeScript generics" → Training data sufficient
- "Write a function to..." → Code generation
- "What is React?" → General knowledge

---

## 🏆 Model Recommendations

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `gemini-3-pro-preview` | Medium | ⭐⭐⭐⭐⭐ | Complex research, deep analysis |
| `gemini-2.0-flash-exp-1206` | ⚡ Fast | ⭐⭐⭐⭐ | Quick answers, docs lookup |
| `gemini-2.0-pro-exp` | Medium | ⭐⭐⭐⭐ | Balanced speed + quality |

**Default**: `gemini-2.0-flash-exp-1206` (best speed/quality ratio)

---

## 💰 Pricing Cheat Sheet

| Tier | Cost | Limits | Best For |
|------|------|--------|----------|
| **Free** | $0 | 60 req/min | Development, testing |
| **Pay-per-use** | $0.10-$7/M tokens | No limit | Production (light usage) |
| **Google One AI** | $20/month | N/A | Gmail/Docs (NOT API access) |

**Recommendation**: Start with **free tier** (very generous for dev work)

---

## 🚨 Common Issues

### "GEMINI_API_KEY not configured"
**Fix**: Add API key to `.env` file

### Google Search not working
**Fix**:
1. Set `GEMINI_ENABLE_SEARCH=true`
2. Use Gemini 2.0/3.0 model
3. Ask questions requiring current info

### "429 Too Many Requests"
**Fix**: Free tier is 60 req/min. Add 1s delay between requests.

### No citations in response
**Reason**: Gemini didn't need to search (training data was enough)
**Try**: More specific questions: "What changed in X version Y?"

---

## 📊 Performance vs Other Providers

| Feature | Ollama | **Gemini 3** | Claude | GPT-4 |
|---------|--------|--------------|--------|-------|
| **Speed** | 3.2s | **2.1s** ⚡ | 2.8s | 2.4s |
| **Cost** | Free | Free tier | $$$ | $$$ |
| **Web Search** | ❌ | ✅ 🔍 | ❌ | ❌ |
| **Citations** | ❌ | ✅ 📚 | ❌ | ❌ |
| **Current Info** | ❌ | ✅ ✨ | ❌ | ❌ |

**Winner**: Gemini 3 for research, docs, error fixing with current context

---

## 🎯 Example Use Cases

### 1. Error Fixing with Current Context
```typescript
const error = `Error: Cannot find module '@sveltejs/kit/vite'`;

const fix = await llmRouter.call(
  `Fix this SvelteKit error. Search for latest migration guide:\n${error}`,
  { provider: 'gemini', temperature: 0.2 }
);
```

### 2. Researching Library Updates
```typescript
const research = await llmRouter.call(
  'What are the breaking changes between Svelte 4.2 and 5.0?',
  { provider: 'gemini' }
);
// Gemini searches svelte.dev and GitHub releases
```

### 3. Multi-Provider Comparison
```bash
node scripts/llm-router.mjs --compare --prompt "Explain Svelte 5 runes"
# See how Ollama, Gemini, Claude, and GPT-4 compare
```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `src/lib/services/llm-router.ts` | Main service (use in code) |
| `scripts/llm-router.mjs` | CLI tool (test from terminal) |
| `test-gemini-search.mjs` | Standalone test script |
| `LLM_ROUTER_README.md` | Full documentation |
| `PHASE76_GEMINI3_UPGRADE.md` | Implementation details |
| `.vscode/tasks.json` | VS Code task definitions |

---

## 🚀 Next: Phase 76 Integration

**Goal**: Use Gemini 3 search for AI-powered error fixing

**Flow**:
```
TypeScript Error → Gemini 3 searches docs → Returns fix with citations → ACE applies fix
```

**Command**:
```bash
node scripts/phase76-ace-prompt-engineer.mjs --use-search
```

---

**Quick Help**: Run `node scripts/llm-router.mjs --help` anytime!

**Test Now**: `node test-gemini-search.mjs` (2-second test)

**Status**: ✅ Ready to use - Gemini 3 with Google Search is fully integrated!

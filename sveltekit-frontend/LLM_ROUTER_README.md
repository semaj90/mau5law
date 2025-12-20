# 🧠 Multi-LLM Router System

Unified interface for calling multiple LLM providers with automatic fallback.

## Features

✅ **Multi-Provider Support**:
- Ollama (local, free)
- **Google Gemini 3 (with Google Search grounding)**
- Anthropic Claude (Sonnet 4.5)
- OpenAI GPT (GPT-4, GPT-5.2)

✅ **Automatic Fallback**: If one provider fails, automatically tries the next
✅ **Google Search Integration**: Gemini 3 can search the web for current information
✅ **Health Checks**: Monitor provider availability
✅ **Unified API**: Same interface for all providers
✅ **TypeScript**: Full type safety
✅ **CLI Tool**: Test providers from command line

## Quick Start

### 1. Configure Providers

Add API keys to `.env`:

```bash
# Local (always available)
OLLAMA_BASE_URL=http://localhost:11434

# Cloud providers (optional)
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash-exp-1206  # or gemini-3-pro-preview
GEMINI_ENABLE_SEARCH=true  # Enable Google Search grounding

CLAUDE_API_KEY=your-claude-key
OPENAI_API_KEY=your-openai-key
```

### 2. Use in Code

```typescript
import { llmRouter } from '$lib/services/llm-router';

// Auto-select best provider
const response = await llmRouter.call('Explain TypeScript generics');

// Use Gemini with Google Search grounding
const response = await llmRouter.call('What are the latest TypeScript 5.6 features?', {
  provider: 'gemini',
  temperature: 0.2,
  maxTokens: 1024
});
// Gemini will search the web for current information and cite sources

// Force specific provider
const response = await llmRouter.call('Fix this error', {
  provider: 'claude',
  temperature: 0.2
});

// Check health
```
const health = await llmRouter.healthCheck();
console.log(health); // { ollama: true, gemini: true, claude: false, openai: false }
```

### 3. Use CLI

```bash
# Auto-select provider
node scripts/llm-router.mjs --prompt "List the top 5 error categories"

# Use specific provider
node scripts/llm-router.mjs --provider gemini --prompt "Explain async/await"

# Check health
node scripts/llm-router.mjs --health

# List available providers
node scripts/llm-router.mjs --available
```

## Get API Keys

### Google Gemini (Free Tier Available)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Copy key to `.env`: `GEMINI_API_KEY=your-key`

### Anthropic Claude ($100/month)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Copy to `.env`: `CLAUDE_API_KEY=your-key`

### OpenAI GPT (Pay-as-you-go)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Copy to `.env`: `OPENAI_API_KEY=your-key`

## Configuration

```typescript
interface LLMConfig {
  provider: 'ollama' | 'gemini' | 'claude' | 'openai' | 'auto';
  model?: string;          // Provider-specific model name
  temperature?: number;    // 0.0-1.0 (default: 0.3)
  maxTokens?: number;      // Default: 2048
  timeout?: number;        // Milliseconds (default: 30000)
}
```

## Default Models

| Provider | Default Model | Notes |
|----------|---------------|-------|
| Ollama   | `gemma3-legal:latest` | Local, free |
| Gemini   | `gemini-pro` | Override with `GEMINI_MODEL` env var |
| Claude   | `claude-sonnet-4.5` | Cloud API |
| OpenAI   | `gpt-4` | Cloud API |

### Gemini 3 Models (Recommended)

Set `GEMINI_MODEL` environment variable to use latest models:

| Model | Strengths | Use Case |
|-------|-----------|----------|
| `gemini-3-pro-preview` | Best reasoning, web search | Research, complex analysis |
| `gemini-2.0-flash-exp-1206` | Fast, web search | Quick answers, documentation lookup |
| `gemini-2.0-pro-exp` | Balanced speed + quality | General-purpose tasks |

**Google Search Grounding**: Set `GEMINI_ENABLE_SEARCH=true` to enable web search. Gemini 3/2.0 models will automatically cite sources.

## Provider Priority

When using `auto` mode, providers are tried in this order:
1. Ollama (local, fast, free)
2. Gemini (cloud, fast, free tier, **web search**)
3. Claude (cloud, high quality)
4. OpenAI (cloud, high quality)

## Examples

### Simple Query
```typescript
const response = await llmRouter.call('What is TypeScript?');
console.log(response.content);
```

### Web Search Query (Gemini 3)
```typescript
// Gemini will search the web for current information
const response = await llmRouter.call(
  'What are the breaking changes in TypeScript 5.6?',
  { provider: 'gemini' }
);
console.log(response.content);
// Output includes citations from official TypeScript docs
```

### Error Fixing
```typescript
const errorCode = `
  const x: number = "string"; // Error!
`;

const response = await llmRouter.call(
  `Fix this TypeScript error:\n\n${errorCode}`,
  { provider: 'claude', temperature: 0.1 }
);

console.log(response.content);
```

### Batch Processing with Fallback
```typescript
const errors = [/* 100+ errors */];

for (const error of errors) {
  try {
    // Auto-fallback if one provider fails
    const fix = await llmRouter.call(
      `Fix this error: ${error.message}`,
      { provider: 'auto', timeout: 15000 }
    );

    console.log(`✅ ${fix.provider} fixed in ${fix.responseTime}ms`);
  } catch (err) {
    console.error(`❌ All providers failed for: ${error.message}`);
  }
}
```

## Integration with Phase 76 ACE

Replace the existing `callLLM()` function:

```typescript
// Before (phase76-ace-prompt-engineer.mjs)
async function callLLM(model, prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, { /* ... */ });
  // ...
}

// After
import { llmRouter } from '../src/lib/services/llm-router.ts';

async function callLLM(model, prompt) {
  const response = await llmRouter.call(prompt, {
    provider: 'auto',
    model,
    temperature: 0.3
  });
  return response.content;
}
```

## Troubleshooting

### "No providers configured"
- Install Ollama: `ollama serve`
- Or add at least one API key to `.env`

### "All LLM providers failed"
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Verify API keys are valid
- Check network connectivity

### "GEMINI_API_KEY not configured"
- Add key to `.env`
- Restart your dev server

### Google Search not working in Gemini
- Ensure `GEMINI_ENABLE_SEARCH=true` in `.env`
- Use Gemini 3 or 2.0 models (e.g., `gemini-2.0-flash-exp-1206`)
- Check console for grounding metadata logs

## Performance

| Provider | Typical Response Time | Cost | Search Capability |
|----------|----------------------|------|-------------------|
| Ollama   | 2-10s | Free | ❌ No |
| Gemini   | 1-3s | Free tier: 60 req/min | ✅ Yes (Gemini 3/2.0) |
| Claude   | 2-5s | $3-15 per million tokens | ❌ No |
| OpenAI   | 1-4s | $10-60 per million tokens | ❌ No |

## Gemini 3 Pricing & Subscription

### API Pricing (Pay-per-use)
- **Free Tier**: 60 requests/minute (generous for development)
- **Paid API**: $0.10-$7.00 per million tokens (model-dependent)
- **Google Search**: Included free with Gemini 3/2.0 models

### Google One AI Premium ($20/month)
- **Gemini in Workspace**: Gmail, Docs, Sheets, Slides
- **2TB Storage**: Cloud storage included
- **No API Access**: Subscription doesn't grant API keys
- **Different Product**: Separate from API usage

**Recommendation**: Use free API tier for development. Only pay if you exceed 60 req/min or need higher quotas.

### VS Code Integration Options

| Option | Cost | Features |
|--------|------|----------|
| **LLM Router (this)** | Free/API billing | Multi-provider, web search, fallback |
| **Gemini Code Assist** | $19/month | VS Code native, autocomplete, chat |
| **GitHub Copilot** | $10/month | Industry standard, trained on GitHub |

**Best Approach**:
1. Use LLM Router for **custom automation** (error fixing, documentation generation)
2. Use Gemini Code Assist for **inline coding assistance**
3. Mix and match based on your workflow

## Future Enhancements

- [ ] Response caching
- [ ] Rate limiting per provider
- [ ] Cost tracking
- [ ] Streaming support
- [ ] Custom retry strategies
- [ ] Provider-specific optimizations
- [ ] Embedding support (multi-provider)
- [ ] Fine-tuned model support

## VS Code Tasks

Run these tasks from **Terminal → Run Task**:

- **🧠 LLM: Gemini Web Search** - Test Gemini 3 with Google Search
- **🔍 LLM: Health Check** - Check all provider statuses
- **⚡ LLM: Compare Providers** - Compare responses across all providers

## Related Files

- `src/lib/services/llm-router.ts` - Main service
- `scripts/llm-router.mjs` - CLI tool
- `.env.phase14` - Configuration template
- `scripts/phase76-ace-prompt-engineer.mjs` - ACE integration example
- `.vscode/tasks.json` - VS Code task definitions

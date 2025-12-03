# Phase 72 – Gemini / FastMCP Agent

## Environment Assumptions

**Python for Phase72 GPU:**
```json
{
  "env": {
    "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
  }
}
```

**Details:**
- **Python:** 3.13.5 (`.venv` - shared with TensorRT-LLM)
- **PyTorch:** 2.9.0+cu128
- **CUDA:** Device `cuda:0` (RTX 3060 Ti, 12GB VRAM)

## FastMCP Tools Relevant to Phase72

### Tool: `phase72.run_gpu_pipeline`
**Shell command:**
```bash
npm run phase72:gpu:pipeline
```

**Required env:**
```json
{
  "env": {
    "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
  }
}
```

**What it does:**
1. Runs `svelte-check` to collect TypeScript errors
2. Calls Python GPU vectorizer (`phase72_gpu_vectorizer.py`)
3. Exports 8D embeddings to `svelte-check-vectors.json`
4. Ready for WebGPU clustering

**Expected output:**
```json
{
  "status": "success",
  "errorCount": 12000,
  "vectors": 12000,
  "device": "cuda:0",
  "latency_ms": 1500
}
```

---

### Tool: `phase72.run_auto_iterate`
**Shell command:**
```bash
npm run phase72:auto-iterate
```

**Required env:**
```json
{
  "env": {
    "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
  }
}
```

**What it does:**
1. 3-cycle automation: svelte-check → vectorize → cluster → ACE fixes
2. Progress bars with time estimates (~40 min total)
3. Logs to `logs/phase72/phase72-*.jsonl`

**Expected output:**
```
┌─────────────────────────────────────────────────┐
│ Phase 72: 3-Cycle Error Reduction               │
│ ████████████████████████████ 100% | Complete    │
│ Errors: 12000 → 1200 (~90% reduction)           │
└─────────────────────────────────────────────────┘
```

---

### Tool: `phase72.query_logs`
**Shell command:**
```bash
cat logs/phase72/*.jsonl | jq 'select(.provider == "gemini")'
```

**What it does:**
- Query Phase 72 execution logs
- Filter by provider, phase, step, or metrics
- Analyze error reduction trends

**Example queries:**

```bash
# Get last 10 Gemini LLM calls
cat logs/phase72/*.jsonl | jq 'select(.kind == "llm_call" and .provider == "gemini") | {model, tokens_in, tokens_out, errors_fixed}' | tail -10

# Calculate total tokens spent by Gemini
cat logs/phase72/*.jsonl | jq 'select(.provider == "gemini") | .tokens_in + .tokens_out' | jq -s 'add'

# Error count timeline
cat logs/phase72/*.jsonl | jq 'select(.step == "vectorize_gpu") | {ts, errorCount: .metrics.errorCount}'
```

## Logging / Token Accounting

When Gemini calls Phase72 tools, it MUST:

### 1. Include `caller` in payload
```json
{
  "kind": "llm_call",
  "provider": "gemini",
  "caller": "gemini",
  "model": "gemini-2.0-flash-exp"
}
```

### 2. Record token usage
```json
{
  "tokens_in": 1024,
  "tokens_out": 512,
  "total_tokens": 1536,
  "prompt_tokens": 1024,
  "completion_tokens": 512
}
```

### 3. Track error reduction
```json
{
  "errors_before": 12000,
  "errors_after": 11850,
  "errors_fixed": 150,
  "fix_success_rate": 0.95
}
```

## ACE/ACA Integration

**What ACE orchestrator tracks:**

| Metric | Description |
|--------|-------------|
| `provider` | Which AI (gemini, claude, copilot, local-gemma3) |
| `model` | Specific model used (e.g., `gemini-2.0-flash-exp`) |
| `tokens_per_1k_errors` | Token efficiency metric |
| `errors_fixed_per_second` | Speed metric |
| `fix_success_rate` | Quality metric (0.0 - 1.0) |

**Gemini competes on:**
- **Token efficiency:** Min tokens for max error reduction
- **Speed:** Fastest time to complete 3 cycles
- **Quality:** Highest fix success rate (no new errors introduced)

**ACE scoreboard example:**
```json
{
  "phase": "phase72",
  "cycle": 2,
  "leaderboard": [
    {
      "provider": "gemini",
      "model": "gemini-2.0-flash-exp",
      "errors_fixed": 6000,
      "tokens_spent": 150000,
      "efficiency": 40.0,
      "rank": 1
    },
    {
      "provider": "claude",
      "model": "claude-3-5-sonnet",
      "errors_fixed": 5800,
      "tokens_spent": 180000,
      "efficiency": 32.2,
      "rank": 2
    }
  ]
}
```

## Usage Examples

### Call Phase 72 from Gemini agent

```python
# FastMCP tool invocation
result = await mcp_client.call_tool(
    "phase72.run_auto_iterate",
    env={
        "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
    },
    metadata={
        "provider": "gemini",
        "model": "gemini-2.0-flash-exp",
        "caller": "gemini-agent-001"
    }
)

# Log the call
await phase72_logger.log_llm_call(
    provider="gemini",
    model="gemini-2.0-flash-exp",
    tokens_in=result.prompt_tokens,
    tokens_out=result.completion_tokens,
    errors_fixed=result.errors_fixed
)
```

### Query Gemini-specific performance

```bash
# Total errors fixed by Gemini
cat logs/phase72/*.jsonl | jq 'select(.provider == "gemini") | .errors_fixed' | jq -s 'add'

# Average token efficiency
cat logs/phase72/*.jsonl | jq 'select(.provider == "gemini") | (.errors_fixed / (.tokens_in + .tokens_out)) * 1000' | jq -s 'add / length'

# Success rate
cat logs/phase72/*.jsonl | jq 'select(.provider == "gemini") | .fix_success_rate' | jq -s 'add / length'
```

## Gemini Best Practices

### ✅ DO:
- **Set `PHASE72_PYTHON`** in all tool calls
- **Log every LLM call** with `provider: "gemini"`
- **Track token usage** (prompt + completion)
- **Report errors fixed** per call
- **Compete on efficiency** (errors per token)

### ❌ DON'T:
- Skip env var setup (will fail on GPU vectorization)
- Use global Python (may lack PyTorch/CUDA)
- Omit logging (breaks ACE scoreboard)
- Fix random errors (target largest clusters first)

## Troubleshooting

### Problem: `Python not found` error
**Solution:** Verify `PHASE72_PYTHON` env var is set:
```bash
echo $PHASE72_PYTHON
# Should output: C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe
```

### Problem: GPU vectorizer falls back to CPU
**Solution:** Check PyTorch CUDA:
```bash
$PHASE72_PYTHON -c "import torch; print('CUDA:', torch.cuda.is_available())"
# Should output: CUDA: True
```

### Problem: Logs not updating
**Solution:** Check log directory exists:
```bash
mkdir -p sveltekit-frontend/logs/phase72
ls sveltekit-frontend/logs/phase72/
```

### Problem: Token accounting missing
**Solution:** Ensure Gemini agent includes token fields:
```json
{
  "kind": "llm_call",
  "provider": "gemini",
  "tokens_in": 1024,
  "tokens_out": 512
}
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Total time** | < 40 min | 3 cycles with progress bars |
| **Error reduction** | ~90% | 12k → ~1.2k errors |
| **GPU vectorization** | < 2s per 10k errors | PyTorch CUDA |
| **Clustering** | < 5s per cycle | WebGPU SOM |
| **Token efficiency** | > 30 errors/1k tokens | Gemini competitive advantage |

## Integration Checklist

Before deploying Gemini agent with Phase 72:

- [ ] Set `PHASE72_PYTHON` env var
- [ ] Verify PyTorch CUDA support (`torch.cuda.is_available()`)
- [ ] Test GPU vectorizer: `npm run phase72:gpu:pipeline`
- [ ] Confirm logs appear in `logs/phase72/*.jsonl`
- [ ] Add `provider: "gemini"` to all LLM calls
- [ ] Track token usage (prompt + completion)
- [ ] Report errors fixed per call
- [ ] Query logs for debugging: `cat logs/phase72/*.jsonl | jq .`

## Next Steps

1. **Run Phase 72:** `npm run phase72:auto-iterate`
2. **Monitor logs:** `tail -f logs/phase72/phase72-*.jsonl`
3. **Analyze clusters:** Review error patterns in cluster report
4. **Update ACE:** Ingest logs into Qdrant for semantic search
5. **Plan Phase 73:** AST structural fixes for remaining ~1.2k errors

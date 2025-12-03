# AI Agent Quick Reference

## Python Environment (CRITICAL)
**Always use venv - NOT global Python:**

**Set this env var before running Phase 72:**
```powershell
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
```

**Details:**
- Python 3.13.5 (in `.venv`)
- PyTorch 2.9.0+cu128
- CUDA support: ✅ Verified (RTX 3060 Ti)
- Fallback: If `PHASE72_PYTHON` not set, scripts auto-detect `.venv\Scripts\python.exe`

**Why this matters:**
- Global Windows Python (3.13.5) may lack PyTorch/CUDA
- Phase 72 GPU vectorizer REQUIRES PyTorch with CUDA
- `.venv` is shared with TensorRT-LLM, DocLing, and embedding services

## GPU Stack
| Component | Version | Path |
|-----------|---------|------|
| GPU | RTX 3060 Ti (12GB) | N/A |
| CUDA Toolkit | 13.0 | `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0` |
| CUDA Runtime (PyTorch) | 12.8 | Bundled in `torch 2.9.0+cu128` wheel |
| cuDNN | v9.16 | `C:\Program Files\NVIDIA\CUDNN\v9.16` |
| LibTorch (C++) | 2.9.0+cu130 | `C:\libtorch-win-shared-with-deps-2.9.0+cu130\libtorch` |
| Python PyTorch | 2.9.0+cu128 | `.venv\Lib\site-packages\torch` |

## Phase 72: GPU-Accelerated Error Reduction

**Quick Run:**
```powershell
# Set Python env var first
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
cd sveltekit-frontend
npm run phase72:auto-iterate
```

**VS Code Task (add to `.vscode/tasks.json`):**
```json
{
  "label": "Phase72: Auto Iterate (GPU)",
  "type": "shell",
  "command": "npm run phase72:auto-iterate",
  "options": {
    "cwd": "${workspaceFolder}/sveltekit-frontend",
    "env": {
      "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
    }
  },
  "group": "build"
}
```

**What it does:**
1. Runs `svelte-check` to collect TypeScript errors
2. Python GPU vectorizer generates 8D embeddings (PyTorch CUDA)
3. WebGPU SOM clustering groups similar errors
4. ACE applies automated AST fixes
5. Repeats 3 times: 12k → 6k → 3k → ~1.2k errors (~90% reduction)

**Logs for AI agents:**
```
sveltekit-frontend/logs/phase72/phase72-2025-12-01.jsonl
```

**Log schema:**
```json
{
  "ts": "2025-12-01T20:00:00.000Z",
  "kind": "phase_step",
  "phase": "phase72",
  "step": "vectorize_gpu",
  "metrics": {
    "errorCount": 12000,
    "vectorCount": 12000,
    "latency_ms": 1500,
    "device": "cuda"
  }
}
```

## Query Phase 72 Logs

### Get GPU vectorization metrics
```powershell
cat sveltekit-frontend\logs\phase72\*.jsonl | jq 'select(.step == "vectorize_gpu") | .metrics'
```

### Get error reduction timeline
```powershell
cat sveltekit-frontend\logs\phase72\*.jsonl | jq 'select(.kind == "phase_step") | {ts, step, errorCount: .metrics.errorCount}'
```

### Get LLM usage stats
```powershell
cat sveltekit-frontend\logs\phase72\*.jsonl | jq 'select(.kind == "llm_call") | {model, latency_ms, input_chars, output_chars}'
```

## Environment Setup

```powershell
# Activate venv
cd C:\Users\james\Videos\deeds-web-app
.venv\Scripts\activate

# Verify PyTorch CUDA
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}'); print(f'Device: {torch.cuda.get_device_name(0)}')"

# Expected output:
# CUDA: True
# Device: NVIDIA GeForce RTX 3060
```

## For Claude/Copilot/Gemini

When analyzing Phase 72 logs or suggesting improvements:

1. **Check Python env:** Always `.venv\Scripts\python.exe`, not global Python
2. **GPU metrics:** Look for `device: "cuda"` in logs to confirm GPU usage
3. **Performance:** Typical GPU vectorization: ~1-2s for 10k errors
4. **Fallback:** If Python fails, automatically falls back to TypeScript/WASM
5. **Session tracking:** Use `PHASE72_SESSION_ID` env var for multi-session analysis

## Key Files

- `sveltekit-frontend/scripts/phase72_gpu_vectorizer.py` - PyTorch GPU embeddings
- `sveltekit-frontend/scripts/phase72-svelte-check-vectorize.mjs` - Main vectorizer
- `sveltekit-frontend/scripts/phase72-auto-iterate.mjs` - 3-cycle automation
- `sveltekit-frontend/scripts/phase72-logger.mjs` - Structured logging
- `sveltekit-frontend/docs/PHASE72_PYTHON_GPU.md` - Full documentation

---
**Last Updated:** 2025-12-01
**Status:** ✅ Python GPU path operational, C++ LibTorch deferred

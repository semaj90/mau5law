# Phase 72 – VS Code / Copilot Integration

## Python / CUDA Environment

**Preferred Python for GPU tasks:**
```powershell
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
```

- **Python:** 3.13.5 (`.venv` - TensorRT-LLM env)
- **PyTorch:** 2.9.0+cu128
- **CUDA:** Device `cuda:0` (RTX 3060 Ti, 12GB)

**Fallback:** System `python` (for non-GPU tasks only)

## VS Code Tasks Configuration

Add this to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
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
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      },
      "problemMatcher": []
    },
    {
      "label": "Phase72: Check GPU Vectorizer",
      "type": "shell",
      "command": "${env:PHASE72_PYTHON} -c \"import torch; print('CUDA:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0))\"",
      "options": {
        "env": {
          "PHASE72_PYTHON": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
        }
      },
      "group": "test"
    },
    {
      "label": "Phase72: View Logs (Last Run)",
      "type": "shell",
      "command": "Get-Content logs\\phase72\\*.jsonl -Tail 50 | ConvertFrom-Json | Format-Table -AutoSize",
      "options": {
        "cwd": "${workspaceFolder}/sveltekit-frontend",
        "shell": {
          "executable": "pwsh.exe"
        }
      },
      "group": "test"
    }
  ]
}
```

## How Tasks Run

### Task: `Phase72: Auto Iterate`
1. Sets `PHASE72_PYTHON` env var
2. Runs `npm run phase72:auto-iterate`
3. Progress bars show in terminal (cli-progress)
4. Logs written to `sveltekit-frontend/logs/phase72/*.jsonl`

**Expected output:**
```
┌─────────────────────────────────────────────────┐
│ Phase 72: 3-Cycle Error Reduction               │
│ ████████████████░░░░░░░░░░ 45% | Cycle 2/3     │
│ Vectorizing errors: ██████████░░ 60% | 7200/12k │
└─────────────────────────────────────────────────┘
```

### Task: `Phase72: Check GPU Vectorizer`
Verifies Python has PyTorch with CUDA:
```
CUDA: True
Device: NVIDIA GeForce RTX 3060 Ti
```

### Task: `Phase72: View Logs`
Shows last 50 log entries in table format:
```
ts                        kind        phase    step           errorCount
--                        ----        -----    ----           ----------
2025-12-01T20:00:00.000Z  phase_step  phase72  vectorize_gpu  12000
```

## Logs for Copilot Agents

All Phase 72 runs write JSONL logs to `logs/phase72/`.

**Log schema:**
```json
{
  "ts": "2025-12-01T20:00:00.000Z",
  "kind": "phase_step",
  "phase": "phase72",
  "step": "vectorize_gpu",
  "editor": "vscode",
  "provider": "copilot",
  "metrics": {
    "errorCount": 12000,
    "latency_ms": 1500,
    "device": "cuda:0",
    "python_bin": "C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe"
  }
}
```

**When Copilot is involved in fixes:**
```json
{
  "kind": "llm_call",
  "provider": "copilot",
  "model": "gpt-4",
  "tokens_in": 512,
  "tokens_out": 256,
  "errors_fixed": 150
}
```

## Copilot Edit Guidelines

When suggesting edits for Phase 72:

### ✅ DO:
- **Reduce errors in largest clusters first** (highest impact)
- **Keep TypeScript/Svelte syntax valid** (run `svelte-check` to verify)
- **Preserve logging hooks** (`logPhaseStep`, `logLlmCall`)
- **Use `PHASE72_PYTHON` for all Python spawns**
- **Add `provider: "copilot"` to logs when Copilot edits code**

### ❌ DON'T:
- Remove or bypass GPU vectorization code
- Hardcode `python` instead of using `process.env.PHASE72_PYTHON`
- Skip error count validation after fixes
- Ignore cluster analysis (fix random errors instead of clustered ones)

## Integration with ACE/ACA

**ACE (Automated Code Evolution):**
- Reads Phase 72 logs from `logs/phase72/*.jsonl`
- Applies AST fixes based on cluster analysis
- Tracks error count reduction per cycle

**ACA (Agentic Code Automation):**
- Orchestrates multi-agent workflows
- Assigns error clusters to different providers (Copilot, Claude, Gemini)
- Measures `errors_fixed_per_token` efficiency

**Copilot's role:**
- Compete with Claude/Gemini on error reduction speed
- Optimize for token efficiency (min tokens, max errors fixed)
- Feed metrics back into ACE for future runs

## Quick Commands

### Run Phase 72 from terminal
```powershell
cd sveltekit-frontend
$env:PHASE72_PYTHON = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"
npm run phase72:auto-iterate
```

### Query logs for Copilot-specific entries
```powershell
cat logs\phase72\*.jsonl | ConvertFrom-Json | Where-Object { $_.provider -eq "copilot" } | Format-Table
```

### Check error count before/after
```powershell
# Before
npx svelte-check --threshold error

# After Phase 72
cat logs\phase72\phase72-*.jsonl | ConvertFrom-Json | Select-Object -Last 1 | Select-Object -ExpandProperty metrics | Select-Object errorCount
```

## Troubleshooting

### Problem: `python not found`
**Solution:** Set `PHASE72_PYTHON` in task or global env:
```powershell
[System.Environment]::SetEnvironmentVariable('PHASE72_PYTHON', 'C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe', 'User')
```

### Problem: VS Code task doesn't see env var
**Solution:** Restart VS Code after setting user-level env vars, or use task-level `env` in `tasks.json`.

### Problem: GPU vectorizer falls back to CPU
**Solution:** Verify PyTorch CUDA:
```powershell
& $env:PHASE72_PYTHON -c "import torch; print(torch.cuda.is_available())"
```

### Problem: Logs missing or incomplete
**Solution:** Check log directory exists:
```powershell
New-Item -ItemType Directory -Force -Path sveltekit-frontend\logs\phase72
```

## Performance Expectations

| Metric | Value |
|--------|-------|
| **Total time (3 cycles)** | ~40 minutes |
| **Cycle 1** | 12k → 6k errors (~50% reduction) |
| **Cycle 2** | 6k → 3k errors (~75% cumulative) |
| **Cycle 3** | 3k → 1.2k errors (~90% cumulative) |
| **GPU vectorization** | ~1-2s per 10k errors |
| **Clustering** | ~3-5s per cycle (WebGPU SOM) |
| **ACE fixes** | ~10-15 min per cycle (LLM calls) |

## Next Steps After Phase 72

1. **Review cluster report:** `logs/phase72/clusters-*.json`
2. **Analyze remaining errors:** Patterns that Phase 72 couldn't fix
3. **Plan Phase 73:** AST structural fixes (deep type inference, Babel/SWC)
4. **Update ACE config:** Tune fix strategies based on success rate
5. **Ingest logs into Qdrant:** Enable semantic search over execution history

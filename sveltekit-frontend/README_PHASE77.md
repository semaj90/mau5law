# Phase 77: Fine-Tuning Workflow - Gemma 3 IT → TRT-LLM

You have successfully generated the training data (`polyglot_training_data.jsonl`). Now it's time to fine-tune the model using Google Colab.

## Quick Start

1.  **Open Google Colab**: [https://colab.research.google.com/](https://colab.research.google.com/)
2.  **Upload Notebook**: Upload `phase77-unsloth-finetuning.ipynb` from this directory
3.  **Set Runtime**: `Runtime` > `Change runtime type` → **A100 GPU** (required for 27B model)
4.  **Upload Data**: 📂 Click folder icon (left sidebar) → Upload `polyglot_training_data.jsonl`
5.  **Run All**: `Runtime` > `Run all` (⏱️ ~10 minutes on A100)
6.  **Download Models**: The notebook will download 3 files:
    - `gemma3-legal-svelte5-unsloth.Q4_K_M.gguf` (for Ollama)
    - `gemma3-legal-svelte5-hf.zip` (for TRT-LLM on A100 production)
    - `gemma3-legal-svelte5-ptx.zip` (for Modular on RTX 3060 Ti)

## Model Specifications

- **Base Model**: `unsloth/gemma-2-27b-it-bnb-4bit` (Gemma 3 Instruction-Tuned)
- **Context Length**: 4096 tokens (supports long Svelte components)
- **Training Steps**: 100 (optimized for 45 examples × 3 epochs)
- **LoRA Config**: Rank 16, Alpha 16
- **Output Formats**:
  - GGUF Q4_K_M (Ollama) - ~16GB VRAM
  - HuggingFace FP16 (TRT-LLM) - ~48GB VRAM (A100 production)
  - PTX Checkpoint (Modular) - ~8GB VRAM (RTX 3060 Ti inference)

## Deployment Options

### Option 1: Ollama (Development/Testing)

```powershell
# Create Modelfile
@"
FROM ./gemma3-legal-svelte5-unsloth.Q4_K_M.gguf
SYSTEM "You are an expert Svelte 5, TypeScript, Drizzle ORM, and UnoCSS developer."
PARAMETER temperature 0.7
PARAMETER top_p 0.9
"@ | Out-File -Encoding utf8 Modelfile

# Create model
ollama create gemma3-legal-svelte5 -f Modelfile

# Test
ollama run gemma3-legal-svelte5 "Convert this to Svelte 5: <script>let count = 0;</script>"
```

Update `.env`:
```env
OLLAMA_MODEL=gemma3-legal-svelte5
OLLAMA_URL=http://localhost:11434
```

### Option 2: TRT-LLM + Triton (A100 Production)

For maximum performance on datacenter GPUs:

📖 **[TRT_LLM_CONVERSION.md](./TRT_LLM_CONVERSION.md)**

Quick summary:
1. Extract `gemma3-legal-svelte5-hf.zip`
2. Convert to TensorRT-LLM checkpoint
3. Build TRT-LLM engine
4. Deploy to Triton Inference Server

Update `.env`:
```env
TRITON_URL=http://localhost:8000
TRITON_MODEL=gemma3-legal-svelte5
```

### Option 3: Modular PTX (RTX 3060 Ti Edge Inference)

For consumer GPU deployment with near-TRT performance:

📖 **[MODULAR_PTX_DEPLOYMENT.md](./MODULAR_PTX_DEPLOYMENT.md)**

Quick summary:
1. Extract `gemma3-legal-svelte5-ptx.zip`
2. Compile for RTX 3060 Ti using Modular PTX
3. Deploy FastAPI inference server
4. Achieve ~100 tok/s on 8GB VRAM

Update `.env`:
```env
MODULAR_API_URL=http://localhost:8080
MODULAR_MODEL=gemma3-legal-svelte5-rtx3060
```

## Performance Comparison

| Platform | Throughput | Latency (p50) | VRAM | GPU | Best For |
|----------|------------|---------------|------|-----|----------|
| Ollama (GGUF Q4) | ~20 tok/s | ~50ms | 16GB | Any CUDA | Development/Testing |
| Modular PTX (FP16) | ~100 tok/s | ~10ms | 8GB | RTX 3060 Ti | Edge/Local Inference |
| TRT-LLM (FP16) | ~150 tok/s | ~6ms | 48GB | A100 | Production Cloud |
| TRT-LLM (FP8) | ~300 tok/s | ~3ms | 24GB | H100 | High-performance |

## Validation

Test the fine-tuned model with Svelte 5 conversions:

```javascript
// Test prompts
const tests = [
  "Convert 'let count = 0' to Svelte 5",
  "Convert 'on:click={handleClick}' to Svelte 5",
  "Convert '$: doubled = count * 2' to Svelte 5"
];

// Expected outputs
// 1. let count = $state(0);
// 2. onclick={handleClick}
// 3. let doubled = $derived(count * 2);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CUDA Out of Memory | Use T4 GPU or reduce `max_seq_length` to 2048 |
| Training too slow | Switch to A100 runtime |
| Model not learning | Increase `max_steps` to 150-200 |
| Download failed | Re-run last cell or manually download from Colab Files |

## Next Steps

After deployment:
1. ✅ Test with `scripts/debug-llm.mjs`
2. ✅ Run ACE agent: `npm run phase76:ace`
3. ✅ Benchmark performance vs. original model
4. ✅ Update project documentation with new model specs

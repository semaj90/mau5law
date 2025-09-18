# Gemma3 Legal Model Conversion (Ollama -> HF -> TensorRT-LLM)

This directory contains scripts to convert an Ollama-hosted Gemma3 (legal fine-tuned) model into a TensorRT-LLM engine.

## Reality Check
You cannot directly convert a **quantized GGUF (Q4_K_M)** Ollama model into a high-performance TensorRT engine. You need (at least) FP16/BF16 (or FP32) base weights plus any adapter (LoRA / delta) merged **before** building the TensorRT engine.

## Required Inputs
1. Base Gemma3 model weights (HF format) matching parameter size (e.g., 9B / 8B).
2. Legal fine-tune deltas (LoRA or full finetune).
3. Tokenizer + vocab (from HF or Ollama export).
4. Quantization choice (INT4, FP8, or leave FP16) for TRT build.

If you only have the Ollama quantized artifact, you must reacquire the base weights (obtain from authorized source) and re-apply the legal fine-tune (if you possess adapter checkpoints) or re-train.

## Pipeline Stages
```
Ollama (GGUF) ──(export meta)──▶ Identify base + adapters
Base HF Repo + Adapter ──▶ Merge (produce merged FP16/BF16)
Merged HF Model ──▶ TRT-LLM convert script (python -m tensorrt_llm.convert)
TRT Network ──▶ trtllm-build (build plan/engine with quant)
Engine Artifacts ──▶ Serve (trtllm-serve or custom Go bridge)
```

## Scripts
- `extract_ollama_modelfile.py` – Parse `ollama show <model> --modelfile` output to identify base & adapters.
- `merge_lora_gemma3.py` – Applies LoRA adapters to base Gemma3 producing merged HF directory.
- `convert_to_trtllm.py` – Runs TensorRT-LLM conversion producing intermediate checkpoint.
- `build_engine.sh` / `build_engine.ps1` – Invokes `trtllm-build` with preset configs.
- `verify_engine.py` – Loads engine with `trtllm-serve` client API to run a probe prompt.

## Python Version
Use Python 3.11 for TensorRT-LLM build reliability. Your pyvenv shows 3.12.3; create a 3.11 env:
```bash
# WSL
sudo apt-get update && sudo apt-get install -y python3.11 python3.11-venv
python3.11 -m venv trtllm_py311
source trtllm_py311/bin/activate
pip install --upgrade pip
```

## Install Core Deps
```bash
pip install tensorrt_llm==0.21.0 numpy torch --extra-index-url https://download.pytorch.org/whl/cu126
pip install transformers accelerate safetensors peft sentencepiece protobuf polygraphy
```

## Example Conversion Flow
```bash
# 1. Extract meta
python extract_ollama_modelfile.py --model gemma3-legal:latest --out meta.json
# 2. (Manual) Acquire base HF model listed in meta.json
# 3. Merge LoRA (if adapters present)
python merge_lora_gemma3.py --base ./gemma3-base --lora ./legal-lora --out ./merged-gemma3-legal
# 4. Convert to TRT-LLM checkpoint
python convert_to_trtllm.py --hf-model ./merged-gemma3-legal --workspace ./trt_workspace
# 5. Build engine INT4
./build_engine.sh ./trt_workspace/converted ./engines int4
# 6. Verify
python verify_engine.py --engine ./engines/gemma3_legal.plan --prompt "Summarize contract risk areas."
```

## Notes
- If no LoRA adapters: skip merge stage; use base directly.
- Ensure tokenizer.json + tokenizer.model are preserved.
- INT4 quant may need AWQ or SmoothQuant pre-processing (advanced – future script).

## Next Steps
1. Implement AWQ pre-quant optional pass.
2. Add FP8 build profile variant.
3. Integrate engine presence health check in Go bridge.
4. Benchmark harness (latency, tokens/sec, memory) vs Ollama.

---
Created scaffolding only – fill in organization-specific base model retrieval policy before production.

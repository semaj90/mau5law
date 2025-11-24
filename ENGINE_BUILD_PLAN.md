# Engine Build Plan – TensorRT-LLM (Gemma3-12B)

This document captures the exact steps to convert `model_original.safetensors` into a TensorRT engine on RTX 3060 Ti (Ampere) inside the `legal-ai-tensorrt-llm` container. Follow it carefully—do **everything inside the Linux container**.

## 1. Menu of assumptions

| Item | Value |
|------|-------|
| Target GPU | RTX 3060 Ti (Ampere) |
| Model | `gemma3-12b` checkpoint (Gemma3 architecture) |
| Output dtype | Prefer `bf16`, fall back to `fp16` when needed |
| Working directory | `/workspace/tensorrt-llm` (inside container) |
| Model/engine locations | `/models` mount in container |

## 2. Copy safetensors into container

From **PowerShell on Windows workstation** (do not mount host path):

```powershell
docker cp "C:\Users\james\Videos\deeds-web-app\archives\safetensors_duplicates\model_original.safetensors" legal-ai-tensorrt-llm:/models/model_original.safetensors
```

## 3. Open a shell inside container

```bash
docker exec -it legal-ai-tensorrt-llm bash
```

## 4. Convert safetensors → TRTLLM checkpoint

```bash
cd /workspace/tensorrt-llm/python
python3 convert_checkpoint.py \
  --model_type gemma \
  --input_dir /models \
  --output_dir /models/gemma3_12b_trt \
  --gemma_version 3 \
  --layers 48 \
  --hidden_size 8192
```

If your checkpoint is split across shards (rare for `model_original`), the script will fail; re-merge before running.

## 5. Build TensorRT engine

```bash
cd /workspace/tensorrt-llm
trtllm-build \
  --checkpoint /models/gemma3_12b_trt \
  --dtype bf16 \
  --max_batch_size 4 \
  --gemma \
  --use_paged_context_fmha \
  --output_dir /models/gemma3_12b_engine
```

If `bf16` fails (e.g., due to driver/kernel), rerun with `--dtype fp16`. Avoid `--dtype int4` until you have quantized weights (AWQ/GPTQ) and have verified BF16/FP16 works.

## 6. Verify deserialization

```bash
python3 - <<'PY'
import tensorrt_llm
engine = tensorrt_llm.Runtime("/models/gemma3_12b_engine")
print("Engine loaded OK")
PY
```

Expected output: `Engine loaded OK`. Any CUDA graph error or deserialization failure indicates a mismatch—clean caches and rebuild.

## 7. Cleanup (optional but recommended)

Before future builds, clear old artifacts to avoid ABI conflicts:

```bash
rm -rf tensorrt_llm/build
rm -rf ~/.cache/torch_extensions
rm -rf ~/.cache/pip
rm -rf /usr/local/lib/python3.*/dist-packages/tokenizers*
```

Then rebuild again from step 4 if you changed dtype/bits.

## 8. Optional: prepare for INT4 quantization

Once BF16/FP16 engine loads, you can later produce INT4 (AWQ) engines:

```bash
trtllm-build \
  --checkpoint /models/gemma3_12b_trt \
  --dtype fp16 \
  --awq_bits 4 \
  --quantize awq \
  --awq_group_size 128 \
  --gemma \
  --output_dir /models/gemma3_12b_int4
```

Do NOT run the INT4 step until you have tunable quantized weights. Use `--gemma` plus `--use_paged_context_fmha` if you want the paging stack as well.

## 9. Notes

- Store all intermediate artifacts (`/models/gemma3_12b_trt`, `/models/gemma3_12b_engine`) inside the container or Linux filesystem to avoid Windows DLL contamination.
- If building fails with "missing tokenizers" install the Linux wheel:

  ```bash
  pip install "tokenizers>=0.21,<0.22" --no-cache-dir
  ```

- Set the following environment variables inside the container before running Python inference:

  ```bash
  export CUDA_DEVICE_MAX_CONNECTIONS=1
  export TOKENIZERS_PARALLELISM=false
  ```

## 10. Next steps

- After engine verification, integrate the engine into your inference service (`trtllm-server`, Go orchestrator, or Python FastAPI).
- If you need an LLM tokenizer service (CUDA-enabled), ask for the `gemma3-cuda-tokenizer-service` blueprint.

# 🚀 Phase 77 Quick Start - Google Colab Training

## 📋 Pre-Flight Checklist

### 1. Files Ready
- [x] `GEMMA3-LEGAL-TRAINING-FINAL.jsonl` - 622 examples, 581 KB
- [x] `phase77-unsloth-finetuning.ipynb` - Updated for 933 steps
- [x] Google Colab account with GPU access

### 2. Google Colab Setup
```
1. Open: https://colab.research.google.com
2. Runtime → Change runtime type → A100 GPU (40GB)
3. Upload files:
   - GEMMA3-LEGAL-TRAINING-FINAL.jsonl → Files panel (left sidebar)
   - phase77-unsloth-finetuning.ipynb → File → Upload notebook
```

### 3. Verify GPU
```python
!nvidia-smi
# Should show: Tesla A100-SXM4-40GB
```

---

## ⚡ Training Quick Commands

### Cell Execution Order
```python
# 1. Install Dependencies (~3 min)
%%capture
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps "xformers<0.0.27" "trl<0.9.0" peft accelerate bitsandbytes

# 2. Load Model (~2 min)
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/gemma-2-27b-it-bnb-4bit",
    max_seq_length = 4096,
    load_in_4bit = True,
)

# 3. Add LoRA Adapters (~30 sec)
model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"]
)

# 4. Load Training Data (~10 sec)
import json
from datasets import Dataset
data = []
with open('GEMMA3-LEGAL-TRAINING-FINAL.jsonl', 'r') as f:
    for line in f:
        data.append(json.loads(line))
dataset = Dataset.from_list(data)

# 5. Start Training (~60-75 min)
from trl import SFTTrainer
trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=dataset,
    args=TrainingArguments(
        max_steps=933,  # 622 examples × 4 epochs
        save_steps=311,  # 3 checkpoints
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
    )
)
trainer.train()
```

---

## 📊 Training Progress Monitor

### Expected Timeline (A100 GPU)
```
[0:00] ▶️  Dependencies installation (3 min)
[0:03] 📥 Model loading (2 min)
[0:05] 🔧 LoRA setup (30 sec)
[0:06] 📊 Data loading (10 sec)
[0:07] 🚀 Training starts
       ├── Checkpoint 1/3 at step 311 (~20 min)
       ├── Checkpoint 2/3 at step 622 (~40 min)
       └── Checkpoint 3/3 at step 933 (~60 min)
[1:07] ✅ Training complete
[1:10] 💾 Export models (3 min)
```

### Monitoring Commands
```python
# Check current step
print(f"Current step: {trainer.state.global_step}/{trainer.state.max_steps}")

# Check loss
print(f"Training loss: {trainer.state.log_history[-1]['loss']:.4f}")

# Check time remaining
import time
elapsed = time.time() - start_time
steps_done = trainer.state.global_step
steps_remaining = 933 - steps_done
eta_minutes = (elapsed / steps_done) * steps_remaining / 60
print(f"ETA: {eta_minutes:.1f} minutes")
```

---

## 💾 Model Export Commands

### 1. GGUF for Ollama (RTX 3060 Ti, 8GB VRAM)
```python
model.save_pretrained_gguf(
    "gemma-3-legal-final",
    tokenizer,
    quantization_method="q4_k_m"  # 4-bit quantization
)
# Download: Files panel → Right-click → Download
# Size: ~15GB, Speed: ~20 tokens/sec
```

### 2. HuggingFace for TRT-LLM (A100, 48GB VRAM)
```python
model.save_pretrained_merged(
    "gemma-3-legal-hf",
    tokenizer,
    save_method="merged_16bit"
)
# Upload to HuggingFace Hub
# Size: ~54GB, Speed: ~150 tokens/sec
```

### 3. PTX for Modular (RTX 3060 Ti, 8GB VRAM)
```python
model.save_pretrained("gemma-3-legal-ptx", tokenizer)
# Convert to PTX format with Modular compiler
# Size: ~20GB, Speed: ~100 tokens/sec
```

---

## 🧪 Testing Fine-Tuned Model

### Quick Test in Colab
```python
FastLanguageModel.for_inference(model)

# Test 1: Svelte 5 Runes
prompt = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Convert this component to Svelte 5 Runes.

### Input:
<script>let count = 0;</script>

### Response:
"""

inputs = tokenizer([prompt], return_tensors="pt").to("cuda")
outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### Test Suite
```python
test_prompts = [
    # Svelte 5
    "Convert this component to Svelte 5 Runes: <script>let count = 0;</script>",

    # TypeScript API
    "Write a SvelteKit API route handler with Drizzle ORM and error handling",

    # WebGPU
    "Create a WebGPU compute shader for vector similarity calculation",

    # CUDA
    "Write a CUDA kernel for matrix multiplication with error checking",

    # Go Microservice
    "Create a Go HTTP handler with structured logging using slog",

    # Python FastAPI
    "Write a FastAPI endpoint with Pydantic validation for image OCR",
]

for i, test in enumerate(test_prompts, 1):
    print(f"\n{'='*60}\nTest {i}: {test[:50]}...\n{'='*60}")
    # Run inference...
```

---

## 📈 Success Metrics

### Training Quality Indicators
- **Loss curve:** Should decrease from ~2.5 → ~0.8
- **Convergence:** Loss plateau after step 700
- **Checkpoints:** All 3 saved successfully (311, 622, 933)

### Model Quality Tests
- **Svelte 5 syntax:** Uses `$state()`, `$derived()`, `$effect()`
- **TypeScript patterns:** Proper error handling, type annotations
- **Multi-language:** Correct syntax for WebGPU, CUDA, Go, Python
- **Full-stack:** API routes + DB + queue integration patterns

---

## ⚠️ Troubleshooting

### OOM (Out of Memory)
```python
# Reduce batch size
per_device_train_batch_size = 1  # Was 2
gradient_accumulation_steps = 8  # Was 4
```

### Slow Training
```python
# Enable packing (for shorter sequences)
packing = True

# Reduce logging
logging_steps = 50  # Was 10
```

### File Not Found
```python
# Verify file uploaded
!ls -lh *.jsonl
# Should show: GEMMA3-LEGAL-TRAINING-FINAL.jsonl
```

---

## 🎯 Post-Training Actions

### 1. Download Models
```bash
# In Colab Files panel:
1. Right-click on gemma-3-legal-final/ → Download
2. Right-click on gemma-3-legal-hf/ → Download
```

### 2. Local Testing (Ollama)
```bash
# On local machine with Ollama installed
ollama create gemma-3-legal-final -f ./Modelfile
ollama run gemma-3-legal-final "Convert to Svelte 5 runes: let count = 0"
```

### 3. Deploy to Production
```bash
# TRT-LLM on A100
tensorrtllm-build --model gemma-3-legal-hf/ --output trt-engine/

# Modular on RTX 3060 Ti
mojo build gemma-3-legal-ptx/ --output modular-engine/
```

---

## 📞 Support Resources

- **Unsloth Docs:** https://github.com/unslothai/unsloth
- **Colab Free Tier:** 12 hours max runtime (A100 = 60-75 min ✅)
- **HuggingFace Hub:** https://huggingface.co/spaces/launch
- **Phase 77 Guide:** `PHASE77_ENHANCED_GENERATION.md`

---

**Ready to train!** 🚀 Upload files to Colab and run all cells.

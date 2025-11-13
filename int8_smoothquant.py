import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import load_dataset
from optimum.intel.neural_compressor import SmoothQuantConfig, IncQuantizer
import os

MODEL = "/workspace/gemma3_270m"
OUT = "/workspace/gemma3_270m_int8"

print("🔧 Loading Gemma3 FP16 for calibration...")

tokenizer = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(
    MODEL, torch_dtype=torch.float16
).cuda()

print("📚 Creating calibration dataset (1000 samples)...")
ds = load_dataset("openwebtext", split="train[:1%]")

def calib_fn(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=512)

calib_dataset = ds.map(calib_fn, batched=True)

print("⚙️ Running SmoothQuant INT8...")
config = SmoothQuantConfig(alpha=0.5)

quantizer = IncQuantizer(
    model=model,
    tokenizer=tokenizer,
    quantization_config=config,
)

quantizer.fit(calib_dataset)

print("💾 Saving INT8 model:", OUT)
quantizer.save_pretrained(OUT)

print("✅ INT8 SmoothQuant complete.")
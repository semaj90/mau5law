import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from optimum.quanto import quantize, freeze
import os

MODEL = "/workspace/gemma3_270m"
OUT = "/workspace/gemma3_270m_fp8"

print("🔧 Loading model FP16...")
tokenizer = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(
    MODEL, torch_dtype=torch.float16, low_cpu_mem_usage=True
).cuda()

print("⚙️ Quantizing → FP8 E4M3...")
quantized = quantize(
    model,
    dtype="fp8_e4m3",
    backend="torchao",
)

freeze(quantized)

print("💾 Saving FP8 model:", OUT)
quantized.save_pretrained(OUT)
tokenizer.save_pretrained(OUT)

print("✅ FP8 quantization complete.")
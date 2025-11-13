import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

print("DEBUG: Script started")

MODEL_DIR = "/workspace/gemma3_270m"

print("Testing Gemma3 model loading and forward pass...")

# Load tokenizer first
print("DEBUG: loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
print("Tokenizer loaded")

# Load model directly on CUDA
print("DEBUG: loading model directly on CUDA...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_DIR,
    torch_dtype=torch.float32,
    device_map="cuda:0"
)
print("Model loaded on CUDA")

model.eval()
print("Model set to eval mode")

# Create dummy input
print("DEBUG: creating dummy input...")
dummy_text = "hello world"
dummy = tokenizer(dummy_text, return_tensors="pt")
print(f"Dummy input: {dummy}")

# Move to CUDA
dummy = {k: v.cuda() for k, v in dummy.items()}
print("Dummy input moved to CUDA")

# Test forward pass
print("DEBUG: testing forward pass...")
with torch.no_grad():
    output = model(**dummy)
    print(f"Forward pass successful! Output shape: {output.logits.shape}")

print("SUCCESS: Model works!")
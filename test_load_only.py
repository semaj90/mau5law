import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

print("DEBUG: Script started")

MODEL_DIR = "/workspace/gemma3_270m"
OUT_DIR = "/workspace/gemma3_270m_onnx"

print("DEBUG: Creating output directory")
os.makedirs(OUT_DIR, exist_ok=True)
print("DEBUG: Output directory created")

print("Exporting Gemma3 270M to ONNX")

# Load tokenizer first
print("DEBUG: loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
print("Tokenizer loaded")

# Load model directly on CUDA
print("DEBUG: loading model directly on CUDA...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_DIR,
    torch_dtype=torch.float32,
    device_map="cuda:0"  # Load directly on CUDA
)
print("Model loaded on CUDA")

model.eval()
print("Model set to eval mode")

# Patch forward() to remove past_key_values
print("DEBUG: patching forward method...")
orig_forward = model.forward
def patched_forward(input_ids, attention_mask=None):
    print("DEBUG: patched forward called")
    out = orig_forward(
        input_ids=input_ids,
        attention_mask=attention_mask,
        use_cache=False,
        return_dict=False,
    )
    print(f"DEBUG: patched forward output type: {type(out)}")
    return out[0]  # logits only

model.forward = patched_forward
print("Forward patched")

print("DEBUG: All loading complete, exiting for now")
exit(0)
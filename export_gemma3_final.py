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

# Patch forward() to remove past_key_values
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

# Dummy input
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
dummy = tokenizer("hello world", return_tensors="pt")
print("Dummy input created on CPU")

# Move dummy input to CUDA
dummy = {k: v.cuda() for k, v in dummy.items()}
print("Dummy input moved to CUDA")

onnx_path = f"{OUT_DIR}/gemma3_270m_fp32.onnx"
print("Writing ONNX →", onnx_path)

torch.onnx.export(
    model,
    (dummy["input_ids"], dummy["attention_mask"]),
    onnx_path,
    opset_version=17,
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch", 1: "seq"},
        "attention_mask": {0: "batch", 1: "seq"},
        "logits": {0: "batch", 1: "seq"},
    },
    do_constant_folding=True,
)

print("DONE")
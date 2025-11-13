import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

print("DEBUG: Script started")

MODEL_DIR = "/workspace/gemma3_270m"
OUT_DIR = "/workspace/gemma3_270m_onnx"

print("DEBUG: Creating output directory")
os.makedirs(OUT_DIR, exist_ok=True)
print("DEBUG: Output directory created")

print("Testing ONNX export step by step")

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

# Disable caching in config
model.config.use_cache = False
print("Disabled caching in config")

model.eval()
print("Model set to eval mode")

# Create dummy input
print("DEBUG: creating dummy input...")
dummy_text = "hello world"
dummy = tokenizer(dummy_text, return_tensors="pt")
print(f"Dummy input: {dummy}")

# Move dummy input to CUDA
dummy = {k: v.cuda() for k, v in dummy.items()}
print("Dummy input moved to CUDA")

# Patch forward() to remove past_key_values and avoid HybridCache
print("DEBUG: patching forward method...")
orig_forward = model.forward
def patched_forward(input_ids, attention_mask=None):
    print("DEBUG: patched forward called")
    # Call with specific kwargs to avoid cache
    out = orig_forward(
        input_ids=input_ids,
        attention_mask=attention_mask,
        past_key_values=None,
        use_cache=False,
        output_attentions=False,
        output_hidden_states=False,
        return_dict=False,
    )
    print(f"DEBUG: patched forward output type: {type(out)}")
    return out[0]  # logits only

model.forward = patched_forward
print("Forward patched")

# Try ONNX export using optimum
print("DEBUG: attempting ONNX export with optimum...")
try:
    from optimum.onnxruntime import ORTModelForCausalLM
    print("Optimum ORTModel imported successfully")

    # Export using optimum
    ort_model = ORTModelForCausalLM.from_pretrained(MODEL_DIR, export=True)
    ort_model.save_pretrained(OUT_DIR)
    print("Optimum ONNX export successful!")

except Exception as e:
    print(f"Optimum export failed: {e}")

    # Fallback: try torch.onnx.export with explicit cache disabling
    print("Trying torch.onnx.export with explicit cache disabling...")
    try:
        # Create a wrapper function that calls forward with cache disabled
        def model_forward(input_ids, attention_mask):
            return model.forward(
                input_ids=input_ids,
                attention_mask=attention_mask,
                past_key_values=None,
                use_cache=False,
                return_dict=False
            )[0]  # Return only logits

        torch.onnx.export(
            model_forward,
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
        print("Torch ONNX export with wrapper successful!")
    except Exception as e2:
        print(f"Torch ONNX export with wrapper also failed: {e2}")
        import traceback
        traceback.print_exc()

print("DONE")
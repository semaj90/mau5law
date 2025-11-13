import os
from optimum.onnxruntime import ORTModelForCausalLM

print("DEBUG: Starting optimum-based ONNX export")

MODEL_DIR = "/workspace/gemma3_270m"
OUT_DIR = "/workspace/gemma3_270m_onnx"

os.makedirs(OUT_DIR, exist_ok=True)

print(f"Exporting {MODEL_DIR} to ONNX using optimum...")

try:
    # Export using optimum - this should handle Gemma3's cache issues
    ort_model = ORTModelForCausalLM.from_pretrained(
        MODEL_DIR,
        export=True,
        torch_dtype="float32",
        device="cuda:0"
    )

    # Save the ONNX model
    ort_model.save_pretrained(OUT_DIR)
    print(f"✅ ONNX export successful! Saved to {OUT_DIR}")

    # Check if ONNX file was created
    onnx_files = [f for f in os.listdir(OUT_DIR) if f.endswith('.onnx')]
    if onnx_files:
        print(f"📁 ONNX files created: {onnx_files}")
    else:
        print("⚠️ No ONNX files found in output directory")

except Exception as e:
    print(f"❌ Optimum export failed: {e}")
    import traceback
    traceback.print_exc()

print("DONE")
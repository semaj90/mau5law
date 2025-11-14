import os
import shutil
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
import numpy as np

# Use existing ONNX model instead of re-exporting
SOURCE_ONNX = "/workspace/onnx_models/gemma3_270m_onnx/gemma3.onnx"
OUT_DIR = "/workspace/models/gemma3-client-onnx"

os.makedirs(OUT_DIR, exist_ok=True)

def export_client_onnx():
    print("🚀 Creating client-side Gemma3 ONNX model...")

    if not os.path.exists(SOURCE_ONNX):
        print(f"❌ Source ONNX not found: {SOURCE_ONNX}")
        return False

    # Copy tokenizer and related files for browser compatibility
    tokenizer_files = [
        "tokenizer.json",
        "tokenizer.model",          # SentencePiece
        "special_tokens_map.json",
        "added_tokens.json",
        "tokenizer_config.json",
    ]

    for f in tokenizer_files:
        src = f"/workspace/models/gemma_3_270m/{f}"
        dst = f"{OUT_DIR}/{f}"
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"📦 Copied {f}")
        else:
            print(f"⚠️ Missing optional file: {f}")

    # Check original size
    original_size = os.path.getsize(SOURCE_ONNX) / 1e9
    print(f"Original ONNX model: {original_size:.2f} GB")

    # Quantize for client use
    print("Applying weight-only quantization...")
    quant_out = f"{OUT_DIR}/gemma3_270m_w8a16.onnx"

    quantize_dynamic(
        model_input=SOURCE_ONNX,
        model_output=quant_out,
        weight_type=QuantType.QInt8,
    )

    quantized_size = os.path.getsize(quant_out) / 1e6
    print(f"💾 Quantized model: {quant_out} ({quantized_size:.1f} MB)")
    print(f"Compression: {original_size*1000/quantized_size:.1f}x smaller")

    # -----------------------------
    # Verify that the quantized model runs
    # -----------------------------
    print("Verifying quantized model...")

    session = ort.InferenceSession(quant_out, providers=["CPUExecutionProvider"])

    # Create test inputs
    test_input_ids = np.random.randint(0, 32000, (1, 32), dtype=np.int64)
    test_attention_mask = np.ones((1, 32), dtype=np.int64)

    outputs = session.run(None, {
        "input_ids": test_input_ids,
        "attention_mask": test_attention_mask,
    })

    print("🔥 Quantized model loaded & executed successfully!")
    print("Output logits shape:", outputs[0].shape)
    print("🎉 Client model ready!")
    return True

if __name__ == "__main__":
    export_client_onnx()
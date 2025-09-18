#!/usr/bin/env python3
"""
Test TensorRT-LLM Engine for Unsloth Legal Model
"""

import os
import sys
from pathlib import Path
import time

try:
    import tensorrt_llm
    from tensorrt_llm.runtime import ModelRunner, GenerationSession
    from transformers import AutoTokenizer
    print(f"TensorRT-LLM version: {tensorrt_llm.__version__}")
except ImportError as e:
    print(f"Error importing TensorRT-LLM: {e}")
    sys.exit(1)

ENGINE_DIR = "tensorrt_models/unsloth_legal_engine"
SOURCE_MODEL = "model_unsloth_hf_f16"

def test_engine():
    """Test the converted TensorRT engine"""
    print("Testing TensorRT-LLM Engine")
    print("=" * 40)

    engine_path = Path(ENGINE_DIR)
    if not engine_path.exists():
        print(f"Error: Engine directory not found: {ENGINE_DIR}")
        return False

    # Check for engine files
    engine_files = list(engine_path.glob("*.plan")) + list(engine_path.glob("*.engine"))
    if not engine_files:
        print("Error: No engine files found")
        return False

    print(f"Found engine files: {[f.name for f in engine_files]}")

    try:
        # Load tokenizer
        print("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(SOURCE_MODEL)

        # Load TensorRT engine
        print("Loading TensorRT engine...")
        model_runner = ModelRunner.from_dir(
            engine_dir=str(engine_path),
            rank=0,
            debug_mode=False
        )

        # Create generation session
        session = GenerationSession(
            model_runner,
            max_batch_size=2,
            max_input_len=2048,
            max_output_len=1024
        )

        # Test legal prompt
        legal_prompt = """You are a legal AI assistant. Analyze the following contract clause:

"The party agrees to indemnify and hold harmless the other party from any claims arising from the performance of this agreement, except in cases of gross negligence or willful misconduct."

What are the key legal considerations?"""

        print("\nTesting legal AI generation...")
        print(f"Prompt: {legal_prompt[:100]}...")

        # Tokenize input
        input_ids = tokenizer.encode(legal_prompt, return_tensors="pt")

        start_time = time.time()

        # Generate response
        outputs = session.generate(
            inputs=[legal_prompt],
            max_new_tokens=256,
            temperature=0.7,
            top_p=0.9,
            do_sample=True
        )

        end_time = time.time()
        generation_time = end_time - start_time

        print(f"\nGeneration completed in {generation_time:.2f} seconds")
        print(f"Response: {outputs[0]}")

        # Performance metrics
        tokens_generated = len(tokenizer.encode(outputs[0]))
        tokens_per_second = tokens_generated / generation_time

        print(f"\nPerformance Metrics:")
        print(f"  Tokens generated: {tokens_generated}")
        print(f"  Generation time: {generation_time:.2f}s")
        print(f"  Tokens/second: {tokens_per_second:.1f}")

        return True

    except Exception as e:
        print(f"Error during engine test: {e}")
        return False

def main():
    """Main test function"""
    success = test_engine()

    if success:
        print("\n✅ TensorRT engine test completed successfully!")
        print("Your Unsloth legal model is ready for high-performance inference")
    else:
        print("\n❌ Engine test failed")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
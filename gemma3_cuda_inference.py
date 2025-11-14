#!/usr/bin/env python3
"""
Simplified Gemma3 CUDA Inference Module
Called by Go service for text generation
"""

import os
import sys
import time
import json
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

# Global variables for model and tokenizer
session = None
tokenizer = None

def init_model():
    """Initialize the model and tokenizer once"""
    global session, tokenizer

    if session is not None:
        return  # Already initialized

    onnx_model_path = "/workspace/onnx_models/gemma3_270m_onnx/gemma3.onnx"
    tokenizer_path = "/workspace/models/gemma3_270m"

    print("Initializing Gemma3 CUDA model...", file=sys.stderr)

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Create CUDA session
    session = ort.InferenceSession(
        onnx_model_path,
        providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
    )

    print("Model initialized successfully", file=sys.stderr)

def generate_text_cuda(prompt, max_length=100, temperature=0.7):
    """Generate text using CUDA-accelerated ONNX model"""

    if session is None or tokenizer is None:
        init_model()

    try:
        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="np", padding=True, truncation=True)

        # Prepare inputs
        ort_inputs = {
            'input_ids': inputs['input_ids'],
            'attention_mask': inputs['attention_mask']
        }

        # Generate tokens
        generated_tokens = []
        current_ids = inputs['input_ids']

        start_time = time.time()
        tokens_generated = 0

        for i in range(max_length):
            # Run inference
            outputs = session.run(None, ort_inputs)

            # Get next token logits
            next_token_logits = outputs[0][:, -1, :]

            # Apply temperature
            if temperature != 1.0:
                next_token_logits = next_token_logits / temperature

            # Sample next token (greedy)
            next_token = np.argmax(next_token_logits, axis=-1)

            # Append to generated tokens
            generated_tokens.append(int(next_token[0]))

            # Check for EOS token
            if next_token[0] == tokenizer.eos_token_id:
                break

            # Update inputs for next iteration
            current_ids = np.concatenate([current_ids, next_token.reshape(1, -1)], axis=1)
            attention_mask = np.ones_like(current_ids)

            ort_inputs['input_ids'] = current_ids
            ort_inputs['attention_mask'] = attention_mask

            tokens_generated += 1

        end_time = time.time()

        # Decode generated tokens
        generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)

        # Calculate performance
        total_time = end_time - start_time
        tokens_per_sec = tokens_generated / total_time if total_time > 0 else 0

        return {
            "generated_text": generated_text,
            "tokens_per_sec": round(tokens_per_sec, 2)
        }

    except Exception as e:
        return {
            "generated_text": "",
            "tokens_per_sec": 0.0,
            "error": str(e)
        }

if __name__ == "__main__":
    # Test the module directly
    init_model()
    result = generate_text_cuda("The legal contract states that", max_length=50)
    print(json.dumps(result))
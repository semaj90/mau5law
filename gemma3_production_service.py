#!/usr/bin/env python3
"""
Production-Ready Gemma3 CUDA Inference Service
High-performance text generation with CUDA acceleration
"""

import os
import sys
import json
import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as ort
from transformers import AutoTokenizer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model variables
session = None
tokenizer = None

def init_model():
    """Initialize the Gemma3 ONNX model with CUDA acceleration"""
    global session, tokenizer

    if session is not None:
        return

    try:
        logger.info("Initializing Gemma3 CUDA model...")

        # Model paths
        onnx_model_path = "/workspace/onnx_models/gemma3_270m_onnx/gemma3.onnx"
        tokenizer_path = "/workspace/models/gemma3_270m"

        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Create CUDA-accelerated session
        session = ort.InferenceSession(
            onnx_model_path,
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )

        logger.info("Model initialized successfully with providers: %s", session.get_providers())

    except Exception as e:
        logger.error("Failed to initialize model: %s", e)
        raise

def generate_text(prompt, max_length=100, temperature=0.7, top_p=0.9):
    """Generate text using the CUDA-accelerated model"""

    if session is None or tokenizer is None:
        init_model()

    try:
        start_time = time.time()

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

        tokens_generated = 0

        for i in range(max_length):
            # Run inference
            outputs = session.run(None, ort_inputs)

            # Get next token logits
            next_token_logits = outputs[0][:, -1, :]

            # Apply temperature and top-p sampling
            if temperature != 1.0:
                next_token_logits = next_token_logits / temperature

            # Simple top-p sampling (nucleus sampling)
            if top_p < 1.0:
                sorted_logits = np.sort(next_token_logits[0])
                sorted_probs = np.exp(sorted_logits) / np.sum(np.exp(sorted_logits))
                cumulative_probs = np.cumsum(sorted_probs)

                # Find cutoff
                cutoff_idx = np.searchsorted(cumulative_probs, top_p)
                if cutoff_idx < len(sorted_logits):
                    cutoff_value = sorted_logits[cutoff_idx]
                    next_token_logits[next_token_logits < cutoff_value] = -float('inf')

            # Sample next token
            next_token_logits = next_token_logits - np.max(next_token_logits)  # Normalize
            probs = np.exp(next_token_logits) / np.sum(np.exp(next_token_logits))
            next_token = np.random.choice(len(probs[0]), p=probs[0])

            # Append to generated tokens
            generated_tokens.append(int(next_token))

            # Check for EOS token
            if next_token == tokenizer.eos_token_id:
                break

            # Update inputs for next iteration
            current_ids = np.concatenate([current_ids, np.array([[next_token]])], axis=1)
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
            "tokens_generated": tokens_generated,
            "generation_time": round(total_time, 3),
            "tokens_per_sec": round(tokens_per_sec, 2),
            "model": "gemma3-270m-onnx-cuda"
        }

    except Exception as e:
        logger.error("Error generating text: %s", e)
        return {
            "error": str(e),
            "generated_text": "",
            "tokens_generated": 0,
            "generation_time": 0,
            "tokens_per_sec": 0
        }

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text endpoint"""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Missing prompt parameter'}), 400

        prompt = data['prompt']
        max_length = data.get('max_length', 100)
        temperature = data.get('temperature', 0.7)
        top_p = data.get('top_p', 0.9)

        result = generate_text(prompt, max_length, temperature, top_p)

        if 'error' in result:
            return jsonify(result), 500

        return jsonify(result)

    except Exception as e:
        logger.error("API error: %s", e)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Quick test generation
        test_result = generate_text("Hello", max_length=10)
        return jsonify({
            'status': 'healthy',
            'model': 'gemma3-270m-onnx-cuda',
            'cuda_available': 'CUDAExecutionProvider' in [p for p, _ in session.get_providers()],
            'test_generation': 'generated_text' in test_result,
            'timestamp': int(time.time())
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': int(time.time())
        }), 500

@app.route('/models', methods=['GET'])
def models():
    """List available models"""
    return jsonify({
        'models': [{
            'id': 'gemma3-270m-onnx-cuda',
            'object': 'model',
            'owned_by': 'legal-ai',
            'permission': ['generate']
        }]
    })

@app.route('/chat/completions', methods=['POST'])
def chat_completions():
    """OpenAI-compatible chat completions endpoint"""
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({'error': 'Missing messages parameter'}), 400

        # Extract the last user message
        messages = data['messages']
        user_message = None
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                user_message = msg.get('content', '')
                break

        if not user_message:
            return jsonify({'error': 'No user message found'}), 400

        # Generate response
        max_tokens = data.get('max_tokens', 100)
        temperature = data.get('temperature', 0.7)

        result = generate_text(user_message, max_tokens, temperature)

        if 'error' in result:
            return jsonify({'error': result['error']}), 500

        # Format as OpenAI response
        response = {
            'id': f'chatcmpl-{int(time.time())}',
            'object': 'chat.completion',
            'created': int(time.time()),
            'model': 'gemma3-270m-onnx-cuda',
            'choices': [{
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': result['generated_text']
                },
                'finish_reason': 'stop'
            }],
            'usage': {
                'prompt_tokens': len(tokenizer.encode(user_message)),
                'completion_tokens': result['tokens_generated'],
                'total_tokens': len(tokenizer.encode(user_message)) + result['tokens_generated']
            }
        }

        return jsonify(response)

    except Exception as e:
        logger.error("Chat completion error: %s", e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize model on startup
    try:
        init_model()
    except Exception as e:
        logger.error("Failed to initialize model on startup: %s", e)
        sys.exit(1)

    port = int(os.environ.get('PORT', 8090))
    logger.info("🚀 Gemma3 CUDA Inference Service starting on port %d", port)
    logger.info("📍 Endpoints:")
    logger.info("   POST /generate - Text generation")
    logger.info("   POST /chat/completions - OpenAI-compatible chat")
    logger.info("   GET  /health - Health check")
    logger.info("   GET  /models - List models")

    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
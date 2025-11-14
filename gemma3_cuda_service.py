#!/usr/bin/env python3
"""
Gemma3 CUDA Inference HTTP Service
Provides REST API for CUDA-accelerated Gemma3 text generation
"""

import sys
import os
import json
import time
from flask import Flask, request, jsonify
from gemma3_cuda_inference import generate_text_cuda

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
    """Generate text using Gemma3 CUDA model"""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Missing prompt parameter'}), 400

        prompt = data['prompt']
        max_length = data.get('max_length', 100)
        temperature = data.get('temperature', 0.7)

        # Generate text
        result = generate_text_cuda(prompt, max_length=max_length, temperature=temperature)

        if 'error' in result:
            return jsonify({'error': result['error']}), 500

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'gemma3-270m-onnx-cuda',
        'timestamp': int(time.time())
    })

@app.route('/test', methods=['GET'])
def test():
    """Test endpoint with a sample legal prompt"""
    try:
        result = generate_text_cuda("The legal contract states that", max_length=50)
        return jsonify({
            'test_result': result,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'failed'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8090))
    print(f"🚀 Gemma3 CUDA Inference Service starting on port {port}")
    print("📍 Endpoints:")
    print("   POST /generate - Run text generation")
    print("   GET  /health   - Health check")
    print("   GET  /test     - Test with sample prompt")

    app.run(host='0.0.0.0', port=port, debug=False)
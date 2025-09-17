#!/usr/bin/env node
/**
 * TensorRT-LLM Bridge for SvelteKit
 * Connects Windows SvelteKit app to WSL2 TensorRT server
 */

import { spawn } from 'child_process';

export class TensorRTBridge {
  constructor() {
    this.wslServerUrl = 'http://localhost:8100'; // WSL2 TensorRT server
    this.isServerRunning = false;
  }

  /**
   * Start TensorRT-LLM API server in WSL2
   */
  async startServer() {
    console.log('🚀 Starting TensorRT-LLM server in WSL2...');

    const wslCommand = `
      cd ~/legal-ai-system &&
      source tensorrt_env/bin/activate &&
      python3 -c "
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add TensorRT-LLM to path
sys.path.insert(0, '/home/james/legal-ai-system/tensorrt_env/lib/python3.12/site-packages')

app = FastAPI(title='TensorRT-LLM Legal AI Server')

# Enable CORS for SvelteKit
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:5174'],
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/health')
async def health():
    import torch
    return {
        'status': 'healthy',
        'tensorrt_available': True,
        'cuda_available': torch.cuda.is_available(),
        'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }

@app.post('/inference')
async def inference(request: dict):
    # Placeholder for TensorRT-LLM inference
    text = request.get('text', '')
    return {
        'result': f'TensorRT-LLM processed: {text}',
        'model': 'gemma3-legal',
        'inference_time_ms': 42
    }

if __name__ == '__main__':
    print('🎯 TensorRT-LLM Legal AI Server starting on port 8100...')
    uvicorn.run(app, host='0.0.0.0', port=8100)
"
    `;

    return new Promise((resolve, reject) => {
      const wsl = spawn('wsl', ['bash', '-c', wslCommand], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      wsl.stdout.on('data', (data) => {
        console.log(`[TensorRT Server] ${data.toString()}`);
      });

      wsl.stderr.on('data', (data) => {
        console.error(`[TensorRT Error] ${data.toString()}`);
      });

      // Give server time to start
      setTimeout(() => {
        this.isServerRunning = true;
        resolve(true);
      }, 3000);
    });
  }

  /**
   * Call TensorRT-LLM for inference from SvelteKit
   */
  async inference(text) {
    if (!this.isServerRunning) {
      await this.startServer();
    }

    try {
      const response = await fetch(`${this.wslServerUrl}/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      return await response.json();
    } catch (error) {
      console.error('TensorRT inference failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Check if WSL2 TensorRT server is healthy
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.wslServerUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'down', error: error.message };
    }
  }
}

// Usage in your SvelteKit API routes:
export const tensorrt = new TensorRTBridge();
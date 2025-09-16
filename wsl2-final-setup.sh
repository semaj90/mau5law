#!/bin/bash
# Final WSL2 TensorRT-LLM Setup Script
# Completes the installation and starts the optimized server

# Continue from the previous script...
WORKSPACE_DIR="$HOME/tensorrt_workspace"
VENV_DIR="$WORKSPACE_DIR/venv_tensorrt"
ENGINES_DIR="$WORKSPACE_DIR/engines"
HF_MODEL_DIR="$WORKSPACE_DIR/hf_model"

# Complete the serving script creation
complete_serving_script() {
    log "Completing TensorRT-LLM serving script..."

    # Copy the complete server implementation
    cp /mnt/c/Users/james/Videos/deeds-web-app/wsl2-complete-server.py "$WORKSPACE_DIR/tensorrt_server.py"

    # Make it executable
    chmod +x "$WORKSPACE_DIR/tensorrt_server.py"

    # Create startup script
    cat > "$WORKSPACE_DIR/start_server.sh" << 'STARTEOF'
#!/bin/bash
# TensorRT-LLM Server Startup Script

WORKSPACE_DIR="$HOME/tensorrt_workspace"
VENV_DIR="$WORKSPACE_DIR/venv_tensorrt"
ENGINES_DIR="$WORKSPACE_DIR/engines"
HF_MODEL_DIR="$WORKSPACE_DIR/hf_model"

echo "🚀 Starting TensorRT-LLM Legal AI Server"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Set environment variables
export ENGINES_DIR="$ENGINES_DIR"
export HF_MODEL_DIR="$HF_MODEL_DIR"
export CUDA_VISIBLE_DEVICES=0

# Start server
cd "$WORKSPACE_DIR"
python3 tensorrt_server.py \
    --engine_dir "$ENGINES_DIR" \
    --tokenizer_dir "$HF_MODEL_DIR" \
    --host 0.0.0.0 \
    --port 8100 \
    --workers 1
STARTEOF

    chmod +x "$WORKSPACE_DIR/start_server.sh"
    log "✅ Server scripts created"
}

# Create FastAPI server wrapper
create_fastapi_wrapper() {
    log "Creating FastAPI server wrapper..."

    cat > "$WORKSPACE_DIR/run_server.py" << 'FASTEOF'
#!/usr/bin/env python3
"""
FastAPI server wrapper for TensorRT-LLM Legal AI
"""

import os
import sys
from pathlib import Path

# Add the server to Python path
sys.path.insert(0, str(Path(__file__).parent))

from wsl2_complete_server import TensorRTLegalServer, CompletionRequest, CompletionResponse, BatchRequest, BatchResponse, MetricsResponse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

# Configuration
ENGINES_DIR = os.environ.get('ENGINES_DIR', str(Path.home() / 'tensorrt_workspace' / 'engines'))
HF_MODEL_DIR = os.environ.get('HF_MODEL_DIR', str(Path.home() / 'tensorrt_workspace' / 'hf_model'))

# Initialize server
server = TensorRTLegalServer(ENGINES_DIR, HF_MODEL_DIR)

# Create FastAPI app
app = FastAPI(
    title="Gemma3-Legal TensorRT-LLM API",
    description="High-performance legal AI with Q4_K_M optimization",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/v1/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    """Process legal completion request"""
    return await server.process_completion(request)

@app.post("/v1/batch", response_model=BatchResponse)
async def create_batch_completion(request: BatchRequest):
    """Process batch completion requests"""
    return await server.process_batch(request)

@app.post("/v1/stream")
async def create_streaming_completion(request: CompletionRequest):
    """Stream legal completion response"""
    return StreamingResponse(
        server.stream_completion(request),
        media_type="text/plain"
    )

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get server performance metrics"""
    return server.get_metrics()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    metrics = server.get_metrics()
    return {
        "status": "healthy",
        "model_status": metrics.model_status,
        "uptime_seconds": metrics.uptime_seconds,
        "requests_processed": metrics.requests_processed
    }

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8100, help="Port to bind to")
    parser.add_argument("--workers", type=int, default=1, help="Number of workers")
    parser.add_argument("--engine_dir", default=ENGINES_DIR, help="TensorRT engine directory")
    parser.add_argument("--tokenizer_dir", default=HF_MODEL_DIR, help="Tokenizer directory")

    args = parser.parse_args()

    print(f"🌐 Starting server on {args.host}:{args.port}")
    print(f"📁 Engine dir: {args.engine_dir}")
    print(f"🔤 Tokenizer dir: {args.tokenizer_dir}")

    uvicorn.run(
        "run_server:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        loop="uvloop",
        http="httptools"
    )
FASTEOF

    chmod +x "$WORKSPACE_DIR/run_server.py"
    log "✅ FastAPI wrapper created"
}

# Create performance test script
create_performance_test() {
    log "Creating performance test script..."

    cat > "$WORKSPACE_DIR/test_performance.py" << 'TESTEOF'
#!/usr/bin/env python3
"""
Performance test for TensorRT-LLM Legal AI Server
"""

import asyncio
import aiohttp
import time
import json
from typing import List

async def test_single_request(session: aiohttp.ClientSession, prompt: str):
    """Test single completion request"""
    start_time = time.perf_counter()

    async with session.post("http://localhost:8100/v1/completions", json={
        "prompt": prompt,
        "max_tokens": 256,
        "temperature": 0.1
    }) as response:
        result = await response.json()
        latency = (time.perf_counter() - start_time) * 1000

        return {
            "latency_ms": latency,
            "server_latency_ms": result.get("latency_ms", 0),
            "tokens": result.get("tokens", 0),
            "throughput_tps": result.get("throughput_tps", 0)
        }

async def test_concurrent_requests(num_requests: int = 10):
    """Test concurrent requests"""
    print(f"🧪 Testing {num_requests} concurrent requests...")

    prompts = [
        "Analyze this employment contract for potential issues.",
        "Review this lease agreement for compliance risks.",
        "Examine this non-disclosure agreement for enforceability.",
        "Assess this merger agreement for regulatory concerns.",
        "Evaluate this licensing agreement for IP protection."
    ] * (num_requests // 5 + 1)

    async with aiohttp.ClientSession() as session:
        start_time = time.perf_counter()

        tasks = [test_single_request(session, prompts[i % len(prompts)])
                for i in range(num_requests)]

        results = await asyncio.gather(*tasks)

        total_time = time.perf_counter() - start_time

        # Calculate metrics
        latencies = [r["latency_ms"] for r in results]
        server_latencies = [r["server_latency_ms"] for r in results]
        total_tokens = sum(r["tokens"] for r in results)

        print(f"📊 Performance Results:")
        print(f"   Total time: {total_time:.2f}s")
        print(f"   Requests/sec: {num_requests / total_time:.1f}")
        print(f"   Avg latency: {sum(latencies) / len(latencies):.2f}ms")
        print(f"   Min latency: {min(latencies):.2f}ms")
        print(f"   Max latency: {max(latencies):.2f}ms")
        print(f"   Avg server latency: {sum(server_latencies) / len(server_latencies):.2f}ms")
        print(f"   Total tokens: {total_tokens}")
        print(f"   Tokens/sec: {total_tokens / total_time:.1f}")

async def test_streaming():
    """Test streaming completion"""
    print("🌊 Testing streaming completion...")

    async with aiohttp.ClientSession() as session:
        start_time = time.perf_counter()

        async with session.post("http://localhost:8100/v1/stream", json={
            "prompt": "Provide a comprehensive analysis of contract termination clauses.",
            "max_tokens": 512,
            "stream": True
        }) as response:
            tokens_received = 0
            first_token_time = None

            async for chunk in response.content.iter_chunked(1024):
                if first_token_time is None:
                    first_token_time = time.perf_counter()

                tokens_received += len(chunk.decode().split())

            total_time = time.perf_counter() - start_time
            time_to_first_token = (first_token_time - start_time) * 1000 if first_token_time else 0

            print(f"   Total time: {total_time:.2f}s")
            print(f"   Time to first token: {time_to_first_token:.2f}ms")
            print(f"   Tokens received: {tokens_received}")
            print(f"   Streaming throughput: {tokens_received / total_time:.1f} tokens/s")

async def main():
    """Run all performance tests"""
    print("🚀 TensorRT-LLM Legal AI Performance Testing")
    print("=" * 50)

    # Wait for server to be ready
    print("⏳ Waiting for server to be ready...")
    async with aiohttp.ClientSession() as session:
        for _ in range(30):
            try:
                async with session.get("http://localhost:8100/health") as response:
                    if response.status == 200:
                        print("✅ Server is ready")
                        break
            except:
                await asyncio.sleep(1)
        else:
            print("❌ Server not ready after 30 seconds")
            return

    # Run tests
    await test_single_request(
        aiohttp.ClientSession(),
        "Test legal analysis prompt"
    )
    await test_concurrent_requests(5)
    await test_concurrent_requests(10)
    await test_streaming()

    # Get final metrics
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8100/metrics") as response:
            metrics = await response.json()
            print(f"\n📈 Server Metrics:")
            print(f"   Requests processed: {metrics['requests_processed']}")
            print(f"   Average latency: {metrics['avg_latency_ms']:.2f}ms")
            print(f"   Total tokens: {metrics['total_tokens_generated']}")
            print(f"   Average throughput: {metrics['avg_throughput_tps']:.1f} tokens/s")
            print(f"   GPU utilization: {metrics['gpu_utilization']:.1f}%")
            print(f"   Memory usage: {metrics['memory_usage_mb']:.0f}MB")

if __name__ == "__main__":
    asyncio.run(main())
TESTEOF

    chmod +x "$WORKSPACE_DIR/test_performance.py"
    log "✅ Performance test script created"
}

# Create monitoring script
create_monitoring_script() {
    log "Creating monitoring script..."

    cat > "$WORKSPACE_DIR/monitor.sh" << 'MONEOF'
#!/bin/bash
# TensorRT-LLM Server Monitoring Script

WORKSPACE_DIR="$HOME/tensorrt_workspace"

echo "🔍 TensorRT-LLM Legal AI Server Monitor"
echo "======================================"

# Check if server is running
if pgrep -f "tensorrt_server.py" > /dev/null; then
    echo "✅ Server is running"

    # Get process info
    PID=$(pgrep -f "tensorrt_server.py")
    echo "   PID: $PID"

    # Get metrics from server
    if curl -s http://localhost:8100/health > /dev/null; then
        echo "✅ Server is responding"

        # Fetch and display metrics
        METRICS=$(curl -s http://localhost:8100/metrics)
        echo "📊 Current Metrics:"
        echo "$METRICS" | jq '.' 2>/dev/null || echo "$METRICS"

    else
        echo "❌ Server not responding on port 8100"
    fi

    # GPU status
    if command -v nvidia-smi &> /dev/null; then
        echo ""
        echo "🎮 GPU Status:"
        nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits
    fi

else
    echo "❌ Server is not running"
    echo "💡 Start with: cd $WORKSPACE_DIR && ./start_server.sh"
fi

# Show recent logs if available
if [ -f "$WORKSPACE_DIR/server.log" ]; then
    echo ""
    echo "📝 Recent logs:"
    tail -n 10 "$WORKSPACE_DIR/server.log"
fi
MONEOF

    chmod +x "$WORKSPACE_DIR/monitor.sh"
    log "✅ Monitoring script created"
}

# Main execution function
main() {
    complete_serving_script
    create_fastapi_wrapper
    create_performance_test
    create_monitoring_script

    log "🎉 WSL2 TensorRT-LLM setup complete!"
    echo ""
    echo "📋 Available commands:"
    echo "   Start server:     cd $WORKSPACE_DIR && ./start_server.sh"
    echo "   Run FastAPI:      cd $WORKSPACE_DIR && python3 run_server.py"
    echo "   Test performance: cd $WORKSPACE_DIR && python3 test_performance.py"
    echo "   Monitor server:   cd $WORKSPACE_DIR && ./monitor.sh"
    echo ""
    echo "🌐 Server will be available at: http://localhost:8100"
    echo "📊 Metrics endpoint: http://localhost:8100/metrics"
    echo "🔍 Health check: http://localhost:8100/health"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
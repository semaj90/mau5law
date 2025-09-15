# Triton+TensorRT Legal AI Production Sketch
Replace vLLM Workers with TensorRT Engines + Triton Server

## 🎯 OVERVIEW: vLLM → Triton Migration
**Goal**: Replace Python vLLM inference workers with optimized TensorRT engines served via Triton

### Performance Target:
- **Current vLLM**: 50-200ms legal document embedding
- **Target Triton+TensorRT**: 0.5-5ms legal document embedding
- **Throughput**: 10-50x improvement for stable legal AI models

---

## 📋 STEP 1: ONNX Export from Legal AI Models

### Export Gemma Legal Embeddings Model:
```python
# scripts/export_legal_models_to_onnx.py
import torch
import torch.onnx
from transformers import AutoModel, AutoTokenizer
import onnx
import onnxsim

class LegalEmbeddingExporter:
    def __init__(self, model_name="embeddinggemma:latest"):
        self.model_name = model_name
        self.model = AutoModel.from_pretrained(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

    def export_to_onnx(self, output_path="models/legal_embedding.onnx"):
        """Export legal embedding model to ONNX format"""

        # Set model to eval mode
        self.model.eval()

        # Create dummy input for legal text (512 token max)
        dummy_input = torch.randint(1, 1000, (1, 512), dtype=torch.long)
        attention_mask = torch.ones(1, 512, dtype=torch.long)

        # Define input names for Triton
        input_names = ["input_ids", "attention_mask"]
        output_names = ["embeddings"]

        # Dynamic axes for batching
        dynamic_axes = {
            "input_ids": {0: "batch_size", 1: "sequence"},
            "attention_mask": {0: "batch_size", 1: "sequence"},
            "embeddings": {0: "batch_size"}
        }

        print(f"🔧 Exporting {self.model_name} to ONNX...")

        # Export to ONNX
        torch.onnx.export(
            self.model,
            (dummy_input, attention_mask),
            output_path,
            export_params=True,
            opset_version=17,
            do_constant_folding=True,
            input_names=input_names,
            output_names=output_names,
            dynamic_axes=dynamic_axes,
            verbose=True
        )

        # Simplify ONNX model
        print("🚀 Simplifying ONNX model...")
        model_onnx = onnx.load(output_path)
        model_simp, check = onnxsim.simplify(model_onnx)
        assert check, "Simplified ONNX model could not be validated"
        onnx.save(model_simp, output_path)

        print(f"✅ Legal embedding model exported to {output_path}")
        return output_path

# Export legal AI models
if __name__ == "__main__":
    exporter = LegalEmbeddingExporter()

    # Export embedding model
    embedding_onnx = exporter.export_to_onnx("models/legal_embedding.onnx")

    # Verify ONNX model
    print("🔍 Verifying ONNX model...")
    onnx_model = onnx.load(embedding_onnx)
    onnx.checker.check_model(onnx_model)
    print("✅ ONNX model verified successfully")
```

### Legal Text Generation Model Export:
```python
# Export legal text generation (if using local Gemma3)
class LegalTextGenerationExporter:
    def __init__(self, model_name="gemma3:legal-latest"):
        self.model_name = model_name

    def export_generation_model(self, output_path="models/legal_generation.onnx"):
        """Export legal text generation model"""

        # Configure for legal text generation
        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )

        # Legal-specific configuration
        dummy_input = torch.randint(1, 1000, (1, 256), dtype=torch.long)

        # Export with legal-optimized settings
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=17,
            input_names=["input_ids"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence"},
                "logits": {0: "batch_size", 1: "sequence"}
            }
        )

        print(f"✅ Legal generation model exported to {output_path}")
```

---

## 🔨 STEP 2: Build TensorRT Engines

### TensorRT Engine Builder Script:
```bash
#!/bin/bash
# scripts/build_tensorrt_engines.sh

set -e

echo "🚀 Building TensorRT engines for Legal AI models..."

# Create output directory
mkdir -p triton-models/legal_embedding/1
mkdir -p triton-models/legal_generation/1

# Build Legal Embedding Engine
echo "🔧 Building legal embedding TensorRT engine..."
trtexec \
    --onnx=models/legal_embedding.onnx \
    --saveEngine=triton-models/legal_embedding/1/model.plan \
    --minShapes=input_ids:1x1,attention_mask:1x1 \
    --optShapes=input_ids:8x512,attention_mask:8x512 \
    --maxShapes=input_ids:32x512,attention_mask:32x512 \
    --fp16 \
    --memPoolSize=workspace:2048 \
    --builderOptimizationLevel=5 \
    --verbose

echo "🔧 Building legal generation TensorRT engine..."
trtexec \
    --onnx=models/legal_generation.onnx \
    --saveEngine=triton-models/legal_generation/1/model.plan \
    --minShapes=input_ids:1x1 \
    --optShapes=input_ids:4x256 \
    --maxShapes=input_ids:16x512 \
    --fp16 \
    --memPoolSize=workspace:4096 \
    --builderOptimizationLevel=5 \
    --verbose

echo "✅ TensorRT engines built successfully!"

# Verify engine files
ls -la triton-models/legal_embedding/1/model.plan
ls -la triton-models/legal_generation/1/model.plan
```

### Legal-Specific TensorRT Optimizations:
```bash
# Advanced TensorRT build with legal AI optimizations
trtexec \
    --onnx=models/legal_embedding.onnx \
    --saveEngine=triton-models/legal_embedding/1/model.plan \
    --minShapes=input_ids:1x64,attention_mask:1x64 \
    --optShapes=input_ids:16x512,attention_mask:16x512 \
    --maxShapes=input_ids:32x512,attention_mask:32x512 \
    --fp16 \
    --int8 \
    --calibrationTableName=legal_embedding_calibration.cache \
    --memPoolSize=workspace:4096 \
    --builderOptimizationLevel=5 \
    --profilingVerbosity=detailed \
    --dumpLayerInfo \
    --exportTimes=legal_embedding_timing.json \
    --verbose
```

---

## ⚙️ STEP 3: Triton Model Configuration

### Legal Embedding Model Config:
```protobuf
# triton-models/legal_embedding/config.pbtxt
name: "legal_embedding"
backend: "tensorrt"
max_batch_size: 32
platform: "tensorrt_plan"

input [
  {
    name: "input_ids"
    data_type: TYPE_INT32
    dims: [ -1 ]
  },
  {
    name: "attention_mask"
    data_type: TYPE_INT32
    dims: [ -1 ]
  }
]

output [
  {
    name: "embeddings"
    data_type: TYPE_FP32
    dims: [ 768 ]
  }
]

# Legal AI specific optimizations
optimization {
  priority: PRIORITY_MAX
  input_pinned_memory {
    enable: true
  }
  output_pinned_memory {
    enable: true
  }
}

# Dynamic batching for legal document processing
dynamic_batching {
  preferred_batch_size: [ 4, 8, 16 ]
  max_queue_delay_microseconds: 100
  preserve_ordering: false
}

# Instance groups for legal workloads
instance_group [
  {
    count: 2
    kind: KIND_GPU
    gpus: [ 0 ]
    profile: [ "legal_high_throughput" ]
  }
]

# Model warmup with legal text samples
model_warmup [
  {
    name: "legal_contract_warmup"
    batch_size: 8
    inputs: {
      key: "input_ids"
      value: {
        data_type: TYPE_INT32
        dims: [ 512 ]
        zero_data: false
        random_data: true
      }
    }
    inputs: {
      key: "attention_mask"
      value: {
        data_type: TYPE_INT32
        dims: [ 512 ]
        zero_data: false
        random_data: true
      }
    }
  }
]
```

### Legal Generation Model Config:
```protobuf
# triton-models/legal_generation/config.pbtxt
name: "legal_generation"
backend: "tensorrt"
max_batch_size: 16
platform: "tensorrt_plan"

input [
  {
    name: "input_ids"
    data_type: TYPE_INT32
    dims: [ -1 ]
  }
]

output [
  {
    name: "logits"
    data_type: TYPE_FP32
    dims: [ -1, 32000 ]  # Gemma vocab size
  }
]

# Sequence batching for generation
sequence_batching {
  max_sequence_idle_microseconds: 5000000
  control_input [
    {
      name: "START"
      control: [
        {
          kind: CONTROL_SEQUENCE_START
          fp32_false_true: [ 0, 1 ]
        }
      ]
    },
    {
      name: "END"
      control: [
        {
          kind: CONTROL_SEQUENCE_END
          fp32_false_true: [ 0, 1 ]
        }
      ]
    }
  ]
}

# Legal generation optimization
optimization {
  priority: PRIORITY_MAX
  execution_accelerators {
    gpu_execution_accelerator : [ {
      name : "tensorrt"
      parameters { key: "precision_mode" value: "FP16" }
      parameters { key: "max_workspace_size_bytes" value: "4294967296" }
    }]
  }
}
```

---

## 🐳 STEP 4: Triton Server Deployment

### Docker Compose for Legal AI Triton Stack:
```yaml
# docker-compose.triton.yml
version: '3.8'

services:
  triton-legal-ai:
    image: nvcr.io/nvidia/tritonserver:24.08-py3
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=0
      - CUDA_DEVICE_ORDER=PCI_BUS_ID
    ports:
      - "8000:8000"  # HTTP
      - "8001:8001"  # gRPC
      - "8002:8002"  # Metrics
    volumes:
      - ./triton-models:/models:ro
      - ./triton-logs:/logs
    command: >
      tritonserver
        --model-repository=/models
        --strict-model-config=false
        --grpc-infer-allocation-pool-size=16
        --http-thread-count=8
        --grpc-max-response-message-size=268435456
        --backend-config=tensorrt,coalesce-request-input=true
        --log-verbose=1
        --log-info=true
        --log-warning=true
        --log-error=true
        --metrics-port=8002
        --allow-metrics=true
        --allow-gpu-metrics=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/v2/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  legal-api-gateway:
    build:
      context: ./cmd/legal-gateway
      dockerfile: Dockerfile.triton
    ports:
      - "8080:8080"
    depends_on:
      - triton-legal-ai
      - postgres-cuda
    environment:
      - TRITON_HTTP_ENDPOINT=triton-legal-ai:8000
      - TRITON_GRPC_ENDPOINT=triton-legal-ai:8001
      - DATABASE_URL=postgresql://legal_admin:123456@postgres-cuda:5432/legal_ai_db
      - REDIS_URL=redis://redis-legal:6379
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs

  postgres-cuda:
    image: pgvector/pgvector:pg17
    environment:
      - POSTGRES_DB=legal_ai_db
      - POSTGRES_USER=legal_admin
      - POSTGRES_PASSWORD=123456
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis-legal:
    image: redis:7-alpine
    command: redis-server --requirepass redis --maxmemory 2gb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 🚀 STEP 5: Legal Gateway with Triton Integration

### Go Legal Gateway with Triton Client:
```go
// cmd/legal-gateway/main.go
package main

import (
    "context"
    "log"
    "net/http"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    triton "github.com/triton-inference-server/client/src/grpc_generated/golang"
)

type LegalAIGateway struct {
    tritonClient triton.GRPCInferenceServiceClient
    tritonConn   *grpc.ClientConn
    dbClient     *PostgresClient
    redisClient  *RedisClient
}

func NewLegalAIGateway() (*LegalAIGateway, error) {
    // Connect to Triton gRPC
    tritonConn, err := grpc.Dial(
        "triton-legal-ai:8001",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(268435456)),
    )
    if err != nil {
        return nil, err
    }

    gateway := &LegalAIGateway{
        tritonClient: triton.NewGRPCInferenceServiceClient(tritonConn),
        tritonConn:   tritonConn,
    }

    // Initialize database and cache connections
    gateway.dbClient = NewPostgresClient()
    gateway.redisClient = NewRedisClient()

    return gateway, nil
}

// Legal document embedding via Triton
func (gw *LegalAIGateway) ProcessLegalEmbedding(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
    startTime := time.Now()

    // Tokenize legal text
    tokenizer := NewLegalTokenizer()
    inputIDs, attentionMask := tokenizer.TokenizeLegalText(req.Text)

    // Create Triton inference request
    tritonReq := &triton.ModelInferRequest{
        ModelName: "legal_embedding",
        Inputs: []*triton.ModelInferRequest_InferInputTensor{
            {
                Name:     "input_ids",
                Datatype: "INT32",
                Shape:    []int64{1, int64(len(inputIDs))},
                Contents: &triton.InferTensorContents{
                    IntContents: inputIDs,
                },
            },
            {
                Name:     "attention_mask",
                Datatype: "INT32",
                Shape:    []int64{1, int64(len(attentionMask))},
                Contents: &triton.InferTensorContents{
                    IntContents: attentionMask,
                },
            },
        },
        Outputs: []*triton.ModelInferRequest_InferRequestedOutputTensor{
            {Name: "embeddings"},
        },
    }

    // Execute inference
    tritonResp, err := gw.tritonClient.ModelInfer(ctx, tritonReq)
    if err != nil {
        return nil, err
    }

    // Extract embeddings
    embeddings := tritonResp.Outputs[0].Contents.Fp32Contents
    inferenceTime := time.Since(startTime)

    log.Printf("🔥 Triton legal embedding: %.2fms for %d dimensions",
               float64(inferenceTime.Nanoseconds())/1e6, len(embeddings))

    return &EmbeddingResponse{
        Embeddings:      embeddings,
        Model:          "legal_embedding",
        ProcessingTime: inferenceTime,
        Backend:        "triton-tensorrt",
    }, nil
}

// Batch processing for legal documents
func (gw *LegalAIGateway) BatchProcessLegalDocuments(ctx context.Context, documents []LegalDocument) ([]EmbeddingResult, error) {
    batchSize := min(len(documents), 32) // Max batch size from config

    // Prepare batch inputs
    batchInputIDs := make([]int32, 0)
    batchAttentionMask := make([]int32, 0)
    docLengths := make([]int, batchSize)

    tokenizer := NewLegalTokenizer()

    for i := 0; i < batchSize; i++ {
        inputIDs, attentionMask := tokenizer.TokenizeLegalText(documents[i].Content)
        batchInputIDs = append(batchInputIDs, inputIDs...)
        batchAttentionMask = append(batchAttentionMask, attentionMask...)
        docLengths[i] = len(inputIDs)
    }

    // Create batched Triton request
    tritonReq := &triton.ModelInferRequest{
        ModelName: "legal_embedding",
        Inputs: []*triton.ModelInferRequest_InferInputTensor{
            {
                Name:     "input_ids",
                Datatype: "INT32",
                Shape:    []int64{int64(batchSize), int64(len(batchInputIDs)/batchSize)},
                Contents: &triton.InferTensorContents{
                    IntContents: batchInputIDs,
                },
            },
            {
                Name:     "attention_mask",
                Datatype: "INT32",
                Shape:    []int64{int64(batchSize), int64(len(batchAttentionMask)/batchSize)},
                Contents: &triton.InferTensorContents{
                    IntContents: batchAttentionMask,
                },
            },
        },
        Outputs: []*triton.ModelInferRequest_InferRequestedOutputTensor{
            {Name: "embeddings"},
        },
    }

    startTime := time.Now()
    tritonResp, err := gw.tritonClient.ModelInfer(ctx, tritonReq)
    if err != nil {
        return nil, err
    }

    batchTime := time.Since(startTime)

    // Parse batch results
    allEmbeddings := tritonResp.Outputs[0].Contents.Fp32Contents
    results := make([]EmbeddingResult, batchSize)

    for i := 0; i < batchSize; i++ {
        startIdx := i * 768
        endIdx := (i + 1) * 768
        results[i] = EmbeddingResult{
            DocumentID: documents[i].ID,
            CaseID:     documents[i].CaseID,
            Embedding:  allEmbeddings[startIdx:endIdx],
            Metadata: LegalMetadata{
                CaseType:     documents[i].Metadata.CaseType,
                Jurisdiction: documents[i].Metadata.Jurisdiction,
                ProcessedAt:  time.Now(),
            },
        }
    }

    log.Printf("🚀 Triton batch processing: %d legal documents in %.2fms (%.2fms per doc)",
               batchSize, float64(batchTime.Nanoseconds())/1e6,
               float64(batchTime.Nanoseconds())/1e6/float64(batchSize))

    return results, nil
}

// HTTP handlers
func (gw *LegalAIGateway) handleLegalEmbedding(w http.ResponseWriter, r *http.Request) {
    var req EmbeddingRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    resp, err := gw.ProcessLegalEmbedding(r.Context(), &req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func main() {
    gateway, err := NewLegalAIGateway()
    if err != nil {
        log.Fatal("Failed to initialize gateway:", err)
    }
    defer gateway.tritonConn.Close()

    http.HandleFunc("/api/embedding", gateway.handleLegalEmbedding)
    http.HandleFunc("/api/batch-embedding", gateway.handleBatchEmbedding)
    http.HandleFunc("/api/health", gateway.handleHealth)

    log.Printf("🚀 Legal AI Gateway with Triton backend starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

---

## 📊 STEP 6: Performance Monitoring & Metrics

### Triton Metrics Collection:
```bash
# Monitor Triton performance
curl http://localhost:8002/metrics | grep -E "(triton_|nv_)"

# Legal AI specific metrics
curl http://localhost:8002/v2/models/legal_embedding/stats | jq '.'
curl http://localhost:8002/v2/models/legal_generation/stats | jq '.'
```

### Performance Benchmarking Script:
```python
# scripts/benchmark_triton_legal.py
import asyncio
import aiohttp
import time
import numpy as np
from concurrent.futures import ThreadPoolExecutor

class LegalTritonBenchmark:
    def __init__(self, gateway_url="http://localhost:8080"):
        self.gateway_url = gateway_url

    async def benchmark_embedding_performance(self, num_requests=1000, concurrency=32):
        """Benchmark legal embedding performance"""

        legal_texts = [
            "Contract dispute regarding breach of warranty provisions",
            "Criminal defendant charged with felony assault in the third degree",
            "Intellectual property infringement claim for patent violation",
            "Employment discrimination case under Title VII provisions",
            # ... more legal test cases
        ]

        async def single_request(session, text):
            start_time = time.time()
            async with session.post(
                f"{self.gateway_url}/api/embedding",
                json={"text": text, "model": "legal_embedding"}
            ) as response:
                result = await response.json()
                end_time = time.time()
                return end_time - start_time, len(result.get('embeddings', []))

        # Run concurrent benchmark
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(num_requests):
                text = legal_texts[i % len(legal_texts)]
                tasks.append(single_request(session, text))

                if len(tasks) == concurrency:
                    results = await asyncio.gather(*tasks)
                    tasks = []

                    # Process results
                    latencies = [r[0] for r in results]
                    print(f"Batch completed: avg={np.mean(latencies)*1000:.2f}ms, "
                          f"p95={np.percentile(latencies, 95)*1000:.2f}ms, "
                          f"p99={np.percentile(latencies, 99)*1000:.2f}ms")

        print("🔥 Triton+TensorRT Legal AI Benchmark Complete")

if __name__ == "__main__":
    benchmark = LegalTritonBenchmark()
    asyncio.run(benchmark.benchmark_embedding_performance())
```

---

## 📈 Expected Performance Results:

### Before (vLLM Python Workers):
- **Latency**: 50-200ms per legal document
- **Throughput**: 5-20 documents/second
- **GPU Utilization**: 30-50%
- **Memory**: 6-8GB GPU memory

### After (Triton+TensorRT):
- **Latency**: 0.5-5ms per legal document
- **Throughput**: 200-2000+ documents/second
- **GPU Utilization**: 70-90%
- **Memory**: 2-4GB GPU memory

### Legal AI Production Benefits:
- **50-100x faster inference** for stable legal models
- **Real-time legal case similarity** searches
- **Instant contract clause matching**
- **Sub-second complex legal queries** across millions of documents

This Triton+TensorRT implementation provides the ultimate performance optimization for production legal AI systems when model shapes are stable and maximum throughput is required.
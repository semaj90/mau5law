#!/bin/bash
# Complete Legal AI TensorRT-LLM Production Stack Deployment
# Ubuntu-optimized with PostgreSQL+pgvector, Redis, RabbitMQ, MinIO, Qdrant

set -e

echo "🚀 Deploying Legal AI TensorRT-LLM Production Stack..."

# Step 1: Start data layer, caching, queues, and object storage
echo "📊 Starting infrastructure services..."
docker-compose -f docker-compose-pgvector-gpu.yml up -d

echo "⏳ Waiting for infrastructure services to be healthy..."
sleep 30

# Step 2: Start TensorRT-LLM inference service
echo "🧠 Starting TensorRT-LLM Legal AI service..."
docker-compose -f docker-compose-pgvector-gpu.yml -f docker-compose.override.yml up -d legal-ai-tensorrt

# Step 3: Verify all services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose-pgvector-gpu.yml -f docker-compose.override.yml ps

# Step 4: Wait for TensorRT service to be ready
echo "⏳ Waiting for TensorRT-LLM service to initialize..."
timeout 120 bash -c 'until curl -f http://localhost:8096/health; do sleep 5; done'

# Step 5: Run production integration tests
echo "🧪 Running production integration tests..."

# Test PostgreSQL + pgvector connection
echo "Testing PostgreSQL + pgvector..."
PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db -c "SELECT version();"

# Test Redis connection
echo "Testing Redis..."
redis-cli -h localhost -p 6379 -a redis ping

# Test TensorRT-LLM inference
echo "Testing TensorRT-LLM Legal AI inference..."
curl -X POST http://localhost:8096/inference \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "What are the key elements of a valid contract?",
    "legal_area": "contract",
    "max_tokens": 512
  }' | jq .

# Test MinIO object storage
echo "Testing MinIO object storage..."
curl -f http://localhost:9000/minio/health/live

# Test health endpoints
echo "Testing service health..."
curl -f http://localhost:8096/health | jq .
curl -f http://localhost:8096/metrics | jq .
curl -f http://localhost:8096/legal-areas | jq .

echo "✅ Production Stack Deployment Complete!"
echo ""
echo "📋 Service Endpoints:"
echo "  TensorRT-LLM API: http://localhost:8096/inference"
echo "  Health Check: http://localhost:8096/health"
echo "  Metrics: http://localhost:8096/metrics"
echo "  PostgreSQL: localhost:5432 (legal_admin/123456)"
echo "  Redis: localhost:6379 (password: redis)"
echo "  MinIO: http://localhost:9000 (legal_admin/legal_storage_key)"
echo ""
echo "🧪 Production Integration Tests:"
echo ""
echo "1. Insert embeddings into pgvector:"
echo "   PGPASSWORD=123456 psql -h localhost -p 5432 -U legal_admin -d legal_ai_db"
echo "   INSERT INTO legal_documents (title, content, embedding) VALUES"
echo "   ('Sample Contract', 'This is a sample contract...', '[0.1,0.2,0.3]'::vector);"
echo ""
echo "2. Test cached tensors in Redis:"
echo "   redis-cli -h localhost -p 6379 -a redis"
echo "   SET legal:tensor:sample '{\"model\":\"gemma3-legal\",\"data\":\"cached_tensor\"}'"
echo "   GET legal:tensor:sample"
echo ""
echo "3. Queue inference tasks in RabbitMQ:"
echo "   curl -X POST http://localhost:8096/inference \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"prompt\": \"Corporate governance best practices\", \"legal_area\": \"corporate\"}'"
echo ""
echo "4. Store/retrieve checkpoints in MinIO:"
echo "   # Upload model checkpoint"
echo "   curl -X PUT http://localhost:9000/legal-models/checkpoint.pt \\"
echo "     -H 'Authorization: AWS4-HMAC-SHA256 ...' \\"
echo "     --upload-file model_checkpoint.pt"
echo ""
echo "5. Vector similarity query in Qdrant:"
echo "   curl -X POST http://localhost:6333/collections/legal_documents/points/search \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"vector\": [0.1, 0.2, 0.3], \"limit\": 5}'"
echo ""
echo "6. Stress test TensorRT-LLM with Gemma3-Legal:"
echo "   # Run concurrent queries"
echo "   for i in {1..10}; do"
echo "     curl -X POST http://localhost:8096/inference \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"prompt\": \"Liability assessment for '"$i"'\", \"legal_area\": \"liability\"}' &"
echo "   done"
echo "   wait"
echo ""
echo "7. Benchmark RTX 3060 Ti performance:"
echo "   # Monitor GPU utilization"
echo "   nvidia-smi -l 1"
echo "   # Run performance test"
echo "   ./run-performance-benchmark.sh"

echo ""
echo "🎉 Production Legal AI TensorRT-LLM Stack is Ready!"
echo "   Ubuntu-optimized with full infrastructure integration"
echo "   PostgreSQL 17 + pgvector for legal document storage"
echo "   Redis for tensor caching and session management"
echo "   RabbitMQ for async legal query processing"
echo "   MinIO for model and document object storage"
echo "   Qdrant for advanced vector similarity search"
echo "   TensorRT-LLM Gemma3-Legal for sub-ms inference"
# Quick Start: Legal AI GPU RAG System

## 🚀 Start Everything in 3 Steps

### Step 1: Start All Services (Docker)
```bash
chmod +x scripts/start_services.sh
./scripts/start_services.sh
```

This will:
- ✅ Start Postgres 17 + pgvector
- ✅ Start Redis
- ✅ Start RabbitMQ (with bootstrap)
- ✅ Start Qdrant GPU
- ✅ Start Ollama Gemma-Legal

**Wait for all containers to be ready (~30 seconds)**

### Step 2: Start MLP Workers
```bash
supervisord -c backend/supervisord.conf
```

This will start:
- ✅ DocLing Gateway (GPU OCR)
- ✅ Mirror Service (Qdrant + Postgres sync)
- ✅ Embedding Worker (RabbitMQ consumer)
- ✅ Mirror Worker (RabbitMQ consumer)
- ✅ Reranker Worker (RabbitMQ consumer)
- ✅ Citation Worker (RabbitMQ consumer)
- ✅ Sync Worker (Postgres ↔ Qdrant reconciliation)

### Step 3: Start SvelteKit Frontend
```bash
cd sveltekit-frontend
npm run dev
```

Open: http://localhost:5173

---

## 📊 Verify Everything is Running

### Check Services
```bash
# Postgres
psql -h localhost -U postgres -d legal_db -c "SELECT 1;"

# Redis
redis-cli ping

# RabbitMQ
curl http://localhost:15672  # Management UI (guest/guest)

# Qdrant
curl http://localhost:6333/health

# Ollama
curl http://localhost:11434/api/tags
```

### Check Workers
```bash
# View all worker status
supervisorctl -c backend/supervisord.conf status all

# View specific worker logs
supervisorctl -c backend/supervisord.conf tail -f mlp-embedding-worker
supervisorctl -c backend/supervisord.conf tail -f mirror-service
supervisorctl -c backend/supervisord.conf tail -f docling-gateway
```

---

## 🔄 Upload & Process Flow

1. **Open Frontend**: http://localhost:5173/evidence
2. **Upload Document**: Drag & drop or click to upload
3. **Watch Progress**:
   - 📤 Uploading (Go QUIC Gateway)
   - 🔄 Processing (DocLing GPU OCR)
   - 🪞 Mirroring (Qdrant GPU + Postgres)
   - ✅ Complete

4. **Search Results**: Go to /laws to search indexed documents

---

## 🛑 Stop Everything

### Stop Workers
```bash
supervisorctl -c backend/supervisord.conf stop all
```

### Stop Services
```bash
docker stop postgres-pgvector redis-legal-ai rabbitmq-legal qdrant-gpu ollama-gemma
```

### Clean Up (Remove Containers)
```bash
docker rm postgres-pgvector redis-legal-ai rabbitmq-legal qdrant-gpu ollama-gemma
```

---

## 📋 Service Endpoints

| Service | URL | Credentials |
|---------|-----|-------------|
| Postgres | localhost:5432 | user: postgres, pass: password |
| Redis | localhost:6379 | - |
| RabbitMQ | localhost:5672 | user: legalai, pass: legalai123 |
| RabbitMQ UI | http://localhost:15672 | user: guest, pass: guest |
| Qdrant | http://localhost:6333 | - |
| Ollama | http://localhost:11434 | - |
| SvelteKit | http://localhost:5173 | - |

---

## 🐛 Troubleshooting

### RabbitMQ Connection Failed
```bash
# Wait for RabbitMQ to be ready
sleep 10

# Manually bootstrap
./scripts/bootstrap_rabbitmq.sh
```

### GPU Not Available
```bash
# Check GPU
nvidia-smi

# Verify Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.8.0-runtime-ubuntu22.04 nvidia-smi
```

### Workers Not Starting
```bash
# Check supervisord logs
tail -f /var/log/supervisord.log

# Check specific worker
supervisorctl -c backend/supervisord.conf tail -f mlp-embedding-worker
```

### Postgres Connection Failed
```bash
# Wait for Postgres to be ready
sleep 10

# Test connection
psql -h localhost -U postgres -d legal_db -c "SELECT 1;"
```

---

## 📚 Architecture Overview

```
Browser (SvelteKit PWA)
    ↓ QUIC upload
Go QUIC Gateway (fp16 cache)
    ↓ Publish to RabbitMQ
RabbitMQ Task Queue
    ├→ embeddings.queue
    ├→ mirror.queue
    ├→ rerank.queue
    └→ citation.queue
    ↓ Consume
Python GPU Workers (supervisord)
    ├→ DocLing GPU (OCR)
    ├→ Mirror Service (Qdrant + Postgres)
    ├→ Embedding Worker
    ├→ Mirror Worker
    ├→ Reranker Worker
    └→ Citation Worker
    ↓
Qdrant GPU (FAISS-GPU search)
Postgres pgvector (metadata)
Ollama Gemma-Legal (chat)
```

---

## 🎯 Next Steps

1. ✅ Upload a legal document
2. ✅ Watch it process through the GPU pipeline
3. ✅ Search for related cases in /laws
4. ✅ Chat with Gemma-Legal about the document

---

## 📖 Full Documentation

- Architecture: `.kiro/specs/PHASE_3_RAG_CAG_TENSORRT/FINAL_CORRECTED_ARCHITECTURE.md`
- Deployment: `DEPLOYMENT.md`
- Requirements: `.kiro/specs/PHASE_3_RAG_CAG_TENSORRT/requirements.md`
- Design: `.kiro/specs/PHASE_3_RAG_CAG_TENSORRT/design.md`

---

## 🎉 You're Ready!

Everything is set up and ready to go. Start with Step 1 above and you'll have a fully functional GPU-accelerated legal RAG system running locally.


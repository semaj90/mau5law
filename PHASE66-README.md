# Phase 66 - Unified MCP Server Stack
# ESM + TSX + SIMD + Redis + pgvector + Ollama + TensorRT-LLM Integration

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- NVIDIA GPU (optional, for TensorRT-LLM)
- At least 16GB RAM recommended

### Start the Complete Stack
```bash
# Start all services
docker-compose -f docker-compose.phase66.yml up -d

# Check health
curl http://localhost:3003/mcp/health
```

### Individual Services
```bash
# Start only MCP server + databases
docker-compose -f docker-compose.phase66.yml up -d mcp-server postgres redis

# Start with GPU inference
docker-compose -f docker-compose.phase66.yml up -d tensorrt-llm

# View logs
docker-compose -f docker-compose.phase66.yml logs -f mcp-server
```

## 📋 Services Overview

### Core Services
- **MCP Server** (port 3003): Main AI orchestrator with SIMD + Redis + pgvector
- **PostgreSQL** (port 5432): Vector database with pgvector extension
- **Redis** (port 6379): High-performance cache with Redis Stack modules

### AI/ML Services
- **TensorRT-LLM** (port 8096): GPU-accelerated inference server
- **Qdrant** (port 6333): Advanced vector similarity search
- **Ollama** (external): Local LLM inference (run separately)

### Infrastructure
- **MinIO** (port 9000): Object storage for documents
- **RabbitMQ** (port 5672): Message queue for async processing

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://legal_admin:123456@postgres:5432/legal_ai_db
REDIS_URL=redis://redis:6379

# AI Services
OLLAMA_URL=http://host.docker.internal:11434
TENSORRT_LLM_URL=http://tensorrt-llm:8096
QDRANT_URL=http://qdrant:6333

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
```

### GPU Configuration
For TensorRT-LLM, ensure NVIDIA Container Toolkit is installed:
```bash
# Install NVIDIA Docker support
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   MCP Server    │────│   PostgreSQL    │
│   (Node.js)     │    │   + pgvector    │
│   Port: 3003    │    └─────────────────┘
└─────────────────┘             │
          │                     │
          │            ┌─────────────────┐
          │            │      Redis      │
          │            │   Port: 6379    │
          │            └─────────────────┘
          │                     │
          └─────────┬───────────┘
                    │
           ┌─────────────────┐
           │  TensorRT-LLM   │
           │   (GPU)         │
           │   Port: 8096    │
           └─────────────────┘
```

## 🧪 Testing

### Health Checks
```bash
# MCP Server
curl http://localhost:3003/mcp/health

# TensorRT-LLM
curl http://localhost:8098/health

# PostgreSQL
docker-compose -f docker-compose.phase66.yml exec postgres pg_isready -U legal_admin -d legal_ai_db

# Redis
docker-compose -f docker-compose.phase66.yml exec redis redis-cli ping
```

### API Testing
```bash
# Test SIMD integration
curl -X POST http://localhost:3003/mcp/simd \
  -H "Content-Type: application/json" \
  -d '{"text":"force majeure clause"}'

# Test vector search
curl -X POST http://localhost:3003/mcp/search \
  -H "Content-Type: application/json" \
  -d '{"query":"contract breach","limit":10}'
```

## 📊 Monitoring

### Logs
```bash
# All services
docker-compose -f docker-compose.phase66.yml logs -f

# Specific service
docker-compose -f docker-compose.phase66.yml logs -f mcp-server

# GPU monitoring
nvidia-smi -l 5
```

### Performance Metrics
```bash
# Redis info
docker-compose -f docker-compose.phase66.yml exec redis redis-cli info

# PostgreSQL stats
docker-compose -f docker-compose.phase66.yml exec postgres psql -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_stat_activity;"
```

## 🔄 Development Workflow

### Local Development
```bash
# Start databases only
docker-compose -f docker-compose.phase66.yml up -d postgres redis

# Run MCP server locally
npm run dev

# Test integration
curl http://localhost:3003/mcp/health
```

### GPU Development
```bash
# Start GPU services
docker-compose -f docker-compose.phase66.yml up -d tensorrt-llm

# Monitor GPU usage
watch -n 1 nvidia-smi
```

## 🚨 Troubleshooting

### Common Issues

**MCP Server won't start:**
```bash
# Check logs
docker-compose -f docker-compose.phase66.yml logs mcp-server

# Verify dependencies
docker-compose -f docker-compose.phase66.yml exec mcp-server npm ls
```

**TensorRT-LLM build fails:**
```bash
# Check GPU availability
nvidia-smi

# Verify CUDA version
nvcc --version

# Check model files
ls -la models/
```

**Database connection issues:**
```bash
# Test PostgreSQL
docker-compose -f docker-compose.phase66.yml exec postgres pg_isready -U legal_admin

# Test Redis
docker-compose -f docker-compose.phase66.yml exec redis redis-cli ping
```

### Reset Stack
```bash
# Stop and remove all
docker-compose -f docker-compose.phase66.yml down -v

# Clean rebuild
docker-compose -f docker-compose.phase66.yml up --build -d
```

## 📈 Scaling

### Horizontal Scaling
```yaml
# Add to docker-compose.phase66.yml
services:
  mcp-server:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### GPU Scaling
```yaml
# Multi-GPU setup
tensorrt-llm:
  environment:
    - CUDA_VISIBLE_DEVICES=0,1
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 2
            capabilities: [gpu]
```

## 🔒 Security

### Production Considerations
- Change default passwords
- Use secrets management
- Enable TLS/SSL
- Configure firewall rules
- Regular security updates

### Network Security
```yaml
# Internal network only
networks:
  phase66-network:
    internal: true
```

## 📚 API Documentation

### MCP Server Endpoints
- `GET /mcp/health` - Health check
- `POST /mcp/simd` - SIMD text processing
- `POST /mcp/search` - Vector similarity search
- `POST /mcp/embed` - Text embedding
- `POST /mcp/chat` - AI chat completion

### TensorRT-LLM Endpoints
- `POST /v1/chat/completions` - Chat completions
- `POST /v1/embeddings` - Text embeddings
- `GET /health` - Health check

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
# Enhanced Legal AI RAG Service with Multi-Protocol Support

A comprehensive legal AI platform featuring multi-protocol communication, graph database integration, GPU acceleration, and advanced authentication.

## Architecture Overview

The enhanced RAG service consists of multiple microservices:

- **Agentic Gemma3 Service** (RabbitMQ Event Loop): AI-powered agent using Gemma3-legal:latest with function calling for tool invocation
- **Multi-Protocol Gateway** (Port 8080): Unified server supporting gRPC, QUIC/HTTP3, and WebSocket
- **Neo4j Graph Service** (Port 8099): Graph database operations for legal relationships
- **Ory Kratos Auth Service** (Port 8100): Identity management and authentication
- **GPU Compute Service** (Port 8101): GPU-accelerated computations with WebGPU support
- **Legal AI Orchestrator** (Port 8102): Workflow orchestration and service coordination
- **Enhanced RAG Service** (Port 8000): Core RAG functionality with advanced features

## Prerequisites

- Go 1.21+
- Docker Desktop with GPU support
- Neo4j 5.x
- Ory Kratos
- NVIDIA GPU with CUDA (optional, for GPU acceleration)
- RabbitMQ (via Docker Desktop)

## Quick Start

### 1. Start Infrastructure Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or start individual services
docker-compose up -d neo4j rabbitmq kratos
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Neo4j Configuration
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Ory Kratos Configuration
KRATOS_URL=http://localhost:4433
KRATOS_ADMIN_URL=http://localhost:4434
JWT_SECRET=your-super-secret-jwt-key

# GPU Configuration
TENSORRT_LLM_URL=http://localhost:8099
CUDA_VISIBLE_DEVICES=0

# RabbitMQ Configuration (if not using Docker Desktop)
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### 3. Start Go Microservices

```bash
# Start all microservices
cd go-microservice

# Agentic Gemma3 Service (RabbitMQ event loop)
go run agentic-gemma3-service.go &

# Multi-Protocol Gateway
go run multi-protocol-gateway.go &

# Neo4j Graph Service
go run neo4j-integration.go &

# Ory Kratos Auth Service
go run ory-kratos-auth.go &

# GPU Compute Service
go run gpu-compute-service.go &

# Legal AI Orchestrator
go run legal-ai-orchestrator.go &
```

### 4. Verify Services

Check service health:

```bash
curl http://localhost:8102/health
```

## API Documentation

### Legal AI Orchestrator (Port 8102)

#### Start Workflow
```http
POST /api/v1/workflows
Content-Type: application/json

{
  "type": "document_analysis",
  "data": {
    "documents": ["legal_text_1", "legal_text_2"],
    "user_id": "user123"
  },
  "priority": 5,
  "session_token": "jwt_token_here"
}
```

#### Get Workflow Status
```http
GET /api/v1/workflows/{workflow_id}
```

#### List Workflows
```http
GET /api/v1/workflows?status=completed&type=document_analysis&limit=10
```

### GPU Compute Service (Port 8101)

#### Compute Embeddings
```http
POST /api/v1/gpu/embeddings
Content-Type: application/json

{
  "texts": ["Legal contract text here", "Another document"],
  "model": "bert",
  "batch_size": 32
}
```

#### Compute Similarity
```http
POST /api/v1/gpu/similarity
Content-Type: application/json

{
  "embeddings": [[[0.1, 0.2, ...], [0.3, 0.4, ...]]],
  "metric": "cosine"
}
```

#### Run LLM Inference
```http
POST /api/v1/gpu/inference
Content-Type: application/json

{
  "prompt": "Analyze this legal contract for risks",
  "max_tokens": 100,
  "temperature": 0.7,
  "model": "gemma3-legal"
}
```

### Neo4j Graph Service (Port 8099)

#### Create Entity
```http
POST /api/v1/graph/entities
Content-Type: application/json

{
  "id": "case_123",
  "type": "case",
  "name": "Legal Case 123",
  "properties": {
    "status": "active",
    "priority": "high"
  }
}
```

#### Create Relationship
```http
POST /api/v1/graph/relationships
Content-Type: application/json

{
  "from_entity": "lawyer_456",
  "to_entity": "case_123",
  "type": "represents",
  "properties": {
    "start_date": "2024-01-01"
  },
  "strength": 0.9
}
```

#### Query Related Entities
```http
GET /api/v1/graph/entities/{entity_id}/related?depth=3
```

### Ory Kratos Auth Service (Port 8100)

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "lawyer@example.com",
  "password": "secure_password",
  "name": "John Doe",
  "role": "lawyer"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "lawyer@example.com",
  "password": "secure_password"
}
```

### Multi-Protocol Gateway (Port 8080)

#### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onmessage = (event) => {
  console.log('Received:', event.data);
};
```

#### QUIC/WebTransport (Browser)
```javascript
const transport = new WebTransport('https://localhost:8080/quic');
await transport.ready;
// Use transport for low-latency communication
```

### Agentic Gemma3 Service (RabbitMQ Event Loop)

The agentic service provides AI-powered task execution using Gemma3-legal:latest with function calling capabilities. It listens for tasks on RabbitMQ queues and executes tool calls to coordinate other microservices.

#### Send Task to Agent
```javascript
// Publish task to RabbitMQ queue
const task = {
  id: "task-123",
  query: "Analyze this legal contract for risks",
  context: { document_id: "doc-456" },
  response_url: "quic://localhost:8080/responses" // Optional QUIC response URL
};

// Send via RabbitMQ or HTTP API
```

#### Available Tools
- `legal_document_analysis`: AI-powered legal document analysis
- `gpu_compute_embeddings`: GPU-accelerated text embeddings
- `neo4j_graph_query`: Graph database queries for legal relationships
- `workflow_orchestration`: Complex workflow coordination

#### Response Handling
```javascript
// Receive results via QUIC (low latency) or RabbitMQ
const response = {
  task_id: "task-123",
  results: {
    "tool_call_1": { analysis: "Contract has high risk clauses..." },
    "tool_call_2": { embeddings: [0.1, 0.2, 0.3] }
  },
  timestamp: 1640995200
};
```

## Workflow Types

### Document Analysis
1. Authentication check
2. GPU document embedding
3. Store in graph database
4. RAG analysis
5. Create graph relationships

### Case Research
1. Authentication check
2. GPU similarity search
3. Graph database query
4. RAG research
5. GPU result clustering

### Contract Review
1. Authentication check
2. GPU contract embedding
3. Graph analysis
4. RAG contract review
5. GPU LLM analysis

#### Embedding Computation with CUDA EmbeddingGemma
```http
POST /api/v1/gpu/embeddings
Content-Type: application/json

{
  "texts": ["Legal contract text here"],
  "model": "embedding-gemma",
  "batch_size": 32
}
```

**Response:**
```json
{
  "embeddings": [[0.123, 0.456, ...]], // 3072-dimensional vectors
  "model": "embedding-gemma",
  "count": 1
}
```

**Features:**
- CUDA-accelerated EmbeddingGemma model
- FP16 precision for optimal performance
- Batch processing for GPU efficiency
- 3072-dimensional embeddings optimized for legal documents

## Graph Database Schema

### Entity Types
- `person`: Individuals involved in legal matters
- `company`: Corporate entities
- `case`: Legal cases and matters
- `document`: Legal documents and contracts
- `evidence`: Evidence and supporting materials

### Relationship Types
- `represents`: Lawyer represents client
- `owns`: Entity owns document/asset
- `related_to`: General relationship between entities
- `cites`: Document cites another document
- `contradicts`: Evidence contradicts other evidence

## Authentication & Authorization

### User Roles
- `lawyer`: Full access to all features
- `client`: Access to own cases and documents
- `admin`: System administration access

### JWT Tokens
All API endpoints require valid JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Monitoring & Health Checks

### Service Health
```http
GET /health
```
Returns health status for each service component.

### System Status
```http
GET /api/v1/status
```
Returns detailed status of all microservices.

## Docker Deployment

### Full Stack Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/your_password

  kratos:
    image: oryd/kratos:latest
    ports:
      - "4433:4433"
      - "4434:4434"

  tensorrt-llm:
    image: nvcr.io/nvidia/tensorrtllm:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # Add other services...
```

## Development

### Running Tests
```bash
# Test individual services
go test ./go-microservice/...

# Integration tests
go test -tags=integration ./tests/...
```

### Code Generation
```bash
# Generate protobuf files
protoc --go_out=. --go-grpc_out=. proto/legalai.proto

# Generate mocks for testing
mockgen -source=interface.go -destination=mocks/mock.go
```

## Performance Optimization

### GPU Memory Management
- Automatic batching for embedding computations
- Memory pooling for recurrent operations
- CUDA stream management for concurrent operations

### Network Optimization
- QUIC/HTTP3 for reduced latency
- WebTransport for real-time communication
- Protocol buffer compression

### Database Optimization
- Graph query optimization with indexes
- Connection pooling for Neo4j
- Cached authentication sessions

## Security Considerations

### Data Encryption
- TLS 1.3 for all communications
- Encrypted database connections
- JWT token encryption

### Access Control
- Role-based access control (RBAC)
- Session management with expiration
- Audit logging for all operations

### API Security
- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration for web clients

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**
   - Check Neo4j is running: `docker ps | grep neo4j`
   - Verify connection string and credentials
   - Check firewall settings

2. **GPU Not Available**
   - Install NVIDIA drivers and CUDA toolkit
   - Verify Docker GPU support: `docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi`
   - Check CUDA_VISIBLE_DEVICES environment variable

3. **Authentication Errors**
   - Verify Ory Kratos configuration
   - Check JWT token validity
   - Ensure user exists in identity store

4. **WebTransport Connection Failed**
   - Ensure QUIC/HTTP3 support in client
   - Check firewall allows UDP traffic
   - Verify SSL certificates

### Logs and Debugging

```bash
# View service logs
docker-compose logs -f service_name

# Enable debug logging
export LOG_LEVEL=debug
go run service.go

# Check service metrics
curl http://localhost:8102/api/v1/status
```

## Error Fixing and Troubleshooting

This section provides comprehensive solutions for common errors encountered during development and deployment of the Enhanced Legal AI RAG Service.

### TypeScript Compilation Errors (SvelteKit Frontend)

#### Common TypeScript Errors and Fixes

**1. Module Resolution Errors**
```bash
# Error: Cannot find module '@lib/types' or similar
# Fix: Update tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "$lib": ["src/lib"],
      "$lib/*": ["src/lib/*"],
      "@/*": ["src/*"]
    }
  }
}
```

**2. Type Declaration Missing**
```bash
# Error: Could not find a declaration file for module 'xyz'
# Fix: Install type definitions
npm install -D @types/module-name

# For custom modules, create ambient declarations
// src/types/custom.d.ts
declare module 'custom-module' {
  export function customFunction(): string;
}
```

**3. Svelte Component Type Errors**
```typescript
// Error: Property 'x' does not exist on type 'Component'
// Fix: Properly type component props
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  interface MyComponentProps {
    title: string;
    onClick: () => void;
  }

  let { title, onClick }: MyComponentProps = $props();
</script>
```

**4. Import Path Issues**
```bash
# Error: Module not found - incorrect relative paths
# Fix: Use SvelteKit path aliases
import { helper } from '$lib/utils/helper'; // Instead of ../../../lib/utils/helper
```

**5. Memory Issues During Compilation**
```bash
# Error: JavaScript heap out of memory
# Fix: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=3072"
npm run check
```

#### TypeScript Configuration Fixes

**tsconfig.json for SvelteKit:**
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "$lib": ["src/lib"],
      "$lib/*": ["src/lib/*"]
    }
  }
}
```

### Python Model Quantization Errors

#### CUDA Memory Issues
```python
# Error: CUDA out of memory during quantization
# Fix 1: Reduce batch size
quantization_config = BitsAndBytesConfig(
    load_in_8bit=True,  # Use 8-bit instead of 4-bit
    llm_int8_threshold=6.0,
    llm_int8_has_fp16_weight=False,
)

# Fix 2: Clear GPU cache
import torch
torch.cuda.empty_cache()

# Fix 3: Use CPU fallback
device_map = {"": "cpu"}  # Force CPU usage
```

#### Model Loading Errors
```python
# Error: Model loading failed
# Fix: Check model path and format
try:
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True  # For models requiring custom code
    )
except Exception as e:
    print(f"Model loading failed: {e}")
    # Try alternative model or path
```

#### Quantization Configuration Issues
```python
# Error: Quantization parameters invalid
# Fix: Use correct quantization config
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)
```

#### Dependency Issues
```bash
# Error: Missing quantization dependencies
# Fix: Install required packages
pip install bitsandbytes accelerate transformers torch
pip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Go Compilation Errors

#### Module Path Issues
```bash
# Error: go.mod file not found or invalid module path
# Fix: Initialize or update go.mod
go mod init github.com/your-org/legal-ai-rag
go mod tidy

# For Windows-specific path issues
go env -w GOOS=windows
go env -w GOARCH=amd64
```

#### Missing Dependencies
```bash
# Error: cannot find package
# Fix: Download dependencies
go mod download
go get github.com/package/path

# Clean module cache if corrupted
go clean -modcache
go mod download
```

#### CGO and Windows Compilation Issues
```bash
# Error: CGO compilation failed on Windows
# Fix: Set CGO environment variables
set CGO_ENABLED=1
set CC=gcc
set CXX=g++

# Or disable CGO for pure Go builds
set CGO_ENABLED=0
go build .
```

#### Build Constraint Issues
```go
// Error: build constraints exclude all Go files
// Fix: Add proper build tags
// +build windows

package main

import "fmt"

func main() {
    fmt.Println("Windows-specific code")
}
```

#### Cross-Compilation for Windows
```bash
# Error: Cross-compilation issues
# Fix: Set target OS and architecture
set GOOS=windows
set GOARCH=amd64
go build -o legal-ai-orchestrator.exe .
```

### Service Health Check Failures

#### Port Connectivity Issues
```bash
# Error: Connection refused on port 8103
# Fix 1: Check if service is running
netstat -ano | findstr :8103
tasklist | findstr legal-ai

# Fix 2: Check firewall settings
netsh advfirewall firewall add rule name="Legal AI Service" dir=in action=allow protocol=TCP localport=8103

# Fix 3: Verify service configuration
curl -f http://localhost:8103/health || echo "Service not responding"
```

#### Docker Container Issues
```bash
# Error: Container health check failed
# Fix: Check container status
docker ps -a | grep legal-ai
docker logs container_name

# Fix: Restart unhealthy containers
docker-compose restart service_name

# Fix: Rebuild if image is corrupted
docker-compose up --build service_name
```

#### Service Startup Failures
```bash
# Error: Service failed to start
# Fix 1: Check system resources
systeminfo | findstr "Memory"
wmic cpu get loadpercentage

# Fix 2: Check dependencies
docker-compose ps
docker-compose logs --tail=50

# Fix 3: Verify configuration files
# Check .env file exists and has correct values
# Check docker-compose.yml for correct port mappings
```

#### Network Configuration Issues
```bash
# Error: Service unreachable from external requests
# Fix: Check network configuration
ipconfig /all
route print

# Fix: Update docker-compose.yml for host networking if needed
services:
  legal-ai-service:
    network_mode: host
    # Remove ports section when using host networking
```

### Database Connection Issues

#### Neo4j Connection Problems
```bash
# Error: Neo4j connection failed
# Fix 1: Check Neo4j status
docker ps | grep neo4j
docker logs neo4j_container

# Fix 2: Verify connection string
# Check NEO4J_URI in environment variables
# Ensure bolt port (7687) is accessible

# Fix 3: Reset Neo4j password if needed
docker exec -it neo4j_container neo4j-admin set-initial-password new_password
```

#### PostgreSQL Connection Issues
```bash
# Error: PostgreSQL connection failed
# Fix 1: Check PostgreSQL status
pg_isready -h localhost -p 5432

# Fix 2: Verify connection parameters
# Check DATABASE_URL environment variable
# Ensure user has proper permissions

# Fix 3: Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### GPU and CUDA Issues

#### CUDA Runtime Errors
```bash
# Error: CUDA driver version mismatch
# Fix: Update NVIDIA drivers
nvidia-smi
# Download latest drivers from nvidia.com

# Fix: Install compatible CUDA toolkit
# Check compatibility matrix at developer.nvidia.com/cuda-gpus
```

#### GPU Memory Issues
```bash
# Error: GPU memory allocation failed
# Fix 1: Clear GPU memory
nvidia-smi --gpu-reset

# Fix 2: Reduce model size or batch size
export CUDA_VISIBLE_DEVICES=0
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

# Fix 3: Use gradient checkpointing
# In training code:
model.gradient_checkpointing_enable()
```

#### TensorRT Issues
```bash
# Error: TensorRT engine build failed
# Fix 1: Check TensorRT compatibility
# Ensure TensorRT version matches CUDA version

# Fix 2: Clear TensorRT cache
rm -rf /tmp/tensorrt_engines/

# Fix 3: Rebuild with different precision
# Use FP16 instead of INT8 for compatibility
```

### Common Development Workflow Fixes

#### Git and Repository Issues
```bash
# Error: Repository corruption
# Fix: Clean and reset repository
git reset --hard HEAD
git clean -fd
git pull origin main

# Fix: Permission issues
git config --global core.filemode false
```

#### Node.js and npm Issues
```bash
# Error: npm install failed
# Fix 1: Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Fix 2: Use different registry
npm config set registry https://registry.npmjs.org/

# Fix 3: Fix permission issues
sudo chown -R $(whoami) ~/.npm
```

#### Docker Issues
```bash
# Error: Docker build failed
# Fix 1: Clear Docker cache
docker system prune -a
docker volume prune

# Fix 2: Rebuild without cache
docker-compose build --no-cache

# Fix 3: Check disk space
df -h
```

### Monitoring and Debugging Tools

#### Enable Debug Logging
```bash
# Enable verbose logging for all services
export LOG_LEVEL=debug
export DEBUG=*

# For specific services
export NEO4J_DEBUG=true
export TENSORRT_LOG_LEVEL=VERBOSE
```

#### Health Check Scripts
```bash
#!/bin/bash
# comprehensive-health-check.sh

echo "=== Legal AI Platform Health Check ==="

# Check services
services=("neo4j:7474" "postgres:5432" "redis:6379" "rabbitmq:5672")
for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    if nc -z localhost $port 2>/dev/null; then
        echo "✓ $name is running on port $port"
    else
        echo "✗ $name is not accessible on port $port"
    fi
done

# Check GPU
if command -v nvidia-smi &> /dev/null; then
    echo "GPU Status:"
    nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader,nounits
else
    echo "No NVIDIA GPU detected"
fi

# Check disk space
echo "Disk Usage:"
df -h | grep -E "(Filesystem|/)$"
```

#### Performance Monitoring
```bash
# Monitor system resources
top -p $(pgrep -f "legal-ai")
nvidia-smi -l 5  # GPU monitoring

# Check service metrics
curl http://localhost:8102/metrics
curl http://localhost:8101/health
```

### Emergency Recovery Procedures

#### Complete System Reset
```bash
# Stop all services
docker-compose down -v

# Clear all caches and temporary files
rm -rf node_modules .svelte-kit dist
docker system prune -a --volumes

# Reset databases (CAUTION: This deletes all data)
docker volume rm $(docker volume ls -q | grep legal-ai)

# Rebuild everything
npm install
docker-compose up --build -d
```

#### Individual Service Recovery
```bash
# Reset specific service
docker-compose stop service_name
docker-compose rm -f service_name
docker-compose up --build service_name

# Force rebuild with no cache
docker-compose build --no-cache service_name
```

### Best Practices for Error Prevention

1. **Version Pinning**: Pin all dependency versions to prevent breaking changes
2. **Environment Consistency**: Use Docker for consistent development environments
3. **Regular Backups**: Backup databases and configurations regularly
4. **Monitoring**: Implement comprehensive monitoring and alerting
5. **Documentation**: Keep error logs and solutions documented
6. **Testing**: Implement comprehensive test suites for all components

### Getting Help

If you encounter errors not covered here:

1. Check the service logs: `docker-compose logs service_name`
2. Review system resources: `top`, `nvidia-smi`, `df -h`
3. Check network connectivity: `netstat -tlnp`, `curl localhost:port/health`
4. Search existing issues in the repository
5. Create a detailed bug report with:
   - Error messages and stack traces
   - System information (OS, Docker version, GPU info)
   - Steps to reproduce
   - Recent changes made

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- GitHub Issues: Report bugs and request features
- Documentation: Check the `/docs` directory
- Community: Join our Discord server for discussions</content>
<parameter name="filePath">c:\Users\james\Videos\deeds-web-app\ENHANCED_RAG_SERVICE_README.md
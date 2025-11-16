# Legal AI Platform - Full Integration Guide

This document outlines the complete integration of the Legal AI platform, enabling end-to-end evidence collection and analysis from URLs through the MCP protocol.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SvelteKit     │    │      MCP        │    │   FastAPI Web   │
│   Frontend      │◄──►│     Server      │◄──►│   Crawl Service │
│                 │    │                 │    │                 │
│ /api/evidence/  │    │ web_crawl_tool  │    │  POST /crawl    │
│ from-url        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  RabbitMQ       │    │   RAG Ingestion │    │     MinIO       │
│   Queue         │◄──►│     Worker      │◄──►│   Object Store  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ PostgreSQL +    │    │    Qdrant       │    │  Gemma3-Legal   │
│   pgvector      │◄──►│  Vector DB      │◄──►│     Agent       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Start All Services

```bash
# Start the complete stack
npm run legal-ai:development-environment-status

# Or use the automated startup
./QUICK-START-NATIVE.bat
```

### 2. Test Integration

```bash
# Run full pipeline test
node scripts/test-full-pipeline.mjs
```

### 3. Collect Evidence from URL

```bash
# Via SvelteKit API
curl -X POST http://localhost:5173/api/evidence/from-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.supremecourt.gov",
    "maxDepth": 2,
    "maxPages": 5
  }'
```

## 📋 Component Details

### MCP Server (`context7-multicore-redis-som.js`)

**Location:** `mcp-servers/context7-multicore-redis-som.js`
**Port:** 3003
**Tools:**
- `web_crawl_legal_documents`: Crawls legal websites and publishes to ingestion pipeline

**Features:**
- Redis caching for crawl results
- Automatic ingestion job publishing via RabbitMQ
- Embedding generation for immediate search

### FastAPI Web Crawl Service (`web_crawl_service.py`)

**Location:** `python-services/web_crawl_service.py`
**Port:** 8103
**Endpoint:** `POST /crawl`

**Request Format:**
```json
{
  "url": "https://example.com",
  "max_depth": 2,
  "max_pages": 10,
  "include_patterns": [],
  "exclude_patterns": [],
  "delay_seconds": 1.0,
  "timeout_seconds": 30
}
```

**Response Format:**
```json
{
  "pages_crawled": 5,
  "total_size": 15000,
  "duration": 2.3,
  "pages": [
    {
      "url": "https://example.com/page1",
      "title": "Page Title",
      "content": "Cleaned text content...",
      "metadata": {...},
      "links": [...]
    }
  ]
}
```

### RAG Ingestion Worker (`rag_ingest_worker.py`)

**Location:** `python-services/rag_ingest_worker.py`
**Dependencies:** RabbitMQ, MinIO, PostgreSQL, Ollama

**Process:**
1. Consumes jobs from `rag_ingestion_jobs` queue
2. Chunks documents using sliding window
3. Generates embeddings (Ollama or local fallback)
4. Stores chunks in PostgreSQL with pgvector
5. Uploads raw documents to MinIO

### RabbitMQ Helper (`rabbitmq-ingest.js`)

**Location:** `scripts/rabbitmq-ingest.js`
**Queue:** `rag_ingestion_jobs`

**Usage:**
```javascript
const { RabbitMQIngestHelper } = require('./rabbitmq-ingest.js');
const helper = new RabbitMQIngestHelper();
await helper.connect();
const jobId = await helper.publishCrawledDocuments(crawlResult);
```

### SvelteKit Evidence API

**Location:** `sveltekit-frontend/src/routes/api/evidence/from-url/+server.ts`
**Endpoint:** `POST /api/evidence/from-url`

**Request:**
```json
{
  "url": "https://legal-site.com",
  "maxDepth": 2,
  "maxPages": 10,
  "includePatterns": ["*contract*", "*agreement*"],
  "excludePatterns": ["*login*", "*signup*"]
}
```

### Gemma3-Legal Agent (`gemma3-legal-agent.mjs`)

**Location:** `scripts/gemma3-legal-agent.mjs`
**Port:** 8095
**Model:** `gemma3-legal:latest` (Ollama)

**Tools:**
- `web_crawl_legal_documents`: MCP web crawling
- `search_legal_evidence`: Vector database search
- `analyze_legal_document`: Document analysis

**Endpoints:**
- `GET /health`: Health check
- `POST /analyze`: Legal analysis with agent
- `POST /collect-evidence`: Batch evidence collection
- `POST /analyze-document`: Single document analysis

## 🔄 Data Flow

1. **URL Submission** → SvelteKit `/api/evidence/from-url`
2. **MCP Processing** → `web_crawl_legal_documents` tool
3. **Web Crawling** → FastAPI service extracts content
4. **Job Publishing** → RabbitMQ ingestion queue
5. **Document Processing** → RAG worker chunks and embeds
6. **Storage** → MinIO (raw) + PostgreSQL (vectors)
7. **Analysis Ready** → Available for Gemma3-legal agent

## 🧪 Testing

### Individual Components

```bash
# Test web crawl service
curl -X POST http://localhost:8103/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.law.com", "max_depth": 1, "max_pages": 2}'

# Test MCP tool
curl -X POST http://localhost:3003/mcp/tools/web_crawl_legal_documents \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.courtlistener.com"}'

# Test RabbitMQ helper
node scripts/rabbitmq-ingest.js test-crawl

# Test agent
curl -X POST http://localhost:8095/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze this contract for key obligations"}'
```

### Full Pipeline Test

```bash
node scripts/test-full-pipeline.mjs
```

## 🔧 Configuration

### Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:4005

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# MinIO
MINIO_ENDPOINT=localhost:4002
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Database
DATABASE_URL=postgresql://postgres:123456@localhost:5432/legal_ai_db

# Ollama
OLLAMA_URL=http://localhost:11434

# Services
WEB_CRAWL_PORT=8103
MCP_PORT=3003
AGENT_PORT=8095
```

### Docker Services

Required services (from `docker-compose-phase70.yml`):
- `web-crawl-service`: Port 8103
- `tensorrt-llm-service`: Port 8099
- `pytorch-fallback-service`: Port 8100
- `ocr-service`: Port 8101
- `lang-extract-service`: Port 8102
- `rag-ingest-service`: Port 8104

## 🚨 Troubleshooting

### Common Issues

1. **MCP Server Not Responding**
   ```bash
   # Check if running
   ps aux | grep context7-multicore
   # Restart
   node mcp-servers/context7-multicore-redis-som.js
   ```

2. **Web Crawl Service Errors**
   ```bash
   # Check logs
   docker logs web-crawl-service
   # Test manually
   curl http://localhost:8103/health
   ```

3. **RabbitMQ Connection Failed**
   ```bash
   # Check RabbitMQ
   docker exec legal-ai-rabbitmq rabbitmqctl status
   # Reset queues
   node scripts/rabbitmq-ingest.js status
   ```

4. **Ollama Model Not Available**
   ```bash
   # List models
   ollama list
   # Pull model
   ollama pull gemma3-legal:latest
   ```

### Service Health Checks

```bash
# All services health check
curl http://localhost:3003/mcp/health
curl http://localhost:8103/health
curl http://localhost:8095/health
curl http://localhost:4002/minio/health/ready
```

## 📊 Monitoring

### Key Metrics

- **Crawl Success Rate**: Pages successfully crawled vs attempted
- **Ingestion Throughput**: Documents processed per minute
- **Vector Search Latency**: Average search response time
- **Agent Response Quality**: Analysis completeness and accuracy

### Logs

```bash
# MCP Server logs
tail -f logs/mcp-server.log

# Ingestion worker logs
tail -f logs/rag-ingestion.log

# Agent logs
tail -f logs/gemma3-agent.log
```

## 🔐 Security Considerations

- **Input Validation**: All URLs and parameters validated
- **Rate Limiting**: Implemented on web crawl endpoints
- **Content Filtering**: Legal domain restrictions
- **Data Sanitization**: HTML cleaned before storage
- **Access Control**: API endpoints protected

## 🚀 Production Deployment

1. **Scale Services**: Use Kubernetes or Docker Swarm
2. **Load Balancing**: Distribute requests across instances
3. **Monitoring**: Implement comprehensive logging and metrics
4. **Backup**: Regular database and MinIO backups
5. **Security**: SSL/TLS, authentication, authorization

## 📚 API Reference

### MCP Tools

#### web_crawl_legal_documents
Crawls legal websites and returns structured data.

**Parameters:**
- `url` (string): Starting URL
- `maxDepth` (number): Crawl depth (default: 2)
- `maxPages` (number): Max pages to crawl (default: 10)
- `includePatterns` (array): URL patterns to include
- `excludePatterns` (array): URL patterns to exclude
- `legalDomains` (array): Prioritized legal domains

### Agent Endpoints

#### POST /analyze
Performs legal analysis using LangChain agent.

**Request:**
```json
{
  "query": "What are the key risks in this contract?",
  "context": { "document_url": "https://example.com/contract" }
}
```

#### POST /collect-evidence
Collects evidence from multiple URLs.

**Request:**
```json
{
  "urls": ["https://site1.com", "https://site2.com"],
  "query": "contract analysis",
  "maxDepth": 2,
  "maxPages": 5
}
```

This integration provides a complete legal AI platform for automated evidence collection, processing, and analysis.
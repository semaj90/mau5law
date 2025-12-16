# Phase 13 Full Production Integration

## Overview
This document outlines the "Phase 13" integration pattern for the Deeds Web App. This pattern is designed to provide a robust, production-ready integration layer that detects available services, configures the application accordingly, and exposes health status and recommendations.

## Key Components

### 1. Integration Manager (`src/lib/integrations/phase13-full-integration.ts`)
The core of this phase is the `Phase13IntegrationManager` class. It performs the following duties:
- **Service Detection**: Probes for Ollama, Enhanced RAG, Redis, Qdrant, and PostgreSQL.
- **Configuration Building**: Prioritizes production services (e.g., Enhanced RAG > Ollama) and enables optimizations (Redis caching, pgvector).
- **Health Monitoring**: Exposes a lightweight health check endpoint.

### 2. AI Configuration
- **Model**: `gemma3-legal:latest` is the standard model for legal AI tasks.
- **Endpoint Resolution**: Uses `getOllamaEndpoint()` from `$lib/utils/ollama-endpoint` to dynamically resolve the Ollama URL (Docker vs. Localhost).
- **Triton Inference Server**: Integrated for high-performance inference where available.

### 3. Database & Caching
- **Database**: PostgreSQL with `pgvector` extension. Drizzle ORM v0.44 is used for data access.
- **Caching**: Redis is preferred for caching AI responses and session data. Falls back to in-memory caching if Redis is unavailable.

## Usage Pattern

### Initialization
The integration manager should be initialized at application startup (e.g., in `hooks.server.ts` or a dedicated startup script).

```typescript
import { Phase13IntegrationManager } from '$lib/integrations/phase13-full-integration';

const integration = new Phase13IntegrationManager();
await integration.initialize();
```

### Health Check Endpoint
The system exposes a health endpoint at `/api/system/phase13`. This endpoint returns the current status of all integrated services and any recommendations for improvement.

**GET /api/system/phase13**
```json
{
  "level": 1,
  "status": "production",
  "services": {
    "database": true,
    "redis": true,
    "ollama": true,
    "qdrant": true,
    "docker": true,
    "enhancedRag": false
  },
  "recommendations": [
    "Enable Enhanced RAG for better context retrieval."
  ]
}
```

## Tool Calling Grounding
For AI agents (Kiro, Copilot, etc.), this integration provides a grounded context for tool calling. Agents should:
- Check `/api/system/phase13` to verify tool availability before attempting to use them.
- Use the `gemma3-legal:latest` model for all legal reasoning tasks.
- Respect the `enableRealTimeServices` flag in the configuration.

## Environment Variables
The integration relies on standard environment variables:
- `OLLAMA_URL` / `OLLAMA_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `QDRANT_URL`
- `ENHANCED_RAG_URL`

## Context7 Integration
This system aligns with the Context7 MCP server, ensuring that all AI interactions are context-aware and grounded in the application's current state.

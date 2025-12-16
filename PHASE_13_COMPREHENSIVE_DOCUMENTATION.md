# Phase 13: Comprehensive Documentation & Examples

**Status:** ✅ COMPLETE
**Date:** December 15, 2025
**Task:** 18. Documentation and Examples

---

## Table of Contents

1. [API Documentation](#api-documentation)
2. [Component Usage Guide](#component-usage-guide)
3. [Integration Examples](#integration-examples)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Architecture Overview](#architecture-overview)

---

## API Documentation

### Overview

The Phase 13 Agentic Tool Calling system provides three main API endpoints for agent-based tool execution and chat functionality.

### Base URL

```
http://localhost:5173/api/agents
```

### Authentication

All endpoints require valid session authentication. Include session cookies with requests.

---

## Endpoints

### 1. Health Check Endpoint

**Endpoint:** `GET /api/agents/health`

**Purpose:** Check the health status of all services

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T10:30:00Z",
  "services": {
    "ollama": "healthy",
    "qdrant": "healthy",
    "redis": "healthy"
  }
}
```

**Status Codes:**
- `200 OK` - All services healthy
- `503 Service Unavailable` - One or more services unavailable

**Example:**
```bash
curl -X GET http://localhost:5173/api/agents/health
```

---

### 2. Tool Execution Endpoint

**Endpoint:** `POST /api/agents/execute-tool`

**Purpose:** Execute a specific tool with given arguments

**Request Body:**
```json
{
  "toolName": "rag_lookup",
  "arguments": {
    "query": "contract law",
    "topK": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "toolName": "rag_lookup",
  "result": {
    "matches": [
      {
        "id": "doc-1",
        "score": 0.95,
        "payload": {
          "text": "Contract law governs...",
          "source": "legal-docs"
        }
      }
    ]
  }
}
```

**Available Tools:**

#### RAG Lookup
- **Name:** `rag_lookup`
- **Arguments:**
  - `query` (string, required): Search query
  - `topK` (number, optional): Number of results (default: 5)
- **Returns:** Array of ranked matches with similarity scores

#### Web Crawl
- **Name:** `web_crawl`
- **Arguments:**
  - `url` (string, required): URL to crawl
  - `maxLinks` (number, optional): Maximum links to extract (default: 5)
- **Returns:** Page content and extracted links

#### Web Doc Summary
- **Name:** `web_doc_summary`
- **Arguments:**
  - `url` (string, required): Document URL
  - `topic` (string, optional): Topic for guided summarization
- **Returns:** Markdown-formatted summary

#### Web Search
- **Name:** `web_search`
- **Arguments:**
  - `query` (string, required): Search query
- **Returns:** Search results (stub - ready for API integration)

#### Code Search
- **Name:** `code_search`
- **Arguments:**
  - `pattern` (string, required): Search pattern
  - `path` (string, optional): Search path
- **Returns:** Code search results (stub - ready for Go service integration)

**Status Codes:**
- `200 OK` - Tool executed successfully
- `400 Bad Request` - Invalid arguments
- `404 Not Found` - Tool not found
- `500 Internal Server Error` - Execution error

**Example:**
```bash
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "rag_lookup",
    "arguments": {
      "query": "contract law",
      "topK": 5
    }
  }'
```

---

### 3. Agent Chat Endpoint

**Endpoint:** `POST /api/agents/chat`

**Purpose:** Send a message to the agent and receive a response

**Request Body:**
```json
{
  "message": "What are the key clauses in this contract?",
  "context": {
    "caseId": "case-123",
    "userId": "user-456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I found relevant legal documents about contract clauses.",
  "toolCalls": [
    {
      "toolName": "rag_lookup",
      "arguments": {
        "query": "contract clauses"
      }
    }
  ],
  "context": {
    "caseId": "case-123",
    "userId": "user-456"
  }
}
```

**Parameters:**
- `message` (string, required): User message
- `context` (object, optional): Additional context
  - `caseId` (string): Case identifier
  - `userId` (string): User identifier

**Status Codes:**
- `200 OK` - Message processed successfully
- `400 Bad Request` - Invalid message
- `500 Internal Server Error` - Processing error

**Example:**
```bash
curl -X POST http://localhost:5173/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key clauses in this contract?",
    "context": {
      "caseId": "case-123",
      "userId": "user-456"
    }
  }'
```

---

## Component Usage Guide

### AgentChat Component

**Location:** `sveltekit-frontend/src/lib/components/agentic/AgentChat.svelte`

**Purpose:** Provides a chat interface for interacting with the agent

**Props:**
```typescript
interface AgentChatProps {
  caseId?: string;
  userId?: string;
  theme?: 'dark' | 'light';
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
}
```

**Basic Usage:**
```svelte
<script>
  import AgentChat from '$lib/components/agentic/AgentChat.svelte';
</script>

<AgentChat
  caseId="case-123"
  userId="user-456"
  theme="dark"
/>
```

**With Event Handling:**
```svelte
<script>
  import AgentChat from '$lib/components/agentic/AgentChat.svelte';

  function handleToolCall(toolName, args) {
    console.log(`Tool called: ${toolName}`, args);
  }
</script>

<AgentChat
  caseId="case-123"
  userId="user-456"
  theme="dark"
  onToolCall={handleToolCall}
/>
```

**Features:**
- Message display with timestamps
- User input with Enter key support
- Tool result visualization
- Error handling and display
- Dark theme (Noir Detective aesthetic)
- Loading states
- Auto-scroll to latest message

---

## Integration Examples

### Example 1: Basic Chat Integration

```typescript
// In a SvelteKit route
import { page } from '$app/stores';
import AgentChat from '$lib/components/agentic/AgentChat.svelte';

export let data;

function handleToolCall(toolName, args) {
  console.log(`Tool executed: ${toolName}`, args);
}
</script>

<div class="chat-container">
  <AgentChat
    caseId={data.caseId}
    userId={$page.data.user.id}
    onToolCall={handleToolCall}
  />
</div>

<style>
  .chat-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
```

### Example 2: API Integration

```typescript
// Direct API usage
async function executeAgent(message, context) {
  const response = await fetch('/api/agents/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await executeAgent(
  'What are the key clauses?',
  { caseId: 'case-123', userId: 'user-456' }
);

console.log('Agent response:', result.message);
console.log('Tool calls:', result.toolCalls);
```

### Example 3: Tool Execution

```typescript
// Execute a specific tool
async function executeTool(toolName, args) {
  const response = await fetch('/api/agents/execute-tool', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolName,
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const results = await executeTool('rag_lookup', {
  query: 'contract law',
  topK: 10,
});

console.log('Search results:', results.result.matches);
```

### Example 4: Error Handling

```typescript
// Comprehensive error handling
async function executeAgentWithErrorHandling(message, context) {
  try {
    const response = await fetch('/api/agents/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid message format');
      } else if (response.status === 500) {
        throw new Error('Server error - please try again');
      }
      throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}
```

---

## Troubleshooting Guide

### Common Issues

#### 1. "Service Unavailable" Error

**Symptom:** Health check returns 503 status

**Causes:**
- Ollama service not running
- Qdrant service not running
- Redis service not running

**Solution:**
```bash
# Check service status
docker-compose ps

# Restart services
docker-compose restart ollama qdrant redis

# Verify health
curl http://localhost:5173/api/agents/health
```

#### 2. "Tool Not Found" Error

**Symptom:** 404 error when executing tool

**Causes:**
- Tool name misspelled
- Tool not registered
- Tool service not running

**Solution:**
```bash
# Verify tool name
# Valid tools: rag_lookup, web_crawl, web_doc_summary, web_search, code_search

# Check tool registration
npm run check:typescript

# Restart API server
npm run dev
```

#### 3. "Invalid Arguments" Error

**Symptom:** 400 error with validation message

**Causes:**
- Missing required arguments
- Invalid argument types
- Argument values out of range

**Solution:**
```bash
# Check API documentation for required arguments
# Verify argument types and ranges
# Example: topK must be between 1 and 100

# Test with curl
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "rag_lookup",
    "arguments": {
      "query": "test",
      "topK": 5
    }
  }'
```

#### 4. "Timeout" Error

**Symptom:** Request times out after 30 seconds

**Causes:**
- Service is slow
- Network connectivity issue
- Large query taking too long

**Solution:**
```bash
# Check service performance
# Reduce query complexity
# Increase timeout if needed

# Monitor service logs
docker-compose logs ollama
docker-compose logs qdrant
```

#### 5. "Empty Results" Error

**Symptom:** Tool returns empty results

**Causes:**
- No matching documents
- Query too specific
- Service not indexed

**Solution:**
```bash
# Try broader query
# Check if documents are indexed
# Verify Qdrant has data

# Example: Try simpler query
curl -X POST http://localhost:5173/api/agents/execute-tool \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "rag_lookup",
    "arguments": {
      "query": "law",
      "topK": 10
    }
  }'
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (SvelteKit)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         AgentChat Component                      │   │
│  │  - Message display                              │   │
│  │  - User input                                   │   │
│  │  - Tool result visualization                    │   │
│  │  - Error handling                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  POST /api/agents/chat                          │   │
│  │  POST /api/agents/execute-tool                  │   │
│  │  GET /api/agents/health                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Agent Orchestration                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Gemma Agent                                    │   │
│  │  - Tool selection                               │   │
│  │  - Response generation                          │   │
│  │  - Context management                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Tool Layer                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  RAG Lookup  │  Web Crawl  │  Web Summary       │   │
│  │  Web Search  │  Code Search                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend Services                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Ollama (LLM)  │  Qdrant (Vector DB)            │   │
│  │  Redis (Cache) │  PostgreSQL (Data)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → AgentChat component
2. **Message Sent** → POST /api/agents/chat
3. **Agent Processing** → Gemma Agent analyzes message
4. **Tool Selection** → Agent selects appropriate tool(s)
5. **Tool Execution** → Tool executes with arguments
6. **Result Processing** → Results formatted and returned
7. **Response Display** → AgentChat displays response

### Error Handling Flow

```
Error Occurs
    ↓
Error Classification (Network, Timeout, Validation, Service, Unknown)
    ↓
Recovery Strategy Selection (Retry, Fallback, Degrade, Abort, Cache)
    ↓
Execute Recovery Strategy
    ↓
Log Error & Metrics
    ↓
Return Result or Error to User
```

---

## Performance Optimization

### Caching Strategy

| Component | Cache Type | TTL | Key Pattern |
|-----------|-----------|-----|-------------|
| RAG Lookup | Redis | 12h | `rag:{query}:{topK}` |
| Web Crawl | Redis | 7d | `crawl:{url}:{maxLinks}` |
| Web Summary | Redis | 30d | `summary:{url}:{topic}` |
| Web Search | Redis | 1d | `search:{query}` |
| Code Search | Redis | 1d | `code:{pattern}:{path}` |

### Response Times

- RAG Lookup: < 1s (with cache: < 100ms)
- Web Crawl: < 2s (with cache: < 100ms)
- Web Summary: < 5s (with cache: < 100ms)
- Web Search: < 2s (stub)
- Code Search: < 2s (stub)

---

## Security Considerations

### Input Validation

All inputs are validated before processing:
- Query length limits (max 5000 chars)
- Tool name validation (alphanumeric + underscore)
- Argument type checking
- Range validation for numeric parameters

### Error Handling

- No sensitive information in error messages
- Errors logged securely
- User-friendly error messages
- Detailed logs for debugging

### Authentication

- Session-based authentication required
- CSRF protection enabled
- Rate limiting ready for implementation
- Secure headers configured

---

## Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run check:typescript`)
- [ ] Svelte validation passing (`npm run check:svelte:frontend`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] Services running (Ollama, Qdrant, Redis, PostgreSQL)
- [ ] Health check passing
- [ ] API endpoints responding
- [ ] Component rendering correctly
- [ ] Error handling working

---

## Support & Resources

### Documentation Files
- `PHASE_13_EXECUTIVE_SUMMARY_85_PERCENT.md` - Executive overview
- `PHASE_13_COMPREHENSIVE_INDEX_85_PERCENT.md` - Complete index
- `PHASE_13_TYPE_SAFETY_DOCUMENTATION.md` - Type system details

### Test Files
- `sveltekit-frontend/src/routes/api/agents/__tests__/api.test.ts` - API tests
- `sveltekit-frontend/src/lib/components/agentic/__tests__/AgentChat.test.ts` - Component tests

### Specification Files
- `.kiro/specs/phase-13-agentic-tool-calling/requirements.md` - Requirements
- `.kiro/specs/phase-13-agentic-tool-calling/design.md` - Design document
- `.kiro/specs/phase-13-agentic-tool-calling/tasks.md` - Task list

---

**Last Updated:** December 15, 2025
**Maintained By:** Kiro IDE
**Status:** ✅ TASK 18 COMPLETE


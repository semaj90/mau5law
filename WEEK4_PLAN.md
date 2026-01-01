# Week 4: Production Deployment & UI Dashboard

## 🎯 Overview

Week 3 built the **complete backend infrastructure** for knowledge-based error fixing. Week 4 focuses on:
1. **Svelte UI Dashboard** for user interaction
2. **Production deployment** with Docker
3. **Monitoring & Analytics** with Grafana
4. **Performance optimization** and scaling

---

## 📋 Task Breakdown

### Task 4.1: Svelte UI Dashboard (3-4 hours)

Build comprehensive Svelte 5 dashboard for error fixing workflow.

#### Components to Create

**1. Error Submission Form** (`ErrorSubmissionForm.svelte`)
```typescript
// Features:
- File path input with autocomplete
- Error message textarea
- Error type dropdown (typescript, svelte5, python, etc.)
- Code context editor (Monaco)
- Submit button → calls /api/kb/search-fix-sources
```

**2. Source Validation Panel** (`SourceValidationPanel.svelte`)
```typescript
// Features:
- List of found sources with relevance scores
- Auto-approved sources highlighted (green badge)
- Checkboxes to approve/reject pending sources
- Source preview modal (click to expand)
- Validation notes textarea
- Submit → calls /api/kb/validate-sources
```

**3. Fix Preview Card** (`FixPreviewCard.svelte`)
```typescript
// Features:
- Side-by-side diff view (original vs fixed)
- Monaco editor with syntax highlighting
- Explanation text with Markdown rendering
- Source citations (clickable links)
- Confidence score progress bar
- Apply/Reject buttons → calls /api/kb/apply-fix
```

**4. Agentic Status Monitor** (`AgenticStatusMonitor.svelte`)
```typescript
// Features:
- Real-time status polling (every 2s)
- Progress bar (iteration N/M)
- Status badges: searching, validating, generating, testing, completed
- Sources found counter
- Fixes generated counter
- Confidence score gauge
- Error display if failed
```

**5. Provenance Graph** (`ProvenanceGraph.svelte`)
```typescript
// Features:
- D3.js force-directed graph
- Nodes: fixes, sources, files
- Edges: citations, applications
- Click node → show details panel
- Filter by date range, error type, success
- Export to PNG/SVG
```

**6. Analytics Dashboard** (`AnalyticsDashboard.svelte`)
```typescript
// Features:
- Success rate by error type (bar chart)
- Most effective sources (table)
- Auto-approval effectiveness (pie chart)
- Fixes over time (line chart)
- Top fixed files (list)
```

#### Routes to Create

```
/kb-fixing
├── /                        # Main dashboard (AnalyticsDashboard)
├── /submit                  # Error submission (ErrorSubmissionForm)
├── /workflow/{error_id}     # Active workflow (SourceValidationPanel + FixPreviewCard)
├── /agentic                 # Agentic fix launcher (AgenticStatusMonitor)
├── /provenance              # Provenance explorer (ProvenanceGraph)
└── /history/{file_path}     # File fix history
```

#### API Integration

```typescript
// src/lib/api/kb-fixing.ts
export async function searchFixSources(errorContext: ErrorContext) {
  return fetch('/api/kb/search-fix-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorContext)
  }).then(r => r.json());
}

export async function validateSources(request: SourceValidationRequest) {
  return fetch('/api/kb/validate-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  }).then(r => r.json());
}

export async function startAgenticFix(request: AgenticFixRequest) {
  return fetch('/api/kb/v2/agentic-fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  }).then(r => r.json());
}

export async function pollAgenticStatus(taskId: string) {
  return fetch(`/api/kb/v2/agentic-status/${taskId}`)
    .then(r => r.json());
}
```

---

### Task 4.2: Docker Deployment (2-3 hours)

Production-ready Docker setup with all services.

#### `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Backend API
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/legal
      - QDRANT_URL=http://qdrant:6333
      - COUCHDB_URL=http://couchdb:5984
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - postgres
      - qdrant
      - couchdb
      - ollama
    restart: unless-stopped

  # PostgreSQL
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=legal
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sveltekit-frontend/drizzle/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Qdrant
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  # CouchDB
  couchdb:
    image: couchdb:3
    environment:
      - COUCHDB_USER=admin
      - COUCHDB_PASSWORD=admin
    volumes:
      - couchdb_data:/opt/couchdb/data
    ports:
      - "5984:5984"
    restart: unless-stopped

  # Ollama
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - postgres
    restart: unless-stopped

  # SvelteKit Frontend
  frontend:
    build: ./sveltekit-frontend
    ports:
      - "5175:5175"
    environment:
      - API_BASE_URL=http://backend:8001
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  qdrant_data:
  couchdb_data:
  ollama_data:
  grafana_data:
```

#### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8001

# Run application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### `sveltekit-frontend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json .
RUN npm ci

# Copy application
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 5175

# Run application
CMD ["node", "build"]
```

---

### Task 4.3: Grafana Dashboards (2 hours)

Visual analytics for KB fixing performance.

#### Dashboard 1: KB Fixing Overview

**Panels**:
1. **Fixes Applied Today** (stat)
2. **Success Rate** (gauge)
3. **Auto-Approval Rate** (gauge)
4. **Fixes Over Time** (time series)
5. **Error Types Distribution** (pie chart)
6. **Top Fixed Files** (table)

**SQL Query Example**:
```sql
-- Fixes over time
SELECT
  DATE_TRUNC('hour', applied_at) as time,
  COUNT(*) as fixes_applied,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_fixes
FROM kb_provenance_graph
WHERE applied_at >= NOW() - INTERVAL '7 days'
GROUP BY time
ORDER BY time;
```

#### Dashboard 2: Source Effectiveness

**Panels**:
1. **Most Effective Sources** (table)
2. **Source Usage Over Time** (stacked area)
3. **Auto-Approval Rules** (table)
4. **Source Success Rate** (bar chart)

**SQL Query Example**:
```sql
-- Source effectiveness
SELECT * FROM most_effective_sources LIMIT 20;
```

#### Dashboard 3: Agentic Performance

**Panels**:
1. **Avg Iterations to Success** (stat)
2. **Confidence Distribution** (histogram)
3. **Processing Time** (time series)
4. **Auto-Apply Rate** (gauge)

---

### Task 4.4: Performance Optimization (2-3 hours)

#### Redis Caching

```python
# backend/services/redis_cache.py
import redis
import json
from typing import Optional, Any

class KBFixingCache:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url)

    async def get_source_search(self, query_hash: str) -> Optional[List[Dict]]:
        """Cache source search results (5 min TTL)"""
        cached = self.redis.get(f"source_search:{query_hash}")
        return json.loads(cached) if cached else None

    async def set_source_search(self, query_hash: str, results: List[Dict]):
        self.redis.setex(f"source_search:{query_hash}", 300, json.dumps(results))

    async def get_fix_result(self, fix_id: str) -> Optional[Dict]:
        """Cache fix results (24 hour TTL)"""
        cached = self.redis.get(f"fix:{fix_id}")
        return json.loads(cached) if cached else None

    async def set_fix_result(self, fix_id: str, result: Dict):
        self.redis.setex(f"fix:{fix_id}", 86400, json.dumps(result))
```

#### Database Indexing

```sql
-- Add GIN index for JSONB queries
CREATE INDEX CONCURRENTLY idx_provenance_sources_gin
ON kb_provenance_graph USING GIN(validated_sources);

-- Add partial index for active sessions
CREATE INDEX CONCURRENTLY idx_sessions_active
ON error_sessions(expires_at)
WHERE status NOT IN ('applied', 'failed');

-- Add composite index for provenance queries
CREATE INDEX CONCURRENTLY idx_provenance_file_time
ON kb_provenance_graph(file_path, applied_at DESC);
```

#### Connection Pooling

```python
# backend/services/db_pool.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

---

### Task 4.5: Testing & CI/CD (2 hours)

#### Unit Tests

```python
# backend/tests/test_kb_fixing_api_v2.py
import pytest
from fastapi.testclient import TestClient

@pytest.mark.asyncio
async def test_auto_approval_rules():
    # Test CRUD operations
    response = client.post("/api/kb/v2/approval-rules", json={...})
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_agentic_fix_generation():
    # Test full agentic workflow
    response = client.post("/api/kb/v2/agentic-fix", json={...})
    task_id = response.json()['task_id']

    # Poll until complete
    for _ in range(10):
        status = client.get(f"/api/kb/v2/agentic-status/{task_id}")
        if status.json()['status'] == 'completed':
            break
        await asyncio.sleep(1)

    assert status.json()['status'] == 'completed'
```

#### GitHub Actions

```yaml
# .github/workflows/week3-tests.yml
name: Week 3 KB Fixing Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

      qdrant:
        image: qdrant/qdrant:latest

      couchdb:
        image: couchdb:3

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r backend/requirements.txt

      - name: Run migrations
        run: psql -f sveltekit-frontend/drizzle/migrations/week3_kb_fixing_tables.sql

      - name: Run tests
        run: pytest backend/tests/
```

---

## 📊 Week 4 Deliverables

### Files to Create (Estimated)

**Svelte UI** (~2,000 lines):
- `src/routes/kb-fixing/+page.svelte` (500 lines)
- `src/routes/kb-fixing/submit/+page.svelte` (300 lines)
- `src/routes/kb-fixing/workflow/[error_id]/+page.svelte` (400 lines)
- `src/routes/kb-fixing/agentic/+page.svelte` (300 lines)
- `ErrorSubmissionForm.svelte` (200 lines)
- `SourceValidationPanel.svelte` (300 lines)
- `FixPreviewCard.svelte` (250 lines)
- `AgenticStatusMonitor.svelte` (200 lines)
- `ProvenanceGraph.svelte` (400 lines)
- `AnalyticsDashboard.svelte` (300 lines)

**Docker & Deployment** (~500 lines):
- `docker-compose.yml` (150 lines)
- `backend/Dockerfile` (30 lines)
- `sveltekit-frontend/Dockerfile` (30 lines)
- `.dockerignore` files (20 lines)
- Deployment scripts (100 lines)

**Grafana** (~300 lines):
- 3 dashboard JSON files (200 lines)
- Datasource configs (50 lines)
- Alert rules (50 lines)

**Performance** (~400 lines):
- `redis_cache.py` (150 lines)
- Connection pooling (100 lines)
- Index migrations (50 lines)
- Optimization configs (100 lines)

**Testing** (~600 lines):
- Unit tests (300 lines)
- Integration tests (200 lines)
- CI/CD configs (100 lines)

**Total**: ~3,800 lines

---

## 🚀 Quick Start Commands (Week 4)

### Start All Services
```bash
docker-compose up -d
```

### Run Migrations
```bash
docker-compose exec postgres psql -U user -d legal -f /docker-entrypoint-initdb.d/week3_kb_fixing_tables.sql
```

### Access Services
- **Frontend**: http://localhost:5175/kb-fixing
- **Backend API**: http://localhost:8001/docs
- **Grafana**: http://localhost:3000 (admin/admin)
- **Qdrant**: http://localhost:6333/dashboard

### Run Tests
```bash
pytest backend/tests/test_kb_fixing_api_v2.py -v
```

---

## 📈 Success Metrics

Week 4 is complete when:
- ✅ Users can submit errors via Svelte UI
- ✅ Auto-approval works in real-time
- ✅ Agentic fixes complete end-to-end
- ✅ Provenance graph visualizes fix chains
- ✅ Grafana dashboards show live metrics
- ✅ Docker deployment works on fresh machine
- ✅ All tests pass in CI/CD
- ✅ Performance meets targets:
  - Search latency < 500ms
  - Fix generation < 5s
  - Agentic workflow < 30s

---

## 🎓 Week 4 Timeline

**Day 1** (4 hours):
- Task 4.1 (Part 1): Build core Svelte components
  - ErrorSubmissionForm
  - SourceValidationPanel
  - FixPreviewCard

**Day 2** (4 hours):
- Task 4.1 (Part 2): Build advanced components
  - AgenticStatusMonitor
  - ProvenanceGraph
  - AnalyticsDashboard

**Day 3** (3 hours):
- Task 4.2: Docker deployment
  - Write Dockerfiles
  - Configure docker-compose
  - Test deployment

**Day 4** (2 hours):
- Task 4.3: Grafana dashboards
  - Create dashboard JSONs
  - Configure datasources
  - Set up alerts

**Day 5** (3 hours):
- Task 4.4: Performance optimization
  - Add Redis caching
  - Database indexing
  - Connection pooling

**Day 6** (2 hours):
- Task 4.5: Testing & CI/CD
  - Write unit tests
  - Integration tests
  - GitHub Actions

**Total**: 18 hours (~3 weeks at 1 hour/day or 1 week full-time)

---

**Status**: 📝 Week 4 Planned - Ready to implement!

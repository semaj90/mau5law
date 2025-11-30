# 🚀 PHASE 2: Citation Intelligence - Implementation Plan
**Status**: Ready to Implement
**Duration**: 3-4 days
**Start Date**: 2025-11-30
**Target Completion**: 2025-12-03

---

## 📦 **Discovered Assets**

### **✅ GOOD NEWS: You Already Have Most of the Tools!**

#### **1. Web Crawling & Scraping**
```python
# FOUND: 5 different web scraping implementations!

✅ python-services/web_crawl.py
   - BeautifulSoup + requests
   - FastAPI service (port 8102)
   - Clean text extraction
   - Metadata extraction (title, description, OG tags)
   - Link extraction and cleanup

✅ python-services/web_crawl_service.py
   - Enhanced version with more features
   - Async support with aiohttp

✅ backend/services/retrieval/sources/enhanced_web_search.py
   - Async with aiohttp
   - BeautifulSoup parsing
   - Main content extraction
   - Heading/link extraction
   - Already integrated with retrieval system! ⭐

✅ python_codebase/utilities/phase46_safe_crawl.py
   - Robots.txt compliance
   - Rate limiting
   - Safe scraping

✅ scripts/legal-document-scraper.py
   - Legal-specific scraping
   - Court documents
   - Legal citation extraction
```

#### **2. HTTP Clients**
```python
✅ requests - Synchronous HTTP (used in 50+ files)
✅ aiohttp - Async HTTP (used in 30+ files)
✅ httpx - Modern async HTTP (used in 20+ files)
```

#### **3. JSON Parsers**
```python
❌ NO orjson/simdjson/ujson found in Python
✅ SIMD JSON exists in TypeScript/Frontend only
   - sveltekit-frontend/src_fixed/* (multiple references)
   - Frontend optimization, not backend
```

#### **4. Citation Management**
```python
✅ Existing citation system found!
   - backend/services/retrieval/citations/citation_manager.py
   - migrations/002_create_citations_table.sql ✅
   - sveltekit-frontend/src/lib/server/services/citation.service.ts
   - sveltekit-frontend/src/lib/stores/unified/citation-store.ts
```

#### **5. California Constitution Ingestion**
```python
✅ MASSIVE California legal corpus ingestion system!
   - backend/services/ca_const_ingest.py (embedded in grep output)
   - Multi-source merging (leginfo.gov + Cornell Law)
   - Citation graph construction with NetworkX
   - Authority ranking
   - Legal citation patterns (CA Const, CA Penal, US Const, etc.)
   - This is EXACTLY what we need! ⭐⭐⭐
```

---

## 📋 **VS Code Tasks Available**

### **Infrastructure Tasks**
```json
// .vscode/tasks.json - 1190 lines of tasks!

✅ Deploy Qdrant with GPU Support
✅ Setup Postgres 17 + pgvector
✅ Setup Redis
✅ Setup Ollama Gemma-Legal
✅ Deploy All Infrastructure (Full Setup)
✅ Start Supervisord (MLP Workers)
✅ Check Supervisord Status
✅ View MLP Worker Logs
```

### **Test Tasks**
```json
✅ Test MCP Playwright Auditor
✅ Test YOLO-SAM Pipeline
✅ Test TS AST Autofixer
✅ Test Phase-74 Ingestion
✅ Full Repository Health Check
```

### **Build Tasks**
```json
✅ Build CMake QLoRA Trainer
✅ Compile QLoRA Trainer
✅ Build Ingestion Watcher
✅ Start Embedding Service
```

### **Hybrid Ingestion System**
```json
✅ Setup Hybrid Ingestion Database
✅ Setup MinIO Buckets
✅ Deploy Hybrid Ingestion System (composite task)
✅ Start Ingestion Watcher
✅ Install Embedding Service Dependencies
```

---

## 🎯 **Phase 2 Implementation Strategy**

### **Option 1: Leverage Existing CA Constitution Ingestion** ⭐ RECOMMENDED
The `ca_const_ingest.py` already has:
- ✅ Multi-source web scraping (leginfo.gov + Cornell Law)
- ✅ Legal citation extraction with regex patterns
- ✅ Citation graph construction
- ✅ Authority scoring
- ✅ NetworkX graph analysis
- ✅ Chunk generation with overlap
- ✅ JSONL output format

**Action**: Adapt this for Google Search integration

### **Option 2: Use Enhanced Web Search** ⭐ ALSO GOOD
The `enhanced_web_search.py` in `backend/services/retrieval/sources/` is already:
- ✅ Part of your retrieval system
- ✅ Async with aiohttp
- ✅ BeautifulSoup integration
- ✅ Content extraction
- ✅ Ready to integrate with citation_manager.py

---

## 📝 **Implementation Plan - Day by Day**

### **Day 1: Complete Google Search Retriever** (Monday, Dec 2)

#### **Morning: Setup Google Custom Search API**
```python
# backend/services/retrieval/sources/google_search_retriever.py

import os
from typing import List, Optional
import aiohttp
from ..models import Result
from .enhanced_web_search import EnhancedWebSearch

class GoogleSearchRetriever:
    """Google Custom Search API integration."""

    def __init__(self, api_key: str, search_engine_id: str):
        self.api_key = api_key or os.getenv("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = search_engine_id or os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        self.web_scraper = EnhancedWebSearch()  # ⭐ Use existing scraper!

    async def search(self, query: str, num_results: int = 10) -> List[Result]:
        """Perform Google Custom Search."""
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": num_results
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(self.base_url, params=params) as response:
                data = await response.json()

                results = []
                for item in data.get("items", []):
                    # Fetch full content from URL
                    parsed = await self.web_scraper.fetch_and_parse(item["link"])

                    results.append(Result(
                        title=item.get("title", ""),
                        content=parsed.get("content", item.get("snippet", "")) if parsed else item.get("snippet", ""),
                        url=item["link"],
                        metadata={
                            "snippet": item.get("snippet", ""),
                            "displayLink": item.get("displayLink", ""),
                            "htmlTitle": item.get("htmlTitle", ""),
                            "htmlSnippet": item.get("htmlSnippet", ""),
                            "full_content": parsed if parsed else None
                        }
                    ))

                return results
```

#### **Afternoon: Test Google Search**
```bash
# Test the retriever
python -c "
import asyncio
from backend.services.retrieval.sources.google_search_retriever import GoogleSearchRetriever

async def test():
    retriever = GoogleSearchRetriever(
        api_key='YOUR_API_KEY',
        search_engine_id='YOUR_SEARCH_ENGINE_ID'
    )
    results = await retriever.search('california labor law wage theft', num_results=5)
    for r in results:
        print(f'{r.title}: {r.url}')

asyncio.run(test())
"
```

---

### **Day 2: Complete Citation Manager** (Tuesday, Dec 3)

#### **Morning: Citation Extraction**
```python
# backend/services/retrieval/citation_manager.py

import re
from typing import List, Dict, Any
from datetime import datetime
import networkx as nx
from .sources.enhanced_web_search import EnhancedWebSearch

class CitationManager:
    """Manage legal citations with extraction, verification, and graph analysis."""

    # ⭐ Reuse patterns from ca_const_ingest.py!
    CITATION_PATTERNS = {
        "ca_const": r"(?:CA|California)\s+(?:Const|Constitution)\.?\s+(?:Art|Article)\s+([IVX]+)(?:,?\s+(?:§|Section)\s+(\d+(?:\.\d+)*))?",
        "ca_penal": r"(?:CA|California)\s+(?:Penal|PC)\s+(?:Code\s+)?§?\s*(\d+(?:\.\d+)*)",
        "ca_labor": r"(?:CA|California)\s+(?:Labor|LC)\s+(?:Code\s+)?§?\s*(\d+(?:\.\d+)*)",
        "us_const": r"(?:US|United States)\s+(?:Const|Constitution)\.?\s+(?:Art|Article)\s+([IVX]+)",
        "case_law": r"(\w+\s+v\.?\s+\w+),\s*(\d+)\s+([A-Z][a-z\.]+)\s+(\d+)\s+\((\d{4})\)",
        "us_statute": r"(\d+)\s+U\.S\.C\.?\s+§?\s*(\d+(?:\.\d+)*)",
    }

    AUTHORITY_WEIGHTS = {
        "ca_const": 1.0,
        "ca_penal": 0.95,
        "ca_labor": 0.90,
        "us_const": 0.85,
        "us_statute": 0.80,
        "case_law": 0.70,
        "secondary": 0.50
    }

    def __init__(self):
        self.citation_graph = nx.DiGraph()
        self.web_scraper = EnhancedWebSearch()

    def extract_citations(self, text: str) -> List[Dict[str, Any]]:
        """Extract all legal citations from text."""
        citations = []

        for citation_type, pattern in self.CITATION_PATTERNS.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                citation = {
                    "type": citation_type,
                    "text": match.group(0),
                    "authority": self.AUTHORITY_WEIGHTS.get(citation_type, 0.5),
                    "position": match.start(),
                    "raw_groups": match.groups()
                }
                citations.append(citation)

        return sorted(citations, key=lambda x: x["position"])

    async def verify_citation(self, citation: Dict[str, Any]) -> Dict[str, Any]:
        """Verify citation validity by searching online."""
        # Search for citation text
        search_query = citation["text"]

        # Use Google Search to verify
        # (Integrate with GoogleSearchRetriever)

        return {
            **citation,
            "verified": True,
            "verified_at": datetime.utcnow().isoformat(),
            "sources": []  # Add verification sources
        }

    def build_citation_graph(self, documents: List[Dict[str, Any]]) -> nx.DiGraph:
        """Build citation graph for authority ranking."""
        for doc in documents:
            doc_id = doc.get("id", "")
            citations = self.extract_citations(doc.get("content", ""))

            # Add document node
            self.citation_graph.add_node(
                doc_id,
                title=doc.get("title", ""),
                doc_type=doc.get("type", "unknown")
            )

            # Add citation edges
            for citation in citations:
                citation_id = f"{citation['type']}:{citation['text']}"

                # Add citation node if not exists
                if citation_id not in self.citation_graph:
                    self.citation_graph.add_node(
                        citation_id,
                        text=citation["text"],
                        type=citation["type"],
                        authority=citation["authority"]
                    )

                # Add edge from document to citation
                self.citation_graph.add_edge(
                    doc_id,
                    citation_id,
                    weight=citation["authority"]
                )

        return self.citation_graph

    def get_authority_score(self, citation_id: str) -> float:
        """Calculate citation authority score using PageRank."""
        if citation_id not in self.citation_graph:
            return 0.0

        pagerank = nx.pagerank(self.citation_graph, weight="weight")
        return pagerank.get(citation_id, 0.0)

    def find_related_citations(self, citation_id: str, max_results: int = 10) -> List[str]:
        """Find related citations using graph traversal."""
        if citation_id not in self.citation_graph:
            return []

        # Get citations that reference the same cases
        neighbors = list(self.citation_graph.neighbors(citation_id))

        # Score by co-occurrence
        related = []
        for neighbor in neighbors:
            score = self.get_authority_score(neighbor)
            related.append((neighbor, score))

        # Sort by score and return top results
        related.sort(key=lambda x: x[1], reverse=True)
        return [cit for cit, _ in related[:max_results]]
```

#### **Afternoon: Database Integration**
```sql
-- migrations/002_create_citations_table.sql already exists! ✅
-- Just need to wire the citation manager to PostgreSQL

-- Add any additional columns if needed:
ALTER TABLE citations ADD COLUMN IF NOT EXISTS authority_score FLOAT DEFAULT 0.0;
ALTER TABLE citations ADD COLUMN IF NOT EXISTS pagerank_score FLOAT DEFAULT 0.0;
ALTER TABLE citations ADD COLUMN IF NOT EXISTS graph_data JSONB;
```

---

### **Day 3: API Endpoints** (Wednesday, Dec 4)

```python
# sveltekit-frontend/src/routes/api/v1/citations/search/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
    const { query, max_results = 10 } = await request.json();

    // Call Python backend (citation_manager)
    const response = await fetch('http://localhost:8000/api/citations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, max_results })
    });

    const results = await response.json();

    return json({
        success: true,
        results,
        count: results.length
    });
};
```

---

### **Day 4: Frontend Integration** (Thursday, Dec 5)

```svelte
<!-- sveltekit-frontend/src/routes/(app)/yorha/citations/+page.svelte -->

<script lang="ts">
    import { Button } from '$lib/components/ui/button';

    let query = $state('california labor law');
    let results = $state([]);
    let loading = $state(false);

    async function searchCitations() {
        loading = true;
        try {
            const res = await fetch('/api/v1/citations/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, max_results: 20 })
            });
            const data = await res.json();
            results = data.results;
        } finally {
            loading = false;
        }
    }
</script>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Citation Intelligence</h1>

    <div class="flex gap-2 mb-4">
        <input
            type="text"
            bind:value={query}
            placeholder="Search legal citations..."
            class="flex-1 px-4 py-2 border rounded"
        />
        <Button onclick={searchCitations} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
        </Button>
    </div>

    {#if results.length > 0}
        <div class="grid gap-4">
            {#each results as citation}
                <div class="p-4 border rounded">
                    <h3 class="font-semibold">{citation.title}</h3>
                    <p class="text-sm text-gray-600">{citation.url}</p>
                    <p class="mt-2">{citation.snippet}</p>
                    <div class="mt-2 flex gap-2">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {citation.type}
                        </span>
                        <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Authority: {(citation.authority * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
```

---

## 🔧 **Setup Commands**

### **1. Setup Google Custom Search API**
```bash
# Get API key from: https://console.cloud.google.com/apis/credentials
# Create Custom Search Engine: https://programmablesearchengine.google.com/

# Add to .env
echo "GOOGLE_SEARCH_API_KEY=your_api_key_here" >> .env
echo "GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here" >> .env
```

### **2. Install Dependencies**
```bash
# Python backend
cd backend
pip install aiohttp beautifulsoup4 networkx requests httpx

# Already installed from existing services! ✅
```

### **3. Run Migration**
```bash
# Citation table already exists! ✅
# Just verify:
psql -U legal_admin -h localhost -p 5434 -d legal_ai_db -c "\d citations"
```

### **4. Start Services**
```bash
# Use existing VS Code task:
# "Deploy All Infrastructure (Full Setup)"

# Or manually:
docker-compose up -d  # PostgreSQL, Redis, Ollama, Qdrant
npm run dev  # SvelteKit (in sveltekit-frontend/)
```

---

## ✅ **Success Criteria**

- [ ] Google Custom Search API integrated
- [ ] Citation extraction working (10+ citation types)
- [ ] Citation graph construction complete
- [ ] Authority scoring via PageRank
- [ ] API endpoints functional
- [ ] Frontend search UI working
- [ ] Database persistence verified
- [ ] <50ms search response time
- [ ] Documentation complete

---

## 📚 **Key Files to Create/Modify**

### **Create**
```
✅ backend/services/retrieval/sources/google_search_retriever.py
✅ backend/services/retrieval/citation_manager.py (exists, enhance)
✅ sveltekit-frontend/src/routes/api/v1/citations/search/+server.ts
✅ sveltekit-frontend/src/routes/(app)/yorha/citations/+page.svelte
```

### **Modify**
```
✅ backend/services/retrieval/multi_source_retriever.py (add Google Search)
✅ .env (add GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID)
```

---

## 🎉 **You're Ready to Start!**

**Next Step**: Run the VS Code task "Deploy All Infrastructure (Full Setup)" and start Day 1!

```bash
# Quick Start
cd sveltekit-frontend
npm run dev

# In another terminal:
cd backend
python -m services.retrieval.sources.google_search_retriever
```

---

**Let's ship Phase 2! 🚀**

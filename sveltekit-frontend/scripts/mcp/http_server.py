"""
Simple HTTP wrapper for MCP tools
Works with Agent Orchestrator via REST API
"""
import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn

# Import tool implementations
import sys
sys.path.append(os.path.dirname(__file__))

from tools.web_search import web_search
from tools.kb_ingest import kb_ingest
from tools.graph_upsert import graph_upsert_entities, graph_upsert_edges, graph_query

app = FastAPI(title="MCP Tool Server")

class ToolRequest(BaseModel):
    tool: str
    args: Dict[str, Any]

@app.post("/tools/web_search_tool")
async def web_search_tool(query: str, recency_days: Optional[int] = None, domains: Optional[list] = None, max_results: int = 5):
    """Web search via Ollama"""
    try:
        result = await web_search(query, recency_days, domains, max_results)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/kb_upsert_documents")
async def kb_upsert_documents_tool(documents: list, collection: str = "default", chunk_size: int = 500, overlap: int = 50):
    """Ingest documents to knowledge base"""
    try:
        result = await kb_ingest(documents, collection, chunk_size, overlap)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/kb_vector_search")
async def kb_vector_search_tool(query: str, collection: str = "default", limit: int = 10, threshold: float = 0.7):
    """Search knowledge base"""
    try:
        # This would call Qdrant search with Ollama embeddings
        # For now, return mock structure
        return {
            "results": [],
            "metadata": {
                "query": query,
                "collection": collection,
                "limit": limit,
                "threshold": threshold
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/graph_upsert_nodes")
async def graph_upsert_nodes_tool(entities: list, label: str = "Entity"):
    """Upsert nodes to Neo4j"""
    try:
        result = await graph_upsert_entities(entities, label)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/graph_upsert_relationships")
async def graph_upsert_relationships_tool(edges: list, relationship_type: str = "RELATES_TO"):
    """Upsert relationships to Neo4j"""
    try:
        result = await graph_upsert_edges(edges, relationship_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/graph_cypher_query")
async def graph_cypher_query_tool(cypher: str, params: Optional[Dict] = None):
    """Execute Cypher query"""
    try:
        result = await graph_query(cypher, params or {})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "tools": 6}

@app.get("/")
async def root():
    """Root endpoint with tool listing"""
    return {
        "name": "MCP Tool Server",
        "version": "1.0.0",
        "tools": [
            "web_search_tool",
            "kb_upsert_documents",
            "kb_vector_search",
            "graph_upsert_nodes",
            "graph_upsert_relationships",
            "graph_cypher_query"
        ]
    }

if __name__ == "__main__":
    port = int(os.getenv("MCP_PORT", "3003"))

    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║          MCP Tool Server - HTTP Edition                       ║
╠═══════════════════════════════════════════════════════════════╣
║  6 tools available via REST API                               ║
║  Compatible with Agent Orchestrator                           ║
╚═══════════════════════════════════════════════════════════════╝

🔧 Tools:
   • /tools/web_search_tool
   • /tools/kb_upsert_documents
   • /tools/kb_vector_search
   • /tools/graph_upsert_nodes
   • /tools/graph_upsert_relationships
   • /tools/graph_cypher_query

🌐 Server: http://localhost:{port}
📊 Health: http://localhost:{port}/health

Press Ctrl+C to stop
    """)

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

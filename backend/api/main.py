"""
Main FastAPI application for Legal AI Backend.

Mounts both similarity_api (existing) and search_api (new agentic search) routers.
"""

from fastapi import FastAPI

# Import routers
try:
    from .similarity_api import router as similarity_router
except ImportError:
    similarity_router = None

from .search_api import router as search_router

try:
    from .agent_api import router as agent_router
except ImportError:
    agent_router = None

try:
    from .phase72_agent_api import router as phase72_agent_router
except ImportError:
    phase72_agent_router = None

# Create FastAPI app
app = FastAPI(
    title="Legal AI Backend",
    description="Agentic legal search with alignment routing, RAG, KAG, and topology feedback",
    version="1.0.0",
)

# Include routers
if similarity_router:
    app.include_router(similarity_router)

app.include_router(search_router)

if agent_router:
    app.include_router(agent_router)

if phase72_agent_router:
    app.include_router(phase72_agent_router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "legal-ai-backend"}

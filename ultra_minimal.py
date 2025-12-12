"""
Ultra-minimal FastAPI app for testing
"""

from fastapi import FastAPI

app = FastAPI(title="Ultra Minimal Legal AI Backend")

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ultra-minimal-legal-ai-backend"}

@app.get("/test")
def test_endpoint():
    """Test endpoint."""
    return {"message": "Server is running!"}
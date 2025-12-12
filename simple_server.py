#!/usr/bin/env python3
"""
Simple test server
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test Server")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Test server running"}

@app.get("/test")
def test():
    return {"message": "Hello from test server"}

if __name__ == "__main__":
    print("Starting test server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
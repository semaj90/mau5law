#!/usr/bin/env python3
"""
Advanced AI Integration API for Legal AI Platform
FastAPI server that exposes the AdvancedAIIntegration system
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

# Add the advanced-ai-integration directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "advanced-ai-integration"))

from __init__ import AdvancedAIIntegration, get_advanced_ai_integration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global AI integration instance
ai_integration: Optional[AdvancedAIIntegration] = None

# WebSocket connections for real-time updates
active_connections: List[WebSocket] = []

class TaskRequest(BaseModel):
    """Request model for AI tasks"""
    type: str
    content: str
    priority: str = "medium"
    domain: str = "legal"
    complexity: str = "medium"
    user_id: Optional[str] = None
    file_id: Optional[str] = None

class AnalysisRequest(BaseModel):
    """Request model for document analysis"""
    file_id: str
    prompt: str = "Analyze this legal document for key information and risks"
    user_id: Optional[str] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global ai_integration

    # Startup
    logger.info("🚀 Starting Advanced AI Integration API")
    try:
        ai_integration = await initialize_advanced_ai()
        logger.info("✅ Advanced AI Integration initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Advanced AI: {e}")
        ai_integration = None

    yield

    # Shutdown
    logger.info("🛑 Shutting down Advanced AI Integration API")
    if ai_integration:
        await ai_integration.shutdown_system()

app = FastAPI(
    title="Advanced AI Integration API",
    description="REST and WebSocket API for advanced AI orchestration in legal AI platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def initialize_advanced_ai() -> AdvancedAIIntegration:
    """Initialize the Advanced AI Integration system"""
    config_path = os.getenv("ADVANCED_AI_CONFIG", None)
    integration = get_advanced_ai_integration(config_path)
    await integration.initialize_system()
    return integration

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if ai_integration is None:
        raise HTTPException(status_code=503, detail="AI system not initialized")

    status = await ai_integration.get_system_status()
    return {
        "status": "healthy" if status["integration_status"]["initialized"] else "unhealthy",
        "advanced_ai": True,
        "capabilities": [
            "neural_architecture_search",
            "meta_learning",
            "multi_agent_coordination",
            "federated_learning",
            "quantum_classical_hybrid",
            "domain_optimization"
        ],
        "system_status": status
    }

@app.post("/api/v3/advanced-ai/task")
async def process_advanced_task(task: TaskRequest, background_tasks: BackgroundTasks):
    """Process a task using advanced AI orchestration"""
    if ai_integration is None:
        raise HTTPException(status_code=503, detail="AI system not available")

    try:
        # Convert to dict and add advanced analysis
        task_dict = task.model_dump()
        task_dict.update({
            "domain_specific": True,
            "quantum_beneficial": task.complexity == "high",
            "multi_agent_beneficial": task.complexity in ["medium", "high"],
            "meta_learning_applicable": task.type in ["few_shot_learning", "adaptation"]
        })

        # Process task in background for long-running operations
        if task.priority == "high" or task.complexity == "high":
            background_tasks.add_task(process_task_background, task_dict)
            return {
                "status": "processing",
                "message": "Advanced AI task queued for processing",
                "task_id": f"task_{hash(str(task_dict))}",
                "estimated_completion": "2-5 minutes"
            }
        else:
            # Process immediately for simple tasks
            result = await ai_integration.process_task(task_dict)
            return result

    except Exception as e:
        logger.error(f"Task processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Task processing failed: {str(e)}")

async def process_task_background(task_dict: Dict[str, Any]):
    """Background task processing"""
    try:
        result = await ai_integration.process_task(task_dict)

        # Broadcast result to WebSocket clients
        await broadcast_websocket_message({
            "type": "TASK_COMPLETE",
            "task_id": result.get("task_id"),
            "result": result
        })

    except Exception as e:
        logger.error(f"Background task failed: {e}")
        await broadcast_websocket_message({
            "type": "TASK_ERROR",
            "task_id": task_dict.get("id", "unknown"),
            "error": str(e)
        })

@app.post("/api/v3/advanced-ai/analyze")
async def analyze_document(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Advanced document analysis using AI orchestration"""
    if ai_integration is None:
        raise HTTPException(status_code=503, detail="AI system not available")

    try:
        # Create analysis task
        analysis_task = {
            "type": "legal_analysis",
            "content": request.prompt,
            "priority": "high",
            "domain": "legal",
            "complexity": "high",
            "file_id": request.file_id,
            "user_id": request.user_id,
            "domain_specific": True,
            "quantum_beneficial": True,
            "multi_agent_beneficial": True
        }

        # Start background analysis
        background_tasks.add_task(process_document_analysis, analysis_task)

        return {
            "status": "analyzing",
            "message": "Advanced AI document analysis started",
            "file_id": request.file_id,
            "analysis_type": "advanced_orchestration"
        }

    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

async def process_document_analysis(task_dict: Dict[str, Any]):
    """Background document analysis processing"""
    try:
        # Send initial progress update
        await broadcast_websocket_message({
            "type": "ANALYSIS_START",
            "file_id": task_dict["file_id"],
            "stage": "initializing",
            "progress": 10
        })

        # Process with advanced AI
        result = await ai_integration.process_task(task_dict)

        # Send streaming updates
        await broadcast_websocket_message({
            "type": "ANALYSIS_PROGRESS",
            "file_id": task_dict["file_id"],
            "stage": "processing",
            "progress": 50,
            "message": "Applying multi-agent coordination and domain optimization"
        })

        # Send final result
        await broadcast_websocket_message({
            "type": "ANALYSIS_COMPLETE",
            "file_id": task_dict["file_id"],
            "result": result,
            "progress": 100
        })

    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        await broadcast_websocket_message({
            "type": "ANALYSIS_ERROR",
            "file_id": task_dict.get("file_id", "unknown"),
            "error": str(e)
        })

@app.get("/api/v3/advanced-ai/status")
async def get_ai_status():
    """Get comprehensive AI system status"""
    if ai_integration is None:
        return {"status": "unavailable", "message": "AI system not initialized"}

    try:
        status = await ai_integration.get_system_status()
        return {
            "status": "operational",
            "system_status": status,
            "capabilities": [
                "neural_architecture_search",
                "meta_learning",
                "multi_agent_coordination",
                "federated_learning",
                "quantum_classical_hybrid",
                "domain_optimization"
            ]
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/v3/advanced-ai/optimize")
async def optimize_system():
    """Trigger system performance optimization"""
    if ai_integration is None:
        raise HTTPException(status_code=503, detail="AI system not available")

    try:
        result = await ai_integration.optimize_system_performance()
        return result
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@app.websocket("/ws/advanced-ai")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time AI updates"""
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle client messages (ping, status requests, etc.)
            if message.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})
            elif message.get("type") == "STATUS_REQUEST":
                if ai_integration:
                    status = await ai_integration.get_system_status()
                    await websocket.send_json({
                        "type": "STATUS_RESPONSE",
                        "status": status
                    })

    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

async def broadcast_websocket_message(message: Dict[str, Any]):
    """Broadcast message to all connected WebSocket clients"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception:
            disconnected.append(connection)

    # Clean up disconnected clients
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "advanced_ai_api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )</content>
<parameter name="filePath">c:\Users\james\Videos\deeds-web-app\advanced-ai-api.py
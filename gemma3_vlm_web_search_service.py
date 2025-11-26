#!/usr/bin/env python3
"""
FastAPI service for Gemma 3 VLM Web Search integration
"""

import os
import json
import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

from gemma3_vlm_web_search import Gemma3WebSearch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Gemma 3 VLM Web Search API",
    description="Web search and analysis powered by Gemma 3 Vision-Language Model",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global search service instance
search_service = None

class SearchRequest(BaseModel):
    query: str
    num_results: Optional[int] = 10
    search_engine: Optional[str] = "google"
    include_vlm_analysis: Optional[bool] = True
    include_images: Optional[bool] = False

class SearchResponse(BaseModel):
    query: str
    search_engine: str
    search_results: List[Dict]
    vlm_analysis: Optional[Dict] = None
    image_analysis: Optional[List[Dict]] = None
    timestamp: str
    processing_time: float

class LegalResearchRequest(BaseModel):
    case_topic: str
    jurisdiction: Optional[str] = "general"
    include_case_law: Optional[bool] = True
    include_statutes: Optional[bool] = True
    include_secondary_sources: Optional[bool] = True
    max_results: Optional[int] = 15

class LegalResearchResponse(BaseModel):
    case_topic: str
    jurisdiction: str
    research_summary: Dict
    case_law_results: List[Dict]
    statutory_results: List[Dict]
    secondary_sources: List[Dict]
    vlm_analysis: Dict
    timestamp: str

@app.on_event("startup")
async def startup_event():
    """Initialize the Gemma 3 VLM search service"""
    global search_service
    try:
        search_service = Gemma3WebSearch()
        if os.getenv('GEMMA3_VLM_ANALYSIS_ENABLED', 'true').lower() == 'true':
            await search_service.initialize_model()
        logger.info("Gemma 3 VLM Web Search service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize search service: {e}")
        search_service = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "gemma3-vlm-web-search",
        "timestamp": datetime.now().isoformat(),
        "vlm_loaded": search_service is not None and search_service.model is not None
    }

@app.post("/search", response_model=SearchResponse)
async def web_search(request: SearchRequest):
    """Perform web search with optional VLM analysis"""
    if not search_service:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    start_time = datetime.now()

    try:
        # Perform search and analysis
        result = await search_service.search_and_analyze(
            request.query,
            request.num_results,
            request.search_engine,
            request.include_vlm_analysis
        )

        # Extract and analyze images if requested
        if request.include_images and request.include_vlm_analysis:
            image_results = await search_service.extract_images_from_results(
                result['search_results']
            )
            result['image_analysis'] = image_results

        processing_time = (datetime.now() - start_time).total_seconds()

        return SearchResponse(
            query=result['query'],
            search_engine=result['search_engine'],
            search_results=result['search_results'],
            vlm_analysis=result.get('vlm_analysis'),
            image_analysis=result.get('image_analysis'),
            timestamp=result['timestamp'],
            processing_time=processing_time
        )

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/legal-research", response_model=LegalResearchResponse)
async def legal_research(request: LegalResearchRequest):
    """Perform comprehensive legal research using web search and VLM analysis"""
    if not search_service:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        research_results = {
            'case_topic': request.case_topic,
            'jurisdiction': request.jurisdiction,
            'case_law_results': [],
            'statutory_results': [],
            'secondary_sources': [],
            'research_summary': {},
            'vlm_analysis': {},
            'timestamp': datetime.now().isoformat()
        }

        # Construct targeted search queries
        search_queries = []

        if request.include_case_law:
            search_queries.append(f'"{request.case_topic}" case law {request.jurisdiction}')

        if request.include_statutes:
            search_queries.append(f'"{request.case_topic}" statute {request.jurisdiction}')

        if request.include_secondary_sources:
            search_queries.append(f'"{request.case_topic}" legal analysis {request.jurisdiction}')

        # Perform searches
        all_results = []
        for query in search_queries:
            results = await search_service.web_search(query, request.max_results // len(search_queries))
            all_results.extend(results)

        # Categorize results
        for result in all_results:
            title_lower = result['title'].lower()
            snippet_lower = result['snippet'].lower()

            if 'case' in title_lower or 'v.' in title_lower or 'court' in title_lower:
                research_results['case_law_results'].append(result)
            elif 'statute' in title_lower or 'code' in title_lower or 'section' in title_lower:
                research_results['statutory_results'].append(result)
            else:
                research_results['secondary_sources'].append(result)

        # Generate comprehensive VLM analysis
        analysis_prompt = f"""
        Analyze this legal research on: {request.case_topic}

        Case Law ({len(research_results['case_law_results'])} results):
        {json.dumps([r['title'] + ': ' + r['snippet'][:200] for r in research_results['case_law_results'][:3]], indent=2)}

        Statutes ({len(research_results['statutory_results'])} results):
        {json.dumps([r['title'] + ': ' + r['snippet'][:200] for r in research_results['statutory_results'][:3]], indent=2)}

        Secondary Sources ({len(research_results['secondary_sources'])} results):
        {json.dumps([r['title'] + ': ' + r['snippet'][:200] for r in research_results['secondary_sources'][:3]], indent=2)}

        Provide:
        1. Key legal principles and holdings
        2. Relevant statutory framework
        3. Areas of consensus and disagreement
        4. Research gaps or unanswered questions
        5. Practical implications for similar cases
        """

        # Use VLM to analyze all results together
        research_results['vlm_analysis'] = await search_service.analyze_search_results_with_vlm(
            request.case_topic, all_results
        )

        # Generate summary
        research_results['research_summary'] = {
            'total_results': len(all_results),
            'case_law_count': len(research_results['case_law_results']),
            'statutory_count': len(research_results['statutory_results']),
            'secondary_count': len(research_results['secondary_sources']),
            'jurisdiction': request.jurisdiction,
            'search_queries_used': search_queries
        }

        return LegalResearchResponse(**research_results)

    except Exception as e:
        logger.error(f"Legal research failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search-engines")
async def list_search_engines():
    """List available search engines and their status"""
    if not search_service:
        return {"error": "Search service not initialized"}

    engines_status = {}
    for engine, config in search_service.search_apis.items():
        engines_status[engine] = {
            'available': bool(config.get('api_key')),
            'configured': bool(config.get('api_key'))
        }

    return {
        'search_engines': engines_status,
        'vlm_available': search_service.model is not None
    }

@app.post("/cache/clear")
async def clear_cache():
    """Clear the web search cache"""
    if not search_service:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    try:
        import shutil
        if os.path.exists(search_service.cache_dir):
            shutil.rmtree(search_service.cache_dir)
            os.makedirs(search_service.cache_dir, exist_ok=True)

        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv('GEMMA3_WEB_SEARCH_PORT', '8090'))
    uvicorn.run(
        "gemma3_vlm_web_search_service:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
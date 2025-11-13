#!/usr/bin/env python3
"""
Phase 70: Web Crawl Service
Crawls legal websites and extracts structured data
"""

import os
import sys
import asyncio
import logging
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse, urljoin
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import aiohttp
import re
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Phase 70 Web Crawl Service", version="1.0.0")

class CrawlRequest(BaseModel):
    url: str
    max_depth: int = 2
    max_pages: int = 10
    include_patterns: List[str] = []
    exclude_patterns: List[str] = []
    delay_seconds: float = 1.0
    timeout_seconds: int = 30

class CrawlResponse(BaseModel):
    pages_crawled: int
    total_size: int
    duration: float
    pages: List[Dict[str, Any]]
    errors: List[str]

class PageData(BaseModel):
    url: str
    title: str
    content: str
    links: List[str]
    metadata: Dict[str, Any]
    crawled_at: str
    content_hash: str

# Global HTTP session
session = None

async def init_session():
    """Initialize aiohttp session"""
    global session
    if session is None:
        timeout = aiohttp.ClientTimeout(total=30)
        session = aiohttp.ClientSession(timeout=timeout)

async def close_session():
    """Close aiohttp session"""
    global session
    if session:
        await session.close()
        session = None

def is_valid_url(url: str) -> bool:
    """Check if URL is valid"""
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme and parsed.netloc)
    except:
        return False

def matches_pattern(url: str, patterns: List[str]) -> bool:
    """Check if URL matches any pattern"""
    if not patterns:
        return True

    for pattern in patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False

def extract_links(html: str, base_url: str) -> List[str]:
    """Extract links from HTML content"""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        links = []

        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            absolute_url = urljoin(base_url, href)

            if is_valid_url(absolute_url):
                links.append(absolute_url)

        return list(set(links))  # Remove duplicates
    except Exception as e:
        logger.error(f"Link extraction failed: {e}")
        return []

def extract_metadata(html: str) -> Dict[str, Any]:
    """Extract metadata from HTML"""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        metadata = {}

        # Title
        title_tag = soup.find('title')
        metadata['title'] = title_tag.text.strip() if title_tag else ""

        # Meta description
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        metadata['description'] = desc_tag.get('content', '') if desc_tag else ""

        # Meta keywords
        keywords_tag = soup.find('meta', attrs={'name': 'keywords'})
        metadata['keywords'] = keywords_tag.get('content', '') if keywords_tag else ""

        # Open Graph tags
        og_tags = soup.find_all('meta', attrs={'property': re.compile(r'^og:')})
        metadata['open_graph'] = {tag.get('property', ''): tag.get('content', '') for tag in og_tags}

        # Headings
        headings = {}
        for i in range(1, 7):
            h_tags = soup.find_all(f'h{i}')
            headings[f'h{i}'] = [h.text.strip() for h in h_tags]
        metadata['headings'] = headings

        return metadata
    except Exception as e:
        logger.error(f"Metadata extraction failed: {e}")
        return {}

def calculate_content_hash(content: str) -> str:
    """Calculate SHA256 hash of content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

async def crawl_page(url: str, depth: int = 0) -> Optional[PageData]:
    """Crawl a single page"""
    try:
        async with session.get(url) as response:
            if response.status != 200:
                logger.warning(f"HTTP {response.status} for {url}")
                return None

            html = await response.text()
            content_type = response.headers.get('content-type', '')

            # Check if it's HTML
            if 'text/html' not in content_type.lower():
                logger.info(f"Skipping non-HTML content: {url}")
                return None

            # Extract data
            title = extract_metadata(html).get('title', '')
            links = extract_links(html, url)
            metadata = extract_metadata(html)
            content_hash = calculate_content_hash(html)

            return PageData(
                url=url,
                title=title,
                content=html,
                links=links,
                metadata=metadata,
                crawled_at=datetime.now().isoformat(),
                content_hash=content_hash
            )

    except Exception as e:
        logger.error(f"Failed to crawl {url}: {e}")
        return None

async def crawl_website(request: CrawlRequest) -> CrawlResponse:
    """Crawl website with breadth-first search"""
    start_time = datetime.now()
    crawled_urls = set()
    to_crawl = [(request.url, 0)]  # (url, depth)
    pages = []
    errors = []
    total_size = 0

    while to_crawl and len(pages) < request.max_pages:
        current_url, depth = to_crawl.pop(0)

        if current_url in crawled_urls or depth > request.max_depth:
            continue

        crawled_urls.add(current_url)

        # Check include/exclude patterns
        if not matches_pattern(current_url, request.include_patterns):
            continue
        if matches_pattern(current_url, request.exclude_patterns):
            continue

        logger.info(f"Crawling: {current_url} (depth: {depth})")

        # Crawl page
        page_data = await crawl_page(current_url, depth)
        if page_data:
            pages.append(page_data.dict())
            total_size += len(page_data.content)

            # Add new links to crawl queue
            if depth < request.max_depth:
                for link in page_data.links:
                    if link not in crawled_urls:
                        to_crawl.append((link, depth + 1))
        else:
            errors.append(f"Failed to crawl: {current_url}")

        # Rate limiting
        if request.delay_seconds > 0:
            await asyncio.sleep(request.delay_seconds)

    duration = (datetime.now() - start_time).total_seconds()

    return CrawlResponse(
        pages_crawled=len(pages),
        total_size=total_size,
        duration=round(duration, 2),
        pages=pages,
        errors=errors
    )

@app.on_event("startup")
async def startup_event():
    """Initialize HTTP session"""
    await init_session()
    logger.info("✅ Web crawl service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Close HTTP session"""
    await close_session()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Phase 70 Web Crawl Service",
        "session_active": session is not None
    }

@app.post("/crawl", response_model=CrawlResponse)
async def crawl_endpoint(request: CrawlRequest):
    """Crawl website endpoint"""
    if not is_valid_url(request.url):
        raise HTTPException(status_code=400, detail="Invalid URL provided")

    try:
        result = await crawl_website(request)
        return result
    except Exception as e:
        logger.error(f"Crawl failed: {e}")
        raise HTTPException(status_code=500, detail=f"Crawl failed: {e}")

@app.get("/crawl/status")
async def crawl_status():
    """Get crawl service status"""
    return {
        "service": "Phase 70 Web Crawl Service",
        "active_crawls": 0,  # Would track active crawls in production
        "queue_size": 0,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("WEB_CRAWL_PORT", "8103"))
    host = os.getenv("WEB_CRAWL_HOST", "0.0.0.0")

    logger.info(f"🚀 Starting web crawl service on {host}:{port}")
    uvicorn.run(
        "web_crawl_service:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
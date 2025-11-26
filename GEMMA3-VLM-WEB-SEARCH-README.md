# Gemma 3 VLM Web Search Integration

This module provides web search capabilities powered by Google's Gemma 3 Vision-Language Model (VLM) for the Legal AI Platform.

## Features

- **Multi-Engine Search**: Support for Google, Bing, and SerpApi
- **VLM Analysis**: Gemma 3-powered analysis of search results
- **Legal Research**: Specialized endpoints for legal research queries
- **Image Analysis**: Vision capabilities for analyzing images from search results
- **Caching**: Intelligent caching to reduce API costs and improve performance
- **REST API**: FastAPI-based service with comprehensive endpoints

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Web Search API Keys
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_CX=your-custom-search-engine-id
BING_SEARCH_API_KEY=your-bing-search-api-key
SERPAPI_KEY=your-serpapi-key

# Gemma 3 Configuration
GEMMA3_VLM_MODEL=google/gemma-3-4b-it
GEMMA3_WEB_SEARCH_CACHE_DIR=./cache/web_search
GEMMA3_MAX_SEARCH_RESULTS=20
GEMMA3_VLM_ANALYSIS_ENABLED=true
GEMMA3_IMAGE_ANALYSIS_ENABLED=true
GEMMA3_WEB_SEARCH_PORT=8090
GEMMA3_WEB_SEARCH_URL=http://localhost:8090
```

### 2. API Key Sources

- **Google Custom Search**: https://developers.google.com/custom-search/v1/introduction
- **Bing Web Search**: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
- **SerpApi**: https://serpapi.com/

### 3. Start the Service

```bash
# Using VS Code Task
# Run "🧠 Gemma 3 VLM Web Search Service" from Command Palette

# Or manually
python gemma3_vlm_web_search_service.py
```

## API Endpoints

### Health Check
```http
GET /health
```

### List Search Engines
```http
GET /search-engines
```

### Web Search
```http
POST /search
Content-Type: application/json

{
  "query": "legal implications of AI in healthcare",
  "num_results": 10,
  "search_engine": "google",
  "include_vlm_analysis": true,
  "include_images": false
}
```

### Legal Research
```http
POST /legal-research
Content-Type: application/json

{
  "case_topic": "breach of contract",
  "jurisdiction": "general",
  "include_case_law": true,
  "include_statutes": true,
  "include_secondary_sources": true,
  "max_results": 15
}
```

### Clear Cache
```http
POST /cache/clear
```

## CLI Usage

### Direct Search
```bash
python gemma3_vlm_web_search.py "your search query" --engine google --num-results 10
```

### Test Service
```bash
python test_gemma3_web_search.py
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web APIs      │    │  Gemma3WebSearch │    │   FastAPI       │
│                 │    │                  │    │   Service       │
│ • Google Search │◄──►│ • Search APIs    │◄──►│ • REST Endpoints│
│ • Bing Search   │    │ • VLM Analysis   │    │ • Health Checks │
│ • SerpApi       │    │ • Image Analysis │    │ • Caching       │
└─────────────────┘    │ • Result Caching │    └─────────────────┘
                       └──────────────────┘
```

## VLM Analysis Features

- **Result Summarization**: Concise summaries of search results
- **Credibility Assessment**: Analysis of source reliability
- **Conflict Detection**: Identification of conflicting information
- **Research Gaps**: Suggestions for further investigation
- **Image Understanding**: Vision analysis of images from results

## Legal Research Mode

The `/legal-research` endpoint provides specialized analysis for legal queries:

- **Case Law Extraction**: Identifies relevant court cases
- **Statutory References**: Finds applicable statutes and codes
- **Secondary Sources**: Academic articles, legal commentary
- **Jurisdictional Focus**: Filters by legal jurisdiction
- **Comprehensive Analysis**: VLM-powered synthesis of all sources

## Performance Optimization

- **Result Caching**: 1-hour cache for search results
- **Batch Processing**: Efficient handling of multiple queries
- **GPU Acceleration**: CUDA support for VLM inference
- **Async Operations**: Non-blocking API calls

## Integration with Legal AI Platform

This service integrates with the broader legal AI platform:

- **Evidence Processing**: Web search results as evidence sources
- **Document Analysis**: VLM analysis of legal documents
- **Research Automation**: Automated legal research workflows
- **Citation Validation**: Verification of legal citations

## Monitoring and Logging

- Comprehensive logging of all operations
- Performance metrics collection
- Error tracking and recovery
- API usage monitoring

## Security Considerations

- API key encryption in environment variables
- Rate limiting to prevent abuse
- Input validation and sanitization
- Secure communication with search APIs

## Future Enhancements

- **Multi-modal Search**: Support for video and audio content
- **Advanced Filtering**: Legal-specific result filtering
- **Citation Extraction**: Automated legal citation parsing
- **Case Prediction**: ML-based case outcome prediction
- **International Law**: Multi-jurisdictional legal research
#!/usr/bin/env python3
"""
Test script for Gemma 3 VLM Web Search integration
"""

import os
import asyncio
import json
import aiohttp
from datetime import datetime

async def test_web_search_api():
    """Test the web search API endpoints"""

    base_url = os.getenv('GEMMA3_WEB_SEARCH_URL', 'http://localhost:8090')

    async with aiohttp.ClientSession() as session:
        print("🧪 Testing Gemma 3 VLM Web Search API")
        print("=" * 50)

        # Test health check
        print("\n1. Health Check:")
        try:
            async with session.get(f"{base_url}/health") as response:
                if response.status == 200:
                    health = await response.json()
                    print("✅ Health check passed")
                    print(f"   VLM Loaded: {health.get('vlm_loaded', False)}")
                else:
                    print(f"❌ Health check failed: {response.status}")
        except Exception as e:
            print(f"❌ Health check error: {e}")

        # Test search engines
        print("\n2. Available Search Engines:")
        try:
            async with session.get(f"{base_url}/search-engines") as response:
                if response.status == 200:
                    engines = await response.json()
                    print("✅ Search engines retrieved")
                    for engine, status in engines.get('search_engines', {}).items():
                        configured = "✅" if status.get('configured') else "❌"
                        print(f"   {engine}: {configured}")
                    print(f"   VLM Available: {'✅' if engines.get('vlm_available') else '❌'}")
                else:
                    print(f"❌ Search engines check failed: {response.status}")
        except Exception as e:
            print(f"❌ Search engines error: {e}")

        # Test basic web search (without VLM if not configured)
        print("\n3. Basic Web Search Test:")
        search_payload = {
            "query": "legal implications of AI in healthcare",
            "num_results": 5,
            "search_engine": "google",
            "include_vlm_analysis": False  # Skip VLM for basic test
        }

        try:
            async with session.post(f"{base_url}/search", json=search_payload) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Basic search successful")
                    print(f"   Query: {result.get('query')}")
                    print(f"   Results: {len(result.get('search_results', []))}")
                    print(f"   Processing time: {result.get('processing_time', 0):.2f}s")
                else:
                    error = await response.text()
                    print(f"❌ Basic search failed: {response.status} - {error}")
        except Exception as e:
            print(f"❌ Basic search error: {e}")

        # Test legal research endpoint
        print("\n4. Legal Research Test:")
        legal_payload = {
            "case_topic": "breach of contract",
            "jurisdiction": "general",
            "include_case_law": True,
            "include_statutes": True,
            "include_secondary_sources": False,
            "max_results": 8
        }

        try:
            async with session.post(f"{base_url}/legal-research", json=legal_payload) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Legal research successful")
                    print(f"   Topic: {result.get('case_topic')}")
                    print(f"   Case law results: {len(result.get('case_law_results', []))}")
                    print(f"   Statutory results: {len(result.get('statutory_results', []))}")
                    print(f"   VLM analysis: {'✅' if result.get('vlm_analysis') else '❌'}")
                else:
                    error = await response.text()
                    print(f"❌ Legal research failed: {response.status} - {error}")
        except Exception as e:
            print(f"❌ Legal research error: {e}")

        print("\n" + "=" * 50)
        print("🎯 Test completed!")

        # Instructions for API key setup
        print("\n📋 To enable full functionality, set these environment variables:")
        print("   GOOGLE_SEARCH_API_KEY=your-google-api-key")
        print("   GOOGLE_SEARCH_CX=your-custom-search-engine-id")
        print("   BING_SEARCH_API_KEY=your-bing-api-key")
        print("   SERPAPI_KEY=your-serpapi-key")
        print("\n💡 Get API keys from:")
        print("   Google: https://developers.google.com/custom-search/v1/introduction")
        print("   Bing: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api")
        print("   SerpApi: https://serpapi.com/")

if __name__ == '__main__':
    asyncio.run(test_web_search_api())
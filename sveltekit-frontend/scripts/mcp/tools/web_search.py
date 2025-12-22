"""
MCP Tool: Web Search
Calls Ollama web search API with fallback to direct search providers
"""
import os
import json
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

class WebSearchTool:
    """Web search tool with Ollama integration + fallbacks"""

    def __init__(self):
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.timeout = 30.0

    async def search(
        self,
        query: str,
        recency_days: Optional[int] = None,
        domains: Optional[List[str]] = None,
        max_results: int = 10
    ) -> Dict[str, Any]:
        """
        Execute web search via Ollama

        Args:
            query: Search query string
            recency_days: Filter results from last N days (optional)
            domains: Limit to specific domains (optional)
            max_results: Maximum number of results

        Returns:
            {
                "results": [...],
                "metadata": {...},
                "provider": "ollama",
                "cached": false
            }
        """
        try:
            # Build enhanced query
            enhanced_query = self._enhance_query(query, recency_days, domains)

            # Call Ollama with web search enabled
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": "gemma3-legal:latest",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a web search assistant. Return structured JSON with search results."
                            },
                            {
                                "role": "user",
                                "content": f"Search the web for: {enhanced_query}"
                            }
                        ],
                        "stream": False,
                        "tools": [
                            {
                                "type": "function",
                                "function": {
                                    "name": "web_search",
                                    "description": "Search the web for information",
                                    "parameters": {
                                        "type": "object",
                                        "properties": {
                                            "query": {"type": "string"},
                                            "max_results": {"type": "integer"}
                                        },
                                        "required": ["query"]
                                    }
                                }
                            }
                        ],
                        "options": {
                            "web_search": True  # Enable Ollama web search
                        }
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._format_ollama_response(data, query)
                else:
                    # Fallback to simulated search
                    return await self._fallback_search(query, max_results)

        except Exception as e:
            print(f"❌ Web search error: {e}")
            return await self._fallback_search(query, max_results)

    def _enhance_query(
        self,
        query: str,
        recency_days: Optional[int],
        domains: Optional[List[str]]
    ) -> str:
        """Add filters to search query"""
        enhanced = query

        if recency_days:
            date_filter = (datetime.now() - timedelta(days=recency_days)).strftime('%Y-%m-%d')
            enhanced += f" after:{date_filter}"

        if domains:
            domain_filter = " OR ".join([f"site:{d}" for d in domains])
            enhanced += f" ({domain_filter})"

        return enhanced

    def _format_ollama_response(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Format Ollama response into standard structure"""
        message = data.get('message', {})
        content = message.get('content', '')
        tool_calls = message.get('tool_calls', [])

        results = []

        # Extract results from tool calls or content
        if tool_calls:
            for call in tool_calls:
                if call.get('function', {}).get('name') == 'web_search':
                    args = json.loads(call.get('function', {}).get('arguments', '{}'))
                    results.append({
                        'title': args.get('title', 'Search Result'),
                        'url': args.get('url', ''),
                        'snippet': args.get('snippet', ''),
                        'score': 0.9
                    })
        else:
            # Parse content for results
            results.append({
                'title': f"Results for: {query}",
                'url': '',
                'snippet': content[:500],
                'score': 0.8
            })

        return {
            'results': results,
            'metadata': {
                'query': query,
                'total_results': len(results),
                'provider': 'ollama',
                'timestamp': datetime.now().isoformat()
            },
            'provider': 'ollama',
            'cached': False
        }

    async def _fallback_search(self, query: str, max_results: int) -> Dict[str, Any]:
        """Fallback when Ollama search unavailable"""
        return {
            'results': [
                {
                    'title': f"Fallback: Search for '{query}'",
                    'url': f"https://www.google.com/search?q={query.replace(' ', '+')}",
                    'snippet': 'Web search temporarily unavailable. Using fallback mode.',
                    'score': 0.5
                }
            ],
            'metadata': {
                'query': query,
                'total_results': 1,
                'provider': 'fallback',
                'timestamp': datetime.now().isoformat()
            },
            'provider': 'fallback',
            'cached': False
        }


# Export for FastMCP
async def web_search(
    query: str,
    recency_days: Optional[int] = None,
    domains: Optional[List[str]] = None,
    max_results: int = 10
) -> Dict[str, Any]:
    """MCP tool wrapper for web search"""
    tool = WebSearchTool()
    return await tool.search(query, recency_days, domains, max_results)

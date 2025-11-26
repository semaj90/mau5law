#!/usr/bin/env python3
"""
Gemma 3 VLM Web Search Integration
Provides web search capabilities with vision-language model analysis
"""

import os
import json
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib
from urllib.parse import urlparse, urljoin
import torch
from transformers import AutoTokenizer, AutoModel, AutoProcessor
from PIL import Image
import io
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Gemma3WebSearch:
    """Gemma 3 VLM-powered web search and analysis"""

    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_name = "google/gemma-3-4b-it"  # Vision-capable Gemma 3
        self.model = None
        self.tokenizer = None
        self.processor = None

        # Web search configuration
        self.search_apis = {
            'google': {
                'api_key': os.getenv('GOOGLE_SEARCH_API_KEY'),
                'cx': os.getenv('GOOGLE_SEARCH_CX'),
                'url': 'https://www.googleapis.com/customsearch/v1'
            },
            'bing': {
                'api_key': os.getenv('BING_SEARCH_API_KEY'),
                'url': 'https://api.bing.microsoft.com/v7.0/search'
            },
            'serpapi': {
                'api_key': os.getenv('SERPAPI_KEY'),
                'url': 'https://serpapi.com/search'
            }
        }

        # Search result caching
        self.cache_dir = './cache/web_search'
        os.makedirs(self.cache_dir, exist_ok=True)

    async def initialize_model(self):
        """Initialize Gemma 3 VLM model"""
        try:
            logger.info(f"Loading Gemma 3 VLM: {self.model_name}")

            # Load tokenizer and processor
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.processor = AutoProcessor.from_pretrained(self.model_name)

            # Load model with vision capabilities
            self.model = AutoModel.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32,
                trust_remote_code=True
            ).to(self.device)

            self.model.eval()
            logger.info("Gemma 3 VLM loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load Gemma 3 VLM: {e}")
            raise

    async def web_search(self, query: str, num_results: int = 10,
                        search_engine: str = 'google') -> List[Dict]:
        """Perform web search using configured APIs"""
        cache_key = hashlib.md5(f"{query}_{search_engine}_{num_results}".encode()).hexdigest()
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        # Check cache first
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                cached_results = json.load(f)
                if (datetime.now() - datetime.fromisoformat(cached_results['timestamp'])).seconds < 3600:  # 1 hour cache
                    return cached_results['results']

        # Perform fresh search
        if search_engine not in self.search_apis:
            raise ValueError(f"Unsupported search engine: {search_engine}")

        api_config = self.search_apis[search_engine]
        if not api_config['api_key']:
            raise ValueError(f"API key not configured for {search_engine}")

        results = await self._perform_search(query, num_results, api_config, search_engine)

        # Cache results
        cache_data = {
            'timestamp': datetime.now().isoformat(),
            'query': query,
            'results': results
        }
        with open(cache_file, 'w') as f:
            json.dump(cache_data, f, indent=2)

        return results

    async def _perform_search(self, query: str, num_results: int,
                            api_config: Dict, engine: str) -> List[Dict]:
        """Execute search against specific API"""
        async with aiohttp.ClientSession() as session:
            if engine == 'google':
                return await self._google_search(session, query, num_results, api_config)
            elif engine == 'bing':
                return await self._bing_search(session, query, num_results, api_config)
            elif engine == 'serpapi':
                return await self._serpapi_search(session, query, num_results, api_config)
            else:
                raise ValueError(f"Unsupported search engine: {engine}")

    async def _google_search(self, session: aiohttp.ClientSession, query: str,
                           num_results: int, api_config: Dict) -> List[Dict]:
        """Google Custom Search API"""
        params = {
            'key': api_config['api_key'],
            'cx': api_config['cx'],
            'q': query,
            'num': min(num_results, 10)  # Google limits to 10 per request
        }

        async with session.get(api_config['url'], params=params) as response:
            if response.status != 200:
                raise Exception(f"Google search failed: {response.status}")

            data = await response.json()
            results = []

            for item in data.get('items', []):
                results.append({
                    'title': item.get('title', ''),
                    'url': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'display_url': item.get('displayLink', ''),
                    'search_engine': 'google'
                })

            return results

    async def _bing_search(self, session: aiohttp.ClientSession, query: str,
                         num_results: int, api_config: Dict) -> List[Dict]:
        """Bing Web Search API"""
        headers = {'Ocp-Apim-Subscription-Key': api_config['api_key']}
        params = {
            'q': query,
            'count': num_results,
            'responseFilter': 'Webpages'
        }

        async with session.get(api_config['url'], headers=headers, params=params) as response:
            if response.status != 200:
                raise Exception(f"Bing search failed: {response.status}")

            data = await response.json()
            results = []

            for item in data.get('webPages', {}).get('value', []):
                results.append({
                    'title': item.get('name', ''),
                    'url': item.get('url', ''),
                    'snippet': item.get('snippet', ''),
                    'display_url': item.get('displayUrl', ''),
                    'search_engine': 'bing'
                })

            return results

    async def _serpapi_search(self, session: aiohttp.ClientSession, query: str,
                            num_results: int, api_config: Dict) -> List[Dict]:
        """SerpApi (supports multiple engines)"""
        params = {
            'api_key': api_config['api_key'],
            'q': query,
            'num': num_results,
            'engine': 'google'
        }

        async with session.get(api_config['url'], params=params) as response:
            if response.status != 200:
                raise Exception(f"SerpApi search failed: {response.status}")

            data = await response.json()
            results = []

            for item in data.get('organic_results', []):
                results.append({
                    'title': item.get('title', ''),
                    'url': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'display_url': item.get('displayed_url', ''),
                    'search_engine': 'serpapi'
                })

            return results

    async def analyze_search_results_with_vlm(self, query: str,
                                            search_results: List[Dict],
                                            include_images: bool = False) -> Dict:
        """Use Gemma 3 VLM to analyze search results"""
        if not self.model or not self.tokenizer or not self.processor:
            raise RuntimeError("Gemma 3 VLM not initialized")

        # Prepare context for VLM analysis
        context = f"Query: {query}\n\nSearch Results:\n"
        for i, result in enumerate(search_results[:5]):  # Limit to top 5 for analysis
            context += f"{i+1}. {result['title']}\n   {result['snippet']}\n   URL: {result['url']}\n\n"

        # VLM analysis prompt
        analysis_prompt = f"""
Analyze these web search results for the query: "{query}"

{context}

Please provide:
1. Summary of the most relevant information
2. Key insights or findings
3. Credibility assessment of sources
4. Any conflicting information
5. Recommendations for further research

Be concise but comprehensive in your analysis.
"""

        try:
            # Tokenize input
            inputs = self.tokenizer(
                analysis_prompt,
                return_tensors='pt',
                truncation=True,
                max_length=2048
            ).to(self.device)

            # Generate analysis
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=1024,
                    temperature=0.3,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )

            # Decode response
            analysis = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            analysis = analysis.replace(analysis_prompt, '').strip()

            return {
                'query': query,
                'search_results_count': len(search_results),
                'vlm_analysis': analysis,
                'analyzed_at': datetime.now().isoformat(),
                'model_used': self.model_name
            }

        except Exception as e:
            logger.error(f"VLM analysis failed: {e}")
            return {
                'query': query,
                'error': str(e),
                'search_results_count': len(search_results)
            }

    async def search_and_analyze(self, query: str, num_results: int = 10,
                               search_engine: str = 'google',
                               include_vlm_analysis: bool = True) -> Dict:
        """Complete web search and VLM analysis pipeline"""
        logger.info(f"Performing web search for: {query}")

        # Perform web search
        search_results = await self.web_search(query, num_results, search_engine)

        result = {
            'query': query,
            'search_engine': search_engine,
            'search_results': search_results,
            'timestamp': datetime.now().isoformat()
        }

        # Add VLM analysis if requested
        if include_vlm_analysis:
            logger.info("Analyzing results with Gemma 3 VLM")
            vlm_analysis = await self.analyze_search_results_with_vlm(query, search_results)
            result['vlm_analysis'] = vlm_analysis

        return result

    async def extract_images_from_results(self, search_results: List[Dict]) -> List[Dict]:
        """Extract and analyze images from search results using VLM vision capabilities"""
        image_results = []

        async with aiohttp.ClientSession() as session:
            for result in search_results[:3]:  # Limit to top 3 results for image extraction
                try:
                    # Try to find images on the page
                    async with session.get(result['url'], timeout=10) as response:
                        if response.status == 200:
                            html = await response.text()
                            # Simple image extraction (could be enhanced)
                            image_urls = self._extract_image_urls(html, result['url'])

                            for img_url in image_urls[:2]:  # Limit images per page
                                try:
                                    # Download and analyze image
                                    async with session.get(img_url, timeout=10) as img_response:
                                        if img_response.status == 200:
                                            img_data = await img_response.read()
                                            image = Image.open(io.BytesIO(img_data))

                                            # Use VLM to analyze image
                                            analysis = await self.analyze_image_with_vlm(image, result)

                                            image_results.append({
                                                'url': img_url,
                                                'source_url': result['url'],
                                                'title': result['title'],
                                                'vlm_analysis': analysis
                                            })

                                except Exception as e:
                                    logger.warning(f"Failed to process image {img_url}: {e}")

                except Exception as e:
                    logger.warning(f"Failed to extract images from {result['url']}: {e}")

        return image_results

    def _extract_image_urls(self, html: str, base_url: str) -> List[str]:
        """Extract image URLs from HTML content"""
        import re
        img_urls = []

        # Find img tags
        img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
        matches = re.findall(img_pattern, html, re.IGNORECASE)

        for match in matches:
            if match.startswith('http'):
                img_urls.append(match)
            elif match.startswith('//'):
                img_urls.append('https:' + match)
            elif match.startswith('/'):
                img_urls.append(urljoin(base_url, match))

        return img_urls[:5]  # Limit to 5 images per page

    async def analyze_image_with_vlm(self, image: Image.Image, context: Dict) -> str:
        """Use Gemma 3 VLM to analyze an image"""
        if not self.model or not self.processor:
            return "VLM not initialized"

        try:
            # Prepare image for VLM
            inputs = self.processor(images=image, return_tensors="pt").to(self.device)

            # Analysis prompt
            prompt = f"Analyze this image in the context of: {context.get('title', '')}. Describe what you see and its relevance."

            text_inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)

            # Combine text and image inputs
            inputs.update(text_inputs)

            # Generate analysis
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=256,
                    temperature=0.3,
                    do_sample=True
                )

            analysis = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return analysis.replace(prompt, '').strip()

        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return f"Analysis failed: {str(e)}"

async def main():
    """CLI interface for Gemma 3 VLM Web Search"""
    import argparse

    parser = argparse.ArgumentParser(description='Gemma 3 VLM Web Search')
    parser.add_argument('query', help='Search query')
    parser.add_argument('--engine', choices=['google', 'bing', 'serpapi'],
                       default='google', help='Search engine to use')
    parser.add_argument('--num-results', type=int, default=10,
                       help='Number of search results')
    parser.add_argument('--no-vlm', action='store_true',
                       help='Skip VLM analysis')
    parser.add_argument('--images', action='store_true',
                       help='Extract and analyze images')

    args = parser.parse_args()

    # Initialize search service
    search_service = Gemma3WebSearch()

    try:
        # Initialize VLM if needed
        if not args.no_vlm:
            await search_service.initialize_model()

        # Perform search and analysis
        result = await search_service.search_and_analyze(
            args.query,
            args.num_results,
            args.engine,
            not args.no_vlm
        )

        # Extract images if requested
        if args.images and not args.no_vlm:
            image_results = await search_service.extract_images_from_results(
                result['search_results']
            )
            result['image_analysis'] = image_results

        # Output results
        print(json.dumps(result, indent=2))

    except Exception as e:
        logger.error(f"Search failed: {e}")
        print(json.dumps({'error': str(e)}, indent=2))

if __name__ == '__main__':
    asyncio.run(main())
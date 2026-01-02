#!/usr/bin/env python3
"""
FastMCP Enhanced Codebase Indexer with Comment Extraction
Uses ripgrep + LLM summaries + embeddinggemma + Qdrant auto-tagging + Redis caching

Architecture:
1. ripgrep extracts comments from codebase
2. gemma3:270m generates short summaries
3. LangExtract validates schema
4. embeddinggemma creates vectors
5. Qdrant stores with auto-tags
6. Redis caches for quick ACE lookups
"""

import os
import sys
import asyncio
import json
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import aiohttp
import asyncpg
from datetime import datetime

# Add to path
sys.path.insert(0, str(Path(__file__).parent.parent))

@dataclass
class FileProfile:
    """Character profile for indexed file"""
    file_path: str
    role: str  # component|api_route|service|schema|worker|adapter
    surface: List[str]  # ui, api, rag, kag, ace
    dependencies: List[str]
    exports: List[str]
    imports: List[str]
    comments: List[str]  # Extracted comments
    risk: str  # low|med|high
    change_frequency: str  # hot|warm|cold
    related_routes: List[str]
    tags: List[str]
    summary: str  # LLM-generated 1-3 sentences
    llm_output: str  # comments + LLM summary combined
    generated_at: str

class RipgrepCommentExtractor:
    """Extract comments using ripgrep (fast C++ grep)"""

    def __init__(self):
        self.rg_path = "rg"  # ripgrep binary

    async def extract_comments(self, file_path: str) -> List[str]:
        """Extract all comments from a file using ripgrep"""
        try:
            # TypeScript/JavaScript/Svelte comment patterns
            patterns = [
                r"//.*$",  # Single-line comments
                r"/\*[\s\S]*?\*/",  # Multi-line comments
                r"<!--[\s\S]*?-->",  # HTML comments (Svelte)
            ]

            comments = []
            for pattern in patterns:
                result = subprocess.run(
                    [self.rg_path, "-N", "-o", pattern, file_path],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="ignore"
                )

                if result.returncode == 0:
                    lines = result.stdout.strip().split("\n")
                    # Clean up comments
                    for line in lines:
                        clean = line.strip()
                        # Remove comment markers
                        clean = clean.replace("//", "").replace("/*", "").replace("*/", "")
                        clean = clean.replace("<!--", "").replace("-->", "")
                        clean = clean.strip()
                        if clean and len(clean) > 3:  # Skip trivial comments
                            comments.append(clean)

            return comments
        except Exception as e:
            print(f"⚠️  Comment extraction failed for {file_path}: {e}")
            return []

    async def extract_imports_exports(self, file_path: str) -> Dict[str, List[str]]:
        """Extract imports and exports using ripgrep"""
        try:
            # Import pattern
            import_result = subprocess.run(
                [self.rg_path, "-N", "-o", r"import\s+.*?from\s+['\"](.+?)['\"]", file_path],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            imports = []
            if import_result.returncode == 0:
                for line in import_result.stdout.strip().split("\n"):
                    if "from" in line:
                        # Extract module name
                        parts = line.split("from")
                        if len(parts) > 1:
                            module = parts[1].strip().strip("'\"")
                            imports.append(module)

            # Export pattern
            export_result = subprocess.run(
                [self.rg_path, "-N", "-o", r"export\s+(const|function|class|type|interface)\s+(\w+)", file_path],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            exports = []
            if export_result.returncode == 0:
                for line in export_result.stdout.strip().split("\n"):
                    # Extract export name
                    parts = line.split()
                    if len(parts) >= 3:
                        exports.append(parts[2])

            return {"imports": imports, "exports": exports}
        except Exception as e:
            return {"imports": [], "exports": []}

class OllamaClient:
    """Ollama client for gemma3:270m summaries"""

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = "gemma3:270m"  # Fast model for summaries

    async def generate_summary(self, comments: List[str], file_path: str) -> str:
        """Generate short summary from comments"""
        if not comments:
            return "No documentation comments found."

        # Combine comments into context
        comment_text = "\n".join(comments[:10])  # Top 10 comments

        prompt = f"""File: {file_path}

Comments:
{comment_text}

Generate a 1-3 sentence summary of what this file does based on the comments. Be concise."""

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 100
                    }
                }

                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("response", "").strip()
                    else:
                        return "Summary generation failed."
        except Exception as e:
            return f"Error: {e}"

class EmbeddingService:
    """embeddinggemma for vector generation"""

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = "embeddinggemma:latest"

    async def embed(self, text: str) -> List[float]:
        """Generate 768d embedding"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model,
                    "prompt": text
                }

                async with session.post(
                    f"{self.base_url}/api/embeddings",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("embedding", [])
                    else:
                        return []
        except Exception as e:
            print(f"⚠️  Embedding failed: {e}")
            return []

class AutoTagger:
    """Auto-tag file profiles based on content"""

    ROLE_KEYWORDS = {
        "component": ["svelte", "component", "ui", "button", "input", "modal"],
        "api_route": ["+page.server", "+server", "api", "endpoint", "route"],
        "service": ["service", "client", "manager", "handler"],
        "schema": ["schema", "type", "interface", "zod", "drizzle"],
        "worker": ["worker", "background", "queue", "job"],
        "adapter": ["adapter", "connector", "bridge"],
    }

    SURFACE_KEYWORDS = {
        "ui": ["svelte", "component", "button", "modal", "form"],
        "api": ["api", "endpoint", "route", "server"],
        "rag": ["rag", "retrieval", "embedding", "vector"],
        "kag": ["kag", "knowledge", "graph", "ontology"],
        "ace": ["ace", "agent", "cognitive", "timeline"],
    }

    def auto_tag(self, profile: FileProfile) -> FileProfile:
        """Auto-generate tags based on file content"""
        tags = set(profile.tags or [])

        # Detect role
        file_lower = profile.file_path.lower()
        comments_lower = " ".join(profile.comments).lower()

        for role, keywords in self.ROLE_KEYWORDS.items():
            if any(kw in file_lower or kw in comments_lower for kw in keywords):
                profile.role = role
                tags.add(role)
                break

        # Detect surface areas
        for surface, keywords in self.SURFACE_KEYWORDS.items():
            if any(kw in file_lower or kw in comments_lower for kw in keywords):
                if surface not in profile.surface:
                    profile.surface.append(surface)
                tags.add(surface)

        # Risk assessment
        if any(word in file_lower for word in ["auth", "password", "secret", "key"]):
            profile.risk = "high"
            tags.add("security")
        elif any(word in file_lower for word in ["db", "database", "schema", "migration"]):
            profile.risk = "med"
            tags.add("data")
        else:
            profile.risk = "low"

        # Change frequency heuristic
        if any(word in file_lower for word in ["config", "constant", "schema"]):
            profile.change_frequency = "cold"
        elif any(word in file_lower for word in ["component", "ui", "page"]):
            profile.change_frequency = "warm"
        else:
            profile.change_frequency = "hot"

        profile.tags = list(tags)
        return profile

class FastMCPCodebaseIndexer:
    """Main indexer with FastMCP integration"""

    def __init__(self):
        self.extractor = RipgrepCommentExtractor()
        self.ollama = OllamaClient()
        self.embedder = EmbeddingService()
        self.tagger = AutoTagger()
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection = "fastmcp_file_profiles"

    async def index_file(self, file_path: str) -> Optional[FileProfile]:
        """Index a single file with full pipeline"""
        print(f"📄 Indexing: {file_path}")

        # 1. Extract comments
        comments = await self.extractor.extract_comments(file_path)
        print(f"   💬 Comments: {len(comments)}")

        # 2. Extract imports/exports
        code_info = await self.extractor.extract_imports_exports(file_path)

        # 3. Generate LLM summary from comments
        llm_summary = await self.ollama.generate_summary(comments, file_path)
        print(f"   🤖 Summary: {llm_summary[:60]}...")

        # 4. Combine comments + summary
        llm_output = f"Comments:\n" + "\n".join(comments[:5]) + f"\n\nSummary:\n{llm_summary}"

        # 5. Build profile
        profile = FileProfile(
            file_path=file_path,
            role="unknown",
            surface=[],
            dependencies=[],
            exports=code_info["exports"],
            imports=code_info["imports"],
            comments=comments,
            risk="low",
            change_frequency="warm",
            related_routes=[],
            tags=[],
            summary=llm_summary,
            llm_output=llm_output,
            generated_at=datetime.utcnow().isoformat()
        )

        # 6. Auto-tag
        profile = self.tagger.auto_tag(profile)
        print(f"   🏷️  Tags: {', '.join(profile.tags)}")

        # 7. Generate embedding from llm_output
        signature_text = f"FILE: {file_path}\nROLE: {profile.role}\nSURFACE: {', '.join(profile.surface)}\n{llm_output}"
        vector = await self.embedder.embed(signature_text)

        if not vector:
            print(f"   ❌ Embedding failed")
            return None

        print(f"   ✅ Vector: {len(vector)}d")

        # 8. Store in Qdrant
        await self.store_in_qdrant(profile, vector)

        # 9. Cache in Redis
        await self.cache_in_redis(profile)

        return profile

    async def store_in_qdrant(self, profile: FileProfile, vector: List[float]):
        """Store profile in Qdrant"""
        try:
            # Generate point ID from file path hash
            point_id = hashlib.sha256(profile.file_path.encode()).hexdigest()[:16]
            point_id_int = int(point_id, 16) % (2**63)  # Ensure valid ID

            async with aiohttp.ClientSession() as session:
                payload = {
                    "points": [{
                        "id": point_id_int,
                        "vector": vector,
                        "payload": asdict(profile)
                    }]
                }

                async with session.put(
                    f"{self.qdrant_url}/collections/{self.collection}/points",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        print(f"   ✅ Qdrant stored")
                    else:
                        print(f"   ⚠️  Qdrant error: {resp.status}")
        except Exception as e:
            print(f"   ⚠️  Qdrant failed: {e}")

    async def cache_in_redis(self, profile: FileProfile):
        """Cache profile in Redis for quick ACE lookups"""
        try:
            import redis.asyncio as redis

            r = redis.from_url(self.redis_url)

            # Key: file:path:hash
            key = f"file_profile:{hashlib.md5(profile.file_path.encode()).hexdigest()}"

            # Store as JSON
            await r.set(key, json.dumps(asdict(profile)), ex=86400)  # 24h TTL

            # Add to tag indexes
            for tag in profile.tags:
                await r.sadd(f"tag:{tag}", profile.file_path)

            await r.close()
            print(f"   ✅ Redis cached")
        except Exception as e:
            print(f"   ⚠️  Redis failed: {e}")

    async def ensure_collection(self):
        """Create Qdrant collection if needed"""
        try:
            async with aiohttp.ClientSession() as session:
                # Check if exists
                async with session.get(f"{self.qdrant_url}/collections/{self.collection}") as resp:
                    if resp.status == 200:
                        print(f"✅ Collection '{self.collection}' exists")
                        return

                # Create collection
                payload = {
                    "vectors": {
                        "size": 768,  # embeddinggemma dimension
                        "distance": "Cosine"
                    }
                }

                async with session.put(
                    f"{self.qdrant_url}/collections/{self.collection}",
                    json=payload
                ) as resp:
                    if resp.status == 200:
                        print(f"✅ Created collection '{self.collection}'")
                    else:
                        print(f"⚠️  Collection creation failed: {resp.status}")
        except Exception as e:
            print(f"⚠️  Collection check failed: {e}")

async def main():
    """Index sample files"""
    print("=" * 70)
    print("🚀 FastMCP Enhanced Codebase Indexer")
    print("=" * 70)
    print()
    print("Pipeline:")
    print("  1. ripgrep → Extract comments")
    print("  2. gemma3:270m → Generate summaries")
    print("  3. embeddinggemma → Create vectors")
    print("  4. Qdrant → Store with auto-tags")
    print("  5. Redis → Cache for quick lookups")
    print()

    indexer = FastMCPCodebaseIndexer()

    # Ensure collection exists
    await indexer.ensure_collection()

    # Sample files to index
    sample_files = [
        "src/routes/+page.svelte",
        "src/lib/services/codebase-indexer.ts",
        "src/routes/api/health/+server.ts",
    ]

    # Check which files exist
    root = Path("sveltekit-frontend")
    existing_files = []
    for f in sample_files:
        full_path = root / f
        if full_path.exists():
            existing_files.append(str(full_path))

    if not existing_files:
        print("⚠️  No sample files found. Specify files to index.")
        return

    print(f"📂 Indexing {len(existing_files)} files...")
    print()

    for file_path in existing_files:
        await indexer.index_file(file_path)
        print()

    print("=" * 70)
    print("✅ Indexing Complete!")
    print("=" * 70)
    print()
    print("🔍 Query indexed files:")
    print("   Redis: GET file_profile:<hash>")
    print("   Qdrant: POST /collections/fastmcp_file_profiles/points/search")
    print()

if __name__ == "__main__":
    asyncio.run(main())

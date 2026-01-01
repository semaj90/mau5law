"""
LLM Summary Generator
=====================

Generates AI summaries for code files using Ollama (gemma3-legal).
Stores summaries in CouchDB for RAG retrieval.
"""

import os
import sys
import logging
import httpx
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.couchdb_client import get_couchdb_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SummaryGenerator:
    """Generate LLM summaries for code files"""

    def __init__(self):
        self.client = get_couchdb_client()
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.model = os.getenv("LLM_MODEL", "gemma3-legal:latest")
        self.project_root = Path(__file__).parent.parent.parent  # deeds-web-app
        self.stats = {
            "files_processed": 0,
            "summaries_generated": 0,
            "errors": 0,
            "total_tokens": 0
        }

    def generate_summary(self, file_path: str, content: str, metadata: Dict[str, Any]) -> Optional[str]:
        """Generate LLM summary for a code file"""

        # Build prompt
        language = metadata.get("language", "unknown")
        functions = metadata.get("functions", [])
        classes = metadata.get("classes", [])
        imports = metadata.get("imports", [])

        prompt = f"""Analyze this {language} code file and provide a concise technical summary.

File: {file_path}
Language: {language}
Classes: {', '.join(classes[:10]) if classes else 'None'}
Functions: {', '.join(functions[:15]) if functions else 'None'}
Imports: {', '.join(imports[:10]) if imports else 'None'}

Code (first 2000 chars):
```{language}
{content[:2000]}
```

Provide:
1. Purpose (1 sentence)
2. Key functionality (2-3 bullets)
3. Dependencies and patterns used
4. Potential issues or improvements

Keep response under 200 words."""

        try:
            response = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 300,
                        "temperature": 0.3,
                    }
                },
                timeout=120.0
            )

            if response.status_code == 200:
                data = response.json()
                self.stats["total_tokens"] += data.get("eval_count", 0)
                return data.get("response", "")
            else:
                logger.warning(f"LLM error for {file_path}: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Error generating summary for {file_path}: {e}")
            return None

    def process_codebase_files(self, limit: int = 100, skip_existing: bool = True):
        """Process files from codebase_graph and generate summaries"""

        logger.info(f"Generating summaries for up to {limit} files...")

        # Get files from codebase_graph
        processed = 0
        for doc_id in self.client.codebase_graph:
            if processed >= limit:
                break

            if doc_id.startswith("_"):
                continue

            try:
                doc = self.client.codebase_graph[doc_id]
                file_path = doc.get("path", "")
                metadata = doc.get("metadata", {})

                # Skip if summary exists
                if skip_existing:
                    summary_id = f"summary:{doc_id}"
                    if summary_id in self.client.llm_summaries:
                        continue

                # Resolve relative path to absolute
                rel_path = doc.get("path", "")
                file_path = self.project_root / rel_path

                # Read file content
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                else:
                    content = doc.get("content", "")[:2000]

                if not content:
                    continue

                # Build doc with metadata merged for summary generation
                doc_for_summary = {
                    **doc,
                    "language": metadata.get("language", "unknown"),
                    "lines_of_code": metadata.get("lines_of_code", 0),
                }

                # Generate summary
                logger.info(f"Summarizing: {Path(file_path).name}")
                summary = self.generate_summary(file_path, content, doc_for_summary)

                if summary:
                    # Store in CouchDB
                    self.client.store_llm_summary(
                        file_path=file_path,
                        summary=summary,
                        model=self.model,
                        metadata={
                            "language": metadata.get("language"),
                            "lines_of_code": metadata.get("lines_of_code", 0),
                            "functions": doc.get("functions", [])[:5],
                            "classes": doc.get("classes", [])[:5],
                        }
                    )
                    self.stats["summaries_generated"] += 1
                else:
                    self.stats["errors"] += 1

                processed += 1
                self.stats["files_processed"] = processed

                # Rate limit
                if processed % 5 == 0:
                    logger.info(f"Processed {processed} files, {self.stats['summaries_generated']} summaries...")
                    time.sleep(0.5)

            except Exception as e:
                logger.error(f"Error processing {doc_id}: {e}")
                self.stats["errors"] += 1
                continue

        return self.stats

    def get_priority_files(self, limit: int = 50) -> List[str]:
        """Get high-priority files to summarize first"""

        priority_patterns = [
            "api/",
            "services/",
            "routes/",
            "+page.svelte",
            "+server.ts",
            "store",
            "utils",
        ]

        priority_files = []

        for doc_id in self.client.codebase_graph:
            if doc_id.startswith("_"):
                continue
            if len(priority_files) >= limit:
                break

            doc = self.client.codebase_graph.get(doc_id, {})
            file_path = doc.get("file_path", "")

            for pattern in priority_patterns:
                if pattern in file_path.lower():
                    priority_files.append(doc_id)
                    break

        return priority_files


def main():
    print("=" * 60)
    print("LLM Summary Generator")
    print("=" * 60)

    generator = SummaryGenerator()

    # Check Ollama connection
    try:
        response = httpx.get(f"{generator.ollama_url}/api/tags", timeout=5)
        if response.status_code == 200:
            models = [m["name"] for m in response.json().get("models", [])]
            print(f"Ollama available, models: {', '.join(models[:5])}")
        else:
            print("Warning: Ollama not responding")
    except Exception as e:
        print(f"Error: Cannot connect to Ollama: {e}")
        return

    # Process files
    limit = int(os.getenv("SUMMARY_LIMIT", "20"))
    print(f"\nGenerating summaries for {limit} files...")

    stats = generator.process_codebase_files(limit=limit)

    print("\n" + "=" * 60)
    print("Summary Generation Complete")
    print("=" * 60)
    print(f"Files processed: {stats['files_processed']}")
    print(f"Summaries generated: {stats['summaries_generated']}")
    print(f"Total tokens used: {stats['total_tokens']}")
    print(f"Errors: {stats['errors']}")

    # Check database
    info = generator.client.llm_summaries.info()
    print(f"\nLLM Summaries in CouchDB: {info['doc_count']}")


if __name__ == "__main__":
    main()

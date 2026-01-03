# File Analysis Pipeline - Quick Start Guide

**Date:** January 2, 2026
**Phase:** 4 - File Analysis Pipeline
**Status:** Complete ✅

---

## Overview

The File Analysis Pipeline extracts comments, searches for code patterns, and generates AI-powered recommendations using gemma3-legal.

---

## Prerequisites

### Required Tools

1. **Python 3.10+** with asyncio support
2. **ripgrep** (optional but recommended for performance)
   ```bash
   # Install ripgrep
   # macOS
   brew install ripgrep

   # Ubuntu/Debian
   apt-get install ripgrep

   # Windows
   choco install ripgrep
   ```

3. **Ollama** with gemma3-legal model
   ```bash
   # Start Ollama
   ollama serve

   # Pull gemma3-legal model
   ollama pull gemma3-legal:latest
   ```

### Environment Variables

```bash
# AI Analysis
export OLLAMA_URL=http://localhost:11434
export GEMMA3_MODEL=gemma3-legal:latest
```

---

## Quick Start

### 1. Extract Comments from a File

```python
import asyncio
from backend.services.comment_extraction_service import CommentExtractionService

async def extract_comments_example():
    service = CommentExtractionService()

    # Extract all comments
    comments = await service.extract_comments("src/lib/components/Button.svelte")

    print(f"Found {len(comments)} comments:")
    for comment in comments:
        print(f"  Line {comment.line_number}: {comment.comment_type.value}")
        print(f"    {comment.text[:80]}...")

    # Extract only TODOs
    todos = await service.extract_todos("src/lib/components/Button.svelte")
    print(f"\nFound {len(todos)} TODOs")

asyncio.run(extract_comments_example())
```

### 2. Search for Code Patterns

```python
import asyncio
from backend.services.pattern_search_service import PatternSearchService

async def search_patterns_example():
    service = PatternSearchService()

    # Search for function calls
    result = await service.search_function_calls("createTag")
    print(f"Found {result.total_matches} function calls in {result.search_time_ms:.2f}ms")

    for pattern in result.patterns[:5]:
        print(f"  {pattern.file}:{pattern.line} - {pattern.text}")

    # Search for imports
    result = await service.search_imports("Button")
    print(f"\nFound {result.total_matches} imports")

    # Search for related patterns (all types)
    results = await service.search_related_patterns("Button")
    print(f"\nFound {sum(r.total_matches for r in results)} related patterns")

asyncio.run(search_patterns_example())
```

### 3. Analyze with AI

```python
import asyncio
from backend.services.ai_analysis_service import AIAnalysisService
from backend.services.pattern_search_service import PatternSearchService

async def ai_analysis_example():
    pattern_service = PatternSearchService()
    ai_service = AIAnalysisService()

    # Search for patterns
    result = await pattern_service.search_function_calls("createTag")

    # Analyze patterns
    analysis = await ai_service.analyze_patterns(result.patterns)

    print(f"Summary: {analysis.summary}")
    print(f"Confidence: {analysis.confidence:.2f}")
    print(f"\nRecommendations:")
    for rec in analysis.recommendations:
        print(f"  [{rec.type}] {rec.description}")
        print(f"    Confidence: {rec.confidence:.2f}, Priority: {rec.priority}")

asyncio.run(ai_analysis_example())
```

---

## Common Use Cases

### Use Case 1: Find All TODOs in Codebase

```python
import asyncio
from pathlib import Path
from backend.services.comment_extraction_service import CommentExtractionService

async def find_all_todos():
    service = CommentExtractionService()

    # Find all TypeScript/Svelte files
    files = []
    for ext in [".ts", ".tsx", ".js", ".jsx", ".svelte"]:
        files.extend(Path("src").rglob(f"*{ext}"))

    # Extract TODOs
    all_todos = []
    for file_path in files:
        todos = await service.extract_todos(str(file_path))
        all_todos.extend(todos)

    print(f"Found {len(all_todos)} TODOs:")
    for todo in all_todos:
        print(f"  {todo.file_path}:{todo.line_number}")
        print(f"    {todo.text}")

asyncio.run(find_all_todos())
```

### Use Case 2: Analyze API Usage

```python
import asyncio
from backend.services.pattern_search_service import PatternSearchService
from backend.services.ai_analysis_service import AIAnalysisService

async def analyze_api_usage():
    pattern_service = PatternSearchService()
    ai_service = AIAnalysisService()

    # Search for API calls
    result = await pattern_service.search_api_calls("/api/tags")

    print(f"Found {result.total_matches} API calls to /api/tags")

    # Analyze usage patterns
    analysis = await ai_service.analyze_patterns(result.patterns)

    print(f"\nAnalysis:")
    print(f"  {analysis.summary}")

    if analysis.recommendations:
        print(f"\nRecommendations:")
        for rec in analysis.recommendations:
            print(f"  - {rec.description}")

asyncio.run(analyze_api_usage())
```

### Use Case 3: Complete File Analysis

```python
import asyncio
from backend.services.comment_extraction_service import CommentExtractionService
from backend.services.pattern_search_service import PatternSearchService
from backend.services.ai_analysis_service import AIAnalysisService

async def analyze_file(file_path: str):
    comment_service = CommentExtractionService()
    pattern_service = PatternSearchService()
    ai_service = AIAnalysisService()

    print(f"Analyzing: {file_path}\n")

    # Step 1: Extract comments
    comments = await comment_service.extract_comments(file_path)
    print(f"1. Extracted {len(comments)} comments")

    # Step 2: Search for patterns
    patterns = []
    symbols = set()

    # Extract symbols from comments
    for comment in comments:
        words = comment.text.split()
        for word in words:
            if word.isidentifier() and len(word) > 3:
                symbols.add(word)

    # Search for each symbol
    for symbol in list(symbols)[:5]:  # Limit to 5 symbols
        results = await pattern_service.search_related_patterns(symbol)
        for result in results:
            patterns.extend(result.patterns)

    print(f"2. Found {len(patterns)} related patterns")

    # Step 3: AI analysis
    analysis = await ai_service.analyze_patterns(patterns, comments)

    print(f"3. AI Analysis:")
    print(f"   Summary: {analysis.summary[:200]}...")
    print(f"   Confidence: {analysis.confidence:.2f}")
    print(f"   Issues: {analysis.issues_found}")

    if analysis.recommendations:
        print(f"\n4. Recommendations:")
        for i, rec in enumerate(analysis.recommendations[:3], 1):
            print(f"   {i}. [{rec.type}] {rec.description}")
            print(f"      Confidence: {rec.confidence:.2f}, Priority: {rec.priority}")

# Run analysis
asyncio.run(analyze_file("src/lib/components/Button.svelte"))
```

---

## API Reference

### CommentExtractionService

```python
class CommentExtractionService:
    async def extract_comments(
        file_path: str,
        include_context: bool = True,
        context_lines: int = 2
    ) -> List[Comment]

    async def extract_todos(file_path: str) -> List[Comment]
    async def extract_fixmes(file_path: str) -> List[Comment]
    async def extract_jsdoc(file_path: str) -> List[Comment]
```

### PatternSearchService

```python
class PatternSearchService:
    async def search_function_calls(
        function_name: str,
        file_pattern: str = "*.{ts,tsx,js,jsx,svelte}",
        context_lines: int = 2
    ) -> PatternSearchResult

    async def search_imports(
        module_name: str,
        file_pattern: str = "*.{ts,tsx,js,jsx,svelte}",
        context_lines: int = 1
    ) -> PatternSearchResult

    async def search_variable_usage(
        variable_name: str,
        file_pattern: str = "*.{ts,tsx,js,jsx,svelte}",
        context_lines: int = 2
    ) -> PatternSearchResult

    async def search_component_usage(
        component_name: str,
        file_pattern: str = "*.{svelte,tsx,jsx}",
        context_lines: int = 2
    ) -> PatternSearchResult

    async def search_api_calls(
        api_path: str,
        file_pattern: str = "*.{ts,tsx,js,jsx,svelte}",
        context_lines: int = 2
    ) -> PatternSearchResult

    async def search_related_patterns(
        symbol: str,
        file_pattern: str = "*.{ts,tsx,js,jsx,svelte}",
        context_lines: int = 2
    ) -> List[PatternSearchResult]
```

### AIAnalysisService

```python
class AIAnalysisService:
    async def analyze_patterns(
        patterns: List[Pattern],
        comments: Optional[List[Comment]] = None,
        context: Optional[str] = None
    ) -> Analysis

    async def analyze_file(
        file_path: str,
        patterns: List[Pattern],
        comments: List[Comment]
    ) -> Analysis

    async def generate_summary(
        patterns: List[Pattern],
        max_length: int = 200
    ) -> str

    async def generate_recommendations(
        analysis: Analysis,
        max_recommendations: int = 5
    ) -> List[Recommendation]

    async def calculate_confidence(
        patterns: List[Pattern],
        comments: List[Comment]
    ) -> float
```

---

## Data Structures

### Comment

```python
@dataclass
class Comment:
    text: str
    file_path: str
    line_number: int
    comment_type: CommentType  # SINGLE_LINE, MULTI_LINE, JSDOC, TODO, FIXME, HACK, NOTE
    context_before: List[str]
    context_after: List[str]
    jsdoc_tags: List[JSDocTag]
    marker_type: Optional[str]
```

### Pattern

```python
@dataclass
class Pattern:
    text: str
    file: str
    line: int
    column: int
    pattern_type: PatternType  # FUNCTION_CALL, IMPORT_STATEMENT, VARIABLE_USAGE, etc.
    context: List[str]
    matched_symbol: Optional[str]
    metadata: Dict[str, Any]
```

### Analysis

```python
@dataclass
class Analysis:
    summary: str
    recommendations: List[Recommendation]
    confidence: float  # 0.0 to 1.0
    patterns_analyzed: int
    comments_analyzed: int
    issues_found: int
    metadata: Dict[str, Any]
    analyzed_at: datetime
```

### Recommendation

```python
@dataclass
class Recommendation:
    type: str  # 'fix', 'refactor', 'optimize', 'document'
    description: str
    confidence: float  # 0.0 to 1.0
    code: Optional[str]
    reasoning: Optional[str]
    priority: str  # 'low', 'medium', 'high', 'critical'
```

---

## Performance Tips

1. **Use ripgrep:** Install ripgrep for 2-3x faster comment extraction and pattern search
2. **Limit patterns:** When searching for related patterns, limit to top 5-10 symbols
3. **Cache results:** Cache AI analysis results in Redis to avoid repeated API calls
4. **Batch processing:** Process multiple files in parallel using asyncio.gather()
5. **Filter files:** Use file patterns to limit search scope (e.g., "*.ts" instead of "*")

---

## Troubleshooting

### Issue: "ripgrep not found"

**Solution:** Install ripgrep or the service will fall back to Python regex (slower)

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
apt-get install ripgrep

# Windows
choco install ripgrep
```

### Issue: "Ollama API timeout"

**Solution:** Increase timeout or check Ollama service

```python
# Increase timeout
service = AIAnalysisService()
# Timeout is set in aiohttp.ClientTimeout(total=60)
```

### Issue: "No comments extracted"

**Solution:** Check file path and file content

```python
# Verify file exists
import os
print(os.path.exists(file_path))

# Check file content
with open(file_path) as f:
    print(f.read())
```

### Issue: "No patterns found"

**Solution:** Check workspace root and file pattern

```python
# Set workspace root explicitly
service = PatternSearchService(workspace_root="/path/to/project")

# Use correct file pattern
result = await service.search_function_calls("myFunc", file_pattern="**/*.ts")
```

---

## Testing

### Run All Tests

```bash
python backend/tests/test_file_analysis.py
```

### Run Specific Test

```bash
python -m unittest backend.tests.test_file_analysis.TestCommentExtraction.test_extract_jsdoc_comments
```

---

## Next Steps

1. **Phase 5:** Enhanced Qdrant Tagging
   - Create EnhancedQdrantTag interface
   - Integrate file analysis with tag creation
   - Use AI summaries for tag metadata

2. **Enhancements:**
   - Add caching layer for analysis results
   - Implement batch file analysis
   - Add support for more languages (Python, Go)

---

**Status:** Phase 4 Complete ✅
**Documentation:** `PHASE4_FILE_ANALYSIS_COMPLETE.md`
**Next Phase:** Phase 5 - Enhanced Qdrant Tagging


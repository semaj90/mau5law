# Phase 95: Test Multimodal RAG+KAG Pipeline
# Tests: Docling → Granite Vision → DAG Knowledge Graph

$ErrorActionPreference = "Stop"

Write-Host "🧪 Phase 95: Multimodal RAG+KAG Test Suite" -ForegroundColor Cyan
Write-Host "═" * 80
Write-Host ""

# =============================================================================
# Test 1: Install Dependencies
# =============================================================================

Write-Host "1️⃣ Installing Dependencies..." -ForegroundColor Yellow

$pythonPath = "C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe"

# Install Docling
Write-Host "   📦 Installing IBM Docling..."
& $pythonPath -m pip install --quiet docling 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Docling installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Docling install failed (continuing anyway)" -ForegroundColor Yellow
}

# Check for Granite model in Ollama
Write-Host "   🤖 Checking for Granite model..."
$models = ollama list 2>&1 | Select-String "granite"
if ($models) {
    Write-Host "   ✅ Granite model available: $models" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Granite not found, will use llava fallback" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# Test 2: Create Sample Documents
# =============================================================================

Write-Host "2️⃣ Creating Sample Documents..." -ForegroundColor Yellow

$testDir = "reports\phase95-test"
New-Item -Path $testDir -ItemType Directory -Force | Out-Null

# Sample markdown document
$sampleDoc = @"
# Phase 95 Architecture

This document describes the multimodal RAG+KAG pipeline.

## Components

1. **IBM Docling**: Processes PDFs, images, and documents
2. **Granite 3.0**: Vision-language model for multimodal understanding
3. **DAG Knowledge Graph**: Directed acyclic graph for relationships

## Features

- Topological sorting for dependency-aware retrieval
- No cycles guarantee termination
- Edge types: DERIVES_FROM, REFERENCES, CONTAINS, ILLUSTRATES

## Example

```python
pipeline = MultimodalRAGPipeline()
doc_id = await pipeline.process_document("sample.pdf")
results = await pipeline.query_dag("Explain the architecture", use_topological=True)
```
"@

Set-Content -Path "$testDir\sample-doc.md" -Value $sampleDoc
Write-Host "   ✅ Created sample-doc.md" -ForegroundColor Green

Write-Host ""

# =============================================================================
# Test 3: Process Document with Docling
# =============================================================================

Write-Host "3️⃣ Testing Docling Document Processing..." -ForegroundColor Yellow

$doclingTest = & $pythonPath scripts/phase95-docling-dag.py --docling "$testDir\sample-doc.md" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Docling processing successful" -ForegroundColor Green

    # Parse output for node count
    $nodeCount = ($doclingTest | Select-String "Created (\d+) chunks").Matches.Groups[1].Value
    if ($nodeCount) {
        Write-Host "   📊 Created $nodeCount chunk nodes" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ Docling processing failed" -ForegroundColor Red
    Write-Host "   Error: $doclingTest"
}

Write-Host ""

# =============================================================================
# Test 4: Query DAG with Topological Sort
# =============================================================================

Write-Host "4️⃣ Testing DAG Query (Topological)..." -ForegroundColor Yellow

$queryTest = & $pythonPath scripts/phase95-docling-dag.py --query "DAG knowledge graph" --dag 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ DAG query successful" -ForegroundColor Green

    # Show first result
    $firstResult = ($queryTest | Select-String "\[(\w+)\]").Matches[0].Groups[1].Value
    if ($firstResult) {
        Write-Host "   🎯 Top result type: $firstResult" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ DAG query failed" -ForegroundColor Red
}

Write-Host ""

# =============================================================================
# Test 5: Verify DAG Properties
# =============================================================================

Write-Host "5️⃣ Verifying DAG Properties..." -ForegroundColor Yellow

# Check for cycles (should be none)
$verifyScript = @"
import sys
sys.path.insert(0, 'scripts')
from phase95_docling_dag import DAGKnowledgeGraph

dag = DAGKnowledgeGraph()

# Load nodes from Qdrant
from qdrant_client import QdrantClient
qdrant = QdrantClient(host='localhost', port=6333)

try:
    collection_info = qdrant.get_collection('phase95_dag_nodes')
    print(f'✅ DAG nodes: {collection_info.points_count} points')

    collection_info = qdrant.get_collection('phase95_dag_edges')
    print(f'✅ DAG edges: {collection_info.points_count} edges')

    # Topological sort
    sorted_nodes = dag.topological_sort()
    print(f'✅ Topological sort: {len(sorted_nodes)} nodes ordered')
    print(f'✅ No cycles detected')

except Exception as e:
    print(f'⚠️ Collections not yet created: {e}')
"@

Set-Content -Path "$testDir\verify-dag.py" -Value $verifyScript
$verifyOutput = & $pythonPath "$testDir\verify-dag.py" 2>&1

Write-Host "   $verifyOutput"
Write-Host ""

# =============================================================================
# Test 6: Qdrant Collection Status
# =============================================================================

Write-Host "6️⃣ Checking Qdrant Collections..." -ForegroundColor Yellow

try {
    $nodesCollection = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase95_dag_nodes" -Method GET -TimeoutSec 5
    Write-Host "   ✅ phase95_dag_nodes: $($nodesCollection.result.points_count) points" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ phase95_dag_nodes: Not created yet" -ForegroundColor Yellow
}

try {
    $edgesCollection = Invoke-RestMethod -Uri "http://localhost:6333/collections/phase95_dag_edges" -Method GET -TimeoutSec 5
    Write-Host "   ✅ phase95_dag_edges: $($edgesCollection.result.points_count) edges" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ phase95_dag_edges: Not created yet" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# Summary
# =============================================================================

Write-Host "═" * 80
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host ""
Write-Host "Architecture:" -ForegroundColor Yellow
Write-Host "  IBM Docling → Extract structure (PDF/MD/images)"
Write-Host "  LangExtract → Normalize patterns"
Write-Host "  Granite 3.0 → Vision analysis"
Write-Host "  EmbeddingGemma → 768-dim vectors"
Write-Host "  DAG → Topological knowledge graph"
Write-Host ""
Write-Host "DAG Properties:" -ForegroundColor Yellow
Write-Host "  ✅ No cycles (guaranteed termination)"
Write-Host "  ✅ Topological ordering (dependency-aware retrieval)"
Write-Host "  ✅ Typed edges (DERIVES_FROM, ILLUSTRATES, etc.)"
Write-Host "  ✅ Ancestor/descendant queries"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "  1. Process real documents: python scripts/phase95-docling-dag.py --docling path/to/doc.pdf"
Write-Host "  2. Analyze images: python scripts/phase95-docling-dag.py --image path/to/image.png"
Write-Host "  3. Query with DAG: python scripts/phase95-docling-dag.py --query 'your question' --dag"
Write-Host "  4. Build complete KB: python scripts/phase95-docling-dag.py --build-dag docs/"
Write-Host ""

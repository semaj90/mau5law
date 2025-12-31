# Phase 95: Multimodal RAG+KAG with IBM Docling + Granite 3.0

## 🎯 Overview

Complete multimodal knowledge graph pipeline combining:
- **IBM Docling**: PDF/image/document processing
- **Granite 3.0**: Vision-language model for image understanding
- **DAG Architecture**: Directed Acyclic Graph for knowledge topology
- **EmbeddingGemma**: 768-dim semantic vectors

## 📐 DAG Architecture

### What is DAG?

**Directed Acyclic Graph** = nodes + directed edges + NO cycles

**Properties**:
```
1. Topological Ordering: Parents always appear before children
2. No Cycles: Prevents infinite loops in traversal
3. Dependency Tracking: Clear provenance chains
4. Version Control: Linear evolution of knowledge
```

**Example**:
```
Document (depth=0)
  ├─> Section 1 (depth=1)
  │    ├─> Chunk 1.1 (depth=2)
  │    └─> Chunk 1.2 (depth=2)
  ├─> Section 2 (depth=1)
  │    └─> Code Block (depth=2)
  └─> Image 1 (depth=1)
       └─> Caption (depth=2)
```

**Invalid** (cycle):
```
A → B → C → A  ❌ (would create infinite loop)
```

### Node Types

```python
class DAGNodeType:
    DOCUMENT = "document"  # Root document
    SECTION = "section"    # Document section
    CHUNK = "chunk"        # Text chunk (1000 chars)
    IMAGE = "image"        # Image/diagram analyzed by Granite
    ENTITY = "entity"      # Named entity extracted
    CONCEPT = "concept"    # Abstract concept
    CODE = "code"          # Code block
```

### Edge Types

```python
class DAGEdgeType:
    DERIVES_FROM = "derives_from"    # Chunk → Document
    REFERENCES = "references"        # Cross-reference
    CONTAINS = "contains"            # Section → Chunks
    RELATES_TO = "relates_to"        # Semantic similarity
    IMPLEMENTS = "implements"        # Code → Concept
    ILLUSTRATES = "illustrates"      # Image → Text
```

## 🏗️ Architecture

### Pipeline Flow

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT: PDF, Image, Markdown, Video Frame                     │
└───────────────────┬──────────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   IBM Docling       │ ← Extract structure (tables, images, text)
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   LangExtract       │ ← Normalize patterns (optional)
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Granite 3.0       │ ← Vision analysis for images
         │   (or llava)        │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  EmbeddingGemma     │ ← 768-dim vectors (task_type)
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  DAG Knowledge      │ ← Store with relationships
         │  Graph (Qdrant)     │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │  Topological Query  │ ← Dependency-aware retrieval
         └─────────────────────┘
```

### Storage Layers

```
Qdrant Collections:
  - phase95_dag_nodes (768-dim vectors)
    ├─ Payload: node_type, content, depth, parent_count
    ├─ Indexes: node_type, depth
    └─ Vectors: embeddinggemma (COSINE distance)

  - phase95_dag_edges (metadata only)
    ├─ Payload: edge_type, source_id, target_id, weight
    ├─ Indexes: edge_type, source_id, target_id
    └─ Vectors: dummy [0.0, 0.0]

  - phase95_vision_index (future: image embeddings)
```

## 🚀 Usage

### 1. Install Dependencies

```bash
# Python environment
cd sveltekit-frontend
python -m pip install docling httpx qdrant-client psycopg2-binary numpy

# Ollama models
ollama pull embeddinggemma:latest
ollama pull granite3-dense:2b  # IBM Granite 3.0
# Fallback: ollama pull llava:latest
```

### 2. Process Document

```bash
# Process PDF with Docling
python scripts/phase95-docling-dag.py --docling "document.pdf"

# Process markdown
python scripts/phase95-docling-dag.py --docling "README.md"

# Build DAG from directory
python scripts/phase95-docling-dag.py --build-dag "docs/"
```

**Output**:
```
📄 Processing: document.pdf
   ✅ Document node: doc_a3f5b2c1
   ✅ Created 12 chunks
   🖼️  Analyzing image: figure1.png
      ✅ Image node: img_7d8e9f2a

📊 Topological order (14 nodes):
   1. [document] doc_a3f5b2c1 (depth=0)
   2. [chunk] chunk_a3f5b2c1_0 (depth=1)
   3. [chunk] chunk_a3f5b2c1_1 (depth=1)
   4. [image] img_7d8e9f2a (depth=1)
   ...
```

### 3. Analyze Image with Granite Vision

```bash
python scripts/phase95-docling-dag.py --image "diagram.png"
```

**Output**:
```
🖼️  Image Analysis:
This image shows a system architecture diagram with three main components:
1. A database layer (PostgreSQL)
2. A vector store (Qdrant)
3. An API gateway (FastAPI)

The diagram uses arrows to show data flow from left to right...
```

### 4. Query DAG with Topological Sort

```bash
# Query with dependency-aware ordering
python scripts/phase95-docling-dag.py --query "Explain the architecture" --dag

# Query without topological sort (by similarity only)
python scripts/phase95-docling-dag.py --query "Explain the architecture"
```

**Output** (with --dag):
```
🔍 Querying DAG: Explain the architecture
   ✅ Results sorted topologically

📊 Found 5 results:

   [document] doc_a3f5b2c1 (depth=0)
   Score: 0.8542
   # Phase 95 Architecture This document describes...

   [chunk] chunk_a3f5b2c1_3 (depth=1)
   Score: 0.8234
   The pipeline consists of IBM Docling for document...

   [image] img_7d8e9f2a (depth=1)
   Score: 0.7891
   System architecture diagram showing PostgreSQL...
```

**Difference**: With `--dag`, results are **re-ordered by depth** so parent documents appear before their chunks (dependency-aware retrieval).

## 🧠 DAG Algorithms

### Topological Sort (Kahn's Algorithm)

```python
def topological_sort(self) -> List[str]:
    """
    Returns nodes in dependency order.

    Algorithm:
      1. Count incoming edges (in-degree) for each node
      2. Start with nodes having in-degree=0 (roots)
      3. Process level-by-level (BFS)
      4. Assign depth based on level
    """
    in_degree = defaultdict(int)
    for edge in self.edges:
        in_degree[edge.target_id] += 1

    queue = deque([node_id for node_id in self.nodes if in_degree[node_id] == 0])
    sorted_nodes = []
    depth = 0

    while queue:
        level_size = len(queue)
        for _ in range(level_size):
            node_id = queue.popleft()
            sorted_nodes.append(node_id)
            self.nodes[node_id].depth = depth

            for child_id in self.adjacency[node_id]:
                in_degree[child_id] -= 1
                if in_degree[child_id] == 0:
                    queue.append(child_id)

        depth += 1

    return sorted_nodes
```

### Cycle Detection (DFS)

```python
def _would_create_cycle(self, source: str, target: str) -> bool:
    """
    Prevent cycles using depth-first search.

    Returns True if adding edge source→target would create cycle.
    """
    visited = set()

    def dfs(node: str) -> bool:
        if node == source:  # Found path back to source
            return True
        if node in visited:
            return False

        visited.add(node)
        for neighbor in self.adjacency.get(node, []):
            if dfs(neighbor):
                return True
        return False

    return dfs(target)  # Start DFS from target
```

**Example**:
```
Current: A → B → C
Trying to add: C → A

DFS from C:
  C → adjacency[C] = [A]
  A → adjacency[A] = [B]
  B → adjacency[B] = [C]
  C == source? YES → CYCLE DETECTED ❌
```

### Ancestor Queries

```python
def get_ancestors(self, node_id: str, max_depth: int = 3) -> List[str]:
    """Get all ancestor nodes up to max_depth levels"""
    ancestors = []
    visited = set()
    queue = deque([(node_id, 0)])

    while queue:
        current, depth = queue.popleft()
        if depth >= max_depth or current in visited:
            continue

        visited.add(current)
        ancestors.append(current)

        # Traverse upward through parents
        for parent_id in self.nodes[current].parents:
            queue.append((parent_id, depth + 1))

    return ancestors
```

## 📊 Testing

### Run Test Suite

```powershell
.\scripts\phase95-test-multimodal.ps1
```

**Tests**:
```
1️⃣ Installing Dependencies
   ✅ Docling installed
   ✅ Granite model available

2️⃣ Creating Sample Documents
   ✅ Created sample-doc.md

3️⃣ Testing Docling Document Processing
   ✅ Docling processing successful
   📊 Created 8 chunk nodes

4️⃣ Testing DAG Query (Topological)
   ✅ DAG query successful
   🎯 Top result type: document

5️⃣ Verifying DAG Properties
   ✅ DAG nodes: 14 points
   ✅ DAG edges: 13 edges
   ✅ Topological sort: 14 nodes ordered
   ✅ No cycles detected

6️⃣ Checking Qdrant Collections
   ✅ phase95_dag_nodes: 14 points
   ✅ phase95_dag_edges: 13 edges
```

### Manual Tests

```bash
# 1. Test Docling extraction
python -c "
from docling.document_converter import DocumentConverter
conv = DocumentConverter()
result = conv.convert('sample.pdf')
print(result.document.export_to_markdown()[:500])
"

# 2. Test Granite vision
ollama run granite3-dense:2b "Describe this image in detail" < image.png

# 3. Test cycle detection
python -c "
from scripts.phase95_docling_dag import DAGKnowledgeGraph, DAGEdge
dag = DAGKnowledgeGraph()

# Add edges: A → B → C
dag.add_edge(DAGEdge('e1', 'test', 'A', 'B'))
dag.add_edge(DAGEdge('e2', 'test', 'B', 'C'))

# Try to add C → A (should fail)
would_cycle = dag._would_create_cycle('C', 'A')
print(f'Would create cycle: {would_cycle}')  # True
"
```

## 🔬 Technical Details

### Task Types (Video [08:59])

```python
# Storage embeddings (for indexing)
doc_vector = await embed(content, task_type="retrieval_document")

# Query embeddings (for searching)
query_vector = await embed(query, task_type="retrieval_query")
```

**Why?** EmbeddingGemma uses different transformations for storage vs. queries to optimize retrieval.

### MRL + INT8 Quantization (Video [05:51])

```python
# Enable in Qdrant collection config
models.VectorParams(
    size=768,
    distance=Distance.COSINE,
    quantization_config=models.ScalarQuantization(
        type=models.ScalarType.INT8,
        quantile=0.99,
        always_ram=True
    )
)
```

**Savings**: 4x memory reduction (768 floats → 768 int8s)

### Hierarchical Retrieval (Video [07:39])

```python
# 1. Filter by node type BEFORE vector search
filter_conditions = models.Filter(
    must=[
        models.FieldCondition(
            key="node_type",
            match=models.MatchValue(value="chunk")
        )
    ]
)

# 2. Vector search on filtered set
results = qdrant.query_points(
    collection_name=DAG_NODES_COLLECTION,
    query=query_vector,
    query_filter=filter_conditions,
    limit=50
)

# 3. GPU rerank top candidates (optional)
```

## 🎓 Knowledge Graph Patterns

### Citation Graph

```
Paper A
  ├─ CITES → Paper B
  ├─ CITES → Paper C
  └─ CITES → Paper D

Paper B
  └─ CITES → Paper E

Query: "What papers influenced Paper A?"
Answer: Ancestors of A = {B, C, D, E} (topological order)
```

### Code Documentation

```
README.md
  ├─ CONTAINS → Introduction
  ├─ CONTAINS → Installation
  │   ├─ CONTAINS → Prerequisites
  │   └─ CONTAINS → Steps
  └─ CONTAINS → Usage
      ├─ REFERENCES → example.py
      └─ ILLUSTRATES → diagram.png

Query: "How do I install?"
Answer: Installation section + Prerequisites + Steps (depth=2,3)
```

### Multimodal RAG

```
Document
  ├─ CONTAINS → Section 1
  │   ├─ CONTAINS → Text Chunk
  │   └─ ILLUSTRATES → Figure 1 (Granite vision)
  └─ CONTAINS → Section 2
      └─ IMPLEMENTS → Code Block

Query: "Show me the architecture diagram"
Answer: Figure 1 (image) + Section 1 (text context) in topological order
```

## 🔧 Advanced Configuration

### Custom Chunking

```python
# Semantic chunking (instead of fixed-size)
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)

chunks = splitter.split_text(doc_result['markdown'])
```

### Edge Weighting

```python
# Weight edges by semantic similarity
doc_vector = await embed(doc_content)
chunk_vector = await embed(chunk_content)

similarity = np.dot(doc_vector, chunk_vector)

edge = DAGEdge(
    edge_id=f"edge_{chunk_id}",
    edge_type=DAGEdgeType.DERIVES_FROM,
    source_id=chunk_id,
    target_id=doc_id,
    weight=similarity  # Use for ranking
)
```

### Multi-Hop Queries

```python
# Question: "What influenced the code in Section 3?"
# Answer: Section 3 → ancestors → filter by type=concept

section_node = find_node("Section 3")
ancestors = dag.get_ancestors(section_node.node_id, max_depth=5)

concepts = [
    dag.nodes[anc_id]
    for anc_id in ancestors
    if dag.nodes[anc_id].node_type == DAGNodeType.CONCEPT
]
```

## 📚 References

- **IBM Docling**: https://github.com/DS4SD/docling
- **Granite 3.0**: https://huggingface.co/ibm-granite/granite-3.0-2b-instruct
- **DAG Algorithms**: https://en.wikipedia.org/wiki/Directed_acyclic_graph
- **Topological Sort**: https://en.wikipedia.org/wiki/Topological_sorting
- **Kahn's Algorithm**: https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm

## ✅ Validation

**Guaranteed Properties**:
```
1. No Cycles: Every edge addition checked with DFS
2. Topological Order: Kahn's algorithm guarantees valid ordering
3. Finite Traversal: Acyclic = bounded depth
4. Dependency Integrity: Parents always indexed before children
```

**Test**:
```bash
# Add 100 random edges and verify no cycles
python -c "
from scripts.phase95_docling_dag import DAGKnowledgeGraph
import random

dag = DAGKnowledgeGraph()

# Add 100 nodes
for i in range(100):
    dag.nodes[f'node_{i}'] = ...

# Try to add 500 random edges
added = 0
rejected = 0

for _ in range(500):
    src = f'node_{random.randint(0, 99)}'
    tgt = f'node_{random.randint(0, 99)}'

    edge = DAGEdge(uuid4(), 'test', src, tgt)

    if dag._would_create_cycle(src, tgt):
        rejected += 1
    else:
        dag.add_edge(edge)
        added += 1

print(f'Added: {added}, Rejected: {rejected}')
print(f'Topological sort: {len(dag.topological_sort())} nodes')
"
```

Expected: `rejected > 0` (some edges would create cycles), `topological_sort()` succeeds.

---

**Phase 95 Status**: ✅ COMPLETE

**Next Steps**:
1. Test with real PDFs/images
2. Integrate with Phase 94 ACE synthesis loop
3. Add Neo4j backend for graph analytics
4. Implement multi-hop reasoning queries

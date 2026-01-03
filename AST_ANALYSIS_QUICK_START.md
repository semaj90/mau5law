# AST Analysis Service - Quick Start Guide

**Date:** January 2, 2026
**Phase:** 3 - AST Analysis Integration

---

## Prerequisites

1. **ts-ast-autofixer service running:**
   ```bash
   cd ts-ast-autofixer
   npm install
   npm start
   # Server runs on http://localhost:3002
   # WebSocket runs on ws://localhost:8084
   ```

2. **Neo4j running:**
   ```bash
   # Check Neo4j status
   docker ps | grep neo4j
   # Should see: deeds-neo4j running on port 7687
   ```

3. **PostgreSQL running:**
   ```bash
   # Check PostgreSQL status
   docker ps | grep postgres
   # Should see: phase66-postgres running on port 5434
   ```

---

## Quick Start

### 1. Import and Initialize

```python
from backend.services.multi_db_coordinator import MultiDBCoordinator
from backend.services.ast_analysis_service import ASTAnalysisService

# Initialize coordinator
coordinator = MultiDBCoordinator()
coordinator.connect()

# Initialize AST service
ast_service = ASTAnalysisService(coordinator)
```

### 2. Analyze a File

```python
# Analyze TypeScript file
file_path = "sveltekit-frontend/src/lib/components/ui/Button.svelte"
ast_data = await ast_service.analyze_file(file_path)

print(f"Imports: {len(ast_data.imports)}")
print(f"Exports: {len(ast_data.exports)}")
print(f"Components: {len(ast_data.components)}")
print(f"Functions: {len(ast_data.functions)}")
print(f"Errors: {len(ast_data.errors)}")
```

### 3. Extract Dependency Graph

```python
# Extract dependency graph
graph = await ast_service.extract_dependencies(ast_data)

print(f"Nodes: {len(graph.nodes)}")
print(f"Edges: {len(graph.edges)}")

# Print node types
for node in graph.nodes:
    print(f"  {node.label}: {node.properties.get('name', node.id)}")

# Print relationships
for edge in graph.edges:
    print(f"  {edge.source_id} -{edge.relationship}-> {edge.target_id}")
```

### 4. Store in Neo4j

```python
# Store graph in Neo4j
success = await ast_service.store_graph(graph)

if success:
    print("✅ Graph stored in Neo4j")
else:
    print("❌ Failed to store graph")
```

### 5. Query Dependencies

```python
# Query dependencies (depth 1)
deps = await ast_service.query_dependencies(file_path, depth=1)
print(f"Dependencies: {len(deps.nodes)} nodes")

# Query reverse dependencies
reverse_deps = await ast_service.query_reverse_dependencies(file_path, depth=1)
print(f"Reverse dependencies: {len(reverse_deps.nodes)} nodes")
```

---

## Common Use Cases

### Use Case 1: Analyze All Files in a Directory

```python
import os
import asyncio

async def analyze_directory(directory: str):
    """Analyze all TypeScript/Svelte files in a directory."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    ast_service = ASTAnalysisService(coordinator)

    # Find all files
    files = []
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx', '.js', '.jsx', '.svelte')):
                files.append(os.path.join(root, filename))

    print(f"Found {len(files)} files to analyze")

    # Analyze each file
    for file_path in files:
        try:
            print(f"Analyzing {file_path}...")
            ast_data = await ast_service.analyze_file(file_path)
            graph = await ast_service.extract_dependencies(ast_data)
            await ast_service.store_graph(graph)
            print(f"  ✅ {len(graph.nodes)} nodes, {len(graph.edges)} edges")
        except Exception as e:
            print(f"  ❌ Error: {e}")

    coordinator.disconnect()

# Run
asyncio.run(analyze_directory("sveltekit-frontend/src/lib/components"))
```

### Use Case 2: Find All Errors in Codebase

```python
async def find_all_errors():
    """Find all errors detected by AST analysis."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    # Query Neo4j for all errors
    with coordinator.neo4j_driver.session() as session:
        result = session.run("""
            MATCH (e:Error)
            WHERE e.fixed = false
            RETURN e.filePath, e.errorType, e.message, e.severity, e.lineNumber
            ORDER BY e.severity DESC, e.filePath
        """)

        errors = []
        for record in result:
            errors.append({
                'file': record['e.filePath'],
                'type': record['e.errorType'],
                'message': record['e.message'],
                'severity': record['e.severity'],
                'line': record['e.lineNumber']
            })

    # Print errors
    print(f"\n🔍 Found {len(errors)} errors:\n")
    for error in errors:
        print(f"  [{error['severity']}] {error['file']}:{error['line']}")
        print(f"    {error['type']}: {error['message']}\n")

    coordinator.disconnect()

asyncio.run(find_all_errors())
```

### Use Case 3: Find Circular Dependencies

```python
async def find_circular_dependencies():
    """Find circular dependencies in the codebase."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    with coordinator.neo4j_driver.session() as session:
        result = session.run("""
            MATCH path = (f1:File)-[:IMPORTS*]->(f2:File)
            WHERE f1 = f2
            RETURN path
            LIMIT 10
        """)

        cycles = []
        for record in result:
            path = record['path']
            cycles.append(path)

    print(f"\n🔄 Found {len(cycles)} circular dependencies\n")

    coordinator.disconnect()

asyncio.run(find_circular_dependencies())
```

### Use Case 4: Find Most Connected Components

```python
async def find_hub_components():
    """Find components with most dependencies."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    with coordinator.neo4j_driver.session() as session:
        result = session.run("""
            MATCH (c:Component)
            OPTIONAL MATCH (c)-[:DEPENDS_ON]->(dep)
            OPTIONAL MATCH (dependent)-[:DEPENDS_ON]->(c)
            RETURN c.name, c.filePath,
                   count(DISTINCT dep) as dependencies,
                   count(DISTINCT dependent) as dependents
            ORDER BY dependencies + dependents DESC
            LIMIT 10
        """)

        print("\n🌟 Top 10 Most Connected Components:\n")
        for record in result:
            total = record['dependencies'] + record['dependents']
            print(f"  {record['c.name']} ({record['c.filePath']})")
            print(f"    Dependencies: {record['dependencies']}, Dependents: {record['dependents']}, Total: {total}\n")

    coordinator.disconnect()

asyncio.run(find_hub_components())
```

### Use Case 5: Atomic Multi-DB Storage

```python
async def atomic_ast_storage(file_path: str):
    """Store AST data atomically across multiple databases."""
    coordinator = MultiDBCoordinator()
    coordinator.connect()

    ast_service = ASTAnalysisService(coordinator)

    # Analyze file
    ast_data = await ast_service.analyze_file(file_path)

    # Create transaction
    transaction = coordinator.create_transaction()

    # Add Neo4j operation
    async def store_neo4j(payload):
        graph = await ast_service.extract_dependencies(payload['ast_data'])
        return await ast_service.store_graph(graph)

    async def rollback_neo4j(payload, result):
        with coordinator.neo4j_driver.session() as session:
            session.run("MATCH (f:File {id: $id}) DETACH DELETE f", id=payload['file_path'])

    coordinator.add_operation(
        transaction,
        DatabaseType.NEO4J,
        "store_graph",
        store_neo4j,
        rollback_neo4j,
        {'ast_data': ast_data, 'file_path': file_path}
    )

    # Add PostgreSQL operation (store errors)
    async def store_errors(payload):
        for error in payload['errors']:
            cursor = coordinator.pg_conn.cursor()
            cursor.execute(
                """
                INSERT INTO error_analysis (id, tag_id, error_message, ast_context, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (error.id, None, error.message, {'ast_context': error.ast_context})
            )
        coordinator.pg_conn.commit()
        return len(payload['errors'])

    async def rollback_errors(payload, result):
        for error in payload['errors']:
            cursor = coordinator.pg_conn.cursor()
            cursor.execute("DELETE FROM error_analysis WHERE id = %s", (error.id,))
        coordinator.pg_conn.commit()

    coordinator.add_operation(
        transaction,
        DatabaseType.POSTGRESQL,
        "store_errors",
        store_errors,
        rollback_errors,
        {'errors': ast_data.errors}
    )

    # Execute atomically
    success = await coordinator.execute_transaction(transaction)

    if success:
        print("✅ AST data stored atomically")
    else:
        print("❌ Transaction failed and rolled back")

    coordinator.disconnect()

asyncio.run(atomic_ast_storage("src/lib/components/Button.svelte"))
```

---

## Neo4j Cypher Queries

### Query 1: Find All Files That Import a Specific Module

```cypher
MATCH (f:File)-[r:IMPORTS]->(target:File {path: '/path/to/module.ts'})
RETURN f.path, r.importedSymbols, r.importType
```

### Query 2: Find All Components in a File

```cypher
MATCH (f:File {path: '/path/to/file.svelte'})-[:CONTAINS]->(c:Component)
RETURN c.name, c.type, c.lineNumber, c.props
```

### Query 3: Find All Functions That Call a Specific Function

```cypher
MATCH (fn1:Function)-[:CALLS]->(fn2:Function {name: 'handleClick'})
RETURN fn1.name, fn1.filePath, fn1.lineNumber
```

### Query 4: Find All Errors by Severity

```cypher
MATCH (e:Error)
WHERE e.fixed = false
RETURN e.severity, count(e) as count
ORDER BY count DESC
```

### Query 5: Find Dependency Chain

```cypher
MATCH path = (f1:File {path: '/path/to/start.ts'})-[:IMPORTS*1..5]->(f2:File)
RETURN path
LIMIT 10
```

---

## Testing

### Run Property Tests

```bash
# Run all AST analysis tests
python backend/tests/test_ast_analysis.py

# Run specific test
pytest backend/tests/test_ast_analysis.py::test_ast_graph_consistency_typescript -v -s
```

### Manual Testing

```python
# Test ts-ast-autofixer connection
import aiohttp
import asyncio

async def test_connection():
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:3002/health") as response:
            result = await response.json()
            print(f"ts-ast-autofixer: {result}")

asyncio.run(test_connection())
```

---

## Troubleshooting

### Issue 1: ts-ast-autofixer not responding

**Solution:**
```bash
# Check if service is running
curl http://localhost:3002/health

# If not running, start it
cd ts-ast-autofixer
npm start
```

### Issue 2: Neo4j connection failed

**Solution:**
```bash
# Check Neo4j container
docker ps | grep neo4j

# If not running, start it
docker start deeds-neo4j

# Check logs
docker logs deeds-neo4j
```

### Issue 3: Import path resolution fails

**Solution:**
The current implementation uses simplified path resolution. For production:
1. Use proper module resolution (e.g., TypeScript's module resolution)
2. Handle tsconfig.json path mappings
3. Resolve node_modules imports correctly

### Issue 4: Large files timeout

**Solution:**
```python
# Increase timeout
async with aiohttp.ClientSession() as session:
    async with session.post(
        f"{self.ast_fixer_url}/analyze",
        json={"filePath": file_path},
        timeout=aiohttp.ClientTimeout(total=60),  # Increase to 60 seconds
    ) as response:
        result = await response.json()
```

---

## Performance Tips

1. **Batch Analysis:** Analyze multiple files in parallel using `asyncio.gather()`
2. **Cache Results:** Cache AST data in Redis to avoid re-analysis
3. **Incremental Updates:** Only re-analyze changed files
4. **Neo4j Indexes:** Ensure indexes exist on frequently queried properties
5. **Connection Pooling:** Reuse database connections

---

## Next Steps

1. **Phase 4:** File Analysis Pipeline
   - Comment extraction with ripgrep
   - Pattern search with awk
   - AI analysis with gemma3-legal

2. **Enhancements:**
   - Add support for more languages (Python, Go, Rust)
   - Improve import path resolution
   - Add incremental analysis
   - Add caching layer

3. **Integration:**
   - Wire up with file watcher for automatic analysis
   - Integrate with admin UI for visualization
   - Add to CI/CD pipeline for code quality checks

---

**Status:** Phase 3 Complete ✅
**Last Updated:** January 2, 2026

CREATE (n0:File {id: 0, path: "src/lib/services/enhanced-ingest-integration.ts", imports: 4, exports: 0});
MATCH (a:File {id: 0}), (b) WHERE b.path = "$lib/types" CREATE (a)-[:IMPORTS]->(b);
MATCH (a:File {id: 0}), (b) WHERE b.path = "$lib/stores/ai-agent" CREATE (a)-[:IMPORTS]->(b);
MATCH (a:File {id: 0}), (b) WHERE b.path = "svelte/store" CREATE (a)-[:IMPORTS]->(b);
MATCH (a:File {id: 0}), (b) WHERE b.path = "$lib/types/ingest" CREATE (a)-[:IMPORTS]->(b)
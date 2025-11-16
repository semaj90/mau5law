// tools/qdrant-import-codemods.ts
import * as fs from 'node:fs';
import { QdrantClient } from '@qdrant/js-client-rest';

const INPUT = process.argv[2] ?? 'logs/codemod-memories-embedded.jsonl';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const COLLECTION_NAME = 'codemod_memories';

interface EmbeddedCodemodMemory {
  id: string;
  embedding: number[];
  timestamp: string;
  errorKey: string;
  code: string;
  message: string;
  count: number;
  priority?: string;
  framework?: string;
  content: string;
  tags: string[];
  embedding_model?: string;
  source?: string;
  // optional enrichments:
  langextract?: any;
  codebase_path?: string;
  minio_key?: string;
  doc_url?: string;
  summary_short?: string;
}

async function createCollectionIfNotExists(client: QdrantClient) {
  console.log('📋 Ensuring Qdrant collection exists...');

  try {
    await client.getCollection(COLLECTION_NAME);
    console.log('✅ Collection already exists');
  } catch (error) {
    console.log('📝 Creating collection...');
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 768,
        distance: 'Cosine',
      },
    });
    console.log('✅ Collection created');
  }
}

async function importToQdrant() {
  if (!fs.existsSync(INPUT)) {
    console.error('❌ Embedded codemod memories file not found:', INPUT);
    process.exit(1);
  }

  const client = new QdrantClient({ url: QDRANT_URL });

  try {
    console.log('📥 Reading embedded memories from', INPUT);
    const lines = fs.readFileSync(INPUT, 'utf8').split(/\r?\n/);
    const memories: EmbeddedCodemodMemory[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const mem: EmbeddedCodemodMemory = JSON.parse(line);
      if (!Array.isArray(mem.embedding)) continue;
      memories.push(mem);
    }

    console.log(`📊 Processing ${memories.length} memories for Qdrant import`);

    await createCollectionIfNotExists(client);

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      const points = batch.map(mem => ({
        id: mem.id,
        vector: mem.embedding,
        payload: {
          error_code: mem.code,
          error_key: mem.errorKey,
          message: mem.message,
          occurrence_count: mem.count,
          priority: mem.priority ?? null,
          framework: mem.framework ?? null,
          source: mem.source ?? null,
          tags: mem.tags ?? [],
          content: mem.content,
          langextract: mem.langextract ?? {},
          timestamp: mem.timestamp,
          embedding_model: mem.embedding_model ?? 'embeddinggemma:latest',
        },
      }));

      await client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });

      console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(memories.length / batchSize)}`);
    }

    console.log('✅ Qdrant import complete');
    console.log('\n🎯 Ready for vector similarity search!');
    console.log('Example query:');
    console.log('POST /collections/codemod_memories/points/search');
    console.log('{ "vector": [...], "limit": 5, "with_payload": true }');
  } catch (error) {
    console.error('❌ Qdrant import failed:', error);
    throw error;
  }
}

importToQdrant().catch(console.error);
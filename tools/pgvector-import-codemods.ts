// tools/pgvector-import-codemods.ts
import * as fs from 'node:fs';
import * as pg from 'pg';

const INPUT = process.argv[2] ?? 'logs/codemod-memories-embedded.jsonl';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5432/legal_ai_db';

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

async function createTableIfNotExists(client: pg.Client) {
  console.log('📋 Ensuring codemod_memories table exists...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS codemod_memories (
      id              uuid PRIMARY KEY,
      error_code      text,
      error_key       text,
      message         text,
      occurrence_count integer,
      priority        text,
      framework       text,
      source          text,
      tags            text[],
      content         text,
      langextract     jsonb,
      embedding       vector(768),
      created_at      timestamptz DEFAULT now()
    );
  `);

  console.log('✅ Table ready');
}

async function importToPgvector() {
  if (!fs.existsSync(INPUT)) {
    console.error('❌ Embedded codemod memories file not found:', INPUT);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

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

    console.log(`📊 Processing ${memories.length} memories for pgvector import`);

    await createTableIfNotExists(client);

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      const values = batch.map((mem, idx) => {
        return `($${idx * 12 + 1}, $${idx * 12 + 2}, $${idx * 12 + 3}, $${idx * 12 + 4}, $${idx * 12 + 5}, $${idx * 12 + 6}, $${idx * 12 + 7}, $${idx * 12 + 8}, $${idx * 12 + 9}, $${idx * 12 + 10}, $${idx * 12 + 11}, $${idx * 12 + 12}::vector(768))`;
      }).join(', ');

      const params = batch.flatMap(mem => [
        mem.id,
        mem.code,
        mem.errorKey,
        mem.message,
        mem.count,
        mem.priority ?? null,
        mem.framework ?? null,
        mem.source ?? null,
        mem.tags ?? [],
        mem.content,
        mem.langextract ?? {},
        `[${mem.embedding.join(',')}]` // pgvector format
      ]);

      const query = `
        INSERT INTO codemod_memories (
          id, error_code, error_key, message, occurrence_count,
          priority, framework, source, tags, content, langextract, embedding
        )
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          message = EXCLUDED.message,
          occurrence_count = EXCLUDED.occurrence_count,
          priority = EXCLUDED.priority,
          framework = EXCLUDED.framework,
          tags = EXCLUDED.tags,
          content = EXCLUDED.content,
          langextract = EXCLUDED.langextract,
          embedding = EXCLUDED.embedding;
      `;

      await client.query(query, params);
      console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(memories.length / batchSize)}`);
    }

    console.log('✅ pgvector import complete');
    console.log('\n🎯 Ready for vector similarity search!');
    console.log('Example query:');
    console.log('SELECT id, error_code, message, occurrence_count');
    console.log('FROM codemod_memories');
    console.log('ORDER BY embedding <-> $1::vector');
    console.log('LIMIT 5;');
  } finally {
    await client.end();
  }
}

importToPgvector().catch(console.error);
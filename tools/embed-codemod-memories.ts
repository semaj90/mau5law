// tools/embed-codemod-memories.ts
import * as fs from 'node:fs';
import * as path from 'node:path';

const INPUT_FILE = process.env.CODEMOD_RAG_FILE ?? 'logs/codemod-memories-rag.json';
const OUTPUT_FILE = process.env.CODEMOD_EMBEDDED_FILE ?? 'logs/codemod-memories-embedded.jsonl';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const LANGEXTRACT_URL = process.env.LANGEXTRACT_URL ?? 'http://localhost:9002';

async function extractLanguageFeatures(code: string): Promise<string> {
  try {
    const response = await fetch(`${LANGEXTRACT_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        stream: false, // Assuming non-streaming for simplicity
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ LangExtract API error: ${response.status}`);
      return code; // Fallback to original content
    }

    const data = await response.json();
    // Assuming the response has extracted features, append to original
    const extracted = data.extracted || data.result || '';
    return `${code}\n\n[Language Features]: ${extracted}`;
  } catch (error) {
    console.warn(`⚠️ LangExtract call failed:`, error instanceof Error ? error.message : String(error));
    return code; // Fallback
  }
}

interface Memory {
  id: string;
  timestamp: string;
  errorKey: string;
  code: string;
  message: string;
  count: number;
  content: string;
  source: string;
  tags: string[];
}

interface EmbeddedMemory extends Memory {
  embedding: number[];
  embedding_model: string;
}

async function embedText(text: string): Promise<{embedding: number[], model: string}> {
  // Try embeddinggemma:latest first, fallback to nomic-embed-text
  const models = ['embeddinggemma:latest', 'nomic-embed-text'];

  for (const model of models) {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { embedding: data.embedding, model };
    } catch (error) {
      console.warn(`⚠️ Failed with model ${model}:`, error instanceof Error ? error.message : String(error));
      if (model === models[models.length - 1]) {
        throw error; // Last model failed
      }
    }
  }

  throw new Error('All embedding models failed');
}

async function main() {
  console.log('🚀 Starting memory embedding...');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  console.log(`📖 Reading memories from: ${INPUT_FILE}`);

  const inputContent = fs.readFileSync(INPUT_FILE, 'utf8');
  const memories: Memory[] = inputContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  console.log(`📊 Found ${memories.length} memories to embed`);

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const output = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

  let embedded = 0;
  let failed = 0;

  for (const memory of memories) {
    try {
      console.log(`🔄 Processing memory ${embedded + 1}/${memories.length}: ${memory.code} (${memory.content.length} chars)`);

      // Extract language features if content contains code
      let enhancedContent = memory.content;
      if (memory.content.includes('```') || memory.tags.some(tag => tag.includes('code') || tag.includes('typescript'))) {
        console.log(`🧠 Extracting language features...`);
        enhancedContent = await extractLanguageFeatures(memory.content);
      }

      const { embedding, model } = await embedText(enhancedContent);

      const embeddedMemory: EmbeddedMemory = {
        ...memory,
        embedding,
        embedding_model: model,
      };

      output.write(JSON.stringify(embeddedMemory) + '\n');
      embedded++;

      // Small delay to avoid overwhelming Ollama
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Failed to embed memory ${memory.id}:`, error);
      failed++;
    }
  }

  output.end();

  console.log(`\n✅ Embedding complete!`);
  console.log(`📊 Results:`);
  console.log(`   Embedded: ${embedded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`💾 Saved to: ${OUTPUT_FILE}`);

  if (embedded > 0) {
    console.log(`\n🎯 Ready for vector search!`);
    console.log(`Next: Load into Qdrant/pgvector for semantic search`);
  }
}

if (process.argv[1] && path.normalize(process.argv[1]) === path.normalize(process.argv[1])) {
  main().catch(error => {
    console.error('💥 Embedding failed:', error);
    process.exit(1);
  });
}
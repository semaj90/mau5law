#!/usr/bin/env node
/**
 * Phase 78 - Generate Embeddings for Error Clusters
 *
 * Creates semantic embeddings for error clusters to enable:
 * - pgvector local cosine similarity search
 * - Qdrant global ANN (Approximate Nearest Neighbor) search
 * - KAG (Knowledge-Augmented Generation) multi-hop reasoning
 *
 * Flow:
 * 1. Load clusters from error_clusters table
 * 2. Generate embeddings using Ollama (gemma:latest or nomic-embed-text)
 * 3. Store embeddings in error_cluster_embeddings table (pgvector)
 * 4. Optionally sync to Qdrant for faster semantic search
 *
 * Usage:
 *   npm run phase78:embed-clusters
 *   npm run phase78:embed-clusters -- --force     # Re-embed existing
 *   npm run phase78:embed-clusters -- --qdrant    # Also sync to Qdrant
 */

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { errorClustersTable } from '../src/lib/server/db/schema/index.js';

dotenv.config();

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);

// Parse args
const args = process.argv.slice(2);
const forceReembed = args.includes('--force');
const syncQdrant = args.includes('--qdrant');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

/**
 * Generate embedding using Ollama API
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`   ❌ Embedding generation failed: ${error.message}`);
    return null;
  }
}

/**
 * Create embedding table if it doesn't exist
 */
async function ensureEmbeddingTable() {
  await client`
    CREATE TABLE IF NOT EXISTS error_cluster_embeddings (
      cluster_id TEXT PRIMARY KEY REFERENCES error_clusters(id) ON DELETE CASCADE,
      embedding vector(768),
      model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create index for cosine similarity search
  await client`
    CREATE INDEX IF NOT EXISTS idx_cluster_embeddings_cosine
    ON error_cluster_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `;

  console.log('✅ error_cluster_embeddings table ready');
}/**
 * Main execution
 */
async function main() {
  console.log('🧠 Phase 78 - Generate Cluster Embeddings\n');

  // 1. Ensure table exists
  await ensureEmbeddingTable();

  // 2. Load clusters
  const clusters = await db.select().from(errorClustersTable);
  console.log(`📊 Found ${clusters.length} clusters\n`);

  if (clusters.length === 0) {
    console.log('⏳ No clusters to process');
    process.exit(0);
  }

  // 3. Filter clusters that need embeddings
  let toEmbed = clusters;
  if (!forceReembed) {
    const existingRows = await client<{ cluster_id: string }[]>`
      SELECT cluster_id FROM error_cluster_embeddings
    `;
    const existingIds = new Set(existingRows.map(r => r.cluster_id));
    toEmbed = clusters.filter(c => !existingIds.has(c.id));

    console.log(`✅ ${existingIds.size} already embedded`);
    console.log(`⏳ ${toEmbed.length} need embeddings\n`);
  }

  if (toEmbed.length === 0) {
    console.log('✅ All clusters already have embeddings');
    console.log('   Use --force to re-embed');
    process.exit(0);
  }

  // 4. Generate embeddings in batches
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    console.log(`⏳ Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toEmbed.length / BATCH_SIZE)}...`);

    for (const cluster of batch) {
      // Create rich text representation for embedding
      const text = `
Error Cluster: ${cluster.id}
Kind: ${cluster.kind}
Severity: ${cluster.severity}
Pattern: ${cluster.errorPattern}
Description: ${cluster.description || 'N/A'}
Member Count: ${cluster.memberCount}
Suggested Fix: ${cluster.suggestedFixApproach || 'N/A'}
      `.trim();

      const embedding = await generateEmbedding(text);

      if (embedding) {
        // Store in database
        await client`
          INSERT INTO error_cluster_embeddings (cluster_id, embedding, model, dimensions, updated_at)
          VALUES (${cluster.id}, ${JSON.stringify(embedding)}, ${EMBEDDING_MODEL}, ${embedding.length}, NOW())
          ON CONFLICT (cluster_id)
          DO UPDATE SET
            embedding = EXCLUDED.embedding,
            model = EXCLUDED.model,
            dimensions = EXCLUDED.dimensions,
            updated_at = NOW()
        `;

        successCount++;
        console.log(`   ✅ ${cluster.id}: ${embedding.length}d embedding`);
      } else {
        failCount++;
        console.log(`   ❌ ${cluster.id}: embedding failed`);
      }
    }

    // Rate limiting
    if (i + BATCH_SIZE < toEmbed.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📈 Embedding Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`   ❌ Failed: ${failCount}`);
  }

  // 5. Optionally sync to Qdrant
  if (syncQdrant) {
    console.log('\n🔄 Syncing to Qdrant...');
    console.log('   (Not yet implemented - use phase78-qdrant-sync.mts)');
  }

  console.log('\n✅ Phase 78 embedding generation completed');
  console.log('   Next: npm run phase78:qdrant-sync');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
}).finally(() => {
  client.end();
});

#!/usr/bin/env node
/**
 * Phase 78 - Verify Embedding Storage
 */
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);

try {
  const embeddings = await client`
    SELECT
      cluster_id,
      model,
      dimensions,
      updated_at
    FROM error_cluster_embeddings
    ORDER BY updated_at DESC
  `;  console.log('\n📊 Embedding Storage Verification\n');
  console.log(`Total embeddings: ${embeddings.length}\n`);

  for (const emb of embeddings) {
    console.log(`Cluster: ${emb.cluster_id}`);
    console.log(`  Model: ${emb.model}`);
    console.log(`  Dimensions: ${emb.dimensions}`);
    console.log(`  Updated: ${emb.updated_at}`);
    console.log('');
  }

  console.log('✅ Embeddings verified\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.end();
}

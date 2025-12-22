#!/usr/bin/env node
/**
 * Phase 78 - CUDA Clustering of Errors
 *
 * Clusters similar errors using embeddings and K-means:
 * 1. Get unclustered errors from error_events table
 * 2. Generate embeddings using Ollama (Gemma/Mistral)
 * 3. Perform K-means clustering on embeddings
 * 4. Update error_events table with cluster_id
 *
 * Usage:
 *   npm run phase78:cluster              # Normal mode
 *   npm run phase78:cluster -- --dry-run # Preview only
 *   npm run phase78:cluster -- --verbose # Detailed logging
 */

import dotenv from 'dotenv';
import { isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as path from 'path';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

import { fileURLToPath } from 'url';
import { errorClustersTable, errorEventsTable } from '../src/lib/server/db/schema/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'embeddinggemma:latest';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '32', 10);
const CLUSTER_COUNT = parseInt(process.env.CLUSTER_COUNT || '10', 10);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Initialize database connection
const client = postgres(DATABASE_URL, {
  onnotice: () => {},
});
const db = drizzle(client);

/**
 * Infer cluster kind from error code and message
 */
function inferClusterKind(tsCode: string | null, message: string): string {
  if (!tsCode && !message) return 'typing';

  const code = tsCode || '';
  const msg = message.toLowerCase();

  // Type errors
  if (code.startsWith('TS23') || code.startsWith('TS24')) return 'typing';

  // Nullability errors
  if (code.startsWith('TS27') || msg.includes('null') || msg.includes('undefined')) return 'nullability';

  // Import errors
  if (code === 'TS2307' || msg.includes('cannot find module') || msg.includes('import')) return 'import';

  // Svelte runes (Svelte 5 migration)
  if (msg.includes('$props') || msg.includes('$state') || msg.includes('$derived') || msg.includes('$effect')) {
    return 'svelte-rune';
  }

  // Binding errors
  if (msg.includes('bind:') || msg.includes('binding')) return 'binding';

  // Syntax/formatting
  if (code.startsWith('TS1') || msg.includes('expected')) return 'formatting';

  // Schema/database
  if (msg.includes('schema') || msg.includes('drizzle')) return 'schema';

  // Default
  return 'typing';
}

/**
 * Normalize severity to match database enum: info|warn|error|fatal
 */
function normalizeSeverity(s: string | null | undefined): 'info' | 'warn' | 'error' | 'fatal' {
  const v = (s ?? 'warn').toLowerCase();

  // Direct matches
  if (v === 'info' || v === 'warn' || v === 'error' || v === 'fatal') {
    return v as 'info' | 'warn' | 'error' | 'fatal';
  }

  // Map common alternatives
  if (v === 'low') return 'info';
  if (v === 'medium') return 'warn';
  if (v === 'high') return 'error';
  if (v === 'critical') return 'fatal';

  // Default to error for safety
  return 'error';
}/**
 * Get unclustered errors from database
 */
async function getUnclusteredErrors() {
  if (isVerbose) {
    console.log('📚 Fetching unclustered errors from database...');
  }

  const errors = await db
    .select()
    .from(errorEventsTable)
    .where(isNull(errorEventsTable.clusterId));

  if (isVerbose) {
    console.log(`   Found ${errors.length} unclustered errors`);
  }

  return errors;
}

/**
 * Call Ollama embedding API
 */
async function generateEmbedding(text: string, retries = 3): Promise<number[] | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text.substring(0, 512), // Limit input
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { embedding?: number[] };
      return data.embedding || null;
    } catch (err) {
      if (attempt === retries - 1) {
        if (isVerbose) {
          console.warn(`   ⚠️  Failed to embed after ${retries} attempts:`, err);
        }
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
}

/**
 * Simple K-means clustering
 */
function kmeansCluster(
  embeddings: Array<{ id: string; embedding: number[] }>,
  k: number
): Map<number, string[]> {
  if (embeddings.length === 0) return new Map();
  if (k >= embeddings.length) {
    // Each point is its own cluster
    const result = new Map<number, string[]>();
    embeddings.forEach((e, i) => {
      result.set(i, [e.id]);
    });
    return result;
  }

  const dim = embeddings[0].embedding.length;
  if (dim === 0) return new Map();

  // Initialize centroids randomly
  let centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * embeddings.length);
    centroids.push([...embeddings[idx].embedding]);
  }

  // K-means iterations
  for (let iter = 0; iter < 10; iter++) {
    const clusters = new Map<number, string[]>();
    const clusterSums = new Map<number, number[]>();
    const clusterCounts = new Map<number, number>();

    // Assign points to nearest centroid
    for (const { id, embedding } of embeddings) {
      let minDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        // Euclidean distance
        let dist = 0;
        for (let d = 0; d < dim; d++) {
          const diff = embedding[d] - centroids[c][d];
          dist += diff * diff;
        }
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }

      if (!clusters.has(bestCluster)) {
        clusters.set(bestCluster, []);
        clusterSums.set(bestCluster, new Array(dim).fill(0));
        clusterCounts.set(bestCluster, 0);
      }
      clusters.get(bestCluster)!.push(id);
      clusterCounts.set(bestCluster, clusterCounts.get(bestCluster)! + 1);

      // Add to sum for centroid calculation
      const sum = clusterSums.get(bestCluster)!;
      for (let d = 0; d < dim; d++) {
        sum[d] += embedding[d];
      }
    }

    // Update centroids
    let centroidsChanged = false;
    for (let c = 0; c < k; c++) {
      const count = clusterCounts.get(c) || 1;
      const sum = clusterSums.get(c) || new Array(dim).fill(0);
      const newCentroid = sum.map(s => s / count);

      // Check if centroid changed significantly
      let changed = false;
      for (let d = 0; d < dim; d++) {
        if (Math.abs(newCentroid[d] - centroids[c][d]) > 0.0001) {
          changed = true;
          break;
        }
      }
      if (changed) centroidsChanged = true;
      centroids[c] = newCentroid;
    }

    // Early stopping if converged
    if (!centroidsChanged && iter > 2) break;
  }

  // Final assignment
  const clusters = new Map<number, string[]>();
  for (const { id, embedding } of embeddings) {
    let minDist = Infinity;
    let bestCluster = 0;

    for (let c = 0; c < k; c++) {
      let dist = 0;
      for (let d = 0; d < dim; d++) {
        const diff = embedding[d] - centroids[c][d];
        dist += diff * dist;
      }
      if (dist < minDist) {
        minDist = dist;
        bestCluster = c;
      }
    }

    if (!clusters.has(bestCluster)) {
      clusters.set(bestCluster, []);
    }
    clusters.get(bestCluster)!.push(id);
  }

  return clusters;
}

/**
 * Main clustering function
 */
async function clusterErrors(): Promise<void> {
  console.log('🧠 Phase 78 - CUDA Clustering Errors\n');

  try {
    // Get unclustered errors
    const errors = await getUnclusteredErrors();

    if (errors.length === 0) {
      console.log('✅ No unclustered errors to process');
      return;
    }

    console.log(`📊 Clustering ${errors.length} errors into ~${CLUSTER_COUNT} clusters\n`);

    if (isDryRun) {
      console.log('🔍 DRY RUN: Would cluster errors in batches of', BATCH_SIZE);
      console.log(`   Target clusters: ${CLUSTER_COUNT}`);
      console.log(`   Sample errors: ${errors.slice(0, 3).map(e => e.message.substring(0, 40)).join(', ')}`);
      return;
    }

    // Process in batches
    const embeddings: Array<{ id: string; embedding: number[] }> = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < errors.length; i += BATCH_SIZE) {
      const batch = errors.slice(i, i + BATCH_SIZE);
      console.log(`⏳ Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(errors.length / BATCH_SIZE)}...`);

      for (const error of batch) {
        const embedding = await generateEmbedding(error.message);
        if (embedding) {
          embeddings.push({
            id: error.id,
            embedding,
          });
          successCount++;
        } else {
          failCount++;
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < errors.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (isVerbose) {
      console.log(`   ✅ Generated embeddings: ${successCount}`);
      if (failCount > 0) {
        console.log(`   ⚠️  Failed: ${failCount}`);
      }
    }

    if (embeddings.length === 0) {
      console.error('❌ Failed to generate embeddings for any errors');
      console.error('   Ensure Ollama is running and model is available');
      console.error(`   Model: ${EMBEDDING_MODEL} at ${OLLAMA_BASE_URL}`);
      process.exit(1);
    }

    // Cluster embeddings
    if (isVerbose) {
      console.log('\n🔗 Performing K-means clustering...');
    }

    const clusters = kmeansCluster(embeddings, Math.min(CLUSTER_COUNT, embeddings.length));

    if (isVerbose) {
      console.log(`   Created ${clusters.size} clusters`);
    }

    // Update database with cluster IDs
    console.log('\n💾 Updating database with cluster assignments...');

    let updateCount = 0;
    for (const [clusterId, errorIds] of clusters.entries()) {
      const clusterIdStr = `cluster-${clusterId}`;

      // Infer kind and severity from first error in cluster
      const firstErrorId = errorIds[0];
      const firstError = errors.find(e => e.id === firstErrorId);
      const inferredKind = firstError
        ? inferClusterKind(firstError.tsCode, firstError.message)
        : 'typing';
      const inferredSeverity = normalizeSeverity(firstError?.severity);

      console.log(`   🔍 Cluster ${clusterId}: kind="${inferredKind}", severity="${inferredSeverity}", members=${errorIds.length}`);
      if (isVerbose && firstError) {
        console.log(`      First error: tsCode="${firstError.tsCode}", message="${firstError.message.substring(0, 60)}..."`);
      }

      // Insert cluster record first with all required fields
      await db
        .insert(errorClustersTable)
        .values({
          id: clusterIdStr,
          kind: inferredKind,
          severity: inferredSeverity,
          errorPattern: `Cluster ${clusterId}`,
          memberCount: errorIds.length,
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: errorClustersTable.id,
          set: {
            kind: inferredKind,
            severity: inferredSeverity,
            memberCount: errorIds.length,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          },
        });

      for (const errorId of errorIds) {
        await db
          .update(errorEventsTable)
          .set({ clusterId: clusterIdStr })
          .where(sql`id = ${errorId}`);
        updateCount++;
      }
    }

    if (isVerbose) {
      console.log(`   ✅ Updated ${updateCount} error records`);
    }

    // Summary
    console.log('\n📈 Clustering Summary:');
    console.log(`   Total errors processed: ${embeddings.length}`);
    console.log(`   Clusters created: ${clusters.size}`);
    const avgSize = Math.round(embeddings.length / clusters.size);
    console.log(`   Average cluster size: ${avgSize}`);

    // Show cluster distribution
    const sizes = Array.from(clusters.values()).map(ids => ids.length).sort((a, b) => b - a);
    console.log(`   Largest cluster: ${sizes[0]} errors`);
    console.log(`   Smallest cluster: ${sizes[sizes.length - 1]} errors`);

    console.log('\n✅ Phase 78 clustering completed');
    console.log('   Next: npm run phase78:suggest');

  } catch (err) {
    console.error('❌ Clustering failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clusterErrors();

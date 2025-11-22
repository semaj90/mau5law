#!/usr/bin/env ts-node
/**
 * Qdrant Clustering Payload Migration
 * Adds cluster metadata fields to all statute vectors
 */

import fetch from 'node-fetch';

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const COLLECTION = 'statutes';
const BATCH_SIZE = 256;

interface QdrantPoint {
  id: string | number;
  payload?: Record<string, any>;
  vector?: number[];
}

interface QdrantResponse {
  result?: {
    points: QdrantPoint[];
    next_page_offset?: string | number | null;
  };
}

async function migrate() {
  let offset: string | number | null = null;
  let totalUpdated = 0;

  console.log(`🚀 Starting Qdrant migration for clustering payloads...`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log('');

  try {
    while (true) {
      const searchBody: any = {
        limit: BATCH_SIZE,
        with_payload: true,
        with_vector: false,
      };

      if (offset !== null) {
        searchBody.offset = offset;
      }

      console.log(`📖 Fetching batch (offset: ${offset ?? 0})...`);

      const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/scroll`, {
        method: 'POST',
        body: JSON.stringify(searchBody),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Qdrant error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as QdrantResponse;
      const points = data.result?.points ?? [];

      if (!points.length) {
        console.log('✅ No more points to migrate');
        break;
      }

      // Prepare updates with clustering fields
      const updates = points.map((p: QdrantPoint) => {
        const payload = p.payload ?? {};

        return {
          id: p.id,
          payload: {
            ...payload,
            som_cluster_id:
              typeof payload.som_cluster_id === 'number' ? payload.som_cluster_id : -1,
            kmeans_label:
              typeof payload.kmeans_label === 'string' ? payload.kmeans_label : 'Unclustered',
            cluster_confidence:
              typeof payload.cluster_confidence === 'number' ? payload.cluster_confidence : 0.0,
            flagged_for_review:
              typeof payload.flagged_for_review === 'boolean'
                ? payload.flagged_for_review
                : false,
            echo_hits: typeof payload.echo_hits === 'number' ? payload.echo_hits : 0,
            cluster_version:
              typeof payload.cluster_version === 'number' ? payload.cluster_version : 0,
          },
        };
      });

      // Send updates
      if (updates.length) {
        console.log(`   Updating ${updates.length} points...`);

        const updateRes = await fetch(
          `${QDRANT_URL}/collections/${COLLECTION}/points/payload`,
          {
            method: 'POST',
            body: JSON.stringify({
              points: updates,
            }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!updateRes.ok) {
          throw new Error(`Update error: ${updateRes.status} ${updateRes.statusText}`);
        }

        totalUpdated += updates.length;
        console.log(`   ✓ Updated ${updates.length} points (total: ${totalUpdated})`);
      }

      // Check for next page
      offset = data.result?.next_page_offset ?? null;
      if (offset === null) {
        break;
      }
    }

    console.log('');
    console.log(`✅ Migration complete!`);
    console.log(`   Total points updated: ${totalUpdated}`);
    console.log(`   Clustering fields added:`);
    console.log(`   - som_cluster_id (default: -1)`);
    console.log(`   - kmeans_label (default: "Unclustered")`);
    console.log(`   - cluster_confidence (default: 0.0)`);
    console.log(`   - flagged_for_review (default: false)`);
    console.log(`   - echo_hits (default: 0)`);
    console.log(`   - cluster_version (default: 0)`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

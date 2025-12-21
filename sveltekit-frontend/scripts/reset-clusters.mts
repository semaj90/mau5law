#!/usr/bin/env node
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);

try {
  // Clear cluster assignments
  await client`UPDATE error_events SET cluster_id = NULL`;
  console.log('✅ Cleared cluster assignments');

  // Delete existing clusters
  await client`DELETE FROM error_clusters`;
  console.log('✅ Deleted existing clusters');

  console.log('\n🔄 Run npm run phase78:cluster to re-cluster with kind inference\n');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.end();
}

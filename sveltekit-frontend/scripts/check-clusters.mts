#!/usr/bin/env node
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { errorClustersTable } from '../src/lib/server/db/schema/index.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

try {
  const clusters = await db.select().from(errorClustersTable);

  console.log('\n📊 Error Clusters Status:\n');
  console.log(`Total clusters: ${clusters.length}\n`);

  for (const cluster of clusters) {
    console.log(`Cluster: ${cluster.id}`);
    console.log(`  Kind: ${cluster.kind || '❌ NULL'}`);
    console.log(`  Severity: ${cluster.severity}`);
    console.log(`  Members: ${cluster.memberCount}`);
    console.log(`  Pattern: ${cluster.errorPattern}`);
    console.log('');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.end();
}

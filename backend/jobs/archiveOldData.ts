import { initializePool, getDb, closePool } from '../db/pool';
import { errorCluster, errorClusterArchive, routeHealthEvent, routeHealthEventArchive } from '../db/schema';
import { lt, isNotNull, and, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Archive old data to keep the main tables light.
 * - Moves resolved error clusters older than 30 days to archive.
 * - Moves health events older than 30 days to archive.
 */
async function archiveOldData() {
  console.log('Starting data archival job...');

  try {
    // Initialize DB
    initializePool();
    const db = getDb();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log(`Archiving data older than: ${thirtyDaysAgo.toISOString()}`);

    // 1. Archive Error Clusters
    // Find resolved errors older than 30 days
    const errorsToArchive = await db.select().from(errorCluster).where(
      and(
        isNotNull(errorCluster.resolvedAt),
        lt(errorCluster.resolvedAt, thirtyDaysAgo)
      )
    );

    if (errorsToArchive.length > 0) {
      console.log(`Archiving ${errorsToArchive.length} error clusters...`);

      // Insert into archive
      await db.insert(errorClusterArchive).values(
        errorsToArchive.map(e => ({
          ...e,
          archivedAt: new Date()
        }))
      );

      // Delete from main table
      for (const error of errorsToArchive) {
        await db.delete(errorCluster).where(sql`${errorCluster.id} = ${error.id}`);
      }

      console.log('Error clusters archived successfully.');
    } else {
      console.log('No error clusters to archive.');
    }

    // 2. Archive Health Events
    // Find events older than 30 days
    const eventsToArchive = await db.select().from(routeHealthEvent).where(
      lt(routeHealthEvent.createdAt, thirtyDaysAgo)
    );

    if (eventsToArchive.length > 0) {
      console.log(`Archiving ${eventsToArchive.length} health events...`);

      await db.insert(routeHealthEventArchive).values(
        eventsToArchive.map(e => ({
          ...e,
          archivedAt: new Date()
        }))
      );

      for (const event of eventsToArchive) {
        await db.delete(routeHealthEvent).where(sql`${routeHealthEvent.id} = ${event.id}`);
      }

      console.log('Health events archived successfully.');
    } else {
      console.log('No health events to archive.');
    }

  } catch (error) {
    console.error('Error during archival job:', error);
    process.exit(1);
  } finally {
    await closePool();
  }

  console.log('Data archival job completed.');
  process.exit(0);
}

// Run if called directly
// Check if this module is the main module being run
// In Node.js ESM, import.meta.url can be compared to process.argv[1] but it's tricky
// For simplicity in this environment, we'll just export it and assume a runner calls it
// or we can add a simple check if we were using CommonJS: if (require.main === module)
// Since we are likely in a mixed environment, I'll add a self-execution block that works if imported as a script

archiveOldData().catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
});

export { archiveOldData };

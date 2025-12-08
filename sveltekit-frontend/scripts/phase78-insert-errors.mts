#!/usr/bin/env node
/**
 * Phase 78 - Insert Errors into Database
 *
 * Takes output from phase78-collect-errors and inserts into:
 * - error_events table (individual error occurrences)
 * - route_health table (aggregate health per route)
 *
 * Usage:
 *   npm run phase78:insert              # Normal mode
 *   npm run phase78:insert -- --dry-run # Preview what would be inserted
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { errorEventsTable, routeHealthTable } from '../src/lib/server/db/schema/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Initialize database connection
const client = postgres(DATABASE_URL, {
  onnotice: () => {}, // Suppress notices
});
const db = drizzle(client);

interface ErrorEntry {
  routePath: string;
  filePath: string;
  tsCode?: string;
  severity: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  stack?: string;
  clusterId?: string;
  metaJson?: Record<string, unknown>;
}

interface RouteHealthUpdate {
  routePath: string;
  filePath: string;
  errorState: 'healthy' | 'flaky' | 'broken';
  recentErrorCount: number;
  lastErrorAt: Date;
  lastErrorMessageShort: string;
}

/**
 * Load error events from the JSON file created by phase78-collect-errors
 * Expected to be in logs/phase78-errors.json
 */
async function loadErrorEventsFromFile(): Promise<ErrorEntry[]> {
  const errorFile = path.join(process.cwd(), 'logs', 'phase78-errors.json');

  if (!fs.existsSync(errorFile)) {
    if (isVerbose) {
      console.log(`⚠️  Error file not found at ${errorFile}`);
      console.log('   Run: npm run phase78:collect-errors first');
    }
    return [];
  }

  try {
    const content = fs.readFileSync(errorFile, 'utf-8');
    const data = JSON.parse(content);

    if (isVerbose) {
      console.log(`✅ Loaded ${data.errors?.length || 0} errors from ${errorFile}`);
    }

    return data.errors || [];
  } catch (err) {
    console.error(`❌ Failed to parse ${errorFile}:`, err);
    return [];
  }
}

/**
 * Group errors by route to calculate health states
 */
function groupErrorsByRoute(errors: ErrorEntry[]): Map<string, ErrorEntry[]> {
  const groups = new Map<string, ErrorEntry[]>();

  for (const error of errors) {
    const route = error.routePath;
    if (!groups.has(route)) {
      groups.set(route, []);
    }
    groups.get(route)!.push(error);
  }

  return groups;
}

/**
 * Determine health state based on error count
 */
function determineHealthState(errorCount: number): 'healthy' | 'flaky' | 'broken' {
  if (errorCount === 0) return 'healthy';
  if (errorCount < 5) return 'flaky';
  return 'broken';
}

/**
 * Insert errors into the database
 */
async function insertErrors(errors: ErrorEntry[]): Promise<void> {
  if (errors.length === 0) {
    console.log('ℹ️  No errors to insert');
    return;
  }

  if (isDryRun) {
    console.log(`🔍 DRY RUN: Would insert ${errors.length} errors and update route health`);
    console.log('\nSample errors:');
    errors.slice(0, 3).forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.tsCode}] ${e.message.substring(0, 60)}... (${e.routePath})`);
    });
    if (errors.length > 3) {
      console.log(`  ... and ${errors.length - 3} more`);
    }
    return;
  }

  try {
    // Insert error events
    if (isVerbose) {
      console.log(`📝 Inserting ${errors.length} error events...`);
    }

    const insertedErrors: typeof errorEventsTable.$inferSelect[] = [];

    for (const error of errors) {
      const [insertedError] = await db
        .insert(errorEventsTable)
        .values({
          routePath: error.routePath,
          filePath: error.filePath,
          tsCode: error.tsCode,
          severity: error.severity,
          message: error.message,
          stack: error.stack,
          clusterId: error.clusterId,
          metaJson: error.metaJson ? JSON.stringify(error.metaJson) : null,
        })
        .returning();

      insertedErrors.push(insertedError);
    }

    if (isVerbose) {
      console.log(`✅ Inserted ${insertedErrors.length} error events`);
    }

    // Update route health
    const routeGroups = groupErrorsByRoute(errors);
    let healthUpdatesCount = 0;

    for (const [routePath, routeErrors] of routeGroups.entries()) {
      const errorCount = routeErrors.length;
      const healthState = determineHealthState(errorCount);
      const lastError = routeErrors[routeErrors.length - 1];
      const lastErrorMessageShort = lastError.message.substring(0, 200);

      // Check if route health record exists
      const existing = await db
        .select()
        .from(routeHealthTable)
        .where(eq(routeHealthTable.routePath, routePath))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(routeHealthTable)
          .set({
            errorState: healthState,
            recentErrorCount: errorCount,
            lastErrorAt: new Date(),
            lastErrorMessageShort: lastErrorMessageShort,
            updatedAt: new Date(),
          })
          .where(eq(routeHealthTable.routePath, routePath));
      } else {
        // Create new record
        await db.insert(routeHealthTable).values({
          routePath,
          filePath: lastError.filePath,
          errorState: healthState,
          recentErrorCount: errorCount,
          lastErrorAt: new Date(),
          lastErrorMessageShort: lastErrorMessageShort,
        });
      }

      healthUpdatesCount++;
    }

    if (isVerbose) {
      console.log(`✅ Updated ${healthUpdatesCount} route health records`);
    }

    // Summary
    const healthStates = {
      healthy: 0,
      flaky: 0,
      broken: 0,
    };

    for (const [, routeErrors] of routeGroups.entries()) {
      const state = determineHealthState(routeErrors.length);
      healthStates[state]++;
    }

    console.log('\n📊 Error Insert Summary:');
    console.log(`   Total errors inserted: ${errors.length}`);
    console.log(`   Routes affected: ${routeGroups.size}`);
    console.log(`   ✅ Healthy: ${healthStates.healthy}`);
    console.log(`   ⚠️  Flaky: ${healthStates.flaky}`);
    console.log(`   ❌ Broken: ${healthStates.broken}`);

  } catch (err) {
    console.error('❌ Failed to insert errors:', err);
    throw err;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Phase 78 - Insert Errors into Database\n');

  try {
    const errors = await loadErrorEventsFromFile();
    await insertErrors(errors);

    if (!isDryRun) {
      console.log('\n✅ Phase 78 insert completed successfully');
      console.log('   Next: npm run phase78:cluster');
    }

  } catch (err) {
    console.error('❌ Phase 78 insert failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

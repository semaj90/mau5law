#!/usr/bin/env node
/**
 * Phase 78 - Generate LLM-Based Fix Suggestions
 *
 * Generates fix suggestions for clustered errors:
 * 1. Get clustered errors without suggestions
 * 2. Group by cluster_id
 * 3. Generate summary and fix suggestion using Ollama/Gemma3
 * 4. Assess risk level (low/medium/high)
 * 5. Insert into error_suggestions table
 *
 * Usage:
 *   npm run phase78:suggest              # Normal mode
 *   npm run phase78:suggest -- --dry-run # Preview only
 *   npm run phase78:suggest -- --verbose # Detailed logging
 */

import { eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { errorEventsTable, errorSuggestionsTable } from '../src/lib/server/db/schema/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const SUGGESTION_MODEL = process.env.SUGGESTION_MODEL || 'gemma3:latest';
const TIMEOUT = parseInt(process.env.SUGGESTION_TIMEOUT || '30000', 10);

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

interface ErrorCluster {
  clusterId: string;
  errors: Array<{
    id: string;
    message: string;
    tsCode?: string;
  }>;
}

/**
 * Get clustered errors that don't have suggestions yet
 */
async function getClusteredErrorsWithoutSuggestions(): Promise<ErrorCluster[]> {
  if (isVerbose) {
    console.log('📚 Fetching clustered errors without suggestions...');
  }

  const errors = await db
    .select()
    .from(errorEventsTable)
    .where(isNotNull(errorEventsTable.clusterId));

  // Group by cluster_id
  const clusterMap = new Map<string, ErrorCluster>();

  for (const error of errors) {
    const clusterId = error.clusterId!;
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, {
        clusterId,
        errors: [],
      });
    }
    clusterMap.get(clusterId)!.errors.push({
      id: error.id,
      message: error.message,
      tsCode: error.tsCode || undefined,
    });
  }

  const clusters = Array.from(clusterMap.values());

  if (isVerbose) {
    console.log(`   Found ${clusters.length} clusters with ${errors.length} total errors`);
  }

  return clusters;
}

/**
 * Assess risk level based on error characteristics
 */
function assessRiskLevel(messages: string[], tsCode?: string): 'low' | 'medium' | 'high' {
  const allText = messages.join(' ').toLowerCase();

  // High risk: Runtime, type safety, breaking changes
  const highRiskPatterns = [
    'runtime error',
    'cannot assign',
    'not assignable',
    'type mismatch',
    'null reference',
    'undefined',
    'breaking change',
    'TS2322', // Type assignment error
    'TS2345', // Argument not assignable
  ];

  if (highRiskPatterns.some(p => allText.includes(p) || tsCode?.includes(p))) {
    return 'high';
  }

  // Medium risk: Syntax, structure, style
  const mediumRiskPatterns = [
    'syntax error',
    'expected',
    'unexpected',
    'missing',
    'deprecated',
    'TS1005', // ';' expected
  ];

  if (mediumRiskPatterns.some(p => allText.includes(p) || tsCode?.includes(p))) {
    return 'medium';
  }

  return 'low';
}

/**
 * Generate fix suggestion using LLM
 */
async function generateSuggestion(
  clusterId: string,
  errors: Array<{ message: string; tsCode?: string }>
): Promise<{ summary: string; patch: string; riskLevel: 'low' | 'medium' | 'high' } | null> {
  try {
    // Create prompt for LLM
    const uniqueMessages = Array.from(new Set(errors.map(e => e.message))).slice(0, 5);
    const uniqueCodes = Array.from(new Set(errors.map(e => e.tsCode).filter(Boolean)));

    const prompt = `
You are a TypeScript/JavaScript error fixer. Analyze these errors and provide a concise fix suggestion.

Error Messages:
${uniqueMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

${uniqueCodes.length > 0 ? `Error Codes: ${uniqueCodes.join(', ')}\n` : ''}

Provide your response in this exact format:
SUMMARY: [One-line summary of the fix, under 100 chars]
PATCH: [Code fix or explanation in valid code format, under 200 chars]

Be specific and actionable.
`.trim();

    const response = await Promise.race([
      fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: SUGGESTION_MODEL,
          prompt,
          stream: false,
        }),
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      ),
    ]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as { response?: string };
    const responseText = data.response || '';

    // Parse response
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=\n|$)/i);
    const patchMatch = responseText.match(/PATCH:\s*(.+?)(?=\n|$)/is);

    const summary = summaryMatch?.[1]?.trim() || `Fix cluster ${clusterId}: ${uniqueMessages[0]?.substring(0, 80) || 'unknown error'}`;
    const patch = patchMatch?.[1]?.trim() || 'See error messages for details.';

    if (isVerbose) {
      console.log(`   ✅ Generated suggestion for cluster ${clusterId}`);
    }

    return {
      summary: summary.substring(0, 200),
      patch: patch.substring(0, 500),
      riskLevel: assessRiskLevel(uniqueMessages, uniqueCodes[0]),
    };
  } catch (err) {
    if (isVerbose) {
      console.warn(`   ⚠️  Failed to generate suggestion for cluster ${clusterId}:`, err);
    }
    return null;
  }
}

/**
 * Main suggestion generation function
 */
async function generateSuggestions(): Promise<void> {
  console.log('🤖 Phase 78 - Generate LLM-Based Fix Suggestions\n');

  try {
    const clusters = await getClusteredErrorsWithoutSuggestions();

    if (clusters.length === 0) {
      console.log('✅ No clustered errors without suggestions');
      return;
    }

    console.log(`💡 Generating suggestions for ${clusters.length} error clusters\n`);

    if (isDryRun) {
      console.log('🔍 DRY RUN: Would generate suggestions for:');
      clusters.slice(0, 3).forEach(c => {
        console.log(`   - Cluster ${c.clusterId}: ${c.errors.length} errors`);
      });
      if (clusters.length > 3) {
        console.log(`   ... and ${clusters.length - 3} more clusters`);
      }
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      console.log(`⏳ Processing cluster ${i + 1}/${clusters.length} (${cluster.errors.length} errors)...`);

      const suggestion = await generateSuggestion(cluster.clusterId, cluster.errors);

      if (suggestion) {
        // Insert suggestion for the first error in the cluster
        const firstError = cluster.errors[0];
        const routePath = await db
          .select({ routePath: errorEventsTable.routePath })
          .from(errorEventsTable)
          .where(eq(errorEventsTable.id, firstError.id))
          .limit(1);

        if (routePath.length > 0) {
          await db.insert(errorSuggestionsTable).values({
            routePath: routePath[0].routePath,
            errorEventId: firstError.id,
            clusterId: cluster.clusterId,
            summary: suggestion.summary,
            patch: suggestion.patch,
            riskLevel: suggestion.riskLevel,
          });

          successCount++;
        }
      } else {
        failCount++;
      }

      // Small delay between requests
      if (i < clusters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log('\n📝 Suggestion Generation Summary:');
    console.log(`   Total clusters: ${clusters.length}`);
    console.log(`   Suggestions generated: ${successCount}`);
    if (failCount > 0) {
      console.log(`   Failed: ${failCount}`);
    }

    // Risk distribution
    const riskCounts = { low: 0, medium: 0, high: 0 };
    for (const cluster of clusters) {
      const level = assessRiskLevel(cluster.errors.map(e => e.message), cluster.errors[0].tsCode);
      riskCounts[level]++;
    }

    console.log(`\n   Risk levels:`);
    console.log(`   🟢 Low: ${riskCounts.low}`);
    console.log(`   🟡 Medium: ${riskCounts.medium}`);
    console.log(`   🔴 High: ${riskCounts.high}`);

    console.log('\n✅ Phase 78 suggestion generation completed');
    console.log('   Next: Check results with npm run phase78:check-results');

  } catch (err) {
    console.error('❌ Suggestion generation failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generateSuggestions();

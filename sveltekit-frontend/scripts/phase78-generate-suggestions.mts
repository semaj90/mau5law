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

import dotenv from 'dotenv';
import { isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import { Redis } from 'ioredis';
import * as path from 'path';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

import { fileURLToPath } from 'url';
import { errorClusterTable, errorSuggestionsTable } from '../src/lib/server/db/schema/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const SUGGESTION_MODEL = process.env.SUGGESTION_MODEL || 'gemma3-legal:latest';
const TIMEOUT = parseInt(process.env.SUGGESTION_TIMEOUT || '30000', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Redis
const redis = new Redis(REDIS_URL);

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

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const LOG_FILE_TXT = path.join(LOGS_DIR, 'suggestions.txt');
const LOG_FILE_JSON = path.join(LOGS_DIR, 'suggestions.json');

interface ClusterData {
  clusterId: string;
  routeId: string;
  message: string;
  code: string;
  rawLogSnippet?: string | null;
  count: number;
}

/**
 * Get clusters that don't have suggestions yet
 */
async function getClustersWithoutSuggestions(): Promise<ClusterData[]> {
  if (isVerbose) {
    console.log('📚 Fetching clusters without suggestions...');
  }

  // Get all active clusters
  const clusters = await db
    .select()
    .from(errorClusterTable)
    .where(isNotNull(errorClusterTable.clusterId));

  // Get existing suggestions
  const existingSuggestions = await db
    .select({ clusterId: errorSuggestionsTable.clusterId })
    .from(errorSuggestionsTable)
    .where(isNotNull(errorSuggestionsTable.clusterId));

  const existingClusterIds = new Set(existingSuggestions.map(s => s.clusterId));

  // Filter out clusters that already have suggestions
  const clustersToProcess = clusters
    .filter(c => c.clusterId && !existingClusterIds.has(c.clusterId))
    .map(c => ({
      clusterId: c.clusterId!,
      routeId: c.routeId,
      message: c.message,
      code: c.code,
      rawLogSnippet: c.rawLogSnippet,
      count: c.count,
    }));

  if (isVerbose) {
    console.log(`   Found ${clustersToProcess.length} clusters needing suggestions (out of ${clusters.length} total)`);
  }

  return clustersToProcess;
}

/**
 * Assess risk level based on error characteristics
 */
function assessRiskLevel(message: string, code?: string): 'low' | 'medium' | 'high' {
  const text = message.toLowerCase();

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

  if (highRiskPatterns.some(p => text.includes(p) || code?.includes(p))) {
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

  if (mediumRiskPatterns.some(p => text.includes(p) || code?.includes(p))) {
    return 'medium';
  }

  return 'low';
}

/**
 * Extract patch from LLM response
 */
function extractPatch(llmText: string): { patch: string | null; why: string } {
  const t = (llmText ?? "").trim();

  // 1) Prefer fenced code blocks (typescript/ts/js)
  const fence = t.match(/```(?:typescript|ts|javascript|js)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    const patch = fence[1].trim();
    if (patch.length) return { patch, why: "fenced_code_block" };
  }

  // 2) PATCH: ... until END PATCH or end of string (multiline)
  const patchSection = t.match(/(?:^|\n)\s*PATCH:\s*([\s\S]*?)(?:\n\s*END\s*PATCH\b|$)/i);
  if (patchSection?.[1]) {
    const patch = patchSection[1].trim();
    if (patch.length) return { patch, why: "patch_section" };
  }

  // 3) As a fallback, return null so we can store the raw text + debug
  return { patch: null, why: "no_patch_found" };
}

/**
 * Generate fix suggestion using LLM
 */
async function generateSuggestion(
  cluster: ClusterData
): Promise<{ summary: string; patch: string; riskLevel: 'low' | 'medium' | 'high' } | null> {
  const cacheKey = `suggestion:${cluster.clusterId}`;

  try {
    // 1. Check Redis Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      if (isVerbose) console.log(`   ⚡ Cache hit for cluster ${cluster.clusterId}`);
      return JSON.parse(cached);
    }

    // Create prompt for LLM
    const prompt = `You are a TypeScript/JavaScript error analysis expert. Analyze this error and provide a detailed, actionable fix suggestion.

Error Message:
${cluster.message}

Error Code: ${cluster.code}

${cluster.rawLogSnippet ? `Context:\n${cluster.rawLogSnippet}\n` : ''}

Return format:

PATCH code block

RATIONALE 1–4 bullets

RISK one of low/medium/high

Requirements:
- Return a complete patch in a fenced code block.
- Do NOT truncate.
- If you cannot produce a valid patch, explain why.
- Include 3-5 lines of context before and after the change.
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

    // Parse response from LLM
    const { patch, why } = extractPatch(responseText);

    // Extract summary (RATIONALE)
    const summaryMatch = responseText.match(/RATIONALE\s*([\s\S]*?)(?:\n\s*RISK|$)/i);
    const summary = summaryMatch?.[1]?.trim().split('\n')[0].replace(/^[•-]\s*/, '') || `Fix cluster ${cluster.clusterId}`;

    // Extract risk level
    const riskMatch = responseText.match(/RISK\s*(low|medium|high)/i);
    const riskLevel = (riskMatch?.[1]?.toLowerCase() as 'low' | 'medium' | 'high') || assessRiskLevel(cluster.message, cluster.code);

    if (isVerbose) {
      console.log(`   ✅ Generated suggestion for cluster ${cluster.clusterId}`);
      console.log(`      Summary: ${summary.substring(0, 80)}...`);
      console.log(`      Patch extraction: ${why}`);
      console.log(`      Patch length: ${patch?.length || 0} chars`);
    }

    const result = {
      summary: summary.substring(0, 250),
      patch: (patch || '// See error messages for details.').substring(0, 5000),
      riskLevel,
    };

    // Cache result in Redis (24 hours)
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400);

    return result;
  } catch (err) {
    if (isVerbose) {
      console.warn(`   ⚠️  Failed to generate suggestion for cluster ${cluster.clusterId}:`, err);
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
    const clusters = await getClustersWithoutSuggestions();

    if (clusters.length === 0) {
      console.log('✅ No clusters without suggestions');
      return;
    }

    console.log(`💡 Generating suggestions for ${clusters.length} error clusters\n`);

    if (isDryRun) {
      console.log('🔍 DRY RUN: Would generate suggestions for:');
      clusters.slice(0, 3).forEach(c => {
        console.log(`   - Cluster ${c.clusterId}: ${c.count} errors`);
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
      console.log(`⏳ Processing cluster ${i + 1}/${clusters.length} (${cluster.count} errors)...`);

      const suggestion = await generateSuggestion(cluster);

      if (suggestion) {
        await db.insert(errorSuggestionsTable).values({
          routePath: cluster.routeId,
          clusterId: cluster.clusterId,
          summary: suggestion.summary,
          patch: suggestion.patch,
          riskLevel: suggestion.riskLevel,
        });

        // Log to files
        const logEntry = {
          timestamp: new Date().toISOString(),
          clusterId: cluster.clusterId,
          routeId: cluster.routeId,
          ...suggestion
        };

        fs.appendFileSync(LOG_FILE_TXT,
          `[${logEntry.timestamp}] Cluster: ${cluster.clusterId}\n` +
          `Route: ${cluster.routeId}\n` +
          `Summary: ${suggestion.summary}\n` +
          `Risk: ${suggestion.riskLevel}\n` +
          `Patch:\n${suggestion.patch}\n` +
          `----------------------------------------\n`
        );

        fs.appendFileSync(LOG_FILE_JSON, JSON.stringify(logEntry) + '\n');

        successCount++;
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
      const level = assessRiskLevel(cluster.message, cluster.code);
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
    redis.disconnect();
  }
}

generateSuggestions();

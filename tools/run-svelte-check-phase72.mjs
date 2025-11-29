#!/usr/bin/env/node
/**
 * Svelte Check → Phase72 Timeline Integration
 * Runs svelte-check, parses errors, posts to Phase72 agent timeline
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SESSION_ID = 'phase72:deeds-web-app:main';
const BACKEND_URL = 'http://localhost:8000';

async function runSvelteCheckPhase72() {
    console.log('🔍 Running svelte-check for Phase72 integration...');

    try {
        // Run svelte-check with JSON output
        const output = execSync('npx svelte-check --output json', {
            cwd: path.join(process.cwd(), 'sveltekit-frontend'),
            encoding: 'utf-8'
        });

        const results = JSON.parse(output);

        // Parse error statistics
        const errorStats = parseErrorStats(results);

        console.log(`📊 Found ${errorStats.total_errors} total errors`);
        console.log(`🔴 TypeScript: ${errorStats.by_category.typescript}`);
        console.log(`🟡 Svelte: ${errorStats.by_category.svelte}`);
        console.log(`🔵 Diagnostics: ${errorStats.by_category.diagnostics}`);

        // Post to Phase72 timeline
        await postToPhase72Timeline(errorStats);

        console.log('✅ Posted svelte-check results to Phase72 timeline');

    } catch (error) {
        console.error('❌ Failed to run svelte-check:', error.message);

        // Still post failure event
        await postToPhase72Timeline({
            total_errors: -1,
            by_category: { error: 'svelte-check failed' },
            by_code: {},
            status: 'failed'
        });
    }
}

function parseErrorStats(results) {
    const stats = {
        total_errors: 0,
        by_category: {
            typescript: 0,
            svelte: 0,
            diagnostics: 0
        },
        by_code: {},
        status: 'success'
    };

    // Count errors by category and code
    if (results.files) {
        for (const file of Object.values(results.files)) {
            if (file.result && file.result.errors) {
                for (const error of file.result.errors) {
                    stats.total_errors++;

                    // Categorize by source
                    if (error.code && error.code.startsWith('ts')) {
                        stats.by_category.typescript++;
                    } else if (error.code && error.code.startsWith('svelte')) {
                        stats.by_category.svelte++;
                    } else {
                        stats.by_category.diagnostics++;
                    }

                    // Count by specific error code
                    const code = error.code || 'unknown';
                    stats.by_code[code] = (stats.by_code[code] || 0) + 1;
                }
            }
        }
    }

    return stats;
}

async function postToPhase72Timeline(errorStats) {
    const event = {
        session_id: SESSION_ID,
        kind: 'svelte-check',
        payload: errorStats,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/phase72/record_event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📝 Event recorded:', result);

    } catch (error) {
        console.error('❌ Failed to post to Phase72:', error.message);
        // Could save to local file as fallback
        saveFallbackEvent(event);
    }
}

function saveFallbackEvent(event) {
    const fallbackPath = path.join(process.cwd(), 'phase72-fallback-events.jsonl');

    try {
        const line = JSON.stringify({
            ...event,
            fallback: true,
            error: 'Backend not available'
        }) + '\n';

        fs.appendFileSync(fallbackPath, line);
        console.log('💾 Saved event to fallback file');
    } catch (error) {
        console.error('❌ Failed to save fallback:', error.message);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSvelteCheckPhase72();
}

export { runSvelteCheckPhase72, parseErrorStats };
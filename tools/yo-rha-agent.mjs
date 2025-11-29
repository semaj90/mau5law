#!/usr/bin/env node
/**
 * YoRHa Agent CLI - VS Code integration for agentic ACE loop
 * Usage: yo-rha-agent <session_id> [message]
 */

import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = process.env.YORHA_AGENT_API || 'http://localhost:8000';

async function main() {
    const [,, sessionId, ...msgParts] = process.argv;

    if (!sessionId) {
        console.error('Usage: yo-rha-agent <session_id> [message]');
        console.error('Example: yo-rha-agent "doj_v_foo:user123" "just ingested complaint"');
        process.exit(1);
    }

    const userMessage = msgParts.join(' ') || null;

    try {
        console.log('🤖 YoRHa Agent - Analyzing session state...\n');

        // Get next step
        const nextStepRes = await fetch(`${API_BASE}/api/agent/next_step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, user_message: userMessage })
        });

        if (!nextStepRes.ok) {
            throw new Error(`Agent API error: ${nextStepRes.status} ${await nextStepRes.text()}`);
        }

        const nextStep = await nextStepRes.json();

        console.log('🎯 NEXT RECOMMENDED ACTION');
        console.log('=' .repeat(50));
        console.log(`Action: ${nextStep.action.toUpperCase()}`);
        console.log(`Reason: ${nextStep.reason}`);
        console.log(`Confidence: ${(nextStep.confidence * 100).toFixed(1)}%`);
        console.log('');

        if (nextStep.summary) {
            console.log('📋 SESSION SUMMARY');
            console.log('=' .repeat(50));
            console.log(nextStep.summary);
            console.log('');
        }

        if (nextStep.mini_graph) {
            console.log('🕸️  MINI GRAPH');
            console.log('=' .repeat(50));
            const g = nextStep.mini_graph;
            console.log(`${g.nodes.length} nodes, ${g.edges.length} relationships`);
            console.log(g.summary);
            console.log('');
        }

        // Get timeline snapshot
        const timelineRes = await fetch(`${API_BASE}/api/agent/timeline/${sessionId}`);
        if (timelineRes.ok) {
            const timeline = await timelineRes.json();
            console.log('⏰ RECENT TIMELINE');
            console.log('=' .repeat(50));
            const recent = timeline.events.slice(0, 5); // Last 5 events
            for (const event of recent) {
                const ts = new Date(event.ts).toLocaleString();
                console.log(`${ts} | ${event.kind.toUpperCase()} | ${event.description || 'N/A'}`);
            }
            console.log('');
        }

        console.log('💡 QUICK ACTIONS');
        console.log('=' .repeat(50));
        console.log('• Run again: yo-rha-agent', sessionId);
        console.log('• Record event: curl -X POST', `${API_BASE}/api/agent/record_event`);
        console.log('• Full timeline: curl', `${API_BASE}/api/agent/timeline/${sessionId}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
#!/usr/bin/env node
/**
 * YoRHa Agent CLI - VS Code integration for agentic ACE loop
 * Usage: yo-rha-agent <session_id> [message]
 */

import fetch from 'node-fetch';

const API_BASE = process.env.YORHA_AGENT_API || 'http://localhost:8000';

async function main() {
    const [,, sessionId, ...msgParts] = process.argv;

    if (!sessionId) {
        console.error('Usage: yo-rha-agent <session_id> [message]');
        console.error('Example: yo-rha-agent "phase72:deeds-web-app:main" "what should I fix next?"');
        process.exit(1);
    }

    const message = msgParts.join(' ') || "what should I fix next?";
    const isPhase72 = sessionId.startsWith("phase72");

    try {
        console.log(`🤖 YoRHa Agent - Analyzing session state (${isPhase72 ? 'Phase 72' : 'General'})...\n`);

        let url, body;

        if (isPhase72) {
            url = `${API_BASE}/api/phase72/next_step`;
            body = {
                session_id: sessionId,
                message: message,
                role: "warden",
                default_goal: "Reduce TypeScript/Svelte errors from ~80k to <1k via Phase 72."
            };
        } else {
            url = `${API_BASE}/api/agent/next_step`;
            body = {
                session_id: sessionId,
                message: message,
                role: "user"
            };
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`Agent API error: ${res.status} ${await res.text()}`);
        }

        const data = await res.json();

        console.log('🤖 ACE Plan');
        console.log('  Session:', data.session_id);
        console.log('  TOOL   :', data.tool);
        console.log('  ARGS   :', JSON.stringify(data.args, null, 2));
        console.log('  REASON :', data.reason);
        if (data.aca_marker) console.log('  ACA    :', data.aca_marker);

        if (data.raw_llm_output) {
             console.log('\n  RAW LLM:');
             // Indent raw output for readability
             console.log(data.raw_llm_output.split('\n').map(l => '    ' + l).join('\n'));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
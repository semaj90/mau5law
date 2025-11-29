#!/usr/bin/env node

/**
 * Test script for Agent API with ACA
 *
 * Usage:
 *   node tools/test-agent-api.mjs
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000';
const SESSION_ID = 'doj_v_foo:test_user';

async function test() {
  console.log('🤖 Testing Agent API with ACA...\n');

  try {
    // 1. Initialize session with plan
    console.log('1️⃣  Initializing session with plan...');
    const initRes = await fetch(`${BASE_URL}/api/agent/next_step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        goal: 'analyze supremacy clause conflict with AB 32',
        spec_files: [
          '.kiro/specs/legal-agentic-alignment-search/requirements.md',
          '.kiro/specs/legal-agentic-alignment-search/design.md'
        ]
      })
    });

    if (!initRes.ok) {
      throw new Error(`Init failed: ${initRes.status} ${initRes.statusText}`);
    }

    const initData = await initRes.json();
    console.log('✅ Session initialized');
    console.log(`   Action: ${initData.action}`);
    console.log(`   Reason: ${initData.reason}`);
    console.log(`   ACA Marker: ${initData.aca_marker}`);
    console.log(`   Summary version: ${initData.aca_context?.summary_version}`);
    console.log(`   Spec version: ${initData.aca_context?.spec_summary_version}\n`);

    const marker = initData.aca_marker;

    // 2. Record some events
    console.log('2️⃣  Recording timeline events...');
    const recordRes = await fetch(`${BASE_URL}/api/agent/record_event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        kind: 'search',
        payload: { query: 'Supremacy Clause' },
        description: 'Searched for Supremacy Clause precedents'
      })
    });

    if (!recordRes.ok) {
      throw new Error(`Record failed: ${recordRes.status}`);
    }

    console.log('✅ Event recorded\n');

    // 3. Get next step
    console.log('3️⃣  Getting next recommended step...');
    const nextRes = await fetch(`${BASE_URL}/api/agent/next_step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: SESSION_ID,
        user_message: 'What should I do next?'
      })
    });

    if (!nextRes.ok) {
      throw new Error(`Next step failed: ${nextRes.status}`);
    }

    const nextData = await nextRes.json();
    console.log('✅ Next step retrieved');
    console.log(`   Action: ${nextData.action}`);
    console.log(`   Reason: ${nextData.reason}`);
    console.log(`   Confidence: ${nextData.confidence}\n`);

    // 4. Get timeline
    console.log('4️⃣  Fetching timeline...');
    const timelineRes = await fetch(`${BASE_URL}/api/agent/timeline/${SESSION_ID}`);

    if (!timelineRes.ok) {
      throw new Error(`Timeline failed: ${timelineRes.status}`);
    }

    const timelineData = await timelineRes.json();
    console.log('✅ Timeline retrieved');
    console.log(`   Events: ${timelineData.events.length}`);
    console.log(`   Summary: ${timelineData.summary.substring(0, 100)}...\n`);

    // 5. Recover context from marker
    console.log('5️⃣  Recovering context from marker...');
    const recoverRes = await fetch(`${BASE_URL}/api/agent/recover_context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marker })
    });

    if (!recoverRes.ok) {
      throw new Error(`Recover failed: ${recoverRes.status}`);
    }

    const recoverData = await recoverRes.json();
    console.log('✅ Context recovered from marker');
    console.log(`   Session ID: ${recoverData.session_id}`);
    console.log(`   Summary version: ${recoverData.summary_version}`);
    console.log(`   Spec version: ${recoverData.spec_summary_version}`);
    console.log(`   Plan goal: ${recoverData.plan?.goal}\n`);

    console.log('🎉 All tests passed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Start backend: uvicorn backend.api.main:app --host 0.0.0.0 --port 8000');
    console.log('   2. Run this test: node tools/test-agent-api.mjs');
    console.log('   3. Integrate ACA into your chat driver');
    console.log('   4. (Optional) Add TRT hook for context recall\n');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('\nMake sure:');
    console.error('  1. Backend is running: uvicorn backend.api.main:app --host 0.0.0.0 --port 8000');
    console.error('  2. Redis is running: redis-server');
    console.error('  3. Granite client is configured in backend/api/agent_api.py');
    process.exit(1);
  }
}

test();

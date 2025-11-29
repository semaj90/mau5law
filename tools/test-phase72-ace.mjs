#!/usr/bin/env node
/**
 * Test Phase72 ACE Endpoint
 *
 * Usage:
 *   node tools/test-phase72-ace.mjs "phase72:deeds-web-app:main" "what should I fix next?"
 *   node tools/test-phase72-ace.mjs "phase72:deeds-web-app:main"  # uses default message
 */

const sessionId = process.argv[2] || "phase72:deeds-web-app:main";
const message = process.argv[3] || "what should I fix next?";
const role = process.argv[4] || "warden";

const API_URL = process.env.API_URL || "http://localhost:8000";

async function testPhase72ACE() {
  console.log("🤖 Testing Phase72 ACE Endpoint\n");
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📍 Session: ${sessionId}`);
  console.log(`📍 Message: ${message}`);
  console.log(`📍 Role: ${role}\n`);

  try {
    console.log("🔄 Calling /api/phase72/next_step...\n");

    const response = await fetch(`${API_URL}/api/phase72/next_step`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        role,
        default_goal: "Reduce TypeScript errors and stabilize the codebase.",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      console.error(`📄 Response: ${error}\n`);
      process.exit(1);
    }

    const data = await response.json();

    console.log("✅ Response received:\n");
    console.log(`  Session ID: ${data.session_id}`);
    console.log(`  Role: ${data.role}`);
    console.log(`  🎯 TOOL: ${data.tool}`);
    console.log(`  🛠  ARGS: ${JSON.stringify(data.args, null, 2)}`);
    console.log(`  💭 REASON: ${data.reason}`);
    if (data.aca_marker) {
      console.log(`  🔗 ACA Marker: ${data.aca_marker}`);
    }
    console.log(`\n📋 Raw LLM Output:\n${data.raw_llm_output}\n`);

    console.log("✅ Phase72 ACE endpoint is working!\n");
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

testPhase72ACE();

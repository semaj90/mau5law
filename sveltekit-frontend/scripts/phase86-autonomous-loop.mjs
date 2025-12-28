import { QdrantClient } from '@qdrant/js-client-rest';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { Ollama } from 'ollama';
import pg from 'pg';

// CONFIG
const AGENT_URL = 'http://127.0.0.1:3002/function-call';
const MODEL = 'embeddinggemma:latest';
const COLLECTION_AST = 'phase72_ast_knowledge_base';
const COLLECTION_KB = 'phase76_knowledge_base';

/**
 * Unwrap MCP tool response to plain text
 * Handles various response formats: { content: [{ text }] }, { text }, { result }, raw string
 */
function unwrapMcpText(resp) {
  if (resp == null) return '';
  if (typeof resp === 'string') return resp;
  // Common FastMCP format: { content: [{ type:"text", text:"..." }] }
  if (Array.isArray(resp.content)) {
    const t = resp.content
      .map((c) => (typeof c?.text === 'string' ? c.text : ''))
      .join('\n');
    return t;
  }
  // Some tools may return { text: "..." } or { result: "..." }
  if (typeof resp.text === 'string') return resp.text;
  if (typeof resp.result === 'string') return resp.result;
  return JSON.stringify(resp, null, 2);
}

/**
 * Safely slice a string without crashing on undefined/null
 */
function safeSlice(s, n = 800) {
  const t = (s ?? '').toString();
  return t.length > n ? t.slice(0, n) : t;
}

function startMcp() {
  console.log("🚀 Spawning FastMCP Server...");
  const p = spawn("node", ["scripts/fastmcp-server.mjs"], {
    stdio: "inherit",
    shell: true
  });
  return p;
}

// CLIENTS
// 🛠️ FIX: Use env vars to force TCP/IPv4 and avoid local Windows DB conflict
const pool = new pg.Pool({
  host: process.env.PGHOST ?? "127.0.0.1",
  port: Number(process.env.PGPORT ?? "5434"),
  database: process.env.PGDATABASE ?? "legal",
  user: process.env.PGUSER ?? "user",
  password: process.env.PGPASSWORD ?? "pass",
});const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
const qdrant = new QdrantClient({ url: 'http://127.0.0.1:6333' });

async function runLoop() {
  // Check if MCP server is already running, spawn if needed
  let mcpProc = null;
  try {
    const healthRes = await fetch('http://127.0.0.1:3002/health', { method: 'GET' });
    if (healthRes.ok) {
      console.log("✅ FastMCP server already running");
    }
  } catch {
    console.log("🚀 Spawning FastMCP Server...");
    mcpProc = startMcp();
    process.on("exit", () => mcpProc?.kill());
    // Give it time to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("♾️  Phase 86 Autonomous Loop Started");
  console.log(`📊 Config: postgresql://${process.env.PGUSER ?? 'user'}@${process.env.PGHOST ?? '127.0.0.1'}:${process.env.PGPORT ?? '5434'}/${process.env.PGDATABASE ?? 'legal'}`);

  // Create a fresh pool to avoid any caching issues
  const testPool = new pg.Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5434"),
    database: process.env.PGDATABASE ?? "legal",
    user: process.env.PGUSER ?? "user",
    password: process.env.PGPASSWORD ?? "pass",
  });

  try {
    // 1. GET NEXT ERROR
    console.log(`🔌 Connecting to pool...`);
    const client = await testPool.connect();
    console.log(`✅ Pool connected successfully`);

    // Diagnostic: Print exactly where we are connected
    const resOps = await client.query('SELECT inet_server_addr(), version()');
    console.log(`🔌 DB Connected: ${resOps.rows[0].version} (IP: ${resOps.rows[0].inet_server_addr})`);

    const { rows } = await client.query(`
      SELECT * FROM ts_errors
      WHERE status = 'open'
      AND file_path NOT LIKE '%.svelte-kit%'
      ORDER BY impact_score DESC
      LIMIT 1
    `);
    // client.release(); // Moved down to keep connection open for vector search

    if (rows.length === 0) {
      console.log("✅ No open errors found. System healthy.");
      return;
    }

    const error = rows[0];
    const errorMsg = error.error_message ?? error.message ?? 'Unknown error';
    console.log(`\n🎯 TARGET: [${error.error_code}] in ${error.file_path}`);
    console.log(`   Msg: ${safeSlice(errorMsg, 60)}...`);

    // 2. CONSULT KNOWLEDGE BASE (Qdrant & Postgres)
    // We use the error message to find similar past fixes
    const { embedding } = await ollama.embeddings({ model: MODEL, prompt: errorMsg });

    // Search AST Knowledge Base (Surgical Fixes)
    const hitsAST = await qdrant.search(COLLECTION_AST, {
      vector: embedding,
      limit: 1,
      with_payload: true
    });

    // Search Phase 76 Knowledge Base (Docs & Architecture)
    const hitsKB = await qdrant.search(COLLECTION_KB, {
      vector: embedding,
      limit: 2,
      with_payload: true
    });

    // Search Error Embeddings (Postgres HNSW)
    const similarErrors = await client.query(`
      SELECT ts.error_code, ts.error_message, ts.file_path
      FROM error_embeddings ee
      JOIN ts_errors ts ON ee.error_id = ts.id
      ORDER BY ee.embedding <=> $1::vector
      LIMIT 3
    `, [`[${embedding.join(',')}]`]);

    client.release(); // Release client after queries are done

    // 3. ALWAYS READ FILE FIRST (we need context)
    console.log(`📄 Reading target file: ${error.file_path}...`);
    const fileRes = await callAgent('read_file', { filepath: error.file_path });
    const fileContent = unwrapMcpText(fileRes);

    if (!fileContent || fileContent.length === 0) {
      console.error(`❌ Failed to read file: ${error.file_path}`);
      return;
    }

    console.log(`✅ Read ${fileContent.length} chars from ${error.file_path}`);

    // 4. DECIDE & ACT
    let fixStrategy = null;
    let contextInfo = "";

    if (hitsAST.length > 0 && hitsAST[0].score > 0.85) {
      const payload = hitsAST[0].payload;
      console.log(`💡 KNOWN PATTERN FOUND: ${payload.pattern_name ?? 'Unknown'} (Score: ${hitsAST[0].score.toFixed(4)})`);
      fixStrategy = payload.fix_strategy;
    } else {
      console.log(`🤔 No confident local match (score: ${hitsAST[0]?.score?.toFixed(4) ?? 'N/A'})`);
      console.log(`🤖 Attempting generic fix via LLM...`);
      fixStrategy = "Analyze the error message and file content to fix the TypeScript error.";
    }

    // Build Context from KB and Similar Errors
    if (hitsKB.length > 0) {
        contextInfo += "\nRelevant Documentation:\n";
        hitsKB.forEach(h => {
            const content = h.payload?.content || h.payload?.summary || '';
            if (content) {
                const safeSummary = safeSlice(content, 200);
                contextInfo += `- ${h.payload?.source_path || 'Doc'}: ${safeSummary}...\n`;
            }
        });
    }

    if (similarErrors.rows.length > 0) {
        contextInfo += "\nSimilar Past Errors:\n";
        similarErrors.rows.forEach(row => {
            contextInfo += `- [${row.error_code}] in ${row.file_path}: ${row.error_message}\n`;
        });
    }

    console.log(`🚀 AGENT COMMAND: Apply Strategy -> ${fixStrategy}`);

    // GENERATE FIX using LLM
    console.log(`🤖 Asking Ollama (${'gemma3-legal:latest'}) to generate fix...`);
    try {
        const prompt = `You are an expert TypeScript developer.
Fix the following error in the file.
Error: ${errorMsg}
File Path: ${error.file_path}
Fix Strategy: ${fixStrategy}

${contextInfo}

File Content:
\`\`\`typescript
${fileContent}
\`\`\`

Return ONLY the full fixed file content. Do not include markdown code blocks or explanations.`;

        const response = await ollama.chat({
          model: 'gemma3-legal:latest',
          messages: [{ role: 'user', content: prompt }],
          options: { temperature: 0.1 }
        });

        console.log(`🤖 Ollama responded. Length: ${response.message.content.length}`);

        let fixedContent = response.message.content;
        // Strip markdown code blocks if present
        fixedContent = fixedContent.replace(/^```typescript\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');

        console.log(`📝 Applying fix to ${error.file_path}...`);
        const writeRes = await callAgent('write_file', {
          filepath: error.file_path,
          content: fixedContent
        });
        console.log(`✅ Fix Result: ${JSON.stringify(writeRes)}`);

        // VALIDATION
        console.log(`🔍 Validating fix...`);
        let validationCmd = `npx tsc --noEmit ${error.file_path}`;
        if (error.file_path.endsWith('.svelte')) {
            validationCmd = `npx svelte-check --workspace ${error.file_path}`;
        }

        const valRes = await callAgent('run_command', { command: validationCmd });
        console.log(`Validation Output: ${JSON.stringify(valRes)}`);

    } catch (err) {
        console.error("❌ Error during fix generation/application:", err);
    }

  } catch (err) {
    console.error("❌ Loop Error:", err.message);
    if (err.message.includes("role") || err.message.includes("password")) {
        console.error("👉 CRITICAL: Still hitting local Windows DB? Run 'Get-Service *postgresql* | Stop-Service' in Admin PowerShell.");
    }
  } finally {
    await testPool.end();
  }
}

async function callAgent(tool, args) {
    try {
        const res = await fetch(AGENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tool, arguments: args })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ Agent returned ${res.status}: ${errorText}`);
            return { ok: false, error: errorText };
        }

        const data = await res.json();

        // Handle both {ok, result} and direct response formats
        if (data.ok === true && data.result) {
            return data.result;
        }

        return data;
    } catch (e) {
        console.error("❌ Agent Connection Failed:", e.message);
        console.error("   Make sure FastMCP server is running on port 3002");
        return { ok: false, error: e.message };
    }
}

runLoop().catch(console.error);

// LangChain-style report generator with graceful fallbacks.
// If langchain/tfjs are not installed, it still generates a top-1000 report
// by frequency from svelte-check.json or svelte-check.log.

import fs from "fs";
import path from "path";
import { parseJsonLines, parseJsonWhole } from "./parse-json-gpu.mjs";

const JSON_PATH = process.argv[2] || "svelte-check.json";
const LOG_PATH = process.argv[3] || "svelte-check.log";
const OUT_PATH = process.argv[4] || "svelte-report.md";
const TOP_N = Number(process.env.TOP_N || 1000);

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

function parseLogLine(line) {
  const s = stripAnsi(line);
  const m = s.match(/^(.*?):(\d+):(\d+)\s*-\s*(error|warning)\s*(?:[A-Z]*\d*:)\s*(.*)$/i);
  if (m) {
    return { file: m[1], line: Number(m[2]), col: Number(m[3]), level: m[4], message: m[5] };
  }
  const m2 = s.match(/^(.*?):(\d+):(\d+)\s*-\s*(error|warning)\s*:?\s*(.*)$/i);
  if (m2) {
    return { file: m2[1], line: Number(m2[2]), col: Number(m2[3]), level: m2[4], message: m2[5] };
  }
  return null;
}

function summarizeTop(messages, topN) {
  const counts = new Map();
  for (const msg of messages) {
    const key = msg.message.replace(/\s+/g, " ").trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
}

async function main() {
  let diagnostics = [];

  if (fs.existsSync(JSON_PATH)) {
    // Try whole-JSON first
    const full = parseJsonWhole(JSON_PATH);
    if (full && typeof full === "object") {
      // svelte-check JSON structure can vary; attempt common shapes
      const items = [];
      const pushItem = (e) => {
        if (!e) return;
        const message = e.message || e.msg || e.text || "";
        const file = e.file || e.filename || e.path || e.source || "";
        const line = e.start?.line || e.line || 0;
        items.push({ file, line, message });
      };
      if (Array.isArray(full)) {
        for (const entry of full) {
          (entry.errors || entry.diagnostics || []).forEach(pushItem);
        }
      } else {
        (full.errors || full.diagnostics || []).forEach(pushItem);
      }
      diagnostics = items;
    } else {
      // Try JSON lines
      const jlines = await parseJsonLines(JSON_PATH);
      for (const jl of jlines) {
        if (!jl || typeof jl !== 'object') continue;
        (jl.errors || jl.diagnostics || []).forEach((e) => {
          const message = e.message || e.msg || e.text || "";
          const file = e.file || e.filename || e.path || e.source || "";
          const line = e.start?.line || e.line || 0;
          diagnostics.push({ file, line, message });
        });
      }
    }
  }

  if (!diagnostics.length && fs.existsSync(LOG_PATH)) {
    // Fall back to parsing the text log
    const raw = fs.readFileSync(LOG_PATH, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const r = parseLogLine(line);
      if (r) diagnostics.push({ file: r.file, line: r.line, message: r.message });
    }
  }

  const top = summarizeTop(diagnostics, TOP_N);

  let report = `# Svelte-Check Error Report (Top ${TOP_N})\n\n`;
  for (const [msg, count] of top) {
    report += `### ${msg}\n- Count: ${count}\n\n`;
  }

  report += `\n---\nGenerated locally. For semantic suggestions, run the VS Code tasks:\n- \"Suggest Fixes (Ollama)\"\n- \"Suggest File-Specific Fixes (Ollama)\"\n`;

  fs.writeFileSync(OUT_PATH, report);
  console.log(`✅ Wrote ${OUT_PATH} (items=${top.length})`);
}

main();

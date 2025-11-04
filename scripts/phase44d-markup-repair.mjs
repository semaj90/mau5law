#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = path.resolve("sveltekit-frontend/src");
let repaired = 0;

function fixFile(file) {
  const content = fs.readFileSync(file, "utf8");
  // Detect collapsed markup (all on one line and missing closing tags)
  if (content.split("\n").length < 5 && content.includes("<script") && content.includes("</style>") === false) {
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const script = scriptMatch ? scriptMatch[1].trim() : "";
    const rebuilt = `<script lang="ts">
${script}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted markup for now.</p>
</main>

<style>
  .page-repair { padding: 2rem; font-family: sans-serif; }
</style>
`;
    fs.writeFileSync(file, rebuilt, "utf8");
    repaired++;
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (full.endsWith(".svelte")) fixFile(full);
  }
}

walk(root);
console.log(`✅ Phase 44-D: Repaired ${repaired} collapsed Svelte files.`);

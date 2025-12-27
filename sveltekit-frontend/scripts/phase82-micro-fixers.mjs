// scripts/phase82-micro-fixers.mjs
import fs from "node:fs";

function fixDuplicateKeyColon(content) {
  // Pattern: temperature: rlGuidance.temperature, rlGuidance.maxTokens, true:
  // Target: temperature: rlGuidance.temperature, maxTokens: rlGuidance.maxTokens, fromCache: true,
  // This is specific to the qlora file's corruption
  return content.replace(
    /temperature:\s*([^,]+),\s*([^,]+),\s*true:/g,
    "temperature: $1, maxTokens: $2, fromCache: true,"
  );
}

function fixIntegratedSearchThreshold(content) {
  // Pattern: threshold: query.filters?.confidenceThreshold || 0.7: maxResults.options?.maxResults || 50,
  // Target: threshold: query.filters?.confidenceThreshold || 0.7, maxResults: options?.maxResults || 50,
  return content.replace(
    /threshold:\s*([^:]+):\s*maxResults\.options\?\.maxResults\s*\|\|\s*50,/g,
    "threshold: $1, maxResults: options?.maxResults || 50,"
  );
}

function fixInterfaceSemicolon(content) {
  // Pattern: embedQuery(input: string): Promise<number[]> ;
  // Target: embedQuery(input: string): Promise<number[]>;
  // Just standardizing if there's a weird space-semicolon issue causing parser grief,
  // though the error TS1131 usually means property expectation failure.
  // In the context shown: interface EmbeddingsProvider { embedQuery(input: string): Promise<number[]> ; }
  // The error might be extraneous text or invisible chars. Let's try to clean it.
  return content.replace(
    /:\s*Promise<number\[\]>\s*;/g,
    ": Promise<number[]>; "
  );
}

const files = [
  "src/lib/services/qlora-rl-langextract-integration.ts",
  "src/lib/storage/integrated-search-engine.ts",
  "src/lib/server/ai/rag-pipeline-enhanced.ts"
];

let totalFixes = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, "utf8");
  let original = content;

  // Apply fixes
  content = fixDuplicateKeyColon(content);
  content = fixIntegratedSearchThreshold(content);
  // rag-pipeline fix is likely subtle, maybe just re-typing the line helps if it's char corruption
  // But let's try the generic spacer fix
  content = fixInterfaceSemicolon(content);

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`✅ Fixed verified patterns in ${file}`);
    totalFixes++;
  } else {
    console.log(`⚠️ No patterns matched in ${file}`);
  }
});

if (totalFixes > 0) {
  console.log(`\nApplied ${totalFixes} file updates.`);
} else {
  console.log("\nNo updates applied. Patterns may need tuning.");
}

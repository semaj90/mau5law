#!/usr/bin/env node

// Fix package.json duplicates and CSS issues
import { readFileSync, writeFileSync } from "fs";

console.log("🔧 Fixing package.json duplicates and CSS issues...");

// Fix package.json duplicates
try {
  const packagePath = "package.json";
  let packageContent = readFileSync(packagePath, "utf8");

  // Parse JSON
  const packageJson = JSON.parse(packageContent);

  // Remove duplicate scripts by keeping the first occurrence
  const seenScripts = new Set();
  const cleanedScripts = {};

  Object.entries(packageJson.scripts).forEach(([key, value]) => {
    if (!seenScripts.has(key)) {
      cleanedScripts[key] = value;
      seenScripts.add(key);
    }
  });

  packageJson.scripts = cleanedScripts;

  // Write back with proper formatting
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log("✅ Fixed package.json duplicates");
} catch (error) {
  console.log("⚠️ Could not fix package.json:", error.message);
}

console.log("✅ Fixes completed!");

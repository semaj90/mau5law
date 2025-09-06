#!/usr/bin/env node

// Quick fix for TypeScript and CSS errors
import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

console.log("🔧 Fixing TypeScript and CSS issues...");

const fixes = [
  {
    file: "src/routes/cases/[id]/enhanced/+page.svelte",
    action: "remove_unused_css",
    selector: ".add-to-canvas-btn",
  },
  {
    file: "src/routes/crud-dashboard/+page.svelte",
    action: "remove_unused_css",
    selectors: [".page-header", ".page-title h1"],
  },
];

function removeUnusedCSSSelector(filePath, selector) {
  try {
    let content = readFileSync(filePath, "utf8");

    // Remove CSS rule and its content
    const cssRegex = new RegExp(
      `\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*{[^{}]*}`,
      "g",
    );
    content = content.replace(cssRegex, "");

    writeFileSync(filePath, content);
    console.log(
      `✅ Removed unused CSS selector "${selector}" from ${filePath}`,
    );
  } catch (error) {
    console.log(`⚠️ Could not process ${filePath}: ${error.message}`);
  }
}

// Process fixes
fixes.forEach((fix) => {
  if (fix.action === "remove_unused_css") {
    if (fix.selector) {
      removeUnusedCSSSelector(fix.file, fix.selector);
    } else if (fix.selectors) {
      fix.selectors.forEach((selector) => {
        removeUnusedCSSSelector(fix.file, selector);
      });
    }
  }
});

console.log("✅ CSS cleanup completed!");

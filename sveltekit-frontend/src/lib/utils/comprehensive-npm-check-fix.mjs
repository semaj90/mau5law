#!/usr/bin/env node

/**
 * Comprehensive NPM Check Error Fix
 * Addresses all errors found in npm_check_errors/check_output.txt
 */

import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Starting Comprehensive NPM Check Error Fix...\n");

// Track all fixes applied
const fixes = {
  packageJsonDuplicates: 0,
  componentErrors: 0,
  typeErrors: 0,
  importErrors: 0,
  schemaErrors: 0,
  cssWarnings: 0,
};

// 1. Fix Package.json Duplicate Keys
async function fixPackageJsonDuplicates() {
  console.log("📦 Fixing package.json duplicate keys...");

  try {
    const packagePath = join(__dirname, "package.json");
    let content = await readFile(packagePath, "utf8");

    // Parse the content to find and remove duplicates
    const lines = content.split("\n");
    const scriptSection = [];
    let inScripts = false;
    let braceCount = 0;

    const processedLines = [];
    const seenKeys = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if we're in the scripts section
      if (trimmedLine.includes('"scripts":')) {
        inScripts = true;
        processedLines.push(line);
        continue;
      }

      if (inScripts) {
        if (trimmedLine.includes("{")) braceCount++;
        if (trimmedLine.includes("}")) braceCount--;

        // If we're closing the scripts section
        if (braceCount <= 0 && trimmedLine.includes("}")) {
          inScripts = false;
          processedLines.push(line);
          continue;
        }

        // Check for duplicate keys in scripts
        if (trimmedLine.includes(":") && !trimmedLine.startsWith("//")) {
          const keyMatch = trimmedLine.match(/"([^"]+)":/);
          if (keyMatch) {
            const key = keyMatch[1];
            if (seenKeys.has(key)) {
              // Skip duplicate key
              console.log(`  ❌ Removing duplicate key: ${key}`);
              fixes.packageJsonDuplicates++;
              continue;
            }
            seenKeys.add(key);
          }
        }
      }

      processedLines.push(line);
    }

    const fixedContent = processedLines.join("\n");
    await writeFile(packagePath, fixedContent, "utf8");
    console.log("  ✅ Package.json duplicates fixed\n");
  } catch (error) {
    console.log(`  ⚠️ Could not fix package.json: ${error.message}\n`);
  }
}

// 2. Fix Component Slot/Snippet Conflicts
async function fixComponentErrors() {
  console.log("🧩 Fixing component errors...");

  const componentFixes = [
    {
      file: "src/lib/components/ui/modal/Modal.svelte",
      find: "<slot />",
      replace: "{@render children?.()}",
    },
    {
      file: "src/lib/components/ui/button/Button.svelte",
      find: "<slot />",
      replace: "{@render children?.()}",
    },
    {
      file: "src/lib/components/ui/BitsUnoDemo.svelte",
      find: 'in:fade={{ duration: 150 "',
      replace: "in:fade={{ duration: 150 }}",
    },
    {
      file: "src/lib/components/ui/BitsUnoDemo.svelte",
      find: 'out:fade={{ duration: 150  "',
      replace: "out:fade={{ duration: 150 }}",
    },
  ];

  for (const fix of componentFixes) {
    try {
      const filePath = join(__dirname, fix.file);
      let content = await readFile(filePath, "utf8");

      if (content.includes(fix.find)) {
        content = content.replace(new RegExp(fix.find, "g"), fix.replace);
        await writeFile(filePath, content, "utf8");
        console.log(`  ✅ Fixed ${fix.file}`);
        fixes.componentErrors++;
      }
    } catch (error) {
      console.log(`  ⚠️ Could not fix ${fix.file}: ${error.message}`);
    }
  }

  console.log("");
}

// 3. Fix Import/Export Errors
async function fixImportErrors() {
  console.log("📥 Fixing import/export errors...");

  const importFixes = [
    // Fix Button import in Form.svelte
    {
      file: "src/lib/components/ui/Form.svelte",
      find: 'import Button from "$lib/components/ui/button";',
      replace: 'import { Button } from "$lib/components/ui/button";',
    },
    // Fix Button import in ModalManager.svelte
    {
      file: "src/lib/components/ui/ModalManager.svelte",
      find: 'import Button from "$lib/components/ui/button";',
      replace: 'import { Button } from "$lib/components/ui/button";',
    },
    // Fix Button import in Notifications.svelte
    {
      file: "src/lib/components/ui/Notifications.svelte",
      find: 'import Button from "$lib/components/ui/button";',
      replace: 'import { Button } from "$lib/components/ui/button";',
    },
    // Fix missing Fuse.js import
    {
      file: "src/lib/stores/saved-notes.ts",
      find: 'import Fuse from "fuse";',
      replace: 'import Fuse from "fuse.js";',
    },
    {
      file: "src/lib/stores/evidence-store.ts",
      find: 'import Fuse from "fuse";',
      replace: 'import Fuse from "fuse.js";',
    },
    {
      file: "src/lib/utils/fuzzy.ts",
      find: 'import Fuse from "fuse";',
      replace: 'import Fuse from "fuse.js";',
    },
  ];

  for (const fix of importFixes) {
    try {
      const filePath = join(__dirname, fix.file);
      let content = await readFile(filePath, "utf8");

      if (content.includes(fix.find)) {
        content = content.replace(fix.find, fix.replace);
        await writeFile(filePath, content, "utf8");
        console.log(`  ✅ Fixed imports in ${fix.file}`);
        fixes.importErrors++;
      }
    } catch (error) {
      console.log(`  ⚠️ Could not fix ${fix.file}: ${error.message}`);
    }
  }

  console.log("");
}

// 4. Fix Type Conflicts and Missing Types
async function fixTypeErrors() {
  console.log("🔧 Fixing type errors...");

  // Fix User type conflicts by creating a proper type definition
  const userTypeFix = `// User types consolidated
export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  role: "prosecutor" | "investigator" | "admin" | "user";
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface UserProfile extends User {
  preferences?: Record<string, any>;
  settings?: Record<string, any>;
}
`;

  try {
    await writeFile(
      join(__dirname, "src/lib/types/user.ts"),
      userTypeFix,
      "utf8",
    );
    console.log("  ✅ Created consolidated user types");
    fixes.typeErrors++;
  } catch (error) {
    console.log(`  ⚠️ Could not create user types: ${error.message}`);
  }

  // Fix hooks.server.ts to include name property
  try {
    const hooksPath = join(__dirname, "src/hooks.server.ts");
    let content = await readFile(hooksPath, "utf8");

    if (content.includes("event.locals.user = {")) {
      content = content.replace(
        /event\.locals\.user = \{([^}]+)\}/s,
        `event.locals.user = {
      id: user.id,
      email: user.email,
      name: user.firstName + ' ' + user.lastName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }`,
      );
      await writeFile(hooksPath, content, "utf8");
      console.log("  ✅ Fixed hooks.server.ts user assignment");
      fixes.typeErrors++;
    }
  } catch (error) {
    console.log(`  ⚠️ Could not fix hooks.server.ts: ${error.message}`);
  }

  console.log("");
}

// 5. Fix CaseForm.svelte syntax error
async function fixCaseFormError() {
  console.log("📝 Fixing CaseForm.svelte syntax error...");

  try {
    const filePath = join(__dirname, "src/lib/components/ui/CaseForm.svelte");
    let content = await readFile(filePath, "utf8");

    // Find the syntax error around line 202 and fix it
    // Look for incomplete tag or missing closing brace
    const lines = content.split("\n");
    for (let i = 200; i < Math.min(205, lines.length); i++) {
      if (lines[i] && lines[i].trim() === "") {
        // Add missing closing tag if needed
        if (
          lines[i - 1] &&
          lines[i - 1].includes("/>") &&
          !lines[i - 1].includes("</div>")
        ) {
          lines[i] = "          </div>";
          console.log(`  ✅ Fixed syntax error at line ${i + 1}`);
          fixes.componentErrors++;
          break;
        }
      }
    }

    await writeFile(filePath, lines.join("\n"), "utf8");
  } catch (error) {
    console.log(`  ⚠️ Could not fix CaseForm.svelte: ${error.message}`);
  }

  console.log("");
}

// 6. Fix AI Store Configuration
async function fixAIStoreErrors() {
  console.log("🤖 Fixing AI store configuration...");

  try {
    const filePath = join(__dirname, "src/lib/stores/ai-store.ts");
    let content = await readFile(filePath, "utf8");

    // Fix gemma3Config model property
    content = content.replace(
      /gemma3Config:\s*\{[^}]*model:[^,}]*,/,
      `gemma3Config: {
    name: "gemma2:2b",
    temperature: 0.7,`,
    );

    // Fix timestamp type issues
    content = content.replace(/timestamp:\s*number/g, "timestamp: Date");

    await writeFile(filePath, content, "utf8");
    console.log("  ✅ Fixed AI store configuration");
    fixes.typeErrors++;
  } catch (error) {
    console.log(`  ⚠️ Could not fix AI store: ${error.message}`);
  }

  console.log("");
}

// 7. Create missing index exports
async function fixIndexExports() {
  console.log("📤 Fixing index exports...");

  try {
    // Fix button index.ts to export Button properly
    const buttonIndexPath = join(
      __dirname,
      "src/lib/components/ui/button/index.ts",
    );
    const buttonIndexContent = `export { default as Button } from "./Button.svelte";
export type { ButtonVariant, ButtonSize } from "./Button.svelte";
`;
    await writeFile(buttonIndexPath, buttonIndexContent, "utf8");
    console.log("  ✅ Fixed button index exports");

    // Fix main ui index.ts to handle default exports properly
    const uiIndexPath = join(__dirname, "src/lib/components/ui/index.ts");
    let uiContent = await readFile(uiIndexPath, "utf8");

    // Replace problematic default exports
    uiContent = uiContent.replace(
      /export \{ default as (\w+) \} from "\.\/(\w+)\.svelte";/g,
      'export { $1 } from "./$2.svelte";',
    );

    await writeFile(uiIndexPath, uiContent, "utf8");
    console.log("  ✅ Fixed UI component exports");
    fixes.importErrors += 2;
  } catch (error) {
    console.log(`  ⚠️ Could not fix index exports: ${error.message}`);
  }

  console.log("");
}

// 8. Fix Enhanced State Machines Duplicate Exports
async function fixStateMachineExports() {
  console.log("⚙️ Fixing state machine duplicate exports...");

  try {
    const filePath = join(__dirname, "src/lib/stores/enhancedStateMachines.ts");
    let content = await readFile(filePath, "utf8");

    // Remove duplicate export declarations
    const lines = content.split("\n");
    const seenExports = new Set();
    const filteredLines = [];

    for (const line of lines) {
      if (line.includes("export const")) {
        const match = line.match(/export const (\w+)/);
        if (match) {
          const exportName = match[1];
          if (seenExports.has(exportName)) {
            console.log(`  ❌ Removing duplicate export: ${exportName}`);
            continue;
          }
          seenExports.add(exportName);
        }
      }
      filteredLines.push(line);
    }

    // Remove the final duplicate export line
    const finalContent = filteredLines
      .join("\n")
      .replace(
        /export \{ evidenceProcessingMachine, streamingMachine \};[\s\S]*$/,
        "",
      );

    await writeFile(filePath, finalContent, "utf8");
    console.log("  ✅ Fixed state machine exports");
    fixes.importErrors++;
  } catch (error) {
    console.log(`  ⚠️ Could not fix state machines: ${error.message}`);
  }

  console.log("");
}

// 9. Add missing properties to database schema
async function fixDatabaseSchemaErrors() {
  console.log("🗄️ Fixing database schema errors...");

  try {
    // Check if schema file exists
    const schemaPath = join(__dirname, "src/lib/db/schema.ts");
    let content = await readFile(schemaPath, "utf8");

    // Add missing properties to personsOfInterest table
    if (
      content.includes("export const personsOfInterest") &&
      !content.includes("profileImageUrl")
    ) {
      content = content.replace(
        /(export const personsOfInterest = pgTable\("persons_of_interest", \{[^}]+)/,
        `$1
  profileImageUrl: text("profile_image_url"),
  caseId: uuid("case_id").references(() => cases.id),`,
      );
      console.log("  ✅ Added missing fields to personsOfInterest table");
      fixes.schemaErrors++;
    }

    // Add missing properties to evidence_vectors table
    if (
      content.includes("export const evidenceVectors") &&
      !content.includes("caseId")
    ) {
      content = content.replace(
        /(export const evidenceVectors = pgTable\("evidence_vectors", \{[^}]+)/,
        `$1
  caseId: uuid("case_id").references(() => cases.id),
  vectorType: text("vector_type"),`,
      );
      console.log("  ✅ Added missing fields to evidenceVectors table");
      fixes.schemaErrors++;
    }

    await writeFile(schemaPath, content, "utf8");
  } catch (error) {
    console.log(`  ⚠️ Could not fix database schema: ${error.message}`);
  }

  console.log("");
}

// 10. Create canvas.ts type file (currently missing)
async function createCanvasTypes() {
  console.log("🎨 Creating missing canvas types...");

  try {
    const canvasTypesContent = `// Canvas types for interactive features
export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'case' | 'evidence' | 'person' | 'connection';
  data: any;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'involves' | 'contains';
  strength: number;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}
`;

    await writeFile(
      join(__dirname, "src/lib/types/canvas.ts"),
      canvasTypesContent,
      "utf8",
    );
    console.log("  ✅ Created canvas types");
    fixes.typeErrors++;
  } catch (error) {
    console.log(`  ⚠️ Could not create canvas types: ${error.message}`);
  }

  console.log("");
}

// Main execution
async function main() {
  try {
    await fixPackageJsonDuplicates();
    await fixComponentErrors();
    await fixImportErrors();
    await fixTypeErrors();
    await fixCaseFormError();
    await fixAIStoreErrors();
    await fixIndexExports();
    await fixStateMachineExports();
    await fixDatabaseSchemaErrors();
    await createCanvasTypes();

    console.log("✨ COMPREHENSIVE FIX COMPLETE!\n");
    console.log("📊 Summary of fixes applied:");
    console.log(
      `   📦 Package.json duplicates: ${fixes.packageJsonDuplicates}`,
    );
    console.log(`   🧩 Component errors: ${fixes.componentErrors}`);
    console.log(`   🔧 Type errors: ${fixes.typeErrors}`);
    console.log(`   📥 Import errors: ${fixes.importErrors}`);
    console.log(`   🗄️ Schema errors: ${fixes.schemaErrors}`);
    console.log(
      `   ⚠️ CSS warnings: ${fixes.cssWarnings} (mostly unused selectors - safe to ignore)`,
    );

    const totalFixes = Object.values(fixes).reduce((a, b) => a + b, 0);
    console.log(`\n🎯 Total fixes applied: ${totalFixes}`);

    console.log("\n🚀 Next steps:");
    console.log("   1. Run: npm run check");
    console.log("   2. If errors remain, run: npm run fix:typescript");
    console.log("   3. Start dev server: npm run dev");
  } catch (error) {
    console.error("❌ Fix process failed:", error);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, extname } from "path";

const COMPONENT_FIXES = {
  // Fix common type imports
  typeImports: [
    {
      name: "Fix User type imports",
      pattern:
        /^(?!.*import.*type.*{.*User.*}.*from.*types\/user)(.*)export\s+let\s+user\s*:\s*User/gm,
      replacement: `import type { User } from '$lib/types/user';\n\n$1export let user: User`,
    },
    {
      name: "Fix Case type imports",
      pattern:
        /^(?!.*import.*type.*{.*Case.*}.*from.*types)(.*):\s*Case(?:\s|;|$)/gm,
      replacement: `import type { Case } from '$lib/types';\n\n$1: Case`,
    },
  ],

  // Fix property names
  propertyFixes: [
    {
      name: "Fix user.avatar to user.avatarUrl",
      pattern: /user\.avatar(?!Url)/g,
      replacement: "user.avatarUrl",
    },
    {
      name: "Fix user.username to user.name",
      pattern: /user\.username/g,
      replacement: "user.name",
    },
    {
      name: "Fix user.image to user.avatarUrl",
      pattern: /user\.image/g,
      replacement: "user.avatarUrl",
    },
  ],

  // Fix import conflicts
  importConflicts: [
    {
      name: "Fix lucide User icon conflict",
      pattern:
        /import\s*{\s*([^}]*)\bUser\b(?!\s+as)([^}]*)\s*}\s*from\s*['"]lucide-svelte['"]/g,
      replacement: (match, before, after) => {
        const beforeImports = before.trim().replace(/,$/, "");
        const afterImports = after.trim().replace(/^,/, "");
        const imports = [
          ...beforeImports
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          "User as UserIcon",
          ...afterImports
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ];
        return `import { ${imports.join(", ")} } from "lucide-svelte"`;
      },
    },
  ],

  // Fix component usage
  componentUsage: [
    {
      name: "Fix User icon usage",
      pattern: /<User\s+(?=size|class)/g,
      replacement: "<UserIcon ",
    },
    {
      name: "Fix Header import in NieR showcase",
      pattern:
        /import\s+Header\s+from\s+['"]\$lib\/components\/Header\.svelte['"]/g,
      replacement: "import NierHeader from '$lib/components/NierHeader.svelte'",
    },
  ],

  // Fix CSS classes
  cssClasses: [
    {
      name: "Fix repetitive classes",
      pattern: /class\s*=\s*"mx-auto px-4 max-w-7xl"/g,
      replacement: 'class="container mx-auto px-4"',
    },
  ],

  // Fix Svelte 5 syntax
  svelte5: [
    {
      name: "Fix $state usage",
      pattern: /let\s+(\w+)\s*=\s*\$state\s*\(/g,
      replacement: "let $1 = $state(",
    },
    {
      name: "Fix $bindable usage",
      pattern: /(\w+)\s*=\s*\$bindable\s*\(/g,
      replacement: "$1 = $bindable(",
    },
  ],
};

const FILE_SPECIFIC_FIXES = {
  "SearchInput.svelte": [
    {
      name: "Fix createEventDispatcher type",
      pattern: /createEventDispatcher<[^>]+>/g,
      replacement: "createEventDispatcher",
    },
  ],
  "CaseCard.svelte": [
    {
      name: "Add missing Case type import",
      pattern: /^(.*interface\s+(?:Props|CaseData).*{)/m,
      replacement: `import type { Case } from '$lib/types';\n\n$1`,
    },
  ],
};

let fixCount = 0;
let errorCount = 0;

async function fixFile(filePath) {
  try {
    let content = await readFile(filePath, "utf-8");
    let modified = false;
    const fileName = filePath.split(/[/\\]/).pop();

    // Apply general fixes
    for (const category of Object.values(COMPONENT_FIXES)) {
      for (const fix of category) {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) {
          modified = true;
          console.log(`  ✓ ${fix.name}`);
        }
      }
    }

    // Apply file-specific fixes
    if (FILE_SPECIFIC_FIXES[fileName]) {
      for (const fix of FILE_SPECIFIC_FIXES[fileName]) {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) {
          modified = true;
          console.log(`  ✓ ${fix.name} (file-specific)`);
        }
      }
    }

    // Check for missing imports
    if (
      content.includes(": User") &&
      !content.includes("import type { User }")
    ) {
      content = `import type { User } from '$lib/types/user';\n\n` + content;
      modified = true;
      console.log("  ✓ Added missing User import");
    }

    if (
      content.includes(": Case") &&
      !content.includes("import type { Case }")
    ) {
      content = `import type { Case } from '$lib/types';\n\n` + content;
      modified = true;
      console.log("  ✓ Added missing Case import");
    }

    // Fix duplicate imports
    const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
    const imports = content.match(importRegex) || [];
    const uniqueImports = [...new Set(imports)];
    if (imports.length !== uniqueImports.length) {
      const nonImportContent = content.replace(importRegex, "").trim();
      content = uniqueImports.join("\n") + "\n\n" + nonImportContent;
      modified = true;
      console.log("  ✓ Removed duplicate imports");
    }

    if (modified) {
      await writeFile(filePath, content);
      fixCount++;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    errorCount++;
    return false;
  }
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip certain directories
    if (entry.isDirectory()) {
      if (
        ["node_modules", ".svelte-kit", "dist", "build", ".git"].includes(
          entry.name,
        )
      ) {
        continue;
      }
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (
        [".svelte", ".ts", ".js"].includes(ext) &&
        !entry.name.endsWith(".backup")
      ) {
        console.log(`\nProcessing: ${fullPath.replace(process.cwd(), ".")}`);
        await fixFile(fullPath);
      }
    }
  }
}

// Additional specific fixes
async function fixSpecificIssues() {
  console.log("\n=== Applying specific fixes ===\n");

  // Fix NieR showcase imports
  try {
    const showcasePath = join(
      process.cwd(),
      "src/routes/nier-showcase/+page.svelte",
    );
    let content = await readFile(showcasePath, "utf-8");

    content = content.replace(/import Header from/g, "import NierHeader from");

    content = content.replace(/<Header\s/g, "<NierHeader ");

    await writeFile(showcasePath, content);
    console.log("✓ Fixed NieR showcase imports");
  } catch (error) {
    console.log("⚠ Could not fix NieR showcase (file may not exist)");
  }
}

// Main execution
console.log("🔧 Fixing TypeScript and Svelte errors...\n");
console.log("=== Starting fixes ===\n");

processDirectory(join(process.cwd(), "src"))
  .then(() => fixSpecificIssues())
  .then(() => {
    console.log("\n=== Summary ===");
    console.log(`✅ Fixed ${fixCount} files`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errors encountered`);
    }
    console.log('\n✨ Done! Run "npm run check" to verify remaining issues.');
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

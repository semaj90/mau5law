#!/usr/bin/env node

import { readdir, readFile, writeFile, access } from "fs/promises";
import { join, extname, dirname, relative } from "path";
import { constants } from "fs";

const IMPORT_FIXES = {
  // Fix missing type imports
  missingTypes: [
    {
      name: "User type",
      check: /(?:export\s+let|let|const)\s+\w+\s*:\s*User(?:\s|\[|\||;|$)/,
      import: "import type { User } from '$lib/types/user';",
    },
    {
      name: "Case type",
      check: /(?:export\s+let|let|const)\s+\w+\s*:\s*Case(?:\s|\[|\||;|$)/,
      import: "import type { Case } from '$lib/types';",
    },
    {
      name: "Evidence type",
      check: /(?:export\s+let|let|const)\s+\w+\s*:\s*Evidence(?:\s|\[|\||;|$)/,
      import: "import type { Evidence } from '$lib/types';",
    },
  ],

  // Fix import paths
  pathFixes: [
    {
      name: "Fix relative imports to $lib",
      pattern: /from\s+['"]\.\.\/(?:\.\.\/)*lib\/([^'"]+)['"]/g,
      replacement: "from '$lib/$1'",
    },
    {
      name: "Fix .js extensions in imports",
      pattern: /from\s+(['"])([^'"]+)\.js\1/g,
      replacement: "from $1$2$1",
    },
  ],

  // Fix export issues
  exportFixes: [
    {
      name: "Fix default exports in index files",
      pattern: /export\s+{\s*default\s+as\s+(\w+)\s*}\s+from/g,
      replacement: "export { $1 } from",
    },
  ],
};

const COMPONENT_PATTERNS = {
  // Ensure proper Svelte component structure
  svelte: [
    {
      name: 'Add lang="ts" to script tags',
      pattern: /<script(?!.*lang=["']ts["'])>/g,
      replacement: '<script lang="ts">',
    },
  ],
};

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findTypeFile(typeName, fromPath) {
  const possiblePaths = [
    join(dirname(fromPath), "types.ts"),
    join(dirname(fromPath), `${typeName.toLowerCase()}.ts`),
    join(process.cwd(), "src/lib/types/index.ts"),
    join(process.cwd(), "src/lib/types.ts"),
    join(process.cwd(), `src/lib/types/${typeName.toLowerCase()}.ts`),
  ];

  for (const path of possiblePaths) {
    if (await fileExists(path)) {
      const content = await readFile(path, "utf-8");
      if (
        content.includes(`interface ${typeName}`) ||
        content.includes(`type ${typeName}`)
      ) {
        return path;
      }
    }
  }
  return null;
}

async function fixImports(filePath) {
  try {
    let content = await readFile(filePath, "utf-8");
    let modified = false;

    // Check for missing type imports
    for (const typeCheck of IMPORT_FIXES.missingTypes) {
      if (
        typeCheck.check.test(content) &&
        !content.includes(typeCheck.import.split(" ")[2])
      ) {
        // Add import at the beginning of the file
        const scriptMatch = content.match(/<script[^>]*>/);
        if (scriptMatch) {
          const insertPos = scriptMatch.index + scriptMatch[0].length;
          content =
            content.slice(0, insertPos) +
            "\n  " +
            typeCheck.import +
            content.slice(insertPos);
          modified = true;
          console.log(`  ✓ Added ${typeCheck.name} import`);
        }
      }
    }

    // Fix import paths
    for (const fix of IMPORT_FIXES.pathFixes) {
      const before = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (before !== content) {
        modified = true;
        console.log(`  ✓ ${fix.name}`);
      }
    }

    // Fix exports
    for (const fix of IMPORT_FIXES.exportFixes) {
      const before = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (before !== content) {
        modified = true;
        console.log(`  ✓ ${fix.name}`);
      }
    }

    // Fix Svelte component patterns
    if (filePath.endsWith(".svelte")) {
      for (const fix of COMPONENT_PATTERNS.svelte) {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) {
          modified = true;
          console.log(`  ✓ ${fix.name}`);
        }
      }
    }

    // Remove duplicate imports
    const importLines = content.match(/^import[^;]+;$/gm) || [];
    const uniqueImports = [...new Set(importLines)];
    if (importLines.length > uniqueImports.length) {
      importLines.forEach((imp) => {
        const firstIndex = content.indexOf(imp);
        const lastIndex = content.lastIndexOf(imp);
        if (firstIndex !== lastIndex) {
          content =
            content.slice(0, lastIndex) + content.slice(lastIndex + imp.length);
          modified = true;
        }
      });
      console.log("  ✓ Removed duplicate imports");
    }

    if (modified) {
      await writeFile(filePath, content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function createIndexExports() {
  // Create proper index.ts exports for common directories
  const indexFiles = [
    {
      path: "src/lib/components/ui/index.ts",
      exports: [
        "export { default as Button } from './button/Button.svelte';",
        "export { default as Card } from './Card.svelte';",
        "export { default as Input } from './Input.svelte';",
        "export { default as Label } from './Label.svelte';",
        "export { default as Modal } from './Modal.svelte';",
        "export { default as Badge } from './Badge.svelte';",
        "export { default as Tooltip } from './Tooltip.svelte';",
      ],
    },
    {
      path: "src/lib/types/index.ts",
      exports: [
        "export * from './user';",
        "export * from './database';",
        "export * from './api';",
        "export * from './canvas';",
      ],
    },
  ];

  for (const indexFile of indexFiles) {
    try {
      const dir = dirname(join(process.cwd(), indexFile.path));
      const entries = await readdir(dir, { withFileTypes: true });
      const exports = [];

      for (const entry of entries) {
        if (
          entry.isFile() &&
          entry.name.endsWith(".svelte") &&
          entry.name !== "index.svelte"
        ) {
          const name = entry.name.replace(".svelte", "");
          exports.push(
            `export { default as ${name} } from './${name}.svelte';`,
          );
        } else if (
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          entry.name !== "index.ts"
        ) {
          const name = entry.name.replace(".ts", "");
          exports.push(`export * from './${name}';`);
        }
      }

      if (exports.length > 0) {
        await writeFile(
          join(process.cwd(), indexFile.path),
          exports.join("\n") + "\n",
        );
        console.log(`\n✓ Created index exports for ${indexFile.path}`);
      }
    } catch (error) {
      // Directory might not exist
    }
  }
}

let fixCount = 0;
let errorCount = 0;

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ["node_modules", ".svelte-kit", "dist", "build"].includes(entry.name)
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
        const fixed = await fixImports(fullPath);
        if (fixed) fixCount++;
      }
    }
  }
}

// Main execution
console.log("📦 Fixing import/export issues...\n");

processDirectory(join(process.cwd(), "src"))
  .then(() => createIndexExports())
  .then(() => {
    console.log("\n=== Summary ===");
    console.log(`✅ Fixed ${fixCount} files`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errors encountered`);
    }
    console.log("\n✨ Done! Import/export fixes applied.");
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

#!/usr/bin/env node

import { readdir, readFile, writeFile } from "fs/promises";
import { join, extname } from "path";

const CSS_FIXES = {
  // Fix UnoCSS class usage
  unoClasses: [
    {
      name: "Fix container classes",
      pattern: /class="mx-auto px-4 max-w-7xl"/g,
      replacement: 'class="container mx-auto px-4"',
    },
    {
      name: "Fix button classes",
      pattern: /class="btn btn-primary"/g,
      replacement: 'class="nier-button-primary"',
    },
    {
      name: "Fix card classes",
      pattern: /class="card"/g,
      replacement: 'class="nier-card"',
    },
  ],

  // Fix style blocks
  styleBlocks: [
    {
      name: "Add UnoCSS directives",
      pattern: /<style>\s*\n(?!.*@unocss)/,
      replacement: "<style>\n  /* @unocss-include */\n",
    },
  ],

  // Fix theme variables
  themeVars: [
    {
      name: "Fix pico variables to nier theme",
      pattern: /var\(--pico-([\w-]+)\)/g,
      replacement: (match, varName) => {
        const mappings = {
          primary: "harvard-crimson",
          secondary: "nier-gray",
          "background-color": "bg-primary",
          "card-background-color": "bg-secondary",
          "muted-border-color": "border-light",
          color: "text-primary",
          "muted-color": "text-muted",
          "primary-background": "bg-secondary",
          "secondary-background": "bg-tertiary",
          "primary-inverse": "text-inverse",
        };
        return `var(--${mappings[varName] || varName})`;
      },
    },
  ],
};

const IMPORT_FIXES = [
  {
    name: "Add UnoCSS import to app.css imports",
    file: "app.css",
    check: (content) => !content.includes("@unocss"),
    fix: (content) => {
      if (!content.includes("@unocss/reset/tailwind.css")) {
        content = "@import '@unocss/reset/tailwind.css';\n" + content;
      }
      return content;
    },
  },
];

let fixCount = 0;

async function fixCSSInFile(filePath) {
  try {
    let content = await readFile(filePath, "utf-8");
    let modified = false;
    const fileName = filePath.split(/[/\\]/).pop();

    // Apply CSS fixes
    for (const category of Object.values(CSS_FIXES)) {
      for (const fix of category) {
        const before = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (before !== content) {
          modified = true;
          console.log(`  ✓ ${fix.name}`);
        }
      }
    }

    // Apply import fixes
    for (const fix of IMPORT_FIXES) {
      if (fileName === fix.file && fix.check(content)) {
        content = fix.fix(content);
        modified = true;
        console.log(`  ✓ ${fix.name}`);
      }
    }

    // Fix Svelte component class bindings
    if (filePath.endsWith(".svelte")) {
      // Fix class:directive syntax
      content = content.replace(
        /class:active={\$page\.url\.pathname\s*===\s*['"]([^'"]+)['"]\}/g,
        'class:active={$page.url.pathname === "$1"}',
      );

      // Fix conditional classes
      content = content.replace(
        /class="{([^}]+)}\s*{\s*([^}]+)\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]['"]"\s*}"/g,
        "class=\"$1 {$2 ? '$3' : ''}\"",
      );
    }

    if (modified) {
      await writeFile(filePath, content);
      fixCount++;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

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
        [".svelte", ".css"].includes(ext) &&
        !entry.name.endsWith(".backup")
      ) {
        console.log(`\nProcessing: ${fullPath.replace(process.cwd(), ".")}`);
        await fixCSSInFile(fullPath);
      }
    }
  }
}

// Create UnoCSS shortcuts file
async function createUnoShortcuts() {
  const shortcuts = `// UnoCSS shortcuts for common patterns
export const shortcuts = {
  // Layout shortcuts
  'container': 'mx-auto px-4 max-w-7xl',
  'section': 'py-8 md:py-12',
  
  // Component shortcuts
  'btn': 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
  'btn-primary': 'btn bg-nier-black text-nier-white hover:bg-nier-dark-gray',
  'btn-secondary': 'btn bg-harvard-crimson text-nier-white hover:bg-harvard-crimson-dark',
  
  // Form shortcuts
  'form-input': 'w-full px-3 py-2 bg-white dark:bg-nier-dark-gray border border-nier-light-gray dark:border-nier-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-digital-green',
  'form-label': 'block text-sm font-medium text-nier-gray dark:text-nier-silver mb-1',
  
  // Card shortcuts
  'card-base': 'bg-white dark:bg-nier-black border border-nier-light-gray dark:border-nier-gray rounded-lg shadow-sm',
  'card-hover': 'transition-all duration-300 hover:shadow-lg hover:border-digital-green',
};
`;

  try {
    await writeFile(join(process.cwd(), "src/lib/uno-shortcuts.ts"), shortcuts);
    console.log("\n✓ Created UnoCSS shortcuts file");
  } catch (error) {
    console.error("\n✗ Could not create shortcuts file:", error.message);
  }
}

// Main execution
console.log("🎨 Fixing CSS and UnoCSS issues...\n");

processDirectory(join(process.cwd(), "src"))
  .then(() => createUnoShortcuts())
  .then(() => {
    console.log("\n=== Summary ===");
    console.log(`✅ Fixed ${fixCount} files`);
    console.log("\n✨ Done! CSS fixes applied.");
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

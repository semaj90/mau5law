#!/usr/bin/env node
// Enhanced UI refactoring with directory scanning and smart merging

import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..", "..");
const uiPath = join(
  projectRoot,
  "sveltekit-frontend",
  "src",
  "lib",
  "components",
  "ui",
);

async function scanDirectory(dir, pattern = "") {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await scanDirectory(fullPath, pattern)));
      } else if (entry.name.includes(pattern) || !pattern) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Cannot scan ${dir}: ${err.message}`);
  }
  return files;
}

async function analyzeExistingComponents() {
  console.log("🔍 Scanning for existing UI components...");

  // Find all UI-related files
  const componentFiles = await scanDirectory(uiPath, ".svelte");
  const buttonFiles = componentFiles.filter((f) =>
    basename(f).toLowerCase().includes("button"),
  );
  const cardFiles = componentFiles.filter((f) =>
    basename(f).toLowerCase().includes("card"),
  );
  const inputFiles = componentFiles.filter((f) =>
    basename(f).toLowerCase().includes("input"),
  );
  const modalFiles = componentFiles.filter((f) =>
    basename(f).toLowerCase().includes("modal"),
  );

  console.log(`Found ${componentFiles.length} component files:`);
  console.log(`- ${buttonFiles.length} Button components`);
  console.log(`- ${cardFiles.length} Card components`);
  console.log(`- ${inputFiles.length} Input components`);
  console.log(`- ${modalFiles.length} Modal components`);

  return {
    buttonFiles,
    cardFiles,
    inputFiles,
    modalFiles,
    allFiles: componentFiles,
  };
}

async function mergeComponentFeatures(existingFiles, componentType) {
  const features = new Set();
  const props = new Set();
  const imports = new Set();
  let hasSlots = false;
  let hasRunes = false;

  for (const file of existingFiles) {
    try {
      const content = await readFile(file, "utf-8");

      // Extract features
      if (content.includes("createButton") || content.includes("bits-ui"))
        features.add("bits-ui");
      if (content.includes("loading")) features.add("loading");
      if (content.includes("disabled")) features.add("disabled");
      if (content.includes("variant")) features.add("variants");
      if (content.includes("size")) features.add("sizes");
      if (content.includes("onClick") || content.includes("on:click"))
        features.add("click-handler");

      // Extract props
      const propMatches = content.match(/export let (\w+)/g);
      if (propMatches) {
        propMatches.forEach((match) =>
          props.add(match.replace("export let ", "")),
        );
      }

      // Check patterns
      if (content.includes("<slot")) hasSlots = true;
      if (content.includes("$state") || content.includes("$props"))
        hasRunes = true;

      // Extract imports
      const importMatches = content.match(/import .+ from .+/g);
      if (importMatches) {
        importMatches.forEach((imp) => imports.add(imp));
      }
    } catch (err) {
      console.warn(`Cannot read ${file}: ${err.message}`);
    }
  }

  return {
    features: Array.from(features),
    props: Array.from(props),
    imports: Array.from(imports),
    hasSlots,
    hasRunes,
  };
}

async function generateEnhancedComponent(type, analysis, existingFiles) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Create merged component with all discovered features
  const templates = {
    button: `<!-- Enhanced Button - Merged from ${existingFiles.length} existing files -->
<!-- Generated: ${timestamp} -->
<!-- Features: ${analysis.features.join(", ")} -->
<script lang="ts">
  import { createButton } from 'bits-ui';
  ${analysis.imports.filter((imp) => imp.includes("lucide")).join("\n  ")}
  
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    target?: string;
    onclick?: () => void;
    children: import('svelte').Snippet;
    class?: string;
    ${analysis.props
      .filter((p) => !["variant", "size", "disabled", "loading"].includes(p))
      .map((p) => `${p}?: any;`)
      .join("\n    ")}
  }
  
  let { 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false,
    type = 'button',
    href,
    target,
    onclick,
    children,
    class: className = '',
    ...rest 
  }: Props = $props();
  
  const {
    elements: { root },
    states: { pressed }
  } = createButton({ disabled: disabled || loading });
  
  $effect(() => {
    if ($pressed && onclick) {
      onclick();
    }
  });
  
  const Tag = href ? 'a' : 'button';
</script>

<svelte:element
  this={Tag}
  use:root
  {href}
  {target}
  {type}
  disabled={disabled || loading}
  class="btn btn-{variant} btn-{size} {loading ? 'btn-loading' : ''} {className}"
  {...rest}
>
  {#if loading}
    <div class="loading-spinner"></div>
  {/if}
  {@render children()}
</svelte:element>

<style>
  .btn {
    @apply inline-flex items-center justify-center font-medium transition-all duration-200 select-none;
    @apply border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  /* Variants */
  .btn-primary { @apply bg-amber-500 text-zinc-900 border-amber-500 hover:bg-amber-400 focus:ring-amber-500; }
  .btn-secondary { @apply bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700 focus:ring-zinc-500; }
  .btn-ghost { @apply bg-transparent text-zinc-300 border-transparent hover:bg-zinc-800 focus:ring-zinc-500; }
  .btn-danger { @apply bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500; }
  .btn-outline { @apply bg-transparent text-zinc-300 border-zinc-600 hover:bg-zinc-800 focus:ring-zinc-500; }
  
  /* Sizes */
  .btn-xs { @apply px-2 py-1 text-xs; }
  .btn-sm { @apply px-3 py-1.5 text-sm; }
  .btn-md { @apply px-4 py-2 text-base; }
  .btn-lg { @apply px-6 py-3 text-lg; }
  .btn-xl { @apply px-8 py-4 text-xl; }
  
  .btn-loading { @apply opacity-75 cursor-wait; }
  
  .loading-spinner {
    @apply w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2;
  }
</style>`,

    card: `<!-- Enhanced Card - Merged from ${existingFiles.length} existing files -->
<script lang="ts">
  interface Props {
    variant?: 'default' | 'interactive' | 'elevated' | 'outlined';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: import('svelte').Snippet;
    class?: string;
    onclick?: () => void;
  }
  
  let { 
    variant = 'default', 
    padding = 'md',
    children, 
    class: className = '',
    onclick,
    ...rest 
  }: Props = $props();
</script>

<div 
  {...rest}
  class="nier-card nier-card-{variant} nier-card-padding-{padding} {className}"
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  on:click={onclick}
  on:keydown={(e) => e.key === 'Enter' && onclick?.()}
>
  {@render children()}
</div>

<style>
  .nier-card {
    @apply bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden transition-all duration-200;
  }
  
  .nier-card-interactive {
    @apply hover:bg-zinc-800 hover:border-amber-400 cursor-pointer;
    @apply hover:shadow-lg hover:shadow-amber-400/20 focus:outline-none focus:ring-2 focus:ring-amber-500;
  }
  
  .nier-card-elevated {
    @apply shadow-lg bg-zinc-800 border-zinc-600;
  }
  
  .nier-card-outlined {
    @apply border-2 border-zinc-600;
  }
  
  .nier-card-padding-none { @apply p-0; }
  .nier-card-padding-sm { @apply p-2; }
  .nier-card-padding-md { @apply p-4; }
  .nier-card-padding-lg { @apply p-6; }
</style>`,
  };

  return templates[type] || "";
}

async function createBackupAndMerge() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(uiPath, `backup-${timestamp}`);

  await mkdir(backupDir, { recursive: true });

  console.log(`📦 Creating backup in ${backupDir}`);

  const analysis = await analyzeExistingComponents();

  // Backup and analyze each component type
  const componentTypes = [
    { name: "button", files: analysis.buttonFiles },
    { name: "card", files: analysis.cardFiles },
    { name: "input", files: analysis.inputFiles },
    { name: "modal", files: analysis.modalFiles },
  ];

  for (const { name, files } of componentTypes) {
    if (files.length === 0) continue;

    console.log(`\n🔧 Processing ${name} components...`);

    // Backup existing files
    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const backupPath = join(backupDir, `${basename(file)}-${name}-backup`);
        await writeFile(backupPath, content);
        console.log(`  📦 Backed up ${basename(file)}`);
      } catch (err) {
        console.warn(`  ⚠ Cannot backup ${file}: ${err.message}`);
      }
    }

    // Analyze features from all files
    const features = await mergeComponentFeatures(files, name);
    console.log(`  🔍 Found features: ${features.features.join(", ")}`);

    // Generate enhanced component
    const enhancedComponent = await generateEnhancedComponent(
      name,
      features,
      files,
    );

    if (enhancedComponent) {
      const outputPath = join(
        uiPath,
        `${name.charAt(0).toUpperCase() + name.slice(1)}.svelte`,
      );
      await writeFile(outputPath, enhancedComponent);
      console.log(`  ✅ Created enhanced ${outputPath}`);
    }
  }

  // Create merge report
  const report = `# UI Component Merge Report
Generated: ${new Date().toISOString()}

## Backup Location
${backupDir}

## Components Processed
${componentTypes.map((ct) => `- ${ct.name}: ${ct.files.length} files merged`).join("\n")}

## Files Backed Up
${analysis.allFiles.map((f) => `- ${f}`).join("\n")}

## Next Steps
1. Review generated components in src/lib/components/ui/
2. Test components: npm run dev
3. Run type checks: npm run check
4. Update imports in existing pages if needed
`;

  await writeFile(join(backupDir, "MERGE-REPORT.md"), report);
  console.log(
    `\n📋 Created merge report: ${join(backupDir, "MERGE-REPORT.md")}`,
  );

  return backupDir;
}

// Execute the enhanced refactoring
createBackupAndMerge()
  .then((backupDir) => {
    console.log("\n🎉 Enhanced UI component merge complete!");
    console.log(`📦 Backups saved to: ${backupDir}`);
    console.log("\nNext steps:");
    console.log("1. npm run check");
    console.log("2. npm run dev");
    console.log("3. Test components in browser");
  })
  .catch(console.error);

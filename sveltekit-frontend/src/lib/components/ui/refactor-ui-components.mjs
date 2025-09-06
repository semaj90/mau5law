#!/usr/bin/env node
// Auto-refactor UI components to Svelte 5 + UnoCSS + Bits UI best practices

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiPath = join(__dirname, ".");

// Component templates using Svelte 5 runes and bits-ui
const templates = {
  "Button.svelte": `<!-- Enhanced Button with Svelte 5 runes + bits-ui + UnoCSS -->
<script lang="ts">
  import { createButton } from 'bits-ui';
  
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    children: import('svelte').Snippet;
    onclick?: () => void;
  }
  
  let { 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false,
    children,
    onclick,
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
</script>

<button 
  use:root
  {...rest}
  class="btn btn-{variant} btn-{size} {loading ? 'btn-loading' : ''}"
  disabled={disabled || loading}
>
  {#if loading}
    <div class="loading-spinner"></div>
  {/if}
  {@render children()}
</button>

<style>
  .btn {
    @apply inline-flex items-center justify-center font-medium transition-all duration-200;
    @apply border border-nier-border bg-nier-surface text-nier-white;
    @apply hover:bg-nier-surface-light focus:outline-none focus:ring-2 focus:ring-nier-accent;
  }
  .btn-primary { @apply bg-nier-accent text-nier-black hover:bg-nier-accent-light; }
  .btn-secondary { @apply bg-nier-surface-light hover:bg-nier-surface-lighter; }
  .btn-ghost { @apply bg-transparent border-transparent hover:bg-nier-surface; }
  .btn-danger { @apply bg-nier-danger text-nier-white hover:bg-nier-danger-light; }
  .btn-sm { @apply px-3 py-1.5 text-sm; }
  .btn-md { @apply px-4 py-2 text-base; }
  .btn-lg { @apply px-6 py-3 text-lg; }
  .btn-loading { @apply opacity-75 cursor-not-allowed; }
  .loading-spinner {
    @apply w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2;
  }
</style>`,

  "Card.svelte": `<!-- Enhanced Card with Svelte 5 runes + bits-ui + UnoCSS -->
<script lang="ts">
  interface Props {
    variant?: 'default' | 'interactive' | 'elevated';
    children: import('svelte').Snippet;
  }
  
  let { variant = 'default', children, ...rest }: Props = $props();
</script>

<div 
  {...rest}
  class="nier-card nier-card-{variant}"
>
  {@render children()}
</div>

<style>
  .nier-card {
    @apply bg-nier-surface border border-nier-border rounded-lg overflow-hidden;
  }
  .nier-card-interactive {
    @apply hover:bg-nier-surface-light hover:border-nier-accent transition-all duration-200 cursor-pointer;
    @apply hover:shadow-lg hover:shadow-nier-accent/20;
  }
  .nier-card-elevated {
    @apply shadow-lg bg-nier-surface-light;
  }
</style>`,

  "Input.svelte": `<!-- Enhanced Input with Svelte 5 runes + bits-ui + UnoCSS -->
<script lang="ts">
  interface Props {
    value?: string;
    type?: 'text' | 'email' | 'password' | 'search';
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    label?: string;
  }
  
  let { 
    value = $bindable(''),
    type = 'text',
    placeholder,
    disabled = false,
    error,
    label,
    ...rest 
  }: Props = $props();
</script>

{#if label}
  <label class="input-label">{label}</label>
{/if}
<input 
  bind:value
  {type}
  {placeholder}
  {disabled}
  {...rest}
  class="nier-input {error ? 'nier-input-error' : ''}"
/>
{#if error}
  <p class="input-error">{error}</p>
{/if}

<style>
  .input-label {
    @apply block text-sm font-medium text-nier-text mb-2;
  }
  .nier-input {
    @apply w-full px-3 py-2 bg-nier-surface border border-nier-border rounded-md;
    @apply text-nier-white placeholder-nier-text-muted;
    @apply focus:outline-none focus:ring-2 focus:ring-nier-accent focus:border-transparent;
    @apply transition-all duration-200;
  }
  .nier-input-error {
    @apply border-nier-danger focus:ring-nier-danger;
  }
  .input-error {
    @apply text-nier-danger text-sm mt-1;
  }
</style>`,

  "Modal.svelte": `<!-- Enhanced Modal with Svelte 5 runes + bits-ui + UnoCSS -->
<script lang="ts">
  import { createDialog } from 'bits-ui';
  
  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    children: import('svelte').Snippet;
    trigger?: import('svelte').Snippet;
  }
  
  let { 
    open = $bindable(false),
    onOpenChange,
    title,
    description,
    children,
    trigger,
    ...rest 
  }: Props = $props();
  
  const {
    elements: { trigger: triggerEl, overlay, content, title: titleEl, description: descEl, close },
    states: { open: dialogOpen }
  } = createDialog({
    open,
    onOpenChange: (newOpen) => {
      open = newOpen;
      onOpenChange?.(newOpen);
    }
  });
</script>

{#if trigger}
  <button use:triggerEl>
    {@render trigger()}
  </button>
{/if}

{#if $dialogOpen}
  <div use:overlay class="modal-overlay" />
  <div use:content class="modal-content" {...rest}>
    {#if title}
      <h2 use:titleEl class="modal-title">{title}</h2>
    {/if}
    {#if description}
      <p use:descEl class="modal-description">{description}</p>
    {/if}
    
    <div class="modal-body">
      {@render children()}
    </div>
    
    <button use:close class="modal-close">×</button>
  </div>
{/if}

<style>
  .modal-overlay {
    @apply fixed inset-0 bg-black/60 z-40;
  }
  .modal-content {
    @apply fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2;
    @apply bg-nier-surface border border-nier-border rounded-lg p-6 shadow-2xl;
  }
  .modal-title {
    @apply text-xl font-bold text-nier-accent mb-2;
  }
  .modal-description {
    @apply text-nier-text-muted mb-4;
  }
  .modal-close {
    @apply absolute top-4 right-4 w-8 h-8 rounded-full bg-nier-surface-light;
    @apply hover:bg-nier-surface-lighter transition-colors;
    @apply flex items-center justify-center text-nier-text-muted hover:text-nier-white;
  }
</style>`,
};

// UnoCSS config additions
const unoConfig = `// Add to uno.config.ts shortcuts
export default defineConfig({
  shortcuts: {
    // Nier theme classes
    'nier-bg': 'bg-zinc-950',
    'nier-surface': 'bg-zinc-900',
    'nier-surface-light': 'bg-zinc-800',
    'nier-surface-lighter': 'bg-zinc-700',
    'nier-border': 'border-zinc-700',
    'nier-text': 'text-zinc-100',
    'nier-text-muted': 'text-zinc-400',
    'nier-accent': 'text-amber-400',
    'nier-danger': 'text-red-400',
    
    // Button variants
    'btn': 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-md',
    'btn-primary': 'bg-amber-500 text-zinc-900 hover:bg-amber-400',
    'btn-secondary': 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
    'btn-ghost': 'bg-transparent hover:bg-zinc-800',
    
    // Card variants
    'nier-card': 'bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden',
    'nier-card-interactive': 'hover:bg-zinc-800 hover:border-amber-400 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-amber-400/20',
  }
});`;

async function refactorComponents() {
  console.log("🔄 Refactoring UI components...");

  try {
    // Create backup directory
    const backupDir = join(__dirname, "backup");
    await mkdir(backupDir, { recursive: true });

    // Write new component templates
    for (const [filename, content] of Object.entries(templates)) {
      const filePath = join(__dirname, filename);

      // Backup existing file if it exists
      try {
        const existing = await readFile(filePath, "utf-8");
        await writeFile(join(backupDir, filename), existing);
        console.log(`📦 Backed up ${filename}`);
      } catch (err) {
        // File doesn't exist, continue
      }

      // Write new component
      await writeFile(filePath, content);
      console.log(`✅ Updated ${filename}`);
    }

    // Write UnoCSS config reminder
    await writeFile(join(__dirname, "uno-config-additions.txt"), unoConfig);
    console.log("📝 Created UnoCSS config additions");

    console.log("🎉 Component refactoring complete!");
    console.log("Next steps:");
    console.log(
      "1. Add uno-config-additions.txt content to your uno.config.ts",
    );
    console.log("2. Run npm run check to verify types");
    console.log("3. Run npm run dev to test components");
  } catch (error) {
    console.error("❌ Error during refactoring:", error);
  }
}

refactorComponents();

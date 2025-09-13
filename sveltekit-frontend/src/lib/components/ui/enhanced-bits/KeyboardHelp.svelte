<!-- Enhanced Bits UI: Keyboard Shortcuts Help Panel -->
<!-- Professional help panel for displaying available keyboard shortcuts -->

<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { cn } from '$lib/utils/cn';
  import { Card } from './index';
  import { Button } from './index';

  // Types
  interface KeyboardShortcut {
    id: string;
    keys: string[];
    description: string;
    category: string;
    enabled?: boolean;
  }

  interface KeyboardHelpProps {
    shortcuts?: KeyboardShortcut[];
    showCategories?: boolean;
    searchable?: boolean;
    className?: string;
    open?: boolean;
  }

  // Props
  let {
    shortcuts = [],
    showCategories = true,
    searchable = true,
    className = '',
    open = $bindable(false)
  }: KeyboardHelpProps = $props();

  // State
  let searchQuery = $state('');
  let selectedCategory = $state('all');

  // Default legal shortcuts for display
  const defaultShortcuts: KeyboardShortcut[] = [
    // Case Management
    { id: 'new-case', keys: ['ctrl', 'shift', 'c'], description: 'Create New Case', category: 'Case Management' },
    { id: 'case-search', keys: ['ctrl', 'shift', 'f'], description: 'Search Cases', category: 'Case Management' },
    { id: 'case-list', keys: ['ctrl', 'shift', 'l'], description: 'View All Cases', category: 'Case Management' },
    
    // Evidence Management
    { id: 'upload-evidence', keys: ['ctrl', 'u'], description: 'Upload Evidence', category: 'Evidence' },
    { id: 'evidence-analysis', keys: ['ctrl', 'shift', 'a'], description: 'AI Evidence Analysis', category: 'Evidence' },
    { id: 'evidence-search', keys: ['ctrl', 'e'], description: 'Search Evidence', category: 'Evidence' },
    
    // AI Tools
    { id: 'ai-assistant', keys: ['ctrl', 'shift', 'i'], description: 'Open AI Assistant', category: 'AI Tools' },
    { id: 'legal-research', keys: ['ctrl', 'shift', 'r'], description: 'Legal Research', category: 'AI Tools' },
    { id: 'document-drafting', keys: ['ctrl', 'shift', 'd'], description: 'AI Document Drafting', category: 'AI Tools' },
    
    // Documents
    { id: 'new-document', keys: ['ctrl', 'n'], description: 'New Document', category: 'Documents' },
    { id: 'save-document', keys: ['ctrl', 's'], description: 'Save Document', category: 'Documents' },
    { id: 'document-review', keys: ['ctrl', 'r'], description: 'Document Review', category: 'Documents' },
    
    // Navigation
    { id: 'dashboard', keys: ['ctrl', 'h'], description: 'Go to Dashboard', category: 'Navigation' },
    { id: 'quick-search', keys: ['ctrl', 'k'], description: 'Quick Search', category: 'Navigation' },
    { id: 'settings', keys: ['ctrl', ','], description: 'Open Settings', category: 'Navigation' },
    
    // Accessibility
    { id: 'accessibility-panel', keys: ['ctrl', 'alt', 'a'], description: 'Accessibility Panel', category: 'Accessibility' },
    { id: 'screen-reader', keys: ['ctrl', 'alt', 's'], description: 'Screen Reader Mode', category: 'Accessibility' },
    { id: 'high-contrast', keys: ['ctrl', 'alt', 'h'], description: 'High Contrast Mode', category: 'Accessibility' },
    
    // Help
    { id: 'keyboard-help', keys: ['shift', '?'], description: 'Keyboard Shortcuts Help', category: 'Help' },
    { id: 'documentation', keys: ['f1'], description: 'Open Documentation', category: 'Help' },
    { id: 'support', keys: ['ctrl', 'shift', 'h'], description: 'Contact Support', category: 'Help' }
  ];

  // Combine default and custom shortcuts
  const allShortcuts = $derived(() => {
    const combined = [...defaultShortcuts, ...shortcuts];
    return combined.filter(s => s.enabled !== false);
  });

  // Filter shortcuts based on search and category
  const filteredShortcuts = $derived(() => {
    let filtered = allShortcuts;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.keys.some(key => key.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  // Get unique categories
  const categories = $derived(() => {
    const cats = new Set(allShortcuts.map(s => s.category));
    return ['all', ...Array.from(cats).sort()];
  });

  // Group shortcuts by category for display
  const groupedShortcuts = $derived(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};
    
    filteredShortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    return groups;
  });

  // Format key combination for display
  function formatKeys(keys: string[]): string {
    return keys.map(key => {
      switch (key) {
        case 'ctrl': return 'Ctrl';
        case 'cmd': return 'Cmd';
        case 'alt': return 'Alt';
        case 'shift': return 'Shift';
        case 'space': return 'Space';
        case 'enter': return 'Enter';
        case 'esc': return 'Esc';
        case 'tab': return 'Tab';
        default: return key.toUpperCase();
      }
    }).join(' + ');
  }

  // Handle escape key to close
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      open = false;
    }
  }

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      open = false;
    }
  }

  onMount(() => {
    if (!browser) return;

    // Listen for global keyboard help shortcut
    function handleGlobalShortcut(event: KeyboardEvent) {
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        open = !open;
      }
    }

    document.addEventListener('keydown', handleGlobalShortcut);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalShortcut);
    };
  });
</script>

<!-- Help Panel Modal -->
{#if open}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="keyboard-help-title"
  >
    <Card class={cn("w-full max-w-4xl max-h-[90vh] flex flex-col", className)}>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-nier-border-muted">
        <div>
          <h2 id="keyboard-help-title" class="text-2xl font-bold text-nier-text-primary">
            ⌨️ Keyboard Shortcuts
          </h2>
          <p class="text-sm text-nier-text-secondary mt-1">
            Boost your productivity with these keyboard shortcuts
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onclick={() => open = false}
          class="text-nier-text-secondary hover:text-nier-text-primary"
          aria-label="Close keyboard shortcuts help"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </Button>
      </div>

      <!-- Search and Filters -->
      {#if searchable || showCategories}
        <div class="p-6 border-b border-nier-border-muted">
          <div class="flex flex-col sm:flex-row gap-4">
            <!-- Search -->
            {#if searchable}
              <div class="flex-1">
                <input
                  type="text"
                  placeholder="Search shortcuts..."
                  bind:value={searchQuery}
                  class="w-full px-4 py-2 border border-nier-border-muted rounded-lg bg-nier-bg-secondary text-nier-text-primary placeholder-nier-text-muted focus:outline-none focus:ring-2 focus:ring-nier-accent-cool"
                />
              </div>
            {/if}

            <!-- Category Filter -->
            {#if showCategories}
              <div class="sm:w-48">
                <select
                  bind:value={selectedCategory}
                  class="w-full px-4 py-2 border border-nier-border-muted rounded-lg bg-nier-bg-secondary text-nier-text-primary focus:outline-none focus:ring-2 focus:ring-nier-accent-cool"
                >
                  {#each categories as category}
                    <option value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Shortcuts Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if Object.keys(groupedShortcuts).length === 0}
          <div class="text-center py-12">
            <div class="text-4xl mb-4">🔍</div>
            <h3 class="text-lg font-medium text-nier-text-primary mb-2">No shortcuts found</h3>
            <p class="text-nier-text-secondary">Try adjusting your search or filter criteria.</p>
          </div>
        {:else}
          <div class="space-y-8">
            {#each Object.entries(groupedShortcuts) as [category, categoryShortcuts]}
              <div>
                <h3 class="text-lg font-semibold text-nier-text-primary mb-4 flex items-center gap-2">
                  {#if category === 'Case Management'}
                    📁
                  {:else if category === 'Evidence'}
                    🔍
                  {:else if category === 'AI Tools'}
                    🤖
                  {:else if category === 'Documents'}
                    📄
                  {:else if category === 'Navigation'}
                    🧭
                  {:else if category === 'Accessibility'}
                    ♿
                  {:else if category === 'Help'}
                    ❓
                  {:else}
                    ⌨️
                  {/if}
                  {category}
                </h3>
                
                <div class="grid gap-3">
                  {#each categoryShortcuts as shortcut}
                    <div class="flex items-center justify-between p-3 rounded-lg bg-nier-bg-tertiary border border-nier-border-muted hover:bg-nier-bg-secondary transition-colors">
                      <div class="flex-1">
                        <p class="text-nier-text-primary font-medium">
                          {shortcut.description}
                        </p>
                      </div>
                      
                      <div class="flex items-center gap-1">
                        {#each shortcut.keys as key, index}
                          {#if index > 0}
                            <span class="text-nier-text-muted text-sm">+</span>
                          {/if}
                          <kbd class="px-2 py-1 text-xs font-mono bg-nier-bg-primary border border-nier-border-strong rounded text-nier-text-primary shadow-sm">
                            {formatKeys([key])}
                          </kbd>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-nier-border-muted bg-nier-bg-secondary">
        <div class="flex items-center justify-between">
          <div class="text-sm text-nier-text-secondary">
            <span class="font-medium">{filteredShortcuts.length}</span> shortcuts available
          </div>
          
          <div class="flex items-center gap-4 text-sm text-nier-text-secondary">
            <div class="flex items-center gap-2">
              <kbd class="px-2 py-1 text-xs font-mono bg-nier-bg-primary border border-nier-border-strong rounded text-nier-text-primary">
                Shift + ?
              </kbd>
              <span>Toggle this help</span>
            </div>
            
            <div class="flex items-center gap-2">
              <kbd class="px-2 py-1 text-xs font-mono bg-nier-bg-primary border border-nier-border-strong rounded text-nier-text-primary">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
{/if}

<style>
  kbd {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  }
</style>
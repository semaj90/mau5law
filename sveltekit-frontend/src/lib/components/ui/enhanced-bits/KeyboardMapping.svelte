<!-- Enhanced Bits UI: Keyboard Mapping Component -->
<!-- Centralized keyboard shortcut management with legal domain focus -->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { cn } from '$lib/utils/cn';

  // Types
  interface KeyboardShortcut {
    id: string;
    keys: string[];
    description: string;
    category: string;
    action: () => void | Promise<void>;
    enabled?: boolean;
    priority?: number;
    global?: boolean;
    preventDefault?: boolean;
  }

  interface KeyboardMappingProps {
    shortcuts?: KeyboardShortcut[];
    enableGlobalShortcuts?: boolean;
    enableDebugMode?: boolean;
    className?: string;
  }

  // Props
  let {
    shortcuts = [],
    enableGlobalShortcuts = true,
    enableDebugMode = false,
    className = ''
  }: KeyboardMappingProps = $props();

  const dispatch = createEventDispatcher<{
    shortcutExecuted: { shortcut: KeyboardShortcut; event: KeyboardEvent };
    shortcutBlocked: { shortcut: KeyboardShortcut; reason: string };
  }>();

  // State
  let pressedKeys = $state<Set<string>>(new Set());
  let activeShortcuts = $state<KeyboardShortcut[]>([]);
  let debugLog = $state<Array<{ timestamp: number; message: string; type: 'info' | 'warn' | 'error' }>>([]);

  // Legal domain default shortcuts
  const defaultLegalShortcuts: KeyboardShortcut[] = [
    // Case Management
    {
      id: 'new-case',
      keys: ['ctrl', 'shift', 'c'],
      description: 'Create New Case',
      category: 'Case Management',
      action: () => goto('/cases/new'),
      global: true,
      priority: 100
    },
    {
      id: 'case-search',
      keys: ['ctrl', 'shift', 'f'],
      description: 'Search Cases',
      category: 'Case Management',
      action: () => goto('/cases/search'),
      global: true,
      priority: 90
    },
    
    // Evidence Management
    {
      id: 'upload-evidence',
      keys: ['ctrl', 'u'],
      description: 'Upload Evidence',
      category: 'Evidence',
      action: () => goto('/evidence/upload'),
      global: true,
      priority: 85
    },
    {
      id: 'evidence-analysis',
      keys: ['ctrl', 'shift', 'a'],
      description: 'AI Evidence Analysis',
      category: 'Evidence',
      action: () => goto('/evidence/analysis'),
      global: true,
      priority: 80
    },

    // AI Assistant
    {
      id: 'ai-assistant',
      keys: ['ctrl', 'shift', 'i'],
      description: 'Open AI Assistant',
      category: 'AI Tools',
      action: () => goto('/ai-assistant'),
      global: true,
      priority: 95
    },
    {
      id: 'legal-research',
      keys: ['ctrl', 'shift', 'r'],
      description: 'Legal Research',
      category: 'AI Tools',
      action: () => goto('/research'),
      global: true,
      priority: 85
    },

    // Document Management
    {
      id: 'new-document',
      keys: ['ctrl', 'n'],
      description: 'New Document',
      category: 'Documents',
      action: () => goto('/documents/new'),
      global: true,
      priority: 75
    },
    {
      id: 'document-review',
      keys: ['ctrl', 'shift', 'd'],
      description: 'Document Review',
      category: 'Documents',
      action: () => goto('/documents/review'),
      global: true,
      priority: 70
    },

    // Navigation
    {
      id: 'dashboard',
      keys: ['ctrl', 'h'],
      description: 'Go to Dashboard',
      category: 'Navigation',
      action: () => goto('/dashboard'),
      global: true,
      priority: 60
    },
    {
      id: 'settings',
      keys: ['ctrl', ','],
      description: 'Open Settings',
      category: 'Navigation',
      action: () => goto('/settings'),
      global: true,
      priority: 50
    },

    // Accessibility
    {
      id: 'accessibility-panel',
      keys: ['ctrl', 'alt', 'a'],
      description: 'Accessibility Panel',
      category: 'Accessibility',
      action: () => document.dispatchEvent(new CustomEvent('toggle-accessibility')),
      global: true,
      priority: 40
    },
    {
      id: 'keyboard-help',
      keys: ['shift', '?'],
      description: 'Keyboard Shortcuts Help',
      category: 'Help',
      action: () => document.dispatchEvent(new CustomEvent('show-keyboard-help')),
      global: true,
      priority: 30
    }
  ];

  // Combine default and custom shortcuts
  const allShortcuts = $derived(() => {
    const combined = [...defaultLegalShortcuts, ...shortcuts];
    return combined
      .filter(s => s.enabled !== false)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  });

  // Key mapping utilities
  function normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      'Control': 'ctrl',
      'Meta': 'cmd',
      'Alt': 'alt',
      'Shift': 'shift',
      ' ': 'space',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'Escape': 'esc',
      'Enter': 'enter',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Tab': 'tab'
    };
    
    return keyMap[key] || key.toLowerCase();
  }

  function formatShortcut(keys: string[]): string {
    const formatted = keys.map(key => {
      switch (key) {
        case 'ctrl': return 'Ctrl';
        case 'cmd': return 'Cmd';
        case 'alt': return 'Alt';
        case 'shift': return 'Shift';
        case 'space': return 'Space';
        default: return key.toUpperCase();
      }
    });
    return formatted.join(' + ');
  }

  function keysMatch(pressed: Set<string>, required: string[]): boolean {
    if (pressed.size !== required.length) return false;
    return required.every(key => pressed.has(key));
  }

  function findMatchingShortcut(pressedKeys: Set<string>): KeyboardShortcut | null {
    return allShortcuts.find(shortcut => 
      keysMatch(pressedKeys, shortcut.keys)
    ) || null;
  }

  function addDebugLog(message: string, type: 'info' | 'warn' | 'error' = 'info') {
    if (!enableDebugMode) return;
    
    debugLog = [...debugLog.slice(-19), {
      timestamp: Date.now(),
      message,
      type
    }];
  }

  // Event handlers
  function handleKeyDown(event: KeyboardEvent) {
    if (!enableGlobalShortcuts && !event.target?.closest?.('[data-keyboard-scope]')) {
      return;
    }

    const key = normalizeKey(event.key);
    
    // Add modifier keys
    if (event.ctrlKey || event.metaKey) pressedKeys.add('ctrl');
    if (event.altKey) pressedKeys.add('alt');
    if (event.shiftKey) pressedKeys.add('shift');
    
    // Add the actual key
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
      pressedKeys.add(key);
    }

    addDebugLog(`Keys pressed: ${Array.from(pressedKeys).join(', ')}`);

    // Check for matching shortcuts
    const matchingShortcut = findMatchingShortcut(pressedKeys);
    
    if (matchingShortcut) {
      // Check if we should prevent default
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }

      try {
        addDebugLog(`Executing shortcut: ${matchingShortcut.id}`);
        matchingShortcut.action();
        
        dispatch('shortcutExecuted', {
          shortcut: matchingShortcut,
          event
        });
      } catch (error) {
        addDebugLog(`Error executing shortcut: ${error}`, 'error');
        dispatch('shortcutBlocked', {
          shortcut: matchingShortcut,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    const key = normalizeKey(event.key);
    
    // Remove modifier keys
    if (!event.ctrlKey && !event.metaKey) pressedKeys.delete('ctrl');
    if (!event.altKey) pressedKeys.delete('alt');
    if (!event.shiftKey) pressedKeys.delete('shift');
    
    // Remove the actual key
    pressedKeys.delete(key);
  }

  function clearPressedKeys() {
    pressedKeys.clear();
  }

  // Lifecycle
  onMount(() => {
    if (!browser) return;

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', clearPressedKeys);
    window.addEventListener('focus', clearPressedKeys);

    addDebugLog('Keyboard mapping initialized');

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', clearPressedKeys);
      window.removeEventListener('focus', clearPressedKeys);
    };
  });

  onDestroy(() => {
    if (browser) {
      clearPressedKeys();
    }
  });

  // Expose API for external use
  export function getActiveShortcuts() {
    return allShortcuts;
  }

  export function getShortcutsByCategory(category: string) {
    return allShortcuts.filter(s => s.category === category);
  }

  export function executeShortcut(id: string) {
    const shortcut = allShortcuts.find(s => s.id === id);
    if (shortcut) {
      try {
        shortcut.action();
        return true;
      } catch (error) {
        console.error(`Failed to execute shortcut ${id}:`, error);
        return false;
      }
    }
    return false;
  }

  // Categories for organization
  const categories = $derived(() => {
    const cats = new Set(allShortcuts.map(s => s.category));
    return Array.from(cats).sort();
  });
</script>

<!-- Keyboard Mapping Display (Optional) -->
{#if enableDebugMode}
  <div class={cn("fixed bottom-4 right-4 z-50 max-w-sm", className)}>
    <div class="bg-black/90 text-white p-4 rounded-lg shadow-xl">
      <h3 class="text-sm font-bold mb-2">Keyboard Debug</h3>
      
      <!-- Currently Pressed Keys -->
      {#if pressedKeys.size > 0}
        <div class="mb-2">
          <span class="text-xs text-gray-300">Pressed:</span>
          <span class="text-xs font-mono text-yellow-300">
            {Array.from(pressedKeys).join(' + ')}
          </span>
        </div>
      {/if}

      <!-- Debug Log -->
      <div class="text-xs space-y-1 max-h-32 overflow-y-auto">
        {#each debugLog.slice(-5) as log}
          <div class="text-gray-300 {log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : ''}">
            {new Date(log.timestamp).toLocaleTimeString()}: {log.message}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Screen Reader Announcements -->
<div class="sr-only" aria-live="polite" id="keyboard-announcements"></div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
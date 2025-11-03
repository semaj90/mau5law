<script lang="ts"> // Svelte, 5 runes are auto-imported import { setContext } from 'svelte'; import { writable } from 'svelte/store'; interface Props { value: string; onValueChange?: (_value: string) => void; unknown}
  let { value, onValueChange, children }: Props = $props(); const activeTab = writable(value); setContext('tabs', { activeTab, setActiveTab: (newValue: string) => { activeTab.set(newValue); if (onValueChange) { onValueChange(newValue); }
    } }); $effect(() => { activeTab.set(value); }); </script> <div class="w-full"> {@render children()} </div>


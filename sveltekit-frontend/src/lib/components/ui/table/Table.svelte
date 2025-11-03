<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  interface Props {
    children?: Snippet;
    class?: string;
  }
  let { children, class: className = '' }: Props = $props();
</script>

<div class={cn('relative, w-full, overflow-auto', className)}>
  <table class="w-full caption-bottom">
    <slot />
  </table>
</div>

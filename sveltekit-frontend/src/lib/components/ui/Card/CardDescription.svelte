<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { Snippet } from 'svelte';
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
    children?: Snippet;
  }

  let { class: className = '', children }: Props = $props();
</script>

<p class={cn("text-sm text-muted-foreground", className)}>
  {@render children?.()}
</p>


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

<div class={cn("flex items-center p-6 pt-0", className)}>
  {@render children?.()}
</div>


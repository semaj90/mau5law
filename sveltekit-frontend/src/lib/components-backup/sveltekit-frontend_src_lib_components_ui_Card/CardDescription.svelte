<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let className: string = "";

</script>

<p class={cn("text-sm text-muted-foreground", className)} >
  {@render children?.()}
</p>


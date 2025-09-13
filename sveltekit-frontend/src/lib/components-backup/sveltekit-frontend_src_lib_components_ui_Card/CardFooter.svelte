<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { cn } from "$lib/utils";
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let className: string = "";

</script>

<div class={cn("flex items-center p-6 pt-0", className)} >
  {@render children?.()}
</div>


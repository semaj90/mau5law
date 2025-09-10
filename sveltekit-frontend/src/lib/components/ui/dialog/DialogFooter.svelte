<script lang="ts">
</script>
  // Props are defined as $props() rune, no import needed

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="space-y-4">
  {@render children?.()}
</div>


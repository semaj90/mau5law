<script lang="ts">
  import 'nes.css/css/nes.min.css';
  // Props are defined as $props() rune, no import needed

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="space-y-4">
  {@render children?.()}
</div>


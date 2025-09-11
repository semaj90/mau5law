<script lang="ts">
  interface Props {
    className?: string;
    children?: import('svelte').Snippet;
  }

  let { className = '', children }: Props = $props();
  // TODO: Convert to $derived: classes = className
</script>

<div className="${1}">
  {@render children?.()}
</div>


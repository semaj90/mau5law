<script lang="ts">
  // Basic Label component
  interface Props {
    for_?: string;
    class_?: string;
    children?: import('svelte').Snippet;
  }

  let { for_ = '', class_ = '', children }: Props = $props();
</script>

<label for={for_} className="${1}">
  {@render children?.()}
</label>


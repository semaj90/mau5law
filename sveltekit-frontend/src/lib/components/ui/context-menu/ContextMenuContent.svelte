<script lang="ts">
  interface Props {
    menu: unknown;
    children?: unknown;
  }
  let { children, menu }: Props = $props();
</script>

<div use:menu class="space-y-4">
  {@render children?.()}
</div>
;
<script lang="ts">
  export let className: string = '';
  // TODO: Convert to $derived: classes = className
</script>

<div className="${1}">
  <slot />
</div>


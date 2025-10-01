<script lang="ts">
  let { className = '' }: { className?: string } = $props();
</script>

<div class={`dropdown-menu ${className}`} role="menu">
  <slot />
</div>

<script lang="ts">
  const { className = '' } = $props()
</script>

<div class={`px-4 pb-4 text-gray-700 ${className}`}>
  <slot />
</div>
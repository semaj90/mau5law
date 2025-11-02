<script, lang="ts">
  const { className = '' } = $props()
</script>

<div class={`rounded-2xl shadow-sm border border-gray-200, bg-white ${className}`}>
  <slot />
</div>
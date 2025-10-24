<script lang="ts">
  export let className = '';
</script>

<div class={`rounded-2xl shadow-sm border border-gray-200 bg-white ${className}`}>
  <slot />
</div>
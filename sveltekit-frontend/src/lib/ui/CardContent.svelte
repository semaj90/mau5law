<script lang="ts">
  export let className = '';
</script>

<div class={`px-4 pb-4 text-gray-700 ${className}`}>
  <slot />
</div>
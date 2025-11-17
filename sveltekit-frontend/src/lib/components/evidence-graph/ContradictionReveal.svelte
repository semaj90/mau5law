<script lang="ts">
  let { message = "CONTRADICTION DETECTED!", show = false } = $props // TODO: Verify store subscription is correct for Svelte 5();
</script>

<div class="fixed inset-0 flex items-center justify-center"
     class:hidden={!show}>
  <div class="text-6xl font-bold text-red-500 animate-ping">
    {message}
  </div>
</div>
<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script>
</script>
  export let status = 'ok';
  export let label = 'System';
</script>
<div class="system-card">
  <strong>{label}:</strong> {status}
</div>

<style>
  .system-card{padding:.5rem;border:1px solid #ddd;border-radius:6px}
</style>


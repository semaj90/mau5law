<!-- @migration-task Error while migrating Svelte code: Expected a valid element or component name. Components must have a valid variable name or dot notation expression
https://svelte.dev/e/tag_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: Expected a valid element or component name. Components must have a valid variable name or dot notation expression -->
<script lang="ts">
  // Local shim: sveltekit-superforms' SuperDebug has duplicate top-level <script>
  </script> in dist build
  // Provide a no-op component during migration to avoid build-time parse errors.
  // Convert to Svelte 5 runes pattern
  let { debug = false } = $props<{
    debug?: boolean;
  }>();
</script>

<!-- Minimal visual placeholder -->
{#if debug}
  <div class="superdebug-shim">SuperDebug shim active</div>
{/if}


<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  interface Props {
    trigger: any
    selectedLabel: any
  }
  let {
    trigger,
    selectedLabel
  } = $props();



  
  
    </script>

<button  class="space-y-4">
  <slot {selectedLabel} />
</button>

<style>
  /* @unocss-include */
  .select-trigger {
    display: flex
    align-items: center
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white
    min-width: 8rem;
}
</style>


<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  interface Props {
    trigger: any
  }
  let {
    trigger
  } = $props();



  </script>

<button use:trigger >
  <slot></slot>
</button>


<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
</script>
  interface Props {
    menu: any
  }
  let {
    menu
  } = $props();



  </script>

<div 
  use:menu 
  class="space-y-4"
  
>
  <slot></slot>
</div>


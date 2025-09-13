<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
</script>
  interface Props {
    trigger: any
  }
  let {
    trigger
  } = $props();



  </script>

<div use:trigger >
  <slot></slot>
</div>


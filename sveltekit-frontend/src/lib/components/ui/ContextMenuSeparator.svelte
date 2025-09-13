<!-- @migration-task Error while migrating Svelte code: Expected token }
https://svelte.dev/e/expected_token -->
<!-- @migration-task Error while migrating Svelte code: Expected token } -->
<script lang="ts">
  import 'nes.css/css/nes.min.css';
</script>
  interface Props {
    class_: string ;
  }
  let {
    class_ = ''
  }: Props = $props();

  </script>

<div class="my-1 h-px bg-gray-200 dark:bg-gray-700 {class_}" role="separator"></div>


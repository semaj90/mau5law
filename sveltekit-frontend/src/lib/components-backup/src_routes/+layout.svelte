<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open
https://svelte.dev/e/element_invalid_closing_tag -->
<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script>
  import 'nes.css/css/nes.min.css';
</script>
  import '../lib/styles/theme.css';
</script>

<main>
  <slot />
</main>

<style>
  main {
    min-height: 100vh;
    padding: 0;
    margin: 0;
  }
</style>

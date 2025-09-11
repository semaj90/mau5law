<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open
https://svelte.dev/e/element_invalid_closing_tag -->
<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script>
</script>
  let show = false;
</script>

<slot {show} toggle={() => (show = !show)} />


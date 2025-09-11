<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script>
</script>
  export let title = 'Detective Dashboard';
</script>

<div class="detective-layout">
  <header><h1>{title}</h1></header>
  <main>
    <slot />
  </main>
  <style>
    .detective-layout{padding:1rem}
    header{margin-bottom:1rem}
  </style>
</div>


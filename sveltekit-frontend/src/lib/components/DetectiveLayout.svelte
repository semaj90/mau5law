<script>
</script>
  export let title = "Detective Interface";
  export let subtitle = "";
</script>

<style>
  .detective-layout {
	max-width: 100%;
	margin: 0 auto;
	padding: 1rem;
	box-sizing: border-box;
  }

  .header {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	margin-bottom: 1rem;
  }

  h1 {
	margin: 0;
	font-size: 1.25rem;
	line-height: 1.2;
  }

  .subtitle {
	margin: 0;
	color: #6b7280;
	font-size: 0.9rem;
  }

  main {
	min-height: 200px;
  }
</style>

<div class="detective-layout" role="region" aria-label={title}>
  <header class="header">
	<h1>{title}</h1>
	{#if subtitle}
	  <div class="subtitle">{subtitle}</div>
	{/if}
  </header>

  <main role="main">
	<slot />
  </main>
</div>


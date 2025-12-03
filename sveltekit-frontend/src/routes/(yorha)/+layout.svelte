<script lang="ts">
</script>

<svelte:head>
	<title>YoRHa Detective Interface</title>
	<meta name="description" content="YoRHa Legal AI Detective Interface" />
</svelte:head>

<div class="yorha-shell">
	<slot />
</div>

<style>
	:global(.yorha-shell) {
		background: var(--yorha-bg);
		color: var(--yorha-panel-darker);
		font-family: var(--yorha-font-main);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>

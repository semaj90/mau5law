<!-- Minimal layout to bypass SSR failures -->
<script lang="ts">
	// No problematic imports - keep it simple
	import '../app.css';
</script>

<main>
	<slot />
</main>
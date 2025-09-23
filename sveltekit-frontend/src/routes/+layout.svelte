<!-- App-wide layout with session management and global sidebar -->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import SessionInitializer from '$lib/components/SessionInitializer.svelte';
	import GlobalSidebar from '$lib/components/GlobalSidebar.svelte';
	import CSSActivator from '$lib/components/ui/CSSActivator.svelte';
	import { isAuthenticated, sessionActions } from '$lib/stores/sessionStore.svelte';

	// Use Svelte 5 runes pattern for reactive state
	let showSidebar = $derived(isAuthenticated);

	let { children, data } = $props();

	// Initialize session with page data on mount
	$effect(() => {
		if (data) {
			sessionActions.init(data);
		}
	});
</script>

<!-- Initialize session management app-wide -->
<SessionInitializer />

<!-- Hidden CSS activator to prevent unused selector warnings -->
<CSSActivator />

<!-- Show sidebar only when user is authenticated -->
{#if showSidebar}
	<GlobalSidebar />
{/if}

<main class:with-sidebar={showSidebar}>
	{@render children()}
</main>

<style>
	main {
		transition: margin-left 0.3s ease;
	}

	main.with-sidebar {
		margin-left: 320px;
	}

	@media (max-width: 768px) {
		main.with-sidebar {
			margin-left: 0;
		}
	}
</style>
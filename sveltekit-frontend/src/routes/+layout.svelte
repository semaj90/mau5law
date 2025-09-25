<!-- App-wide layout with session management and global sidebar -->
<script lang="ts">
	import '../app.css';
	import SessionInitializer from '$lib/components/SessionInitializer.svelte';
	import GlobalSidebar from '$lib/components/GlobalSidebar.svelte';
	import CSSActivator from '$lib/components/ui/CSSActivator.svelte';

	interface Props {
		children: any;
		data: {
			user: any;
			session: any;
			isAuthenticated?: boolean;
			startupStatus?: any;
		};
	}

	// Use proper SvelteKit data flow pattern - no global stores
	let { children, data }: Props = $props();

	// Derive authentication state from server data
	const isAuthenticated = $derived(!!data.user);
	const user = $derived(data.user);
	const session = $derived(data.session);

	// Show sidebar only when user is authenticated
	const showSidebar = $derived(isAuthenticated);
</script>

<!-- Initialize session management app-wide -->
<SessionInitializer {user} {session} {isAuthenticated} />

<!-- Hidden CSS activator to prevent unused selector warnings -->
<CSSActivator />

<!-- Show sidebar only when user is authenticated -->
{#if showSidebar}
	<GlobalSidebar {user} {session} />
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
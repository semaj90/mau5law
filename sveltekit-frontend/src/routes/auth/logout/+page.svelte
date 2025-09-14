<!--
Logout Route - Handles user logout
TODO: Implement logout functionality, clear session, redirect to login
-->
<script lang="ts">
	import EssentialRoutePage from '$lib/templates/EssentialRoutePage.svelte';
	import { Button } from '$lib/components/ui/enhanced-bits';
	import * as Card from '$lib/components/ui/card';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let isLoggingOut = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			// TODO: Call logout API
			// await fetch('/api/auth/logout', { method: 'POST' });

			// Clear localStorage
			if (typeof window !== 'undefined') {
				localStorage.removeItem('user');
				localStorage.removeItem('token');
			}

			// Redirect to login
			setTimeout(() => {
				goto('/auth/login');
			}, 1000);
		} catch (error) {
			console.error('Logout failed:', error);
			isLoggingOut = false;
		}
	}

	onMount(() => {
		// Auto-logout in 3 seconds if user doesn't cancel
		const timer = setTimeout(handleLogout, 3000);
		return () => clearTimeout(timer);
	});
</script>

<EssentialRoutePage
	pageTitle="Logout"
	description="Signing you out of the Legal AI Platform"
	showBackButton={true}
>
	{#snippet children()}
		<Card.Root class="nes-container is-rounded max-w-md mx-auto">
			<Card.Content class="p-8 text-center">
				<div class="mb-6">
					<div class="text-4xl mb-4">👋</div>
					<h2 class="nes-text is-primary text-lg mb-2">
						Signing Out
					</h2>
					<p class="nes-text is-disabled text-sm">
						{#if isLoggingOut}
							Logging you out...
						{:else}
							Are you sure you want to logout?
						{/if}
					</p>
				</div>

				{#if !isLoggingOut}
					<div class="flex justify-center gap-4">
						<Button
							class="nes-btn is-error"
							on:click={handleLogout}
							disabled={isLoggingOut}
						>
							Logout Now
						<Button
							variant="outline"
							class="nes-btn"
							on:click={() => window.history.back()}
						>
							Cancel
					</div>
				{:else}
					<div class="animate-pulse">
						<div class="nes-text is-primary">Redirecting...</div>
					</div>
				{/if}
			</div.Content>
		</div.Root>
	{/snippet}
</EssentialRoutePage>
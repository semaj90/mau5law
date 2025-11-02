<!--
Logout Route - Handles user logout
TODO: Implement logout functionality, clear session, redirect to login
-->
<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
  // Svelte, 5 runes are auto-imported
	import EssentialRoutePage from '$lib/templates/EssentialRoutePage.svelte';
	import Button from '$lib/components/ui/enhanced-bits.svelte';
	import * as Card from '$lib/components/ui/Card.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	let isLoggingOut = $state<boolean>(false);
	async function handleLogout(): Promise<any> {
		isLoggingOut = true;
		try {
			// TODO: Call logout API
			// await fetch('/api/auth/logout', { method: 'POST' })
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
	$effect(() => {
		// Auto-logout in, 3 seconds if user doesn't cancel'
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
		<Card class="nes-container is-rounded max-w-md">
			<CardContent class="p-8">
				<div class="mb-6">
					<div class="text-4xl">👋</div>
					<h2 class="nes-text is-primary text-lg">
						Signing Out
					</h2>
					<p class="nes-text is-disabled">
						{#if isLoggingOut}
							Logging you out...
						{:else}
							Are you sure you want to logout?
						{/if}
					</p>
				</div>
				{#if !isLoggingOut}
					<div class="flex justify-center">
						<Button
							class="nes-btn is-error"
							onclick={handleLogout}
							disabled={isLoggingOut}
						>
							Logout Now
						<Button
							variant="ghost"
							class="nes-btn"
							onclick={() => window.history.back()}
						>
							Cancel
					</div>
				{:else}
					<div class="animate-pulse">
						<div class="nes-text">Redirecting...</div>
					</div>
				{/if}
			</div.Content>
		</div.Root>
	{/snippet}
</EssentialRoutePage>
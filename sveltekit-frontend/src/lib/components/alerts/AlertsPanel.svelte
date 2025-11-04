<script lang="ts">
	import { fly } from 'svelte/transition';
	import { X } from '$lib/components/icons';
	// This component assumes an alert store exists, e.g., at $lib/stores/alertStore.ts
	// with `alerts` (a writable store of Alert[]) and `removeAlert` (a function to remove an alert by id).
	import { alerts, removeAlert } from '$lib/stores/alerts';
	import type { Alert } from '$lib/stores/alerts';

	const alertClasses: Record<Alert['type'], string> = {
		info: 'bg-blue-100 border-blue-500 text-blue-700',
		success: 'bg-green-100 border-green-500 text-green-700',
		warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
		error: 'bg-red-100 border-red-500 text-red-700'
	};
</script>

{#if $alerts.length > 0}
	<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md">
		{#each $alerts as alert (alert.id)}
			<div
				in:fly={{ x: 200, duration: 300 }}
				out:fly={{ x: 200, duration: 300, opacity: 0 }}
				class="relative w-full p-4 border-l-4 rounded-md shadow-lg {alertClasses[alert.type]}"
				role="alert"
			>
				<div class="flex items-start">
					<div class="flex-1">
						<p class="font-bold capitalize">{alert.type}</p>
						<p class="text-sm">{alert.message}</p>
					</div>
					<button
						type="button"
						onclick={() => removeAlert(alert.id)}
						class="ml-4 p-1 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
						aria-label="Dismiss"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

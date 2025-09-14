<!--
All Routes Testing Page - Simple working version
-->
<script lang="ts">
	import { onMount } from 'svelte';

	let message = $state('All Routes Test - Working Version');
	let isLoaded = $state(false);

	onMount(() => {
		isLoaded = true;
		console.log('All routes page loaded successfully');
	});
</script>

<div class="container mx-auto p-6">
	<h1 class="text-2xl font-bold mb-4 text-center">🧪 All Routes Testing</h1>

	{#if isLoaded}
		<div class="bg-green-100 border-2 border-green-400 text-green-800 px-6 py-4 rounded-lg mb-6">
			<h2 class="font-bold text-lg">✅ Success!</h2>
			<p>The /all-routes page is now working correctly.</p>
		</div>

		<div class="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
			<h3 class="font-semibold text-lg mb-2">Status</h3>
			<p>{message}</p>
		</div>
	{:else}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2">Loading...</p>
		</div>
	{/if}

	<div class="mt-8 bg-gray-50 p-6 rounded-lg">
		<h2 class="text-xl font-semibold mb-4">📋 Next Steps:</h2>
		<div class="grid md:grid-cols-2 gap-4">
			<div>
				<h3 class="font-medium mb-2">✨ Features to Add:</h3>
				<ul class="list-disc list-inside space-y-1 text-sm">
					<li>Route testing functionality</li>
					<li>Status checking for each route</li>
					<li>Performance metrics</li>
					<li>Error reporting</li>
				</ul>
			</div>
			<div>
				<h3 class="font-medium mb-2">🔧 Technical Tasks:</h3>
				<ul class="list-disc list-inside space-y-1 text-sm">
					<li>Add NES.css styling</li>
					<li>Integrate enhanced-bits components</li>
					<li>Add route categorization</li>
					<li>Implement search and filtering</li>
				</ul>
			</div>
		</div>
	</div>

	<div class="mt-6 text-center">
		<p class="text-sm text-gray-600">
			Route successfully created at: <code>/all-routes</code>
		</p>
	</div>
</div>
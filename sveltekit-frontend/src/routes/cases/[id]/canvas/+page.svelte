<!--
Evidence Canvas Route - Lazy Loaded for Performance
Heavy components: Fabric.js canvas, drag-drop, image processing
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import EssentialRoutePage from '$lib/templates/EssentialRoutePage.svelte';
	import { Button } from '$lib/components/ui/enhanced-bits';
	import * as Card from '$lib/components/ui/card';

	// Get case ID from route params
	const caseId = $page.params.id;

	// Lazy loaded components state
	let canvasComponents = $state({
		FabricCanvas: null,
		EvidenceNode: null,
		DragDropZone: null,
		DetectiveBoard: null,
		loaded: false,
		loading: false,
		error: null
	});

	let canvasData = $state({
		evidence: [],
		connections: [],
		canvasReady: false
	});

	// Load heavy canvas components on demand
	async function loadCanvasComponents() {
		if (canvasComponents.loading || canvasComponents.loaded) return;

		canvasComponents.loading = true;
		canvasComponents.error = null;

		try {
			console.log('<¨ Loading canvas components...');

			// Load all heavy components in parallel
			const [fabricModule, nodeModule, dragModule, boardModule] = await Promise.all([
				import('$lib/components/canvas/FabricCanvas.svelte'),
				import('$lib/components/canvas/EvidenceNode.svelte'),
				import('$lib/components/upload/DragDropZone.svelte'),
				import('$lib/components/detective/DetectiveBoard.svelte')
			]);

			canvasComponents = {
				FabricCanvas: fabricModule.default,
				EvidenceNode: nodeModule.default,
				DragDropZone: dragModule.default,
				DetectiveBoard: boardModule.default,
				loaded: true,
				loading: false,
				error: null
			};

			console.log(' Canvas components loaded successfully');

			// Initialize canvas data
			await loadCaseEvidence();

		} catch (error) {
			console.error('L Failed to load canvas components:', error);
			canvasComponents.loading = false;
			canvasComponents.error = error.message || 'Failed to load canvas components';
		}
	}

	// Load case-specific evidence data
	async function loadCaseEvidence() {
		try {
			// TODO: Replace with actual API call
			// const response = await fetch(`/api/cases/${caseId}/evidence`);
			// const evidence = await response.json();

			// Mock evidence data for now
			canvasData.evidence = [
				{
					id: '1',
					title: 'Crime Scene Photo',
					type: 'image',
					x: 100,
					y: 100,
					caseId
				},
				{
					id: '2',
					title: 'Witness Statement',
					type: 'document',
					x: 300,
					y: 150,
					caseId
				}
			];

			canvasData.canvasReady = true;

		} catch (error) {
			console.error('Failed to load case evidence:', error);
		}
	}

	// Auto-load components when route loads
	onMount(() => {
		loadCanvasComponents();
	});

	// Manual reload function
	function reloadCanvas() {
		canvasComponents = {
			FabricCanvas: null,
			EvidenceNode: null,
			DragDropZone: null,
			DetectiveBoard: null,
			loaded: false,
			loading: false,
			error: null
		};
		loadCanvasComponents();
	}
</script>

<EssentialRoutePage
	pageTitle="Evidence Canvas"
	description="Interactive evidence positioning and relationship analysis for Case #{caseId}"
	showBackButton={true}
>
	{#snippet children()}
		{#if canvasComponents.loading}
			<!-- Loading State with Progress -->
			<Card.Root class="nes-container is-rounded">
				<Card.Content class="p-8 text-center">
					<div class="loading-animation mb-6">
						<div class="text-6xl mb-4 animate-pulse"><¨</div>
						<h2 class="nes-text is-primary text-lg mb-2">
							Loading Evidence Canvas
						</h2>
						<p class="nes-text is-disabled text-sm mb-4">
							Initializing Fabric.js, drag-drop, and canvas components...
						</p>

						<!-- Progress Steps -->
						<div class="space-y-2">
							<div class="nes-text text-xs">
								=æ Loading canvas library...
							</div>
							<div class="nes-text text-xs">
								=' Setting up evidence nodes...
							</div>
							<div class="nes-text text-xs">
								¡ Preparing GPU acceleration...
							</div>
						</div>
					</div>

					<!-- Loading Bar -->
					<div class="nes-container is-rounded p-2 bg-gray-800">
						<div class="h-2 bg-primary animate-pulse rounded"></div>
					</div>
				</Card.Content>
			</Card.Root>

		{:else if canvasComponents.error}
			<!-- Error State -->
			<Card.Root class="nes-container is-rounded">
				<Card.Content class="p-8 text-center">
					<div class="text-4xl mb-4"> </div>
					<h2 class="nes-text is-error text-lg mb-2">
						Failed to Load Canvas
					</h2>
					<p class="nes-text is-disabled text-sm mb-6">
						{canvasComponents.error}
					</p>
					<div class="flex justify-center gap-4">
						<Button class="nes-btn is-error" onclick={reloadCanvas}>
							Retry Loading
						</Button>
						<Button
							variant="outline"
							class="nes-btn"
							onclick={() => window.history.back()}
						>
							Go Back
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

		{:else if canvasComponents.loaded}
			<!-- Canvas Interface - Loaded Successfully -->
			<div class="canvas-interface grid grid-cols-1 lg:grid-cols-4 gap-6">

				<!-- Tools Sidebar -->
				<div class="lg:col-span-1">
					<Card.Root class="nes-container is-rounded mb-4">
						<Card.Header>
							<Card.Title class="nes-text is-primary text-sm">
								Canvas Tools
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								<Button class="nes-btn w-full text-xs" size="sm">
									<¯ Select Mode
								</Button>
								<Button class="nes-btn w-full text-xs" size="sm" variant="outline">
									 Draw Connections
								</Button>
								<Button class="nes-btn w-full text-xs" size="sm" variant="outline">
									=÷ Take Screenshot
								</Button>
								<Button class="nes-btn w-full text-xs" size="sm" variant="outline">
									=¾ Save Layout
								</Button>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Upload Zone -->
					<Card.Root class="nes-container is-rounded">
						<Card.Content class="p-4">
							{#if canvasComponents.DragDropZone}
								<svelte:component
									this={canvasComponents.DragDropZone}
									{caseId}
									onUpload={(evidence) => {
										canvasData.evidence = [...canvasData.evidence, evidence];
									}}
								/>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Main Canvas Area -->
				<div class="lg:col-span-3">
					<Card.Root class="nes-container is-rounded h-[600px]">
						<Card.Header>
							<div class="flex justify-between items-center">
								<Card.Title class="nes-text is-primary">
									Evidence Canvas - Case #{caseId}
								</Card.Title>
								<div class="flex items-center gap-2">
									<span class="nes-badge is-success">
										{canvasData.evidence.length} items
									</span>
									<span class="nes-badge">
										{canvasData.connections.length} connections
									</span>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="p-0 h-full">
							{#if canvasComponents.FabricCanvas && canvasData.canvasReady}
								<svelte:component
									this={canvasComponents.FabricCanvas}
									evidence={canvasData.evidence}
									connections={canvasData.connections}
									{caseId}
								/>
							{:else}
								<div class="flex items-center justify-center h-full">
									<div class="nes-text is-disabled animate-pulse">
										Preparing canvas...
									</div>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</div>

			<!-- Evidence List -->
			<Card.Root class="nes-container is-rounded mt-6">
				<Card.Header>
					<Card.Title class="nes-text is-primary">Evidence Items</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if canvasData.evidence.length > 0}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							{#each canvasData.evidence as item}
								<div class="nes-container with-title is-centered">
									<p class="title">{item.title}</p>
									<div class="text-xs">
										<div>Type: {item.type}</div>
										<div>Position: ({item.x}, {item.y})</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-4">
							<div class="nes-text is-disabled">
								No evidence items yet. Upload evidence to get started.
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

		{:else}
			<!-- Initial State -->
			<Card.Root class="nes-container is-rounded">
				<Card.Content class="p-8 text-center">
					<div class="text-4xl mb-4"><¨</div>
					<h2 class="nes-text is-primary text-lg mb-2">
						Evidence Canvas Ready
					</h2>
					<p class="nes-text is-disabled text-sm mb-6">
						Click to load the interactive evidence canvas
					</p>
					<Button class="nes-btn is-primary" onclick={loadCanvasComponents}>
						Load Canvas Interface
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	{/snippet}
</EssentialRoutePage>

<style>
	.canvas-interface {
		min-height: 600px;
	}

	.loading-animation {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: .5;
		}
	}
</style>
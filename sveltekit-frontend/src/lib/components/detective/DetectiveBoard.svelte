<!-- DetectiveBoard.svelte - enhanced-bits + bits-ui + nes.css integration -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	// UI libraries
	import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '$lib/components/ui/enhanced-bits';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import Badge from '$lib/components/ui/Badge.svelte';
	import 'nes.css/css/nes.min.css';

	// utils & services
	import Fuse from 'fuse.js';
	import { dndzone } from 'svelte-dnd-action';

	// App stores & AI
	import { evidenceStore  } from '$lib/stores/unified';
	import { aiAssistant  } from '$lib/stores/unified';
	import AIAssistantPanel from '../ai/AIAssistantPanel.svelte';
	import EvidenceCard from './EvidenceCard.svelte';
	import UploadZone from './UploadZone.svelte';
	import { analyzeEvidence, findEvidenceConnections } from '$lib/ai/ai-service';
	import { rabbitMQService } from '$lib/services/rabbitmq-service';
	import { VectorService } from '$lib/services/vector-service';
	import { gpuAccelerationService as gpuService } from '$lib/services/gpu-acceleration-service';

	const vectorService = new VectorService();

	// Svelte 5 runes (assumes project configured for runes)
	let evidenceStoreState = $state<any>({ evidence: [], isLoading: false, error: null, isConnected: false });
	let allEvidence = $derived(evidenceStoreState.evidence || []);
	let caseId = $state('case-001');
	let viewMode = $state<'columns' | 'canvas'>('columns');
	let showAIAssistant = $state(true);
	let selectedEvidenceIds = $state<string[]>([]);
	let aiHighlightedEvidence = $state<string[]>([]);
	let canvasContainer = $state<HTMLDivElement | undefined>();
	let columns = $state([
		{ id: 'new', title: 'New Evidence', items: [] },
		{ id: 'processing', title: 'Processing', items: [] },
		{ id: 'verified', title: 'Verified', items: [] }
	]);
	let canvasEvidence = $state([]);
	let activeUsers = $state([]);
	let systemStatus = $state({
		rabbitMQ: { connected: false, health: 'unknown' },
		postgreSQL: { connected: false, vectorCount: 0 },
		gpu: { available: false, utilization: 0, model: 'RTX 3060 Ti' },
		processingStats: { totalFiles: 0, processed: 0, queued: 0 }
	});
	let findModal = $state({ show: false, query: '', results: [] as any[], loading: false, error: '', suggestions: [] as any[] });

	// Subscribe evidence store
	$effect(() => {
		const unsubscribe = evidenceStore.subscribe((v) => {
			evidenceStoreState = v;
		});
		return () => unsubscribe();
	});

	// Init systems
	$effect(() => {
		void (async () => {
			await initializeEnhancedSystems();
			setupRealTimeUpdates();
		})();
	});

	async function initializeEnhancedSystems() {
		try {
			await rabbitMQService.connect();
			systemStatus.rabbitMQ.connected = true;
			systemStatus.rabbitMQ.health = 'connected';
		} catch (e) {
			console.warn('RabbitMQ connection failed', e);
		}
		try {
			systemStatus.postgreSQL.connected = true;
			systemStatus.postgreSQL.vectorCount = 0;
		} catch (e) {
			console.warn('Postgres/vector status failed', e);
		}
		try {
			const gpuStatus = await gpuService.getStatus();
			systemStatus.gpu.available = !!gpuStatus?.webgpuSupported;
			systemStatus.gpu.utilization = gpuStatus?.accelerationActive ? 75 : 0;
		} catch (e) {
			console.warn('GPU service failed', e);
		}
	}

	function setupRealTimeUpdates() {
		console.log('Real-time updates initialized');
	}

	function updateProcessingStats(message: any) {
		systemStatus.processingStats.queued = message?.queuedCount ?? 0;
		systemStatus.processingStats.processed = message?.processedCount ?? 0;
	}

	function updateEvidenceStatus(message: any) {
		const evidenceId = message?.evidenceId;
		const newStatus = message?.status;
		if (!evidenceId || !newStatus) return;
		moveEvidenceBetweenColumns(evidenceId, newStatus);
	}

	function moveEvidenceBetweenColumns(evidenceId: string, newStatus: string) {
		const targetColumnId = newStatus === 'completed' ? 'verified' : 'processing';
		columns = columns.map((col) => {
			const idx = col.items.findIndex((it: any) => it.id === evidenceId);
			if (idx !== -1) {
				const [item] = col.items.splice(idx, 1);
				return col;
			}
			return col;
		});
		const item = columns.reduce((acc: any, col: any) => acc || col.items.find((i: any) => i.id === evidenceId), null);
		if (item) {
			columns = columns.map((col) => (col.id === targetColumnId ? { ...col, items: [...col.items, item] } : col));
		}
	}

	function switchViewMode(mode: 'columns' | 'canvas') {
		viewMode = mode;
	}

	function handleFileUpload(result: any, columnId: string) {
		const newEvidence = {
			id: result?.id ?? `evidence-${Date.now()}-${Math.random()}`,
			title: result?.originalName ?? result?.fileName ?? 'Untitled',
			fileName: result?.fileName,
			fileSize: result?.fileSize,
			type: result?.metadata?.evidenceType ?? 'document',
			evidenceType: result?.metadata?.evidenceType ?? 'document',
			createdAt: new Date(result?.metadata?.uploadedAt ?? Date.now()),
			tags: [],
			x: 100 + Math.random() * 200,
			y: 100 + Math.random() * 200,
			url: result?.url,
			bucket: result?.bucket,
			hash: result?.hash,
			minioId: result?.id,
			caseId: result?.metadata?.caseId
		};
		columns = columns.map((col) => (col.id === columnId ? { ...col, items: [...col.items, newEvidence] } : col));
	}

	function handleUploadError(error: string, _columnId: string) {
		console.error('Upload error:', error);
	}

	function handleDndConsider(e: any, _columnId: string) {
		// dnd consider event
		// use e(vent as CustomEvent).detail for positions if needed
		// console.log('dnd consider', e);
	}

	function handleDndFinalize(e: any, columnId: string) {
		// finalize - update order in the specific column
		const { items } = (e as CustomEvent).detail ?? {};
		if (Array.isArray(items)) {
			columns = columns.map((col) => (col.id === columnId ? { ...col, items } : col));
		}
	}



	function broadcastPositionUpdate(id: string, x: number, y: number) {
		console.log('Position update', id, x, y);
	}

	function handleViewEvidence(item: any) {
		window.open(`/evidence/${item.id}`, '_blank');
	}


	function toggleAIAssistant() {
		showAIAssistant = !showAIAssistant;
	}

	function handleEvidenceSelect(evidenceId: string) {
		if (selectedEvidenceIds.includes(evidenceId)) {
			selectedEvidenceIds = selectedEvidenceIds.filter((id) => id !== evidenceId);
		} else {
			selectedEvidenceIds = [...selectedEvidenceIds, evidenceId];
		}
	}

	function handleEvidenceHighlight(evidenceIds: string[]) {
		aiHighlightedEvidence = [...evidenceIds];
		setTimeout(() => {
			aiHighlightedEvidence = [];
		}, 3000);
	}

	function handleAIActionTrigger(payload: any) {
		const { type, data } = payload ?? {};
		switch (type) {
			case 'suggestions':
				console.log('AI suggestions', data);
				break;
			case 'evidence-connect':
				console.log('Evidence connections', data);
				break;
		}
	}

	async function analyzeSelectedEvidence() {
		if (selectedEvidenceIds.length === 0) return;
		try {
			if (selectedEvidenceIds.length === 1) {
				await analyzeEvidence(caseId, selectedEvidenceIds[0]);
			} else {
				await findEvidenceConnections(caseId, selectedEvidenceIds);
			}
		} catch (e) {
			console.error('Analyze failed', e);
		}
	}

	$effect(() => {
		if (caseId) {
			aiAssistant.initializeCase(caseId, 'Detective Board Case');
			(allEvidence ?? []).forEach((e: any) => {
				aiAssistant.addEvidence(caseId, {
					id: e.id,
					title: e.title ?? e.fileName ?? 'Unknown Evidence',
					annotations: e.annotations ?? [],
					connections: e.connections ?? []
				});
			});
		}
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeFindModal();
		}
	}

	async function saveTo(target: string, item: any) {
		if (!item) return;
		try {
			await fetch('/api/user-activity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: null,
					evidenceId: item.id,
					action: 'save',
					target
				})
			});
		} catch (e) {
			console.warn('User activity store update failed', e);
		}
	}

	function openFindModal(item: any) {
		findModal.show = true;
		findModal.query = item?.title || '';
		findModal.results = [];
		findModal.loading = false;
		findModal.error = '';
		findModal.suggestions = [];
	}

	function closeFindModal() {
		findModal.show = false;
	}

	async function runFindSearch(item: any) {
		if (!item) return closeFindModal();
		findModal.loading = true;
		findModal.error = '';
		findModal.results = [];
		findModal.suggestions = [];
		try {
			const items = allEvidence ?? [];
			const fuse = new Fuse(items, { keys: ['title', 'description', 'tags'] });
			const fuseResults = fuse.search(findModal.query || item?.title || '');
			findModal.results = fuseResults.map((r) => r.item);
		} catch (e) {
			findModal.error = 'Local search failed';
		}
		try {
			const resp = await fetch('/api/vector-search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: findModal.query || item?.title || ''
				})
			});
			if (resp.ok) {
				const vectorResults = await resp.json();
				findModal.results = [...findModal.results, ...(vectorResults || [])];
			}
		} catch (e) {
			findModal.error += ' Qdrant search failed.';
		}
		findModal.loading = false;
	}

	function handleCanvasDrop(e: DragEvent) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('text/plain');
		if (!data) return;
		try {
			const item = JSON.parse(data);
			const rect = canvasContainer?.getBoundingClientRect();
			if (rect) {
				item.x = e.clientX - rect.left;
				item.y = e.clientY - rect.top;
				canvasEvidence = [...canvasEvidence, item];
			}
		} catch (err) {
			console.error('Failed to parse dropped data', err);
		}
	}

	function handleCanvasDragStart(e: DragEvent, item: any) {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify(item));
		}
	}

	function handleCanvasDragEnd(e: DragEvent, item: any) {
		const rect = canvasContainer?.getBoundingClientRect();
		if (rect) {
			const newX = e.clientX - rect.left;
			const newY = e.clientY - rect.top;
			canvasEvidence = canvasEvidence.map((ex: any) => (ex.id === item.id ? { ...ex, x: newX, y: newY } : ex));
			broadcastPositionUpdate(item.id, newX, newY);
		}
	}

	function getConnections() {
		const connections: any[] = [];
		for (let i = 0; i < canvasEvidence.length - 1; i++) {
			for (let j = i + 1; j < canvasEvidence.length; j++) {
				const item1 = canvasEvidence[i];
				const item2 = canvasEvidence[j];
				if (item1?.tags?.some((t: any) => item2?.tags?.includes(t))) {
					connections.push({
						x1: (item1.x || 100) + 100,
						y1: (item1.y || 100) + 50,
						x2: (item2.x || 100) + 100,
						y2: (item2.y || 100) + 50
					});
				}
			}
		}
		return connections;
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="w-full h-full min-h-screen bg-background detective-board p-4">
	<Card class="mb-6">
		<CardHeader>
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
						<span class="text-2xl">🕵️</span>
					</div>
					<div>
						<CardTitle class="text-2xl">Detective Board</CardTitle>
						<p class="text-muted-foreground">Case Evidence Management System</p>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<div class="flex gap-2">
						<ToggleGroup.Root type="single" value={viewMode} onValueChange={(value) => switchViewMode(value)}>
							<ToggleGroup.Item value="columns">
								<span class="mr-2">📋</span> Columns
							</ToggleGroup.Item>
							<ToggleGroup.Item value="canvas">
								<span class="mr-2">🎨</span> Canvas
							</ToggleGroup.Item>
						</ToggleGroup.Root>
						<Button variant={showAIAssistant ? 'default' : 'ghost'} on:click={toggleAIAssistant} aria-pressed={showAIAssistant} size="sm">
							AI Assistant
						</Button>
						<Button size="sm" variant="secondary" on:click={() => analyzeSelectedEvidence()}>
							<span class="mr-2">🤖</span> Analyze Selected
						</Button>
					</div>

					{#if activeUsers.length > 0}
						<div class="flex items-center gap-2">
							<div class="flex -space-x-2">
								{#each activeUsers.slice(0, 3) as user}
									<div class="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium border-2 border-background">
										{user.name?.charAt(0) || user.email?.charAt(0) || '?'}
									</div>
								{/each}
								{#if activeUsers.length > 3}
									<div class="w-8 h-8 bg-muted nes-text is-disabled rounded-full flex items-center justify-center text-sm border-2 border-background">
										+{activeUsers.length - 3}
									</div>
								{/if}
							</div>
							<Badge variant="secondary">{activeUsers.length} online</Badge>
						</div>
					{/if}

					<Button size="sm" on:click={() => { /* new case */ }}>
						<span class="mr-2">➕</span> New Case
					</Button>
				</div>
			</div>
		</CardHeader>
	</Card>

	<main class="flex-1 flex gap-6">
		<div class="flex-1 min-w-0">
			{#if viewMode === 'columns'}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
					{#each columns as column (column.id)}
						<Card class="h-fit nes-container is-rounded">
							<div class="yorha-panel-header pb-3">
								<div class="flex justify-between items-center">
									<h3 class="nes-text is-primary text-lg flex items-center gap-2">
										<div class="w-3 h-3 bg-primary rounded-full"></div>
										{column.title}
									</h3>
									<Badge variant="secondary">{column.items.length}</Badge>
								</div>
							</div>

							<div class="yorha-panel-content space-y-4">
								{#if column.id === 'new'}
									<!-- typed event handlers to satisfy TS for custom events -->
									<UploadZone
										on:upload={(e: CustomEvent<any>) => handleFileUpload((e as CustomEvent).detail, column.id)}
										on:uploadError={(e: CustomEvent<string>) => handleUploadError((e as CustomEvent).detail, column.id)}
										caseId={caseId}
									/>
								{/if}

								<div
									class="space-y-3 min-h-[200px]"
									use:dndzone={{ items: column.items, flipDurationMs: 200, dropTargetStyle: { background: 'hsl(var(--muted))', border: '2px dashed hsl(var(--primary))', borderRadius: '8px' } }}
									on:consider={(e: CustomEvent) => handleDndConsider(e, column.id)}
									on:finalize={(e: CustomEvent<{ items: any[] }>) => handleDndFinalize(e, column.id)}
								>
									{#each column.items as item (item.id)}
										<ContextMenu.Root>
											<ContextMenu.Trigger>
												<div
													class="cursor-grab active:cursor-grabbing transition-transform hover:scale-105 p-2"
													class:highlighted={aiHighlightedEvidence.includes(item.id)}
													class:selected={selectedEvidenceIds.includes(item.id)}
													on:click={() => handleEvidenceSelect(item.id)}
													onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEvidenceSelect(item.id); } }}
													role="button"
													tabindex="0"
												>
													<EvidenceCard item={item} on:view={() => handleViewEvidence(item)} on:moreOptions={() => {}} />
												</div>
											</ContextMenu.Trigger>
											<ContextMenu.Content>
												<ContextMenu.Item on:click={() => handleViewEvidence(item)}>View Details</ContextMenu.Item>
												<ContextMenu.Item on:click={() => window.location.href = `/evidence/${item.id}/edit`}>Edit</ContextMenu.Item>
												<ContextMenu.Separator />
												<ContextMenu.Sub>
													<ContextMenu.SubTrigger>Add to...</ContextMenu.SubTrigger>
													<ContextMenu.SubContent>
														<Tooltip.Root>
															<Tooltip.Trigger asChild let:trigger>
																<ContextMenu.Item {...triggerProps} on:click={() => saveTo('savedcitations', item)}>Saved Citations</ContextMenu.Item>
															</Tooltip.Trigger>
															<Tooltip.Content>
																<p>Save this evidence to your personal citations list.</p>
															</Tooltip.Content>
														</Tooltip.Root>
														<Tooltip.Root>
															<Tooltip.Trigger asChild let:trigger>
																<ContextMenu.Item {...triggerProps} on:click={() => saveTo('mcpcontext', item)}>MCP Context (LLM)</ContextMenu.Item>
															</Tooltip.Trigger>
															<Tooltip.Content>
																<p>Add this evidence to the MCP context for the AI assistant.</p>
															</Tooltip.Content>
														</Tooltip.Root>
													</ContextMenu.SubContent>
												</ContextMenu.Sub>
												<ContextMenu.Separator />
												<Dialog.Trigger asChild let:trigger>
													<ContextMenu.Item {...triggerProps} on:click={() => openFindModal(item)}>Find Related...</ContextMenu.Item>
												</Dialog.Trigger>
												<ContextMenu.Item on:click={() => analyzeSelectedEvidence()}>
													<span class="mr-2">🤖</span> Ask AI About This
												</ContextMenu.Item>
											</ContextMenu.Content>
										</ContextMenu.Root>
									{/each}
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{:else}
				<Card class="h-[calc(100vh-200px)] nes-container is-rounded bits-card p-0 uno-stack">
					<div class="yorha-panel-content p-0 h-full">
						<div
							bind:this={canvasContainer}
							class="relative w-full h-full bg-slate-50 dark:bg-slate-900 overflow-auto p-4"
							role="region"
							aria-label="Canvas Drop Zone"
							on:drop={handleCanvasDrop}
							on:dragover={(e) => e.preventDefault()}
						>
							<div class="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

							{#each canvasEvidence as item (item.id)}
								<ContextMenu.Root>
									<ContextMenu.Trigger>
										<div
											class="absolute p-4 bg-background border-2 border-border rounded-lg shadow-lg cursor-move transition-shadow nes-container is-rounded bits-draggable"
											class:highlighted={aiHighlightedEvidence.includes(item.id)}
											class:selected={selectedEvidenceIds.includes(item.id)}
											style="left: {item.x || 100}px; top: {item.y || 100}px; min-width: 200px;"
											draggable="true"
											data-evidence-id={item.id}
											ondragstart={(e) => handleCanvasDragStart(e, item)}
											ondragend={(e) => handleCanvasDragEnd(e, item)}
											on:click={() => handleEvidenceSelect(item.id)}
											onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEvidenceSelect(item.id); } }}
											role="button"
											tabindex="0"
										>
											<EvidenceCard item={item} on:view={() => handleViewEvidence(item)} on:moreOptions={() => {}}>
												<Card class="nes-container is-rounded p-2 w-full mt-2">
													<CardHeader class="flex items-center justify-between">
														<div class="flex items-center gap-2">
															<div class="w-3 h-3 bg-primary rounded-full"></div>
															<CardTitle class="nes-text text-sm">{item.title || item.fileName || 'Evidence'}</CardTitle>
														</div>
														<Badge variant="secondary" class="nes-badge">{item.evidenceType || 'doc'}</Badge>
													</CardHeader>
													<CardContent class="p-2">
														<div class="mt-2 flex items-center justify-between">
															<div class="flex items-center gap-2 text-xs text-muted-foreground nes-text">
																<span class="nes-text is-disabled">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>
															</div>
															<div class="flex gap-2">
																<Button size="sm" variant="ghost" on:click={() => handleViewEvidence(item)}><span class="mr-1">🔍</span> View</Button>
																<Button size="sm" variant="secondary" on:click={() => {}}><span class="mr-1">⋯</span></Button>
															</div>
														</div>
													</CardContent>
												</Card>
											</EvidenceCard>
										</div>
									</ContextMenu.Trigger>
									<ContextMenu.Content>
										<ContextMenu.Item on:click={() => handleViewEvidence(item)}>View Details</ContextMenu.Item>
										<ContextMenu.Item on:click={() => window.location.href = `/evidence/${item.id}/edit`}>Edit</ContextMenu.Item>
										<ContextMenu.Separator />
										<ContextMenu.Sub>
											<ContextMenu.SubTrigger>Add to...</ContextMenu.SubTrigger>
											<ContextMenu.SubContent>
												<Tooltip.Root>
													<Tooltip.Trigger asChild let:trigger>
														<ContextMenu.Item {...triggerProps} on:click={() => saveTo('savedcitations', item)}>Saved Citations</ContextMenu.Item>
													</Tooltip.Trigger>
													<Tooltip.Content>
														<p>Save this evidence to your personal citations list.</p>
													</Tooltip.Content>
												</Tooltip.Root>
												<Tooltip.Root>
													<Tooltip.Trigger asChild let:trigger>
														<ContextMenu.Item {...triggerProps} on:click={() => saveTo('mcpcontext', item)}>MCP Context (LLM)</ContextMenu.Item>
													</Tooltip.Trigger>
													<Tooltip.Content>
														<p>Add this evidence to the MCP context for the AI assistant.</p>
													</Tooltip.Content>
												</Tooltip.Root>
											</ContextMenu.SubContent>
										</ContextMenu.Sub>
										<ContextMenu.Separator />
										<Dialog.Trigger asChild let:trigger>
											<ContextMenu.Item {...triggerProps} on:click={() => openFindModal(item)}>Find Related...</ContextMenu.Item>
										</Dialog.Trigger>
										<ContextMenu.Item on:click={() => analyzeSelectedEvidence()}>
											<span class="mr-2">🤖</span> Ask AI About This
										</ContextMenu.Item>
									</ContextMenu.Content>
								</ContextMenu.Root>
						</div>
								</div>
							{/each}

							<svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%;">
								{#each getConnections() as connection}
									<line x1={connection.x1} y1={connection.y1} x2={connection.x2} y2={connection.y2} stroke="currentColor" stroke-width="2" stroke-dasharray="5,5" opacity="0.3" />
								{/each}
							</svg>

							{#if canvasEvidence.length === 0}
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="text-center nes-text is-disabled">
										<p class="text-lg mb-2">No evidence on canvas</p>
										<p class="text-sm">Drag evidence here or switch to column view to add items</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</Card>
			{/if}
		</div>

		{#if showAIAssistant}
			<div class="w-80 flex-shrink-0">
				<!-- typed CustomEvent handlers to avoid TS 'never' event issues -->
				<AIAssistantPanel
					{caseId}
					{selectedEvidenceIds}
					on:evidenceSelect={(e: CustomEvent<{ evidenceId: string }>) => handleEvidenceSelect((e as CustomEvent).detail.evidenceId)}
					on:evidenceHighlight={(e: CustomEvent<{ evidenceIds: string[] }>) => handleEvidenceHighlight((e as CustomEvent).detail.evidenceIds)}
					on:actionTrigger={(e: CustomEvent<any>) => handleAIActionTrigger((e as CustomEvent).detail)}
				/>
			</div>
		{/if}
	</main>
</div>


<Dialog.Root bind:open={findModal.show}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Find Related Evidence</Dialog.Title>
			<Dialog.Description>
				Search for evidence related to "{findModal.query}" using local and vector search.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<Input type="text" bind:value={findModal.query} placeholder="Enter keywords or question..." onkeydown={(e) => { if (e.key === 'Enter') runFindSearch(null); }} />
			<div class="flex gap-2">
				<Button on:click={() => runFindSearch(null)} disabled={findModal.loading}>
					{#if findModal.loading}
						Searching...
					{:else}
						Search
					{/if}
				</Button>
			</div>
			{#if findModal.error}
				<div class="text-red-500">{findModal.error}</div>
			{/if}
			{#if findModal.results.length > 0}
				<div class="border-t pt-4">
					<h3 class="font-semibold mb-2">Results:</h3>
					<ul class="space-y-2 max-h-60 overflow-y-auto">
						{#each findModal.results as result}
							<li class="p-2 rounded hover:bg-muted cursor-pointer border-b border-muted-foreground/10">
								{result?.title ?? result?.text ?? JSON.stringify(result)}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="secondary" on:click={closeFindModal}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#if miniModal.show}
	<div class="fixed z-40" style="left: {miniModal.x}px; top: {miniModal.y}px;">
		<div class="bg-background border border-border rounded-md shadow px-3 py-2 text-sm">
			{miniModal.type}
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css?family=Press+Start+2P&display=swap');

	.bg-grid-pattern {
		background-image:
			linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
		background-size: 50px 50px;
	}
	:global(.dark) .bg-grid-pattern {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
	}

	:global(.highlighted) {
		box-shadow: 0 0 0 2px rgb(251 191 36 / 0.75), 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		animation: pulse-highlight 2s ease-in-out;
	}
	:global(.selected) {
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.75);
		background-color: hsl(var(--primary) / 0.05);
	}
	@keyframes pulse-highlight {
		0%, 100% {
			box-shadow: 0 0 0 2px rgb(251 191 36 / 0.75), 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		}
		50% {
			box-shadow: 0 0 0 2px rgb(251 191 36), 0 25px 25px -5px rgb(0 0 0 / 0.25), 0 10px 10px -5px rgb(0 0 0 / 0.04);
			transform: scale(1.02);
		}
	}
</style>

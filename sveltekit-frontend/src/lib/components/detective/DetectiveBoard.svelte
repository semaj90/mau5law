<!-- Detective Board - Enhanced 3-Column Grid with enhanced-bits UI, RabbitMQ & GPU Integration -->
<script lang="ts">
  // Svelte 5 runes are auto-imported

  	import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '$lib/components/ui/enhanced-bits';
	import { alerts, showSuccess, showError, showInfo } from '$lib/stores/alerts';
  	import Badge from '$lib/components/ui/Badge.svelte';
  	import { page } from '$app/stores';
  	import Fuse from 'fuse.js';
  	import { dndzone } from 'svelte-dnd-action';
  	import { onMount } from 'svelte';
  	import { Activity, Database, MessageSquare, Cpu, Zap, HardDrive, Bot, PanelRight } from 'lucide-svelte';

  	// SVELTE 5: External, app-wide stores are still valid.
  	// Access page data directly
  	import { evidenceStore } from '$lib/stores/evidence-unified';
  	import { callContext7Tool, getContextAwareSuggestions } from '$lib/ai/mcp-helpers';
  	import EvidenceNode from '../canvas/EvidenceNode.svelte';
  	import EvidenceCard from './EvidenceCard.svelte';
  	import UploadZone from './UploadZone.svelte';
  	import OptimizedMinIOUpload from '../upload/OptimizedMinIOUpload.svelte';

	// AI Assistant Integration
	import AIAssistantPanel from '../ai/AIAssistantPanel.svelte';
	import { aiAssistant } from '$lib/stores/ai-assistant';
	import { analyzeEvidence, findEvidenceConnections } from '$lib/ai/ai-service';

  	// Enhanced integrations
  	import { rabbitMQService } from '$lib/services/rabbitmq-service';
  	import { VectorService } from '$lib/services/vector-service';
  	const vectorService = new VectorService();
  	import { gpuAccelerationService as gpuService } from '$lib/services/gpu-acceleration-service';

  	// --- Svelte 5 State Management ---
  	// SVELTE 5: Subscribe to external evidenceStore manually.
  	// The evidenceStore returns a state object with evidence array
  	let evidenceStoreState = $state<any>({ evidence: [], isLoading: false, error: null, isConnected: false });

  	// Create a derived state for just the evidence array
  	let allEvidence = $derived(evidenceStoreState.evidence || []);

  	// Case ID for associating uploaded evidence
  	let caseId = $state('case-001'); // Default case ID

  	// SVELTE 5: Use runes (`$state`) for all component-local state.
  	let viewMode = $state<'columns' | 'canvas'>('columns');

  	// AI Assistant state
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

  	// SVELTE 5: Converted from writable store to a rune.
  	let activeUsers = $state([]);

  	// Enhanced system status tracking
  	let systemStatus = $state({
  		rabbitMQ: { connected: false, health: 'unknown' },
  		postgreSQL: { connected: false, vectorCount: 0 },;
  		gpu: { available: false, utilization: 0, model: 'RTX 3060 Ti' },
  		processingStats: { totalFiles: 0, processed: 0, queued: 0 }
  	});

  	let contextMenu = $state({
  		show: false,
  		x: 0,;
  		y: 0,;
  		item: null as any;
  	});

  	let miniModal = $state({
  		show: false,
  		x: 0,;
  		y: 0,;
  		type: '';
  	});

  	let findModal = $state({
  		show: false,
  		query: '',
  		results: [] as any[],
  		loading: false,;
  		error: '',;
  		suggestions: [] as any[];
  	});

  	// --- Component Logic & Functions ---

  	// Subscribe to evidence store using $effect (runs automatically)
  	$effect(() => {
  		const unsubscribeEvidence = evidenceStore.subscribe((value) => {
  			evidenceStoreState = value;
  		});
  		return () => {
  			unsubscribeEvidence();
  		};
  	});

  	// Enhanced system initialization
  	$effect(() => {
  		// Run async function without blocking
  		void (async () => {
  			await initializeEnhancedSystems();
  			setupRealTimeUpdates();
  		})();
  	});

  	async function initializeEnhancedSystems() {
  		// RabbitMQ connection
  		try {
  			await rabbitMQService.connect();
  			systemStatus.rabbitMQ.connected = true;
  			systemStatus.rabbitMQ.health = 'connected';
  		} catch (error) {
  			console.warn('RabbitMQ connection failed:', error);
  		}

  		// PostgreSQL vector status
  		try {
  			// Vector service status - simplified
  			systemStatus.postgreSQL.connected = true;
  			systemStatus.postgreSQL.vectorCount = 0;
  		} catch (error) {
  			console.warn('PostgreSQL vector service failed:', error);
  		}

  		// GPU service status
  		try {
  			const gpuStatus = await gpuService.getStatus();
  			systemStatus.gpu.available = gpuStatus.webgpuSupported;
  			systemStatus.gpu.utilization = gpuStatus.accelerationActive ? 75 : 0;
  		} catch (error) {
  			console.warn('GPU service failed:', error);
  		}
  	}

  	function setupRealTimeUpdates() {
  		// RabbitMQ real-time evidence updates - simplified for now
  		// These would need proper WebSocket/SSE implementation
  		console.log('Real-time updates initialized');
  	}

  	function updateProcessingStats(message: any) {
  		systemStatus.processingStats.queued = message.queuedCount || 0;
  		systemStatus.processingStats.processed = message.processedCount || 0;
  	}

  	function updateEvidenceStatus(message: any) {
  		// Update evidence item status based on RabbitMQ message
  		const evidenceId = message.evidenceId;
  		const newStatus = message.status;
  		// Update column positions based on processing status
  		moveEvidenceBetweenColumns(evidenceId, newStatus);
  	}

  	function moveEvidenceBetweenColumns(evidenceId: string, newStatus: string) {
  		// Logic to move evidence between columns based on processing status
  		const targetColumnId = newStatus === 'completed' ? 'verified' : 'processing';

  		// Find and move evidence item
  		columns.forEach(column => {
  			const itemIndex = column.items.findIndex((item: any) => (item as { id?: any; title?: any; x?: any; y?: any }).id === evidenceId);
  			if (itemIndex !== -1) {
  				const item = column.items.splice(itemIndex, 1)[0];
  				const targetColumn = columns.find(col => col.id === targetColumnId);
  				if (targetColumn) {
  					targetColumn.items.push(item);
  				}
  			}
  		});
  	}

  	function switchViewMode(mode: 'columns' | 'canvas') {
  		viewMode = mode;
  	}

  	function handleFileUpload(result: any, columnId: string) {
  		console.log('File uploaded to MinIO:', result, 'for column:', columnId);

  		// Create evidence item from MinIO upload result
  		const newEvidence = {
  			id: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).id || `evidence-${Date.now()}-${Math.random()}`,
  			title: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).originalName || (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).fileName,
  			fileName: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).fileName,
  			fileSize: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).fileSize,
  			type: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).metadata?.evidenceType || 'document',
  			evidenceType: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).metadata?.evidenceType || 'document',
  			createdAt: new Date((result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).metadata?.uploadedAt || Date.now()),
  			tags: [],
  			x: 100 + Math.random() * 200,;
  			y: 100 + Math.random() * 200,
  			// MinIO specific fields;
  			url: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).url,
  			bucket: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).bucket,
  			hash: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).hash,
  			minioId: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).id,
  			caseId: (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).metadata?.caseId
  		};

  		// Add to the appropriate column
  		columns = columns.map(col =>
  			col.id === columnId
  				? { ...col, items: [...col.items, newEvidence] }
  				: col
  		);

  		// Also update the evidence store if needed
  		// evidenceStore.addEvidence(newEvidence);
  	}

  	function handleUploadError(error: string, columnId: string) {
  		console.error('Upload to MinIO failed:', error);
  		// You could show a notification or alert here
  	}

  	function handleDndConsider(event: any, columnId: string) {
  		console.log('DnD consider:', event, columnId);
  	}

  	function handleDndFinalize(event: any, columnId: string) {
  		console.log('DnD finalize:', event, columnId);
  	}

  	function handleRightClick(event: MouseEvent, item: any) {
  		event.preventDefault();
  		contextMenu.show = true;
  		contextMenu.x = event.clientX;
  		contextMenu.y = event.clientY;
  		contextMenu.item = item;
  	}

  	function closeContextMenu() {
  		// SVELTE 5: Direct mutation is the idiomatic way to update state objects.
  		contextMenu.show = false;
  	}

  	function showMiniModal(type: string, event: MouseEvent) {
  		miniModal.show = true;
  		miniModal.type = type;
  		// Position modal near the cursor
  		miniModal.x = event.clientX + 15;
  		miniModal.y = event.clientY + 15;
  	}

  	function hideMiniModal() {
  		miniModal.show = false;
  	}

  	function broadcastPositionUpdate(id: string, x: number, y: number) {
  		console.log('Position update:', id, x, y);
  	}

  	function handleViewEvidence(item: any) {
  		console.log('View evidence:', item.title);
  		// Add your logic to open a modal or navigate to a details page
  		window.open(`/evidence/${item.id}`, '_blank');
  	}

  	function handleShowMoreOptions(item: any) {
  		console.log('Show more options for:', item.title);
  		// Add your logic to show a context menu
  		contextMenu.show = true;
  		contextMenu.item = item;
  	}

  	// AI Assistant Integration Functions
  	function toggleAIAssistant() {
  		showAIAssistant = !showAIAssistant;
  	}

  	function handleEvidenceSelect(evidenceId: string) {
  		if (selectedEvidenceIds.includes(evidenceId)) {
  			selectedEvidenceIds = selectedEvidenceIds.filter(id => id !== evidenceId);
  		} else {
  			selectedEvidenceIds = [...selectedEvidenceIds, evidenceId];
  		}
  	}

  	function handleEvidenceHighlight(evidenceIds: string[]) {
  		aiHighlightedEvidence = evidenceIds;
  		// Clear highlights after 3 seconds
  		setTimeout(() => {
  			aiHighlightedEvidence = [];
  		}, 3000);
  	}

  	function handleAIActionTrigger(event: CustomEvent) {
  		const { type, data } = event.detail;

  		switch (type) {
  			case 'suggestions':
  				// Handle AI suggestions
  				console.log('AI Suggestions:', data);
  				break;
  			case 'evidence-connect':
  				// Handle evidence connection suggestions
  				console.log('Evidence connections:', data);
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
  		} catch (error) {
  			console.error('Failed to analyze evidence:', error);
  		}
  	}

  	// Initialize AI assistant with case context
  	$effect(() => {
  		if (caseId) {
  			aiAssistant.initializeCase(caseId, 'Detective Board Case');

  			// Add evidence to AI context when available
  			allEvidence.forEach(evidence => {
  				aiAssistant.addEvidence(caseId, {
  					id: evidence.id,
  					title: evidence.title || evidence.fileName || 'Unknown Evidence',;
  					annotations: evidence.annotations || [],;
  					connections: evidence.connections || [];
  				});
  			});
  		}
  	});

  	function handleGlobalKeydown(event: KeyboardEvent) {
  		if (event.key === 'Escape') {
  			closeContextMenu();
  			closeFindModal();
  		}
  	}

  	async function saveTo(target: string) {
  		if (!contextMenu.item) return closeContextMenu();
  		const itemToSave = contextMenu.item;
  		closeContextMenu(); // Close menu immediately for better UX

  		// Note: All API calls are stubbed and will work as before.
  		try {
  			await fetch('/api/user-activity', {
  				method: 'POST',;
  				headers: { 'Content-Type': 'application/json' },
  				body: JSON.stringify({
  					userId: $page.data?.user?.id,
  					evidenceId: itemToSave.id,;
  					action: 'save',
  					target;
  				})
  			});
  		} catch (e) {
  			console.warn('User activity store update failed', e);
  		}

  		// ... other API calls ...
  	}

  	function openFindModal() {
  		findModal.show = true;
  		findModal.query = contextMenu.item?.title || '';
  		findModal.results = [];
  		findModal.loading = false;
  		findModal.error = '';
  		findModal.suggestions = [];
  	}
  	function closeFindModal() {
  		findModal.show = false;
  		closeContextMenu();
  	}

  	async function runFindSearch() {
  		if (!contextMenu.item) return closeFindModal();
  		findModal.loading = true;
  		findModal.error = '';
  		findModal.results = [];
  		findModal.suggestions = [];

  		// 1. Local fuzzy search (Fuse.js)
  		try {
  			// SVELTE 5: Use the reactive `allEvidence` rune directly. No `get()` needed.
  			const items = allEvidence || [];
  			const fuse = new Fuse(items, { keys: ['title', 'description', 'tags'] });
  			const fuseResults = fuse.search(findModal.query || contextMenu.item?.title || '');
  			findModal.results = fuseResults.map((r) => r.item); // Extract the items
  		} catch (e) {
  			findModal.error = 'Local search failed';
  		}

  		// 2. Qdrant/Vector search (stubbed)
  		try {
  			const resp = await fetch('/api/vector-search', {
  				method: 'POST',;
  				headers: { 'Content-Type': 'application/json' },
  				body: JSON.stringify({;
  					query: findModal.query || contextMenu.item?.title;
  				})
  			});
  			const vectorResults = await resp.json();
  			findModal.results = [...findModal.results, ...vectorResults];
  		} catch (e) {
  			findModal.error += ' Qdrant search failed.';
  		}

  		findModal.loading = false;
  	}

  	// Canvas-specific handlers
  	function handleCanvasDrop(event: DragEvent) {
  		event.preventDefault();
  		// Handle dropping evidence onto canvas
  		const data = event.dataTransfer?.getData('text/plain');
  		if (data) {
  			try {
  				const item = JSON.parse(data);
  				const rect = canvasContainer?.getBoundingClientRect();
  				if (rect) {
  					(item as { id?: any; title?: any; x?: any; y?: any }).x = event.clientX - rect.left;
  					(item as { id?: any; title?: any; x?: any; y?: any }).y = event.clientY - rect.top;
  					canvasEvidence = [...canvasEvidence, item];
  				}
  			} catch (e) {
  				console.error('Failed to parse dropped data:', e);
  			}
  		}
  	}

  	function handleCanvasDragStart(event: DragEvent, item: any) {
  		if (event.dataTransfer) {
  			event.dataTransfer.effectAllowed = 'move';
  			event.dataTransfer.setData('text/plain', JSON.stringify(item));
  		}
  	}

  	function handleCanvasDragEnd(event: DragEvent, item: any) {
  		// Update item position after drag
  		const rect = canvasContainer?.getBoundingClientRect();
  		if (rect) {
  			const newX = event.clientX - rect.left;
  			const newY = event.clientY - rect.top;
  			canvasEvidence = canvasEvidence.map(e =>
  				e.id === item.id ? { ...e, x: newX, y: newY } : e
  			);
  			broadcastPositionUpdate((item as { id?: any; title?: any; x?: any; y?: any }).id, newX, newY);
  		}
  	}

  	function getConnections() {
  		// Return an array of connection lines between related evidence
  		// This is a placeholder - you can implement actual relationship logic
  		const connections = [];
  		// Example: connect items that share tags or are related
  		for (let i = 0; i < canvasEvidence.length - 1; i++) {
  			for (let j = i + 1; j < canvasEvidence.length; j++) {
  				const item1 = canvasEvidence[i];
  				const item2 = canvasEvidence[j];
  				// Check if items are related (example logic)
  				if (item1.tags?.some(tag => item2.tags?.includes(tag))) {
  					connections.push({
  						x1: (item1.x || 100) + 100, // Center of card
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

<svelte:window onclick={closeContextMenu} onkeydown={handleGlobalKeydown} />

<div class="w-full h-full min-h-screen bg-background detective-board">
	<!-- Header -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex justify-between items-center">
				<div class="flex items-center gap-4">
					<div
						class="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center"
					>
						<span class="text-2xl">🕵️</span>
					</div>
					<div>
						<CardTitle class="text-2xl">Detective Board</CardTitle>
						<p class="text-muted-foreground">Case Evidence Management System</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<!-- View Mode Switcher -->
					<div class="flex gap-2">
						<Button
							variant={viewMode === 'columns' ? 'default' : 'ghost'}
							onclick={() => switchViewMode('columns')}
							aria-pressed={viewMode === 'columns'}
						>
							<span class="mr-2">📋</span>
							Columns
						</Button>
						<Button
							variant={viewMode === 'canvas' ? 'default' : 'ghost'}
							onclick={() => switchViewMode('canvas')}
							aria-pressed={viewMode === 'canvas'}
						>
							<span class="mr-2">🎨</span>
							Canvas
						</Button>
						<Button
							variant={showAIAssistant ? 'default' : 'ghost'}
							onclick={toggleAIAssistant}
							aria-pressed={showAIAssistant}
							size="sm"
						>
							<Bot class="w-4 h-4 mr-2" />
							AI Assistant
						</Button>
					</div>

					<!-- SVELTE 5: No more `$` prefix for store subscriptions in the template -->
					{#if activeUsers.length > 0}
						<div class="flex items-center gap-2">
							<div class="flex -space-x-2">
								{#each activeUsers.slice(0, 3) as user}
									<div
										class="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium border-2 border-background"
									>
										{user.name?.charAt(0) || user.email?.charAt(0) || '?'}
									</div>
								{/each}
								{#if activeUsers.length > 3}
									<div
										class="w-8 h-8 bg-muted nes-text is-disabled rounded-full flex items-center justify-center text-sm border-2 border-background"
									>
										+{activeUsers.length - 3}
									</div>
								{/if}
							</div>
							<Badge variant="secondary">{activeUsers.length} online</Badge>
						</div>
					{/if}

					<Button size="sm">
						<span class="mr-2">➕</span>
						New Case
					</Button>
				</div>
			</div>
		</CardHeader>
	</Card>

	<!-- Main Board Area -->
	<main class="flex-1 flex gap-6">
		<!-- Evidence Board Container -->
		<div class="flex-1 min-w-0">
			{#if viewMode === 'columns'}
			<!-- Columns Container -->
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
								<UploadZone
									onUpload={(result) => handleFileUpload(result, column.id)}
									onUploadError={(error) => handleUploadError(error, column.id)}
									caseId={caseId}
								/>
							{/if}

							<div
								class="space-y-3 min-h-[200px]"
								use:dndzone={{
									items: column.items,
									flipDurationMs: 200,
									dropTargetStyle: {
										background: 'hsl(var(--muted))',;
										border: '2px dashed hsl(var(--primary))',
										borderRadius: '8px';
									}
								}}
								onconsider={(e) => handleDndConsider(e, column.id)}
								onfinalize={(e) => handleDndFinalize(e, column.id)}
							>
								{#each column.items as item ((item as { id?: any; title?: any; x?: any; y?: any }).id)}
									<div
										class="cursor-grab active:cursor-grabbing transition-transform hover:scale-105";
										class:highlighted={aiHighlightedEvidence.includes((item as { id?: any; title?: any; x?: any; y?: any }).id)}
										class:selected={selectedEvidenceIds.includes((item as { id?: any; title?: any; x?: any; y?: any }).id)}
										oncontextmenu={(e) => handleRightClick(e, item)}
										onclick={() => handleEvidenceSelect((item as { id?: any; title?: any; x?: any; y?: any }).id)}
										onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEvidenceSelect((item as { id?: any; title?: any; x?: any; y?: any }).id); } }}
										role="button"
										tabindex="0"
									>
										<EvidenceCard
											item={item}
											onView={handleViewEvidence}
											onMoreOptions={handleShowMoreOptions}
										/>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{:else}
			<!-- Canvas Container -->
			<Card class="h-[calc(100vh-200px)] nes-container is-rounded">
				<div class="yorha-panel-content p-0 h-full">
					<div
						bind:this={canvasContainer}
						class="relative w-full h-full bg-slate-50 dark:bg-slate-900 overflow-auto"
					 role="region" aria-label="Drop zone" ondrop={(e) => handleCanvasDrop(e)}
						ondragover={(e) => e.preventDefault()}
					>
						<!-- Grid background -->
						<div class="absolute inset-0 bg-grid-pattern opacity-5"></div>

						<!-- Evidence nodes on canvas -->
						{#each canvasEvidence as item ((item as { id?: any; title?: any; x?: any; y?: any }).id)}
							<div
								class="absolute p-4 bg-background border-2 border-border rounded-lg shadow-lg cursor-move hover:shadow-xl transition-shadow";
								class:highlighted={aiHighlightedEvidence.includes((item as { id?: any; title?: any; x?: any; y?: any }).id)}
								class:selected={selectedEvidenceIds.includes((item as { id?: any; title?: any; x?: any; y?: any }).id)}
								style="left: {(item as { id?: any; title?: any; x?: any; y?: any }).x || 100}px; top: {(item as { id?: any; title?: any; x?: any; y?: any }).y || 100}px; min-width: 200px;"
								draggable="true"
								ondragstart={(e) => handleCanvasDragStart(e, item)}
								ondragend={(e) => handleCanvasDragEnd(e, item)}
								oncontextmenu={(e) => handleRightClick(e, item)}
								onclick={() => handleEvidenceSelect((item as { id?: any; title?: any; x?: any; y?: any }).id)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEvidenceSelect((item as { id?: any; title?: any; x?: any; y?: any }).id); } }}
								role="button"
								tabindex="0"
							>
								<EvidenceCard
									item={item}
									onView={handleViewEvidence}
									onMoreOptions={handleShowMoreOptions}
								/>
							</div>
						{/each}

						<!-- Connection lines (optional - for relationships) -->
						<svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%;">
							{#each getConnections() as connection}
								<line
									x1={connection.x1}
									y1={connection.y1}
									x2={connection.x2}
									y2={connection.y2}
									stroke="currentColor"
									stroke-width="2"
									stroke-dasharray="5,5"
									opacity="0.3"
								/>
							{/each}
						</svg>

						<!-- Empty state -->
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

		<!-- AI Assistant Panel -->
		{#if showAIAssistant}
			<div class="w-80 flex-shrink-0">
				<AIAssistantPanel
					{caseId}
					{selectedEvidenceIds}
					onEvidenceSelect={(data) => handleEvidenceSelect(data.evidenceId)}
					onEvidenceHighlight={(data) => handleEvidenceHighlight(data.evidenceIds)}
					onActionTrigger={(data) => handleAIActionTrigger(data)}
				/>
			</div>
		{/if}
	</main>
</div>

<!-- Context Menu -->
{#if contextMenu.show}
	<div class="fixed z-50" style="left: {contextMenu.x}px; top: {contextMenu.y}px;">
		<div class="bg-background border border-border rounded-md shadow-lg py-1 min-w-[200px]">
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onclick={() => { window.open(`/evidence/${contextMenu.item?.id}`, '_blank'); closeContextMenu(); }}
			>
				View Details
			</Button>
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onclick={() => { window.location.href = `/evidence/${contextMenu.item?.id}/edit`; closeContextMenu(); }}
			>
				Edit
			</Button>
			<div class="border-t border-border my-1"></div>
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onmouseenter={(e) => showMiniModal('citation', e)}
				onmouseleave={hideMiniModal}
				onclick={() => saveTo('savedcitations')}
			>
				Add to /savedcitations
			</Button>
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onmouseenter={(e) => showMiniModal('mcpcontext', e)}
				onmouseleave={hideMiniModal}
				onclick={() => saveTo('mcpcontext')}
			>
				Add to MCP Context (LLM)
			</Button>
			<div class="border-t border-border my-1"></div>
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onmouseenter={(e) => showMiniModal('find', e)}
				onmouseleave={hideMiniModal}
				onclick={openFindModal}
			>
				Find Related...
			</Button>
			<Button
				variant="secondary"
				class="w-full justify-start bits-btn"
				size="sm"
				onclick={() => { analyzeSelectedEvidence(); closeContextMenu(); }}
			>
				<Bot class="w-4 h-4 mr-2" />
				Ask AI About This
			</Button>
		</div>
	</div>
{/if}

<!-- Find Modal -->
{#if findModal.show}
	<div
		class="fixed z-50 inset-0 bg-black/60 flex items-center justify-center"
	 role="button" tabindex="0"
                onclick={(e) => { if (e.target === e.currentTarget) closeFindModal(); }}
                onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); closeFindModal(); } }}
	>
		<div
			class="bg-background border border-primary rounded-lg shadow-lg p-6 w-full max-w-lg"
			role="dialog"
			aria-modal="true"
		>
			<div class="flex flex-col gap-4">
				<input
					class="w-full border rounded px-3 py-2 text-base bg-muted text-foreground focus:outline-none focus:ring focus:border-primary"
					type="text";
					bind:value={findModal.query}
					placeholder="Enter keywords or question..."
					onkeydown={(e) => {
						if (e.key === 'Enter') runFindSearch();
					}}
				/>
				<div class="flex gap-2">
					<Button onclick={runFindSearch} disabled={findModal.loading}>
						{#if findModal.loading}Searching...{:else}Search{/if}
					</Button>
					<Button variant="secondary" onclick={closeFindModal}>Close</Button>
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
									{(result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).title || (result as { id?: any; originalName?: any; fileName?: any; fileSize?: any; metadata?: any; url?: any; bucket?: any; hash?: any; title?: any; text?: any }).text || JSON.stringify(result)}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Mini-modal for context menu hover -->
{#if miniModal.show}
	<!-- ... miniModal markup remains the same ... -->
{/if}

<!-- Enhanced NES.css Styles -->
<style>
	@import url('https://unpkg.com/nes.css@2.3.0/css/nes.min.css');
	@import url('https://fonts.googleapis.com/css?family=Press+Start+2P&display=swap');

	/* Grid Pattern */
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

	/* AI Assistant Integration Styles */
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

<!-- @migration-task Error while migrating Svelte code: 'onclick|stopPropagation' is not a valid attribute name
https://svelte.dev/e/attribute_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: 'onclick|stopPropagation' is not a valid attribute name
https://svelte.dev/e/attribute_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: 'onclick|stopPropagation' is not a valid attribute name
https://svelte.dev/e/attribute_invalid_name -->
<!-- @migration-task Error while migrating Svelte code: 'onclick|stopPropagation' is not a valid attribute name
https://svelte.dev/e/attribute_invalid_name -->
<script lang="ts">
	import { onMount } from 'svelte';;

	const BOARD_STORAGE_KEY = 'yorha:evidence-board-state';
	const DEFAULT_CASE_ID = 'CASE-2024-001';

	interface EvidenceMetadata {
		fileName: string;
		type: string;
		ocrSummary: string;
		embeddingsPreview: string;
		graphRank: number;
		similarityVector: string;
		tags: string[];
		notes?: string;
	}

	interface EvidenceItem {
		id: string;
		title: string;
		type: 'document' | 'photo' | 'video' | 'audio' | 'statement';
		excerpt: string;
		caseId?: string;
		timestamp: string;
		relevance: number;
		metadata: EvidenceMetadata;
	}

	interface BoardItem extends EvidenceItem {
		x: number;
		y: number;
		connections?: string[]; // IDs of connected items
		pinned?: boolean;
	}

	let evidence = $state <EvidenceItem[]>([]);
	let board = $state <BoardItem[]>([]);
	let dragging: EvidenceItem | null = null;
	let selectedItem = $state <BoardItem | null>(null);
	let showConnections = $state(false);
	let showContextMenu = $state(false);
	let contextMenuPosition = $state({ x: 0, y: 0 });
	let contextMenuTarget = $state <BoardItem | null>(null);
	let metadataPanelVisible = $state(true);
	let metadataPanelDocked = $state(true);
	let metadataPanelFeedback = $state('');
	let metadataPanelIntel = $state <{ title: string; body: string } | null>(null);
	let agenticInsight = $state('');
	let lastTimelineIndex = $state <number | null>(null);
	let userDockOverride = $state(false);
	let touchHoldTimeout: ReturnType<typeof setTimeout> | null = null;

	// Sample evidence data
	evidence = [
		{
			id: 'ev001',
			title: 'Security Camera Footage',
			type: 'video',
			excerpt: 'Shows suspect entering building at 2:15 AM',
			caseId: 'CASE-2024-001',
			timestamp: '2024-11-10 02:15:00',
			relevance: 95,
			metadata: {
				fileName: 'cam_dock4_0215.mp4',
				type: '4K HEVC Stream',
				ocrSummary: 'Auto-detected signage + terminal IDs within frame.',
				embeddingsPreview: '[0.12, 0.88, -0.33, 0.41]',
				graphRank: 0.91,
				similarityVector: '[0.76, 0.54, 0.12]',
				tags: ['surveillance', 'dock', 'entry'],
				notes: 'High-priority frame sequence'
			}
		},
		{
			id: 'ev002',
			title: 'Witness Statement',
			type: 'statement',
			excerpt: 'Eyewitness describes tall man with red hair',
			caseId: 'CASE-2024-001',
			timestamp: '2024-11-10 08:30:00',
			relevance: 87,
			metadata: {
				fileName: 'statement_klee.txt',
				type: 'OCR Transcript',
				ocrSummary: 'Describes suspect attire and accent indicators.',
				embeddingsPreview: '[0.02, -0.43, 0.77, 0.18]',
				graphRank: 0.74,
				similarityVector: '[0.63, 0.21, -0.05]',
				tags: ['witness', 'description', 'statement'],
				notes: 'Needs contradiction check'
			}
		},
		{
			id: 'ev003',
			title: 'Financial Records',
			type: 'document',
			excerpt: 'Bank transfers totaling $50,000 to offshore account',
			caseId: 'CASE-2024-001',
			timestamp: '2024-11-09 14:20:00',
			relevance: 92,
			metadata: {
				fileName: 'ledger_delta.csv',
				type: 'CSV Extract',
				ocrSummary: 'Structured transfer log, flagged anomalies.',
				embeddingsPreview: '[0.66, -0.12, 0.03, 0.58]',
				graphRank: 0.83,
				similarityVector: '[0.45, 0.77, 0.19]',
				tags: ['finance', 'ledger', 'offshore'],
				notes: 'Correlates with shell corp filings'
			}
		},
		{
			id: 'ev004',
			title: 'Crime Scene Photo',
			type: 'photo',
			excerpt: 'Broken window with fingerprints on frame',
			caseId: 'CASE-2024-001',
			timestamp: '2024-11-10 03:45:00',
			relevance: 78,
			metadata: {
				fileName: 'scene_window_B3.png',
				type: 'RAW Image',
				ocrSummary: 'No OCR text. Visual descriptor highlights smudges.',
				embeddingsPreview: '[0.11, 0.04, -0.55, 0.67]',
				graphRank: 0.62,
				similarityVector: '[0.31, 0.12, 0.88]',
				tags: ['crime scene', 'photo', 'prints'],
				notes: 'Coordinate with forensics lab'
			}
		},
		{
			id: 'ev005',
			title: 'Phone Call Recording',
			type: 'audio',
			excerpt: 'Suspect discussing "the job" with unknown party',
			caseId: 'CASE-2024-001',
			timestamp: '2024-11-08 19:15:00',
			relevance: 89,
			metadata: {
				fileName: 'call_redline.wav',
				type: 'Audio Transcript',
				ocrSummary: 'Phonetic transcript w/ emphasis on code words.',
				embeddingsPreview: '[-0.12, 0.55, 0.61, -0.04]',
				graphRank: 0.79,
				similarityVector: '[0.58, 0.42, 0.09]',
				tags: ['audio', 'call', 'codewords'],
				notes: 'Queue for speaker ID'
			}
		}
	];

	onMount(() => {
		hydrateBoardFromStorage();
		const handleResize = () => {
			if (userDockOverride) return;
			if (typeof window === 'undefined') return;
			metadataPanelDocked = window.innerWidth >= 1280;
		};
		if (typeof window !== 'undefined') {
			handleResize();
			window.addEventListener('resize', handleResize);
		}
		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', handleResize);
			}
		};
	});

	function getEvidenceIcon(type: string): string {
		switch (type) {
			case 'video': return '🎥';
			case 'photo': return '📷';
			case 'document': return '📄';
			case 'audio': return '🎵';
			case 'statement': return '💬';
			default: return '📋';
		}
	}

	function getRelevanceColor(relevance: number): string {
		if (relevance >= 90) return '#10b981'; // green
		if (relevance >= 80) return '#f59e0b'; // yellow
		if (relevance >= 70) return '#f97316'; // orange
		return '#ef4444'; // red
	}

	const nodeContextActions = [
		{ id: 'open', label: 'Open Evidence' },
		{ id: 'compare', label: 'Compare Against...' },
		{ id: 'summary', label: 'Add to Case Summary' },
		{ id: 'timeline', label: 'Show Timeline Position' },
		{ id: 'agentic', label: 'Send to Agentic Pipeline' },
		{ id: 'pin', label: 'Pin Node' },
		{ id: 'metadata', label: 'Show Metadata Panel' }
	] as const;

	function handleDragStart(ev: DragEvent, item: EvidenceItem) {
		dragging = item;
		if (ev.dataTransfer) {
			ev.dataTransfer.effectAllowed = 'copy';
		}
	}

	function handleDragOver(ev: DragEvent) {
		ev.preventDefault();
		if (ev.dataTransfer) {
			ev.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleDrop(ev: DragEvent) {
		ev.preventDefault();
		if (!dragging) return;

		const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
		const x = ev.clientX - rect.left - 100; // Center the item
		const y = ev.clientY - rect.top - 50;

		const boardItem: BoardItem = {
			...dragging,
			x: Math.max(0, Math.min(x, rect.width - 200)),
			y: Math.max(0, Math.min(y, rect.height - 100)),
			connections: []
		};

		board = [...board, boardItem];
		persistBoardState();
		dragging = null;
	}

	function removeFromBoard(itemId: string) {
		board = board.filter(item => item.id !== itemId);
		selectedItem = null;
		persistBoardState();
	}

	function selectItem(item: BoardItem) {
		selectedItem = item;
	}

	function clearBoard() {
		board = [];
		selectedItem = null;
		persistBoardState();
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem(BOARD_STORAGE_KEY);
		}
	}

	function exportBoard() {
		const boardData = {
			caseId: 'CASE-2024-001',
			evidence: board,
			timestamp: new Date().toISOString(),
			analyst: 'Detective AI'
		};

		const blob = new Blob([JSON.stringify(boardData, null, 2)], {
			type: 'application/json'
		});

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `evidence-board-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function hydrateBoardFromStorage() {
		if (typeof window === 'undefined') return;
		try {
			const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
			if (!raw) return;
			const stored = JSON.parse(raw);
			if (Array.isArray(stored)) {
				board = stored.map((item) => ({
					...item,
					metadata: {
						fileName: item.metadata?.fileName ?? 'unknown',
						type: item.metadata?.type ?? 'unclassified',
						ocrSummary: item.metadata?.ocrSummary ?? '',
						embeddingsPreview: item.metadata?.embeddingsPreview ?? '[0,0,0]',
						graphRank: item.metadata?.graphRank ?? 0,
						similarityVector: item.metadata?.similarityVector ?? '[0,0,0]',
						tags: item.metadata?.tags ?? [],
						notes: item.metadata?.notes ?? ''
					}
				}));
			}
		} catch (error) {
			console.warn('[YoRHa] Failed to hydrate board state', error);
		}
	}

	function persistBoardState() {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
		} catch (error) {
			console.warn('[YoRHa] Failed to persist board state', error);
		}
	}

	async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
		try {
			const response = await fetch(input, init);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			return (await response.json()) as T;
		} catch (error) {
			console.error('[YoRHa] API call failed', error);
			return null;
		}
	}

	async function syncNodeMetadata(item: BoardItem) {
		try {
			await fetch(`/api/evidence/nodes/${item.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: item.title,
					description: item.metadata.notes ?? item.excerpt,
					type: item.type,
					thumbnailUrl: item.metadata.fileName,
					contentUrl: item.metadata.fileName,
					x: Math.round(item.x),
					y: Math.round(item.y),
					embedding: null
				})
			});
			metadataPanelFeedback = 'Synced with evidence graph';
		} catch (error) {
			console.warn('[YoRHa] Failed to sync node metadata', error);
			metadataPanelFeedback = 'Graph sync unavailable (offline)';
		}
	}

	async function openEvidenceRecord(item: BoardItem) {
		const data = await fetchJSON<{ node?: { title?: string; description?: string } }>(
			`/api/evidence/nodes/${item.id}`
		);
		if (data?.node) {
			metadataPanelIntel = {
				title: data.node.title ?? item.title,
				body: data.node.description ?? 'Graph node retrieved.'
			};
		} else {
			metadataPanelIntel = {
				title: 'Evidence lookup',
				body: 'Unable to locate this node in the evidence graph.'
			};
		}
	}

	async function runGraphCompare(item: BoardItem) {
		const data = await fetchJSON<{ success?: boolean; items?: Array<{ title?: string; description?: string }> }>(
			'/api/graph/compare',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [item.id] })
			}
		);
		if (data?.items?.length) {
			const best = data.items[0];
			metadataPanelIntel = {
				title: 'Graph compare ready',
				body: best.description ?? `${data.items.length} related exhibits queued`
			};
		} else {
			metadataPanelIntel = { title: 'Graph compare', body: 'No related exhibits returned.' };
		}
	}

	async function addToCaseSummary(item: BoardItem) {
		const payload = {
			caseId: item.caseId ?? DEFAULT_CASE_ID,
			caseName: `Case ${item.caseId ?? DEFAULT_CASE_ID}`,
			summary: `${item.title}: ${item.metadata.ocrSummary || item.excerpt}`,
			keyEvidence: [
				{
					label: item.title,
					purpose: item.excerpt
				}
			],
			deliverables: ['closingOutline', 'investigativeGaps']
		};
		const data = await fetchJSON<{ plan?: { masterTheory?: string } }>('/api/case-theory', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		metadataPanelIntel = {
			title: 'Case summary updated',
			body: data?.plan?.masterTheory ?? 'Requested deliverables are generating...'
		};
	}

	async function resolveTimelinePosition(item: BoardItem) {
		const data = await fetchJSON<{ nodes?: Array<{ id: string; timestamp?: string }> }>('/api/graph/timeline');
		const nodes = data?.nodes ?? [];
		const index = nodes.findIndex((node) => node.id === item.id);
		if (index >= 0) {
			lastTimelineIndex = index + 1;
			metadataPanelIntel = {
				title: 'Timeline position',
				body: `This item is #${index + 1} of ${nodes.length} events (${nodes[index].timestamp ?? 'unknown timestamp'}).`
			};
		} else {
			lastTimelineIndex = null;
			metadataPanelIntel = { title: 'Timeline', body: 'Evidence has not been slotted on the global timeline yet.' };
		}
	}

	async function requestAgenticPrediction(item: BoardItem) {
		const prompt = `Provide predictive analysis and contextual engineering cues for ${item.title}. OCR summary: ${item.metadata.ocrSummary}. Notes: ${item.metadata.notes ?? 'n/a'}.`;
		const data = await fetchJSON<{ results?: Array<{ content: string }> }>('/api/ai/rl-rag', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: prompt,
				context: [item.excerpt],
				max_results: 3,
				use_gpu: true,
				performance_monitoring: false
			})
		});
		agenticInsight = data?.results?.[0]?.content ?? 'Agentic pipeline responded with no textual insight.';
		metadataPanelIntel = {
			title: 'Agentic prediction ready',
			body: 'LangChain/LangExtract contextual analysis has been updated.'
		};
	}

	const contextActionHandlers: Record<string, (item: BoardItem) => Promise<void> | void> = {
		open: openEvidenceRecord,
		compare: runGraphCompare,
		summary: addToCaseSummary,
		timeline: resolveTimelinePosition,
		agentic: requestAgenticPrediction,
		pin: (item) => togglePinNode(item.id),
		metadata: (item) => {
			metadataPanelVisible = true;
			selectedItem = item;
		}
	};

	function openContextMenuAtPoint(x: number, y: number, item: BoardItem) {
		contextMenuPosition = { x, y };
		contextMenuTarget = item;
		selectedItem = item;
		showContextMenu = true;
		metadataPanelVisible = true;
	}

	function handleContextMenu(event: MouseEvent, item: BoardItem) {
		event.preventDefault();
		event.stopPropagation();
		openContextMenuAtPoint(event.clientX, event.clientY, item);
	}

	function handleTouchStart(event: TouchEvent, item: BoardItem) {
		if (touchHoldTimeout) {
			clearTimeout(touchHoldTimeout);
		}
		const touch = event.touches[0];
		if (!touch) return;
		const point = { x: touch.clientX, y: touch.clientY };
		touchHoldTimeout = setTimeout(() => {
			openContextMenuAtPoint(point.x, point.y, item);
			touchHoldTimeout = null;
		}, 550);
	}

	function handleTouchEnd() {
		if (touchHoldTimeout) {
			clearTimeout(touchHoldTimeout);
			touchHoldTimeout = null;
		}
	}

	function closeContextMenu() {
		if (showContextMenu) {
			showContextMenu = false;
		}
	}

	function pushMetadataFeedback(message: string) {
		metadataPanelFeedback = message;
		setTimeout(() => {
			if (metadataPanelFeedback === message) {
				metadataPanelFeedback = '';
			}
		}, 3500);
	}

	function togglePinNode(itemId: string) {
		board = board.map((item) =>
			item.id === itemId ? { ...item, pinned: !item.pinned } : item
		);
		if (selectedItem?.id === itemId) {
			selectedItem = board.find((item) => item.id === itemId) || null;
		}
		if (contextMenuTarget?.id === itemId) {
			contextMenuTarget = board.find((item) => item.id === itemId) || null;
		}
		persistBoardState();
		pushMetadataFeedback('Pin status updated');
	}

	async function handleContextAction(actionId: string) {
		if (!contextMenuTarget) return;
		const label = nodeContextActions.find((action) => action.id === actionId)?.label ?? actionId;
		const handler = contextActionHandlers[actionId];
		if (handler) {
			await handler(contextMenuTarget);
		}
		pushMetadataFeedback(`${label} queued for ${contextMenuTarget.title}`);
		closeContextMenu();
	}

	function toggleMetadataDock() {
		userDockOverride = true;
		metadataPanelDocked = !metadataPanelDocked;
	}

	function toggleMetadataPanel() {
		metadataPanelVisible = !metadataPanelVisible;
		if (!metadataPanelVisible) {
			showContextMenu = false;
		}
	}

	function handleBoardCanvasClick() {
		closeContextMenu();
	}

	function updateMetadataNotes(itemId: string, notes: string) {
		board = board.map((item) =>
			item.id === itemId ? { ...item, metadata: { ...item.metadata, notes } } : item
		);
		if (selectedItem?.id === itemId) {
			selectedItem = board.find((item) => item.id === itemId) || null;
		}
		if (contextMenuTarget?.id === itemId) {
			contextMenuTarget = board.find((item) => item.id === itemId) || null;
		}
		persistBoardState();
		const target = board.find((item) => item.id === itemId);
		if (target) {
			void syncNodeMetadata(target);
		}
		pushMetadataFeedback('Notes updated');
	}
</script>

<div class="evidence-board-container" onclick={() => (showContextMenu = false)}>
	<!-- Header -->
	<header class="board-header">
		<div class="header-content">
			<h1>EVIDENCE ANALYSIS BOARD</h1>
			<div class="board-controls">
				<button class="nes-btn is-warning" onclick={clearBoard}>
					CLEAR BOARD
				</button>
				<button class="nes-btn is-success" onclick={exportBoard}>
					EXPORT ANALYSIS
				</button>
				<button class="nes-btn is-info" onclick={toggleMetadataPanel}>
					{metadataPanelVisible ? 'HIDE METADATA' : 'SHOW METADATA'}
				</button>
				<label class="nes-checkbox">
					<input type="checkbox" bind:checked={showConnections}>
					<span>Show Connections</span>
				</label>
			</div>
		</div>
	</header>

	<div class="board-layout">
		<!-- Left Evidence Library -->
		<aside class="evidence-library">
			<div class="nes-container with-title is-dark">
				<p class="title">EVIDENCE LIBRARY</p>

				<div class="evidence-list">
					{#each evidence as item}
						<div
							class="evidence-item nes-container is-rounded"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, item)}
						>
							<div class="evidence-header">
								<span class="evidence-icon">{getEvidenceIcon(item.type)}</span>
								<div class="evidence-meta">
									<h4>{item.title}</h4>
									<span class="evidence-type">{item.type.toUpperCase()}</span>
								</div>
							</div>
							<p class="evidence-excerpt">{item.excerpt}</p>
							<div class="evidence-footer">
								<span class="relevance-score" style="color: {getRelevanceColor(item.relevance)}">
									{item.relevance}% relevant
								</span>
								<span class="timestamp">{item.timestamp}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</aside>

		<!-- Main Board Area -->
		<main
			class="evidence-board"
			ondragover={handleDragOver}
			ondrop={handleDrop}
			onclick={handleBoardCanvasClick}
			on:contextmenu|preventDefault={handleBoardCanvasClick}
		>
			{#if board.length === 0}
				<div class="empty-board">
					<div class="nes-container is-rounded is-dark">
						<p>DRAG EVIDENCE HERE TO BEGIN ANALYSIS</p>
						<p class="subtitle">Connect clues and build your case theory</p>
					</div>
				</div>
			{/if}

			{#each board as item (item.id)}
				<div
					class="board-evidence-item nes-container is-rounded {selectedItem?.id === item.id ? 'selected' : ''} {item.pinned ? 'pinned' : ''}"
					style="left: {item.x}px; top: {item.y}px;"
					onclick={() => selectItem(item)}
					oncontextmenu={(event) => handleContextMenu(event, item)}
					ontouchstart={(event) => handleTouchStart(event, item)}
					ontouchend={handleTouchEnd}
					ontouchcancel={handleTouchEnd}
				>
					<div class="item-header">
						<span class="item-icon">{getEvidenceIcon(item.type)}</span>
						<button
							class="remove-btn"
							onclick={(e) => { e.stopPropagation(); removeFromBoard(item.id); }}
						>
							×
						</button>
					</div>
					<h5 class="item-title">{item.title}</h5>
					<p class="item-excerpt">{item.excerpt}</p>
					<div class="item-footer">
						<span class="relevance" style="color: {getRelevanceColor(item.relevance)}">
							{item.relevance}%
						</span>
					</div>
				</div>
			{/each}

			<!-- Connection Lines (if enabled) -->
			{#if showConnections}
				<svg class="connections-layer">
					<!-- Connection lines would be drawn here -->
				</svg>
			{/if}
		</main>

		{#if showContextMenu && contextMenuTarget}
			<div
				class="node-context-menu"
				style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
				onclick|stopPropagation
			>
				{#each nodeContextActions as action}
					<button type="button" onclick={() => handleContextAction(action.id)}>
						{action.label}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Right Analysis Panel -->
		<aside class="analysis-panel">
			<div class="nes-container with-title is-dark">
				<p class="title">ANALYSIS PANEL</p>

				{#if selectedItem}
					<div class="selected-evidence">
						<h3>SELECTED EVIDENCE</h3>
						<div class="evidence-detail">
							<div class="detail-header">
								<span class="detail-icon">{getEvidenceIcon(selectedItem.type)}</span>
								<h4>{selectedItem.title}</h4>
							</div>
							<p class="detail-excerpt">{selectedItem.excerpt}</p>
							<div class="detail-meta">
								<div class="meta-item">
									<span class="label">Type:</span>
									<span class="value">{selectedItem.type.toUpperCase()}</span>
								</div>
								<div class="meta-item">
									<span class="label">Relevance:</span>
									<span class="value" style="color: {getRelevanceColor(selectedItem.relevance)}">
										{selectedItem.relevance}%
									</span>
								</div>
								<div class="meta-item">
									<span class="label">Timestamp:</span>
									<span class="value">{selectedItem.timestamp}</span>
								</div>
								{#if selectedItem.caseId}
									<div class="meta-item">
										<span class="label">Case ID:</span>
										<span class="value">{selectedItem.caseId}</span>
									</div>
								{/if}
							</div>
						</div>

						<div class="analysis-actions">
							<h4>ANALYSIS ACTIONS</h4>
							<button class="nes-btn is-primary">AI ANALYSIS</button>
							<button class="nes-btn is-warning">CONNECT TO...</button>
							<button class="nes-btn">EXPORT DETAILS</button>
						</div>

						{#if selectedItem}
							<div class="ai-analysis-section">
								<!-- ClientGemmaInference component removed due to undefined reference -->
							</div>
						{/if}
					</div>
				{:else}
					<div class="no-selection">
						<p>SELECT AN EVIDENCE ITEM TO VIEW DETAILS</p>
					</div>
				{/if}
			</div>
		</aside>
	</div>

	{#if metadataPanelVisible}
		{@const inspectorTarget = selectedItem ?? contextMenuTarget}
		<div
			class="metadata-panel {metadataPanelDocked ? 'docked' : 'floating'}"
			onclick|stopPropagation
		>
			<div class="metadata-panel-header">
				<div>
					<p class="panel-title">Metadata Inspector</p>
					<p class="panel-subtitle">
						{#if inspectorTarget}
							{inspectorTarget.title}
						{:else}
							Select or right-click a node to inspect
						{/if}
					</p>
				</div>
				<div class="panel-actions">
					<button type="button" onclick={toggleMetadataDock}>
						{metadataPanelDocked ? 'FLOAT' : 'DOCK'}
					</button>
					<button type="button" onclick={toggleMetadataPanel}>CLOSE</button>
				</div>
			</div>

			{#if inspectorTarget}
				<div class="metadata-grid">
					<div>
						<label>File Name</label>
						<span>{inspectorTarget.metadata.fileName}</span>
					</div>
					<div>
						<label>Type</label>
						<span>{inspectorTarget.metadata.type}</span>
					</div>
					<div>
						<label>OCR Summary</label>
						<span>{inspectorTarget.metadata.ocrSummary}</span>
					</div>
					<div>
						<label>Embeddings Preview</label>
						<span>{inspectorTarget.metadata.embeddingsPreview}</span>
					</div>
					<div>
						<label>Graph Rank</label>
						<span>{(inspectorTarget.metadata.graphRank * 100).toFixed(1)}%</span>
					</div>
					<div>
						<label>Qdrant Similarity</label>
						<span>{inspectorTarget.metadata.similarityVector}</span>
					</div>
				</div>
				<div class="metadata-tags">
					{#each inspectorTarget.metadata.tags as tag}
						<span>{tag}</span>
					{/each}
				</div>
				<label class="notes-label" for="metadata-notes">Notes</label>
				<textarea
					id="metadata-notes"
					value={inspectorTarget.metadata.notes ?? ''}
					oninput={(event) => updateMetadataNotes(inspectorTarget.id, (event.target as HTMLTextAreaElement).value)}
					placeholder="Add investigator notes..."
				></textarea>
			{/if}

			{#if metadataPanelFeedback}
				<p class="metadata-feedback">{metadataPanelFeedback}</p>
			{/if}

			{#if metadataPanelIntel}
				<div class="intel-block">
					<h5>{metadataPanelIntel.title}</h5>
					<p>{metadataPanelIntel.body}</p>
				</div>
			{/if}

			{#if lastTimelineIndex}
				<div class="intel-badge">Timeline #{lastTimelineIndex}</div>
			{/if}

			{#if agenticInsight}
				<div class="intel-block agentic">
					<h5>Predictive Analysis</h5>
					<p>{agenticInsight}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.evidence-board-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #1a1a2e, #16213e);
		color: #ffffff;
		font-family: 'Courier New', monospace;
	}

	.board-header {
		background: rgba(0, 0, 0, 0.8);
		border-bottom: 2px solid #00ff88;
		padding: 1rem 2rem;
		box-shadow: 0 2px 10px rgba(0, 255, 136, 0.2);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h1 {
		color: #00ff88;
		font-family: 'Press Start 2P', cursive;
		font-size: 1.5rem;
		margin: 0;
		text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
	}

	.board-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.board-layout {
		display: grid;
		grid-template-columns: 320px 1fr 300px;
		height: calc(100vh - 80px);
		gap: 1rem;
		padding: 1rem;
	}

	.evidence-library {
		background: rgba(26, 26, 46, 0.9);
		border: 2px solid #00ff88;
		border-radius: 8px;
		padding: 1rem;
		overflow-y: auto;
	}

	.evidence-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.evidence-item {
		background: rgba(33, 37, 41, 0.8);
		border: 1px solid #495057;
		cursor: move;
		transition: all 0.3s ease;
		padding: 0.75rem;
	}

	.evidence-item:hover {
		border-color: #00ff88;
		box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
		transform: translateY(-2px);
	}

	.evidence-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.evidence-icon {
		font-size: 1.25rem;
	}

	.evidence-meta h4 {
		margin: 0;
		font-size: 0.875rem;
		color: #00ff88;
	}

	.evidence-type {
		font-size: 0.625rem;
		color: #6c757d;
		background: rgba(108, 117, 125, 0.2);
		padding: 0.125rem 0.25rem;
		border-radius: 2px;
	}

	.evidence-excerpt {
		font-size: 0.75rem;
		color: #adb5bd;
		margin: 0.5rem 0;
		line-height: 1.4;
	}

	.evidence-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.625rem;
	}

	.relevance-score {
		font-weight: bold;
	}

	.timestamp {
		color: #6c757d;
	}

	.evidence-board {
		position: relative;
		background: rgba(26, 26, 46, 0.9);
		border: 2px solid #00ff88;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 255, 136, 0.1);
	}

	.empty-board {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #6c757d;
	}

	.empty-board .nes-container {
		text-align: center;
		background: rgba(33, 37, 41, 0.8);
	}

	.empty-board p {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.subtitle {
		font-size: 0.875rem !important;
		color: #adb5bd !important;
	}

	.board-evidence-item {
		position: absolute;
		background: rgba(33, 37, 41, 0.95);
		border: 2px solid #495057;
		min-width: 200px;
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 0.75rem;
	}

	.board-evidence-item.pinned {
		border-color: #fbbf24;
		box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
	}

	.board-evidence-item:hover,
	.board-evidence-item.selected {
		border-color: #00ff88;
		box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
		transform: scale(1.02);
	}

	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.item-icon {
		font-size: 1rem;
	}

	.remove-btn {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 0.75rem;
		transition: background 0.3s ease;
	}

	.remove-btn:hover {
		background: #c82333;
	}

	.item-title {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		color: #00ff88;
		font-weight: bold;
	}

	.item-excerpt {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: #adb5bd;
		line-height: 1.3;
	}

	.item-footer {
		text-align: right;
		font-size: 0.625rem;
		font-weight: bold;
	}

	.connections-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.analysis-panel {
		background: rgba(26, 26, 46, 0.9);
		border: 2px solid #00ff88;
		border-radius: 8px;
		padding: 1rem;
		overflow-y: auto;
	}

	.selected-evidence h3 {
		color: #00ff88;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.75rem;
		margin: 0 0 1rem 0;
		text-shadow: 0 0 5px rgba(0, 255, 136, 0.3);
	}

	.evidence-detail {
		background: rgba(33, 37, 41, 0.8);
		border: 1px solid #495057;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.detail-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.detail-header h4 {
		margin: 0;
		color: #00ff88;
		font-size: 0.875rem;
	}

	.detail-excerpt {
		color: #adb5bd;
		font-size: 0.75rem;
		margin: 0.75rem 0;
		line-height: 1.4;
	}

	.detail-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
	}

	.meta-item .label {
		color: #6c757d;
		font-weight: bold;
	}

	.meta-item .value {
		color: #ffffff;
	}

	.node-context-menu {
		position: fixed;
		min-width: 220px;
		background: #0b111b;
		border: 1px solid #00ff88;
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
		z-index: 20;
		display: flex;
		flex-direction: column;
	}

	.node-context-menu button {
		background: transparent;
		border: none;
		color: #e6fffb;
		padding: 0.65rem 0.8rem;
		text-align: left;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.node-context-menu button:hover {
		background: rgba(0, 255, 136, 0.2);
	}

	.analysis-actions h4 {
		color: #00ff88;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.625rem;
		margin: 0 0 0.75rem 0;
		text-shadow: 0 0 5px rgba(0, 255, 136, 0.3);
	}

	.analysis-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.no-selection {
		text-align: center;
		color: #6c757d;
		font-size: 0.875rem;
		padding: 2rem;
	}

	/* NES.css overrides for dark theme */
	.nes-container.is-dark {
		background: rgba(33, 37, 41, 0.9);
		border-color: #00ff88;
	}

	.nes-container.is-dark .title {
		color: #00ff88;
		background: rgba(0, 0, 0, 0.8);
		border-color: #00ff88;
	}

	.nes-btn {
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		padding: 0.5rem 1rem;
	}

	.nes-checkbox {
		font-size: 0.75rem;
	}

	.nes-checkbox input[type="checkbox"] + span::before {
		border-color: #00ff88;
	}

	.nes-checkbox input[type="checkbox"]:checked + span::before {
		background: #00ff88;
		border-color: #00ff88;
	}

	.metadata-panel {
		position: fixed;
		right: 32px;
		top: 110px;
		width: 320px;
		background: rgba(8, 12, 18, 0.95);
		color: #e6fffb;
		border: 1px solid #00ff88;
		box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
		padding: 1rem;
		z-index: 18;
		backdrop-filter: blur(6px);
	}

	.metadata-panel.floating {
		top: auto;
		bottom: 32px;
	}

	.metadata-panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.panel-title {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.15em;
	}

	.panel-subtitle {
		margin: 0.2rem 0 0 0;
		font-size: 0.75rem;
		color: rgba(230, 255, 251, 0.8);
	}

	.panel-actions button {
		background: transparent;
		border: 1px solid #00ff88;
		color: #e6fffb;
		font-size: 0.65rem;
		padding: 0.2rem 0.4rem;
		margin-left: 0.4rem;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.45rem;
		font-size: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.metadata-grid label {
		display: block;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.metadata-grid span {
		display: block;
		color: #e6fffb;
	}

	.metadata-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.metadata-tags span {
		border: 1px solid rgba(0, 255, 136, 0.4);
		padding: 0.1rem 0.4rem;
		font-size: 0.65rem;
		text-transform: uppercase;
	}

	.notes-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 0.1em;
	}

	.metadata-panel textarea {
		width: 100%;
		min-height: 90px;
		background: rgba(2, 6, 12, 0.9);
		border: 1px solid rgba(0, 255, 136, 0.4);
		color: #e6fffb;
		font-family: 'Courier New', monospace;
		padding: 0.45rem;
		margin-top: 0.35rem;
	}

	.intel-block {
		margin-top: 0.85rem;
		padding: 0.65rem;
		border: 1px dashed rgba(0, 255, 136, 0.3);
	}

	.intel-block h5 {
		margin: 0 0 0.35rem 0;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #9ef9c0;
	}

	.intel-block p {
		margin: 0;
		font-size: 0.75rem;
		color: #f0fff4;
	}

	.intel-block.agentic {
		border-color: rgba(0, 150, 255, 0.4);
		background: rgba(0, 60, 90, 0.35);
	}

	.intel-badge {
		margin-top: 0.75rem;
		display: inline-block;
		border: 1px solid rgba(0, 255, 136, 0.5);
		padding: 0.15rem 0.5rem;
		font-size: 0.65rem;
		letter-spacing: 0.2em;
	}

	.metadata-feedback {
		margin-top: 0.5rem;
		font-size: 0.65rem;
		color: #00ff88;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}

	@media (max-width: 1280px) {
		.metadata-panel.docked {
			right: auto;
			left: 24px;
			top: auto;
			bottom: 96px;
		}
	}

	@media (max-width: 860px) {
		.metadata-panel {
			position: fixed;
			top: auto;
			bottom: 16px;
			right: 16px;
			width: calc(100% - 32px);
		}
	}
</style>

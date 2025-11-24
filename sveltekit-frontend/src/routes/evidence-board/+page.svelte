<script lang="ts">
	import EvidenceCard from '$lib/components/EvidenceCard.svelte';
	import EvidenceConnections from '$lib/components/EvidenceConnections.svelte';
	import { onMount } from 'svelte';

	let evidence = [];
	let selectedEvidence = null;
	let zoom = 100;
	let panX = 0;
	let panY = 0;
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };

	function handleZoomIn() {
		zoom = Math.min(zoom + 10, 200);
	}

	function handleZoomOut() {
		zoom = Math.max(zoom - 10, 50);
	}

	function handleZoomReset() {
		zoom = 100;
		panX = 0;
		panY = 0;
	}

	function handleMouseDown(e) {
		isDragging = true;
		dragStart = { x: e.clientX - panX, y: e.clientY - panY };
	}

	function handleMouseMove(e) {
		if (isDragging) {
			panX = e.clientX - dragStart.x;
			panY = e.clientY - dragStart.y;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleKeyDown(e) {
		if (e.ctrlKey || e.metaKey) {
			if (e.key === '+' || e.key === '=') {
				e.preventDefault();
				handleZoomIn();
			} else if (e.key === '-') {
				e.preventDefault();
				handleZoomOut();
			} else if (e.key === '0') {
				e.preventDefault();
				handleZoomReset();
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="evidence-board-container">
	<!-- Header -->
	<div class="board-header">
		<h1>Evidence Board</h1>
		<div class="zoom-controls">
			<button on:click={handleZoomOut} title="Zoom Out (Ctrl+-)">−</button>
			<span class="zoom-level">{zoom}%</span>
			<button on:click={handleZoomIn} title="Zoom In (Ctrl++)">+</button>
			<button on:click={handleZoomReset} title="Reset (Ctrl+0)">Reset</button>
		</div>
	</div>

	<!-- Main Layout -->
	<div class="board-layout">
		<!-- Left Sidebar: Evidence List -->
		<div class="sidebar left-sidebar">
			<h2>Evidence Library</h2>
			<div class="evidence-list">
				{#each evidence as item (item.id)}
					<div
						class="list-item"
						class:selected={selectedEvidence?.id === item.id}
						on:click={() => (selectedEvidence = item)}
					>
						<div class="status-indicator" style="background: {item.status_color}"></div>
						<div class="list-item-content">
							<div class="list-item-title">{item.title}</div>
							<div class="list-item-meta">{item.doc_id}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Center Canvas: Evidence Cards -->
		<div
			class="canvas"
			on:mousedown={handleMouseDown}
			on:mousemove={handleMouseMove}
			on:mouseup={handleMouseUp}
			on:mouseleave={handleMouseUp}
		>
			<div class="canvas-content" style="transform: translate({panX}px, {panY}px) scale({zoom / 100})">
				<!-- Connection Lines -->
				<EvidenceConnections {evidence} />

				<!-- Evidence Cards -->
				<div class="cards-container">
					{#each evidence as item (item.id)}
						<EvidenceCard
							{item}
							selected={selectedEvidence?.id === item.id}
							on:click={() => (selectedEvidence = item)}
						/>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Rail: Metadata -->
		<div class="sidebar right-sidebar">
			{#if selectedEvidence}
				<div class="metadata-panel">
					<h2>{selectedEvidence.title}</h2>
					<div class="metadata-section">
						<label>Document ID</label>
						<span>{selectedEvidence.doc_id}</span>
					</div>
					<div class="metadata-section">
						<label>Status</label>
						<span class="status-badge" style="background: {selectedEvidence.status_color}">
							{selectedEvidence.status}
						</span>
					</div>
					<div class="metadata-section">
						<label>Chunks</label>
						<span>{selectedEvidence.chunk_count}</span>
					</div>
					<div class="metadata-section">
						<label>Related Evidence</label>
						<div class="related-list">
							{#each selectedEvidence.related || [] as related}
								<div class="related-item">{related}</div>
							{/each}
						</div>
					</div>
					<div class="actions">
						<button>📌 Pin</button>
						<button>💬 Chat</button>
						<button>🔗 Link</button>
					</div>
				</div>
			{:else}
				<div class="empty-state">
					<p>Select evidence to view details</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.evidence-board-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #f5f4f0;
	}

	.board-header {
		padding: 1rem 1.5rem;
		background: white;
		border-bottom: 1px solid #e0ddd8;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.board-header h1 {
		margin: 0;
		font-size: 1.8rem;
		color: #2d2d2d;
		font-family: 'Crimson Text', serif;
	}

	.zoom-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.zoom-controls button {
		width: 32px;
		height: 32px;
		border: 1px solid #d0ccc7;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s;
	}

	.zoom-controls button:hover {
		background: #f0f0f0;
	}

	.zoom-level {
		min-width: 50px;
		text-align: center;
		font-size: 0.9rem;
		color: #666;
	}

	.board-layout {
		display: flex;
		flex: 1;
		gap: 1rem;
		padding: 1rem;
		overflow: hidden;
	}

	.sidebar {
		background: white;
		border: 1px solid #e0ddd8;
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.left-sidebar {
		flex: 0 0 22%;
	}

	.right-sidebar {
		flex: 0 0 23%;
	}

	.sidebar h2 {
		margin: 0;
		padding: 1rem;
		font-size: 1rem;
		border-bottom: 1px solid #e0ddd8;
		background: #fafaf8;
	}

	.evidence-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.list-item {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e0ddd8;
		cursor: pointer;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		transition: background 0.2s;
	}

	.list-item:hover {
		background: #fafaf8;
	}

	.list-item.selected {
		background: #f0f0f0;
		border-left: 3px solid #8b3a3a;
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.list-item-content {
		flex: 1;
		min-width: 0;
	}

	.list-item-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #2d2d2d;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.list-item-meta {
		font-size: 0.75rem;
		color: #999;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.canvas {
		flex: 1;
		background: white;
		border: 1px solid #e0ddd8;
		border-radius: 4px;
		overflow: hidden;
		cursor: grab;
		position: relative;
	}

	.canvas:active {
		cursor: grabbing;
	}

	.canvas-content {
		width: 100%;
		height: 100%;
		transform-origin: center;
		transition: transform 0.1s;
		position: relative;
	}

	.cards-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.metadata-panel {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.metadata-panel h2 {
		margin: 0;
		font-size: 1rem;
		color: #2d2d2d;
	}

	.metadata-section {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metadata-section label {
		font-size: 0.75rem;
		color: #999;
		font-weight: 600;
		text-transform: uppercase;
	}

	.metadata-section span {
		font-size: 0.9rem;
		color: #2d2d2d;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		color: white;
		font-size: 0.8rem;
		font-weight: 600;
		width: fit-content;
	}

	.related-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.related-item {
		padding: 0.5rem;
		background: #fafaf8;
		border: 1px solid #e0ddd8;
		border-radius: 4px;
		font-size: 0.85rem;
		color: #2d2d2d;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e0ddd8;
	}

	.actions button {
		padding: 0.5rem 1rem;
		background: #f0f0f0;
		border: 1px solid #d0ccc7;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s;
	}

	.actions button:hover {
		background: #e8e8e8;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #999;
	}
</style>

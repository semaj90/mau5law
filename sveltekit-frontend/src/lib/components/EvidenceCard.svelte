<script lang="ts">let { item = null, selected = false } = $props();

	import { createEventDispatcher } from 'svelte';

	
	

	const dispatch = createEventDispatcher();

	function handleClick() {
		dispatch('click', item);
	}
</script>

{#if item}
	<div
		class="evidence-card"
		class:selected
		on:click={handleClick}
		style="--status-color: {item.status_color || '#ccc'}"
	>
		<div class="card-status-strip"></div>
		<div class="card-content">
			<div class="card-title">{item.title}</div>
			<div class="card-snippet">{item.snippet || 'No preview available'}</div>
		</div>
		<div class="card-footer">
			<span class="card-meta">{item.doc_id}</span>
		</div>
	</div>
{/if}

<style>
	.evidence-card {
		position: absolute;
		width: 200px;
		height: 240px;
		background: white;
		border: 1px solid #d0ccc7;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: all 0.2s;
		transform: rotate(-2deg);
	}

	.evidence-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: rotate(-2deg) translateY(-2px);
	}

	.evidence-card.selected {
		border-color: #8b3a3a;
		box-shadow: 0 0 0 2px rgba(139, 58, 58, 0.2);
	}

	.card-status-strip {
		height: 8px;
		background: var(--status-color);
		border-radius: 4px 4px 0 0;
	}

	.card-content {
		flex: 1;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow: hidden;
	}

	.card-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: #2d2d2d;
		line-height: 1.2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-snippet {
		font-size: 0.8rem;
		color: #666;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #e0ddd8;
		background: #fafaf8;
		border-radius: 0 0 4px 4px;
	}

	.card-meta {
		font-size: 0.75rem;
		color: #999;
		font-family: 'Courier New', monospace;
	}
</style>

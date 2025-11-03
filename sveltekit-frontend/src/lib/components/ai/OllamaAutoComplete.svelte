<!-- src/lib/components/ai/OllamaAutoComplete.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Ollama } from '$lib/api/ollama';
	import type { OllamaGenerateResponse } from '$lib/api/ollama';

	// Props
	export let prompt = '';
	export let model = 'gemma3-legal:latest';
	export let enabled = true;
	export let debounceMs = 500;
	export let maxSuggestions = 5;
	export let minLength = 10; // Min characters before triggering

	// State
	let suggestions: string[] = $state([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let currentStream: AsyncGenerator<OllamaGenerateResponse> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Reactive: trigger suggestions when prompt changes
	$effect(() => {
		if (enabled && prompt.length >= minLength) {
			debouncedFetchSuggestions(prompt);
		} else {
			suggestions = [];
		}
	});

	async function debouncedFetchSuggestions(text: string) {
		// Clear existing debounce
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new debounce
		debounceTimer = setTimeout(() => {
			fetchSuggestions(text);
		}, debounceMs);
	}

	async function fetchSuggestions(text: string) {
		// Cancel existing stream
		if (currentStream) {
			try {
				await currentStream.return(undefined);
			} catch (e) {
				// Ignore cleanup errors
			}
			currentStream = null;
		}

		isLoading = true;
		error = null;
		suggestions = [];

		try {
			// Start streaming suggestions
			const stream = Ollama.generateStream({
				model,
				prompt: `Complete this legal text concisely (max 3 suggestions):\n\n${text}\n\nSuggestions:`,
				options: {
					temperature: 0.7,
					num_predict: 100,
					stop: ['\n\n', '---']
				}
			});

			currentStream = stream;
			let accumulated = '';

			for await (const chunk of stream) {
				if (chunk.done) break;

				accumulated += chunk.response;

				// Split into suggestions (by newline or bullet points)
				const lines = accumulated
					.split(/\n|•|-)
					.map((s) => s.trim())
					.filter((s) => s.length > 0 && s.length < 200);

				suggestions = lines.slice(0, maxSuggestions);
			}

			isLoading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch suggestions';
			isLoading = false;
			suggestions = [];
		}
	}

	function applySuggestion(suggestion: string) {
		// Dispatch event for parent to handle
		const event = new CustomEvent('suggestion', {
			detail: { text: suggestion, prompt }
		});
		document.dispatchEvent(event);
	}

	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		if (currentStream) {
			currentStream.return(undefined).catch(() => {});
		}
	});
</script>

{#if enabled && suggestions.length > 0}
	<div class="ollama-autocomplete">
		<div class="suggestions-header">
			<span class="icon">💡</span>
			<span class="title">AI Suggestions</span>
			{#if isLoading}
				<span class="loading">⏳</span>
			{/if}
		</div>

		<ul class="suggestions-list">
			{#each suggestions as suggestion, i}
				<li class="suggestion-item">
					<button
						type="button"
						class="suggestion-btn"
						onclick={() => applySuggestion(suggestion)}
						title="Click to apply suggestion"
					>
						<span class="number">{i + 1}.</span>
						<span class="text">{suggestion}</span>
					</button>
				</li>
			{/each}
		</ul>

		{#if error}
			<div class="error">
				<span class="icon">⚠️</span>
				<span>{error}</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.ollama-autocomplete {
		position: relative;
		background: var(--surface-2, #1e1e1e);
		border: 1px solid var(--border, #3e3e3e);
		border-radius: 8px;
		padding: 12px;
		margin-top: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		max-width: 600px;
	}

	.suggestions-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.suggestions-header .icon {
		font-size: 1.2em;
	}

	.suggestions-header .loading {
		margin-left: auto;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.suggestions-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.suggestion-item {
		margin: 0;
	}

	.suggestion-btn {
		width: 100%;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px;
		background: var(--surface-3, #2a2a2a);
		border: 1px solid transparent;
		border-radius: 6px;
		color: var(--text-secondary, #ccc);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.suggestion-btn:hover {
		background: var(--surface-4, #333);
		border-color: var(--accent, #4a9eff);
		color: var(--text-primary, #fff);
		transform: translateX(4px);
	}

	.suggestion-btn .number {
		flex-shrink: 0;
		font-weight: 600;
		color: var(--accent, #4a9eff);
	}

	.suggestion-btn .text {
		flex: 1;
		line-height: 1.4;
	}

	.error {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: rgba(255, 100, 100, 0.1);
		border: 1px solid rgba(255, 100, 100, 0.3);
		border-radius: 6px;
		color: #ff6464;
		margin-top: 8px;
		font-size: 0.9em;
	}
</style>

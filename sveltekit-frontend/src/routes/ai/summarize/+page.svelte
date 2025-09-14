<!--
AI Document Summarization - Generate summaries of legal documents
TODO: Implement document upload, AI summarization, export functionality
-->
<script lang="ts">
	import EssentialRoutePage from '$lib/templates/EssentialRoutePage.svelte';
	import { Button } from '$lib/components/ui/enhanced-bits';
	import * as Card from '$lib/components/ui/card';
	import { FileText, Upload, Download, Brain, Clock, Star } from 'lucide-svelte';

	let selectedFile = $state(null);
	let isUploading = $state(false);
	let isSummarizing = $state(false);
	let summary = $state('');
	let summaryType = $state('detailed');

	async function handleFileUpload(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		selectedFile = file;
		isUploading = true;

		try {
			// TODO: Implement file upload
			// const formData = new FormData();
			// formData.append('file', file);
			// await fetch('/api/ai/upload', { method: 'POST', body: formData });

			// Simulate upload
			setTimeout(() => {
				isUploading = false;
			}, 1000);
		} catch (error) {
			console.error('Upload failed:', error);
			isUploading = false;
		}
	}

	async function generateSummary() {
		if (!selectedFile) return;

		isSummarizing = true;
		try {
			// TODO: Implement AI summarization
			// const response = await fetch('/api/ai/summarize', {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({ fileId: selectedFile.id, type: summaryType })
			// });
			// const result = await response.json();

			// Simulate summarization
			setTimeout(() => {
				summary = `This legal document outlines the key provisions and requirements for ${selectedFile.name}. The main points include statutory obligations, procedural requirements, and compliance standards that must be followed. Key findings suggest that the document establishes clear guidelines for legal proceedings and evidence handling.`;
				isSummarizing = false;
			}, 2000);
		} catch (error) {
			console.error('Summarization failed:', error);
			isSummarizing = false;
		}
	}

	function exportSummary() {
		if (!summary) return;

		const blob = new Blob([summary], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selectedFile?.name || 'document'}_summary.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const summaryTypes = [
		{ value: 'brief', label: 'Brief Summary', description: 'Key points only' },
		{ value: 'detailed', label: 'Detailed Summary', description: 'Comprehensive analysis' },
		{ value: 'bullet', label: 'Bullet Points', description: 'Structured list format' }
	];
</script>

<EssentialRoutePage
	pageTitle="Document Summarization"
	description="AI-powered legal document analysis and summarization"
	showBackButton={true}
>
	{#snippet children()}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Upload and Controls -->
			<div>
				<Card.Root class="nes-container is-rounded mb-6">
					<Card.Header>
						<Card.Title class="nes-text is-primary flex items-center gap-2">
							<Upload class="w-5 h-5" />
							Document Upload
						</div.Title>
					</div.Header>
					<Card.Content>
						<div class="space-y-4">
							<!-- File Upload -->
							<div class="nes-field">
								<label class="nes-text text-sm mb-2 block">
									Select legal document
								</label>
								<input
									type="file"
									accept=".pdf,.doc,.docx,.txt"
									on:change={handleFileUpload}
									class="nes-input"
									disabled={isUploading}
								/>
							</div>

							{#if selectedFile}
								<div class="nes-container with-title is-centered">
									<p class="title">Selected File</p>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<FileText class="w-4 h-4" />
											<span class="text-sm">{selectedFile.name}</span>
										</div>
										<span class="nes-badge is-success">
											{Math.round(selectedFile.size / 1024)} KB
										</span>
									</div>
								</div>
							{/if}

							{#if isUploading}
								<div class="nes-text is-primary animate-pulse text-center">
									Uploading document...
								</div>
							{/if}
						</div>
					</div.Content>
				</div.Root>

				<!-- Summary Options -->
				<Card.Root class="nes-container is-rounded">
					<Card.Header>
						<Card.Title class="nes-text is-primary">
							Summary Options
						</div.Title>
					</div.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each summaryTypes as type}
								<label class="flex items-center gap-3 cursor-pointer">
									<input
										type="radio"
										bind:group={summaryType}
										value={type.value}
										class="nes-radio"
									/>
									<div>
										<div class="nes-text text-sm">{type.label}</div>
										<div class="nes-text is-disabled text-xs">
											{type.description}
										</div>
									</div>
								</label>
							{/each}

							<div class="pt-4 border-t border-gray-600">
								<Button
									class="nes-btn is-primary w-full"
									on:click={generateSummary}
									disabled={!selectedFile || isUploading || isSummarizing}
								>
									{#if isSummarizing}
										<Brain class="w-4 h-4 mr-2 animate-pulse" />
										Generating Summary...
									{:else}
										<Brain class="w-4 h-4 mr-2" />
										Generate Summary
									{/if}
							</div>
						</div>
					</div.Content>
				</div.Root>
			</div>

			<!-- Summary Output -->
			<div>
				<Card.Root class="nes-container is-rounded">
					<Card.Header>
						<div class="flex justify-between items-center">
							<Card.Title class="nes-text is-primary">
								AI Summary
							</div.Title>
							{#if summary}
								<Button
									size="sm"
									class="nes-btn"
									on:click={exportSummary}
								>
									<Download class="w-3 h-3 mr-1" />
									Export
							{/if}
						</div>
					</div.Header>
					<Card.Content>
						{#if isSummarizing}
							<div class="text-center py-8">
								<Brain class="w-8 h-8 mx-auto mb-4 animate-pulse" />
								<div class="nes-text is-primary">
									AI is analyzing your document...
								</div>
								<div class="nes-text is-disabled text-xs mt-2">
									This may take a few moments
								</div>
							</div>
						{:else if summary}
							<div class="space-y-4">
								<div class="nes-container with-title is-centered">
									<p class="title">Summary</p>
									<div class="text-sm leading-relaxed whitespace-pre-wrap">
										{summary}
									</div>
								</div>

								<!-- Summary Stats -->
								<div class="grid grid-cols-3 gap-2">
									<div class="text-center">
										<div class="nes-text is-success text-sm">
											{summary.split(' ').length}
										</div>
										<div class="nes-text is-disabled text-xs">Words</div>
									</div>
									<div class="text-center">
										<div class="nes-text is-success text-sm">
											{Math.ceil(summary.split(' ').length / 200)}
										</div>
										<div class="nes-text is-disabled text-xs">Min Read</div>
									</div>
									<div class="text-center">
										<div class="nes-text is-success text-sm flex items-center justify-center gap-1">
											<Star class="w-3 h-3" />
											95%
										</div>
										<div class="nes-text is-disabled text-xs">Confidence</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center py-8">
								<FileText class="w-8 h-8 mx-auto mb-4 opacity-50" />
								<div class="nes-text is-disabled">
									Upload a document to generate AI summary
								</div>
							</div>
						{/if}
					</div.Content>
				</div.Root>

				<!-- Recent Summaries -->
				<Card.Root class="nes-container is-rounded mt-6">
					<Card.Header>
						<Card.Title class="nes-text is-primary text-sm flex items-center gap-2">
							<Clock class="w-4 h-4" />
							Recent Summaries
						</div.Title>
					</div.Header>
					<Card.Content>
						<div class="space-y-2">
							<div class="text-xs nes-text is-disabled text-center">
								No recent summaries
							</div>
						</div>
					</div.Content>
				</div.Root>
			</div>
		</div>
	{/snippet}
</EssentialRoutePage>
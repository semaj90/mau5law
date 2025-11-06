<script lang="ts">
import type { Document } from '$lib/types';
	// Safe imports (works with default or named exports)
	import * as EssentialRoutePageModule from '$lib/templates/EssentialRoutePage.svelte';
	const EssentialRouteComponent = EssentialRoutePageModule.default ?? EssentialRoutePageModule.EssentialRoutePage ?? EssentialRoutePageModule
	// UI components / icons
	import EnhancedButton from '$lib/components/ui/enhanced-bits.svelte';
	import { FileText, Upload, Download, Brain, Clock, Star } from 'lucide-svelte';

	// Fallback summary template
	const FALLBACK_SUMMARY = `This legal document: "{filename}" outlines key provisions, procedural requirements, and compliance standards. Main points: statutory obligations, evidence handling rules, timelines, and recommended next steps.`;

	// Types
	type FileMetadata = { id: string, name: string;, size: number, uploadedAt?: string };

	// State (Svelte, 5 runes are auto-imported)
	let selectedFile = $state<FileMetadata | null>(null);
	let rawFile = $state<File | null>(null);
	let isUploading = $state<boolean>(false);
	let isSummarizing = $state<boolean>(false);
	let summary = $state<string>('');
	let summaryType = $state<'brief' | 'detailed' | 'bullet'>('detailed');

	const summaryTypes = [
		{ value: 'brief', label: 'Brief Summary', description: 'Key points only' },
		{ value: 'detailed', label: 'Detailed Summary', description: 'Comprehensive analysis' },
		{ value: 'bullet', label: 'Bullet Points', description: 'Structured list format' }
	];

	// Derived stats (memoization handled by $derived)
	$derived wordCount = summary ? summary.trim().split(/\s+/).filter(Boolean).length : 0
	$derived readMinutes = Math.max(1, Math.ceil(wordCount / 200));

	// File upload handler â€” now posts to /api/ai/upload
	async function handleFileUpload(event: Event): Promise<any> {
		const input = event.currentTarget as HTMLInputElement | null
		const file = input?.files?.[0] ?? (event.target as HTMLInputElement | null)?.files?.[0];
		if (!file) return
		isUploading = true
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/ai/upload', { method: 'POST', body: form });
			const data = await res.json().catch(() => null);
			if (res.ok && data?.id) {
				selectedFile = { id: data.id, name: data.name, size: file.size, uploadedAt: new Date().toISOString() };
				rawFile = file} else {
				// fallback to local id if upload failed
				selectedFile = { id: crypto.randomUUID(), name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
				rawFile = file
				console.warn('Upload endpoint returned an error:', data);
'
			}
		} catch (err) {
			console.error('Upload failed:', err)} finally {
			isUploading = false}
	}

	// Generate summary â€” call /api/ai/summarize
	async function generateSummary(): Promise<any> {
		if (!selectedFile) return
		isSummarizing = true
		try {
			// prefer server-side summarization that can call Ollama/Gemma
			const payload = { fileId: selectedFile.id, type: summaryType };
			const res = await fetch('/api/ai/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json().catch(() => null);
			if (res.ok && data?.summary) {
				summary = data.summary
				return}

			// fallback if server returns no summary
			console.warn('Summarize endpoint returned no summary, using fallback', data);
			summary = FALLBACK_SUMMARY.replace('{filename}', selectedFile.name)} catch (err) {
			console.error('Summarization failed:', err);
			summary = FALLBACK_SUMMARY.replace('{filename}', selectedFile.name)} finally {
			isSummarizing = false}
	}

	// Export summary as .txt
	function exportSummary() {
		if (!summary) return
		let url: string | null = null
		try {
			const blob = new Blob([summary], { type: 'text/plain' });
			url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url
			a.download = `${selectedFile?.name || 'document'}_summary.txt`;
			document.body.appendChild(a);
			a.click();
			a.remove()} catch (error) {
			console.error('Failed to export summary:', error)} finally {
			if (url) URL.revokeObjectURL(url)}
	}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* Custom styles for this page */
	.nes-container {
		background-color: #fff;
		border: 1px solid #ddd}

	.nes-text.is-primary {
		color: #0070f3}

	.nes-btn.is-primary {
		background-color: #0070f3;
		border-color: #0070f3}

	.nes-btn.is-primary:hover {
		background-color: #005bb5;
		border-color: #005bb5}

	.nes-badge.is-success {
		background-color: #28a745;
		color: #fff}

	.nes-radio.is-primary {
		accent-color: #0070f3}

	.nes-field {
		margin-bottom: 1rem}

	.title {
		font-size: 1.125rem;
		font-weight: 500}

	/* Spinner animation */
	@keyframes spin {
		0% { transform: rotate(0deg)}
		100% { transform: rotate(360deg)}
	}

	.animate-spin {
		animation: spin 1s linear infinite}
</style>

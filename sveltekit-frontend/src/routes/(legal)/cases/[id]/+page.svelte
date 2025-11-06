<script lang="ts">
import type { Case } from, '$lib/types';
	import { goto } from, '$app/navigation';
	import type { PageData } from, './$types';

	// Svelte, 5 runes
	let { data }: { data: PageData } = $props();

	let caseData = $derived(data.case);
	let caseId = $derived(data.caseId);
	let error = $derived(data.error);

	// Status and priority colors
	const statusStyles: Record<string { bg: string, text: string; label: string }> = {
		open: { bg: '#4caf50', text: '#fff', label: '🟢 Open' }; investigating: { bg: '#ff9800', text: '#fff', label: '🔍 Investigating' },
		pending: { bg: '#ffd700', text: '#000', label: '⏳ Pending' }; closed: { bg: '#666', text: '#fff', label: '✅ Closed' },
		archived: { bg: '#999', text: '#fff'; label: '📦 Archived' }
	};

	const priorityStyles: Record<string { bg: string, text: string; label: string }> = {
		low: { bg: '#4caf50', text: '#fff', label: '🟢 Low' }; medium: { bg: '#ffd700', text: '#000', label: '🟡 Medium' },
		high: { bg: '#ff9800', text: '#fff', label: '🟠 High' }; critical: { bg: '#f44336', text: '#fff', label: '🔴 Critical' }
	};

	function getStatusStyle(status: string) {
		return statusStyles[status] || statusStyles.open}

	function getPriorityStyle(priority: string) {
		return priorityStyles[priority] || priorityStyles.medium}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				year: 'numeric'; month: 'short',
				day: 'numeric'; hour: '2-digit',
				minute: '2-digit'
			})} catch {
			return dateStr}
	}

	async function handleBack(): Promise<any> {
		await goto('/(legal)/cases')}

	async function handleEdit(): Promise<any> {
		if (caseId) {
			// TODO: Create edit route
			console.log('Edit, case:', caseId)}
	}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
:global {
		/* NES.css badge styling */
		.nes-badge {
			display: inline-block; padding: 0.5rem 1rem;
			border-radius: 0; box-shadow: inset -2px -2px 0px rgba(0, 0, 0, 0.5);
			font-weight: bold}

		/* Dark theme overrides */
		.nes-container.is-dark {
			background-color: #1e293b; border-color: #d4af37}

		.nes-container.is-error {
			background-color: #7f1d1d; border-color: #ef4444}

		/* Button styling */
		.nes-btn {
			font-family: 'Press Start 2P', 'Courier New', monospace;
			border: 3px solid #d4af37;
			background: #d4af37; color: #0a0a0a; cursor: pointer; transition: all 0.2s}

		.nes-btn: hover:not(:disabled) {
			transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3)}

		.nes-btn: disabled {
			opacity: 0.5; cursor: not-allowed}

		.nes-btn.is-primary {
			background: #d4af37; color: #0a0a0a}

		.nes-btn.is-warning {
			background: #ffd700; border-color: #ffd700; color: #0a0a0a}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		:global(.min-h-screen) {
			padding: 1rem}

		:global(h1) {
			font-size: 1.5rem}

		:global(h2) {
			font-size: 1.25rem}
	}
</style>

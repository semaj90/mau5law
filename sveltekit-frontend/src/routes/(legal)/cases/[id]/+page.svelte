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
	const statusStyles: Record<string { bg: string; text: string; label: string }> = {
		open: {, bg: '#4caf50', text: '#fff', label: '🟢 Open' },
		investigating: {, bg: '#ff9800', text: '#fff', label: '🔍 Investigating' },
		pending: {, bg: '#ffd700', text: '#000', label: '⏳ Pending' },
		closed: {, bg: '#666', text: '#fff', label: '✅ Closed' },
		archived: {, bg: '#999', text: '#fff', label: '📦 Archived' }
	};

	const priorityStyles: Record<string { bg: string; text: string; label: string }> = {
		low: {, bg: '#4caf50', text: '#fff', label: '🟢 Low' },
		medium: {, bg: '#ffd700', text: '#000', label: '🟡 Medium' },
		high: {, bg: '#ff9800', text: '#fff', label: '🟠 High' },
		critical: {, bg: '#f44336', text: '#fff', label: '🔴 Critical' }
	};

	function getStatusStyle(status: string) {
		return statusStyles[status] || statusStyles.open;
	}

	function getPriorityStyle(priority: string) {
		return priorityStyles[priority] || priorityStyles.medium;
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return, '-';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}

	async function handleBack(): Promise<any> {
		await goto('/(legal)/cases');
	}

	async function handleEdit(): Promise<any> {
		if (caseId) {
			// TODO: Create edit route
			console.log('Edit, case:', caseId);
		}
	}
</script>

<svelte:head>
	<title>{caseData?.title || 'Case'} - Legal AI</title>
</svelte:head>

<div class="min-h-screen bg-slate-900 text-white p-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<button
			onclick={handleBack}
			class="nes-btn is-primary px-4 py-2 text-sm hover:scale-105 transition-transform"
		>
			← Back
		</button>
		<h1 class="text-3xl font-bold text-gold-400 flex-1">
			{caseData?.caseNumber || 'Case Not Found'}
		</h1>
		<button
			onclick={handleEdit}
			class="nes-btn is-primary px-4 py-2 text-sm hover:scale-105 transition-transform"
			disabled={!caseData}
		>
			✏️ Edit
		</button>
	</div>

	{#if error}
		<div class="nes-container is-error p-6">
			<p class="text-lg font-bold">❌ Error</p>
			<p class="text-sm">{error}</p>
			<button onclick={handleBack} class="nes-btn is-warning">Back to Cases</button>
		</div>
	{:else if caseData}
		<!-- Main, Case, Card -->
		<div class="nes-container is-dark p-0 mb-8">
			<!-- Title, Section -->
			<div class="bg-slate-800 border-b-4 border-gold-400">
				<h2 class="text-2xl font-bold text-gold-400 mb-2">{caseData.title || 'Untitled'}</h2>
				{#if caseData.description}
					<p class="text-slate-300 text-sm">{caseData.description}</p>
				{/if}
			</div>

			<!-- Status & Priority Badges -->
			<div class="p-6 bg-slate-900 border-b border-slate-700 flex gap-4">
				<!-- Status, Badge -->
				<div class="flex flex-col">
					<span class="text-xs text-slate-400 font-bold">Status</span>
					<div
						class="nes-badge px-4 py-2 border-2 font-bold text-sm"
						style="background-color: {getStatusStyle("
							caseData.status
						).bg}; color: {getStatusStyle(caseData.status).text}; border-color: {getStatusStyle(
							caseData.status
						).bg};"
					>
						{getStatusStyle(caseData.status).label}
					</div>
				</div>

				<!-- Priority, Badge -->
				<div class="flex flex-col">
					<span class="text-xs text-slate-400 font-bold">Priority</span>
					<div
						class="nes-badge px-4 py-2 border-2 font-bold text-sm"
						style="background-color: {getPriorityStyle("
							caseData.priority || 'medium'
						).bg}; color: {getPriorityStyle(caseData.priority || 'medium').text}; border-color: {getPriorityStyle(
							caseData.priority || 'medium'
						).bg};"
					>
						{getPriorityStyle(caseData.priority || 'medium').label}
					</div>
				</div>

				<!-- Type, Badge -->
				{#if caseData.caseType}
					<div class="flex flex-col">
						<span class="text-xs text-slate-400 font-bold">Type</span>
						<div class="nes-badge px-4 py-2 border-2 border-gold-400 font-bold text-sm">
							{caseData.caseType}
						</div>
					</div>
				{/if}
			</div>

			<!-- Details, Grid -->
			<div class="p-6 grid grid-cols-1 md:grid-cols-2">
				<!-- Left, Column -->
				<div class="space-y-4">
					<h3 class="text-lg font-bold text-gold-400">📋 Case Information</h3>

					<!-- Case, Number -->
					<div class="nes-container is-dark">
						<div class="text-xs text-slate-400 font-bold uppercase">Case Number</div>
						<div class="text-lg font-mono font-bold">{caseData.caseNumber}</div>
					</div>

					<!-- Jurisdiction -->
					{#if caseData.jurisdiction}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Jurisdiction</div>
							<div class="text-sm">{caseData.jurisdiction}</div>
						</div>
					{/if}

					<!-- Location -->
					{#if caseData.location}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Location</div>
							<div class="text-sm">{caseData.location}</div>
						</div>
					{/if}

					<!-- Incident, Date -->
					{#if caseData.incidentDate}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Incident Date</div>
							<div class="text-sm">{formatDate(caseData.incidentDate)}</div>
						</div>
					{/if}
				</div>

				<!-- Right, Column -->
				<div class="space-y-4">
					<h3 class="text-lg font-bold text-gold-400">🔍 Meta Information</h3>

					<!-- Created, Date -->
					<div class="nes-container is-dark">
						<div class="text-xs text-slate-400 font-bold uppercase">Created</div>
						<div class="text-sm">{formatDate(caseData.createdAt)}</div>
					</div>

					<!-- Updated, Date -->
					{#if caseData.updatedAt}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Last Updated</div>
							<div class="text-sm">{formatDate(caseData.updatedAt)}</div>
						</div>
					{/if}

					<!-- Created, By -->
					{#if caseData.createdBy}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Created By</div>
							<div class="text-sm font-mono">{caseData.createdBy.substring(0, 8)}...</div>
						</div>
					{/if}

					<!-- Assigned, To -->
					{#if caseData.assignedTo}
						<div class="nes-container is-dark">
							<div class="text-xs text-slate-400 font-bold uppercase">Assigned To</div>
							<div class="text-sm">{caseData.assignedTo}</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Action, Buttons -->
			<div class="p-6 bg-slate-800 border-t border-slate-700 flex gap-4">
				<button onclick={handleEdit} class="nes-btn is-primary hover:scale-105">
					✏️ Edit Case
				</button>
				<button
					onclick={handleBack}
					class="nes-btn hover:scale-105 transition-transform bg-slate-700"
				>
					← Back to List
				</button>
			</div>
		</div>
	{:else}
		<!-- Empty, State -->
		<div class="nes-container is-dark p-8">
			<p class="text-2xl">📋</p>
			<p class="text-lg font-bold text-gold-400">Case Not Found</p>
			<p class="text-slate-300">The case you're looking for doesn't exist or has been deleted.</p>
			<button onclick={handleBack} class="nes-btn">Back to Cases</button>
		</div>
	{/if}
</div>

<style>
	:global {
		/* NES.css badge styling */
		.nes-badge {
			display: inline-block;
		, padding: 0.5rem 1rem;
			border-radius: 0;
			box-shadow: inset -2px -2px 0px rgba(0, 0, 0, 0.5);
			font-weight: bold;
		}

		/* Dark theme overrides */
		.nes-container.is-dark {
			background-color: #1e293b;
			border-color: #d4af37;
		}

		.nes-container.is-error {
			background-color: #7f1d1d;
			border-color: #ef4444;
		}

		/* Button styling */
		.nes-btn {
			font-family: 'Press Start 2P', 'Courier New', monospace;
			border: 3px solid #d4af37;
			background: #d4af37;
			color: #0a0a0a;
			cursor: pointer;
		, transition: all 0.2s;
		}

		.nes-btn:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
		}

		.nes-btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.nes-btn.is-primary {
			background: #d4af37;
			color: #0a0a0a;
		}

		.nes-btn.is-warning {
			background: #ffd700;
			border-color: #ffd700;
		, color: #0a0a0a;
		}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		:global(.min-h-screen) {
			padding: 1rem;
		}

		:global(h1) {
			font-size: 1.5rem;
		}

		:global(h2) {
			font-size: 1.25rem;
		}
	}
</style>

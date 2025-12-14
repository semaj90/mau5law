<script lang="ts">
	import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
	import EvidenceDataGrid from '$lib/components/admin/EvidenceDataGrid.svelte';
	import EvidenceDrawer from '$lib/components/admin/EvidenceDrawer.svelte';
	import JurisdictionSelector from '$lib/components/admin/JurisdictionSelector.svelte';
	import { onMount } from 'svelte';

	interface EvidenceFile {
		id: string;
		filename: string;
		file_type: string;
		file_size: number;
		jurisdiction: string;
		processing_status: string;
		created_at: string;
		chunk_count: number;
	}

	let jurisdiction = $state('');
	let evidenceItems = $state<EvidenceFile[]>([]);
	let selectedEvidence = $state<EvidenceFile | null>(null);
	let isDrawerOpen = $state(false);
	let isLoading = $state(false);
	let isSaving = $state(false);
	let currentPage = $state(1);
	let pageSize = $state(50);
	let totalItems = $state(0);

	let filters = $state({
		jurisdiction: '',
		status: '',
		file_type: ''
	});

	let searchQuery = $state('');

	onMount(() => {
		// Load initial data if jurisdiction is set
		if (jurisdiction) {
			loadEvidence();
		}
	});

	async function loadEvidence() {
		if (!jurisdiction) return;

		isLoading = true;
		try {
			const params = new URLSearchParams({
				jurisdiction,
				page: currentPage.toString(),
				page_size: pageSize.toString(),
				search: searchQuery,
				...(filters.status && { status: filters.status }),
				...(filters.file_type && { file_type: filters.file_type })
			});

			const response = await fetch(`/api/evidence?${params}`);
			if (!response.ok) throw new Error('Failed to load evidence');

			const data = await response.json();
			evidenceItems = data.items || [];
			totalItems = data.total || 0;
		} catch (error) {
			console.error('Error loading evidence:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleJurisdictionChange(newJurisdiction: string) {
		jurisdiction = newJurisdiction;
		currentPage = 1;
		filters = { jurisdiction: '', status: '', file_type: '' };
		searchQuery = '';

		if (jurisdiction) {
			loadEvidence();
		}
	}

	function handleRowClick(event: CustomEvent<EvidenceFile>) {
		selectedEvidence = event.detail;
		isDrawerOpen = true;
	}

	function handleDrawerClose() {
		isDrawerOpen = false;
		selectedEvidence = null;
	}

	async function handleDrawerSave(event: CustomEvent<Partial<EvidenceFile>>) {
		if (!selectedEvidence?.id) return;

		isSaving = true;
		try {
			const response = await fetch(`/api/evidence/${selectedEvidence.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(event.detail)
			});

			if (!response.ok) throw new Error('Failed to save evidence');

			// Reload evidence list
			await loadEvidence();
			handleDrawerClose();
		} catch (error) {
			console.error('Error saving evidence:', error);
		} finally {
			isSaving = false;
		}
	}

	async function handleDrawerDelete(event: CustomEvent<string>) {
		if (!event.detail) return;

		isSaving = true;
		try {
			const response = await fetch(`/api/evidence/${event.detail}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Failed to delete evidence');

			// Reload evidence list
			await loadEvidence();
			handleDrawerClose();
		} catch (error) {
			console.error('Error deleting evidence:', error);
		} finally {
			isSaving = false;
		}
	}

	function handleSearch(query: string) {
		searchQuery = query;
		currentPage = 1;
		loadEvidence();
	}

	function handleFilterChange(newFilters: Record<string, string>) {
		filters = newFilters;
		currentPage = 1;
		loadEvidence();
	}

	function handlePageChange(page: number) {
		currentPage = page;
		loadEvidence();
	}
</script>

<AdminLayout title="Evidence Files" subtitle="Manage legal evidence documents and metadata">
	<div class="evidence-page">
		<!-- Jurisdiction Selector -->
		<div class="jurisdiction-section">
			<JurisdictionSelector
				bind:value={jurisdiction}
				onChange={handleJurisdictionChange}
				required={true}
				showLabel={true}
			/>
		</div>

		<!-- Evidence Grid (disabled if no jurisdiction) -->
		{#if jurisdiction}
			<div class="grid-section">
				<EvidenceDataGrid
					items={evidenceItems}
					total={totalItems}
					page={currentPage}
					pageSize={pageSize}
					isLoading={isLoading}
					onRowClick={handleRowClick}
					onPageChange={handlePageChange}
					onSearch={handleSearch}
					onFilterChange={handleFilterChange}
				/>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-icon">⚖️</div>
				<h3>Select a Jurisdiction</h3>
				<p>Choose a jurisdiction above to view and manage evidence files</p>
			</div>
		{/if}

		<!-- Evidence Drawer -->
		{#if selectedEvidence}
			<EvidenceDrawer
				isOpen={isDrawerOpen}
				data={selectedEvidence}
				isLoading={false}
				isSaving={isSaving}
				onClose={handleDrawerClose}
				onSave={handleDrawerSave}
				onDelete={handleDrawerDelete}
			/>
		{/if}
	</div>
</AdminLayout>

<style>
	.evidence-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		height: 100%;
	}

	.jurisdiction-section {
		padding: 1.5rem;
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
		max-width: 400px;
	}

	.grid-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
		overflow: hidden;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 400px;
		background: #111;
		border: 2px dashed #333;
		border-radius: 6px;
		color: #999;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #ddd;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.95rem;
		color: #999;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.evidence-page {
			gap: 1rem;
		}

		.jurisdiction-section {
			max-width: 100%;
		}
	}
</style>

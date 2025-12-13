<script lang="ts">
	import { onMount } from 'svelte';

	interface AuditEntry {
		id: string;
		user_id: string | null;
		resource_type: string;
		resource_id: string;
		operation: string;
		old_values: Record<string, any> | null;
		new_values: Record<string, any> | null;
		timestamp: string;
	}

	let entries = $state<AuditEntry[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSize = $state(50);

	// Filters
	let resourceType = $state('');
	let resourceId = $state('');
	let userId = $state('');
	let startDate = $state('');
	let endDate = $state('');

	const resourceTypes = ['Evidence', 'Tag', 'EvidenceTag', 'RAGIndex'];

	onMount(() => {
		loadAuditLog();
	});

	async function loadAuditLog() {
		isLoading = true;
		error = null;

		try {
			const params = new URLSearchParams({
				limit: pageSize.toString(),
				offset: ((currentPage - 1) * pageSize).toString(),
			});

			if (resourceType) params.set('resourceType', resourceType);
			if (resourceId) params.set('resourceId', resourceId);
			if (userId) params.set('userId', userId);
			if (startDate) params.set('startDate', startDate);
			if (endDate) params.set('endDate', endDate);

			const res = await fetch(`/api/audit?${params}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			entries = data.entries || [];
			total = data.total || 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load audit log';
		} finally {
			isLoading = false;
		}
	}

	function handleFilterChange() {
		currentPage = 1;
		loadAuditLog();
	}

	function handlePageChange(page: number) {
		currentPage = page;
		loadAuditLog();
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}

	function getOperationBadgeClass(operation: string): string {
		switch (operation) {
			case 'CREATE':
				return 'badge-success';
			case 'UPDATE':
				return 'badge-info';
			case 'DELETE':
				return 'badge-error';
			default:
				return 'badge-default';
		}
	}

	function formatChanges(oldValues: any, newValues: any): string {
		if (!oldValues && newValues) return 'Created';
		if (oldValues && !newValues) return 'Deleted';
		if (oldValues && newValues) {
			const changes = Object.keys(newValues).filter(
				(k) => JSON.stringify(oldValues[k]) !== JSON.stringify(newValues[k])
			);
			return changes.length > 0 ? changes.join(', ') : 'No changes';
		}
		return '-';
	}

	const totalPages = $derived(Math.ceil(total / pageSize));
</script>

<svelte:head>
	<title>Audit Log | Admin</title>
</svelte:head>

<div class="audit-page">
	<div class="page-header">
		<h1>📋 Audit Log</h1>
		<p>Read-only compliance history for all evidence operations</p>
	</div>

	<!-- Filters -->
	<div class="filter-section">
		<div class="filter-row">
			<div class="filter-group">
				<label for="resourceType">Resource Type</label>
				<select
					id="resourceType"
					bind:value={resourceType}
					onchange={handleFilterChange}
				>
					<option value="">All Types</option>
					{#each resourceTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<div class="filter-group">
				<label for="resourceId">Resource ID</label>
				<input
					id="resourceId"
					type="text"
					bind:value={resourceId}
					placeholder="Enter UUID..."
					onchange={handleFilterChange}
				/>
			</div>

			<div class="filter-group">
				<label for="userId">User ID</label>
				<input
					id="userId"
					type="text"
					bind:value={userId}
					placeholder="Enter User ID..."
					onchange={handleFilterChange}
				/>
			</div>
		</div>

		<div class="filter-row">
			<div class="filter-group">
				<label for="startDate">Start Date</label>
				<input
					id="startDate"
					type="datetime-local"
					bind:value={startDate}
					onchange={handleFilterChange}
				/>
			</div>

			<div class="filter-group">
				<label for="endDate">End Date</label>
				<input
					id="endDate"
					type="datetime-local"
					bind:value={endDate}
					onchange={handleFilterChange}
				/>
			</div>

			<div class="filter-group">
				<button class="btn-refresh" onclick={loadAuditLog}>
					🔄 Refresh
				</button>
			</div>
		</div>
	</div>

	<!-- Error State -->
	{#if error}
		<div class="error-banner">
			⚠️ {error}
		</div>
	{/if}

	<!-- Table -->
	<div class="table-container">
		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading audit log...</p>
			</div>
		{:else if entries.length === 0}
			<div class="empty-state">
				<p>No audit entries found</p>
			</div>
		{:else}
			<table class="audit-table">
				<thead>
					<tr>
						<th>Timestamp</th>
						<th>Operation</th>
						<th>Resource Type</th>
						<th>Resource ID</th>
						<th>User</th>
						<th>Changes</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as entry (entry.id)}
						<tr>
							<td class="timestamp">{formatDate(entry.timestamp)}</td>
							<td>
								<span class="badge {getOperationBadgeClass(entry.operation)}">
									{entry.operation}
								</span>
							</td>
							<td>{entry.resource_type}</td>
							<td class="resource-id">
								<code>{entry.resource_id.slice(0, 8)}...</code>
							</td>
							<td class="user-id">
								{entry.user_id ? entry.user_id.slice(0, 8) + '...' : 'System'}
							</td>
							<td class="changes">
								{formatChanges(entry.old_values, entry.new_values)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Pagination -->
	{#if !isLoading && entries.length > 0}
		<div class="pagination">
			<div class="pagination-info">
				Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total}
			</div>

			<div class="pagination-controls">
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					class="pagination-btn"
				>
					← Previous
				</button>

				<span class="page-indicator">
					Page {currentPage} of {totalPages}
				</span>

				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="pagination-btn"
				>
					Next →
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.audit-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background: #0d0d0f;
		min-height: 100%;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #ddd;
	}

	.page-header p {
		margin: 0.5rem 0 0 0;
		color: #999;
		font-size: 0.9rem;
	}

	/* Filters */
	.filter-section {
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.filter-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-width: 150px;
	}

	.filter-group label {
		font-size: 0.8rem;
		color: #999;
		text-transform: uppercase;
	}

	.filter-group select,
	.filter-group input {
		padding: 0.5rem 0.75rem;
		background: #16161a;
		border: 1px solid #333;
		border-radius: 4px;
		color: #ddd;
		font-size: 0.9rem;
	}

	.filter-group select:focus,
	.filter-group input:focus {
		outline: none;
		border-color: #9df;
	}

	.btn-refresh {
		padding: 0.5rem 1rem;
		background: #9df;
		border: none;
		border-radius: 4px;
		color: #000;
		font-weight: 500;
		cursor: pointer;
		margin-top: auto;
	}

	.btn-refresh:hover {
		background: #7ce;
	}

	/* Error */
	.error-banner {
		padding: 1rem;
		background: rgba(255, 68, 68, 0.1);
		border: 1px solid rgba(255, 68, 68, 0.3);
		border-radius: 4px;
		color: #f88;
	}

	/* Table */
	.table-container {
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
		overflow: hidden;
		flex: 1;
	}

	.audit-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.audit-table thead {
		background: #16161a;
		border-bottom: 1px solid #333;
	}

	.audit-table th {
		padding: 0.75rem;
		text-align: left;
		color: #999;
		font-weight: 600;
		white-space: nowrap;
	}

	.audit-table tbody tr {
		border-bottom: 1px solid #222;
	}

	.audit-table tbody tr:hover {
		background: #16161a;
	}

	.audit-table td {
		padding: 0.75rem;
		color: #ddd;
	}

	.audit-table td.timestamp {
		font-size: 0.85rem;
		color: #999;
		white-space: nowrap;
	}

	.audit-table td.resource-id code,
	.audit-table td.user-id {
		font-family: monospace;
		font-size: 0.85rem;
		color: #9df;
	}

	.audit-table td.changes {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Badges */
	.badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.badge-success {
		background: rgba(68, 170, 68, 0.2);
		color: #4a4;
	}

	.badge-info {
		background: rgba(153, 221, 255, 0.2);
		color: #9df;
	}

	.badge-error {
		background: rgba(255, 68, 68, 0.2);
		color: #f44;
	}

	.badge-default {
		background: rgba(153, 153, 153, 0.2);
		color: #999;
	}

	/* Loading/Empty */
	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 300px;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #333;
		border-top-color: #9df;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #111;
		border: 1px solid #222;
		border-radius: 6px;
	}

	.pagination-info {
		color: #999;
		font-size: 0.9rem;
	}

	.pagination-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.pagination-btn {
		padding: 0.5rem 0.75rem;
		background: #16161a;
		border: 1px solid #333;
		border-radius: 4px;
		color: #ddd;
		cursor: pointer;
	}

	.pagination-btn:hover:not(:disabled) {
		border-color: #9df;
		color: #9df;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-indicator {
		color: #999;
		font-size: 0.9rem;
	}
</style>

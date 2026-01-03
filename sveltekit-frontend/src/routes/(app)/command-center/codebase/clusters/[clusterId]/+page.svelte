<script lang="ts">
	/**
	 * ═══════════════════════════════════════════════════════════════════════
	 * Cluster Detail View
	 * ═══════════════════════════════════════════════════════════════════════
	 * Task: 13.1 - Create admin route structure
	 * Route: /command-center/codebase/clusters/[clusterId]
	 * Purpose: View cluster details, member errors, and fix suggestions
	 */
	import { page } from '$app/stores';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui';
	import { Button } from '$lib/components/ui/button';
	import {
	  AlertTriangle,
	  ArrowLeft,
	  Brain,
	  CheckCircle,
	  Code,
	  Copy,
	  FileCode,
	  Layers,
	  Lightbulb,
	  RefreshCw,
	  Zap
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Types
	interface ErrorCluster {
		id: string;
		kind: string;
		name: string;
		dominant_code: string;
		top_files: string[];
		representative_errors: string[];
		fix_suggestion: string;
		member_count: number;
		surface: string[];
		tech: string[];
		runId: string;
		timestamp: string;
		coordinates?: { x: number; y: number; z: number };
	}

	interface ClusterMember {
		id: string;
		errorCode: string;
		filePath: string;
		line: number;
		col: number;
		message: string;
		severity: string;
	}

	// State
	let clusterId = $derived($page.params.clusterId);
	let isLoading = $state(true);
	let cluster = $state<ErrorCluster | null>(null);
	let members = $state<ClusterMember[]>([]);
	let copiedSuggestion = $state(false);

	onMount(async () => {
		await loadClusterData();
	});

	async function loadClusterData() {
		isLoading = true;
		try {
			// Load cluster details
			const clusterResponse = await fetch(`/api/codebase-index/clusters/${clusterId}`);
			if (clusterResponse.ok) {
				cluster = await clusterResponse.json();
			}

			// Load cluster members
			const membersResponse = await fetch(`/api/codebase-index/clusters/${clusterId}/members`);
			if (membersResponse.ok) {
				const data = await membersResponse.json();
				members = data.members || [];
			}
		} catch (error) {
			console.error('Failed to load cluster data:', error);
		} finally {
			isLoading = false;
		}
	}

	async function copySuggestion() {
		if (cluster?.fix_suggestion) {
			await navigator.clipboard.writeText(cluster.fix_suggestion);
			copiedSuggestion = true;
			setTimeout(() => copiedSuggestion = false, 2000);
		}
	}

	async function applyFix() {
		// TODO: Implement auto-fix functionality
		console.log('Applying fix for cluster:', clusterId);
	}

	function getErrorCodeColor(code: string): string {
		if (code.startsWith('TS1')) return 'text-red-400 bg-red-500/20';
		if (code.startsWith('TS2')) return 'text-orange-400 bg-orange-500/20';
		if (code.startsWith('TS7')) return 'text-yellow-400 bg-yellow-500/20';
		return 'text-blue-400 bg-blue-500/20';
	}

	function getSurfaceColor(surface: string): string {
		const colors: Record<string, string> = {
			routes: 'bg-purple-500/20 text-purple-300',
			components: 'bg-blue-500/20 text-blue-300',
			stores: 'bg-green-500/20 text-green-300',
			services: 'bg-orange-500/20 text-orange-300',
			api: 'bg-cyan-500/20 text-cyan-300',
			evidence: 'bg-red-500/20 text-red-300',
			admin: 'bg-yellow-500/20 text-yellow-300',
			ui: 'bg-pink-500/20 text-pink-300'
		};
		return colors[surface] || 'bg-gray-500/20 text-gray-300';
	}

	function formatFilePath(path: string): string {
		const parts = path.split('/');
		if (parts.length > 4) {
			return `.../${parts.slice(-3).join('/')}`;
		}
		return path;
	}
</script>

<svelte:head>
	<title>{cluster?.name || 'Cluster'} - Codebase Intelligence</title>
</svelte:head>

<div class="cluster-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<a href="/command-center/codebase" class="back-link">
				<ArrowLeft class="h-4 w-4" />
				Back to Dashboard
			</a>
			{#if cluster}
				<h1 class="page-title">
					<Layers class="h-6 w-6 text-purple-400" />
					{cluster.name}
				</h1>
				<p class="page-subtitle">
					{cluster.member_count} errors · {cluster.dominant_code}
				</p>
			{:else}
				<h1 class="page-title">
					<Layers class="h-6 w-6" />
					Loading Cluster...
				</h1>
			{/if}
		</div>
		<div class="header-actions">
			<Button variant="outline" onclick={loadClusterData} disabled={isLoading}>
				<RefreshCw class={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
				Refresh
			</Button>
		</div>
	</header>

	{#if isLoading}
		<div class="loading-state">
			<RefreshCw class="h-8 w-8 animate-spin text-cyan-400" />
			<p>Loading cluster details...</p>
		</div>
	{:else if !cluster}
		<div class="empty-state">
			<AlertTriangle class="h-12 w-12 text-yellow-400" />
			<h3>Cluster Not Found</h3>
			<p>The requested cluster could not be found.</p>
			<a href="/command-center/codebase" class="back-button">
				Return to Dashboard
			</a>
		</div>
	{:else}
		<div class="cluster-content">
			<!-- Overview Cards -->
			<div class="overview-grid">
				<Card class="overview-card">
					<CardHeader class="pb-2">
						<CardTitle class="text-sm flex items-center">
							<Code class="h-4 w-4 mr-2 text-orange-400" />
							Dominant Error
						</CardTitle>
					</CardHeader>
					<CardContent>
						<span class={`error-code-large ${getErrorCodeColor(cluster.dominant_code)}`}>
							{cluster.dominant_code}
						</span>
					</CardContent>
				</Card>

				<Card class="overview-card">
					<CardHeader class="pb-2">
						<CardTitle class="text-sm flex items-center">
							<AlertTriangle class="h-4 w-4 mr-2 text-red-400" />
							Error Count
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="metric-value">{cluster.member_count}</div>
					</CardContent>
				</Card>

				<Card class="overview-card">
					<CardHeader class="pb-2">
						<CardTitle class="text-sm flex items-center">
							<FileCode class="h-4 w-4 mr-2 text-cyan-400" />
							Affected Files
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="metric-value">{cluster.top_files.length}</div>
					</CardContent>
				</Card>
			</div>

			<!-- Fix Suggestion -->
			<Card class="suggestion-card">
				<CardHeader>
					<CardTitle class="flex items-center justify-between">
						<span class="flex items-center">
							<Lightbulb class="h-5 w-5 mr-2 text-yellow-400" />
							AI Fix Suggestion
						</span>
						<div class="suggestion-actions">
							<Button variant="outline" size="sm" onclick={copySuggestion}>
								{#if copiedSuggestion}
									<CheckCircle class="h-4 w-4 mr-2 text-green-400" />
									Copied!
								{:else}
									<Copy class="h-4 w-4 mr-2" />
									Copy
								{/if}
							</Button>
							<Button size="sm" onclick={applyFix}>
								<Zap class="h-4 w-4 mr-2" />
								Apply Fix
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="suggestion-text">{cluster.fix_suggestion}</p>
				</CardContent>
			</Card>

			<!-- Tags -->
			<Card class="tags-card">
				<CardHeader>
					<CardTitle class="text-sm">Surface Areas & Technologies</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="tags-container">
						<div class="tag-group">
							<span class="tag-label">Surfaces:</span>
							{#each cluster.surface as surface}
								<span class={`tag ${getSurfaceColor(surface)}`}>{surface}</span>
							{/each}
						</div>
						<div class="tag-group">
							<span class="tag-label">Tech:</span>
							{#each cluster.tech as tech}
								<span class="tag bg-gray-500/20 text-gray-300">{tech}</span>
							{/each}
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Top Affected Files -->
			<Card class="files-card">
				<CardHeader>
					<CardTitle class="flex items-center">
						<FileCode class="h-5 w-5 mr-2" />
						Top Affected Files
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="files-list">
						{#each cluster.top_files.slice(0, 10) as filePath}
							<div class="file-item">
								<FileCode class="h-4 w-4 text-cyan-400" />
								<span class="file-path">{formatFilePath(filePath)}</span>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>

			<!-- Representative Errors -->
			<Card class="representative-card">
				<CardHeader>
					<CardTitle class="flex items-center">
						<Brain class="h-5 w-5 mr-2" />
						Representative Errors
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="representative-list">
						{#each cluster.representative_errors as error}
							<div class="representative-item">
								<AlertTriangle class="h-4 w-4 text-orange-400 flex-shrink-0" />
								<span class="error-text">{error}</span>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>

			<!-- Cluster Members -->
			<Card class="members-card">
				<CardHeader>
					<CardTitle class="flex items-center justify-between">
						<span class="flex items-center">
							<Layers class="h-5 w-5 mr-2" />
							All Errors in Cluster
						</span>
						<span class="member-count">{members.length} errors</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="members-list">
						{#each members as member}
							<div class="member-item">
								<div class="member-header">
									<span class={`badge ${getErrorCodeColor(member.errorCode)}`}>
										{member.errorCode}
									</span>
									<span class="member-location">
										{formatFilePath(member.filePath)}:{member.line}:{member.col}
									</span>
								</div>
								<p class="member-message">{member.message}</p>
							</div>
						{/each}
						{#if members.length === 0}
							<div class="empty-members">
								<p>No member errors loaded</p>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>

<style>
	.cluster-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: #00d4ff;
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: white;
	}

	.page-subtitle {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		color: white;
		margin: 0;
	}

	.back-button {
		margin-top: 1rem;
		color: #00d4ff;
		text-decoration: none;
	}

	.back-button:hover {
		text-decoration: underline;
	}

	.cluster-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.overview-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
	}

	.error-code-large {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.5rem;
		font-weight: 600;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		display: inline-block;
	}

	.metric-value {
		font-size: 2rem;
		font-weight: 700;
		color: white;
	}

	.suggestion-card {
		background: rgba(255, 200, 0, 0.05);
		border: 1px solid rgba(255, 200, 0, 0.2);
		border-radius: 12px;
	}

	.suggestion-actions {
		display: flex;
		gap: 0.5rem;
	}

	.suggestion-text {
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		line-height: 1.6;
	}

	.tags-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tags-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.tag-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		min-width: 60px;
	}

	.tag {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.files-card,
	.representative-card,
	.members-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.files-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
	}

	.file-path {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.representative-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.representative-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 6px;
	}

	.error-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.4;
	}

	.member-count {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.member-item {
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 6px;
	}

	.member-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.badge {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
	}

	.member-location {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.member-message {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
	}

	.empty-members {
		padding: 2rem;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 768px) {
		.overview-grid {
			grid-template-columns: 1fr;
		}

		.page-header {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>

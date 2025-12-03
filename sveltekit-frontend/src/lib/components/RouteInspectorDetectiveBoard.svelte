<script lang="ts">

	type RouteDetail = {
		path: string;
		kind: 'page' | 'layout' | 'endpoint';
		file: string;
		summary: string;
		category?: string;
		version?: string;
		requiredPackages?: string[];
		relatedRoutes?: string[];
		health?: 'green' | 'yellow' | 'red';
		errorCount?: number;
		lastErrorCode?: string | null;
		lastErrorMessage?: string | null;
	};

	type Phase72Status = {
		errorCount: number;
		lastError?: {
			code: string;
			message: string;
			count: number;
			lastSeen: string;
		};
	};

	type Phase82Status = {
		status: 'not_started' | 'in_progress' | 'complete';
		filesUpgraded: number;
		totalFiles: number;
		lastRun?: string;
	};

	// ✅ Props: bindable for two-way binding
	let { open = $bindable(false), route = $bindable<RouteDetail | null>(null), onclose = () => {} } = $props();

	let phase72Status = $state<Phase72Status>({ errorCount: 0 });
	let phase82Status = $state<Phase82Status>({
		status: 'not_started',
		filesUpgraded: 0,
		totalFiles: 0
	});

	let loading = $state(false);
	let actionInProgress = $state<string | null>(null);

	$effect(() => {
		if (open && route) {
			loadStatuses();
		}
	});

	async function loadStatuses() {
		if (!route) return;

		try {
			// Load Phase 72 errors
			const errRes = await fetch(`/api/phase72/errors?route=${encodeURIComponent(route.path)}`);
			if (errRes.ok) {
				const data = await errRes.json();
				phase72Status = {
					errorCount: data.errors?.length ?? 0,
					lastError: data.errors?.[0]
						? {
								code: data.errors[0].code,
								message: data.errors[0].message,
								count: data.errors[0].count ?? 1,
								lastSeen: data.errors[0].last_seen ?? 'unknown'
							}
						: undefined
				};
			}

			// Load Phase 82 status (mock for now)
			phase82Status = {
				status: 'not_started',
				filesUpgraded: 0,
				totalFiles: 1,
				lastRun: undefined
			};
		} catch (err) {
			console.error('Failed to load statuses:', err);
		}
	}

	async function visitPage() {
		if (!route) return;
		window.open(`http://127.0.0.1:5173${route.path}`, '_blank');
	}

	async function viewAstGraph() {
		if (!route) return;
		// This would open an AST visualization
		console.log('View AST Graph for', route.file);
	}

	async function askErrorBrain() {
		if (!route || !phase72Status.lastError) return;
		actionInProgress = 'error-brain';

		try {
			const res = await fetch('/api/phase72/suggest-fix', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					route: route.path,
					error_code: phase72Status.lastError.code,
					error_message: phase72Status.lastError.message
				})
			});

			if (res.ok) {
				const data = await res.json();
				console.log('Error Brain suggestion:', data);
				alert('Error Brain suggestion:\n\n' + (data.suggestion || 'No suggestion available'));
			}
		} catch (err) {
			console.error('Error Brain failed:', err);
		} finally {
			actionInProgress = null;
		}
	}

	async function runCodemod() {
		if (!route) return;
		actionInProgress = 'codemod';

		try {
			const res = await fetch('/api/phase82/upgrade-route', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ route: route.path })
			});

			const data = await res.json();

			if (data.ok) {
				console.log('Codemod succeeded:', data);
				alert(`✅ Svelte 5 upgrade complete for ${route.path}\n\nDuration: ${data.duration_ms}ms`);
				phase82Status.status = 'complete';
				phase82Status.filesUpgraded = phase82Status.totalFiles;
			} else {
				console.error('Codemod failed:', data);
				alert(`❌ Codemod failed:\n\n${data.stderr || data.error}`);
			}
		} catch (err) {
			console.error('Codemod error:', err);
			alert('Codemod failed: ' + String(err));
		} finally {
			actionInProgress = null;
		}
	}

	async function runHealthCheck() {
		if (!route) return;
		actionInProgress = 'health-check';

		try {
			const res = await fetch('/api/phase72/check-route', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ route: route.path })
			});

			const data = await res.json();
			console.log('Health check result:', data);
			alert('Health check complete. Check console for details.');
		} catch (err) {
			console.error('Health check failed:', err);
		} finally {
			actionInProgress = null;
		}
	}

	function getHealthColor(health?: string) {
		if (health === 'green') return '#1e8f3c';
		if (health === 'yellow') return '#f6b73c';
		if (health === 'red') return '#c41e3a';
		return '#999';
	}

	function getPhase82Badge() {
		if (phase82Status.status === 'complete') return '✅ COMPLETE';
		if (phase82Status.status === 'in_progress') return '⏳ IN PROGRESS';
		return '⭕ NOT STARTED';
	}
</script>

{#if open}
	<div
		class="detective-board-overlay"
		onclick={onclose}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="detective-board"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<header class="board-header">
				<div class="header-left">
					<span class="route-icon">🎮</span>
					<div class="header-title">
						<div class="route-path">{route?.path ?? '/'}</div>
						<div class="route-file">{route?.file ?? 'unknown'}</div>
					</div>
				</div>
				<div class="header-right">
					<span
						class="status-badge"
						style="background-color: {getHealthColor(route?.health)}"
					>
						{route?.health?.toUpperCase() ?? 'UNKNOWN'}
					</span>
					<span class="badge-tag">{route?.kind ?? 'page'}</span>
					<button class="close-btn" onclick={onclose}>✕</button>
				</div>
			</header>

			<!-- Body: 2-column layout -->
			<div class="board-body">
				<!-- Left: Route Dossier -->
				<section class="panel panel-left">
					<h3 class="section-label">SUMMARY</h3>
					<p class="summary-text">{route?.summary ?? 'No summary available'}</p>

					<h3 class="section-label">METADATA</h3>
					<div class="meta-grid">
						{#if route?.category}
							<div class="meta-item">
								<div class="meta-label">Category</div>
								<div class="meta-value">{route.category}</div>
							</div>
						{/if}
						{#if route?.version}
							<div class="meta-item">
								<div class="meta-label">Version</div>
								<div class="meta-value">{route.version}</div>
							</div>
						{/if}
					</div>

					{#if route?.requiredPackages && route.requiredPackages.length > 0}
						<h3 class="section-label">REQUIRED PACKAGES</h3>
						<div class="pill-row">
							{#each route.requiredPackages as pkg}
								<span class="pill">{pkg}</span>
							{/each}
						</div>
					{/if}

					{#if route?.relatedRoutes && route.relatedRoutes.length > 0}
						<h3 class="section-label">RELATED ROUTES</h3>
						<div class="pill-column">
							{#each route.relatedRoutes as relRoute}
								<button class="pill pill-ghost" onclick={() => console.log('Open', relRoute)}>
									{relRoute}
								</button>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Right: Diagnostics & Tools -->
				<section class="panel panel-right">
					<!-- Phase 72: Error Brain -->
					<h3 class="section-label">PHASE 72 · ERROR BRAIN</h3>
					{#if phase72Status.errorCount === 0}
						<div class="status-card status-clean">
							<div class="status-icon">✅</div>
							<div class="status-text">No errors detected</div>
						</div>
					{:else if phase72Status.lastError}
						<div class="status-card status-alert">
							<div class="status-line">
								<span class="badge badge-error">{phase72Status.lastError.code}</span>
								<span class="status-message">{phase72Status.lastError.message}</span>
							</div>
							<div class="status-meta">
								{phase72Status.lastError.count} hit{phase72Status.lastError.count === 1 ? '' : 's'}
								· last seen {phase72Status.lastError.lastSeen}
							</div>
							<button
								class="btn btn-neon"
								disabled={actionInProgress === 'error-brain'}
								onclick={askErrorBrain}
							>
								{actionInProgress === 'error-brain' ? '⏳ Asking...' : '🧠 Ask Error Brain'}
							</button>
						</div>
					{/if}

					<!-- Phase 82: Upgrade Brain -->
					<h3 class="section-label">PHASE 82 · UPGRADE BRAIN</h3>
					<div class="status-card status-upgrade">
						<div class="status-line">
							<span class="badge badge-upgrade">{getPhase82Badge()}</span>
						</div>
						<div class="status-meta">
							{phase82Status.filesUpgraded}/{phase82Status.totalFiles} files upgraded
						</div>
						<button
							class="btn btn-warning"
							disabled={actionInProgress === 'codemod'}
							onclick={runCodemod}
						>
							{actionInProgress === 'codemod' ? '⏳ Running...' : '🔄 Run Svelte 5 Codemod'}
						</button>
					</div>
				</section>
			</div>

			<!-- Footer: Action buttons -->
			<footer class="board-footer">
				<button class="btn btn-primary" onclick={visitPage}>
					→ Visit Page
				</button>
				<button class="btn btn-secondary" onclick={viewAstGraph}>
					📊 View AST Graph
				</button>
				<button
					class="btn btn-outline"
					disabled={actionInProgress === 'health-check'}
					onclick={runHealthCheck}
				>
					{actionInProgress === 'health-check' ? '⏳ Checking...' : '🏥 Route Health Check'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.detective-board-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(2px);
	}

	.detective-board {
		background: var(--yorha-bg, #f5f1e8);
		color: var(--yorha-ink, #111);
		font-family: var(--yorha-font, 'Courier New', monospace);
		border: 3px solid var(--yorha-ink, #111);
		border-radius: 0;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
		width: 90%;
		max-width: 900px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.board-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 2px solid var(--yorha-ink, #111);
		background: linear-gradient(135deg, var(--yorha-paper, #faf8f3) 0%, var(--yorha-bg, #f5f1e8) 100%);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.route-icon {
		font-size: 2rem;
	}

	.header-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.route-path {
		font-size: 1.3rem;
		font-weight: bold;
		color: var(--yorha-ink, #111);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.route-file {
		font-size: 0.75rem;
		color: #666;
		font-family: 'Courier New', monospace;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-badge {
		padding: 0.5rem 1rem;
		border-radius: 0;
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: white;
		border: 1px solid rgba(0, 0, 0, 0.2);
	}

	.badge-tag {
		padding: 0.5rem 0.75rem;
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-radius: 0;
	}

	.close-btn {
		background: none;
		border: 2px solid var(--yorha-ink, #111);
		color: var(--yorha-ink, #111);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		line-height: 1;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
	}

	.board-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		flex: 1;
		overflow-y: auto;
		border-bottom: 2px solid var(--yorha-ink, #111);
	}

	.panel {
		padding: 1.5rem;
		overflow-y: auto;
		border-right: 2px solid var(--yorha-ink, #111);
	}

	.panel-left {
		background: var(--yorha-paper, #faf8f3);
	}

	.panel-right {
		background: var(--yorha-bg-dark, #ede9de);
		border-right: none;
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--yorha-ink, #111);
		margin: 1rem 0 0.5rem 0;
		padding: 0;
		border-bottom: 1px solid var(--yorha-ink, #111);
		padding-bottom: 0.5rem;
	}

	.section-label:first-child {
		margin-top: 0;
	}

	.summary-text {
		font-size: 0.9rem;
		line-height: 1.5;
		color: #333;
		margin: 0.5rem 0 1rem 0;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.meta-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: #666;
	}

	.meta-value {
		font-size: 0.9rem;
		font-weight: bold;
		color: var(--yorha-ink, #111);
	}

	.pill-row,
	.pill-column {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.pill-column {
		flex-direction: column;
	}

	.pill {
		display: inline-block;
		padding: 0.4rem 0.8rem;
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
		font-size: 0.75rem;
		border-radius: 0;
		border: 1px solid var(--yorha-ink, #111);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.pill-ghost {
		background: transparent;
		color: var(--yorha-ink, #111);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pill-ghost:hover {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
	}

	.status-card {
		padding: 1rem;
		border: 1px solid var(--yorha-ink, #111);
		border-radius: 0;
		margin-bottom: 1rem;
		background: var(--yorha-paper, #faf8f3);
	}

	.status-clean {
		background: #e8f5e9;
		border-color: #1e8f3c;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-icon {
		font-size: 1.5rem;
	}

	.status-text {
		font-weight: bold;
		color: #1e8f3c;
	}

	.status-alert {
		background: #fff3e0;
		border-color: #c41e3a;
	}

	.status-upgrade {
		background: #e3f2fd;
		border-color: #1976d2;
	}

	.status-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.badge-error {
		background: #c41e3a;
		color: white;
		padding: 0.3rem 0.6rem;
		font-size: 0.7rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-radius: 0;
	}

	.badge-upgrade {
		background: #1976d2;
		color: white;
		padding: 0.3rem 0.6rem;
		font-size: 0.7rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-radius: 0;
	}

	.status-message {
		font-size: 0.9rem;
		color: var(--yorha-ink, #111);
		flex: 1;
	}

	.status-meta {
		font-size: 0.8rem;
		color: #666;
		margin-bottom: 0.75rem;
	}

	.board-footer {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 2px solid var(--yorha-ink, #111);
		background: var(--yorha-paper, #faf8f3);
		flex-wrap: wrap;
	}

	.btn {
		padding: 0.6rem 1.2rem;
		border: 2px solid var(--yorha-ink, #111);
		border-radius: 0;
		font-family: var(--yorha-font, 'Courier New', monospace);
		font-size: 0.85rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--yorha-paper, #faf8f3);
		color: var(--yorha-ink, #111);
	}

	.btn-secondary {
		background: transparent;
		color: var(--yorha-ink, #111);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
	}

	.btn-outline {
		background: transparent;
		color: var(--yorha-ink, #111);
		border-style: dashed;
	}

	.btn-outline:hover:not(:disabled) {
		background: var(--yorha-ink, #111);
		color: var(--yorha-paper, #faf8f3);
		border-style: solid;
	}

	.btn-neon {
		background: #00ff00;
		color: #000;
		border-color: #00ff00;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
	}

	.btn-neon:hover:not(:disabled) {
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.6);
	}

	.btn-warning {
		background: #f6b73c;
		color: #111;
		border-color: #f6b73c;
	}

	.btn-warning:hover:not(:disabled) {
		background: #e8a82e;
		border-color: #e8a82e;
	}

	@media (max-width: 768px) {
		.board-body {
			grid-template-columns: 1fr;
		}

		.panel {
			border-right: none;
			border-bottom: 2px solid var(--yorha-ink, #111);
		}

		.panel-right {
			border-bottom: none;
		}

		.board-footer {
			flex-direction: column;
		}

		.btn {
			flex: 1;
		}
	}
</style>

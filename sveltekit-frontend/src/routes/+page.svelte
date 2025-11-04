<script lang="ts">
import type { Case } from '$lib/types';
	// Replace broken named imports with safe namespace import + fallbacks
	import { browser } from '$app/environment';
	import { derived, writable } from 'svelte/store';
	import * as unified from '$lib/stores/unified';
  import LoginButton from '$lib/components/auth/LoginButton.svelte';
  import RegisterModal from '$lib/components/auth/RegisterModal.svelte';

	// Simple file uploader utility (bits-ui doesn't have createFileUploader)'
	function createFileUploader(url: string) {
		type UploadFile = { id: string, file: File, name: string, progress: number, error?: boolean };
		let events: Record<string, Function[]> = $state({}); // Use $state for reactivity
		let files = $state<UploadFile[]>([]); // Use $state for reactivity

		async function uploadImpl(file: File): Promise<any> {
			try {
				const formData = new FormData();
				formData.append('file', file);

				const response = await fetch(url, {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					throw new Error(`Upload failed: ${response.statusText}`);}

				const result = await response.json();
				events['success']?.forEach(fn => fn(result));
				return result;} catch (error) {
				events['error']?.forEach(fn => fn(error));
				throw error;}
		}

		return {
			// exposes a simple array the template can iterate over
			files,
			// Accept FileList or Array<File>, push metadata and start upload
      addFiles: (list: FileList | File[]) => {
				// ensure we get a File[] and let TS know it
				const arr = Array.from(list as FileList | File[]) as File[];
				arr.forEach((file) => {
					const id = browser && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; // Corrected crypto access
					const fileObj: UploadFile = { id, file, name: file.name, progress: 0 };
					files.push(fileObj); // Directly modify $state array
					// start upload and update progress (coarse)
					uploadImpl(file)
						.then(() => {
							fileObj.progress = 100;
							events['success']?.forEach(fn => fn(fileObj));})
						.catch(() => {
							fileObj.progress = 0;
							fileObj.error = true;
							events['error']?.forEach(fn => fn(fileObj));});});},
			upload: uploadImpl,
      on: (event: string, callback: Function) => {
        if (!events[event]) events[event] = [];
        events[event].push(callback);}
		};}

	// Create safe local stores that fall back if unified exports are missing
	const recommendations = (unified as unknown).recommendations ?? writable<any[]>([]); // Corrected 'as unknown'
	const partialRecommendations = (unified as unknown).partialRecommendations ?? writable<any[]>([]); // Corrected 'as unknown'
	const engineState = (unified as unknown).engineState ?? writable<'idle' | 'processing' | 'success' | 'failure'>('idle'); // Corrected 'as unknown'
	const errorMessage = (unified as unknown).errorMessage ?? writable<string>(''); // Corrected 'as unknown'
	const runQuery = (unified as unknown).runQuery ?? (async (_q: string) => { // Corrected 'as unknown'
		console.warn('runQuery stub called - unified.runQuery not available');});

	// Use svelte/store derived and coerce values into arrays to avoid type errors
	let displayRecommendations = derived(
		[recommendations, partialRecommendations, engineState],
		([$recs, $partial, $state]) => {
			// cast to unknown before accessing .items to satisfy TS
			const recsArr = Array.isArray($recs) ? $recs : (($recs as { items?: any[] })?.items ?? []); // Corrected 'as unknown' and type assertion
			const partialArr = Array.isArray($partial) ? $partial : (($partial as { items?: any[] })?.items ?? []); // Corrected 'as unknown' and type assertion
			// show streaming partials while processing, otherwise final recommendations
			if ($state === 'processing' && partialArr.length) return partialArr;
			return recsArr.length ? recsArr : partialArr;}
	);

	// --- Add missing reactive state used by the template / health checks ---
	let systemStatus: Record<string, string> = {
		database: 'checking',
		redis: 'checking',
		ollama: 'checking',
		gpu: 'checking',
		workers: 'checking'
	};
  let workerDetails = {
		ocr: { status: 'checking', healthy: false, queueDepth: 0, processedJobs: 0 },
		embedding: { status: 'checking', healthy: false, queueDepth: 0, processedJobs: 0 },
		autotag: { status: 'checking', healthy: false, queueDepth: 0, processedJobs: 0 }
	};
  let stats = $state({ totalCases: 0, totalEvidence: 0, processingJobs: 0 });
  let loading = $state<boolean>(true);
	let userQuery = $state<string>('');
	let registerOpen = $state<boolean>(false);
  // ---------------------------------------------------------------

  function openRegister() {
    registerOpen = true;}

	// Check system health on mount
	$effect(() => {
		if (browser) {
			checkSystemHealth();
			const interval = setInterval(checkSystemHealth, 30000); // Check every 30s
			return () => clearInterval(interval);}
	});
  async function checkSystemHealth(): Promise<any> {
		try {
			// Check database
			const dbCheck = await fetch('/api/health/database').catch(() => ({ ok: false }));
			systemStatus.database = dbCheck.ok ? 'online' : 'offline';

			// Check Redis
			const redisCheck = await fetch('/api/health/redis').catch(() => ({ ok: false }));
			systemStatus.redis = redisCheck.ok ? 'online' : 'offline';

			// Check Ollama
			const ollamaCheck = await fetch('/api/health/ollama').catch(() => ({ ok: false }));
			systemStatus.ollama = ollamaCheck.ok ? 'online' : 'offline';

			// Check GPU
			const gpuCheck = await fetch('/api/health/gpu').catch(() => ({ ok: false }));
			systemStatus.gpu = gpuCheck.ok ? 'online' : 'offline';

			// Check Workers (NEW)
			const workersCheck = await fetch('/api/health/workers').catch(() => null);
			if (workersCheck?.ok) {
				const workersData = await workersCheck.json();
				systemStatus.workers =
					workersData.success && workersData.status === 'online'
						? 'online'
						: workersData.status === 'degraded'
							? 'degraded'
							: 'offline';

				// Update worker details safely
				if (workersData.workers && Array.isArray(workersData.workers)) {
					workersData.workers.forEach((worker: unknown) => {
						const name = String((worker as { name?: string }).name || '').toLowerCase(); // Type assertion for worker
						if (name.includes('ocr')) {
							workerDetails.ocr = {
								status: (worker as { status?: string }).status ?? 'offline',
								healthy: !!(worker as { healthy?: boolean }).healthy,
								queueDepth: (worker as { queueDepth?: number }).queueDepth || 0,
								processedJobs: (worker as { processedJobs?: number }).processedJobs || 0
							};} else if (name.includes('embed') || name.includes('embedding')) {
							workerDetails.embedding = {
								status: (worker as { status?: string }).status ?? 'offline',
								healthy: !!(worker as { healthy?: boolean }).healthy,
								queueDepth: (worker as { queueDepth?: number }).queueDepth || 0,
								processedJobs: (worker as { processedJobs?: number }).processedJobs || 0
							};} else if (name.includes('autotag')) {
							workerDetails.autotag = {
								status: (worker as { status?: string }).status ?? 'offline',
								healthy: !!(worker as { healthy?: boolean }).healthy,
								queueDepth: (worker as { queueDepth?: number }).queueDepth || 0,
								processedJobs: (worker as { processedJobs?: number }).processedJobs || 0
							};}
					});}
			} else {
				systemStatus.workers = 'offline';}

			// Get stats
			const statsResponse = await fetch('/api/dashboard/stats').catch(() => null);
			if (statsResponse?.ok) {
				const data = await statsResponse.json();
				if (data.success) {
					stats.totalCases = data.data.totalCases || 0;
					stats.totalEvidence = data.data.totalEvidence || 0;
					stats.processingJobs = data.data.activeJobs || 0;}
			}

			loading = false;} catch (err) {
			console.error('Health check error:', err);
			loading = false;}
	}
  function getStatusColor(status: string) {
		switch (status) {
			case 'online': // Removed comma
				return 'is-success'; // NES.css success color
			case 'offline': // Removed comma
				return 'is-error'; // NES.css error color
			case 'degraded': // Removed comma
				return 'is-warning'; // NES.css warning color
			default: return 'is-disabled'; // NES.css disabled/default color
		}
	}
  function getStatusIcon(status: string) {
		switch (status) {
			case 'online': // Removed comma
				return '✅';
			case 'offline': // Removed comma
				return '❌';
			case 'degraded': // Removed comma
				return '⚠️'; // Changed for degraded status
			default: return '🕒';}
	}

	const handleSubmit = async () => {
		if (userQuery.trim()) await runQuery(userQuery.trim());};

	// nice keyboard shortcut
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Enter') handleSubmit();};

	// lightweight HTML escape helper to avoid XSS for simple content (use sanitizer for richer content)
  function escapeHtml(str: string) {
    const s = String(str ?? '');
    const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;' // Corrected string literal
		};
		return s.replace(/[&<>"']/g, (m) => map[m as keyof typeof map]);
	}

  const uploader = createFileUploader('/api/upload');

  // annotate parameter to avoid implicit: unknown
  uploader.on('success', (res: unknown) => {
    console.log('Uploaded:', (res as { url?: string })?.url ?? res);}); // Type assertion for res
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
/* @unocss-include */
  /*
    NES.css provides a strong retro aesthetic.
    Custom styles are kept minimal, primarily for specific gradients, shadows,
    and layout adjustments not directly covered by NES.css, or to override
    NES.css defaults for a more specific: "YoRHa" feel.
  */

  .home-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background-color: #212529; /* Dark background for NES.css theme */
  }

  .auth-buttons-flex {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: center; /* Added semicolon */
  }

  /* Custom overrides for NES.css containers to match original gradients/shadows */
  .nes-container.hero-section-custom {
    text-align: center;
    margin-bottom: 3rem;
    padding: 3rem 1rem; /* Added semicolon */
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 255, 65, 0.05) 100%);
    border: 2px solid rgba(255, 215, 0, 0.3);
  }

  .hero-section-custom .nes-text.is-primary {
    font-size: 3rem; /* Added semicolon */
    color: #ffd700; /* Override NES.css primary color */;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    font-weight: 800;
  }

  .hero-section-custom .nes-text.is-success.subtitle-custom {
    font-size: 1.4rem;
    color: #00ff41; /* Override NES.css success color */;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .hero-section-custom .nes-text.is-disabled.tech-stack-custom {
    font-size: 0.95rem; /* Added semicolon */
    color: #888; /* Override NES.css disabled color */;
    font-family: 'JetBrains Mono', monospace;
  }

  .status-section-custom,
  .worker-details-custom,
  .stats-section-custom,
  .features-section-custom,
  .quick-actions-custom {
    margin-bottom: 3rem;
  }

  .status-grid-custom {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
  }

  .status-item-custom {
    display: flex;
    justify-content: space-between; /* Corrected typo */
    align-items: center;
    padding: 1rem;
  }

  .status-label-custom {
    font-weight: 600;
  }

  .workers-grid-custom {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .worker-card-custom {
    padding: 1.5rem;
  }

  .worker-header-custom {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #333; /* Custom border */
  }

  .worker-icon-custom {
    font-size: 1.5rem;
  }

  .worker-stats-custom p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }

  .worker-tech-custom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tech-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem; /* Added semicolon */
    background: rgba(168, 85, 247, 0.2);
    border: 1px solid #a855f7;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #a855f7;
    font-weight: 600;
  }

  .quick-stats-custom {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card-custom {
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem; /* Added semicolon */
    transition: all 0.3s ease;
  }

  .stat-card-custom:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
  }

  .stat-icon-custom {
    font-size: 3rem; /* Added semicolon */
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5)); /* Corrected comma */
  }

  .stat-content-custom h3 {
    margin: 0 0 0.5rem 0; /* Corrected comma */
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .stat-value-custom {
    font-size: 2rem;
    font-weight: bold; /* Added semicolon */
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
  }

  .action-grid-custom {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .action-card-custom {
    padding: 2rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column; /* Added semicolon */
    gap: 1rem;
  }

  .action-card-custom:hover {
    border-color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
  }

  .action-card-custom::before { /* Corrected pseudo-element syntax */
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px; /* Added semicolon */
    background: linear-gradient(90deg, #ffd700, #00ff41);
    opacity: 0;
    transition: opacity 0.3s ease; /* Added semicolon */
  }

  .card-icon-custom {
    font-size: 3rem; /* Added semicolon */
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.5)); /* Corrected comma */
  }

  .card-button-custom {
    display: inline-block;
    padding: 0.5rem 1rem;
    font-weight: 700;
    border-radius: 6px;
    transition: all 0.3s ease;
    margin-top: 0.5rem; /* Added semicolon */
  }

  .featured-section-custom {
    margin-bottom: 3rem;
  }

  .featured-card-custom {
    position: relative;
    display: block;
    padding: 3rem; /* Added semicolon */
    background: linear-gradient(135deg, rgba(0, 255, 65, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
    border: 3px solid #00ff41;
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .featured-card-custom::before { /* Corrected pseudo-element syntax */
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px; /* Added semicolon */
    background: linear-gradient(90deg, #00ff41, #ffd700, #00ff41);
    background-size: 200% 100%;
    animation: shimmer 3s linear infinite; /* Added semicolon */
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0; /* Added semicolon */
    }
    100% {
      background-position: 200% 0; /* Added semicolon */
    }
  }

  .featured-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem; /* Added semicolon */
    background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%);
    color: #000;
    font-weight: 900;
    font-size: 0.75rem;
    border-radius: 20px;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1; /* Added semicolon */
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9; /* Added semicolon */
    }
  }

  .featured-icon-custom {
    font-size: 4rem;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
  }

  .featured-card-custom .nes-text.is-success {
    font-size: 2rem; /* Added semicolon */
    color: #00ff41;
    margin-bottom: 1rem;
    text-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
  }

  .featured-card-custom .nes-text.is-white.featured-description-custom {
    font-size: 1.1rem;
    color: #b0b0b0;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .featured-tech-custom {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .featured-button-custom {
    display: inline-block;
    padding: 1rem 2rem;
    font-weight: 900;
    font-size: 1.2rem;
    border-radius: 8px; /* Added semicolon */
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 255, 65, 0.3);
  }

  .featured-card-custom:hover .featured-button-custom {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); /* Custom hover gradient */;
    box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5);
    transform: scale(1.05);
  }

  /* AI Query Section */
  .ai-query-section-custom {
    margin-top: 3rem;
  }

  .query-box {
    display: flex;
    gap: 0.5rem;
  }

  input[type='text'] {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border-radius: 0.6rem;
    border: 1px solid #e6e6ea;
    font-size: 1rem;
  }

  button {
    padding: 0.6rem 0.9rem;
    border-radius: 0.6rem;
    background: #2b6cb0;
    color: white;
    border: none;
    cursor: pointer;
  }

  .status {
    margin-top: 0.5rem;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .recommendation-cards {
    margin-top: 1rem;
    display: grid;
    gap: 0.6rem;
  }

  .card {
    background: #ffffff;
    border-radius: 12px; /* Added semicolon */
    padding: 1rem;
    box-shadow: 0 6px 18px rgba(13, 38, 59, 0.06);
    transition: transform 200ms ease, opacity 200ms ease;
    overflow: hidden;
  }

  .card.streaming {
    opacity: 0.95;
    animation: pulse 1.2s infinite alternate; /* Added semicolon */
    border: 1px dashed rgba(43, 108, 176, 0.12);
  }

  .card.dym {
    color: #ff6600;
    border-left: 4px solid #ff9a3c; /* Added semicolon */
    background: linear-gradient(90deg, #fffaf5, #fff);
  }

  @keyframes pulse {
    from {
      transform: translateY(0); /* Added semicolon */
    }
    to {
      transform: translateY(-3px); /* Added semicolon */
    }
  }

  .meta {
    font-size: 0.85rem;
    color: #6b7280;
    margin-top: 0.5rem;
    display: flex; /* Added semicolon */
    gap: 1rem;
    align-items: center;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .hero-section-custom .nes-text.is-primary {
      font-size: 2rem;
    }

    .hero-section-custom .nes-text.is-success.subtitle-custom {
      font-size: 1.1rem;
    }

    .action-grid-custom {
      grid-template-columns: 1fr;
    }

    .quick-stats-custom {
      grid-template-columns: 1fr;
    }

    .action-buttons-custom {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>

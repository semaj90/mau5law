<script lang="ts">
</script>
	import { onMount } from 'svelte';
	import ParallaxDynamic from '$lib/utils/parallaxDynamic.js';
	import '../../../lib/components/yorha/ps1.css';
	
	let parallaxController = null;
	let performanceStats = {
		fps: 0,
		memory: 0,
		gpu: 'Unknown',
		webgpuSupported: false
	};
	
	// Feature flags with runtime detection
	let featureFlags = {
		'PS1 FX': { enabled: true, experimental: false, description: 'Enhanced PS1 visual effects' },
		'3D Hybrid': { enabled: false, experimental: true, description: 'NES × YoRHa 3D hybrid rendering' },
		'Subsample AA': { enabled: true, experimental: false, description: 'Subsampling anti-aliasing' },
		'Dynamic Parallax': { enabled: true, experimental: false, description: 'Mouse/gyroscope parallax' },
		'Anisotropic Sim': { enabled: false, experimental: true, description: 'Anisotropic filtering simulation' },
		'WebGPU Accel': { enabled: false, experimental: true, description: 'WebGPU hardware acceleration' }
	};
	
	// LOD system
	let lodLevel = 'medium'; // auto-detected
	let lodStats = {
		autoDetected: true,
		reason: 'Device capabilities',
		deviceMemory: navigator.deviceMemory || 4,
		deviceCores: navigator.hardwareConcurrency || 4
	};
	
	// Runtime badges
	let runtimeBadges = [];
	
	onMount(async () => {
		await detectCapabilities();
		await initializeParallax();
		updateFeatureFlags();
		startPerformanceMonitoring();
		generateRuntimeBadges();
		
		// Set LOD on HTML element
		document.documentElement.setAttribute('data-hybrid-lod', lodLevel);
	});
	
	async function detectCapabilities() {
		// WebGPU detection
		if (navigator.gpu) {
			try {
				const adapter = await navigator.gpu.requestAdapter();
				if (adapter) {
					performanceStats.webgpuSupported = true;
					performanceStats.gpu = adapter.info?.description || 'WebGPU Capable';
					featureFlags['WebGPU Accel'].enabled = true;
				}
			} catch (error) {
				console.warn('WebGPU detection failed:', error);
			}
		}
		
		// Memory detection for auto-LOD
		const memory = lodStats.deviceMemory;
		const cores = lodStats.deviceCores;
		
		if (memory >= 8 && cores >= 8) {
			lodLevel = 'high';
			lodStats.reason = `High-end device (${memory}GB RAM, ${cores} cores)`;
		} else if (memory >= 4 && cores >= 4) {
			lodLevel = 'medium';
			lodStats.reason = `Mid-range device (${memory}GB RAM, ${cores} cores)`;
		} else {
			lodLevel = 'low';
			lodStats.reason = `Low-end device (${memory}GB RAM, ${cores} cores)`;
		}
		
		performanceStats.memory = memory;
		
		console.log(`🎯 Auto-detected LOD: ${lodLevel} - ${lodStats.reason}`);
	}
	
	async function initializeParallax() {
		parallaxController = new ParallaxDynamic({
			enableWebGPU: featureFlags['WebGPU Accel'].enabled,
			performanceMode: lodLevel,
			mouseSensitivity: 0.02,
			gyroSensitivity: 0.5,
			maxOffset: 100,
			enableAutoRotate: true,
			autoRotateSpeed: 0.001
		});
		
		// Add parallax layers
		parallaxController.addLayer('[data-parallax="background"]', { 
			depth: 0.1, 
			id: 'background' 
		});
		parallaxController.addLayer('[data-parallax="midground"]', { 
			depth: 0.3, 
			id: 'midground' 
		});
		parallaxController.addLayer('[data-parallax="foreground"]', { 
			depth: 0.6, 
			id: 'foreground' 
		});
		
		// Performance callback
		parallaxController.onPerformanceChange((stats) => {
			performanceStats.fps = stats.fps;
			
			// Auto-adjust quality based on performance
			if (stats.fps < 30 && lodLevel === 'high') {
				setLOD('medium');
				addRuntimeBadge('Performance', 'Downgraded to medium quality due to low FPS', 'warning');
			}
		});
		
		parallaxController.start();
	}
	
	function updateFeatureFlags() {
		const root = document.documentElement;
		
		// Apply feature flag classes
		Object.entries(featureFlags).forEach(([name, flag]) => {
			const className = `fx-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
			if (flag.enabled) {
				root.classList.add(className);
			} else {
				root.classList.remove(className);
			}
		});
		
		console.log('🎛️ Feature flags updated:', featureFlags);
	}
	
	function toggleFeatureFlag(flagName) {
		featureFlags[flagName].enabled = !featureFlags[flagName].enabled;
		updateFeatureFlags();
		
		// Special handling for WebGPU
		if (flagName === 'WebGPU Accel' && parallaxController) {
			parallaxController.setConfig({ 
				enableWebGPU: featureFlags[flagName].enabled 
			});
		}
		
		addRuntimeBadge('Feature Toggle', `${flagName}: ${featureFlags[flagName].enabled ? 'ON' : 'OFF'}`, 'info');
	}
	
	function setLOD(level) {
		lodLevel = level;
		lodStats.autoDetected = false;
		lodStats.reason = 'Manual override';
		
		document.documentElement.setAttribute('data-hybrid-lod', level);
		
		if (parallaxController) {
			parallaxController.setPerformanceMode(level);
		}
		
		addRuntimeBadge('LOD Change', `Quality set to ${level}`, 'info');
		console.log(`🎯 LOD manually set to: ${level}`);
	}
	
	function startPerformanceMonitoring() {
		setInterval(() => {
			// Basic performance monitoring
			if (performance.memory) {
				performanceStats.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
			}
			
			// Check if page is hidden (Page Visibility API)
			if (document.hidden && parallaxController) {
				parallaxController.pause();
			} else if (!document.hidden && parallaxController && !parallaxController.isActive) {
				parallaxController.resume();
			}
		}, 1000);
	}
	
	function generateRuntimeBadges() {
		runtimeBadges = [
			{
				type: 'system',
				label: 'LOD',
				value: lodLevel.toUpperCase(),
				status: lodLevel === 'high' ? 'good' : lodLevel === 'medium' ? 'warning' : 'error'
			},
			{
				type: 'system',
				label: 'WebGPU',
				value: performanceStats.webgpuSupported ? 'YES' : 'NO',
				status: performanceStats.webgpuSupported ? 'good' : 'warning'
			},
			{
				type: 'system',
				label: 'Memory',
				value: `${performanceStats.memory}GB`,
				status: performanceStats.memory >= 8 ? 'good' : performanceStats.memory >= 4 ? 'warning' : 'error'
			},
			{
				type: 'system',
				label: 'GPU',
				value: performanceStats.gpu.split(' ')[0] || 'Unknown',
				status: performanceStats.webgpuSupported ? 'good' : 'neutral'
			}
		];
	}
	
	function addRuntimeBadge(category, message, status) {
		const badge = {
			type: 'runtime',
			label: category,
			value: message,
			status: status,
			timestamp: Date.now()
		};
		
		runtimeBadges = [badge, ...runtimeBadges.slice(0, 9)]; // Keep last 10
	}
	
	async function initializeEffect(effectName) {
		addRuntimeBadge('Init', `Initializing ${effectName}...`, 'info');
		
		// Simulate initialization delay
		await new Promise(resolve => setTimeout(resolve, 500);
		switch (effectName) {
			case 'webgpu':
				featureFlags['WebGPU Accel'].enabled = true;
				break;
			case 'parallax':
				featureFlags['Dynamic Parallax'].enabled = true;
				if (parallaxController) {
					parallaxController.resume();
				}
				break;
			case '3d-hybrid':
				featureFlags['3D Hybrid'].enabled = true;
				break;
		}
		
		updateFeatureFlags();
		addRuntimeBadge('Init', `${effectName} initialized successfully`, 'good');
	}
	
	// GPU metrics integration (connects to SvelteKit + Go backend)
	async function sendGPUMetrics() {
		const metrics = {
			gpu_model: performanceStats.gpu,
			memory_usage: performanceStats.memory || 0,
			fps: performanceStats.fps || 0,
			lod_level: lodLevel,
			features_enabled: Object.keys(featureFlags).filter(key => featureFlags[key].enabled),
			timestamp: Date.now(),
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight
			},
			device_info: {
				memory: lodStats.deviceMemory,
				cores: lodStats.deviceCores,
				platform: navigator.platform || 'Unknown'
			}
		};
		
		try {
			const response = await fetch('/api/metrics/gpu', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(metrics)
			});
			
			if (response.ok) {
				const result = await response.json();
				addRuntimeBadge('Metrics', `Sent to backend (${result.metrics_id?.slice(-6) || 'OK'})`, 'good');
				
				// Apply recommendations if provided
				if (result.recommendations?.length > 0) {
					result.recommendations.forEach(rec => {
						addRuntimeBadge('Recommendation', rec, 'info');
					});
				}
			} else {
				addRuntimeBadge('Metrics', 'Failed to send to backend', 'error');
			}
		} catch (error) {
			console.warn('Failed to send GPU metrics:', error);
			addRuntimeBadge('Metrics', 'Connection error', 'error');
		}
	}
	
	// Auto-send metrics on significant performance changes
	function autoSendMetrics() {
		if (performanceStats.fps > 0) {
			sendGPUMetrics();
		}
	}
	
	// Send metrics every 30 seconds if performance is being tracked
	setInterval(() => {
		if (performanceStats.fps > 0) {
			autoSendMetrics();
		}
	}, 30000);
</script>

<svelte:head>
	<title>PS1 Advanced Effects Demo - WebGPU & Dynamic Parallax</title>
</svelte:head>

<main class="ps1-root ps1-scene" class:ps1-aa-soft={featureFlags['Subsample AA'].enabled}>
	<div class="demo-header ps1-scanlines">
		<h1 class="ps1-text-glow">🎮 PS1 Advanced Effects Demo</h1>
		<p class="ps1-subtitle">WebGPU acceleration, dynamic parallax, and feature flags system</p>
	</div>
	
	<!-- Runtime Status Badges -->
	<div class="status-badges">
		{#each runtimeBadges as badge}
			<div class="status-badge status-{badge.status}" title="{badge.label}: {badge.value}">
				<span class="badge-label">{badge.label}</span>
				<span class="badge-value">{badge.value}</span>
			</div>
		{/each}
	</div>
	
	<!-- Feature Flags Panel -->
	<div class="feature-panel ps1-border">
		<h3>🚩 Runtime Feature Flags</h3>
		
		<div class="feature-grid">
			{#each Object.entries(featureFlags) as [name, flag]}
				<label class="feature-flag ps1-checkbox" class:experimental={flag.experimental}>
					<input 
						type="checkbox" 
						bind:checked={flag.enabled}
						onchange={() => toggleFeatureFlag(name)}
					>
					<span class="flag-name">{name}</span>
					{#if flag.experimental}
						<span class="experimental-badge">EXP</span>
					{/if}
				</label>
			{/each}
		</div>
	</div>
	
	<!-- LOD Control Panel -->
	<div class="lod-panel ps1-panel">
		<h3>🎯 Level of Detail (LOD)</h3>
		
		<div class="lod-info">
			<div class="lod-current">Current: <strong>{lodLevel.toUpperCase()}</strong></div>
			<div class="lod-reason">{lodStats.reason}</div>
			{#if lodStats.autoDetected}
				<div class="lod-auto">Auto-detected based on device capabilities</div>
			{/if}
		</div>
		
		<div class="lod-controls">
			<button class="ps1-button" class:active={lodLevel === 'low'} onclick={() => setLOD('low')}>
				Low
			</button>
			<button class="ps1-button" class:active={lodLevel === 'medium'} onclick={() => setLOD('medium')}>
				Medium
			</button>
			<button class="ps1-button" class:active={lodLevel === 'high'} onclick={() => setLOD('high')}>
				High
			</button>
		</div>
	</div>
	
	<!-- Initialization Controls -->
	<div class="init-panel ps1-panel">
		<h3>⚡ Initialize Effects</h3>
		
		<div class="init-buttons">
			<button class="ps1-button" onclick={() => initializeEffect('webgpu')}>
				🚀 WebGPU
			</button>
			<button class="ps1-button" onclick={() => initializeEffect('parallax')}>
				🌊 Parallax
			</button>
			<button class="ps1-button" onclick={() => initializeEffect('3d-hybrid')}>
				🎭 3D Hybrid
			</button>
			<button class="ps1-button" onclick={sendGPUMetrics}>
				📊 Send Metrics
			</button>
		</div>
	</div>
	
	<!-- Demo Viewport with Parallax Layers -->
	<div class="demo-viewport ps1-3d-scene">
		<!-- Background Layer -->
		<div class="parallax-layer" data-parallax="background">
			<div class="nes-pattern">
				{#each Array(50) as _, i}
					<div class="nes-pixel" style="
						left: {Math.random() * 100}%; 
						top: {Math.random() * 100}%;
						animation-delay: {Math.random() * 3}s;
					"></div>
				{/each}
			</div>
		</div>
		
		<!-- Midground Layer -->
		<div class="parallax-layer" data-parallax="midground">
			<div class="yorha-elements">
				{#each Array(8) as _, i}
					<div class="yorha-fragment ps1-wireframe" style="
						left: {10 + i * 12}%; 
						top: {30 + (i % 3) * 20}%;
						animation-delay: {i * 0.5}s;
					">
						{String.fromCharCode(65 + i)}
					</div>
				{/each}
			</div>
		</div>
		
		<!-- Foreground Layer -->
		<div class="parallax-layer" data-parallax="foreground">
			<div class="hybrid-hud ps1-hud">
				<div class="hud-corner top-left">
					<div class="scanner-line"></div>
					<div class="fps-counter">FPS: {performanceStats.fps}</div>
				</div>
				
				<div class="hud-corner top-right">
					<div class="system-info">
						<div>LOD: {lodLevel.toUpperCase()}</div>
						<div>GPU: {performanceStats.webgpuSupported ? 'ON' : 'OFF'}</div>
					</div>
				</div>
				
				<div class="hud-corner bottom-left">
					<div class="crosshair"></div>
				</div>
				
				<div class="hud-corner bottom-right">
					<div class="status-indicator" class:active={featureFlags['Dynamic Parallax'].enabled}>
						PARALLAX {featureFlags['Dynamic Parallax'].enabled ? 'ACTIVE' : 'INACTIVE'}
					</div>
				</div>
			</div>
		</div>
		
		<!-- Central Performance Monitor -->
		<div class="performance-monitor ps1-terminal">
			<h4>📈 Real-time Performance</h4>
			<div class="perf-grid">
				<div class="perf-item">
					<span class="perf-label">FPS:</span>
					<span class="perf-value" class:low={performanceStats.fps < 30}>{performanceStats.fps}</span>
				</div>
				<div class="perf-item">
					<span class="perf-label">Memory:</span>
					<span class="perf-value">{performanceStats.memory}MB</span>
				</div>
				<div class="perf-item">
					<span class="perf-label">Parallax:</span>
					<span class="perf-value">{parallaxController?.layers.length || 0} layers</span>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Technical Information -->
	<div class="tech-info ps1-terminal">
		<h4>🧠 Advanced PS1 Effects System</h4>
		<p>This demo showcases modern web technologies with retro PS1 aesthetics:</p>
		
		<h5>🎮 Feature Integration:</h5>
		<ul>
			<li><strong>Dynamic LOD:</strong> Automatic quality scaling based on device memory and CPU cores</li>
			<li><strong>WebGPU Acceleration:</strong> Hardware-accelerated compute shaders for complex effects</li>
			<li><strong>Runtime Feature Flags:</strong> Toggle experimental effects in real-time</li>
			<li><strong>Parallax Engine:</strong> Multi-layer depth with gyroscope and mouse input</li>
			<li><strong>Performance Monitoring:</strong> Real-time FPS and memory tracking with backend integration</li>
		</ul>
		
		<h5>⚡ Performance Features:</h5>
		<ul>
			<li><strong>Page Visibility API:</strong> Auto-pause effects when tab is hidden</li>
			<li><strong>Device Memory API:</strong> Automatic quality detection</li>
			<li><strong>prefers-reduced-motion:</strong> Respect user accessibility preferences</li>
			<li><strong>Hardware Acceleration:</strong> CSS transforms with GPU compositing</li>
		</ul>
		
		<div class="device-capabilities">
			<h5>📱 Detected Capabilities:</h5>
			<div class="capability-grid">
				<div>Memory: {lodStats.deviceMemory}GB</div>
				<div>Cores: {lodStats.deviceCores}</div>
				<div>WebGPU: {performanceStats.webgpuSupported ? '✅' : '❌'}</div>
				<div>Mobile: {navigator.userAgent.includes('Mobile') ? '📱' : '🖥️'}</div>
			</div>
		</div>
	</div>
</main>

<style>
	.demo-header {
		text-align: center;
		padding: 30px 20px;
		margin-bottom: 30px;
		position: relative;
	}
	
	.demo-header h1 {
		font-size: 2.5em;
		margin-bottom: 10px;
	}
	
	.status-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 20px;
		margin-bottom: 20px;
	}
	
	.status-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: var(--ps1-radius-sm);
		font-size: 11px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.status-badge.status-good {
		background: rgba(0, 255, 136, 0.2);
		border: 1px solid var(--ps1-accent);
		color: var(--ps1-accent);
	}
	
	.status-badge.status-warning {
		background: rgba(255, 255, 0, 0.2);
		border: 1px solid var(--ps1-accent-4);
		color: var(--ps1-accent-4);
	}
	
	.status-badge.status-error {
		background: rgba(255, 68, 0, 0.2);
		border: 1px solid var(--ps1-accent-3);
		color: var(--ps1-accent-3);
	}
	
	.status-badge.status-info {
		background: rgba(0, 136, 255, 0.2);
		border: 1px solid var(--ps1-accent-5);
		color: var(--ps1-accent-5);
	}
	
	.status-badge.status-neutral {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--ps1-border-dim);
		color: var(--ps1-text-dim);
	}
	
	.badge-label {
		font-weight: normal;
		opacity: 0.8;
	}
	
	.feature-panel {
		margin: 20px;
		max-width: 500px;
	}
	
	.feature-panel h3 {
		color: var(--ps1-accent);
		margin-bottom: 15px;
	}
	
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr);
		gap: 12px;
	}
	
	.feature-flag {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		border-radius: var(--ps1-radius-sm);
		background: rgba(255, 255, 255, 0.02);
		transition: background 0.2s ease;
	}
	
	.feature-flag:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	
	.feature-flag.experimental {
		border: 1px dashed var(--ps1-accent-2);
	}
	
	.flag-name {
		flex: 1;
		font-size: 12px;
	}
	
	.experimental-badge {
		background: var(--ps1-accent-2);
		color: black;
		padding: 2px 6px;
		border-radius: 2px;
		font-size: 9px;
		font-weight: bold;
	}
	
	.lod-panel, .init-panel {
		margin: 20px;
		max-width: 400px;
	}
	
	.lod-info {
		margin-bottom: 15px;
		font-size: 12px;
	}
	
	.lod-current {
		color: var(--ps1-accent);
		margin-bottom: 5px;
	}
	
	.lod-reason {
		color: var(--ps1-text-dim);
		margin-bottom: 5px;
	}
	
	.lod-auto {
		color: var(--ps1-accent-5);
		font-style: italic;
	}
	
	.lod-controls, .init-buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	
	.ps1-button.active {
		background: rgba(0, 255, 136, 0.2);
		border-color: var(--ps1-accent);
		box-shadow: var(--ps1-shadow-glow);
	}
	
	.demo-viewport {
		position: relative;
		height: 60vh;
		min-height: 500px;
		margin: 20px;
		border: 2px solid var(--ps1-border);
		border-radius: var(--ps1-radius);
		overflow: hidden;
		background: 
			radial-gradient(circle at 30% 70%, rgba(0, 255, 136, 0.1) 0%, transparent 50%),
			radial-gradient(circle at 70% 30%, rgba(136, 0, 255, 0.05) 0%, transparent 50%),
			var(--ps1-bg);
	}
	
	.parallax-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
	}
	
	.nes-pattern {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	.nes-pixel {
		position: absolute;
		width: 8px;
		height: 8px;
		background: var(--ps1-accent);
		border-radius: 1px;
		animation: pulse 2s ease-in-out infinite;
		opacity: 0.6;
	}
	
	.yorha-elements {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	.yorha-fragment {
		position: absolute;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		font-weight: bold;
		color: var(--ps1-accent-2);
		animation: float 3s ease-in-out infinite;
	}
	
	.hybrid-hud {
		position: relative;
		width: 100%;
		height: 100%;
	}
	
	.hud-corner {
		position: absolute;
		width: 120px;
		height: 80px;
	}
	
	.hud-corner.top-left {
		top: 20px;
		left: 20px;
		border-left: 2px solid var(--ps1-accent-4);
		border-top: 2px solid var(--ps1-accent-4);
	}
	
	.hud-corner.top-right {
		top: 20px;
		right: 20px;
		border-right: 2px solid var(--ps1-accent-4);
		border-top: 2px solid var(--ps1-accent-4);
	}
	
	.hud-corner.bottom-left {
		bottom: 20px;
		left: 20px;
		border-left: 2px solid var(--ps1-accent-4);
		border-bottom: 2px solid var(--ps1-accent-4);
	}
	
	.hud-corner.bottom-right {
		bottom: 20px;
		right: 20px;
		border-right: 2px solid var(--ps1-accent-4);
		border-bottom: 2px solid var(--ps1-accent-4);
	}
	
	.scanner-line {
		width: 100px;
		height: 2px;
		background: var(--ps1-accent-4);
		position: absolute;
		top: 40px;
		left: 10px;
		animation: scan 2s linear infinite;
	}
	
	.fps-counter {
		position: absolute;
		top: 10px;
		left: 10px;
		font-size: 12px;
		color: var(--ps1-accent-4);
	}
	
	.system-info {
		position: absolute;
		top: 10px;
		right: 10px;
		font-size: 10px;
		color: var(--ps1-accent-4);
		text-align: right;
	}
	
	.crosshair {
		position: absolute;
		bottom: 40px;
		left: 60px;
		width: 20px;
		height: 20px;
		border: 2px solid var(--ps1-accent-4);
		border-radius: 50%;
	}
	
	.crosshair::before,
	.crosshair::after {
		content: '';
		position: absolute;
		background: var(--ps1-accent-4);
	}
	
	.crosshair::before {
		top: 50%;
		left: -8px;
		width: 36px;
		height: 2px;
		transform: translateY(-1px);
	}
	
	.crosshair::after {
		left: 50%;
		top: -8px;
		width: 2px;
		height: 36px;
		transform: translateX(-1px);
	}
	
	.status-indicator {
		position: absolute;
		bottom: 10px;
		right: 10px;
		font-size: 10px;
		color: var(--ps1-text-dim);
		animation: blink 1s infinite;
	}
	
	.status-indicator.active {
		color: var(--ps1-accent-4);
	}
	
	.performance-monitor {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		min-width: 200px;
		max-width: 300px;
	}
	
	.performance-monitor h4 {
		color: var(--ps1-accent-5);
		margin-bottom: 15px;
		text-align: center;
	}
	
	.perf-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	
	.perf-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--ps1-radius-sm);
	}
	
	.perf-label {
		color: var(--ps1-text-dim);
		font-size: 11px;
	}
	
	.perf-value {
		color: var(--ps1-accent-5);
		font-weight: bold;
		font-size: 12px;
	}
	
	.perf-value.low {
		color: var(--ps1-accent-3);
		animation: pulse 0.5s infinite;
	}
	
	.tech-info {
		margin: 30px 20px;
	}
	
	.tech-info h4 {
		color: var(--ps1-accent-5);
		margin-bottom: 15px;
	}
	
	.tech-info h5 {
		color: var(--ps1-accent);
		margin: 15px 0 8px 0;
	}
	
	.tech-info ul {
		margin: 10px 0;
		padding-left: 20px;
		color: var(--ps1-text-dim);
	}
	
	.tech-info li {
		margin: 5px 0;
		line-height: 1.4;
	}
	
	.device-capabilities {
		margin-top: 20px;
		padding: 15px;
		background: rgba(0, 136, 255, 0.1);
		border: 1px solid var(--ps1-accent-5);
		border-radius: var(--ps1-radius);
	}
	
	.capability-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr);
		gap: 10px;
		margin-top: 10px;
		font-size: 12px;
		color: var(--ps1-accent-5);
	}
	
	/* Animations */
	@keyframes scan {
		0% { transform: translateX(-10px); opacity: 0; }
		50% { opacity: 1; }
		100% { transform: translateX(90px); opacity: 0; }
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-15px) rotate(180deg); }
	}
	
	@keyframes blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0.3; }
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.demo-header h1 {
			font-size: 1.8em;
		}
		
		.feature-panel, .lod-panel, .init-panel {
			margin: 10px;
			max-width: 100%;
		}
		
		.demo-viewport {
			height: 50vh;
			min-height: 300px;
			margin: 10px;
		}
		
		.performance-monitor {
			position: static;
			transform: none;
			margin: 20px 0;
		}
		
		.status-badges {
			padding: 10px;
		}
		
		.hud-corner {
			width: 80px;
			height: 60px;
		}
	}
</style>

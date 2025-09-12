<!-- @migration-task Error while migrating Svelte code: Unexpected token
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  	import { onMount, onDestroy } from 'svelte';
  	import * as THREE from 'three';
  	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  	let canvas;
  	let scene, camera, renderer, controls;
  	let points, highlightedPoints;
  	let documents = [];
  	let clusters = [];
  	let wasmAccelerator = null;
  	let stats = null;
  	let isLoading = true;
  	let error = null;
  	let selectedPoint = null;
  	let nearestNeighbors = [];
  	// Color palette for clusters
  	const clusterColors = [
  		0x00ff88, // legal_contracts - bright green
  		0x8800ff, // case_precedents - purple
  		0xff4400, // regulatory_compliance - orange
  		0x0088ff, // additional clusters - blue
  		0xff0088, // pink
  		0x88ff00, // lime
  	];
  	onMount(async () => {
  		try {
  			await initThreeJS();
  			await loadInitialData();
  			await initializeWasmAccelerator();
  			animate();
  		} catch (err) {
  			console.error('Failed to initialize Cyber Elephant:', err);
  			error = err.message;
  			isLoading = false;
  		}
  	});
  	onDestroy(() => {
  		if (controls) controls.dispose();
  		if (renderer) renderer.dispose();
  		if (wasmAccelerator) wasmAccelerator.delete();
  	});
  	async function initThreeJS() {
  		// Scene setup
  		scene = new THREE.Scene();
  		scene.background = new THREE.Color(0x0a0a0a);
  		// Camera setup
  		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  		camera.position.set(10, 10, 10);
  		// Renderer setup
  		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  		renderer.setSize(window.innerWidth, window.innerHeight);
  		renderer.setPixelRatio(window.devicePixelRatio);
  		// Controls
  		controls = new OrbitControls(camera, canvas);
  		controls.enableDamping = true;
  		controls.dampingFactor = 0.05;
  		// Lighting
  		const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  		scene.add(ambientLight);
  		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  		directionalLight.position.set(10, 10, 5);
  		scene.add(directionalLight);
  		// Add coordinate axes for reference
  		const axesHelper = new THREE.AxesHelper(5);
  		scene.add(axesHelper);
  		// Handle window resize
  		window.addEventListener('resize', onWindowResize);
  	}
  	async function loadInitialData() {
  		try {
  			console.log('🐘 Loading initial data from Cyber Elephant backend...');
  			const response = await fetch('http://localhost:8080/api/v1/initial-data');
  			if (!response.ok) {
  				throw new Error(`Backend not available: ${response.status}. Make sure Go backend is running on port 8080.`);
  			}
  			const data = await response.json();
  			documents = data.documents || [];
  			clusters = data.clusters || [];
  			stats = data.stats;
  			console.log(`📊 Loaded ${documents.length} documents in ${clusters.length} clusters`);
  			if (documents.length > 0) {
  				createPointCloud();
  			}
  		} catch (err) {
  			console.error('Failed to load data:', err);
  			throw new Error(`Backend connection failed: ${err.message}. Start the Go backend with: cd cyber-elephant/backend-go && go run main.go`);
  		}
  	}
  	async function initializeWasmAccelerator() {
  		try {
  			console.log('🚀 Loading WebAssembly accelerator...');
  			// Dynamically import the WASM module
  			const createAccelerator = await import('/wasm/cyber-elephant-accelerator.js');
  			const wasmModule = await createAccelerator.default();
  			wasmAccelerator = new wasmModule.WasmKDTreeAccelerator();
  			// Prepare 3D points for the accelerator
  			const flatData = [];
  			documents.forEach(doc => {
  				flatData.push(doc.projected_3d.x, doc.projected_3d.y, doc.projected_3d.z);
  			});
  			// Build the KD-tree index
  			console.time('KD-Tree Build Time');
  			wasmAccelerator.buildIndex(flatData, 3);
  			console.timeEnd('KD-Tree Build Time');
  			console.log('✅ WebAssembly accelerator initialized');
  		} catch (err) {
  			console.warn('WebAssembly accelerator not available:', err.message);
  			console.log('💡 To build: cd cyber-elephant/accelerator-cpp && ./build-wasm.ps1');
  			// Continue without WebAssembly - use JavaScript fallback
  		}
  	}
  	function createPointCloud() {
  		const geometry = new THREE.BufferGeometry();
  		const positions = [];
  		const colors = [];
  		const sizes = [];
  		documents.forEach((doc, index) => {
  			// Position from 3D projection
  			positions.push(doc.projected_3d.x, doc.projected_3d.y, doc.projected_3d.z);
  			// Color based on cluster
  			const color = new THREE.Color(clusterColors[doc.cluster_id % clusterColors.length]);
  			colors.push(color.r, color.g, color.b);
  			// Size based on confidence
  			sizes.push(doc.projected_3d.confidence * 0.1 + 0.05);
  		});
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
		geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  		// Custom shader material for better point rendering
  		const material = new THREE.ShaderMaterial({
  			uniforms: {
  				pointTexture: { value: new THREE.CanvasTexture(generatePointTexture()) }
  			},
  			vertexShader: `
  				attribute float size;
  				varying vec3 vColor;
  				void main() {
  					vColor = color;
  					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  					gl_PointSize = size * (300.0 / -mvPosition.z);
  					gl_Position = projectionMatrix * mvPosition;
  				}
  			`,
  			fragmentShader: `
  				uniform sampler2D pointTexture;
  				varying vec3 vColor;
  				void main() {
  					gl_FragColor = vec4(vColor, 1.0);
  					gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
  					if (gl_FragColor.a < 0.1) discard;
  				}
  			`,
  			vertexColors: true,
  			transparent: true
  		});
  		points = new THREE.Points(geometry, material);
  		scene.add(points);
  		// Add click interaction
  		canvas.addEventListener('click', onPointClick);
  		isLoading = false;
  	}
  	function generatePointTexture() {
  		const canvas = document.createElement('canvas');
  		canvas.width = 64;
  		canvas.height = 64;
  		const context = canvas.getContext('2d');
  		const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  		gradient.addColorStop(0, 'rgba(255,255,255,1)');
  		gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  		gradient.addColorStop(1, 'rgba(255,255,255,0)');
  		context.fillStyle = gradient;
  		context.fillRect(0, 0, 64, 64);
  		return canvas;
  	}
  	function onPointClick(event) {
  		event.preventDefault();
  		const mouse = new THREE.Vector2();
  		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  		const raycaster = new THREE.Raycaster();
  		raycaster.setFromCamera(mouse, camera);
  		if (points) {
  			const intersects = raycaster.intersectObject(points);
  			if (intersects.length > 0) {
  				const intersect = intersects[0];
  				const index = intersect.index;
  				selectedPoint = documents[index];
  				findNearestNeighbors(selectedPoint.projected_3d);
  			}
  		}
  	}
  	async function findNearestNeighbors(queryPoint) {
  		console.time('Nearest Neighbors Search');
  		try {
  			let neighborIndices = [];
  			if (wasmAccelerator && wasmAccelerator.isIndexBuilt()) {
  				// Use WebAssembly accelerator
  				const queryArray = [queryPoint.x, queryPoint.y, queryPoint.z];
  				neighborIndices = wasmAccelerator.searchKNN(queryArray, 10);
  				console.log('🚀 Used WebAssembly accelerator');
  			} else {
  				// Fallback to JavaScript implementation
  				neighborIndices = findNearestNeighborsJS(queryPoint, 10);
  				console.log('📊 Used JavaScript fallback');
  			}
  			// Get the actual documents
  			nearestNeighbors = neighborIndices.map(index => documents[index]);
  			// Highlight the nearest neighbors
  			highlightNearestNeighbors(neighborIndices);
  		} catch (err) {
  			console.error('Search failed:', err);
  		}
  		console.timeEnd('Nearest Neighbors Search');
  	}
  	function findNearestNeighborsJS(queryPoint, k) {
  		// JavaScript fallback implementation
  		const distances = documents.map((doc, index) => {
  			const dx = doc.projected_3d.x - queryPoint.x;
  			const dy = doc.projected_3d.y - queryPoint.y;
  			const dz = doc.projected_3d.z - queryPoint.z;
  			return { index, distance: dx * dx + dy * dy + dz * dz };
  		});
  		distances.sort((a, b) => a.distance - b.distance);
  		return distances.slice(0, k).map(d => d.index);
  	}
  	function highlightNearestNeighbors(indices) {
  		// Remove previous highlights
  		if (highlightedPoints) {
  			scene.remove(highlightedPoints);
  		}
  		// Create highlighted points
  		const geometry = new THREE.BufferGeometry();
  		const positions = [];
  		const colors = [];
  		indices.forEach(index => {
  			const doc = documents[index];
  			positions.push(doc.projected_3d.x, doc.projected_3d.y, doc.projected_3d.z);
  			colors.push(1, 1, 0); // Yellow highlight
  		});
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  		const material = new THREE.PointsMaterial({
  			size: 0.2,
  			vertexColors: true,
  			transparent: true,
  			opacity: 0.8
  		});
  		highlightedPoints = new THREE.Points(geometry, material);
  		scene.add(highlightedPoints);
  	}
  	function onWindowResize() {
  		camera.aspect = window.innerWidth / window.innerHeight;
  		camera.updateProjectionMatrix();
  		renderer.setSize(window.innerWidth, window.innerHeight);
  	}
  	function animate() {
  		requestAnimationFrame(animate);
  		if (controls) controls.update();
  		if (renderer) renderer.render(scene, camera);
  	}
</script>

<svelte:head>
	<title>Cyber Elephant - Ancient Psychic Tandem War Elephant</title>
</svelte:head>

<main class="cyber-elephant">
	<div class="ui-overlay">
		<div class="header">
			<h1>🐘 Cyber Elephant</h1>
			<p>Ancient Psychic Tandem War Elephant - Knowledge Discovery Interface</p>
		</div>

		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Awakening the Cyber Elephant...</p>
			</div>
		{/if}

		{#if error}
			<div class="error">
				<h3>⚠️ Initialization Failed</h3>
				<p>{error}</p>
				<details>
					<summary>Troubleshooting</summary>
					<ul>
						<li>Start the Go backend: <code>cd cyber-elephant/backend-go && go run main.go</code></li>
						<li>Build WebAssembly: <code>cd cyber-elephant/accelerator-cpp && .\build-wasm.ps1</code></li>
						<li>Make sure ports 8080 (Go) and 5173 (Svelte) are available</li>
					</ul>
				</details>
			</div>
		{/if}

		{#if stats && !isLoading}
			<div class="stats">
				<div class="stat">
					<span class="label">Documents:</span>
					<span class="value">{stats.total_documents}</span>
				</div>
				<div class="stat">
					<span class="label">Clusters:</span>
					<span class="value">{clusters.length}</span>
				</div>
				<div class="stat">
					<span class="label">Search Algorithm:</span>
					<span class="value">{wasmAccelerator ? 'WebAssembly KD-Tree' : 'JavaScript Fallback'}</span>
				</div>
			</div>
		{/if}

		{#if selectedPoint}
			<div class="selection-panel">
				<h3>📄 Selected Document</h3>
				<h4>{selectedPoint.title}</h4>
				<p class="content-snippet">{selectedPoint.content_snippet}</p>
				<div class="metadata">
					<span class="type">{selectedPoint.document_type}</span>
					<span class="confidence">Confidence: {(selectedPoint.projected_3d.confidence * 100).toFixed(1)}%</span>
				</div>

				{#if nearestNeighbors.length > 0}
					<h4>🔍 Similar Documents ({nearestNeighbors.length})</h4>
					<div class="neighbors">
						{#each nearestNeighbors.slice(0, 5) as neighbor}
							<div class="neighbor">
								<strong>{neighbor.title}</strong>
								<span class="type-badge">{neighbor.document_type}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<div class="controls">
			<p>🖱️ Click on points to explore similar documents</p>
			<p>🎮 Mouse: Orbit | Wheel: Zoom | Drag: Pan</p>
		</div>
	</div>

	<canvas bind:this={canvas}></canvas>
</main>

<style>
	.cyber-elephant {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f23 100%);
		font-family: 'Courier New', monospace;
	}

	canvas {
		display: block;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}

	.ui-overlay {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		pointer-events: none;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 20px;
		box-sizing: border-box;
	}

	.ui-overlay > * {
		pointer-events: auto;
	}

	.header {
		background: rgba(0, 0, 0, 0.8);
		border: 2px solid #00ff88;
		border-radius: 8px;
		padding: 15px 20px;
		margin-bottom: 20px;
		max-width: 400px;
		box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
	}

	.header h1 {
		margin: 0;
		color: #00ff88;
		font-size: 24px;
		text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
	}

	.header p {
		margin: 8px 0 0 0;
		color: #888;
		font-size: 14px;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		background: rgba(0, 0, 0, 0.9);
		padding: 30px;
		border-radius: 10px;
		border: 2px solid #8800ff;
		color: #8800ff;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #333;
		border-top: 3px solid #8800ff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 15px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(20, 0, 0, 0.95);
		border: 2px solid #ff4400;
		border-radius: 10px;
		padding: 25px;
		max-width: 500px;
		color: #ff8866;
	}

	.error h3 {
		margin: 0 0 15px 0;
		color: #ff4400;
	}

	.error code {
		background: rgba(0, 0, 0, 0.5);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
	}

	.stats {
		position: absolute;
		top: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.8);
		border: 2px solid #0088ff;
		border-radius: 8px;
		padding: 15px;
		min-width: 200px;
	}

	.stat {
		display: flex;
		justify-content: space-between;
		margin-bottom: 8px;
		color: #0088ff;
	}

	.stat:last-child {
		margin-bottom: 0;
	}

	.stat .label {
		color: #888;
	}

	.stat .value {
		font-weight: bold;
	}

	.selection-panel {
		position: absolute;
		bottom: 20px;
		left: 20px;
		background: rgba(0, 0, 0, 0.9);
		border: 2px solid #ffff00;
		border-radius: 8px;
		padding: 20px;
		max-width: 400px;
		max-height: 300px;
		overflow-y: auto;
		color: #ffff88;
	}

	.selection-panel h3, .selection-panel h4 {
		margin: 0 0 10px 0;
		color: #ffff00;
	}

	.content-snippet {
		font-size: 13px;
		line-height: 1.4;
		margin-bottom: 15px;
		color: #ccc;
	}

	.metadata {
		display: flex;
		gap: 15px;
		margin-bottom: 15px;
		font-size: 12px;
	}

	.type {
		background: #333;
		padding: 4px 8px;
		border-radius: 4px;
		color: #fff;
	}

	.confidence {
		color: #888;
	}

	.neighbors {
		max-height: 120px;
		overflow-y: auto;
	}

	.neighbor {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		padding: 6px;
		background: rgba(255, 255, 0, 0.1);
		border-radius: 4px;
		font-size: 12px;
	}

	.type-badge {
		background: #666;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 10px;
		color: #fff;
	}

	.controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.8);
		border: 2px solid #555;
		border-radius: 8px;
		padding: 15px;
		color: #888;
		font-size: 12px;
		max-width: 250px;
	}

	.controls p {
		margin: 0 0 5px 0;
	}

	.controls p:last-child {
		margin-bottom: 0;
	}
</style>

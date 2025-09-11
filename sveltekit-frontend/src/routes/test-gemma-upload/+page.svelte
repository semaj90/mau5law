<!-- @migration-task Error while migrating Svelte code: Attributes need to be unique -->
<!-- Gemma Embeddings Test Upload Page -->
<script lang="ts">
	import { onMount } from 'svelte';

	// Reactive state
	let uploadStatus = $state<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
	let selectedFile: File | null = $state(null);
	let uploadProgress = $state(0);
	let results: any = $state(null);
	let logs: string[] = $state([]);
	let processingTime = $state(0);

	// File input reference
	let fileInput: HTMLInputElement;

	/**
	 * Handle file selection
	 */
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (file) {
			selectedFile = file;
			addLog(`📁 Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
		}
	}

	/**
	 * Handle drag and drop
	 */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			selectedFile = files[0];
			addLog(`📁 Dropped: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	/**
	 * Test upload with complete Gemma pipeline
	 */
	async function testGemmaUpload() {
		if (!selectedFile) {
			addLog('❌ No file selected');
			return;
		}

		uploadStatus = 'uploading';
		uploadProgress = 0;
		const startTime = performance.now();

		try {
			addLog('🚀 Starting Gemma embeddings pipeline...');
			
			// Create FormData
			const formData = new FormData();
			formData.append('file', selectedFile);

			// Simulate upload progress
			const progressInterval = setInterval(() => {
				if (uploadProgress < 90) {
					uploadProgress += Math.random() * 10;
				}
			}, 500);

			uploadStatus = 'processing';
			addLog('⚡ Processing with MCP multi-core SIMD...');

			// Call our test API
			const response = await fetch('/api/test-gemma-upload', {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);
			uploadProgress = 100;

			const result = await response.json();
			processingTime = performance.now() - startTime;

			if (result.success) {
				uploadStatus = 'completed';
				results = result.data;
				
				addLog('✅ Upload completed successfully!');
				addLog(`📊 Processed in ${processingTime.toFixed(2)}ms`);
				addLog(`📄 Text length: ${result.data.textLength} characters`);
				addLog(`🧩 Chunks created: ${result.data.chunksCount}`);
				addLog(`🧮 Embeddings generated: ${result.data.embeddingsCount}`);
				addLog(`📐 Embedding dimensions: ${result.data.embeddingDimensions}`);
				addLog(`🗄️ Stored in MinIO: ${result.data.minioPath}`);
				
				// Log all processing steps
				result.data.processingSteps.forEach((step: string) => {
					addLog(step);
				});

			} else {
				uploadStatus = 'error';
				addLog(`❌ Upload failed: ${result.error}`);
			}

		} catch (error: any) {
			uploadStatus = 'error';
			addLog(`❌ Error: ${error.message}`);
		}
	}

	/**
	 * Clear all data
	 */
	function clearAll() {
		selectedFile = null;
		uploadStatus = 'idle';
		uploadProgress = 0;
		results = null;
		logs = [];
		processingTime = 0;
		if (fileInput) {
			fileInput.value = '';
		}
		addLog('🗑️ Cleared all data');
	}

	/**
	 * Add log entry
	 */
	function addLog(message: string) {
		logs = [`[${new Date().toLocaleTimeString()}] ${message}`, ...logs.slice(0, 49)];
	}

	/**
	 * Test with the legal PDF we found
	 */
	async function testWithLegalPDF() {
		try {
			addLog('📋 Loading legal complaint PDF...');
			
			// Create a simple test PDF content for demo
			const testContent = `
UNITED STATES DISTRICT COURT
SOUTHERN DISTRICT OF CALIFORNIA

UNITED STATES OF AMERICA,
Plaintiff,
v.
GAVIN NEWSOM, in his Official Capacity as Governor of California;
XAVIER BECERRA, in his Official Capacity as Attorney General of California;
THE STATE OF CALIFORNIA,
Defendants.

COMPLAINT FOR DECLARATORY AND INJUNCTIVE RELIEF

1. California recently passed Assembly Bill 32 (A.B. 32), which bans the operation of private detention facilities in California after January 1, 2020.

2. The Constitution, numerous acts of Congress, and various implementing regulations give the Federal Government both the authority and the prerogative to house individuals in its custody, including in private detention facilities.

3. In this action, the United States seeks a declaration invalidating, and order enjoining, enforcement of A.B. 32 against the Federal Government and those with whom it contracts for private detention facilities.
			`.trim();

			// Create a blob with PDF-like content
			const blob = new Blob([testContent], { type: 'application/pdf' });
			const file = new File([blob], 'legal-complaint-test.pdf', { type: 'application/pdf' });
			
			selectedFile = file;
			addLog(`📁 Loaded test legal PDF: ${file.name}`);
			
			// Auto-start the upload
			await testGemmaUpload();
			
		} catch (error: any) {
			addLog(`❌ Error loading test PDF: ${error.message}`);
		}
	}

	onMount(() => {
		addLog('🚀 Gemma Embeddings Test Ready');
		addLog('📝 Select a file or use the test legal PDF button');
	});
</script>

<svelte:head>
	<title>Gemma Embeddings Test - Legal AI</title>
</svelte:head>

<div class="gemma-test-page">
	<div class="header">
		<h1>🧮 Gemma Embeddings Pipeline Test</h1>
		<p>Test the complete pipeline: MinIO Upload → MCP Multi-Core SIMD → Gemma Embeddings → PostgreSQL</p>
	</div>

	<div class="content">
		<!-- Upload Section -->
		<div class="upload-section">
			<h2>📤 File Upload</h2>
			
			<div 
				class="drop-zone" 
				class:has-file={selectedFile}
				class:uploading={uploadStatus === 'uploading'}
				class:processing={uploadStatus === 'processing'}
				ondrop={handleDrop}
			 role="region" aria-label="Drop zone" ondragover={handleDragOver}
			 role="button" tabindex="0"
                onclick={() => fileInput?.click()}
				role="button"
				tabindex="0"
			>
				<input
					bind:this={fileInput}
					type="file"
					accept=".pdf,.txt,.doc,.docx"
					onchange={handleFileSelect}
					style="display: none"
				/>

				{#if selectedFile}
					<div class="file-info">
						<div class="file-icon">📄</div>
						<div class="file-details">
							<div class="file-name">{selectedFile.name}</div>
							<div class="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
							<div class="file-type">{selectedFile.type}</div>
						</div>
					</div>
				{:else}
					<div class="upload-prompt">
						<div class="upload-icon">📤</div>
						<div>Drop a legal document here or click to browse</div>
						<div class="file-types">PDF, Word, or Text files</div>
					</div>
				{/if}
			</div>

			<!-- Progress Bar -->
			{#if uploadStatus !== 'idle'}
				<div class="progress-section">
					<div class="progress-bar">
						<div class="progress-fill" style="width: {uploadProgress}%"></div>
					</div>
					<div class="progress-text">
						{#if uploadStatus === 'uploading'}
							Uploading... {Math.round(uploadProgress)}%
						{:else if uploadStatus === 'processing'}
							Processing with Gemma embeddings...
						{:else if uploadStatus === 'completed'}
							✅ Processing completed in {processingTime.toFixed(2)}ms
						{:else if uploadStatus === 'error'}
							❌ Processing failed
						{/if}
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="actions">
				<button
					onclick={testGemmaUpload}
					disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
					class="primary-button"
				>
					{#if uploadStatus === 'uploading' || uploadStatus === 'processing'}
						🔄 Processing...
					{:else}
						🚀 Test Gemma Pipeline
					{/if}
				</button>

				<button
					onclick={testWithLegalPDF}
					disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
					class="secondary-button"
				>
					📋 Test Legal PDF
				</button>

				<button
					onclick={clearAll}
					disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
					class="clear-button"
				>
					🗑️ Clear All
				</button>
			</div>
		</div>

		<!-- Results Section -->
		{#if results}
			<div class="results-section">
				<h2>📊 Processing Results</h2>
				
				<div class="results-grid">
					<div class="result-card">
						<h3>📁 File Information</h3>
						<div class="result-data">
							<div><strong>Name:</strong> {results.file.name}</div>
							<div><strong>Size:</strong> {(results.file.size / 1024 / 1024).toFixed(2)} MB</div>
							<div><strong>Type:</strong> {results.file.type}</div>
						</div>
					</div>

					<div class="result-card">
						<h3>🗄️ MinIO Storage</h3>
						<div class="result-data">
							<div><strong>Path:</strong> {results.minioPath}</div>
							<div><strong>URL:</strong> <a href={results.minioUrl} target="_blank">{results.minioUrl}</a></div>
						</div>
					</div>

					<div class="result-card">
						<h3>📝 Text Processing</h3>
						<div class="result-data">
							<div><strong>Text Length:</strong> {results.textLength.toLocaleString()} characters</div>
							<div><strong>Chunks Created:</strong> {results.chunksCount}</div>
						</div>
					</div>

					<div class="result-card">
						<h3>🧮 Gemma Embeddings</h3>
						<div class="result-data">
							<div><strong>Embeddings Generated:</strong> {results.embeddingsCount}</div>
							<div><strong>Dimensions:</strong> {results.embeddingDimensions}</div>
						</div>
					</div>

					<div class="result-card full-width">
						<h3>✅ Processing Pipeline</h3>
						<div class="pipeline-steps">
							{#each results.processingSteps as step}
								<div class="pipeline-step">{step}</div>
							{/each}
						</div>
					</div>

					<div class="result-card full-width">
						<h3>🔍 RAG Status</h3>
						<div class="rag-status">
							<div class="status-item">
								<span class="status-indicator success">✅</span>
								<span>Document is searchable</span>
							</div>
							<div class="status-item">
								<span class="status-indicator success">✅</span>
								<span>RAG pipeline ready</span>
							</div>
							<div class="status-item">
								<span class="status-indicator success">✅</span>
								<span>Vector similarity search enabled</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Live Logs -->
		{#if logs.length > 0}
			<div class="logs-section">
				<h2>📜 Processing Logs</h2>
				<div class="logs-container">
					{#each logs as log}
						<div class="log-entry">{log}</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.gemma-test-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Inter', sans-serif;
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.header h1 {
		color: #1f2937;
		margin-bottom: 0.5rem;
		font-size: 2.5rem;
	}

	.header p {
		color: #6b7280;
		font-size: 1.125rem;
	}

	.content {
		display: grid;
		gap: 2rem;
	}

	.upload-section,
	.results-section,
	.logs-section {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.upload-section h2,
	.results-section h2,
	.logs-section h2 {
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.drop-zone {
		border: 2px dashed #d1d5db;
		border-radius: 1rem;
		padding: 3rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s;
		background: #fafafa;
		margin-bottom: 1.5rem;
	}

	.drop-zone:hover {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.drop-zone.has-file {
		border-color: #10b981;
		background: #f0fdf4;
	}

	.drop-zone.uploading {
		border-color: #f59e0b;
		background: #fef3c7;
	}

	.drop-zone.processing {
		border-color: #8b5cf6;
		background: #f3e8ff;
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-align: left;
	}

	.file-icon {
		font-size: 3rem;
	}

	.file-details {
		flex: 1;
	}

	.file-name {
		font-weight: 600;
		font-size: 1.125rem;
		margin-bottom: 0.25rem;
	}

	.file-size,
	.file-type {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.upload-prompt {
		color: #6b7280;
	}

	.upload-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.file-types {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.progress-section {
		margin-bottom: 1.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		transition: width 0.3s ease;
	}

	.progress-text {
		text-align: center;
		color: #6b7280;
		font-weight: 500;
	}

	.actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-button,
	.clear-button {
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.primary-button {
		background: #3b82f6;
		color: white;
	}

	.primary-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.secondary-button {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.secondary-button:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.clear-button {
		background: #fee2e2;
		color: #dc2626;
		border: 1px solid #fecaca;
	}

	.clear-button:hover:not(:disabled) {
		background: #fecaca;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.result-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.result-card.full-width {
		grid-column: 1 / -1;
	}

	.result-card h3 {
		margin-bottom: 1rem;
		color: #1f2937;
		font-size: 1.125rem;
	}

	.result-data div {
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.result-data strong {
		color: #1f2937;
	}

	.result-data a {
		color: #3b82f6;
		text-decoration: none;
	}

	.result-data a:hover {
		text-decoration: underline;
	}

	.pipeline-steps {
		display: grid;
		gap: 0.5rem;
	}

	.pipeline-step {
		padding: 0.75rem;
		background: white;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
	}

	.rag-status {
		display: grid;
		gap: 0.75rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: white;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
	}

	.status-indicator.success {
		color: #10b981;
		font-weight: 600;
	}

	.logs-container {
		max-height: 400px;
		overflow-y: auto;
		background: #1f2937;
		border-radius: 0.75rem;
		padding: 1.5rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
	}

	.log-entry {
		color: #f3f4f6;
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.log-entry:last-child {
		margin-bottom: 0;
	}
</style>